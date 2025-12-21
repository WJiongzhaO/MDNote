import { injectable } from 'inversify';
import type { AssetManager, AssetEntry, AssetType } from '../../domain/services/asset-manager.interface';

/**
 * 资源数据格式（用于文件存储）
 */
interface AssetData {
  id: string;
  type: AssetType;
  content: string;
  renderedContent?: string;
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
    created: number;
    updated: number;
    documentId?: string;
  };
}

/**
 * 基于文件系统的资源管理器实现
 * 支持本地资源持久化存储
 */
@injectable()
export class FileSystemAssetManager implements AssetManager {
  private readonly FILE_NAME = 'assets.json';
  private assets: Map<string, AssetEntry> = new Map();

  constructor() {
    // 初始化时加载已有资源
    this.loadAssetsFromFile().catch(error => {
      console.error('Error loading assets from file:', error);
    });
  }

  async storeAsset(asset: Omit<AssetEntry, 'id' | 'metadata'>): Promise<string> {
    const id = this.generateAssetId(asset.type);
    const entry: AssetEntry = {
      id,
      ...asset,
      metadata: {
        created: Date.now(),
        updated: Date.now(),
        ...asset.metadata
      }
    };

    this.assets.set(id, entry);
    await this.saveAssetsToFile();
    return id;
  }

  async getAsset(id: string): Promise<AssetEntry | null> {
    // 如果内存中没有，尝试从文件加载
    if (!this.assets.has(id)) {
      await this.loadAssetsFromFile();
    }
    return this.assets.get(id) || null;
  }

  async updateAsset(id: string, updates: Partial<AssetEntry>): Promise<boolean> {
    const entry = this.assets.get(id);
    if (!entry) {
      // 尝试从文件加载
      await this.loadAssetsFromFile();
      const loadedEntry = this.assets.get(id);
      if (!loadedEntry) return false;
    }

    const updatedEntry: AssetEntry = {
      ...(this.assets.get(id) || {} as AssetEntry),
      ...updates,
      metadata: {
        ...(this.assets.get(id)?.metadata || {}),
        ...updates.metadata,
        updated: Date.now()
      }
    } as AssetEntry;

    this.assets.set(id, updatedEntry);
    await this.saveAssetsToFile();
    return true;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const deleted = this.assets.delete(id);
    if (deleted) {
      await this.saveAssetsToFile();
    }
    return deleted;
  }

  async getAllAssets(): Promise<AssetEntry[]> {
    await this.loadAssetsFromFile();
    return Array.from(this.assets.values());
  }

  async getAssetsByType(type: AssetType): Promise<AssetEntry[]> {
    await this.loadAssetsFromFile();
    return Array.from(this.assets.values()).filter(asset => asset.type === type);
  }

  async searchAssets(query: string, type?: AssetType): Promise<AssetEntry[]> {
    await this.loadAssetsFromFile();
    const lowerQuery = query.toLowerCase();
    return Array.from(this.assets.values()).filter(asset => {
      const matchesType = !type || asset.type === type;
      const matchesQuery = 
        asset.content.toLowerCase().includes(lowerQuery) ||
        asset.metadata.title?.toLowerCase().includes(lowerQuery) ||
        asset.metadata.description?.toLowerCase().includes(lowerQuery) ||
        asset.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

      return matchesType && matchesQuery;
    });
  }

  async getAssetsByDocument(documentId: string): Promise<AssetEntry[]> {
    await this.loadAssetsFromFile();
    return Array.from(this.assets.values()).filter(
      asset => asset.metadata.documentId === documentId
    );
  }

  /**
   * 从文件加载资源
   */
  private async loadAssetsFromFile(): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        // 非Electron环境，使用内存存储
        return;
      }

      const data = await electronAPI.file.read(this.FILE_NAME);
      const assetsData: AssetData[] = Array.isArray(data) ? data : [];

      this.assets.clear();
      assetsData.forEach(assetData => {
        this.assets.set(assetData.id, {
          id: assetData.id,
          type: assetData.type,
          content: assetData.content,
          renderedContent: assetData.renderedContent,
          metadata: assetData.metadata
        });
      });
    } catch (error) {
      console.error('Error loading assets from file:', error);
      // 如果文件不存在，使用空Map
      this.assets.clear();
    }
  }

  /**
   * 保存资源到文件
   */
  private async saveAssetsToFile(): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        // 非Electron环境，只使用内存存储
        return;
      }

      const assetsData: AssetData[] = Array.from(this.assets.values()).map(asset => ({
        id: asset.id,
        type: asset.type,
        content: asset.content,
        renderedContent: asset.renderedContent,
        metadata: asset.metadata
      }));

      await electronAPI.file.write(this.FILE_NAME, assetsData);
    } catch (error) {
      console.error('Error saving assets to file:', error);
      throw new Error('Failed to save assets to file system');
    }
  }

  private generateAssetId(type: AssetType): string {
    const prefix = type === 'mermaid' ? 'mermaid' : 
                   type === 'image' ? 'img' : 
                   type === 'chart' ? 'chart' :
                   type === 'formula' ? 'formula' : 
                   type === 'knowledge-fragment' ? 'fragment' : 'asset';
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}


