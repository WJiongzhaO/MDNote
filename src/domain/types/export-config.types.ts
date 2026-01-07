/**
 * 导出配置类型定义
 */

/**
 * 字体配置
 */
export interface FontConfig {
  // 正文字体
  bodyFont: string;
  // 标题字体
  headingFont: string;
  // 代码字体
  codeFont: string;
}

/**
 * 标题样式配置
 */
export interface HeadingConfig {
  // H1 字号（pt）
  h1Size: number;
  // H2 字号（pt）
  h2Size: number;
  // H3 字号（pt）
  h3Size: number;
  // H4 字号（pt）
  h4Size: number;
  // H5 字号（pt）
  h5Size: number;
  // H6 字号（pt）
  h6Size: number;
  // 标题颜色
  headingColor: string;
  // 标题粗细
  headingWeight: 'normal' | 'bold' | '600' | '700';
}

/**
 * 正文样式配置
 */
export interface BodyConfig {
  // 正文字号（pt）
  fontSize: number;
  // 行高
  lineHeight: number;
  // 文本颜色
  textColor: string;
  // 段落间距（em）
  paragraphSpacing: number;
  // 文本对齐方式
  textAlign: 'left' | 'justify' | 'center' | 'right';
}

/**
 * 页面配置
 */
export interface PageConfig {
  // 页边距（cm）
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  // 纸张大小
  pageSize: 'A4' | 'A5' | 'Letter' | 'Legal';
  // 页面方向
  orientation: 'portrait' | 'landscape';
}

/**
 * 代码块样式配置
 */
export interface CodeConfig {
  // 代码字号（pt）
  fontSize: number;
  // 背景颜色
  backgroundColor: string;
  // 是否显示行号
  showLineNumbers: boolean;
  // 主题
  theme: 'light' | 'dark';
}

/**
 * 表格样式配置
 */
export interface TableConfig {
  // 边框颜色
  borderColor: string;
  // 表头背景色
  headerBackground: string;
  // 是否斑马纹
  striped: boolean;
}

/**
 * 完整的导出配置
 */
export interface ExportConfig {
  // 配置名称
  name?: string;
  // 字体配置
  font: FontConfig;
  // 标题配置
  heading: HeadingConfig;
  // 正文配置
  body: BodyConfig;
  // 页面配置
  page: PageConfig;
  // 代码配置
  code: CodeConfig;
  // 表格配置
  table: TableConfig;
  // 是否包含目录
  includeTableOfContents: boolean;
  // 是否包含页码
  includePageNumbers: boolean;
  // 是否包含页眉
  includeHeader: boolean;
  // 页眉文本
  headerText?: string;
  // 是否包含页脚
  includeFooter: boolean;
  // 页脚文本
  footerText?: string;
}

/**
 * 预设配置类型
 */
export type ExportPreset = 'default' | 'academic' | 'professional' | 'minimal' | 'custom';

/**
 * 导出配置预设
 */
