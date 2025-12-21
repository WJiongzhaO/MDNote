/**
 * 资源类型定义
 */
export type AssetType = 'mermaid' | 'image' | 'chart' | 'formula' | 'knowledge-fragment';

/**
 * 资源元数据
 */
export interface AssetMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  created: number;
  updated: number;
  documentId?: string; // 关联的文档ID
}

/**
 * 资源条目
 */
export interface AssetEntry {
  id: string;
  type: AssetType;
  content: string; // 原始内容（如Mermaid代码、图片路径等）
  renderedContent?: string; // 渲染后的内容（如SVG、HTML等）
  metadata: AssetMetadata;
}

/**
 * 资源管理器接口
 */
export interface AssetManager {
  /**
   * 存储资源
   */
  storeAsset(asset: Omit<AssetEntry, 'id' | 'metadata'>): Promise<string>;

  /**
   * 获取资源
   */
  getAsset(id: string): Promise<AssetEntry | null>;

  /**
   * 更新资源
   */
  updateAsset(id: string, updates: Partial<AssetEntry>): Promise<boolean>;

  /**
   * 删除资源
   */
  deleteAsset(id: string): Promise<boolean>;

  /**
   * 获取所有资源
   */
  getAllAssets(): Promise<AssetEntry[]>;

  /**
   * 根据类型获取资源
   */
  getAssetsByType(type: AssetType): Promise<AssetEntry[]>;

  /**
   * 搜索资源
   */
  searchAssets(query: string, type?: AssetType): Promise<AssetEntry[]>;

  /**
   * 根据文档ID获取资源
   */
  getAssetsByDocument(documentId: string): Promise<AssetEntry[]>;
}

