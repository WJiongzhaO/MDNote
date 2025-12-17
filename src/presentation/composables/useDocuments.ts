import { ref, computed, onMounted } from 'vue';
import { ApplicationService } from '../../application';
import type { CreateDocumentRequest, UpdateDocumentRequest, DocumentResponse, DocumentListItem } from '../../application';

export function useDocuments(applicationService: ApplicationService) {
  const documentUseCases = applicationService.getDocumentUseCases();

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
    isLoading.value = true;
    error.value = null;

    try {
      await documentUseCases.deleteDocument(id);
      documents.value = documents.value.filter(doc => doc.id !== id);

      if (currentDocument.value?.id === id) {
        currentDocument.value = null;
      }

      return true;
    } catch (err) {
      error.value = 'Failed to delete document';
      console.error('Error deleting document:', err);
      return false;
    } finally {
      isLoading.value = false;
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

  const renderMarkdown = async (content: string) => {
    try {
      return await documentUseCases.renderMarkdown(content);
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
