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
      <div class="folder-actions">
        <button class="btn btn-small" @click.stop="createSubFolder" title="创建子文件夹">
          +
        </button>
        <button class="btn btn-small" @click.stop="editFolder" title="编辑文件夹">
          ✎
        </button>
        <button class="btn btn-small" @click.stop="deleteFolder" title="删除文件夹">
          🗑️
        </button>
      </div>
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
import type { FolderTreeItem } from '../../application';

interface Props {
  folder: FolderTreeItem;
  selectedFolderId?: string | null;
}

interface Emits {
  (e: 'select-folder', id: string): void;
  (e: 'create-folder', data: { name: string; parentId: string }): void;
  (e: 'edit-folder', folder: FolderTreeItem): void;
  (e: 'delete-folder', folder: FolderTreeItem): void;
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

const createSubFolder = () => {
  const name = prompt('请输入子文件夹名称:');
  if (name && name.trim()) {
    emit('create-folder', {
      name: name.trim(),
      parentId: props.folder.id
    });
  }
};

const editFolder = () => {
  emit('edit-folder', props.folder);
};

const deleteFolder = () => {
  emit('delete-folder', props.folder);
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

.folder-actions {
  display: none;
  gap: 2px;
}

.folder-item:hover .folder-actions {
  display: flex;
}

.btn-small {
  padding: 2px 6px;
  font-size: 0.7rem;
  background: transparent;
  color: #666;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-small:hover {
  background: #e9ecef;
  color: #333;
}

.folder-children {
  padding-left: 20px;
  border-left: 1px solid #e9ecef;
  margin-left: 8px;
}
</style>