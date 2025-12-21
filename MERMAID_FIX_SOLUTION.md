# Mermaid图表渲染问题解决方案

## 问题描述

Mermaid图表在编辑时可以成功渲染，但保存到文件后再次打开预览时，会显示 `[object Promise]` 而不是渲染好的图表。

## 问题根源

1. **异步Promise问题**：Mermaid渲染器返回的是 `Promise<string>`，但Markdown处理器的renderer函数是同步的，导致Promise对象被转换为字符串 `[object Promise]`
2. **保存时机问题**：保存的是Markdown源码（正确），但加载时渲染逻辑没有正确处理异步渲染

## 解决方案

### 1. 占位符方案

采用**占位符 + 异步渲染**的方案：
- Markdown处理时，Mermaid代码块被转换为包含原始代码的HTML占位符
- 占位符使用 `data-diagram` 属性存储编码后的Mermaid代码
- 在DOM渲染完成后，使用JavaScript异步渲染这些占位符

### 2. 资源管理系统

创建了统一的资源管理系统，为后续功能扩展提供基础：

#### 核心组件

1. **AssetManager** (`src/domain/services/asset-manager.interface.ts`)
   - 统一管理图表、图片等资源
   - 支持资源的存储、查询、搜索
   - 为知识片段库提供基础

2. **AssetRendererService** (`src/domain/services/asset-renderer.service.ts`)
   - 负责异步渲染资源占位符
   - 支持Mermaid图表渲染
   - 可扩展支持图片、其他图表类型

3. **useAssetRenderer** (`src/presentation/composables/useAssetRenderer.ts`)
   - Vue组合式函数
   - 自动渲染容器中的占位符
   - 支持手动触发渲染

### 3. 实现细节

#### Markdown处理器修改

在 `ExtensibleMarkdownProcessor` 中，Mermaid代码块的renderer现在返回占位符HTML：

```typescript
renderer: (token: any) => {
  if (token?.diagram) {
    const diagramId = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const encodedDiagram = this.encodeDiagram(token.diagram);
    
    return `
      <div 
        class="mermaid-asset-placeholder" 
        data-asset-type="mermaid"
        data-asset-id="${diagramId}"
        data-diagram="${encodedDiagram}"
        ...
      >
        <div class="mermaid-loading">🔄 正在渲染Mermaid图表...</div>
      </div>
    `;
  }
}
```

#### 异步渲染流程

1. Markdown内容被处理，Mermaid代码块转换为占位符
2. HTML被插入到DOM中
3. `useAssetRenderer` 检测到占位符
4. 异步调用 `AssetRendererService.renderMermaidPlaceholderAsync()`
5. Mermaid渲染器渲染图表
6. 占位符被替换为渲染后的SVG

## 使用方式

### 在Vue组件中使用

```vue
<template>
  <div ref="previewElement" v-html="renderedContent"></div>
</template>

<script setup>
import { useAssetRenderer } from '../composables/useAssetRenderer';

const { useAutoRender, triggerRender } = useAssetRenderer();
const previewElement = ref<HTMLDivElement>();

// 自动渲染（组件挂载后）
useAutoRender(previewElement);

// 手动触发渲染（内容更新后）
const renderContent = async () => {
  renderedContent.value = await renderMarkdown(content.value);
  await triggerRender(previewElement);
};
</script>
```

## 后续扩展

### 1. 图片支持

资源管理系统已准备好支持图片：

```typescript
// 存储图片
const imageId = await assetManager.storeAsset({
  type: 'image',
  content: imagePath,
  renderedContent: base64Image,
  metadata: { title: '图片标题', documentId: 'doc-123' }
});
```

### 2. 知识片段库

可以基于AssetManager构建知识片段库：

```typescript
// 存储知识片段
const fragmentId = await assetManager.storeAsset({
  type: 'knowledge-fragment',
  content: markdownContent,
  metadata: {
    title: '片段标题',
    tags: ['tag1', 'tag2'],
    documentId: 'doc-123'
  }
});

// 搜索知识片段
const fragments = await assetManager.searchAssets('关键词', 'knowledge-fragment');
```

### 3. 资源持久化

当前使用内存存储，可以扩展为：
- 文件系统存储（Electron环境）
- IndexedDB存储（浏览器环境）
- 数据库存储（未来）

## 文件变更清单

### 新增文件

1. `src/domain/services/asset-manager.interface.ts` - 资源管理器接口
2. `src/infrastructure/services/asset-manager.service.ts` - 资源管理器实现
3. `src/domain/services/asset-renderer.service.ts` - 资源渲染服务
4. `src/presentation/composables/useAssetRenderer.ts` - Vue组合式函数

### 修改文件

1. `src/core/container/container.types.ts` - 添加AssetManager类型
2. `src/core/modules/application.module.ts` - 注册资源管理服务
3. `src/domain/services/extensible-markdown-processor.domain.service.ts` - 修改Mermaid处理逻辑
4. `src/presentation/components/MarkdownEditor.vue` - 集成资源渲染器

## 测试建议

1. **基本功能测试**
   - 创建包含Mermaid图表的文档
   - 保存文档
   - 重新打开文档，验证图表正确渲染

2. **边界情况测试**
   - 无效的Mermaid代码
   - 多个Mermaid图表
   - 大文档中的Mermaid图表

3. **性能测试**
   - 包含多个图表的文档渲染性能
   - 资源缓存效果

## 注意事项

1. **编码问题**：Mermaid代码使用Base64编码存储在data属性中，确保特殊字符正确处理
2. **异步渲染**：渲染是异步的，需要等待DOM更新后再触发
3. **错误处理**：渲染失败时会显示错误信息，不会影响文档其他内容

## 总结

这个解决方案不仅解决了当前的Mermaid渲染问题，还为后续的图片插入和知识片段库功能提供了坚实的基础。通过统一的资源管理系统，可以方便地扩展支持更多类型的资源。

