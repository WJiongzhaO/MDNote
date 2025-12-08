<!-- src/App.vue -->
<template>
  <div class="editor-container">
    <textarea
      v-model="markdown"
      placeholder="# 欢迎使用 Markdown Docs Editor\n\n输入 Markdown 内容..."
      class="editor"
    ></textarea>
    <MarkdownRenderer :content="markdown" ref="preview" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import MarkdownRenderer from './components/MarkdownRenderer.vue';

const markdown = ref(`# 实时 Markdown 预览

- **粗体** 和 *斜体*
- [链接](https://example.com)
- 代码：\`console.log('hello')\`

\`\`\`js
function hello() {
  return "world";
}
\`\`\`

> 这是一个引用块

支持 KaTeX 和 Mermaid（后续扩展）`);

const preview = ref<InstanceType<typeof MarkdownRenderer> | null>(null);

// 可选：页面加载后聚焦编辑器
onMounted(() => {
  const textarea = document.querySelector('textarea');
  if (textarea) textarea.focus();
});
</script>

<style scoped>
.editor-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  box-sizing: border-box;
}

.editor {
  width: 50%;
  height: 100%;
  padding: 20px;
  resize: none;
  border: none;
  outline: none;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  background-color: #fafafa;
}

.editor:focus {
  background-color: #fff;
}
</style>
