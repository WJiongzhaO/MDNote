import { describe, expect, it } from 'vitest';
import { RecommendationService } from '../recommendation.service';
import { KnowledgeFragment } from '../../../domain/entities/knowledge-fragment.entity';
import { TextNode } from '../../../domain/entities/ast-nodes';

function makeFragment(id: string, title: string, tags: string[]) {
  const f = KnowledgeFragment.create({ value: title }, [new TextNode(title, [])], tags);
  // 覆盖随机 id，保证测试稳定
  (f as any).id = { value: id };
  return f;
}

describe('RecommendationService', () => {
  it('should boost fragments by tag/category/context and filter deprecated', async () => {
    const a = makeFragment('a', 'Vue3 组件设计', ['frontend', 'vue']);
    a.updateCategories(['cat-fe']);
    a.addReferencedDocument('doc-1', '文档A');
    a.addReferencedDocument('doc-2', '文档B');

    const b = makeFragment('b', '数据库索引实践', ['backend', 'db']);
    b.updateCategories(['cat-be']);
    b.updateStatus('deprecated');

    const c = makeFragment('c', 'Vue3 性能优化', ['frontend', 'perf']);
    c.updateCategories(['cat-fe']);

    const repo = {
      findAll: async () => [a, b, c]
    } as any;

    const service = new RecommendationService(repo);
    const result = await service.recommendFragments({
      documentTitleKeywords: ['Vue3'],
      documentTags: ['frontend'],
      contextKeywords: ['性能', '组件'],
      contextCategoryIds: ['cat-fe'],
      alreadyReferencedFragmentIds: [],
      recentUsedFragmentIds: ['c']
    });

    expect(result.some(x => x.fragmentId === 'b')).toBe(false);
    expect(result[0]?.fragmentId).toBe('c');
    expect(result.map(x => x.fragmentId)).toContain('a');
  });
});

