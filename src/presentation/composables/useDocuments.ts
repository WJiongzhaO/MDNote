import { ref, computed, onMounted } from 'vue';
import { Application } from '../../core/application';
import type { CreateDocumentRequest, UpdateDocumentRequest, DocumentResponse, DocumentListItem } from '../../application';

export function useDocuments() {
  const application = Application.getInstance();
  const documentUseCases = application.getDocumentUseCases();

  const documents = ref<DocumentListItem[]>([]);
  const currentDocument = ref<DocumentResponse | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const sortedDocuments = computed(() => {
    return [...documents.value].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });

  const loadDocuments = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await documentUseCases.getAllDocuments();
      documents.value = result;
    } catch (err) {
      error.value = 'Failed to load documents';
      console.error('Error loading documents:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const createDocument = async (request: CreateDocumentRequest) => {
    isLoading.value = true;
    error.value = null;

    try {
      const newDocument = await documentUseCases.createDocument(request);
      documents.value.push({
        id: newDocument.id,
        title: newDocument.title,
        updatedAt: newDocument.updatedAt,
        folderId: newDocument.folderId
      });
      
      // 创建文档后，自动加载并选中新文档，确保编辑器显示新文档内容
      // 这样文档列表和编辑器状态保持一致
      currentDocument.value = newDocument;
      
      return newDocument;
    } catch (err) {
      error.value = 'Failed to create document';
      console.error('Error creating document:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const updateDocument = async (request: UpdateDocumentRequest) => {
    isLoading.value = true;
    error.value = null;

    try {
      const updatedDocument = await documentUseCases.updateDocument(request);

      if (updatedDocument) {
        const index = documents.value.findIndex(doc => doc.id === request.id);
        if (index !== -1) {
          documents.value[index] = {
            id: updatedDocument.id,
            title: updatedDocument.title,
            updatedAt: updatedDocument.updatedAt,
            folderId: updatedDocument.folderId
          };
        }

        if (currentDocument.value?.id === request.id) {
          currentDocument.value = updatedDocument;
        }
      }

      return updatedDocument;
    } catch (err) {
      error.value = 'Failed to update document';
      console.error('Error updating document:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteDocument = async (id: string) => {
    console.log('[useDocuments] 开始删除文档:', id);
    console.log('[useDocuments] 当前文档:', currentDocument.value?.id);
    console.log('[useDocuments] 文档列表长度:', documents.value.length);
    
    isLoading.value = true;
    error.value = null;

    try {
      const isCurrentDocument = currentDocument.value?.id === id;
      console.log('[useDocuments] 是否删除当前文档:', isCurrentDocument);
      
      // 如果删除的是当前文档，先找到下一个要打开的文档
      let nextDocToOpen: DocumentListItem | null = null;
      if (isCurrentDocument && documents.value.length > 1) {
        // 找到当前文档的索引
        const currentIndex = documents.value.findIndex(doc => doc.id === id);
        console.log('[useDocuments] 当前文档索引:', currentIndex);
        
        if (currentIndex !== -1) {
          // 优先选择下一个文档，如果是最后一个则选择上一个
          if (currentIndex < documents.value.length - 1) {
            nextDocToOpen = documents.value[currentIndex + 1];
            console.log('[useDocuments] 将打开下一个文档:', nextDocToOpen.title);
          } else if (currentIndex > 0) {
            nextDocToOpen = documents.value[currentIndex - 1];
            console.log('[useDocuments] 将打开上一个文档:', nextDocToOpen.title);
          }
        }
      }

      // 执行删除操作
      await documentUseCases.deleteDocument(id);
      console.log('[useDocuments] 删除操作完成');
      
      // 从列表中移除
      documents.value = documents.value.filter(doc => doc.id !== id);
      console.log('[useDocuments] 更新后文档列表长度:', documents.value.length);

      // 如果删除的是当前文档
      if (isCurrentDocument) {
        console.log('[useDocuments] 清理当前文档状态');
        // 立即设置为null，触发清理
        currentDocument.value = null;
        
        // 强制等待一帧，确保 Vue 的响应式更新完成
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // 如果有下一个文档要打开
        if (nextDocToOpen) {
          console.log('[useDocuments] 准备加载下一个文档:', nextDocToOpen.id);
          try {
            // 立即加载，不要延迟
            await loadDocument(nextDocToOpen.id);
            console.log('[useDocuments] 成功加载下一个文档');
          } catch (err) {
            console.error('[useDocuments] 加载下一个文档失败:', err);
          }
        } else {
          console.log('[useDocuments] 没有下一个文档要打开');
        }
      }

      return true;
    } catch (err) {
      error.value = 'Failed to delete document';
      console.error('[useDocuments] 删除文档错误:', err);
      return false;
    } finally {
      isLoading.value = false;
      console.log('[useDocuments] 删除操作结束');
    }
  };

  const loadDocument = async (id: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const document = await documentUseCases.getDocument(id);
      currentDocument.value = document;
      return document;
    } catch (err) {
      error.value = 'Failed to load document';
      console.error('Error loading document:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const searchDocuments = async (query: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      if (query.trim()) {
        const searchResults = await documentUseCases.searchDocuments(query);
        documents.value = searchResults;
      } else {
        await loadDocuments();
      }
    } catch (err) {
      error.value = 'Failed to search documents';
      console.error('Error searching documents:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const loadDocumentsByFolder = async (folderId: string | null) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await documentUseCases.getDocumentsByFolder(folderId);
      documents.value = result;
    } catch (err) {
      error.value = 'Failed to load documents for folder';
      console.error('Error loading documents by folder:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const renderMarkdown = async (content: string, documentId?: string, variables?: Record<string, any>, fileCache?: any) => {
    try {
      return await documentUseCases.renderMarkdown(content, documentId, variables, fileCache);
    } catch (err) {
      console.error('Error rendering markdown:', err);
      return '';
    }
  };

  onMounted(() => {
    loadDocuments();
  });

  return {
    documents: sortedDocuments,
    currentDocument,
    isLoading,
    error,
    loadDocuments,
    loadDocumentsByFolder,
    createDocument,
    updateDocument,
    deleteDocument,
    loadDocument,
    searchDocuments,
    renderMarkdown
  };
}
