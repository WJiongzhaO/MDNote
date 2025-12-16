import { ref, reactive } from 'vue'

export interface Document {
  id: string
  title: string
  content: string
  preview: string
  folderId: string
  createdAt: Date
  updatedAt: Date
  wordCount: number
}

export interface Folder {
  id: string
  name: string
  documentCount: number
}

class DocumentStore {
  private documents = ref<Document[]>([])
  private folders = ref<Folder[]>([])

  constructor() {
    this.loadFromStorage()
  }

  // 文档管理
  getDocuments(): Document[] {
    return this.documents.value
  }

  getDocument(id: string): Document | undefined {
    return this.documents.value.find(doc => doc.id === id)
  }

  saveDocument(doc: Document): void {
    const index = this.documents.value.findIndex(d => d.id === doc.id)
    if (index >= 0) {
      this.documents.value[index] = { ...doc }
    } else {
      this.documents.value.push({ ...doc })
    }
    this.saveToStorage()
    this.updateFolderCounts()
  }

  deleteDocument(id: string): void {
    this.documents.value = this.documents.value.filter(doc => doc.id !== id)
    this.saveToStorage()
    this.updateFolderCounts()
  }

  createDocument(folderId: string = 'default'): Document {
    const doc: Document = {
      id: Date.now().toString(),
      title: '新建文档',
      content: '# 新建文档\n\n开始编写你的内容...',
      preview: '新建文档',
      folderId,
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 8
    }
    this.saveDocument(doc)
    return doc
  }

  // 文件夹管理
  getFolders(): Folder[] {
    return this.folders.value
  }

  saveFolder(folder: Folder): void {
    const index = this.folders.value.findIndex(f => f.id === folder.id)
    if (index >= 0) {
      this.folders.value[index] = { ...folder }
    } else {
      this.folders.value.push({ ...folder })
    }
    this.saveToStorage()
  }

  updateFolderCounts(): void {
    this.folders.value.forEach(folder => {
      folder.documentCount = this.documents.value.filter(doc => doc.folderId === folder.id).length
    })
  }

  // 搜索功能
  searchDocuments(query: string, folderId?: string): Document[] {
    let docs = this.documents.value

    if (folderId && folderId !== 'all') {
      docs = docs.filter(doc => doc.folderId === folderId)
    }

    if (query) {
      const lowerQuery = query.toLowerCase()
      docs = docs.filter(doc =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery) ||
        doc.preview.toLowerCase().includes(lowerQuery)
      )
    }

    return docs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  // 工具方法
  generatePreview(content: string): string {
    return content
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '[代码块]')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[图片]')
      .replace(/^>\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '• ')
      .trim()
      .substring(0, 100)
      .trim()
  }

  // 存储操作
  private saveToStorage(): void {
    try {
      const dataForStorage = {
        documents: this.documents.value.map(doc => ({
          ...doc,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString()
        })),
        folders: this.folders.value
      }
      localStorage.setItem('mdnote-data', JSON.stringify(dataForStorage))
      console.log('数据保存成功:', dataForStorage.documents.length, '个文档')
    } catch (error) {
      console.error('保存数据失败:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mdnote-data')
      if (!stored) {
        console.log('没有找到存储数据，使用默认数据')
        this.initDefaultData()
        return
      }

      const data = JSON.parse(stored)
      console.log('加载存储数据:', data.documents?.length || 0, '个文档')

      // 加载文档
      if (data.documents && Array.isArray(data.documents)) {
        this.documents.value = data.documents.map((doc: any) => ({
          id: doc.id || Date.now().toString(),
          title: doc.title || '无标题文档',
          content: doc.content || '',
          preview: doc.preview || '',
          folderId: doc.folderId || 'default',
          createdAt: new Date(doc.createdAt || Date.now()),
          updatedAt: new Date(doc.updatedAt || Date.now()),
          wordCount: doc.wordCount || (doc.content || '').length
        }))
      }

      // 加载文件夹
      if (data.folders && Array.isArray(data.folders)) {
        this.folders.value = data.folders
      } else {
        this.initDefaultFolders()
      }

      this.updateFolderCounts()
    } catch (error) {
      console.error('加载数据失败:', error)
      this.clearStorage()
      this.initDefaultData()
    }
  }

  private initDefaultData(): void {
    this.initDefaultFolders()

    // 创建一个示例文档
    const sampleDoc: Document = {
      id: 'sample-' + Date.now(),
      title: '欢迎使用 MD Note',
      content: `# 欢迎使用 MD Note

这是一个功能强大的 Markdown 笔记应用。

## 主要功能

- **实时预览** - 左侧编辑，右侧实时显示效果
- **文档管理** - 支持文件夹分类和搜索
- **自动保存** - 每30秒自动保存，永不丢失内容
- **导出功能** - 支持导出为 HTML 和 Markdown 文件

## Markdown 语法示例

### 文本格式
- **粗体文本**
- *斜体文本*
- ~~删除线~~

### 代码
行内代码：\`console.log('Hello')\`

代码块：
\`\`\`javascript
function hello(name) {
  console.log(\`Hello, \${name}!\`);
}
\`\`\`

### 列表
1. 有序列表项 1
2. 有序列表项 2
   - 嵌套无序列表
   - 另一个嵌套项

### 链接和图片
[GitHub](https://github.com)

> 这是一个引用块

开始创建你的第一个文档吧！`,
      preview: '欢迎使用 MD Note，这是一个功能强大的 Markdown 笔记应用...',
      folderId: 'default',
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 280
    }

    this.saveDocument(sampleDoc)
  }

  private initDefaultFolders(): void {
    this.folders.value = [
      { id: 'default', name: '默认', documentCount: 0 },
      { id: 'work', name: '工作', documentCount: 0 },
      { id: 'personal', name: '个人', documentCount: 0 },
      { id: 'study', name: '学习', documentCount: 0 }
    ]
  }

  clearStorage(): void {
    localStorage.removeItem('mdnote-data')
    console.log('已清除所有存储数据')
  }
}

// 创建单例实例
export const documentStore = new DocumentStore()