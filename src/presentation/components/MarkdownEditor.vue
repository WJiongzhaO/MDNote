<template>
  <div class="editor-container">
    <div class="editor-header">
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
        <!-- 生成知识图谱 -->
        <button
          class="toolbar-btn"
          @click="openKnowledgeGraph"
          title="根据当前文章生成知识图谱"
        >
          🕸️ 知识图谱
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: showRecommendationPanel }"
          @click="showRecommendationPanel = !showRecommendationPanel"
          title="显示/隐藏基于当前文档上下文的片段推荐"
        >
          💡 推荐片段
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
      <div class="editor-pane" :class="{ 'full-width': !showPreview }">
        <div class="editor-label">
          <span>Markdown 编辑器</span>
          <button
            class="preview-toggle-btn"
            :title="showPreview ? '隐藏预览' : '显示预览'"
            @click="showPreview = !showPreview"
          >
            {{ showPreview ? '👁️' : '👁️‍🗨️' }}
          </button>
        </div>
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
            @dragstart="handleEditorDragStart"
            @dragover.prevent="handleDragOver"
            @drop="handleEditorDrop"
            @dragenter.prevent="handleEditorDragEnter"
            @dragleave="handleEditorDragLeave"
            @click="handleEditorClick"
            @contextmenu="handleContextMenu"
            ref="editorElement"
          ></div>
          <div v-if="isDragging" class="drag-overlay">
            <div class="drag-message">📎 释放以插入图片</div>
          </div>
        </div>
      </div>

      <div v-if="showPreview" class="preview-pane">
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
      <div v-if="showRecommendationPanel" class="recommendation-pane">
        <FragmentRecommendationPanel
          :title-keywords="recommendationTitleKeywords"
          :document-tags="recommendationDocumentTags"
          :context-keywords="recommendationContextKeywords"
          :already-referenced-fragment-ids="recommendationReferencedIds"
          :recent-used-fragment-ids="recentInsertedFragmentIds"
          @insert="handleInsertFragment"
        />
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

    <!-- 隐藏的焦点接收器：用于在删除文档时接收焦点，避免光标状态问题 -->
    <div
      ref="focusSinkElement"
      tabindex="-1"
      class="focus-sink"
      aria-hidden="true"
    ></div>

    <!-- 引用脱钩菜单 -->
    <div
      v-if="referenceContextMenu.visible"
      class="context-menu"
      :style="{ top: referenceContextMenu.y + 'px', left: referenceContextMenu.x + 'px' }"
      @click.stop
      ref="contextMenuElement"
    >
      <div class="context-menu-item" @click="switchReferenceMode('detached')">
        <span class="menu-icon">🔓</span>
        <span>脱钩（转为文档内容）</span>
      </div>
    </div>

    <!-- 文本格式化右键菜单 -->
    <div
      v-if="textContextMenu.visible"
      class="context-menu"
      :style="{ top: textContextMenu.y + 'px', left: textContextMenu.x + 'px' }"
      @click.stop
      ref="textContextMenuElement"
    >
      <div class="context-menu-item" @click="applyTextFormat('bold')">
        <span class="menu-icon">B</span>
        <span>加粗</span>
      </div>
      <div class="context-menu-item" @click="applyTextFormat('italic')">
        <span class="menu-icon">I</span>
        <span>斜体</span>
      </div>
      <div class="context-menu-item" @click="applyTextFormat('strikethrough')">
        <span class="menu-icon">S</span>
        <span>删除线</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="addSelectionAsFragment">
        <span class="menu-icon">📝</span>
        <span>添加为知识片段</span>
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

    <!-- 导出配置模态框 -->
    <ExportConfigModal
      :show="showExportConfigModal"
      :format="pendingExportFormat"
      :default-file-name="getDefaultFileName()"
      @confirm="handleExportConfigConfirm"
      @cancel="handleExportConfigCancel"
    />

    <!-- 导出进度模态框 -->
    <ExportProgressModal
      :show="showExportProgress"
      :file-name="exportingFileName"
      :format="exportingFormat"
      :progress="exportProgress"
      :status="exportStatus"
      :status-message="exportStatusMessage"
      @close="showExportProgress = false"
    />

    <!-- 知识图谱模态框 -->
    <div v-if="showKnowledgeGraphModal" class="modal-overlay" @click="closeKnowledgeGraph" style="
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
      <div class="knowledge-graph-modal" @click.stop style="
        background: white;
        border-radius: 8px;
        padding: 20px;
        width: 90vw;
        max-width: 1200px;
        height: 90vh;
        overflow: hidden;
        position: relative;
        min-width: 640px;
      ">
        <div class="knowledge-graph-header">
          <h3>🕸️ 知识图谱</h3>
          <div class="knowledge-graph-actions">
            <button
              type="button"
              class="toolbar-btn sample-btn"
              @click="saveKnowledgeGraph"
              title="将当前知识图谱保存为独立文件"
              v-if="knowledgeGraphData"
            >
              保存为知识图谱
            </button>
            <button type="button" class="toolbar-btn sample-btn" @click="showSampleGraph" title="查看样例效果">查看样例</button>
            <button
              type="button"
              class="toolbar-btn sample-btn"
              v-if="knowledgeGraphData"
              @click="randomizeKnowledgeGraphLayout"
              title="重新随机排列节点（会丢弃当前坐标，直到再次自动保存）"
            >
              随机重新布局
            </button>
            <button type="button" class="close-btn" @click="closeKnowledgeGraph" title="关闭">✕</button>
          </div>
        </div>
        <div v-if="isSampleMode" class="knowledge-graph-sample-hint">（样例展示，实际数据将由 RAG 等方式提取）</div>
        <div v-if="isKnowledgeGraphRendering" class="knowledge-graph-loading">正在生成图谱…</div>
        <div v-else-if="knowledgeGraphError" class="knowledge-graph-error">{{ knowledgeGraphError }}</div>
        <KnowledgeGraphView
          v-else-if="knowledgeGraphData"
          :graph="knowledgeGraphData"
          :graph-load-key="getKnowledgeGraphDocKey()"
          :layout-randomize-key="kgLayoutRandomizeKey"
          class="knowledge-graph-body"
          :render-markdown="renderMarkdown"
          @graph-update="onKnowledgeGraphUpdate"
          @jump-to-fragment="onKnowledgeGraphJumpToFragment"
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
import ExportConfigModal from './ExportConfigModal.vue';
import ExportProgressModal from './ExportProgressModal.vue';
import KnowledgeGraphView from './KnowledgeGraphView.vue';
import FragmentRecommendationPanel from './fragment/FragmentRecommendationPanel.vue';
import type { DocumentResponse } from '../../application';
import type { ExportConfig } from '../../domain/types/export-config.types';
import { useAssetRenderer } from '../composables/useAssetRenderer';
import { useImageUpload } from '../composables/useImageUpload';
import { useEditorShortcuts } from '../composables/useShortcutManager';
import { Application } from '../../core/application';
import { TYPES } from '../../core/container/container.types';
import { extractKnowledgeGraph, sampleKnowledgeGraph, type KnowledgeGraph } from '../../domain/services/knowledge-graph-extractor';
import { NodeType } from '../../domain/types/knowledge-fragment.types';
import {
  mergeNodePositionsIntoGraph,
  mergeKgPositionSources,
  loadKgLayoutFromLocalStorage,
  saveKgLayoutToLocalStorage,
  clearKgLayoutLocalStorage
} from '../../domain/services/knowledge-graph-layout';
import { FileSystemKnowledgeGraphService } from '../../infrastructure/services/knowledge-graph-file.service';
import { resolveFragmentReferenceJump } from '../../domain/services/knowledge-graph-fragment-jump';
import { readDocumentTextForKnowledgeJump } from '../utils/knowledge-graph-jump.util';

interface Props {
  document: DocumentResponse | null;
  renderMarkdown: (content: string, documentId?: string, variables?: Record<string, any>, fileCache?: any) => Promise<string>;
}

interface Emits {
  (e: 'update-document', id: string, title: string, content: string): void;
  (e: 'navigate-knowledge-jump', payload: { documentId: string; start: number; end: number }): void;
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
const focusSinkElement = ref<HTMLDivElement>(); // 隐藏的焦点接收器
const currentFilePath = ref<string>(''); // 当前打开的外部文件路径
const showPreview = ref(true); // 控制预览区的显示

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

// 快捷键系统（需要在顶层调用，确保内部的 onMounted 能正确执行）
useEditorShortcuts({
  editor: editorElement,
  content: mainContent,
  onContentUpdate: async (newContent, cursorPosition) => {
    // 当快捷键命令更新内容时，同步到编辑器
    mainContent.value = newContent;
    // 更新完整内容（包含 frontmatter），这样 renderContent 才能使用最新内容
    content.value = mergeContent(frontmatter.value, mainContent.value);
    hasChanges.value = true;

    // 等待响应式更新完成后再渲染预览
    await nextTick();
    // 重新渲染预览（确保使用最新内容）
    await renderContent();

    // 如果提供了光标位置，设置光标
    if (cursorPosition !== undefined && editorElement.value) {
      nextTick(() => {
        setCursorPosition(editorElement.value!, cursorPosition);
      });
    }
  }
});

// Mermaid编辑器相关状态
const showMermaidEditor = ref(false);
const currentMermaidCode = ref('');
const currentSelectionStart = ref(0);
const currentSelectionEnd = ref(0);

// 公式编辑器相关状态
const showFormulaEditor = ref(false);
const currentFormulaCode = ref('');
const currentFormulaType = ref<'inline' | 'block'>('inline');

// 知识图谱相关状态
const showKnowledgeGraphModal = ref(false);
const knowledgeGraphData = ref<KnowledgeGraph | null>(null);
const knowledgeGraphError = ref('');
const isKnowledgeGraphRendering = ref(false);
const isSampleMode = ref(false);
const kgLayoutRandomizeKey = ref(0);
const knowledgeGraphService = new FileSystemKnowledgeGraphService();

/** 工作3：文档编辑区右侧「推荐片段」面板 */
const showRecommendationPanel = ref(true);
/** 本会话内最近插入的片段 ID（用于推荐加权，最多保留 12 条） */
const recentInsertedFragmentIds = ref<string[]>([]);

function extractTagsFromFrontmatter(fm: string): string[] {
  if (!fm) return [];
  const lines = fm.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*tags?:\s*(.+)$/);
    if (m) {
      const v = m[1].trim();
      if (v.startsWith('[')) {
        try {
          const arr = JSON.parse(v.replace(/'/g, '"'));
          if (Array.isArray(arr)) return arr.map(String);
        } catch {
          /* ignore */
        }
      }
      return v.split(/[,\s]+/).filter(Boolean);
    }
  }
  return [];
}

function extractRefIdsFromMain(md: string): string[] {
  const ids = new Set<string>();
  const re = /\{\{ref:([^}:]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) ids.add(m[1].trim());
  return [...ids];
}

/** 正文关键词：去掉代码块与引用标记，避免把 JSON/代码 token 误当主题词 */
function extractContextKeywordsFromMain(md: string): string[] {
  if (!md) return [];
  let s = md.replace(/```[\s\S]*?```/g, '\n');
  s = s.replace(/\{\{ref:[^}]+\}\}/g, '\n');
  s = s.replace(/\[知识片段：[^\]]+\]/g, '\n');
  const raw = s
    .toLowerCase()
    .split(/[\s\n\r\t，。！？、；：""''（）【】\[\]\\/|,.!?;:]+/)
    .map(w => w.replace(/^[^a-z0-9\u4e00-\u9fff]+|[^a-z0-9\u4e00-\u9fff]+$/gi, ''))
    .filter(w => w.length >= 2 && w.length <= 32);
  const stop = new Set([
    'the',
    'and',
    'for',
    'with',
    'this',
    'that',
    'from',
    '的',
    '是',
    '在',
    '和',
    '与',
    '或',
    '等',
    '可以',
    '一个',
    '没有',
    '我们',
    '你们',
    '他们'
  ]);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of raw) {
    if (stop.has(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= 40) break;
  }
  return out;
}

