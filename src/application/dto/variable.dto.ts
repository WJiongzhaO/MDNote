/**
 * 变量系统数据传输对象
 */

/**
 * 获取变量请求
 */
export interface GetVariablesRequest {
  /** 文档路径（用于获取文件夹变量） */
  documentPath?: string;
  /** 文档内容（用于提取frontmatter变量） */
  documentContent?: string;
  /** 全局变量 */
  globalVariables?: Record<string, any>;
  /** 运行时变量（优先级最高） */
  runtimeVariables?: Record<string, any>;
}

/**
 * 获取变量响应
 */
export interface GetVariablesResponse {
  /** 合并后的变量 */
  variables: Record<string, any>;
  /** 变量来源信息 */
  sources: VariableSources;
}

/**
 * 变量来源信息
 */
export interface VariableSources {
  /** 全局变量 */
  global: Record<string, any>;
  /** 文件夹变量（继承的） */
  folder: Record<string, any>;
  /** 文档frontmatter变量 */
  document: Record<string, any>;
  /** 运行时变量 */
  runtime: Record<string, any>;
}

/**
 * 处理模板请求
 */
export interface ProcessTemplateRequest {
  /** 模板内容 */
  template: string;
  /** 文档路径 */
  documentPath?: string;
  /** 文档内容 */
  documentContent?: string;
  /** 全局变量 */
  globalVariables?: Record<string, any>;
  /** 运行时变量 */
  runtimeVariables?: Record<string, any>;
}

/**
 * 处理模板响应
 */
export interface ProcessTemplateResponse {
  /** 处理后的内容 */
  result: string;
  /** 使用的变量 */
  variables: Record<string, any>;
}

/**
 * 设置文档变量请求
 */
export interface SetDocumentVariableRequest {
  /** 文档内容 */
  documentContent: string;
  /** 变量名 */
  variableName: string;
  /** 变量值 */
  variableValue: any;
}

/**
 * 设置文档变量响应
 */
export interface SetDocumentVariableResponse {
  /** 更新后的文档内容 */
  updatedContent: string;
  /** 是否添加了新变量 */
  isNew: boolean;
}

/**
 * 删除文档变量请求
 */
export interface RemoveDocumentVariableRequest {
  /** 文档内容 */
  documentContent: string;
  /** 变量名 */
  variableName: string;
}

/**
 * 删除文档变量响应
 */
export interface RemoveDocumentVariableResponse {
  /** 更新后的文档内容 */
  updatedContent: string;
  /** 是否成功删除 */
  removed: boolean;
}

/**
 * 获取文件夹变量请求
 */
export interface GetFolderVariablesRequest {
  /** 文件夹路径 */
  folderPath: string;
  /** 是否包含父文件夹变量 */
  includeInherited?: boolean;
}

/**
 * 获取文件夹变量响应
 */
export interface GetFolderVariablesResponse {
  /** 变量对象 */
  variables: Record<string, any>;
  /** 文件夹路径 */
  folderPath: string;
}

/**
 * 保存文件夹变量请求
 */
export interface SaveFolderVariablesRequest {
  /** 文件夹路径 */
  folderPath: string;
  /** 变量对象 */
  variables: Record<string, any>;
  /** 文件格式 ('yml' | 'json') */
  format?: 'yml' | 'json';
}

/**
 * 保存文件夹变量响应
 */
export interface SaveFolderVariablesResponse {
  /** 是否成功 */
  success: boolean;
  /** 文件路径 */
  filePath: string;
}

/**
 * 获取变量来源请求
 */
export interface GetVariableOriginRequest {
  /** 变量名 */
  variableName: string;
  /** 文档路径 */
  documentPath?: string;
  /** 文档内容 */
  documentContent?: string;
  /** 全局变量 */
  globalVariables?: Record<string, any>;
  /** 运行时变量 */
  runtimeVariables?: Record<string, any>;
}

/**
 * 变量来源类型
 */
export type VariableOriginType = 'runtime' | 'document' | 'folder' | 'global' | 'undefined';

/**
 * 获取变量来源响应
 */
export interface GetVariableOriginResponse {
  /** 变量来源 */
  origin: VariableOriginType;
  /** 变量值 */
  value: any;
}

/**
 * 清除缓存请求
 */
export interface ClearCacheRequest {
  /** 文件夹路径（可选，不提供则清除所有缓存） */
  folderPath?: string;
}

/**
 * 清除缓存响应
 */
export interface ClearCacheResponse {
  /** 是否成功 */
  success: boolean;
  /** 清除的缓存数量 */
  count: number;
}
