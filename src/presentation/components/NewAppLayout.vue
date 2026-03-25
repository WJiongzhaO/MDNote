<template>
  <div class="new-app-layout">
    <div class="main-content">
      <!-- 左侧图标栏 -->
      <SidebarIconBar
        :active-sidebar="activeSidebar"
        @switch-sidebar="handleSwitchSidebar"
        @back-to-vault-select="handleBackToVaultSelect"
        @manage-fragments="handleManageFragments"
      />

      <!-- 可调整大小的侧边栏 -->
      <ResizableSidebar
        :visible="activeSidebar !== null"
        :default-width="300"
        :min-width="200"
        :max-width="600"
      >
        <!-- 文件资源管理器 -->
        <FileExplorer
          v-if="activeSidebar === 'folders'"
          ref="fileExplorerRef"
          :view-mode="documentViewMode"
          @select-file="handleSelectFile"
          @select-document="handleSelectDocument"
          @create-sub-document="handleCreateSubDocument"
          @move-document="handleMoveDocumentToParent"
          @open-folder="handleOpenLocalFolder"
          @create-from-template="handleCreateFromTemplate"
        />

        <!-- 知识片段库侧边栏 -->
        <KnowledgeFragmentSidebar
          v-if="activeSidebar === 'fragments'"
          ref="knowledgeFragmentSidebarRef"
          :markdown-editor-ref="markdownEditorRef"
          @insert="(fragment) => handleInsertFragment(fragment.id)"
          @fragment-updated="handleFragmentUpdated"
        />

        <!-- 文档模板侧边栏 -->
        <DocumentTemplateSidebar
          v-if="activeSidebar === 'templates'"
          @open-template="handleOpenTemplate"
        />

        <!-- 变量管理侧边栏 -->
        <VariableSidebar
          v-if="activeSidebar === 'variables'"
          ref="variableSidebarRef"
          @variable-updated="handleVariableUpdated"
          @variable-insert="handleInsertVariable"
        />

        <!-- 知识图谱侧边栏 -->
        <KnowledgeGraphSidebar
          v-if="activeSidebar === 'knowledge-graphs'"
          :selected-graph-id="activeKnowledgeGraphId"
          @select-graph="handleSelectKnowledgeGraph"
          @deleted="handleKnowledgeGraphDeleted"
        />
      </ResizableSidebar>

      <!-- 主编辑区域 -->
      <!-- 知识图谱主视图 -->
      <div v-if="activeSidebar === 'knowledge-graphs'" class="knowledge-graph-main">
        <div
          v-if="activeKnowledgeGraph && activeKnowledgeGraph.nodes && activeKnowledgeGraph.nodes.length > 0"
          class="kg-main-toolbar"
        >
          <span class="kg-main-toolbar-title">知识图谱</span>
          <div class="kg-main-toolbar-actions">
            <button
              type="button"
              class="kg-main-toolbar-btn"
              title="唯一写盘方式：将当前内存中的图谱写入 JSON（拖拽、随机布局等不会自动保存）"
              @click="manualSaveKnowledgeGraph"
            >
              手动保存
            </button>
            <button
              type="button"
              class="kg-main-toolbar-btn"
              title="从磁盘重新读取当前 JSON 覆盖内存（与上次「手动保存」后的文件一致）"
              @click="manualLoadKnowledgeGraph"
            >
              手动加载
            </button>
            <button
              type="button"
              class="kg-main-toolbar-btn"
              title="丢弃已保存坐标并重新随机排列节点"
              @click="randomizeSidebarKnowledgeGraphLayout"
            >
              随机重新布局
            </button>
          </div>
        </div>
        <KnowledgeGraphView
          :key="knowledgeGraphViewKey"
          class="kg-main-graph-view"
          :graph="activeKnowledgeGraph"
          :graph-load-key="knowledgeGraphViewKey"
          :layout-randomize-key="kgSidebarLayoutRandomizeKey"
          @jump-to="handleKnowledgeGraphJumpTo"
          @graph-update="handleKnowledgeGraphLayoutUpdate"
        />
      </div>
      <!-- 其他：图片预览 + Markdown 编辑器 -->
      <template v-else>
        <!-- 图片预览区域 -->
        <div v-if="currentDocument && (currentDocument as any).fileType === 'image'" class="image-preview-container">
          <div class="image-preview-content" v-html="currentDocument?.content"></div>
        </div>
        <!-- Markdown 编辑器 -->
        <MarkdownEditor
          v-else
          :document="currentDocument"
          :render-markdown="renderMarkdown"
          @update-document="handleUpdateDocument"
          ref="markdownEditorRef"
        />
      </template>
    </div>

    <!-- 通过模板创建文档对话框（沿用“新建文件”窗口样式） -->
    <div
      v-if="showTemplateCreateDialog"
      class="modal-overlay"
      @click.self="cancelCreateFromTemplate"
    >
      <div class="modal" @click.stop>
        <h3>通过模板创建文档</h3>
        <input
          type="text"
          v-model="templateFileName"
          placeholder="文件名（如：meeting-notes.md）"
          @keyup.enter="confirmCreateFromTemplate"
        />

        <div class="template-dialog-main">
          <div class="template-dialog-list">
            <div
              v-for="tpl in templateList"
              :key="tpl.fullPath"
              class="template-dialog-item"
              :class="{ active: selectedTemplatePath === tpl.fullPath }"
              @click="selectDialogTemplate(tpl)"
            >
              <div class="name">{{ tpl.name }}</div>
              <div class="file">{{ tpl.fileName }}</div>
            </div>
            <div v-if="templateList.length === 0" class="template-dialog-empty">
              暂无可用模板，请先在“文档模板”侧边栏中创建。
            </div>
          </div>

          <div class="template-dialog-preview">
            <div class="title">模板预览</div>
            <div
              v-if="selectedTemplatePath"
              class="content"
              v-html="templatePreviewHtml[selectedTemplatePath] || '加载预览中...'"
            ></div>
            <div v-else class="placeholder">
              请选择左侧模板查看预览
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelCreateFromTemplate">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!templateFileName.trim() || !selectedTemplatePath"
            @click="confirmCreateFromTemplate"
          >
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- 快速搜索弹窗 -->
    <QuickSearchDialog
      :visible="showQuickSearch"
      :query="searchQuery"
      :replace="replaceText"
      :case-sensitive="searchCaseSensitive"
      :use-regex="searchUseRegex"
      :scope="searchScope"
      :total="searchTotal"
      :current="searchCurrentIndex"
      @close="closeQuickSearch"
      @update:query="handleSearchQueryChange"
      @update:replace="value => (replaceText = value)"
      @options-change="handleSearchOptionsChange"
      @next="goToNextMatch"
      @prev="goToPrevMatch"
      @replace-one="replaceCurrent"
      @replace-all="replaceAll"
    />

    <!-- 知识片段管理器 -->
    <FragmentManager
      v-if="showFragmentManager"
      @close="handleCloseFragmentManager"
    />

    <div v-if="error" class="error-toast">
      {{ error }}
      <button @click="error = null" class="error-close">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch, provide, toRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Application } from '../../core/application';