const recommendationTitleKeywords = computed(() =>
  title.value.split(/[\s/\\._-]+/).filter(w => w.length > 1).slice(0, 24)
);
const recommendationDocumentTags = computed(() => extractTagsFromFrontmatter(frontmatter.value));
const recommendationReferencedIds = computed(() => extractRefIdsFromMain(mainContent.value));
const recommendationContextKeywords = computed(() => extractContextKeywordsFromMain(mainContent.value));

// 导出相关状态
const isExporting = ref(false);
const showExportConfigModal = ref(false);
const pendingExportFormat = ref<'pdf' | 'html' | 'markdown'>('pdf');
const currentExportConfig = ref<ExportConfig | null>(null);

// 进度条相关状态
const showExportProgress = ref(false);
const exportProgress = ref(0);
const exportStatus = ref<'processing' | 'success' | 'error'>('processing');
const exportStatusMessage = ref('');
const exportingFileName = ref('');
const exportingFormat = ref('');
const exportingSavePath = ref('');

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

// 文本格式化右键菜单状态
const textContextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  savedRange: Range | null;
}>({
  visible: false,
  x: 0,
  y: 0,
  savedRange: null
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastSavedTitle = '';
let lastSavedContent = '';

watch(() => props.document, (newDocument, oldDocument) => {
  // 清理光标状态：当文档切换或删除时，清除旧的 Selection
  // window.getSelection() 是全局单例，如果还持有对已删除 DOM 节点的引用，会导致光标不显示
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }

  // 重置光标位置状态
  currentSelectionStart.value = 0;
  currentSelectionEnd.value = 0;

  // 如果文档被删除（从有文档变为无文档），将焦点移到隐藏的焦点接收器
  // 这样可以避免 Selection 持有对已删除 DOM 节点的引用
  if (oldDocument && !newDocument) {
    nextTick(() => {
      if (focusSinkElement.value) {
        focusSinkElement.value.focus();
      }
    });
  }

  if (newDocument) {
    // 检查是否是外部文件（包含 filePath 属性）
    const filePath = (newDocument as any).filePath;

    // 如果是外部文件，保留 currentFilePath
    if (filePath) {
      currentFilePath.value = filePath;
    } else {
      // 数据库文档，清空外部文件路径
      currentFilePath.value = '';
    }

    title.value = newDocument.title;
    content.value = newDocument.content || '';
    lastSavedTitle = newDocument.title;
    lastSavedContent = newDocument.content || '';
    hasChanges.value = false;

    // 分离 frontmatter 和正文（关键：renderContent 使用 mainContent）
    const { frontmatter: fm, mainContent: main } = splitContent(newDocument.content || '');
    frontmatter.value = fm;
    mainContent.value = main;

    // 确保内容渲染
    nextTick(async () => {
    renderContent();
      // 更新编辑器内容（始终应用标注）
      const editor = editorElement.value;
      if (editor) {
        // 先确保焦点接收器没有焦点（如果之前删除文档时焦点在它上面）
        if (focusSinkElement.value && document.activeElement === focusSinkElement.value) {
          focusSinkElement.value.blur();
        }

        await applyEditorAnnotations();

        // 在新文档加载后，将光标设置到文档开头，确保光标可见
        // 使用 setTimeout 确保 DOM 已完全更新，特别是 applyEditorAnnotations 可能重新渲染了 DOM
        setTimeout(() => {
          if (editor && editor.textContent) {
            // 再次确保焦点接收器没有焦点（applyEditorAnnotations 可能改变了焦点状态）
            if (focusSinkElement.value && document.activeElement === focusSinkElement.value) {
              focusSinkElement.value.blur();
            }

            // 确保没有其他元素持有焦点
            if (document.activeElement && document.activeElement !== editor && document.activeElement !== document.body) {
              (document.activeElement as HTMLElement).blur();
            }

            // 先设置光标位置
            setCursorPosition(editor, 0);
            // 关键：让编辑器获得焦点，这样光标才会显示
            // 最小化/恢复窗口时能恢复光标，就是因为窗口恢复时会触发焦点事件
            editor.focus();
            // 再次设置光标位置，确保在获得焦点后光标位置正确
            setCursorPosition(editor, 0);
            // 更新焦点状态
            isEditorFocused.value = true;
          }
        }, 150); // 增加延迟时间，确保 applyEditorAnnotations 完全完成
      }
    });
  }
  // 当document为null时，需要清空编辑器内容
  // 如果之前有document，现在变为null，说明文档被删除了，必须清空
  else if (oldDocument && !newDocument) {
    // 文档被删除，强制清空所有内容
    title.value = '';
    content.value = '';
    frontmatter.value = '';
    mainContent.value = '';
    renderedContent.value = '';
    hasChanges.value = false;
    currentFilePath.value = ''; // 清空外部文件路径

    // 清理编辑器状态和DOM内容
    nextTick(() => {
      const editor = editorElement.value;
      if (editor) {
        // 先清理 Selection，避免持有对已删除 DOM 节点的引用
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }

        // 如果编辑器有焦点，先移除焦点
        if (document.activeElement === editor) {
          editor.blur();
        }

        // 清空编辑器DOM内容
        editor.textContent = '';
        editor.innerHTML = '';
        isEditorFocused.value = false;

        // 将焦点移到 body，而不是隐藏的焦点接收器
        // 这样可以确保后续点击编辑器时能正常获得焦点
        // 使用 setTimeout 确保在 nextTick 之后执行
        setTimeout(() => {
          // 确保焦点不在任何元素上，让焦点回到 body
          if (document.activeElement && document.activeElement !== document.body) {
            (document.activeElement as HTMLElement).blur();
          }
          // 如果焦点接收器有焦点，也移除
          if (focusSinkElement.value && document.activeElement === focusSinkElement.value) {
            focusSinkElement.value.blur();
          }
        }, 0);
      }
    });
  }
  // 如果既没有document也没有外部文件路径，且内容为空，也清空（兜底逻辑）
  else if (!currentFilePath.value && !content.value) {
    title.value = '';
    content.value = '';
    frontmatter.value = '';
    mainContent.value = '';
    renderedContent.value = '';
    hasChanges.value = false;
  }
}, { immediate: true });

let renderTimer: ReturnType<typeof setTimeout> | null = null;
let lastContent = '';

