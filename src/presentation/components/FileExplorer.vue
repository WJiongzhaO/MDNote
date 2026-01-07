<template>
  <div class="file-explorer">
    <!-- 路径显示栏 -->
    <div class="path-bar">
      <span class="path-label">当前路径：</span>
      <span class="path-value">{{ currentPath || '未打开文件夹' }}</span>
      <button v-if="currentPath" class="btn-close" @click="closeFolder" title="关闭文件夹">✕</button>
    </div>

    <!-- 文件树 -->
    <div
      class="file-tree"
      v-if="fileTree.length > 0"
      @contextmenu="handleBlankContextMenu"
    >
      <FileTreeNode
        v-for="node in fileTree"
        :key="node.path"
        :node="node"
        :selected-path="selectedPath"
        @select="handleSelect"
        @context-menu="handleContextMenu"
        @expand="handleExpand"
      />
    </div>

    <div
      v-else
      class="empty-state"
      @contextmenu="handleEmptyContextMenu"
    >
      <p>请从 File 菜单打开文件夹</p>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="handleNewFile">
        <span class="menu-icon">📄</span>
        <span>新建文件</span>
      </div>
      <div class="context-menu-item" @click="handleNewFolder">
        <span class="menu-icon">📁</span>
        <span>新建文件夹</span>
      </div>
      <div class="context-menu-item" @click="handleNewFromTemplate">
        <span class="menu-icon">📑</span>
        <span>通过模板创建...</span>
      </div>
      <div v-if="contextMenu.node" class="context-menu-divider"></div>
      <div v-if="contextMenu.node" class="context-menu-item" @click="handleDelete">
        <span class="menu-icon">🗑️</span>
        <span>删除</span>
      </div>
      <div v-if="contextMenu.node" class="context-menu-item" @click="handleRename">
        <span class="menu-icon">✎</span>
        <span>重命名</span>
      </div>
    </div>

    <!-- 新建文件对话框 -->
    <div v-if="showNewFileDialog" class="modal-overlay" @click="showNewFileDialog = false">
      <div class="modal" @click.stop>
        <h3>新建文件</h3>
        <input
          type="text"
          v-model="newFileName"
          placeholder="文件名（如：example.md）"
          @keyup.enter="createNewFile"
          ref="newFileInput"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showNewFileDialog = false">取消</button>
          <button class="btn btn-primary" @click="createNewFile" :disabled="!newFileName.trim()">创建</button>
        </div>
      </div>
    </div>

    <!-- 新建文件夹对话框 -->
    <div v-if="showNewFolderDialog" class="modal-overlay" @click="showNewFolderDialog = false">
      <div class="modal" @click.stop>
        <h3>新建文件夹</h3>
        <input
          type="text"
          v-model="newFolderName"
          placeholder="文件夹名"
          @keyup.enter="createNewFolder"
          ref="newFolderInput"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showNewFolderDialog = false">取消</button>
          <button class="btn btn-primary" @click="createNewFolder" :disabled="!newFolderName.trim()">创建</button>
        </div>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <div v-if="showRenameDialog" class="modal-overlay" @click="showRenameDialog = false">
      <div class="modal" @click.stop>
        <h3>重命名</h3>
        <input
          type="text"
          v-model="renameName"
          placeholder="新名称"
          @keyup.enter="confirmRename"
          @keyup.esc="cancelRename"
          ref="renameInput"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelRename">取消</button>
          <button class="btn btn-primary" @click="confirmRename" :disabled="!renameName.trim()">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import FileTreeNode from './FileTreeNode.vue';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isExpanded?: boolean;
}

const emit = defineEmits<{
  (e: 'select-file', path: string): void;
  (e: 'open-folder', path: string): void;
  (e: 'create-from-template', parentPath: string): void;
}>();

