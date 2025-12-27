/**
 * 变量合并上下文
 */
export interface VariableMergeContext {
  documentContent?: string;
  documentPath?: string;
  runtimeVariables?: Record<string, any>;
  globalVariables?: Record<string, any>;
}
