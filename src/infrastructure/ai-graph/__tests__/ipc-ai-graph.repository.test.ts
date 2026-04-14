import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationModule } from '../../../core/modules/application.module';
import { TYPES } from '../../../core/container/container.types';
import { InversifyContainer } from '../../../core/container/inversify.container';
import type { AiDocumentGraphContribution, AiGraphRepository } from '../../../domain/repositories/ai-graph.repository.interface';
import type { AiGlobalGraphQuery, AiKnowledgeGraph, AiNodeEvidence } from '../../../domain/types/ai-knowledge-graph.types';
import { InMemoryAiGraphRepository } from '../in-memory-ai-graph.repository';
import { IpcAiGraphRepository } from '../ipc-ai-graph.repository';

type ElectronAiGraphBridge = {
  replaceDocumentContribution: (contribution: AiDocumentGraphContribution) => Promise<void>;
  getDocumentGraph: (docId: string) => Promise<AiKnowledgeGraph | null>;
  getGlobalGraph: (query: AiGlobalGraphQuery) => Promise<AiKnowledgeGraph>;
  getNodeEvidence: (nodeId: string) => Promise<AiNodeEvidence | null>;
};

type WindowWithElectronApi = Window & {
  electronAPI?: {
    aiGraph?: ElectronAiGraphBridge;
  };
};

function setElectronAiGraphBridge(aiGraph?: ElectronAiGraphBridge) {
  const currentWindow = window as WindowWithElectronApi;

  if (aiGraph) {
    currentWindow.electronAPI = { aiGraph };
    return;
  }

  delete currentWindow.electronAPI;
}

describe('IpcAiGraphRepository', () => {
  afterEach(() => {
    setElectronAiGraphBridge();
  });

  it('forwards repository calls through window.electronAPI.aiGraph', async () => {
    const contribution: AiDocumentGraphContribution = {
      docId: 'doc-1',
      title: 'Doc 1',
      contentHash: 'hash-1',
      entities: [],
      relations: []
    };
    const documentGraph: AiKnowledgeGraph = {
      nodes: [],
      edges: []
    };
    const globalGraph: AiKnowledgeGraph = {
      nodes: [],
      edges: []
    };
    const nodeEvidence: AiNodeEvidence = {
      nodeId: 'entity-1',
      label: 'Entity 1',
      anchors: []
    };
    const query: AiGlobalGraphQuery = {
      seedDocId: 'doc-1',
      maxHops: 1,
      limit: 10
    };
    const aiGraphBridge: ElectronAiGraphBridge = {
      replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(documentGraph),
      getGlobalGraph: vi.fn().mockResolvedValue(globalGraph),
      getNodeEvidence: vi.fn().mockResolvedValue(nodeEvidence)
    };

    setElectronAiGraphBridge(aiGraphBridge);

    const repo = new IpcAiGraphRepository();

    await expect(repo.replaceDocumentContribution(contribution)).resolves.toBeUndefined();
    await expect(repo.getDocumentGraph('doc-1')).resolves.toBe(documentGraph);
    await expect(repo.getGlobalGraph(query)).resolves.toBe(globalGraph);
    await expect(repo.getNodeEvidence('entity-1')).resolves.toBe(nodeEvidence);

    expect(aiGraphBridge.replaceDocumentContribution).toHaveBeenCalledWith(contribution);
    expect(aiGraphBridge.getDocumentGraph).toHaveBeenCalledWith('doc-1');
    expect(aiGraphBridge.getGlobalGraph).toHaveBeenCalledWith(query);
    expect(aiGraphBridge.getNodeEvidence).toHaveBeenCalledWith('entity-1');
  });

  it('throws when the aiGraph IPC bridge is unavailable', async () => {
    const repo = new IpcAiGraphRepository();

    await expect(repo.getDocumentGraph('doc-1')).rejects.toThrow('AI graph IPC bridge is not available.');
  });

  it('binds the AI graph repository to the IPC proxy when the Electron aiGraph bridge exists', async () => {
    setElectronAiGraphBridge({
      replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(null),
      getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getNodeEvidence: vi.fn().mockResolvedValue(null)
    });

    const container = new InversifyContainer();
    ApplicationModule.configure(container);
    await Promise.resolve();

    const repo = container.get<AiGraphRepository>(TYPES.AiGraphRepository);

    expect(repo).toBeInstanceOf(IpcAiGraphRepository);
  });

  it('falls back to the in-memory repository when the Electron aiGraph bridge is absent', async () => {
    const container = new InversifyContainer();
    ApplicationModule.configure(container);
    await Promise.resolve();

    const repo = container.get<AiGraphRepository>(TYPES.AiGraphRepository);

    expect(repo).toBeInstanceOf(InMemoryAiGraphRepository);
  });
});
