<template>
  <div class="editor-container">
    <div class="editor-header">
      <input
        v-if="document || currentFilePath"
        v-model="title"
        class="title-input"
        placeholder="请输入标题..."
        @blur="updateDocument"
      />
      <div v-else class="title-placeholder">请选择或创建文档</div>
      
      <div v-if="document || currentFilePath" class="editor-toolbar">
        <button
          class="toolbar-btn"
          @click="openMermaidEditor"
          title="编辑Mermaid图表"
        >
          📊 Mermaid编辑器
        </button>
        <!-- 添加公式编辑器按钮 -->
        <button
          class="toolbar-btn"
          @click="openFormulaEditor"
          title="编辑数学公式"
        >
          📐 公式编辑器
        </button>
        <!-- 导出按钮 -->
        <div class="export-menu">
          <button
            class="toolbar-btn"
            @click="showExportMenu = !showExportMenu"
            title="导出文档"
          >
            📤 导出
          </button>
          <div v-if="showExportMenu" class="export-dropdown" @click.stop>
            <div class="export-item" @click="handleExport('word')">
              📄 Word (.docx)
            </div>
            <div class="export-item" @click="handleExport('pdf')">
              📕 PDF (.pdf)
            </div>
            <div class="export-item" @click="handleExport('html')">
              🌐 HTML (.html)
            </div>
            <div class="export-item" @click="handleExport('markdown')">
              📝 Markdown (.md)
            </div>
          </div>
        </div>
      </div>

      <!-- 新增：格式化工具栏 -->
      <EditorToolbar
        v-if="document || currentFilePath"
        :editor="editorElement"
        :content="mainContent"
        @update:content="handleToolbarUpdate"
        @open-mermaid="openMermaidEditor"
        @open-formula="openFormulaEditor"
        @insert-fragment="handleInsertFragment"
      />
    </div>

    <div class="editor-content" v-if="document || currentFilePath">
      <div class="editor-pane">
        <div class="editor-label">Markdown 编辑器</div>
        <div
          class="editor-wrapper"
          :class="{ 'drag-over': isDragging }"
        >
          <div
            contenteditable="true"
            class="markdown-editor-content"
            :data-placeholder="'开始编写您的 Markdown 文档...'"
            @input="handleEditorInput"
          @scroll="syncScroll"
            @paste="handlePaste"
            @focus="handleEditorFocus"
            @blur="handleEditorBlur"
            @mousedown="handleEditorMouseDown"
            @dragover.prevent="handleDragOver"
            @drop="handleEditorDrop"
            @dragenter.prevent="handleEditorDragEnter"
            @dragleave="handleEditorDragLeave"
            @click="handleEditorClick"
            ref="editorElement"
          ></div>
          <div v-if="isDragging" class="drag-overlay">
            <div class="drag-message">📎 释放以插入图片</div>
          </div>
        </div>
      </div>

      <div class="preview-pane">
        <div class="editor-label">实时预览</div>
        <div class="markdown-preview-container">
        <div
          class="markdown-preview"
            :class="{ 'preview-active': activePreviewIndex === 0, 'preview-hidden': activePreviewIndex !== 0 }"
            v-html="previewBuffers[0]"
            ref="previewElement0"
            @scroll="handlePreviewScroll(0)"
          ></div>
          <div
            class="markdown-preview"
            :class="{ 'preview-active': activePreviewIndex === 1, 'preview-hidden': activePreviewIndex !== 1 }"
            v-html="previewBuffers[1]"
            ref="previewElement1"
            @scroll="handlePreviewScroll(1)"
        ></div>
        </div>
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

    <!-- 引用形态切换菜单 -->
    <div
      v-if="referenceContextMenu.visible"
      class="context-menu"
      :style="{ top: referenceContextMenu.y + 'px', left: referenceContextMenu.x + 'px' }"
      @click.stop
      ref="contextMenuElement"
    >
      <div class="context-menu-item" @click="switchReferenceMode('linked')">
        <span class="menu-icon">🔗</span>
        <span>强引用模式（跟随库更新）</span>
      </div>
      <div class="context-menu-item" @click="switchReferenceMode('detached')">
        <span class="menu-icon">🔓</span>
        <span>脱钩模式（可编辑，保留标记）</span>
      </div>
      <div class="context-menu-item" @click="switchReferenceMode('clean')">
        <span class="menu-icon">✂️</span>
        <span>完全断开（移除标记）</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="viewReferenceInfo">
        <span class="menu-icon">ℹ️</span>
        <span>查看引用信息</span>
      </div>
    </div>

    <!-- 引用文档列表对话框 -->
    <div v-if="showReferenceDialog" class="dialog-overlay" @click="showReferenceDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>引用文档列表</h3>
          <button class="btn btn-icon" @click="showReferenceDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <div v-if="referenceDocuments.length === 0" class="empty-state">
            暂无文档引用此片段
          </div>
          <div v-else>
            <div
              v-for="doc in referenceDocuments"
              :key="doc.documentId"
              class="reference-document-item"
              :class="{ connected: doc.isConnected, disconnected: !doc.isConnected }"
              @click="navigateToDocument(doc.documentId)"
            >
              <span class="status-indicator" :class="{ connected: doc.isConnected, disconnected: !doc.isConnected }">
                {{ doc.isConnected ? '🟢' : '🔴' }}
              </span>
              <span class="document-title">{{ doc.documentTitle }}</span>
              <span class="document-status">{{ doc.isConnected ? '(已连接)' : '(已断开)' }}</span>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-primary" @click="showReferenceDialog = false">关闭</button>
        </div>
      </div>
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
      ">
        <MermaidEditor
          :mermaid-code="currentMermaidCode"
          @save="handleMermaidSave"
          @close="closeMermaidEditor"
        />
      </div>
    </div>

    <!-- 公式编辑器模态框 -->
    <div v-if="showFormulaEditor" class="modal-overlay" @click="closeFormulaEditor" style="
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
      ">
        <FormulaEditor
          :latex-code="currentFormulaCode"
          :formula-type="currentFormulaType"
          @save="handleFormulaSave"
          @close="closeFormulaEditor"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import MermaidEditor from './MermaidEditor.vue';
import FormulaEditor from './FormulaEditor.vue';
import EditorToolbar from './editor/toolbar/EditorToolbar.vue';
import type { DocumentResponse } from '../../application';
import { useAssetRenderer } from '../composables/useAssetRenderer';
import { useImageUpload } from '../composables/useImageUpload';
import { Application } from '../../core/application';
import { TYPES } from '../../core/container/container.types';

interface Props {
  document: DocumentResponse | null;
  renderMarkdown: (content: string, documentId?: string, variables?: Record<string, any>) => Promise<string>;
}

interface Emits {
  (e: 'update-document', id: string, title: string, content: string): void;
  (e: 'navigate-to-document', documentId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const title = ref('');
const content = ref(''); // 原始 Markdown 内容（包含 frontmatter 和正文）
const frontmatter = ref(''); // frontmatter 部分
const mainContent = ref(''); // 正文内容（不包含 frontmatter）
const renderedContent = ref(''); // 预览渲染内容
const hasChanges = ref(false);
const isEditorFocused = ref(false); // 编辑器是否获得焦点
const previewElement = ref<HTMLDivElement>();
const previewElement0 = ref<HTMLDivElement>();
const previewElement1 = ref<HTMLDivElement>();
const editorElement = ref<HTMLDivElement>(); // 编辑器元素（contenteditable div）
const currentFilePath = ref<string>(''); // 当前打开的外部文件路径

// 双缓冲预览
const previewBuffers = ref<string[]>(['', '']); // 两个预览缓冲区
const activePreviewIndex = ref(0); // 当前活动的预览索引
const savedScrollPercentage = ref<number>(0); // 保存的滚动百分比
const isRestoringScroll = ref(false); // 标记是否正在恢复滚动位置
const isSyncingScroll = ref(false); // 标记是否正在同步滚动（防止循环触发）
const pendingScrollRestore = ref<{ percentage: number; isAtBottom: boolean; previewIndex: number } | null>(null); // 待恢复的滚动信息

// 资源渲染器
const { useAutoRender, triggerRender } = useAssetRenderer();

// 图片上传
const { handleDroppedImages, insertImageReference } = useImageUpload();
const isDragging = ref(false);

// Mermaid编辑器相关状态
const showMermaidEditor = ref(false);
const currentMermaidCode = ref('');
const currentSelectionStart = ref(0);
const currentSelectionEnd = ref(0);

// 公式编辑器相关状态
const showFormulaEditor = ref(false);
const currentFormulaCode = ref('');
const currentFormulaType = ref<'inline' | 'block'>('inline');

// 导出相关状态
const showExportMenu = ref(false);
const isExporting = ref(false);

/**
 * 分离 frontmatter 和正文内容
 */
const splitContent = (fullContent: string) => {
  const trimmed = fullContent.trimStart();
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
  const match = trimmed.match(frontmatterRegex);

  if (match) {
    return {
      frontmatter: match[0],
      mainContent: trimmed.substring(match[0].length)
    };
  }

  return {
    frontmatter: '',
    mainContent: trimmed
  };
};

/**
 * 合并 frontmatter 和正文内容
 */
const mergeContent = (fm: string, main: string) => {
  if (fm && fm.trim()) {
    return fm + '\n' + main;
  }
  return main;
};

// 引用文档对话框相关状态
const showReferenceDialog = ref(false);
const referenceDocuments = ref<Array<{ documentId: string; documentTitle: string; referencedAt: string; isConnected: boolean }>>([]);
const selectedFragmentId = ref<string | null>(null);

// 引用右键菜单状态
const referenceContextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  fragmentId: string | null;
  startIndex: number;
  endIndex: number;
  currentMode: string;
}>({
  visible: false,
  x: 0,
  y: 0,
  fragmentId: null,
  startIndex: 0,
  endIndex: 0,
  currentMode: 'linked'
});

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
    currentFilePath.value = ''; // 清空外部文件路径
    // 确保内容渲染
    nextTick(async () => {
    renderContent();
      // 更新编辑器内容（始终应用标注）
      const editor = editorElement.value;
      if (editor) {
        await applyEditorAnnotations();
      }
    });
  }
  // 注意：当document为null时，不清空内容，因为可能是外部文件
  // 但如果之前有document，现在变为null，且没有外部文件路径，则清空
  else if (!currentFilePath.value && !content.value) {
    // 只有在既没有document也没有外部文件且内容为空时才清空
    title.value = '';
    content.value = '';
    renderedContent.value = '';
    hasChanges.value = false;
  }
}, { immediate: true });

let renderTimer: number | null = null;
let lastContent = '';

// 处理编辑器输入（从 contenteditable div）
const handleEditorInput = async (event: Event) => {
  const editor = editorElement.value;
  if (!editor) return;

  // 获取纯文本内容（移除所有HTML标签）
  const newMainContent = getTextContent(editor);
  mainContent.value = newMainContent;

  // 更新完整内容（frontmatter + mainContent）
  content.value = mergeContent(frontmatter.value, mainContent.value);

  // 检测引用标志是否被修改
  if (props.document && lastContent) {
    detectAndHandleReferenceModification(lastContent, content.value, props.document.id);
  }
  lastContent = content.value;

  checkChanges();
  // 使用防抖来避免频繁渲染
  if (renderTimer) {
    clearTimeout(renderTimer);
  }
  renderTimer = setTimeout(() => {
  renderContent();
    // 不要在用户输入时重新应用标注，因为这会重新渲染innerHTML导致失去焦点
    // 标注只在编辑器失去焦点时应用
  }, 150);
  debouncedSave();
};

