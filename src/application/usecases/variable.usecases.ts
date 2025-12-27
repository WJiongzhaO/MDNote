import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { SimpleTemplateProcessor } from '../../domain/services/simple-template-processor.service';
import { FrontmatterParser } from '../../domain/services/frontmatter-parser.service';
import { FolderVariableResolver } from '../../domain/services/folder-variable-resolver.service';
import { VariableMerger } from '../../domain/services/variable-merger.service';
import type { VariableMergeContext } from '../../domain/services/variable-merger.types';
import type {
  GetVariablesRequest,
  GetVariablesResponse,
  ProcessTemplateRequest,
  ProcessTemplateResponse,
  SetDocumentVariableRequest,
  SetDocumentVariableResponse,
  RemoveDocumentVariableRequest,
  RemoveDocumentVariableResponse,
  GetFolderVariablesRequest,
  GetFolderVariablesResponse,
  SaveFolderVariablesRequest,
  SaveFolderVariablesResponse,
  GetVariableOriginRequest,
  GetVariableOriginResponse,
  ClearCacheRequest,
  ClearCacheResponse
} from '../dto/variable.dto';

/**
 * 变量系统用例
 *
 * 负责协调领域服务完成变量管理的应用层用例
 */
@injectable()
export class VariableUseCases {
  constructor(
    @inject(TYPES.SimpleTemplateProcessor) private readonly templateProcessor: SimpleTemplateProcessor,
    @inject(TYPES.FrontmatterParser) private readonly frontmatterParser: FrontmatterParser,
    @inject(TYPES.FolderVariableResolver) private readonly folderResolver: FolderVariableResolver,
    @inject(TYPES.VariableMerger) private readonly variableMerger: VariableMerger
  ) {}

  /**
   * 获取合并后的变量
   */
  async getVariables(request: GetVariablesRequest): Promise<GetVariablesResponse> {
    const context: VariableMergeContext = {
      globalVariables: request.globalVariables || {},
      documentPath: request.documentPath,
      documentContent: request.documentContent,
      runtimeVariables: request.runtimeVariables
    };

    const variables = await this.variableMerger.mergeVariables(context);

    return {
      variables,
      sources: {
        global: context.globalVariables || {},
        folder: request.documentPath
          ? await this.folderResolver.resolveInheritedVariables(request.documentPath)
          : {},
        document: request.documentContent
          ? this.frontmatterParser.extractVariables(request.documentContent)
          : {},
        runtime: request.runtimeVariables || {}
      }
    };
  }

  /**
   * 处理模板，替换变量
   */
  async processTemplate(request: ProcessTemplateRequest): Promise<ProcessTemplateResponse> {
    // 获取变量
    const context: VariableMergeContext = {
      globalVariables: request.globalVariables || {},
      documentPath: request.documentPath,
      documentContent: request.documentContent,
      runtimeVariables: request.runtimeVariables
    };

    const variables = await this.variableMerger.mergeVariables(context);

    // 处理模板
    const result = await this.templateProcessor.processTemplate(request.template, variables);

    return {
      result,
      variables
    };
  }

  /**
   * 设置文档变量
   */
  async setDocumentVariable(request: SetDocumentVariableRequest): Promise<SetDocumentVariableResponse> {
    const { documentContent, variableName, variableValue } = request;

    // 检查是否存在frontmatter
    const hasFrontmatter = this.frontmatterParser.hasFrontmatter(documentContent);

    let updatedContent: string;
    let isNew: boolean;

    if (hasFrontmatter) {
      // 更新现有变量
      updatedContent = this.frontmatterParser.addVariable(documentContent, variableName, variableValue);
      // 检查是否是新增的变量（通过查看原有文档中是否已有该变量）
      const existingVars = this.frontmatterParser.extractVariables(documentContent);
      isNew = !existingVars.hasOwnProperty(variableName);
    } else {
      // 添加新变量（会创建frontmatter）
      updatedContent = this.frontmatterParser.addVariable(documentContent, variableName, variableValue);
      isNew = true;
    }

    return {
      updatedContent,
      isNew
    };
  }

  /**
   * 删除文档变量
   */
  async removeDocumentVariable(request: RemoveDocumentVariableRequest): Promise<RemoveDocumentVariableResponse> {
    const { documentContent, variableName } = request;

    // 检查是否存在frontmatter
    const hasFrontmatter = this.frontmatterParser.hasFrontmatter(documentContent);

    if (!hasFrontmatter) {
      return {
        updatedContent: documentContent,
        removed: false
      };
    }

    // 先检查变量是否存在
    const existingVariables = this.frontmatterParser.extractVariables(documentContent);

    if (!existingVariables.hasOwnProperty(variableName)) {
      return {
        updatedContent: documentContent,
        removed: false
      };
    }

    // 删除变量
    const updatedContent = this.frontmatterParser.removeVariable(documentContent, variableName);

    return {
      updatedContent,
      removed: true
    };
  }

