<template>
  <div class="folder-manager">
    <div class="manager-header">
      <h1>文件夹管理</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="$emit('back-to-docs')">
          ← 返回文档
        </button>
        <button class="btn btn-primary" @click="showCreateFolderModal = true">
          <span class="plus-icon">+</span>
          新建文件夹
        </button>
      </div>
    </div>

    <div class="manager-content">
      <div class="folder-tree-section">
        <div class="section-header">
          <h2>文件夹结构</h2>
          <div class="tree-actions">
            <button class="btn btn-small" @click="expandAll">全部展开</button>
            <button class="btn btn-small" @click="collapseAll">全部收起</button>
          </div>
        </div>

        <div class="folder-tree">
          <div class="folder-item root-folder" @click="selectFolder(null)">
            <span class="folder-icon">📁</span>
            <span class="folder-name">根目录</span>
            <span class="folder-count">({{ rootDocumentCount }} 个文档)</span>
          </div>

          <FolderTreeItemComponent
            v-for="folder in folderTree"
            :key="folder.id"
            :folder="folder"
            :selected-folder-id="selectedFolderId"
            @select-folder="selectFolder"
            @create-folder="createFolder"
            @edit-folder="editFolder"
            @delete-folder="confirmDeleteFolder"
          />
        </div>

        <div v-if="folderTree.length === 0 && !isLoading" class="empty-state">
          <div class="empty-icon">📁</div>
          <div class="empty-text">暂无文件夹</div>
          <div class="empty-subtext">点击"新建文件夹"开始组织您的文档</div>
        </div>

        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <div>加载中...</div>
        </div>
      </div>

      <div class="folder-details-section">
        <div v-if="selectedFolderId === null" class="root-details">
          <h3>根目录</h3>
          <p class="folder-description">
            根目录包含所有未分配到文件夹的文档
          </p>
          <div class="folder-stats">
            <div class="stat-item">
              <span class="stat-label">文档数量:</span>
              <span class="stat-value">{{ rootDocumentCount }}</span>
            </div>
          </div>

          <div v-if="rootDocuments.length > 0" class="folder-documents">
            <h4>根目录文档</h4>
            <div class="document-list">
              <div
                v-for="doc in rootDocuments"
                :key="doc.id"
                class="document-item"
                @click="openDocument(doc.id)"
              >
                <span class="doc-icon">📄</span>
                <span class="doc-title">{{ doc.title }}</span>
                <span class="doc-date">{{ formatDate(doc.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="selectedFolder" class="folder-details">
          <h3>{{ selectedFolder.name }}</h3>
          <p class="folder-description">
            创建于 {{ formatDate(selectedFolder.createdAt) }}
          </p>
          <div class="folder-actions">
            <button class="btn btn-small" @click="editFolder(selectedFolder)">
              ✎ 编辑
            </button>
            <button class="btn btn-small btn-danger" @click="confirmDeleteFolder(selectedFolder)">
              🗑️ 删除
            </button>
          </div>

          <div class="folder-stats">
            <div class="stat-item">
              <span class="stat-label">子文件夹:</span>
              <span class="stat-value">{{ selectedFolder.children.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">文档数量:</span>
              <span class="stat-value">{{ folderDocumentCount }}</span>
            </div>
          </div>

          <div v-if="folderDocuments.length > 0" class="folder-documents">
            <h4>文件夹文档</h4>
            <div class="document-list">
              <div
                v-for="doc in folderDocuments"
                :key="doc.id"
                class="document-item"
                @click="openDocument(doc.id)"
              >
                <span class="doc-icon">📄</span>
                <span class="doc-title">{{ doc.title }}</span>
                <span class="doc-date">{{ formatDate(doc.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <div v-else class="empty-documents">
            <p>此文件夹暂无文档</p>
            <button class="btn btn-primary" @click="createDocumentInFolder">
              在此文件夹创建文档
            </button>
          </div>
        </div>

        <div v-else class="no-selection">
          <div class="selection-icon">📂</div>
          <p>选择一个文件夹查看详情</p>
        </div>
      </div>
    </div>

    <!-- 创建文件夹模态框 -->
    <div v-if="showCreateFolderModal" class="modal-overlay" @click="showCreateFolderModal = false">
      <div class="modal" @click.stop>
        <h3>创建文件夹</h3>
        <div class="form-group">
          <label>文件夹名称</label>
          <input
            type="text"
            placeholder="输入文件夹名称"
            v-model="newFolderName"
            @keyup.enter="handleCreateFolder"
          />
        </div>
        <div class="form-group">
          <label>父文件夹</label>
          <select v-model="newFolderParentId">
            <option :value="null">根目录</option>
            <option v-for="folder in flatFolderList" :key="folder.id" :value="folder.id">
              {{ '　'.repeat(folder.depth) }}{{ folder.name }}
            </option>
          </select>
        </div>
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
        <div class="form-group">
          <label>文件夹名称</label>
          <input
            type="text"
            placeholder="输入文件夹名称"
            v-model="editingFolderName"
            @keyup.enter="handleUpdateFolder"
          />
        </div>
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
        <p class="warning-text">此操作不可撤销，文件夹中的文档将被移动到根目录。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDeleteConfirmModal = false">取消</button>
          <button class="btn btn-danger" @click="handleDeleteFolder">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFolders } from '../composables/useFolders';
import { useDocuments } from '../composables/useDocuments';
import type { FolderTreeItem } from '../../application';
import FolderTreeItemComponent from './FolderTreeItem.vue';

interface Props {
  applicationService: any;
}

interface Emits {
  (e: 'back-to-docs'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const router = useRouter();

const {
  folderTree,
  folders,
  currentFolder,
  isLoading,
  error,
  loadFolders,
  createFolder,
  updateFolder,
  deleteFolder
} = useFolders(props.applicationService);

const {
  documents,
  loadDocumentsByFolder,
  createDocument
} = useDocuments(props.applicationService);

const selectedFolderId = ref<string | null>(null);
const showCreateFolderModal = ref(false);
const showEditFolderModal = ref(false);
const showDeleteConfirmModal = ref(false);
const newFolderName = ref('');
const newFolderParentId = ref<string | null>(null);
const editingFolderId = ref<string | null>(null);
const editingFolderName = ref('');
const deletingFolderId = ref<string | null>(null);
const deletingFolderName = ref('');

const selectedFolder = computed(() => {
  if (!selectedFolderId.value) return null;
  return findFolderById(folderTree.value, selectedFolderId.value);
});

const rootDocuments = computed(() => {
  return documents.value.filter(doc => doc.folderId === null);
});

const rootDocumentCount = computed(() => rootDocuments.value.length);

const folderDocuments = computed(() => {
  if (!selectedFolderId.value) return [];
  return documents.value.filter(doc => doc.folderId === selectedFolderId.value);
});

const folderDocumentCount = computed(() => folderDocuments.value.length);

const flatFolderList = computed(() => {
  const flatten = (folders: FolderTreeItem[], depth = 0): Array<FolderTreeItem & { depth: number }> => {
    const result: Array<FolderTreeItem & { depth: number }> = [];

    for (const folder of folders) {
      result.push({ ...folder, depth });
      if (folder.children && folder.children.length > 0) {
        result.push(...flatten(folder.children, depth + 1));
      }
    }

    return result;
  };

  return flatten(folderTree.value);
});

const findFolderById = (folders: FolderTreeItem[], id: string): FolderTreeItem | null => {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    if (folder.children && folder.children.length > 0) {
      const found = findFolderById(folder.children, id);
      if (found) return found;
    }
  }
  return null;
};

const selectFolder = (id: string | null) => {
  selectedFolderId.value = id;
  if (id !== null) {
    loadDocumentsByFolder(id);
  } else {
    loadDocumentsByFolder(null);
  }
};

const expandAll = () => {
  const setExpanded = (folders: FolderTreeItem[]) => {
    folders.forEach(folder => {
      folder.isExpanded = true;
      if (folder.children) {
        setExpanded(folder.children);
      }
    });
  };
  setExpanded(folderTree.value);
};

const collapseAll = () => {
  const setCollapsed = (folders: FolderTreeItem[]) => {
    folders.forEach(folder => {
      folder.isExpanded = false;
      if (folder.children) {
        setCollapsed(folder.children);
      }
    });
  };
  setCollapsed(folderTree.value);
};

const handleCreateFolder = () => {
  if (newFolderName.value.trim()) {
    createFolder({
      name: newFolderName.value.trim(),
      parentId: newFolderParentId.value
    });
    showCreateFolderModal.value = false;
    newFolderName.value = '';
    newFolderParentId.value = null;
  }
};

const editFolder = (folder: FolderTreeItem) => {
  editingFolderId.value = folder.id;
  editingFolderName.value = folder.name;
  showEditFolderModal.value = true;
};

const handleUpdateFolder = () => {
  if (editingFolderId.value && editingFolderName.value.trim()) {
    updateFolder({
      id: editingFolderId.value,
      name: editingFolderName.value.trim()
    });
    showEditFolderModal.value = false;
  }
};

const confirmDeleteFolder = (folder: FolderTreeItem) => {
  deletingFolderId.value = folder.id;
  deletingFolderName.value = folder.name;
  showDeleteConfirmModal.value = true;
};

const handleDeleteFolder = () => {
  if (deletingFolderId.value) {
    deleteFolder(deletingFolderId.value);
    showDeleteConfirmModal.value = false;

    if (selectedFolderId.value === deletingFolderId.value) {
      selectedFolderId.value = null;
    }
  }
};

const openDocument = (docId: string) => {
  router.push(`/?doc=${docId}`);
  emit('back-to-docs');
};

const createDocumentInFolder = () => {
  if (selectedFolderId.value) {
    createDocument({
      title: '新建文档',
      content: '# 新建文档\n\n开始编写...',
      folderId: selectedFolderId.value
    });
  }
};

const formatDate = (date: Date): string => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays} 天前`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} 周前`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} 月前`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} 年前`;
  }
};

onMounted(() => {
  loadFolders();
  loadDocumentsByFolder(null);
});
</script>

<style scoped>
.folder-manager {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.manager-header {
  background: white;
  padding: 20px 30px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.manager-header h1 {
  margin: 0;
  color: #333;
  font-size: 1.8rem;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
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

.btn-small {
  padding: 4px 8px;
  font-size: 0.8rem;
}

.plus-icon {
  font-size: 1.1rem;
}

.manager-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.folder-tree-section {
  width: 350px;
  background: white;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
}

.section-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.tree-actions {
  display: flex;
  gap: 8px;
}

.folder-tree {
  flex: 1;
  overflow-y: auto;
  padding: 15px 0;
}

.folder-item {
  padding: 10px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.2s;
  gap: 8px;
}

.folder-item:hover {
  background: #f8f9fa;
}

.folder-item.active {
  background: #e8f4ff;
  border-left: 3px solid #667eea;
}

.root-folder {
  font-weight: 600;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 10px;
}

.folder-icon {
  font-size: 1rem;
}

.folder-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-count {
  font-size: 0.8rem;
  color: #666;
}

.folder-details-section {
  flex: 1;
  background: white;
  padding: 30px;
  overflow-y: auto;
}

.folder-details h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 1.5rem;
}

.folder-description {
  color: #666;
  margin-bottom: 20px;
}

.folder-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.folder-stats {
  display: flex;
  gap: 30px;
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.folder-documents h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.1rem;
}

.document-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.document-item {
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background-color 0.2s;
}

.document-item:hover {
  background: #f8f9fa;
}

.doc-icon {
  font-size: 1rem;
}

.doc-title {
  flex: 1;
  font-weight: 500;
  color: #333;
}

.doc-date {
  font-size: 0.8rem;
  color: #666;
}

.empty-documents {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-documents p {
  margin-bottom: 20px;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.selection-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.empty-state, .loading-state {
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
  padding: 30px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.warning-text {
  color: #e53e3e;
  font-size: 0.9rem;
  margin-top: 10px;
}
</style>