import { ref, onMounted, watch } from 'vue'
import { Application } from '../../core/application'
import type {
  KnowledgeFragmentResponse,
  CreateKnowledgeFragmentRequest,
  UpdateKnowledgeFragmentRequest,
} from '../../application/dto/knowledge-fragment.dto'

/**
 * 知识片段组合式函数
 * @param vaultId 可选的知识库ID，默认为 'default'
 */
export function useKnowledgeFragments(vaultId: string = 'default') {
  const fragments = ref<KnowledgeFragmentResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const fragmentUseCases = ref<
    ReturnType<typeof Application.getInstance>['getKnowledgeFragmentUseCases'] | null
  >(null)
  const currentVaultId = ref(vaultId)

  // 异步获取fragmentUseCases
  const application = Application.getInstance()
  const initFragmentUseCases = async (vid: string) => {
    try {
      // 确保应用服务已初始化，传入当前 vaultId
      await application.getApplicationService().initialize(vid)
      fragmentUseCases.value = application.getKnowledgeFragmentUseCases()
    } catch (err) {
      console.error('Error initializing fragment use cases:', err)
      error.value = err instanceof Error ? err.message : '初始化知识片段用例失败'
    }
  }

  // 监听 vaultId 变化
  watch(
    () => currentVaultId.value,
    async (newVaultId, oldVaultId) => {
      if (newVaultId !== oldVaultId) {
        console.log(`[useKnowledgeFragments] vaultId changed from ${oldVaultId} to ${newVaultId}`)
        await initFragmentUseCases(newVaultId)
        await loadFragments()
      }
    },
  )

  /**
   * 加载所有知识片段
   */
  const loadFragments = async () => {
    if (!fragmentUseCases.value) {
      await initFragmentUseCases(currentVaultId.value)
    }
    if (!fragmentUseCases.value) {
      error.value = '知识片段用例未初始化'
      return
    }
    try {
      isLoading.value = true
      error.value = null
      fragments.value = await fragmentUseCases.value.getAllFragments()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载知识片段失败'
      console.error('Error loading fragments:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 创建知识片段
   */
  const createFragment = async (request: CreateKnowledgeFragmentRequest) => {
    if (!fragmentUseCases.value) {
      await initFragmentUseCases(currentVaultId.value)
    }
    if (!fragmentUseCases.value) {
      throw new Error('知识片段用例未初始化')
    }
    try {
      error.value = null
      const newFragment = await fragmentUseCases.value.createFragment(request)
      await loadFragments()
      return newFragment
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建知识片段失败'
      console.error('Error creating fragment:', err)
      throw err
    }
  }

  /**
   * 更新知识片段
   */
  const updateFragment = async (id: string, request: UpdateKnowledgeFragmentRequest) => {
    if (!fragmentUseCases.value) {
      await initFragmentUseCases(currentVaultId.value)
    }
    if (!fragmentUseCases.value) {
      throw new Error('知识片段用例未初始化')
    }
    try {
      error.value = null
      const updatedFragment = await fragmentUseCases.value.updateFragment(id, request)
      await loadFragments()
      return updatedFragment
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新知识片段失败'
      console.error('Error updating fragment:', err)
      throw err
    }
  }

  /**
   * 删除知识片段
   */
  const deleteFragment = async (id: string) => {
    if (!fragmentUseCases.value) {
      await initFragmentUseCases(currentVaultId.value)
    }
    if (!fragmentUseCases.value) {
      throw new Error('知识片段用例未初始化')
    }
    try {
      error.value = null
      await fragmentUseCases.value.deleteFragment(id)
      await loadFragments()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除知识片段失败'
      console.error('Error deleting fragment:', err)
      throw err
    }
  }

  /**
   * 根据标签查找知识片段
   */
  const getFragmentsByTag = async (tag: string) => {
    if (!fragmentUseCases.value) {
      await initFragmentUseCases(currentVaultId.value)
    }
    if (!fragmentUseCases.value) {
      error.value = '知识片段用例未初始化'
      return
    }
    try {
      isLoading.value = true
      error.value = null
      fragments.value = await fragmentUseCases.value.getFragmentsByTag(tag)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '查找知识片段失败'
      console.error('Error getting fragments by tag:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 搜索知识片段
   */
  const searchFragments = async (query: string) => {
    if (!fragmentUseCases.value) {
      await initFragmentUseCases(currentVaultId.value)
    }
    if (!fragmentUseCases.value) {
      error.value = '知识片段用例未初始化'
      return
    }
    try {
      isLoading.value = true
      error.value = null
      fragments.value = await fragmentUseCases.value.searchFragments(query)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '搜索知识片段失败'
      console.error('Error searching fragments:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取知识片段
   */
  const getFragment = async (id: string) => {
    if (!fragmentUseCases.value) {
      await initFragmentUseCases(currentVaultId.value)
    }
    if (!fragmentUseCases.value) {
      throw new Error('知识片段用例未初始化')
    }
    try {
      error.value = null
      return await fragmentUseCases.value.getFragment(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取知识片段失败'
      console.error('Error getting fragment:', err)
      throw err
    }
  }

  /**
   * 将知识片段插入到文档
   * 会复制图片到目标文档的assets目录，并重命名（添加hash）
   */
  const insertFragmentToDocument = async (
    fragmentId: string,
    documentId: string,
  ): Promise<string> => {
    if (!fragmentUseCases.value) {
      await initFragmentUseCases(currentVaultId.value)
    }
    if (!fragmentUseCases.value) {
      throw new Error('知识片段用例未初始化')
    }
    try {
      error.value = null
      return await fragmentUseCases.value.insertFragmentToDocument(fragmentId, documentId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '插入知识片段失败'
      console.error('Error inserting fragment:', err)
      throw err
    }
  }

  onMounted(async () => {
    await initFragmentUseCases(currentVaultId.value)
    if (fragmentUseCases.value) {
      await loadFragments()
    }
  })

  return {
    fragments,
    isLoading,
    error,
    loadFragments,
    createFragment,
    updateFragment,
    deleteFragment,
    getFragmentsByTag,
    searchFragments,
    getFragment,
    insertFragmentToDocument,
  }
}
