<template>
  <div class="app-layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <h1>MD Note</h1>
        <button class="btn btn-secondary" @click="goToFolderManager" title="文件夹管理">
          📂 管理文件夹
        </button>
      </div>

      <FolderList
        :folder-tree="folderTree"
        :selected-folder-id="selectedFolderId"
        @select-folder="handleSelectFolder"
        @create-folder="handleCreateFolder"
        @update-folder="handleUpdateFolder"
        @delete-folder="handleDeleteFolder"
      />
    </div>

    <DocumentList
      :documents="filteredDocuments"
      :is-loading="isLoading"
      :active-document-id="currentDocument?.id"
      @select-document="handleSelectDocument"
      @create-new="handleCreateNew"
      @search="handleSearch"
    />

    <MarkdownEditor
      :document="currentDocument"
      :render-markdown="renderMarkdown"
      @update-document="handleUpdateDocument"
    />

    <div v-if="error" class="error-toast">
      {{ error }}
      <button @click="error = null" class="error-close">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDocuments } from '../composables/useDocuments';
import { useFolders } from '../composables/useFolders';
import { ApplicationService } from '../../application';
import { LocalStorageDocumentRepository, LocalStorageFolderRepository } from '../../infrastructure';
import DocumentList from './DocumentList.vue';
import MarkdownEditor from './MarkdownEditor.vue';
import FolderList from './FolderList.vue';

const router = useRouter();

const documentRepository = new LocalStorageDocumentRepository();
const folderRepository = new LocalStorageFolderRepository();
const applicationService = new ApplicationService(documentRepository, folderRepository);

const {
  documents,
  currentDocument,
  isLoading,
  error,
  createDocument,
  updateDocument,
  loadDocument,
  loadDocuments,
  loadDocumentsByFolder,
  renderMarkdown
} = useDocuments(applicationService);

const {
  folderTree,
  createFolder,
  updateFolder,
  deleteFolder,
  loadFolders
} = useFolders(applicationService);

const selectedFolderId = ref<string | null>(null);
const searchQuery = ref('');

const filteredDocuments = computed(() => {
  let filtered = documents.value;

  // 根据搜索查询过滤文档
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(doc =>
      doc.title.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const handleSelectDocument = async (id: string) => {
  await loadDocument(id);
};

const handleCreateNew = async () => {
  await createDocument({
    title: '新建文档',
    content: '# 新建文档\n\n开始编写您的 Markdown 文档...',
    folderId: selectedFolderId.value
  });
};

const handleUpdateDocument = async (id: string, title: string, content: string) => {
  await updateDocument({
    id,
    title,
    content
  });
};

const handleSearch = async (query: string) => {
  searchQuery.value = query;

  if (query.trim()) {
    const documentUseCases = applicationService.getDocumentUseCases();
    const searchResults = await documentUseCases.searchDocuments(query);
    documents.value = searchResults;
  } else {
    // 如果搜索框为空，重新加载所有文档
    await loadDocuments();
  }
};

const handleSelectFolder = async (folderId: string | null) => {
  selectedFolderId.value = folderId;
  await loadDocumentsByFolder(folderId);
};

const handleCreateFolder = async (name: string, parentId: string | null = null) => {
  await createFolder({
    name,
    parentId
  });
};

const handleUpdateFolder = async (id: string, name: string) => {
  await updateFolder({
    id,
    name
  });
};

const handleDeleteFolder = async (id: string) => {
  await deleteFolder(id);

  // 如果删除的是当前选中的文件夹，取消选择
  if (selectedFolderId.value === id) {
    selectedFolderId.value = null;
  }
};

const goToFolderManager = () => {
  router.push('/folders');
};

onMounted(async () => {
  // 初始化文件夹和根目录文档
  await loadFolders();
  await loadDocumentsByFolder(null);

  // 检查是否是首次运行，如果是则创建示例文档
  const existingDocs = await documentUseCases.getAllDocuments();
  if (existingDocs.length === 0) {
    await createDocument({
      title: '欢迎使用 MD Note',
      content: `# 欢迎使用 MD Note

这是一个支持文件夹管理的 Markdown 笔记应用。

## 特性

- 📝 **Markdown 编辑** - 支持完整的 Markdown 语法
- 👁️ **实时预览** - 左侧编辑，右侧实时预览
- 📚 **文档管理** - 轻松管理您的所有文档
- 🔍 **搜索功能** - 快速找到您需要的文档
- 📁 **文件夹支持** - 支持嵌套文件夹管理文档
- 💾 **本地存储** - 所有数据自动保存在浏览器本地

## 使用方法

1. 点击左侧"+"按钮创建新文件夹
2. 选中文件夹后在右侧创建文档
3. 点击文档标题开始编辑
4. 所有更改都会自动保存

---

开始创建您的第一个文件夹和文档吧！`,
      folderId: null
    });
  }
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-header h1 {
  margin: 0;
  font-size: 1.4rem;
  color: #333;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-secondary {
  background: #e9ecef;
  color: #333;
}

.btn-secondary:hover {
  background: #dee2e6;
}

.error-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #dc3545;
  color: white;
  padding: 12px 20px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

.error-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}
</style>