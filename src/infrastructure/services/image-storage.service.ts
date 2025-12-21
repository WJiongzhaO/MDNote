import { injectable } from 'inversify';
import type { ImageStorageService } from '../../domain/services/image-storage.interface';
import * as crypto from 'crypto';

/**
 * 图片存储服务实现
 * 处理图片的保存、复制、重命名等操作
 */
@injectable()
export class FileSystemImageStorageService implements ImageStorageService {
  private readonly BASE_DATA_PATH = 'data'; // 相对于用户数据目录
  private readonly ASSETS_DIR = 'assets';
  private readonly FRAGMENTS_DIR = 'fragments';

  /**
   * 获取用户数据目录路径（Electron环境）
   */
  private getDataPath(): string {
    // 在Electron环境中，这个路径由主进程管理
    // 这里返回相对路径，实际路径由主进程处理
    return this.BASE_DATA_PATH;
  }

  /**
   * 获取文档的assets目录路径
   * 注意：对于数据库文档，返回相对路径（不含data/前缀），因为dataPath会在主进程中处理
   */
  getDocumentAssetsPath(documentId: string): string {
    // 如果documentId以file:开头，说明是外部文件，需要提取文件所在目录
    if (documentId.startsWith('file:')) {
      const filePath = documentId.substring(5); // 移除 'file:' 前缀
      // 提取文件所在目录（去掉文件名）
      const pathParts = filePath.split(/[/\\]/);
      pathParts.pop(); // 移除文件名
      const fileDir = pathParts.join('/');
      return `${fileDir}/${this.ASSETS_DIR}`;
    }
    // 数据库文档：返回相对路径（不含data/前缀）
    return `documents/${documentId}/${this.ASSETS_DIR}`;
  }

  /**
   * 获取知识片段的存储目录路径
   * 路径结构：fragments/assets/{fragmentId}/
   * 注意：返回相对路径（不含data/前缀），因为dataPath会在主进程中处理
   */
  getFragmentStoragePath(fragmentId: string): string {
    return `${this.FRAGMENTS_DIR}/${this.ASSETS_DIR}/${fragmentId}`;
  }

  /**
   * 保存图片到文档的assets目录
   */
  async saveImageToDocument(documentId: string, imageFile: File | string): Promise<string> {
    const assetsPath = this.getDocumentAssetsPath(documentId);
    
    // 确保目录存在
    await this.ensureDirectoryExists(assetsPath);

    let fileName: string;
    let fileBuffer: Uint8Array;

    if (imageFile instanceof File) {
      // 浏览器环境：从File对象读取
      fileName = imageFile.name;
      fileBuffer = new Uint8Array(await imageFile.arrayBuffer());
    } else {
      // 文件路径：需要读取文件
      fileName = this.getFileNameFromPath(imageFile);
      fileBuffer = await this.readFileAsBuffer(imageFile);
    }

    // 生成hash值作为文件名（使用文件内容生成hash）
    const hash = this.generateHash(fileBuffer);
    const ext = this.getFileExtension(fileName);
    const nameWithoutExt = this.getFileNameWithoutExtension(fileName);
    
    // 新文件名：原文件名_hash值.扩展名
    const uniqueFileName = `${nameWithoutExt}_${hash}${ext}`;
    const filePath = `${assetsPath}/${uniqueFileName}`;

    // 保存文件
    await this.writeBinaryFile(filePath, fileBuffer);

    // 返回相对路径（用于Markdown引用）
    return `./assets/${uniqueFileName}`;
  }

