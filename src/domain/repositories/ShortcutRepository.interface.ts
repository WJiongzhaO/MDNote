import type { Shortcut } from '../values/Shortcut.vo';
import type { KeyBinding } from '../values/KeyBinding.vo';

/**
 * 快捷键仓储接口
 */
export interface IShortcutRepository {
  /**
   * 获取所有快捷键
   */
  getAll(): Promise<Shortcut[]>;

  /**
   * 根据 ID 获取快捷键
   */
  getById(id: string): Promise<Shortcut | null>;

  /**
   * 根据命令 ID 获取快捷键
   */
  getByCommandId(commandId: string): Promise<Shortcut | null>;

  /**
   * 根据按键绑定获取快捷键
   */
  getByKeyBinding(keyBinding: KeyBinding): Promise<Shortcut[]>;

  /**
   * 保存快捷键
   */
  save(shortcut: Shortcut): Promise<void>;

  /**
   * 删除快捷键
   */
  delete(id: string): Promise<void>;

  /**
   * 获取自定义绑定
   */
  getCustomBindings(): Promise<Record<string, string>>;

  /**
   * 保存自定义绑定
   */
  saveCustomBindings(bindings: Record<string, string>): Promise<void>;
}
