# 知识片段引用机制实施计划

## 1. 需求分析

### 1.1 核心需求

1. **创建知识片段时保存源文档**
   - 记录知识片段是从哪个文档创建的
   - 用于追踪片段的来源

2. **插入引用标志（编辑界面显示，预览/导出时渲染内容）**
   - 插入知识片段时，插入一个可点击的标志
   - 标志不渲染片段内容，只显示引用信息
   - 点击标志显示引用该片段的所有文档列表
   - 可以跳转到对应文档

3. **知识片段库双击修改**
   - 双击知识片段可以编辑
   - 修改后自动应用到所有引用该片段的文档
   - 只更新未断开连接的引用

4. **引用断开连接机制**
   - 在文档中编辑引用区域的内容时，该引用断开连接
   - 断开后不再接受知识片段库的修改
   - 通过标志颜色区分连接状态：
     - 🟢 绿色：接受片段修改（已连接）
     - 🔴 红色：不接受片段修改（已断开）

### 1.2 设计原则

- **编辑界面显示标志**：在Markdown编辑器中，引用区域显示 `{{ref:xxx}}` 标志（带颜色高亮）
- **预览/导出渲染内容**：在预览界面和导出时，引用标志被替换为片段的实际内容并渲染
- **双向追踪**：片段知道哪些文档引用了它，文档知道引用了哪些片段
- **断开连接保护**：用户编辑后的内容不受片段修改影响
- **可视化状态**：通过颜色清晰显示引用状态（编辑界面）

---

## 2. 数据模型设计

### 2.1 KnowledgeFragment 实体扩展

**需要添加的属性**：

```typescript
export class KnowledgeFragment {
  // 现有属性...
  
  // 新增：源文档ID（创建片段时的文档）
  private sourceDocumentId?: string;
  
  // 新增：引用该片段的文档列表
  private referencedDocuments: FragmentReference[];
}

// 引用信息值对象
export interface FragmentReference {
  documentId: string;
  documentTitle: string;
  referencedAt: Date;
  isConnected: boolean;  // 是否还接受片段修改
}
```

**需要添加的方法**：

```typescript
// 设置源文档
setSourceDocument(documentId: string): void;

// 添加引用文档
addReferencedDocument(documentId: string, documentTitle: string): void;

// 移除引用文档
removeReferencedDocument(documentId: string): void;

// 标记引用为断开连接
disconnectReference(documentId: string): void;

// 标记引用为已连接
connectReference(documentId: string): void;

// 获取所有引用文档
getReferencedDocuments(): FragmentReference[];

// 获取已连接的引用文档
getConnectedReferences(): FragmentReference[];

// 更新片段内容（应用到所有已连接的引用）
updateContent(nodes: ASTNode[]): void;
```

### 2.2 Document 实体扩展

**需要添加的属性**：

```typescript
export class Document {
  // 现有属性...
  
  // 新增：文档中的引用信息
  private fragmentReferences: DocumentFragmentReference[];
}

// 文档中的引用信息
export interface DocumentFragmentReference {
  fragmentId: string;
  fragmentTitle: string;
  position: number;  // 在文档中的位置（字符索引）
  length: number;    // 引用标志的长度
  isConnected: boolean;  // 是否还接受片段修改
  originalContent?: string;  // 断开连接时的原始内容（用于恢复）
}
```

**需要添加的方法**：

```typescript
// 添加片段引用
addFragmentReference(
  fragmentId: string,
  fragmentTitle: string,
  position: number,
  length: number
): void;

// 移除片段引用
removeFragmentReference(fragmentId: string): void;

// 断开引用连接
disconnectFragmentReference(fragmentId: string, originalContent: string): void;

// 重新连接引用
reconnectFragmentReference(fragmentId: string): void;

// 获取所有引用
getFragmentReferences(): DocumentFragmentReference[];

// 检查位置是否在引用区域内
isPositionInReference(position: number): DocumentFragmentReference | null;
```

### 2.3 引用标志语法设计

**语法格式**：
```
{{ref:fragmentId:connected}}  // 已连接（绿色）
{{ref:fragmentId:disconnected}}  // 已断开（红色）
```

