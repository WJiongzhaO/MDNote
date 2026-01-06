import { injectable } from 'inversify';
import type { FileOpenerStrategy, FileOpenResult } from './file-opener.interface';

/**
 * 图片文件打开策略
 * 专门处理图片文件的预览和显示
 */
@injectable()
export class ImageFileOpenerStrategy implements FileOpenerStrategy {
  private readonly supportedExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'
  ];

  getSupportedExtensions(): string[] {
    return this.supportedExtensions;
  }

  getFileTypeDescription(): string {
    return '图片文件';
  }

  canHandle(filePath: string): boolean {
    const extension = this.getFileExtension(filePath).toLowerCase();
    return this.supportedExtensions.includes(extension);
  }

  async openFile(filePath: string, content: string = ''): Promise<FileOpenResult> {
    const fileName = this.getFileName(filePath);
    const extension = this.getFileExtension(filePath).toLowerCase();

    // 生成图片预览HTML内容
    const previewContent = this.generateImagePreview(filePath, extension);

    return {
      title: fileName,
      content: previewContent,
      metadata: {
        fileType: this.getImageType(extension),
        extension: extension,
        isImage: true,
        previewType: 'html',
        // 注意：content参数对于图片文件来说是无意义的，因为我们不读取图片的文本内容
        contentLength: content.length
      },
      fileType: 'image',
      filePath
    };
  }

  /**
   * 生成图片预览HTML内容
   */
  private generateImagePreview(filePath: string, extension: string): string {
    // 使用app://协议来访问文件，规范化路径格式
    const normalizedPath = filePath.replace(/\\/g, '/');
    const imageUrl = `app://${normalizedPath}`;

    const imageType = this.getImageType(extension);
    const fileName = this.getFileName(filePath);

    // 生成包含图片预览的HTML内容，使用更安全的方式处理加载失败
    return `<div style="text-align: center; padding: 20px;">
  <h3 style="margin-bottom: 20px; color: #333;">图片预览</h3>
  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; background: #f9f9f9;">
    <div id="image-container-${Date.now()}" style="position: relative;">
      <img src="${imageUrl}"
           alt="${fileName}"
           style="max-width: 100%; max-height: 600px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"
           onload="this.parentNode.querySelector('.error-msg').style.display='none';"
           onerror="this.style.display='none'; this.parentNode.querySelector('.error-msg').style.display='block';" />
      <div class="error-msg" style="display: none; padding: 40px; color: #666; font-style: italic; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); border-radius: 4px;">
        <div style="font-size: 16px; margin-bottom: 10px;">⚠️ 无法预览图片</div>
        <div style="font-size: 14px;">文件名：${fileName}</div>
        <div style="font-size: 12px; color: #999; margin-top: 10px;">路径：${filePath}</div>
        <div style="font-size: 12px; color: #999;">类型：${imageType}</div>
      </div>
    </div>
  </div>
  <div style="margin-top: 16px; color: #666; font-size: 14px;">
    <strong>${fileName}</strong><br>
    类型：${imageType} | 格式：${extension.toUpperCase()}
  </div>
</div>`;
  }

  /**
   * 获取图片类型描述
   */
  private getImageType(extension: string): string {
    const typeMap: Record<string, string> = {
      'png': 'PNG图片',
      'jpg': 'JPEG图片',
      'jpeg': 'JPEG图片',
      'gif': 'GIF动画',
      'bmp': 'BMP位图',
      'webp': 'WebP图片',
      'svg': 'SVG矢量图',
      'ico': '图标文件',
      'tiff': 'TIFF图片',
      'tif': 'TIFF图片'
    };

    return typeMap[extension] || '未知图片格式';
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * 获取文件名
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || '未命名图片';
  }
}