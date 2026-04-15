import { describe, expect, it } from 'vitest';
import { KuzuAiGraphRepository } from '../kuzu-ai-graph.repository';

/**
 * Kuzu 的 Node 原生扩展在 Vitest 默认 worker 池下会出现 worker crash。
 * 请通过 `npm run test:unit:kuzu` 走仓库内固定的单线程验证路径。
 */
describe.sequential('KuzuAiGraphRepository', () => {
  it('replaces one document contribution without keeping stale entities', async () => {
    const repo = new KuzuAiGraphRepository({ dbPath: ':memory:' });
    await repo.replaceDocumentContribution({
      docId: 'doc-1',
      title: 'Doc 1',
      contentHash: 'hash-a',
      entities: [
        {
          entityId: 'entity-alice',
          name: 'Alice',
          normalizedName: 'alice',
          type: 'Person',
          description: 'Original entity',
          sourceDocId: 'doc-1',
          sourceChunkId: 'chunk-1',
          metadata: {},
          anchors: [
            {
              anchorId: 'anchor-1',
              docId: 'doc-1',
              chunkId: 'chunk-1',
              excerpt: 'Alice founded Acme',
              anchorType: 'range',
              startOffset: 0,
              endOffset: 5
            }
          ]
        },
        {
          entityId: 'entity-acme',
          name: 'Acme',
          normalizedName: 'acme',
          type: 'Company',
          description: 'Company entity',
          sourceDocId: 'doc-1',
          sourceChunkId: 'chunk-1',
          metadata: {},
          anchors: [
            {
              anchorId: 'anchor-2',
              docId: 'doc-1',
              chunkId: 'chunk-1',
              excerpt: 'Acme appears in doc-1',
              anchorType: 'block',
              blockId: 'block-1'
            }
          ]
        }
      ],
      relations: [
        {
          relationId: 'relation-founded',
          sourceEntityId: 'entity-alice',
          targetEntityId: 'entity-acme',
          type: 'FOUNDED',
          description: 'Alice founded Acme',
          sourceDocId: 'doc-1',
          sourceChunkId: 'chunk-1',
          metadata: {}
        }
      ]
    });

    await repo.replaceDocumentContribution({
      docId: 'doc-1',
      title: 'Doc 1 updated',
      contentHash: 'hash-b',
      entities: [
        {
          entityId: 'entity-bob',
          name: 'Bob',
          normalizedName: 'bob',
          type: 'Person',
          description: 'Replacement entity',
          sourceDocId: 'doc-1',
          sourceChunkId: 'chunk-2',
          metadata: {},
          anchors: [
            {
              anchorId: 'anchor-3',
              docId: 'doc-1',
              chunkId: 'chunk-2',
              excerpt: 'Bob joined Beta',
              anchorType: 'range',
              startOffset: 0,
              endOffset: 3
            }
          ]
        },
        {
          entityId: 'entity-beta',
          name: 'Beta',
          normalizedName: 'beta',
          type: 'Company',
          description: 'Current company',
          sourceDocId: 'doc-1',
          sourceChunkId: 'chunk-2',
          metadata: {},
          anchors: [
            {
              anchorId: 'anchor-4',
              docId: 'doc-1',
              chunkId: 'chunk-2',
              excerpt: 'Beta is in the updated graph',
              anchorType: 'block',
              blockId: 'block-2'
            }
          ]
        }
      ],
      relations: [
        {
          relationId: 'relation-joined',
          sourceEntityId: 'entity-bob',
          targetEntityId: 'entity-beta',
          type: 'JOINED',
          description: 'Bob joined Beta',
          sourceDocId: 'doc-1',
          sourceChunkId: 'chunk-2',
          metadata: {}
        }
      ]
    });

    await expect(repo.getDocumentGraph('missing-doc')).resolves.toBeNull();

    await expect(repo.getDocumentGraph('doc-1')).resolves.toEqual({
      nodes: [
        {
          id: 'entity-bob',
          label: 'Bob',
          entityType: 'Person',
          description: 'Replacement entity',
          primaryAnchor: {
            anchorId: 'anchor-3',
            docId: 'doc-1',
            chunkId: 'chunk-2',
            excerpt: 'Bob joined Beta',
            anchorType: 'range',
            startOffset: 0,
            endOffset: 3
          },
          evidenceCount: 1,
          evidencePreview: [
            {
              anchorId: 'anchor-3',
              docId: 'doc-1',
              chunkId: 'chunk-2',
              excerpt: 'Bob joined Beta',
              anchorType: 'range',
              startOffset: 0,
              endOffset: 3
            }
          ]
        },
        {
          id: 'entity-beta',
          label: 'Beta',
          entityType: 'Company',
          description: 'Current company',
          primaryAnchor: {
            anchorId: 'anchor-4',
            docId: 'doc-1',
            chunkId: 'chunk-2',
            excerpt: 'Beta is in the updated graph',
            anchorType: 'block',
            blockId: 'block-2'
          },
          evidenceCount: 1,
          evidencePreview: [
            {
              anchorId: 'anchor-4',
              docId: 'doc-1',
              chunkId: 'chunk-2',
              excerpt: 'Beta is in the updated graph',
              anchorType: 'block',
              blockId: 'block-2'
            }
          ]
        }
      ],
      edges: [
        {
          id: 'relation-joined',
          source: 'entity-bob',
          target: 'entity-beta',
          relationType: 'JOINED',
          description: 'Bob joined Beta'
        }
      ]
    });

    await expect(repo.getNodeEvidence('entity-bob')).resolves.toEqual({
      nodeId: 'entity-bob',
      label: 'Bob',
      anchors: [
        {
          anchorId: 'anchor-3',
          docId: 'doc-1',
          chunkId: 'chunk-2',
          excerpt: 'Bob joined Beta',
          anchorType: 'range',
          startOffset: 0,
          endOffset: 3
        }
      ]
    });

    await expect(
      repo.getGlobalGraph({
        maxHops: 1,
        limit: 10
      })
    ).resolves.toEqual({
      nodes: [
        {
          id: 'entity-alice',
          label: 'Alice',
          entityType: 'Person',
          description: 'Original entity',
          evidenceCount: 0,
          evidencePreview: []
        },
        {
          id: 'entity-acme',
          label: 'Acme',
          entityType: 'Company',
          description: 'Company entity',
          evidenceCount: 0,
          evidencePreview: []
        },
        {
          id: 'entity-bob',
          label: 'Bob',
          entityType: 'Person',
          description: 'Replacement entity',
          evidenceCount: 0,
          evidencePreview: []
        },
        {
          id: 'entity-beta',
          label: 'Beta',
          entityType: 'Company',
          description: 'Current company',
          evidenceCount: 0,
          evidencePreview: []
        }
      ],
      edges: [
        {
          id: 'relation-joined',
          source: 'entity-bob',
          target: 'entity-beta',
          relationType: 'JOINED',
          description: 'Bob joined Beta'
        }
      ]
    });
  });
});
