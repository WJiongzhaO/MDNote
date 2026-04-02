<template>
  <div class="variable-sidebar">
    <div class="sidebar-header">
      <h2>📝 变量管理</h2>
      <div class="header-actions">
        <button
          class="btn btn-icon"
          @click="refreshVariables"
          title="刷新变量"
        >
          🔄
        </button>
        <button
          class="btn btn-icon"
          @click="showAddDialog = true"
          title="添加变量"
        >
          ➕
        </button>
      </div>
    </div>

    <!-- 变量来源选项卡 -->
    <div class="variable-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="getVariableCount(tab.key) > 0" class="count">
          {{ getVariableCount(tab.key) }}
        </span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <p>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="currentVariables.length === 0" class="empty-state">
      <p>暂无{{ currentTabName }}变量</p>
      <button v-if="activeTab === 'document'" class="btn btn-primary" @click="showAddDialog = true">
        添加第一个变量
      </button>
    </div>

    <!-- 变量列表 -->
    <div v-else class="variable-list">
      <div
        v-for="(value, name) in displayedVariables"
        :key="name"
        class="variable-item"
        @click="selectVariable(name)"
        :class="{ active: selectedVariable === name }"
      >
        <div class="variable-header">
          <span class="variable-name">{{ name }}</span>
          <div class="variable-actions">
            <button
              class="btn btn-icon-small"
              @click.stop="copyVariable(name)"
              title="复制变量名"
            >
              📋
            </button>
            <button
              v-if="activeTab === 'document'"
              class="btn btn-icon-small"
              @click.stop="editVariable(name, value)"
              title="编辑"
            >
              ✏️
            </button>
            <button
              v-if="activeTab === 'document'"
              class="btn btn-icon-small"
              @click.stop="confirmDeleteVariable(name)"
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>
        <div class="variable-value">
          {{ formatValue(value) }}
        </div>
        <div v-if="showOrigin[name]" class="variable-origin">
          来源: {{ getOriginLabel(name) }}
        </div>
      </div>
    </div>

    <!-- 添加/编辑变量对话框 -->
    <div v-if="showAddDialog || editingVariable" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ editingVariable ? '编辑变量' : '添加变量' }}</h3>
          <button class="btn btn-icon" @click="closeDialog">✕</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>变量名</label>
            <input
              v-model="variableForm.name"
              type="text"
              placeholder="例如: author"
              class="input"
              :disabled="!!editingVariable"
            />
            <small class="help-text">变量名只能包含字母、数字和下划线，且必须以字母或下划线开头</small>
          </div>
          <div class="form-group">
            <label>变量值</label>
            <div class="value-type-selector">
              <button
                v-for="type in valueTypes"
                :key="type.value"
                :class="['type-btn', { active: variableForm.type === type.value }]"
                @click="variableForm.type = type.value"
              >
                {{ type.label }}
              </button>
            </div>
            <input
              v-if="variableForm.type === 'string'"
              v-model="variableForm.value"
              type="text"
              placeholder="变量值"
              class="input"
            />
            <input
              v-else-if="variableForm.type === 'number'"
              v-model.number="variableForm.value"
              type="number"
              placeholder="数字"
              class="input"
            />
            <textarea
              v-else-if="variableForm.type === 'text'"
              v-model="variableForm.value"
              placeholder="多行文本"
              class="textarea"
              rows="4"
            ></textarea>
            <div v-else-if="variableForm.type === 'boolean'" class="boolean-toggle">
              <label class="switch">
                <input v-model="variableForm.value" type="checkbox" />
                <span class="slider"></span>
              </label>
              <span>{{ variableForm.value ? 'true' : 'false' }}</span>
            </div>
          </div>
          <div v-if="formError" class="error-message">
            {{ formError }}
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveVariable">
            {{ editingVariable ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="showDeleteConfirm = false">
      <div class="dialog dialog-small">
        <div class="dialog-header">
          <h3>确认删除</h3>
          <button class="btn btn-icon" @click="showDeleteConfirm = false">✕</button>
        </div>
        <div class="dialog-body">
          <p>确定要删除变量 <strong>{{ variableToDelete }}</strong> 吗？</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showDeleteConfirm = false">取消</button>
          <button class="btn btn-danger" @click="deleteVariable">删除</button>
        </div>
      </div>
    </div>

    <!-- 预览对话框 -->
    <div v-if="showPreviewDialog" class="dialog-overlay" @click.self="showPreviewDialog = false">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3>变量预览</h3>
          <button class="btn btn-icon" @click="showPreviewDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>模板</label>
            <textarea
              v-model="previewTemplate"
              placeholder="输入模板，例如: Hello {{name}}!"
              class="textarea"
              rows="4"
            ></textarea>
          </div>
          <div class="form-group">
            <label>预览结果</label>
            <div class="preview-result">{{ previewResult }}</div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showPreviewDialog = false">关闭</button>
          <button class="btn btn-primary" @click="copyPreviewResult">复制结果</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject, type Ref } from 'vue';
import { Application } from '../../core/application';
import type { VariableOriginType } from '../../application/dto/variable.dto';

const emit = defineEmits<{
  'variable-updated': [updatedContent: string];
  'variable-insert': [name: string];
}>();

// 注入依赖
const currentDocumentPath = inject<Ref<string | undefined>>('currentDocumentPath', ref(undefined));
const currentDocumentContent = inject<Ref<string>>('currentDocumentContent', ref(''));

// 应用实例
const application = Application.getInstance();
const variableUseCases = application.getVariableUseCases();

// 状态
const isLoading = ref(false);
const activeTab = ref<VariableOriginType>('document');
const selectedVariable = ref<string | null>(null);
const showAddDialog = ref(false);
const editingVariable = ref<string | null>(null);
const showDeleteConfirm = ref(false);
const variableToDelete = ref<string>('');
const showPreviewDialog = ref(false);
const showOrigin = ref<Record<string, boolean>>({});

// 变量数据
const documentVariables = ref<Record<string, any>>({});
const folderVariables = ref<Record<string, any>>({});
const globalVariables = ref<Record<string, any>>({});
const variableOrigins = ref<Record<string, VariableOriginType>>({});

// 表单
const variableForm = ref({
  name: '',
  value: '',
  type: 'string' as 'string' | 'number' | 'boolean' | 'text'
});
const formError = ref('');

// 预览
const previewTemplate = ref('Hello {{name}}!');
const previewResult = ref('');

// 值类型
const valueTypes = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: '多行文本', value: 'text' }
];

