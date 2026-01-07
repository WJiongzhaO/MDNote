import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { IShortcutRepository } from '../repositories/ShortcutRepository.interface';
import type { Shortcut } from '../values/Shortcut.vo';
import type { KeyBinding } from '../values/KeyBinding.vo';
import type { ShortcutContext, ShortcutCategory } from '../values/Shortcut.vo';

/**
 * 快捷键注册服务
 *
 * 管理快捷键的注册、查找和匹配
 */
@injectable()
export class ShortcutRegistry {
  private shortcuts: Map<string, Shortcut> = new Map();
  private keyBindingIndex: Map<string, Set<string>> = new Map();

  constructor(
    @inject(TYPES.ShortcutRepository)
    private readonly repository: IShortcutRepository
  ) {}

  /**
   * 注册快捷键
   */
  register(shortcut: Shortcut): void {
    // 检查 ID 冲突
    if (this.shortcuts.has(shortcut.id)) {
      throw new Error(`Shortcut with id ${shortcut.id} already exists`);
    }

    // 注册快捷键
    this.shortcuts.set(shortcut.id, shortcut);

    // 更新按键绑定索引
    const binding = shortcut.keyBinding.value;
    if (!this.keyBindingIndex.has(binding)) {
      this.keyBindingIndex.set(binding, new Set());
    }
    this.keyBindingIndex.get(binding)!.add(shortcut.id);
  }

  /**
   * 注销快捷键
   */
  unregister(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return;

    // 从索引中移除
    const binding = shortcut.keyBinding.value;
    const ids = this.keyBindingIndex.get(binding);
    if (ids) {
      ids.delete(id);
      if (ids.size === 0) {
        this.keyBindingIndex.delete(binding);
      }
    }

    // 移除快捷键
    this.shortcuts.delete(id);
  }

  /**
   * 根据按键绑定查找快捷键
   */
  findByKeyBinding(keyBinding: KeyBinding, context?: ShortcutContext): Shortcut[] {
    const binding = keyBinding.value;
    const ids = this.keyBindingIndex.get(binding);

    if (!ids) return [];

    const results: Shortcut[] = [];
    for (const id of ids) {
      const shortcut = this.shortcuts.get(id);
      if (shortcut && (!context || shortcut.isValidInContext(context))) {
        results.push(shortcut);
      }
    }

    return results;
  }

  /**
   * 获取所有快捷键
   */
  getAll(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * 根据分类获取快捷键
   */
  getByCategory(category: ShortcutCategory): Shortcut[] {
    return Array.from(this.shortcuts.values())
      .filter(s => s.category === category);
  }

  /**
   * 检测冲突
   */
  detectConflict(keyBinding: KeyBinding, excludeId?: string): Shortcut | null {
    const shortcuts = this.findByKeyBinding(keyBinding);
    return shortcuts.find(s => s.id !== excludeId) || null;
  }

  /**
   * 从仓储加载
   */
  async load(): Promise<void> {
    const shortcuts = await this.repository.getAll();
    for (const shortcut of shortcuts) {
      try {
        this.register(shortcut);
      } catch (error) {
        console.error(`Failed to register shortcut ${shortcut.id}:`, error);
      }
    }
  }

  /**
   * 根据 ID 获取快捷键
   */
  getById(id: string): Shortcut | undefined {
    return this.shortcuts.get(id);
  }
}
