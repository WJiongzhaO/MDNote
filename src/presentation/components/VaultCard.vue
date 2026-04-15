<template>
  <div class="vault-card" :class="{ 'path-missing': !vault.pathExists }" @click="handleClick">
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
      <button class="action-btn menu-btn" @click.stop="toggleMenu" title="更多操作">⋮</button>
    </div>

    <div v-if="showMenu" class="vault-menu" @click.stop>
      <button class="menu-item" @click="openFragmentManager">
        <span class="menu-icon">📋</span>
        片段管理
      </button>
      <button class="menu-item" @click="openHealthDashboard">
        <span class="menu-icon">📊</span>
        健康度仪表盘
      </button>
      <div class="menu-divider"></div>
      <button class="menu-item remove" @click="handleRemove">
        <span class="menu-icon">🗑️</span>
        从列表移除
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import type { VaultRegistryItemDTO } from '../../application/dto/vault.dto'

interface Props {
  vault: VaultRegistryItemDTO
}

const props = defineProps<Props>()
const router = useRouter()
const showMenu = ref(false)

const emit = defineEmits<{
  select: [vaultId: string]
  remove: [vaultId: string]
}>()

const handleClick = () => {
  if (props.vault.pathExists) {
    emit('select', props.vault.id)
  }
}

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const handleClickOutside = (e: MouseEvent) => {
  const card = (e.target as HTMLElement).closest('.vault-card')
  if (!card) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const openFragmentManager = () => {
  showMenu.value = false
  router.push(`/vault/${props.vault.id}/fragments/`)
}

const openHealthDashboard = () => {
  showMenu.value = false
  router.push(`/vault/${props.vault.id}/fragments/health`)
}

const handleRemove = () => {
  showMenu.value = false
  if (
    confirm(
      `确定要从列表中移除"${props.vault.name}"吗？\n\n注意：这只会从列表中移除，不会删除实际文件夹。`,
    )
  ) {
    emit('remove', props.vault.id)
  }
}

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}周前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  } catch {
    return dateStr
  }
}
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
  position: relative;
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
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--accent-danger);
}

.menu-btn {
  font-size: 1.4rem;
}

.vault-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  padding: 4px;
  min-width: 160px;
  z-index: 100;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-item.remove {
  color: var(--accent-danger);
}

.menu-icon {
  font-size: 1rem;
}

.menu-divider {
  height: 1px;
  background: var(--border-primary);
  margin: 4px 0;
}
</style>
