/**
 * 按键绑定值对象
 *
 * 表示一个按键组合，如 "Ctrl+B", "Cmd+I"
 */
export class KeyBinding {
  private readonly _value: string;

  constructor(
    ctrl: boolean,
    alt: boolean,
    shift: boolean,
    meta: boolean,
    key: string
  ) {
    const parts: string[] = [];
    if (ctrl) parts.push('ctrl');
    if (alt) parts.push('alt');
    if (shift) parts.push('shift');
    if (meta) parts.push('meta');
    if (key) parts.push(key.toLowerCase());

    this._value = parts.join('+');
  }

  get value(): string {
    return this._value;
  }

  /**
   * 从键盘事件创建按键绑定
   */
  static fromKeyboardEvent(event: KeyboardEvent): KeyBinding {
    return new KeyBinding(
      event.ctrlKey,
      event.altKey,
      event.shiftKey,
      event.metaKey,
      event.key
    );
  }

  /**
   * 从字符串创建按键绑定
   */
  static fromString(str: string): KeyBinding {
    const parts = str.toLowerCase().split('+');
    const ctrl = parts.includes('ctrl');
    const alt = parts.includes('alt');
    const shift = parts.includes('shift');
    const meta = parts.includes('meta');
    const key = parts.find(p =>
      !['ctrl', 'alt', 'shift', 'meta'].includes(p)
    ) || '';

    return new KeyBinding(ctrl, alt, shift, meta, key);
  }

  /**
   * 匹配键盘事件
   */
  matches(event: KeyboardEvent): boolean {
    return this._value === KeyBinding.fromKeyboardEvent(event)._value;
  }

  /**
   * 转换为平台特定的显示文本
   */
  toDisplayText(): string {
    // 在浏览器环境中，我们通过检查 userAgent 来判断平台
    const platform = typeof window !== 'undefined' && window.navigator
      ? window.navigator.platform.toLowerCase()
      : '';

    let text = this._value;

    // macOS: Ctrl -> ⌘, Alt -> ⌥, Shift -> ⇧, Meta -> ⌃
    if (platform.includes('mac')) {
      text = text
        .replace('ctrl', '⌘')
        .replace('alt', '⌥')
        .replace('shift', '⇧')
        .replace('meta', '⌃');
    }

    return text;
  }

  equals(other: KeyBinding): boolean {
    return this._value === other._value;
  }
}
