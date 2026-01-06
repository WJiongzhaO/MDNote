import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { KnowledgeFragmentRepository } from '../repositories/knowledge-fragment.repository.interface';
import type { ImageStorageService } from './image-storage.interface';
import { FragmentReferenceParser } from './fragment-reference-parser.service';

/**
 * 引用标志解析服务
 * 用于预览和导出时，将引用标志替换为片段内容
 */
@injectable()
export class FragmentReferenceResolver {
  private readonly parser: FragmentReferenceParser;

  constructor(
    @inject(TYPES.KnowledgeFragmentRepository)
    private readonly fragmentRepository: KnowledgeFragmentRepository,
    @inject(TYPES.ImageStorageService)
    private readonly imageStorage: ImageStorageService
  ) {
    this.parser = new FragmentReferenceParser();
  }

  /**
   * 解析并替换引用标志为片段内容
   * @param content 原始Markdown内容
   * @param documentId 文档ID或文件路径（用于处理图片路径）
   * @param fileCache 文件缓存（可选，用于快速获取已缓存的片段内容）
   * @returns 替换后的Markdown内容
   */
  async resolveReferences(content: string, documentId: string, fileCache?: any): Promise<string> {
    const references = this.parser.parseReferences(content);

    if (references.length === 0) {
      return content;
    }

    let resolvedContent = content;

    // 从后往前替换，避免索引偏移问题
    for (let i = references.length - 1; i >= 0; i--) {
      const ref = references[i];

      // 根据形态处理
      const mode = (ref as any).mode || (ref.isConnected ? 'linked' : 'detached');

      // 形态C（clean）已经在内容中，不需要处理
      if (mode === 'clean') {
        continue;
      }

      // 形态B（detached）已经包含内容，只需要移除标记
      if (mode === 'detached') {
        // detached模式：标记后面跟着实际内容，只需要移除标记
        // 这里简化处理：detached模式在存储时已经包含内容，预览时只需要移除标记
        const before = resolvedContent.substring(0, ref.startIndex);
        const after = resolvedContent.substring(ref.endIndex);
        resolvedContent = before + after;
        continue;
      }

      // 形态A（linked）：需要替换为片段内容
      try {
        let fragmentMarkdown: string | null = null;
        let needImageProcessing = false;

        // 优先从缓存读取（如果提供了缓存）
        if (fileCache && fileCache.references) {
          const cachedRef = fileCache.references.find((r: any) => r.fragmentId === ref.fragmentId && r.isConnected);
          if (cachedRef && cachedRef.content) {
            // 检查缓存是否有效：比较片段更新时间
            const fragment = await this.fragmentRepository.findById({ value: ref.fragmentId });
            if (fragment) {
              const fragmentUpdatedAt = fragment.getUpdatedAt().getTime();
              const cacheUpdatedAt = cachedRef.fragmentUpdatedAt || 0;
              
              // 如果片段未更新，直接使用缓存内容（已包含处理后的图片路径）
              if (fragmentUpdatedAt <= cacheUpdatedAt) {
                fragmentMarkdown = cachedRef.content;
                console.log(`[FragmentReferenceResolver] Using cached content for fragment ${ref.fragmentId}`);
              } else {
                // 片段已更新，需要重新处理
                console.log(`[FragmentReferenceResolver] Fragment ${ref.fragmentId} updated, refreshing cache`);
                needImageProcessing = true;
              }
            } else {
              // 片段不存在，使用缓存内容
              fragmentMarkdown = cachedRef.content;
            }
          }
        }

        // 如果缓存不可用或已过期，从知识片段库读取
        if (!fragmentMarkdown) {
          const fragment = await this.fragmentRepository.findById({ value: ref.fragmentId });
          if (!fragment) {
            // 片段不存在，保留标志或显示错误提示
            console.warn(`Fragment ${ref.fragmentId} not found, keeping reference tag`);
            continue;
          }

          // 获取片段Markdown内容
          fragmentMarkdown = fragment.toMarkdown();
          needImageProcessing = true;
        }

        // 处理图片路径（仅在需要时）
        if (needImageProcessing && fragmentMarkdown) {
          // 对于外部文件，documentId 是文件路径，需要转换为 file: 格式
          const actualDocId = documentId.startsWith('file:') ? documentId : `file:${documentId}`;
          const imagePaths = this.extractImagePaths(fragmentMarkdown);
          if (imagePaths.length > 0) {
            try {
              const pathMap = await this.imageStorage.copyImagesFromFragmentToDocument(
                ref.fragmentId,
                actualDocId,
                imagePaths
              );

              // 替换图片路径
              pathMap.forEach((newPath, oldPath) => {
                const oldPathPattern = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                fragmentMarkdown = fragmentMarkdown!.replace(new RegExp(oldPathPattern, 'g'), newPath);
              });
            } catch (error) {
              console.warn(`Error copying images for fragment ${ref.fragmentId}:`, error);
              // 继续处理，即使图片复制失败
            }
          }
        }

        // 替换引用标志为片段内容
        if (fragmentMarkdown) {
          resolvedContent = this.replaceAt(
            resolvedContent,
            ref.startIndex,
            ref.endIndex,
            fragmentMarkdown
          );
        }
      } catch (error) {
        console.error(`Error resolving reference ${ref.fragmentId}:`, error);
        // 出错时保留原始标志
      }
    }

    return resolvedContent;
  }

  /**
   * 解析单个引用
   */
  async resolveReference(fragmentId: string, documentId: string): Promise<string> {
    const fragment = await this.fragmentRepository.findById({ value: fragmentId });
    if (!fragment) {
      throw new Error(`Fragment ${fragmentId} not found`);
    }

    let fragmentMarkdown = fragment.toMarkdown();

    // 处理图片路径
    const imagePaths = this.extractImagePaths(fragmentMarkdown);
    if (imagePaths.length > 0) {
      const pathMap = await this.imageStorage.copyImagesFromFragmentToDocument(
        fragmentId,
        documentId,
        imagePaths
      );

      pathMap.forEach((newPath, oldPath) => {
        const oldPathPattern = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        fragmentMarkdown = fragmentMarkdown.replace(new RegExp(oldPathPattern, 'g'), newPath);
      });
    }

    return fragmentMarkdown;
  }

  /**
   * 从Markdown内容中提取图片路径
   */
  private extractImagePaths(markdown: string): string[] {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const paths: string[] = [];
    let match;

    while ((match = imageRegex.exec(markdown)) !== null) {
      const imagePath = match[2];
      if (imagePath.startsWith('./assets/')) {
        paths.push(imagePath);
      }
    }

    return paths;
  }

  /**
   * 在字符串的指定位置替换内容
   */
  private replaceAt(str: string, start: number, end: number, replacement: string): string {
    return str.substring(0, start) + replacement + str.substring(end);
  }
}

