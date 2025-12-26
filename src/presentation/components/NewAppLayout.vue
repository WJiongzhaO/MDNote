<template>
  <div class="new-app-layout">
    <div class="main-content">
      <!-- 左侧图标栏 -->
      <SidebarIconBar
        :active-sidebar="activeSidebar"
        @switch-sidebar="handleSwitchSidebar"
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
          @select-file="handleSelectFile"
          @open-folder="handleOpenLocalFolder"
        />

        <!-- 知识片段库侧边栏 -->
        <KnowledgeFragmentSidebar
          v-if="activeSidebar === 'fragments'"
          ref="knowledgeFragmentSidebarRef"
          @insert="(fragment) => handleInsertFragment(fragment.id)"
          @fragment-updated="handleFragmentUpdated"
        />

        <!-- Git 侧边栏 -->
        <GitPanel
          v-if="activeSidebar === 'git-history'"
          :repo-path="dataPath"
        />
      </ResizableSidebar>

      <!-- 主编辑区域 -->
      <MarkdownEditor
        :document="currentDocument"
        :render-markdown="renderMarkdown"
        @update-document="handleUpdateDocument"
        ref="markdownEditorRef"
      />
    </div>

    <div v-if="error" class="error-toast">
      {{ error }}
      <button @click="error = null" class="error-close">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { Application } from '../../core/application';
import { useDocuments } from '../composables/useDocuments';
import { useFolders } from '../composables/useFolders';
import MarkdownEditor from './MarkdownEditor.vue';
import FileExplorer from './FileExplorer.vue';
import KnowledgeFragmentSidebar from './KnowledgeFragmentSidebar.vue';
import GitPanel from './git/GitPanel.vue';
import SidebarIconBar, { type SidebarType } from './SidebarIconBar.vue';
import ResizableSidebar from './ResizableSidebar.vue';
import type { KnowledgeFragmentResponse } from '../../application/dto/knowledge-fragment.dto';

const {
  documents,
  currentDocument,
  isLoading,
  error,
  createDocument,
  updateDocument,
  loadDocument,
  loadDocumentsByFolder,
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
const selectedFolderId = ref<string | null>(null);
const fileExplorerRef = ref<InstanceType<typeof FileExplorer> | null>(null);
const markdownEditorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null);
const knowledgeFragmentSidebarRef = ref<InstanceType<typeof KnowledgeFragmentSidebar> | null>(null);
const currentFilePath = ref<string>('');
const lastOpenedFolderPath = ref<string>(''); // 保存最后打开的文件夹路径
const dataPath = ref<string>(''); // Git 仓库路径 - 从 Electron API 获取


// 处理选择文件（从文件资源管理器）
const handleSelectFile = async (filePath: string) => {
  currentFilePath.value = filePath;
  // 清空当前文档（因为选择了外部文件）
  currentDocument.value = null;

  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.readFileContent) {
      const content = await electronAPI.file.readFileContent(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || '未命名';

      // 直接设置编辑器内容（不依赖document对象）
      if (markdownEditorRef.value) {
        (markdownEditorRef.value as any).setContent(fileName, content || '', filePath);
      }

      // 更新知识片段侧边栏的文档上下文
      await nextTick();
      updateFragmentSidebarContext();
    }
  } catch (error) {
    console.error('Error reading file:', error);
    alert('读取文件失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 处理打开本地文件夹
const handleOpenLocalFolder = async (folderPath: string) => {
  lastOpenedFolderPath.value = folderPath;

  // 更新 Git 仓库路径为当前打开的文件夹
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

// 监听侧边栏切换，当切换回文件夹时恢复路径
watch(activeSidebar, async (newType, oldType) => {
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

  // 获取真实的 dataPath（可能是用户上次打开的文件夹）
  try {
    const electronAPI = (window as any).electronAPI;

    // 优先尝试获取自定义路径（用户上次打开的文件夹）
    if (electronAPI && electronAPI.file && electronAPI.file.getCustomDataPath) {
      const customPath = await electronAPI.file.getCustomDataPath();
      if (customPath) {
        console.log('[NewAppLayout] Found custom data path:', customPath);
        dataPath.value = customPath;
      } else {
        console.log('[NewAppLayout] No custom data path, using default');
        // 如果没有自定义路径，获取默认路径
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

  await loadFolders();
  await loadDocumentsByFolder(null);

  // 监听原生菜单事件（Save事件）
  const electronAPI = (window as any).electronAPI;
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

  // 监听主进程发送的恢复文件夹事件
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

  // 获取数据路径（用于Git仓库）
  try {
    if (electronAPI && electronAPI.file && electronAPI.file.getDataPath) {
      const path = await electronAPI.file.getDataPath();
      if (path) {
        dataPath.value = path;
      }
    }
  } catch (error) {
    console.error('Error getting data path:', error);
    // 使用默认路径
  }

  // 尝试加载上次打开的文件夹
  try {
    if (electronAPI && electronAPI.file && electronAPI.file.getLastOpenedFolder) {
      const lastFolder = await electronAPI.file.getLastOpenedFolder();
      if (lastFolder) {
        lastOpenedFolderPath.value = lastFolder;
        // 确保切换到文件夹侧边栏
        if (activeSidebar.value !== 'folders') {
          activeSidebar.value = 'folders';
        }
        // 等待组件渲染完成后再加载文件夹
        await nextTick();
        await nextTick(); // 再次等待确保FileExplorer已完全挂载
        if (fileExplorerRef.value) {
          (fileExplorerRef.value as any).loadFolder(lastFolder);
        }
      }
    }
  } catch (error) {
    console.error('Error loading last opened folder:', error);
  }

  // 检查是否是首次运行
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

