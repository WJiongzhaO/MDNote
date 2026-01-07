import type { KeyBinding } from './KeyBinding.vo';

/**
 * 快捷键值对象
 *
 * 表示一个完整的快捷键配置
 */
export class Shortcut {
  private readonly _id: string;
  private readonly _commandId: string;
  private readonly _keyBinding: KeyBinding;
  private readonly _category: ShortcutCategory;
  private readonly _description: string;
  private readonly _context: ShortcutContext;
  private readonly _customizable: boolean;

  constructor(
    id: string,
    commandId: string,
    keyBinding: KeyBinding,
    category: ShortcutCategory,
    description: string,
    context: ShortcutContext = 'global',
    customizable: boolean = true
  ) {
    this._id = id;
    this._commandId = commandId;
    this._keyBinding = keyBinding;
    this._category = category;
    this._description = description;
    this._context = context;
    this._customizable = customizable;
  }

  // Getters
  get id(): string { return this._id; }
  get commandId(): string { return this._commandId; }
  get keyBinding(): KeyBinding { return this._keyBinding; }
  get category(): ShortcutCategory { return this._category; }
  get description(): string { return this._description; }
  get context(): ShortcutContext { return this._context; }
  get customizable(): boolean { return this._customizable; }

  /**
   * 创建自定义快捷键
   */
  withKeyBinding(keyBinding: KeyBinding): Shortcut {
    return new Shortcut(
      this._id,
      this._commandId,
      keyBinding,
      this._category,
      this._description,
      this._context,
      this._customizable
    );
  }

  /**
   * 检查是否在指定上下文中有效
   */
  isValidInContext(context: ShortcutContext): boolean {
    return this._context === 'global' || this._context === context;
  }

  toJSON() {
    return {
      id: this._id,
      commandId: this._commandId,
      keyBinding: this._keyBinding.value,
      category: this._category,
      description: this._description,
      context: this._context,
      customizable: this._customizable
    };
  }

  static fromJSON(json: any): Shortcut {
    // 延迟导入 KeyBinding 避免循环依赖
    const { KeyBinding } = require('./KeyBinding.vo');
    return new Shortcut(
      json.id,
      json.commandId,
      KeyBinding.fromString(json.keyBinding),
      json.category,
      json.description,
      json.context,
      json.customizable
    );
  }
}

/**
 * 快捷键分类
 */
export type ShortcutCategory =
  | 'format'
  | 'file'
  | 'edit'
  | 'view'
  | 'navigation'
  | 'advanced';

/**
 * 快捷键上下文
 */
export type ShortcutContext =
  | 'global'
  | 'editor'
  | 'preview'
  | 'sidebar';
