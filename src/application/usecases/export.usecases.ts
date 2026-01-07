import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';
import { ExportFormat, type ExportOptions, type ExportResult } from '../../domain/services/document-export.interface';
import type { ExportConfig } from '../../domain/types/export-config.types';
import { ExportFactory } from '../../infrastructure/services/export-factory.service';
import type { FragmentReferenceResolver } from '../../domain/services/fragment-reference-resolver.service';

export interface ExportDocumentRequest {
  documentId: string;
  format: ExportFormat;
  variables?: Record<string, any>;
  includeStyles?: boolean;
  customStyles?: string;
  config?: ExportConfig;
}

/**
 * 导出用例
 * 负责协调导出服务的应用层用例
 */
@injectable()
export class ExportUseCases {
  private referenceResolver: FragmentReferenceResolver | null = null;

  constructor(
    @inject(TYPES.DocumentRepository)
    private readonly documentRepository: DocumentRepository,
    @inject(TYPES.ExportFactory)
    private readonly exportFactory: ExportFactory
  ) {
    this.initReferenceResolver();
  }

  private async initReferenceResolver(): Promise<void> {
    try {
      const { InversifyContainer } = await import('../../core/container/inversify.container');
      const container = InversifyContainer.getInstance();
      
      if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceResolver)) {
        this.referenceResolver = container.get(TYPES.FragmentReferenceResolver);
      }
    } catch (error) {
      console.warn('FragmentReferenceResolver not available:', error);
    }
  }

  /**
   * 导出文档
   */
  async exportDocument(request: ExportDocumentRequest): Promise<ExportResult> {
    // 1. 获取文档
    const document = await this.documentRepository.findById({ value: request.documentId });
    if (!document) {
      throw new Error(`Document ${request.documentId} not found`);
    }

    // 2. 获取文档内容
    let content = document.getContent().value;

    // 3. 解析片段引用（如果存在）
    if (this.referenceResolver) {
      try {
        content = await this.referenceResolver.resolveReferences(content, request.documentId);
      } catch (error) {
        console.warn('Error resolving fragment references:', error);
        // 继续导出，即使引用解析失败
      }
    }

    // 4. 创建导出选项
    const exportOptions: ExportOptions = {
      format: request.format,
      title: document.getTitle().value,
      content: content,
      documentId: request.documentId,
      variables: request.variables || {},
      includeStyles: request.includeStyles !== false, // 默认包含样式
      customStyles: request.customStyles,
      config: request.config
    };

    // 5. 获取对应的导出器并执行导出
    const exporter = this.exportFactory.getExporter(request.format);
    const result = await exporter.export(exportOptions);

    return result;
  }

  /**
   * 获取支持的导出格式
   */
  getSupportedFormats(): ExportFormat[] {
    return this.exportFactory.getSupportedFormats();
  }
}

