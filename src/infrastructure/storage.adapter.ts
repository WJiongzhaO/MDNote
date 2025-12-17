import type { DocumentRepository } from '../domain/repositories/document.repository.interface';
import type { FolderRepository } from '../domain/repositories/folder.repository.interface';
import { FileSystemDocumentRepository } from './repositories/file-system.document.repository.impl';
import { FileSystemFolderRepository } from './repositories/file-system.folder.repository.impl';
import { LocalStorageDocumentRepository } from './repositories/local-storage.document.repository.impl';
import { LocalStorageFolderRepository } from './repositories/local-storage.folder.repository.impl';

/**
 * 存储适配器 - 根据环境自动选择合适的存储实现
 */
export class StorageAdapter {
  private static isElectron(): boolean {
    // 检查是否在Electron环境中运行
    return typeof window !== 'undefined' &&
           !!(window as any).electronAPI &&
           !!(window as any).electronAPI.file;
  }

  static createDocumentRepository(): DocumentRepository {
    if (this.isElectron()) {
      console.log('🖥️ 使用 Electron 文件系统存储');
      return new FileSystemDocumentRepository();
    } else {
      console.log('🌐 使用浏览器本地存储');
      return new LocalStorageDocumentRepository();
    }
  }

  static createFolderRepository(): FolderRepository {
    if (this.isElectron()) {
      console.log('🖥️ 使用 Electron 文件系统存储');
      return new FileSystemFolderRepository();
    } else {
      console.log('🌐 使用浏览器本地存储');
      return new LocalStorageFolderRepository();
    }
  }

  /**
   * 获取当前环境信息
   */
  static getEnvironmentInfo() {
    return {
      isElectron: this.isElectron(),
      hasElectronAPI: typeof window !== 'undefined' && !!(window as any).electronAPI,
      hasFileSystemAPI: typeof window !== 'undefined' &&
                        !!(window as any).electronAPI &&
                        !!(window as any).electronAPI.file,
      hasLocalStorage: typeof window !== 'undefined' && !!window.localStorage
    };
  }
}