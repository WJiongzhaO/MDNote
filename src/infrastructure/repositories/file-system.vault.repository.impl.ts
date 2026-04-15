import { injectable } from 'inversify';
import { KnowledgeVault } from '../../domain/entities/knowledge-vault.entity';
import type { VaultData } from '../../domain/entities/knowledge-vault.entity';
import type { VaultRepository } from '../../domain/repositories/vault.repository.interface';
import type { VaultId, VaultPath, VaultIntegrityResult } from '../../domain/types/vault.types';
import { VaultFileService } from '../services/vault-file.service';
import { createDefaultConfig } from '../../domain/types/vault.types';

@injectable()
export class FileSystemVaultRepository implements VaultRepository {
  private vaultFileService: VaultFileService;
  private vaultCache: Map<string, KnowledgeVault> = new Map();

  constructor() {
    this.vaultFileService = new VaultFileService();
  }

  async create(vault: KnowledgeVault): Promise<void> {
    const vaultPath = vault.getPath().value;
    const now = new Date();

    await this.vaultFileService.createVaultStructure(vaultPath);

    const metadata = {
      version: '1.0.0',
      id: vault.getId().value,
      name: vault.getName().value,
      description: vault.getDescription().value,
      owner: vault.getOwner().value,
      createdAt: vault.getCreatedAt().value.toISOString(),
      updatedAt: vault.getUpdatedAt().value.toISOString(),
      statistics: vault.getStatistics(),
      schemaVersion: vault.getSchemaVersion().value,
      compatibility: vault.getCompatibility()
    };

    await this.vaultFileService.writeVaultMetadata(vaultPath, metadata);

    const config = createDefaultConfig();
    await this.vaultFileService.writeVaultConfig(vaultPath, config);

    await this.vaultFileService.createInitialIndexFiles(vaultPath, now);

    this.vaultCache.set(vault.getId().value, vault);
  }

  async findById(id: VaultId): Promise<KnowledgeVault | null> {
    if (this.vaultCache.has(id.value)) {
      return this.vaultCache.get(id.value)!;
    }

    return null;
  }

  async findByPath(path: VaultPath): Promise<KnowledgeVault | null> {
    const metadata = await this.vaultFileService.readVaultMetadata(path.value);

    if (!metadata) {
      return null;
    }

    const vault = this.mapMetadataToVault(metadata, path.value);
    this.vaultCache.set(metadata.id, vault);
    return vault;
  }

  async findAll(): Promise<KnowledgeVault[]> {
    return Array.from(this.vaultCache.values());
  }

  async update(vault: KnowledgeVault): Promise<void> {
    const vaultPath = vault.getPath().value;

    const metadata = {
      version: '1.0.0',
      id: vault.getId().value,
      name: vault.getName().value,
      description: vault.getDescription().value,
      owner: vault.getOwner().value,
      createdAt: vault.getCreatedAt().value.toISOString(),
      updatedAt: vault.getUpdatedAt().value.toISOString(),
      statistics: vault.getStatistics(),
      schemaVersion: vault.getSchemaVersion().value,
      compatibility: vault.getCompatibility()
    };

    await this.vaultFileService.writeVaultMetadata(vaultPath, metadata);
    this.vaultCache.set(vault.getId().value, vault);
  }

  async delete(id: VaultId): Promise<void> {
    const vault = this.vaultCache.get(id.value);

    if (vault) {
      const vaultPath = vault.getPath().value;
      await this.vaultFileService.deleteVaultDirectory(vaultPath);
      this.vaultCache.delete(id.value);
    }
  }

  async exists(path: VaultPath): Promise<boolean> {
    return this.vaultFileService.checkVaultExists(path.value);
  }

  async validateIntegrity(id: VaultId): Promise<VaultIntegrityResult> {
    const vault = this.vaultCache.get(id.value);

    if (!vault) {
      return {
        isValid: false,
        errors: ['知识库不存在'],
        warnings: []
      };
    }

    const vaultPath = vault.getPath().value;
    const result = await this.vaultFileService.validateVaultStructure(vaultPath);

    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings
    };
  }

  private mapMetadataToVault(metadata: any, path: string): KnowledgeVault {
    return KnowledgeVault.fromData({
      version: metadata.version,
      id: metadata.id,
      name: metadata.name,
      description: metadata.description || '',
      owner: metadata.owner || '',
      path: path,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      statistics: metadata.statistics,
      schemaVersion: metadata.schemaVersion,
      compatibility: metadata.compatibility
    });
  }

  addToCache(vault: KnowledgeVault): void {
    this.vaultCache.set(vault.getId().value, vault);
  }

  clearCache(): void {
    this.vaultCache.clear();
  }
}
