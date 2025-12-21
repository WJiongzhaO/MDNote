import { injectable } from 'inversify';
import type { AssetManager, AssetEntry, AssetType } from '../../domain/services/asset-manager.interface';

/**
 * 基于内存的资源管理器实现
 * 后续可以扩展为基于文件系统或数据库的实现
 */
@injectable()
export class InMemoryAssetManager implements AssetManager {
  private assets: Map<string, AssetEntry> = new Map();

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
    return id;
  }

  async getAsset(id: string): Promise<AssetEntry | null> {
    return this.assets.get(id) || null;
  }

  async updateAsset(id: string, updates: Partial<AssetEntry>): Promise<boolean> {
    const entry = this.assets.get(id);
    if (!entry) return false;

    const updatedEntry: AssetEntry = {
      ...entry,
      ...updates,
      metadata: {
        ...entry.metadata,
        ...updates.metadata,
        updated: Date.now()
      }
    };

    this.assets.set(id, updatedEntry);
    return true;
  }

  async deleteAsset(id: string): Promise<boolean> {
    return this.assets.delete(id);
  }

  async getAllAssets(): Promise<AssetEntry[]> {
    return Array.from(this.assets.values());
  }

  async getAssetsByType(type: AssetType): Promise<AssetEntry[]> {
    return Array.from(this.assets.values()).filter(asset => asset.type === type);
  }

  async searchAssets(query: string, type?: AssetType): Promise<AssetEntry[]> {
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
    return Array.from(this.assets.values()).filter(
      asset => asset.metadata.documentId === documentId
    );
  }

  private generateAssetId(type: AssetType): string {
    const prefix = type === 'mermaid' ? 'mermaid' : 
                   type === 'image' ? 'img' : 
                   type === 'chart' ? 'chart' :
                   type === 'formula' ? 'formula' : 'asset';
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