// 获取纯文本内容（移除HTML标签，保留换行）
// 同时将友好显示文本 [知识片段：标题] 还原为原始引用格式 {{ref:id:linked}}
const getTextContent = (element: HTMLElement): string => {
  // 如果元素是文本节点，直接返回
  if (element.nodeType === Node.TEXT_NODE) {
    return element.textContent || '';
  }

  // 递归获取所有文本节点的内容，保留换行
  let text = '';
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node: Node) => {
        // 跳过标注span
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.classList.contains('editor-reference') ||
              el.classList.contains('editor-mermaid') ||
              el.classList.contains('editor-code') ||
              el.classList.contains('editor-formula')) {
            return NodeFilter.FILTER_ACCEPT; // 接受但只处理其文本子节点
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node: Node | null;
  let lastNode: Node | null = null;
  while ((node = walker.nextNode()) !== null) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 如果是引用标注span，需要还原为原始引用格式
      const el = node as HTMLElement;
      if (el.classList.contains('editor-reference')) {
        const fragmentId = el.getAttribute('data-fragment-id');
        const mode = el.getAttribute('data-mode') || 'linked';
        if (fragmentId && !fragmentId.startsWith('placeholder:')) {
          // 还原为原始引用格式
          text += `{{ref:${fragmentId}:${mode}}}`;
          continue; // 跳过文本内容，因为我们已经添加了引用格式
        }
      }
      // 如果是块级元素，添加换行
      if (lastNode && (el.tagName === 'DIV' || el.tagName === 'P' || el.tagName === 'BR')) {
        text += '\n';
      }
    }
    lastNode = node;
  }

  // 如果没有获取到内容，使用textContent作为后备
  if (!text && element.textContent) {
    text = element.textContent;
  }

  return text;
};

// 处理编辑器获得焦点
const handleEditorFocus = () => {
  // 不立即切换为纯文本，保持标注显示
  // 只有在用户真正输入时才处理
  isEditorFocused.value = true;
};

// 处理编辑器鼠标按下事件（在失去焦点之前保存光标位置）
const handleEditorMouseDown = () => {
  const editor = editorElement.value;
  if (!editor) return;
  
  // 如果编辑器有焦点，保存当前光标位置
  if (isEditorFocused.value || document.activeElement === editor) {
    const { start, end } = getCursorPosition(editor);
    currentSelectionStart.value = start;
    currentSelectionEnd.value = end;
  }
};

// 处理编辑器失去焦点
const handleEditorBlur = async () => {
  // 先保存当前内容
  const editor = editorElement.value;
  if (editor) {
    const currentText = editor.textContent || '';
    if (currentText !== content.value) {
      content.value = currentText;
    }
    
    // 在失去焦点之前保存光标位置
    const { start, end } = getCursorPosition(editor);
    currentSelectionStart.value = start;
    currentSelectionEnd.value = end;
  }

  isEditorFocused.value = false;
  // 应用标注
  await applyEditorAnnotations();
};

// 处理粘贴事件
const handlePaste = async (event: ClipboardEvent) => {
  event.preventDefault();
  const text = event.clipboardData?.getData('text/plain') || '';
  const editor = editorElement.value;
  if (!editor) return;

  // 插入纯文本
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // 触发输入事件
  handleEditorInput(event);
};

// 应用编辑器标注（高亮引用标志、代码块等）
const applyEditorAnnotations = async () => {
  const editor = editorElement.value;
  if (!editor || !mainContent.value) {
    if (editor && !mainContent.value) {
      editor.textContent = '';
    }
    return;
  }

  console.log('[标注] 开始应用编辑器标注，内容长度:', mainContent.value.length);

  try {
    // 保存当前光标位置
    const selection = window.getSelection();
    let cursorPosition = 0;
    if (selection && selection.rangeCount > 0 && selection.anchorNode) {
      const range = selection.getRangeAt(0);
      // 计算光标在整个编辑器中的位置
      const preRange = document.createRange();
      preRange.selectNodeContents(editor);
      preRange.setEnd(range.startContainer, range.startOffset);
      cursorPosition = preRange.toString().length;
    }

    // 解析引用标志（基于正文内容）
    const { FragmentReferenceParser } = await import('../../domain/services/fragment-reference-parser.service');
    const parser = new FragmentReferenceParser();
    const references = parser.parseReferences(mainContent.value);
    console.log('[标注] 解析到引用数量:', references.length, references);

    // 解析代码块（包括mermaid）
    const codeBlocks: Array<{ start: number; end: number; type: 'mermaid' | 'code' | 'formula' }> = [];
    const mermaidRegex = /```mermaid[\s\S]*?```/g;
    const codeRegex = /```[\s\S]*?```/g;
    const formulaRegex = /\$\$[\s\S]*?\$\$/g;

    let match: RegExpExecArray | null;
    while ((match = mermaidRegex.exec(mainContent.value)) !== null) {
      codeBlocks.push({ start: match.index, end: match.index + match[0].length, type: 'mermaid' });
    }
    while ((match = codeRegex.exec(mainContent.value)) !== null) {
      // 跳过已经匹配的mermaid块
      if (!codeBlocks.some(cb => cb.start === match!.index)) {
        codeBlocks.push({ start: match.index, end: match.index + match[0].length, type: 'code' });
      }
    }
    while ((match = formulaRegex.exec(mainContent.value)) !== null) {
      codeBlocks.push({ start: match.index, end: match.index + match[0].length, type: 'formula' });
    }

    // 获取引用元数据
    let docId: string | undefined;
    if (props.document) {
      docId = props.document.id;
    } else if (currentFilePath.value) {
      docId = currentFilePath.value;
    }
    const referenceMetadata = await getReferenceMetadata(docId);

    // 获取知识片段标题以提高可读性
    const fragmentTitles = new Map<string, string>();
    if (references.length > 0) {
      try {
        const { Application } = await import('../../core/application');
        const app = Application.getInstance();
        await app.getApplicationService().initialize();
        const fragmentUseCases = app.getKnowledgeFragmentUseCases();

        // 批量获取片段标题
        for (const ref of references) {
          try {
            const fragment = await fragmentUseCases.getFragment(ref.fragmentId);
            if (fragment && fragment.title) {
              fragmentTitles.set(ref.fragmentId, fragment.title);
            }
          } catch (error) {
            // 忽略单个片段获取失败
            console.warn(`无法获取片段 ${ref.fragmentId} 的标题:`, error);
          }
        }
      } catch (error) {
        console.warn('获取知识片段标题失败:', error);
      }
    }

    // 合并所有需要标注的区域
    const annotations: Array<{
      start: number;
      end: number;
      type: 'reference' | 'mermaid' | 'code' | 'formula';
      fragmentId?: string;
      mode?: string;
      isConnected?: boolean;
      title?: string;
    }> = [];

    references.forEach(ref => {
      if (ref) {
        const meta = referenceMetadata.find(m => m.fragmentId === ref.fragmentId);
          // 获取mode，兼容旧代码
          const mode = (ref as any).mode || (ref.isConnected ? 'linked' : 'detached');
          const annotation = {
            start: ref.startIndex,
            end: ref.endIndex,
            type: 'reference' as const,
            fragmentId: ref.fragmentId,
            mode: mode,
            isConnected: meta?.isConnected !== false,
            title: (ref as any).title
          };
          annotations.push(annotation);
          console.log('[标注] 添加引用标注:', {
            fragmentId: ref.fragmentId,
            mode: mode,
            start: ref.startIndex,
            end: ref.endIndex,
            text: mainContent.value.substring(ref.startIndex, ref.endIndex)
          });
      }
    });

    codeBlocks.forEach(cb => {
      annotations.push({
        start: cb.start,
        end: cb.end,
        type: cb.type
      });
    });

    // 按位置排序
    annotations.sort((a, b) => a.start - b.start);

    // 构建带标注的HTML
    let annotatedHtml = '';
    let lastIndex = 0;

    annotations.forEach(ann => {
      // 添加标注前的文本
      if (ann.start > lastIndex) {
        const text = mainContent.value.substring(lastIndex, ann.start);
        annotatedHtml += escapeHtml(text);
      }

      // 添加标注
      const text = mainContent.value.substring(ann.start, ann.end);
      let className = '';
      let title = '';

      // 为引用添加额外的数据属性，用于形态切换
      const dataAttrs = ann.type === 'reference'
        ? `data-fragment-id="${ann.fragmentId || ''}" data-mode="${ann.mode || 'linked'}"`
        : '';
      // 为引用添加内联样式以确保背景色显示（解决scoped样式问题）
      let inlineStyle = '';
      if (ann.type === 'reference') {
        if (ann.mode === 'linked') {
          inlineStyle = `style="background-color: rgba(102, 126, 234, 0.4) !important; border: 1px solid #667eea !important; color: #4c51bf !important; padding: 2px 4px !important; border-radius: 3px !important; display: inline-block !important; font-weight: 500 !important; cursor: pointer !important;"`;
        } else if (ann.mode === 'detached') {
          inlineStyle = `style="background-color: rgba(255, 193, 7, 0.3) !important; border: 1px solid #ffc107 !important; color: #856404 !important; padding: 2px 4px !important; border-radius: 3px !important; display: inline-block !important; font-weight: 500 !important; cursor: pointer !important;"`;
        }
      }

      if (ann.type === 'reference') {
        // 根据形态设置不同的样式
        const mode = ann.mode || 'linked';
        // 获取片段标题
        const fragmentTitle = fragmentTitles.get(ann.fragmentId || '') || ann.title;
        const displayText = fragmentTitle ? `[知识片段：${fragmentTitle}]` : text;

        if (mode === 'linked') {
          className = 'editor-reference linked';
          title = fragmentTitle ? `知识片段：${fragmentTitle}` : `知识片段引用: ${ann.fragmentId}`;
        } else if (mode === 'detached') {
          className = 'editor-reference detached';
          title = fragmentTitle ? `知识片段（已脱钩）：${fragmentTitle}` : `知识片段（已脱钩）: ${ann.fragmentId}`;
        } else {
          className = ann.isConnected ? 'editor-reference connected' : 'editor-reference disconnected';
          title = fragmentTitle ? `知识片段：${fragmentTitle}` : `知识片段引用: ${ann.fragmentId}`;
        }

        // 如果有标题，使用友好显示文本
        if (fragmentTitle && mode === 'linked') {
          // 对于linked模式，显示友好文本而不是原始引用标志
          const spanHtml = `<span class="${className}" title="${title}" data-start="${ann.start}" data-end="${ann.end}" ${dataAttrs} ${inlineStyle}>${escapeHtml(displayText)}</span>`;
          annotatedHtml += spanHtml;
          lastIndex = ann.end;
          return; // 跳过后续处理
        }
      } else if (ann.type === 'mermaid') {
        className = 'editor-mermaid';
        title = 'Mermaid图表';
      } else if (ann.type === 'formula') {
        className = 'editor-formula';
        title = '数学公式';
      } else {
        className = 'editor-code';
        title = '代码块';
      }

      const spanHtml = `<span class="${className}" title="${title}" data-start="${ann.start}" data-end="${ann.end}" ${dataAttrs} ${inlineStyle}>${escapeHtml(text)}</span>`;
      annotatedHtml += spanHtml;

      if (ann.type === 'reference') {
        console.log('[标注] 生成引用HTML:', {
          className,
          text: text.substring(0, 30),
          html: spanHtml.substring(0, 100)
        });
      }

      lastIndex = ann.end;
    });

    // 添加剩余的文本
    if (lastIndex < mainContent.value.length) {
      annotatedHtml += escapeHtml(mainContent.value.substring(lastIndex));
    }

    // 更新编辑器内容
    if (annotatedHtml) {
      editor.innerHTML = annotatedHtml;
      console.log('[标注] 已更新编辑器HTML，长度:', annotatedHtml.length);

      // 检查生成的HTML中是否有引用标注
      await nextTick();
      const refSpans = editor.querySelectorAll('.editor-reference.linked');
      console.log('[标注] 生成的HTML中找到的linked引用span数量:', refSpans.length);
      if (refSpans.length > 0 && refSpans[0]) {
        const firstSpan = refSpans[0] as HTMLElement;
        const computedStyle = window.getComputedStyle(firstSpan);
        console.log('[标注] 第一个引用span样式检查:', {
          className: firstSpan.className,
          backgroundColor: computedStyle.backgroundColor,
          borderColor: computedStyle.borderColor,
          display: computedStyle.display
        });
      }
    } else {
      // 即使没有标注，也使用innerHTML以确保格式正确
      editor.innerHTML = escapeHtml(mainContent.value).replace(/\n/g, '<br>');
      console.log('[标注] 没有标注，使用纯文本HTML');
    }

    // 恢复光标位置（仅当编辑器仍然有焦点时）
    await nextTick();
    if (cursorPosition > 0 && editor.textContent && document.activeElement === editor) {
      try {
        const range = document.createRange();
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
        let currentPos = 0;
        let targetNode: Node | null = null;
        let targetOffset = 0;

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const nodeLength = node.textContent?.length || 0;
          if (currentPos + nodeLength >= cursorPosition) {
            targetNode = node;
            targetOffset = cursorPosition - currentPos;
            break;
          }
          currentPos += nodeLength;
        }

        if (targetNode) {
          range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } catch (e) {
        // 忽略光标恢复错误
      }
    }
  } catch (error) {
    console.error('Error applying editor annotations:', error);
    // 出错时显示纯文本（转义HTML）
    editor.innerHTML = escapeHtml(mainContent.value).replace(/\n/g, '<br>');
  }
};

