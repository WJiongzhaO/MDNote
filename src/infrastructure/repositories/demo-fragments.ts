import { KnowledgeFragment } from '../../domain/entities/knowledge-fragment.entity'
import type { KnowledgeFragmentData } from './file-system.knowledge-fragment.repository.impl'

const STORAGE_KEY = 'mdnote-knowledge-fragments'
const CATEGORY_KEY_PREFIX = 'mdnote-fragment-categories-'

const sampleFragments: KnowledgeFragmentData[] = [
  {
    id: 'demo-fragment-1',
    title: '什么是 Markdown',
    tags: ['教程', '基础', 'markdown'],
    nodes: [
      { type: 'heading', depth: 1, text: '什么是 Markdown' },
      {
        type: 'paragraph',
        text: 'Markdown 是一种轻量级标记语言，它允许人们使用易读易写的纯文本格式编写文档，然后转换成有效的 HTML 文档。',
      },
      { type: 'heading', depth: 2, text: 'Markdown 的优点' },
      { type: 'bulletList', items: ['简洁易读', '易于学习', '可转换为多种格式'] },
    ],
    assetDependencies: [],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    referencedDocuments: [],
    source: 'MDNote 官方文档',
    trustScore: 5,
    lastVerifiedAt: '2024-01-15T10:00:00.000Z',
    verifiedBy: '管理员',
    categoryPathIds: ['cat-tutorial'],
    status: 'active',
  },
  {
    id: 'demo-fragment-2',
    title: 'Mermaid 图表入门',
    tags: ['教程', 'mermaid', '图表'],
    nodes: [
      { type: 'heading', depth: 1, text: 'Mermaid 图表入门' },
      {
        type: 'paragraph',
        text: 'Mermaid 是一个用于生成图表和流程图的工具，使用简单的文本语法来描述图表。',
      },
      {
        type: 'code_block',
        language: 'mermaid',
        content: 'graph TD\nA[开始] --> B{判断}\nB -->|是| C[执行]\nB -->|否| D[结束]',
      },
    ],
    assetDependencies: [],
    createdAt: '2024-01-16T14:30:00.000Z',
    updatedAt: '2024-01-16T14:30:00.000Z',
    referencedDocuments: [],
    source: 'Mermaid 官方文档',
    trustScore: 4,
    lastVerifiedAt: '2024-01-16T14:30:00.000Z',
    verifiedBy: '管理员',
    categoryPathIds: ['cat-tutorial', 'cat-visual'],
    status: 'active',
  },
  {
    id: 'demo-fragment-3',
    title: '代码块语法',
    tags: ['教程', '代码', '语法'],
    nodes: [
      { type: 'heading', depth: 1, text: '代码块语法' },
      { type: 'paragraph', text: '使用三个反引号 ``` 包裹代码，可以指定语言进行高亮显示。' },
      {
        type: 'code_block',
        language: 'javascript',
        content: 'function hello() {\n  console.log("Hello World!");\n}',
      },
    ],
    assetDependencies: [],
    createdAt: '2024-01-17T09:00:00.000Z',
    updatedAt: '2024-01-17T09:00:00.000Z',
    referencedDocuments: [],
    source: 'MDNote 官方文档',
    trustScore: 5,
    lastVerifiedAt: '2024-01-17T09:00:00.000Z',
    verifiedBy: '管理员',
    categoryPathIds: ['cat-tutorial'],
    status: 'active',
  },
  {
    id: 'demo-fragment-4',
    title: '已废弃：旧版导出功能',
    tags: ['旧版', '导出', '废弃'],
    nodes: [{ type: 'paragraph', text: '此功能已废弃，请使用新版导出功能。' }],
    assetDependencies: [],
    createdAt: '2023-06-01T10:00:00.000Z',
    updatedAt: '2023-12-01T10:00:00.000Z',
    referencedDocuments: [],
    source: '内部文档',
    trustScore: 2,
    lastVerifiedAt: '2023-12-01T10:00:00.000Z',
    verifiedBy: '前开发者',
    categoryPathIds: [],
    status: 'deprecated',
    derivedFromId: undefined,
  },
  {
    id: 'demo-fragment-5',
    title: '待验证片段示例',
    tags: ['待验证', '示例'],
    nodes: [{ type: 'paragraph', text: '这是一个待验证的片段内容，需要检查准确性。' }],
    assetDependencies: [],
    createdAt: '2024-01-10T10:00:00.000Z',
    updatedAt: '2024-01-10T10:00:00.000Z',
    referencedDocuments: [],
    source: '用户贡献',
    trustScore: 2,
    lastVerifiedAt: null,
    verifiedBy: '',
    categoryPathIds: [],
    status: 'active',
  },
  {
    id: 'demo-fragment-6',
    title: '数学公式示例',
    tags: ['数学', 'katex', '公式'],
    nodes: [
      { type: 'heading', depth: 1, text: '数学公式示例' },
      { type: 'paragraph', text: 'MDNote 支持使用 KaTeX 渲染数学公式。' },
      { type: 'paragraph', text: '行内公式：$E = mc^2$' },
      {
        type: 'paragraph',
        text: '块级公式：$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$',
      },
    ],
    assetDependencies: [],
    createdAt: '2024-01-18T11:00:00.000Z',
    updatedAt: '2024-01-18T11:00:00.000Z',
    referencedDocuments: [
      {
        documentId: 'doc-1',
        documentTitle: '物理学习笔记',
        referencedAt: '2024-01-20T10:00:00.000Z',
        isConnected: true,
      },
    ],
    source: '数学文档',
    trustScore: 5,
    lastVerifiedAt: '2024-01-18T11:00:00.000Z',
    verifiedBy: '数学老师',
    categoryPathIds: ['cat-visual'],
    status: 'active',
  },
  {
    id: 'demo-fragment-7',
    title: '图片插入语法',
    tags: ['教程', '图片', '语法'],
    nodes: [
      { type: 'heading', depth: 1, text: '图片插入语法' },
      { type: 'paragraph', text: '使用 ![描述](图片路径) 语法插入图片。' },
      { type: 'image', src: './assets/demo-image.png', alt: '示例图片', title: '示例' },
    ],
    assetDependencies: ['demo-image.png'],
    createdAt: '2024-01-19T15:00:00.000Z',
    updatedAt: '2024-01-19T15:00:00.000Z',
    referencedDocuments: [],
    source: 'MDNote 官方文档',
    trustScore: 4,
    lastVerifiedAt: '2024-01-19T15:00:00.000Z',
    verifiedBy: '管理员',
    categoryPathIds: ['cat-archive'],
    status: 'archived',
  },
]

