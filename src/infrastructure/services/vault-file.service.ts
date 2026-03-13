import type { VaultConfig, VaultStatistics } from '../../domain/types/vault.types';
import { createDefaultConfig } from '../../domain/types/vault.types';

export interface VaultMetadata {
  version: string;
  id: string;
  name: string;
  description: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  statistics: VaultStatistics;
  schemaVersion: string;
  compatibility: {
    minAppVersion: string;
    features: string[];
  };
}

export interface VaultIndex {
  version: string;
  updatedAt: string;
  idMap: Record<string, string>;
  referenceGraph: Record<string, string[]>;
  searchIndex: {
    invertedIndex: Record<string, string[]>;
  };
}

export interface DocumentIndex {
  version: string;
  updatedAt: string;
  documents: any[];
  folders: any[];
}

export interface FragmentIndex {
  version: string;
  updatedAt: string;
  fragments: any[];
  tagIndex: Record<string, string[]>;
  categoryIndex: Record<string, string[]>;
  statusIndex: {
    active: string[];
    archived: string[];
    deprecated: string[];
  };
}

export class VaultFileService {
  private getElectronAPI(): any {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.vault) {
      throw new Error('electronAPI is not available');
    }
    return electronAPI;
  }

  async createVaultStructure(vaultPath: string): Promise<void> {
    const electronAPI = this.getElectronAPI();

    const directories = [
      vaultPath,
      `${vaultPath}/.vault`,
      `${vaultPath}/documents`,
      `${vaultPath}/fragments`,
      `${vaultPath}/variables`,
      `${vaultPath}/templates`,
      `${vaultPath}/exports`,
      `${vaultPath}/archive`
    ];

    for (const dir of directories) {
      await electronAPI.vault.createDirectory(dir);
    }
  }

  async writeVaultMetadata(vaultPath: string, metadata: VaultMetadata): Promise<void> {
    const electronAPI = this.getElectronAPI();
    const filePath = `${vaultPath}/vault.json`;
    await electronAPI.vault.write(filePath, metadata);
  }

  async readVaultMetadata(vaultPath: string): Promise<VaultMetadata | null> {
    const electronAPI = this.getElectronAPI();
    const filePath = `${vaultPath}/vault.json`;

    try {
      const data = await electronAPI.vault.read(filePath);
      return data as VaultMetadata;
    } catch {
      return null;
    }
  }

  async writeVaultConfig(vaultPath: string, config: VaultConfig): Promise<void> {
    const electronAPI = this.getElectronAPI();
    const filePath = `${vaultPath}/config.json`;
    await electronAPI.vault.write(filePath, config);
  }

  async readVaultConfig(vaultPath: string): Promise<VaultConfig | null> {
    const electronAPI = this.getElectronAPI();
    const filePath = `${vaultPath}/config.json`;

    try {
      const data = await electronAPI.vault.read(filePath);
      return data as VaultConfig;
    } catch {
      return createDefaultConfig();
    }
  }

  async createInitialIndexFiles(vaultPath: string, now: Date): Promise<void> {
    const electronAPI = this.getElectronAPI();
    const timestamp = now.toISOString();

    const vaultIndex: VaultIndex = {
      version: '1.0.0',
      updatedAt: timestamp,
      idMap: {},
      referenceGraph: {},
      searchIndex: {
        invertedIndex: {}
      }
    };
    await electronAPI.vault.write(`${vaultPath}/.vault/index.json`, vaultIndex);

    const graphIndex = {
      version: '1.0.0',
      updatedAt: timestamp,
      nodes: [],
      edges: []
    };
    await electronAPI.vault.write(`${vaultPath}/.vault/graph.json`, graphIndex);

    const lineageIndex = {
      version: '1.0.0',
      updatedAt: timestamp,
      lineages: []
    };
    await electronAPI.vault.write(`${vaultPath}/.vault/lineage.json`, lineageIndex);

    const healthIndex = {
      version: '1.0.0',
      updatedAt: timestamp,
      snapshots: []
    };
    await electronAPI.vault.write(`${vaultPath}/.vault/health.json`, healthIndex);

    const documentIndex: DocumentIndex = {
      version: '1.0.0',
      updatedAt: timestamp,
      documents: [],
      folders: []
    };
    await electronAPI.vault.write(`${vaultPath}/documents/index.json`, documentIndex);

    const fragmentIndex: FragmentIndex = {
      version: '1.0.0',
      updatedAt: timestamp,
      fragments: [],
      tagIndex: {},
      categoryIndex: {},
      statusIndex: {
        active: [],
        archived: [],
        deprecated: []
      }
    };
    await electronAPI.vault.write(`${vaultPath}/fragments/index.json`, fragmentIndex);
  }

  async deleteVaultDirectory(vaultPath: string): Promise<void> {
    const electronAPI = this.getElectronAPI();
    await electronAPI.vault.deleteDirectory(vaultPath);
  }

  async checkVaultExists(vaultPath: string): Promise<boolean> {
    const electronAPI = this.getElectronAPI();
    const filePath = `${vaultPath}/vault.json`;

    try {
      const exists = await electronAPI.vault.exists(filePath);
      return exists;
    } catch {
      return false;
    }
  }

  async validateVaultStructure(vaultPath: string): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const electronAPI = this.getElectronAPI();

    const requiredFiles = [
      `${vaultPath}/vault.json`,
      `${vaultPath}/config.json`,
      `${vaultPath}/.vault/index.json`
    ];

    const requiredDirs = [
      `${vaultPath}/documents`,
      `${vaultPath}/fragments`
    ];

    for (const file of requiredFiles) {
      try {
        const exists = await electronAPI.vault.exists(file);
        if (!exists) {
          errors.push(`缺少必需文件: ${file}`);
        }
      } catch {
        errors.push(`无法检查文件: ${file}`);
      }
    }

    for (const dir of requiredDirs) {
      try {
        const exists = await electronAPI.vault.directoryExists(dir);
        if (!exists) {
          warnings.push(`缺少推荐目录: ${dir}`);
        }
      } catch {
        warnings.push(`无法检查目录: ${dir}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
