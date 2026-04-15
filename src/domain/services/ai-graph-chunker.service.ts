export interface AiGraphChunk {
  chunkId: string;
  docId: string;
  markdown: string;
  headingPath: string[];
  startOffset: number;
  endOffset: number;
}

function splitOversizedSection(section: string, maxChars: number): string[] {
  if (section.length <= maxChars) {
    return [section];
  }

  const paragraphs = section.split(/\n\s*\n/).filter(Boolean);
  if (paragraphs.length <= 1) {
    const slices: string[] = [];
    for (let index = 0; index < section.length; index += maxChars) {
      slices.push(section.slice(index, index + maxChars));
    }
    return slices;
  }

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }

    const slices = splitOversizedSection(paragraph, maxChars);
    chunks.push(...slices.slice(0, -1));
    current = slices[slices.length - 1] ?? '';
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function splitMarkdownIntoGraphChunks(
  markdown: string,
  docId: string,
  options: { maxChars?: number } = {}
): AiGraphChunk[] {
  const maxChars = options.maxChars ?? 1600;
  const sections = markdown.split(/(?=^#{1,6}\s)/m).filter(Boolean);
  const sourceSections = sections.length > 0 ? sections : [markdown];
  const chunks: AiGraphChunk[] = [];
  let offsetCursor = 0;

  sourceSections.forEach(section => {
    const heading = section.match(/^(#{1,6})\s+(.*)$/m)?.[2]?.trim();
    const sectionParts = splitOversizedSection(section, maxChars).filter(Boolean);

    sectionParts.forEach(part => {
      const trimmed = part.trim();
      const startOffset = markdown.indexOf(trimmed, offsetCursor);
      const safeStartOffset = startOffset >= 0 ? startOffset : offsetCursor;
      const endOffset = safeStartOffset + trimmed.length;
      offsetCursor = endOffset;

      chunks.push({
        chunkId: `${docId}:chunk:${chunks.length}`,
        docId,
        markdown: trimmed,
        headingPath: heading ? [heading] : [],
        startOffset: safeStartOffset,
        endOffset
      });
    });
  });

  return chunks;
}
