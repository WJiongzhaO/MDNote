import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { FrontmatterParser } from './frontmatter-parser.service';
import { FolderVariableResolver } from './folder-variable-resolver.service';
import type { VariableMergeContext } from './variable-merger.types';

/**
 * 变量合并器
 * 负责按照优先级合并来自不同来源的变量
 */
@injectable()
export class VariableMerger {
  private cache = new Map<string, { result: Record<string, any>; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 缓存有效期60秒

  constructor(
    @inject(TYPES.FrontmatterParser) private frontmatterParser: FrontmatterParser,
    @inject(TYPES.FolderVariableResolver) private folderResolver: FolderVariableResolver
  ) {}

  /**
   * 合并所有来源的变量
   * @param context 合并上下文
   * @returns 合并后的变量对象
   */
  async mergeVariables(context: VariableMergeContext): Promise<Record<string, any>> {
    // 检查缓存
    const cacheKey = this.generateCacheKey(context);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    const mergedVars: Record<string, any> = {};

    // 1. 应用全局配置（最低优先级）
    const globalVars = this.getGlobalVariables(context.globalVariables);
    Object.assign(mergedVars, globalVars);

    // 2. 文件夹变量（从低到高优先级）
    if (context.documentPath) {
      try {
        const folderVars = await this.folderResolver.resolveInheritedVariables(
          context.documentPath
        );
        Object.assign(mergedVars, folderVars);
      } catch (error) {
        console.warn('Failed to resolve folder variables:', error);
      }
    }

    // 3. 文档frontmatter变量（最高优先级，运行时变量除外）
    if (context.documentContent) {
      try {
        const frontmatterVars = this.frontmatterParser.extractVariables(context.documentContent);
        Object.assign(mergedVars, frontmatterVars);
      } catch (error) {
        console.warn('Failed to extract frontmatter variables:', error);
      }
    }

    // 4. 运行时变量（用于测试、预览等临时覆盖，最高优先级）
    if (context.runtimeVariables) {
      Object.assign(mergedVars, context.runtimeVariables);
    }

    // 缓存结果
    this.cache.set(cacheKey, {
      result: mergedVars,
      timestamp: Date.now()
    });

    return mergedVars;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取变量优先级信息（用于调试）
   * @param context 合并上下文
   * @returns 变量来源信息
   */
  async getVariableSources(context: VariableMergeContext): Promise<{
    global: Record<string, any>;
    folder: Record<string, any>;
    document: Record<string, any>;
    runtime: Record<string, any>;
  }> {
    const sources = {
      global: this.getGlobalVariables(context.globalVariables),
      folder: {} as Record<string, any>,
      document: {} as Record<string, any>,
      runtime: context.runtimeVariables || {}
    };

    // 获取文件夹变量
    if (context.documentPath) {
      try {
        sources.folder = await this.folderResolver.resolveInheritedVariables(
          context.documentPath
        );
      } catch (error) {
        console.warn('Failed to resolve folder variables:', error);
      }
    }

    // 获取文档变量
    if (context.documentContent) {
      try {
        sources.document = this.frontmatterParser.extractVariables(context.documentContent);
      } catch (error) {
        console.warn('Failed to extract frontmatter variables:', error);
      }
    }

    return sources;
  }

  /**
   * 检查变量是否被覆盖
   * @param context 合并上下文
   * @param variableName 变量名
   * @returns 变量来源信息
   */
  async getVariableOrigin(
    context: VariableMergeContext,
    variableName: string
  ): Promise<string> {
    // 检查运行时变量
    if (context.runtimeVariables && variableName in context.runtimeVariables) {
      return 'runtime';
    }

    // 检查文档变量
    if (context.documentContent) {
      const docVars = this.frontmatterParser.extractVariables(context.documentContent);
      if (variableName in docVars) {
        return 'document';
      }
    }

    // 检查文件夹变量
    if (context.documentPath) {
      const folderVars = await this.folderResolver.resolveInheritedVariables(
        context.documentPath
      );
      if (variableName in folderVars) {
        return 'folder';
      }
    }

    // 检查全局变量
    const globalVars = this.getGlobalVariables(context.globalVariables);
    if (variableName in globalVars) {
      return 'global';
    }

    return 'undefined';
  }

  /**
   * 生成缓存键
   * @param context 合并上下文
   * @returns 缓存键
   */
  private generateCacheKey(context: VariableMergeContext): string {
    // 只使用会影响结果的字段生成缓存键
    const key = {
      documentContent: context.documentContent,
      documentPath: context.documentPath,
      globalVariables: context.globalVariables
      // runtimeVariables 不包含在缓存键中，因为它是临时的
    };
    return JSON.stringify(key);
  }

  /**
   * 获取全局变量
   * @param customGlobals 自定义全局变量
   * @returns 全局变量对象
   */
  private getGlobalVariables(customGlobals?: Record<string, any>): Record<string, any> {
    const defaults: Record<string, any> = {
      // TODO: 从配置文件读取全局变量
    };

    return {
      ...defaults,
      ...(customGlobals || {})
    };
  }
}
