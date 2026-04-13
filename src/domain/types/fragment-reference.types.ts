// 引用关系类型定义
export interface FragmentReferenceRecord {
  documentId: string
  documentTitle: string
  referencedAt: string // ISO 字符串
  isConnected: boolean
}

// 引用关系变更记录（用于历史追踪）
export interface FragmentReferenceChange {
  fragmentId: string
  documentId: string
  changeType: 'add' | 'remove' | 'update'
  timestamp: string
  userId?: string
}
