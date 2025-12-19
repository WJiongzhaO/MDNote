import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { Document } from '../../domain/entities/document.entity';
import type { DocumentId, DocumentTitle, DocumentContent } from '../../domain/types/document.types';
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';
import { ExtensibleMarkdownProcessor } from '../../domain/services/extensible-markdown-processor.domain.service';
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentResponse,
  DocumentListItem
} from '../dto/document.dto';

@injectable()
export class DocumentUseCases {
  constructor(
    @inject(TYPES.DocumentRepository) private readonly documentRepository: DocumentRepository,
    @inject(TYPES.ExtensibleMarkdownProcessor) private readonly markdownProcessor: ExtensibleMarkdownProcessor
  ) {}

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

  async renderMarkdown(content: string): Promise<string> {
    return await this.markdownProcessor.processMarkdown(content);
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
