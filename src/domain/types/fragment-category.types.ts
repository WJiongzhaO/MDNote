/**
 * 片段分类类型定义（工作2 分类体系）
 */

export interface FragmentCategoryId {
  value: string;
}

export interface FragmentCategory {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

export interface FragmentCategoryTreeNode extends FragmentCategory {
  children: FragmentCategoryTreeNode[];
}

export interface DeleteCategoryOptions {
  /** 删除时是否将子分类移到父级 */
  moveChildrenToParent?: boolean;
}