  /**
   * 复制图片
   */
  async copyImage(sourcePath: string, destPath: string): Promise<boolean> {
    try {
      console.log('=== 开始复制图片 ===');
      console.log('源路径:', sourcePath);
      console.log('目标路径:', destPath);
      
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        throw new Error('electronAPI is not available');
      }

      // 检查源文件是否存在
      // 对于绝对路径（外部文件），使用 existsPath；对于相对路径，使用 exists
      const isAbsolutePath = sourcePath.includes(':') || sourcePath.startsWith('/');
      let sourceExists = false;
      
      if (isAbsolutePath) {
        // 绝对路径：使用 existsPath
        if (electronAPI.file.existsPath) {
          sourceExists = await electronAPI.file.existsPath(sourcePath);
        } else {
          // 降级：尝试使用 exists（可能失败）
          sourceExists = await electronAPI.file.exists(sourcePath);
        }
      } else {
        // 相对路径：使用 exists
        if (electronAPI.file.exists) {
          sourceExists = await electronAPI.file.exists(sourcePath);
        }
      }
      
      console.log('源文件是否存在:', sourceExists, '(路径类型:', isAbsolutePath ? '绝对路径' : '相对路径', ')');
      if (!sourceExists) {
        console.error('源文件不存在:', sourcePath);
        return false;
      }

      // 处理目标路径：如果是相对路径，需要转换为绝对路径用于复制
      // 但保留相对路径用于后续的存在性检查
      const isDestAbsolute = destPath.includes(':') || destPath.startsWith('/');
      let destPathForCopy = destPath;
      let destPathForCheck = destPath;
      
      if (!isDestAbsolute) {
        // 相对路径：需要获取dataPath并构建完整路径用于复制
        const dataPath = await electronAPI.file.getDataPath();
        destPathForCopy = `${dataPath}/${destPath}`.replace(/\/+/g, '/');
        // 规范化路径（处理 Windows 反斜杠）
        destPathForCopy = destPathForCopy.replace(/\\/g, '/');
        console.log('目标路径转换:', { 相对路径: destPath, 绝对路径: destPathForCopy });
      }

      // 确保目标目录存在（使用绝对路径）
      const destDir = this.getDirectoryFromPath(destPathForCopy);
      console.log('目标目录:', destDir);
      // ensureDirectoryExists 需要绝对路径
      await this.ensureDirectoryExists(destDir);
      console.log('目标目录已确保存在');

      // 执行复制（使用绝对路径）
      console.log('执行文件复制...');
      await electronAPI.file.copy(sourcePath, destPathForCopy);
      console.log('文件复制成功');
      
      // 验证目标文件是否存在
      // 使用相对路径检查（file:exists 期望相对路径）
      if (electronAPI.file.exists) {
        const destExists = await electronAPI.file.exists(destPathForCheck);
        console.log('目标文件是否存在:', destExists, '(检查路径:', destPathForCheck, ')');
        if (!destExists) {
          // 如果相对路径检查失败，尝试使用绝对路径检查
          if (electronAPI.file.existsPath) {
            const destExistsAbsolute = await electronAPI.file.existsPath(destPathForCopy);
            console.log('使用绝对路径检查目标文件是否存在:', destExistsAbsolute);
            if (!destExistsAbsolute) {
              console.error('复制后目标文件不存在:', destPathForCopy);
              return false;
            }
          } else {
            console.error('复制后目标文件不存在:', destPathForCheck);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error copying image:', error);
      console.error('错误详情:', {
        sourcePath,
        destPath,
        errorMessage: error instanceof Error ? error.message : '未知错误',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * 复制图片并重命名（添加hash）
   */
  async copyImageWithHash(
    sourcePath: string,
    destDir: string,
    originalName: string
  ): Promise<string> {
    // 确保目标目录存在
    await this.ensureDirectoryExists(destDir);

    // 读取源文件内容
    const fileBuffer = await this.readFileAsBuffer(sourcePath);
    
    // 使用文件内容生成hash值
    const hash = this.generateHash(fileBuffer);
    
    // 获取文件扩展名
    const ext = this.getFileExtension(originalName);
    const nameWithoutExt = this.getFileNameWithoutExtension(originalName);
    
    // 新文件名：原文件名_hash值.扩展名
    const newFileName = `${nameWithoutExt}_${hash}${ext}`;
    const destPath = `${destDir}/${newFileName}`;

    // 写入文件
    await this.writeBinaryFile(destPath, fileBuffer);

    return `./assets/${newFileName}`;
  }

  /**
   * 从知识片段复制图片到文档
   */
  async copyImagesFromFragmentToDocument(
    fragmentId: string,
    documentId: string,
    imagePaths: string[]
  ): Promise<Map<string, string>> {
    const fragmentAssetsPath = this.getFragmentStoragePath(fragmentId);
    const documentAssetsPath = this.getDocumentAssetsPath(documentId);
    
    // 确保目标目录存在
    await this.ensureDirectoryExists(documentAssetsPath);

    const pathMap = new Map<string, string>();

    for (const imagePath of imagePaths) {
      // 解析图片路径
      const fileName = this.getFileNameFromPath(imagePath);
      const sourcePath = imagePath.startsWith('./') 
        ? `${fragmentAssetsPath}/${fileName}`
        : imagePath;

      // 复制并重命名
      const newPath = await this.copyImageWithHash(
        sourcePath,
        documentAssetsPath,
        fileName
      );

      pathMap.set(imagePath, newPath);
    }

    return pathMap;
  }

  /**
   * 获取图片URL（用于显示）
   * @param imagePath 图片路径（相对路径如 ./assets/xxx.png）
   * @param documentId 文档ID（用于构建完整路径，可以是数据库文档ID或外部文件路径）
   * @returns 图片URL（app://协议或相对路径）
   */
  async getImageUrl(imagePath: string, documentId?: string): Promise<string> {
    // 如果是相对路径（./assets/xxx.png），需要转换为完整路径
    if (imagePath.startsWith('./assets/')) {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.file && documentId) {
        try {
          const fileName = imagePath.replace('./assets/', '');
          let relativePath: string;

          // 检查是否是外部文件（documentId是文件路径，不是以file:开头就是外部文件路径）
          if (documentId.startsWith('file:')) {
            // 外部文件：提取文件所在目录
            const filePath = documentId.substring(5); // 移除 'file:' 前缀
            const pathParts = filePath.split(/[/\\]/);
            pathParts.pop(); // 移除文件名
            const fileDir = pathParts.join('/');
            relativePath = `${fileDir}/assets/${fileName}`;
          } else if (documentId.includes('/') || documentId.includes('\\')) {
            // 如果documentId包含路径分隔符，说明是外部文件路径（没有file:前缀）
            const pathParts = documentId.split(/[/\\]/);
            pathParts.pop(); // 移除文件名
            const fileDir = pathParts.join('/');
            relativePath = `${fileDir}/assets/${fileName}`;
          } else {
            // 数据库文档：使用标准路径（相对于dataPath）
            relativePath = `documents/${documentId}/assets/${fileName}`;
          }

          // 获取完整路径（app://协议）
          const fullPath = await electronAPI.file.getFullPath(relativePath);
          return fullPath;
        } catch (error) {
          console.error('Error getting image URL:', error);
          return imagePath;
        }
      }
    }
    return imagePath;
  }

  // 辅助方法

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.file) {
        await electronAPI.file.mkdir(dirPath);
      }
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }

  /**
   * 读取文件为Buffer
   */
  private async readFileAsBuffer(filePath: string): Promise<Uint8Array> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        throw new Error('electronAPI is not available');
      }

      const buffer = await electronAPI.file.readBinary(filePath);
      return new Uint8Array(buffer);
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  /**
   * 写入二进制文件
   */
  private async writeBinaryFile(filePath: string, buffer: Uint8Array): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        throw new Error('electronAPI is not available');
      }

      await electronAPI.file.writeBinary(filePath, Array.from(buffer));
    } catch (error) {
      console.error('Error writing binary file:', error);
      throw error;
    }
  }

  /**
   * 生成唯一文件名（已废弃，现在使用hash值）
   */
  private generateUniqueFileName(originalName: string): string {
    // 这个方法已不再使用，保留是为了兼容性
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = this.getFileExtension(originalName);
    const nameWithoutExt = this.getFileNameWithoutExtension(originalName);
    return `${nameWithoutExt}_${timestamp}_${random}${ext}`;
  }

  /**
   * 生成hash值
   */
  private generateHash(content: string | Uint8Array): string {
    // 使用简单的hash算法（在实际应用中可以使用crypto）
    const str = typeof content === 'string' ? content : Array.from(content).join('');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  /**
   * 从路径获取文件名
   */
  private getFileNameFromPath(path: string): string {
    return path.split('/').pop() || path.split('\\').pop() || path;
  }

  /**
   * 从路径获取目录
   */
  private getDirectoryFromPath(path: string): string {
    const parts = path.split('/');
    if (parts.length === 1) {
      return path.split('\\').slice(0, -1).join('\\');
    }
    return parts.slice(0, -1).join('/');
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.substring(lastDot) : '';
  }

  /**
   * 获取不带扩展名的文件名
   */
  private getFileNameWithoutExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.substring(0, lastDot) : fileName;
  }
}

