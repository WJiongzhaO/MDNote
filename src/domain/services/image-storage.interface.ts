/**
 * 图片存储服务接口
 * 负责图片的保存、复制、重命名等操作
 */
export interface ImageStorageService {
  /**
   * 保存图片到文档的assets目录
   * @param documentId 文档ID
   * @param imageFile 图片文件（File对象或文件路径）
   * @returns 返回相对路径（用于Markdown引用）
   */
  saveImageToDocument(documentId: string, imageFile: File | string): Promise<string>;

  /**
   * 复制图片到目标路径
   * @param sourcePath 源文件路径
   * @param destPath 目标文件路径
   * @returns 是否成功
   */
  copyImage(sourcePath: string, destPath: string): Promise<boolean>;

  /**
   * 复制图片并重命名（添加hash）
   * @param sourcePath 源文件路径
   * @param destDir 目标目录
   * @param originalName 原始文件名
   * @returns 新的文件路径
   */
  copyImageWithHash(sourcePath: string, destDir: string, originalName: string): Promise<string>;

  /**
   * 获取文档的assets目录路径
   * @param documentId 文档ID
   * @returns assets目录路径
   */
  getDocumentAssetsPath(documentId: string): string;

  /**
   * 获取知识片段的存储目录路径
   * @param fragmentId 知识片段ID
   * @returns 存储目录路径
   */
  getFragmentStoragePath(fragmentId: string): string;

  /**
   * 获取图片的URL（用于显示）
   * @param imagePath 图片路径（相对路径或绝对路径）
   * @param documentId 文档ID（可选，用于构建完整路径）
   * @returns 图片URL（Promise，因为可能需要异步获取路径）
   */
  getImageUrl(imagePath: string, documentId?: string): Promise<string>;

  /**
   * 从知识片段复制图片到文档
   * @param fragmentId 知识片段ID
   * @param documentId 目标文档ID
   * @param imagePaths 需要复制的图片路径列表
   * @returns 新的图片路径映射（旧路径 -> 新路径）
   */
  copyImagesFromFragmentToDocument(
    fragmentId: string,
    documentId: string,
    imagePaths: string[]
  ): Promise<Map<string, string>>;
}

