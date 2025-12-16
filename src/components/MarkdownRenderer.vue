<template>
  <div class="markdown-preview" v-html="renderedHtml"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

interface Props {
  content: string
}

const props = defineProps<Props>()

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedHtml = computed(() => {
  if (!props.content || props.content.trim() === '') {
    return '<p class="empty-placeholder">开始输入 Markdown 内容...</p>'
  }

  try {
    return marked.parse(props.content)
  } catch (error) {
    console.error('Markdown 解析错误:', error)
    return `<div class="error">Markdown 解析错误: ${error}</div>`
  }
})
</script>

<style scoped>
.markdown-preview {
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.7;
  color: #333;
  background: #fff;
}

.markdown-preview :deep(h1) {
  font-size: 2em;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eaecef;
  color: #24292e;
}

.markdown-preview :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 16px;
  color: #24292e;
}

.markdown-preview :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 16px;
  color: #24292e;
}

.markdown-preview :deep(p) {
  margin-bottom: 16px;
}

.markdown-preview :deep(code) {
  background-color: #f6f8fa;
  color: #d73a49;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  font-size: 0.9em;
}

.markdown-preview :deep(pre) {
  background-color: #282c34;
  color: #abb2bf;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.markdown-preview :deep(pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
  border-radius: 0;
}

.markdown-preview :deep(blockquote) {
  border-left: 4px solid #dfe2e5;
  margin: 16px 0;
  padding: 0 16px;
  color: #6a737d;
}

.markdown-preview :deep(ul), .markdown-preview :deep(ol) {
  margin: 16px 0;
  padding-left: 32px;
}

.markdown-preview :deep(li) {
  margin-bottom: 4px;
}

.markdown-preview :deep(a) {
  color: #0366d6;
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

.markdown-preview :deep(table) {
  border-collapse: collapse;
  margin: 16px 0;
  width: 100%;
}

.markdown-preview :deep(th), .markdown-preview :deep(td) {
  border: 1px solid #dfe2e5;
  padding: 8px 12px;
  text-align: left;
}

.markdown-preview :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 16px 0;
}

.markdown-preview :deep(.empty-placeholder) {
  color: #6a737d;
  font-style: italic;
  text-align: center;
  padding: 40px;
}

.markdown-preview :deep(.error) {
  color: #d73a49;
  background-color: #ffeef0;
  border: 1px solid #d73a49;
  padding: 12px;
  border-radius: 6px;
  margin: 16px 0;
}
</style>