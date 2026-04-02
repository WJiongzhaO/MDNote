import { inject, injectable } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface';
import type { ReferenceGraph } from '../../domain/types/reference-graph.types';

/**
 * 工作3：从片段仓储构建并提供引用图谱（实时计算，可后续加缓存）
 */
@injectable()
export class ReferenceGraphService {
  constructor(
    @inject(TYPES.KnowledgeFragmentRepository)
    private readonly fragmentRepository: KnowledgeFragmentRepository
  ) {}

  async buildGraph(): Promise<ReferenceGraph> {
    const fragments = await this.fragmentRepository.findAll();
    const documentToFragments = new Map<string, string[]>();
    const fragmentToDocuments = new Map<string, string[]>();
    const fragmentToParent = new Map<string, string | null>();
    const fragmentToChildren = new Map<string, string[]>();
    const templateToVariables = new Map<string, string[]>();

    for (const f of fragments) {
      const fid = f.getId().value;
      const refs = f.getReferencedDocuments();
      const docIds = refs.map(r => r.documentId);
      fragmentToDocuments.set(fid, docIds);
      for (const docId of docIds) {
        const list = documentToFragments.get(docId) ?? [];
        if (!list.includes(fid)) list.push(fid);
        documentToFragments.set(docId, list);
      }

      const parentId = f.getDerivedFromId() ?? null;
      fragmentToParent.set(fid, parentId);
      if (parentId) {
        const children = fragmentToChildren.get(parentId) ?? [];
        if (!children.includes(fid)) children.push(fid);
        fragmentToChildren.set(parentId, children);
      }
    }

    return {
      documentToFragments,
      fragmentToDocuments,
      fragmentToParent,
      fragmentToChildren,
      templateToVariables
    };
  }

  async getDocumentsByFragment(fragmentId: string): Promise<string[]> {
    const g = await this.buildGraph();
    return g.fragmentToDocuments.get(fragmentId) ?? [];
  }

  async getFragmentsByDocument(documentId: string): Promise<string[]> {
    const g = await this.buildGraph();
    return g.documentToFragments.get(documentId) ?? [];
  }

  async getFragmentParents(fragmentId: string): Promise<string[]> {
    const g = await this.buildGraph();
    const parentId = g.fragmentToParent.get(fragmentId);
    if (!parentId) return [];
    return [parentId];
  }

  async getFragmentChildren(fragmentId: string): Promise<string[]> {
    const g = await this.buildGraph();
    return g.fragmentToChildren.get(fragmentId) ?? [];
  }
}
