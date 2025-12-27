import { injectable } from 'inversify';
import YAML from 'yaml';

/**
 * 文件夹变量源
 */
export interface FolderVariableSource {
  folderPath: string;
  variables: Record<string, any>;
  mtime: number; // 修改时间，用于缓存失效
}

/**
 * 文件夹变量解析器
 * 负责解析和管理文件夹级别的变量
 */
@injectable()
export class FolderVariableResolver {
  private cache = new Map<string, FolderVariableSource>();
  private readonly VARIABLE_FILE_YML = '.mdnote-vars.yml';
  private readonly VARIABLE_FILE_JSON = '.mdnote-vars.json';

  /**
   * 解析文件夹变量
   * @param folderPath 文件夹路径
   * @returns 变量对象
   */
  async resolveFolderVariables(folderPath: string): Promise<Record<string, any>> {
    try {
      // 首先检查缓存
      const mtime = await this.getFileModificationTime(folderPath);
      const cached = this.cache.get(folderPath);

      // 使用缓存（如果未修改）
      if (cached && cached.mtime === mtime) {
        return cached.variables;
      }

      // 缓存未命中或文件已修改，读取文件
      let variables: Record<string, any> | null = null;

      // 尝试读取 YAML 文件
      try {
        variables = await this.readVariablesFromYAML(folderPath);
      } catch (error) {
        // YAML读取失败，继续尝试JSON
        console.debug(`YAML file not found for ${folderPath}, trying JSON`);
      }

      // 如果 YAML 文件不存在或为空，尝试读取 JSON 文件
      if (!variables || Object.keys(variables).length === 0) {
        try {
          variables = await this.readVariablesFromJSON(folderPath);
        } catch (error) {
          // JSON也读取失败，variables保持为null
          console.debug(`JSON file not found for ${folderPath}`);
        }
      }

      // 如果两者都没有，返回空对象
      if (!variables || Object.keys(variables).length === 0) {
        return {};
      }

      // 更新缓存
      this.cache.set(folderPath, {
        folderPath,
        variables,
        mtime
      });

      return variables;
    } catch (error) {
      console.warn(`Failed to resolve folder variables for ${folderPath}:`, error);
      return {};
    }
  }

  /**
   * 递归查找所有父文件夹的变量
   * @param folderPath 文件夹路径
   * @param maxDepth 最大递归深度（防止无限循环）
   * @returns 合并后的变量对象
   */
  async resolveInheritedVariables(
    folderPath: string,
    maxDepth: number = 10
  ): Promise<Record<string, any>> {
    const mergedVars: Record<string, any> = {};
    let currentPath = folderPath;
    let depth = 0;

    while (currentPath && depth < maxDepth) {
      try {
        const vars = await this.resolveFolderVariables(currentPath);
        Object.assign(mergedVars, vars);

        // 移动到父文件夹
        const parentPath = this.getParentFolderPath(currentPath);
        if (!parentPath || parentPath === currentPath) {
          break;
        }
        currentPath = parentPath;
        depth++;
      } catch (error) {
        console.warn(`Error resolving inherited variables at depth ${depth}:`, error);
        break;
      }
    }

    return mergedVars;
  }