// HTML转义
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// handleContentChange已移除，逻辑合并到handleEditorInput中

// 检测引用标志是否被修改
const detectAndHandleReferenceModification = async (
  oldContent: string,
  newContent: string,
  documentId: string
) => {
  try {
    const { FragmentReferenceParser } = await import('../../domain/services/fragment-reference-parser.service');
    const parser = new FragmentReferenceParser();

    const oldReferences = parser.parseReferences(oldContent);
    const newReferences = parser.parseReferences(newContent);

    // 找出被修改或删除的引用
    for (const oldRef of oldReferences) {
      const newRef = newReferences.find(
        r => r.fragmentId === oldRef.fragmentId &&
             r.startIndex === oldRef.startIndex
      );

      if (!newRef) {
        // 引用被删除，取消注册
        const { Application } = await import('../../core/application');
        const app = Application.getInstance();
        const appService = app.getApplicationService();
        await appService.initialize();

        const container = (appService as any).container;
        if (container) {
          const registrationService = container.get(TYPES.FragmentReferenceRegistrationService);
          if (registrationService) {
            await registrationService.unregisterReference(documentId, oldRef.fragmentId);
          }
        }
      } else if (newRef.match !== oldRef.match) {
        // 引用标志被修改（不再是原来的格式），断开连接
        const { Application } = await import('../../core/application');
        const app = Application.getInstance();
        const appService = app.getApplicationService();
        await appService.initialize();

        const container = (appService as any).container;
        if (container) {
          const registrationService = container.get(TYPES.FragmentReferenceRegistrationService);
          if (registrationService && newRef.isConnected) {
            // 更新为断开状态
            const disconnectedTag = `{{ref:${newRef.fragmentId}:disconnected}}`;
            const before = newContent.substring(0, newRef.startIndex);
            const after = newContent.substring(newRef.endIndex);
            content.value = before + disconnectedTag + after;

            await registrationService.disconnectReference(
              documentId,
              newRef.fragmentId,
              newContent.substring(newRef.startIndex, newRef.endIndex)
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error detecting reference modification:', error);
  }
};

const checkChanges = () => {
  hasChanges.value = title.value !== lastSavedTitle || content.value !== lastSavedContent;
};

// 处理工具栏内容更新
const handleToolbarUpdate = (newContent: string) => {
  console.log('[工具栏] 内容更新:', {
    oldLength: mainContent.value.length,
    newLength: newContent.length
  });

  // 更新主内容
  mainContent.value = newContent;

  // 合并 frontmatter 和主内容
  content.value = mergeContent(frontmatter.value, mainContent.value);

  // 更新编辑器显示
  nextTick(() => {
    const editor = editorElement.value;
    if (editor) {
      editor.textContent = mainContent.value;
    }
  });

  // 渲染预览
  renderContent();

  // 检查更改并保存
  checkChanges();
  debouncedSave();
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
  if (!hasChanges.value) return;

  // 如果有外部文件路径，保存到文件系统
  if (currentFilePath.value) {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.file && electronAPI.file.writeFileContent) {
        // 获取缓存中的引用信息
        let contentToSave = content.value;
        const cache = await electronAPI.file.getFileCache?.(currentFilePath.value);

        if (cache && cache.references && cache.references.length > 0) {
          // 从后往前替换，避免索引偏移
          for (let i = cache.references.length - 1; i >= 0; i--) {
            const ref = cache.references[i];
            const refTag = `{{ref:${ref.fragmentId}}}`;
            const startIndex = ref.position;
            const endIndex = startIndex + ref.length;

            // 检查内容中是否还有这个引用标志
            if (contentToSave.substring(startIndex, endIndex) === refTag) {
              // 替换为片段内容
              contentToSave = contentToSave.substring(0, startIndex) +
                             ref.content +
                             contentToSave.substring(endIndex);
            }
          }
        }

        await electronAPI.file.writeFileContent(currentFilePath.value, contentToSave);
        lastSavedTitle = title.value;
        lastSavedContent = content.value; // 保存编辑器中的内容（带引用标志）
        hasChanges.value = false;
        return;
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      return;
    }
  }

  // 如果有document，保存到数据库
  if (props.document) {
  try {
    emit('update-document', props.document.id, title.value, content.value);
    lastSavedTitle = title.value;
    lastSavedContent = content.value;
    hasChanges.value = false;
  } catch (error) {
    console.error('Failed to save document:', error);
  }
  }
};


// 获取引用元数据
const getReferenceMetadata = async (docId?: string): Promise<Array<{ fragmentId: string; isConnected: boolean }>> => {
  const metadata: Array<{ fragmentId: string; isConnected: boolean }> = [];

  if (currentFilePath.value) {
    // 外部文件：从缓存获取
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.file && electronAPI.file.getFileCache) {
        const cache = await electronAPI.file.getFileCache(currentFilePath.value);
        if (cache && cache.references) {
          cache.references.forEach((ref: any) => {
            metadata.push({
              fragmentId: ref.fragmentId,
              isConnected: ref.isConnected !== false
            });
          });
        }
      }
    } catch (error) {
      console.error('Error getting file cache:', error);
    }
  } else if (props.document) {
    // 数据库文档：从文档实体获取
    try {
      const { Application } = await import('../../core/application');
      const app = Application.getInstance();
      await app.getApplicationService().initialize();

      // 通过容器获取文档仓储，直接访问文档实体
      const { InversifyContainer } = await import('../../core/container/inversify.container');
      const container = InversifyContainer.getInstance();

      if (container && typeof container.isBound === 'function' && container.isBound(TYPES.DocumentRepository)) {
        const documentRepository = container.get<any>(TYPES.DocumentRepository);
        const document = await documentRepository.findById({ value: props.document.id });

        if (document) {
          const references = document.getFragmentReferences();
          references.forEach((ref: { fragmentId: string; isConnected: boolean }) => {
            metadata.push({
              fragmentId: ref.fragmentId,
              isConnected: ref.isConnected !== false
            });
          });
        }
      }
    } catch (error) {
      console.error('Error getting document references:', error);
    }
  }

  return metadata;
};

// 渲染预览内容
const renderContent = async () => {
  // 只要有内容就渲染，即使是空字符串也要渲染（可能是新文件）
  if (mainContent.value !== undefined && mainContent.value !== null) {
    try {
      // 传递documentId以处理图片路径（如果有document）
      // 对于外部文件，传递文件路径（不带file:前缀，因为renderMarkdown会处理）
      let docId: string | undefined;
      let docPath: string | undefined;
      if (props.document) {
        docId = props.document.id;
        docPath = props.document.id; // 数据库文档使用ID作为路径
      } else if (currentFilePath.value) {
        // 对于外部文件，直接使用文件路径
        docId = currentFilePath.value;
        docPath = currentFilePath.value;
  }

      // 获取合并后的变量（document + folder + global）
      let variables: Record<string, any> = {};
      try {
        const application = Application.getInstance();
        const variableUseCases = application.getVariableUseCases();

        // 获取完整内容（包含frontmatter）
        const fullContent = content.value || '';

        const result = await variableUseCases.getVariables({
          documentPath: docPath,
          documentContent: fullContent
        });

        variables = result.variables;
        console.log('[renderContent] Variables for replacement:', variables);
      } catch (error) {
        console.warn('Failed to get variables:', error);
        // 如果获取变量失败，使用空对象
        variables = {};
      }

      // 在渲染前直接在文本层面替换变量
      let processedContent = mainContent.value;

      // 匹配 {{variableName}} 格式
      const variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

      processedContent = processedContent.replace(variablePattern, (match, varName) => {
        if (variables.hasOwnProperty(varName)) {
          const value = variables[varName];
          console.log(`[renderContent] Replacing {{${varName}}} with ${value}`);
          return String(value);
        }
        console.log(`[renderContent] Variable ${varName} not found, keeping ${match}`);
        return match; // 变量不存在，保持原样
      });

      console.log('[renderContent] Content before markdown:', processedContent.substring(0, 100));

      // 渲染已替换变量的内容（不传递变量给 markdown 处理器）
      const newRenderedContent = await props.renderMarkdown(processedContent, docId);
      
      // 获取编辑器的滚动百分比位置（这是我们要同步到预览的基准）
      const editor = editorElement.value;
      let editorScrollPercentage = 0;
      let isEditorAtBottom = false;
      
      if (editor) {
        const editorScrollHeight = editor.scrollHeight - editor.clientHeight;
        if (editorScrollHeight > 0) {
          const distanceFromBottom = editorScrollHeight - editor.scrollTop;
          // 如果编辑器接近底部（距离底部小于10px），认为在底部
          if (distanceFromBottom <= 10) {
            isEditorAtBottom = true;
            editorScrollPercentage = 1;
          } else {
            editorScrollPercentage = editor.scrollTop / editorScrollHeight;
            // 限制在 0-1 之间
            editorScrollPercentage = Math.max(0, Math.min(1, editorScrollPercentage));
          }
        } else {
          // 如果编辑器没有滚动空间，默认在顶部
          editorScrollPercentage = 0;
        }
      }
      
      // 保存编辑器滚动百分比，用于设置预览滚动位置
      savedScrollPercentage.value = editorScrollPercentage;
      const currentPreviewIndex = activePreviewIndex.value;
      
      // 使用双缓冲技术平滑更新预览
      const nextBufferIndex = currentPreviewIndex === 0 ? 1 : 0;
      const nextPreviewElement = nextBufferIndex === 0 ? previewElement0 : previewElement1;
      
      // 保存滚动恢复信息，用于在 previewBuffers 更新后恢复滚动位置
      pendingScrollRestore.value = {
        percentage: editorScrollPercentage,
        isAtBottom: isEditorAtBottom,
        previewIndex: nextBufferIndex
      };
      
      // 更新非活动缓冲区（这会触发 v-html 更新，watch 会处理滚动恢复）
      previewBuffers.value[nextBufferIndex] = newRenderedContent;
      
      await nextTick();
      
      // 渲染所有资源占位符（Mermaid图表等）到非活动缓冲区
      if (nextPreviewElement.value) {
        await triggerRender(nextPreviewElement);
      }
      
      // 等待DOM完全更新（包括triggerRender中的异步操作）
      await nextTick();
      
      // 确保新内容已经渲染完成后再切换
      // 使用双重 requestAnimationFrame 确保浏览器已经完成渲染和布局
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 在切换前，先在新预览元素上设置滚动位置（此时元素还不可见，但内容已加载）
          if (nextPreviewElement.value) {
            const previewScrollHeight = nextPreviewElement.value.scrollHeight - nextPreviewElement.value.clientHeight;
            if (previewScrollHeight > 0) {
              const targetScrollTop = isEditorAtBottom ? previewScrollHeight : (editorScrollPercentage * previewScrollHeight);
              nextPreviewElement.value.scrollTop = targetScrollTop;
            }
          }
          
          // 切换活动缓冲区索引（这会触发CSS类变化，实现平滑过渡）
          activePreviewIndex.value = nextBufferIndex;
          renderedContent.value = newRenderedContent;
          
          // 更新 previewElement 引用以保持兼容性
          previewElement.value = nextPreviewElement.value || null;
          
          // 切换后立即再次设置滚动位置（确保在元素变为可见后滚动位置正确）
          nextTick(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (nextPreviewElement.value) {
                  const previewScrollHeight = nextPreviewElement.value.scrollHeight - nextPreviewElement.value.clientHeight;
                  if (previewScrollHeight > 0) {
                    const targetScrollTop = isEditorAtBottom ? previewScrollHeight : (editorScrollPercentage * previewScrollHeight);
                    nextPreviewElement.value.scrollTop = targetScrollTop;
                  }
                }
              });
            });
          });
        });
      });
    } catch (error) {
      console.error('Failed to render markdown:', error);
      const errorContent = '<p>渲染错误</p>';
      renderedContent.value = errorContent;
      // 更新当前活动的缓冲区
      previewBuffers.value[activePreviewIndex.value] = errorContent;
    }
  } else {
    renderedContent.value = '';
    // 清空当前活动的缓冲区
    previewBuffers.value[activePreviewIndex.value] = '';
  }
};