**简化格式**（默认已连接）：
```
{{ref:fragmentId}}  // 等同于 {{ref:fragmentId:connected}}
```

**示例**：
```markdown
这是一个段落。

{{ref:abc-123-def}}

这是另一个段落。
```

---

## 3. 实施步骤

### 阶段1：数据模型扩展

#### 步骤1.1：扩展 KnowledgeFragment 实体

**文件**：`src/domain/entities/knowledge-fragment.entity.ts`

**修改内容**：
1. 添加 `sourceDocumentId` 属性
2. 添加 `referencedDocuments` 属性
3. 实现相关方法（见2.1节）

**注意事项**：
- 保持向后兼容（已有数据没有这些属性）
- `referencedDocuments` 初始化为空数组

#### 步骤1.2：扩展 Document 实体

**文件**：`src/domain/entities/document.entity.ts`

**修改内容**：
1. 添加 `fragmentReferences` 属性
2. 实现相关方法（见2.2节）

**注意事项**：
- 引用位置使用字符索引
- 需要处理文档内容修改时的位置更新

#### 步骤1.3：更新类型定义

**文件**：`src/domain/types/knowledge-fragment.types.ts`

**修改内容**：
```typescript
export interface FragmentReference {
  documentId: string;
  documentTitle: string;
  referencedAt: string;  // ISO字符串格式
  isConnected: boolean;
}
```

#### 步骤1.4：更新DTO

**文件**：`src/application/dto/knowledge-fragment.dto.ts`

**修改内容**：
```typescript
export interface KnowledgeFragmentResponse {
  // 现有字段...
  sourceDocumentId?: string;
  referencedDocuments: FragmentReference[];
}
```

### 阶段2：引用标志处理（编辑界面显示 + 预览/导出内容替换）

#### 步骤2.1：实现引用标志解析器

**新文件**：`src/domain/services/fragment-reference-parser.service.ts`

**功能**：
- 解析文档中的 `{{ref:xxx}}` 或 `{{ref:xxx:connected/disconnected}}` 语法
- 提取引用信息（fragmentId、连接状态）
- 返回引用位置和长度

**接口设计**：
```typescript
export interface FragmentReferenceMatch {
  fragmentId: string;
  isConnected: boolean;
  match: string;  // 完整匹配文本，如 "{{ref:abc-123}}" 或 "{{ref:abc-123:connected}}"
  startIndex: number;
  endIndex: number;
}

export interface FragmentReferenceParser {
  parseReferences(content: string): FragmentReferenceMatch[];
  extractFragmentIds(content: string): string[];
}
```

**实现要点**：
- 正则表达式：`/\{\{ref:([a-zA-Z0-9-]+)(?::(connected|disconnected))?\}\}/g`
- 默认状态为 `connected`（如果未指定）

#### 步骤2.2：实现编辑界面的标志高亮显示

**文件**：`src/presentation/components/MarkdownEditor.vue`

**功能**：
- 在Markdown编辑器中，对 `{{ref:xxx}}` 进行语法高亮
- 根据连接状态显示不同颜色：
  - 绿色：`{{ref:xxx}}` 或 `{{ref:xxx:connected}}`
  - 红色：`{{ref:xxx:disconnected}}`
- 标志可点击，显示引用文档列表

**实现方式**：
- 使用 CodeMirror 或 Monaco Editor 的语法高亮功能
- 或者使用自定义的正则匹配和样式应用

**样式示例**：
```css
.fragment-reference-tag {
  color: #28a745;  /* 绿色 - 已连接 */
  font-weight: 500;
  cursor: pointer;
}

.fragment-reference-tag.disconnected {
  color: #dc3545;  /* 红色 - 已断开 */
}
```

#### 步骤2.3：实现预览/导出的内容替换服务

**新文件**：`src/domain/services/fragment-reference-resolver.service.ts`

**功能**：
- 解析文档中的引用标志
- 获取对应的知识片段内容
- 替换引用标志为片段内容
- 处理片段中的图片路径（复制到文档的assets目录）

