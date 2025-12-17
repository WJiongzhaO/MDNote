<template>
  <div class="folder-tree-item">
    <div
      class="folder-item"
      :class="{ active: selectedFolderId === folder.id }"
      @click="selectFolder"
    >
      <span
        class="folder-toggle"
        v-if="folder.children && folder.children.length > 0"
        @click.stop="toggleExpanded"
      >
        {{ folder.isExpanded ? '▼' : '▶' }}
      </span>
      <span class="folder-toggle-placeholder" v-else></span>
      <span class="folder-icon">📂</span>
      <span class="folder-name">{{ folder.name }}</span>
    </div>

    <div v-if="folder.isExpanded && folder.children && folder.children.length > 0" class="folder-children">
      <FolderTreeItem
        v-for="child in folder.children"
        :key="child.id"
        :folder="child"
        :selected-folder-id="selectedFolderId"
        @select-folder="$emit('select-folder', $event)"
        @create-folder="$emit('create-folder', $event)"
        @edit-folder="$emit('edit-folder', $event)"
        @delete-folder="$emit('delete-folder', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FolderTreeItem as FolderTreeItemType } from '../../application';

interface Props {
  folder: FolderTreeItemType;
  selectedFolderId?: string | null;
}

interface Emits {
  (e: 'select-folder', id: string): void;
  (e: 'create-folder', data: { name: string; parentId: string }): void;
  (e: 'edit-folder', folder: FolderTreeItemType): void;
  (e: 'delete-folder', folder: FolderTreeItemType): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const selectFolder = () => {
  emit('select-folder', props.folder.id);
};

const toggleExpanded = () => {
  if (props.folder.children && props.folder.children.length > 0) {
    props.folder.isExpanded = !props.folder.isExpanded;
  }
};
</script>

<style scoped>
.folder-tree-item {
  user-select: none;
}

.folder-item {
  padding: 8px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.2s;
  gap: 8px;
}

.folder-item:hover {
  background: #f0f2f5;
}

.folder-item.active {
  background: #e8f4ff;
  border-left: 3px solid #667eea;
}

.folder-toggle {
  width: 16px;
  text-align: center;
  font-size: 0.8rem;
  cursor: pointer;
  color: #666;
}

.folder-toggle-placeholder {
  width: 16px;
}

.folder-icon {
  font-size: 1rem;
}

.folder-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
}

.folder-children {
  padding-left: 20px;
  border-left: 1px solid #e9ecef;
  margin-left: 8px;
}
</style>
