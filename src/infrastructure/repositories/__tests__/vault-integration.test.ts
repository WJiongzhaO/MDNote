import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileSystemVaultRepository } from '../file-system.vault.repository.impl';
import { VaultFileService } from '../../services/vault-file.service';
import { KnowledgeVault } from '../../../domain/entities/knowledge-vault.entity';
import type { VaultId, VaultPath } from '../../../domain/types/vault.types';

describe('Vault Integration Test - Create and Delete', () => {
  let repository: FileSystemVaultRepository;
  let vaultFileService: VaultFileService;
  let mockElectronAPI: any;
  let createdFiles: string[];
  let createdDirectories: string[];

  beforeEach(() => {
    createdFiles = [];
    createdDirectories = [];

    mockElectronAPI = {
      file: {
        createDirectory: vi.fn().mockImplementation(async (path: string) => {
          createdDirectories.push(path);
          console.log(`[创建目录] ${path}`);
          return undefined;
        }),
        write: vi.fn().mockImplementation(async (path: string, content: any) => {
          createdFiles.push(path);
          console.log(`[创建文件] ${path}`);
          if (content) {
            console.log(`  内容预览: ${JSON.stringify(content).substring(0, 100)}...`);
          }
          return undefined;
        }),
        read: vi.fn().mockResolvedValue(null),
        deleteDirectory: vi.fn().mockImplementation(async (path: string) => {
          console.log(`[删除目录] ${path}`);
          const deletedFiles = createdFiles.filter(f => f.startsWith(path));
          const deletedDirs = createdDirectories.filter(d => d === path || d.startsWith(path + '/'));
          console.log(`  删除的文件数: ${deletedFiles.length}`);
          console.log(`  删除的目录数: ${deletedDirs.length}`);
          return undefined;
        }),
        exists: vi.fn().mockResolvedValue(false),
        directoryExists: vi.fn().mockResolvedValue(true)
      }
    };

    (window as any).electronAPI = mockElectronAPI;
    repository = new FileSystemVaultRepository();
    repository.clearCache();
    vaultFileService = new VaultFileService();
  });

  afterEach(() => {
    repository.clearCache();
  });

  it('should create a vault, output created files, and then delete it', async () => {
    console.log('\n========================================');
    console.log('开始知识库创建测试');
    console.log('========================================\n');

    const vaultId = 'vault-20260312-test001';
    const vaultPath = '/test/vault-integration-test';
    const vaultName = 'Integration Test Vault';
    const vaultDescription = 'This is a test vault for integration testing';
    const vaultOwner = 'Test User';

    console.log('知识库配置:');
    console.log(`  ID: ${vaultId}`);
    console.log(`  名称: ${vaultName}`);
    console.log(`  路径: ${vaultPath}`);
    console.log(`  描述: ${vaultDescription}`);
    console.log(`  所有者: ${vaultOwner}`);
    console.log('\n----------------------------------------');
    console.log('步骤 1: 创建知识库');
    console.log('----------------------------------------\n');

    const vault = KnowledgeVault.create(
      { value: vaultId } as VaultId,
      { value: vaultName },
      { value: vaultDescription },
      { value: vaultOwner },
      { value: vaultPath } as VaultPath
    );

    await repository.create(vault);

    console.log('\n----------------------------------------');
    console.log('步骤 2: 输出创建的文件和目录');
    console.log('----------------------------------------\n');

    console.log('\n创建的目录列表:');
    createdDirectories.sort().forEach((dir, index) => {
      const relativePath = dir.replace(vaultPath, '.');
      console.log(`  ${index + 1}. ${relativePath}`);
    });

    console.log('\n创建的文件列表:');
    createdFiles.sort().forEach((file, index) => {
      const relativePath = file.replace(vaultPath, '.');
      console.log(`  ${index + 1}. ${relativePath}`);
    });

    console.log('\n统计信息:');
    console.log(`  总目录数: ${createdDirectories.length}`);
    console.log(`  总文件数: ${createdFiles.length}`);

    expect(createdDirectories.length).toBeGreaterThan(0);
    expect(createdFiles.length).toBeGreaterThan(0);

    expect(createdDirectories).toContain(vaultPath);
    expect(createdDirectories).toContain(`${vaultPath}/.vault`);
    expect(createdDirectories).toContain(`${vaultPath}/documents`);
    expect(createdDirectories).toContain(`${vaultPath}/fragments`);

    expect(createdFiles).toContain(`${vaultPath}/vault.json`);
    expect(createdFiles).toContain(`${vaultPath}/config.json`);
    expect(createdFiles).toContain(`${vaultPath}/.vault/index.json`);
    expect(createdFiles).toContain(`${vaultPath}/documents/index.json`);
    expect(createdFiles).toContain(`${vaultPath}/fragments/index.json`);

    console.log('\n----------------------------------------');
    console.log('步骤 3: 验证知识库已缓存');
    console.log('----------------------------------------\n');

    const cachedVault = await repository.findById({ value: vaultId });
    expect(cachedVault).not.toBeNull();
    expect(cachedVault?.getName().value).toBe(vaultName);
    console.log(`知识库已缓存: ${cachedVault?.getName().value}`);

    console.log('\n----------------------------------------');
    console.log('步骤 4: 删除知识库');
    console.log('----------------------------------------\n');

    await repository.delete({ value: vaultId });

    console.log('\n----------------------------------------');
    console.log('步骤 5: 验证知识库已从缓存中移除');
    console.log('----------------------------------------\n');

    const deletedVault = await repository.findById({ value: vaultId });
    expect(deletedVault).toBeNull();
    console.log('知识库已从缓存中移除');

    expect(mockElectronAPI.file.deleteDirectory).toHaveBeenCalledWith(vaultPath);

    console.log('\n========================================');
    console.log('测试完成');
    console.log('========================================\n');
  });

  it('should create vault with complete structure including all index files', async () => {
    console.log('\n========================================');
    console.log('完整知识库结构验证测试');
    console.log('========================================\n');

    const vaultId = 'vault-20260312-structure-test';
    const vaultPath = '/test/vault-structure-test';

    const vault = KnowledgeVault.create(
      { value: vaultId } as VaultId,
      { value: 'Structure Test Vault' },
      { value: 'Testing complete vault structure' },
      { value: 'Structure Tester' },
      { value: vaultPath } as VaultPath
    );

    await repository.create(vault);

    const expectedDirectories = [
      vaultPath,
      `${vaultPath}/.vault`,
      `${vaultPath}/documents`,
      `${vaultPath}/fragments`,
      `${vaultPath}/variables`,
      `${vaultPath}/templates`,
      `${vaultPath}/exports`,
      `${vaultPath}/archive`
    ];

    const expectedFiles = [
      `${vaultPath}/vault.json`,
      `${vaultPath}/config.json`,
      `${vaultPath}/.vault/index.json`,
      `${vaultPath}/.vault/graph.json`,
      `${vaultPath}/.vault/lineage.json`,
      `${vaultPath}/.vault/health.json`,
      `${vaultPath}/documents/index.json`,
      `${vaultPath}/fragments/index.json`
    ];

    console.log('验证目录结构...');
    for (const dir of expectedDirectories) {
      const exists = createdDirectories.includes(dir);
      console.log(`  ${exists ? '✓' : '✗'} ${dir.replace(vaultPath, '.')}`);
      expect(createdDirectories).toContain(dir);
    }

    console.log('\n验证文件结构...');
    for (const file of expectedFiles) {
      const exists = createdFiles.includes(file);
      console.log(`  ${exists ? '✓' : '✗'} ${file.replace(vaultPath, '.')}`);
      expect(createdFiles).toContain(file);
    }

    console.log('\n所有目录和文件验证通过！');

    await repository.delete({ value: vaultId });

    console.log('\n知识库已删除');
  });

  it('should output detailed file contents on creation', async () => {
    console.log('\n========================================');
    console.log('文件内容详细输出测试');
    console.log('========================================\n');

    let writtenContents: Record<string, any> = {};

    mockElectronAPI.file.write = vi.fn().mockImplementation(async (path: string, content: any) => {
      createdFiles.push(path);
      writtenContents[path] = content;
      return undefined;
    });

    repository = new FileSystemVaultRepository();
    repository.clearCache();

    const vaultId = 'vault-20260312-content-test';
    const vaultPath = '/test/vault-content-test';

    const vault = KnowledgeVault.create(
      { value: vaultId } as VaultId,
      { value: 'Content Test Vault' },
      { value: 'Testing file contents' },
      { value: 'Content Tester' },
      { value: vaultPath } as VaultPath
    );

    await repository.create(vault);

    console.log('创建的文件及其内容:\n');

    for (const [path, content] of Object.entries(writtenContents)) {
      const relativePath = path.replace(vaultPath, '.');
      console.log(`\n📄 ${relativePath}`);
      console.log('─'.repeat(50));
      console.log(JSON.stringify(content, null, 2));
    }

    expect(Object.keys(writtenContents).length).toBeGreaterThan(0);

    const vaultJsonPath = `${vaultPath}/vault.json`;
    expect(writtenContents[vaultJsonPath]).toBeDefined();
    expect(writtenContents[vaultJsonPath].id).toBe(vaultId);
    expect(writtenContents[vaultJsonPath].name).toBe('Content Test Vault');

    console.log('\n========================================');
    console.log('内容输出测试完成');
    console.log('========================================\n');
  });
});
