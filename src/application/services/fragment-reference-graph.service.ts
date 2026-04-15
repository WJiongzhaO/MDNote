import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface'
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface'
import type { FragmentReferenceRecord } from '../../domain/types/fragment-reference.types'

export class FragmentReferenceGraphService {
  private readonly FILE_NAME = 'fragment-references.json'

  constructor(
    private fragmentRepository: KnowledgeFragmentRepository,
    private documentRepository: DocumentRepository,
  ) {}

  // 检查 document 是否在数据中
  private getDocumentId(prefix: string | null | undefined): string {
    return prefix || 'default'
  }

  // 获取所有引用关系
  async getAllReferences(vaultId: string): Promise<Map<string, FragmentReferenceRecord[]>> {
    const referencesMap = new Map<string, FragmentReferenceRecord[]>()

    try {
      const fragments = await this.fragmentRepository.findAll()
      for (const fragment of fragments) {
        const refRecords: FragmentReferenceRecord[] = fragment
          .getReferencedDocuments()
          .map((ref) => ({
            documentId: ref.documentId,
            documentTitle: ref.documentTitle,
            referencedAt: ref.referencedAt.toISOString(),
            isConnected: ref.isConnected,
          }))
        referencesMap.set(fragment.getId().value, refRecords)
      }
    } catch (error) {
      console.error('[FragmentReferenceGraphService] Error loading references:', error)
    }

    return referencesMap
  }

  // 获取特定片段的引用数
  async getReferenceCount(fragmentId: string): Promise<number> {
    try {
      const fragment = await this.fragmentRepository.findById({ value: fragmentId })
      if (!fragment) return 0
      return fragment.getReferencedDocuments().length
    } catch {
      return 0
    }
  }

  // 获取引用某个文档的所有片段
  async getFragmentsReferencingDocument(documentId: string): Promise<string[]> {
    const fragments: string[] = []

    try {
      const allFragments = await this.fragmentRepository.findAll()
      for (const fragment of allFragments) {
        const refs = fragment.getReferencedDocuments()
        if (refs.some((ref) => ref.documentId === documentId)) {
          fragments.push(fragment.getId().value)
        }
      }
    } catch (error) {
      console.error('[FragmentReferenceGraphService] Error finding fragments:', error)
    }

    return fragments
  }

  // 重建引用图（从文档端统计实际引用次数）
  // 这是更完备的策略：从文档中的引用记录统计每个片段被引用的次数
  // 支持两种引用来源：1) 数据库文档 2) 外部文件（fileCache）
  async syncReferences(vaultId: string): Promise<void> {
    console.log(
      '[FragmentReferenceGraphService] Syncing references from documents for vaultId:',
      vaultId,
    )

    try {
      // 获取所有文档
      const documents = await this.documentRepository.findAll()
      const allFragments = await this.fragmentRepository.findAll()

      // 构建文档ID到文档标题的映射
      const docTitleMap = new Map<string, string>()
      for (const doc of documents) {
        docTitleMap.set(doc.getId().value, doc.getTitle().value)
      }

      // 统计每个片段被每个文档引用的次数
      const fragmentRefCount = new Map<string, Map<string, number>>()

      // 1. 处理数据库文档引用
      for (const doc of documents) {
        const docId = doc.getId().value
        const docTitle = doc.getTitle().value
        const docRefs = doc.getFragmentReferences()

        // 统计该文档中每个片段的引用次数
        const fragmentCountInDoc = new Map<string, number>()
        for (const ref of docRefs) {
          const count = (fragmentCountInDoc.get(ref.fragmentId) || 0) + 1
          fragmentCountInDoc.set(ref.fragmentId, count)
        }

        // 合并到总统计
        for (const [fragId, count] of fragmentCountInDoc) {
          const existing = fragmentRefCount.get(fragId) || new Map<string, number>()
          existing.set(docId, (existing.get(docId) || 0) + count)
          fragmentRefCount.set(fragId, existing)
        }
      }

      // 2. 处理外部文件引用（从 fileCache 中读取）
      await this.syncExternalFileReferences(fragmentRefCount)

      // 更新片段的引用数据
      let totalUpdated = 0

      for (const fragment of allFragments) {
        const fragId = fragment.getId().value
        const refCounts = fragmentRefCount.get(fragId)

        if (!refCounts || refCounts.size === 0) {
          // 没有引用，清空引用
          if (fragment.getReferencedDocuments().length > 0) {
            // 清空所有引用
            ;(fragment as any).referencedDocuments = []
            await this.fragmentRepository.save(fragment)
            totalUpdated++
          }
        } else {
          // 更新引用数据
          const newRefs: any[] = []

          for (const [docId, count] of refCounts) {
            // 判断是数据库文档还是外部文件
            const isExternalFile = docId.startsWith('file:')
            newRefs.push({
              documentId: docId,
              documentTitle: isExternalFile
                ? docId.replace('file:', '').split(/[/\\]/).pop() || '外部文件'
                : docTitleMap.get(docId) || '未知文档',
              referencedAt: new Date(),
              isConnected: true,
              referenceCount: count,
            })
          }

          // 更新片段的引用
          ;(fragment as any).referencedDocuments = newRefs
          await this.fragmentRepository.save(fragment)
          totalUpdated++
        }
      }

      console.log('[FragmentReferenceGraphService] Sync completed, updated:', totalUpdated)
    } catch (error) {
      console.error('[FragmentReferenceGraphService] Sync error:', error)
    }
  }

