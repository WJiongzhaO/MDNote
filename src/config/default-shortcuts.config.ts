import { Shortcut } from '../domain/values/Shortcut.vo';
import { KeyBinding } from '../domain/values/KeyBinding.vo';
import type { ShortcutCategory, ShortcutContext } from '../domain/values/Shortcut.vo';

/**
 * 默认快捷键配置
 *
 * 根据 docs/快捷键系统设计文档.md 定义的默认快捷键
 */

/**
 * 创建默认 Markdown 格式化快捷键
 */
export function createDefaultFormatShortcuts(): Shortcut[] {
  const shortcuts: Shortcut[] = [];

  // 加粗 - Ctrl+B / Cmd+B
  shortcuts.push(new Shortcut(
    'format.bold',
    'format.bold',
    KeyBinding.fromString('Ctrl+B'),
    'format',
    '加粗',
    'editor',
    true
  ));

  // 斜体 - Ctrl+I / Cmd+I
  shortcuts.push(new Shortcut(
    'format.italic',
    'format.italic',
    KeyBinding.fromString('Ctrl+I'),
    'format',
    '斜体',
    'editor',
    true
  ));

  // 删除线 - Ctrl+Shift+X / Cmd+Shift+X
  shortcuts.push(new Shortcut(
    'format.strikethrough',
    'format.strikethrough',
    KeyBinding.fromString('Ctrl+Shift+X'),
    'format',
    '删除线',
    'editor',
    true
  ));

  // 行内代码 - Ctrl+` / Cmd+`
  shortcuts.push(new Shortcut(
    'format.code',
    'format.code',
    KeyBinding.fromString('Ctrl+`'),
    'format',
    '行内代码',
    'editor',
    true
  ));

  // 链接 - Ctrl+K / Cmd+K
  shortcuts.push(new Shortcut(
    'insert.link',
    'insert.link',
    KeyBinding.fromString('Ctrl+K'),
    'format',
    '插入链接',
    'editor',
    true
  ));

  // 图片 - Ctrl+Shift+I / Cmd+Shift+I
  shortcuts.push(new Shortcut(
    'insert.image',
    'insert.image',
    KeyBinding.fromString('Ctrl+Shift+I'),
    'format',
    '插入图片',
    'editor',
    true
  ));

  // 标题级别 1-6
  for (let i = 1; i <= 6; i++) {
    shortcuts.push(new Shortcut(
      `format.heading${i}`,
      `format.heading${i}`,
      KeyBinding.fromString(`Ctrl+${i}`),
      'format',
      `${'#'.repeat(i)} 标题`,
      'editor',
      true
    ));
  }

  // 无序列表 - Ctrl+Shift+8 / Cmd+Shift+8
  shortcuts.push(new Shortcut(
    'format.ul',
    'format.ul',
    KeyBinding.fromString('Ctrl+Shift+8'),
    'format',
    '无序列表',
    'editor',
    true
  ));

  // 有序列表 - Ctrl+Shift+7 / Cmd+Shift+7
  shortcuts.push(new Shortcut(
    'format.ol',
    'format.ol',
    KeyBinding.fromString('Ctrl+Shift+7'),
    'format',
    '有序列表',
    'editor',
    true
  ));

  // 引用块 - Ctrl+Shift+9 / Cmd+Shift+9
  shortcuts.push(new Shortcut(
    'format.blockquote',
    'format.blockquote',
    KeyBinding.fromString('Ctrl+Shift+9'),
    'format',
    '引用块',
    'editor',
    true
  ));

  // 代码块 - Ctrl+Shift+C / Cmd+Shift+C
  shortcuts.push(new Shortcut(
    'format.codeblock',
    'format.codeblock',
    KeyBinding.fromString('Ctrl+Shift+C'),
    'format',
    '代码块',
    'editor',
    true
  ));

  // 水平线 - Ctrl+Shift+- / Cmd+Shift+-
  shortcuts.push(new Shortcut(
    'insert.hr',
    'insert.hr',
    KeyBinding.fromString('Ctrl+Shift+-'),
    'format',
    '水平线',
    'editor',
    true
  ));

  return shortcuts;
}

/**
 * 创建默认编辑器操作快捷键
 */
export function createDefaultEditorShortcuts(): Shortcut[] {
  const shortcuts: Shortcut[] = [];

  // 保存 - Ctrl+S / Cmd+S
  shortcuts.push(new Shortcut(
    'editor.save',
    'editor.save',
    KeyBinding.fromString('Ctrl+S'),
    'file',
    '保存文档',
    'editor',
    false // 不可自定义，避免覆盖浏览器快捷键
  ));

  // 快速搜索 - Ctrl+F / Cmd+F
  shortcuts.push(new Shortcut(
    'editor.quickSearch',
    'editor.quickSearch',
    KeyBinding.fromString('Ctrl+F'),
    'search',
    '快速搜索',
    'editor',
    true
  ));

  return shortcuts;
}

/**
 * 创建所有默认快捷键
 */
export function createAllDefaultShortcuts(): Shortcut[] {
  return [
    ...createDefaultFormatShortcuts(),
    ...createDefaultEditorShortcuts(),
  ];
}
