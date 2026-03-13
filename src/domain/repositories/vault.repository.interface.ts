import { KnowledgeVault } from '../entities/knowledge-vault.entity';
import type { VaultId, VaultPath, VaultIntegrityResult } from '../types/vault.types';

export interface VaultRepository {
  create(vault: KnowledgeVault): Promise<void>;
  findById(id: VaultId): Promise<KnowledgeVault | null>;
  findByPath(path: VaultPath): Promise<KnowledgeVault | null>;
  findAll(): Promise<KnowledgeVault[]>;
  update(vault: KnowledgeVault): Promise<void>;
  delete(id: VaultId): Promise<void>;
  exists(path: VaultPath): Promise<boolean>;
  validateIntegrity(id: VaultId): Promise<VaultIntegrityResult>;
}