import { useDocuments } from '../composables/useDocuments';
import { useFolders } from '../composables/useFolders';
import MarkdownEditor from './MarkdownEditor.vue';
import FileExplorer from './FileExplorer.vue';
import KnowledgeFragmentSidebar from './KnowledgeFragmentSidebar.vue';
import DocumentTemplateSidebar from './DocumentTemplateSidebar.vue';
import VariableSidebar from './VariableSidebar.vue';
import KnowledgeGraphSidebar from './KnowledgeGraphSidebar.vue';
import KnowledgeGraphView from './KnowledgeGraphView.vue';
import SidebarIconBar, { type SidebarType } from './SidebarIconBar.vue';
import ResizableSidebar from './ResizableSidebar.vue';
import FragmentManager from './FragmentManager.vue';
import type { KnowledgeFragmentResponse } from '../../application/dto/knowledge-fragment.dto';
import { FileSystemTemplateService, type DocumentTemplateInfo } from '../../infrastructure/services/template.service';
import { INITIAL_DOCUMENT_TEMPLATES } from '../../infrastructure/services/default-templates';
import QuickSearchDialog from './QuickSearchDialog.vue';
import type { KnowledgeGraph } from '../../domain/services/knowledge-graph-extractor';

const route = useRoute();
const router = useRouter();

const {
  documents,
  documentTree,
  currentDocument,
  isLoading,
  error,
  createDocument,
  updateDocument,
  loadDocument,
  loadDocumentsByFolder,
  loadDocumentTree,
  createSubDocument,
  moveDocumentToParent,
  renderMarkdown
} = useDocuments();

const {
  folderTree,
  createFolder,
  updateFolder,
  deleteFolder,
  loadFolders
} = useFolders();

const activeSidebar = ref<SidebarType>('folders'); // 默认显示文件夹
const showFragmentManager = ref(false); // 显示知识片段管理器
const selectedFolderId = ref<string | null>(null);
const fileExplorerRef = ref<InstanceType<typeof FileExplorer> | null>(null);
const markdownEditorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null);
const knowledgeFragmentSidebarRef = ref<InstanceType<typeof KnowledgeFragmentSidebar> | null>(null);
const variableSidebarRef = ref<InstanceType<typeof VariableSidebar> | null>(null);
const currentFilePath = ref<string>('');
const lastOpenedFolderPath = ref<string>(''); // 保存最后打开的文件夹路径
const dataPath = ref<string>(''); // 当前数据路径 - 从 Electron API 获取
const activeKnowledgeGraph = ref<KnowledgeGraph | null>(null);
const activeKnowledgeGraphPath = ref<string | null>(null);
/** 与列表选中同步（侧边栏 v-if 销毁重建时用于恢复高亮） */
const activeKnowledgeGraphId = ref<string | null>(null);
const kgSidebarLayoutRandomizeKey = ref(0);
/** 切换图谱文件时递增，强制主视图重建，避免 Cytoscape 残留上一张图的状态 */
const kgGraphSwitchEpoch = ref(0);
/** 列表点击切换图谱时的请求序号，防止多次 await 完成后旧读盘覆盖新选中 */
let kgSelectRequestSeq = 0;

const knowledgeGraphViewKey = computed(
  () =>
    `${activeKnowledgeGraphPath.value ?? ''}#${activeKnowledgeGraphId.value ?? ''}#${kgGraphSwitchEpoch.value}`
);
const documentViewMode = ref<'list' | 'tree'>('list'); // 文档视图模式：列表或树形

// 模板创建对话框状态
const showTemplateCreateDialog = ref(false);
const templateTargetFolder = ref<string>('');
const templateFileName = ref<string>('');
const templateList = ref<DocumentTemplateInfo[]>([]);
const selectedTemplatePath = ref<string | null>(null);
const templatePreviewHtml = ref<Record<string, string>>({});

const templateService = new FileSystemTemplateService();

// 快速搜索状态
const showQuickSearch = ref(false);
const searchQuery = ref('');
const replaceText = ref('');
const searchCaseSensitive = ref(false);
const searchUseRegex = ref(false);
const searchScope = ref<'document' | 'project'>('document');
const searchTotal = ref(0);
const searchCurrentIndex = ref(0);

