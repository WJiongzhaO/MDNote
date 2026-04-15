import type { VaultRegistry, VaultRegistryItem } from '../types/vault.types';

export interface VaultRegistryRepository {
  getRegistry(): Promise<VaultRegistry>;
  saveRegistry(registry: VaultRegistry): Promise<void>;
  addVault(item: VaultRegistryItem): Promise<void>;
  removeVault(id: string): Promise<void>;
  updateLastAccessed(id: string): Promise<void>;
  setLastOpenedVault(id: string | null): Promise<void>;
  getLastOpenedVault(): Promise<VaultRegistryItem | null>;
  getVaultById(id: string): Promise<VaultRegistryItem | null>;
  getVaultByPath(path: string): Promise<VaultRegistryItem | null>;
}
