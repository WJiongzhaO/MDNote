import { ref, computed, onMounted } from 'vue';
import { Application } from '../../core/application';
import type { CreateFolderRequest, UpdateFolderRequest } from '../../application';

export function useFolders() {
  const application = Application.getInstance();
  const folderUseCases = application.getFolderUseCases();

  const folders = ref([]);
  const folderTree = ref([]);
  const currentFolder = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  const loadFolders = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await folderUseCases.getAllFolders();
      folders.value = result;
      folderTree.value = await folderUseCases.getFolderTree();
    } catch (err) {
      error.value = 'Failed to load folders';
      console.error('Error loading folders:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const createFolder = async (request: CreateFolderRequest) => {
    if (!request.name || request.name.trim() === '') {
      error.value = 'Folder name is required';
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const newFolder = await folderUseCases.createFolder(request);
      // 总是重新加载文件夹列表，无论创建是否成功
      await loadFolders();
      return newFolder;
    } catch (err) {
      error.value = 'Failed to create folder';
      console.error('Error creating folder:', err);
      // 即使出错也要重新加载，确保UI状态正确
      await loadFolders();
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const updateFolder = async (request: UpdateFolderRequest) => {
    isLoading.value = true;
    error.value = null;

    try {
      const updatedFolder = await folderUseCases.updateFolder(request);
      await loadFolders();
      return updatedFolder;
    } catch (err) {
      error.value = 'Failed to update folder';
      console.error('Error updating folder:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteFolder = async (id: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      await folderUseCases.deleteFolder(id);
      await loadFolders();
      return true;
    } catch (err) {
      error.value = 'Failed to delete folder';
      console.error('Error deleting folder:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const getFolder = async (id: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const folder = await folderUseCases.getFolder(id);
      currentFolder.value = folder;
      return folder;
    } catch (err) {
      error.value = 'Failed to load folder';
      console.error('Error loading folder:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getFolderTree = async () => {
    try {
      const tree = await folderUseCases.getFolderTree();
      folderTree.value = tree;
      return tree;
    } catch (err) {
      console.error('Error getting folder tree:', err);
      return [];
    }
  };

  onMounted(() => {
    loadFolders();
  });

  return {
    folders,
    folderTree,
    currentFolder,
    isLoading,
    error,
    loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    getFolder,
    getFolderTree
  };
}
