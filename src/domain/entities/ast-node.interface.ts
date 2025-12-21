import { NodeType } from '../types/knowledge-fragment.types';

/**
 * AST节点基类接口
 * 所有节点类型都实现此接口
 */
export interface ASTNode {
  /**
   * 节点类型
   */
  readonly type: NodeType;

  /**
   * 子节点列表
   */
  readonly children: ASTNode[];

  /**
   * 转换为Markdown格式
   */
  toMarkdown(): string;

  /**
   * 转换为JSON格式（用于序列化）
   */
  toJSON(): any;
}