// 同步编辑器滚动到预览（基于滚动百分比）
const syncScroll = (event: Event) => {
  // 如果正在恢复滚动位置，不进行同步（避免干扰）
  if (isRestoringScroll.value || isSyncingScroll.value) {
    return;
  }
  
  const editor = event.target as HTMLElement;
  const activePreview = activePreviewIndex.value === 0 ? previewElement0.value : previewElement1.value;

  if (!activePreview || !editor) {
    return;
  }
  
  const editorScrollHeight = editor.scrollHeight - editor.clientHeight;
  const previewScrollHeight = activePreview.scrollHeight - activePreview.clientHeight;
  
  // 处理边界情况：如果编辑器或预览没有滚动空间，则不进行同步
  if (editorScrollHeight <= 0 || previewScrollHeight <= 0) {
    return;
  }
  
  // 计算编辑器的滚动百分比
  const scrollPercentage = editor.scrollTop / editorScrollHeight;
  
  // 保存滚动百分比
  savedScrollPercentage.value = scrollPercentage;
  
  // 计算预览应该滚动到的位置
  const previewScrollTop = scrollPercentage * previewScrollHeight;
  
  // 设置预览滚动位置（使用标志位防止循环触发）
  isSyncingScroll.value = true;
  activePreview.scrollTop = previewScrollTop;
  // 使用 requestAnimationFrame 确保标志位在下一帧重置
  requestAnimationFrame(() => {
    isSyncingScroll.value = false;
  });
};

// 处理预览滚动事件（用户手动滚动预览时，可选：同步到编辑器）
const handlePreviewScroll = (previewIndex: number) => {
  // 如果正在恢复滚动位置或正在同步，不处理（避免干扰）
  if (isRestoringScroll.value || isSyncingScroll.value) {
    return;
  }
  
  // 只处理当前活动预览元素的滚动
  if (previewIndex === activePreviewIndex.value) {
    const preview = previewIndex === 0 ? previewElement0.value : previewElement1.value;
  if (preview) {
      const scrollHeight = preview.scrollHeight - preview.clientHeight;
      if (scrollHeight > 0) {
        // 保存预览的滚动百分比（但不反向同步到编辑器，因为编辑器是主导）
        savedScrollPercentage.value = preview.scrollTop / scrollHeight;
      }
    }
  }
};


// 恢复预览滚动位置（参考 VSCode 的简单实现）
const restorePreviewScrollPosition = (scrollPercentage: number, previewIndex: number) => {
  const preview = previewIndex === 0 ? previewElement0.value : previewElement1.value;
  if (!preview || scrollPercentage < 0) return;
  
  isRestoringScroll.value = true;
  
  const setScroll = () => {
    const scrollHeight = preview.scrollHeight - preview.clientHeight;
    if (scrollHeight > 0) {
      const targetScrollTop = scrollPercentage * scrollHeight;
      preview.scrollTop = targetScrollTop;
      return true;
    }
    return false;
  };
  
  // 使用 requestAnimationFrame 确保 DOM 已渲染
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!setScroll()) {
        // 如果失败，再试一次（可能是内容还在加载）
        setTimeout(() => {
          setScroll();
          isRestoringScroll.value = false;
        }, 50);
      } else {
        isRestoringScroll.value = false;
      }
    });
  });
};


// 恢复预览滚动位置的辅助函数（带底部检测）
const restorePreviewScrollPositionHelper = (scrollPercentage: number, previewIndex: number, isAtBottom: boolean = false): boolean => {
  const preview = previewIndex === 0 ? previewElement0.value : previewElement1.value;
  if (!preview || scrollPercentage < 0) return false;
  
  const scrollHeight = preview.scrollHeight - preview.clientHeight;
  if (scrollHeight > 0) {
    const targetScrollTop = isAtBottom ? scrollHeight : (scrollPercentage * scrollHeight);
    preview.scrollTop = targetScrollTop;
    return true;
  }
  return false;
};

// 尝试恢复预览滚动位置（带重试机制）
const tryRestorePreviewScroll = (scrollPercentage: number, previewIndex: number, isAtBottom: boolean = false, maxAttempts: number = 10) => {
  if (isRestoringScroll.value) return;
  
  isRestoringScroll.value = true;
  let attempts = 0;
  
  const attempt = () => {
    attempts++;
    if (restorePreviewScrollPositionHelper(scrollPercentage, previewIndex, isAtBottom)) {
      isRestoringScroll.value = false;
      return;
    }
    
    if (attempts < maxAttempts) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          attempt();
        });
      });
    } else {
      isRestoringScroll.value = false;
    }
  };
  
  attempt();
};

// 监听 previewBuffers 变化，在 v-html 更新后立即恢复滚动位置
watch(() => previewBuffers.value[activePreviewIndex.value], async (newContent, oldContent) => {
  // 只在内容真正变化时恢复滚动位置
  if (newContent !== oldContent && newContent && pendingScrollRestore.value) {
    const { percentage, isAtBottom, previewIndex } = pendingScrollRestore.value;
    if (previewIndex === activePreviewIndex.value) {
      pendingScrollRestore.value = null;
      
      await nextTick();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const preview = previewIndex === 0 ? previewElement0.value : previewElement1.value;
          if (preview) {
            const previewScrollHeight = preview.scrollHeight - preview.clientHeight;
            if (previewScrollHeight > 0) {
              const targetScrollTop = isAtBottom ? previewScrollHeight : (percentage * previewScrollHeight);
              preview.scrollTop = targetScrollTop;
            }
          }
        });
      });
    }
  }
}, { flush: 'post' });

// 监听 activePreviewIndex 变化，在切换预览元素时恢复滚动位置
watch(activePreviewIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex && savedScrollPercentage.value >= 0 && !isRestoringScroll.value) {
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const preview = newIndex === 0 ? previewElement0.value : previewElement1.value;
          if (preview) {
            const previewScrollHeight = preview.scrollHeight - preview.clientHeight;
            if (previewScrollHeight > 0) {
              // 检查是否在底部（百分比接近1）
              const isAtBottom = savedScrollPercentage.value >= 0.99;
              const targetScrollTop = isAtBottom ? previewScrollHeight : (savedScrollPercentage.value * previewScrollHeight);
              preview.scrollTop = targetScrollTop;
            }
          }
        });
      });
    });
  }
});

onMounted(() => {
  // 初始化时，两个预览元素都启用自动渲染
  if (previewElement0.value) {
    useAutoRender(previewElement0);
  }
  if (previewElement1.value) {
    useAutoRender(previewElement1);
  }

  // 添加点击外部关闭导出菜单的监听
  document.addEventListener('click', handleClickOutsideExport);

  if (content.value) {
    renderContent();
    // 确保编辑器内容正确显示
    nextTick(async () => {
      const editor = editorElement.value;
      if (editor) {
        // 初始加载时，无论是否焦点，都先应用标注以便用户看到效果
        // 如果用户点击编辑器，handleEditorFocus 会切换为纯文本模式
        await applyEditorAnnotations();
  }
});
  }
});

onUnmounted(() => {
  // 移除点击外部关闭导出菜单的监听
  document.removeEventListener('click', handleClickOutsideExport);
});

// 计算从元素开始到指定范围的文本长度（使用与getTextContent相同的逻辑）
const calculateTextLength = (element: HTMLElement, endNode: Node, endOffset: number): number => {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setEnd(endNode, endOffset);
  
  // 使用 getTextContent 的逻辑来计算文本长度
  // 创建一个临时容器来提取范围内的内容
  const fragment = range.cloneContents();
  const tempContainer = document.createElement('div');
  tempContainer.appendChild(fragment);
  
  // 使用 getTextContent 来获取文本内容，确保逻辑一致
  return getTextContent(tempContainer).length;
};

