<template>
  <div class="document-list">
    <div class="list-header">
      <h2>文档列表</h2>
      <button class="btn btn-primary" @click="$emit('create-new')">
        <span class="plus-icon">+</span>
        新建文档
      </button>
    </div>

    <div class="search-box">
      <input
        type="text"
        placeholder="搜索文档..."
        v-model="searchQuery"
        @input="handleSearch"
      />
    </div>

    <div class="documents">
      <div
        v-for="document in filteredDocuments"
        :key="document.id"
        class="document-item"
        :class="{ active: document.id === activeDocumentId }"
        @click="$emit('select-document', document.id)"
      >
        <div class="document-title">
          {{ document.title || '无标题' }}
        </div>
        <div class="document-date">
          {{ formatDate(document.updatedAt) }}
        </div>
      </div>

      <div v-if="documents.length === 0 && !isLoading" class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-text">暂无文档</div>
        <div class="empty-subtext">点击"新建文档"开始创作</div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <div>加载中...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DocumentListItem } from '../../application';

interface Props {
  documents: DocumentListItem[];
  isLoading: boolean;
  activeDocumentId?: string;
}

interface Emits {
  (e: 'select-document', id: string): void;
  (e: 'create-new'): void;
  (e: 'search', query: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const searchQuery = ref('');

const filteredDocuments = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.documents;
  }

  const query = searchQuery.value.toLowerCase();
  return props.documents.filter(doc =>
    doc.title.toLowerCase().includes(query)
  );
});

const handleSearch = () => {
  emit('search', searchQuery.value);
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
</script>

<style scoped>
.document-list {
  width: 300px;
  height: 100vh;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
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
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a67d8;
}

.plus-icon {
  margin-right: 4px;
}

.search-box {
  padding: 15px;
  border-bottom: 1px solid #e9ecef;
}

.search-box input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.search-box input:focus {
  outline: none;
  border-color: #667eea;
}

.documents {
  flex: 1;
  overflow-y: auto;
}

.document-item {
  padding: 12px 20px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: background-color 0.2s;
}

.document-item:hover {
  background: #f0f2f5;
}

.document-item.active {
  background: #e8f4ff;
  border-left: 3px solid #667eea;
}

.document-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-date {
  font-size: 0.8rem;
  color: #666;
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
</style>