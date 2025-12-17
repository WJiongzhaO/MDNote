import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface';
import { MarkdownProcessor } from '../../domain/services/markdown-processor.domain.service';
import { DocumentUseCases } from '../usecases/document.usecases';
import { FolderUseCases } from '../usecases/folder.usecases';

export class ApplicationService {
  private documentUseCases: DocumentUseCases;
  private folderUseCases: FolderUseCases;

  constructor(documentRepository: DocumentRepository, folderRepository: FolderRepository) {
    const markdownProcessor = MarkdownProcessor.getInstance();
    this.documentUseCases = new DocumentUseCases(documentRepository, markdownProcessor);
    this.folderUseCases = new FolderUseCases(folderRepository);
  }

  getDocumentUseCases(): DocumentUseCases {
    return this.documentUseCases;
  }

  getFolderUseCases(): FolderUseCases {
    return this.folderUseCases;
  }
}