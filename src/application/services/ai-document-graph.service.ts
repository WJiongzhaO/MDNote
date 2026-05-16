import type { AiGraphMetadataRepository } from '../../domain/repositories/ai-graph-metadata.repository.interface';
import type {
  AiDocumentGraphContribution,
  AiGraphRepository
} from '../../domain/repositories/ai-graph.repository.interface';
import type { DocumentReader } from '../../domain/repositories/document.repository.interface';
import { mergeDocumentGraphContribution } from '../../domain/services/ai-graph-merge.service';
import { normalizeAiGraphExtraction } from '../../domain/services/ai-graph-normalizer.service';
import type { AiGraphChunk, AiGraphChunkerService } from '../../domain/services/ai-graph-chunker.service';
import type { AiGraphExtractionResult } from '../../domain/services/ai-graph-extractor.interface';
import type { AiGraphProviderGateway } from '../../domain/services/ai-graph-provider.service';
import type {
  AiGlobalGraphQuery,
  AiGraphBuildRecord,
  AiGraphBuildState,
  AiGraphProviderConfig,
  AiKnowledgeGraph,
  AiNodeEvidence
} from '../../domain/types/ai-knowledge-graph.types';

const GRAPH_VERSION = 'p0';

/** 构建 AI 知识图谱时的进度（供 UI 展示） */
export type AiDocumentGraphBuildProgressEvent =
  | { phase: 'chunks'; current: number; total: number }
  | { phase: 'merge' }
  | { phase: 'persist' };

export interface BuildDocumentKnowledgeGraphOptions {
  onProgress?: (event: AiDocumentGraphBuildProgressEvent) => void;
}

type NormalizedContribution = Pick<AiDocumentGraphContribution, 'entities' | 'relations'>;
type ChunkExtractionOutput = AiGraphExtractionResult | NormalizedContribution;

interface BuildForDocumentResult {
  title: string;
  entities: AiDocumentGraphContribution['entities'];
  relations: AiDocumentGraphContribution['relations'];
  graph: AiKnowledgeGraph;
  contentHash: string;
  provider: string;
  model: string;
}

interface DocumentGraphExtractor {
  buildForDocument?(docId: string, config: AiGraphProviderConfig): Promise<BuildForDocumentResult>;
  extractChunk?(chunk: AiGraphChunk, config: AiGraphProviderConfig): Promise<ChunkExtractionOutput>;
}

interface AiDocumentGraphServiceDeps {
  metadataRepo: AiGraphMetadataRepository;
  graphRepo: AiGraphRepository;
  settingsGateway: Pick<AiGraphProviderGateway, 'load'>;
  extractor: DocumentGraphExtractor;
  documentRepo?: DocumentReader;
  chunker?: AiGraphChunkerService;
}

function hashContent(content: string): string {
  let hash = 2166136261;

  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to build AI graph.';
}

function isAbortError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  return error instanceof Error && error.name === 'AbortError';
}

function previewText(value: string, maxLength = 120): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

function readValueString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'value' in value) {
    const valueRecord = value as { value?: unknown };
    if (typeof valueRecord.value === 'string') {
      return valueRecord.value;
    }
  }

  return null;
}

function readDocumentTitle(document: unknown): string | null {
  if (!document || typeof document !== 'object') {
    return null;
  }

  if ('getTitle' in document && typeof document.getTitle === 'function') {
    return readValueString(document.getTitle());
  }

  return readValueString((document as { title?: unknown }).title);
}

function readDocumentContent(document: unknown): string | null {
  if (!document || typeof document !== 'object') {
    return null;
  }

  if ('getContent' in document && typeof document.getContent === 'function') {
    return readValueString(document.getContent());
  }

  return readValueString((document as { content?: unknown }).content);
}

function seemsLikeFilePath(docId: string): boolean {
  return docId.includes('/') || docId.includes('\\') || /^[a-zA-Z]:/.test(docId);
}

