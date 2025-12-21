import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { Document } from '../../domain/entities/document.entity';
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';
import { ExtensibleMarkdownProcessor } from '../../domain/services/extensible-markdown-processor.domain.service';
import { FragmentReferenceResolver } from '../../domain/services/fragment-reference-resolver.service';
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentResponse,
  DocumentListItem
} from '../dto/document.dto';

@injectable()
export class DocumentUseCases {
  private referenceResolver: FragmentReferenceResolver | null = null;

  constructor(
    @inject(TYPES.DocumentRepository) private readonly documentRepository: DocumentRepository,
    @inject(TYPES.ExtensibleMarkdownProcessor) private readonly markdownProcessor: ExtensibleMarkdownProcessor
  ) {
    // 延迟初始化引用解析器，通过依赖注入获取
    this.initReferenceResolver();
  }

  private async initReferenceResolver(): Promise<void> {
    try {
      // 通过依赖注入容器获取引用解析器
      const { InversifyContainer } = await import('../../core/container/inversify.container');
      const container = InversifyContainer.getInstance();
      
      // 检查服务是否已注册
      if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceResolver)) {
        this.referenceResolver = container.get<FragmentReferenceResolver>(TYPES.FragmentReferenceResolver);
      }
    } catch (error) {
      console.warn('FragmentReferenceResolver not available:', error);
      // 如果服务未注册，referenceResolver 保持为 null，功能会降级但不影响基本使用
    }
  }

  async createDocument(request: CreateDocumentRequest): Promise<DocumentResponse> {
    const document = Document.create(
      { value: request.title },
      { value: request.content },
      { value: request.folderId || null }
    );

    await this.documentRepository.save(document);

    return this.mapToResponse(document);
  }

  async updateDocument(request: UpdateDocumentRequest): Promise<DocumentResponse | null> {
    const document = await this.documentRepository.findById({ value: request.id });

    if (!document) {
      return null;
    }

    document.update(
      { value: request.title },
      { value: request.content },
      request.folderId !== undefined ? { value: request.folderId } : undefined
    );

    await this.documentRepository.save(document);

    return this.mapToResponse(document);
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      await this.documentRepository.delete({ value: id });
      return true;
    } catch {
      return false;
    }
  }

  async getDocument(id: string): Promise<DocumentResponse | null> {
    const document = await this.documentRepository.findById({ value: id });

    if (!document) {
      return null;
    }

    return this.mapToResponse(document);
  }

  async getAllDocuments(): Promise<DocumentListItem[]> {
    const documents = await this.documentRepository.findAll();

    return documents.map(doc => ({
      id: doc.getId().value,
      title: doc.getTitle().value,
      folderId: doc.getFolderId().value,
      updatedAt: doc.getUpdatedAt().value
    }));
  }

  async getDocumentsByFolderId(folderId: string | null): Promise<DocumentListItem[]> {
    const documents = await this.documentRepository.findByFolderId({ value: folderId });

    return documents.map(doc => ({
      id: doc.getId().value,
      title: doc.getTitle().value,
      folderId: doc.getFolderId().value,
      updatedAt: doc.getUpdatedAt().value
    }));
  }

  async getDocumentsByFolder(folderId: string | null): Promise<DocumentListItem[]> {
    if (folderId === null) {
      // 获取根目录的文档（没有文件夹的文档）
      const allDocuments = await this.documentRepository.findAll();
      return allDocuments
        .filter(doc => doc.getFolderId().value === null)
        .map(doc => ({
          id: doc.getId().value,
          title: doc.getTitle().value,
          folderId: doc.getFolderId().value,
          updatedAt: doc.getUpdatedAt().value
        }));
    } else {
      const documents = await this.documentRepository.findByFolderId({ value: folderId });
      return documents.map(doc => ({
        id: doc.getId().value,
        title: doc.getTitle().value,
        folderId: doc.getFolderId().value,
        updatedAt: doc.getUpdatedAt().value
      }));
    }
  }

  async searchDocuments(query: string): Promise<DocumentListItem[]> {
    const documents = await this.documentRepository.search(query);

    return documents.map(doc => ({
      id: doc.getId().value,
      title: doc.getTitle().value,
      folderId: doc.getFolderId().value,
      updatedAt: doc.getUpdatedAt().value
    }));
  }

  async renderMarkdown(content: string, documentId?: string): Promise<string> {
    // 如果有documentId，先解析引用标志并替换为片段内容
    let processedContent = content;
    if (documentId && !documentId.startsWith('fragment:')) {
      // 确保引用解析器已初始化
      if (!this.referenceResolver) {
        await this.initReferenceResolver();
      }
      
      if (this.referenceResolver) {
        try {
          // 对于外部文件，使用文件路径作为documentId
          const actualDocId = documentId.startsWith('file:') 
            ? documentId.substring(5) // 移除 'file:' 前缀，使用实际文件路径
            : documentId;
          processedContent = await this.referenceResolver.resolveReferences(content, actualDocId);
        } catch (error) {
          console.error('Error resolving fragment references:', error);
          // 出错时使用原始内容
        }
      }
    }

    // 转换为HTML
    let html = await this.markdownProcessor.processMarkdown(processedContent);

    // 如果有documentId，处理图片路径（转换为app://协议）
    if (documentId) {
      html = await this.processImagePaths(html, documentId);
    }

    return html;
  }

  /**
   * 处理HTML中的图片路径，转换为app://协议
   */
  private async processImagePaths(html: string, documentId: string): Promise<string> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file) {
      return html;
    }

    // 使用正则表达式匹配所有img标签
    // 使用全局匹配，但需要收集所有匹配项并逐一处理
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const processedSrcs = new Set<string>(); // 跟踪已处理的路径，避免重复替换

    // 先收集所有需要处理的图片路径
    const imagePaths: Array<{ originalSrc: string; fileName: string; fullPath: string }> = [];
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const originalSrc = match[1];

      // 如果是相对路径（./assets/xxx.png），需要转换
      if (originalSrc && originalSrc.startsWith('./assets/') && !processedSrcs.has(originalSrc)) {
        processedSrcs.add(originalSrc);
        const fileName = originalSrc.replace('./assets/', '');
        let relativePath: string;

        // 检查是否是外部文件
        // 外部文件的documentId可能是：
        // 1. 以 'file:' 开头：file:E:\path\to\file.md
        // 2. 包含路径分隔符的绝对路径：E:\path\to\file.md 或 E:/path/to/file.md
        const isExternalFile = documentId.startsWith('file:') || 
                               documentId.includes('/') || 
                               documentId.includes('\\') ||
                               (documentId.length > 0 && (documentId[1] === ':' || documentId.startsWith('/')));

        if (isExternalFile) {
          // 外部文件：提取文件所在目录
          let filePath = documentId;
          if (filePath.startsWith('file:')) {
            filePath = filePath.substring(5); // 移除 'file:' 前缀
          }
          // 提取文件所在目录（去掉文件名）
          const pathParts = filePath.split(/[/\\]/);
          pathParts.pop(); // 移除文件名
          const fileDir = pathParts.join('/');
          relativePath = `${fileDir}/assets/${fileName}`;
        } else if (documentId.startsWith('fragment:')) {
          // 知识片段：使用片段路径
          const fragmentId = documentId.substring(9); // 移除 'fragment:' 前缀
          relativePath = `fragments/assets/${fragmentId}/${fileName}`;
        } else {
          // 数据库文档：使用标准路径
          relativePath = `documents/${documentId}/assets/${fileName}`;
        }

        imagePaths.push({ originalSrc, fileName, fullPath: relativePath });
      }
    }

    // 批量处理所有图片路径
    for (const { originalSrc, fullPath: relativePath } of imagePaths) {
      try {
        const fullPath = await electronAPI.file.getFullPath(relativePath);
        // 使用全局替换，但只替换完全匹配的路径（避免部分匹配）
        html = html.replace(new RegExp(originalSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fullPath);
      } catch (error) {
        console.error('Error processing image path:', error, 'documentId:', documentId, 'originalSrc:', originalSrc, 'relativePath:', relativePath);
      }
    }

    return html;
  }

  async processDocument(content: string, options?: any): Promise<any> {
    return await this.markdownProcessor.processDocument(content, options);
  }

  private mapToResponse(document: Document): DocumentResponse {
    return {
      id: document.getId().value,
      title: document.getTitle().value,
      content: document.getContent().value,
      folderId: document.getFolderId().value,
      createdAt: document.getCreatedAt().value,
      updatedAt: document.getUpdatedAt().value
    };
  }
}
