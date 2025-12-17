<template>
  <div class="app-layout">
    <DocumentList
      :documents="documents"
      :is-loading="isLoading"
      :active-document-id="currentDocument?.id"
      @select-document="handleSelectDocument"
      @create-new="handleCreateNew"
      @search="handleSearch"
    />

    <MarkdownEditor
      :document="currentDocument"
      :render-markdown="renderMarkdown"
      @update-document="handleUpdateDocument"
    />

    <div v-if="error" class="error-toast">
      {{ error }}
      <button @click="error = null" class="error-close">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDocuments } from '../composables/useDocuments';
import { ApplicationService } from '../../application';
import { InMemoryDocumentRepository } from '../../infrastructure';
import DocumentList from './DocumentList.vue';
import MarkdownEditor from './MarkdownEditor.vue';

const documentRepository = new InMemoryDocumentRepository();
const applicationService = new ApplicationService(documentRepository);

const {
  documents,
  currentDocument,
  isLoading,
  error,
  createDocument,
  updateDocument,
  loadDocument,
  renderMarkdown
} = useDocuments(applicationService);

const handleSelectDocument = async (id: string) => {
  await loadDocument(id);
};

const handleCreateNew = async () => {
  await createDocument({
    title: '新建文档',
    content: '# 新建文档\n\n开始编写您的 Markdown 文档...'
  });
};

const handleUpdateDocument = async (id: string, title: string, content: string) => {
  await updateDocument({
    id,
    title,
    content
  });
};

const handleSearch = async (query: string) => {
  const documentUseCases = applicationService.getDocumentUseCases();
  const searchResults = await documentUseCases.searchDocuments(query);
  documents.value = searchResults;
};

onMounted(async () => {
  await createDocument({
    title: '欢迎使用 MD Note',
    content: `# 欢迎使用 MD Note

这是一个基于 **DDD 架构** 的现代化 Markdown 笔记应用。

## 特性

- 📝 **Markdown 编辑** - 支持完整的 Markdown 语法
- 👁️ **实时预览** - 左侧编辑，右侧实时预览
- 📚 **文档管理** - 轻松管理您的所有文档
- 🔍 **搜索功能** - 快速找到您需要的文档

## 基本语法

### 标题
\`# 标题 1\`
\`## 标题 2\`
\`### 标题 3\`

### 强调
**粗体文本**
*斜体文本*
~~删除线~~

### 列表
- 无序列表项 1
- 无序列表项 2

1. 有序列表项 1
2. 有序列表项 2

### 代码
\`内联代码\`

\`\`\`javascript
// 代码块
function hello() {
  console.log('Hello World!');
}
\`\`\`

### 引用
> 这是一段引用文本
> 可以有多行

### 链接
[MDN Web Docs](https://developer.mozilla.org/)

---

开始创建您的第一个文档吧！`
  });

  await createDocument({
    title: 'Markdown 语法指南',
    content: `# Markdown 语法指南

Markdown 是一种轻量级标记语言，它允许人们使用易读易写的纯文本格式编写文档。

## 标题

Markdown 支持 6 级标题：

\`\`\`
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
\`\`\`

## 强调

- **粗体文本**: \`**粗体文本**\` 或 \`__粗体文本__\`
- *斜体文本*: \`*斜体文本*\` 或 \`_斜体文本_\`
- ~~删除线~~: \`~~删除线~~\`
- **粗体和*斜体*组合**: \`**粗体和*斜体*组合**\`

## 列表

### 无序列表
\`\`\`
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2
- 项目 3
\`\`\`

### 有序列表
\`\`\`
1. 第一项
2. 第二项
3. 第三项
   1. 子项目 3.1
   2. 子项目 3.2
\`\`\`

## 代码

### 内联代码
使用反引号创建内联代码：\`const name = 'world';\`

### 代码块
使用三个反引号创建代码块：

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

## 引用

使用 > 创建引用：

> 这是一段引用文本
>
> 可以包含多行
>
> 甚至包含其他 Markdown 元素

## 链接和图片

\`\`\`
[链接文本](https://example.com)
![图片描述](https://example.com/image.jpg)
\`\`\`

## 分隔线

使用三个或更多的连字符、星号或下划线创建分隔线：

\`\`\`
---
***
___
\`\`\`

## 表格

\`\`\`
| 列 1 | 列 2 | 列 3 |
|------|------|------|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |
\`\`\`

## 转义字符

使用反斜杠转义特殊字符：

\`\\*\\*\\*这不会是粗体\\*\\*\\*\`

---

继续探索 Markdown 的强大功能吧！`
  });
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.error-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #dc3545;
  color: white;
  padding: 12px 20px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

.error-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}
</style>