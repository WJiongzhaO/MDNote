import type { DocumentRepository } from '../domain/repositories/document.repository.interface'
import type { FolderRepository } from '../domain/repositories/folder.repository.interface'
import type { KnowledgeFragmentRepository } from '../domain/repositories/knowledge-fragment.repository.interface'
import type { FragmentCategoryRepository } from '../domain/repositories/fragment-category.repository.interface'
import { FileSystemDocumentRepository } from './repositories/file-system.document.repository.impl'
import { FileSystemFolderRepository } from './repositories/file-system.folder.repository.impl'
import { LocalStorageDocumentRepository } from './repositories/local-storage.document.repository.impl'
import { LocalStorageFolderRepository } from './repositories/local-storage.folder.repository.impl'
import { FileSystemKnowledgeFragmentRepository } from './repositories/file-system.knowledge-fragment.repository.impl'
import { LocalStorageKnowledgeFragmentRepository } from './repositories/local-storage.knowledge-fragment.repository.impl'
import { IndexedDBDocumentRepository } from './repositories/indexed-db.document.repository.impl'
import { IndexedDBFolderRepository } from './repositories/indexed-db.folder.repository.impl'
import { LocalStorageFragmentCategoryRepository } from './repositories/local-storage.fragment-category.repository.impl'

/**
 * 存储适配器 - 根据环境自动选择合适的存储实现
 */
export class StorageAdapter {
  private static isElectron(): boolean {
    // 检查是否在Electron环境中运行
    return (
      typeof window !== 'undefined' &&
      !!(window as any).electronAPI &&
      !!(window as any).electronAPI.file
    )
  }

  static createDocumentRepository(): DocumentRepository {
    if (this.isElectron()) {
      return new FileSystemDocumentRepository()
    } else {
      // 浏览器环境使用 IndexedDB（容量更大，支持二进制数据）
      return new IndexedDBDocumentRepository()
    }
  }

  static createFolderRepository(): FolderRepository {
    if (this.isElectron()) {
      return new FileSystemFolderRepository()
    } else {
      // 浏览器环境使用 IndexedDB
      return new IndexedDBFolderRepository()
    }
  }

  static createKnowledgeFragmentRepository(
    vaultId: string = 'default',
  ): KnowledgeFragmentRepository {
    if (this.isElectron()) {
      return new FileSystemKnowledgeFragmentRepository(vaultId)
    } else {
      return new LocalStorageKnowledgeFragmentRepository(vaultId)
    }
  }

  static createFragmentCategoryRepository(vaultId: string = 'default'): FragmentCategoryRepository {
    // 片段分类使用 LocalStorage 存储（每个知识库独立）
    return new LocalStorageFragmentCategoryRepository()
  }

  /**
   * 获取当前环境信息
   */
  static getEnvironmentInfo() {
    return {
      isElectron: this.isElectron(),
      hasElectronAPI: typeof window !== 'undefined' && !!(window as any).electronAPI,
      hasFileSystemAPI:
        typeof window !== 'undefined' &&
        !!(window as any).electronAPI &&
        !!(window as any).electronAPI.file,
      hasLocalStorage: typeof window !== 'undefined' && !!window.localStorage,
    }
  }
}