// 选项卡配置
const tabs = [
  { key: 'document' as VariableOriginType, label: '📄 文档' },
  { key: 'folder' as VariableOriginType, label: '📁 文件夹' },
  { key: 'global' as VariableOriginType, label: '🌐 全局' }
];

// 计算属性
const currentTabName = computed(() => {
  const tab = tabs.find(t => t.key === activeTab.value);
  return tab?.label.split(' ')[1] || '';
});

const currentVariables = computed(() => {
  switch (activeTab.value) {
    case 'document':
      return Object.entries(documentVariables.value);
    case 'folder':
      return Object.entries(folderVariables.value);
    case 'global':
      return Object.entries(globalVariables.value);
    default:
      return [];
  }
});

const displayedVariables = computed(() => {
  return Object.fromEntries(currentVariables.value);
});

// 方法
const getVariableCount = (tab: VariableOriginType) => {
  switch (tab) {
    case 'document':
      return Object.keys(documentVariables.value).length;
    case 'folder':
      return Object.keys(folderVariables.value).length;
    case 'global':
      return Object.keys(globalVariables.value).length;
    default:
      return 0;
  }
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getOriginLabel = (name: string): string => {
  const origin = variableOrigins.value[name];
  const labels: Record<VariableOriginType, string> = {
    runtime: '运行时',
    document: '文档',
    folder: '文件夹',
    global: '全局',
    undefined: '未定义'
  };
  return labels[origin] || '未知';
};

const selectVariable = (name: string) => {
  selectedVariable.value = name;
  showOrigin.value[name] = !showOrigin.value[name];
};

const copyVariable = (name: string) => {
  const text = `{{${name}}}`;
  navigator.clipboard.writeText(text);
  emit('variable-insert', name);
};

const refreshVariables = async () => {
  await loadVariables();
};

const loadVariables = async () => {
  isLoading.value = true;
  try {
    // 获取所有变量
    const response = await variableUseCases.getVariables({
      documentPath: currentDocumentPath.value,
      documentContent: currentDocumentContent.value,
      globalVariables: globalVariables.value
    });

    documentVariables.value = response.sources.document;
    folderVariables.value = response.sources.folder;
    globalVariables.value = response.sources.global;

    // 获取变量来源
    for (const name of Object.keys(response.variables)) {
      const originResponse = await variableUseCases.getVariableOrigin({
        variableName: name,
        documentPath: currentDocumentPath.value,
        documentContent: currentDocumentContent.value,
        globalVariables: globalVariables.value
      });
      variableOrigins.value[name] = originResponse.origin;
    }
  } catch (error) {
    console.error('加载变量失败:', error);
  } finally {
    isLoading.value = false;
  }
};

const editVariable = (name: string, value: any) => {
  editingVariable.value = name;
  variableForm.value = {
    name,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    type: getValueType(value)
  };
  showAddDialog.value = true;
};

const getValueType = (value: any): 'string' | 'number' | 'boolean' | 'text' => {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && value.includes('\n')) return 'text';
  return 'string';
};

