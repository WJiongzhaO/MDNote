export interface CreateDocumentRequest {
  title: string;
  content: string;
  folderId?: string | null;
}

export interface UpdateDocumentRequest {
  id: string;
  title: string;
  content: string;
  folderId?: string | null;
}

export interface DocumentResponse {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentListItem {
  id: string;
  title: string;
  folderId: string | null;
  updatedAt: Date;
}