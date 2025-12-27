import matter, { GrayMatterFile } from 'gray-matter';
import { injectable } from 'inversify';

/**
 * Frontmatter解析结果
 */
export interface FrontmatterResult {
  attributes: Record<string, any>;
  content: string;
}

/**
 * Frontmatter变量类型
 */
export interface FrontmatterVariables {
  [key: string]: any;
}

/**
 * Frontmatter解析器
 * 负责解析Markdown文件中的frontmatter元数据
 */
@injectable()
export class FrontmatterParser {
  /**
   * 解析Markdown文件，提取frontmatter
   * @param content Markdown内容
   * @returns 解析结果
   */
  parse(content: string): FrontmatterResult {
    const result: GrayMatterFile<string> = matter(content);
    return {
      attributes: result.data,
      content: result.content
    };
  }

  /**
   * 提取变量
   * @param content Markdown内容
   * @returns 变量对象
   */
  extractVariables(content: string): FrontmatterVariables {
    const result = this.parse(content);
    return result.attributes.variables || {};
  }

  /**
   * 更新变量
   * @param content Markdown内容
   * @param newVariables 新的变量对象
   * @returns 更新后的Markdown内容
   */
  updateVariables(content: string, newVariables: FrontmatterVariables): string {
    const result = this.parse(content);

    // 合并现有的 attributes 和新的 variables
    const existingVariables = result.attributes.variables || {};
    const mergedVariables = { ...existingVariables, ...newVariables };

    const updatedAttributes = {
      ...result.attributes,
      variables: mergedVariables
    };

    return matter.stringify(result.content, updatedAttributes);
  }

  /**
   * 添加变量
   * @param content Markdown内容
   * @param key 变量名
   * @param value 变量值
   * @returns 更新后的Markdown内容
   */
  addVariable(content: string, key: string, value: any): string {
    return this.updateVariables(content, { [key]: value });
  }

  /**
   * 删除变量
   * @param content Markdown内容
   * @param key 变量名
   * @returns 更新后的Markdown内容
   */
  removeVariable(content: string, key: string): string {
    const result = this.parse(content);
    const existingVariables = result.attributes.variables || {};

    // 删除指定的变量
    delete existingVariables[key];

    // 检查是否还有变量
    const hasVariables = Object.keys(existingVariables).length > 0;

    const updatedAttributes = { ...result.attributes };
    if (hasVariables) {
      updatedAttributes.variables = existingVariables;
    } else {
      // 如果没有变量了，删除 variables 字段
      delete updatedAttributes.variables;
    }

    // 如果没有任何 attributes，返回纯内容
    if (Object.keys(updatedAttributes).length === 0) {
      return result.content;
    }

    return matter.stringify(result.content, updatedAttributes);
  }

  /**
   * 生成完整的Markdown（frontmatter + content）
   * @param attributes 属性对象
   * @param content Markdown内容
   * @returns 完整的Markdown内容
   */
  stringify(attributes: Record<string, any>, content: string): string {
    // 如果没有 attributes，直接返回内容
    if (!attributes || Object.keys(attributes).length === 0) {
      return content;
    }
    return matter.stringify(content, attributes);
  }

  /**
   * 检查内容是否包含frontmatter
   * @param content Markdown内容
   * @returns 是否包含frontmatter
   */
  hasFrontmatter(content: string): boolean {
    const data = matter(content).data;
    return data !== null && Object.keys(data).length > 0;
  }

  /**
   * 获取所有属性（不仅仅是变量）
   * @param content Markdown内容
   * @returns 所有属性
   */
  getAttributes(content: string): Record<string, any> {
    const result = this.parse(content);
    return result.attributes;
  }
}