// 处理编辑器输入（从 contenteditable div）
const handleEditorInput = async (event: Event) => {
  const editor = editorElement.value;
  if (!editor) return;

  // 获取纯文本内容（移除所有HTML标签）
  let newMainContent = getTextContent(editor);

  // 检测并修复被破坏的引用格式
  // 如果文本中包含 [知识片段：标题] 格式，但mainContent中没有对应的引用标志，尝试恢复
  const linkedPlaceholderPattern = /\[知识片段：([^\]]+)\]/g;
  let match;
  const placeholders: Array<{ match: string; title: string; index: number }> = [];

  linkedPlaceholderPattern.lastIndex = 0;
  while ((match = linkedPlaceholderPattern.exec(newMainContent)) !== null) {
    placeholders.push({
      match: match[0],
      title: match[1] || '',
      index: match.index || 0
    });
  }

  // 如果找到了占位符，检查mainContent中是否有对应的引用标志
  if (placeholders.length > 0) {
    const { FragmentReferenceParser } = await import('../../domain/services/fragment-reference-parser.service');
    const parser = new FragmentReferenceParser();
    const references = parser.parseReferences(mainContent.value);

    // 从后往前替换，避免索引偏移问题
    for (let i = placeholders.length - 1; i >= 0; i--) {
      const placeholder = placeholders[i];
      if (!placeholder) continue;

      // 检查这个位置是否已经有引用标志
      const textBeforePlaceholder = newMainContent.substring(0, placeholder.index);
      const hasRefAtPosition = references.some(ref => {
        const textBeforeRef = mainContent.value.substring(0, ref.startIndex);
        return Math.abs(textBeforeRef.length - textBeforePlaceholder.length) < 50;
      });

      // 如果没有找到对应的引用标志，尝试从mainContent中查找
      if (!hasRefAtPosition) {
        // 尝试通过位置匹配来恢复引用
        let correspondingRef = null;
        for (const ref of references) {
          const textBeforeRef = mainContent.value.substring(0, ref.startIndex);
          if (Math.abs(textBeforeRef.length - textBeforePlaceholder.length) < 100) {
            correspondingRef = ref;
            break;
          }
        }

        if (correspondingRef && !correspondingRef.fragmentId.startsWith('placeholder:')) {
          // 找到了对应的引用，替换占位符
          const refTag = `{{ref:${correspondingRef.fragmentId}:${correspondingRef.mode}}}`;
          newMainContent = newMainContent.substring(0, placeholder.index) + refTag + newMainContent.substring(placeholder.index + placeholder.match.length);
        }
      }
    }
  }

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
  const processedElements = new Set<HTMLElement>(); // 用于跟踪已处理的标注元素，避免重复

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node: Node) => {
        // 对于标注元素，跳过其子节点，因为我们会在处理元素本身时获取文本
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.classList.contains('editor-reference') ||
              el.classList.contains('editor-mermaid') ||
              el.classList.contains('editor-code') ||
              el.classList.contains('editor-formula')) {
            // 如果这个元素已经被处理过，跳过其子节点
            if (processedElements.has(el)) {
              return NodeFilter.FILTER_REJECT; // 拒绝遍历子节点
            }
            return NodeFilter.FILTER_ACCEPT; // 接受元素本身，但会在处理时标记为已处理
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
      // 检查这个文本节点是否在已处理的标注元素内
      let parent = node.parentElement;
      let isInsideProcessedElement = false;
      while (parent && parent !== element) {
        if (processedElements.has(parent)) {
          isInsideProcessedElement = true;
          break;
        }
        parent = parent.parentElement;
      }

      // 如果文本节点不在已处理的标注元素内，才添加
      if (!isInsideProcessedElement) {
        text += node.textContent || '';
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 如果是引用标注span，需要还原为原始引用格式
      const el = node as HTMLElement;
      if (el.classList.contains('editor-reference')) {
        const fragmentId = el.getAttribute('data-fragment-id');
        const mode = el.getAttribute('data-mode') || 'linked';
        if (fragmentId && !fragmentId.startsWith('placeholder:')) {
          // 还原为原始引用格式
          text += `{{ref:${fragmentId}:${mode}}}`;
          // 标记为已处理，避免遍历子节点
          processedElements.add(el);
          continue;
        }
      }
      // 检查是否是其他标注元素，如果是，只获取其文本内容，不获取HTML
      if (el.classList.contains('editor-mermaid') ||
          el.classList.contains('editor-code') ||
          el.classList.contains('editor-formula')) {
        // 对于这些标注，只获取文本内容（不包含HTML标签）
        const textContent = el.textContent || '';
        text += textContent;
        // 标记为已处理，避免遍历子节点时重复获取
        processedElements.add(el);
        continue;
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
const handleEditorMouseDown = (event: MouseEvent) => {
  const editor = editorElement.value;
  if (!editor) return;

  // 如果编辑器没有焦点，确保它能获得焦点
  // 这很重要，特别是删除文档后，焦点可能在焦点接收器上
  if (!isEditorFocused.value || document.activeElement !== editor) {
    // 如果焦点在焦点接收器上，先移除
    if (focusSinkElement.value && document.activeElement === focusSinkElement.value) {
      focusSinkElement.value.blur();
    }
    // 确保没有其他元素持有焦点
    if (document.activeElement && document.activeElement !== editor && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur();
    }
    // 让编辑器获得焦点
    editor.focus();
    // 更新焦点状态
    isEditorFocused.value = true;
  }

  // 如果编辑器有焦点，保存当前光标位置
  if (isEditorFocused.value || document.activeElement === editor) {
    // 使用 nextTick 确保焦点已经设置完成
    nextTick(() => {
      const { start, end } = getCursorPosition(editor);
      currentSelectionStart.value = start;
      currentSelectionEnd.value = end;
    });
  }
};

// 处理编辑器失去焦点（精简版：只做状态标记，不再重建 DOM）
const handleEditorBlur = () => {
  isEditorFocused.value = false;
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

        // 批量获取片段标题（使用 Promise.all 并行获取，提高性能）
        const titlePromises = references.map(async (ref) => {
          try {
            const fragment = await fragmentUseCases.getFragment(ref.fragmentId);
            if (fragment && fragment.title) {
              return { fragmentId: ref.fragmentId, title: fragment.title };
            }
          } catch (error) {
            // 忽略单个片段获取失败
            console.warn(`无法获取片段 ${ref.fragmentId} 的标题:`, error);
          }
          return null;
        });

        const titleResults = await Promise.all(titlePromises);
        titleResults.forEach(result => {
          if (result) {
            fragmentTitles.set(result.fragmentId, result.title);
          }
        });
      } catch (error) {
        console.error('[标注] 获取知识片段标题失败:', error);
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
          // 设置contenteditable="false"防止用户直接编辑引用文本
          const spanHtml = `<span class="${className}" title="${title}" data-start="${ann.start}" data-end="${ann.end}" ${dataAttrs} ${inlineStyle} contenteditable="false">${escapeHtml(displayText)}</span>`;
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
    } else {
      // 即使没有标注，也使用innerHTML以确保格式正确
      editor.innerHTML = escapeHtml(mainContent.value).replace(/\n/g, '<br>');
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
  // 如果工具栏操作正在进行，不检查更改
  // 避免从编辑器读取旧内容覆盖新的格式化内容
  if (isToolbarOperation) {
    console.log('[checkChanges] 工具栏操作中，跳过更改检查');
    // 但仍然需要标记为已更改
    hasChanges.value = true;
    return;
  }

  // 确保使用最新的内容（从编辑器获取，而不是使用缓存的content.value）
  const editor = editorElement.value;
  let currentContent = content.value;

  // 如果编辑器存在，从编辑器获取最新内容
  if (editor) {
    const currentMainContent = getTextContent(editor);
    currentContent = mergeContent(frontmatter.value, currentMainContent);
    // 更新content.value以保持同步
    if (currentContent !== content.value) {
      mainContent.value = currentMainContent;
      content.value = currentContent;
    }
  }

  const titleChanged = title.value !== lastSavedTitle;
  const contentChanged = currentContent !== lastSavedContent;
  hasChanges.value = titleChanged || contentChanged;
  
  console.log('[实时保存] checkChanges 结果:', {
    titleChanged,
    contentChanged,
    hasChanges: hasChanges.value,
    currentContentLength: currentContent.length,
    lastSavedContentLength: lastSavedContent.length
  });
};

// 标志位：工具栏操作是否正在进行
let isToolbarOperation = false;

// 处理工具栏内容更新
const handleToolbarUpdate = (newContent: string) => {
  console.log('[handleToolbarUpdate] ========== 开始处理 ==========');
  console.log('[handleToolbarUpdate] 接收到的新内容:', newContent);
  console.log('[handleToolbarUpdate] 当前 mainContent.value:', mainContent.value);
  console.log('[handleToolbarUpdate] 内容是否相同:', newContent === mainContent.value);
  console.log('[handleToolbarUpdate] 内容长度对比:', {
    newLength: newContent.length,
    oldLength: mainContent.value.length
  });

  // 设置标志位，阻止 handleEditorBlur 覆盖内容
  isToolbarOperation = true;
  console.log('[handleToolbarUpdate] 设置 isToolbarOperation = true');

  // 更新主内容
  console.log('[handleToolbarUpdate] 准备更新 mainContent.value');
  mainContent.value = newContent;
  console.log('[handleToolbarUpdate] mainContent.value 已更新:', mainContent.value);

  // 合并 frontmatter 和主内容
  console.log('[handleToolbarUpdate] 准备更新 content.value (完整内容)');
  content.value = mergeContent(frontmatter.value, mainContent.value);
  console.log('[handleToolbarUpdate] content.value 已更新:', content.value);

  // 更新编辑器显示
  console.log('[handleToolbarUpdate] 准备在 nextTick 中更新编辑器 DOM');
  nextTick(() => {
    const editor = editorElement.value;
    console.log('[handleToolbarUpdate] nextTick 回调执行');
    console.log('[handleToolbarUpdate] editorElement.value:', editor);
    console.log('[handleToolbarUpdate] 当前 mainContent.value:', mainContent.value);
    console.log('[handleToolbarUpdate] mainContent.value 类型:', typeof mainContent.value);
    console.log('[handleToolbarUpdate] mainContent.value 长度:', mainContent.value.length);

    if (editor) {
      console.log('[handleToolbarUpdate] 更新编辑器前', {
        editorTextContent: editor.textContent,
        editorInnerHTML: editor.innerHTML,
        mainContentValue: mainContent.value,
        mainContentLength: mainContent.value.length
      });

      console.log('[handleToolbarUpdate] 执行 editor.textContent = mainContent.value');
      editor.textContent = mainContent.value;

      console.log('[handleToolbarUpdate] 更新编辑器后', {
        editorTextContent: editor.textContent,
        editorInnerHTML: editor.innerHTML,
        textContentLength: editor.textContent?.length
      });

      // 短暂延迟后清除标志位，确保 DOM 更新完成
      console.log('[handleToolbarUpdate] 设置 100ms 后清除 isToolbarOperation');
      setTimeout(() => {
        console.log('[handleToolbarUpdate] 清除 isToolbarOperation = false');
        isToolbarOperation = false;
      }, 100);
    } else {
      console.error('[handleToolbarUpdate] editorElement.value 为 null，无法更新编辑器');
    }
  });

  // 渲染预览
  console.log('[handleToolbarUpdate] 准备调用 renderContent()');
  renderContent();

  // 检查更改并保存
  console.log('[handleToolbarUpdate] 准备调用 checkChanges() 和 debouncedSave()');
  checkChanges();
  debouncedSave();
  console.log('[handleToolbarUpdate] ========== 处理结束 ==========');
};

const debouncedSave = () => {
  console.log('[实时保存] debouncedSave 被调用');
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    console.log('[实时保存] 延迟结束，准备保存');
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
  console.log('[实时保存] saveDocument 被调用', {
    hasChanges: hasChanges.value,
    currentFilePath: currentFilePath.value,
    hasDocument: !!props.document
  });
  
  if (!hasChanges.value) {
    console.log('[实时保存] 没有变化，跳过保存');
    return;
  }

  // 如果有外部文件路径，保存到文件系统
  if (currentFilePath.value) {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.file && electronAPI.file.writeFileContent) {
        // 确保使用最新的内容（从编辑器获取，而不是使用缓存的content.value）
        const editor = editorElement.value;
        const currentMainContent = editor ? getTextContent(editor) : mainContent.value;
        let contentToSave = mergeContent(frontmatter.value, currentMainContent);
        const cache = await electronAPI.file.getFileCache?.(currentFilePath.value);

        // 更新content.value和mainContent.value以保持同步
        mainContent.value = currentMainContent;
        content.value = contentToSave;

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
        console.log('[实时保存] 外部文件保存成功:', currentFilePath.value);
        return;
      } else {
        console.error('[保存] electronAPI.file.writeFileContent 不可用');
      }
    } catch (error) {
      console.error('[保存] 保存文件失败:', error);
      // 即使保存失败，也不要更新 lastSavedContent，这样下次还会尝试保存
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
    console.log('[实时保存] 数据库文档保存成功:', props.document.id);
  } catch (error) {
      console.error('[保存] 保存数据库文档失败:', error);
      // 即使保存失败，也不要更新 lastSavedContent，这样下次还会尝试保存
    }
  } else {
    console.warn('[实时保存] 既没有 currentFilePath 也没有 document，无法保存');
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
        // 优先使用 filePath（外部文件），否则使用 id（数据库文档）
        const actualPath = (props.document as any).filePath || props.document.id;
        docId = actualPath;
        docPath = actualPath;
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

        const result = await (variableUseCases as any).getVariables({
          documentPath: docPath,
          documentContent: fullContent
        });

        variables = result.variables;
      } catch (error) {
        console.error('[渲染] 获取变量失败:', error);
        // 如果获取变量失败，使用空对象
        variables = {};
      }

      // 在渲染前直接在文本层面替换变量
      let processedContent = mainContent.value;

      // 匹配 {{variableName}} 格式（但不匹配 {{ref:xxx}} 格式）
      // 使用负向前瞻确保不匹配 {{ref: 开头的变量
      // 变量名不能包含冒号，这样可以避免匹配 {{ref:xxx}} 格式
      const variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

      processedContent = processedContent.replace(variablePattern, (match, varName, offset) => {
        // 检查是否是引用标志（{{ref:xxx}} 格式）
        // 通过检查匹配位置前后的字符来判断
        const beforeMatch = processedContent.substring(Math.max(0, offset - 10), offset);
        const afterMatch = processedContent.substring(offset + match.length, offset + match.length + 10);

        // 如果匹配的是 {{ref: 格式，跳过
        if (beforeMatch.includes('{{ref:') || match.includes('ref:')) {
          return match;
        }

        if (variables.hasOwnProperty(varName)) {
          const value = variables[varName];
          return String(value);
        }
        return match; // 变量不存在，保持原样
      });

      // 渲染已替换变量的内容（不传递变量给 markdown 处理器）
      // renderMarkdown 会调用 resolveReferences 来解析引用标志
      // 尝试从文件缓存读取，传递给 renderMarkdown 以提高性能
      let fileCache = null;
      if (docId && (docId.includes('/') || docId.includes('\\'))) {
        try {
          const electronAPI = (window as any).electronAPI;
          if (electronAPI && electronAPI.file && electronAPI.file.getFileCache) {
            fileCache = await electronAPI.file.getFileCache(docId);
          }
        } catch (error) {
          // 缓存读取失败不影响渲染
        }
      }

      const newRenderedContent = await props.renderMarkdown(processedContent, docId, fileCache);

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
          previewElement.value = nextPreviewElement.value || undefined;

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

  // 添加点击外部关闭右键菜单的事件监听
  document.addEventListener('click', handleClickOutside);

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
  // 移除点击外部关闭右键菜单的事件监听
  document.removeEventListener('click', handleClickOutside);

  // 组件卸载前，如果有未保存的更改，强制保存
  if (hasChanges.value) {
    // 清除防抖定时器，立即保存
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    // 同步保存（不使用 await，因为 onUnmounted 不支持异步）
    saveDocument().catch(error => {
      console.error('[组件卸载] 保存失败:', error);
    });
  }
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
    return;
  }

    // 确保位置在有效范围内
    const textContent = element.textContent || '';
    const maxPosition = textContent.length;
    const validPosition = Math.max(0, Math.min(position, maxPosition));

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
        if (lastNode) {
          const lastLength = lastNode.textContent?.length || 0;
          range.setStart(lastNode, lastLength);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  } catch (error) {
    console.error('[光标位置设置失败]', error);
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

  // 强制获取当前光标位置（必须在编辑器失去焦点之前）
  let start = 0;
  let end = 0;

  try {
    // 总是尝试获取当前光标位置，无论编辑器是否有焦点
    const position = getCursorPosition(editor);
    if (position.start >= 0 && position.end >= 0) {
      start = position.start;
      end = position.end;
      console.log('[Mermaid编辑器] 获取到光标位置:', { start, end });
    } else {
      // 如果获取失败，使用保存的位置
      start = currentSelectionStart.value;
      end = currentSelectionEnd.value;
      console.log('[Mermaid编辑器] 使用保存的光标位置:', { start, end });
    }
  } catch (e) {
    console.warn('[Mermaid编辑器] 获取光标位置失败，使用保存的位置:', e);
    start = currentSelectionStart.value;
    end = currentSelectionEnd.value;
  }

  // 确保位置在有效范围内
  const validStart = Math.max(0, Math.min(start, mainContent.value.length));
  const validEnd = Math.max(validStart, Math.min(end, mainContent.value.length));

  console.log('[Mermaid编辑器] 有效光标位置:', { validStart, validEnd, contentLength: mainContent.value.length });

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
  if (currentEditorText !== mainContent.value) {
    mainContent.value = currentEditorText;
    content.value = mergeContent(frontmatter.value, mainContent.value);
  }

  // 强制获取当前光标位置（必须在编辑器失去焦点之前）
  let start = 0;
  let end = 0;

  try {
    // 总是尝试获取当前光标位置，无论编辑器是否有焦点
    const position = getCursorPosition(editor);
    if (position.start >= 0 && position.end >= 0) {
      start = position.start;
      end = position.end;
      console.log('[公式编辑器] 获取到光标位置:', { start, end });
    } else {
      // 如果获取失败，使用保存的位置
      start = currentSelectionStart.value;
      end = currentSelectionEnd.value;
      console.log('[公式编辑器] 使用保存的光标位置:', { start, end });
    }
  } catch (e) {
    console.warn('[公式编辑器] 获取光标位置失败，使用保存的位置:', e);
    start = currentSelectionStart.value;
    end = currentSelectionEnd.value;
  }

  // 确保位置在有效范围内
  const validStart = Math.max(0, Math.min(start, mainContent.value.length));
  const validEnd = Math.max(validStart, Math.min(end, mainContent.value.length));

  console.log('[公式编辑器] 有效光标位置:', { validStart, validEnd, contentLength: mainContent.value.length });

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

const handleFormulaSave = async (formulaData: { latexCode: string; formulaType: 'inline' | 'block' } | string) => {
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

  // 使用 mainContent 进行操作，因为编辑器显示的是 mainContent
  let newMainContent = mainContent.value;

  // 根据公式类型格式化代码
  let formattedFormula = formulaType === 'block'
    ? `$$${latexCode}$$`
    : `$${latexCode}$`;

  // 确保位置有效
  const validStart = Math.max(0, Math.min(start, newMainContent.length));
  const validEnd = Math.max(validStart, Math.min(end, newMainContent.length));

  // 对于块级公式，需要确保前后有空行
  if (formulaType === 'block') {
    const textBefore = newMainContent.substring(0, validStart);
    const textAfter = newMainContent.substring(validEnd);

    // 检查前面是否需要空行
    // 如果不在文档开头，且前面不是两个换行符（空行），则添加换行
    let prefixNewlines = '';
    if (textBefore.length > 0) {
      // 检查前面是否已有足够的换行（至少一个空行）
      if (!textBefore.endsWith('\n\n')) {
        if (textBefore.endsWith('\n')) {
          // 如果只有一个换行，再添加一个
          prefixNewlines = '\n';
        } else {
          // 如果没有换行，添加两个（形成空行）
          prefixNewlines = '\n\n';
        }
      }
    }

    // 检查后面是否需要空行
    let suffixNewlines = '';
    if (textAfter.length > 0) {
      // 检查后面是否已有足够的换行（至少一个空行）
      if (!textAfter.startsWith('\n\n')) {
        if (textAfter.startsWith('\n')) {
          // 如果只有一个换行，再添加一个
          suffixNewlines = '\n';
        } else {
          // 如果没有换行，添加两个（形成空行）
          suffixNewlines = '\n\n';
        }
      }
    }

    // 更新格式化后的公式，包含必要的空行
    formattedFormula = prefixNewlines + formattedFormula + suffixNewlines;
  }

  // 计算新的光标位置（插入公式后的位置）
  let newCursorPosition = validStart + formattedFormula.length;

  // 替换或插入公式
  if (validStart !== validEnd && validStart < newMainContent.length && validEnd <= newMainContent.length) {
    newMainContent = newMainContent.substring(0, validStart) + formattedFormula + newMainContent.substring(validEnd);
  } else {
    newMainContent = newMainContent.substring(0, validStart) + formattedFormula + newMainContent.substring(validStart);
  }

  // 更新 mainContent 和完整 content
  mainContent.value = newMainContent;
  content.value = mergeContent(frontmatter.value, mainContent.value);

  // 关闭编辑器对话框
  closeFormulaEditor();

  // 更新编辑器显示（使用与 Mermaid 相同的方式）
  const wasFocused = isEditorFocused.value;
  isEditorFocused.value = false;

  // 应用标注（异步等待完成）
  await applyEditorAnnotations();

  // 等待DOM更新
  await nextTick();

  // 设置光标位置
  setCursorPosition(editor, newCursorPosition);

  // 更新保存的光标位置
  currentSelectionStart.value = newCursorPosition;
  currentSelectionEnd.value = newCursorPosition;

  // 给编辑器焦点
  editor.focus();
  
  // 恢复焦点状态
  if (wasFocused) {
    isEditorFocused.value = true;
  }

  checkChanges();
  renderContent();
};

const closeFormulaEditor = () => {
  showFormulaEditor.value = false;
  currentFormulaCode.value = '';
};

function getKnowledgeGraphDocKey(): string {
  if (isSampleMode.value) return 'sample';
  return props.document?.id || currentFilePath.value || 'untitled';
}

const onKnowledgeGraphUpdate = (g: KnowledgeGraph) => {
  knowledgeGraphData.value = g;
  const key = getKnowledgeGraphDocKey();
  if (g.nodePositions && key) {
    saveKgLayoutToLocalStorage(key, g.nodePositions);
  }
};

const onKnowledgeGraphJumpToFragment = async (payload: { fragmentId: string }) => {
  try {
    const application = Application.getInstance();
    await application.getApplicationService().initialize();
    const fragmentUseCases = application.getKnowledgeFragmentUseCases();
    const target = await resolveFragmentReferenceJump(payload.fragmentId, {
      getFragment: async (id) => {
        const f = await fragmentUseCases.getFragment(id);
        if (!f) return null;
        return {
          sourceDocumentId: f.sourceDocumentId,
          referencedDocuments: f.referencedDocuments
        };
      },
      readDocumentText: readDocumentTextForKnowledgeJump
    });
    if (!target) return;
    const docId = props.document?.id ?? '';
    const filePath = (props.document as { filePath?: string } | null)?.filePath ?? currentFilePath.value;
    const sameVault = docId && docId === target.documentId;
    const sameFile =
      filePath &&
      (target.documentId === filePath ||
        target.documentId.replace(/^file:/, '') === filePath.replace(/^file:/, ''));
    if (sameVault || sameFile) {
      await nextTick();
      setSelectionRange(target.start, target.end);
      return;
    }
    emit('navigate-knowledge-jump', {
      documentId: target.documentId,
      start: target.start,
      end: target.end
    });
  } catch (e) {
    console.error('[知识图谱] 按片段跳转失败', e);
  }
};

const randomizeKnowledgeGraphLayout = () => {
  if (!knowledgeGraphData.value) return;
  const { nodePositions: _np, ...rest } = knowledgeGraphData.value;
  knowledgeGraphData.value = { ...rest };
  clearKgLayoutLocalStorage(getKnowledgeGraphDocKey());
  kgLayoutRandomizeKey.value += 1;
};

// 知识图谱相关方法
const openKnowledgeGraph = () => {
  showKnowledgeGraphModal.value = true;
  const fullContent = getContent();
  if (!fullContent || !fullContent.trim()) {
    const merged = mergeNodePositionsIntoGraph(sampleKnowledgeGraph, loadKgLayoutFromLocalStorage('sample'));
    knowledgeGraphData.value = merged;
    knowledgeGraphError.value = '';
    isSampleMode.value = true;
    isKnowledgeGraphRendering.value = false;
    return;
  }
  isSampleMode.value = false;
  knowledgeGraphError.value = '';
  isKnowledgeGraphRendering.value = true;
  knowledgeGraphData.value = null;
  try {
    const graph = extractKnowledgeGraph(fullContent);
    const docKey = props.document?.id || currentFilePath.value || 'untitled';
    knowledgeGraphData.value = mergeNodePositionsIntoGraph(graph, loadKgLayoutFromLocalStorage(docKey));
  } catch (e) {
    knowledgeGraphError.value = e instanceof Error ? e.message : '生成知识图谱失败';
    knowledgeGraphData.value = null;
  } finally {
    isKnowledgeGraphRendering.value = false;
  }
};

const showSampleGraph = () => {
  knowledgeGraphData.value = mergeNodePositionsIntoGraph(sampleKnowledgeGraph, loadKgLayoutFromLocalStorage('sample'));
  knowledgeGraphError.value = '';
  isSampleMode.value = true;
};

const closeKnowledgeGraph = () => {
  showKnowledgeGraphModal.value = false;
  knowledgeGraphData.value = null;
  knowledgeGraphError.value = '';
  isSampleMode.value = false;
};

const saveKnowledgeGraph = async () => {
  try {
    const docKeyForLayout = () =>
      isSampleMode.value ? 'sample' : props.document?.id || currentFilePath.value || 'untitled';

    if (isSampleMode.value && knowledgeGraphData.value) {
      const graphToSave = mergeKgPositionSources(
        knowledgeGraphData.value,
        knowledgeGraphData.value.nodePositions,
        loadKgLayoutFromLocalStorage('sample')
      );
      await knowledgeGraphService.saveGraph({
        title: '样例：数据结构知识图谱',
        documentId: null,
        documentTitle: null,
        graph: graphToSave
      });
      knowledgeGraphError.value = '';
      return;
    }
    const fullContent = getContent();
    if (!fullContent || !fullContent.trim()) {
      knowledgeGraphError.value = '当前文档为空，无法保存知识图谱';
      return;
    }
    const titleToUse = title.value || '未命名图谱';
    const documentId = props.document?.id ?? null;
    const documentTitle = title.value || (props.document?.title ?? null);
    const graphWithOccurrences = extractKnowledgeGraph(fullContent, {
      documentId: documentId ?? undefined,
      documentTitle: documentTitle ?? undefined
    });
    const graphToSave = mergeKgPositionSources(
      graphWithOccurrences,
      knowledgeGraphData.value?.nodePositions,
      loadKgLayoutFromLocalStorage(docKeyForLayout())
    );
    await knowledgeGraphService.saveGraph({
      title: titleToUse,
      documentId,
      documentTitle,
      graph: graphToSave
    });
    knowledgeGraphError.value = '';
  } catch (e) {
    knowledgeGraphError.value = e instanceof Error ? e.message : '保存知识图谱失败';
  }
};

// 导出相关方法
const handleExport = async (format: 'pdf' | 'html' | 'markdown') => {
  // 检查是否有文档或外部文件
  if ((!props.document && !currentFilePath.value) || isExporting.value) {
    return;
  }

  // Markdown 导出不需要配置，直接导出
  if (format === 'markdown') {
    await performExport(format, null);
    return;
  }

  // PDF 和 HTML 导出需要配置
  pendingExportFormat.value = format;
  showExportConfigModal.value = true;
};

// 获取默认文件名（使用文件名而非标题）
const getDefaultFileName = (): string => {
  // 优先使用当前文件路径的文件名
  if (currentFilePath.value) {
    const pathParts = currentFilePath.value.split(/[/\\]/);
    const fileName = pathParts[pathParts.length - 1];
    // 移除扩展名
    return fileName.replace(/\.(md|markdown|txt)$/i, '');
  }

  // 其次使用文档标题
  if (title.value) {
    return title.value;
  }

  // 最后使用默认名称
  return '未命名文档';
};

// 处理导出配置确认
const handleExportConfigConfirm = async (config: ExportConfig, fileName: string, savePath: string) => {
  showExportConfigModal.value = false;
  currentExportConfig.value = config;
  exportingFileName.value = fileName;
  exportingSavePath.value = savePath;
  exportingFormat.value = pendingExportFormat.value;

  // 显示进度条
  showExportProgress.value = true;
  exportProgress.value = 0;
  exportStatus.value = 'processing';
  exportStatusMessage.value = '正在准备导出...';

  try {
    await performExport(pendingExportFormat.value, config, fileName, savePath);
  } catch (error) {
    exportStatus.value = 'error';
    exportStatusMessage.value = '导出失败: ' + (error instanceof Error ? error.message : '未知错误');
  }
};

// 处理导出配置取消
const handleExportConfigCancel = () => {
  showExportConfigModal.value = false;
};

// 执行实际的导出操作
const performExport = async (format: 'pdf' | 'html' | 'markdown', config: ExportConfig | null, fileName?: string, savePath?: string) => {
  isExporting.value = true;

  // 更新进度：10%
  exportProgress.value = 10;
  exportStatusMessage.value = '正在处理文档内容...';

  try {
    const app = Application.getInstance();
    const { ExportFormat } = await import('../../domain/services/document-export.interface');
    const { ExportFactory } = await import('../../infrastructure/services/export-factory.service');

    let exportFormat;
    switch (format) {
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

      // 确定文档 ID 和类型
      // 对于外部文档（ID 以 external- 开头），使用文件路径而不是 ID
      const isExternalDoc = props.document?.id?.startsWith?.('external-');
      let documentId = isExternalDoc ? currentFilePath.value : (props.document?.id || currentFilePath.value);

      console.log('[Export] PDF 导出 - 文档信息:', {
        hasDocument: !!props.document,
        documentId: documentId,
        isExternalDoc: isExternalDoc,
        currentFilePath: currentFilePath.value
      });

      // 准备数据
      let processedContent = documentContent;

      // 处理片段引用（对于所有文档类型）
      const { InversifyContainer } = await import('../../core/container/inversify.container');
      const container = InversifyContainer.getInstance();

      try {
        if (container.isBound(TYPES.FragmentReferenceResolver)) {
          const resolver = container.get<any>(TYPES.FragmentReferenceResolver);
          if (resolver && typeof resolver.resolveReferences === 'function') {
            processedContent = await resolver.resolveReferences(processedContent, documentId);
          }
        }
      } catch (error) {
        console.warn('解析片段引用失败，使用原始内容:', error);
      }

      // 准备 HTML 内容（渲染进程中处理 Markdown 和资源）
      const exportFactory = container.get<any>(TYPES.ExportFactory);
      const htmlExporter = exportFactory.getExporter(ExportFormat.HTML);

      // 更新进度：30%
      exportProgress.value = 30;
      exportStatusMessage.value = '正在生成 HTML...';

      // 先导出为 HTML（包含所有样式和资源）
      const htmlResult = await htmlExporter.export({
        format: ExportFormat.HTML,
        title: documentTitle,
        content: processedContent,
        documentId: documentId,
        variables: {},
        includeStyles: true,
        config: config
      });

      // 更新进度：60%
      exportProgress.value = 60;
      exportStatusMessage.value = '正在生成 PDF...';

      // 将 HTML buffer 转换为字符串
      const htmlString = new TextDecoder('utf-8').decode(htmlResult.buffer);

      // 通过 IPC 调用主进程的 PDF 导出（传递完整的 HTML）
      const pdfResult = await electronAPI.export.pdf({
        title: documentTitle,
        html: htmlString,
        filename: fileName || documentTitle  // 传递实际文件名用于日志
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
      // 其他格式（HTML、Markdown）在渲染进程中处理
      // 判断是否是外部文档
      const isExternalDoc = props.document?.id?.startsWith?.('external-');

      console.log('[Export] HTML/Markdown 导出 - 文档信息:', {
        hasDocument: !!props.document,
        documentId: props.document?.id,
        isExternalDoc: isExternalDoc,
        currentFilePath: currentFilePath.value
      });

      // 如果是数据库文档（非外部文档），使用 ExportUseCases
      if (props.document && !isExternalDoc) {
        const exportUseCases = app.getExportUseCases() as any;
        result = await exportUseCases.exportDocument({
          documentId: props.document.id,
          format: exportFormat,
          variables: {}, // 可以添加变量支持
          config: config
        });
      } else {
        // 外部文件或外部文档：直接使用 ExportFactory 和导出器
        const { InversifyContainer } = await import('../../core/container/inversify.container');
        const container = InversifyContainer.getInstance();

        if (!container || !container.isBound(TYPES.ExportFactory)) {
          throw new Error('导出服务未初始化，请确保应用已正确启动');
        }

        const exportFactory = container.get<any>(TYPES.ExportFactory);
        const exporter = exportFactory.getExporter(exportFormat);

        // 确定文档 ID（外部文档使用文件路径）
        const isExternalDoc = props.document?.id?.startsWith?.('external-');
        const documentId = isExternalDoc ? currentFilePath.value : currentFilePath.value;

        // 处理片段引用（如果有）
        let processedContent = documentContent;
        try {
          if (container.isBound(TYPES.FragmentReferenceResolver)) {
            const resolver = container.get<any>(TYPES.FragmentReferenceResolver);
            if (resolver && typeof resolver.resolveReferences === 'function') {
              processedContent = await resolver.resolveReferences(processedContent, documentId);
            }
          }
        } catch (error) {
          console.warn('解析片段引用失败，使用原始内容:', error);
        }

        // 更新进度：50%
        exportProgress.value = 50;
        exportStatusMessage.value = '正在生成文档...';

        // 执行导出
        result = await exporter.export({
          format: exportFormat,
          title: documentTitle,
          content: processedContent,
          documentId: documentId,
          variables: {},
          includeStyles: true,
          config: config
        });
      }
    }

    // 更新进度：80%
    exportProgress.value = 80;
    exportStatusMessage.value = '正在保存文件...';

    // 保存文件到指定路径
    if (savePath) {
      await saveExportFileToPath(result, savePath);
    } else {
      await saveExportFile(result, format);
    }

    // 更新进度：100%
    exportProgress.value = 100;
    exportStatus.value = 'success';
    exportStatusMessage.value = '导出成功！';
  } catch (error) {
    console.error('导出失败:', error);
    exportProgress.value = 100;
    exportStatus.value = 'error';
    exportStatusMessage.value = '导出失败: ' + (error instanceof Error ? error.message : '未知错误');
    throw error;
  } finally {
    isExporting.value = false;
  }
};

// 保存文件到指定路径
const saveExportFileToPath = async (result: any, filePath: string) => {
  const electronAPI = (window as any).electronAPI;

  if (!electronAPI || !electronAPI.file || !electronAPI.file.writeBinary) {
    throw new Error('文件写入功能需要在 Electron 环境中运行');
  }

  try {
    // 处理 buffer（可能是 Buffer 或 ArrayBuffer）
    let arrayBuffer: ArrayBuffer;
    if (result.buffer instanceof ArrayBuffer) {
      arrayBuffer = result.buffer;
    } else if (result.buffer instanceof Uint8Array) {
      arrayBuffer = result.buffer.buffer.slice(
        result.buffer.byteOffset,
        result.buffer.byteOffset + result.buffer.byteLength
      );
    } else {
      // 尝试从 buffer 对象创建 ArrayBuffer
      arrayBuffer = result.buffer;
    }

    // 写入文件
    await electronAPI.file.writeBinary(filePath, arrayBuffer);
  } catch (error) {
    console.error('保存文件失败:', error);
    throw new Error('保存文件失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const saveExportFile = async (result: any, format: string) => {
  // 检查是否在Electron环境中
  const electronAPI = (window as any).electronAPI;

  if (electronAPI && electronAPI.dialog && electronAPI.dialog.saveFile) {
    // Electron环境：使用保存对话框
    const filters = [];
    switch (format) {
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
      // 使用 getTextContent 的逻辑来计算位置，确保与编辑器内容一致
      return calculateTextLength(element, selRange.startContainer, selRange.startOffset);
    }
    // 如果没有选择，返回编辑器文本的末尾位置
    const editorText = getTextContent(element);
    return editorText.length;
  }

  // 使用 calculateTextLength 来计算位置，确保与 getTextContent 的逻辑一致
  return calculateTextLength(element, range.startContainer, range.startOffset);
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

// 编辑器拖拽开始（保存选中内容的源代码）
const handleEditorDragStart = (event: DragEvent) => {
  const editor = editorElement.value;
  if (!editor || !event.dataTransfer) {
    return;
  }

  // 获取选中内容的源代码
  const sourceCode = getSelectedSourceCode();
  
  if (sourceCode && sourceCode.trim()) {
    // 将源代码保存到 dataTransfer 的自定义数据中
    event.dataTransfer.setData('text/x-markdown-source', sourceCode);
    console.log('[MarkdownEditor] 拖拽开始，保存源代码:', sourceCode.substring(0, 100));
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
  console.log('[MarkdownEditor] handleEditorDrop called');
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = false;

  // 支持外部文件和数据库文档
  if (!props.document && !currentFilePath.value) {
    console.log('[MarkdownEditor] No document or file path, showing alert');
    alert('请先打开一个文档或文件');
    return;
  }

  console.log('[MarkdownEditor] Document:', props.document, 'CurrentFilePath:', currentFilePath.value);

  // 获取鼠标位置的文本位置
  const editor = editorElement.value;
  if (!editor) {
    console.log('[MarkdownEditor] Editor element not found');
    return;
  }

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
    console.log('[MarkdownEditor] Fragment drag detected:', fragmentId);
    // 处理知识片段拖拽，使用计算出的位置
    await handleInsertFragmentAtPosition(fragmentId, textPosition);
    return;
  }

  // 处理文件拖拽
  console.log('[MarkdownEditor] Processing file drop');
  await handleDrop(event);
};

// 包装的handleDrop用于文件拖拽
const handleDrop = async (event: DragEvent) => {
  console.log('[MarkdownEditor] handleDrop called');

  const files = event.dataTransfer?.files;
  console.log('[MarkdownEditor] Dropped files:', files ? Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size })) : 'null');

  if (!files || files.length === 0) {
    console.log('[MarkdownEditor] No files in drop event');
    return;
  }

  // 获取光标位置
  const editor = editorElement.value;
  if (!editor) {
    console.log('[MarkdownEditor] Editor element not found in handleDrop');
    return;
  }

  const { start: cursorPosition } = getCursorPosition(editor);
  console.log('[MarkdownEditor] Cursor position:', cursorPosition);

  try {
    let imagePaths: string[] = [];

    // 获取实际的文件路径（外部文件用 filePath，数据库文档用 id）
    const actualFilePath = (props.document as any)?.filePath || currentFilePath.value;
    const isExternalFile = actualFilePath && (actualFilePath.includes('/') || actualFilePath.includes('\\'));
    console.log('[MarkdownEditor] Actual file path:', actualFilePath, 'Is external:', isExternalFile);

    if (isExternalFile) {
      // 外部文件：使用文件路径的目录部分
      const fileDir = actualFilePath.split(/[/\\]/).slice(0, -1).join('/');
      const assetsDir = `${fileDir}/assets`;
      console.log('[MarkdownEditor] External file - fileDir:', fileDir, 'assetsDir:', assetsDir);

      // 确保assets目录存在
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.file && electronAPI.file.mkdir) {
        try {
          await electronAPI.file.mkdir(assetsDir);
          console.log('[MarkdownEditor] Assets directory created/verified');
        } catch (error) {
          console.log('[MarkdownEditor] Assets directory creation error (may already exist):', error);
          // 目录可能已存在，忽略错误
        }
      }

      // 使用FileSystemImageStorageService直接保存到文件系统
      const { FileSystemImageStorageService } = await import('../../infrastructure/services/image-storage.service');
      const imageStorage = new FileSystemImageStorageService();

      // 使用文件目录作为documentId（需要特殊处理）
      const tempDocId = `file:${fileDir}`;
      console.log('[MarkdownEditor] Using tempDocId:', tempDocId);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        console.log('[MarkdownEditor] Processing file:', file.name, 'type:', file.type);
        if (file.type.startsWith('image/')) {
          console.log('[MarkdownEditor] Saving image:', file.name);
          // 保存图片到文件系统的assets目录
          const imagePath = await imageStorage.saveImageToDocument(tempDocId, file);
          console.log('[MarkdownEditor] Image saved, path:', imagePath);
          imagePaths.push(imagePath);
        } else {
          console.log('[MarkdownEditor] Skipping non-image file:', file.name, 'type:', file.type);
        }
      }
    } else if (props.document) {
      console.log('[MarkdownEditor] Database document, using document ID:', props.document.id);
      // 数据库文档：使用document ID
      imagePaths = await handleDroppedImages(props.document.id, files);
      console.log('[MarkdownEditor] Images saved for database document, paths:', imagePaths);
    } else {
      console.log('[MarkdownEditor] Neither external file nor database document, cannot save images');
    }

    console.log('[MarkdownEditor] Total image paths:', imagePaths.length);

    if (imagePaths.length > 0) {
      console.log('[MarkdownEditor] Inserting image references into content');
      // 插入所有图片引用
      let newContent = content.value;
      let newPosition = cursorPosition;

      for (const imagePath of imagePaths) {
        const result = insertImageReference(newContent, imagePath, newPosition);
        newContent = result.content;
        newPosition = result.newPosition;
        console.log('[MarkdownEditor] Inserted image reference:', imagePath);
      }

      content.value = newContent;
      console.log('[MarkdownEditor] Content updated, new length:', newContent.length);

      // 更新 mainContent（从完整内容中分离）
      const { mainContent: newMainContent } = splitContent(newContent);
      mainContent.value = newMainContent;
      console.log('[MarkdownEditor] MainContent updated, length:', newMainContent.length);

      // 更新编辑器显示
      if (editor) {
        if (!isEditorFocused.value) {
          // 编辑器没有焦点时，应用标注
          await applyEditorAnnotations();
        } else {
          // 编辑器有焦点时，直接更新文本内容
          editor.textContent = newMainContent;
          console.log('[MarkdownEditor] Editor textContent updated');
        }
      }

      // 触发内容更新和重新渲染
      checkChanges();
      renderContent();
      await nextTick();
      debouncedSave();
      console.log('[MarkdownEditor] Image drop handling completed successfully');
    } else {
      console.log('[MarkdownEditor] No image paths to insert');
    }
  } catch (error) {
    console.error('[MarkdownEditor] Error handling dropped images:', error);
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
    // 注意：这里不立即处理图片，图片处理将在后台异步执行
    // 缓存中保存的是原始内容，渲染时会使用缓存中已处理的内容
    let fragmentContent = fragment.markdown;

    // 插入内容和引用标志
    // 使用形态A（强引用模式）的语法
    const referenceTag = `{{ref:${fragmentId}:linked}}`;

    // 注意：cursorPosition 是基于 mainContent 的位置，需要转换为 content 的位置
    // 先获取 frontmatter 的长度
    const frontmatterLength = frontmatter.value.length;
    // 在 content 中的实际位置 = frontmatter长度 + cursorPosition
    const contentPosition = frontmatterLength + cursorPosition;

    const before = content.value.substring(0, contentPosition);
    const after = content.value.substring(contentPosition);

    // 在编辑器中显示引用标志
    content.value = before + '\n\n' + referenceTag + '\n\n' + after;

    // 关键：更新 mainContent（从完整内容中分离）
    const { mainContent: newMainContent } = splitContent(content.value);
    mainContent.value = newMainContent;

    console.log('[MarkdownEditor] 插入片段后，mainContent长度:', newMainContent.length, '引用标志位置:', newMainContent.indexOf(referenceTag));
    console.log('[MarkdownEditor] 插入片段后，更新 mainContent，长度:', newMainContent.length);

    // 计算引用位置（用于后续操作）
    const refPosition = newMainContent.indexOf(referenceTag);
    const newPosition = refPosition !== -1 ? refPosition : (cursorPosition + 2); // +2 for \n\n

    // 并行执行所有异步操作以提高性能
    const asyncOperations: Promise<void>[] = [];

    // 后台处理图片并保存到缓存：存储引用标志位置和对应的片段内容（已处理图片路径）
    if (currentFilePath.value) {
      asyncOperations.push(
        (async () => {
          try {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI && electronAPI.file && electronAPI.file.getFileCache) {
              // 先处理图片路径（如果有图片）
              let processedContent = fragmentContent;
              const hasImages = /!\[([^\]]*)\]\(([^)]+)\)/.test(fragmentContent);
              if (hasImages) {
                try {
                  const { FragmentReferenceResolver } = await import('../../domain/services/fragment-reference-resolver.service');
                  const { InversifyContainer } = await import('../../core/container/inversify.container');
                  const container = InversifyContainer.getInstance();

                  if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceResolver)) {
                    const resolver = container.get<any>(TYPES.FragmentReferenceResolver);
                    // 使用文件路径作为documentId，处理图片路径
                    processedContent = await resolver.resolveReference(fragmentId, `file:${currentFilePath.value}`);
                  }
                } catch (error) {
                  console.warn('Error resolving fragment content for cache:', error);
                  // 如果处理失败，使用原始内容
                }
              }

              // 获取缓存并保存已处理的内容
              const cache = await electronAPI.file.getFileCache(currentFilePath.value) || { references: [] };
              cache.references = cache.references || [];

              // 获取片段更新时间，用于缓存验证
              const fragmentUpdatedAt = new Date(fragment.updatedAt || fragment.createdAt || Date.now()).getTime();

              // 检查是否已存在该引用，如果存在则更新，否则添加
              const existingIndex = cache.references.findIndex((r: any) => r.fragmentId === fragmentId);
              const cacheEntry = {
                fragmentId,
                position: newPosition,
                length: referenceTag.length,
                content: processedContent, // 已处理的完整内容（包括图片路径已转换）
                isConnected: true,
                fragmentUpdatedAt // 记录片段更新时间，用于判断缓存是否有效
              };

              if (existingIndex >= 0) {
                cache.references[existingIndex] = cacheEntry;
              } else {
                cache.references.push(cacheEntry);
              }

              // 按位置排序
              cache.references.sort((a: any, b: any) => a.position - b.position);

              if (electronAPI.file.saveFileCache) {
                await electronAPI.file.saveFileCache(currentFilePath.value, cache);
              }
            }
          } catch (error) {
            console.error('Error saving file cache:', error);
          }
        })()
      );

      // 为外部文件也注册引用关系到知识片段
      asyncOperations.push(
        (async () => {
          try {
            const { InversifyContainer } = await import('../../core/container/inversify.container');
            const container = InversifyContainer.getInstance();

            if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceRegistrationService)) {
              const registrationService = container.get<any>(TYPES.FragmentReferenceRegistrationService);
              // 使用 file: 前缀标识外部文件
              const fileDocumentId = `file:${currentFilePath.value}`;
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
        })()
      );
    }

    // 如果是数据库文档，注册引用关系
    // 注意：外部文件的临时ID（external-xxx）已经在上面处理过了，这里只处理真正的数据库文档
    if (props.document && props.document.id && !props.document.id.startsWith('external-')) {
      const documentId = props.document.id; // 保存到局部变量，避免类型检查问题
      asyncOperations.push(
        (async () => {
          try {
            const { InversifyContainer } = await import('../../core/container/inversify.container');
            const container = InversifyContainer.getInstance();

            if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceRegistrationService)) {
              const registrationService = container.get<any>(TYPES.FragmentReferenceRegistrationService);
              await registrationService.registerReference(
                documentId,
                fragmentId,
                newPosition,
                referenceTag.length
              );
            }
          } catch (error) {
            console.error('Error registering fragment reference:', error);
          }
        })()
      );
    }

    // 更新编辑器内容（在聚焦之前应用标注，避免焦点丢失）
    await nextTick();

    // 并行执行所有异步操作，不等待完成（后台执行）
    // 这样可以立即显示内容，而不需要等待文件保存和引用注册
    Promise.all(asyncOperations).catch(err => {
      console.error('Error in async operations:', err);
    });

    // 减少延迟时间：从200ms减少到50ms，足够让DOM更新完成
    await new Promise(resolve => setTimeout(resolve, 50));

    // 无论编辑器是否有焦点，都应用标注以显示友好文本
    // 这样可以确保拖入知识片段后立即显示 [知识片段：标题] 而不是 {{ref:...}}
    console.log('[MarkdownEditor] 应用标注以显示友好文本，isEditorFocused:', isEditorFocused.value);
    await applyEditorAnnotations();

    // 如果编辑器有焦点，在应用标注后恢复焦点
    if (isEditorFocused.value) {
      await nextTick();
      editor.focus();
    }

    // 触发内容更新和重新渲染（确保引用被解析）
    checkChanges();
    console.log('[MarkdownEditor] 插入片段后，调用 renderContent 进行渲染');
    await renderContent();
    await nextTick();
    debouncedSave();

    recentInsertedFragmentIds.value = [
      fragmentId,
      ...recentInsertedFragmentIds.value.filter(id => id !== fragmentId)
    ].slice(0, 12);
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

  // 确保编辑器获得焦点
  await nextTick();
  if (editor) {
    editor.focus();
    isEditorFocused.value = true;
    // 恢复光标位置
    const selection = window.getSelection();
    if (selection && editor.textContent) {
      try {
        const range = document.createRange();
        const textNode = editor.firstChild;
        if (textNode) {
          const textLength = textNode.textContent?.length || 0;
          const newPosition = Math.min(cursorPosition, textLength);
          range.setStart(textNode, newPosition);
          range.setEnd(textNode, newPosition);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        console.warn('[MarkdownEditor] 恢复光标位置失败:', error);
      }
    }
  }
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
  // 获取编辑器当前内容（使用getTextContent而不是textContent，避免重复）
  const editor = editorElement.value;
  const currentMainContent = editor ? getTextContent(editor) : mainContent.value;

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

// 获取选中内容的源代码（从编辑器中提取，包含引用标记等原始内容）
// 注意：这个方法会保存和恢复选中范围，避免干扰编辑器焦点
const getSelectedSourceCode = (): string => {
  const editor = editorElement.value;
  if (!editor) {
    return '';
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return '';
  }

  // 保存当前选中范围
  const range = selection.getRangeAt(0);
  
  // 检查选中范围是否在编辑器内
  if (!editor.contains(range.commonAncestorContainer)) {
    return '';
  }

  // 如果没有选中内容（范围折叠），返回空字符串
  if (range.collapsed) {
    return '';
  }

  try {
    // 关键步骤1：先同步编辑器内容到mainContent（使用getTextContent还原引用格式）
    // getTextContent会将[知识片段: b]还原为{{ref:xxx}}，所以mainContent就是源代码
    const currentEditorText = getTextContent(editor);
    if (currentEditorText !== mainContent.value) {
      mainContent.value = currentEditorText;
    }

    // 关键步骤2：获取选中位置（getCursorPosition使用calculateTextLength，
    // 它基于getTextContent的逻辑，所以返回的位置已经是基于源代码的位置）
    const position = getCursorPosition(editor);
    const start = position.start;
    const end = position.end;

    // 确保位置在有效范围内
    const validStart = Math.max(0, Math.min(start, mainContent.value.length));
    const validEnd = Math.max(validStart, Math.min(end, mainContent.value.length));

    // 关键步骤3：直接从mainContent（源代码）中提取选中部分
    const sourceCode = mainContent.value.substring(validStart, validEnd);
    
    // 恢复选中范围（确保编辑器焦点不丢失）
    try {
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      // 如果恢复失败，尝试重新设置光标位置
      console.warn('恢复选中范围失败，尝试恢复光标位置:', e);
    }
    
    return sourceCode;
  } catch (error) {
    console.error('获取选中源代码失败:', error);
    return '';
  }
};

// 根据偏移量选中一段文本（用于快速搜索跳转）
const setSelectionRange = (start: number, end: number) => {
  const editor = editorElement.value;
  if (!editor) return;

  const range = document.createRange();
  const selection = window.getSelection();

  let currentPosition = 0;
  let foundStart = false;
  let foundEnd = false;

  const traverseNodes = (node: Node) => {
    if (foundEnd) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0;

      if (!foundStart && currentPosition + textLength >= start) {
        range.setStart(node, start - currentPosition);
        foundStart = true;
      }

      if (foundStart && currentPosition + textLength >= end) {
        range.setEnd(node, end - currentPosition);
        foundEnd = true;
      }

      currentPosition += textLength;
    } else {
      for (const child of Array.from(node.childNodes)) {
        traverseNodes(child);
        if (foundEnd) break;
      }
    }
  };

  traverseNodes(editor);

  if (foundStart && selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

// 在编辑器中高亮搜索匹配项
const setSearchHighlights = (query: string, caseSensitive: boolean, useRegex: boolean) => {
  const editorRoot = editorElement.value;
  if (!editorRoot) return;

  // 先清除已有高亮（展开 span.quick-search-highlight）
  const existing = editorRoot.querySelectorAll('.quick-search-highlight');
  existing.forEach(span => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });

  if (!query) return;

  let regex: RegExp;
  try {
    const source = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = caseSensitive ? 'g' : 'gi';
    regex = new RegExp(source, flags);
  } catch (error) {
    console.error('构建搜索高亮正则失败:', error);
    return;
  }

  const walker = document.createTreeWalker(editorRoot, NodeFilter.SHOW_TEXT, null);

  // 先计算所有文本节点的全局位置
  const textNodes: Array<{ node: Text; globalStart: number }> = [];
  let globalPos = 0;
  let node: Node | null;
  while ((node = walker.nextNode()) !== null) {
    // 跳过在脚本/样式中的文本（理论上预览里不会有）
    if (node.parentElement && ['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) {
      continue;
    }
    const textNode = node as Text;
    textNodes.push({ node: textNode, globalStart: globalPos });
    globalPos += textNode.textContent?.length || 0;
  }

  // 处理每个文本节点，创建高亮
  textNodes.forEach(({ node: textNode, globalStart }) => {
    const text = textNode.textContent || '';
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    const fragments: (Text | HTMLElement)[] = [];

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;

      if (start > lastIndex) {
        fragments.push(document.createTextNode(text.slice(lastIndex, start)));
      }

      const span = document.createElement('span');
      span.className = 'quick-search-highlight';
      span.textContent = text.slice(start, end);
      // 保存全局位置到 data 属性，方便后续查找
      const globalMatchStart = globalStart + start;
      const globalMatchEnd = globalStart + end;
      span.setAttribute('data-match-start', globalMatchStart.toString());
      span.setAttribute('data-match-end', globalMatchEnd.toString());
      fragments.push(span);

      lastIndex = end;

      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }

    if (fragments.length > 0) {
      if (lastIndex < text.length) {
        fragments.push(document.createTextNode(text.slice(lastIndex)));
      }

      const parent = textNode.parentNode;
      if (!parent) return;
      const df = document.createDocumentFragment();
      fragments.forEach(f => df.appendChild(f));
      parent.replaceChild(df, textNode);
    }
  });
};

// 标记当前匹配项（不改变 selection，只改变样式）
const setCurrentSearchMatch = (start: number, end: number) => {
  const editorRoot = editorElement.value;
  if (!editorRoot) return;

  // 先清除之前的"当前匹配"标记
  const allHighlights = editorRoot.querySelectorAll('.quick-search-highlight');
  allHighlights.forEach(span => {
    span.classList.remove('quick-search-highlight-current');
  });

  if (start === end) return;

  // 通过 data 属性直接查找匹配的 span
  let currentSpan: HTMLElement | null = null;
  allHighlights.forEach(span => {
    const matchStart = parseInt(span.getAttribute('data-match-start') || '-1');
    const matchEnd = parseInt(span.getAttribute('data-match-end') || '-1');

    // 检查这个高亮是否覆盖了目标区间
    if (matchStart !== -1 && matchEnd !== -1 && matchStart <= start && matchEnd >= end) {
      currentSpan = span as HTMLElement;
    }
  });

  if (currentSpan) {
    currentSpan.classList.add('quick-search-highlight-current');

    // 滚动到视图：editorRoot 就是滚动容器（markdown-editor-content）
    // 使用 nextTick 确保 DOM 更新完成后再滚动
    nextTick(() => {
      if (!editorRoot) return;

      const spanRect = currentSpan.getBoundingClientRect();
      const editorRect = editorRoot.getBoundingClientRect();

      // 计算 span 相对于编辑器容器的位置
      const spanTopRelativeToEditor = spanRect.top - editorRect.top + editorRoot.scrollTop;

      // 计算目标滚动位置：让匹配项显示在容器中间
      const targetScrollTop = spanTopRelativeToEditor - (editorRect.height / 2) + (spanRect.height / 2);

      // 确保滚动位置在有效范围内
      const maxScrollTop = editorRoot.scrollHeight - editorRoot.clientHeight;
      const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

      editorRoot.scrollTo({ top: finalScrollTop, behavior: 'smooth' });
    });
  }
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
const textContextMenuElement = ref<HTMLDivElement>();
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
  
  if (textContextMenu.value.visible) {
    const target = event.target as HTMLElement;
    const menu = textContextMenuElement.value;

    // 如果点击的不是菜单本身，则关闭菜单
    if (menu && !menu.contains(target)) {
      textContextMenu.value.visible = false;
    }
  }
};

// 脱钩知识片段：将引用转换为完整的文档内容
const switchReferenceMode = async (newMode: 'detached') => {
  const menu = referenceContextMenu.value;
  if (!menu.fragmentId) return;

  // 检查是否是placeholder格式（不应该出现，但需要处理）
  if (menu.fragmentId.startsWith('placeholder:')) {
    console.error('Invalid fragmentId format:', menu.fragmentId);
    alert('无法脱钩：引用格式错误');
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

    // 脱钩模式：获取片段内容，直接替换引用标记为完整内容
    const { Application } = await import('../../core/application');
    const app = Application.getInstance();
    await app.getApplicationService().initialize();
    const fragmentUseCases = app.getKnowledgeFragmentUseCases();
    const fragment = await fragmentUseCases.getFragment(ref.fragmentId);

    if (!fragment) {
      alert('无法获取片段内容');
      return;
    }

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
          fragmentContent = await resolver.resolveReference(ref.fragmentId, `file:${currentFilePath.value}`);
        }
      } catch (error) {
        console.warn('Error resolving fragment content for file:', error);
      }
    } else if (props.document) {
      try {
        const { FragmentReferenceResolver } = await import('../../domain/services/fragment-reference-resolver.service');
        const { InversifyContainer } = await import('../../core/container/inversify.container');
        const container = InversifyContainer.getInstance();

        if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceResolver)) {
          const resolver = container.get<any>(TYPES.FragmentReferenceResolver);
          fragmentContent = await resolver.resolveReference(ref.fragmentId, props.document.id);
        }
      } catch (error) {
        console.warn('Error resolving fragment content for document:', error);
      }
    }

    // 直接替换引用标记为完整内容（不保留任何标记）
    const before = content.value.substring(0, ref.startIndex);
    const after = content.value.substring(ref.endIndex);
    // 在内容前后添加换行，保持格式
    const newContent = before + '\n\n' + fragmentContent + '\n\n' + after;
    content.value = newContent;

    // 更新 mainContent（从完整内容中分离）
    const { mainContent: newMainContent } = splitContent(content.value);
    mainContent.value = newMainContent;

    // 取消注册引用关系（因为已经完全脱钩）
    if (currentFilePath.value) {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && electronAPI.file && electronAPI.file.getFileCache) {
          const cache = await electronAPI.file.getFileCache(currentFilePath.value) || { references: [] };
          // 移除对应的引用
          cache.references = (cache.references || []).filter((r: any) => r.fragmentId !== ref.fragmentId);
          if (electronAPI.file.saveFileCache) {
            await electronAPI.file.saveFileCache(currentFilePath.value, cache);
          }
        }
      } catch (error) {
        console.warn('Error removing file cache reference:', error);
      }
    }

    if (props.document) {
      try {
        const { InversifyContainer } = await import('../../core/container/inversify.container');
        const container = InversifyContainer.getInstance();

        if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceRegistrationService)) {
          const registrationService = container.get<any>(TYPES.FragmentReferenceRegistrationService);
          // 取消注册引用关系
          await registrationService.unregisterReference(props.document.id, ref.fragmentId);
        }
      } catch (error) {
        console.warn('Error unregistering fragment reference:', error);
      }
    }

    referenceContextMenu.value.visible = false;

    // 先根据最新 mainContent 重建编辑器 DOM（含其它仍存在的引用的 data-fragment-id），再 checkChanges；
    // 切勿用 textContent 整段覆盖，否则会丢失引用 span，getTextContent 无法还原 {{ref:...}}，导致预览与其它引用错位。
    await nextTick();
    await applyEditorAnnotations();
    console.log('[MarkdownEditor] 脱钩完成，已重新应用引用标注');

    checkChanges();
    await renderContent();

    console.log('[MarkdownEditor] 知识片段已脱钩，内容已转换为文档内容');
  } catch (error) {
    console.error('Error detaching fragment:', error);
    alert('脱钩失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 处理右键菜单
const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return;
  }
  
  const selectedText = selection.toString().trim();
  if (!selectedText) {
    return;
  }
  
  // 保存选区
  const range = selection.getRangeAt(0);
  
  textContextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    savedRange: range.cloneRange()
  };
};