**接口设计**：
```typescript
export interface FragmentReferenceResolver {
  // 解析并替换引用标志为片段内容
  resolveReferences(
    content: string,
    documentId: string
  ): Promise<string>;
  
  // 解析单个引用
  resolveReference(
    fragmentId: string,
    documentId: string
  ): Promise<string>;
}
```

**实现逻辑**：
```typescript
async resolveReferences(content: string, documentId: string): Promise<string> {
  const parser = new FragmentReferenceParser();
  const references = parser.parseReferences(content);
  
  let resolvedContent = content;
  
  // 从后往前替换，避免索引偏移
  for (let i = references.length - 1; i >= 0; i--) {
    const ref = references[i];
    
    // 获取片段内容
    const fragment = await this.fragmentRepository.findById(ref.fragmentId);
    if (!fragment) {
      // 片段不存在，保留标志或显示错误提示
      continue;
    }
    
    // 获取片段Markdown内容
    let fragmentMarkdown = fragment.toMarkdown();
    
    // 处理图片路径（复制到文档的assets目录）
    const imagePaths = this.extractImagePaths(fragmentMarkdown);
    const pathMap = await this.imageStorage.copyImagesFromFragmentToDocument(
      ref.fragmentId,
      documentId,
      imagePaths
    );
    
    // 替换图片路径
    pathMap.forEach((newPath, oldPath) => {
      fragmentMarkdown = fragmentMarkdown.replace(oldPath, newPath);
    });
    
    // 替换引用标志为片段内容
    resolvedContent = this.replaceAt(
      resolvedContent,
      ref.startIndex,
      ref.endIndex,
      fragmentMarkdown
    );
  }
  
  return resolvedContent;
}
```

#### 步骤2.4：集成到预览和导出流程

**文件**：`src/application/usecases/document.usecases.ts`

**修改内容**：
1. 在 `processDocument` 方法中，区分编辑模式和预览模式
2. **预览模式**：先解析引用标志并替换为内容，再进行Markdown处理
3. **导出模式**：同样先替换引用标志为内容，再导出

**流程（预览/导出）**：
```
原始内容 → 解析引用标志 → 替换为片段内容 → Markdown处理 → HTML输出/导出
```

**流程（编辑界面）**：
```
原始内容 → 语法高亮显示引用标志（带颜色） → 用户编辑
```

### 阶段3：引用管理服务

#### 步骤3.1：实现引用注册服务

**新文件**：`src/domain/services/fragment-reference-registration.service.ts`

**功能**：
- 注册文档对片段的引用
- 在片段中添加引用文档信息
- 在文档中记录引用信息

**接口设计**：
```typescript
export interface FragmentReferenceRegistrationService {
  // 注册引用
  registerReference(
    documentId: string,
    fragmentId: string,
    position: number
  ): Promise<void>;
  
  // 取消注册引用
  unregisterReference(
    documentId: string,
    fragmentId: string
  ): Promise<void>;
  
  // 断开引用连接
  disconnectReference(
    documentId: string,
    fragmentId: string,
    originalContent: string
  ): Promise<void>;
  
  // 重新连接引用
  reconnectReference(
    documentId: string,
    fragmentId: string
  ): Promise<void>;
}
```

#### 步骤3.2：实现引用同步服务

**新文件**：`src/domain/services/fragment-reference-sync.service.ts`

**功能**：
- 当片段更新时，同步更新所有已连接的引用文档
- 只更新未断开连接的引用

**接口设计**：
```typescript
export interface FragmentReferenceSyncService {
  // 同步片段更新到所有引用文档
  syncFragmentUpdate(
    fragmentId: string,
    newContent: string
  ): Promise<void>;
  
  // 获取需要同步的文档列表
  getDocumentsToSync(fragmentId: string): Promise<string[]>;
}
```

### 阶段4：文档编辑时的断开连接检测

#### 步骤4.1：实现内容变更检测

**文件**：`src/presentation/components/MarkdownEditor.vue`

**功能**：
- 监听文档内容变化
- 检测引用标志区域是否被修改
- 如果引用标志被修改（不再是 `{{ref:xxx}}` 格式），自动断开连接

