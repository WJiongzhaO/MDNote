import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';
import { MarkdownProcessor } from '../../domain/services/markdown-processor.domain.service';
import { DocumentUseCases } from '../usecases/document.usecases';

export class ApplicationService {
  private documentUseCases: DocumentUseCases;

  constructor(documentRepository: DocumentRepository) {
    const markdownProcessor = MarkdownProcessor.getInstance();
    this.documentUseCases = new DocumentUseCases(documentRepository, markdownProcessor);
  }

  getDocumentUseCases(): DocumentUseCases {
    return this.documentUseCases;
  }
}