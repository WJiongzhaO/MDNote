import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { DocumentRepository } from '../repositories/document.repository.interface';
import type { KnowledgeFragmentRepository } from '../repositories/knowledge-fragment.repository.interface';
import { FragmentReferenceParser } from './fragment-reference-parser.service';

/**
 * 引用注册服务
 * 负责注册和管理文档对知识片段的引用关系
 */
@injectable()
export class FragmentReferenceRegistrationService {
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
   * 注册引用（文档引用片段）
   * 在文档中添加引用信息，在片段中添加反向引用
   */
  async registerReference(
    documentId: string,
    fragmentId: string,
    position: number,
    length: number
  ): Promise<void> {
    // 获取文档
    const document = await this.documentRepository.findById({ value: documentId });
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // 获取知识片段
    const fragment = await this.fragmentRepository.findById({ value: fragmentId });
    if (!fragment) {
      throw new Error(`Fragment ${fragmentId} not found`);
    }

    // 在文档中添加引用信息
    document.addFragmentReference(
      fragmentId,
      fragment.getTitle().value,
      position,
      length
    );

    // 在片段中添加反向引用
    fragment.addReferencedDocument(documentId, document.getTitle().value);

    // 保存
    await this.documentRepository.save(document);
    await this.fragmentRepository.save(fragment);
  }

  /**
   * 注册外部文件引用（外部文件引用片段）
   * 在知识片段中添加反向引用，外部文件信息存储在缓存中
   */
  async registerExternalFileReference(
    fileDocumentId: string, // 格式：file:/path/to/file.md
    fileName: string,
    fragmentId: string,
    position: number,
    length: number
  ): Promise<void> {
    // 获取知识片段
    const fragment = await this.fragmentRepository.findById({ value: fragmentId });
    if (!fragment) {
      throw new Error(`Fragment ${fragmentId} not found`);
    }

    // 在片段中添加反向引用（使用 file: 前缀标识外部文件）
    fragment.addReferencedDocument(fileDocumentId, fileName);

    // 保存片段
    await this.fragmentRepository.save(fragment);
  }

  /**
   * 取消注册引用
   */
  async unregisterReference(
    documentId: string,
    fragmentId: string
  ): Promise<void> {
    const document = await this.documentRepository.findById({ value: documentId });
    if (document) {
      document.removeFragmentReference(fragmentId);
      await this.documentRepository.save(document);
    }

    const fragment = await this.fragmentRepository.findById({ value: fragmentId });
    if (fragment) {
      fragment.removeReferencedDocument(documentId);
      await this.fragmentRepository.save(fragment);
    }
  }

  /**
   * 断开引用连接
   */
  async disconnectReference(
    documentId: string,
    fragmentId: string,
    originalContent: string
  ): Promise<void> {
    const document = await this.documentRepository.findById({ value: documentId });
    if (document) {
      document.disconnectFragmentReference(fragmentId, originalContent);
      await this.documentRepository.save(document);
    }

    const fragment = await this.fragmentRepository.findById({ value: fragmentId });
    if (fragment) {
      fragment.disconnectReference(documentId);
      await this.fragmentRepository.save(fragment);
    }
  }

  /**
   * 重新连接引用
   */
  async reconnectReference(
    documentId: string,
    fragmentId: string
  ): Promise<void> {
    const document = await this.documentRepository.findById({ value: documentId });
    if (document) {
      document.reconnectFragmentReference(fragmentId);
      await this.documentRepository.save(document);
    }

    const fragment = await this.fragmentRepository.findById({ value: fragmentId });
    if (fragment) {
      fragment.connectReference(documentId);
      await this.fragmentRepository.save(fragment);
    }
  }

  /**
   * 从文档内容中解析并注册所有引用
   */
  async registerReferencesFromContent(
    documentId: string,
    content: string
  ): Promise<void> {
    const references = this.parser.parseReferences(content);
    
    for (const ref of references) {
      await this.registerReference(
        documentId,
        ref.fragmentId,
        ref.startIndex,
        ref.endIndex - ref.startIndex
      );
    }
  }
}

