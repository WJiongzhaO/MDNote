import { ref, computed } from 'vue';
import type { Theme } from '@/types/theme.types';
import { getThemeService } from '@/application/services/ThemeService';

/**
 * 主题管理 Composable
 *
 * 提供响应式的主题状态和主题切换方法
 */
export function useTheme() {
  const themeService = getThemeService();

  const currentTheme = ref<Theme>(themeService.theme);
  const isDark = computed(() => currentTheme.value === 'dark');
  const isLight = computed(() => currentTheme.value === 'light');

  /**
   * 设置主题
   */
  const setTheme = (theme: Theme): void => {
    themeService.setTheme(theme);
    currentTheme.value = themeService.theme;
  };

  /**
   * 切换主题
   */
  const toggleTheme = (): void => {
    themeService.toggleTheme();
    currentTheme.value = themeService.theme;
  };

  /**
   * 初始化主题
   */
  const initialize = (): void => {
    themeService.initialize();
    currentTheme.value = themeService.theme;
  };

  return {
    currentTheme,
    isDark,
    isLight,
    setTheme,
    toggleTheme,
    initialize
  };
}
