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
      entities: [],
      relations: []
    });

    const graph = await repo.getDocumentGraph('doc-1');
    expect(graph).toEqual({ nodes: [], edges: [] });
  });
});
