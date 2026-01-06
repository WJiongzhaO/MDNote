/**
 * 依赖注入工具 Composable
 *
 * 提供 Vue 组件访问 DI 容器的能力
 *
 * @module presentation/composables
 */

import { inject } from 'vue';
import { TYPES } from '@/core/container/container.types';

/**
 * 使用依赖注入
 *
 * @param token - 依赖的类型标记
 * @returns 依赖实例
 *
 * @example
 * ```ts
 * const formatService = useInjection<FormatEditorService>(TYPES.FormatEditorService);
 * ```
 */
export function useInjection<T>(token: symbol): T {
  // 从 Vue 应用实例中获取容器
  const container = inject<any>('diContainer');

  if (!container) {
    throw new Error('DI container not found. Make sure app provides it.');
  }

  return container.get<T>(token);
}
