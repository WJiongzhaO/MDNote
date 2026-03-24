<template>
  <div class="editor-toolbar">
    <button
      v-for="btn in formatButtons"
      :key="btn.id"
      class="toolbar-btn"
      :class="{ active: isActive[btn.id] }"
      :title="btn.tooltip"
      @click="() => handleFormat(btn.action)"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" v-html="btn.icon"></svg>
    </button>

    <div class="toolbar-divider"></div>

    <button
      v-for="btn in listButtons"
      :key="btn.id"
      class="toolbar-btn"
      :title="btn.tooltip"
      @click="() => handleFormat(btn.action)"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" v-html="btn.icon"></svg>
    </button>

    <div class="heading-dropdown">
      <button
        class="toolbar-btn heading-btn"
        :class="{ active: headingLevel > 0 }"
        title="选择标题级别"
        @click="toggleHeadingMenu"
      >
        {{ headingLevel > 0 ? `H${headingLevel}` : 'H▼' }}
      </button>
      <div v-if="showHeadingMenu" class="heading-menu" @click.stop>
        <div
          v-for="level in 6"
          :key="level"
          class="heading-item"
          :class="{ active: headingLevel === level }"
          @click="applyHeadingLevel(level)"
        >
          H{{ level }} - {{ headingLabels[level - 1] }}
        </div>
        <div class="heading-divider"></div>
        <div
          class="heading-item"
          :class="{ active: headingLevel === 0 }"
          @click="applyHeadingLevel(0)"
        >
          普通文本
        </div>
      </div>
    </div>

    <div class="toolbar-divider"></div>

    <button
      class="toolbar-btn"
      title="Mermaid 图表"
      @click="$emit('open-mermaid')"
    >
      📊
    </button>
    <button
      class="toolbar-btn"
      title="数学公式"
      @click="$emit('open-formula')"
    >
      📐
    </button>
    <button
      class="toolbar-btn"
      title="知识图谱"
      @click="$emit('open-knowledge-graph')"
    >
      🕸️
    </button>
    <div class="export-menu">
      <button
        class="toolbar-btn"
        title="导出"
        @click="toggleExportMenu"
      >
        📤
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
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useEditorToolbar } from '@/presentation/composables/useEditorToolbar';

const icons = {
  bold: '<path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>',
  italic: '<path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z"/>',
  strikethrough: '<path d="M5 4h14v2h-4.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5H19v2h-4.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5H19v2H5V4zm2 5v2h10V9H7z"/>',
  code: '<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>',
  link: '<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h2.1a5 5 0 0 0 0-10H7a5 5 0 0 0 0 10h4v1.9H7c-1.71 0-3.1 1.39-3.1 3.1 0 1.39.81 2.6 1.98 3.1L8.4 13H7v2h5.9c1.71 0 3.1-1.39 3.1-3.1 0-1.39-.81-2.6-1.98-3.1L15.6 11H17V9h-5.9c-1.71 0-3.1 1.39-3.1 3.1z"/>',
  image: '<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l-3.5-4.5-1.5 1.5-2 2.5z M5 19h14V5H5v14z"/>',
  list: '<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>',
};

interface Props {
  editor: HTMLDivElement | null;
  content: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:content', content: string): void;
  (e: 'open-mermaid'): void;
  (e: 'open-formula'): void;
  (e: 'open-knowledge-graph'): void;
  (e: 'export', format: 'pdf' | 'html' | 'markdown'): void;
}>();

const showExportMenu = ref(false);
const showHeadingMenu = ref(false);
const headingLevel = ref(0);

const headingLabels = [
  '一级标题',
  '二级标题',
  '三级标题',
  '四级标题',
  '五级标题',
  '六级标题',
];

const toggleExportMenu = () => {
  showExportMenu.value = !showExportMenu.value;
  showHeadingMenu.value = false;
};

const toggleHeadingMenu = () => {
  showHeadingMenu.value = !showHeadingMenu.value;
  showExportMenu.value = false;
};

const handleExport = (format: 'pdf' | 'html' | 'markdown') => {
  showExportMenu.value = false;
  emit('export', format);
};

const applyHeadingLevel = (level: number) => {
  headingLevel.value = level;
  showHeadingMenu.value = false;
  if (level > 0) {
    applyFormat('heading', { level });
  } else {
    applyFormat('paragraph');
  }
};

const contentRef = computed({
  get: () => {
    console.log('[EditorToolbar-contentRef-get] 获取内容:', props.content);
    return props.content;
  },
  set: (value) => {
    console.log('[EditorToolbar-contentRef-set] 设置内容:', value);
    console.log('[EditorToolbar-contentRef-set] 触发 update:content 事件');
    emit('update:content', value);
  }
});

watch(contentRef, (newVal, oldVal) => {
  console.log('[EditorToolbar-watch-contentRef] 内容变化', {
    oldLength: oldVal?.length || 0,
    newLength: newVal?.length || 0,
    isSame: newVal === oldVal,
    oldPreview: oldVal?.substring(0, 50) + (oldVal?.length > 50 ? '...' : ''),
    newPreview: newVal?.substring(0, 50) + (newVal?.length > 50 ? '...' : '')
  });
});

const {
  isActive,
  applyFormat,
  insertContent,
} = useEditorToolbar(
  computed(() => props.editor),
  contentRef
);

const formatButtons = [
  { id: 'bold', action: 'bold', icon: icons.bold, tooltip: '加粗 (Ctrl+B)' },
  { id: 'italic', action: 'italic', icon: icons.italic, tooltip: '斜体 (Ctrl+I)' },
  { id: 'strikethrough', action: 'strikethrough', icon: icons.strikethrough, tooltip: '删除线' },
  { id: 'code', action: 'code', icon: icons.code, tooltip: '代码 (Ctrl+`)' },
];

const listButtons = [
  { id: 'ul', action: 'ul', icon: icons.list, tooltip: '无序列表' },
  { id: 'ol', action: 'ol', icon: icons.list, tooltip: '有序列表' },
];

const handleFormat = (formatType: string) => {
  console.log('[EditorToolbar-handleFormat] 按钮被点击', { formatType });
  console.log('[EditorToolbar-handleFormat] 当前 content:', contentRef.value);
  console.log('[EditorToolbar-handleFormat] 当前 isActive 状态:', isActive);
  applyFormat(formatType);
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.export-menu')) {
    showExportMenu.value = false;
  }
  if (!target.closest('.heading-dropdown')) {
    showHeadingMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

</script>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-secondary);
  flex-wrap: wrap;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  padding: 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
  color: var(--text-secondary);
  font-size: 14px;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--bg-hover);
}

.toolbar-btn.active {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.toolbar-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn svg {
  width: 18px;
  height: 18px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-primary);
  margin: 0 4px;
}

.heading-dropdown {
  position: relative;
  display: inline-block;
}

.heading-btn {
  width: auto;
  min-width: 40px;
  padding: 4px 8px;
  font-weight: 500;
}

.heading-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  box-shadow: var(--shadow-md);
  z-index: 1000;
  min-width: 140px;
  padding: 4px 0;
  margin-top: 4px;
}

.heading-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.heading-item:hover {
  background: var(--bg-hover);
}

.heading-item.active {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.heading-divider {
  height: 1px;
  background: var(--border-primary);
  margin: 4px 0;
}

.export-menu {
  position: relative;
  display: inline-block;
}

.export-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  box-shadow: var(--shadow-md);
  z-index: 1000;
  min-width: 150px;
  padding: 4px 0;
  margin-top: 4px;
}

.export-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.export-item:hover {
  background: var(--bg-hover);
}
</style>
