import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultUseCases } from '../vault.usecases';
import type { VaultRepository } from '../../../domain/repositories/vault.repository.interface';
import { KnowledgeVault } from '../../../domain/entities/knowledge-vault.entity';
import type { VaultId, VaultPath, VaultIntegrityResult } from '../../../domain/types/vault.types';

describe('VaultUseCases', () => {
  let vaultUseCases: VaultUseCases;
  let mockVaultRepository: VaultRepository;

  beforeEach(() => {
    mockVaultRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByPath: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      validateIntegrity: vi.fn()
    };

    vaultUseCases = new VaultUseCases(mockVaultRepository);
  });

  describe('createVault', () => {
    it('should create a vault successfully', async () => {
      vi.mocked(mockVaultRepository.exists).mockResolvedValue(false);
      vi.mocked(mockVaultRepository.create).mockResolvedValue();

      const request = {
        name: 'Test Vault',
        description: 'Test Description',
        path: '/test/path',
        owner: 'Test Owner'
      };

      const result = await vaultUseCases.createVault(request);

      expect(result.name).toBe('Test Vault');
      expect(result.description).toBe('Test Description');
      expect(result.path).toBe('/test/path');
      expect(result.owner).toBe('Test Owner');
      expect(mockVaultRepository.create).toHaveBeenCalled();
    });

    it('should throw error when name is empty', async () => {
      const request = {
        name: '',
        path: '/test/path'
      };

      await expect(vaultUseCases.createVault(request)).rejects.toThrow('名称验证失败');
    });

    it('should throw error when path is empty', async () => {
      const request = {
        name: 'Test Vault',
        path: ''
      };

      await expect(vaultUseCases.createVault(request)).rejects.toThrow('无法获取知识库存储路径');
    });

    it('should throw error when path already exists', async () => {
      vi.mocked(mockVaultRepository.exists).mockResolvedValue(true);

      const request = {
        name: 'Test Vault',
        path: '/existing/path'
      };

      await expect(vaultUseCases.createVault(request)).rejects.toThrow('该路径已存在知识库');
    });

    it('should throw error when description is too long', async () => {
      vi.mocked(mockVaultRepository.exists).mockResolvedValue(false);

      const request = {
        name: 'Test Vault',
        path: '/test/path',
        description: 'a'.repeat(501)
      };

      await expect(vaultUseCases.createVault(request)).rejects.toThrow('描述验证失败');
    });
  });

  describe('deleteVault', () => {
    it('should delete a vault successfully', async () => {
      const mockVault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Test Vault' },
        { value: '' },
        { value: 'Owner' },
        { value: '/test/path' } as VaultPath
      );
      vi.mocked(mockVaultRepository.findById).mockResolvedValue(mockVault);
      vi.mocked(mockVaultRepository.delete).mockResolvedValue();

      await vaultUseCases.deleteVault({ id: 'vault-20260312-abc123', confirmed: true });

      expect(mockVaultRepository.delete).toHaveBeenCalledWith({ value: 'vault-20260312-abc123' });
    });

    it('should throw error when not confirmed', async () => {
      await expect(
        vaultUseCases.deleteVault({ id: 'vault-20260312-abc123', confirmed: false })
      ).rejects.toThrow('删除操作需要用户确认');
    });

    it('should throw error when vault does not exist', async () => {
      vi.mocked(mockVaultRepository.findById).mockResolvedValue(null);

      await expect(
        vaultUseCases.deleteVault({ id: 'vault-20260312-abc123', confirmed: true })
      ).rejects.toThrow('知识库不存在');
    });
  });

  describe('getVault', () => {
    it('should return vault when found', async () => {
      const mockVault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Test Vault' },
        { value: 'Description' },
        { value: 'Owner' },
        { value: '/test/path' } as VaultPath
      );
      vi.mocked(mockVaultRepository.findById).mockResolvedValue(mockVault);

      const result = await vaultUseCases.getVault('vault-20260312-abc123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('vault-20260312-abc123');
      expect(result?.name).toBe('Test Vault');
    });

    it('should return null when vault not found', async () => {
      vi.mocked(mockVaultRepository.findById).mockResolvedValue(null);

      const result = await vaultUseCases.getVault('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getVaultByPath', () => {
    it('should return vault when found by path', async () => {
      const mockVault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Test Vault' },
        { value: '' },
        { value: 'Owner' },
        { value: '/test/path' } as VaultPath
      );
      vi.mocked(mockVaultRepository.findByPath).mockResolvedValue(mockVault);

      const result = await vaultUseCases.getVaultByPath('/test/path');

      expect(result).not.toBeNull();
      expect(result?.path).toBe('/test/path');
    });

    it('should return null when vault not found by path', async () => {
      vi.mocked(mockVaultRepository.findByPath).mockResolvedValue(null);

      const result = await vaultUseCases.getVaultByPath('/non-existent/path');

      expect(result).toBeNull();
    });
  });

  describe('getAllVaults', () => {
    it('should return all vaults', async () => {
      const mockVaults = [
        KnowledgeVault.create(
          { value: 'vault-20260312-abc123' } as VaultId,
          { value: 'Vault 1' },
          { value: '' },
          { value: 'Owner' },
          { value: '/path1' } as VaultPath
        ),
        KnowledgeVault.create(
          { value: 'vault-20260312-xyz789' } as VaultId,
          { value: 'Vault 2' },
          { value: '' },
          { value: 'Owner' },
          { value: '/path2' } as VaultPath
        )
      ];
      vi.mocked(mockVaultRepository.findAll).mockResolvedValue(mockVaults);

      const result = await vaultUseCases.getAllVaults();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Vault 1');
      expect(result[1].name).toBe('Vault 2');
    });

    it('should return empty array when no vaults', async () => {
      vi.mocked(mockVaultRepository.findAll).mockResolvedValue([]);

      const result = await vaultUseCases.getAllVaults();

      expect(result).toHaveLength(0);
    });
  });

  describe('updateVault', () => {
    it('should update vault name successfully', async () => {
      const mockVault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Original Name' },
        { value: '' },
        { value: 'Owner' },
        { value: '/test/path' } as VaultPath
      );
      vi.mocked(mockVaultRepository.findById).mockResolvedValue(mockVault);
      vi.mocked(mockVaultRepository.update).mockResolvedValue();

      const result = await vaultUseCases.updateVault({
        id: 'vault-20260312-abc123',
        name: 'Updated Name'
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Updated Name');
      expect(mockVaultRepository.update).toHaveBeenCalled();
    });

    it('should update vault description successfully', async () => {
      const mockVault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Test Vault' },
        { value: '' },
        { value: 'Owner' },
        { value: '/test/path' } as VaultPath
      );
      vi.mocked(mockVaultRepository.findById).mockResolvedValue(mockVault);
      vi.mocked(mockVaultRepository.update).mockResolvedValue();

      const result = await vaultUseCases.updateVault({
        id: 'vault-20260312-abc123',
        description: 'New Description'
      });

      expect(result).not.toBeNull();
      expect(result?.description).toBe('New Description');
    });

    it('should return null when vault not found', async () => {
      vi.mocked(mockVaultRepository.findById).mockResolvedValue(null);

      const result = await vaultUseCases.updateVault({
        id: 'non-existent-id',
        name: 'New Name'
      });

      expect(result).toBeNull();
    });

    it('should throw error when name is invalid', async () => {
      const mockVault = KnowledgeVault.create(
        { value: 'vault-20260312-abc123' } as VaultId,
        { value: 'Original Name' },
        { value: '' },
        { value: 'Owner' },
        { value: '/test/path' } as VaultPath
      );
      vi.mocked(mockVaultRepository.findById).mockResolvedValue(mockVault);

      await expect(
        vaultUseCases.updateVault({
          id: 'vault-20260312-abc123',
          name: ''
        })
      ).rejects.toThrow('名称验证失败');
    });
  });

  describe('validateVaultIntegrity', () => {
    it('should return integrity result', async () => {
      const mockResult: VaultIntegrityResult = {
        isValid: true,
        errors: [],
        warnings: ['Test warning']
      };
      vi.mocked(mockVaultRepository.validateIntegrity).mockResolvedValue(mockResult);

      const result = await vaultUseCases.validateVaultIntegrity('vault-20260312-abc123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain('Test warning');
    });
  });

  describe('vaultExists', () => {
    it('should return true when vault exists', async () => {
      vi.mocked(mockVaultRepository.exists).mockResolvedValue(true);

      const result = await vaultUseCases.vaultExists('/existing/path');

      expect(result).toBe(true);
    });

    it('should return false when vault does not exist', async () => {
      vi.mocked(mockVaultRepository.exists).mockResolvedValue(false);

      const result = await vaultUseCases.vaultExists('/non-existent/path');

      expect(result).toBe(false);
    });
  });
});
