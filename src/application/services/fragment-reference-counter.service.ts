/**
 * 引用计数记录
 */
export interface ReferenceCountRecord {
  fragmentId: string
  references: Array<{
    documentId: string
    documentTitle: string
    count: number // 该文档引用该片段的次数
    referencedAt: string // ISO时间
  }>
  totalCount: number // 总引用次数
  updatedAt: string // 最后更新时间
}

/**
 * 引用计数存储服务
 * 独立管理所有知识片段的引用计数，支持数据库文档和外部文件
 */
export class FragmentReferenceCounterService {
  private readonly counterFileName = 'fragment-reference-counts.json'
  private counters: Map<string, ReferenceCountRecord> = new Map()
  private vaultId: string = ''
  private initialized: boolean = false

  constructor(vaultId: string = '') {
    this.vaultId = vaultId
  }

  /**
   * 初始化：加载已有的引用计数数据
   */
  async initialize(vaultId: string): Promise<void> {
    this.vaultId = vaultId
    await this.loadFromStorage()
    this.initialized = true
  }

  /**
   * 从存储加载数据
   */
  private async loadFromStorage(): Promise<void> {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI || !electronAPI.file || !electronAPI.file.getFileCache) {
      console.log('[FragmentReferenceCounter] No electron API')
      return
    }