// 应用文本格式化
const applyTextFormat = (formatType: 'bold' | 'italic' | 'strikethrough') => {
  console.log('[右键菜单] applyTextFormat 被调用:', formatType);
  textContextMenu.value.visible = false;
  
  const editor = editorElement.value;
  if (!editor) {
    console.error('[右键菜单] 编辑器元素不存在');
    return;
  }
  
  // 恢复选区
  const savedRange = textContextMenu.value.savedRange;
  if (!savedRange) {
    console.error('[右键菜单] 保存的选区不存在');
    return;
  }
  
  console.log('[右键菜单] 恢复选区:', savedRange);
  editor.focus();
  const selection = window.getSelection();
  if (!selection) {
    console.error('[右键菜单] 无法获取选区');
    return;
  }
  
  selection.removeAllRanges();
  selection.addRange(savedRange);
  
  const selectedText = selection.toString();
  console.log('[右键菜单] 选中文本:', selectedText);
  if (!selectedText) {
    console.warn('[右键菜单] 选中文本为空');
    return;
  }
  
  let formattedText = '';
  switch (formatType) {
    case 'bold':
      formattedText = `**${selectedText}**`;
      break;
    case 'italic':
      formattedText = `*${selectedText}*`;
      break;
    case 'strikethrough':
      formattedText = `~~${selectedText}~~`;
      break;
  }
  
  console.log('[右键菜单] 格式化后的文本:', formattedText);
  
  // 使用 execCommand 插入文本
  const success = document.execCommand('insertText', false, formattedText);
  console.log('[右键菜单] insertText 执行结果:', success);
  
  // 手动触发内容更新
  nextTick(() => {
    const newContent = editor.textContent || '';
    console.log('[右键菜单] 编辑器新内容:', newContent);
    mainContent.value = newContent;
    content.value = mergeContent(frontmatter.value, mainContent.value);
    renderContent();
    checkChanges();
    debouncedSave();
  });
};

