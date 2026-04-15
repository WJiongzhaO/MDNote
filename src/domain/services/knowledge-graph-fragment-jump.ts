/**
 * 知识图谱节点绑定知识片段后，在文档正文中定位 {{ref:fragmentId}} 以便跳转选中。
 */

export function findFragmentRefRangeInMainBody(mainBodyMarkdown: string, fragmentId: string): { start: number; end: number } | null {
  if (!fragmentId) return null;
  const escaped = fragmentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\{\\{ref:${escaped}(?::connected)?\\}\\}`);
  const m = re.exec(mainBodyMarkdown);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length };
}

/** 与编辑器 splitContent 一致：分离 frontmatter 与正文（用于在正文内查找 ref） */
export function splitMarkdownFrontmatter(fullContent: string): { frontmatter: string; mainContent: string } {
  const trimmed = fullContent.trimStart();
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
  const match = trimmed.match(frontmatterRegex);
  if (match) {
    return {
      frontmatter: match[0],
      mainContent: trimmed.substring(match[0].length)
    };
  }
  return { frontmatter: '', mainContent: trimmed };
}

export function findFragmentRefRangeForEditor(fullFileText: string, fragmentId: string): { start: number; end: number } | null {
  const { mainContent } = splitMarkdownFrontmatter(fullFileText);
  return findFragmentRefRangeInMainBody(mainContent, fragmentId);
}

export interface FragmentJumpLookup {
  getFragment: (
    id: string
  ) => Promise<{
    sourceDocumentId?: string;
    referencedDocuments?: Array<{ documentId: string }>;
  } | null>;
  readDocumentText: (documentId: string) => Promise<string | null>;
}

/**
 * 在源文档、引用文档中依次查找片段引用标记，返回用于编辑器的正文内偏移。
 */
export async function resolveFragmentReferenceJump(
  fragmentId: string,
  lookup: FragmentJumpLookup
): Promise<{ documentId: string; start: number; end: number } | null> {
  const frag = await lookup.getFragment(fragmentId);
  if (!frag) return null;

  const docIds: string[] = [];
  if (frag.sourceDocumentId) docIds.push(frag.sourceDocumentId);
  for (const r of frag.referencedDocuments || []) {
    if (r.documentId && !docIds.includes(r.documentId)) docIds.push(r.documentId);
  }

  for (const documentId of docIds) {
    const text = await lookup.readDocumentText(documentId);
    if (text == null) continue;
    const range = findFragmentRefRangeForEditor(text, fragmentId);
    if (range) return { documentId, ...range };
  }
  return null;
}
