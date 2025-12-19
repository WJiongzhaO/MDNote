import { injectable } from 'inversify';
import type { TemplateProcessor, VariableResolver } from './markdown-processor.interface';

@injectable()
export class HandlebarsTemplateProcessor implements TemplateProcessor {
  private variableResolvers: Map<string, VariableResolver> = new Map();

  async processTemplate(content: string, variables: Record<string, any>): Promise<string> {
    let processedContent = content;
    
    // 处理变量替换 {{variable}}
    processedContent = await this.replaceVariables(processedContent, variables);
    
    // 处理条件渲染 {{#if condition}}...{{/if}}
    processedContent = await this.processConditionals(processedContent, variables);
    
    // 处理循环 {{#each items}}...{{/each}}
    processedContent = await this.processLoops(processedContent, variables);
    
    return processedContent;
  }

  extractVariables(content: string): string[] {
    const variableRegex = /\{\{\s*([^}\s]+)\s*\}\}/g;
    const variables: Set<string> = new Set();
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      const variableName = match[1];
      // 排除控制结构（if, each等）
      if (!variableName.startsWith('#') && !variableName.startsWith('/')) {
        variables.add(variableName);
      }
    }
    
    return Array.from(variables);
  }

  registerVariableResolver(name: string, resolver: VariableResolver): void {
    this.variableResolvers.set(name, resolver);
  }

  private async replaceVariables(content: string, variables: Record<string, any>): Promise<string> {
    const variableRegex = /\{\{\s*([^}\s]+)\s*\}\}/g;
    
    return content.replace(variableRegex, async (match, variableName) => {
      // 检查是否是控制结构
      if (variableName.startsWith('#') || variableName.startsWith('/')) {
        return match;
      }
      
      // 首先检查本地变量
      if (variables.hasOwnProperty(variableName)) {
        return variables[variableName]?.toString() || '';
      }
      
      // 检查注册的解析器
      const resolver = this.variableResolvers.get(variableName);
      if (resolver) {
        try {
          return await resolver.resolve(variableName, variables);
        } catch (error) {
          console.warn(`Variable resolver error for ${variableName}:`, error);
          return '';
        }
      }
      
      // 未找到变量，返回空字符串
      return '';
    });
  }

  private async processConditionals(content: string, variables: Record<string, any>): Promise<string> {
    const conditionalRegex = /\{\{\s*#if\s+([^}\s]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;
    
    return content.replace(conditionalRegex, (match, condition, contentBlock) => {
      const conditionValue = this.evaluateCondition(condition, variables);
      return conditionValue ? contentBlock : '';
    });
  }

  private async processLoops(content: string, variables: Record<string, any>): Promise<string> {
    const loopRegex = /\{\{\s*#each\s+([^}\s]+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g;
    
    return content.replace(loopRegex, (match, arrayName, contentBlock) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) {
        return '';
      }
      
      return array.map(item => {
        // 简单的变量替换，将 {{this}} 替换为当前项
        return contentBlock.replace(/\{\{\s*this\s*\}\}/g, item?.toString() || '');
      }).join('');
    });
  }

  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // 简单的条件评估
    const value = variables[condition];
    
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'string') {
      return value.length > 0;
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length > 0;
    }
    
    return !!value;
  }
}