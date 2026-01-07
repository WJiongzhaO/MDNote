<template>
  <div class="editor-toolbar">
    <!-- 格式化按钮组 -->
    <ToolbarGroup title="格式化">
      <ToolbarButton
        v-for="btn in formatButtons"
        :key="btn.id"
        :active="isActive[btn.id]"
        :icon="btn.icon"
        :tooltip="btn.tooltip"
        @click="() => handleFormat(btn.action)"
      />
    </ToolbarGroup>

    <div class="toolbar-divider"></div>

    <!-- 插入按钮组 -->
    <ToolbarGroup title="插入">
      <ToolbarButton
        v-for="btn in insertButtons"
        :key="btn.id"
        :icon="btn.icon"
        :tooltip="btn.tooltip"
        @click="() => handleInsert(btn.action)"
      />

      <!-- 标题下拉菜单 -->
      <ToolbarButton
        :text="headingLabel"
        tooltip="标题"
        @click="cycleHeadingLevel"
      />
    </ToolbarGroup>

    <div class="toolbar-divider"></div>

    <!-- 高级功能按钮组 -->
    <ToolbarGroup title="高级">
      <ToolbarButton
        text="📊"
        tooltip="Mermaid 图表"
        @click="$emit('open-mermaid')"
      />
      <ToolbarButton
        text="📐"
        tooltip="数学公式"
        @click="$emit('open-formula')"
      />
      <ToolbarButton
        text="💡"
        tooltip="知识片段"
        @click="$emit('insert-fragment')"
      />
    </ToolbarGroup>
  </div>
</template>

<script setup lang="ts">
/**
 * 编辑器工具栏主组件
 *
 * @module presentation/components/editor/toolbar
 */

import { computed, ref, watch } from 'vue';
import { useEditorToolbar } from '@/presentation/composables/useEditorToolbar';
import ToolbarGroup from './ToolbarGroup.vue';
import ToolbarButton from './ToolbarButton.vue';

// Icons (SVG)
const icons = {
  bold: '<path d="M15.6 10.79c.97-.67 1.65-1.61 1.65-2.66-.02-1.31-.67-2.33-1.61-3.03L11 4H4v14h11.28c2.4 0 3.64-1.57 3.64-3.3 0-1.31-.46-2.14-1.3-2.66zm-4.6 2.82c-.52 0-1.05-.15-1.45-.5-.4-.34-.68-.91-.68-1.61V7h1.33v2.07c.02.84.3 1.5.8 1.5 1.54zm4.4 2.75c-.52 0-1.05-.15-1.45-.5-.4-.34-.68-.91-.68-1.61V7h1.33v2.07c.02.84.3 1.5.8 1.5 1.54z"/>',
  italic: '<path d="M10 4v3h2.5v-.25c0-.69.56-1.25 1.25-1.25H10V4zm0 5v3h2.5c.97 0 1.75.78 1.75 1.75v.25c0 .97-.78 1.75-1.75 1.75H10V9z"/>',
  strikethrough: '<path d="M3 12h18M3 12c0-3 2-4 4-4s4 1 4 4-2 4-4 4-4-1-4-4 4z"/>',
  code: '<path d="M9.4 16.6 4.6-4.6M4.6 16.6 4.6-4.6"/>',
  link: '<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h2.1a5 5 0 0 0 0-10H7a5 5 0 0 0 0 10h4v1.9H7c-1.71 0-3.1 1.39-3.1 3.1 0 1.39.81 2.6 1.98 3.1L8.4 13H7v2h5.9c1.71 0 3.1-1.39 3.1-3.1 0-1.39-.81-2.6-1.98-3.1L15.6 11H17V9h-5.9c-1.71 0-3.1 1.39-3.1 3.1z"/>',
  image: '<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l-3.5-4.5-1.5 1.5-2 2.5z M5 19h14V5H5v14z"/>',
  list: '<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>',
};

// Props
interface Props {
  editor: HTMLDivElement | null;
  content: string;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  (e: 'update:content', content: string): void;
  (e: 'open-mermaid'): void;
  (e: 'open-formula'): void;
  (e: 'insert-fragment'): void;
}>();

// 使用工具栏 Composable
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

// 监听 contentRef 的变化
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

// 标题级别循环
const headingLevel = ref(0);
const headingLabel = computed(() => headingLevel.value > 0 ? `H${headingLevel.value}` : 'H▼');

const cycleHeadingLevel = () => {
  headingLevel.value = (headingLevel.value % 6) + 1;
  applyFormat('heading', { level: headingLevel.value });
};

// 按钮配置
const formatButtons = [
  { id: 'bold', action: 'bold', icon: icons.bold, tooltip: '加粗 (Ctrl+B)' },
  { id: 'italic', action: 'italic', icon: icons.italic, tooltip: '斜体 (Ctrl+I)' },
  { id: 'strikethrough', action: 'strikethrough', icon: icons.strikethrough, tooltip: '删除线' },
  { id: 'code', action: 'code', icon: icons.code, tooltip: '代码 (Ctrl+`)' },
];

const insertButtons = [
  { id: 'link', action: 'link', icon: icons.link, tooltip: '链接 (Ctrl+K)' },
  { id: 'image', action: 'image', icon: icons.image, tooltip: '图片 (Ctrl+Shift+I)' },
  { id: 'ul', action: 'ul', icon: icons.list, tooltip: '无序列表' },
  { id: 'ol', action: 'ol', icon: icons.list, tooltip: '有序列表' },
];

// 事件处理
const handleFormat = (formatType: string) => {
  console.log('[EditorToolbar-handleFormat] 按钮被点击', { formatType });
  console.log('[EditorToolbar-handleFormat] 当前 content:', contentRef.value);
  console.log('[EditorToolbar-handleFormat] 当前 isActive 状态:', isActive);
  applyFormat(formatType);
};

const handleInsert = (insertType: string) => {
  console.log('[EditorToolbar-handleInsert] 按钮被点击', { insertType });
  insertContent(insertType);
};
</script>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-wrap: wrap;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #dee2e6;
  margin: 0 4px;
}
</style>
