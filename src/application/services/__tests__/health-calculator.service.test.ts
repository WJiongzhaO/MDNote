import { describe, it, expect } from 'vitest';
import { KnowledgeFragment } from '../../../domain/entities/knowledge-fragment.entity';
import { TextNode } from '../../../domain/entities/ast-nodes';
import { computeFragmentHealth } from '../health-calculator.service';
import type { ReferenceGraph } from '../../../domain/types/reference-graph.types';

function emptyGraph(): ReferenceGraph {
  return {
    documentToFragments: new Map(),
    fragmentToDocuments: new Map(),
    fragmentToParent: new Map(),
    fragmentToChildren: new Map(),
    templateToVariables: new Map()
  };
}

describe('computeFragmentHealth', () => {
  it('marks isolated when no refs and no relations', () => {
    const f = KnowledgeFragment.create(
      { value: 't' },
      [new TextNode('x', [])],
      []
    );
    const g = emptyGraph();
    g.fragmentToChildren.set(f.getId().value, []);
    const r = computeFragmentHealth(f, g);
    expect(r.flags.isolated).toBe(true);
  });

  it('reduces score for deprecated status', () => {
    const f = KnowledgeFragment.create(
      { value: 't' },
      [new TextNode('x', [])],
      []
    );
    f.updateStatus('deprecated');
    const r = computeFragmentHealth(f, emptyGraph());
    expect(r.healthScore).toBeLessThan(30);
  });
});