async function tryReadExternalMarkdown(docId: string): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!seemsLikeFilePath(docId)) {
    return null;
  }

  const electronAPI = (window as {
    electronAPI?: {
      file?: {
        readFileContent?: (path: string) => Promise<string | null>;
      };
    };
  }).electronAPI;

  const readFileContent = electronAPI?.file?.readFileContent;
  if (typeof readFileContent !== 'function') {
    return null;
  }

  try {
    const content = await readFileContent(docId);
    return typeof content === 'string' ? content : null;
  } catch (error) {
    console.warn('[AI Graph] Failed to read external markdown file', { docId, error });
    return null;
  }
}

function isNormalizedContribution(value: ChunkExtractionOutput): value is NormalizedContribution {
  const entities = Array.isArray(value.entities) ? value.entities : [];
  const relations = Array.isArray(value.relations) ? value.relations : [];

  return (
    entities.every(
      entity =>
        entity &&
        typeof entity === 'object' &&
        'entityId' in entity &&
        typeof entity.entityId === 'string' &&
        'normalizedName' in entity &&
        typeof entity.normalizedName === 'string'
    ) &&
    relations.every(
      relation =>
        relation &&
        typeof relation === 'object' &&
        'relationId' in relation &&
        typeof relation.relationId === 'string' &&
        'sourceEntityId' in relation &&
        typeof relation.sourceEntityId === 'string' &&
        'targetEntityId' in relation &&
        typeof relation.targetEntityId === 'string'
    )
  );
}

function cloneNormalizedContribution(contribution: NormalizedContribution): NormalizedContribution {
  return {
    entities: contribution.entities.map(entity => ({
      ...entity,
      metadata: { ...entity.metadata },
      anchors: [...entity.anchors]
    })),
    relations: contribution.relations.map(relation => ({
      ...relation,
      metadata: { ...relation.metadata }
    }))
  };
}

function normalizeChunkContribution(
  docId: string,
  chunk: AiGraphChunk,
  extraction: ChunkExtractionOutput
): NormalizedContribution {
  if (isNormalizedContribution(extraction)) {
    return mergeDocumentGraphContribution(cloneNormalizedContribution(extraction));
  }

  return normalizeAiGraphExtraction({
    docId,
    chunkId: chunk.chunkId,
    entities: extraction.entities,
    relations: extraction.relations
  });
}

function buildKnowledgeGraph(contribution: NormalizedContribution): AiKnowledgeGraph {
  return {
    nodes: contribution.entities.map(entity => ({
      id: entity.entityId,
      label: entity.name,
      entityType: entity.type,
      description: entity.description,
      primaryAnchor: entity.anchors[0],
      evidenceCount: entity.anchors.length,
      evidencePreview: entity.anchors.slice(0, 3)
    })),
    edges: contribution.relations.map(relation => ({
      id: relation.relationId,
      source: relation.sourceEntityId,
      target: relation.targetEntityId,
      relationType: relation.type,
      description: relation.description
    }))
  };
}

export class AiDocumentGraphService {
  private readonly cancelBuildRequested = new Set<string>();

  constructor(private readonly deps: AiDocumentGraphServiceDeps) {}

  /** 请求中止当前文档的构建；在下一个分片边界生效（当前 LLM 调用仍会跑完）。 */
  requestCancelDocumentGraphBuild(docId: string): void {
    this.cancelBuildRequested.add(docId);
  }

  private throwIfBuildCancelled(docId: string): void {
    if (this.cancelBuildRequested.has(docId)) {
      this.cancelBuildRequested.delete(docId);
      throw new DOMException('Aborted', 'AbortError');
    }
  }

