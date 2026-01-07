import { injectable } from 'inversify';
import type { KeyBinding } from '../../domain/values/KeyBinding.vo';

/**
 * 平台适配器
 *
 * 处理不同平台的快捷键差异
 */
@injectable()
export class PlatformAdapter {
  private platform: string;

  constructor() {
    // 在浏览器环境中检测平台
    if (typeof window !== 'undefined' && window.navigator) {
      this.platform = window.navigator.platform.toLowerCase();
    } else if (typeof process !== 'undefined') {
      this.platform = process.platform;
    } else {
      this.platform = 'unknown';
    }
  }

  /**
   * 适配键盘事件
   */
  adaptEvent(event: KeyboardEvent): KeyboardEvent {
    // macOS: 将 Cmd 键映射为 Ctrl 键的逻辑
    if (this.platform.includes('mac')) {
      // 在实际实现中，可能需要创建一个新的事件对象
      // 这里简化处理，直接返回原事件
      // 后续可以在 ShortcutManager 中处理平台差异
    }

    return event;
  }

  /**
   * 获取平台修饰键名称
   */
  getModifierKeyName(): string {
    return this.platform.includes('mac') ? 'Cmd' : 'Ctrl';
  }

  /**
   * 获取显示用的快捷键文本
   */
  getDisplayText(keyBinding: KeyBinding): string {
    return keyBinding.toDisplayText();
  }

  /**
   * 判断是否为 macOS
   */
  isMac(): boolean {
    return this.platform.includes('mac');
  }

  /**
   * 判断是否为 Windows
   */
  isWindows(): boolean {
    return this.platform.includes('win');
  }

  /**
   * 判断是否为 Linux
   */
  isLinux(): boolean {
    return this.platform.includes('linux');
  }
}
