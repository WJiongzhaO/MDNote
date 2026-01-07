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
    console.log('[KeyboardEventProcessor.setKeyboardEventHandler] 设置键盘事件处理器', {
      hasHandler: !!handler
    });
    this.keyboardEventHandler = handler;
    console.log('[KeyboardEventProcessor.setKeyboardEventHandler] ✅ 处理器已设置');
  }

  /**
   * 启动监听
   */
  start(): void {
    console.log('[KeyboardEventProcessor.start] 启动键盘监听', {
      active: this.active,
      hasDocument: typeof document !== 'undefined'
    });

    if (this.active) {
      console.warn('[KeyboardEventProcessor.start] 已经在监听中');
      return;
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.handleKeyDown);
      this.active = true;
      console.log('[KeyboardEventProcessor.start] ✅ 键盘监听已启动');
    } else {
      console.error('[KeyboardEventProcessor.start] ❌ document 对象不存在');
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
    console.log('[KeyboardEventProcessor.handleKeyDown] 键盘事件触发', {
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      active: this.active,
      hasEventHandler: !!this.keyboardEventHandler
    });

    // 忽略在输入框中的按键
    if (this.shouldIgnoreEvent(event)) {
      console.log('[KeyboardEventProcessor.handleKeyDown] 事件被忽略');
      return;
    }

    // 平台适配（macOS 的 Cmd 键等）
    const adaptedEvent = this.platformAdapter.adaptEvent(event);

    // 调用设置的处理器
    if (this.keyboardEventHandler) {
      console.log('[KeyboardEventProcessor.handleKeyDown] 调用键盘事件处理器');
      const handled = await this.keyboardEventHandler(adaptedEvent);
      console.log('[KeyboardEventProcessor.handleKeyDown] 处理器返回', { handled });

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    } else {
      console.warn('[KeyboardEventProcessor.handleKeyDown] ⚠️ 没有设置 keyboardEventHandler');
    }
  };

  /**
   * 判断是否应该忽略事件
   */
  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;

    console.log('[KeyboardEventProcessor.shouldIgnoreEvent] 检查是否忽略事件', {
      tagName: target.tagName,
      isContentEditable: target.isContentEditable,
      key: event.key
    });

    // 在特定元素中不处理快捷键
    const ignoreTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    if (ignoreTags.includes(target.tagName)) {
      // 除非是 Escape、Enter 等全局快捷键
      const shouldIgnore = !['Escape', 'Enter'].includes(event.key);
      console.log('[KeyboardEventProcessor.shouldIgnoreEvent] 在输入元素中', {
        shouldIgnore,
        reason: target.tagName
      });
      return shouldIgnore;
    }

    // 在 contenteditable 中，根据上下文判断
    if (target.isContentEditable) {
      // 某些快捷键在编辑器中生效，某些不生效
      console.log('[KeyboardEventProcessor.shouldIgnoreEvent] 在 contenteditable 中，不忽略');
      return false;
    }

    console.log('[KeyboardEventProcessor.shouldIgnoreEvent] 不忽略事件');
    return false;
  }
}