// 添加选中文本为知识片段
const addSelectionAsFragment = async () => {
  console.log('[右键菜单] addSelectionAsFragment 被调用');
  textContextMenu.value.visible = false;
  
  const editor = editorElement.value;
  if (!editor) {
    console.error('[右键菜单] 编辑器元素不存在');
    return;
  }
  
  // 恢复选区
  const savedRange = textContextMenu.value.savedRange;
  if (!savedRange) {
    console.error('[右键菜单] 保存的选区不存在');
    return;
  }
  
  editor.focus();
  const selection = window.getSelection();
  if (!selection) {
    console.error('[右键菜单] 无法获取选区');
    return;
  }
  
  selection.removeAllRanges();
  selection.addRange(savedRange);
  
  const selectedText = selection.toString().trim();
  console.log('[右键菜单] 选中文本:', selectedText);
  if (!selectedText) {
    console.warn('[右键菜单] 选中文本为空');
    return;
  }
  
  try {
    const { InversifyContainer } = await import('../../core/container/inversify.container');
    const container = InversifyContainer.getInstance();
    
    const fragmentUseCase = container.get<any>(TYPES.KnowledgeFragmentUseCases);
    
    const nodes = parseMarkdownToNodes(selectedText);
    const title = selectedText.substring(0, 30) + (selectedText.length > 30 ? '...' : '');
    
    const documentContext = getDocumentContext();
    const fragment = await fragmentUseCase.createFragment({
      title,
      nodes: nodes.map(n => n.toJSON ? n.toJSON() : n),
      tags: [],
      sourceDocumentId: documentContext.documentId,
      sourceFilePath: documentContext.filePath
    });
    
    const refMarker = `{{ref:${fragment.id}:linked}}`;
    console.log('[右键菜单] 插入引用标记:', refMarker);
    document.execCommand('insertText', false, refMarker);
    
    console.log('[右键菜单] 知识片段创建成功:', fragment);
    
    // 手动触发内容更新
    nextTick(async () => {
      const newContent = editor.textContent || '';
      console.log('[右键菜单] 编辑器新内容:', newContent);
      mainContent.value = newContent;
      content.value = mergeContent(frontmatter.value, mainContent.value);
      
      // 应用编辑器标注以正确渲染知识片段
      await applyEditorAnnotations();
      
      renderContent();
      checkChanges();
      debouncedSave();
    });
  } catch (error) {
    console.error('[右键菜单] 创建知识片段失败:', error);
    alert('创建知识片段失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 简单的Markdown解析为AST节点（简化版）
const parseMarkdownToNodes = (markdown: string): any[] => {
  const nodes: any[] = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: NodeType.HEADING,
        level: headingMatch[1].length,
        text: headingMatch[2]
      });
      continue;
    }

    // 代码块
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

    // 图片
    const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imageMatch) {
      const imageSrc = imageMatch[2];
      nodes.push({
        type: NodeType.IMAGE,
        src: imageSrc,
        alt: imageMatch[1]
      });
      continue;
    }

    // 普通文本
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


