import type { KeyBinding } from './KeyBinding.vo';

/**
 * 命令执行上下文
 */
export interface CommandContext {
  editor?: HTMLDivElement;
  content?: any;
  selection?: { start: number; end: number; text: string };
  keyBinding?: KeyBinding;
  [key: string]: any;
}

/**
 * 命令值对象
 *
 * 表示一个可执行的命令
 */
export class Command {
  private readonly _id: string;
  private readonly _title: string;
  private readonly _handler: CommandHandler;
  private readonly _category: string;
  private readonly _icon?: string;
  private readonly _keywords?: string[];

  constructor(
    id: string,
    title: string,
    handler: CommandHandler,
    category: string,
    icon?: string,
    keywords?: string[]
  ) {
    this._id = id;
    this._title = title;
    this._handler = handler;
    this._category = category;
    this._icon = icon;
    this._keywords = keywords;
  }

  get id(): string { return this._id; }
  get title(): string { return this._title; }
  get handler(): CommandHandler { return this._handler; }
  get category(): string { return this._category; }
  get icon(): string | undefined { return this._icon; }
  get keywords(): string[] | undefined { return this._keywords; }

  /**
   * 执行命令
   */
  async execute(context: CommandContext): Promise<void> {
    await this._handler(context);
  }
}

/**
 * 命令处理函数
 */
export type CommandHandler = (context: CommandContext) => void | Promise<void>;
