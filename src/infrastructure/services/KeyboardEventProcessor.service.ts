import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { PlatformAdapter } from './PlatformAdapter.service';

/**
 * 键盘事件处理回调函数类型
 */
export type KeyboardEventHandler = (event: KeyboardEvent) => Promise<boolean>;

/**
 * 键盘事件处理服务
 *
 * 监听和处理全局键盘事件
 */
@injectable()
export class KeyboardEventProcessor {
  private listeners: Set<(event: KeyboardEvent) => void> = new Set();
  private active: boolean = false;
  private keyboardEventHandler?: KeyboardEventHandler;

  constructor(
    @inject(TYPES.PlatformAdapter)
    private readonly platformAdapter: PlatformAdapter
  ) {}

  /**
   * 设置键盘事件处理器
   */
  setKeyboardEventHandler(handler: KeyboardEventHandler): void {
    this.keyboardEventHandler = handler;
  }

  /**
   * 启动监听
   */
  start(): void {
    if (this.active) {
      return;
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.handleKeyDown);
      this.active = true;
    }
  }

  /**
   * 停止监听
   */
  stop(): void {
    if (!this.active) return;

    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.handleKeyDown);
      this.active = false;
    }
  }

  /**
   * 处理按键事件
   */
  private handleKeyDown = async (event: KeyboardEvent): Promise<void> => {
    // 忽略在输入框中的按键
    if (this.shouldIgnoreEvent(event)) {
      return;
    }

    // 平台适配（macOS 的 Cmd 键等）
    const adaptedEvent = this.platformAdapter.adaptEvent(event);

    // 调用设置的处理器
    if (this.keyboardEventHandler) {
      const handled = await this.keyboardEventHandler(adaptedEvent);

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  /**
   * 判断是否应该忽略事件
   */
  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;

    // 在特定元素中不处理快捷键
    const ignoreTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    if (ignoreTags.includes(target.tagName)) {
      // 除非是 Escape、Enter 等全局快捷键
      const shouldIgnore = !['Escape', 'Enter'].includes(event.key);
      return shouldIgnore;
    }

    // 在 contenteditable 中，根据上下文判断
    if (target.isContentEditable) {
      return false;
    }

    return false;
  }
}