// handleEditorClick已移除，现在使用右键菜单处理引用交互

// 获取当前文档上下文
const getDocumentContext = () => {
  if (props.document) {
    // 检查文档对象是否包含 filePath（外部文件）
    const filePath = (props.document as any).filePath || currentFilePath.value;
    return { documentId: props.document.id, filePath };
  } else if (currentFilePath.value) {
    return { documentId: undefined, filePath: currentFilePath.value };
  }
  return { documentId: undefined, filePath: undefined };
};

// 使用 Selection API 执行替换操作，支持撤销
const replaceTextWithUndo = (start: number, end: number, replacement: string) => {
  const editor = editorElement.value;
  if (!editor) return false;

  // 确保编辑器获得焦点（撤销历史需要焦点）
  editor.focus();

  // 设置选择范围
  const range = document.createRange();
  const selection = window.getSelection();
  if (!selection) return false;

  let currentPosition = 0;
  let foundStart = false;
  let foundEnd = false;

  const traverseNodes = (node: Node) => {
    if (foundEnd) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0;

      if (!foundStart && currentPosition + textLength >= start) {
        range.setStart(node, start - currentPosition);
        foundStart = true;
      }

      if (foundStart && currentPosition + textLength >= end) {
        range.setEnd(node, end - currentPosition);
        foundEnd = true;
      }

      currentPosition += textLength;
    } else {
      for (const child of Array.from(node.childNodes)) {
        traverseNodes(child);
        if (foundEnd) break;
      }
    }
  };

  traverseNodes(editor);

  if (!foundStart || !foundEnd) return false;

  // 设置选择
  selection.removeAllRanges();
  selection.addRange(range);

  // 使用 document.execCommand('insertText') 来插入文本，这会自动加入到撤销历史
  // 但需要先删除选中的内容
  if (document.execCommand && document.execCommand('delete', false)) {
    // 删除成功后，使用 insertText 插入新文本（支持撤销）
    if (document.execCommand('insertText', false, replacement)) {
      // 触发 input 事件，确保内容同步
      const inputEvent = new Event('input', { bubbles: true });
      editor.dispatchEvent(inputEvent);
      return true;
    }
  }

  // 如果 execCommand 不可用，使用 Range API 手动操作（但可能不支持撤销）
  // 作为后备方案
  try {
    range.deleteContents();
    const textNode = document.createTextNode(replacement);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    // 触发 input 事件
    const inputEvent = new Event('input', { bubbles: true });
    editor.dispatchEvent(inputEvent);
    return true;
  } catch (e) {
    console.error('替换操作失败:', e);
    return false;
  }
};

