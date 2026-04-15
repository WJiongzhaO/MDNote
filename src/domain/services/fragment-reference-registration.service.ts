import { injectable, inject } from 'inversify'
import { TYPES } from '../../core/container/container.types'
import type { DocumentRepository } from '../repositories/document.repository.interface'
import type { KnowledgeFragmentRepository } from '../repositories/knowledge-fragment.repository.interface'
import { FragmentReferenceParser } from './fragment-reference-parser.service'
import { FragmentReferenceCounterService } from '../../application/services/fragment-reference-counter.service'

/**
 * 引用注册服务
 * 负责注册和管理文档对知识片段的引用关系
 */
@injectable()
export class FragmentReferenceRegistrationService {
  private readonly parser: FragmentReferenceParser
  private counterService: FragmentReferenceCounterService | null = null

  constructor(
    @inject(TYPES.DocumentRepository)
    private readonly documentRepository: DocumentRepository,
    @inject(TYPES.KnowledgeFragmentRepository)
    private readonly fragmentRepository: KnowledgeFragmentRepository,
  ) {
    this.parser = new FragmentReferenceParser()
  }

  /**
   * 设置引用计数服务
   */
  setCounterService(service: FragmentReferenceCounterService): void {
    this.counterService = service
  }

  /**
   * 注册引用（文档引用片段）
   * 在文档中添加引用信息，在片段中添加反向引用
   */
  async registerReference(
    documentId: string,
    fragmentId: string,
    position: number,
    length: number,
  ): Promise<void> {
    console.log('[FragmentReferenceRegistrationService] registerReference 开始:', {
      documentId,
      fragmentId,
      position,
      length,
    })

    // 获取文档
    const document = await this.documentRepository.findById({ value: documentId })
    if (!document) {
      console.error('[FragmentReferenceRegistrationService] Document not found:', documentId)
      throw new Error(`Document ${documentId} not found`)
    }
    console.log('[FragmentReferenceRegistrationService] 找到文档:', document.getTitle().value)

    // 获取知识片段
    const fragment = await this.fragmentRepository.findById({ value: fragmentId })
    if (!fragment) {
      console.error('[FragmentReferenceRegistrationService] Fragment not found:', fragmentId)
      throw new Error(`Fragment ${fragmentId} not found`)
    }
    console.log('[FragmentReferenceRegistrationService] 找到片段:', fragment.getTitle().value)

    // 在文档中添加引用信息
    document.addFragmentReference(fragmentId, fragment.getTitle().value, position, length)
    console.log('[FragmentReferenceRegistrationService] 已在文档中添加引用信息')

    // 在片段中添加反向引用
    fragment.addReferencedDocument(documentId, document.getTitle().value)
    console.log(
      '[FragmentReferenceRegistrationService] 已在片段中添加反向引用，fragmentId:',
      fragmentId,
      '引用数:',
      fragment.getReferencedDocuments().length,
    )

    // 同步更新引用计数
    if (this.counterService) {
      await this.counterService.increment(documentId, fragmentId, document.getTitle().value)
    }

    // 保存
    console.log('[FragmentReferenceRegistrationService] 开始保存文档...')
    await this.documentRepository.save(document)
    console.log('[FragmentReferenceRegistrationService] 文档保存成功')

    console.log('[FragmentReferenceRegistrationService] 开始保存片段, fragmentId:', fragmentId)
    await this.fragmentRepository.save(fragment)
    console.log(
      '[FragmentReferenceRegistrationService] 片段保存成功，当前引用数:',
      fragment.getReferencedDocuments().length,
    )
  }

  /**
   * 注册外部文件引用（外部文件引用片段）
   * 在知识片段中添加反向引用，外部文件信息存储在缓存中
   */
  async registerExternalFileReference(
    fileDocumentId: string, // 格式：file:/path/to/file.md
    fileName: string,
    fragmentId: string,
    position: number,
    length: number,
  ): Promise<void> {
    console.log('[FragmentReferenceRegistrationService] registerExternalFileReference 开始:', {
      fileDocumentId,
      fileName,
      fragmentId,
      position,
      length,
    })

    // 获取知识片段
    const fragment = await this.fragmentRepository.findById({ value: fragmentId })
    if (!fragment) {
      console.error('[FragmentReferenceRegistrationService] Fragment not found:', fragmentId)
      throw new Error(`Fragment ${fragmentId} not found`)
    }
    console.log('[FragmentReferenceRegistrationService] 找到片段:', fragment.getTitle().value)

    // 在片段中添加反向引用（使用 file: 前缀标识外部文件）
    fragment.addReferencedDocument(fileDocumentId, fileName)
    const refs = fragment.getReferencedDocuments()
    const totalCount = refs.reduce((sum, r) => sum + ((r as any).referenceCount || 1), 0)
    console.log(
      '[FragmentReferenceRegistrationService] 已在片段中添加反向引用，引用文档数:',
      refs.length,
      '总引用次数:',
      totalCount,
    )

    // 同步更新引用计数
    if (this.counterService) {
      await this.counterService.increment(fileDocumentId, fragmentId, fileName)
    }

    // 保存片段
    console.log('[FragmentReferenceRegistrationService] 开始保存片段, fragmentId:', fragmentId)
    await this.fragmentRepository.save(fragment)
    const savedRefs = fragment.getReferencedDocuments()
    const savedTotal = savedRefs.reduce((sum, r) => sum + ((r as any).referenceCount || 1), 0)
    console.log(
      '[FragmentReferenceRegistrationService] 片段保存成功，引用文档数:',
      savedRefs.length,
      '总引用次数:',
      savedTotal,
    )
  }

