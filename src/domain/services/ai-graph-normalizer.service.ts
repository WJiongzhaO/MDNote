import { mergeDocumentGraphContribution } from './ai-graph-merge.service';

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeAiGraphExtraction(input: {
  docId: string;
  chunkId: string;
  entities: Array<{ name: string; type: string; description?: string; metadata?: Record<string, unknown> }>;
  relations: Array<{ source: string; target: string; type: string; description?: string; metadata?: Record<string, unknown> }>;
}) {
  const entityMap = new Map<string, {
    entityId: string;
    name: string;
    normalizedName: string;
    type: string;
    description?: string;
    sourceDocId: string;
    sourceChunkId: string;
    metadata: Record<string, unknown>;
    anchors: [];
  }>();

  input.entities.forEach((entity, index) => {
    const name = entity.name.trim();
    const type = entity.type.trim();

    if (!name || !type) {
      return;
    }

    const normalizedName = normalizeName(name);
    const key = `${normalizedName}::${type.toLowerCase()}`;

    if (!entityMap.has(key)) {
      entityMap.set(key, {
        entityId: `${input.chunkId}:entity:${index}`,
        name,
        normalizedName,
        type,
        description: entity.description?.trim() || undefined,
        sourceDocId: input.docId,
        sourceChunkId: input.chunkId,
        metadata: entity.metadata ?? {},
        anchors: []
      });
    }
  });

  const entities = [...entityMap.values()];
  const entityNameIndex = new Map(entities.map(entity => [normalizeName(entity.name), entity.entityId]));
  const relationKeys = new Set<string>();
  const relations = input.relations.flatMap((relation, index) => {
    const sourceEntityId = entityNameIndex.get(normalizeName(relation.source));
    const targetEntityId = entityNameIndex.get(normalizeName(relation.target));
    const type = relation.type.trim();

    if (!sourceEntityId || !targetEntityId || !type) {
      return [];
    }

    const dedupeKey = `${sourceEntityId}::${targetEntityId}::${type.toLowerCase()}`;
    if (relationKeys.has(dedupeKey)) {
      return [];
    }

    relationKeys.add(dedupeKey);

    return [{
      relationId: `${input.chunkId}:relation:${index}`,
      sourceEntityId,
      targetEntityId,
      type,
      description: relation.description?.trim() || undefined,
      sourceDocId: input.docId,
      sourceChunkId: input.chunkId,
      metadata: relation.metadata ?? {}
    }];
  });

  return mergeDocumentGraphContribution({ entities, relations });
}