  // 从外部文件的 fileCache 中同步引用信息
  private async syncExternalFileReferences(
    fragmentRefCount: Map<string, Map<string, number>>,
  ): Promise<void> {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI || !electronAPI.file || !electronAPI.file.getFileCache) {
      console.log('[FragmentReferenceGraphService] No electron API for external files')
      return
    }

    try {
      // 获取当前知识库管理的外部文件列表
      // 外部文件通过 file: 前缀标识
      const allFragments = await this.fragmentRepository.findAll()

      // 收集所有外部文件引用（从片段的 referencedDocuments 中）
      const externalFileRefs = new Map<string, { title: string; count: number }>()

      // 遍历所有片段，找出所有外部文件引用
      for (const fragment of allFragments) {
        const refs = fragment.getReferencedDocuments()
        for (const ref of refs) {
          if (ref.documentId.startsWith('file:')) {
            const filePath = ref.documentId.substring(5) // 移除 'file:' 前缀
            // 只记录文件路径（去重），稍后从缓存读取实际引用
            if (!externalFileRefs.has(filePath)) {
              const fileName = filePath.split(/[/\\]/).pop() || '外部文件'
              externalFileRefs.set(filePath, { title: fileName, count: 0 })
            }
          }
        }
      }

      console.log(
        '[FragmentReferenceGraphService] Found external files:',
        Array.from(externalFileRefs.keys()),
      )

      // 从每个外部文件的缓存中读取引用统计
      for (const [filePath, fileInfo] of externalFileRefs) {
        try {
          const cache = await electronAPI.file.getFileCache(filePath)
          console.log('[FragmentReferenceGraphService] Cache for', filePath, ':', cache)
          if (cache && cache.references && Array.isArray(cache.references)) {
            // 统计该文件中每个片段的引用次数
            const fragmentCountInFile = new Map<string, number>()
            for (const ref of cache.references) {
              if (ref.fragmentId) {
                const count = (fragmentCountInFile.get(ref.fragmentId) || 0) + 1
                fragmentCountInFile.set(ref.fragmentId, count)
              }
            }

            // 合并到总统计（使用 file: 前缀作为文档ID）
            const docId = `file:${filePath}`
            for (const [fragId, count] of fragmentCountInFile) {
              const existing = fragmentRefCount.get(fragId) || new Map<string, number>()
              existing.set(docId, (existing.get(docId) || 0) + count)
              fragmentRefCount.set(fragId, existing)
              // 更新文件标题
              fileInfo.count = (fileInfo.count || 0) + count
            }

            console.log(
              '[FragmentReferenceGraphService] Fragment counts in',
              filePath,
              ':',
              Array.from(fragmentCountInFile.entries()),
            )
          }
        } catch (cacheError) {
          console.warn(
            '[FragmentReferenceGraphService] Error reading cache for:',
            filePath,
            cacheError,
          )
        }
      }

      console.log(
        '[FragmentReferenceGraphService] External file references synced, unique files:',
        externalFileRefs.size,
      )
    } catch (error) {
      console.error(
        '[FragmentReferenceGraphService] Error syncing external file references:',
        error,
      )
    }
  }

  // 重建引用图（重新扫描所有文档和片段）
  async rebuildReferenceGraph(vaultId: string): Promise<void> {
    console.log('[FragmentReferenceGraphService] Rebuilding reference graph...')

    try {
      const allFragments = await this.fragmentRepository.findAll()
      const documents = await this.documentRepository.findAll()

      // 对每个片段，清理并重建引用
      for (const fragment of allFragments) {
        const currentRefs = fragment.getReferencedDocuments()

        // 验证每个引用的有效性
        for (const ref of currentRefs) {
          if (ref.documentId.startsWith('file:')) {
            ref.isConnected = true
            ref.referencedAt = new Date()
          } else {
            const docExists = documents.some((doc) => doc.getId().value === ref.documentId)
            ref.isConnected = docExists
            if (docExists) {
              ref.referencedAt = new Date()
            }
          }
        }

        await this.fragmentRepository.save(fragment)
      }

      console.log('[FragmentReferenceGraphService] Reference graph rebuilt')
    } catch (error) {
      console.error('[FragmentReferenceGraphService] Rebuild error:', error)
    }
  }
}