  /**
   * 保存文件夹变量
   * @param folderPath 文件夹路径
   * @param variables 变量对象
   * @param format 文件格式 ('yml' | 'json')
   */
  async saveFolderVariables(
    folderPath: string,
    variables: Record<string, any>,
    format: 'yml' | 'json' = 'yml'
  ): Promise<void> {
    try {
      if (format === 'yml') {
        await this.writeVariablesToYAML(folderPath, variables);
      } else {
        await this.writeVariablesToJSON(folderPath, variables);
      }

      // 更新缓存
      const mtime = await this.getFileModificationTime(folderPath);
      this.cache.set(folderPath, {
        folderPath,
        variables,
        mtime
      });
    } catch (error) {
      console.error(`Failed to save folder variables for ${folderPath}:`, error);
      throw new Error(`Failed to save folder variables: ${error}`);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除特定文件夹的缓存
   * @param folderPath 文件夹路径
   */
  clearFolderCache(folderPath: string): void {
    this.cache.delete(folderPath);
  }

  /**
   * 从 YAML 文件读取变量
   * @param folderPath 文件夹路径
   * @returns 变量对象
   */
  private async readVariablesFromYAML(folderPath: string): Promise<Record<string, any>> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        throw new Error('electronAPI is not available');
      }

      const filePath = this.joinPath(folderPath, this.VARIABLE_FILE_YML);
      const content = await electronAPI.file.read(filePath);

      if (typeof content === 'string') {
        return YAML.parse(content) || {};
      }

      return {};
    } catch (error) {
      // 文件不存在是正常情况，返回空对象
      if ((error as any).code === 'ENOENT' || (error as any).message?.includes('not found')) {
        return {};
      }
      throw error;
    }
  }

  /**
   * 从 JSON 文件读取变量
   * @param folderPath 文件夹路径
   * @returns 变量对象
   */
  private async readVariablesFromJSON(folderPath: string): Promise<Record<string, any>> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        throw new Error('electronAPI is not available');
      }

      const filePath = this.joinPath(folderPath, this.VARIABLE_FILE_JSON);
      const data = await electronAPI.file.read(filePath);

      return typeof data === 'object' ? data : {};
    } catch (error) {
      // 文件不存在是正常情况，返回空对象
      if ((error as any).code === 'ENOENT' || (error as any).message?.includes('not found')) {
        return {};
      }
      throw error;
    }
  }

  /**
   * 写入变量到 YAML 文件
   * @param folderPath 文件夹路径
   * @param variables 变量对象
   */
  private async writeVariablesToYAML(
    folderPath: string,
    variables: Record<string, any>
  ): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file) {
      throw new Error('electronAPI is not available');
    }

    const filePath = this.joinPath(folderPath, this.VARIABLE_FILE_YML);
    const content = YAML.stringify(variables);
    await electronAPI.file.write(filePath, content);

    // 删除可能存在的 JSON 文件
    try {
      const jsonFilePath = this.joinPath(folderPath, this.VARIABLE_FILE_JSON);
      await electronAPI.file.delete(jsonFilePath);
    } catch {
      // 忽略删除失败
    }
  }

  /**
   * 写入变量到 JSON 文件
   * @param folderPath 文件夹路径
   * @param variables 变量对象
   */
  private async writeVariablesToJSON(
    folderPath: string,
    variables: Record<string, any>
  ): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file) {
      throw new Error('electronAPI is not available');
    }

    const filePath = this.joinPath(folderPath, this.VARIABLE_FILE_JSON);
    await electronAPI.file.write(filePath, variables);

    // 删除可能存在的 YAML 文件
    try {
      const ymlFilePath = this.joinPath(folderPath, this.VARIABLE_FILE_YML);
      await electronAPI.file.delete(ymlFilePath);
    } catch {
      // 忽略删除失败
    }
  }

  /**
   * 获取文件修改时间
   * @param folderPath 文件夹路径
   * @returns 修改时间戳
   */
  private async getFileModificationTime(folderPath: string): Promise<number> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        return Date.now();
      }

      // 尝试获取 YAML 文件的修改时间
      const ymlPath = this.joinPath(folderPath, this.VARIABLE_FILE_YML);
      try {
        const stats = await electronAPI.file.getStats(ymlPath);
        return stats?.mtime || Date.now();
      } catch {
        // 如果 YAML 文件不存在，尝试 JSON 文件
        const jsonPath = this.joinPath(folderPath, this.VARIABLE_FILE_JSON);
        try {
          const stats = await electronAPI.file.getStats(jsonPath);
          return stats?.mtime || Date.now();
        } catch {
          return Date.now();
        }
      }
    } catch {
      return Date.now();
    }
  }

  /**
   * 获取父文件夹路径
   * @param folderPath 文件夹路径
   * @returns 父文件夹路径
   */
  private getParentFolderPath(folderPath: string): string | null {
    // 处理不同操作系统的路径分隔符
    const normalizedPath = folderPath.replace(/\\/g, '/');
    const lastSlashIndex = normalizedPath.lastIndexOf('/');

    if (lastSlashIndex <= 0) {
      return null;
    }

    return normalizedPath.substring(0, lastSlashIndex);
  }

  /**
   * 连接路径
   * @param folderPath 文件夹路径
   * @param fileName 文件名
   * @returns 完整路径
   */
  private joinPath(folderPath: string, fileName: string): string {
    const separator = folderPath.includes('\\') ? '\\' : '/';
    return folderPath + separator + fileName;
  }
}
