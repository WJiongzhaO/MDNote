<template>
  <div class="vault-select-view">
    <div class="vault-select-header">
      <h1 class="title">MD Note</h1>
      <p class="subtitle">选择或创建知识库</p>
    </div>

    <div class="vault-actions">
      <button class="btn btn-primary" @click="showNewVaultDialog = true">
        <span class="icon">+</span>
        新建知识库
      </button>
      <button class="btn btn-secondary" @click="openFolderAsVault">
        <span class="icon">📁</span>
        打开文件夹
      </button>
    </div>

    <div class="vault-list-section">
      <h2 class="section-title">已有知识库</h2>

      <div v-if="loading" class="loading-state">
        加载中...
      </div>

      <div v-else-if="vaults.length === 0" class="empty-state">
        <p>暂无知识库</p>
        <p class="hint">点击上方按钮创建或打开知识库</p>
      </div>

      <div v-else class="vault-grid">
        <VaultCard
          v-for="vault in vaults"
          :key="vault.id"
          :vault="vault"
          @select="handleSelectVault"
          @remove-from-list="handleRemoveFromList"
          @delete="handleDeleteVault"
        />
      </div>
    </div>

    <NewVaultDialog
      v-if="showNewVaultDialog"
      @close="showNewVaultDialog = false"
      @create="handleCreateVault"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Application } from '../../core/application';
import { InversifyContainer } from '../../core/container/inversify.container';
import { TYPES } from '../../core/container/container.types';
import type { VaultUseCases } from '../../application/usecases/vault.usecases';
import type { VaultRegistryItemDTO } from '../../application/dto/vault.dto';
import VaultCard from '../components/VaultCard.vue';
import NewVaultDialog from '../components/NewVaultDialog.vue';

const router = useRouter();
const vaults = ref<VaultRegistryItemDTO[]>([]);
const loading = ref(true);
const showNewVaultDialog = ref(false);

let vaultUseCases: VaultUseCases | null = null;

const getVaultUseCases = (): VaultUseCases => {
  if (!vaultUseCases) {
    const container = InversifyContainer.getInstance();
    vaultUseCases = container.get<VaultUseCases>(TYPES.VaultUseCases);
  }
  return vaultUseCases!;
};

const loadVaults = async () => {
  loading.value = true;
  try {
    const useCases = getVaultUseCases();
    vaults.value = await useCases.getRegisteredVaults();
  } catch (error) {
    console.error('加载知识库列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleSelectVault = async (vaultId: string) => {
  try {
    const useCases = getVaultUseCases();
    const result = await useCases.openVault(vaultId);

    if (result.success) {
      router.push({
        path: '/app',
        query: { vaultId: result.vault.id, vaultPath: result.vault.path }
      });
    } else {
      alert(result.error || '无法打开知识库');
    }
  } catch (error) {
    console.error('打开知识库失败:', error);
    alert('打开知识库失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const handleRemoveFromList = async (vaultId: string) => {
  try {
    const useCases = getVaultUseCases();
    await useCases.removeFromRegistry(vaultId);
    await loadVaults();
  } catch (error) {
    console.error('从列表移除失败:', error);
    alert('从列表移除失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const handleDeleteVault = async (vaultId: string) => {
  try {
    const useCases = getVaultUseCases();
    await useCases.deleteVaultFromRegistryAndDisk(vaultId);
    await loadVaults();
  } catch (error) {
    console.error('删除知识库失败:', error);
    alert('删除知识库失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const handleCreateVault = async (data: { name: string }) => {
  try {
    const useCases = getVaultUseCases();
    const result = await useCases.createAndRegisterVault({
      name: data.name
    });

    showNewVaultDialog.value = false;

    router.push({
      path: '/app',
      query: { vaultId: result.id, vaultPath: result.path }
    });
  } catch (error) {
    console.error('创建知识库失败:', error);
    alert('创建知识库失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const openFolderAsVault = async () => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.dialog || !electronAPI.dialog.openFolder) {
      alert('文件对话框不可用');
      return;
    }

    const folderPath = await electronAPI.dialog.openFolder({ skipSaveLastFolder: true });

    if (folderPath) {
      const useCases = getVaultUseCases();
      const result = await useCases.importFolderAsVault(folderPath);

      router.push({
        path: '/app',
        query: { vaultId: result.id, vaultPath: result.path }
      });
    }
  } catch (error) {
    console.error('打开文件夹失败:', error);
    alert('打开文件夹失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

onMounted(async () => {
  const app = Application.getInstance();
  await app.start();

  await loadVaults();
});
</script>

<style scoped>
.vault-select-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 40px;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

.vault-select-header {
  text-align: center;
  margin-bottom: 48px;
}

.title {
  font-size: 3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
}

.vault-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn .icon {
  font-size: 1.2rem;
}

.btn-primary {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.vault-list-section {
  width: 100%;
  max-width: 1000px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 24px 0;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state .hint {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin-top: 8px;
}

.vault-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
</style>
