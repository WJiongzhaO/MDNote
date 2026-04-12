import type { AiGraphMetadataRepository } from '../../domain/repositories/ai-graph-metadata.repository.interface';
import type { AiDocumentGraphContribution, AiGraphRepository } from '../../domain/repositories/ai-graph.repository.interface';
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
  buildForDocument(docId: string, config: AiGraphProviderConfig): Promise<BuildForDocumentResult>;
}

interface AiDocumentGraphServiceDeps {
  metadataRepo: AiGraphMetadataRepository;
  graphRepo: AiGraphRepository;
  settingsGateway: Pick<AiGraphProviderGateway, 'load'>;
  extractor: DocumentGraphExtractor;
}

export class AiDocumentGraphService {
  constructor(private readonly deps: AiDocumentGraphServiceDeps) {}

  async buildDocumentKnowledgeGraph(docId: string): Promise<AiKnowledgeGraph> {
    const config = await this.deps.settingsGateway.load();

    if (!config) {
      throw new Error('AI graph provider config is required to build document graph.');
    }

    const startedAt = new Date().toISOString();
    const buildingRecord: AiGraphBuildRecord = {
      docId,
      contentHash: 'hash-unknown',
      status: 'building',
      provider: config.providerName,
      model: config.model,
      startedAt,
      graphVersion: GRAPH_VERSION
    };

    await this.deps.metadataRepo.saveRecord(buildingRecord);

    const result = await this.deps.extractor.buildForDocument(docId, config as AiGraphProviderConfig);
    await this.deps.graphRepo.replaceDocumentContribution({
      docId,
      title: result.title,
      contentHash: result.contentHash,
      entities: result.entities,
      relations: result.relations
    });

    const finishedAt = new Date().toISOString();
    const status = result.graph.nodes.length > 0 ? 'ready' : 'ready_empty';

    await this.deps.metadataRepo.saveRecord({
      docId,
      contentHash: result.contentHash,
      status,
      provider: result.provider,
      model: result.model,
      startedAt,
      finishedAt,
      graphVersion: GRAPH_VERSION
    });

    return result.graph;
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
