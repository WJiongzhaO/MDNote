import type { AiEvidenceAnchor, AiGraphEntity, AiGraphRelation } from '../types/ai-knowledge-graph.types';

interface GraphContribution {
  entities: AiGraphEntity[];
  relations: AiGraphRelation[];
}

function dedupeAnchors(anchors: AiEvidenceAnchor[]): AiEvidenceAnchor[] {
  const seen = new Set<string>();

  return anchors.filter(anchor => {
    const key = [
      anchor.docId,
      anchor.chunkId,
      anchor.blockId ?? '',
      anchor.startOffset ?? '',
      anchor.endOffset ?? '',
      anchor.anchorType
    ].join('::');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeRelations(relations: AiGraphRelation[]): AiGraphRelation[] {
  const seen = new Set<string>();

  return relations.filter(relation => {
    const key = [relation.sourceEntityId, relation.targetEntityId, relation.type.toLowerCase()].join('::');
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function mergeDocumentGraphContribution(contribution: GraphContribution): GraphContribution {
  const entityMap = new Map<string, AiGraphEntity>();
  const canonicalEntityIdByKey = new Map<string, string>();

  for (const entity of contribution.entities) {
    const key = `${entity.normalizedName}::${entity.type.toLowerCase()}`;
    const existing = entityMap.get(key);

    if (!existing) {
      entityMap.set(key, { ...entity, anchors: [...entity.anchors] });
      canonicalEntityIdByKey.set(key, entity.entityId);
      continue;
    }

    existing.anchors = dedupeAnchors([...existing.anchors, ...entity.anchors]);
    existing.description = existing.description ?? entity.description;
    existing.metadata = { ...existing.metadata, ...entity.metadata };
  }

  const entityKeyById = new Map<string, string>();
  for (const entity of contribution.entities) {
    entityKeyById.set(entity.entityId, `${entity.normalizedName}::${entity.type.toLowerCase()}`);
  }

  const entities = Array.from(entityMap.values());
  const validEntityIds = new Set(entities.map(entity => entity.entityId));
  const relations = dedupeRelations(
    contribution.relations.map(relation => {
      const sourceKey = entityKeyById.get(relation.sourceEntityId);
      const targetKey = entityKeyById.get(relation.targetEntityId);

      return {
        ...relation,
        sourceEntityId: canonicalEntityIdByKey.get(sourceKey ?? '') ?? relation.sourceEntityId,
        targetEntityId: canonicalEntityIdByKey.get(targetKey ?? '') ?? relation.targetEntityId
      };
    })
  ).filter(
    relation => validEntityIds.has(relation.sourceEntityId) && validEntityIds.has(relation.targetEntityId)
  );

  return { entities, relations };
}
