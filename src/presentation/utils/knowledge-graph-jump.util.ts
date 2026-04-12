import { Application } from '../../core/application';
import type { KgNodeOccurrence } from '../../domain/services/knowledge-graph-extractor';

type AiAnchorLike = {
  anchorId?: string;
  docId?: string;
  chunkId?: string;
  blockId?: string;
  startOffset?: number;
  endOffset?: number;
  anchorType?: 'range' | 'block';
};

/**
 * 读取文档全文，供知识图谱「按片段跳转」在文中查找 {{ref:...}}。
 * 优先按路径读本地文件；否则走文档用例（库内文档 id）。
 */
export async function readDocumentTextForKnowledgeJump(documentId: string): Promise<string | null> {
  const electronAPI = (window as any).electronAPI;
  const pathLike =
    documentId.includes('/') || documentId.includes('\\') || documentId.startsWith('file:');
  const normalizedPath = documentId.startsWith('file:') ? documentId.slice(5) : documentId;
  if (pathLike && electronAPI?.file?.readFileContent) {
    try {
      return await electronAPI.file.readFileContent(normalizedPath);
    } catch {
      /* 继续尝试 vault 文档 */
    }
  }
  try {
    const application = Application.getInstance();
    const doc = await application.getDocumentUseCases().getDocument(documentId);
    return doc?.content ?? null;
  } catch {
    return null;
  }
}

export async function readDocumentTextForAiAnchorJump(documentId: string): Promise<string | null> {
  return readDocumentTextForKnowledgeJump(documentId);
}

export function getAiAnchorOccurrence(anchor?: AiAnchorLike): KgNodeOccurrence | null {
  if (
    !anchor?.docId ||
    !Number.isFinite(anchor.startOffset) ||
    !Number.isFinite(anchor.endOffset)
  ) {
    return null;
  }

  return {
    documentId: anchor.docId,
    start: Number(anchor.startOffset),
    end: Number(anchor.endOffset)
  };
}

export function resolveAiGraphJumpTarget(anchors: AiAnchorLike[]): AiAnchorLike | null {
  const rangeAnchor = anchors.find(
    anchor => anchor.anchorType === 'range' && typeof anchor.startOffset === 'number'
  );
  if (rangeAnchor) {
    return rangeAnchor;
  }

  return anchors.find(anchor => anchor.anchorType === 'block') ?? null;
}
