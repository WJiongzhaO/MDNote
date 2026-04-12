import { Document } from '@langchain/core/documents';
import type {
  AiGraphExtractionChunk,
  AiGraphExtractionResult,
  AiGraphExtractor
} from '../../domain/services/ai-graph-extractor.interface';

type GraphNode = {
  id: string;
  type?: string;
  properties?: Record<string, unknown>;
};

type GraphRelationship = {
  source: { id: string };
  target: { id: string };
  type?: string;
  properties?: Record<string, unknown>;
};

type GraphDocumentLike = {
  nodes?: GraphNode[];
  relationships?: GraphRelationship[];
};

type GraphTransformerLike = {
  convertToGraphDocuments(documents: Document[]): Promise<GraphDocumentLike[]>;
};

export class LangChainLlmGraphTransformerExtractor implements AiGraphExtractor {
  constructor(private readonly transformer: GraphTransformerLike) {}

  async extractChunk(chunk: AiGraphExtractionChunk): Promise<AiGraphExtractionResult> {
    const [graphDocument] = await this.transformer.convertToGraphDocuments([
      new Document({
        pageContent: chunk.markdown,
        metadata: {
          docId: chunk.docId,
          chunkId: chunk.chunkId,
          headingPath: chunk.headingPath,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset
        }
      })
    ]);

    return {
      entities: (graphDocument?.nodes ?? []).map(node => ({
        name: String(node.id),
        type: String(node.type ?? 'Entity'),
        description:
          typeof node.properties?.description === 'string' ? node.properties.description : undefined,
        metadata: node.properties ?? {}
      })),
      relations: (graphDocument?.relationships ?? []).map(rel => ({
        source: String(rel.source.id),
        target: String(rel.target.id),
        type: String(rel.type ?? 'RELATED_TO'),
        description:
          typeof rel.properties?.description === 'string' ? rel.properties.description : undefined,
        metadata: rel.properties ?? {}
      }))
    };
  }
}
