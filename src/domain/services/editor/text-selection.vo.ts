/**
 * 文本选区值对象
 *
 * 表示编辑器中的文本选区范围
 *
 * @module domain/services/editor
 */

export class TextSelection {
  readonly start: number;
  readonly end: number;
  readonly text: string;

  private constructor(start: number, end: number, text: string) {
    if (start < 0 || end < 0) {
      throw new Error('Selection indices cannot be negative');
    }
    if (start > end) {
      throw new Error('Start index cannot be greater than end index');
    }

    this.start = start;
    this.end = end;
    this.text = text;
  }

  /**
   * 创建选区
   *
   * @param start - 起始位置
   * @param end - 结束位置
   * @param text - 选中的文本
   * @returns 文本选区实例
   */
  static create(start: number, end: number, text: string): TextSelection {
    return new TextSelection(start, end, text);
  }

  /**
   * 创建折叠选区（光标位置）
   *
   * @param position - 光标位置
   * @returns 折叠的文本选区
   */
  static collapsed(position: number): TextSelection {
    return new TextSelection(position, position, '');
  }

  /**
   * 判断是否折叠（光标模式）
   */
  get isCollapsed(): boolean {
    return this.start === this.end;
  }

  /**
   * 获取选区长度
   */
  get length(): number {
    return this.end - this.start;
  }

  /**
   * 判断是否包含指定位置
   *
   * @param position - 要检查的位置
   * @returns 是否包含
   */
  contains(position: number): boolean {
    return position >= this.start && position <= this.end;
  }

  /**
   * 移动选区
   *
   * @param delta - 移动的偏移量
   * @returns 新的文本选区
   */
  move(delta: number): TextSelection {
    return new TextSelection(
      this.start + delta,
      this.end + delta,
      this.text
    );
  }

  /**
   * 扩展选区
   *
   * @param length - 扩展的长度
   * @returns 新的文本选区
   */
  expand(length: number): TextSelection {
    return new TextSelection(
      this.start,
      this.end + length,
      this.text
    );
  }

  /**
   * 转换为 JSON
   */
  toJSON(): object {
    return {
      start: this.start,
      end: this.end,
      text: this.text
    };
  }

  /**
   * 从 JSON 创建
   *
   * @param data - JSON 数据
   * @returns 文本选区实例
   */
  static fromJSON(data: { start: number; end: number; text: string }): TextSelection {
    return new TextSelection(data.start, data.end, data.text);
  }
}
