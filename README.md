# MD Note - DDD架构的Markdown笔记应用

一个基于Vue 3 + Electron + TypeScript的现代化Markdown笔记应用，采用DDD（领域驱动设计）架构。

## 🏗️ 架构设计

本项目采用严格的DDD架构，分为四个主要层次：

### 1. Domain Layer (领域层)
`src/domain/`
- **实体 (Entities)**: `Document` - 文档的核心业务对象
- **值对象 (Value Objects)**: `DocumentId`, `DocumentTitle`, `DocumentContent` 等
- **领域服务 (Domain Services)**: `MarkdownProcessor` - Markdown处理逻辑
- **仓储接口 (Repository Interfaces)**: `DocumentRepository` - 数据访问抽象

### 2. Application Layer (应用层)
`src/application/`
- **用例 (Use Cases)**: `DocumentUseCases` - 文档相关的业务用例
- **DTO (Data Transfer Objects)**: 文档数据传输对象
- **应用服务 (Application Services)**: 协调领域服务和用例

### 3. Infrastructure Layer (基础设施层)
`src/infrastructure/`
- **仓储实现**: `InMemoryDocumentRepository` - 内存数据存储
- **外部服务集成**: 数据持久化等基础设施服务

### 4. Presentation Layer (表示层)
`src/presentation/`
- **Vue组件**: 用户界面组件
- **Composables**: 响应式业务逻辑封装
- **状态管理**: 基于Vue 3 Composition API

## 🚀 功能特性

- ✅ **Markdown 编辑** - 支持完整的Markdown语法
- ✅ **实时预览** - 左侧编辑，右侧实时预览
- ✅ **文档管理** - 创建、编辑、删除文档
- ✅ **搜索功能** - 按标题和内容搜索文档
- ✅ **响应式设计** - 适配不同屏幕尺寸
- ✅ **自动保存** - 防抖保存机制
- ✅ **类型安全** - 完整的TypeScript支持

## 🛠️ 技术栈

- **前端框架**: Vue 3.5.12 (Composition API)
- **桌面应用**: Electron 30.0.0
- **类型系统**: TypeScript 5.6.2
- **构建工具**: Vite 5.4.8
- **Markdown处理**: Marked 17.0.1
- **HTML安全**: DOMPurify 3.3.1
- **路由**: Vue Router 4.6.4
- **代码规范**: ESLint + Prettier

## 📁 项目结构

```
src/
├── domain/                  # 领域层
│   ├── entities/           # 实体
│   ├── types/              # 类型定义
│   ├── services/           # 领域服务
│   └── repositories/       # 仓储接口
├── application/            # 应用层
│   ├── dto/               # 数据传输对象
│   ├── usecases/          # 用例
│   └── services/          # 应用服务
├── infrastructure/         # 基础设施层
│   └── repositories/       # 仓储实现
├── presentation/           # 表示层
│   ├── components/         # Vue组件
│   └── composables/        # Composables
├── App.vue                # 根组件
└── main.ts                # 应用入口
```

## 🎯 核心特性说明

### DDD架构优势
1. **关注点分离**: 每层职责明确，便于维护
2. **可测试性**: 业务逻辑与UI分离，易于单元测试
3. **可扩展性**: 可轻松替换基础设施层实现
4. **代码复用**: 领域逻辑可在不同前端技术中复用

### Markdown处理
- 使用Marked进行Markdown解析
- DOMPurify确保HTML安全
- 支持代码高亮、表格、列表等语法
- 实时预览和同步滚动

### 数据管理
- 基于Repository模式的数据访问
- 内存存储实现（可扩展为持久化存储）
- 响应式数据更新
- 防抖保存机制

## 📦 安装和运行

### 环境要求
- Node.js >= 20.0.0
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev              # 启动Web开发服务器
npm run electron:serve   # 启动Electron应用
```

### 构建
```bash
npm run build            # 构建Web版本
npm run electron:build   # 构建Electron版本
```

### 测试
```bash
npm run test:unit        # 单元测试
npm run test:e2e         # E2E测试
```

## 🔧 开发指南

### 添加新功能
1. 在Domain层定义业务规则和实体
2. 在Application层创建用例
3. 在Infrastructure层实现基础设施
4. 在Presentation层创建UI组件

### 代码规范
- 使用TypeScript进行类型定义
- 遵循Vue 3 Composition API最佳实践
- 保持DDD架构的分层清晰
- 编写单元测试覆盖业务逻辑

## IDE推荐设置

### VS Code
推荐安装以下扩展：
- [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

### 浏览器开发工具
- **Chromium浏览器** (Chrome, Edge等):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - 在Chrome DevTools中启用自定义对象格式化器
- **Firefox**:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - 在Firefox DevTools中启用自定义对象格式化器

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有开源项目的贡献者，特别是：
- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用开发
- [Marked](https://marked.js.org/) - Markdown解析器
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
