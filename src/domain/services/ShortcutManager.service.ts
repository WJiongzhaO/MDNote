import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { ShortcutRegistry } from './ShortcutRegistry.service';
import { ConflictDetector } from './ConflictDetector.service';
import { CommandExecutor } from './CommandExecutor.service';
import type { Shortcut } from '../values/Shortcut.vo';
import { KeyBinding } from '../values/KeyBinding.vo';
import type { ShortcutContext, ShortcutCategory } from '../values/Shortcut.vo';
import type { Command, CommandContext } from '../values/Command.vo';
import type { IShortcutRepository } from '../repositories/ShortcutRepository.interface';
import { createAllDefaultShortcuts } from '../../config/default-shortcuts.config';

// 延迟导入 KeyboardEventProcessor 避免循环依赖
type KeyboardEventProcessor = any;
type KeyboardEventHandler = (event: KeyboardEvent) => Promise<boolean>;
type Ref = any; // Vue Ref 类型

/**
 * 快捷键配置 DTO
 */
export interface ShortcutConfigDTO {
  shortcuts: any[];
  customBindings: Record<string, string>;
}

/**
 * ShortcutManager - 快捷键管理器实现（门面模式）
 *
 * 作为快捷键系统的统一入口，协调内部的多个服务
 *
 * @module domain/services
 */
@injectable()
export class ShortcutManager {
  private initialized: boolean = false;
  private currentContext: ShortcutContext = 'global';
  private keyboardProcessor?: KeyboardEventProcessor;
  private editorRef?: Ref;
  private contentRef?: Ref<string>;

  constructor(
    @inject(TYPES.ShortcutRegistry)
    private readonly registry: ShortcutRegistry,
    @inject(TYPES.ConflictDetector)
    private readonly conflictDetector: ConflictDetector,
    @inject(TYPES.CommandExecutor)
    private readonly commandExecutor: CommandExecutor,
    @inject(TYPES.ShortcutRepository)
    private readonly repository: IShortcutRepository,
    @inject(TYPES.ApplicationService)
    private readonly applicationService: any,
    @inject(TYPES.ShortcutCommandsFactory)
    private readonly commandsFactory: any
  ) {}

  /**
   * 初始化快捷键系统
   */
  async initialize(): Promise<void> {
    console.log('[ShortcutManager.initialize] 开始初始化快捷键系统');

    if (this.initialized) {
      console.warn('[ShortcutManager.initialize] 已经初始化过');
      return;
    }

    // 从仓储加载快捷键
    await this.registry.load();

    // 注册默认命令和快捷键
    this.registerDefaults();

    this.initialized = true;
    console.log('[ShortcutManager.initialize] ✅ 快捷键系统初始化完成', {
      totalShortcuts: this.getAll().length
    });
  }

  /**
   * 注册快捷键
   */
  register(shortcut: Shortcut): void {
    this.registry.register(shortcut);
  }

  /**
   * 批量注册快捷键
   */
  registerAll(shortcuts: Shortcut[]): void {
    shortcuts.forEach(shortcut => this.register(shortcut));
  }

  /**
   * 注销快捷键
   */
  unregister(id: string): void {
    this.registry.unregister(id);
  }

  /**
   * 处理键盘事件
   */
  async handleKeyboardEvent(
    event: KeyboardEvent,
    context?: ShortcutContext
  ): Promise<boolean> {
    if (!this.initialized) {
      console.warn('[ShortcutManager] System not initialized');
      return false;
    }

    const keyBinding = KeyBinding.fromKeyboardEvent(event);
    const shortcuts = this.registry.findByKeyBinding(
      keyBinding,
      context || this.currentContext
    );

    if (shortcuts.length === 0) return false;

    // 执行第一个匹配的快捷键
    const shortcut = shortcuts[0];

    console.log('[ShortcutManager.handleKeyboardEvent] 执行快捷键', {
      shortcutId: shortcut.id,
      commandId: shortcut.commandId,
      hasEditorRef: !!this.editorRef,
      hasContentRef: !!this.contentRef,
      editorValue: this.editorRef?.value,
      contentRefValue: this.contentRef?.value?.substring(0, 50) + '...'
    });

    // 构建完整的命令上下文，包含 editor 和 content
    const commandContext: CommandContext = {
      keyBinding,
      context: context || this.currentContext
    };

    // 添加 editor 和 content 引用（如果已设置）
    if (this.editorRef) {
      commandContext.editor = this.editorRef.value;
      console.log('[ShortcutManager.handleKeyboardEvent] 添加 editor 到 context', {
        editor: commandContext.editor
      });
    }
    if (this.contentRef) {
      commandContext.content = this.contentRef;
      console.log('[ShortcutManager.handleKeyboardEvent] 添加 content 到 context', {
        isRef: 'value' in this.contentRef,
        contentValue: this.contentRef.value?.substring(0, 50) + '...'
      });
    }

    await this.commandExecutor.execute(shortcut.commandId, commandContext);

    return true;
  }

  /**
   * 获取所有快捷键
   */
  getAll(): Shortcut[] {
    return this.registry.getAll();
  }

  /**
   * 根据分类获取快捷键
   */
  getByCategory(category: ShortcutCategory): Shortcut[] {
    return this.registry.getByCategory(category);
  }