  /**
   * 取消注册引用
   * 支持数据库文档和外部文件（file:前缀）
   */
  async unregisterReference(documentId: string, fragmentId: string): Promise<void> {
    // 获取文档标题（在引用减少时需要）
    let documentTitle = '未知文档'
    const isExternalFile = documentId.startsWith('file:')

    if (!isExternalFile) {
      const document = await this.documentRepository.findById({ value: documentId })
      if (document) {
        documentTitle = document.getTitle().value
      }
    } else {
      documentTitle = documentId.replace('file:', '').split(/[/\\]/).pop() || '外部文件'
    }

    // 更新引用计数 - 先计算实际引用次数再减少
    if (this.counterService) {
      // 获取该文件的 fileCache 统计实际引用次数
      let actualCount = 1
      if (isExternalFile) {
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.file?.getFileCache) {
          const filePath = documentId.substring(5)
          try {
            const cache = await electronAPI.file.getFileCache(filePath)
            if (cache?.references) {
              actualCount = cache.references.filter(
                (r: any) => r.fragmentId === fragmentId && r.isConnected,
              ).length
            }
          } catch (e) {
            console.warn('[FragmentReferenceRegistrationService] Error getting cache:', e)
          }
        }
      }
      // 减少引用计数（一次性减少实际次数）
      for (let i = 0; i < actualCount; i++) {
        await this.counterService.decrement(documentId, fragmentId)
      }
    }

    // 数据库文档处理
    if (!isExternalFile) {
      const document = await this.documentRepository.findById({ value: documentId })
      if (document) {
        document.removeFragmentReference(fragmentId)
        await this.documentRepository.save(document)
      }
    } else {
      // 外部文件：更新 fileCache
      await this.unregisterExternalFileReference(documentId, fragmentId)
    }

    // 片段处理
    const fragment = await this.fragmentRepository.findById({ value: fragmentId })
    if (fragment) {
      // 减少引用次数（基于实际引用次数）
      let actualCount = 1
      const electronAPI = (window as any).electronAPI
      if (isExternalFile && electronAPI?.file?.getFileCache) {
        const filePath = documentId.substring(5)
        try {
          const cache = await electronAPI.file.getFileCache(filePath)
          if (cache?.references) {
            actualCount = cache.references.filter(
              (r: any) => r.fragmentId === fragmentId && r.isConnected,
            ).length
          }
        } catch (e) {}
      }

      // 逐次减少引用
      for (let i = 0; i < actualCount; i++) {
        fragment.removeReferencedDocument(documentId)
      }
      await this.fragmentRepository.save(fragment)
    }
  }

  /**
   * 取消注册外部文件引用
   * 从 fileCache 中删除该片段的引用记录
   */
  private async unregisterExternalFileReference(
    fileDocumentId: string,
    fragmentId: string,
  ): Promise<void> {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI || !electronAPI.file || !electronAPI.file.getFileCache) {
      return
    }

    const filePath = fileDocumentId.substring(5)
    try {
      const cache = await electronAPI.file.getFileCache(filePath)
      if (cache && cache.references && Array.isArray(cache.references)) {
        // 检查该片段是否还有引用
        const remainingRefs = cache.references.filter(
          (r: any) => r.fragmentId === fragmentId && r.isConnected,
        )

        if (remainingRefs.length === 0) {
          // 没有引用了，从 fileCache 中删除该片段的引用记录
          cache.references = cache.references.filter((r: any) => r.fragmentId !== fragmentId)
          await electronAPI.file.saveFileCache(filePath, cache)
        }
      }
    } catch (error) {
      console.error('[FragmentReferenceRegistrationService] Error updating file cache:', error)
    }
  }

  /**
   * 断开引用连接
   */
  async disconnectReference(
    documentId: string,
    fragmentId: string,
    originalContent: string,
  ): Promise<void> {
    const document = await this.documentRepository.findById({ value: documentId })
    if (document) {
      document.disconnectFragmentReference(fragmentId, originalContent)
      await this.documentRepository.save(document)
    }

    const fragment = await this.fragmentRepository.findById({ value: fragmentId })
    if (fragment) {
      fragment.disconnectReference(documentId)
      await this.fragmentRepository.save(fragment)
    }
  }

  /**
   * 重新连接引用
   */
  async reconnectReference(documentId: string, fragmentId: string): Promise<void> {
    const document = await this.documentRepository.findById({ value: documentId })
    if (document) {
      document.reconnectFragmentReference(fragmentId)
      await this.documentRepository.save(document)
    }

    const fragment = await this.fragmentRepository.findById({ value: fragmentId })
    if (fragment) {
      fragment.connectReference(documentId)
      await this.fragmentRepository.save(fragment)
    }
  }

  /**
   * 从文档内容中解析并注册所有引用
   */
  async registerReferencesFromContent(documentId: string, content: string): Promise<void> {
    const references = this.parser.parseReferences(content)

    for (const ref of references) {
      await this.registerReference(
        documentId,
        ref.fragmentId,
        ref.startIndex,
        ref.endIndex - ref.startIndex,
      )
    }
  }
}
