import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VariableUseCases } from '../variable.usecases';
import { SimpleTemplateProcessor } from '../../../domain/services/simple-template-processor.service';
import { FrontmatterParser } from '../../../domain/services/frontmatter-parser.service';
import { FolderVariableResolver } from '../../../domain/services/folder-variable-resolver.service';
import { VariableMerger } from '../../../domain/services/variable-merger.service';

describe('VariableUseCases', () => {
  let useCases: VariableUseCases;
  let templateProcessor: SimpleTemplateProcessor;
  let frontmatterParser: FrontmatterParser;
  let folderResolver: FolderVariableResolver;
  let variableMerger: VariableMerger;

  beforeEach(() => {
    vi.useFakeTimers();

    templateProcessor = new SimpleTemplateProcessor();
    frontmatterParser = new FrontmatterParser();
    folderResolver = new FolderVariableResolver();
    variableMerger = new VariableMerger(frontmatterParser, folderResolver);

    useCases = new VariableUseCases(
      templateProcessor,
      frontmatterParser,
      folderResolver,
      variableMerger
    );

    // 模拟 electronAPI
    const mockElectronAPI = {
      file: {
        read: vi.fn(),
        write: vi.fn(),
        delete: vi.fn(),
        getStats: vi.fn()
      }
    };
    (window as any).electronAPI = mockElectronAPI;
  });

  describe('getVariables', () => {
    it('应该获取合并后的变量', async () => {
      const request = {
        globalVariables: { globalVar: 'global' },
        documentPath: '/project',
        documentContent: `---
variables:
  docVar: document
---

Content`,
        runtimeVariables: { runtimeVar: 'runtime' }
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        folderVar: 'folder'
      });

      const response = await useCases.getVariables(request);

      expect(response.variables).toEqual({
        globalVar: 'global',
        folderVar: 'folder',
        docVar: 'document',
        runtimeVar: 'runtime'
      });
    });

    it('应该返回变量来源信息', async () => {
      const request = {
        globalVariables: { globalVar: 'global' },
        documentPath: '/project',
        documentContent: `---
variables:
  docVar: document
---

Content`
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        folderVar: 'folder'
      });

      const response = await useCases.getVariables(request);

      expect(response.sources.global).toEqual({ globalVar: 'global' });
      expect(response.sources.folder).toEqual({ folderVar: 'folder' });
      expect(response.sources.document).toEqual({ docVar: 'document' });
      expect(response.sources.runtime).toEqual({});
    });

    it('应该处理空请求', async () => {
      const request = {};

      const response = await useCases.getVariables(request);

      expect(response.variables).toEqual({});
      expect(response.sources.global).toEqual({});
      expect(response.sources.folder).toEqual({});
      expect(response.sources.document).toEqual({});
      expect(response.sources.runtime).toEqual({});
    });
  });

  describe('processTemplate', () => {
    it('应该处理模板并替换变量', async () => {
      const request = {
        template: 'Hello {{name}}, version is {{version}}',
        globalVariables: {
          name: 'MDNote',
          version: '1.0.0'
        }
      };

      const response = await useCases.processTemplate(request);

      expect(response.result).toBe('Hello MDNote, version is 1.0.0');
      expect(response.variables).toEqual({
        name: 'MDNote',
        version: '1.0.0'
      });
    });

    it('应该使用文档变量替换模板', async () => {
      const request = {
        template: 'Project: {{projectName}}, Author: {{author}}',
        documentContent: `---
variables:
  projectName: MyProject
  author: John
---

Content`
      };

      const response = await useCases.processTemplate(request);

      expect(response.result).toBe('Project: MyProject, Author: John');
    });

    it('应该使用文件夹变量替换模板', async () => {
      const request = {
        template: 'Project: {{projectName}}',
        documentPath: '/project'
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        projectName: 'TestProject'
      });

      const response = await useCases.processTemplate(request);

      expect(response.result).toBe('Project: TestProject');
    });

    it('应该正确处理变量优先级', async () => {
      const request = {
        template: 'Value: {{value}}',
        globalVariables: { value: 'global' },
        documentContent: `---
variables:
  value: document
---

Content`,
        runtimeVariables: { value: 'runtime' }
      };

      const response = await useCases.processTemplate(request);

      expect(response.result).toBe('Value: runtime');
    });

    it('应该保留未定义的变量占位符', async () => {
      const request = {
        template: 'Hello {{undefinedVar}}'
      };

      const response = await useCases.processTemplate(request);

      expect(response.result).toBe('Hello {{undefinedVar}}');
    });
  });

  describe('setDocumentVariable', () => {
    it('应该在现有frontmatter中设置变量', async () => {
      const request = {
        documentContent: `---
variables:
  existingVar: value
---

Content`,
        variableName: 'newVar',
        variableValue: 'newValue'
      };

      const response = await useCases.setDocumentVariable(request);

      expect(response.updatedContent).toContain('newVar: newValue');
      expect(response.updatedContent).toContain('existingVar: value');
      // newVar是新变量，所以isNew是true
      expect(response.isNew).toBe(true);
    });

    it('应该创建新的frontmatter并设置变量', async () => {
      const request = {
        documentContent: `# Title

Content without frontmatter`,
        variableName: 'newVar',
        variableValue: 'newValue'
      };

      const response = await useCases.setDocumentVariable(request);

      expect(response.updatedContent).toMatch(/^---\nvariables:\n  newVar: newValue\n---/);
      expect(response.isNew).toBe(true);
    });

    it('应该更新现有变量', async () => {
      const request = {
        documentContent: `---
variables:
  myVar: oldValue
---

Content`,
        variableName: 'myVar',
        variableValue: 'newValue'
      };

      const response = await useCases.setDocumentVariable(request);

      expect(response.updatedContent).toContain('myVar: newValue');
      expect(response.isNew).toBe(false);
    });

    it('应该处理复杂的变量值', async () => {
      const request = {
        documentContent: `Content`,
        variableName: 'complexVar',
        variableValue: {
          nested: {
            value: 'test',
            array: [1, 2, 3]
          }
        }
      };

      const response = await useCases.setDocumentVariable(request);

      expect(response.updatedContent).toContain('complexVar:');
      expect(response.isNew).toBe(true);
    });
  });

  describe('removeDocumentVariable', () => {
    it('应该删除存在的变量', async () => {
      const request = {
        documentContent: `---
variables:
  var1: value1
  var2: value2
---

Content`,
        variableName: 'var1'
      };

      const response = await useCases.removeDocumentVariable(request);

      expect(response.updatedContent).not.toContain('var1:');
      expect(response.updatedContent).toContain('var2:');
      expect(response.removed).toBe(true);
    });

    it('应该处理不存在的变量', async () => {
      const request = {
        documentContent: `---
variables:
  var1: value1
---

Content`,
        variableName: 'nonExistentVar'
      };

      const response = await useCases.removeDocumentVariable(request);

      expect(response.updatedContent).toContain('var1:');
      expect(response.removed).toBe(false);
    });

    it('应该处理没有frontmatter的文档', async () => {
      const request = {
        documentContent: `# Title

Content without frontmatter`,
        variableName: 'anyVar'
      };

      const response = await useCases.removeDocumentVariable(request);

      expect(response.updatedContent).toBe(request.documentContent);
      expect(response.removed).toBe(false);
    });

    it('应该删除最后一个变量后保留variables字段', async () => {
      const request = {
        documentContent: `---
variables:
  onlyVar: value
---

Content`,
        variableName: 'onlyVar'
      };

      const response = await useCases.removeDocumentVariable(request);

      expect(response.updatedContent).not.toContain('onlyVar:');
      expect(response.removed).toBe(true);
    });
  });

  describe('getFolderVariables', () => {
    it('应该获取文件夹变量', async () => {
      const request = {
        folderPath: '/project',
        includeInherited: false
      };

      vi.spyOn(folderResolver, 'resolveFolderVariables').mockResolvedValue({
        folderVar: 'folderValue'
      });

      const response = await useCases.getFolderVariables(request);

      expect(response.variables).toEqual({ folderVar: 'folderValue' });
      expect(response.folderPath).toBe('/project');
    });

    it('应该获取继承的文件夹变量', async () => {
      const request = {
        folderPath: '/project/docs',
        includeInherited: true
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        rootVar: 'root',
        parentVar: 'parent',
        currentVar: 'current'
      });

      const response = await useCases.getFolderVariables(request);

      expect(response.variables).toEqual({
        rootVar: 'root',
        parentVar: 'parent',
        currentVar: 'current'
      });
    });

    it('应该处理空文件夹变量', async () => {
      const request = {
        folderPath: '/empty',
        includeInherited: false
      };

      vi.spyOn(folderResolver, 'resolveFolderVariables').mockResolvedValue({});

      const response = await useCases.getFolderVariables(request);

      expect(response.variables).toEqual({});
    });
  });

  describe('saveFolderVariables', () => {
    it('应该保存文件夹变量为YAML格式', async () => {
      const request = {
        folderPath: '/project',
        variables: {
          name: 'TestProject',
          version: '1.0.0'
        },
        format: 'yml' as const
      };

      const mockWrite = vi.fn().mockResolvedValue(undefined);
      (window as any).electronAPI.file.write = mockWrite;
      (window as any).electronAPI.file.delete = vi.fn().mockResolvedValue(undefined);
      (window as any).electronAPI.file.getStats = vi.fn().mockResolvedValue({ mtime: 123456 });

      const response = await useCases.saveFolderVariables(request);

      expect(response.success).toBe(true);
      expect(response.filePath).toContain('.mdnote-vars.yml');
      expect(mockWrite).toHaveBeenCalled();
    });

    it('应该保存文件夹变量为JSON格式', async () => {
      const request = {
        folderPath: '/project',
        variables: { name: 'Test' },
        format: 'json' as const
      };

      const mockWrite = vi.fn().mockResolvedValue(undefined);
      (window as any).electronAPI.file.write = mockWrite;
      (window as any).electronAPI.file.delete = vi.fn().mockResolvedValue(undefined);
      (window as any).electronAPI.file.getStats = vi.fn().mockResolvedValue({ mtime: 123456 });

      const response = await useCases.saveFolderVariables(request);

      expect(response.success).toBe(true);
      expect(response.filePath).toContain('.mdnote-vars.json');
    });

    it('应该默认使用YAML格式', async () => {
      const request = {
        folderPath: '/project',
        variables: { name: 'Test' }
      };

      const mockWrite = vi.fn().mockResolvedValue(undefined);
      (window as any).electronAPI.file.write = mockWrite;
      (window as any).electronAPI.file.delete = vi.fn().mockResolvedValue(undefined);
      (window as any).electronAPI.file.getStats = vi.fn().mockResolvedValue({ mtime: 123456 });

      const response = await useCases.saveFolderVariables(request);

      expect(response.filePath).toContain('.mdnote-vars.yml');
    });
  });

  describe('getVariableOrigin', () => {
    it('应该识别运行时变量', async () => {
      const request = {
        variableName: 'testVar',
        runtimeVariables: { testVar: 'runtime' }
      };

      const response = await useCases.getVariableOrigin(request);

      expect(response.origin).toBe('runtime');
      expect(response.value).toBe('runtime');
    });

    it('应该识别文档变量', async () => {
      const request = {
        variableName: 'testVar',
        documentContent: `---
variables:
  testVar: document
---

Content`
      };

      const response = await useCases.getVariableOrigin(request);

      expect(response.origin).toBe('document');
      expect(response.value).toBe('document');
    });

    it('应该识别文件夹变量', async () => {
      const request = {
        variableName: 'testVar',
        documentPath: '/project'
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        testVar: 'folder'
      });

      const response = await useCases.getVariableOrigin(request);

      expect(response.origin).toBe('folder');
      expect(response.value).toBe('folder');
    });

    it('应该识别全局变量', async () => {
      const request = {
        variableName: 'testVar',
        globalVariables: { testVar: 'global' }
      };

      const response = await useCases.getVariableOrigin(request);

      expect(response.origin).toBe('global');
      expect(response.value).toBe('global');
    });

    it('应该正确处理优先级', async () => {
      const request = {
        variableName: 'testVar',
        globalVariables: { testVar: 'global' },
        documentContent: `---
variables:
  testVar: document
---

Content`,
        runtimeVariables: { testVar: 'runtime' }
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        testVar: 'folder'
      });

      const response = await useCases.getVariableOrigin(request);

      expect(response.origin).toBe('runtime');
      expect(response.value).toBe('runtime');
    });

    it('应该返回undefined对于未定义的变量', async () => {
      const request = {
        variableName: 'nonExistent'
      };

      const response = await useCases.getVariableOrigin(request);

      expect(response.origin).toBe('undefined');
      expect(response.value).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('应该清除所有缓存', async () => {
      const response = await useCases.clearCache({});

      expect(response.success).toBe(true);
      expect(response.count).toBe(0);
    });

    it('应该清除特定文件夹的缓存', async () => {
      const response = await useCases.clearCache({
        folderPath: '/project'
      });

      expect(response.success).toBe(true);
      expect(response.count).toBe(1);
    });

    it('应该不传参数时清除所有缓存', async () => {
      const response = await useCases.clearCache();

      expect(response.success).toBe(true);
    });
  });

  describe('clearExpiredCache', () => {
    it('应该清除过期的缓存', async () => {
      const response = await useCases.clearExpiredCache();

      expect(response.success).toBe(true);
    });
  });

  describe('batchSetDocumentVariables', () => {
    it('应该批量设置多个变量', async () => {
      const documentContent = `Content`;

      const response = await useCases.batchSetDocumentVariables(documentContent, {
        var1: 'value1',
        var2: 'value2',
        var3: 'value3'
      });

      expect(response.updatedContent).toContain('var1:');
      expect(response.updatedContent).toContain('var2:');
      expect(response.updatedContent).toContain('var3:');
      expect(response.isNew).toBe(true);
    });

    it('应该更新现有变量', async () => {
      const documentContent = `---
variables:
  var1: old1
---

Content`;

      const response = await useCases.batchSetDocumentVariables(documentContent, {
        var1: 'new1',
        var2: 'value2'
      });

      expect(response.updatedContent).toContain('var1: new1');
      expect(response.updatedContent).toContain('var2:');
      expect(response.isNew).toBe(false);
    });

    it('应该处理空变量对象', async () => {
      const documentContent = `Content`;

      const response = await useCases.batchSetDocumentVariables(documentContent, {});

      expect(response.updatedContent).toBe(documentContent);
      expect(response.isNew).toBe(false);
    });
  });

  describe('getDocumentVariables', () => {
    it('应该获取文档中的所有变量', async () => {
      const documentContent = `---
variables:
  name: Test
  version: 1.0.0
  author: John
---

Content`;

      const variables = await useCases.getDocumentVariables(documentContent);

      expect(variables).toEqual({
        name: 'Test',
        version: '1.0.0',
        author: 'John'
      });
    });

    it('应该处理没有变量的文档', async () => {
      const documentContent = `# Title

Content`;

      const variables = await useCases.getDocumentVariables(documentContent);

      expect(variables).toEqual({});
    });

    it('应该处理空的frontmatter', async () => {
      const documentContent = `---
---

Content`;

      const variables = await useCases.getDocumentVariables(documentContent);

      expect(variables).toEqual({});
    });
  });

  describe('hasDocumentVariables', () => {
    it('应该返回true如果文档有变量', async () => {
      const documentContent = `---
variables:
  name: Test
---

Content`;

      const hasVariables = await useCases.hasDocumentVariables(documentContent);

      expect(hasVariables).toBe(true);
    });

    it('应该返回false如果文档没有变量', async () => {
      const documentContent = `# Title

Content`;

      const hasVariables = await useCases.hasDocumentVariables(documentContent);

      expect(hasVariables).toBe(false);
    });

    it('应该返回false对于空的variables对象', async () => {
      const documentContent = `---
variables: {}
---

Content`;

      const hasVariables = await useCases.hasDocumentVariables(documentContent);

      expect(hasVariables).toBe(false);
    });
  });

  describe('previewTemplate', () => {
    it('应该预览模板处理结果', async () => {
      const template = 'Hello {{name}}';
      const variables = { name: 'World' };

      const response = await useCases.previewTemplate(template, variables);

      expect(response.result).toBe('Hello World');
      expect(response.variables).toEqual(variables);
    });

    it('应该处理多个变量', async () => {
      const template = '{{greeting}} {{name}}, version is {{version}}';
      const variables = {
        greeting: 'Hello',
        name: 'World',
        version: '1.0.0'
      };

      const response = await useCases.previewTemplate(template, variables);

      expect(response.result).toBe('Hello World, version is 1.0.0');
    });

    it('应该保留未定义的变量', async () => {
      const template = 'Hello {{name}}, {{undefinedVar}}';
      const variables = { name: 'World' };

      const response = await useCases.previewTemplate(template, variables);

      expect(response.result).toBe('Hello World, {{undefinedVar}}');
    });
  });

  describe('extractVariablesFromTemplate', () => {
    it('应该提取模板中的所有变量名', async () => {
      const template = 'Hello {{name}}, version is {{version}}';

      const variables = await useCases.extractVariablesFromTemplate(template);

      expect(variables).toEqual(['name', 'version']);
    });

    it('应该处理重复的变量名', async () => {
      const template = '{{name}} says {{name}} to {{name}}';

      const variables = await useCases.extractVariablesFromTemplate(template);

      // extractVariables会去重
      expect(variables).toEqual(['name']);
    });

    it('应该处理没有变量的模板', async () => {
      const template = 'Hello World';

      const variables = await useCases.extractVariablesFromTemplate(template);

      expect(variables).toEqual([]);
    });
  });

  describe('validateVariableName', () => {
    it('应该接受有效的变量名', () => {
      expect(useCases.validateVariableName('name')).toBe(true);
      expect(useCases.validateVariableName('variable_name')).toBe(true);
      expect(useCases.validateVariableName('variableName123')).toBe(true);
      expect(useCases.validateVariableName('_private')).toBe(true);
    });

    it('应该拒绝无效的变量名', () => {
      expect(useCases.validateVariableName('123name')).toBe(false);
      expect(useCases.validateVariableName('variable-name')).toBe(false);
      expect(useCases.validateVariableName('variable.name')).toBe(false);
      expect(useCases.validateVariableName('')).toBe(false);
      expect(useCases.validateVariableName('name with spaces')).toBe(false);
    });
  });

  describe('getTemplatePlaceholders', () => {
    it('应该获取模板中的所有占位符', async () => {
      const template = 'Hello {{name}}, version is {{version}}';

      const placeholders = await useCases.getTemplatePlaceholders(template);

      expect(placeholders).toEqual(['name', 'version']);
    });

    it('应该与extractVariablesFromTemplate相同', async () => {
      const template = '{{var1}} and {{var2}}';

      const placeholders = await useCases.getTemplatePlaceholders(template);
      const variables = await useCases.extractVariablesFromTemplate(template);

      expect(placeholders).toEqual(variables);
    });
  });

  describe('集成测试', () => {
    it('应该完整处理文档变量替换流程', async () => {
      // 场景：用户编辑文档，文档有frontmatter变量，需要渲染预览
      const documentContent = `---
variables:
  title: My Document
  author: John
  date: 2024-01-01
---

# {{title}}

Author: {{author}}
Date: {{date}}
`;

      const request = {
        template: documentContent,
        documentContent: documentContent
      };

      const response = await useCases.processTemplate(request);

      expect(response.result).toContain('# My Document');
      expect(response.result).toContain('Author: John');
      expect(response.result).toContain('Date:');
    });

    it('应该结合全局变量和文档变量', async () => {
      const documentContent = `---
variables:
  projectName: MyProject
---

Welcome to {{projectName}} ({{version}})
`;

      const request = {
        template: documentContent,
        documentContent: documentContent,
        globalVariables: {
          version: '2.0.0'
        }
      };

      const response = await useCases.processTemplate(request);

      expect(response.result).toContain('Welcome to MyProject (2.0.0)');
    });

    it('应该处理文件夹变量继承', async () => {
      const documentContent = `---
variables:
  page: Home
---

Project: {{projectName}}
Page: {{page}}
`;

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        projectName: 'TestProject',
        version: '1.0.0'
      });

      const request = {
        template: documentContent,
        documentPath: '/project/docs/home',
        documentContent: documentContent
      };

      const response = await useCases.processTemplate(request);

      expect(response.result).toContain('Project: TestProject');
      expect(response.result).toContain('Page: Home');
    });
  });
});
