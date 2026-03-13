import type { VaultStatistics, VaultConfig } from '../../domain/types/vault.types';

export interface CreateVaultRequest {
  name: string;
  description?: string;
  path?: string;
  owner?: string;
}

export interface DeleteVaultRequest {
  id: string;
  confirmed: boolean;
}

export interface VaultResponse {
  id: string;
  name: string;
  description: string;
  owner: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  statistics: VaultStatistics;
  schemaVersion: string;
}

export interface VaultListItem {
  id: string;
  name: string;
  description: string;
  path: string;
  updatedAt: string;
  statistics: VaultStatistics;
}

export interface VaultRegistryItemDTO {
  id: string;
  name: string;
  path: string;
  lastAccessedAt: string;
  createdAt: string;
  pathExists: boolean;
}

export interface OpenVaultRequest {
  vaultId: string;
}

export interface OpenVaultResponse {
  success: boolean;
  vault: VaultRegistryItemDTO;
  error?: string;
}

export interface VaultStatisticsDTO {
  totalDocuments: number;
  totalFragments: number;
  activeFragments: number;
  archivedFragments: number;
  deprecatedFragments: number;
  totalReferences: number;
  averageHealthScore: number;
}

export interface VaultConfigDTO {
  confidencePolicy: {
    defaultLevel: number;
    requireVerification: boolean;
    autoExpireDays: number;
  };
  archiveRules: {
    autoArchive: boolean;
    archiveAfterDays: number;
  };
  exportFilters: {
    defaultMinConfidence: number;
    excludeArchived: boolean;
    excludeDeprecated: boolean;
  };
}

export interface UpdateVaultRequest {
  id: string;
  name?: string;
  description?: string;
}

export interface VaultIntegrityResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
