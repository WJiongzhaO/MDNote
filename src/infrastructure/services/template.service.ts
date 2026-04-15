import { Application } from '../../core/application';

export interface DocumentTemplateInfo {
  name: string; // 显示名称（不含扩展名）
  fileName: string; // 文件名（含扩展名）
  fullPath: string; // 模板文件的绝对路径
}

/**
 * 文档模板服务（基于当前知识库数据路径下的 templates 目录）
 *
 * 根路径通过 electronAPI.file.getDataPath 获取，读写使用 electronAPI.file。
 */
export class FileSystemTemplateService {
  /**
   * 获取模板根目录（绝对路径）
   */
  private async getTemplatesRoot(): Promise<string> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.file?.getDataPath) {
      throw new Error('模板库需要项目数据路径（file.getDataPath 不可用）');
    }

    const dataPath: string = await electronAPI.file.getDataPath();
    const normalized = dataPath.replace(/[\\/]+$/, '');
    return `${normalized}/templates`;
  }

  /**
   * 确保模板目录存在
   */
  async ensureTemplatesDirExists(): Promise<string> {
    const root = await this.getTemplatesRoot();
    const electronAPI = (window as any).electronAPI;

    if (electronAPI && electronAPI.file && electronAPI.file.mkdirIfNotExists) {
      await electronAPI.file.mkdirIfNotExists(root);
    } else if (electronAPI && electronAPI.file && electronAPI.file.mkdir) {
      try {
        await electronAPI.file.mkdir(root);
      } catch {
        // 已存在时可能报错，忽略即可
      }
    }

    return root;
  }

  /**
   * 列出所有模板（仅 md 文件）
   */
  async listTemplates(): Promise<DocumentTemplateInfo[]> {
    const root = await this.ensureTemplatesDirExists();
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.readDirectory) {
      throw new Error('文件系统 API 不可用，无法读取模板目录');
    }

    const items: Array<{ name: string; type: 'file' | 'folder'; path: string }> =
      await electronAPI.file.readDirectory(root);

    return items
      .filter(item => item.type === 'file' && /\.md$/i.test(item.name))
      .map(item => ({
        name: item.name.replace(/\.md$/i, ''),
        fileName: item.name,
        fullPath: item.path
      }));
  }

  /**
   * 读取模板内容
   */
  async readTemplate(fullPath: string): Promise<string> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.readFileContent) {
      throw new Error('文件系统 API 不可用，无法读取模板文件');
    }
    return await electronAPI.file.readFileContent(fullPath);
  }

  /**
   * 创建或覆盖模板
   */
  async saveTemplate(fileName: string, content: string): Promise<DocumentTemplateInfo> {
    const root = await this.ensureTemplatesDirExists();
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.writeFileContent) {
      throw new Error('文件系统 API 不可用，无法写入模板文件');
    }

    const finalFileName = /\.md$/i.test(fileName) ? fileName : `${fileName}.md`;
    const fullPath = `${root}/${finalFileName}`;
    await electronAPI.file.writeFileContent(fullPath, content);

    return {
      name: finalFileName.replace(/\.md$/i, ''),
      fileName: finalFileName,
      fullPath
    };
  }

  /**
   * 删除模板
   */
  async deleteTemplate(fullPath: string): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.deleteNode) {
      throw new Error('文件系统 API 不可用，无法删除模板文件');
    }
    await electronAPI.file.deleteNode(fullPath);
  }

  /**
   * 初始化默认模板（可多次调用，不会覆盖已存在的同名模板）
   *
   * 注意：只负责写入文件，调用方决定何时触发。
   */
  async ensureInitialTemplates(initialTemplates: Array<{ fileName: string; content: string }>): Promise<void> {
    await this.ensureTemplatesDirExists();

    if (!initialTemplates || initialTemplates.length === 0) {
      return;
    }

    // 读取当前已有模板，避免重复覆盖用户已经修改过的模板
    const existing = await this.listTemplates();
    const existingNames = new Set(existing.map(t => t.fileName.toLowerCase()));

    for (const tpl of initialTemplates) {
      try {
        const targetName = /\.md$/i.test(tpl.fileName) ? tpl.fileName : `${tpl.fileName}.md`;
        if (existingNames.has(targetName.toLowerCase())) {
          // 已存在同名模板，则跳过创建，保留用户版本
          continue;
        }
        await this.saveTemplate(targetName, tpl.content);
      } catch (error) {
        console.error('创建初始模板失败:', tpl.fileName, error);
      }
    }
  }
}

