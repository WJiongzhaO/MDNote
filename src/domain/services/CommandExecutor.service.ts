import { injectable } from 'inversify';
import { Command } from '../values/Command.vo';
import type { CommandContext } from '../values/Command.vo';

/**
 * 命令执行服务
 *
 * 执行快捷键对应的命令
 */
@injectable()
export class CommandExecutor {
  private commands: Map<string, Command> = new Map();

  /**
   * 注册命令
   */
  registerCommand(command: Command): void {
    this.commands.set(command.id, command);
  }

  /**
   * 批量注册命令
   */
  registerCommands(commands: Command[]): void {
    commands.forEach(cmd => this.registerCommand(cmd));
  }

  /**
   * 执行命令
   */
  async execute(commandId: string, context: CommandContext): Promise<void> {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    await command.execute(context);
  }

  /**
   * 获取所有命令
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * 搜索命令
   */
  searchCommands(query: string): Command[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.commands.values())
      .filter(cmd => {
        const titleMatch = cmd.title.toLowerCase().includes(lowerQuery);
        const keywordMatch = cmd.keywords?.some(kw =>
          kw.toLowerCase().includes(lowerQuery)
        );
        return titleMatch || keywordMatch;
      });
  }

  /**
   * 根据 ID 获取命令
   */
  getCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * 注销命令
   */
  unregisterCommand(commandId: string): void {
    this.commands.delete(commandId);
  }
}
