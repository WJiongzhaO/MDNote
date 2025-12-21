export interface DocumentId {
  value: string;
}

export interface DocumentTitle {
  value: string;
}

export interface DocumentContent {
  value: string;
}

export interface FolderId {
  value: string | null;
}

export interface CreatedAt {
  value: Date;
}

export interface UpdatedAt {
  value: Date;
}

/**
 * 文档中的片段引用信息
 */
export interface DocumentFragmentReference {
  fragmentId: string;
  fragmentTitle: string;
  position: number;  // 在文档中的位置（字符索引）
  length: number;    // 引用标志的长度
  isConnected: boolean;  // 是否还接受片段修改
  originalContent?: string;  // 断开连接时的原始内容（用于恢复）
}