export const ExportPresets: Record<ExportPreset, ExportConfig> = {
  // 默认配置
  default: {
    name: '默认',
    font: {
      bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif',
      headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif',
      codeFont: '"Consolas", "Monaco", "Courier New", monospace'
    },
    heading: {
      h1Size: 24,
      h2Size: 20,
      h3Size: 16,
      h4Size: 14,
      h5Size: 12,
      h6Size: 12,
      headingColor: '#333333',
      headingWeight: 'bold'
    },
    body: {
      fontSize: 12,
      lineHeight: 1.6,
      textColor: '#333333',
      paragraphSpacing: 0.5,
      textAlign: 'justify'
    },
    page: {
      marginTop: 2,
      marginRight: 2,
      marginBottom: 2,
      marginLeft: 2,
      pageSize: 'A4',
      orientation: 'portrait'
    },
    code: {
      fontSize: 11,
      backgroundColor: '#f4f4f4',
      showLineNumbers: false,
      theme: 'light'
    },
    table: {
      borderColor: '#dddddd',
      headerBackground: '#f2f2f2',
      striped: false
    },
    includeTableOfContents: false,
    includePageNumbers: true,
    includeHeader: false,
    includeFooter: false
  },

  // 学术论文配置
  academic: {
    name: '学术论文',
    font: {
      bodyFont: '"Times New Roman", "SimSun", serif',
      headingFont: '"Times New Roman", "SimHei", serif',
      codeFont: '"Courier New", monospace'
    },
    heading: {
      h1Size: 20,
      h2Size: 16,
      h3Size: 14,
      h4Size: 12,
      h5Size: 12,
      h6Size: 12,
      headingColor: '#000000',
      headingWeight: 'bold'
    },
    body: {
      fontSize: 12,
      lineHeight: 2.0,
      textColor: '#000000',
      paragraphSpacing: 0,
      textAlign: 'justify'
    },
    page: {
      marginTop: 2.54,
      marginRight: 3.17,
      marginBottom: 2.54,
      marginLeft: 3.17,
      pageSize: 'A4',
      orientation: 'portrait'
    },
    code: {
      fontSize: 10,
      backgroundColor: '#f9f9f9',
      showLineNumbers: true,
      theme: 'light'
    },
    table: {
      borderColor: '#000000',
      headerBackground: '#ffffff',
      striped: false
    },
    includeTableOfContents: true,
    includePageNumbers: true,
    includeHeader: true,
    headerText: '学术论文',
    includeFooter: true
  },

  // 专业文档配置
  professional: {
    name: '专业文档',
    font: {
      bodyFont: '"Calibri", "Microsoft YaHei", sans-serif',
      headingFont: '"Calibri", "Microsoft YaHei", sans-serif',
      codeFont: '"Consolas", monospace'
    },
    heading: {
      h1Size: 26,
      h2Size: 20,
      h3Size: 16,
      h4Size: 14,
      h5Size: 12,
      h6Size: 12,
      headingColor: '#2c3e50',
      headingWeight: '600'
    },
    body: {
      fontSize: 11,
      lineHeight: 1.5,
      textColor: '#2c3e50',
      paragraphSpacing: 0.5,
      textAlign: 'left'
    },
    page: {
      marginTop: 2.5,
      marginRight: 2.5,
      marginBottom: 2.5,
      marginLeft: 2.5,
      pageSize: 'A4',
      orientation: 'portrait'
    },
    code: {
      fontSize: 10,
      backgroundColor: '#f8f9fa',
      showLineNumbers: false,
      theme: 'light'
    },
    table: {
      borderColor: '#dee2e6',
      headerBackground: '#e9ecef',
      striped: true
    },
    includeTableOfContents: true,
    includePageNumbers: true,
    includeHeader: false,
    includeFooter: true,
    footerText: '© 2026'
  },

  // 简约配置
  minimal: {
    name: '简约',
    font: {
      bodyFont: '"Georgia", "SimSun", serif',
      headingFont: '"Georgia", "SimSun", serif',
      codeFont: '"Monaco", monospace'
    },
    heading: {
      h1Size: 24,
      h2Size: 18,
      h3Size: 14,
      h4Size: 12,
      h5Size: 12,
      h6Size: 12,
      headingColor: '#222222',
      headingWeight: 'normal'
    },
    body: {
      fontSize: 12,
      lineHeight: 1.8,
      textColor: '#222222',
      paragraphSpacing: 1.0,
      textAlign: 'left'
    },
    page: {
      marginTop: 3,
      marginRight: 3,
      marginBottom: 3,
      marginLeft: 3,
      pageSize: 'A4',
      orientation: 'portrait'
    },
    code: {
      fontSize: 11,
      backgroundColor: '#fafafa',
      showLineNumbers: false,
      theme: 'light'
    },
    table: {
      borderColor: '#e0e0e0',
      headerBackground: '#f5f5f5',
      striped: false
    },
    includeTableOfContents: false,
    includePageNumbers: false,
    includeHeader: false,
    includeFooter: false
  },

  // 自定义配置（初始值同默认）
  custom: {
    name: '自定义',
    font: {
      bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif',
      headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif',
      codeFont: '"Consolas", "Monaco", "Courier New", monospace'
    },
    heading: {
      h1Size: 24,
      h2Size: 20,
      h3Size: 16,
      h4Size: 14,
      h5Size: 12,
      h6Size: 12,
      headingColor: '#333333',
      headingWeight: 'bold'
    },
    body: {
      fontSize: 12,
      lineHeight: 1.6,
      textColor: '#333333',
      paragraphSpacing: 0.5,
      textAlign: 'justify'
    },
    page: {
      marginTop: 2,
      marginRight: 2,
      marginBottom: 2,
      marginLeft: 2,
      pageSize: 'A4',
      orientation: 'portrait'
    },
    code: {
      fontSize: 11,
      backgroundColor: '#f4f4f4',
      showLineNumbers: false,
      theme: 'light'
    },
    table: {
      borderColor: '#dddddd',
      headerBackground: '#f2f2f2',
      striped: false
    },
    includeTableOfContents: false,
    includePageNumbers: true,
    includeHeader: false,
    includeFooter: false
  }
};