interface SearchMatch {
  index: number;
  length: number;
}

let currentDocumentMatches: SearchMatch[] = [];

// 为VariableSidebar提供依赖
const currentDocumentContent = ref('');
const currentDocumentPath = ref<string>('');

provide('currentDocumentPath', currentDocumentPath);
provide('currentDocumentContent', currentDocumentContent);


// 处理选择文件（从文件资源管理器）
const handleSelectFile = async (filePath: string) => {
  // 如果 filePath 为空，说明是清空选中状态（例如文件被删除）
  if (!filePath) {
    currentFilePath.value = '';
    currentDocumentPath.value = '';
    currentDocument.value = null;
    currentDocumentContent.value = '';
    return;
  }

  currentFilePath.value = filePath;
  currentDocumentPath.value = filePath;

  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file) {
      // 使用策略模式的FileOpenerManager
      const { InversifyContainer } = await import('../../core/container/inversify.container');
      const { TYPES } = await import('../../core/container/container.types');
      const container = InversifyContainer.getInstance();
      const fileOpenerManager = container.get<any>(TYPES.FileOpenerManager);

      // 检查是否为图片文件（图片不需要读取文本内容）
      const isImageFile = /\.(png|jpg|jpeg|gif|bmp|webp|svg|ico|tiff|tif)$/i.test(filePath);

      let content: string | undefined;
      if (!isImageFile && electronAPI.file.readFileContent) {
        content = await electronAPI.file.readFileContent(filePath);
      }

      const result = await fileOpenerManager.openFile(filePath, content);

      // 创建临时文档对象以兼容现有组件
      const tempDocument: any = {
        id: `external-${Date.now()}`,
        title: result.title,
        content: result.content,
        folderId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        filePath: filePath,
        fileType: result.fileType,
        metadata: result.metadata
      };

      currentDocument.value = tempDocument;
      currentDocumentContent.value = result.content;

      await nextTick();
      updateFragmentSidebarContext();
    }
  } catch (error) {
    console.error('Error reading file:', error);
    alert('读取文件失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 处理创建子文档
const handleCreateSubDocument = async (parentId: string) => {
  try {
    await createSubDocument(parentId);
    await loadDocumentTree();
    if (fileExplorerRef.value) {
      await fileExplorerRef.value.loadDocumentTree();
    }
  } catch (error) {
    console.error('Error creating sub document:', error);
    alert('创建子文档失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 处理移动文档到父文档
const handleMoveDocumentToParent = async (documentId: string, newParentId: string | null) => {
  try {
    await moveDocumentToParent(documentId, newParentId);
    await loadDocumentTree();
    if (fileExplorerRef.value) {
      await fileExplorerRef.value.loadDocumentTree();
    }
  } catch (error) {
    console.error('Error moving document:', error);
    alert('移动文档失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 处理打开本地文件夹
const handleOpenLocalFolder = async (folderPath: string) => {
  lastOpenedFolderPath.value = folderPath;

  dataPath.value = folderPath;
  console.log('[NewAppLayout] handleOpenLocalFolder - dataPath updated to:', folderPath);

  // 关键：同步更新主进程的 dataPath
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.setCustomDataPath) {
      console.log('[NewAppLayout] Calling setCustomDataPath with:', folderPath);
      await electronAPI.file.setCustomDataPath(folderPath);
      console.log('[NewAppLayout] setCustomDataPath success');
    }
  } catch (error) {
    console.error('[NewAppLayout] Error setting custom data path:', error);
  }

  // 保存上次打开的文件夹
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.saveLastOpenedFolder) {
      await electronAPI.file.saveLastOpenedFolder(folderPath);
    }
  } catch (error) {
    console.error('Error saving last opened folder:', error);
  }

  // 文件夹已经在FileExplorer中打开，这里可以做其他处理
  // 确保切换到文件夹侧边栏
  if (activeSidebar.value !== 'folders') {
    activeSidebar.value = 'folders';
  }
};

// 监听 dataPath 变化
watch(dataPath, (newPath) => {
  console.log('[NewAppLayout] dataPath changed:', newPath);
});

// 切换侧边栏时，如果切换回文件夹，恢复之前打开的文件夹
const handleSwitchSidebar = async (type: SidebarType) => {
  activeSidebar.value = type;
  // 当切换到知识片段侧边栏时，确保上下文已更新
  if (type === 'fragments') {
    await nextTick();
    updateFragmentSidebarContext();
  }
};

// 返回知识库选择页面
const handleBackToVaultSelect = () => {
  router.push('/');
};

// 打开知识片段管理器
const handleManageFragments = () => {
  showFragmentManager.value = true;
};

// 关闭知识片段管理器
const handleCloseFragmentManager = () => {
  showFragmentManager.value = false;
};

/** 离开知识图谱模式时清空，避免「列表无选中但主区仍显示上次图谱」 */
function clearKnowledgeGraphSession() {
  activeKnowledgeGraph.value = null;
  activeKnowledgeGraphPath.value = null;
  activeKnowledgeGraphId.value = null;
  kgSidebarLayoutRandomizeKey.value = 0;
}

const handleSelectKnowledgeGraph = async (info: any) => {
  const seq = ++kgSelectRequestSeq;
  try {
    const { FileSystemKnowledgeGraphService } = await import('../../infrastructure/services/knowledge-graph-file.service');
    const service = new FileSystemKnowledgeGraphService();
    const resolvedPath = await service.resolveKnowledgeGraphPath(info.fullPath);
    if (seq !== kgSelectRequestSeq) return;
    const file = await service.readGraph(resolvedPath);
    if (seq !== kgSelectRequestSeq) return;
    activeKnowledgeGraphPath.value = resolvedPath;
    activeKnowledgeGraph.value = file.graph;
    activeKnowledgeGraphId.value = file.id;
    kgSidebarLayoutRandomizeKey.value = 0;
    kgGraphSwitchEpoch.value += 1;
  } catch (e) {
    console.error('加载知识图谱失败:', e);
  }
};

const randomizeSidebarKnowledgeGraphLayout = () => {
  if (!activeKnowledgeGraph.value) return;
  const { nodePositions: _np, ...rest } = activeKnowledgeGraph.value;
  activeKnowledgeGraph.value = { ...rest };
  kgSidebarLayoutRandomizeKey.value += 1;
};

/** 侧栏知识图谱唯一写盘入口：将当前内存中的 graph 写入当前 JSON */
const manualSaveKnowledgeGraph = async () => {
  const path = activeKnowledgeGraphPath.value;
  const graph = activeKnowledgeGraph.value;
  if (!path || !graph?.nodes?.length) {
    window.alert('请先通过左侧列表打开一个知识图谱。');
    return;
  }
  try {
    const { FileSystemKnowledgeGraphService } = await import('../../infrastructure/services/knowledge-graph-file.service');
    const service = new FileSystemKnowledgeGraphService();
    await service.writeGraphData(path, toRaw(graph) as KnowledgeGraph);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[知识图谱 手动保存] 失败', e);
    window.alert(`手动保存失败：${msg}`);
  }
};

/**
 * 调试：从磁盘重新读取当前 JSON 覆盖内存视图。
 * 注意：不会先把内存里未防抖的改动写盘；若需保留请先点「手动保存」。
 */
const manualLoadKnowledgeGraph = async () => {
  const path = activeKnowledgeGraphPath.value;
  if (!path) {
    window.alert('当前没有图谱文件路径，请先从列表打开一项。');
    return;
  }
  const seq = ++kgSelectRequestSeq;
  try {
    const { FileSystemKnowledgeGraphService } = await import('../../infrastructure/services/knowledge-graph-file.service');
    const service = new FileSystemKnowledgeGraphService();
    const resolvedPath = await service.resolveKnowledgeGraphPath(path);
    const file = await service.readGraph(resolvedPath);
    if (seq !== kgSelectRequestSeq) return;
    activeKnowledgeGraphPath.value = resolvedPath;
    activeKnowledgeGraph.value = file.graph;
    activeKnowledgeGraphId.value = file.id;
    kgSidebarLayoutRandomizeKey.value = 0;
    kgGraphSwitchEpoch.value += 1;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[知识图谱 手动加载] 失败', e);
    window.alert(`手动加载失败：${msg}`);
  }
};

/** 仅更新内存，不写 JSON；落盘请点「手动保存」 */
const handleKnowledgeGraphLayoutUpdate = (graph: KnowledgeGraph) => {
  activeKnowledgeGraph.value = graph;
};

const handleKnowledgeGraphDeleted = () => {
  clearKnowledgeGraphSession();
};

const handleKnowledgeGraphJumpTo = async (payload: {
  documentId: string;
  documentTitle?: string;
  start: number;
  end: number;
}) => {
  if (payload.documentId === 'sample-doc') {
    return;
  }
  activeSidebar.value = null;
  if (currentDocument.value?.id !== payload.documentId) {
    await loadDocument(payload.documentId);
  }
  await nextTick();
  await nextTick();
  const editor = markdownEditorRef.value as any;
  if (editor?.setSelectionRange) {
    editor.setSelectionRange(payload.start, payload.end);
  }
};

// 处理从文件树触发的“通过模板创建”事件
const handleCreateFromTemplate = async (parentPath: string) => {
  templateTargetFolder.value = parentPath || '';
  templateFileName.value = '';
  selectedTemplatePath.value = null;
  templatePreviewHtml.value = {};

  try {
    templateList.value = await templateService.listTemplates();
  } catch (error) {
    console.error('加载模板列表失败:', error);
    alert('加载模板列表失败，请先在模板侧边栏中配置模板。');
    return;
  }

  if (templateList.value.length === 0) {
    alert('当前还没有任何模板，请先在“文档模板”侧边栏中创建模板。');
    return;
  }

  showTemplateCreateDialog.value = true;
};

const selectDialogTemplate = async (tpl: DocumentTemplateInfo) => {
  selectedTemplatePath.value = tpl.fullPath;
  if (!templateFileName.value) {
    templateFileName.value = `${tpl.name}.md`;
  }

  if (!templatePreviewHtml.value[tpl.fullPath]) {
    try {
      const content = await templateService.readTemplate(tpl.fullPath);
      const snippet = content.substring(0, 800);
      templatePreviewHtml.value[tpl.fullPath] = await renderMarkdown(snippet, `file:${tpl.fullPath}`);
    } catch (error) {
      console.error('渲染模板预览失败:', error);
      templatePreviewHtml.value[tpl.fullPath] = '<p>预览加载失败</p>';
    }
  }
};

const confirmCreateFromTemplate = async () => {
  if (!templateTargetFolder.value) {
    alert('未找到目标文件夹路径，请先在文件树中打开目标文件夹。');
    return;
  }
  if (!templateFileName.value.trim()) {
    alert('请填写新文档文件名');
    return;
  }
  if (!selectedTemplatePath.value) {
    alert('请选择要使用的模板');
    return;
  }

  const finalName = templateFileName.value.trim().endsWith('.md')
    ? templateFileName.value.trim()
    : `${templateFileName.value.trim()}.md`;
  const newFilePath = `${templateTargetFolder.value}/${finalName}`;

  try {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.writeFileContent || !electronAPI.file.readFileContent) {
      alert('文件系统 API 不可用，无法创建文件');
      return;
    }

    const content = await electronAPI.file.readFileContent(selectedTemplatePath.value);
    await electronAPI.file.writeFileContent(newFilePath, content);

    // 刷新文件树视图，确保新文件立刻可见
    if (fileExplorerRef.value && templateTargetFolder.value) {
      try {
        await (fileExplorerRef.value as any).loadFolder(templateTargetFolder.value);
        // 等待文件树更新后，更新选中状态
        await nextTick();
        // 使用 setSelectedPath 设置选中状态（FileTreeNode 会使用路径标准化比较）
        if ((fileExplorerRef.value as any).setSelectedPath) {
          (fileExplorerRef.value as any).setSelectedPath(newFilePath);
        }
      } catch (e) {
        console.warn('刷新文件树失败，但文件已经创建:', e);
      }
    }

    showTemplateCreateDialog.value = false;
    // 创建完成后直接在编辑器中打开新文件
    await handleSelectFile(newFilePath);
  } catch (error) {
    console.error('通过模板创建文档失败:', error);
    alert('创建文档失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const cancelCreateFromTemplate = () => {
  showTemplateCreateDialog.value = false;
};

// 更新知识片段侧边栏的文档上下文
const updateFragmentSidebarContext = () => {
  // updateFragmentSidebarContext 被调用

  if (!knowledgeFragmentSidebarRef.value) {
    // 组件还未挂载，静默返回
    return;
  }

  const context: { documentId?: string; filePath?: string } = {};

  // 优先从MarkdownEditor获取上下文（因为它有最新的状态）
  if (markdownEditorRef.value) {
    const editorContext = (markdownEditorRef.value as any).getDocumentContext?.();
    if (editorContext) {
      context.documentId = editorContext.documentId;
      context.filePath = editorContext.filePath;
    }
  }

  // 如果编辑器没有上下文，使用NewAppLayout的状态
  if (!context.documentId && !context.filePath) {
    if (currentDocument.value) {
      context.documentId = currentDocument.value.id;
      // 如果文档对象包含 filePath（外部文件），也要传递
      if ((currentDocument.value as any).filePath) {
        context.filePath = (currentDocument.value as any).filePath;
      }
    } else if (currentFilePath.value) {
      context.filePath = currentFilePath.value;
    }
  }

  // 如果已经有 documentId 但没有 filePath，尝试从 currentDocument 或 currentFilePath 获取
  if (context.documentId && !context.filePath) {
    if (currentDocument.value && (currentDocument.value as any).filePath) {
      context.filePath = (currentDocument.value as any).filePath;
    } else if (currentFilePath.value) {
      context.filePath = currentFilePath.value;
    }
  }

  // 更新知识片段侧边栏文档上下文
  (knowledgeFragmentSidebarRef.value as any).setDocumentContext(context);
};

// 监听当前文档或文件变化，更新知识片段侧边栏的文档上下文
watch([currentDocument, currentFilePath], () => {
  // 只有当知识片段侧边栏已挂载时才更新上下文
  if (knowledgeFragmentSidebarRef.value) {
    nextTick(() => {
      updateFragmentSidebarContext();
    });
  }
});

// 监听MarkdownEditor的变化（通过nextTick确保组件已挂载）
watch(() => markdownEditorRef.value, () => {
  if (markdownEditorRef.value && knowledgeFragmentSidebarRef.value) {
    nextTick(() => {
      updateFragmentSidebarContext();
    });
  }
});

// 监听知识片段侧边栏的挂载，当它挂载后更新上下文
watch(() => knowledgeFragmentSidebarRef.value, () => {
  if (knowledgeFragmentSidebarRef.value) {
    nextTick(() => {
      updateFragmentSidebarContext();
    });
  }
});

// 当选择文档时，也更新上下文
const handleSelectDocument = async (id: string) => {
  // 清空外部文件路径（因为选择了数据库文档）
  currentFilePath.value = '';
  await loadDocument(id);
  await nextTick();
  updateFragmentSidebarContext();
};

// 监听侧边栏切换：离开知识图谱时清空会话（图谱 JSON 仅手动保存写盘）；切换回文件夹时恢复路径
watch(activeSidebar, async (newType, oldType) => {
  if (oldType === 'knowledge-graphs' && newType !== 'knowledge-graphs') {
    clearKnowledgeGraphSession();
  }
  // 只有当从其他侧边栏切换到文件夹时才恢复
  if (newType === 'folders' && oldType !== 'folders' && lastOpenedFolderPath.value) {
    // 等待组件渲染完成
    await nextTick();
    // 再次等待，确保FileExplorer组件已完全挂载
    await nextTick();
    // 使用setTimeout确保DOM完全更新
    setTimeout(() => {
      if (fileExplorerRef.value && lastOpenedFolderPath.value) {
        console.log('恢复文件夹路径:', lastOpenedFolderPath.value);
        (fileExplorerRef.value as any).loadFolder(lastOpenedFolderPath.value);
      }
    }, 100);
  }
});

const handleUpdateDocument = async (id: string, title: string, content: string) => {
  await updateDocument({
    id,
    title,
    content
  });

  // 同步更新currentDocumentContent，供VariableSidebar使用
  currentDocumentContent.value = content;
  currentDocumentPath.value = id;
};

// 处理知识片段更新事件
const handleFragmentUpdated = async (fragmentId: string) => {
  // 刷新编辑器预览（不重新加载内容，因为内容中保持引用标志）
  if (markdownEditorRef.value) {
    try {
      const editor = markdownEditorRef.value as any;
      // 只刷新预览，不改变编辑器内容
      // 因为文档内容中保持引用标志 {{ref:xxx}}，预览时会自动解析为最新内容
      editor.refreshContent?.();
    } catch (error) {
      console.error('Error refreshing editor after fragment update:', error);
    }
  }
};

// 监听菜单事件
onMounted(async () => {
  console.log('[NewAppLayout] onMounted - Initializing...');

  const electronAPI = (window as any).electronAPI;

  const vaultPath = route.query.vaultPath as string | undefined;
  const vaultId = route.query.vaultId as string | undefined;

  if (vaultPath) {
    console.log('[NewAppLayout] Loading vault from route params:', vaultPath);
    dataPath.value = vaultPath;
    lastOpenedFolderPath.value = vaultPath;

    try {
      if (electronAPI && electronAPI.file && electronAPI.file.setCustomDataPath) {
        await electronAPI.file.setCustomDataPath(vaultPath);
      }
      if (electronAPI && electronAPI.file && electronAPI.file.saveLastOpenedFolder) {
        await electronAPI.file.saveLastOpenedFolder(vaultPath);
      }
    } catch (error) {
      console.error('[NewAppLayout] Error setting vault path:', error);
    }
  } else {
    try {
      if (electronAPI && electronAPI.file && electronAPI.file.getCustomDataPath) {
        const customPath = await electronAPI.file.getCustomDataPath();
        if (customPath) {
          console.log('[NewAppLayout] Found custom data path:', customPath);
          dataPath.value = customPath;
        } else {
          console.log('[NewAppLayout] No custom data path, using default');
          if (electronAPI.file.getDataPath) {
            const path = await electronAPI.file.getDataPath();
            dataPath.value = path;
            console.log('[NewAppLayout] Using default data path:', path);
          }
        }
      } else if (electronAPI && electronAPI.file && electronAPI.file.getDataPath) {
        const path = await electronAPI.file.getDataPath();
        dataPath.value = path;
        console.log('[NewAppLayout] Using data path from getDataPath:', path);
      }

      console.log('[NewAppLayout] Final initialized dataPath:', dataPath.value);
    } catch (error) {
      console.error('[NewAppLayout] Error getting dataPath:', error);
    }
  }

  await loadFolders();
  await loadDocumentsByFolder(null);

  if (electronAPI && electronAPI.menu) {
    electronAPI.menu.onSave(async () => {
      if (markdownEditorRef.value && currentFilePath.value) {
        const editor = markdownEditorRef.value as any;
        const content = editor.getContent?.();
        if (content !== undefined && electronAPI.file && electronAPI.file.writeFileContent) {
          await electronAPI.file.writeFileContent(currentFilePath.value, content);
        }
      }
    });
  }

  if (electronAPI && electronAPI.on) {
    electronAPI.on('app:restore-last-folder', async (folderPath: string) => {
      if (folderPath) {
        lastOpenedFolderPath.value = folderPath;
        if (activeSidebar.value === 'folders' && fileExplorerRef.value) {
          await nextTick();
          (fileExplorerRef.value as any).loadFolder(folderPath);
        }
      }
    });
  }

  if (vaultPath) {
    if (activeSidebar.value !== 'folders') {
      activeSidebar.value = 'folders';
    }
    await nextTick();
    await nextTick();
    if (fileExplorerRef.value) {
      (fileExplorerRef.value as any).loadFolder(vaultPath);
    }
  } else {
    try {
      if (electronAPI && electronAPI.file && electronAPI.file.getLastOpenedFolder) {
        const lastFolder = await electronAPI.file.getLastOpenedFolder();
        if (lastFolder) {
          lastOpenedFolderPath.value = lastFolder;
          if (activeSidebar.value !== 'folders') {
            activeSidebar.value = 'folders';
          }
          await nextTick();
          await nextTick();
          if (fileExplorerRef.value) {
            (fileExplorerRef.value as any).loadFolder(lastFolder);
          }
        }
      }
    } catch (error) {
      console.error('Error loading last opened folder:', error);
    }
  }

  const application = Application.getInstance();
  const documentUseCases = application.getDocumentUseCases();
  const existingDocs = await documentUseCases.getAllDocuments();
  if (existingDocs.length === 0) {
    await createDocument({
      title: '欢迎使用 MD Note',
      content: `# 欢迎使用 MD Note

这是一个支持文件夹管理的 Markdown 笔记应用。

## 特性

- 📝 **Markdown 编辑** - 支持完整的 Markdown 语法
- 👁️ **实时预览** - 左侧编辑，右侧实时预览
- 📚 **文档管理** - 轻松管理您的所有文档
- 🔍 **搜索功能** - 快速找到您需要的文档
- 📁 **文件夹支持** - 支持嵌套文件夹管理文档
- 💾 **本地存储** - 所有数据自动保存在用户本地文件系统

## 使用方法

1. 从 File 菜单打开本地文件夹
2. 在文件树中浏览和编辑文件
3. 右键点击可以新建文件或文件夹
4. 所有更改都会自动保存

---

开始使用吧！`,
      folderId: null
    });
  }

  try {
    await templateService.ensureInitialTemplates(INITIAL_DOCUMENT_TEMPLATES);
  } catch (e) {
    console.error('初始化默认模板失败:', e);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('mdnote:open-quick-search', handleOpenQuickSearch);
  }
});

const handleCreateFolder = async (name: string, parentId: string | null = null) => {
  await createFolder({
    name,
    parentId
  });
};

const handleUpdateFolder = async (id: string, name: string) => {
  await updateFolder({
    id,
    name
  });
};

const handleDeleteFolder = async (id: string) => {
  await deleteFolder(id);
  if (selectedFolderId.value === id) {
    selectedFolderId.value = null;
  }
};

const handleMoveDocument = async (documentId: string, targetFolderId: string | null) => {
  const application = Application.getInstance();
  const documentUseCases = application.getDocumentUseCases();
  const currentDoc = await documentUseCases.getDocument(documentId);

  if (currentDoc) {
    await updateDocument({
      id: documentId,
      title: currentDoc.title,
      content: currentDoc.content,
      folderId: targetFolderId
    });
    await loadDocumentsByFolder(selectedFolderId.value);
  }
};

const handleInsertFragment = async (fragmentId: string) => {
  if (markdownEditorRef.value && currentDocument.value) {
    // 调用MarkdownEditor的handleInsertFragment方法
    const editor = markdownEditorRef.value as any;
    if (editor && typeof editor.handleInsertFragment === 'function') {
      await editor.handleInsertFragment(fragmentId);
    }
  }
};

// 变量相关事件处理
const handleVariableUpdated = async (updatedContent: string) => {
  // 当变量更新时，更新编辑器内容
  currentDocumentContent.value = updatedContent;

  if (markdownEditorRef.value) {
    const editor = markdownEditorRef.value as any;
    // 更新编辑器内容
    if (editor && editor.setContent) {
      const currentDoc = currentDocument.value;
      if (currentDoc) {
        // 如果是数据库文档，更新标题和内容
        editor.setContent(currentDoc.title, updatedContent, currentDocumentPath.value);
      } else if (currentFilePath.value) {
        // 如果是外部文件，只更新内容
        const fileName = currentFilePath.value.split(/[/\\]/).pop() || '未命名';
        editor.setContent(fileName, updatedContent, currentFilePath.value);
      }
    }
  }
};

const handleInsertVariable = async (variableName: string) => {
  if (markdownEditorRef.value) {
    const editor = markdownEditorRef.value as any;
    if (editor && editor.insertText) {
      const variablePlaceholder = `{{${variableName}}}`;
      editor.insertText(variablePlaceholder);
    }
  }
};

// 从模板侧边栏打开模板：复用文件打开逻辑
const handleOpenTemplate = async (fullPath: string) => {
  await handleSelectFile(fullPath);
};

// ===== 快速搜索相关逻辑 =====

const buildSearchRegex = (): RegExp | null => {
  if (!searchQuery.value) return null;
  try {
    const source = searchUseRegex.value ? searchQuery.value : searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = searchCaseSensitive.value ? 'g' : 'gi';
    return new RegExp(source, flags);
  } catch (error) {
    console.error('构建搜索正则失败:', error);
    return null;
  }
};

const performDocumentSearch = () => {
  currentDocumentMatches = [];
  searchTotal.value = 0;
  searchCurrentIndex.value = 0;

  if (!markdownEditorRef.value || !searchQuery.value) return;

  const editor = markdownEditorRef.value as any;
  if (!editor.getContent) return;

  // 获取完整内容（包含 frontmatter）
  const fullContent = editor.getContent() as string;
  const regex = buildSearchRegex();
  if (!regex) return;

  // 分离 frontmatter 和 mainContent，计算 frontmatter 长度
  const frontmatterMatch = fullContent.trimStart().match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const frontmatterLength = frontmatterMatch ? frontmatterMatch[0].length : 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(fullContent)) !== null) {
    // 如果匹配在 frontmatter 中，跳过（因为编辑器只显示 mainContent）
    if (match.index < frontmatterLength) {
      continue;
    }

    // 将位置转换为相对于 mainContent 的位置
    const mainContentIndex = match.index - frontmatterLength;
    currentDocumentMatches.push({
      index: mainContentIndex,
      length: match[0].length
    });
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }

  searchTotal.value = currentDocumentMatches.length;
  searchCurrentIndex.value = 0;

  // 更新预览中的高亮
  if (markdownEditorRef.value) {
    const editor = markdownEditorRef.value as any;
    if (editor.setSearchHighlights) {
      editor.setSearchHighlights(searchQuery.value, searchCaseSensitive.value, searchUseRegex.value);
    }
  }
};

const revealCurrentMatchInEditor = () => {
  if (!markdownEditorRef.value) return;
  const editor = markdownEditorRef.value as any;
  if (!editor.setCurrentSearchMatch || currentDocumentMatches.length === 0) return;

  const match = currentDocumentMatches[searchCurrentIndex.value];
  if (!match) return;
  // 只更新“当前匹配”的样式，不改变 selection，避免光标跑到文档里
  editor.setCurrentSearchMatch(match.index, match.index + match.length);
};

const goToNextMatch = () => {
  if (currentDocumentMatches.length === 0) return;
  searchCurrentIndex.value = (searchCurrentIndex.value + 1) % currentDocumentMatches.length;
  revealCurrentMatchInEditor();
};

const goToPrevMatch = () => {
  if (currentDocumentMatches.length === 0) return;
  searchCurrentIndex.value =
    (searchCurrentIndex.value - 1 + currentDocumentMatches.length) % currentDocumentMatches.length;
  revealCurrentMatchInEditor();
};

const replaceCurrent = () => {
  if (!markdownEditorRef.value || currentDocumentMatches.length === 0) return;
  const editor = markdownEditorRef.value as any;
  if (!editor.replaceTextWithUndo) return;

  const match = currentDocumentMatches[searchCurrentIndex.value];
  if (!match) return;

  // 使用支持撤销的替换方法
  // 注意：这里使用的是 mainContent 中的位置，需要确保位置正确
  const success = editor.replaceTextWithUndo(match.index, match.index + match.length, replaceText.value);

  if (success) {
    // 重新搜索并跳到下一处
    performDocumentSearch();
    if (currentDocumentMatches.length > 0) {
      revealCurrentMatchInEditor();
    }
  }
};

const replaceAll = () => {
  if (!markdownEditorRef.value || !searchQuery.value || currentDocumentMatches.length === 0) return;
  const editor = markdownEditorRef.value as any;
  if (!editor.replaceTextWithUndo) return;

  // 从后往前替换，避免位置偏移问题
  // 同时每个替换都会加入到撤销历史中
  for (let i = currentDocumentMatches.length - 1; i >= 0; i--) {
    const match = currentDocumentMatches[i];
    if (match) {
      editor.replaceTextWithUndo(match.index, match.index + match.length, replaceText.value);
    }
  }

  // 替换后重新统计
  performDocumentSearch();
};

const handleSearchQueryChange = (value: string) => {
  searchQuery.value = value;
  if (searchScope.value === 'document') {
    performDocumentSearch();
    revealCurrentMatchInEditor();
  } else {
    // 仅更新预览高亮（项目搜索的高亮逻辑可后续扩展）
    if (markdownEditorRef.value) {
      const editor = markdownEditorRef.value as any;
      if (editor.setSearchHighlights) {
        editor.setSearchHighlights(searchQuery.value, searchCaseSensitive.value, searchUseRegex.value);
      }
    }
  }
};

const handleSearchOptionsChange = (options: {
  caseSensitive: boolean;
  useRegex: boolean;
  scope: 'document' | 'project';
}) => {
  searchCaseSensitive.value = options.caseSensitive;
  searchUseRegex.value = options.useRegex;
  searchScope.value = options.scope;

  if (searchScope.value === 'document') {
    performDocumentSearch();
    revealCurrentMatchInEditor();
  }
  // TODO: 项目搜索可以在这里触发（需要结合主进程或文件系统 API）
};

const closeQuickSearch = () => {
  showQuickSearch.value = false;
  // 关闭时清除高亮
  if (markdownEditorRef.value) {
    const editor = markdownEditorRef.value as any;
    if (editor.setSearchHighlights) {
      editor.setSearchHighlights('', searchCaseSensitive.value, searchUseRegex.value);
    }
  }
};

const handleOpenQuickSearch = () => {
  showQuickSearch.value = true;

  // 使用编辑器当前选中文本作为默认搜索词
  if (markdownEditorRef.value) {
    const editor = markdownEditorRef.value as any;
    if (editor.getSelectedText) {
      const selected = editor.getSelectedText() as string;
      if (selected && selected.trim()) {
        searchQuery.value = selected;
      }
    }
  }

  if (searchScope.value === 'document') {
    performDocumentSearch();
    revealCurrentMatchInEditor();
  }
};

const findFolderById = (id: string): { id: string; name: string } | null => {
  const findInTree = (tree: any[]): any => {
    for (const item of tree) {
      if (item.id === id) {
        return item;
      }
      if (item.children) {
        const found = findInTree(item.children);
        if (found) return found;
      }
    }
    return null;
  };
  return findInTree(folderTree.value);
};

</script>

<style scoped>
.new-app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.knowledge-graph-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kg-main-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-primary, #e2e8f0);
  background: var(--bg-primary, #fff);
}

.kg-main-toolbar-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.kg-main-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.kg-main-toolbar-btn {
  padding: 6px 12px;
  font-size: 0.875rem;
  border-radius: 6px;
  border: 1px solid var(--border-primary, #e2e8f0);
  background: var(--bg-secondary, #f8fafc);
  color: var(--text-primary);
  cursor: pointer;
}

.kg-main-toolbar-btn:hover {
  background: var(--bg-hover, #f1f5f9);
}

.kg-main-graph-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.image-preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  overflow: auto;
  padding: 20px;
}

.image-preview-content {
  max-width: 100%;
  max-height: 100%;
}

.image-preview-content :deep(img) {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
}

/* 统一与 FileExplorer 新建窗口的样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 20px;
  min-width: 480px;
  max-width: 900px;
  color: var(--text-primary);
}

.modal h3 {
  margin: 0 0 16px 0;
  font-size: 1.1rem;
}

.modal input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.9rem;
  margin-bottom: 16px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.modal-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-primary {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--text-tertiary);
  color: var(--text-inverse);
}

.btn-secondary:hover {
  opacity: 0.9;
}

/* 模板创建对话框中的模板列表与预览区域 */
.template-dialog-main {
  display: flex;
  gap: 12px;
  max-height: 420px;
}

.template-dialog-list {
  width: 40%;
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  overflow-y: auto;
  padding: 4px;
  background: var(--bg-secondary);
}

.template-dialog-item {
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 4px;
}

.template-dialog-item:hover {
  background: var(--bg-hover);
}

.template-dialog-item.active {
  background: var(--bg-active);
  border: 1px solid var(--accent-primary);
}

.template-dialog-item .name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.template-dialog-item .file {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.template-dialog-empty {
  padding: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.template-dialog-preview {
  flex: 1;
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  padding: 8px 10px;
  overflow-y: auto;
  background: var(--bg-primary);
}

.template-dialog-preview .title {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.template-dialog-preview .content {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.template-dialog-preview .placeholder {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

/* 将弹窗预览中的 Mermaid 占位符压缩为单行提示 */
.template-dialog-preview .content :deep(.mermaid-placeholder) {
  min-height: 0;
  padding: 2px 4px;
  background: transparent;
  box-shadow: none;
  display: inline-block;
  font-size: 0.8rem;
}

.template-dialog-preview .content :deep(.mermaid-placeholder)::before {
  content: '此处放置 mermaid 图表或图片';
}

.error-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent-danger);
  color: var(--text-inverse);
  padding: 12px 20px;
  border-radius: 6px;
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

.error-close {
  background: none;
  border: none;
  color: var(--text-inverse);
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

