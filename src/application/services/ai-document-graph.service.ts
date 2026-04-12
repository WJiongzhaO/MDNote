import type { AiGraphMetadataRepository } from '../../domain/repositories/ai-graph-metadata.repository.interface';
import type { AiGraphRepository } from '../../domain/repositories/ai-graph.repository.interface';
import type { AiGraphProviderGateway } from '../../domain/services/ai-graph-provider.service';
import type {
  AiGraphBuildRecord,
  AiGraphProviderConfig,
  AiKnowledgeGraph
} from '../../domain/types/ai-knowledge-graph.types';

const GRAPH_VERSION = 'p0';

interface BuildForDocumentResult {
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
    await this.deps.graphRepo.replaceDocumentGraph(docId, result.graph);

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

  async getBuildRecord(docId: string): Promise<AiGraphBuildRecord | null> {
    return this.deps.metadataRepo.getRecord(docId);
  }
}
