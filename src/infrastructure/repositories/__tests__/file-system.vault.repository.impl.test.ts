import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileSystemVaultRepository } from '../file-system.vault.repository.impl';
import { KnowledgeVault } from '../../../domain/entities/knowledge-vault.entity';
import type { VaultId, VaultPath } from '../../../domain/types/vault.types';

describe('FileSystemVaultRepository', () => {
  let repository: FileSystemVaultRepository;
  let mockElectronAPI: any;

  beforeEach(() => {
    mockElectronAPI = {
      file: {
        createDirectory: vi.fn().mockResolvedValue(undefined),
        write: vi.fn().mockResolvedValue(undefined),
        read: vi.fn().mockResolvedValue(null),
        deleteDirectory: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue(false),
        directoryExists: vi.fn().mockResolvedValue(true)
      }
    };

    (window as any).electronAPI = mockElectronAPI;
    repository = new FileSystemVaultRepository();
    repository.clearCache();
  });

  describe('create', () => {
    it('should create vault with correct structure', async () => {
      const vault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Test Vault' },
        { value: 'Test Description' },
        { value: 'Test Owner' },
        { value: '/test/vault' } as VaultPath
      );

      await repository.create(vault);

      expect(mockElectronAPI.file.createDirectory).toHaveBeenCalled();
      expect(mockElectronAPI.file.write).toHaveBeenCalledWith(
        '/test/vault/vault.json',
        expect.objectContaining({
          id: 'vault-20260312-abc123',
          name: 'Test Vault'
        })
      );
    });

    it('should add vault to cache after creation', async () => {
      const vault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Test Vault' },
        { value: '' },
        { value: '' },
        { value: '/test/vault' } as VaultPath
      );

      await repository.create(vault);

      const cached = await repository.findById({ value: 'vault-20260312-abc123' });
      expect(cached).not.toBeNull();
      expect(cached?.getName().value).toBe('Test Vault');
    });
  });

  describe('findById', () => {
    it('should return null when vault not in cache', async () => {
      const result = await repository.findById({ value: 'non-existent-id' });

      expect(result).toBeNull();
    });

    it('should return vault from cache', async () => {
      const vault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Test Vault' },
        { value: '' },
        { value: '' },
        { value: '/test/vault' } as VaultPath
      );

      repository.addToCache(vault);

      const result = await repository.findById({ value: 'vault-20260312-abc123' });

      expect(result).not.toBeNull();
      expect(result?.getName().value).toBe('Test Vault');
    });
  });

  describe('findByPath', () => {
    it('should return null when vault.json does not exist', async () => {
      mockElectronAPI.file.read.mockResolvedValue(null);

      const result = await repository.findByPath({ value: '/non-existent/path' });

      expect(result).toBeNull();
    });

    it('should return vault when vault.json exists', async () => {
      const mockMetadata = {
        version: '1.0.0',
        id: 'vault-20260312-abc123',
        name: 'Test Vault',
        description: 'Description',
        owner: 'Owner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statistics: {
          totalDocuments: 0,
          totalFragments: 0,
          activeFragments: 0,
          archivedFragments: 0,
          deprecatedFragments: 0,
          totalReferences: 0,
          averageHealthScore: 0
        },
        schemaVersion: '1.0.0',
        compatibility: {
          minAppVersion: '2.0.0',
          features: ['lineage', 'health', 'confidence']
        }
      };
      mockElectronAPI.file.read.mockResolvedValue(mockMetadata);

      const result = await repository.findByPath({ value: '/test/vault' });

      expect(result).not.toBeNull();
      expect(result?.getId().value).toBe('vault-20260312-abc123');
      expect(result?.getName().value).toBe('Test Vault');
    });
  });

  describe('findAll', () => {
    it('should return empty array when no vaults in cache', async () => {
      const result = await repository.findAll();

      expect(result).toHaveLength(0);
    });

    it('should return all vaults from cache', async () => {
      const vault1 = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Vault 1' },
        { value: '' },
        { value: '' },
        { value: '/path1' } as VaultPath
      );
      const vault2 = KnowledgeVault.create(
        { value: 'vault-20260312-xyz789' } as VaultId,
        { value: 'Vault 2' },
        { value: '' },
        { value: '' },
        { value: '/path2' } as VaultPath
      );

      repository.addToCache(vault1);
      repository.addToCache(vault2);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update vault metadata', async () => {
      const vault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Original Name' },
        { value: '' },
        { value: '' },
        { value: '/test/vault' } as VaultPath
      );

      repository.addToCache(vault);
      vault.updateName({ value: 'Updated Name' });

      await repository.update(vault);

      expect(mockElectronAPI.file.write).toHaveBeenCalledWith(
        '/test/vault/vault.json',
        expect.objectContaining({
          name: 'Updated Name'
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete vault directory and remove from cache', async () => {
      const vault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Test Vault' },
        { value: '' },
        { value: '' },
        { value: '/test/vault' } as VaultPath
      );

      repository.addToCache(vault);
      await repository.delete({ value: 'vault-20260312-abc123' });

      expect(mockElectronAPI.file.deleteDirectory).toHaveBeenCalledWith('/test/vault');

      const cached = await repository.findById({ value: 'vault-20260312-abc123' });
      expect(cached).toBeNull();
    });

    it('should do nothing when vault not in cache', async () => {
      await repository.delete({ value: 'non-existent-id' });

      expect(mockElectronAPI.file.deleteDirectory).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when vault.json exists', async () => {
      mockElectronAPI.file.exists.mockResolvedValue(true);

      const result = await repository.exists({ value: '/test/vault' });

      expect(result).toBe(true);
    });

    it('should return false when vault.json does not exist', async () => {
      mockElectronAPI.file.exists.mockResolvedValue(false);

      const result = await repository.exists({ value: '/test/vault' });

      expect(result).toBe(false);
    });
  });

  describe('validateIntegrity', () => {
    it('should return invalid when vault not in cache', async () => {
      const result = await repository.validateIntegrity({ value: 'non-existent-id' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('知识库不存在');
    });

    it('should validate vault structure', async () => {
      const vault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Test Vault' },
        { value: '' },
        { value: '' },
        { value: '/test/vault' } as VaultPath
      );

      repository.addToCache(vault);
      mockElectronAPI.file.exists.mockResolvedValue(true);
      mockElectronAPI.file.directoryExists.mockResolvedValue(true);

      const result = await repository.validateIntegrity({ value: 'vault-20260312-abc123' });

      expect(result.isValid).toBe(true);
    });
  });
});
