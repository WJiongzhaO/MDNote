<template>
  <div class="document-manager">
    <header class="header">
      <div class="header-content">
        <h1>📝 MD Note</h1>
        <div class="actions">
          <button @click="createNewDocument" class="btn-primary">
            <span class="icon">+</span>
            新建文档
          </button>
        </div>
      </div>
    </header>

    <main class="main">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h3>文件夹</h3>
          <button @click="showCreateFolder = true" class="btn-icon">+</button>
        </div>
        <div class="folder-list">
          <div
            v-for="folder in folders"
            :key="folder.id"
            :class="['folder-item', { active: selectedFolder === folder.id }]"
            @click="selectFolder(folder.id)"
          >
            <span class="folder-icon">📁</span>
            <span class="folder-name">{{ folder.name }}</span>
            <span class="folder-count">{{ folder.documentCount }}</span>
          </div>
        </div>
      </aside>

      <div class="content">
        <div class="search-bar">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文档..."
            class="search-input"
          />
        </div>

        <div class="document-grid">
          <div
            v-for="doc in filteredDocuments"
            :key="doc.id"
            class="document-card"
            @click="openDocument(doc.id)"
          >
            <div class="card-header">
              <h3 class="document-title">{{ doc.title }}</h3>
              <div class="document-actions">
                <button @click.stop="deleteDocument(doc.id)" class="btn-delete">🗑️</button>
              </div>
            </div>
            <p class="document-preview">{{ doc.preview }}</p>
            <div class="card-footer">
              <span class="document-date">{{ formatDate(doc.updatedAt) }}</span>
              <span class="document-word-count">{{ doc.wordCount }} 字</span>
            </div>
          </div>
        </div>

        <div v-if="filteredDocuments.length === 0" class="empty-state">
          <div class="empty-icon">📄</div>
          <h3>{{ searchQuery ? '没有找到匹配的文档' : '还没有文档' }}</h3>
          <p>{{ searchQuery ? '尝试其他搜索词' : '点击"新建文档"开始创建' }}</p>
        </div>
      </div>
    </main>

    <!-- 新建文件夹弹窗 -->
    <div v-if="showCreateFolder" class="modal-overlay" @click="showCreateFolder = false">
      <div class="modal" @click.stop>
        <h3>新建文件夹</h3>
        <input
          v-model="newFolderName"
          type="text"
          placeholder="文件夹名称"
          class="modal-input"
          @keyup.enter="createFolder"
        />
        <div class="modal-actions">
          <button @click="showCreateFolder = false" class="btn-secondary">取消</button>
          <button @click="createFolder" class="btn-primary">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { documentStore, type Document, type Folder } from '../stores/documents'

const router = useRouter()

// 响应式数据
const documents = ref<Document[]>([])
const folders = ref<Folder[]>([])
const selectedFolder = ref<string>('all')
const searchQuery = ref('')
const showCreateFolder = ref(false)
const newFolderName = ref('')

// 计算属性
const filteredDocuments = computed(() => {
  return documentStore.searchDocuments(searchQuery.value, selectedFolder.value)
})

// 方法
const createNewDocument = () => {
  const folderId = selectedFolder.value === 'all' ? 'default' : selectedFolder.value
  const newDoc = documentStore.createDocument(folderId)
  router.push(`/editor/${newDoc.id}`)
}

const openDocument = (id: string) => {
  router.push(`/editor/${id}`)
}

const deleteDocument = (id: string) => {
  if (confirm('确定要删除这个文档吗？')) {
    documentStore.deleteDocument(id)
    loadDocuments()
  }
}

const selectFolder = (folderId: string) => {
  selectedFolder.value = folderId
}

const createFolder = () => {
  if (newFolderName.value.trim()) {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.value.trim(),
      documentCount: 0
    }
    documentStore.saveFolder(newFolder)
    newFolderName.value = ''
    showCreateFolder.value = false
    loadFolders()
  }
}

const loadDocuments = () => {
  documents.value = documentStore.getDocuments()
}

const loadFolders = () => {
  folders.value = documentStore.getFolders()
}

const loadData = () => {
  loadDocuments()
  loadFolders()
}

const formatDate = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  return date.toLocaleDateString()
}

// 生命周期
onMounted(() => {
  loadData()
})

// 组件重新激活时重新加载数据
onActivated(() => {
  loadData()
})
</script>

<style scoped>
.document-manager {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #e1e5e9;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn-primary {
  background: #409eff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #337ecc;
}

.main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background: white;
  border-right: 1px solid #e1e5e9;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e1e5e9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
}

.btn-icon {
  width: 24px;
  height: 24px;
  border: none;
  background: #409eff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.folder-list {
  flex: 1;
  padding: 8px;
}

.folder-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
  transition: background 0.2s;
}

.folder-item:hover {
  background: #f0f2f5;
}

.folder-item.active {
  background: #e3f2fd;
  color: #1976d2;
}

.folder-icon {
  font-size: 16px;
}

.folder-name {
  flex: 1;
  font-size: 14px;
}

.folder-count {
  font-size: 12px;
  color: #666;
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 10px;
}

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.search-bar {
  margin-bottom: 24px;
}

.search-input {
  width: 100%;
  max-width: 400px;
  padding: 12px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.document-card {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.document-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.document-title {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
  font-weight: 600;
  line-height: 1.4;
}

.document-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.document-card:hover .document-actions {
  opacity: 1;
}

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 14px;
}

.btn-delete:hover {
  background: #f0f2f5;
}

.document-preview {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.empty-state p {
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 400px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.modal h3 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.modal-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.modal-input:focus {
  outline: none;
  border-color: #409eff;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary:hover {
  background: #f0f2f5;
}
</style>