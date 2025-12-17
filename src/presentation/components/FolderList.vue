<template>
  <div class="folder-list">
    <div class="list-header">
      <h2>文件夹</h2>
      <button class="btn btn-icon" @click="showCreateFolderModal = true" title="新建文件夹">
        <span class="plus-icon">+</span>
      </button>
    </div>

    <div class="folders">
      <div class="folder-item root-folder"
           :class="{ active: selectedFolderId === null, 'drag-over': isDragOver && dragOverFolderId === null }"
           @click="selectFolder(null)"
           @dragover.prevent="handleDragOver($event, null)"
           @dragleave="handleDragLeave"
           @drop="handleDrop($event, null)">
        <span class="folder-icon">📁</span>
        <span class="folder-name">根目录</span>
      </div>

      <template v-for="folder in folderTree" :key="folder.id">
        <div
          class="folder-item"
          :class="{ active: selectedFolderId === folder.id, 'drag-over': isDragOver && dragOverFolderId === folder.id }"
          @click="selectFolder(folder.id)"
          @dragover.prevent="handleDragOver($event, folder.id)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, folder.id)"
        >
          <span class="folder-toggle" v-if="folder.children && folder.children.length > 0" @click.stop="toggleFolder(folder)">
            {{ folder.isExpanded ? '▼' : '▶' }}
          </span>
          <span class="folder-toggle-placeholder" v-else></span>
          <span class="folder-icon">📂</span>
          <span class="folder-name">{{ folder.name }}</span>
          <div class="folder-actions">
            <button class="btn btn-small" @click.stop="editFolder(folder)" title="编辑文件夹">
              ✎
            </button>
            <button class="btn btn-small" @click.stop="confirmDeleteFolder(folder)" title="删除文件夹">
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
            @select-folder="selectFolder"
            @edit-folder="editFolder"
            @delete-folder="confirmDeleteFolder"
          />
        </div>
      </template>

      <div v-if="folderTree.length === 0 && !isLoading" class="empty-state">
        <div class="empty-icon">📁</div>
        <div class="empty-text">暂无文件夹</div>
        <div class="empty-subtext">点击"+"创建新文件夹</div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <div>加载中...</div>
      </div>
    </div>

    <!-- 创建文件夹模态框 -->
    <div v-if="showCreateFolderModal" class="modal-overlay" @click="showCreateFolderModal = false">
      <div class="modal" @click.stop>
        <h3>创建文件夹</h3>
        <input
          type="text"
          placeholder="文件夹名称"
          v-model="newFolderName"
          @keyup.enter="handleCreateFolder"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showCreateFolderModal = false">取消</button>
          <button class="btn btn-primary" @click="handleCreateFolder" :disabled="!newFolderName.trim()">创建</button>
        </div>
      </div>
    </div>

    <!-- 编辑文件夹模态框 -->
    <div v-if="showEditFolderModal" class="modal-overlay" @click="showEditFolderModal = false">
      <div class="modal" @click.stop>
        <h3>编辑文件夹</h3>
        <input
          type="text"
          placeholder="文件夹名称"
          v-model="editingFolderName"
          @keyup.enter="handleUpdateFolder"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showEditFolderModal = false">取消</button>
          <button class="btn btn-primary" @click="handleUpdateFolder" :disabled="!editingFolderName.trim()">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteConfirmModal" class="modal-overlay" @click="showDeleteConfirmModal = false">
      <div class="modal" @click.stop>
        <h3>确认删除</h3>
        <p>确定要删除文件夹 "{{ deletingFolderName }}" 吗？</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDeleteConfirmModal = false">取消</button>
          <button class="btn btn-danger" @click="handleDeleteFolder">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FolderTreeItem as FolderTreeItemType } from '../../application';
import FolderTreeItem from './FolderTreeItem.vue';

interface Props {
  folderTree: FolderTreeItemType[];
  selectedFolderId?: string | null;
  isLoading?: boolean;
}

interface Emits {
  (e: 'select-folder', id: string | null): void;
  (e: 'create-folder', name: string, parentId: string | null): void;
  (e: 'update-folder', id: string, name: string): void;
  (e: 'delete-folder', id: string): void;
  (e: 'move-document', documentId: string, targetFolderId: string | null): void;
}