interface SampleCategory {
  id: string
  name: string
  parentId: string | null
  order: number
}

const sampleCategories: SampleCategory[] = [
  { id: 'cat-tutorial', name: '教程', parentId: null, order: 1 },
  { id: 'cat-basic', name: '基础知识', parentId: 'cat-tutorial', order: 1 },
  { id: 'cat-advanced', name: '高级用法', parentId: 'cat-tutorial', order: 2 },
  { id: 'cat-visual', name: '可视化', parentId: null, order: 2 },
  { id: 'cat-chart', name: '图表', parentId: 'cat-visual', order: 1 },
  { id: 'cat-formula', name: '公式', parentId: 'cat-visual', order: 2 },
  { id: 'cat-archive', name: '归档', parentId: null, order: 3 },
]

export function seedDemoFragments(): void {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing && existing !== '[]') {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleFragments))
  } catch (error) {
    console.error('[Demo] 种子数据添加失败:', error)
  }
}

export function seedDemoCategories(vaultId: string = 'default'): void {
  try {
    const key = `${CATEGORY_KEY_PREFIX}${vaultId}`
    const existing = localStorage.getItem(key)
    if (existing && existing !== '[]') {
      return
    }

    localStorage.setItem(key, JSON.stringify(sampleCategories))
  } catch (error) {
    console.error('[Demo] 分类种子数据添加失败:', error)
  }
}

export function clearDemoFragments(): void {
  localStorage.removeItem(STORAGE_KEY)
  console.log('[Demo] 已清除所有知识片段')
}

export function clearDemoCategories(vaultId: string = 'default'): void {
  localStorage.removeItem(`${CATEGORY_KEY_PREFIX}${vaultId}`)
  console.log('[Demo] 已清除所有分类')
}
