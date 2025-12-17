import { marked } from 'marked';
import DOMPurify from 'dompurify';
import katex from 'katex';

export class MarkdownProcessor {
  private static instance: MarkdownProcessor;

  private constructor() {
    this.configureMarked();
  }

  static getInstance(): MarkdownProcessor {
    if (!MarkdownProcessor.instance) {
      MarkdownProcessor.instance = new MarkdownProcessor();
    }
    return MarkdownProcessor.instance;
  }

  private configureMarked(): void {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    // 添加数学公式扩展
    marked.use({
      extensions: [
        {
          name: 'mathInline',
          level: 'inline',
          start(src: string) { return src.match(/\$/)?.index; },
          tokenizer(src: string) {
            const rule = /^\$([^$\n]+?)\$/;
            const match = rule.exec(src);
            if (match) {
              return {
                type: 'mathInline',
                raw: match[0],
                text: match[1].trim()
              };
            }
          },
          renderer(token: any) {
            return katex.renderToString(token.text, {
              throwOnError: false,
              displayMode: false
            });
          }
        },
        {
          name: 'mathBlock',
          level: 'block',
          start(src: string) { return src.match(/^\$\$/)?.index; },
          tokenizer(src: string) {
            const rule = /^\$\$([\s\S]+?)\$\$/;
            const match = rule.exec(src);
            if (match) {
              return {
                type: 'mathBlock',
                raw: match[0],
                text: match[1].trim()
              };
            }
          },
          renderer(token: any) {
            return katex.renderToString(token.text, {
              throwOnError: false,
              displayMode: true
            });
          }
        }
      ]
    });
  }

  processMarkdown(content: string): string {
    const processedContent = marked(content) as string;
    return DOMPurify.sanitize(processedContent);
  }

  extractTitle(content: string): string {
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('# ')) {
        return trimmedLine.substring(2).trim();
      }
    }

    const firstLine = lines[0] || '';
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}