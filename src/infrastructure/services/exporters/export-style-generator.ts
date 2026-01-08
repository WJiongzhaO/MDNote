/**
 * 导出样式生成器
 * 根据导出配置生成 CSS 样式
 */

import type { ExportConfig } from '../../../domain/types/export-config.types';

/**
 * 根据配置生成 CSS 样式
 */
export function generateStylesFromConfig(config: ExportConfig | undefined | null): string {
  // 如果没有配置，使用默认配置
  if (!config) {
    const { ExportPresets } = require('../../../domain/types/export-config.types');
    config = ExportPresets.default;
  }
  
  const { font, heading, body, page, code, table } = config;

  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

        body {
          font-family: ${font.bodyFont};
          font-size: ${body.fontSize}pt;
          line-height: ${body.lineHeight};
          color: ${body.textColor};
          padding: ${page.marginTop}cm ${page.marginRight}cm ${page.marginBottom}cm ${page.marginLeft}cm;
          text-align: ${body.textAlign};
          background-color: white;
        }

      /* 标题样式 */
      h1, h2, h3, h4, h5, h6 {
        font-family: ${font.headingFont};
        color: ${heading.headingColor};
        font-weight: ${heading.headingWeight};
        page-break-after: avoid;
      }

      /* 移除第一个元素的上边距 */
      body > *:first-child,
      body > div:first-child > *:first-child {
        margin-top: 0 !important;
      }

      h1 {
        font-size: ${heading.h1Size}pt;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        padding-bottom: 0.3em;
      }

      h2 {
        font-size: ${heading.h2Size}pt;
        margin-top: 1.2em;
        margin-bottom: 0.5em;
        padding-bottom: 0.2em;
      }

      h3 {
        font-size: ${heading.h3Size}pt;
        margin-top: 1em;
        margin-bottom: 0.4em;
      }

      h4 {
        font-size: ${heading.h4Size}pt;
        margin-top: 0.8em;
        margin-bottom: 0.3em;
      }

      h5 {
        font-size: ${heading.h5Size}pt;
        margin-top: 0.8em;
        margin-bottom: 0.3em;
      }

      h6 {
        font-size: ${heading.h6Size}pt;
        margin-top: 0.8em;
        margin-bottom: 0.3em;
      }

      /* 段落样式 */
      p {
        margin: ${body.paragraphSpacing}em 0;
      }

      /* 列表样式 */
      ul, ol {
        margin: 0.5em 0;
        padding-left: 2em;
      }

      li {
        margin: 0.2em 0;
      }

      /* 代码样式 */
      code {
        font-family: ${font.codeFont};
        font-size: ${code.fontSize}pt;
        background-color: ${code.backgroundColor};
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      pre {
        font-family: ${font.codeFont};
        font-size: ${code.fontSize}pt;
        background-color: ${code.backgroundColor};
        padding: 1em;
        border-radius: 5px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        overflow-x: auto;
        margin: 1em 0;
        line-height: 1.5;
        ${code.showLineNumbers ? 'counter-reset: line-number;' : ''}
        /* 代码块智能分页：小块避免切分，大块允许切分 */
        max-height: 80vh;
        page-break-before: auto;
        page-break-inside: auto;
      }

      pre code {
        background-color: transparent;
        padding: 0;
        border: none;
      }

      ${code.showLineNumbers ? `
      pre code {
        counter-increment: line-number;
      }
      pre code::before {
        content: counter(line-number);
        display: inline-block;
        width: 3em;
        padding-right: 1em;
        margin-right: 1em;
        border-right: 1px solid #ddd;
        color: #666;
        text-align: right;
      }
      ` : ''}

      /* 引用样式 */
      blockquote {
        border-left: 4px solid ${heading.headingColor};
        padding-left: 1em;
        padding-top: 0.5em;
        padding-bottom: 0.5em;
        margin: 1em 0;
        color: #666;
        font-style: italic;
        background-color: rgba(0, 0, 0, 0.02);
        page-break-inside: auto; /* 允许长引用跨页 */
      }
      
      blockquote p {
        margin: 0.3em 0;
      }

      /* 表格样式 */
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
        page-break-before: auto;
        page-break-inside: auto; /* 允许大表格跨页 */
      }
      
      /* 表格行尽量不被切分 */
      table tr {
        page-break-inside: avoid;
      }

      table th, table td {
        border: 1px solid ${table.borderColor};
        padding: 8px;
        text-align: left;
      }

      table th {
        background-color: ${table.headerBackground};
        font-weight: bold;
      }

      ${table.striped ? `
      table tbody tr:nth-child(even) {
        background-color: rgba(0, 0, 0, 0.02);
      }
      ` : ''}

      /* 图片样式 - 智能分页 */
      img {
        max-width: 100%;
        max-height: 85vh; /* 限制最大高度为视口的85%，避免超大图片 */
        height: auto;
        display: block;
        margin: 1.5em auto;
        border-radius: 4px;
        page-break-before: auto; /* 自动判断是否需要分页 */
        page-break-after: auto;
        page-break-inside: avoid;
        object-fit: contain; /* 保持图片比例 */
      }
      
      /* 图片标题 */
      img + em {
        display: block;
        text-align: center;
        font-size: 0.9em;
        color: #666;
        margin-top: -0.5em;
        margin-bottom: 1em;
        page-break-before: avoid; /* 标题与图片保持在一起 */
      }

      /* 分隔线 */
      hr {
        border: none;
        border-top: 1px solid #ddd;
        margin: 2em 0;
      }

      /* 链接样式 */
      a {
        color: ${heading.headingColor};
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: border-bottom-color 0.2s;
      }

      a:hover {
        border-bottom-color: ${heading.headingColor};
      }
      
      /* 打印时显示链接地址 */
      @media print {
        a[href]:after {
          content: " (" attr(href) ")";
          font-size: 0.8em;
          color: #666;
        }
        
        a[href^="#"]:after {
          content: "";
        }
      }

      /* PDF 专用：页面设置 */
      @page {
        size: ${page.pageSize} ${page.orientation};
        margin: ${page.marginTop}cm ${page.marginRight}cm ${page.marginBottom}cm ${page.marginLeft}cm;
        
        ${config.includePageNumbers ? `
        @bottom-right {
          content: "第 " counter(page) " 页 / 共 " counter(pages) " 页";
          font-size: 9pt;
          color: #666;
        }
        ` : ''}
        
        ${config.includeHeader && config.headerText ? `
        @top-center {
          content: "${config.headerText}";
          font-size: 9pt;
          color: #666;
          border-bottom: 1px solid #ddd;
          padding-bottom: 0.5em;
        }
        ` : ''}
        
        ${config.includeFooter && config.footerText ? `
        @bottom-center {
          content: "${config.footerText}";
          font-size: 9pt;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 0.5em;
        }
        ` : ''}
      }

      /* 其他元素优化 */
      strong, b {
        font-weight: bold;
        color: ${body.textColor};
      }
      
      em, i {
        font-style: italic;
      }
      
      del, s {
        text-decoration: line-through;
        opacity: 0.7;
      }
      
      mark {
        background-color: #fff3cd;
        padding: 2px 4px;
        border-radius: 2px;
      }
      
      /* Mermaid 图表容器样式 */
      .mermaid-container {
        page-break-before: auto;
        page-break-inside: auto; /* 允许大图表跨页 */
        max-height: 85vh; /* 限制最大高度 */
        overflow: visible;
        margin: 1.5em 0;
      }
      
      .mermaid-container svg {
        max-width: 100%;
        max-height: 85vh;
        height: auto !important;
        display: block;
        margin: 0 auto;
      }
      
      /* 打印优化 */
      @media print {
        body {
          max-width: 100%;
          padding: 0;
        }
        
        /* 标题后避免立即分页 */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          page-break-inside: avoid;
        }
        
        /* 标题前智能分页 */
        h1 {
          page-break-before: auto;
        }
        
        h2, h3 {
          page-break-before: auto;
        }
        
        /* 避免孤行和寡行 */
        p {
          orphans: 3;
          widows: 3;
          page-break-inside: auto;
        }
        
        /* 图片智能分页 */
        img {
          max-height: 75vh; /* 打印时进一步限制高度 */
          page-break-before: auto;
          page-break-after: auto;
          page-break-inside: avoid;
        }
        
        /* 小代码块避免切分，大代码块允许切分 */
        pre {
          page-break-before: auto;
        }
        
        /* 表格行避免切分 */
        table {
          page-break-before: auto;
        }
        
        table thead {
          display: table-header-group; /* 每页重复表头 */
        }
        
        table tr {
          page-break-inside: avoid;
        }
        
        /* Mermaid 图表打印优化 */
        .mermaid-container {
          max-height: 75vh;
          page-break-before: auto;
        }
        
        .mermaid-container svg {
          max-height: 75vh !important;
        }
      }
    </style>
  `;
}

/**
 * 生成目录 HTML
 */
export function generateTableOfContents(content: string): string {
  // 从 content 中提取所有标题
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]*>/g, ''); // 移除 HTML 标签
    const id = `heading-${headings.length}`;
    headings.push({ level, text, id });
  }

  if (headings.length === 0) {
    return '';
  }

  // 生成目录 HTML
  let tocHtml = '<nav class="table-of-contents" style="margin-bottom: 2.5em; padding: 1.5em; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">';
  tocHtml += '<h2 style="font-size: 16pt; margin-top: 0; margin-bottom: 1em; color: #2c3e50; font-weight: 600;">📑 目录</h2>';
  tocHtml += '<ul style="list-style: none; padding-left: 0; margin: 0;">';

  for (const heading of headings) {
    const indent = (heading.level - 1) * 1.5;
    const bullet = heading.level === 1 ? '▪' : '•';
    const fontSize = heading.level === 1 ? '1em' : '0.95em';
    const fontWeight = heading.level === 1 ? '600' : 'normal';
    
    tocHtml += `<li style="margin-left: ${indent}em; margin-bottom: 0.4em; line-height: 1.6;">
      <a href="#${heading.id}" style="color: #495057; text-decoration: none; display: inline-block; font-size: ${fontSize}; font-weight: ${fontWeight}; transition: color 0.2s;">
        <span style="color: #007bff; margin-right: 0.5em; font-weight: bold;">${bullet}</span>
        ${heading.text}
      </a>
    </li>`;
  }

  tocHtml += '</ul></nav>';
  tocHtml += '<div style="page-break-after: always;"></div>';

  return tocHtml;
}

