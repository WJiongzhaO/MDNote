import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { DocumentRepository } from '../repositories/document.repository.interface';
import type { KnowledgeFragmentRepository } from '../repositories/knowledge-fragment.repository.interface';
import { FragmentReferenceParser } from './fragment-reference-parser.service';

/**
 * 引用同步服务
 * 当知识片段更新时，同步更新所有引用该片段的文档
 */
@injectable()
export class FragmentReferenceSyncService {
  private readonly parser: FragmentReferenceParser;

  constructor(
    @inject(TYPES.DocumentRepository)
    private readonly documentRepository: DocumentRepository,
    @inject(TYPES.KnowledgeFragmentRepository)
    private readonly fragmentRepository: KnowledgeFragmentRepository
  ) {
    this.parser = new FragmentReferenceParser();
  }

  /**
   * 同步片段更新到所有引用文档
   * 只更新已连接的引用（isConnected = true）
   * 支持数据库文档和外部文件
   */
  async syncFragmentUpdate(fragmentId: string): Promise<void> {
    const fragment = await this.fragmentRepository.findById({ value: fragmentId });
    if (!fragment) {
      throw new Error(`Fragment ${fragmentId} not found`);
    }

    // 获取所有已连接的引用文档
    const connectedReferences = fragment.getConnectedReferences();
    
    if (connectedReferences.length === 0) {
      return; // 没有需要同步的文档
    }

    // 获取片段的最新内容（Markdown格式）
    const fragmentMarkdown = fragment.toMarkdown();
    const fragmentTitle = fragment.getTitle().value;

    // 更新每个引用文档
    for (const ref of connectedReferences) {
      try {
        // 检查是否是外部文件（通过documentId格式判断）
        if (ref.documentId.startsWith('file:')) {
          // 外部文件：更新文件缓存
          const filePath = ref.documentId.substring(5); // 移除 'file:' 前缀
          await this.syncExternalFile(filePath, fragmentId, fragmentMarkdown);
        } else {
          // 数据库文档
          const document = await this.documentRepository.findById({ value: ref.documentId });
          if (!document) {
            console.warn(`Document ${ref.documentId} not found, skipping sync`);
            continue;
          }

          // 获取文档内容
          let content = document.getContent().value;

          // 查找并更新该片段的所有引用标志
          const references = this.parser.parseReferences(content);
          const fragmentReferences = references.filter(r => r.fragmentId === fragmentId);

          // 如果文档中没有该片段的引用标志，跳过
          if (fragmentReferences.length === 0) {
            continue;
          }

          // 更新文档的引用信息（更新片段标题）
          const docRefs = document.getFragmentReferences();
          docRefs.forEach(docRef => {
            if (docRef.fragmentId === fragmentId && docRef.isConnected) {
              docRef.fragmentTitle = fragmentTitle;
            }
          });

          // 注意：文档内容中保持引用标志 {{ref:fragmentId}}，不替换为实际内容
          // 实际的内容替换在预览/导出时通过 FragmentReferenceResolver 进行
          // 这样确保文档内容中始终是引用标志，可以随时同步更新

          // 保存文档
          await this.documentRepository.save(document);
        }
      } catch (error) {
        console.error(`Error syncing fragment update to document ${ref.documentId}:`, error);
      }
    }
  }

  /**
   * 同步外部文件的缓存
   */
  private async syncExternalFile(
    filePath: string,
    fragmentId: string,
    newFragmentContent: string
  ): Promise<void> {
    // 在浏览器环境中，需要通过IPC调用主进程来更新文件缓存
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI.file && electronAPI.file.getFileCache && electronAPI.file.saveFileCache) {
          // 获取当前缓存
          const cache = await electronAPI.file.getFileCache(filePath);
          if (cache && cache.references) {
            // 更新所有匹配的引用内容
            cache.references.forEach((ref: any) => {
              if (ref.fragmentId === fragmentId && ref.isConnected) {
                ref.content = newFragmentContent;
              }
            });
            // 保存更新后的缓存
            await electronAPI.file.saveFileCache(filePath, cache);
          }
        }
      } catch (error) {
        console.error(`Error syncing external file cache for ${filePath}:`, error);
      }
    }
  }

  /**
   * 获取需要同步的文档列表
   */
  async getDocumentsToSync(fragmentId: string): Promise<string[]> {
    const fragment = await this.fragmentRepository.findById({ value: fragmentId });
    if (!fragment) {
      return [];
    }

    const connectedReferences = fragment.getConnectedReferences();
    return connectedReferences.map(ref => ref.documentId);
  }
}