  /**
   * 更新快捷键
   */
  async updateShortcut(id: string, keyBinding: KeyBinding): Promise<void> {
    // 检测冲突
    const conflict = this.detectConflict(keyBinding, id);
    if (conflict) {
      throw new Error(`Shortcut conflict detected with ${conflict.id}`);
    }

    const shortcut = await this.repository.getById(id);
    if (!shortcut) {
      throw new Error(`Shortcut not found: ${id}`);
    }

    // 更新快捷键
    const updatedShortcut = shortcut.withKeyBinding(keyBinding);
    await this.repository.save(updatedShortcut);

    // 重新注册
    this.registry.unregister(id);
    this.registry.register(updatedShortcut);
  }

  /**
   * 检测冲突
   */
  detectConflict(keyBinding: KeyBinding, excludeId?: string): Shortcut | null {
    return this.registry.detectConflict(keyBinding, excludeId);
  }

  /**
   * 重置快捷键
   */
  async resetToDefault(id: string): Promise<void> {
    const defaults = this.getDefaultShortcuts();
    const defaultShortcut = defaults.find(s => s.id === id);

    if (!defaultShortcut) {
      throw new Error(`Default shortcut not found: ${id}`);
    }

    await this.updateShortcut(id, defaultShortcut.keyBinding);
  }

  /**
   * 重置所有快捷键
   */
  async resetAll(): Promise<void> {
    const shortcuts = this.getAll();

    for (const shortcut of shortcuts) {
      try {
        await this.resetToDefault(shortcut.id);
      } catch (error) {
        console.error(`Failed to reset shortcut ${shortcut.id}:`, error);
      }
    }
  }

  /**
   * 导出配置
   */
  async exportConfig(): Promise<ShortcutConfigDTO> {
    const shortcuts = this.getAll();
    const customBindings = await this.repository.getCustomBindings();

    return {
      shortcuts: shortcuts.map(s => s.toJSON()),
      customBindings
    };
  }

  /**
   * 导入配置
   */
  async importConfig(config: ShortcutConfigDTO): Promise<void> {
    // 导入自定义绑定
    await this.repository.saveCustomBindings(config.customBindings);

    // 重新加载快捷键
    await this.registry.load();
  }

  /**
   * 设置键盘事件处理器（避免循环依赖）
   */
  setKeyboardProcessor(processor: KeyboardEventProcessor): void {
    console.log('[ShortcutManager.setKeyboardProcessor] 设置键盘事件处理器', {
      hasProcessor: !!processor,
      hasSetHandlerMethod: !!(processor && processor.setKeyboardEventHandler)
    });

    this.keyboardProcessor = processor;

    // 设置回调函数
    if (processor.setKeyboardEventHandler) {
      console.log('[ShortcutManager.setKeyboardProcessor] 设置回调函数');
      processor.setKeyboardEventHandler(
        (event: KeyboardEvent) => this.handleKeyboardEvent(event)
      );
      console.log('[ShortcutManager.setKeyboardProcessor] ✅ 回调函数已设置');
    } else {
      console.error('[ShortcutManager.setKeyboardProcessor] ❌ processor.setKeyboardEventHandler 不存在');
    }
  }

  /**
   * 设置编辑器和内容引用（用于快捷键命令）
   */
  setEditorContext(editor: Ref, content: Ref<string>): void {
    console.log('[ShortcutManager.setEditorContext] 设置编辑器上下文', {
      hasEditor: !!editor,
      hasContent: !!content,
      contentValue: content?.value?.substring(0, 50) + '...'
    });
    this.editorRef = editor;
    this.contentRef = content;
  }

  /**
   * 启动键盘监听
   */
  startListening(): void {
    console.log('[ShortcutManager.startListening] 启动键盘监听', {
      hasKeyboardProcessor: !!this.keyboardProcessor,
      hasStartMethod: !!(this.keyboardProcessor && this.keyboardProcessor.start)
    });

    if (this.keyboardProcessor && this.keyboardProcessor.start) {
      this.keyboardProcessor.start();
      console.log('[ShortcutManager.startListening] ✅ 已调用 keyboardProcessor.start()');
    } else {
      console.error('[ShortcutManager.startListening] ❌ keyboardProcessor 或 start 方法不存在');
    }
  }

  /**
   * 停止键盘监听
   */
  stopListening(): void {
    console.log('[ShortcutManager.stopListening] 停止键盘监听');

    if (this.keyboardProcessor && this.keyboardProcessor.stop) {
      this.keyboardProcessor.stop();
      console.log('[ShortcutManager.stopListening] ✅ 已停止键盘监听');
    }
  }

  /**
   * 设置当前上下文
   */
  setContext(context: ShortcutContext): void {
    this.currentContext = context;
  }

  /**
   * 注册命令
   */
  registerCommand(command: Command): void {
    this.commandExecutor.registerCommand(command);
  }

  /**
   * 批量注册命令
   */
  registerCommands(commands: Command[]): void {
    this.commandExecutor.registerCommands(commands);
  }

  /**
   * 搜索命令
   */
  searchCommands(query: string): Command[] {
    return this.commandExecutor.searchCommands(query);
  }

  /**
   * 注册默认快捷键和命令
   */
  private registerDefaults(): void {
    console.log('[ShortcutManager.registerDefaults] 开始注册默认快捷键和命令', {
      hasCommandsFactory: !!this.commandsFactory
    });

    // 使用注入的命令工厂
    const commands = this.commandsFactory.createAllCommands();
    this.registerCommands(commands);

    // 注册默认快捷键
    const defaults = createAllDefaultShortcuts();
    this.registerAll(defaults);

    console.log(`[ShortcutManager] 已注册 ${commands.length} 个命令和 ${defaults.length} 个快捷键`);
  }
}
