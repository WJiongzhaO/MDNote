<template>
  <div
    class="vault-card"
    :class="{ 'path-missing': !vault.pathExists }"
    @click="handleClick"
  >
    <div class="vault-icon">
      <span v-if="vault.pathExists">📚</span>
      <span v-else class="warning">⚠️</span>
    </div>

    <div class="vault-info">
      <h3 class="vault-name">{{ vault.name }}</h3>
      <p class="vault-path" :title="vault.path">{{ vault.path }}</p>
      <p class="vault-meta">
        <span v-if="!vault.pathExists" class="missing-label">路径不存在</span>
        <span v-else>最后访问: {{ formatDate(vault.lastAccessedAt) }}</span>
      </p>
    </div>

    <div class="vault-actions">
      <button class="action-btn action-btn-remove" @click.stop="handleRemoveFromList" title="从列表移除">
        📤
      </button>
      <button class="action-btn action-btn-delete" @click.stop="handleDelete" title="彻底删除">
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VaultRegistryItemDTO } from '../../application/dto/vault.dto';

interface Props {
  vault: VaultRegistryItemDTO;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [vaultId: string];
  removeFromList: [vaultId: string];
  delete: [vaultId: string];
}>();

const handleClick = () => {
  if (props.vault.pathExists) {
    emit('select', props.vault.id);
  }
};

const handleRemoveFromList = () => {
  if (confirm(`确定要从列表中移除"${props.vault.name}"吗？\n\n注意：这只会从列表中移除，不会删除实际文件夹。`)) {
    emit('removeFromList', props.vault.id);
  }
};

const handleDelete = () => {
  if (confirm(`确定要彻底删除知识库"${props.vault.name}"吗？\n\n警告：这将删除整个知识库文件夹及其所有内容，此操作不可撤销！`)) {
    emit('delete', props.vault.id);
  }
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}周前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  } catch {
    return dateStr;
  }
};
</script>

<style scoped>
.vault-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vault-card:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.vault-card.path-missing {
  opacity: 0.7;
  border-color: var(--accent-warning);
}

.vault-card.path-missing:hover {
  border-color: var(--accent-warning);
}

.vault-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 12px;
  font-size: 1.5rem;
}

.vault-icon .warning {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.vault-info {
  flex: 1;
  min-width: 0;
}

.vault-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vault-path {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vault-meta {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin: 0;
}

.missing-label {
  color: var(--accent-warning);
  font-weight: 500;
}

.vault-actions {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-tertiary);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn-remove:hover {
  background: var(--bg-hover);
  color: var(--accent-primary);
}

.action-btn-delete:hover {
  background: var(--bg-hover);
  color: var(--accent-danger);
}
</style>
