import { injectable } from 'inversify';

/**
 * 引用形态类型
 */
export enum FragmentReferenceMode {
  LINKED = 'linked',      // 形态A：强引用模式，只读占位符
  DETACHED = 'detached',  // 形态B：脱钩模式，可编辑但保留标记
  CLEAN = 'clean'         // 形态C：完全断开，无标记
}

/**
 * 引用标志匹配结果
 */
export interface FragmentReferenceMatch {
  fragmentId: string;
  mode: FragmentReferenceMode;  // 引用形态
  isConnected: boolean;  // 兼容旧字段，linked模式为true
  match: string;  // 完整匹配文本
  startIndex: number;
  endIndex: number;
  title?: string;  // 片段标题（用于linked模式的显示）
  content?: string;  // 实际内容（用于detached模式）
}

/**
 * 引用标志解析器
 * 支持三种形态的容器化语法：
 * - 形态A（Linked）: {{ref:id:linked}} 或 [知识片段：标题]
 * - 形态B（Detached）: {{ref:id:detached}}...实际内容...
 * - 形态C（Clean）: 无标记，普通文本
 */
@injectable()
export class FragmentReferenceParser {
  // 正则表达式：匹配 {{ref:fragmentId:mode}} 格式
  private readonly REF_PATTERN = /\{\{ref:([a-zA-Z0-9-]+)(?::(linked|detached|connected|disconnected))?\}\}/g;

  // 正则表达式：匹配 [知识片段：标题] 格式（形态A的友好格式）
  private readonly LINKED_PLACEHOLDER_PATTERN = /\[知识片段：([^\]]+)\]/g;

  /**
   * 解析文档中的所有引用标志
   */
  parseReferences(content: string): FragmentReferenceMatch[] {
    const references: FragmentReferenceMatch[] = [];

    // 解析 {{ref:id:mode}} 格式
    let match;
    this.REF_PATTERN.lastIndex = 0;

    while ((match = this.REF_PATTERN.exec(content)) !== null) {
      const fragmentId = match[1];
      const modeStr = match[2] || 'linked'; // 默认为linked模式

      let mode: FragmentReferenceMode;
      if (modeStr === 'linked' || modeStr === 'connected') {
        mode = FragmentReferenceMode.LINKED;
      } else if (modeStr === 'detached' || modeStr === 'disconnected') {
        mode = FragmentReferenceMode.DETACHED;
      } else {
        mode = FragmentReferenceMode.LINKED; // 默认
      }

      references.push({
        fragmentId,
        mode,
        isConnected: mode === FragmentReferenceMode.LINKED,
        match: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    // 解析 [知识片段：标题] 格式（形态A的友好格式）
    // 注意：这种格式需要从其他地方获取fragmentId，这里先标记为特殊格式
    this.LINKED_PLACEHOLDER_PATTERN.lastIndex = 0;
    while ((match = this.LINKED_PLACEHOLDER_PATTERN.exec(content)) !== null) {
      const title = match[1];
      // 这种格式需要额外的映射来获取fragmentId，暂时使用title作为标识
      references.push({
        fragmentId: `placeholder:${title}`, // 临时标识，需要后续解析
        mode: FragmentReferenceMode.LINKED,
        isConnected: true,
        match: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        title
      });
    }

    // 按位置排序
    references.sort((a, b) => a.startIndex - b.startIndex);

    return references;
  }

  /**
   * 提取文档中所有引用的片段ID（去重）
   */
  extractFragmentIds(content: string): string[] {
    const references = this.parseReferences(content);
    const fragmentIds = references.map(ref => ref.fragmentId);
    return [...new Set(fragmentIds)]; // 去重
  }

  /**
   * 检查内容是否包含引用标志
   */
  hasReferences(content: string): boolean {
    this.REF_PATTERN.lastIndex = 0;
    return this.REF_PATTERN.test(content);
  }
}