// 获取contenteditable元素的光标位置（基于纯文本，考虑HTML标注）
const getCursorPosition = (element: HTMLElement): { start: number; end: number } => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    // 如果没有选择，尝试获取编辑器的文本内容长度作为默认位置
    const editorText = getTextContent(element);
    return { start: editorText.length, end: editorText.length };
  }

  const range = selection.getRangeAt(0);
  
  // 使用 calculateTextLength 来计算位置，确保与 getTextContent 的逻辑一致
  const start = calculateTextLength(element, range.startContainer, range.startOffset);
  const end = calculateTextLength(element, range.endContainer, range.endOffset);

  return { start, end };
};

// 设置contenteditable元素的光标位置（基于纯文本位置）
const setCursorPosition = (element: HTMLElement, position: number): void => {
  try {
    const selection = window.getSelection();
    if (!selection) {
      console.warn('[setCursorPosition] 无法获取 Selection 对象');
    return;
  }
  
    // 确保位置在有效范围内
    const textContent = element.textContent || '';
    const maxPosition = textContent.length;
    const validPosition = Math.max(0, Math.min(position, maxPosition));
    
    if (validPosition !== position) {
      console.warn(`[setCursorPosition] 位置 ${position} 超出范围 [0, ${maxPosition}]，调整为 ${validPosition}`);
    }

    const range = document.createRange();
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentPos = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent?.length || 0;
      
      if (currentPos + nodeLength >= validPosition) {
        targetNode = node;
        targetOffset = Math.max(0, Math.min(validPosition - currentPos, nodeLength));
        break;
      }
      currentPos += nodeLength;
    }

    if (targetNode) {
      range.setStart(targetNode, targetOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      console.log(`[setCursorPosition] 成功设置光标位置到 ${validPosition}`);
    } else {
      // 如果找不到目标节点，将光标设置到末尾
      const textNodes: Node[] = [];
      const nodeWalker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );
      let node: Node | null;
      while ((node = nodeWalker.nextNode())) {
        textNodes.push(node);
      }
      
      if (textNodes.length > 0) {
        const lastNode = textNodes[textNodes.length - 1];
        const lastLength = lastNode.textContent?.length || 0;
        range.setStart(lastNode, lastLength);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        console.log(`[setCursorPosition] 未找到目标节点，设置光标到文档末尾 (${lastLength})`);
      } else {
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        console.log(`[setCursorPosition] 没有文本节点，设置光标到元素末尾`);
      }
    }
  } catch (error) {
    console.error('[setCursorPosition] 设置光标位置时出错:', error);
  }
};

// Mermaid编辑器相关方法
const openMermaidEditor = () => {
  const editor = editorElement.value;
  if (!editor) {
    return;
  }
  
  // 先同步编辑器内容到 mainContent（如果编辑器有焦点，内容可能不同步）
  const currentEditorText = getTextContent(editor);
  if (currentEditorText !== mainContent.value) {
    mainContent.value = currentEditorText;
    content.value = mergeContent(frontmatter.value, mainContent.value);
  }

  // 获取当前选择范围：
  // 1. 如果编辑器有焦点，实时获取光标位置（更准确）
  // 2. 否则使用保存的光标位置（从 handleEditorMouseDown 或 handleEditorBlur 保存）
  let start = currentSelectionStart.value;
  let end = currentSelectionEnd.value;
  
  if (isEditorFocused.value || document.activeElement === editor) {
    try {
      const position = getCursorPosition(editor);
      // 只有在位置有效时才使用实时位置
      if (position.start >= 0 && position.end >= 0) {
        start = position.start;
        end = position.end;
        // 更新保存的位置
  currentSelectionStart.value = start;
  currentSelectionEnd.value = end;
      }
    } catch (e) {
      console.warn('[Mermaid编辑器] 获取光标位置失败，使用保存的位置:', e);
    }
  }
  
  // 确保位置在有效范围内
  const validStart = Math.max(0, Math.min(start, mainContent.value.length));
  const validEnd = Math.max(validStart, Math.min(end, mainContent.value.length));
  
  console.log('[Mermaid编辑器] 打开编辑器');
  console.log('[Mermaid编辑器] mainContent长度:', mainContent.value.length);
  console.log('[Mermaid编辑器] 保存的光标位置 start:', currentSelectionStart.value, 'end:', currentSelectionEnd.value);
  console.log('[Mermaid编辑器] 使用的光标位置 start:', validStart, 'end:', validEnd);
  
  // 尝试提取Mermaid代码块（使用 mainContent，确保索引匹配）
  const mermaidCode = extractMermaidCode(mainContent.value, validStart, validEnd);
  
  currentMermaidCode.value = mermaidCode;
  currentSelectionStart.value = validStart;
  currentSelectionEnd.value = validEnd;
  showMermaidEditor.value = true;
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
    if (!line) continue;
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

const handleMermaidSave = async (mermaidCode: string) => {
  const editor = editorElement.value;
  if (!editor) return;
  
  const start = currentSelectionStart.value;
  const end = currentSelectionEnd.value;
  
  console.log('[Mermaid保存] 开始保存');
  console.log('[Mermaid保存] 插入位置 start:', start, 'end:', end);
  console.log('[Mermaid保存] mainContent长度:', mainContent.value.length);
  
  // 使用 mainContent 进行操作，因为编辑器显示的是 mainContent
  let newMainContent = mainContent.value;
  
  // 构建 Mermaid 代码块
  const mermaidBlock = `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
  let newCursorPosition = start;
  
  // 如果之前有选中的Mermaid代码块，替换它
  if (start !== end && start < newMainContent.length && end <= newMainContent.length) {
    const selectedText = newMainContent.substring(start, end);
    if (selectedText.trim().startsWith('```mermaid')) {
      // 替换整个Mermaid代码块
      newMainContent = newMainContent.substring(0, start) + mermaidBlock + newMainContent.substring(end);
      // 光标位置设置为插入块之后
      newCursorPosition = start + mermaidBlock.length;
    } else {
      // 替换选中的文本
      newMainContent = newMainContent.substring(0, start) + mermaidBlock + newMainContent.substring(end);
      // 光标位置设置为插入块之后
      newCursorPosition = start + mermaidBlock.length;
    }
  } else {
    // 如果没有选中文本，在当前位置插入Mermaid代码块
    const insertPos = Math.min(start, newMainContent.length);
    newMainContent = newMainContent.substring(0, insertPos) + mermaidBlock + '\n' + newMainContent.substring(insertPos);
    // 光标位置设置为插入块之后（包括换行）
    newCursorPosition = insertPos + mermaidBlock.length + 1;
  }
  
  console.log('[Mermaid保存] 新内容长度:', newMainContent.length);
  console.log('[Mermaid保存] 新光标位置:', newCursorPosition);
  
  // 更新 mainContent 和完整 content
  mainContent.value = newMainContent;
  content.value = mergeContent(frontmatter.value, mainContent.value);

  // 关闭编辑器对话框（先关闭，避免干扰）
  closeMermaidEditor();
  
  // 更新编辑器显示和光标位置
  // 注意：在应用标注之前，编辑器失去焦点，所以 isEditorFocused 可能是 false
  // 但我们仍然需要应用标注以显示格式
  
  // 先标记编辑器没有焦点，避免 applyEditorAnnotations 内部尝试恢复光标位置
  const wasFocused = isEditorFocused.value;
  isEditorFocused.value = false;
  
  // 应用标注（会重新渲染编辑器内容）
  await applyEditorAnnotations();
  
  // 等待DOM更新完成
  await nextTick();
  
  // 设置光标位置（基于新的内容）
  setCursorPosition(editor, newCursorPosition);
  
  // 更新保存的光标位置
  currentSelectionStart.value = newCursorPosition;
  currentSelectionEnd.value = newCursorPosition;
  
  // 给编辑器焦点，以便用户继续编辑
  editor.focus();
  // 恢复焦点状态
  if (wasFocused) {
    isEditorFocused.value = true;
  }

  checkChanges();
  renderContent();
};

const closeMermaidEditor = () => {
  showMermaidEditor.value = false;
  currentMermaidCode.value = '';
  currentSelectionStart.value = 0;
  currentSelectionEnd.value = 0;
};

// 公式编辑器相关方法
const openFormulaEditor = () => {
  const editor = editorElement.value;
  if (!editor) return;

  // 先同步编辑器内容到 mainContent（如果编辑器有焦点，内容可能不同步）
  const currentEditorText = getTextContent(editor);
  
  // 获取光标位置：优先使用保存的位置，如果编辑器有焦点则获取当前位置
  let start = currentSelectionStart.value;
  let end = currentSelectionEnd.value;
  
  // 如果编辑器有焦点，尝试获取当前光标位置（可能更准确）
  if (isEditorFocused.value || document.activeElement === editor) {
    try {
      const position = getCursorPosition(editor);
      // 只有在位置有效时才使用
      if (position.start >= 0 && position.end >= 0) {
        start = position.start;
        end = position.end;
      }
    } catch (e) {
      // 如果获取位置失败，使用保存的位置
      console.warn('[公式编辑器] 获取光标位置失败，使用保存的位置:', e);
    }
  }

  // 同步内容
  if (currentEditorText !== mainContent.value) {
    mainContent.value = currentEditorText;
    content.value = mergeContent(frontmatter.value, mainContent.value);
  }

  // 确保位置在有效范围内
  const validStart = Math.max(0, Math.min(start, mainContent.value.length));
  const validEnd = Math.max(validStart, Math.min(end, mainContent.value.length));

  console.log('[公式编辑器] 打开公式编辑器');
  console.log('[公式编辑器] 编辑器文本长度:', currentEditorText.length);
  console.log('[公式编辑器] mainContent长度:', mainContent.value.length);
  console.log('[公式编辑器] 保存的光标位置 start:', currentSelectionStart.value, 'end:', currentSelectionEnd.value);
  console.log('[公式编辑器] 使用的光标位置 start:', validStart, 'end:', validEnd);
  
  // 尝试提取公式代码（使用 mainContent，确保索引匹配）
  const formulaCode = extractFormulaCode(mainContent.value, validStart, validEnd);
  currentFormulaCode.value = formulaCode;
  
  // 确定公式类型 - 更精确的判断逻辑
  currentFormulaType.value = determineFormulaType(mainContent.value, validStart, validEnd);
  
  currentSelectionStart.value = validStart;
  currentSelectionEnd.value = validEnd;
  showFormulaEditor.value = true;
};

const extractFormulaCode = (content: string, start: number, end: number): string => {
  // 实现公式提取逻辑
  if (start !== end) {
    const selectedText = content.substring(start, end);
    // 检查是否为块级公式
    if (selectedText.trim().startsWith('$$') && selectedText.trim().endsWith('$$')) {
      return selectedText.replace(/^\$\$/, '').replace(/\$\$$/, '').trim();
    }
    // 检查是否为行内公式
    if (selectedText.trim().startsWith('$') && selectedText.trim().endsWith('$') && 
        !selectedText.trim().startsWith('$$')) {
      return selectedText.replace(/^\$/, '').replace(/\$$/, '').trim();
    }
    return selectedText;
  }
  
  // 如果没有选中文本，尝试查找光标位置附近的公式
  const textBefore = content.substring(0, start);
  const textAfter = content.substring(start);
  
  // 检查行内公式
  const inlineBeforeMatch = textBefore.match(/\$([^$]*)$/);
  const inlineAfterMatch = textAfter.match(/^([^$]*)\$/);
  if (inlineBeforeMatch && inlineAfterMatch && inlineBeforeMatch[1] !== undefined && inlineAfterMatch[1] !== undefined) {
    return (inlineBeforeMatch[1] + inlineAfterMatch[1]).trim();
  }
  
  // 检查块级公式
  const blockBeforeMatch = textBefore.match(/\$\$([\s\S]*)$/);
  const blockAfterMatch = textAfter.match(/^([\s\S]*)\$\$/);
  if (blockBeforeMatch && blockAfterMatch && blockBeforeMatch[1] !== undefined && blockAfterMatch[1] !== undefined) {
    return (blockBeforeMatch[1] + blockAfterMatch[1]).trim();
  }
  
  return '';
};