const confirmDeleteVariable = (name: string) => {
  variableToDelete.value = name;
  showDeleteConfirm.value = true;
};

const deleteVariable = async () => {
  try {
    const response = await variableUseCases.removeDocumentVariable({
      documentContent: currentDocumentContent.value,
      variableName: variableToDelete.value
    });

    if (response.removed) {
      // 关键：更新文档内容
      currentDocumentContent.value = response.updatedContent;

      // 通知父组件更新编辑器内容
      emit('variable-updated', response.updatedContent);

      await loadVariables();
    }
  } catch (error) {
    console.error('删除变量失败:', error);
  } finally {
    showDeleteConfirm.value = false;
  }
};

const saveVariable = async () => {
  formError.value = '';

  // 验证变量名
  if (!variableForm.value.name.trim()) {
    formError.value = '变量名不能为空';
    return;
  }

  if (!variableUseCases.validateVariableName(variableForm.value.name)) {
    formError.value = '变量名格式不正确';
    return;
  }

  // 转换值类型
  let value: any = variableForm.value.value;
  if (variableForm.value.type === 'number') {
    value = Number(value);
  } else if (variableForm.value.type === 'boolean') {
    value = Boolean(value);
  }

  try {
    const response = await variableUseCases.setDocumentVariable({
      documentContent: currentDocumentContent.value,
      variableName: variableForm.value.name,
      variableValue: value
    });

    // 关键：更新文档内容
    currentDocumentContent.value = response.updatedContent;

    // 通知父组件更新编辑器内容
    emit('variable-updated', response.updatedContent);

    // 重新加载变量列表
    await loadVariables();
    closeDialog();
  } catch (error) {
    console.error('保存变量失败:', error);
    formError.value = '保存失败，请重试';
  }
};

const closeDialog = () => {
  showAddDialog.value = false;
  editingVariable.value = null;
  variableForm.value = {
    name: '',
    value: '',
    type: 'string'
  };
  formError.value = '';
};

const copyPreviewResult = () => {
  navigator.clipboard.writeText(previewResult.value);
};

// 监听预览模板变化
watch(previewTemplate, async () => {
  try {
    const response = await variableUseCases.processTemplate({
      template: previewTemplate.value,
      documentPath: currentDocumentPath.value,
      documentContent: currentDocumentContent.value,
      globalVariables: globalVariables.value
    });
    previewResult.value = response.result;
  } catch (error) {
    console.error('预览失败:', error);
    previewResult.value = '预览失败';
  }
});

