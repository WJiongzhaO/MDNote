import { inject, injectable } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface';
import type { RecommendationContext, RecommendedFragment } from '../../domain/types/reference-graph.types';

/**
 * 工作3：基于规则的片段推荐（标签/分类优先，archived 降权，deprecated 排除）
 */
@injectable()
export class RecommendationService {
  constructor(
    @inject(TYPES.KnowledgeFragmentRepository)
    private readonly fragmentRepository: KnowledgeFragmentRepository
  ) {}

  async recommendFragments(
    context: RecommendationContext,
    limit = 20
  ): Promise<RecommendedFragment[]> {
    const all = await this.fragmentRepository.findAll();
    const excludeIds = new Set(context.alreadyReferencedFragmentIds ?? []);
    const recentIds = new Set(context.recentUsedFragmentIds ?? []);
    const docTags = new Set((context.documentTags ?? []).map(t => t.toLowerCase()));
    const docKeywords = (context.documentTitleKeywords ?? []).map(k => k.toLowerCase());
    const bodyKeywords = (context.contextKeywords ?? []).map(k => k.toLowerCase());
    const bodyKwSet = new Set(bodyKeywords);
    const contextCategoryIds = new Set(context.contextCategoryIds ?? []);

    const scored: Array<{ fragment: (typeof all)[0]; score: number; reasons: string[] }> = [];

    for (const f of all) {
      if (f.getStatus() === 'deprecated') continue;
      if (excludeIds.has(f.getId().value)) continue;

      let score = 0;
      const reasons: string[] = [];

      const tags = f.getTags().value.map(t => t.toLowerCase());
      const categories = f.getCategoryPathIds?.() ?? [];
      for (const t of tags) {
        if (docTags.has(t)) {
          score += 30;
          reasons.push(`标签匹配: ${t}`);
        }
      }
      const title = f.getTitle().value.toLowerCase();
      for (const kw of docKeywords) {
        if (kw && title.includes(kw)) {
          score += 15;
          reasons.push(`标题关键词: ${kw}`);
        }
      }
      // 正文语境：与片段标题词面重叠（权重低于标题/标签）
      let bodyHits = 0;
      for (const kw of bodyKeywords) {
        if (!kw || kw.length < 2) continue;
        if (title.includes(kw)) {
          bodyHits++;
          score += 6;
          if (bodyHits <= 2) reasons.push(`正文语境: ${kw}`);
        }
      }
      for (const t of tags) {
        if (bodyKwSet.has(t)) {
          score += 12;
          reasons.push(`标签与正文呼应: ${t}`);
        }
      }
      let categoryMatches = 0;
      for (const c of categories) {
        if (contextCategoryIds.has(c)) {
          categoryMatches++;
        }
      }
      if (categoryMatches > 0) {
        score += Math.min(24, categoryMatches * 12);
        reasons.push(`分类匹配 ${categoryMatches} 项`);
      }
      if (recentIds.has(f.getId().value)) {
        score += 10;
        reasons.push('最近插入');
      }
      const refCount = f.getReferencedDocuments().length;
      if (refCount > 0) {
        score += Math.min(10, refCount);
        if (refCount >= 3) reasons.push(`被引用 ${refCount} 次`);
      }
      if (f.getStatus() === 'archived') {
        score -= 15;
      }

      scored.push({ fragment: f, score, reasons });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ fragment, score, reasons }) => ({
      fragmentId: fragment.getId().value,
      title: fragment.getTitle().value,
      score,
      reason: reasons.slice(0, 2).join('; ') || undefined
    }));
  }
}