defineExpose({
  handleInsertFragment,
  setContent,
  getContent,
  refreshContent,
  getSelectedText,
  getSelectedSourceCode,
  setSelectionRange,
  setSearchHighlights,
  setCurrentSearchMatch,
  replaceTextWithUndo,
  getDocumentContext
});
</script>

<style scoped>
.editor-container {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

.title-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-primary);
}

.title-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.title-placeholder {
  color: var(--text-tertiary);
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
  border-right: 1px solid var(--border-secondary);
}

.recommendation-pane {
  flex: 0 0 260px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-secondary);
  background: var(--bg-secondary);
  overflow: hidden;
}

.toolbar-btn.active {
  background: var(--bg-active);
  border-color: var(--accent-primary);
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
  background: var(--bg-active);
  border: 2px dashed var(--accent-primary);
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
  color: var(--accent-primary);
  font-weight: 600;
}

.editor-label {
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-secondary);
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-toggle-btn {
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.preview-toggle-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
}

.editor-pane.full-width {
  flex: 1;
  border-right: none;
}

.markdown-preview-container {
  flex: 1;
  position: relative;
  min-height: 0; /* 重要：允许flex子元素缩小 */
  overflow: hidden;
  background: var(--bg-primary);
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
  background: var(--bg-primary);
  color: var(--text-primary);
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
  box-shadow: var(--shadow-md);
}

