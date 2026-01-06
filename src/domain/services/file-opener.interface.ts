/**
 * 文件打开策略接口
 * 定义文件打开的统一接口
 */

export interface FileOpenerStrategy {
  /**
   * 获取此策略支持的文件扩展名列表
   */
  getSupportedExtensions(): string[];

  /**
   * 获取此策略的文件类型描述
   */
  getFileTypeDescription(): string;

  /**
   * 检查文件是否可以被此策略处理
   * @param filePath 文件路径
   */
  canHandle(filePath: string): boolean;

  /**
   * 打开并解析文件内容
   * @param filePath 文件路径
   * @param content 文件内容（某些文件类型可能不需要）
   * @returns 处理后的结果
   */
  openFile(filePath: string, content?: string): Promise<FileOpenResult>;
}

/**
 * 文件打开结果
 */
export interface FileOpenResult {
  /**
   * 文件标题
   */
  title: string;

  /**
   * 文件内容（处理后的内容）
   */
  content: string;

  /**
   * 元数据（可选）
   */
  metadata?: Record<string, any>;

  /**
   * 文件类型
   */
  fileType: string;

  /**
   * 原始文件路径
   */
  filePath: string;
}