**检测逻辑**：
```typescript
// 检测引用区域是否被修改
const detectReferenceModification = (
  oldContent: string,
  newContent: string,
  reference: DocumentFragmentReference
): boolean => {
  // 获取引用区域的原始内容（应该是 {{ref:xxx}} 格式）
  const oldReferenceContent = oldContent.substring(
    reference.position,
    reference.position + reference.length
  );
  
  // 获取新内容中对应位置的内容
  const newReferenceContent = newContent.substring(
    reference.position,
    reference.position + reference.length
  );
  
  // 如果新内容不匹配引用标志格式，说明被修改了
  const isStillReference = newReferenceContent.match(/^\{\{ref:[^}]+\}\}$/);
  
  // 如果不再是引用标志格式，说明用户编辑了内容
  return !isStillReference && oldReferenceContent !== newReferenceContent;
};
```

**注意**：
- 用户可能在引用标志前后添加了内容，这不算修改引用本身
- 只有当引用标志本身被改变或删除时，才断开连接
- 如果用户删除了引用标志，应该从引用列表中移除

#### 步骤4.2：断开连接处理

**文件**：`src/presentation/components/MarkdownEditor.vue`

**功能**：
- 检测到引用标志被修改时（不再是 `{{ref:xxx}}` 格式）
- 保存修改后的内容（作为断开连接后的内容）
- 如果用户完全删除了引用标志，从引用列表中移除
- 如果用户修改了引用标志但保留了格式，更新为断开状态：`{{ref:xxx:disconnected}}`
- 更新片段和文档的引用信息

**处理流程**：
```
内容变化 → 检测引用标志 → 判断是否修改 → 
  ├─ 完全删除 → 移除引用
  └─ 修改格式 → 断开连接 → 更新标志为 {{ref:xxx:disconnected}} → 更新颜色为红色 → 保存状态
```

**特殊情况处理**：
- 如果用户在引用标志前后添加内容，不影响引用状态
- 如果用户将 `{{ref:abc}}` 改为 `{{ref:def}}`，视为删除旧引用并添加新引用

### 阶段5：知识片段库双击编辑

#### 步骤5.1：实现双击编辑功能

**文件**：`src/presentation/components/KnowledgeFragmentSidebar.vue`

**功能**：
- 双击知识片段触发编辑
- 打开编辑对话框
- 保存修改后同步到所有引用文档

**实现**：
```vue
<div 
  class="fragment-item"
  @dblclick="editFragment(fragment)"
>
  <!-- 片段内容 -->
</div>
```

#### 步骤5.2：实现同步更新

**文件**：`src/application/usecases/knowledge-fragment.usecases.ts`

**修改内容**：
1. 修改 `updateFragment` 方法
2. 更新片段后，调用同步服务
3. 同步更新所有已连接的引用文档

**流程**：
```
更新片段 → 获取所有已连接的引用 → 更新每个引用文档 → 通知UI刷新
```

### 阶段6：引用标志点击交互

#### 步骤6.1：实现编辑界面的引用标志点击事件

**文件**：`src/presentation/components/MarkdownEditor.vue`

**功能**：
- 在编辑界面，监听引用标志的点击事件
- 引用标志在编辑器中显示为可点击的高亮文本
- 点击后显示引用文档列表对话框
- 支持跳转到文档

**实现方式**：
- 方案1：使用编辑器的事件监听，检测点击位置是否在引用标志内
- 方案2：在引用标志前后添加特殊标记，通过标记检测点击
- 方案3：使用编辑器的装饰功能，将引用标志渲染为可点击元素

**实现示例（方案1）**：
```typescript
const handleEditorClick = (event: MouseEvent) => {
  const editor = editorRef.value;
  if (!editor) return;
  
  // 获取点击位置的字符索引
  const position = editor.getPositionFromPoint(event);
  const offset = editor.getOffsetAt(position);
  
  // 检查是否点击在引用标志内
  const references = parseReferences(content.value);
  const clickedRef = references.find(ref => 
    offset >= ref.startIndex && offset <= ref.endIndex
  );
  
  if (clickedRef) {
    handleReferenceClick(clickedRef.fragmentId);
  }
};

const handleReferenceClick = async (fragmentId: string) => {
  // 获取引用该片段的所有文档
  const fragment = await fragmentUseCases.getFragment(fragmentId);
  const documents = fragment.referencedDocuments;
  
  // 显示文档列表对话框
  showReferenceDocumentsDialog.value = true;
  referenceDocuments.value = documents;
  selectedFragmentId.value = fragmentId;
};
```