const determineFormulaType = (content: string, start: number, end: number): 'inline' | 'block' => {
  if (start !== end) {
    const selectedText = content.substring(start, end);
    // 检查是否为块级公式（以$$开头和结尾）
    if (selectedText.trim().startsWith('$$') && selectedText.trim().endsWith('$$')) {
      return 'block';
    }
    // 检查是否为行内公式（以$开头和结尾，但不是$$）
    if (selectedText.trim().startsWith('$') && selectedText.trim().endsWith('$') && 
        !selectedText.trim().startsWith('$$')) {
      return 'inline';
    }
  }
  
  // 如果没有选中文本，检查光标位置附近的公式类型
  const textBefore = content.substring(0, start);
  const textAfter = content.substring(start);
  
  // 检查行内公式
  const inlineBeforeMatch = textBefore.match(/\$([^$]*)$/);
  const inlineAfterMatch = textAfter.match(/^([^$]*)\$/);
  if (inlineBeforeMatch && inlineAfterMatch) {
    return 'inline';
  }
  
  // 检查块级公式
  const blockBeforeMatch = textBefore.match(/\$\$([\s\S]*)$/);
  const blockAfterMatch = textAfter.match(/^([\s\S]*)\$\$/);
  if (blockBeforeMatch && blockAfterMatch) {
    return 'block';
  }
  
  // 默认返回行内公式
  return 'inline';
};

const handleFormulaSave = (formulaData: { latexCode: string; formulaType: 'inline' | 'block' } | string) => {
  const editor = editorElement.value;
  if (!editor) return;

  // 处理两种可能的参数格式
  let latexCode: string;
  let formulaType: 'inline' | 'block';

  if (typeof formulaData === 'string') {
    // 兼容旧格式
    latexCode = formulaData;
    formulaType = 'inline';
  } else {
    latexCode = formulaData.latexCode;
    formulaType = formulaData.formulaType;
  }
  
  const start = currentSelectionStart.value;
  const end = currentSelectionEnd.value;
  
  console.log('[公式保存] 保存公式');
  console.log('[公式保存] 保存位置 start:', start, 'end:', end);
  console.log('[公式保存] mainContent长度:', mainContent.value.length);
  console.log('[公式保存] mainContent前100字符:', mainContent.value.substring(0, 100));

  // 使用 mainContent 进行操作，因为编辑器显示的是 mainContent
  let newMainContent = mainContent.value;
  
  // 根据公式类型格式化代码
  const formattedFormula = formulaType === 'block' 
    ? `$$${latexCode}$$`
    : `$${latexCode}$`;

  // 确保位置有效
  const validStart = Math.max(0, Math.min(start, newMainContent.length));
  const validEnd = Math.max(validStart, Math.min(end, newMainContent.length));

  console.log('[公式保存] 有效位置 start:', validStart, 'end:', validEnd);
  
  // 替换或插入公式
  if (validStart !== validEnd && validStart < newMainContent.length && validEnd <= newMainContent.length) {
    newMainContent = newMainContent.substring(0, validStart) + formattedFormula + newMainContent.substring(validEnd);
  } else {
    newMainContent = newMainContent.substring(0, validStart) + formattedFormula + newMainContent.substring(validStart);
  }

  console.log('[公式保存] 插入后mainContent前100字符:', newMainContent.substring(0, 100));
  console.log('[公式保存] 公式插入位置:', newMainContent.indexOf(formattedFormula));

  // 更新 mainContent 和完整 content
  mainContent.value = newMainContent;
  content.value = mergeContent(frontmatter.value, mainContent.value);

  // 更新编辑器显示
  if (!isEditorFocused.value) {
    // 编辑器没有焦点时，应用标注
    applyEditorAnnotations();
  } else {
    // 编辑器有焦点时，直接更新文本内容
    editor.textContent = mainContent.value;
  }

  checkChanges();
  renderContent();
  showFormulaEditor.value = false;
};

const closeFormulaEditor = () => {
  showFormulaEditor.value = false;
  currentFormulaCode.value = '';
};

// 点击外部关闭导出菜单
const handleClickOutsideExport = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.export-menu')) {
    showExportMenu.value = false;
  }
};

// 导出相关方法
const handleExport = async (format: 'word' | 'pdf' | 'html' | 'markdown') => {
  // 检查是否有文档或外部文件
  if ((!props.document && !currentFilePath.value) || isExporting.value) {
    return;
  }

  showExportMenu.value = false;
  isExporting.value = true;

  try {
    const app = Application.getInstance();
    const { ExportFormat } = await import('../../domain/services/document-export.interface');
    const { ExportFactory } = await import('../../infrastructure/services/export-factory.service');

    let exportFormat;
    switch (format) {
      case 'word':
        exportFormat = ExportFormat.WORD;
        break;
      case 'pdf':
        exportFormat = ExportFormat.PDF;
        break;
      case 'html':
        exportFormat = ExportFormat.HTML;
        break;
      case 'markdown':
        exportFormat = ExportFormat.MARKDOWN;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // 获取当前文档内容（使用合并后的内容）
    const documentContent = mergeContent(frontmatter.value, mainContent.value);
    const documentTitle = title.value || '未命名文档';

    let result;

    // PDF 导出需要通过主进程（Node.js 环境）
    if (format === 'pdf') {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.export || !electronAPI.export.pdf) {
        throw new Error('PDF导出需要在Electron环境中运行');
      }

      // 如果是数据库文档，使用 ExportUseCases 准备数据
      let processedContent = documentContent;
      let documentId = props.document?.id || currentFilePath.value;
      
      if (props.document) {
        const exportUseCases = app.getExportUseCases();
        // 先处理内容（包括片段引用等）
        const { InversifyContainer } = await import('../../core/container/inversify.container');
        const container = InversifyContainer.getInstance();
        
        try {
          if (container.isBound(TYPES.FragmentReferenceResolver)) {
            const resolver = container.get(TYPES.FragmentReferenceResolver);
            if (resolver) {
              processedContent = await resolver.resolveReferences(processedContent, documentId);
            }
          }
        } catch (error) {
          console.warn('解析片段引用失败，使用原始内容:', error);
        }
      } else {
        // 外部文件：处理片段引用
        const { InversifyContainer } = await import('../../core/container/inversify.container');
        const container = InversifyContainer.getInstance();
        
        try {
          if (container.isBound(TYPES.FragmentReferenceResolver)) {
            const resolver = container.get(TYPES.FragmentReferenceResolver);
            if (resolver) {
              processedContent = await resolver.resolveReferences(processedContent, currentFilePath.value);
            }
          }
        } catch (error) {
          console.warn('解析片段引用失败，使用原始内容:', error);
        }
      }

      // 准备 HTML 内容（渲染进程中处理 Markdown 和资源）
      const { InversifyContainer } = await import('../../core/container/inversify.container');
      const container = InversifyContainer.getInstance();
      const exportFactory = container.get(TYPES.ExportFactory);
      const htmlExporter = exportFactory.getExporter(ExportFormat.HTML);
      
      // 先导出为 HTML（包含所有样式和资源）
      const htmlResult = await htmlExporter.export({
        format: ExportFormat.HTML,
        title: documentTitle,
        content: processedContent,
        documentId: documentId,
        variables: {},
        includeStyles: true
      });
      
      // 将 HTML buffer 转换为字符串
      const htmlString = new TextDecoder('utf-8').decode(htmlResult.buffer);
      
      // 通过 IPC 调用主进程的 PDF 导出（传递完整的 HTML）
      const pdfResult = await electronAPI.export.pdf({
        title: documentTitle,
        html: htmlString
      });

      if (!pdfResult.success) {
        throw new Error(pdfResult.error || 'PDF导出失败');
      }

      // 将 Array 转换回 Buffer/ArrayBuffer
      const buffer = new Uint8Array(pdfResult.buffer).buffer;
      result = {
        buffer: buffer,
        extension: pdfResult.extension,
        mimeType: pdfResult.mimeType,
        filename: pdfResult.filename
      };
    } else {
      // 其他格式（Word、HTML、Markdown）在渲染进程中处理
      // 如果是数据库文档，使用 ExportUseCases
      if (props.document) {
        const exportUseCases = app.getExportUseCases();
        result = await exportUseCases.exportDocument({
          documentId: props.document.id,
          format: exportFormat,
          variables: {} // 可以添加变量支持
        });
      } else {
        // 如果是外部文件，直接使用 ExportFactory 和导出器
        // 使用 InversifyContainer 直接获取容器
        const { InversifyContainer } = await import('../../core/container/inversify.container');
        const container = InversifyContainer.getInstance();

        if (!container || !container.isBound(TYPES.ExportFactory)) {
          throw new Error('导出服务未初始化，请确保应用已正确启动');
        }

        const exportFactory = container.get(TYPES.ExportFactory);
        const exporter = exportFactory.getExporter(exportFormat);

        // 处理片段引用（如果有）
        let processedContent = documentContent;
        try {
          if (container.isBound(TYPES.FragmentReferenceResolver)) {
            const resolver = container.get(TYPES.FragmentReferenceResolver);
            if (resolver) {
              processedContent = await resolver.resolveReferences(processedContent, currentFilePath.value);
            }
          }
        } catch (error) {
          console.warn('解析片段引用失败，使用原始内容:', error);
        }

        // 执行导出
        result = await exporter.export({
          format: exportFormat,
          title: documentTitle,
          content: processedContent,
          documentId: currentFilePath.value,
          variables: {},
          includeStyles: true
        });
      }
    }

    // 保存文件
    await saveExportFile(result, format);

    alert(`文档已成功导出为 ${format.toUpperCase()} 格式！`);
  } catch (error) {
    console.error('导出失败:', error);
    alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    isExporting.value = false;
  }
};