const currentPath = ref<string>('');
const fileTree = ref<FileNode[]>([]);
const selectedPath = ref<string>('');
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null as FileNode | null
});
const showNewFileDialog = ref(false);
const showNewFolderDialog = ref(false);
const showRenameDialog = ref(false);
const newFileName = ref('');
const newFolderName = ref('');
const renameName = ref('');
const renameNode = ref<FileNode | null>(null);
const newFileInput = ref<HTMLInputElement>();
const newFolderInput = ref<HTMLInputElement>();
const renameInput = ref<HTMLInputElement>();
const contextMenuParentPath = ref<string>('');

const handleSelect = (path: string) => {
  selectedPath.value = path;
  emit('select-file', path);
};

const handleExpand = async (node: FileNode) => {
  await loadFolderChildren(node);
};

const handleContextMenu = (event: MouseEvent, node: FileNode) => {
  event.preventDefault();
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    node
  };
  contextMenuParentPath.value = node.type === 'folder' ? node.path : getParentPath(node.path);
};

const handleBlankContextMenu = (event: MouseEvent) => {
  // 仅在点击文件树空白区域时触发
  const target = event.target as HTMLElement;
  if (target.closest('.node-item')) {
    return;
  }

  event.preventDefault();
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    node: null
  };
  contextMenuParentPath.value = currentPath.value;
};

const handleEmptyContextMenu = (event: MouseEvent) => {
  // 没有文件树内容时的右键菜单（仍然允许在当前路径创建）
  event.preventDefault();
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    node: null
  };
  contextMenuParentPath.value = currentPath.value;
};

const handleNewFile = () => {
  contextMenu.value.visible = false;
  showNewFileDialog.value = true;
  newFileName.value = '';
  nextTick(() => {
    newFileInput.value?.focus();
  });
};

const handleNewFolder = () => {
  contextMenu.value.visible = false;
  showNewFolderDialog.value = true;
  newFolderName.value = '';
  nextTick(() => {
    newFolderInput.value?.focus();
  });
};

const handleNewFromTemplate = () => {
  contextMenu.value.visible = false;
  const parentPath = contextMenuParentPath.value || currentPath.value;
  // 暂时只发出事件，由上层或后续逻辑决定如何根据模板创建
  emit('create-from-template', parentPath);
};

const handleDelete = () => {
  if (!contextMenu.value.node) return;
  const node = contextMenu.value.node;
  if (confirm(`确定要删除 ${node.name} 吗？`)) {
    deleteNode(node.path);
  }
  contextMenu.value.visible = false;
};

const handleRename = () => {
  if (!contextMenu.value.node) return;
  
  contextMenu.value.visible = false;
  renameNode.value = contextMenu.value.node;
  renameName.value = contextMenu.value.node.name;
  showRenameDialog.value = true;
  
  nextTick(() => {
    renameInput.value?.focus();
    // 选中文件名（不包括扩展名）以便用户直接输入新名称
    if (renameInput.value) {
      const input = renameInput.value;
      const nameWithoutExt = renameNode.value?.name.split('.').slice(0, -1).join('.') || renameNode.value?.name || '';
      if (nameWithoutExt && renameNode.value?.type === 'file') {
        input.setSelectionRange(0, nameWithoutExt.length);
      } else {
        input.select();
      }
    }
  });
};

