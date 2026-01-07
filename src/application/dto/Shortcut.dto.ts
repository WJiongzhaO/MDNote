/**
 * 快捷键 DTO
 */
export interface ShortcutDTO {
  id: string;
  commandId: string;
  keyBinding: string;
  category: string;
  description: string;
  context: string;
  customizable: boolean;
}

/**
 * 快捷键配置 DTO
 */
export interface ShortcutConfigDTO {
  shortcuts: ShortcutDTO[];
  customBindings: Record<string, string>; // commandId -> keyBinding
}

/**
 * 快捷键冲突 DTO
 */
export interface ShortcutConflictDTO {
  existing: ShortcutDTO;
  newShortcut: ShortcutDTO;
}
