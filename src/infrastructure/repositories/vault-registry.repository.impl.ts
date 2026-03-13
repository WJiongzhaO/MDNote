import { injectable } from 'inversify';
import type { VaultRegistryRepository } from '../../domain/repositories/vault-registry.repository.interface';
import type { VaultRegistry, VaultRegistryItem } from '../../domain/types/vault.types';
import { createDefaultVaultRegistry } from '../../domain/types/vault.types';

@injectable()
export class FileSystemVaultRegistryRepository implements VaultRegistryRepository {
  private registry: VaultRegistry | null = null;

  private getElectronAPI(): any {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI;
    }
    return null;
  }

  async getRegistry(): Promise<VaultRegistry> {
    if (this.registry) {
      return this.registry;
    }

    const electronAPI = this.getElectronAPI();
    if (electronAPI && electronAPI.vaultRegistry && electronAPI.vaultRegistry.getRegistry) {
      try {
        const data = await electronAPI.vaultRegistry.getRegistry();
        if (data) {
          this.registry = data;
          return this.registry;
        }
      } catch (error) {
        console.error('Error loading vault registry:', error);
      }
    }

    this.registry = createDefaultVaultRegistry();
    return this.registry;
  }

  async saveRegistry(registry: VaultRegistry): Promise<void> {
    const electronAPI = this.getElectronAPI();
    if (electronAPI && electronAPI.vaultRegistry && electronAPI.vaultRegistry.saveRegistry) {
      await electronAPI.vaultRegistry.saveRegistry(registry);
      this.registry = registry;
    } else {
      throw new Error('VaultRegistry API not available');
    }
  }

  async addVault(item: VaultRegistryItem): Promise<void> {
    const registry = await this.getRegistry();
    const existingIndex = registry.vaults.findIndex(v => v.id === item.id);
    
    if (existingIndex >= 0) {
      registry.vaults[existingIndex] = item;
    } else {
      registry.vaults.push(item);
    }
    
    await this.saveRegistry(registry);
  }

  async removeVault(id: string): Promise<void> {
    const registry = await this.getRegistry();
    registry.vaults = registry.vaults.filter(v => v.id !== id);
    
    if (registry.lastOpenedVaultId === id) {
      registry.lastOpenedVaultId = null;
    }
    
    await this.saveRegistry(registry);
  }

  async updateLastAccessed(id: string): Promise<void> {
    const registry = await this.getRegistry();
    const vault = registry.vaults.find(v => v.id === id);
    
    if (vault) {
      vault.lastAccessedAt = new Date().toISOString();
      await this.saveRegistry(registry);
    }
  }

  async setLastOpenedVault(id: string | null): Promise<void> {
    const registry = await this.getRegistry();
    registry.lastOpenedVaultId = id;
    await this.saveRegistry(registry);
  }

  async getLastOpenedVault(): Promise<VaultRegistryItem | null> {
    const registry = await this.getRegistry();
    
    if (!registry.lastOpenedVaultId) {
      return null;
    }
    
    return registry.vaults.find(v => v.id === registry!.lastOpenedVaultId) || null;
  }

  async getVaultById(id: string): Promise<VaultRegistryItem | null> {
    const registry = await this.getRegistry();
    return registry.vaults.find(v => v.id === id) || null;
  }

  async getVaultByPath(path: string): Promise<VaultRegistryItem | null> {
    const registry = await this.getRegistry();
    const normalizedPath = path.replace(/\\/g, '/');
    return registry.vaults.find(v => v.path.replace(/\\/g, '/') === normalizedPath) || null;
  }
}
