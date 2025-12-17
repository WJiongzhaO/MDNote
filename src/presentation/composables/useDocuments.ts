import { ref, computed, onMounted } from 'vue';
import { ApplicationService } from '../../application';
import type { CreateDocumentRequest, UpdateDocumentRequest } from '../../application';

export function useDocuments(applicationService: ApplicationService) {
  const documentUseCases = applicationService.getDocumentUseCases();

  const documents = ref([]);
  const currentDocument = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  const sortedDocuments = computed(() => {
    return documents.value.sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
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
        updatedAt: newDocument.updatedAt
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
            updatedAt: updatedDocument.updatedAt
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
    createDocument,
    updateDocument,
    deleteDocument,
    loadDocument,
    renderMarkdown
  };
}