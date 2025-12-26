# MDNote 项目结构文档

## 目录
- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [项目构建](#项目构建)
- [代码结构](#代码结构)
- [架构设计](#架构设计)
- [核心功能](#核心功能)
- [数据存储](#数据存储)
- [测试](#测试)

---

## 项目概述

**MDNote** 是一款现代化的 Markdown 桌面笔记应用，基于 Electron + Vue 3 构建，支持实时预览、数学公式渲染、图表绘制和知识片段管理等高级功能。

### 主要特性
- 实时 Markdown 编辑与预览
- KaTeX 数学公式渲染
- Mermaid 图表绘制
- 知识片段系统（可复用的内容块）
- 文档导出（Word 格式）
- 多环境存储支持
- XSS 安全防护

---

## 技术栈

### 前端框架
- **Vue 3.5.12** - 使用 Composition API
- **TypeScript 5.6.2** - 类型安全
- **Vite 5.4.8** - 构建工具
- **Vue Router 4.6.4** - 路由管理

### 桌面运行时
- **Electron 30.0.0** - 桌面应用框架
- **Node.js 20+** - 运行环境

### 核心库
- **Marked 17.0.1** - Markdown 解析
- **KaTeX 0.16.11** - 数学公式渲染
- **Mermaid 11.4.1** - 图表渲染
- **DOMPurify 3.3.1** - XSS 防护
- **Inversify 7.10.8** - 依赖注入

### 测试框架
- **Vitest 2.1.4** - 单元测试
- **Playwright 1.49.0** - E2E 测试

---

## 项目构建

### 开发环境

```bash
# 启动 Vite 开发服务器（端口 5173）
npm run dev

# 启动 Electron 应用（带热重载）
npm run electron:serve
```

### 生产构建

```bash
# 构建 Vue 应用
npm run build

# 构建完整的 Electron 应用
npm run electron:build
```

### 构建流程

1. **TypeScript 编译** - `vue-tsc` 检查类型
2. **打包** - `vite build` 将 Vue 应用打包到 `dist/` 目录
3. **Electron 打包** - `electron-builder` 生成安装包到 `release/` 目录

### 输出配置

- **开发环境**: `http://localhost:5173`
- **生产环境**: `dist/index.html` (Electron 加载)
- **安装包**: `release/` 目录（Windows NSIS 安装程序）

---

## 代码结构

### 目录结构

```
D:\Code\MDNote\
├── src/                          # 源代码（84 个 .ts/.vue 文件）
│   ├── domain/                   # 领域层（DDD）
│   │   ├── entities/            # 实体类
│   │   │   ├── Document.ts      # 文档实体
│   │   │   ├── Folder.ts        # 文件夹实体
│   │   │   └── KnowledgeFragment.ts  # 知识片段实体
│   │   ├── repositories/        # 仓储接口（抽象）
│   │   ├── services/            # 领域服务
│   │   │   ├── MarkdownProcessor.ts  # Markdown 处理
│   │   │   └── MermaidRenderer.ts    # Mermaid 渲染
│   │   └── types/               # 类型定义
│   ├── application/             # 应用层
│   │   ├── dto/                 # 数据传输对象
│   │   ├── services/            # 应用服务
│   │   │   └── ApplicationService.ts
│   │   └── usecases/            # 用例
│   │       ├── DocumentUseCases.ts
│   │       ├── FolderUseCases.ts
│   │       └── KnowledgeFragmentUseCases.ts
│   ├── infrastructure/          # 基础设施层
│   │   ├── repositories/        # 仓储实现
│   │   │   ├── document/        # 文档仓储
│   │   │   │   ├── FileSystemDocumentRepository.ts
│   │   │   │   ├── IndexedDBDocumentRepository.ts
│   │   │   │   └── LocalStorageDocumentRepository.ts
│   │   │   ├── folder/          # 文件夹仓储
│   │   │   │   ├── FileSystemFolderRepository.ts
│   │   │   │   └── IndexedDBFolderRepository.ts
│   │   │   └── knowledgeFragment/  # 知识片段仓储
│   │   │       ├── FileSystemKnowledgeFragmentRepository.ts
│   │   │       └── LocalStorageKnowledgeFragmentRepository.ts
│   │   └── services/            # 基础设施服务
│   │       └── StorageAdapter.ts  # 存储适配器
│   ├── presentation/            # 表现层
│   │   ├── components/          # Vue 组件（15 个文件）
│   │   │   ├── NewAppLayout.vue        # 主布局
│   │   │   ├── MarkdownEditor.vue      # Markdown 编辑器
│   │   │   ├── FileExplorer.vue        # 文件浏览器
│   │   │   ├── KnowledgeFragmentSidebar.vue  # 知识片段侧边栏
│   │   │   ├── FolderManager.vue      # 文件夹管理器
│   │   │   ├── FormulaEditor.vue      # 公式编辑器
│   │   │   └── MermaidEditor.vue      # Mermaid 编辑器
│   │   ├── composables/         # Vue Composables
│   │   │   ├── useDocuments.ts        # 文档操作
│   │   │   ├── useFolders.ts          # 文件夹操作
│   │   │   ├── useKnowledgeFragments.ts  # 知识片段操作
│   │   │   ├── useImageUpload.ts      # 图片上传
│   │   │   └── useAssetRenderer.ts    # 资源渲染
│   │   └── router/              # 路由配置
│   │       └── index.ts
│   └── core/                    # 核心应用配置
│       ├── container/           # 依赖注入容器
│       │   └── container.ts
│       └── modules/             # 应用模块
│           └── application.ts
├── e2e/                         # E2E 测试
│   ├── electron/                # Electron 特定测试
│   └── vue.spec.ts              # Web 浏览器测试
├── public/                      # 静态资源
├── main.js                      # Electron 主进程（739 行）
├── preload.js                   # Electron 预加载脚本
├── index.html                   # 应用入口
├── vite.config.ts              # Vite 配置
└── package.json                # 依赖和脚本
```

---

## 架构设计

### 领域驱动设计（DDD）

项目采用**整洁架构**（Clean Architecture）和**领域驱动设计**（DDD）原则，分为四层：

#### 1. 领域层（Domain Layer）

**职责**: 纯业务逻辑和规则，不依赖外部实现

```
src/domain/
├── entities/          # 实体类
│   ├── Document.ts           # 文档：id, title, content, folderId, createdAt, updatedAt
│   ├── Folder.ts             # 文件夹：id, name, parentId, createdAt
│   └── KnowledgeFragment.ts  # 知识片段：id, name, content, tags, references, assets
├── repositories/      # 仓储接口（抽象）
│   ├── IDocumentRepository.ts
│   ├── IFolderRepository.ts
│   └── IKnowledgeFragmentRepository.ts
└── services/          # 领域服务
    ├── MarkdownProcessor.ts  # Markdown 扩展处理器
    └── MermaidRenderer.ts    # Mermaid 图表渲染器
```

**核心实体**:
- **Document**: 文档实体，包含内容、元数据
- **Folder**: 文件夹实体，支持树形结构
- **KnowledgeFragment**: 知识片段，基于 AST 的可复用内容块

#### 2. 应用层（Application Layer）

**职责**: 编排业务逻辑，协调领域对象

```
src/application/
├── dto/               # 数据传输对象
├── services/          # 应用服务
│   └── ApplicationService.ts  # 应用启动和配置
└── usecases/          # 用例
    ├── DocumentUseCases.ts           # 文档 CRUD
    ├── FolderUseCases.ts             # 文件夹 CRUD
    └── KnowledgeFragmentUseCases.ts  # 知识片段 CRUD
```

**用例模式**: 每个用例封装一个业务场景，如：
- `createDocument(title, content, folderId)`
- `updateDocument(id, updates)`
- `deleteDocument(id)`

#### 3. 基础设施层（Infrastructure Layer）

**职责**: 技术实现，外部依赖

```
src/infrastructure/
├── repositories/      # 仓储实现
│   ├── document/
│   │   ├── FileSystemDocumentRepository.ts      # Electron 文件系统
│   │   ├── IndexedDBDocumentRepository.ts       # 浏览器 IndexedDB
│   │   └── LocalStorageDocumentRepository.ts    # 浏览器 LocalStorage
│   ├── folder/
│   │   ├── FileSystemFolderRepository.ts
│   │   └── IndexedDBFolderRepository.ts
│   └── knowledgeFragment/
│       ├── FileSystemKnowledgeFragmentRepository.ts
│       └── LocalStorageKnowledgeFragmentRepository.ts
└── services/
    └── StorageAdapter.ts  # 环境检测和适配器选择
```

**多后端存储策略**:
- **Electron 环境**: 使用文件系统存储（`FileSystemRepository`）
- **浏览器环境**: 使用 IndexedDB（默认）或 LocalStorage

#### 4. 表现层（Presentation Layer）

**职责**: 用户界面和交互

```
src/presentation/
├── components/        # Vue 3 组件
├── composables/       # 可组合逻辑
└── router/           # 路由配置
```

**组件架构**:
- 使用 Vue 3 Composition API
- 响应式状态管理
- 组件化设计

---

### 依赖注入（IoC）

使用 **InversifyJS** 实现依赖注入：

```typescript
// src/core/container/container.ts
const container = new Container();

// 绑定仓储接口到实现
container.bind<IDocumentRepository>(TYPES.DocumentRepository)
  .to(StorageAdapter.getDocumentRepository())
  .inSingletonScope();

// 绑定用例
container.bind<DocumentUseCases>(TYPES.DocumentUseCases)
  .to(DocumentUseCases)
  .inSingletonScope();
```

**优势**:
- 松耦合设计
- 易于测试
- 便于替换实现

---

## 核心功能

### 1. Markdown 编辑器

**组件**: `src/presentation/components/MarkdownEditor.vue`

**功能**:
- 实时预览（双向滚动）
- 语法高亮
- 工具栏操作
- 自动保存

**Markdown 处理流程**:
```
用户输入
  ↓
MarkdownProcessor（领域服务）
  ↓
Marked 解析
  ↓
扩展处理（数学公式、Mermaid）
  ↓
DOMPurify 清理
  ↓
渲染输出
```

### 2. 数学公式渲染

**库**: KaTeX 0.16.11

**语法**:
```markdown
行内公式：$E = mc^2$

块级公式：
$$
\int_{a}^{b} f(x) dx = F(b) - F(a)
$$
```

**实现**:
- 自定义 Marked 扩展识别 `$` 和 `$$` 标记
- KaTeX 渲染为 HTML
- 样式隔离

### 3. Mermaid 图表

**组件**: `src/presentation/components/MermaidEditor.vue`

**支持图表类型**:
- 流程图（Flowchart）
- 序列图（Sequence Diagram）
- 类图（Class Diagram）
- 状态图（State Diagram）
- 甘特图（Gantt Chart）

**渲染机制**:
```typescript
// src/domain/services/MermaidRenderer.ts
async render(code: string): Promise<string> {
  const cacheKey = hash(code);

  // 检查缓存
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey)!;
  }

  // 渲染 Mermaid
  const { svg } = await mermaid.render(id, code);

  // 缓存结果
  this.cache.set(cacheKey, svg);

  return svg;
}
```

### 4. 知识片段系统

**组件**: `src/presentation/components/KnowledgeFragmentSidebar.vue`

**特性**:
- 基于 AST 的内容表示
- 跨文档复用
- 引用追踪（连接/断开状态）
- 标签分类
- 资源依赖管理

**数据结构**:
```typescript
interface KnowledgeFragment {
  id: string;
  name: string;
  content: string;           // Markdown 内容
  tags: string[];            // 标签数组
  references: Reference[];   // 引用列表
  assets: Asset[];           // 资源（图片、公式等）
  createdAt: Date;
  updatedAt: Date;
}
```

### 5. 文件浏览器

**组件**: `src/presentation/components/FileExplorer.vue`

**功能**:
- 树形结构展示
- 文件夹增删改查
- 拖拽排序
- 右键菜单

### 6. 文档导出

**格式**: Word (.docx)

**实现**:
- HTML → Word 转换
- 样式保留
- 图片嵌入

---

## 数据存储

### 存储位置

**开发环境**:
```
app.getPath('userData')/data/
├── documents.json
└── folders.json
```

**生产环境**:
```
appPath/../MDNoteData/
├── documents.json
└── folders.json
```

**自定义路径**: 用户可配置数据目录

### 数据文件格式

#### documents.json
```json
[
  {
    "id": "uuid",
    "title": "文档标题",
    "content": "Markdown 内容",
    "folderId": "folder-uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### folders.json
```json
[
  {
    "id": "uuid",
    "name": "文件夹名称",
    "parentId": "parent-uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 存储适配器

**环境检测**:
```typescript
// src/infrastructure/services/StorageAdapter.ts
static getDocumentRepository(): new () => IDocumentRepository {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return FileSystemDocumentRepository;  // Electron
  }
  return IndexedDBDocumentRepository;      // 浏览器
}
```

---

## 测试

### 单元测试

**框架**: Vitest

**位置**: `src/**/__tests__/`

**示例**:
```typescript
// src/domain/entities/__tests__/Document.test.ts
describe('Document', () => {
  it('should create a document with valid data', () => {
    const doc = new Document('1', 'Title', 'Content', 'folder-1');
    expect(doc.title).toBe('Title');
  });
});
```

**运行**:
```bash
npm run test:unit
```

### E2E 测试

**框架**: Playwright

**配置**:
- `playwright.config.ts` - Web 浏览器测试
- `playwright.electron.config.ts` - Electron 测试

**测试文件**:
```
e2e/
├── electron/
│   └── app.spec.ts           # Electron 应用测试
└── vue.spec.ts               # Web 浏览器测试
```

**运行**:
```bash
# Web 浏览器测试
npm run test:e2e

# Electron 测试
npm run test:electron
```

---

## 配置文件

### Vite 配置

**文件**: `vite.config.ts`

**关键配置**:
```typescript
{
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  base: './',  // Electron 相对路径
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
}
```

### TypeScript 配置

**文件**: `tsconfig.json`

**特性**:
- 严格模式
- 路径别名（`@` → `src/`）
- Vue 类型支持

### Electron 配置

**文件**: `package.json`

```json
{
  "main": "main.js",
  "build": {
    "appId": "com.mdnote.app",
    "productName": "MDNote",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": "nsis",
      "installerIcon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

---

## 安全机制

### XSS 防护

**库**: DOMPurify 3.3.1

**应用**:
```typescript
// 清理所有 HTML 输出
const cleanHtml = DOMPurify.sanitize(rawHtml);
```

### Content Security Policy（CSP）

**策略**: 限制脚本来源
```
default-src 'self'; script-src 'self'
```

### Electron 安全

- **Context Isolation**: 启用
- **Node Integration**: 禁用
- **自定义协议**: `app://` 替代 `file://`

---

## 开发指南

### 添加新功能

1. **领域层**: 定义实体和仓储接口
2. **应用层**: 实现用例逻辑
3. **基础设施层**: 实现仓储
4. **表现层**: 创建 Vue 组件
5. **依赖注入**: 注册到容器

### 代码风格

- **TypeScript**: 严格模式
- **Vue**: Composition API
- **命名**: 驼峰式（camelCase）
- **格式化**: Prettier

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 提交更改
git add .
git commit -m "feat: 添加新功能"

# 推送到远程
git push origin feature/new-feature
```

---

## 常见问题

### Q: 如何修改数据存储位置？

**A**: 在 Electron 主进程中修改 `dataPath` 配置：

```javascript
// main.js
const dataPath = path.join(app.getPath('home'), 'MDNoteData');
```

### Q: 如何添加新的 Markdown 扩展？

**A**: 在 `MarkdownProcessor` 中添加扩展：

```typescript
// src/domain/services/MarkdownProcessor.ts
marked.use({
  extensions: [yourCustomExtension]
});
```

### Q: 如何调试 Electron 应用？

**A**:
1. 运行 `npm run electron:serve`
2. 打开 DevTools（快捷键: F12 或 Ctrl+Shift+I）
3. 查看主进程日志：`console.log()` 输出到终端

---

## 相关资源

- [Vue 3 文档](https://vuejs.org/)
- [Electron 文档](https://www.electronjs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Marked 文档](https://marked.js.org/)
- [KaTeX 文档](https://katex.org/)
- [Mermaid 文档](https://mermaid.js.org/)

---

**文档版本**: 1.0
**最后更新**: 2024-12-26
