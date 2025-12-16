<template>
  <div class="editor-page">
    <header class="editor-header">
      <div class="header-left">
        <button @click="goBack" class="btn-back">
          ← 返回
        </button>
        <input
          v-if="currentDocument"
          v-model="currentDocument.title"
          class="document-title-input"
          @blur="saveDocument"
          @keyup.enter="saveDocument"
        />
        <div v-else class="document-title-placeholder">加载中...</div>
      </div>
      <div class="header-right">
        <div class="word-count">{{ wordCount }} 字</div>
        <div class="save-status" :class="{ saved: saveStatus === 'saved' }">
          {{ saveStatusText }}
        </div>
        <button @click="exportDocument" class="btn-export">
          导出
        </button>
        <button @click="saveDocument" class="btn-save">
          保存
        </button>
      </div>
    </header>

    <div class="editor-container">
      <div class="editor-pane">
        <textarea
          v-model="content"
          placeholder="开始编写你的 Markdown 内容..."
          class="editor"
          @input="onContentChange"
        ></textarea>
      </div>
      <div class="preview-pane">
        <MarkdownRenderer :content="content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { documentStore, type Document } from '../stores/documents'

const router = useRouter()
const route = useRoute()

// 响应式数据
const currentDocument = ref<Document | null>(null)
const content = ref('')
const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')
const autoSaveTimer = ref<NodeJS.Timeout | null>(null)

// 计算属性
const wordCount = computed(() => content.value.length)

const saveStatusText = computed(() => {
  switch (saveStatus.value) {
    case 'saved': return '已保存'
    case 'saving': return '保存中...'
    case 'unsaved': return '未保存'
    default: return ''
  }
})

// 方法
const loadDocument = (id: string) => {
  console.log('加载文档 ID:', id)
  const doc = documentStore.getDocument(id)

  if (doc) {
    currentDocument.value = { ...doc }
    content.value = doc.content
    saveStatus.value = 'saved'
    console.log('文档加载成功:', doc.title, '内容长度:', doc.content.length)
  } else {
    console.log('文档不存在，创建新文档')
    // 创建新文档
    const newDoc = documentStore.createDocument('default')
    currentDocument.value = { ...newDoc }
    content.value = newDoc.content
    router.replace(`/editor/${newDoc.id}`)
  }
}

const saveDocument = () => {
  if (!currentDocument.value) return

  saveStatus.value = 'saving'

  const updatedDoc: Document = {
    ...currentDocument.value,
    title: currentDocument.value.title || '无标题文档',
    content: content.value,
    preview: documentStore.generatePreview(content.value),
    updatedAt: new Date(),
    wordCount: content.value.length
  }

  documentStore.saveDocument(updatedDoc)
  currentDocument.value = updatedDoc
  saveStatus.value = 'saved'

  console.log('文档保存成功:', updatedDoc.title)

  setTimeout(() => {
    if (saveStatus.value === 'saved') {
      saveStatus.value = 'unsaved'
    }
  }, 3000)
}

const onContentChange = () => {
  if (saveStatus.value === 'saved') {
    saveStatus.value = 'unsaved'
  }
}

const goBack = () => {
  if (saveStatus.value === 'unsaved') {
    if (confirm('你有未保存的更改，确定要离开吗？')) {
      router.push('/')
    }
  } else {
    router.push('/')
  }
}

const exportDocument = () => {
  if (!currentDocument.value) return

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${currentDocument.value.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.7;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        pre {
            background: #282c34;
            color: #abb2bf;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
        }
        code {
            background: #f6f8fa;
            padding: 2px 6px;
            border-radius: 4px;
        }
        blockquote {
            border-left: 4px solid #dfe2e5;
            margin: 16px 0;
            padding-left: 16px;
            color: #6a737d;
        }
    </style>
</head>
<body>
${content.value}
</body>
</html>`

  const blob = new Blob([htmlContent], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentDocument.value.title}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const setupAutoSave = () => {
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
  }

  autoSaveTimer.value = setInterval(() => {
    if (saveStatus.value === 'unsaved' && currentDocument.value) {
      saveDocument()
    }
  }, 30000)
}

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    saveDocument()
  }
}

// 生命周期
onMounted(() => {
  console.log('MarkdownEditor 组件已挂载')
  const id = route.params.id as string
  if (id) {
    loadDocument(id)
  }
  setupAutoSave()
  document.addEventListener('keydown', handleKeydown)
})

// 监听路由参数变化
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadDocument(newId as string)
  }
})

// 清理
onUnmounted(() => {
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
  }
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.editor-header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e1e5e9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  background: none;
  border: none;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-back:hover {
  background: #f0f2f5;
}

.document-title-input {
  border: 1px solid transparent;
  background: none;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  padding: 6px 8px;
  border-radius: 4px;
  outline: none;
  min-width: 200px;
}

.document-title-input:focus {
  border-color: #409eff;
  background: #fafafa;
}

.document-title-placeholder {
  font-size: 18px;
  font-weight: 600;
  color: #999;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.word-count {
  font-size: 14px;
  color: #666;
}

.save-status {
  font-size: 14px;
  color: #e6a23c;
  padding: 4px 8px;
  border-radius: 4px;
  background: #fdf6ec;
}

.save-status.saved {
  color: #67c23a;
  background: #f0f9ff;
}

.btn-export, .btn-save {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-export {
  background: white;
  color: #606266;
  border: 1px solid #dcdfe6;
}

.btn-export:hover {
  background: #f0f2f5;
}

.btn-save {
  background: #409eff;
  color: white;
}

.btn-save:hover {
  background: #337ecc;
}

.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-pane, .preview-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor {
  flex: 1;
  padding: 20px;
  border: none;
  outline: none;
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: white;
  resize: none;
  box-sizing: border-box;
}

.preview-pane {
  background: white;
  border-left: 1px solid #e1e5e9;
}
</style>