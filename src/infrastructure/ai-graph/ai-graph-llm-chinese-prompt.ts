import { ChatPromptTemplate } from '@langchain/core/prompts'

/**
 * 供 {@link LLMGraphTransformer} 使用的中文抽取说明。
 * 默认包内英文 SYSTEM_PROMPT 会令关系类型呈英文大写形式；此处要求关系用简短中文描述。
 */
export const CHINESE_LLM_GRAPH_SYSTEM_PROMPT = `
你是用于从文本中抽取结构化知识图谱信息的专业算法。请在**准确**前提下尽量覆盖文本中的关键信息，不要臆测文中未出现的内容。

## 节点（nodes）
- **id**：使用文中可区分实体的自然语言名称（如人名、书名、机构名）；不要用纯数字作 id。
- **type**：实体类别，优先使用**简短中文**概括（如：人物、组织、概念、技术、事件、地点、文档）；也可在与原文一致时使用英文类别名（如 Person），保持全文统一即可。

## 关系（relationships）
- **relationshipType（必填）**：必须用 **2～12 个简体中文字** 概括关系语义，例如：属于、包含、引用、创建于、依赖于、参与、合作、影响、实现、位于、隶属于。
- **禁止使用** 全大写英文蛇形常量（如 RELATED_TO、PART_OF）；若原文是英文语境，可将语义译为中文关系名（例如 "references" → 「引用」）。
- 关系两端实体须与 nodes 中已有实体 id 一致。

## 指代消解
对同一实体在文中的不同称呼或代词，应统一为最完整、最明确的名称作为 id。

## 输出
- 严格遵守下游 JSON Schema，只输出可解析的结构化结果，勿附加说明或 Markdown 代码围栏。
`.trim()

export function createChineseLlmGraphPromptTemplate(): ChatPromptTemplate {
  return ChatPromptTemplate.fromMessages([
    ['system', CHINESE_LLM_GRAPH_SYSTEM_PROMPT],
    [
      'human',
      '请按要求的格式抽取知识图谱。不要输出任何解释或前后缀。输入文本如下：\n\n{input}',
    ],
  ])
}
