<!-- src/components/MarkdownRenderer.vue -->
<template>
  <div
    ref="previewEl"
    class="markdown-preview"
    v-html="sanitizedHtml"
  ></div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import * as marked from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps<{
  content: string;
}>();

// 将 Markdown 转为 HTML
const rawHtml = computed(() => {
  return marked.parse(props.content, {
    gfm: true,
    breaks: true,
    //smartypants: true,
  });
});

// 使用 DOMPurify 清理 HTML（防 XSS）
const sanitizedHtml = computed(() => {
  return DOMPurify.sanitize(rawHtml.value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
});

// 可选：暴露方法给父组件（如滚动到顶部）
const previewEl = ref<HTMLDivElement | null>(null);
defineExpose({ previewEl });
</script>

<style scoped>
.markdown-preview {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background-color: #fff;
  border-left: 1px solid #eaecef;
}

/* 基础 Markdown 样式 */
.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3) {
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  font-weight: bold;
}
.markdown-preview :deep(p) {
  margin: 0.8em 0;
  line-height: 1.6;
}
.markdown-preview :deep(code) {
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
.markdown-preview :deep(pre) {
  background-color: #2d2d2d;
  color: #f8f8f2;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}
.markdown-preview :deep(blockquote) {
  border-left: 4px solid #ddd;
  margin: 1em 0;
  padding-left: 16px;
  color: #666;
}
</style>