export interface VaultId {
  value: string;
}

export interface VaultName {
  value: string;
}

export interface VaultDescription {
  value: string;
}

export interface VaultOwner {
  value: string;
}

export interface VaultPath {
  value: string;
}

export interface CreatedAt {
  value: Date;
}

export interface UpdatedAt {
  value: Date;
}

export interface VaultStatistics {
  totalDocuments: number;
  totalFragments: number;
  activeFragments: number;
  archivedFragments: number;
  deprecatedFragments: number;
  totalReferences: number;
  averageHealthScore: number;
}

export interface VaultCompatibility {
  minAppVersion: string;
  features: string[];
}

export interface SchemaVersion {
  value: string;
}

export interface ConfidencePolicy {
  defaultLevel: number;
  requireVerification: boolean;
  autoExpireDays: number;
}

export interface ArchiveRules {
  autoArchive: boolean;
  archiveAfterDays: number;
}

export interface ExportFilters {
  defaultMinConfidence: number;
  excludeArchived: boolean;
  excludeDeprecated: boolean;
}

export interface VaultConfig {
  confidencePolicy: ConfidencePolicy;
  archiveRules: ArchiveRules;
  exportFilters: ExportFilters;
}

export interface VaultIntegrityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function createDefaultStatistics(): VaultStatistics {
  return {
    totalDocuments: 0,
    totalFragments: 0,
    activeFragments: 0,
    archivedFragments: 0,
    deprecatedFragments: 0,
    totalReferences: 0,
    averageHealthScore: 0
  };
}

export function createDefaultConfig(): VaultConfig {
  return {
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
}

export function createDefaultCompatibility(): VaultCompatibility {
  return {
    minAppVersion: '2.0.0',
    features: ['lineage', 'health', 'confidence']
  };
}

export interface VaultRegistryItem {
  id: string;
  name: string;
  path: string;
  lastAccessedAt: string;
  createdAt: string;
}

export interface VaultRegistry {
  version: string;
  vaults: VaultRegistryItem[];
  lastOpenedVaultId: string | null;
}

export function createDefaultVaultRegistry(): VaultRegistry {
  return {
    version: '1.0.0',
    vaults: [],
    lastOpenedVaultId: null
  };
}
