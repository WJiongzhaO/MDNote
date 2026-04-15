import { describe, it, expect, beforeEach } from 'vitest'
import { FragmentReferenceResolver } from '../fragment-reference-resolver.service'
import { FragmentReferenceParser } from '../fragment-reference-parser.service'
import type { KnowledgeFragmentRepository } from '../../repositories/knowledge-fragment.repository.interface'
import type { ImageStorageService } from '../image-storage.interface'

describe('FragmentReferenceResolver', () => {
  let resolver: FragmentReferenceResolver
  let mockFragmentRepository: KnowledgeFragmentRepository
  let mockImageStorage: ImageStorageService

  beforeEach(() => {
    mockImageStorage = {
      copyImagesFromFragmentToDocument: async () => new Map(),
      getDocumentAssetsPath: () => 'assets',
      getFragmentStoragePath: () => 'fragments/assets/test-fragment-id',
      copyImage: async () => true,
    } as any

    resolver = new FragmentReferenceResolver(mockImageStorage)
  })

  describe('resolveReferences - 多个片段引用的索引偏移问题', () => {
    it('应该正确替换多个片段引用，避免索引偏移', async () => {
      const content = `# 测试文档

{{ref:fragment-1}}

一些中间文本

{{ref:fragment-2}}

更多文本

{{ref:fragment-3}}

结束`

      const mockFragment1 = {
        getId: () => ({ value: 'fragment-1' }),
        toMarkdown: () => '```javascript\nconsole.log("片段1")\n```',
        getUpdatedAt: () => new Date(),
      } as any

      const mockFragment2 = {
        getId: () => ({ value: 'fragment-2' }),
        toMarkdown: () => '```mermaid\ngraph TD\nA-->B\n```',
        getUpdatedAt: () => new Date(),
      } as any

      const mockFragment3 = {
        getId: () => ({ value: 'fragment-3' }),
        toMarkdown: () => '```python\nprint("片段3")\n```',
        getUpdatedAt: () => new Date(),
      } as any

      mockFragmentRepository = {
        findById: async ({ value }: any) => {
          if (value === 'fragment-1') return mockFragment1
          if (value === 'fragment-2') return mockFragment2
          if (value === 'fragment-3') return mockFragment3
          return null
        },
      } as any

      ;(resolver as any).getFragmentRepository = async () => mockFragmentRepository

      const result = await resolver.resolveReferences(content, 'test-doc')

      expect(result).toContain('console.log("片段1")')
      expect(result).toContain('graph TD')
      expect(result).toContain('print("片段3")')
      expect(result).not.toContain('{{ref:fragment-1}}')
      expect(result).not.toContain('{{ref:fragment-2}}')
      expect(result).not.toContain('{{ref:fragment-3}}')
      expect(result).toContain('一些中间文本')
      expect(result).toContain('更多文本')
      expect(result).toContain('结束')
    })

    it('应该正确处理连续的片段引用', async () => {
      const content = `# 测试文档

{{ref:fragment-1}}
{{ref:fragment-2}}
{{ref:fragment-3}}`

      const mockFragment1 = {
        getId: () => ({ value: 'fragment-1' }),
        toMarkdown: () => '内容1',
        getUpdatedAt: () => new Date(),
      } as any

      const mockFragment2 = {
        getId: () => ({ value: 'fragment-2' }),
        toMarkdown: () => '内容2',
        getUpdatedAt: () => new Date(),
      } as any

      const mockFragment3 = {
        getId: () => ({ value: 'fragment-3' }),
        toMarkdown: () => '内容3',
        getUpdatedAt: () => new Date(),
      } as any

      mockFragmentRepository = {
        findById: async ({ value }: any) => {
          if (value === 'fragment-1') return mockFragment1
          if (value === 'fragment-2') return mockFragment2
          if (value === 'fragment-3') return mockFragment3
          return null
        },
      } as any

      ;(resolver as any).getFragmentRepository = async () => mockFragmentRepository

      const result = await resolver.resolveReferences(content, 'test-doc')

      expect(result).toBe(`# 测试文档

内容1
内容2
内容3`)
    })

    it('应该正确处理片段内容长度差异很大的情况', async () => {
      const content = `# 测试文档

{{ref:short-fragment}}

{{ref:very-long-fragment}}`

      const shortContent = '短内容'
      const longContent = '这是一个非常长的内容\n'.repeat(50)

      const mockShortFragment = {
        getId: () => ({ value: 'short-fragment' }),
        toMarkdown: () => shortContent,
        getUpdatedAt: () => new Date(),
      } as any

      const mockLongFragment = {
        getId: () => ({ value: 'very-long-fragment' }),
        toMarkdown: () => longContent,
        getUpdatedAt: () => new Date(),
      } as any

      mockFragmentRepository = {
        findById: async ({ value }: any) => {
          if (value === 'short-fragment') return mockShortFragment
          if (value === 'very-long-fragment') return mockLongFragment
          return null
        },
      } as any

      ;(resolver as any).getFragmentRepository = async () => mockFragmentRepository

      const result = await resolver.resolveReferences(content, 'test-doc')

      expect(result).toContain(shortContent)
      expect(result).toContain(longContent)
      expect(result).not.toContain('{{ref:')
    })
  })
})

describe('FragmentReferenceParser', () => {
  let parser: FragmentReferenceParser

  beforeEach(() => {
    parser = new FragmentReferenceParser()
  })

  it('应该正确解析多个引用标志', () => {
    const content = `# 测试文档

{{ref:fragment-1}}

一些文本

{{ref:fragment-2}}

更多文本

{{ref:fragment-3}}`

    const references = parser.parseReferences(content)

    expect(references).toHaveLength(3)
    expect(references[0].fragmentId).toBe('fragment-1')
    expect(references[1].fragmentId).toBe('fragment-2')
    expect(references[2].fragmentId).toBe('fragment-3')
  })

  it('应该按位置排序引用', () => {
    const content = `{{ref:fragment-3}}{{ref:fragment-1}}{{ref:fragment-2}}`

    const references = parser.parseReferences(content)

    expect(references).toHaveLength(3)
    expect(references[0].fragmentId).toBe('fragment-3')
    expect(references[1].fragmentId).toBe('fragment-1')
    expect(references[2].fragmentId).toBe('fragment-2')
  })
})
