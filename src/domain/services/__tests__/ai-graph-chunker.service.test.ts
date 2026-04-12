import { describe, expect, it } from 'vitest';
import { splitMarkdownIntoGraphChunks } from '../ai-graph-chunker.service';

describe('splitMarkdownIntoGraphChunks', () => {
  it('splits first by heading and preserves stable chunk ids', () => {
    const markdown = ['# Intro', 'alpha', '## Detail', 'beta'].join('\n');
    const chunks = splitMarkdownIntoGraphChunks(markdown, 'doc-1');

    expect(chunks.map(chunk => chunk.chunkId)).toEqual(['doc-1:chunk:0', 'doc-1:chunk:1']);
    expect(chunks[0].markdown).toContain('# Intro');
    expect(chunks[1].markdown).toContain('## Detail');
  });

  it('falls back to paragraph splitting for oversized sections', () => {
    const markdown = `# Intro\n\n${'long paragraph '.repeat(200)}`;
    const chunks = splitMarkdownIntoGraphChunks(markdown, 'doc-2', { maxChars: 300 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.markdown.length <= 320)).toBe(true);
  });
});
