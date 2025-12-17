<template>
  <div class="editor-container">
    <div class="editor-header">
      <input
        v-if="document"
        v-model="title"
        class="title-input"
        placeholder="请输入标题..."
        @blur="updateDocument"
      />
      <div v-else class="title-placeholder">请选择或创建文档</div>
    </div>

    <div class="editor-content" v-if="document">
      <div class="editor-pane">
        <div class="editor-label">Markdown 编辑器</div>
        <textarea
          v-model="content"
          class="markdown-textarea"
          placeholder="开始编写您的 Markdown 文档..."
          @input="handleContentChange"
          @scroll="syncScroll"
        ></textarea>
      </div>

      <div class="preview-pane">
        <div class="editor-label">实时预览</div>
        <div
          class="markdown-preview"
          v-html="renderedContent"
          ref="previewElement"
        ></div>
      </div>
    </div>

    <div v-else class="no-document">
      <div class="no-document-icon">📝</div>
      <div class="no-document-text">选择一个文档开始编辑</div>
      <div class="no-document-subtext">或创建新文档</div>
    </div>

    <div class="save-indicator" :class="{ visible: hasChanges }">
      {{ hasChanges ? '未保存' : '已保存' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { DocumentResponse } from '../../application';

interface Props {
  document: DocumentResponse | null;
  renderMarkdown: (content: string) => Promise<string>;
}

interface Emits {
  (e: 'update-document', id: string, title: string, content: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const title = ref('');
const content = ref('');
const renderedContent = ref('');
const hasChanges = ref(false);
const previewElement = ref<HTMLDivElement>();

let debounceTimer: number | null = null;
let lastSavedTitle = '';
let lastSavedContent = '';

watch(() => props.document, (newDocument) => {
  if (newDocument) {
    title.value = newDocument.title;
    content.value = newDocument.content;
    lastSavedTitle = newDocument.title;
    lastSavedContent = newDocument.content;
    hasChanges.value = false;
    renderContent();
  } else {
    title.value = '';
    content.value = '';
    renderedContent.value = '';
    hasChanges.value = false;
  }
}, { immediate: true });

const handleContentChange = () => {
  checkChanges();
  renderContent();
  debouncedSave();
};

const checkChanges = () => {
  hasChanges.value = title.value !== lastSavedTitle || content.value !== lastSavedContent;
};

const debouncedSave = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    saveDocument();
  }, 1000);
};

const updateDocument = () => {
  checkChanges();
  if (hasChanges.value) {
    saveDocument();
  }
};

const saveDocument = async () => {
  if (!props.document || !hasChanges.value) return;

  try {
    emit('update-document', props.document.id, title.value, content.value);
    lastSavedTitle = title.value;
    lastSavedContent = content.value;
    hasChanges.value = false;
  } catch (error) {
    console.error('Failed to save document:', error);
  }
};

const renderContent = async () => {
  if (content.value.trim()) {
    try {
      renderedContent.value = await props.renderMarkdown(content.value);
      await nextTick();
      adjustPreviewHeight();
    } catch (error) {
      console.error('Failed to render markdown:', error);
      renderedContent.value = '<p>渲染错误</p>';
    }
  } else {
    renderedContent.value = '';
  }
};

const syncScroll = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  const preview = previewElement.value;

  if (preview) {
    const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
    const previewScrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
    preview.scrollTop = previewScrollTop;
  }
};

const adjustPreviewHeight = () => {
  if (previewElement.value) {
    const preview = previewElement.value;
    preview.style.height = 'auto';
    preview.style.height = preview.scrollHeight + 'px';
  }
};

onMounted(() => {
  if (content.value) {
    renderContent();
  }
});
</script>

<style scoped>
.editor-container {
  flex: 1;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
  position: relative;
}

.editor-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.title-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.title-input:focus {
  outline: none;
  border-color: #667eea;
}

.title-placeholder {
  color: #999;
  font-size: 1.2rem;
  font-weight: 600;
}

.editor-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-pane,
.preview-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-pane {
  border-right: 1px solid #e9ecef;
}

.editor-label {
  padding: 12px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-weight: 500;
  color: #555;
}

.markdown-textarea {
  flex: 1;
  padding: 20px;
  border: none;
  outline: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  background: white;
  color: #333;
}

.markdown-preview {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: white;
}

.no-document {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.no-document-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.no-document-text {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.no-document-subtext {
  font-size: 0.9rem;
  color: #999;
}

.save-indicator {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border-radius: 4px;
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.3s;
}

.save-indicator.visible {
  opacity: 1;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  margin-top: 0;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-preview :deep(h1) { font-size: 2em; }
.markdown-preview :deep(h2) { font-size: 1.5em; }
.markdown-preview :deep(h3) { font-size: 1.25em; }

.markdown-preview :deep(p) {
  margin-bottom: 16px;
}

.markdown-preview :deep(code) {
  background: #f6f8fa;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.markdown-preview :deep(pre) {
  background: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  margin-bottom: 16px;
  padding-left: 2em;
}

.markdown-preview :deep(blockquote) {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin-bottom: 16px;
}
</style>