    try {
      // 使用固定的缓存文件名来存储引用计数
      const cacheKey = `.mdnote-fragments-${this.vaultId}/reference-counts.json`
      const cache = await electronAPI.file.getFileCache(cacheKey)
      if (cache && cache.counters) {
        this.counters = new Map(Object.entries(cache.counters))
        console.log('[FragmentReferenceCounter] Loaded counters:', this.counters.size)
      }
    } catch (error) {
      console.error('[FragmentReferenceCounter] Error loading counters:', error)
    }
  }

  /**
   * 保存数据到存储
   */
  private async saveToStorage(): Promise<void> {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI || !electronAPI.file || !electronAPI.file.saveFileCache) {
      console.log('[FragmentReferenceCounter] No electron API for saving')
      return
    }

    try {
      const cacheKey = `.mdnote-fragments-${this.vaultId}/reference-counts.json`
      const cache = {
        counters: Object.fromEntries(this.counters),
        updatedAt: new Date().toISOString(),
      }
      await electronAPI.file.saveFileCache(cacheKey, cache)
      console.log('[FragmentReferenceCounter] Saved counters:', this.counters.size)
    } catch (error) {
      console.error('[FragmentReferenceCounter] Error saving counters:', error)
    }
  }

  /**
   * 增加引用计数
   * @param documentId 文档ID（数据库文档ID或外部文件路径如 file:/path/to/file.md）
   * @param fragmentId 片段ID
   * @param documentTitle 文档标题
   */
  async increment(documentId: string, fragmentId: string, documentTitle: string): Promise<void> {
    let record = this.counters.get(fragmentId)
    if (!record) {
      record = {
        fragmentId,
        references: [],
        totalCount: 0,
        updatedAt: new Date().toISOString(),
      }
      this.counters.set(fragmentId, record)
    }

    // 查找是否已有该文档的引用
    const existingRef = record.references.find((r) => r.documentId === documentId)
    if (existingRef) {
      existingRef.count += 1
      existingRef.referencedAt = new Date().toISOString()
    } else {
      record.references.push({
        documentId,
        documentTitle,
        count: 1,
        referencedAt: new Date().toISOString(),
      })
    }

    record.totalCount = record.references.reduce((sum, r) => sum + r.count, 0)
    record.updatedAt = new Date().toISOString()
    console.log(
      '[FragmentReferenceCounter] Incremented:',
      fragmentId,
      'by',
      documentId,
      'total:',
      record.totalCount,
    )
  }

  /**
   * 减少引用计数
   * @param documentId 文档ID
   * @param fragmentId 片段ID
   */
  async decrement(documentId: string, fragmentId: string): Promise<void> {
    const record = this.counters.get(fragmentId)
    if (!record) {
      console.log('[FragmentReferenceCounter] No record found for decrement:', fragmentId)
      return
    }

    const refIndex = record.references.findIndex((r) => r.documentId === documentId)
    if (refIndex === -1) {
      console.log('[FragmentReferenceCounter] No reference found for decrement:', documentId)
      return
    }

    const ref = record.references[refIndex]
    if (ref && ref.count > 1) {
      ref.count -= 1
      ref.referencedAt = new Date().toISOString()
    } else if (ref) {
      // 引用次数为0，移除该引用
      record.references.splice(refIndex, 1)
    }

    record.totalCount = record.references.reduce((sum, r) => sum + r.count, 0)
    record.updatedAt = new Date().toISOString()

    // 如果没有引用了，保留记录但totalCount为0（便于追踪）
    await this.saveToStorage()
    console.log(
      '[FragmentReferenceCounter] Decremented:',
      fragmentId,
      'by',
      documentId,
      'total:',
      record.totalCount,
    )
  }

  /**
   * 获取引用次数
   */
  getCount(fragmentId: string): number {
    const record = this.counters.get(fragmentId)
    return record?.totalCount || 0
  }

  /**
   * 获取引用列表
   */
  getReferences(fragmentId: string): Array<{
    documentId: string
    documentTitle: string
    referenceCount: number
    referencedAt: string
  }> {
    const record = this.counters.get(fragmentId)
    if (!record) return []

    return record.references.map((r) => ({
      documentId: r.documentId,
      documentTitle: r.documentTitle,
      referenceCount: r.count,
      referencedAt: r.referencedAt,
    }))
  }

  /**
   * 获取所有片段的引用计数
   */
  getAllCounters(): Map<string, ReferenceCountRecord> {
    return new Map(this.counters)
  }

  /**
   * 重建引用计数
   * 从数据库文档和外部文件的 fileCache 中重新统计所有引用
   */
  async rebuild(documentRepository: any, fragmentRepository: any): Promise<void> {
    console.log('[FragmentReferenceCounter] Starting rebuild, vaultId:', this.vaultId)

    // 清空现有计数
    this.counters.clear()

    const electronAPI = (window as any).electronAPI

    // 1. 统计数据库文档引用
    try {
      const documents = await documentRepository.findAll()
      console.log('[FragmentReferenceCounter] Found documents:', documents.length)
      for (const doc of documents) {
        const docId = doc.getId().value
        const docTitle = doc.getTitle().value
        const docRefs = doc.getFragmentReferences()

        // 统计每个片段的引用次数
        const fragmentCounts = new Map<string, number>()
        for (const ref of docRefs) {
          const count = (fragmentCounts.get(ref.fragmentId) || 0) + 1
          fragmentCounts.set(ref.fragmentId, count)
        }

        // 更新计数
        for (const [fragId, count] of fragmentCounts) {
          // 直接设置计数，而不是累加
          this.setCount(docId, fragId, docTitle, count)
        }
      }
      console.log('[FragmentReferenceCounter] Database documents processed')
    } catch (error) {
      console.error('[FragmentReferenceCounter] Error processing documents:', error)
    }

    // 2. 统计外部文件引用（直接读取文件内容解析 {{ref:xxx}}）
    try {
      const fragments = await fragmentRepository.findAll()
      const externalFiles = new Set<string>()

      // 收集所有外部文件
      for (const fragment of fragments) {
        const refs = fragment.getReferencedDocuments()
        for (const ref of refs) {
          if (ref.documentId.startsWith('file:')) {
            externalFiles.add(ref.documentId.substring(5))
          }
        }
      }

      // 直接读取文件内容解析引用
      if (electronAPI && electronAPI.file && electronAPI.file.readFileContent) {
        for (const filePath of externalFiles) {
          try {
            const content = await electronAPI.file.readFileContent(filePath)
            if (content) {
              // 解析内容中的 {{ref:xxx}} 或 {{ref:xxx:linked}}
              const refMatches = content.match(
                /\{\{ref:([a-zA-Z0-9-]+)(?::(linked|detached|connected|disconnected))?\}\}/g,
              )
              if (refMatches) {
                // 统计每个片段的引用次数
                const fragmentCounts = new Map<string, number>()
                for (const match of refMatches) {
                  const fragIdMatch = match.match(/\{\{ref:([a-zA-Z0-9-]+)/)
                  if (fragIdMatch) {
                    const fragId = fragIdMatch[1]
                    fragmentCounts.set(fragId, (fragmentCounts.get(fragId) || 0) + 1)
                  }
                }

                const fileName = filePath.split(/[/\\]/).pop() || '外部文件'
                const fileDocId = `file:${filePath}`

                // 添加引用计数
                for (const [fragId, count] of fragmentCounts) {
                  console.log(
                    '[FragmentReferenceCounter] File content:',
                    filePath,
                    'fragmentId:',
                    fragId,
                    'count:',
                    count,
                  )
                  this.addCount(fileDocId, fragId, fileName, count)
                }
              }
            }
          } catch (readError) {
            console.warn('[FragmentReferenceCounter] Error reading file:', filePath, readError)
          }
        }
      }
      console.log(
        '[FragmentReferenceCounter] External files processed, unique files:',
        externalFiles.size,
      )
    } catch (error) {
      console.error('[FragmentReferenceCounter] Error processing external files:', error)
    }

    await this.saveToStorage()
    console.log(
      '[FragmentReferenceCounter] Rebuild completed, total fragments:',
      this.counters.size,
    )
  }

  /**
   * 设置某个文档对某个片段的引用计数（覆盖）
   */
  private setCount(
    documentId: string,
    fragmentId: string,
    documentTitle: string,
    count: number,
  ): void {
    let record = this.counters.get(fragmentId)
    if (!record) {
      record = {
        fragmentId,
        references: [],
        totalCount: 0,
        updatedAt: new Date().toISOString(),
      }
      this.counters.set(fragmentId, record)
    }

    const existingRef = record.references.find((r) => r.documentId === documentId)
    if (existingRef) {
      existingRef.count = count
      existingRef.referencedAt = new Date().toISOString()
    } else {
      record.references.push({
        documentId,
        documentTitle,
        count,
        referencedAt: new Date().toISOString(),
      })
    }

    record.totalCount = record.references.reduce((sum, r) => sum + r.count, 0)
    record.updatedAt = new Date().toISOString()
  }

  /**
   * 累加某个文档对某个片段的引用计数
   */
  private addCount(
    documentId: string,
    fragmentId: string,
    documentTitle: string,
    countToAdd: number,
  ): void {
    let record = this.counters.get(fragmentId)
    if (!record) {
      record = {
        fragmentId,
        references: [],
        totalCount: 0,
        updatedAt: new Date().toISOString(),
      }
      this.counters.set(fragmentId, record)
    }

    const existingRef = record.references.find((r) => r.documentId === documentId)
    if (existingRef) {
      existingRef.count += countToAdd
      existingRef.referencedAt = new Date().toISOString()
    } else {
      record.references.push({
        documentId,
        documentTitle,
        count: countToAdd,
        referencedAt: new Date().toISOString(),
      })
    }

    record.totalCount = record.references.reduce((sum, r) => sum + r.count, 0)
    record.updatedAt = new Date().toISOString()
  }

  /**
   * 清除某个片段的计数
   */
  async clear(fragmentId: string): Promise<void> {
    this.counters.delete(fragmentId)
    await this.saveToStorage()
  }

  /**
   * 清除所有计数
   */
  async clearAll(): Promise<void> {
    this.counters.clear()
    await this.saveToStorage()
  }
}
