<template>
  <div class="fragment-manager">
    <div class="manager-header">
      <h1>📚 知识片段管理</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showCreateDialog = true">
          ➕ 新建片段
        </button>
        <button class="btn btn-secondary" @click="loadFragments">
          🔄 刷新
        </button>
        <button class="btn btn-secondary" @click="handleClose">
          ✕ 关闭
        </button>
      </div>
    </div>

    <div class="manager-content">
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索知识片段..."
          class="search-input"
          @input="handleSearch"
        />
      </div>

      <div class="tag-filter">
        <div class="tag-list">
          <span
            v-for="tag in allTags"
            :key="tag"
            :class="['tag', { active: selectedTags.includes(tag) }]"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <div v-if="isLoading" class="loading">加载中...</div>
      <div v-else-if="filteredFragments.length === 0" class="empty-state">
        <p>暂无知识片段</p>
        <button class="btn btn-primary" @click="showCreateDialog = true">
          创建第一个知识片段
        </button>
      </div>
      <div v-else class="fragment-grid">
        <div
          v-for="fragment in filteredFragments"
          :key="fragment.id"
          class="fragment-card"
          :class="{ active: selectedFragmentId === fragment.id }"
          @click="selectFragment(fragment)"
        >
          <div class="card-header">
            <h3 class="card-title">{{ fragment.title }}</h3>
            <div class="card-actions">
              <button
                class="btn btn-icon-small"
                @click.stop="editFragment(fragment)"
                title="编辑"
              >
                ✎
              </button>
              <button
                class="btn btn-icon-small"
                @click.stop="openDeleteDialog(fragment)"
                title="删除"
              >
                🗑️
              </button>
            </div>
          </div>
          <div class="card-tags">
            <span v-for="tag in fragment.tags" :key="tag" class="tag-small">{{ tag }}</span>
          </div>
          <div class="card-preview" v-html="fragmentPreviewHtml[fragment.id] || '加载中...'"></div>
          <div class="card-footer">
            <span class="card-meta">
              创建于 {{ formatDate(fragment.createdAt) }}
            </span>
            <span class="card-meta">
              引用 {{ fragment.referencedDocuments?.length || 0 }} 次
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建对话框 -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click="showCreateDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>创建知识片段</h3>
          <button class="btn btn-icon" @click="showCreateDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <input
            v-model="newFragmentTitle"
            type="text"
            placeholder="标题"
            class="input"
          />
          <textarea
            v-model="newFragmentContent"
            placeholder="Markdown内容..."
            class="textarea"
            rows="10"
          ></textarea>
          <input
            v-model="newFragmentTags"
            type="text"
            placeholder="标签（用英文逗号,分隔）"
            class="input"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showCreateDialog = false">取消</button>
          <button class="btn btn-primary" @click="handleCreateFragment">创建</button>
        </div>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" @click="showEditDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>编辑知识片段</h3>
          <button class="btn btn-icon" @click="showEditDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <input
            v-model="editingFragmentTitle"
            type="text"
            placeholder="标题"
            class="input"
          />
          <textarea
            v-model="editingFragmentContent"
            placeholder="Markdown内容..."
            class="textarea"
            rows="10"
          ></textarea>
          <input
            v-model="editingFragmentTags"
            type="text"
            placeholder="标签（用英文逗号,分隔）"
            class="input"
          />
          <div v-if="editingFragmentId" class="edit-warning">
            ⚠️ 修改将应用到所有引用该片段的文档
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showEditDialog = false">取消</button>
          <button class="btn btn-primary" @click="handleUpdateFragment">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteDialog" class="dialog-overlay" @click="showDeleteDialog = false">
      <div class="dialog dialog-small" @click.stop>
        <div class="dialog-header">
          <h3>确认删除</h3>
          <button class="btn btn-icon" @click="showDeleteDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <p>
            确定要删除知识片段
            <strong v-if="fragmentToDelete">{{ fragmentToDelete.title || '未命名片段' }}</strong>
            吗？
          </p>
          <p v-if="fragmentToDelete && fragmentToDelete.referencedDocuments?.length > 0" class="warning-text">
            ⚠️ 该片段被 {{ fragmentToDelete.referencedDocuments.length }} 个文档引用，删除后这些引用将失效。
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showDeleteDialog = false">取消</button>
          <button class="btn btn-danger" @click="handleConfirmDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useKnowledgeFragments } from '../composables/useKnowledgeFragments';
