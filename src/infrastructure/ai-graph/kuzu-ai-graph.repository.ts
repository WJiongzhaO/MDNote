import kuzu from 'kuzu';
import type { AiDocumentGraphContribution, AiGraphRepository } from '../../domain/repositories/ai-graph.repository.interface';
import type {
  AiEvidenceAnchor,
  AiGlobalGraphQuery,
  AiKnowledgeGraph,
  AiKnowledgeGraphEdge,
  AiKnowledgeGraphNode,
  AiNodeEvidence
} from '../../domain/types/ai-knowledge-graph.types';
import { KUZU_SCHEMA_STATEMENTS } from './kuzu-ai-graph.schema';

interface KuzuAiGraphRepositoryOptions {
  dbPath: string;
}

function escapeCypherString(value: string): string {
  return value.replace(/'/g, "''");
}

function readRowValue(row: unknown, key: string): unknown {
  if (row && typeof row === 'object' && key in row) {
    return (row as Record<string, unknown>)[key];
  }

  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseAnchors(value: unknown): AiEvidenceAnchor[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as AiEvidenceAnchor[] : [];
  } catch {
    return [];
  }
}

async function collectRows(resultPromise: Promise<{ hasNext: () => boolean; getNext: () => Promise<unknown> }>): Promise<unknown[]> {
  const result = await resultPromise;
  const rows: unknown[] = [];
  while (result.hasNext()) {
    rows.push(await result.getNext());
  }
  return rows;
}

export class KuzuAiGraphRepository implements AiGraphRepository {
  private readonly db: kuzu.Database;
  private readonly connection: kuzu.Connection;
  private readonly ready: Promise<void>;

  constructor(options: KuzuAiGraphRepositoryOptions) {
    this.db = new kuzu.Database(options.dbPath);
    this.connection = new kuzu.Connection(this.db);
    this.ready = this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    for (const statement of KUZU_SCHEMA_STATEMENTS) {
      await this.connection.query(statement);
    }
  }

  async replaceDocumentContribution(contribution: AiDocumentGraphContribution): Promise<void> {
    await this.ready;
    const now = new Date().toISOString();
    const escapedDocId = escapeCypherString(contribution.docId);
    const escapedTitle = escapeCypherString(contribution.title);
    const escapedContentHash = escapeCypherString(contribution.contentHash);

    await this.connection.query(`MATCH (d:Document)-[m:MENTIONS]->() WHERE m.sourceDocId = '${escapedDocId}' DELETE m;`);
    await this.connection.query(`MATCH ()-[r:RELATES]->() WHERE r.sourceDocId = '${escapedDocId}' DELETE r;`);
    await this.connection.query(`MERGE (d:Document {docId: '${escapedDocId}'}) SET d.title = '${escapedTitle}', d.contentHash = '${escapedContentHash}', d.updatedAt = '${now}';`);

    for (const entity of contribution.entities) {
      const escapedEntityId = escapeCypherString(entity.entityId);
      const escapedName = escapeCypherString(entity.name);
      const escapedNormalizedName = escapeCypherString(entity.normalizedName);
      const escapedType = escapeCypherString(entity.type);
      const escapedDescription = escapeCypherString(entity.description ?? '');
      const escapedSourceChunkId = escapeCypherString(entity.sourceChunkId);
      const anchorJson = escapeCypherString(JSON.stringify(entity.anchors));

      await this.connection.query(
        `MERGE (e:Entity {entityId: '${escapedEntityId}'}) SET e.name = '${escapedName}', e.normalizedName = '${escapedNormalizedName}', e.type = '${escapedType}', e.description = '${escapedDescription}', e.updatedAt = '${now}', e.createdAt = COALESCE(e.createdAt, '${now}');`
      );
      await this.connection.query(
        `MATCH (d:Document {docId: '${escapedDocId}'}), (e:Entity {entityId: '${escapedEntityId}'}) CREATE (d)-[:MENTIONS {sourceDocId: '${escapedDocId}', sourceChunkId: '${escapedSourceChunkId}', anchorJson: '${anchorJson}'}]->(e);`
      );
    }

    for (const relation of contribution.relations) {
      const escapedSourceEntityId = escapeCypherString(relation.sourceEntityId);
      const escapedTargetEntityId = escapeCypherString(relation.targetEntityId);
      const escapedRelationId = escapeCypherString(relation.relationId);
      const escapedRelationType = escapeCypherString(relation.type);
      const escapedDescription = escapeCypherString(relation.description ?? '');
      const escapedSourceChunkId = escapeCypherString(relation.sourceChunkId);

      await this.connection.query(
        `MATCH (source:Entity {entityId: '${escapedSourceEntityId}'}), (target:Entity {entityId: '${escapedTargetEntityId}'}) CREATE (source)-[:RELATES {relationId: '${escapedRelationId}', relationType: '${escapedRelationType}', description: '${escapedDescription}', sourceDocId: '${escapedDocId}', sourceChunkId: '${escapedSourceChunkId}'}]->(target);`
      );
    }
  }

  async getDocumentGraph(docId: string): Promise<AiKnowledgeGraph | null> {
    await this.ready;
    const escapedDocId = escapeCypherString(docId);
    const nodeRows = await collectRows(
      this.connection.query(
        `MATCH (d:Document {docId: '${escapedDocId}'})-[m:MENTIONS]->(e:Entity) RETURN e.entityId AS id, e.name AS label, e.type AS entityType, e.description AS description, m.anchorJson AS anchorJson;`
      )
    );

    const edgeRows = await collectRows(
      this.connection.query(
        `MATCH (source:Entity)-[r:RELATES {sourceDocId: '${escapedDocId}'}]->(target:Entity) RETURN r.relationId AS id, source.entityId AS source, target.entityId AS target, r.relationType AS relationType, r.description AS description;`
      )
    );

    const nodes: AiKnowledgeGraphNode[] = nodeRows.map(row => {
      const anchors = parseAnchors(readRowValue(row, 'anchorJson'));
      return {
        id: asString(readRowValue(row, 'id')) ?? '',
        label: asString(readRowValue(row, 'label')) ?? '',
        entityType: asString(readRowValue(row, 'entityType')) ?? 'Entity',
        description: asString(readRowValue(row, 'description')),
        primaryAnchor: anchors[0],
        evidenceCount: anchors.length,
        evidencePreview: anchors.slice(0, 3)
      };
    });

    const edges: AiKnowledgeGraphEdge[] = edgeRows.map(row => ({
      id: asString(readRowValue(row, 'id')) ?? '',
      source: asString(readRowValue(row, 'source')) ?? '',
      target: asString(readRowValue(row, 'target')) ?? '',
      relationType: asString(readRowValue(row, 'relationType')) ?? 'RELATED_TO',
      description: asString(readRowValue(row, 'description'))
    }));

    const hasDocument = await collectRows(
      this.connection.query(`MATCH (d:Document {docId: '${escapedDocId}'}) RETURN d.docId AS docId LIMIT 1;`)
    );

    if (hasDocument.length === 0) {
      return null;
    }

    return { nodes, edges };
  }

  async getGlobalGraph(query: AiGlobalGraphQuery): Promise<AiKnowledgeGraph> {
    await this.ready;
    const limit = Math.max(1, query.limit);
    const nodeRows = await collectRows(
      this.connection.query(`MATCH (e:Entity) RETURN e.entityId AS id, e.name AS label, e.type AS entityType, e.description AS description LIMIT ${limit};`)
    );

    const selectedNodeIds = nodeRows.map(row => asString(readRowValue(row, 'id')) ?? '');
    const nodeSet = new Set(selectedNodeIds);
    const edgeRows = await collectRows(
      this.connection.query(`MATCH (source:Entity)-[r:RELATES]->(target:Entity) RETURN r.relationId AS id, source.entityId AS source, target.entityId AS target, r.relationType AS relationType, r.description AS description LIMIT ${limit};`)
    );

    return {
      nodes: nodeRows.map(row => ({
        id: asString(readRowValue(row, 'id')) ?? '',
        label: asString(readRowValue(row, 'label')) ?? '',
        entityType: asString(readRowValue(row, 'entityType')) ?? 'Entity',
        description: asString(readRowValue(row, 'description')),
        evidenceCount: 0,
        evidencePreview: []
      })),
      edges: edgeRows
        .map(row => ({
          id: asString(readRowValue(row, 'id')) ?? '',
          source: asString(readRowValue(row, 'source')) ?? '',
          target: asString(readRowValue(row, 'target')) ?? '',
          relationType: asString(readRowValue(row, 'relationType')) ?? 'RELATED_TO',
          description: asString(readRowValue(row, 'description'))
        }))
        .filter(edge => nodeSet.has(edge.source) && nodeSet.has(edge.target))
    };
  }

  async getNodeEvidence(nodeId: string): Promise<AiNodeEvidence | null> {
    await this.ready;
    const escapedNodeId = escapeCypherString(nodeId);
    const rows = await collectRows(
      this.connection.query(
        `MATCH (:Document)-[m:MENTIONS]->(e:Entity {entityId: '${escapedNodeId}'}) RETURN e.entityId AS nodeId, e.name AS label, m.anchorJson AS anchorJson;`
      )
    );

    if (rows.length === 0) {
      return null;
    }

    const anchors = rows.flatMap(row => parseAnchors(readRowValue(row, 'anchorJson')));
    return {
      nodeId: asString(readRowValue(rows[0], 'nodeId')) ?? nodeId,
      label: asString(readRowValue(rows[0], 'label')) ?? nodeId,
      anchors
    };
  }
}