const confirmRename = async () => {
  console.log('[FileExplorer] confirmRename 被调用');
  
  if (!renameNode.value || !renameName.value.trim()) {
    console.log('[FileExplorer] 验证失败: renameNode 或 renameName 为空');
    return;
  }

  // 检查新名称是否与原名称相同
  if (renameName.value.trim() === renameNode.value.name) {
    console.log('[FileExplorer] 新名称与原名称相同，直接关闭对话框');
    showRenameDialog.value = false;
    return;
  }

  const oldPath = renameNode.value.path;
  const newName = renameName.value.trim();

  try {
    const electronAPI = (window as any).electronAPI;
    
    // 检查 electronAPI 是否可用（与其他函数保持一致）
    if (!electronAPI || !electronAPI.file || !electronAPI.file.renameNode) {
      console.error('[FileExplorer] electronAPI 检查失败:', {
        electronAPI: !!electronAPI,
        file: !!(electronAPI && electronAPI.file),
        renameNode: !!(electronAPI && electronAPI.file && electronAPI.file.renameNode),
        availableMethods: electronAPI && electronAPI.file ? Object.keys(electronAPI.file) : []
      });
      alert('文件系统 API 不可用，无法重命名。\n\n请重启应用以加载最新的 API。\n\n如果问题仍然存在，请检查控制台日志。');
      return;
    }

    console.log('[FileExplorer] 开始重命名:', oldPath, '->', newName);
    
    // 调用重命名 API
    const result = await electronAPI.file.renameNode(oldPath, newName);
    console.log('[FileExplorer] 重命名 API 返回结果:', result);
    
    // 如果执行到这里没有抛出错误，说明重命名成功
    // 更新选中路径（如果当前选中的是被重命名的文件/文件夹）
    if (result && result.newPath) {
      // 规范化路径比较（处理 Windows 路径分隔符）
      const normalizePath = (p: string) => p.replace(/\\/g, '/');
      if (normalizePath(selectedPath.value) === normalizePath(oldPath)) {
        selectedPath.value = result.newPath;
        console.log('[FileExplorer] 更新选中路径:', result.newPath);
      }
    }
    
    // 重新加载文件夹以刷新文件树
    console.log('[FileExplorer] 重新加载文件夹:', currentPath.value);
    await loadFolder(currentPath.value);
    
    // 关闭对话框
    console.log('[FileExplorer] 关闭重命名对话框');
    showRenameDialog.value = false;
    renameName.value = '';
    renameNode.value = null;
    
    console.log('[FileExplorer] 重命名完成');
  } catch (error) {
    console.error('[FileExplorer] 重命名失败:', error);
    alert('重命名失败：' + (error instanceof Error ? error.message : '未知错误'));
    // 即使失败也关闭对话框，让用户可以重试
    showRenameDialog.value = false;
  }
};

const cancelRename = () => {
  showRenameDialog.value = false;
  renameName.value = '';
  renameNode.value = null;
};

const createNewFile = async () => {
  if (!newFileName.value.trim()) return;

  const parentPath = contextMenuParentPath.value || currentPath.value;
  const filePath = `${parentPath}/${newFileName.value}`;

  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.writeFileContent) {
      await electronAPI.file.writeFileContent(filePath, '');
      await loadFolder(currentPath.value);
      showNewFileDialog.value = false;
      newFileName.value = '';
    }
  } catch (error) {
    console.error('Error creating file:', error);
    alert('创建文件失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const createNewFolder = async () => {
  if (!newFolderName.value.trim()) return;

  const parentPath = contextMenuParentPath.value || currentPath.value;
  const folderPath = `${parentPath}/${newFolderName.value}`;

  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file) {
      await electronAPI.file.mkdir(folderPath);
      await loadFolder(currentPath.value);
      showNewFolderDialog.value = false;
      newFolderName.value = '';
    }
  } catch (error) {
    console.error('Error creating folder:', error);
    alert('创建文件夹失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const deleteNode = async (nodePath: string) => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.deleteNode) {
      await electronAPI.file.deleteNode(nodePath);
      await loadFolder(currentPath.value);
    }
  } catch (error) {
    console.error('Error deleting node:', error);
    alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const getParentPath = (filePath: string): string => {
  return filePath.split('/').slice(0, -1).join('/') || filePath.split('\\').slice(0, -1).join('\\');
};

const loadFolder = async (folderPath: string) => {
  if (!folderPath) return;

  try {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.readDirectory) {
      return;
    }

    // 读取文件夹内容
    const items = await electronAPI.file.readDirectory(folderPath);
    fileTree.value = buildFileTree(items, folderPath);
    currentPath.value = folderPath;
  } catch (error) {
    console.error('Error loading folder:', error);
  }
};


const buildFileTree = (items: Array<{ name: string; type: 'file' | 'folder'; path: string }>, rootPath: string): FileNode[] => {
  const tree: FileNode[] = [];

  // 直接构建树结构（只处理一级）
  for (const item of items) {
    const node: FileNode = {
      name: item.name,
      path: item.path,
      type: item.type,
      children: item.type === 'folder' ? [] : undefined,
      isExpanded: false
    };
    tree.push(node);
  }

  return tree;
};

