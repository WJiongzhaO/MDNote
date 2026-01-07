import { ref } from 'vue';
import type { Theme, ThemeConfig } from '@/types/theme.types';
import { THEME_STORAGE_KEY } from '@/types/theme.types';

/**
 * 主题服务
 *
 * 管理应用程序的主题切换和持久化
 */
export class ThemeService {
  private currentTheme = ref<Theme>('light');

  constructor() {
    this.loadThemePreference();
  }

  /**
   * 获取当前主题
   */
  get theme(): Theme {
    return this.currentTheme.value;
  }

  /**
   * 初始化主题系统
   */
  initialize(): void {
    // 应用保存的主题
    this.applyTheme(this.currentTheme.value);
  }

  /**
   * 设置主题
   */
  setTheme(theme: Theme): void {
    this.currentTheme.value = theme;
    this.applyTheme(theme);
    this.saveThemePreference(theme);
  }

  /**
   * 切换主题
   */
  toggleTheme(): void {
    const newTheme: Theme = this.currentTheme.value === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * 应用主题到 DOM
   */
  private applyTheme(theme: Theme): void {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  /**
   * 保存主题偏好
   */
  private saveThemePreference(theme: Theme): void {
    try {
      const config: ThemeConfig = {
        theme
      };
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('[ThemeService] Failed to save theme preference:', error);
    }
  }

  /**
   * 加载主题偏好
   */
  private loadThemePreference(): void {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);

      if (stored) {
        const config: ThemeConfig = JSON.parse(stored);
        this.currentTheme.value = config.theme || 'light';
      } else {
        // 默认浅色主题
        this.currentTheme.value = 'light';
      }
    } catch (error) {
      console.error('[ThemeService] Failed to load theme preference:', error);
      this.currentTheme.value = 'light';
    }
  }
}

// 单例实例
let themeServiceInstance: ThemeService | null = null;

/**
 * 获取主题服务实例
 */
export function getThemeService(): ThemeService {
  if (!themeServiceInstance) {
    themeServiceInstance = new ThemeService();
  }
  return themeServiceInstance;
}
