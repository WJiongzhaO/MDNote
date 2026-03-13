import { describe, it, expect } from 'vitest';
import { KnowledgeVault } from '../knowledge-vault.entity';
import type {
  VaultId,
  VaultName,
  VaultDescription,
  VaultOwner,
  VaultPath,
  CreatedAt,
  UpdatedAt,
  VaultStatistics
} from '../../types/vault.types';

describe('KnowledgeVault Entity', () => {
  it('should create a vault with correct values', () => {
    const now = new Date();
    const vault = new KnowledgeVault(
      { value: 'vault-20260312-abc123' } as VaultId,
      { value: 'Test Vault' } as VaultName,
      { value: 'Test Description' } as VaultDescription,
      { value: 'Test Owner' } as VaultOwner,
      { value: '/test/path' } as VaultPath,
      { value: now } as CreatedAt,
      { value: now } as UpdatedAt
    );

    expect(vault.getId().value).toBe('vault-20260312-abc123');
    expect(vault.getName().value).toBe('Test Vault');
    expect(vault.getDescription().value).toBe('Test Description');
    expect(vault.getOwner().value).toBe('Test Owner');
    expect(vault.getPath().value).toBe('/test/path');
    expect(vault.getCreatedAt().value).toBe(now);
    expect(vault.getUpdatedAt().value).toBe(now);
  });

  it('should create a vault using static create method', () => {
    const vault = KnowledgeVault.create(
      { value: 'vault-20260312-abc123' } as VaultId,
      { value: 'New Vault' } as VaultName,
      { value: 'New Description' } as VaultDescription,
      { value: 'New Owner' } as VaultOwner,
      { value: '/new/path' } as VaultPath
    );

    expect(vault.getId().value).toBe('vault-20260312-abc123');
    expect(vault.getName().value).toBe('New Vault');
    expect(vault.getDescription().value).toBe('New Description');
    expect(vault.getOwner().value).toBe('New Owner');
    expect(vault.getPath().value).toBe('/new/path');
    expect(vault.getCreatedAt().value).toBeInstanceOf(Date);
    expect(vault.getUpdatedAt().value).toBeInstanceOf(Date);
    expect(vault.getStatistics().totalDocuments).toBe(0);
    expect(vault.getStatistics().totalFragments).toBe(0);
  });

  it('should update name correctly', () => {
    const vault = KnowledgeVault.create(
      { value: 'vault-20260312-abc123' } as VaultId,
      { value: 'Original Name' } as VaultName,
      { value: '' } as VaultDescription,
      { value: 'Owner' } as VaultOwner,
      { value: '/path' } as VaultPath
    );

    const originalUpdatedAt = vault.getUpdatedAt().value;

    vault.updateName({ value: 'Updated Name' } as VaultName);

    expect(vault.getName().value).toBe('Updated Name');
    expect(vault.getUpdatedAt().value.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
  });

  it('should update description correctly', () => {
    const vault = KnowledgeVault.create(
      { value: 'vault-20260312-abc123' } as VaultId,
      { value: 'Name' } as VaultName,
      { value: '' } as VaultDescription,
      { value: 'Owner' } as VaultOwner,
      { value: '/path' } as VaultPath
    );

    vault.updateDescription({ value: 'New Description' } as VaultDescription);

    expect(vault.getDescription().value).toBe('New Description');
  });

  it('should update statistics correctly', () => {
    const vault = KnowledgeVault.create(
      { value: 'vault-20260312-abc123' } as VaultId,
      { value: 'Name' } as VaultName,
      { value: '' } as VaultDescription,
      { value: 'Owner' } as VaultOwner,
      { value: '/path' } as VaultPath
    );

    const newStats: VaultStatistics = {
      totalDocuments: 10,
      totalFragments: 50,
      activeFragments: 40,
      archivedFragments: 5,
      deprecatedFragments: 5,
      totalReferences: 100,
      averageHealthScore: 85
    };

    vault.updateStatistics(newStats);

    expect(vault.getStatistics().totalDocuments).toBe(10);
    expect(vault.getStatistics().totalFragments).toBe(50);
    expect(vault.getStatistics().averageHealthScore).toBe(85);
  });

  it('should compare vaults correctly', () => {
    const vault1 = KnowledgeVault.create(
      { value: 'vault-20260312-abc123' } as VaultId,
      { value: 'Vault 1' } as VaultName,
      { value: '' } as VaultDescription,
      { value: 'Owner' } as VaultOwner,
      { value: '/path1' } as VaultPath
    );

    const vault2 = KnowledgeVault.create(
      { value: 'vault-20260312-xyz789' } as VaultId,
      { value: 'Vault 2' } as VaultName,
      { value: '' } as VaultDescription,
      { value: 'Owner' } as VaultOwner,
      { value: '/path2' } as VaultPath
    );

    const vault3 = KnowledgeVault.create(
      { value: 'vault-20260312-abc123' } as VaultId,
      { value: 'Vault 3' } as VaultName,
      { value: '' } as VaultDescription,
      { value: 'Owner' } as VaultOwner,
      { value: '/path3' } as VaultPath
    );

    expect(vault1.equals(vault1)).toBe(true);
    expect(vault1.equals(vault2)).toBe(false);
    expect(vault1.equals(vault3)).toBe(true);
  });

  it('should serialize to JSON correctly', () => {
    const vault = KnowledgeVault.create(
      { value: 'vault-20260312-abc123' } as VaultId,
      { value: 'Test Vault' } as VaultName,
      { value: 'Test Description' } as VaultDescription,
      { value: 'Test Owner' } as VaultOwner,
      { value: '/test/path' } as VaultPath
    );

    const json = vault.toJSON();
    const parsed = JSON.parse(json);

    expect(parsed.id).toBe('vault-20260312-abc123');
    expect(parsed.name).toBe('Test Vault');
    expect(parsed.description).toBe('Test Description');
    expect(parsed.owner).toBe('Test Owner');
    expect(parsed.path).toBe('/test/path');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.statistics.totalDocuments).toBe(0);
  });

  it('should deserialize from JSON correctly', () => {
    const json = JSON.stringify({
      version: '1.0.0',
      id: 'vault-20260312-abc123',
      name: 'Test Vault',
      description: 'Test Description',
      owner: 'Test Owner',
      path: '/test/path',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statistics: {
        totalDocuments: 5,
        totalFragments: 10,
        activeFragments: 8,
        archivedFragments: 1,
        deprecatedFragments: 1,
        totalReferences: 20,
        averageHealthScore: 90
      },
      schemaVersion: '1.0.0',
      compatibility: {
        minAppVersion: '2.0.0',
        features: ['lineage', 'health', 'confidence']
      }
    });

    const vault = KnowledgeVault.fromJSON(json);

    expect(vault.getId().value).toBe('vault-20260312-abc123');
    expect(vault.getName().value).toBe('Test Vault');
    expect(vault.getDescription().value).toBe('Test Description');
    expect(vault.getStatistics().totalDocuments).toBe(5);
    expect(vault.getStatistics().totalFragments).toBe(10);
  });

  it('should convert to data object correctly', () => {
    const vault = KnowledgeVault.create(
      { value: 'vault-20260312-abc123' } as VaultId,
      { value: 'Test Vault' } as VaultName,
      { value: 'Test Description' } as VaultDescription,
      { value: 'Test Owner' } as VaultOwner,
      { value: '/test/path' } as VaultPath
    );

    const data = vault.toData();

    expect(data.id).toBe('vault-20260312-abc123');
    expect(data.name).toBe('Test Vault');
    expect(data.description).toBe('Test Description');
    expect(data.owner).toBe('Test Owner');
    expect(data.path).toBe('/test/path');
    expect(data.version).toBe('1.0.0');
  });

  it('should create from data object correctly', () => {
    const data = {
      version: '1.0.0',
      id: 'vault-20260312-abc123',
      name: 'Test Vault',
      description: 'Test Description',
      owner: 'Test Owner',
      path: '/test/path',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statistics: {
        totalDocuments: 5,
        totalFragments: 10,
        activeFragments: 8,
        archivedFragments: 1,
        deprecatedFragments: 1,
        totalReferences: 20,
        averageHealthScore: 90
      },
      schemaVersion: '1.0.0',
      compatibility: {
        minAppVersion: '2.0.0',
        features: ['lineage', 'health', 'confidence']
      }
    };

    const vault = KnowledgeVault.fromData(data);

    expect(vault.getId().value).toBe('vault-20260312-abc123');
    expect(vault.getName().value).toBe('Test Vault');
    expect(vault.getStatistics().totalDocuments).toBe(5);
  });
});
