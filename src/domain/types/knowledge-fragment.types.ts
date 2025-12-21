/**
 * 知识片段类型定义
 */

export type KnowledgeFragmentId = { value: string };
export type KnowledgeFragmentTitle = { value: string };
export type KnowledgeFragmentTags = { value: string[] };
export type KnowledgeFragmentAssetDependencies = { value: string[] };

/**
 * 引用信息值对象
 */
export interface FragmentReference {
  documentId: string;
  documentTitle: string;
  referencedAt: Date;
  isConnected: boolean;  // 是否还接受片段修改
}

/**
 * 节点类型枚举
 */
export enum NodeType {
  TEXT = 'text',
  IMAGE = 'image',
  HEADING = 'heading',
  CODE_BLOCK = 'code_block',
  CONTAINER = 'container',
  PARAGRAPH = 'paragraph',
  LIST = 'list',
  LIST_ITEM = 'list_item'
}

/**
 * 文本标记类型
 */
export type TextMark = 'bold' | 'italic' | 'code' | 'link' | 'strikethrough';


