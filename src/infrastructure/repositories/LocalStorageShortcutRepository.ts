import { injectable } from 'inversify';
import type { IShortcutRepository } from '../../domain/repositories/ShortcutRepository.interface';
import type { Shortcut } from '../../domain/values/Shortcut.vo';
import type { KeyBinding } from '../../domain/values/KeyBinding.vo';

/**
 * 快捷键配置 DTO
 */
interface ShortcutConfigDTO {
  shortcuts: any[];
  customBindings: Record<string, string>;
}

/**
 * LocalStorage 快捷键仓储实现
 */
@injectable()
export class LocalStorageShortcutRepository implements IShortcutRepository {
  private readonly STORAGE_KEY = 'mdnote-shortcuts';
  private readonly CUSTOM_BINDINGS_KEY = 'mdnote-shortcut-custom-bindings';

  async getAll(): Promise<Shortcut[]> {
    const config = this.loadConfig();
    return config.shortcuts.map(s => Shortcut.fromJSON(s));
  }

  async getById(id: string): Promise<Shortcut | null> {
    const shortcuts = await this.getAll();
    return shortcuts.find(s => s.id === id) || null;
  }

  async getByCommandId(commandId: string): Promise<Shortcut | null> {
    const shortcuts = await this.getAll();
    return shortcuts.find(s => s.commandId === commandId) || null;
  }

  async getByKeyBinding(keyBinding: KeyBinding): Promise<Shortcut[]> {
    const shortcuts = await this.getAll();
    const customBindings = await this.getCustomBindings();

    return shortcuts.filter(s => {
      const binding = customBindings[s.id] || s.keyBinding.value;
      return binding === keyBinding.value;
    });
  }

  async save(shortcut: Shortcut): Promise<void> {
    const config = this.loadConfig();
    const index = config.shortcuts.findIndex(s => s.id === shortcut.id);

    if (index >= 0) {
      config.shortcuts[index] = shortcut.toJSON();
    } else {
      config.shortcuts.push(shortcut.toJSON());
    }

    this.saveConfig(config);
  }

  async delete(id: string): Promise<void> {
    const config = this.loadConfig();
    config.shortcuts = config.shortcuts.filter(s => s.id !== id);
    this.saveConfig(config);
  }

  async getCustomBindings(): Promise<Record<string, string>> {
    try {
      const data = localStorage.getItem(this.CUSTOM_BINDINGS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load custom bindings:', error);
      return {};
    }
  }

  async saveCustomBindings(bindings: Record<string, string>): Promise<void> {
    localStorage.setItem(this.CUSTOM_BINDINGS_KEY, JSON.stringify(bindings));
  }

  private loadConfig(): ShortcutConfigDTO {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load shortcut config:', error);
    }

    // 返回默认配置
    return { shortcuts: [], customBindings: {} };
  }

  private saveConfig(config: ShortcutConfigDTO): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }
}
