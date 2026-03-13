import type {
  VaultId,
  VaultName,
  VaultDescription,
  VaultOwner,
  VaultPath,
  CreatedAt,
  UpdatedAt,
  VaultStatistics,
  VaultCompatibility,
  SchemaVersion
} from '../types/vault.types';
import { createDefaultStatistics as defaultStatistics, createDefaultCompatibility as defaultCompatibility } from '../types/vault.types';

export interface VaultData {
  version: string;
  id: string;
  name: string;
  description: string;
  owner: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  statistics: VaultStatistics;
  schemaVersion: string;
  compatibility: VaultCompatibility;
}

export class KnowledgeVault {
  private readonly id: VaultId;
  private name: VaultName;
  private description: VaultDescription;
  private owner: VaultOwner;
  private path: VaultPath;
  private readonly createdAt: CreatedAt;
  private updatedAt: UpdatedAt;
  private statistics: VaultStatistics;
  private schemaVersion: SchemaVersion;
  private compatibility: VaultCompatibility;

  constructor(
    id: VaultId,
    name: VaultName,
    description: VaultDescription,
    owner: VaultOwner,
    path: VaultPath,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
    statistics?: VaultStatistics,
    schemaVersion?: SchemaVersion,
    compatibility?: VaultCompatibility
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.owner = owner;
    this.path = path;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.statistics = statistics || defaultStatistics();
    this.schemaVersion = schemaVersion || { value: '1.0.0' };
    this.compatibility = compatibility || defaultCompatibility();
  }

  static create(
    id: VaultId,
    name: VaultName,
    description: VaultDescription,
    owner: VaultOwner,
    path: VaultPath
  ): KnowledgeVault {
    const now = new Date();
    return new KnowledgeVault(
      id,
      name,
      description,
      owner,
      path,
      { value: now },
      { value: now }
    );
  }

  updateName(name: VaultName): void {
    this.name = name;
    this.updatedAt = { value: new Date() };
  }

  updateDescription(description: VaultDescription): void {
    this.description = description;
    this.updatedAt = { value: new Date() };
  }

  updateOwner(owner: VaultOwner): void {
    this.owner = owner;
    this.updatedAt = { value: new Date() };
  }

  updateStatistics(statistics: VaultStatistics): void {
    this.statistics = statistics;
    this.updatedAt = { value: new Date() };
  }

  getId(): VaultId {
    return this.id;
  }

  getName(): VaultName {
    return this.name;
  }

  getDescription(): VaultDescription {
    return this.description;
  }

  getOwner(): VaultOwner {
    return this.owner;
  }

  getPath(): VaultPath {
    return this.path;
  }

  getCreatedAt(): CreatedAt {
    return this.createdAt;
  }

  getUpdatedAt(): UpdatedAt {
    return this.updatedAt;
  }

  getStatistics(): VaultStatistics {
    return this.statistics;
  }

  getSchemaVersion(): SchemaVersion {
    return this.schemaVersion;
  }

  getCompatibility(): VaultCompatibility {
    return this.compatibility;
  }

  equals(other: KnowledgeVault): boolean {
    return this.id.value === other.id.value;
  }

  toJSON(): string {
    return JSON.stringify({
      version: '1.0.0',
      id: this.id.value,
      name: this.name.value,
      description: this.description.value,
      owner: this.owner.value,
      path: this.path.value,
      createdAt: this.createdAt.value.toISOString(),
      updatedAt: this.updatedAt.value.toISOString(),
      statistics: this.statistics,
      schemaVersion: this.schemaVersion.value,
      compatibility: this.compatibility
    }, null, 2);
  }

  static fromJSON(json: string): KnowledgeVault {
    const data = JSON.parse(json);
    return new KnowledgeVault(
      { value: data.id },
      { value: data.name },
      { value: data.description || '' },
      { value: data.owner || '' },
      { value: data.path },
      { value: new Date(data.createdAt) },
      { value: new Date(data.updatedAt) },
      data.statistics,
      { value: data.schemaVersion },
      data.compatibility
    );
  }

  toData(): VaultData {
    return {
      version: '1.0.0',
      id: this.id.value,
      name: this.name.value,
      description: this.description.value,
      owner: this.owner.value,
      path: this.path.value,
      createdAt: this.createdAt.value.toISOString(),
      updatedAt: this.updatedAt.value.toISOString(),
      statistics: this.statistics,
      schemaVersion: this.schemaVersion.value,
      compatibility: this.compatibility
    };
  }

  static fromData(data: VaultData): KnowledgeVault {
    return new KnowledgeVault(
      { value: data.id },
      { value: data.name },
      { value: data.description || '' },
      { value: data.owner || '' },
      { value: data.path },
      { value: new Date(data.createdAt) },
      { value: new Date(data.updatedAt) },
      data.statistics,
      { value: data.schemaVersion },
      data.compatibility
    );
  }
}