// 监听文档变化
watch([currentDocumentPath, currentDocumentContent], () => {
  loadVariables();
});

// 组件挂载时加载变量
onMounted(() => {
  loadVariables();
});
</script>

<style scoped>
.variable-sidebar {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-secondary);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.variable-tabs {
  display: flex;
  padding: 8px;
  gap: 4px;
  border-bottom: 1px solid var(--border-secondary);
}

.tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tab:hover {
  background: var(--bg-hover);
}

.tab.active {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.tab .count {
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
}

.loading-state,
.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--text-secondary);
}

.variable-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.variable-item {
  padding: 12px;
  margin-bottom: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.variable-item:hover {
  border-color: var(--accent-primary);
}

.variable-item.active {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.variable-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.variable-name {
  font-weight: 600;
  color: var(--accent-primary);
  font-family: monospace;
}

.variable-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.variable-item:hover .variable-actions {
  opacity: 1;
}

.variable-value {
  color: var(--text-secondary);
  font-size: 14px;
  word-break: break-all;
  font-family: monospace;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.variable-origin {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: var(--bg-overlay) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 9999 !important;
  backdrop-filter: blur(2px);
}

.dialog {
  background: var(--bg-primary) !important;
  border-radius: 12px !important;
  box-shadow: var(--shadow-lg) !important;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  color: var(--text-primary);
  animation: dialogFadeIn 0.2s ease-out;
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-large {
  max-width: 700px;
}

.dialog-small {
  max-width: 400px;
}

.dialog-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 16px 24px !important;
  border-bottom: 1px solid var(--border-secondary) !important;
  background: var(--bg-secondary) !important;
  border-radius: 12px 12px 0 0 !important;
}

.dialog-header h3 {
  margin: 0 !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  color: var(--text-primary) !important;
}

.dialog-body {
  padding: 24px !important;
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

.dialog-footer {
  display: flex !important;
  justify-content: flex-end !important;
  gap: 12px !important;
  padding: 16px 24px !important;
  border-top: 1px solid var(--border-secondary) !important;
  background: var(--bg-secondary) !important;
  border-radius: 0 0 12px 12px !important;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary) !important;
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.value-type-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.type-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-primary) !important;
  background: transparent !important;
  color: var(--text-primary) !important;
  border-radius: 6px !important;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.type-btn:hover {
  border-color: var(--accent-info) !important;
  background: var(--bg-active) !important;
}

.type-btn.active {
  background: var(--accent-info) !important;
  color: var(--text-inverse) !important;
  border-color: var(--accent-info) !important;
}

.input,
.textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: var(--accent-info);
  box-shadow: 0 0 0 2px rgba(51, 154, 240, 0.1);
}

.textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.boolean-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-primary);
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text-inverse);
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accent-primary);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.error-message {
  padding: 8px 12px;
  background: rgba(255, 107, 107, 0.2);
  color: var(--accent-danger);
  border-radius: 6px;
  font-size: 14px;
}

.preview-result {
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 按钮样式 */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-icon {
  padding: 6px;
  background: transparent;
  color: var(--text-primary);
  font-size: 18px;
}

.btn-icon:hover {
  background: rgba(51, 154, 240, 0.1);
}

.btn-icon-small {
  padding: 4px 6px;
  font-size: 12px;
}

.btn-primary {
  background: var(--accent-info) !important;
  color: var(--text-inverse) !important;
  border: none !important;
}

.btn-primary:hover {
  background: #2b8adb !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(51, 154, 240, 0.3);
}

.btn-secondary {
  background: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
  border: none !important;
}

.btn-secondary:hover {
  background: var(--border-primary) !important;
}

.btn-danger {
  background: var(--accent-danger) !important;
  color: var(--text-inverse) !important;
  border: none !important;
}

.btn-danger:hover {
  background: #e05555 !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
}
</style>
