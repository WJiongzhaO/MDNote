import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { ShortcutRegistry } from './ShortcutRegistry.service';
import type { KeyBinding } from '../values/KeyBinding.vo';
import type { Shortcut } from '../values/Shortcut.vo';

/**
 * 快捷键冲突 DTO
 */
export interface ShortcutConflictDTO {
  existing: any;
  newShortcut: any;
}

/**
 * 冲突检测服务
 *
 * 检测快捷键绑定冲突
 */
@injectable()
export class ConflictDetector {
  constructor(
    @inject(TYPES.ShortcutRegistry)
    private readonly registry: ShortcutRegistry
  ) {}

  /**
   * 检测按键绑定冲突
   */
  detect(
    keyBinding: KeyBinding,
    excludeId?: string
  ): ShortcutConflictDTO | null {
    const conflict = this.registry.detectConflict(keyBinding, excludeId);

    if (!conflict) return null;

    return {
      existing: conflict.toJSON(),
      newShortcut: {
        id: excludeId || 'unknown',
        commandId: 'unknown',
        keyBinding: keyBinding.value,
        category: 'unknown',
        description: 'New shortcut',
        context: 'global',
        customizable: true
      }
    };
  }

  /**
   * 批量检测冲突
   */
  detectBatch(shortcuts: Shortcut[]): ShortcutConflictDTO[] {
    const conflicts: ShortcutConflictDTO[] = [];

    for (const shortcut of shortcuts) {
      const conflict = this.detect(shortcut.keyBinding, shortcut.id);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }
}