  /**
   * 获取文件夹变量
   */
  async getFolderVariables(request: GetFolderVariablesRequest): Promise<GetFolderVariablesResponse> {
    const { folderPath, includeInherited = false } = request;

    const variables = includeInherited
      ? await this.folderResolver.resolveInheritedVariables(folderPath)
      : await this.folderResolver.resolveFolderVariables(folderPath);

    return {
      variables,
      folderPath
    };
  }

  /**
   * 保存文件夹变量
   */
  async saveFolderVariables(request: SaveFolderVariablesRequest): Promise<SaveFolderVariablesResponse> {
    const { folderPath, variables, format = 'yml' } = request;

    await this.folderResolver.saveFolderVariables(folderPath, variables, format);

    const fileName = format === 'yml' ? '.mdnote-vars.yml' : '.mdnote-vars.json';
    const separator = folderPath.includes('\\') ? '\\' : '/';
    const filePath = folderPath + separator + fileName;

    return {
      success: true,
      filePath
    };
  }

  /**
   * 获取变量来源
   */
  async getVariableOrigin(request: GetVariableOriginRequest): Promise<GetVariableOriginResponse> {
    const { variableName, documentPath, documentContent, globalVariables, runtimeVariables } = request;

    const context: VariableMergeContext = {
      globalVariables: globalVariables || {},
      documentPath,
      documentContent,
      runtimeVariables
    };

    // 获取合并后的变量以查找值
    const variables = await this.variableMerger.mergeVariables(context);
    const value = variables[variableName];

    // 获取来源
    const origin = await this.variableMerger.getVariableOrigin(context, variableName);

    return {
      origin: origin as any,
      value
    };
  }

  /**
   * 清除缓存
   */
  async clearCache(request: ClearCacheRequest = {}): Promise<ClearCacheResponse> {
    const { folderPath } = request;

    if (folderPath) {
      // 清除特定文件夹的缓存
      this.folderResolver.clearFolderCache(folderPath);
      this.variableMerger.clearCache();

      return {
        success: true,
        count: 1
      };
    } else {
      // 清除所有缓存
      const cacheSizeBefore = this.getCacheSize();
      this.folderResolver.clearCache();
      this.variableMerger.clearCache();

      return {
        success: true,
        count: cacheSizeBefore
      };
    }
  }

  /**
   * 清除过期的缓存
   */
  async clearExpiredCache(): Promise<ClearCacheResponse> {
    this.variableMerger.clearExpiredCache();

    return {
      success: true,
      count: 0 // VariableMerger不暴露缓存大小，所以返回0
    };
  }

  /**
   * 获取缓存大小（用于内部统计）
   */
  private getCacheSize(): number {
    // 这是一个辅助方法，用于统计缓存清除的数量
    // 实际实现可能需要在领域服务中添加获取缓存大小的方法
    return 0;
  }

  /**
   * 批量设置文档变量
   */
  async batchSetDocumentVariables(
    documentContent: string,
    variables: Record<string, any>
  ): Promise<SetDocumentVariableResponse> {
    // 如果没有变量要设置，直接返回
    if (Object.keys(variables).length === 0) {
      return {
        updatedContent: documentContent,
        isNew: false
      };
    }

    let updatedContent = documentContent;
    const hadFrontmatter = this.frontmatterParser.hasFrontmatter(documentContent);

    for (const [name, value] of Object.entries(variables)) {
      const result = await this.setDocumentVariable({
        documentContent: updatedContent,
        variableName: name,
        variableValue: value
      });
      updatedContent = result.updatedContent;
    }

    return {
      updatedContent,
      isNew: !hadFrontmatter
    };
  }

  /**
   * 获取文档中的所有变量
   */
  async getDocumentVariables(documentContent: string): Promise<Record<string, any>> {
    return this.frontmatterParser.extractVariables(documentContent);
  }

  /**
   * 检查文档是否有变量
   */
  async hasDocumentVariables(documentContent: string): Promise<boolean> {
    const variables = this.frontmatterParser.extractVariables(documentContent);
    return Object.keys(variables).length > 0;
  }

  /**
   * 预览模板处理结果（不保存）
   */
  async previewTemplate(
    template: string,
    variables: Record<string, any>
  ): Promise<ProcessTemplateResponse> {
    const result = await this.templateProcessor.processTemplate(template, variables);

    return {
      result,
      variables
    };
  }

  /**
   * 从模板中提取变量名
   */
  async extractVariablesFromTemplate(template: string): Promise<string[]> {
    return this.templateProcessor.extractVariables(template);
  }

  /**
   * 验证变量名是否有效
   */
  validateVariableName(variableName: string): boolean {
    return this.templateProcessor.validateVariableName(variableName);
  }

  /**
   * 获取模板中的所有变量占位符
   */
  async getTemplatePlaceholders(template: string): Promise<string[]> {
    return this.templateProcessor.extractVariables(template);
  }
}
