import type { AiEvidenceAnchor } from '../types/ai-knowledge-graph.types';

export function resolvePreferredAnchor(anchors: AiEvidenceAnchor[]): AiEvidenceAnchor | null {
  const rangeAnchor = anchors.find(
    anchor =>
      anchor.anchorType === 'range' &&
      Number.isFinite(anchor.startOffset) &&
      Number.isFinite(anchor.endOffset)
  );

  return rangeAnchor ?? anchors.find(anchor => anchor.anchorType === 'block') ?? null;
}

export function toKnowledgeGraphJumpRange(anchor: AiEvidenceAnchor): { start: number; end: number } | null {
  if (anchor.anchorType === 'range' && anchor.startOffset != null && anchor.endOffset != null) {
    return { start: anchor.startOffset, end: anchor.endOffset };
  }

  return null;
}