const saveExportFile = async (result: any, format: string) => {
  // 检查是否在Electron环境中
  const electronAPI = (window as any).electronAPI;
  
  if (electronAPI && electronAPI.dialog && electronAPI.dialog.saveFile) {
    // Electron环境：使用保存对话框
    const filters = [];
    switch (format) {
      case 'word':
        filters.push({ name: 'Word文档', extensions: ['docx'] });
        break;
      case 'pdf':
        filters.push({ name: 'PDF文档', extensions: ['pdf'] });
        break;
      case 'html':
        filters.push({ name: 'HTML文件', extensions: ['html'] });
        break;
      case 'markdown':
        filters.push({ name: 'Markdown文件', extensions: ['md'] });
        break;
    }
    filters.push({ name: 'All Files', extensions: ['*'] });

    const filePath = await electronAPI.dialog.saveFile({
      title: '保存导出文件',
      defaultPath: result.filename,
      filters: filters
    });

    if (filePath) {
      // 处理 buffer（可能是 Buffer 或 ArrayBuffer）
      let arrayBuffer: ArrayBuffer;
      if (result.buffer instanceof ArrayBuffer) {
        arrayBuffer = result.buffer;
      } else if (result.buffer instanceof Uint8Array) {
        arrayBuffer = result.buffer.buffer.slice(
          result.buffer.byteOffset,
          result.buffer.byteOffset + result.buffer.byteLength
        );
      } else if (result.buffer.buffer) {
        // Node.js Buffer
        arrayBuffer = result.buffer.buffer.slice(
          result.buffer.byteOffset,
          result.buffer.byteOffset + result.buffer.byteLength
        );
      } else {
        throw new Error('不支持的 buffer 格式');
      }
      
      // 使用writeBinary保存文件
      await electronAPI.file.writeBinary(filePath, arrayBuffer);
    }
  } else {
    // 浏览器环境：使用下载API
    const blob = new Blob([result.buffer], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// 根据鼠标位置获取文本位置
const getTextPositionFromPoint = (element: HTMLElement, x: number, y: number): number => {
  const range = document.caretRangeFromPoint?.(x, y);
  if (!range) {
    // 降级方案：使用selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const selRange = selection.getRangeAt(0);
      const preRange = document.createRange();
      preRange.selectNodeContents(element);
      preRange.setEnd(selRange.startContainer, selRange.startOffset);
      return preRange.toString().length;
    }
    return 0;
  }

  const preRange = document.createRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
};

// 图片拖放处理
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer?.types.includes('Files') || event.dataTransfer?.types.includes('application/x-knowledge-fragment')) {
    isDragging.value = true;
  }
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  // 只有当离开整个编辑器区域时才取消拖拽状态
  const editor = editorElement.value;
  if (editor && !editor.contains(event.relatedTarget as Node)) {
    isDragging.value = false;
  }
};

// 编辑器拖拽进入
const handleEditorDragEnter = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer?.types.includes('Files') || event.dataTransfer?.types.includes('application/x-knowledge-fragment')) {
    isDragging.value = true;
  }
};

// 编辑器拖拽离开
const handleEditorDragLeave = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  const editor = editorElement.value;
  if (editor && !editor.contains(event.relatedTarget as Node)) {
    isDragging.value = false;
  }
};

// 编辑器拖拽悬停
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();

  // 根据鼠标位置设置光标
  const editor = editorElement.value;
  if (editor) {
    const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    if (range) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
};

// 编辑器拖拽放下
const handleEditorDrop = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = false;

  // 支持外部文件和数据库文档
  if (!props.document && !currentFilePath.value) {
    alert('请先打开一个文档或文件');
    return;
  }

  // 获取鼠标位置的文本位置
  const editor = editorElement.value;
  if (!editor) return;

  // 根据鼠标位置计算文本位置
  const textPosition = getTextPositionFromPoint(editor, event.clientX, event.clientY);

  // 设置光标位置
  const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
  if (range) {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  // 检查是否是知识片段拖拽
  const fragmentId = event.dataTransfer?.getData('application/x-knowledge-fragment');
  if (fragmentId) {
    // 处理知识片段拖拽，使用计算出的位置
    await handleInsertFragmentAtPosition(fragmentId, textPosition);
    return;
  }

  // 处理文件拖拽
  await handleDrop(event);
};

// 包装的handleDrop用于文件拖拽
const handleDrop = async (event: DragEvent) => {

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) {
    return;
  }

  // 获取光标位置
  const editor = editorElement.value;
  if (!editor) {
    return;
  }

  const { start: cursorPosition } = getCursorPosition(editor);

  try {
    let imagePaths: string[] = [];

    // 如果有document，使用document ID
    if (props.document) {
      imagePaths = await handleDroppedImages(props.document.id, files);
    }
    // 如果是外部文件，需要获取文件所在目录来保存图片
    else if (currentFilePath.value) {
      // 对于外部文件，我们需要使用文件路径的目录部分
      const fileDir = currentFilePath.value.split(/[/\\]/).slice(0, -1).join('/');
      const assetsDir = `${fileDir}/assets`;

      // 确保assets目录存在
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.file && electronAPI.file.mkdir) {
        try {
          await electronAPI.file.mkdir(assetsDir);
        } catch (error) {
          // 目录可能已存在，忽略错误
        }
      }

      // 使用FileSystemImageStorageService直接保存到文件系统
      const { FileSystemImageStorageService } = await import('../../infrastructure/services/image-storage.service');
      const imageStorage = new FileSystemImageStorageService();

      // 使用文件目录作为documentId（需要特殊处理）
      const tempDocId = `file:${fileDir}`;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && file.type.startsWith('image/')) {
          // 保存图片到文件系统的assets目录
          const imagePath = await imageStorage.saveImageToDocument(tempDocId, file);
          imagePaths.push(imagePath);
        }
      }
    }

    if (imagePaths.length > 0) {
      // 插入所有图片引用
      let newContent = content.value;
      let newPosition = cursorPosition;

      for (const imagePath of imagePaths) {
        const result = insertImageReference(newContent, imagePath, newPosition);
        newContent = result.content;
        newPosition = result.newPosition;
      }

      content.value = newContent;

      // 触发内容更新和重新渲染
      checkChanges();
      renderContent();
      await nextTick();
      if (!isEditorFocused.value) {
        applyEditorAnnotations();
      }
      debouncedSave();
    }
  } catch (error) {
    console.error('Error handling dropped images:', error);
    alert('图片上传失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 处理知识片段插入（在指定位置）
const handleInsertFragmentAtPosition = async (fragmentId: string, position: number) => {
  if (!props.document && !currentFilePath.value) {
    alert('请先打开一个文档或文件');
    return;
  }

  const editor = editorElement.value;
  if (!editor) {
    return;
  }

  try {
    const application = Application.getInstance();
    // 确保应用服务已初始化
    await application.getApplicationService().initialize();
    const fragmentUseCases = application.getKnowledgeFragmentUseCases();

    // 获取片段内容
    const fragment = await fragmentUseCases.getFragment(fragmentId);
    if (!fragment) {
      throw new Error('知识片段不存在');
    }

    const cursorPosition = position;

    // 获取片段内容（Markdown格式）
    let fragmentContent = fragment.markdown;

    // 如果是外部文件，需要处理图片路径
    if (currentFilePath.value) {
      try {
        const { FragmentReferenceResolver } = await import('../../domain/services/fragment-reference-resolver.service');
        const { InversifyContainer } = await import('../../core/container/inversify.container');
        const container = InversifyContainer.getInstance();

        if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceResolver)) {
          const resolver = container.get<any>(TYPES.FragmentReferenceResolver);
          // 使用文件路径作为documentId
          fragmentContent = await resolver.resolveReference(fragmentId, `file:${currentFilePath.value}`);
        }
      } catch (error) {
        console.warn('Error resolving fragment content for file:', error);
      }
    }

    // 插入内容和引用标志
    // 使用形态A（强引用模式）的语法
    const referenceTag = `{{ref:${fragmentId}:linked}}`;
    const before = content.value.substring(0, cursorPosition);
    const after = content.value.substring(cursorPosition);

    // 在编辑器中显示引用标志
    content.value = before + '\n\n' + referenceTag + '\n\n' + after;

    // 保存到缓存：存储引用标志位置和对应的片段内容
    if (currentFilePath.value) {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && electronAPI.file && electronAPI.file.getFileCache) {
          const cache = await electronAPI.file.getFileCache(currentFilePath.value) || { references: [] };
          const refPosition = cursorPosition + 2; // +2 for \n\n
          cache.references = cache.references || [];
          cache.references.push({
            fragmentId,
            position: refPosition,
            length: referenceTag.length,
            content: fragmentContent,
            isConnected: true
          });
          // 按位置排序
          cache.references.sort((a: any, b: any) => a.position - b.position);

          if (electronAPI.file.saveFileCache) {
            await electronAPI.file.saveFileCache(currentFilePath.value, cache);
          }
        }

        // 为外部文件也注册引用关系到知识片段
        try {
          const { InversifyContainer } = await import('../../core/container/inversify.container');
          const container = InversifyContainer.getInstance();

          if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceRegistrationService)) {
            const registrationService = container.get<any>(TYPES.FragmentReferenceRegistrationService);
            // 使用 file: 前缀标识外部文件
            const fileDocumentId = `file:${currentFilePath.value}`;
            const newPosition = cursorPosition + 2; // +2 for \n\n
            // 从文件路径提取文件名作为标题
            const fileName = currentFilePath.value.split(/[/\\]/).pop() || 'Untitled';
            await registrationService.registerExternalFileReference(
              fileDocumentId,
              fileName,
              fragmentId,
              newPosition,
              referenceTag.length
            );
          }
        } catch (error) {
          console.error('Error registering external file reference:', error);
        }
      } catch (error) {
        console.error('Error saving file cache:', error);
      }
    }

    // 如果是数据库文档，注册引用关系
    if (props.document) {
      try {
        const { InversifyContainer } = await import('../../core/container/inversify.container');
        const container = InversifyContainer.getInstance();

        if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceRegistrationService)) {
          const registrationService = container.get<any>(TYPES.FragmentReferenceRegistrationService);
          const newPosition = cursorPosition + 2; // +2 for \n\n
          await registrationService.registerReference(
            props.document.id,
            fragmentId,
            newPosition,
            referenceTag.length
          );
        }
      } catch (error) {
        console.error('Error registering fragment reference:', error);
      }
    }

    // 更新编辑器内容（在聚焦之前应用标注，避免焦点丢失）
    await nextTick();
    // 不要在这里调用 focus()，让用户自然地保持焦点
    // 只在编辑器没有焦点时才应用标注
    if (!isEditorFocused.value) {
      await applyEditorAnnotations();
    } else {
      // 如果编辑器有焦点，只设置纯文本内容
      editor.textContent = content.value;
    }

    // 触发内容更新和重新渲染
    checkChanges();
    renderContent();
    await nextTick();
    debouncedSave();
  } catch (error) {
    console.error('Error inserting fragment:', error);
    alert('插入知识片段失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 处理知识片段插入（使用当前光标位置）
const handleInsertFragment = async (fragmentId: string) => {
  const editor = editorElement.value;
  if (!editor) {
    return;
  }
  const { start: cursorPosition } = getCursorPosition(editor);
  await handleInsertFragmentAtPosition(fragmentId, cursorPosition);
};

// 暴露方法供外部调用
const setContent = (newTitle: string, newContent: string, filePath?: string) => {
  title.value = newTitle;
  content.value = newContent || '';
  lastSavedTitle = newTitle;
  lastSavedContent = newContent || '';
  hasChanges.value = false;
  if (filePath) {
    currentFilePath.value = filePath;
  }

  // 分离 frontmatter 和正文
  const { frontmatter: fm, mainContent: main } = splitContent(newContent || '');
  frontmatter.value = fm;
  mainContent.value = main;

  // 使用nextTick确保DOM更新后再渲染
  nextTick(() => {
    renderContent();
    const editor = editorElement.value;
    if (editor) {
      // 在编辑器中只显示正文内容（不包含 frontmatter）
      if (isEditorFocused.value) {
        editor.textContent = mainContent.value;
      } else {
        applyEditorAnnotations();
      }
    }
  });
};

// 刷新内容（用于知识片段更新后刷新预览）
const refreshContent = () => {
  renderContent();
};

const getContent = () => {
  // 获取编辑器当前内容
  const editor = editorElement.value;
  const currentMainContent = editor ? editor.textContent || '' : mainContent.value;

  // 合并 frontmatter 和正文
  return mergeContent(frontmatter.value, currentMainContent);
};

// 获取选中的文本（供外部调用）
const getSelectedText = () => {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    return selection.toString();
  }
  return '';
};

// 处理编辑器点击（左键点击引用标志）
const handleEditorClick = async (event: MouseEvent) => {
  const editor = editorElement.value;
  if (!editor) return;

  // 获取点击位置的元素
  const target = event.target as HTMLElement;
  const referenceSpan = target.closest('.editor-reference') as HTMLElement;

  if (referenceSpan) {
    event.preventDefault();
    event.stopPropagation();

    const fragmentId = referenceSpan.getAttribute('data-fragment-id');
    const mode = referenceSpan.getAttribute('data-mode') || 'linked';
    const start = parseInt(referenceSpan.getAttribute('data-start') || '0');
    const end = parseInt(referenceSpan.getAttribute('data-end') || '0');

    if (fragmentId) {
      referenceContextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        fragmentId,
        startIndex: start,
        endIndex: end,
        currentMode: mode
      };
    }
  } else {
    // 点击其他地方，关闭菜单
    referenceContextMenu.value.visible = false;
  }
};