import { useDocuments } from '../composables/useDocuments';
import { NodeType } from '../../domain/types/knowledge-fragment.types';
import type { KnowledgeFragmentResponse } from '../../application/dto/knowledge-fragment.dto';

const emit = defineEmits<{
  'close': [];
}>();

const {
  fragments,
  isLoading,
  loadFragments,
  createFragment,
  updateFragment,
  deleteFragment: deleteFragmentAction,
  searchFragments
} = useKnowledgeFragments();

const { renderMarkdown } = useDocuments();

const searchQuery = ref('');
const selectedTags = ref<string[]>([]);
const selectedFragmentId = ref<string | null>(null);
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const newFragmentTitle = ref('');
const newFragmentContent = ref('');
const newFragmentTags = ref('');
const editingFragmentId = ref<string | null>(null);
const editingFragmentTitle = ref('');
const editingFragmentContent = ref('');
const editingFragmentTags = ref('');
const fragmentPreviewHtml = ref<Record<string, string>>({});
const fragmentToDelete = ref<KnowledgeFragmentResponse | null>(null);

const allTags = computed(() => {
  const tags = new Set<string>();
  fragments.value.forEach(f => f.tags.forEach(tag => tags.add(tag)));
  return Array.from(tags).sort();
});

const filteredFragments = computed(() => {
  let filtered = fragments.value;

  if (selectedTags.value.length > 0) {
    filtered = filtered.filter(f =>
      selectedTags.value.every(tag => f.tags.includes(tag))
    );
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(f =>
      f.title.toLowerCase().includes(query) ||
      f.tags.some(tag => tag.toLowerCase().includes(query)) ||
      f.markdown.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    searchFragments(searchQuery.value);
  } else {
    loadFragments();
  }
};

const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag);
  if (index === -1) {
    selectedTags.value.push(tag);
  } else {
    selectedTags.value.splice(index, 1);
  }
};

const selectFragment = (fragment: KnowledgeFragmentResponse) => {
  selectedFragmentId.value = fragment.id;
};

const editFragment = (fragment: KnowledgeFragmentResponse) => {
  editingFragmentId.value = fragment.id;
  editingFragmentTitle.value = fragment.title;
  editingFragmentContent.value = fragment.markdown;
  editingFragmentTags.value = fragment.tags.join(', ');
  showEditDialog.value = true;
};

const openDeleteDialog = (fragment: KnowledgeFragmentResponse) => {
  fragmentToDelete.value = fragment;
  showDeleteDialog.value = true;
};