.markdown-editor-content :deep(.quick-search-highlight) {
  background-color: rgba(255, 255, 0, 0.4);
  padding: 0 1px;
  border-radius: 2px;
}

.markdown-editor-content :deep(.quick-search-highlight-current) {
  background-color: rgba(255, 200, 0, 0.9);
  border-radius: 2px;
}

.no-document {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
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
  color: var(--text-tertiary);
}

.save-indicator {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  background: var(--accent-success);
  color: var(--text-inverse);
  border-radius: 4px;
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.3s;
}

.save-indicator.visible {
  opacity: 1;
}

/* 隐藏的焦点接收器：用于在删除文档时接收焦点，避免光标状态问题 */
.focus-sink {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  outline: none;
}

/* Mermaid编辑器相关样式 */

.toolbar-btn {
  padding: 8px 16px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.toolbar-btn:hover {
  opacity: 0.9;
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
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  box-shadow: var(--shadow-md);
  z-index: 1000;
  min-width: 180px;
  overflow: hidden;
}

.export-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary);
  transition: background-color 0.2s;
}

.export-item:hover {
  background-color: var(--bg-hover);
}

.export-item:not(:last-child) {
  border-bottom: 1px solid var(--border-secondary);
}

/* 知识图谱模态框 */
.knowledge-graph-modal {
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}
.knowledge-graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.knowledge-graph-header h3 {
  margin: 0;
  font-size: 1.1rem;
}
.knowledge-graph-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.knowledge-graph-actions .sample-btn {
  padding: 6px 12px;
  font-size: 0.85rem;
}
.knowledge-graph-sample-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.knowledge-graph-modal .close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  color: var(--text-secondary);
}
.knowledge-graph-modal .close-btn:hover {
  color: var(--text-primary);
}
.knowledge-graph-loading,
.knowledge-graph-error {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
}
.knowledge-graph-error {
  color: var(--error-color, #c62828);
}
.knowledge-graph-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 8px;
  width: 90%;
  max-width: 1200px;
  height: 80%;
  max-height: 800px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
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
  color: var(--text-primary);
}

.markdown-preview :deep(h1) { font-size: 2em; }
.markdown-preview :deep(h2) { font-size: 1.5em; }
.markdown-preview :deep(h3) { font-size: 1.25em; }

.markdown-preview :deep(p) {
  margin-bottom: 16px;
}

.markdown-preview :deep(code) {
  background: var(--preview-code-bg);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.markdown-preview :deep(pre) {
  background: var(--preview-code-bg);
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
  color: var(--text-secondary);
  border-left: 0.25em solid var(--preview-quote-border);
  margin-bottom: 16px;
}

.markdown-preview :deep(a) {
  color: var(--preview-link);
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
  background: var(--editor-bg);
  color: var(--editor-text);
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.markdown-editor-content:empty:before {
  content: attr(data-placeholder);
  color: var(--text-tertiary);
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
  border: 1px solid var(--accent-primary) !important;
  border-color: var(--accent-primary) !important;
  color: var(--accent-primary) !important;
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
  color: var(--accent-primary);
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.markdown-editor-content .editor-code {
  background-color: rgba(108, 117, 125, 0.1);
  color: var(--text-tertiary);
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
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  box-shadow: var(--shadow-md);
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
  color: var(--text-primary);
}

.context-menu-item:hover {
  background-color: var(--bg-hover);
}

.context-menu-item .menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.context-menu-divider {
  height: 1px;
  background-color: var(--border-secondary);
  margin: 4px 0;
}
</style>

