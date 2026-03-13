import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultFileService } from '../vault-file.service';

describe('VaultFileService', () => {
  let vaultFileService: VaultFileService;
  let mockElectronAPI: any;

  beforeEach(() => {
    mockElectronAPI = {
      vault: {
        createDirectory: vi.fn().mockResolvedValue(undefined),
        write: vi.fn().mockResolvedValue(undefined),
        read: vi.fn().mockResolvedValue(null),
        deleteDirectory: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue(false),
        directoryExists: vi.fn().mockResolvedValue(false)
      }
    };

    (window as any).electronAPI = mockElectronAPI;
    vaultFileService = new VaultFileService();
  });

  describe('createVaultStructure', () => {
    it('should create all required directories', async () => {
      await vaultFileService.createVaultStructure('/test/vault');

      expect(mockElectronAPI.vault.createDirectory).toHaveBeenCalledTimes(8);
      expect(mockElectronAPI.vault.createDirectory).toHaveBeenCalledWith('/test/vault');
      expect(mockElectronAPI.vault.createDirectory).toHaveBeenCalledWith('/test/vault/.vault');
      expect(mockElectronAPI.vault.createDirectory).toHaveBeenCalledWith('/test/vault/documents');
      expect(mockElectronAPI.vault.createDirectory).toHaveBeenCalledWith('/test/vault/fragments');
    });
  });

  describe('writeVaultMetadata', () => {
    it('should write vault metadata to file', async () => {
      const metadata = {
        version: '1.0.0',
        id: 'vault-20260312-abc123',
        name: 'Test Vault',
        description: 'Test Description',
        owner: 'Test Owner',
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

      await vaultFileService.writeVaultMetadata('/test/vault', metadata);

      expect(mockElectronAPI.vault.write).toHaveBeenCalledWith('/test/vault/vault.json', metadata);
    });
  });

  describe('readVaultMetadata', () => {
    it('should read vault metadata from file', async () => {
      const mockMetadata = {
        version: '1.0.0',
        id: 'vault-20260312-abc123',
        name: 'Test Vault'
      };
      mockElectronAPI.vault.read.mockResolvedValue(mockMetadata);

      const result = await vaultFileService.readVaultMetadata('/test/vault');

      expect(result).toEqual(mockMetadata);
      expect(mockElectronAPI.vault.read).toHaveBeenCalledWith('/test/vault/vault.json');
    });

    it('should return null when file does not exist', async () => {
      mockElectronAPI.vault.read.mockRejectedValue(new Error('File not found'));

      const result = await vaultFileService.readVaultMetadata('/test/vault');

      expect(result).toBeNull();
    });
  });

  describe('writeVaultConfig', () => {
    it('should write vault config to file', async () => {
      const config = {
        confidencePolicy: {
          defaultLevel: 0,
          requireVerification: false,
          autoExpireDays: 90
        },
        archiveRules: {
          autoArchive: false,
          archiveAfterDays: 180
        },
        exportFilters: {
          defaultMinConfidence: 2,
          excludeArchived: true,
          excludeDeprecated: true
        }
      };

      await vaultFileService.writeVaultConfig('/test/vault', config);

      expect(mockElectronAPI.vault.write).toHaveBeenCalledWith('/test/vault/config.json', config);
    });
  });

  describe('createInitialIndexFiles', () => {
    it('should create all index files', async () => {
      const now = new Date();

      await vaultFileService.createInitialIndexFiles('/test/vault', now);

      expect(mockElectronAPI.vault.write).toHaveBeenCalledWith(
        '/test/vault/.vault/index.json',
        expect.objectContaining({
          version: '1.0.0',
          idMap: {},
          referenceGraph: {}
        })
      );

      expect(mockElectronAPI.vault.write).toHaveBeenCalledWith(
        '/test/vault/documents/index.json',
        expect.objectContaining({
          version: '1.0.0',
          documents: [],
          folders: []
        })
      );

      expect(mockElectronAPI.vault.write).toHaveBeenCalledWith(
        '/test/vault/fragments/index.json',
        expect.objectContaining({
          version: '1.0.0',
          fragments: []
        })
      );
    });
  });

  describe('deleteVaultDirectory', () => {
    it('should delete vault directory', async () => {
      await vaultFileService.deleteVaultDirectory('/test/vault');

      expect(mockElectronAPI.vault.deleteDirectory).toHaveBeenCalledWith('/test/vault');
    });
  });

  describe('checkVaultExists', () => {
    it('should return true when vault.json exists', async () => {
      mockElectronAPI.vault.exists.mockResolvedValue(true);

      const result = await vaultFileService.checkVaultExists('/test/vault');

      expect(result).toBe(true);
      expect(mockElectronAPI.vault.exists).toHaveBeenCalledWith('/test/vault/vault.json');
    });

    it('should return false when vault.json does not exist', async () => {
      mockElectronAPI.vault.exists.mockResolvedValue(false);

      const result = await vaultFileService.checkVaultExists('/test/vault');

      expect(result).toBe(false);
    });
  });

  describe('validateVaultStructure', () => {
    it('should return valid when all required files exist', async () => {
      mockElectronAPI.vault.exists.mockResolvedValue(true);
      mockElectronAPI.vault.directoryExists.mockResolvedValue(true);

      const result = await vaultFileService.validateVaultStructure('/test/vault');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors when required files are missing', async () => {
      mockElectronAPI.vault.exists.mockResolvedValue(false);
      mockElectronAPI.vault.directoryExists.mockResolvedValue(false);

      const result = await vaultFileService.validateVaultStructure('/test/vault');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return warnings when optional directories are missing', async () => {
      mockElectronAPI.vault.exists.mockResolvedValue(true);
      mockElectronAPI.vault.directoryExists.mockResolvedValue(false);

      const result = await vaultFileService.validateVaultStructure('/test/vault');

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
