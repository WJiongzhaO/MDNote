import { injectable } from 'inversify';
import type { TemplateProcessor, VariableResolver } from './markdown-processor.interface';

/**
 * 简单模板处理器实现
 * 只支持基本的变量替换功能，不包含条件渲染和循环
 */
@injectable()
export class SimpleTemplateProcessor implements TemplateProcessor {
  private variableResolvers: Map<string, VariableResolver> = new Map();
  private variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

  /**
   * 处理模板内容，替换变量
   * @param content 包含变量占位符的内容
   * @param variables 变量键值对
   * @returns 处理后的内容
   */
  async processTemplate(content: string, variables: Record<string, any>): Promise<string> {
    // 找出所有需要替换的变量
    const matches = Array.from(content.matchAll(this.variablePattern));

    let result = content;

    for (const match of matches) {
      const fullMatch = match[0];
      const varName = match[1];

      // 首先检查本地变量
      if (variables.hasOwnProperty(varName)) {
        const value = variables[varName];
        // 处理不同类型的值
        if (value === null || value === undefined) {
          continue; // 保持原样
        }
        result = result.replace(fullMatch, String(value));
        continue;
      }

      // 检查注册的解析器
      const resolver = this.variableResolvers.get(varName);
      if (resolver) {
        try {
          const resolvedValue = await resolver.resolve(varName, variables);
          result = result.replace(fullMatch, resolvedValue);
        } catch (error) {
          console.warn(`Variable resolver error for ${varName}:`, error);
          // 出错时保持原样
        }
      }
      // 未找到变量，保持原样
    }

    return result;
  }

  /**
   * 从内容中提取变量名列表
   * @param content 包含变量占位符的内容
   * @returns 变量名数组（去重）
   */
  extractVariables(content: string): string[] {
    const matches = content.matchAll(this.variablePattern);
    const variables = Array.from(matches, m => m[1]);
    return [...new Set(variables)]; // 去重
  }

  /**
   * 注册自定义变量解析器
   * @param name 变量名
   * @param resolver 解析器实现
   */
  registerVariableResolver(name: string, resolver: VariableResolver): void {
    this.variableResolvers.set(name, resolver);
  }

  /**
   * 验证变量名是否合法
   * @param name 变量名
   * @returns 是否合法
   */
  validateVariableName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * 注销变量解析器
   * @param name 变量名
   */
  unregisterVariableResolver(name: string): void {
    this.variableResolvers.delete(name);
  }
}