const handleCreateFragment = async () => {
  if (!newFragmentTitle.value.trim()) {
    alert('请输入标题');
    return;
  }

  try {
    const nodes = parseMarkdownToNodes(newFragmentContent.value);
    const tags = newFragmentTags.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await createFragment({
      title: newFragmentTitle.value,
      nodes,
      tags
    });

    newFragmentTitle.value = '';
    newFragmentContent.value = '';
    newFragmentTags.value = '';
    showCreateDialog.value = false;
    await loadFragments();
  } catch (error) {
    console.error('Error creating fragment:', error);
    alert('创建失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const handleUpdateFragment = async () => {
  if (!editingFragmentId.value) {
    return;
  }

  try {
    const tags = editingFragmentTags.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const nodes = parseMarkdownToNodes(editingFragmentContent.value);

    await updateFragment(editingFragmentId.value, {
      title: editingFragmentTitle.value,
      nodes,
      tags
    });

    editingFragmentId.value = null;
    editingFragmentTitle.value = '';
    editingFragmentContent.value = '';
    editingFragmentTags.value = '';
    showEditDialog.value = false;
    await loadFragments();
  } catch (error) {
    console.error('Error updating fragment:', error);
    alert('更新失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const handleConfirmDelete = async () => {
  if (!fragmentToDelete.value) return;

  const id = fragmentToDelete.value.id;

  try {
    await deleteFragmentAction(id);
    if (selectedFragmentId.value === id) {
      selectedFragmentId.value = null;
    }
    showDeleteDialog.value = false;
    fragmentToDelete.value = null;
    await loadFragments();
  } catch (error) {
    console.error('Error deleting fragment:', error);
    alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const renderFragmentPreview = async (fragment: KnowledgeFragmentResponse) => {
  if (fragmentPreviewHtml.value[fragment.id]) {
    return;
  }

  try {
    const previewMarkdown = fragment.markdown.substring(0, 300);
    const fragmentDocId = `fragment:${fragment.id}`;
    const html = await renderMarkdown(previewMarkdown, fragmentDocId);
    fragmentPreviewHtml.value[fragment.id] = html;
    await nextTick();
  } catch (error) {
    console.error('Error rendering fragment preview:', error);
    fragmentPreviewHtml.value[fragment.id] = '<p>预览加载失败</p>';
  }
};

const parseMarkdownToNodes = (markdown: string): any[] => {
  const nodes: any[] = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: NodeType.HEADING,
        level: headingMatch[1].length,
        text: headingMatch[2]
      });
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.substring(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push({
        type: NodeType.CODE_BLOCK,
        content: codeLines.join('\n'),
        language
      });
      continue;
    }

    if (line.trim()) {
      nodes.push({
        type: NodeType.TEXT,
        content: line,
        marks: []
      });
    }
  }

  return nodes;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return '今天';
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else if (days < 30) {
    return `${Math.floor(days / 7)}周前`;
  } else if (days < 365) {
    return `${Math.floor(days / 30)}个月前`;
  } else {
    return `${Math.floor(days / 365)}年前`;
  }
};

const handleClose = () => {
  emit('close');
};

watch(fragments, async (newFragments) => {
  for (const fragment of newFragments) {
    if (!fragmentPreviewHtml.value[fragment.id]) {
      await renderFragmentPreview(fragment);
    }
  }
}, { deep: true });

onMounted(async () => {
  await loadFragments();
});
</script>

<style scoped>
.fragment-manager {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  z-index: 2000;
}

.manager-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);
}

.manager-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.manager-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.search-bar {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 0.95rem;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.tag-filter {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--text-primary);
}

.tag:hover {
  background: var(--border-primary);
}

.tag.active {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.loading,
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.fragment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.fragment-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.fragment-card:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-md);
}

.fragment-card.active {
  border-color: var(--accent-primary);
  background: var(--bg-active);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tag-small {
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.card-preview {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
  max-height: 80px;
  overflow: hidden;
  margin-bottom: 12px;
}

.card-preview :deep(p) {
  margin: 0.25em 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.dialog-small {
  max-width: 400px;
}

.dialog-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.dialog-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog-footer {
  padding: 16px;
  border-top: 1px solid var(--border-secondary);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.input,
.textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.textarea {
  resize: vertical;
  min-height: 200px;
}

.edit-warning {
  padding: 8px 12px;
  background: var(--bg-warning);
  border-left: 3px solid var(--accent-warning);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.warning-text {
  color: var(--accent-warning);
  font-size: 0.9rem;
  margin: 8px 0 0 0;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-primary);
}

.btn-danger {
  background: var(--accent-danger);
  color: var(--text-inverse);
}

.btn-danger:hover {
  opacity: 0.9;
}

.btn-icon {
  padding: 4px 8px;
  background: transparent;
  font-size: 1.2rem;
  color: var(--text-secondary);
}

.btn-icon:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-icon-small {
  padding: 2px 6px;
  background: transparent;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.btn-icon-small:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
</style>