const props = withDefaults(defineProps<Props>(), {
  selectedFolderId: null,
  isLoading: false
});

const emit = defineEmits<Emits>();

const showCreateFolderModal = ref(false);
const showEditFolderModal = ref(false);
const showDeleteConfirmModal = ref(false);
const newFolderName = ref('');
const editingFolderId = ref<string | null>(null);
const editingFolderName = ref('');
const deletingFolderId = ref<string | null>(null);
const deletingFolderName = ref('');

// 拖拽相关状态
const isDragOver = ref(false);
const dragOverFolderId = ref<string | null>(null);

const toggleFolder = (folder: FolderTreeItemType) => {
  folder.isExpanded = !folder.isExpanded;
};

const selectFolder = (id: string | null) => {
  emit('select-folder', id);
};

const createFolder = (name: string, parentId: string | null = null) => {
  emit('create-folder', name, parentId);
  showCreateFolderModal.value = false;
  newFolderName.value = '';
};

const handleCreateFolder = () => {
  if (newFolderName.value.trim()) {
    createFolder(newFolderName.value.trim(), props.selectedFolderId);
  }
};

const editFolder = (folder: FolderTreeItemType) => {
  editingFolderId.value = folder.id;
  editingFolderName.value = folder.name;
  showEditFolderModal.value = true;
};

const updateFolder = (id: string, name: string) => {
  emit('update-folder', id, name);
  showEditFolderModal.value = false;
};

const handleUpdateFolder = () => {
  if (editingFolderId.value && editingFolderName.value.trim()) {
    updateFolder(editingFolderId.value, editingFolderName.value.trim());
  }
};

const confirmDeleteFolder = (folder: FolderTreeItemType) => {
  deletingFolderId.value = folder.id;
  deletingFolderName.value = folder.name;
  showDeleteConfirmModal.value = true;
};

const deleteFolder = (id: string) => {
  emit('delete-folder', id);
  showDeleteConfirmModal.value = false;
};

const handleDeleteFolder = () => {
  if (deletingFolderId.value) {
    deleteFolder(deletingFolderId.value);
  }
};

// 拖拽相关事件处理
const handleDragOver = (event: DragEvent, folderId: string | null) => {
  event.preventDefault();
  isDragOver.value = true;
  dragOverFolderId.value = folderId;
};

const handleDragLeave = () => {
  isDragOver.value = false;
  dragOverFolderId.value = null;
};

const handleDrop = (event: DragEvent, targetFolderId: string | null) => {
  event.preventDefault();
  isDragOver.value = false;
  dragOverFolderId.value = null;

  if (event.dataTransfer) {
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      if (data.type === 'document' && data.id) {
        emit('move-document', data.id, targetFolderId);
      }
    } catch (error) {
      console.error('Failed to parse drag data:', error);
    }
  }
};
</script>

<style scoped>
.folder-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-icon {
  padding: 8px;
  background: #667eea;
  color: white;
}

.btn-icon:hover {
  background: #5a67d8;
}

.plus-icon {
  font-size: 1.2rem;
}

.folders {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.folder-item {
  padding: 8px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.2s;
}

.folder-item:hover {
  background: #f0f2f5;
}

.folder-item.active {
  background: #e8f4ff;
  border-left: 3px solid #667eea;
}

.folder-item.drag-over {
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.root-folder {
  font-weight: 600;
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
  margin-right: 8px;
  font-size: 1rem;
}

.folder-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-actions {
  display: none;
  gap: 4px;
}

.folder-item:hover .folder-actions {
  display: flex;
}

.btn-small {
  padding: 2px 6px;
  font-size: 0.8rem;
  background: transparent;
  color: #666;
}

.btn-small:hover {
  background: #e9ecef;
  color: #333;
}

.folder-children {
  padding-left: 20px;
  border-left: 1px solid #e9ecef;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.empty-text {
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-subtext {
  font-size: 0.9rem;
  color: #999;
}

.loading-state {
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.modal input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 16px;
}

.modal input:focus {
  outline: none;
  border-color: #667eea;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a67d8;
}

.btn-secondary {
  background: #e9ecef;
  color: #333;
}

.btn-secondary:hover {
  background: #dee2e6;
}

.btn-danger {
  background: #e53e3e;
  color: white;
}

.btn-danger:hover {
  background: #c53030;
}
</style>