// 点击外部关闭菜单
const contextMenuElement = ref<HTMLDivElement>();
const handleClickOutside = (event: MouseEvent) => {
  if (referenceContextMenu.value.visible) {
    const target = event.target as HTMLElement;
    const menu = contextMenuElement.value;
    const editor = editorElement.value;

    // 如果点击的不是菜单本身，也不是编辑器内的引用，则关闭菜单
    if (menu && !menu.contains(target) &&
        (!editor || !editor.contains(target) || !target.closest('.editor-reference'))) {
      referenceContextMenu.value.visible = false;
    }
  }
};

// 切换引用形态
const switchReferenceMode = async (newMode: 'linked' | 'detached' | 'clean') => {
  const menu = referenceContextMenu.value;
  if (!menu.fragmentId) return;

  // 检查是否是placeholder格式（不应该出现，但需要处理）
  if (menu.fragmentId.startsWith('placeholder:')) {
    console.error('Invalid fragmentId format:', menu.fragmentId);
    alert('无法切换引用模式：引用格式错误');
    return;
  }

  try {
    const { FragmentReferenceParser } = await import('../../domain/services/fragment-reference-parser.service');
    const parser = new FragmentReferenceParser();
    const references = parser.parseReferences(content.value);

    // 查找匹配的引用：优先匹配fragmentId和位置，如果找不到则只匹配fragmentId
    let ref = references.find(r => r.fragmentId === menu.fragmentId && r.startIndex === menu.startIndex);

    // 如果找不到精确匹配，尝试只匹配fragmentId（忽略placeholder格式）
    if (!ref) {
      ref = references.find(r =>
        r.fragmentId === menu.fragmentId &&
        !r.fragmentId.startsWith('placeholder:') &&
        Math.abs(r.startIndex - menu.startIndex) < 100 // 允许一定范围内的位置差异
      );
    }

    // 如果还是找不到，尝试通过fragmentId查找（不匹配placeholder）
    if (!ref) {
      ref = references.find(r =>
        r.fragmentId === menu.fragmentId &&
        !r.fragmentId.startsWith('placeholder:')
      );
    }

    if (!ref) {
      console.error('Reference not found:', {
        fragmentId: menu.fragmentId,
        startIndex: menu.startIndex,
        allReferences: references.map(r => ({ id: r.fragmentId, start: r.startIndex }))
      });
      alert('无法找到对应的引用标记');
      return;
    }

    let newContent = content.value;
    const before = content.value.substring(0, ref.startIndex);
    const after = content.value.substring(ref.endIndex);

    if (newMode === 'linked') {
      // 形态A：强引用模式
      const newTag = `{{ref:${ref.fragmentId}:linked}}`;
      newContent = before + newTag + after;
    } else if (newMode === 'detached') {
      // 形态B：脱钩模式 - 获取片段内容并插入
      const { Application } = await import('../../core/application');
      const app = Application.getInstance();
      await app.getApplicationService().initialize();
      const fragmentUseCases = app.getKnowledgeFragmentUseCases();
      const fragment = await fragmentUseCases.getFragment(ref.fragmentId);

      if (fragment) {
        // 插入标记和内容
        const tag = `{{ref:${ref.fragmentId}:detached}}`;
        const fragmentContent = fragment.markdown;
        newContent = before + tag + '\n\n' + fragmentContent + '\n\n' + after;
      } else {
        alert('无法获取片段内容');
        return;
      }
    } else if (newMode === 'clean') {
      // 形态C：完全断开 - 获取片段内容，移除标记
      const { Application } = await import('../../core/application');
      const app = Application.getInstance();
      await app.getApplicationService().initialize();
      const fragmentUseCases = app.getKnowledgeFragmentUseCases();
      const fragment = await fragmentUseCases.getFragment(ref.fragmentId);

      if (fragment) {
        // 只插入内容，不插入标记
        const fragmentContent = fragment.markdown;
        newContent = before + fragmentContent + after;
      } else {
        // 如果片段不存在，直接移除标记
        newContent = before + after;
      }
    }

    content.value = newContent;
    referenceContextMenu.value.visible = false;

    // 更新编辑器显示（只在编辑器没有焦点时应用标注）
    await nextTick();
    const editor = editorElement.value;
    if (editor) {
      if (!isEditorFocused.value) {
        await applyEditorAnnotations();
      } else {
        editor.textContent = content.value;
      }
    }

    checkChanges();
    renderContent();
  } catch (error) {
    console.error('Error switching reference mode:', error);
    alert('切换形态失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 查看引用信息
const viewReferenceInfo = () => {
  const menu = referenceContextMenu.value;
  if (menu.fragmentId) {
    handleReferenceClick(menu.fragmentId);
  }
  referenceContextMenu.value.visible = false;
};

// 处理引用标志点击（通过双击引用标志触发）
const handleReferenceClick = async (fragmentId: string) => {
  try {
    const { Application } = await import('../../core/application');
    const app = Application.getInstance();
    const appService = app.getApplicationService();
    await appService.initialize();
    const fragmentUseCases = app.getKnowledgeFragmentUseCases();

    const fragment = await fragmentUseCases.getFragment(fragmentId);
    if (fragment && fragment.referencedDocuments) {
      // 显示引用文档列表对话框
      showReferenceDialog.value = true;
      referenceDocuments.value = fragment.referencedDocuments;
      selectedFragmentId.value = fragmentId;
    }
  } catch (error) {
    console.error('Error handling reference click:', error);
  }
};

// 跳转到文档
const navigateToDocument = (documentId: string) => {
  // 触发事件，让父组件处理导航
  emit('navigate-to-document', documentId);
  showReferenceDialog.value = false;
};

// handleEditorClick已移除，现在使用右键菜单处理引用交互

// 获取当前文档上下文
const getDocumentContext = () => {
  if (props.document) {
    return { documentId: props.document.id, filePath: undefined };
  } else if (currentFilePath.value) {
    return { documentId: undefined, filePath: currentFilePath.value };
  }
  return { documentId: undefined, filePath: undefined };
};

defineExpose({
  handleInsertFragment,
  setContent,
  getContent,
  refreshContent,
  getSelectedText,
  getDocumentContext
});
</script>

<style scoped>
.editor-container {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  position: relative;
  overflow: hidden;
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
  min-height: 0; /* 重要：允许flex子元素缩小 */
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

.editor-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-wrapper.drag-over {
  background: #f0f7ff;
  border: 2px dashed #667eea;
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.drag-message {
  font-size: 1.2rem;
  color: #667eea;
  font-weight: 600;
}

.editor-label {
  padding: 12px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-weight: 500;
  color: #555;
}

.markdown-preview-container {
  flex: 1;
  position: relative;
  min-height: 0; /* 重要：允许flex子元素缩小 */
  overflow: hidden;
  background: white;
}

.markdown-preview {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  background: white;
  will-change: opacity;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  pointer-events: none;
}

.markdown-preview.preview-active {
  opacity: 1;
  pointer-events: auto;
  z-index: 2;
}

.markdown-preview.preview-hidden {
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px 0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

/* 导出菜单样式 */
.export-menu {
  position: relative;
}

.export-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  overflow: hidden;
}

.export-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
  transition: background-color 0.2s;
}

.export-item:hover {
  background-color: #f8f9fa;
}

.export-item:not(:last-child) {
  border-bottom: 1px solid #e9ecef;
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

/* 编辑器内容样式 */
.markdown-editor-content {
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 20px;
  border: none;
  outline: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: white;
  color: #333;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.markdown-editor-content:empty:before {
  content: attr(data-placeholder);
  color: #999;
  pointer-events: none;
}

/* 编辑器标注样式 */
.markdown-editor-content .editor-reference {
  padding: 2px 4px !important;
  border-radius: 3px !important;
  border: 1px solid !important;
  font-weight: 500 !important;
  cursor: pointer;
  position: relative;
  display: inline-block !important;
}

/* 形态A：强引用模式（Linked） */
.markdown-editor-content :deep(.editor-reference.linked),
.markdown-editor-content .editor-reference.linked {
  background-color: rgba(102, 126, 234, 0.4) !important;
  border: 1px solid #667eea !important;
  border-color: #667eea !important;
  color: #4c51bf !important;
  display: inline-block !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  font-weight: 500 !important;
  background: rgba(102, 126, 234, 0.4) !important;
  /* 允许选择，但保持标注样式 */
}

.markdown-editor-content .editor-reference.linked:hover {
  background-color: rgba(102, 126, 234, 0.25);
}

/* 形态B：脱钩模式（Detached） */
.markdown-editor-content .editor-reference.detached {
  background-color: rgba(255, 193, 7, 0.15);
  border-color: #ffc107;
  color: #856404;
}

.markdown-editor-content .editor-reference.detached:hover {
  background-color: rgba(255, 193, 7, 0.25);
}

/* 兼容旧样式 */
.markdown-editor-content .editor-reference.connected {
  background-color: rgba(40, 167, 69, 0.15);
  border-color: #28a745;
  color: #155724;
}

.markdown-editor-content .editor-reference.disconnected {
  background-color: rgba(220, 53, 69, 0.15);
  border-color: #dc3545;
  color: #721c24;
}

.markdown-editor-content .editor-mermaid {
  background-color: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.markdown-editor-content .editor-code {
  background-color: rgba(108, 117, 125, 0.1);
  color: #6c757d;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.markdown-editor-content .editor-formula {
  background-color: rgba(255, 193, 7, 0.15);
  color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 200px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
}

.context-menu-item:hover {
  background-color: #f8f9fa;
}

.context-menu-item .menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.context-menu-divider {
  height: 1px;
  background-color: #e9ecef;
  margin: 4px 0;
}
</style>

