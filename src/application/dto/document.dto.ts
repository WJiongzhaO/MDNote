export interface CreateDocumentRequest {
  title: string;
  content: string;
}

export interface UpdateDocumentRequest {
  id: string;
  title: string;
  content: string;
}

export interface DocumentResponse {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentListItem {
  id: string;
  title: string;
  updatedAt: Date;
}