/**
 * 文档导出服务接口
 * 定义文档导出的统一接口
 */

export enum ExportFormat {
  WORD = 'word',      // .docx
  PDF = 'pdf',        // .pdf
  HTML = 'html',      // .html
  MARKDOWN = 'markdown' // .md
}

export interface ExportOptions {
  /**
   * 导出格式
   */
  format: ExportFormat;
  
  /**
   * 文档标题
   */
  title: string;
  
  /**
   * 文档内容（Markdown格式）
   */
  content: string;
  
  /**
   * 文档ID（用于处理图片路径等资源）
   */
  documentId?: string;
  
  /**
   * 变量（用于模板替换）
   */
  variables?: Record<string, any>;
  
  /**
   * 是否包含样式
   */
  includeStyles?: boolean;
  
  /**
   * 自定义样式
   */
  customStyles?: string;
}

export interface ExportResult {
  /**
   * 导出文件的内容（ArrayBuffer 格式，浏览器兼容）
   */
  buffer: ArrayBuffer | Buffer;
  
  /**
   * 文件扩展名
   */
  extension: string;
  
  /**
   * MIME类型
   */
  mimeType: string;
  
  /**
   * 建议的文件名
   */
  filename: string;
}

/**
 * 文档导出服务接口
 */
export interface DocumentExportService {
  /**
   * 导出文档
   * @param options 导出选项
   * @returns 导出结果
   */
  export(options: ExportOptions): Promise<ExportResult>;
  
  /**
   * 检查是否支持指定格式
   * @param format 导出格式
   * @returns 是否支持
   */
  supportsFormat(format: ExportFormat): boolean;
}