  async buildDocumentKnowledgeGraph(
    docId: string,
    options?: BuildDocumentKnowledgeGraphOptions
  ): Promise<AiKnowledgeGraph> {
    this.cancelBuildRequested.delete(docId);

    const onProgress = options?.onProgress;
    console.log('[AI Graph] buildDocumentKnowledgeGraph called', { docId });
    const config = await this.deps.settingsGateway.load();

    if (!config) {
      throw new Error('AI graph provider config is required to build document graph.');
    }

    const providerConfig = config as AiGraphProviderConfig;
    const startedAt = new Date().toISOString();
    let contentHash = 'hash-unknown';

    await this.deps.metadataRepo.saveRecord({
      docId,
      contentHash,
      status: 'building',
      provider: providerConfig.providerName,
      model: providerConfig.model,
      startedAt,
      graphVersion: GRAPH_VERSION
    });

    try {
      this.throwIfBuildCancelled(docId);

      const documentRepo = this.deps.documentRepo;
      const chunker = this.deps.chunker;
      const extractor = this.deps.extractor;

      if (documentRepo && chunker && extractor.extractChunk) {
        const document = await documentRepo.findById({ value: docId });
        const markdown = readDocumentContent(document) ?? (await tryReadExternalMarkdown(docId));

        if (!markdown || markdown.trim().length === 0) {
          throw new Error('Document content is required to build AI graph.');
        }

        const title =
          readDocumentTitle(document)
          ?? (seemsLikeFilePath(docId) ? docId.split(/[\\/]/).pop() || docId : docId);
        contentHash = hashContent(markdown);
        const chunks = chunker.splitMarkdown(markdown, docId);
        console.log('[AI Graph] Build started', {
          docId,
          title,
          markdownLength: markdown.length,
          chunkCount: chunks.length
        });

        chunks.forEach((chunk, index) => {
          console.log('[AI Graph] Chunk prepared', {
            docId,
            chunkIndex: index,
            chunkId: chunk.chunkId,
            headingPath: chunk.headingPath,
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            markdownPreview: previewText(chunk.markdown)
          });
        });

        const normalizedChunks: NormalizedContribution[] = [];
        if (chunks.length === 0) {
          onProgress?.({ phase: 'chunks', current: 0, total: 1 });
          onProgress?.({ phase: 'chunks', current: 1, total: 1 });
        } else {
          onProgress?.({ phase: 'chunks', current: 0, total: chunks.length });
          for (let index = 0; index < chunks.length; index += 1) {
            this.throwIfBuildCancelled(docId);
            const chunk = chunks[index];
            const extraction = await extractor.extractChunk(chunk, providerConfig);
            console.log(
              `[AI Graph] Chunk extraction raw result ${JSON.stringify({
                docId,
                chunkIndex: index,
                chunkId: chunk.chunkId,
                rawEntityCount: extraction.entities.length,
                rawRelationCount: extraction.relations.length
              })}`
            );

            if (extraction.entities.length === 0 && extraction.relations.length === 0) {
              console.warn('[AI Graph] Chunk extraction is empty', {
                docId,
                chunkIndex: index,
                chunkId: chunk.chunkId,
                markdownPreview: previewText(chunk.markdown)
              });
            }

            normalizedChunks.push(normalizeChunkContribution(docId, chunk, extraction));
            onProgress?.({ phase: 'chunks', current: index + 1, total: chunks.length });
          }
        }

        this.throwIfBuildCancelled(docId);

        normalizedChunks.forEach((chunkContribution, index) => {
          console.log('[AI Graph] Chunk normalized result', {
            docId,
            chunkIndex: index,
            entityCount: chunkContribution.entities.length,
            relationCount: chunkContribution.relations.length
          });
        });

        onProgress?.({ phase: 'merge' });
        this.throwIfBuildCancelled(docId);

        const contribution =
          chunks.length === 0
            ? { entities: [], relations: [] }
            : mergeDocumentGraphContribution({
                entities: normalizedChunks.flatMap(chunkContribution => chunkContribution.entities),
                relations: normalizedChunks.flatMap(chunkContribution => chunkContribution.relations)
              });

        console.log('[AI Graph] Merged contribution', {
          docId,
          mergedEntityCount: contribution.entities.length,
          mergedRelationCount: contribution.relations.length
        });

        onProgress?.({ phase: 'persist' });
        this.throwIfBuildCancelled(docId);

        await this.deps.graphRepo.replaceDocumentContribution({
          docId,
          title,
          contentHash,
          entities: contribution.entities,
          relations: contribution.relations
        });

        const storedGraph = await this.deps.graphRepo.getDocumentGraph(docId);
        const graph = storedGraph ?? buildKnowledgeGraph(contribution);
        console.log('[AI Graph] Graph persisted', {
          docId,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length
        });

        this.cancelBuildRequested.delete(docId);

        await this.deps.metadataRepo.saveRecord({
          docId,
          contentHash,
          status: graph.nodes.length > 0 ? 'ready' : 'ready_empty',
          provider: providerConfig.providerName,
          model: providerConfig.model,
          startedAt,
          finishedAt: new Date().toISOString(),
          graphVersion: GRAPH_VERSION
        });

        return graph;
      }

      if (!this.deps.extractor.buildForDocument) {
        throw new Error('AI graph extractor is required to build document graph.');
      }

      console.warn('[AI Graph] Fallback extractor path is used', {
        docId,
        hasDocumentRepo: Boolean(documentRepo),
        hasChunker: Boolean(chunker),
        hasExtractChunk: Boolean(extractor.extractChunk)
      });

      onProgress?.({ phase: 'chunks', current: 0, total: 1 });
      this.throwIfBuildCancelled(docId);
      const result = await this.deps.extractor.buildForDocument(docId, providerConfig);
      onProgress?.({ phase: 'chunks', current: 1, total: 1 });
      onProgress?.({ phase: 'merge' });
      contentHash = result.contentHash;

      onProgress?.({ phase: 'persist' });
      this.throwIfBuildCancelled(docId);

      await this.deps.graphRepo.replaceDocumentContribution({
        docId,
        title: result.title,
        contentHash,
        entities: result.entities,
        relations: result.relations
      });

      const storedGraph = await this.deps.graphRepo.getDocumentGraph(docId);
      const graph = storedGraph ?? result.graph;

      this.cancelBuildRequested.delete(docId);

      await this.deps.metadataRepo.saveRecord({
        docId,
        contentHash,
        status: graph.nodes.length > 0 ? 'ready' : 'ready_empty',
        provider: result.provider,
        model: result.model,
        startedAt,
        finishedAt: new Date().toISOString(),
        graphVersion: GRAPH_VERSION
      });

      return graph;
    } catch (error) {
      const aborted = isAbortError(error);
      if (!aborted) {
        this.cancelBuildRequested.delete(docId);
      }

      await this.deps.metadataRepo.saveRecord({
        docId,
        contentHash,
        status: 'failed',
        provider: providerConfig.providerName,
        model: providerConfig.model,
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: aborted ? '已中止生成' : getErrorMessage(error),
        graphVersion: GRAPH_VERSION
      });

      throw error;
    }
  }

  async getDocumentKnowledgeGraph(docId: string): Promise<AiKnowledgeGraph | null> {
    return this.deps.graphRepo.getDocumentGraph(docId);
  }

  async getGlobalGraph(query: AiGlobalGraphQuery): Promise<AiKnowledgeGraph> {
    return this.deps.graphRepo.getGlobalGraph(query);
  }

  async getNodeEvidence(nodeId: string): Promise<AiNodeEvidence | null> {
    return this.deps.graphRepo.getNodeEvidence(nodeId);
  }

  async getBuildRecord(docId: string): Promise<AiGraphBuildRecord | null> {
    return this.deps.metadataRepo.getRecord(docId);
  }

  async getDocumentGraphState(docId: string): Promise<AiGraphBuildState> {
    const [record, graph] = await Promise.all([
      this.deps.metadataRepo.getRecord(docId),
      this.deps.graphRepo.getDocumentGraph(docId)
    ]);

    if (!record) {
      return {
        docId,
        contentHash: '',
        status: 'not_built',
        provider: '',
        model: '',
        graphVersion: GRAPH_VERSION,
        graph: null
      };
    }

    return {
      ...record,
      graph: graph ?? null,
      errorMessage: record.errorMessage
    };
  }
}
