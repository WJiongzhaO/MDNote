<template>
  <div class="template-sidebar">
    <div class="sidebar-header">
      <h2>📑 文档模板</h2>
      <div class="header-actions">
        <button class="btn btn-icon" @click="handleCreateTemplate">
          ➕
        </button>
        <button class="btn btn-icon" @click="loadTemplates">
          🔄
        </button>
      </div>
    </div>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索模板..."
        class="search-input"
      />
    </div>

    <div class="template-list template-list-only">
      <div
        v-if="isLoading"
        class="loading"
      >
        加载模板中...
      </div>
      <div
        v-else-if="filteredTemplates.length === 0"
        class="empty-state"
      >
        <p>暂无模板</p>
        <button class="btn btn-primary" @click="handleCreateTemplate">
          创建第一个模板
        </button>
      </div>
      <div
        v-else
        v-for="tpl in filteredTemplates"
        :key="tpl.fullPath"
        class="template-item"
        :class="{ active: activeTemplatePath === tpl.fullPath }"
        @click="handleClickTemplate(tpl)"
      >
        <div class="template-name">{{ tpl.name }}</div>
        <div class="template-path" :title="tpl.fullPath">
          {{ tpl.fileName }}
        </div>
        <button
          class="btn btn-icon-small delete-btn"
          title="删除模板"
          @click.stop="handleDeleteTemplate(tpl)"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- 新建模板：仅输入文件名，真正编辑在主编辑器完成 -->
    <div
      v-if="showCreateDialog"
      class="dialog-overlay"
      @click="showCreateDialog = false"
    >
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>新建模板</h3>
          <button class="btn btn-icon" @click="showCreateDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <input
            v-model="newTemplateName"
            type="text"
            placeholder="模板文件名（如：meeting-note.md）"
            class="input"
            @keyup.enter="confirmCreateTemplate"
          />
          <p class="hint">
            模板保存在全局模板目录中，可在“通过模板创建文档”时复用。
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showCreateDialog = false">
            取消
          </button>
          <button
            class="btn btn-primary"
            :disabled="!newTemplateName.trim()"
            @click="confirmCreateTemplate"
          >
            创建并在编辑器中打开
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { FileSystemTemplateService, type DocumentTemplateInfo } from '../../infrastructure/services/template.service';

const emit = defineEmits<{
  (e: 'open-template', fullPath: string): void;
}>();

const templateService = new FileSystemTemplateService();

const templates = ref<DocumentTemplateInfo[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');
const activeTemplatePath = ref<string | null>(null);
const showCreateDialog = ref(false);
const newTemplateName = ref('');

const filteredTemplates = computed(() => {
  if (!searchQuery.value.trim()) {
    return templates.value;
  }
  const q = searchQuery.value.toLowerCase();
  return templates.value.filter(
    tpl =>
      tpl.name.toLowerCase().includes(q) ||
      tpl.fileName.toLowerCase().includes(q)
  );
});

const loadTemplates = async () => {
  try {
    isLoading.value = true;
    templates.value = await templateService.listTemplates();
    // 如果当前活动模板被删除，自动取消高亮
    if (activeTemplatePath.value) {
      const exists = templates.value.some(tpl => tpl.fullPath === activeTemplatePath.value);
      if (!exists) {
        activeTemplatePath.value = null;
      }
    }
  } catch (error) {
    console.error('加载模板失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 单击模板：直接在编辑器中打开，同时在列表中高亮
const handleClickTemplate = (tpl: DocumentTemplateInfo) => {
  activeTemplatePath.value = tpl.fullPath;
  emit('open-template', tpl.fullPath);
};

const handleCreateTemplate = () => {
  newTemplateName.value = '';
  showCreateDialog.value = true;
};

const confirmCreateTemplate = async () => {
  if (!newTemplateName.value.trim()) return;
  try {
    const info = await templateService.saveTemplate(newTemplateName.value.trim(), '# 新模板\n\n在此编辑模板内容...');
    showCreateDialog.value = false;
    await loadTemplates();
    activeTemplatePath.value = info.fullPath;
    emit('open-template', info.fullPath);
  } catch (error) {
    console.error('创建模板失败:', error);
    alert('创建模板失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const handleDeleteTemplate = async (tpl: DocumentTemplateInfo) => {
  if (!confirm(`确定要删除模板「${tpl.name}」吗？`)) return;
  try {
    await templateService.deleteTemplate(tpl.fullPath);
    await loadTemplates();
  } catch (error) {
    console.error('删除模板失败:', error);
    alert('删除模板失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

onMounted(async () => {
  await loadTemplates();
});
</script>

<style scoped>
.template-sidebar {
  width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-icon {
  padding: 4px 8px;
  background: transparent;
}

.btn-icon:hover {
  background: #e9ecef;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary.btn-small {
  padding: 4px 10px;
  font-size: 0.8rem;
}

.btn-icon-small {
  padding: 2px 6px;
  background: transparent;
  border-radius: 4px;
}

.btn-icon-small:hover {
  background: #f1f3f5;
}

.search-box {
  padding: 10px 12px;
  border-bottom: 1px solid #e9ecef;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.85rem;
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.template-list {
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  padding: 6px;
}

.template-list-only {
  width: 100%;
  border-right: none;
}

.template-item {
  position: relative;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 4px;
  background: white;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
}

.template-item:hover {
  border-color: #007bff33;
  background: #f8f9ff;
}

.template-item.active {
  border-color: #007bff;
  background: #e9f3ff;
}

.template-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.template-path {
  font-size: 0.75rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 20px;
}

.delete-btn {
  position: absolute;
  right: 4px;
  top: 4px;
  font-size: 0.8rem;
}

.template-preview {
  display: none;
}

.loading,
.empty-state {
  padding: 20px 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #666;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  background: white;
  border-radius: 8px;
  min-width: 320px;
  max-width: 420px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-body {
  padding: 12px 16px;
}

.dialog-footer {
  padding: 10px 16px 12px;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.input {
  width: 100%;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  font-size: 0.85rem;
}

.hint {
  margin-top: 8px;
  font-size: 0.8rem;
  color: #666;
}

.placeholder {
  color: #999;
}
</style>

