import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useInjection } from './useInjection';
import { TYPES } from '@/core/container/container.types';
import type { ShortcutManager } from '@/domain/services/ShortcutManager.service';
import type { Shortcut } from '@/domain/values/Shortcut.vo';
import type { KeyBinding } from '@/domain/values/KeyBinding.vo';
import type { ShortcutContext, ShortcutCategory } from '@/domain/values/Shortcut.vo';

/**
 * 快捷键管理 Composable
 *
 * 提供快捷键相关的响应式状态和方法
 */
export function useShortcutManager() {
  const shortcutManager = useInjection<ShortcutManager>(TYPES.ShortcutManager);

  const shortcuts = ref<Shortcut[]>([]);
  const currentContext = ref<ShortcutContext>('global');
  const initialized = ref(false);
  const listening = ref(false);

  /**
   * 初始化快捷键系统
   */
  const initialize = async () => {
    if (initialized.value) {
      console.log('[useShortcutManager.initialize] 已经初始化，跳过');
      return;
    }

    console.log('[useShortcutManager.initialize] 开始初始化快捷键系统');

    try {
      await shortcutManager.initialize();
      initialized.value = true;

      // 加载快捷键列表
      await loadShortcuts();

      console.log('[useShortcutManager] ✅ 快捷键系统初始化成功', {
        totalShortcuts: shortcuts.value.length
      });
    } catch (error) {
      console.error('[useShortcutManager] ❌ 初始化失败:', error);
      throw error;
    }
  };

  /**
   * 加载快捷键
   */
  const loadShortcuts = async () => {
    shortcuts.value = shortcutManager.getAll();
  };

  /**
   * 按分类获取快捷键
   */
  const getShortcutsByCategory = (category: ShortcutCategory): Shortcut[] => {
    return shortcutManager.getByCategory(category);
  };

  /**
   * 更新快捷键
   */
  const updateShortcut = async (id: string, keyBinding: KeyBinding) => {
    try {
      // 检测冲突
      const conflict = shortcutManager.detectConflict(keyBinding, id);
      if (conflict) {
        throw new Error(`快捷键冲突：与 "${conflict.description}" 冲突`);
      }

      await shortcutManager.updateShortcut(id, keyBinding);
      await loadShortcuts();

      console.log(`[useShortcutManager] 快捷键 ${id} 已更新`);
    } catch (error) {
      console.error('[useShortcutManager] 更新快捷键失败:', error);
      throw error;
    }
  };

  /**
   * 重置快捷键
   */
  const resetShortcut = async (id: string) => {
    try {
      await shortcutManager.resetToDefault(id);
      await loadShortcuts();

      console.log(`[useShortcutManager] 快捷键 ${id} 已重置`);
    } catch (error) {
      console.error('[useShortcutManager] 重置快捷键失败:', error);
      throw error;
    }
  };

  /**
   * 重置所有快捷键
   */
  const resetAll = async () => {
    try {
      await shortcutManager.resetAll();
      await loadShortcuts();

      console.log('[useShortcutManager] 所有快捷键已重置');
    } catch (error) {
      console.error('[useShortcutManager] 重置所有快捷键失败:', error);
      throw error;
    }
  };

  /**
   * 设置当前上下文
   */
  const setContext = (context: ShortcutContext) => {
    currentContext.value = context;
    shortcutManager.setContext(context);
  };

  /**
   * 启动键盘监听
   */
  const startListening = () => {
    console.log('[useShortcutManager.startListening] 准备启动键盘监听', {
      initialized: initialized.value
    });

    if (!initialized.value) {
      console.error('[useShortcutManager] ❌ 系统未初始化，无法启动监听');
      return;
    }

    shortcutManager.startListening();
    listening.value = true;

    console.log('[useShortcutManager] ✅ 已启动键盘监听');
  };

  /**
   * 停止键盘监听
   */
  const stopListening = () => {
    shortcutManager.stopListening();
    listening.value = false;

    console.log('[useShortcutManager] 已停止键盘监听');
  };

  /**
   * 搜索命令
   */
  const searchCommands = (query: string) => {
    return shortcutManager.searchCommands(query);
  };

  /**
   * 导出配置
   */
  const exportConfig = async () => {
    try {
      const config = await shortcutManager.exportConfig();
      console.log('[useShortcutManager] 配置已导出:', config);
      return config;
    } catch (error) {
      console.error('[useShortcutManager] 导出配置失败:', error);
      throw error;
    }
  };

  /**
   * 导入配置
   */
  const importConfig = async (config: any) => {
    try {
      await shortcutManager.importConfig(config);
      await loadShortcuts();

      console.log('[useShortcutManager] 配置已导入');
    } catch (error) {
      console.error('[useShortcutManager] 导入配置失败:', error);
      throw error;
    }
  };

  return {
    // 状态
    shortcuts,
    currentContext,
    initialized,
    listening,

    // 方法
    initialize,
    loadShortcuts,
    getShortcutsByCategory,
    updateShortcut,
    resetShortcut,
    resetAll,
    setContext,
    startListening,
    stopListening,
    searchCommands,
    exportConfig,
    importConfig,

    // 暴露 shortcutManager 实例（用于高级配置）
    shortcutManager,
  };
}

/**
 * 使用编辑器快捷键
 *
 * 专门用于编辑器场景的快捷钩子
 */
export function useEditorShortcuts(options: {
  editor: Ref<HTMLDivElement | undefined>;
  content: Ref<string>;
  onContentUpdate?: (newContent: string, cursorPosition?: number) => void;
}) {
  console.log('[useEditorShortcuts] ===== 函数被调用 =====', {
    hasEditor: !!options.editor,
    hasContent: !!options.content
  });

  const { initialize, setContext, startListening, shortcutManager } = useShortcutManager();

  console.log('[useEditorShortcuts] 获取到 shortcutManager', {
    hasManager: !!shortcutManager
  });

  onMounted(async () => {
    console.log('[useEditorShortcuts] onMounted 开始执行');

    // 初始化快捷键系统
    await initialize();

    console.log('[useEditorShortcuts] 准备设置编辑器上下文', {
      hasEditor: !!options.editor,
      hasContent: !!options.content,
      contentLength: options.content?.value?.length || 0
    });

    // 设置编辑器和内容引用到 ShortcutManager
    shortcutManager.setEditorContext(options.editor, options.content);

    // 设置为编辑器上下文
    setContext('editor');

    // 启动键盘监听
    startListening();

    console.log('[useEditorShortcuts] 编辑器快捷键已启用');
  });

  onUnmounted(() => {
    // 清理工作（如果需要）
    console.log('[useEditorShortcuts] 编辑器快捷键已禁用');
  });

  return {
    initialize,
    setContext,
  };
}
