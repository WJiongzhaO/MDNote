import { ref } from 'vue';
import { Application } from '../../core/application';
import type { ImageStorageService } from '../../domain/services/image-storage.interface';
import { FileSystemImageStorageService } from '../../infrastructure/services/image-storage.service';

/**
 * 图片上传组合式函数
 */
export function useImageUpload() {
  const isUploading = ref(false);
  const uploadError = ref<string | null>(null);

  // 获取图片存储服务（暂时直接实例化，后续可以通过DI注入）
  const imageStorage: ImageStorageService = new FileSystemImageStorageService();

  /**
   * 处理图片文件上传
   * @param documentId 文档ID
   * @param file 图片文件
   * @returns 图片的Markdown引用路径
   */
  const uploadImage = async (documentId: string, file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      uploadError.value = '请选择图片文件';
      return null;
    }

    isUploading.value = true;
    uploadError.value = null;

    try {
      const imagePath = await imageStorage.saveImageToDocument(documentId, file);
      return imagePath;
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : '图片上传失败';
      console.error('Error uploading image:', error);
      return null;
    } finally {
      isUploading.value = false;
    }
  };

  /**
   * 处理拖放的图片文件
   * @param documentId 文档ID
   * @param files 文件列表
   * @returns 图片路径列表
   */
  const handleDroppedImages = async (documentId: string, files: FileList): Promise<string[]> => {
    const imagePaths: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const path = await uploadImage(documentId, file);
        if (path) {
          imagePaths.push(path);
        }
      }
    }

    return imagePaths;
  };

  /**
   * 在Markdown内容中插入图片引用
   * @param content 当前Markdown内容
   * @param imagePath 图片路径
   * @param cursorPosition 光标位置
   * @returns 更新后的内容和新的光标位置
   */
  const insertImageReference = (
    content: string,
    imagePath: string,
    cursorPosition: number
  ): { content: string; newPosition: number } => {
    const imageMarkdown = `![图片](${imagePath})\n`;
    const before = content.substring(0, cursorPosition);
    const after = content.substring(cursorPosition);
    const newContent = before + imageMarkdown + after;
    const newPosition = cursorPosition + imageMarkdown.length;
    return { content: newContent, newPosition };
  };

  return {
    isUploading,
    uploadError,
    uploadImage,
    handleDroppedImages,
    insertImageReference
  };
}


