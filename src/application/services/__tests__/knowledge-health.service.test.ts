import { describe, expect, it } from 'vitest';
import { KnowledgeHealthService } from '../knowledge-health.service';
import { KnowledgeFragment } from '../../../domain/entities/knowledge-fragment.entity';
import { TextNode } from '../../../domain/entities/ast-nodes';

describe('KnowledgeHealthService.getImpactOfFragmentChange', () => {
  it('computes highImpactCount by recent references', async () => {
    const fragment = KnowledgeFragment.create(
      { value: '片段A' },
      [new TextNode('content', [])],
      ['tag-a']
    );

    const now = Date.now();
    fragment.addReferencedDocument('doc-recent', '最近文档');
    fragment.addReferencedDocument('doc-old', '旧文档');
    // 覆盖时间，构造近 30 天与超 30 天两类
    (fragment.getReferencedDocuments()[0] as any).referencedAt = new Date(now - 7 * 24 * 3600 * 1000);
    (fragment.getReferencedDocuments()[1] as any).referencedAt = new Date(now - 65 * 24 * 3600 * 1000);

    const repo = {
      findAll: async () => [fragment]
    } as any;

    const graphService = {
      getDocumentsByFragment: async (_id: string) => ['doc-recent', 'doc-old']
    } as any;

    const svc = new KnowledgeHealthService(repo, graphService);
    const impact = await svc.getImpactOfFragmentChange(fragment.getId().value);

    expect(impact.affectedCount).toBe(2);
    expect(impact.highImpactCount).toBe(1);
    expect(impact.documentTitles).toContain('最近文档');
    expect(impact.documentTitles).toContain('旧文档');
  });
});