// 加载文件夹的子项
const loadFolderChildren = async (folderNode: FileNode) => {
  if (folderNode.type !== 'folder' || folderNode.children === undefined) return;

  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.readDirectory) {
      const items = await electronAPI.file.readDirectory(folderNode.path);
      folderNode.children = items.map((item: { name: string; path: string; type: 'file' | 'folder' }) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        children: item.type === 'folder' ? [] : undefined,
        isExpanded: false
      }));
    }
  } catch (error) {
    console.error('Error loading folder children:', error);
  }
};

const closeFolder = () => {
  currentPath.value = '';
  fileTree.value = [];
  selectedPath.value = '';
};

const handleClickOutside = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.context-menu')) {
    contextMenu.value.visible = false;
  }
};

// 菜单事件处理函数
let menuHandlers: Array<() => void> = [];

onMounted(async () => {
  document.addEventListener('click', handleClickOutside);

  // 尝试加载上次打开的文件夹
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.getLastOpenedFolder) {
      const lastFolder = await electronAPI.file.getLastOpenedFolder();
      if (lastFolder) {
        // 延迟加载，确保组件完全初始化
        await nextTick();
        await loadFolder(lastFolder);
        emit('open-folder', lastFolder);
      }
    }
  } catch (error) {
    console.error('Error loading last opened folder:', error);
  }

  // 监听主进程发送的恢复文件夹事件
  // 注意：恢复文件夹时不应该触发 open-folder 事件，因为这会修改工作目录
  // 恢复文件夹只是加载文件夹内容，不改变项目的工作目录
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.on) {
    electronAPI.on('app:restore-last-folder', async (folderPath: string) => {
      if (folderPath) {
        await loadFolder(folderPath);
        // 不 emit('open-folder')，因为这是恢复操作，不应该修改工作目录
        // emit('open-folder', folderPath);
      }
    });
  }

  // 监听菜单事件（只注册一次）
  if (electronAPI && electronAPI.menu) {
    const newFileHandler = (_event: any) => {
      if (currentPath.value) {
        handleNewFile();
      } else {
        // 如果没有打开文件夹，先打开文件夹对话框
        electronAPI.dialog.openFolder().then((folderPath: string | null) => {
          if (folderPath) {
            loadFolder(folderPath).then(() => {
              handleNewFile();
            });
          }
        });
      }
    };

    const newFolderHandler = (_event: any) => {
      if (currentPath.value) {
        handleNewFolder();
      } else {
        electronAPI.dialog.openFolder().then((folderPath: string | null) => {
          if (folderPath) {
            loadFolder(folderPath).then(() => {
              handleNewFolder();
            });
          }
        });
      }
    };

    const openFolderHandler = async (_event: any, folderPath?: string) => {
      // _event 是 IPC 事件对象，folderPath 是从主进程发送过来的实际数据
      if (folderPath) {
        await loadFolder(folderPath);
        emit('open-folder', folderPath);
      }
    };

    // 注册监听器
    electronAPI.menu.onNewFile(newFileHandler);
    electronAPI.menu.onNewFolder(newFolderHandler);
    electronAPI.menu.onOpenFolder(openFolderHandler as any);

    // 保存处理器引用以便清理
    menuHandlers = [newFileHandler, newFolderHandler, openFolderHandler as any];
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 暴露方法供外部调用
defineExpose({
  loadFolder,
  closeFolder,
  handleNewFile,
  handleNewFolder
});
</script>

<style scoped>
.file-explorer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.path-bar {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.path-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.path-value {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  color: var(--text-secondary);
  font-size: 1rem;
}

.btn-close:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
  border-radius: 3px;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  box-shadow: var(--shadow-md);
  z-index: 1000;
  min-width: 150px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 6px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.context-menu-item:hover {
  background: var(--bg-hover);
}

.context-menu-divider {
  height: 1px;
  background: var(--border-secondary);
  margin: 4px 0;
}

.menu-icon {
  font-size: 1rem;
}

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
  min-width: 300px;
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
</style>

