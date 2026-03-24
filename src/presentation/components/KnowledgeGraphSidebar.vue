<template>
  <div class="kg-sidebar">
    <div class="kg-sidebar-header">
      <h3>知识图谱列表</h3>
      <button class="refresh-btn" @click="loadGraphs">刷新</button>
    </div>

    <div v-if="loading" class="kg-sidebar-status">加载中...</div>
    <div v-else-if="error" class="kg-sidebar-error">{{ error }}</div>
    <div v-else-if="graphs.length === 0" class="kg-sidebar-empty">
      还没有保存的知识图谱。
      <br />
      可在编辑器中生成图谱后点击「保存为知识图谱」进行保存。
    </div>
    <ul v-else class="kg-list">
      <li
        v-for="g in graphs"
        :key="g.id"
        :class="['kg-item', { active: g.id === activeId }]"
        @click="handleSelect(g)"
      >
        <div class="kg-item-main">
          <div v-if="editingId === g.id" class="kg-title-edit" @click.stop>
            <input
              ref="renameInputRef"
              v-model="editingTitle"
              class="kg-rename-input"
              @blur="submitRename"
              @keydown.enter="submitRename"
              @keydown.esc="cancelRename"
            />
          </div>
          <div v-else class="kg-title-row">
            <span class="kg-title">{{ g.title }}</span>
            <span class="kg-actions">
              <button
                type="button"
                class="kg-btn icon-btn"
                title="重命名"
                @click.stop="startRename(g)"
              >
                ✎
              </button>
              <button
                type="button"
                class="kg-btn icon-btn danger"
                title="删除"
                @click.stop="openDeleteDialog(g)"
              >
                🗑
              </button>
            </span>
          </div>
        </div>
        <div class="kg-meta">
          <span>{{ formatDate(g.createdAt) }}</span>
          <span v-if="g.documentTitle || g.documentId" class="kg-source">
            来源: {{ g.documentTitle || g.documentId }}
          </span>
        </div>
      </li>
    </ul>

    <!-- 删除知识图谱确认弹窗（样式对齐删除文档弹窗） -->
    <div
      v-if="showDeleteDialog && graphToDelete"
      class="modal-overlay"
      @click="handleCancelDelete"
    >
      <div class="modal" @click.stop>
        <h3>确认删除</h3>
        <p>确定要删除知识图谱「{{ graphToDelete.title || '未命名图谱' }}」吗？</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="handleCancelDelete">取消</button>
          <button class="btn btn-danger" @click="handleConfirmDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { FileSystemKnowledgeGraphService, type KnowledgeGraphInfo } from '../../infrastructure/services/knowledge-graph-file.service';

const emit = defineEmits<{
  (e: 'select-graph', info: KnowledgeGraphInfo): void;
  (e: 'deleted', fullPath: string): void;
}>();

const service = new FileSystemKnowledgeGraphService();
const graphs = ref<KnowledgeGraphInfo[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const activeId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const editingTitle = ref('');
const renameInputRef = ref<HTMLInputElement | null>(null);
const showDeleteDialog = ref(false);
const graphToDelete = ref<KnowledgeGraphInfo | null>(null);

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const loadGraphs = async () => {
  loading.value = true;
  error.value = null;
  try {
    graphs.value = await service.listGraphs();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载知识图谱列表失败';
  } finally {
    loading.value = false;
  }
};

const handleSelect = (g: KnowledgeGraphInfo) => {
  if (editingId.value) return;
  activeId.value = g.id;
  emit('select-graph', g);
};

const startRename = (g: KnowledgeGraphInfo) => {
  editingId.value = g.id;
  editingTitle.value = g.title;
  nextTick(() => {
    renameInputRef.value?.focus();
  });
};

const cancelRename = () => {
  editingId.value = null;
  editingTitle.value = '';
};

const submitRename = async () => {
  if (editingId.value == null) return;
  const g = graphs.value.find(x => x.id === editingId.value);
  if (!g || !editingTitle.value.trim()) {
    cancelRename();
    return;
  }
  try {
    await service.updateGraph(g.fullPath, { title: editingTitle.value.trim() });
    await loadGraphs();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '重命名失败';
  }
  cancelRename();
};

const restoreEditorFocus = () => {
  nextTick(() => {
    const editorElement = document.querySelector('.markdown-editor-content') as HTMLElement | null;
    if (editorElement) {
      editorElement.focus();
    }
  });
};

const openDeleteDialog = (g: KnowledgeGraphInfo) => {
  graphToDelete.value = g;
  showDeleteDialog.value = true;
};

const handleCancelDelete = () => {
  showDeleteDialog.value = false;
  graphToDelete.value = null;
  restoreEditorFocus();
};

const handleConfirmDelete = async () => {
  if (!graphToDelete.value) return;
  const g = graphToDelete.value;
  try {
    await service.deleteGraph(g.fullPath);
    if (activeId.value === g.id) {
      activeId.value = null;
      emit('deleted', g.fullPath);
    }
    await loadGraphs();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败';
  } finally {
    showDeleteDialog.value = false;
    graphToDelete.value = null;
    restoreEditorFocus();
  }
};

onMounted(() => {
  loadGraphs();
});
</script>

<style scoped>
.kg-sidebar {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.kg-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.kg-sidebar-header h3 {
  margin: 0;
  font-size: 1rem;
}

.refresh-btn {
  padding: 4px 10px;
  font-size: 0.85rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.kg-sidebar-status,
.kg-sidebar-error,
.kg-sidebar-empty {
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 8px 0;
}

.kg-sidebar-error {
  color: var(--error-color, #c53030);
}

.kg-list {
  list-style: none;
  margin: 0;
  padding: 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.kg-item {
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.kg-item:hover {
  background: var(--bg-hover);
}

.kg-item.active {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.kg-item.active .kg-actions .icon-btn {
  color: inherit;
  opacity: 0.9;
}

.kg-item-main {
  margin-bottom: 2px;
}

.kg-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.kg-title {
  font-size: 0.95rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kg-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.kg-btn {
  padding: 2px 6px;
  font-size: 0.85rem;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  background: transparent;
  color: var(--text-secondary);
}

.kg-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
}

.kg-btn.danger:hover {
  background: rgba(200, 0, 0, 0.15);
  color: var(--error-color, #c53030);
}

.kg-title-edit {
  padding: 0;
}

.kg-rename-input {
  width: 100%;
  padding: 4px 6px;
  font-size: 0.9rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  box-sizing: border-box;
}

.kg-meta {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  display: flex;
  flex-direction: column;
}

.kg-item.active .kg-meta {
  color: rgba(255, 255, 255, 0.85);
}

.kg-source {
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 弹窗样式，参考删除文档/文件夹等模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-primary);
  padding: 24px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: var(--shadow-md);
}

.modal h3 {
  margin: 0 0 16px 0;
  color: var(--text-primary);
}

.modal p {
  margin: 0 0 16px 0;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
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
  background: #e05555;
}
</style>
