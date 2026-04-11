import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { KnowledgeVault } from '../../domain/entities/knowledge-vault.entity';
import type { VaultRepository } from '../../domain/repositories/vault.repository.interface';
import type { VaultRegistryRepository } from '../../domain/repositories/vault-registry.repository.interface';
import { VaultIdGenerator } from '../../domain/services/vault-id-generator.service';
import { VaultPathValidator } from '../../domain/services/vault-path-validator.service';
import type {
  CreateVaultRequest,
  DeleteVaultRequest,
  VaultResponse,
  VaultListItem,
  UpdateVaultRequest,
  VaultIntegrityResponse,
  VaultRegistryItemDTO,
  OpenVaultResponse
} from '../dto/vault.dto';

@injectable()
export class VaultUseCases {
  private pathValidator: VaultPathValidator;

  constructor(
    @inject(TYPES.VaultRepository) private readonly vaultRepository: VaultRepository,
    @inject(TYPES.VaultRegistryRepository) private readonly vaultRegistryRepository: VaultRegistryRepository
  ) {
    this.pathValidator = new VaultPathValidator();
  }

  async createVault(request: CreateVaultRequest): Promise<VaultResponse> {
    const nameValidation = this.pathValidator.validateName(request.name);
    if (!nameValidation.isValid) {
      throw new Error(`名称验证失败: ${nameValidation.errors.join(', ')}`);
    }

    let vaultPath = request.path;
    if (!vaultPath) {
      const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (electronAPI && electronAPI.vault && electronAPI.vault.getVaultsPath) {
        const vaultsBasePath = await electronAPI.vault.getVaultsPath();
        const sanitizedName = request.name.replace(/[<>:"/\\|?*]/g, '_');
        vaultPath = `${vaultsBasePath}/${sanitizedName}`;
      } else {
        throw new Error('无法获取知识库存储路径');
      }
    } else {
      const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (electronAPI && electronAPI.vault && electronAPI.vault.directoryExists) {
        const exists = await electronAPI.vault.directoryExists(vaultPath);
        if (exists) {
          const sanitizedName = request.name.replace(/[<>:"/\\|?*]/g, '_');
          vaultPath = `${vaultPath}/${sanitizedName}`;
        }
      }
    }

    const pathValidation = this.pathValidator.validate({ value: vaultPath });
    if (!pathValidation.isValid) {
      throw new Error(`路径验证失败: ${pathValidation.errors.join(', ')}`);
    }

    if (request.description) {
      const descValidation = this.pathValidator.validateDescription(request.description);
      if (!descValidation.isValid) {
        throw new Error(`描述验证失败: ${descValidation.errors.join(', ')}`);
      }
    }

    const exists = await this.vaultRepository.exists({ value: vaultPath });
    if (exists) {
      throw new Error('该路径已存在知识库');
    }

    const id = VaultIdGenerator.generate();
    const vault = KnowledgeVault.create(
      id,
      { value: request.name },
      { value: request.description || '' },
      { value: request.owner || '' },
      { value: vaultPath }
    );

    await this.vaultRepository.create(vault);

    return this.mapToResponse(vault);
  }

  async deleteVault(request: DeleteVaultRequest): Promise<void> {
    if (!request.confirmed) {
      throw new Error('删除操作需要用户确认');
    }

    const vault = await this.vaultRepository.findById({ value: request.id });
    if (!vault) {
      throw new Error('知识库不存在');
    }

    await this.vaultRepository.delete({ value: request.id });
  }

  async getVault(id: string): Promise<VaultResponse | null> {
    const vault = await this.vaultRepository.findById({ value: id });

    if (!vault) {
      return null;
    }

    return this.mapToResponse(vault);
  }

  async getVaultByPath(path: string): Promise<VaultResponse | null> {
    const vault = await this.vaultRepository.findByPath({ value: path });

    if (!vault) {
      return null;
    }

    return this.mapToResponse(vault);
  }

  async getAllVaults(): Promise<VaultListItem[]> {
    const vaults = await this.vaultRepository.findAll();

    return vaults.map(vault => ({
      id: vault.getId().value,
      name: vault.getName().value,
      description: vault.getDescription().value,
      path: vault.getPath().value,
      updatedAt: vault.getUpdatedAt().value.toISOString(),
      statistics: vault.getStatistics()
    }));
  }

  async updateVault(request: UpdateVaultRequest): Promise<VaultResponse | null> {
    const vault = await this.vaultRepository.findById({ value: request.id });

    if (!vault) {
      return null;
    }

    if (request.name !== undefined) {
      const nameValidation = this.pathValidator.validateName(request.name);
      if (!nameValidation.isValid) {
        throw new Error(`名称验证失败: ${nameValidation.errors.join(', ')}`);
      }
      vault.updateName({ value: request.name });
    }

    if (request.description !== undefined) {
      const descValidation = this.pathValidator.validateDescription(request.description);
      if (!descValidation.isValid) {
        throw new Error(`描述验证失败: ${descValidation.errors.join(', ')}`);
      }
      vault.updateDescription({ value: request.description });
    }

    await this.vaultRepository.update(vault);

    return this.mapToResponse(vault);
  }

  async validateVaultIntegrity(id: string): Promise<VaultIntegrityResponse> {
    const result = await this.vaultRepository.validateIntegrity({ value: id });

    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings
    };
  }

  async vaultExists(path: string): Promise<boolean> {
    return this.vaultRepository.exists({ value: path });
  }

  async getRegisteredVaults(): Promise<VaultRegistryItemDTO[]> {
    const registry = await this.vaultRegistryRepository.getRegistry();
    const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;

    const vaultsWithStatus = await Promise.all(
      registry.vaults.map(async (vault) => {
        let pathExists = false;
        if (electronAPI && electronAPI.vaultRegistry && electronAPI.vaultRegistry.checkPathExists) {
          pathExists = await electronAPI.vaultRegistry.checkPathExists(vault.path);
        }
        return {
          id: vault.id,
          name: vault.name,
          path: vault.path,
          lastAccessedAt: vault.lastAccessedAt,
          createdAt: vault.createdAt,
          pathExists
        };
      })
    );

    return vaultsWithStatus.sort((a, b) =>
      new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
    );
  }

  async openVault(vaultId: string): Promise<OpenVaultResponse> {
    const vaultItem = await this.vaultRegistryRepository.getVaultById(vaultId);

    if (!vaultItem) {
      return {
        success: false,
        vault: null as any,
        error: '知识库不存在'
      };
    }

    const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    let pathExists = false;
    if (electronAPI && electronAPI.vaultRegistry && electronAPI.vaultRegistry.checkPathExists) {
      pathExists = await electronAPI.vaultRegistry.checkPathExists(vaultItem.path);
    }

    if (!pathExists) {
      return {
        success: false,
        vault: {
          id: vaultItem.id,
          name: vaultItem.name,
          path: vaultItem.path,
          lastAccessedAt: vaultItem.lastAccessedAt,
          createdAt: vaultItem.createdAt,
          pathExists: false
        },
        error: '知识库路径不存在'
      };
    }

    await this.vaultRegistryRepository.updateLastAccessed(vaultId);
    await this.vaultRegistryRepository.setLastOpenedVault(vaultId);

    return {
      success: true,
      vault: {
        id: vaultItem.id,
        name: vaultItem.name,
        path: vaultItem.path,
        lastAccessedAt: new Date().toISOString(),
        createdAt: vaultItem.createdAt,
        pathExists: true
      }
    };
  }

  async createAndRegisterVault(request: CreateVaultRequest): Promise<VaultResponse> {
    const response = await this.createVault(request);

    await this.vaultRegistryRepository.addVault({
      id: response.id,
      name: response.name,
      path: response.path,
      lastAccessedAt: new Date().toISOString(),
      createdAt: response.createdAt
    });

    await this.vaultRegistryRepository.setLastOpenedVault(response.id);

    return response;
  }

  async getLastOpenedVault(): Promise<VaultRegistryItemDTO | null> {
    const vaultItem = await this.vaultRegistryRepository.getLastOpenedVault();

    if (!vaultItem) {
      return null;
    }

    const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    let pathExists = false;
    if (electronAPI && electronAPI.vaultRegistry && electronAPI.vaultRegistry.checkPathExists) {
      pathExists = await electronAPI.vaultRegistry.checkPathExists(vaultItem.path);
    }

    return {
      id: vaultItem.id,
      name: vaultItem.name,
      path: vaultItem.path,
      lastAccessedAt: vaultItem.lastAccessedAt,
      createdAt: vaultItem.createdAt,
      pathExists
    };
  }

  async importFolderAsVault(folderPath: string, name?: string): Promise<VaultResponse> {
    const existingVault = await this.vaultRegistryRepository.getVaultByPath(folderPath);

    if (existingVault) {
      const openResult = await this.openVault(existingVault.id);
      if (openResult.success) {
        const vault = await this.vaultRepository.findById({ value: existingVault.id });
        if (vault) {
          return this.mapToResponse(vault);
        }
      }
      throw new Error(openResult.error || '无法打开知识库');
    }

    const vaultName = name || folderPath.split(/[/\\]/).pop() || '新知识库';
    const id = VaultIdGenerator.generate();
    const vault = KnowledgeVault.create(
      id,
      { value: vaultName },
      { value: '' },
      { value: '' },
      { value: folderPath }
    );

    await this.vaultRepository.create(vault);

    await this.vaultRegistryRepository.addVault({
      id: id.value,
      name: vaultName,
      path: folderPath,
      lastAccessedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    await this.vaultRegistryRepository.setLastOpenedVault(id.value);

    return this.mapToResponse(vault);
  }

  async removeFromRegistry(vaultId: string): Promise<void> {
    await this.vaultRegistryRepository.removeVault(vaultId);
  }

  async deleteVaultFromRegistryAndDisk(vaultId: string): Promise<void> {
    const vaultItem = await this.vaultRegistryRepository.getVaultById(vaultId);

    if (!vaultItem) {
      throw new Error('知识库不存在');
    }

    const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    if (electronAPI && electronAPI.vault && electronAPI.vault.deleteDirectory) {
      await electronAPI.vault.deleteDirectory(vaultItem.path);
    }

    await this.vaultRegistryRepository.removeVault(vaultId);
  }

  private mapToResponse(vault: KnowledgeVault): VaultResponse {
    return {
      id: vault.getId().value,
      name: vault.getName().value,
      description: vault.getDescription().value,
      owner: vault.getOwner().value,
      path: vault.getPath().value,
      createdAt: vault.getCreatedAt().value.toISOString(),
      updatedAt: vault.getUpdatedAt().value.toISOString(),
      statistics: vault.getStatistics(),
      schemaVersion: vault.getSchemaVersion().value
    };
  }
}
