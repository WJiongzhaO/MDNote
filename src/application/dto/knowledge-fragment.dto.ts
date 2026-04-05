import type { ASTNode } from '../../domain/entities/ast-node.interface'
import type { FragmentStatus } from '../../domain/types/knowledge-fragment.types'

/**
 * 知识片段DTO（用于应用层和表现层之间的数据传输）
 */
export interface KnowledgeFragmentDTO {
  id: string
  title: string
  tags: string[]
  nodes: any[] // AST节点的JSON表示
  assetDependencies: string[]
  createdAt: string
  updatedAt: string
  source?: string
  trustScore?: number
  lastVerifiedAt?: string | null
  verifiedBy?: string
  categoryPathIds?: string[]
  status?: FragmentStatus
  derivedFromId?: string
}

/**
 * 创建知识片段请求DTO
 */
export interface CreateKnowledgeFragmentRequest {
  title: string
  nodes: any[]
  tags?: string[]
  sourceDocumentId?: string // 源文档ID（如果内容来自文档）
  sourceFilePath?: string // 源文件路径（如果内容来自外部文件）
}

/**
 * 更新知识片段请求DTO
 */
export interface UpdateKnowledgeFragmentRequest {
  title?: string
  nodes?: any[]
  tags?: string[]
}

/**
 * 工作2：更新片段元数据请求
 */
export interface UpdateFragmentMetadataRequest {
  source?: string
  trustScore?: number
  lastVerifiedAt?: string | null
  verifiedBy?: string
  status?: FragmentStatus
  categoryPathIds?: string[]
}

/**
 * 工作2：列表筛选用例参数
 */
export interface ListFragmentsParams {
  keyword?: string
  tags?: string[]
  statuses?: FragmentStatus[]
  categoryIds?: string[]
  recentUsed?: boolean
  recentUpdated?: boolean
  sortBy?: 'updatedAt' | 'referencedAt' | 'trustScore' | 'title'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 工作2：批量更新参数
 */
export interface BulkUpdateFragmentsParams {
  ids: string[]
  status?: FragmentStatus
  categoryPathIds?: string[]
  tagsToAdd?: string[]
  tagsToRemove?: string[]
}

/**
 * 知识片段响应DTO
 */
export interface KnowledgeFragmentResponse {
  id: string
  title: string
  tags: string[]
  markdown: string // 转换为Markdown格式的内容
  assetDependencies: string[]
  sourceDocumentId?: string // 源文档ID
  referencedDocuments: Array<{
    documentId: string
    documentTitle: string
    referencedAt: string // ISO字符串格式
    isConnected: boolean
  }> // 引用该片段的文档列表
  createdAt: string
  updatedAt: string
  previewImage?: string // 预览图片路径（第一个图片或Mermaid图表的路径）
  previewType?: 'image' | 'mermaid' // 预览类型
  previewMermaidCode?: string // 如果是Mermaid图表，存储代码
  // 工作2 资产化字段
  source?: string
  trustScore?: number
  lastVerifiedAt?: string | null
  verifiedBy?: string
  categoryPathIds?: string[]
  status?: FragmentStatus
  derivedFromId?: string
}

/**
 * 工作2：片段详情（资产视角，含完整元数据与引用）
 */
export interface KnowledgeFragmentDetailResponse extends KnowledgeFragmentResponse {
  source: string
  trustScore: number
  lastVerifiedAt: string | null
  verifiedBy: string
  categoryPathIds: string[]
  status: FragmentStatus
  derivedFromId: string | undefined
  versionHistory: Array<{
    id: string
    timestamp: string
    title: string
    summary: string
    changedBy?: string
  }>
}
