/**
 * 主题类型
 */
export type Theme = 'light' | 'dark';

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  /**
   * 当前主题
   */
  theme: Theme;
}

/**
 * 主题存储键
 */
export const THEME_STORAGE_KEY = 'mdnote-theme-preference';
