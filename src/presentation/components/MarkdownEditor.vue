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
      
      <div v-if="document" class="editor-toolbar">
        <button 
          class="toolbar-btn" 
          @click="openMermaidEditor"
          title="编辑Mermaid图表"
        >
          📊 Mermaid编辑器
        </button>
      </div>
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

    <!-- Mermaid编辑器模态框 -->
    <div v-if="showMermaidEditor" class="modal-overlay" @click="closeMermaidEditor" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    ">
      <div class="modal-content" @click.stop style="
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        position: relative;
        border: 2px solid red;
      ">
        <div style="position: absolute; top: 10px; left: 10px; background: yellow; padding: 5px; z-index: 1001;">
          模态框已显示
        </div>
        <MermaidEditor
          :mermaid-code="currentMermaidCode"
          @save="handleMermaidSave"
          @close="closeMermaidEditor"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import MermaidEditor from './MermaidEditor.vue';
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

// Mermaid编辑器相关状态
const showMermaidEditor = ref(false);
const currentMermaidCode = ref('');
const currentSelectionStart = ref(0);
const currentSelectionEnd = ref(0);

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

// Mermaid编辑器相关方法
const openMermaidEditor = () => {
  console.log('=== 打开Mermaid编辑器按钮被点击 ===');
  console.log('document状态:', !!props.document);
  console.log('content值:', content.value ? `长度: ${content.value.length}` : '空');
  
  const textarea = document.querySelector('.markdown-textarea') as HTMLTextAreaElement;
  if (!textarea) {
    console.error('❌ 找不到Markdown文本区域');
    return;
  }
  
  console.log('✅ 找到文本区域');
  
  // 获取当前选择范围
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  console.log('选择范围:', { start, end });
  
  // 尝试提取Mermaid代码块
  const mermaidCode = extractMermaidCode(content.value, start, end);
  console.log('提取的Mermaid代码:', mermaidCode);
  
  currentMermaidCode.value = mermaidCode;
  currentSelectionStart.value = start;
  currentSelectionEnd.value = end;
  showMermaidEditor.value = true;
  
  console.log('✅ Mermaid编辑器状态已设置为显示:', showMermaidEditor.value);
  console.log('currentMermaidCode:', currentMermaidCode.value);
  console.log('=== 结束调试信息 ===');
};

const extractMermaidCode = (content: string, start: number, end: number): string => {
  // 如果用户选择了文本，优先使用选中的文本
  if (start !== end) {
    const selectedText = content.substring(start, end);
    if (selectedText.trim().startsWith('```mermaid')) {
      return selectedText.replace(/^```mermaid\s*\n?/, '').replace(/\n?```$/, '');
    }
    return selectedText;
  }
  
  // 如果没有选择文本，查找光标位置附近的Mermaid代码块
  const lines = content.split('\n');
  let currentLine = 0;
  let charCount = 0;
  
  // 更精确地计算当前行号
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLength = line.length + 1; // +1 for newline
    
    if (charCount <= start && start < charCount + lineLength) {
      currentLine = i;
      break;
    }
    charCount += lineLength;
  }
  
  // 向前查找Mermaid代码块开始
  let mermaidStart = -1;
  for (let i = currentLine; i >= 0; i--) {
    const line = lines[i];
    if (line && line.trim() === '```mermaid') {
      mermaidStart = i;
      break;
    }
  }
  
  // 向后查找Mermaid代码块结束
  if (mermaidStart !== -1) {
    for (let i = mermaidStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.trim() === '```') {
        return lines.slice(mermaidStart + 1, i).join('\n');
      }
    }
  }
  
  // 如果没有找到Mermaid代码块，返回默认的流程图模板
  return `graph TD\n    A[开始] --> B[处理]\n    B --> C[结束]`;
};

const handleMermaidSave = (mermaidCode: string) => {
  if (!content.value) return;
  
  const textarea = document.querySelector('.markdown-textarea') as HTMLTextAreaElement;
  if (!textarea) return;
  
  const start = currentSelectionStart.value;
  const end = currentSelectionEnd.value;
  
  let newContent = content.value;
  
  // 如果之前有选中的Mermaid代码块，替换它
  if (start !== end) {
    const selectedText = content.value.substring(start, end);
    if (selectedText.trim().startsWith('```mermaid')) {
      // 替换整个Mermaid代码块
      const mermaidBlock = `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
      newContent = content.value.substring(0, start) + mermaidBlock + content.value.substring(end);
    } else {
      // 替换选中的文本
      newContent = content.value.substring(0, start) + mermaidCode + content.value.substring(end);
    }
  } else {
    // 如果没有选中文本，在当前位置插入Mermaid代码块
    const mermaidBlock = `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
    newContent = content.value.substring(0, start) + mermaidBlock + content.value.substring(start);
  }
  
  content.value = newContent;
  checkChanges();
  renderContent();
  closeMermaidEditor();
};

const closeMermaidEditor = () => {
  showMermaidEditor.value = false;
  currentMermaidCode.value = '';
  currentSelectionStart.value = 0;
  currentSelectionEnd.value = 0;
};
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

/* Mermaid编辑器相关样式 */
.editor-toolbar {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.toolbar-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.toolbar-btn:hover {
  background: #5a6fd8;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 1200px;
  height: 80%;
  max-height: 800px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
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