#### 步骤6.2：实现文档列表对话框

**新组件**：`src/presentation/components/FragmentReferenceDialog.vue`

**功能**：
- 显示引用该片段的所有文档列表
- 显示每个文档的连接状态
- 支持点击跳转到文档

**UI设计**：
```
┌─────────────────────────────────┐
│ 知识片段: 片段标题              │
├─────────────────────────────────┤
│ 被以下文档引用：                 │
│                                 │
│ 🟢 文档1 (已连接)               │
│ 🔴 文档2 (已断开)               │
│ 🟢 文档3 (已连接)               │
│                                 │
│ [关闭]                           │
└─────────────────────────────────┘
```

### 阶段7：UI更新和样式

#### 步骤7.1：编辑界面的引用标志样式（语法高亮）

**文件**：`src/presentation/components/MarkdownEditor.vue`

**样式**（用于编辑器的语法高亮）：
```css
/* 编辑器中的引用标志高亮样式 */
.fragment-reference-tag {
  color: #28a745;  /* 绿色 - 已连接 */
  font-weight: 500;
  cursor: pointer;
  background-color: rgba(40, 167, 69, 0.1);
  padding: 1px 2px;
  border-radius: 2px;
}

.fragment-reference-tag.disconnected {
  color: #dc3545;  /* 红色 - 已断开 */
  background-color: rgba(220, 53, 69, 0.1);
}

.fragment-reference-tag:hover {
  background-color: rgba(40, 167, 69, 0.2);
  text-decoration: underline;
}

.fragment-reference-tag.disconnected:hover {
  background-color: rgba(220, 53, 69, 0.2);
}
```

**注意**：
- 这些样式用于编辑器的语法高亮，不是预览界面的样式
- 预览界面会显示片段内容，不需要这些样式
- 如果使用 CodeMirror 或 Monaco Editor，需要配置自定义语法高亮规则

#### 步骤7.2：知识片段库UI更新

**文件**：`src/presentation/components/KnowledgeFragmentSidebar.vue`

**更新内容**：
1. 添加双击事件监听
2. 显示引用文档数量
3. 添加编辑按钮（作为双击的替代）

---

## 4. 详细实现计划

### 4.1 数据模型扩展（优先级：高）

**任务清单**：
- [ ] 扩展 `KnowledgeFragment` 实体
- [ ] 扩展 `Document` 实体
- [ ] 更新类型定义
- [ ] 更新DTO
- [ ] 更新仓储实现（支持新字段的序列化/反序列化）

**预计工作量**：1-2天

### 4.2 引用标志解析和渲染（优先级：高）

**任务清单**：
- [ ] 实现引用标志解析器
- [ ] 实现引用标志渲染器
- [ ] 集成到Markdown处理流程
- [ ] 测试解析和渲染功能

**预计工作量**：2-3天

### 4.3 引用管理服务（优先级：高）

**任务清单**：
- [ ] 实现引用注册服务
- [ ] 实现引用同步服务
- [ ] 集成到用例层
- [ ] 测试引用管理功能

**预计工作量**：2-3天

### 4.4 断开连接检测（优先级：中）

**任务清单**：
- [ ] 实现内容变更检测
- [ ] 实现断开连接处理
- [ ] 集成到编辑器
- [ ] 测试断开连接功能

**预计工作量**：2天

### 4.5 知识片段库双击编辑（优先级：中）

**任务清单**：
- [ ] 实现双击编辑功能
- [ ] 实现同步更新机制
- [ ] 集成到用例层
- [ ] 测试同步更新功能

**预计工作量**：2天

### 4.6 引用标志点击交互（优先级：中）

**任务清单**：
- [ ] 实现点击事件处理
- [ ] 实现文档列表对话框
- [ ] 实现文档跳转功能
- [ ] 测试交互功能

**预计工作量**：1-2天

### 4.7 UI更新和样式（优先级：低）

**任务清单**：
- [ ] 设计引用标志样式
- [ ] 更新知识片段库UI
- [ ] 添加引用文档数量显示
- [ ] 优化用户体验

**预计工作量**：1-2天

**总计预计工作量**：11-16天

---

## 5. 关键技术点

### 5.1 引用位置追踪

**挑战**：文档内容修改时，引用位置会发生变化

**解决方案**：
- 使用字符索引追踪位置
- 内容变化时重新解析引用标志（因为引用标志在文档中是可见的）
- 不需要使用UUID标记，因为引用标志本身就是标记

### 5.2 编辑界面和预览界面的同步

**挑战**：编辑界面显示标志，预览界面显示内容，需要保持同步

**解决方案**：
- 编辑界面的内容就是原始Markdown（包含 `{{ref:xxx}}`）
- 预览时，先解析引用标志并替换为内容，再渲染
- 导出时，同样先替换引用标志为内容，再导出
- 编辑和预览使用同一份原始内容，只是处理方式不同

### 5.3 断开连接检测

**挑战**：如何准确检测引用标志是否被修改

**解决方案**：
- 监听编辑器的内容变化事件
- 解析文档中的所有引用标志
- 比较前后两次解析结果，找出被修改或删除的引用
- 如果引用标志不再是 `{{ref:xxx}}` 格式，视为已修改
- 更新为 `{{ref:xxx:disconnected}}` 格式

### 5.4 同步更新性能

**挑战**：片段更新时需要同步多个文档，可能影响性能

**解决方案**：
- 使用异步批量更新
- 使用事件队列，避免阻塞
- 只更新已连接的引用

### 5.5 向后兼容

**挑战**：已有数据没有新字段

**解决方案**：
- 新字段使用可选类型
- 反序列化时提供默认值
- 迁移脚本（如果需要）

---

## 6. 测试计划

### 6.1 单元测试

- [ ] KnowledgeFragment 实体方法测试
- [ ] Document 实体方法测试
- [ ] 引用标志解析器测试
- [ ] 引用标志渲染器测试
- [ ] 引用管理服务测试

### 6.2 集成测试

- [ ] 创建片段并插入引用测试
- [ ] 片段更新同步测试
- [ ] 断开连接测试
- [ ] 重新连接测试

### 6.3 端到端测试

- [ ] 完整引用流程测试
- [ ] 双击编辑同步测试
- [ ] 引用标志点击交互测试

---

## 7. 风险评估

### 7.1 技术风险

- **引用位置追踪**：文档内容频繁修改可能导致位置失效
  - **缓解措施**：使用重新解析机制，不依赖绝对位置

- **断开连接检测**：可能误判用户意图
  - **缓解措施**：提供手动断开/连接功能

### 7.2 性能风险

- **同步更新**：大量引用可能导致性能问题
  - **缓解措施**：异步处理，批量更新

### 7.3 用户体验风险

- **引用标志显示**：可能影响文档可读性
  - **缓解措施**：设计简洁的标志样式，支持折叠显示

---

## 8. 后续优化方向

1. **引用关系可视化**：图形化显示引用关系
2. **批量操作**：批量断开/连接引用
3. **引用历史**：记录引用变更历史
4. **引用统计**：统计片段被引用次数
5. **智能建议**：根据内容推荐相关片段

---

## 9. 总结

本实施计划详细规划了知识片段引用机制的实现，包括：

1. ✅ 数据模型扩展（片段和文档）
2. ✅ 引用标志解析和渲染
3. ✅ 引用管理服务
4. ✅ 断开连接检测
5. ✅ 双击编辑和同步更新
6. ✅ 引用标志点击交互
7. ✅ UI更新和样式

**关键设计决策**：
- 引用标志不渲染内容，只显示引用信息
- 通过颜色区分连接状态
- 支持断开连接保护用户编辑的内容
- 双击编辑自动同步到所有引用文档

**预计完成时间**：2-3周（根据开发速度调整）

