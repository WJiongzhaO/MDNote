<template>
  <div
    class="knowledge-fragment-sidebar"
    @drop="handleDrop"
    @dragover.prevent
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    :class="{ 'drag-over': isDragging }"
  >
    <div class="sidebar-header">
      <h2>📚 知识片段库</h2>
      <div class="header-actions">
        <button class="btn btn-icon" @click="showCreateDialog = true" title="创建知识片段">
          ➕
        </button>
        <button class="btn btn-icon" @click="refreshFragments" title="刷新">🔄</button>
      </div>
    </div>

    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-message">📎 释放以创建知识片段</div>
    </div>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索知识片段..."
        @input="handleSearch"
        class="search-input"
      />
    </div>

    <div class="tag-filter">
      <div class="tag-list">
        <span
          v-for="tag in allTags"
          :key="tag"
          :class="['tag', { active: selectedTags.includes(tag) }]"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div v-if="isLoading" class="loading">加载中...</div>
    <div v-else-if="filteredFragments.length === 0" class="empty-state">
      <p>暂无知识片段</p>
      <button class="btn btn-primary" @click="showCreateDialog = true">创建第一个知识片段</button>
    </div>
    <div v-else class="fragment-list">
      <div
        v-for="fragment in filteredFragments"
        :key="fragment.id"
        class="fragment-item"
        @click="selectFragment(fragment)"
        @dblclick="editFragment(fragment)"
        @contextmenu.prevent="onFragmentContextMenu($event, fragment)"
        :class="{ active: selectedFragmentId === fragment.id }"
        draggable="true"
        @dragstart="handleFragmentDragStart($event, fragment)"
        @dragend="handleFragmentDragEnd"
      >
        <div class="fragment-header">
          <h3 class="fragment-title">{{ fragment.title }}</h3>
          <div class="fragment-actions">
            <button
              class="btn btn-icon-small"
              @click.stop="insertFragment(fragment)"
              title="插入到文档"
            >
              📎
            </button>
            <button
              class="btn btn-icon-small"
              @click.stop="openDeleteFragmentDialog(fragment)"
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>
        <div class="fragment-tags">
          <span v-for="tag in fragment.tags" :key="tag" class="tag-small">{{ tag }}</span>
        </div>
        <!-- 预览图 -->
        <div v-if="fragment.previewType" class="fragment-preview-image">
          <img
            v-if="
              fragment.previewType === 'image' &&
              fragment.previewImage &&
              previewImageUrl[fragment.id]
            "
            :src="previewImageUrl[fragment.id]"
            :alt="fragment.title"
            @error="handleImageError"
            class="preview-img"
            :data-fragment-id="fragment.id"
            :data-image-path="fragment.previewImage"
          />
          <div
            v-else-if="fragment.previewType === 'image' && fragment.previewImage"
            class="mermaid-placeholder"
          >
            📷 加载中...
          </div>
          <div
            v-else-if="fragment.previewType === 'mermaid' && fragment.previewMermaidCode"
            class="preview-mermaid"
          >
            <div
              v-if="mermaidPreviewSvgs && mermaidPreviewSvgs[fragment.id]"
              class="mermaid-svg-container"
              v-html="mermaidPreviewSvgs[fragment.id]"
              :data-fragment-id="fragment.id"
            ></div>
            <div v-else class="mermaid-placeholder">
              📊 渲染中...
              <div style="font-size: 0.7rem; margin-top: 4px; color: #999">
                片段ID: {{ fragment.id }}
              </div>
            </div>
          </div>
        </div>
        <!-- 只有当没有预览图片或Mermaid图表时才显示完整的Markdown预览 -->
        <div
          v-if="!fragment.previewType"
          class="fragment-preview"
          v-html="fragmentPreviewHtml[fragment.id] || '加载中...'"
        >        </div>
      </div>
    </div>

    <Teleport to="body">
      <ul
        v-if="fragmentContextMenu.show && fragmentContextMenu.fragment"
        class="fragment-context-menu"
        role="menu"
        :style="{ left: fragmentContextMenu.x + 'px', top: fragmentContextMenu.y + 'px' }"
        @mousedown.stop
      >
        <li role="none">
          <button
            type="button"
            class="fragment-context-menu-item"
            role="menuitem"
            @click="confirmOpenFragmentAssetsInFileManager"
          >
            打开片段资源目录（图片等）
          </button>
        </li>
        <li role="none">
          <button
            type="button"
            class="fragment-context-menu-item"
            role="menuitem"
            @click="confirmOpenFragmentsJsonDirInFileManager"
          >
            打开片段库数据目录（JSON）
          </button>
        </li>
      </ul>
    </Teleport>

    <!-- 创建对话框 -->
    <div
      v-if="showCreateDialog"
      class="dialog-overlay"
      @mousedown="handleDialogOverlayMouseDown"
      @click="handleDialogOverlayClick"
    >
      <div class="dialog" @click.stop @mousedown.stop>
        <div class="dialog-header">
          <h3>创建知识片段</h3>
          <button class="btn btn-icon" @click="handleCloseCreateDialog">✕</button>
        </div>
        <div class="dialog-body">
          <input v-model="newFragmentTitle" type="text" placeholder="标题" class="input" />
          <textarea
            v-model="newFragmentContent"
            placeholder="Markdown内容..."
            class="textarea"
            rows="10"
          ></textarea>
          <input
            v-model="newFragmentTags"
            type="text"
            placeholder="标签（用英文逗号,分隔）"
            class="input"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="handleCloseCreateDialog">取消</button>
          <button class="btn btn-primary" @click="handleCreateFragment">创建</button>
        </div>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <div
      v-if="showEditDialog"
      class="dialog-overlay"
      @mousedown="handleDialogOverlayMouseDown"
      @click="handleDialogOverlayClick"
    >
      <div class="dialog" @click.stop @mousedown.stop>
        <div class="dialog-header">
          <h3>编辑知识片段</h3>
          <button class="btn btn-icon" @click="handleCloseEditDialog">✕</button>
        </div>
        <div class="dialog-body">
          <input v-model="editingFragmentTitle" type="text" placeholder="标题" class="input" />
          <textarea
            v-model="editingFragmentContent"
            placeholder="Markdown内容..."
            class="textarea"
            rows="10"
          ></textarea>
          <input
            v-model="editingFragmentTags"
            type="text"
            placeholder="标签（用英文逗号,分隔）"
            class="input"
          />
          <div v-if="editingFragmentId" class="edit-warning">
            ⚠️ 修改将应用到所有引用该片段的文档（已连接的引用）
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="handleCloseEditDialog">取消</button>
          <button class="btn btn-primary" @click="handleUpdateFragment">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除片段确认对话框 -->
    <div
      v-if="showDeleteFragmentDialog"
      class="dialog-overlay"
      @click.self="handleCancelDeleteFragment"
    >
      <div class="dialog dialog-small" @click.stop>
        <div class="dialog-header">
          <h3>确认删除</h3>
          <button class="btn btn-icon" @click="handleCancelDeleteFragment">✕</button>
        </div>
        <div class="dialog-body">
          <p>
            确定要删除知识片段
            <strong v-if="fragmentToDelete">{{ fragmentToDelete.title || '未命名片段' }}</strong>
            吗？
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="handleCancelDeleteFragment">取消</button>
          <button class="btn btn-danger" @click="handleConfirmDeleteFragment">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, inject, type Ref } from 'vue'
import { useFragmentContextMenu } from '../composables/useFragmentContextMenu'
import { useKnowledgeFragments } from '../composables/useKnowledgeFragments'
import { Application } from '../../core/application'
import { NodeType } from '../../domain/types/knowledge-fragment.types'
import {
  TextNode,
  HeadingNode,
  CodeBlockNode,
  ContainerNode,
  ImageNode,
} from '../../domain/entities/ast-nodes'
import type { KnowledgeFragmentResponse } from '../../application/dto/knowledge-fragment.dto'
import { useDocuments } from '../composables/useDocuments'
import { TYPES } from '../../core/container/container.types'
import type { MermaidRenderer } from '../../domain/services/markdown-processor.interface'

interface Props {
  vaultId?: string
  markdownEditorRef?: any
}

const props = defineProps<Props>()

const vaultId = computed(() => props.vaultId ?? 'default')

const emit = defineEmits<{
  'fragment-updated': [fragmentId: string]
  insert: [fragment: KnowledgeFragmentResponse]
}>()

const {
  fragmentContextMenu,
  onFragmentContextMenu,
  confirmOpenFragmentAssetsInFileManager,
  confirmOpenFragmentsJsonDirInFileManager,
} = useFragmentContextMenu({ getVaultId: () => vaultId.value })

// 恢复编辑器焦点（通过父组件）
const restoreEditorFocus = () => {
  // 通过 emit 事件通知父组件恢复编辑器焦点
  // 或者直接查找编辑器元素并恢复焦点
  nextTick(() => {
    // 查找 MarkdownEditor 组件并恢复焦点
    const editorElement = document.querySelector('.markdown-editor-content') as HTMLElement
    if (editorElement) {
      editorElement.focus()
      // 恢复光标位置
      const selection = window.getSelection()
      if (selection && editorElement.textContent) {
        const range = document.createRange()
        const textNode = editorElement.firstChild
        if (textNode) {
          const textLength = textNode.textContent?.length || 0
          range.setStart(textNode, Math.min(textLength, editorElement.textContent.length))
          range.setEnd(textNode, Math.min(textLength, editorElement.textContent.length))
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
      console.log('[KnowledgeFragmentSidebar] 已恢复编辑器焦点')
    } else {
      console.warn('[KnowledgeFragmentSidebar] 未找到编辑器元素')
    }
  })
}

const {
  fragments,
  isLoading,
  loadFragments,
  createFragment,
  updateFragment,
  deleteFragment: deleteFragmentAction,
  searchFragments,
} = useKnowledgeFragments(vaultId)

const { renderMarkdown } = useDocuments()

const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const selectedFragmentId = ref<string | null>(null)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const newFragmentTitle = ref('')
const newFragmentContent = ref('')
const newFragmentTags = ref('')
const editingFragmentId = ref<string | null>(null)
const editingFragmentTitle = ref('')
const editingFragmentContent = ref('')
const editingFragmentTags = ref('')
const isDragging = ref(false)
const fragmentPreviewHtml = ref<Record<string, string>>({})
const draggedFragment = ref<KnowledgeFragmentResponse | null>(null)
const previewImageUrls = ref<Record<string, string>>({})
const previewImageUrl = ref<Record<string, string>>({})
const mermaidPreviewSvgs = ref<Record<string, string>>({})
const showDeleteFragmentDialog = ref(false)
const fragmentToDelete = ref<KnowledgeFragmentResponse | null>(null)

// 依赖注入Mermaid渲染器
const mermaidRenderer = inject<Ref<MermaidRenderer | null>>(TYPES.MermaidRenderer)

// 获取预览图片URL（异步版本，返回Promise）
const getPreviewImageUrl = async (imagePath: string): Promise<string> => {
  console.log('getPreviewImageUrl 调用，路径:', imagePath)

  // 如果已经缓存，直接返回
  if (previewImageUrls.value[imagePath]) {
    console.log('使用缓存的URL:', previewImageUrls.value[imagePath])
    return previewImageUrls.value[imagePath]
  }

  try {
    const electronAPI = (window as any).electronAPI

    // 知识片段图片相对当前知识库数据路径，使用 fragment.getFullPath
    if (imagePath.startsWith('fragments/')) {
      if (electronAPI && electronAPI.fragment && electronAPI.fragment.getFullPath) {
        console.log('调用 electronAPI.fragment.getFullPath，路径:', imagePath)
        const fullPath = await electronAPI.fragment.getFullPath(imagePath)
        console.log('fragment.getFullPath 返回:', fullPath)
        previewImageUrls.value[imagePath] = fullPath
        return fullPath
      } else {
        console.warn('electronAPI.fragment.getFullPath 不可用，尝试使用 file.getFullPath')
      }
    }

    // 其他路径使用 file API（项目路径）
    if (electronAPI && electronAPI.file && electronAPI.file.getFullPath) {
      console.log('调用 electronAPI.file.getFullPath，路径:', imagePath)
      const fullPath = await electronAPI.file.getFullPath(imagePath)
      console.log('getFullPath 返回:', fullPath)

      // 确保返回的是 app:// 协议URL
      if (!fullPath.startsWith('app://') && !fullPath.startsWith('http')) {
        // 如果返回的是绝对路径，需要转换为 app:// 协议
        // 但 getFullPath 应该已经返回 app:// URL了
        console.warn('getFullPath 返回的不是 app:// URL:', fullPath)
      }

      previewImageUrls.value[imagePath] = fullPath
      return fullPath
    } else {
      console.warn('electronAPI.file.getFullPath 不可用，使用原路径')
      previewImageUrls.value[imagePath] = imagePath
      return imagePath
    }
  } catch (error) {
    console.error('Error getting preview image URL:', error, '路径:', imagePath)
    previewImageUrls.value[imagePath] = imagePath
    return imagePath
  }
}

// 加载图片URL
const loadPreviewImageUrl = async (fragment: KnowledgeFragmentResponse) => {
  if (!fragment.previewImage || previewImageUrl.value[fragment.id]) {
    return
  }

  try {
    console.log('开始加载预览图片URL:', fragment.id, '路径:', fragment.previewImage)
    const url = await getPreviewImageUrl(fragment.previewImage)
    console.log('预览图片URL加载成功:', fragment.id, 'URL:', url)
    previewImageUrl.value[fragment.id] = url
    // 强制触发响应式更新
    await nextTick()
  } catch (error) {
    console.error(
      'Error loading preview image URL:',
      error,
      '片段ID:',
      fragment.id,
      '路径:',
      fragment.previewImage,
    )
    // 即使出错也设置一个占位符，避免一直显示"加载中"
    previewImageUrl.value[fragment.id] = ''
  }
}

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

// 计算所有标签
const allTags = computed(() => {
  const tags = new Set<string>()
  fragments.value.forEach((f) => f.tags.forEach((tag) => tags.add(tag)))
  return Array.from(tags).sort()
})

// 过滤后的片段
const filteredFragments = computed(() => {
  let filtered = fragments.value

  // 按标签过滤
  if (selectedTags.value.length > 0) {
    filtered = filtered.filter((f) => selectedTags.value.every((tag) => f.tags.includes(tag)))
  }

  // 按搜索查询过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (f) =>
        f.title.toLowerCase().includes(query) ||
        f.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        f.markdown.toLowerCase().includes(query),
    )
  }

  return filtered
})

// 搜索处理
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    searchFragments(searchQuery.value)
  } else {
    loadFragments()
  }
}

// 切换标签
const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

// 选择片段
const selectFragment = (fragment: KnowledgeFragmentResponse) => {
  selectedFragmentId.value = fragment.id
}

// 编辑片段（双击触发）
const editFragment = async (fragment: KnowledgeFragmentResponse) => {
  editingFragmentId.value = fragment.id
  editingFragmentTitle.value = fragment.title
  editingFragmentContent.value = fragment.markdown
  editingFragmentTags.value = fragment.tags.join(', ')
  showEditDialog.value = true
}

// 更新片段
const handleUpdateFragment = async () => {
  if (!editingFragmentId.value) {
    return
  }

  try {
    const tags = editingFragmentTags.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    // 解析Markdown为AST节点
    const nodes = parseMarkdownToNodes(editingFragmentContent.value)

    await updateFragment(editingFragmentId.value, {
      title: editingFragmentTitle.value,
      nodes,
      tags,
    })

    // 同步更新到所有引用文档
    try {
      const { InversifyContainer } = await import('../../core/container/inversify.container')
      const container = InversifyContainer.getInstance()
      if (
        container &&
        typeof container.isBound === 'function' &&
        container.isBound(TYPES.FragmentReferenceSyncService)
      ) {
        const syncService = container.get(TYPES.FragmentReferenceSyncService)
        await syncService.syncFragmentUpdate(editingFragmentId.value)
      }
    } catch (error) {
      console.error('Error syncing fragment update:', error)
    }

    // 重置表单
    editingFragmentId.value = null
    editingFragmentTitle.value = ''
    editingFragmentContent.value = ''
    editingFragmentTags.value = ''
    showEditDialog.value = false

    // 恢复编辑器焦点
    await nextTick()
    restoreEditorFocus()

    // 刷新列表
    await loadFragments()

    // 通知父组件刷新当前文档（如果有）
    emit('fragment-updated', editingFragmentId.value)
  } catch (error) {
    console.error('Error updating fragment:', error)
    alert('更新失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

// 获取片段的引用文档数量
const getFragmentReferenceCount = (fragmentId: string): number => {
  const fragment = fragments.value.find((f) => f.id === fragmentId)
  return fragment?.referencedDocuments?.length || 0
}

// 插入片段到文档
const insertFragment = async (fragment: KnowledgeFragmentResponse) => {
  // 通过emit传递片段ID，父组件会处理插入逻辑
  emit('insert', fragment)
}

// 打开删除片段确认对话框
const openDeleteFragmentDialog = (fragment: KnowledgeFragmentResponse) => {
  fragmentToDelete.value = fragment
  showDeleteFragmentDialog.value = true
}

// 取消删除片段
const handleCancelDeleteFragment = () => {
  showDeleteFragmentDialog.value = false
  fragmentToDelete.value = null
  nextTick(() => {
    restoreEditorFocus()
  })
}

// 确认删除片段
const handleConfirmDeleteFragment = async () => {
  if (!fragmentToDelete.value) return

  const id = fragmentToDelete.value.id

  try {
    await deleteFragmentAction(id)
    if (selectedFragmentId.value === id) {
      selectedFragmentId.value = null
    }
    showDeleteFragmentDialog.value = false
    fragmentToDelete.value = null
    await nextTick()
    restoreEditorFocus()
  } catch (error) {
    console.error('Error deleting fragment:', error)
    alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

// 刷新片段列表
const refreshFragments = () => {
  loadFragments()
}

// 渲染预览（使用真正的Markdown渲染器）
const renderFragmentPreview = async (fragment: KnowledgeFragmentResponse) => {
  if (fragmentPreviewHtml.value[fragment.id]) {
    return // 已经渲染过
  }

  try {
    // 先展开知识片段中的引用（递归展开，但限制深度避免循环引用）
    let previewMarkdown = fragment.markdown

    // 展开引用（限制递归深度为3，避免无限循环）
    previewMarkdown = await expandFragmentReferencesInPreview(
      previewMarkdown,
      0,
      3,
      new Set([fragment.id]),
    )

    // 截取前500个字符作为预览
    previewMarkdown = previewMarkdown.substring(0, 500)

    // 使用真正的Markdown渲染器，传递片段ID以处理图片路径
    // 使用 fragment: 前缀标识这是知识片段
    const fragmentDocId = `fragment:${fragment.id}`
    const html = await renderMarkdown(previewMarkdown, fragmentDocId)
    fragmentPreviewHtml.value[fragment.id] = html
    await nextTick()
  } catch (error) {
    console.error('Error rendering fragment preview:', error)
    fragmentPreviewHtml.value[fragment.id] = '<p>预览加载失败</p>'
  }
}

// 展开知识片段中的引用（用于预览）
const expandFragmentReferencesInPreview = async (
  content: string,
  currentDepth: number,
  maxDepth: number,
  visitedIds: Set<string>,
): Promise<string> => {
  // 如果达到最大深度，停止递归
  if (currentDepth >= maxDepth) {
    return content
  }

  // 解析引用
  const { FragmentReferenceParser } = await import(
    '../../domain/services/fragment-reference-parser.service'
  )
  const parser = new FragmentReferenceParser()
  const references = parser.parseReferences(content)

  if (references.length === 0) {
    return content
  }

  let expandedContent = content

  // 从后往前替换，避免索引偏移
  for (let i = references.length - 1; i >= 0; i--) {
    const ref = references[i]

    // 防止循环引用
    if (visitedIds.has(ref.fragmentId)) {
      console.warn(`[知识片段预览] 检测到循环引用，跳过片段 ${ref.fragmentId}`)
      // 移除循环引用标记
      const before = expandedContent.substring(0, ref.startIndex)
      const after = expandedContent.substring(ref.endIndex)
      expandedContent = before + after
      continue
    }

    try {
      // 获取引用的片段
      const application = Application.getInstance()
      await application.getApplicationService().initialize(vaultId.value)
      const fragmentUseCases = application.getKnowledgeFragmentUseCases()
      const fragment = await fragmentUseCases.getFragment(ref.fragmentId)

      if (!fragment) {
        console.warn(`[知识片段预览] 片段 ${ref.fragmentId} 不存在，移除引用标记`)
        // 移除不存在的引用标记
        const before = expandedContent.substring(0, ref.startIndex)
        const after = expandedContent.substring(ref.endIndex)
        expandedContent = before + after
        continue
      }

      // 递归展开片段内容中的引用
      const newVisitedIds = new Set(visitedIds)
      newVisitedIds.add(ref.fragmentId)
      let fragmentContent = fragment.markdown

      // 递归展开嵌套引用
      fragmentContent = await expandFragmentReferencesInPreview(
        fragmentContent,
        currentDepth + 1,
        maxDepth,
        newVisitedIds,
      )

      // 替换引用为展开后的内容
      const before = expandedContent.substring(0, ref.startIndex)
      const after = expandedContent.substring(ref.endIndex)
      expandedContent = before + fragmentContent + after
    } catch (error) {
      console.error(`[知识片段预览] 展开片段 ${ref.fragmentId} 失败:`, error)
      // 出错时移除引用标记
      const before = expandedContent.substring(0, ref.startIndex)
      const after = expandedContent.substring(ref.endIndex)
      expandedContent = before + after
    }
  }

  return expandedContent
}

// 渲染Mermaid图表预览
const renderMermaidPreview = async (fragment: KnowledgeFragmentResponse) => {
  if (!fragment.previewType || fragment.previewType !== 'mermaid' || !fragment.previewMermaidCode) {
    return
  }

  if (mermaidPreviewSvgs.value[fragment.id]) {
    return // 已经渲染过
  }

  try {
    // 检查Mermaid渲染器是否可用
    if (!mermaidRenderer || !mermaidRenderer.value) {
      console.warn('Mermaid渲染器未初始化，尝试从容器获取...')
      // 尝试从容器直接获取
      const { InversifyContainer } = await import('../../core/container/inversify.container')
      const container = InversifyContainer.getInstance()
      const renderer = container.get<MermaidRenderer>(TYPES.MermaidRenderer)

      if (renderer && typeof renderer.renderDiagram === 'function') {
        console.log('从容器获取渲染器，开始渲染:', fragment.id)
        const svg = await renderer.renderDiagram(fragment.previewMermaidCode, {
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        })
        console.log('容器渲染器返回结果:', typeof svg, svg?.length)
        console.log('容器渲染器返回结果预览:', svg?.substring(0, 300))
        // 确保SVG有合适的样式
        if (typeof svg === 'string') {
          let finalHtml = svg

          // 如果包含SVG，提取并优化样式
          if (svg.includes('<svg')) {
            const svgMatch = svg.match(/<svg[^>]*>[\s\S]*?<\/svg>/i)
            if (svgMatch) {
              let svgContent = svgMatch[0]
              svgContent = svgContent.replace(/<svg([^>]*)style="[^"]*"([^>]*)>/gi, '<svg$1$2>')
              svgContent = svgContent.replace(
                /<svg([^>]*)>/,
                '<svg$1 style="max-width: 100%; max-height: 150px; height: auto; width: auto; display: block; margin: 0 auto; background: white;">',
              )

              // 修复颜色问题
              // 修复颜色问题：将黑色填充改为白色，确保内容可见
              svgContent = svgContent.replace(/(<rect[^>]*fill=")black(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<rect[^>]*fill=")#000000(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<rect[^>]*fill=")#000(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<circle[^>]*fill=")black(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<circle[^>]*fill=")#000000(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<circle[^>]*fill=")#000(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<ellipse[^>]*fill=")black(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<ellipse[^>]*fill=")#000000(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<ellipse[^>]*fill=")#000(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<polygon[^>]*fill=")black(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<polygon[^>]*fill=")#000000(")/gi, '$1white$2')
              svgContent = svgContent.replace(/(<polygon[^>]*fill=")#000(")/gi, '$1white$2')
              // 确保文字颜色是黑色（可见）- 只处理text元素
              svgContent = svgContent.replace(/(<text[^>]*fill=")white(")/gi, '$1#333$2')
              svgContent = svgContent.replace(/(<text[^>]*fill=")#ffffff(")/gi, '$1#333$2')
              svgContent = svgContent.replace(/(<text[^>]*fill=")#fff(")/gi, '$1#333$2')
              // 确保stroke颜色可见（边框和线条）
              svgContent = svgContent.replace(/(stroke=")black(")/gi, '$1#333$2')
              svgContent = svgContent.replace(/(stroke=")#000000(")/gi, '$1#333$2')
              svgContent = svgContent.replace(/(stroke=")#000(")/gi, '$1#333$2')

              finalHtml = `
                <div style="width: 100%; max-height: 150px; overflow: hidden; background: white; display: flex; align-items: center; justify-content: center; padding: 8px;">
                  ${svgContent}
                </div>
              `
            } else {
              // 优化容器样式
              finalHtml = svg.replace(
                /<div[^>]*class="mermaid-container"[^>]*>/,
                '<div class="mermaid-container" style="background-color: white; margin: 0; padding: 8px; max-height: 150px; overflow: hidden; display: flex; align-items: center; justify-content: center;">',
              )
            }
          }

          mermaidPreviewSvgs.value[fragment.id] = finalHtml
          console.log('已设置到响应式对象（容器）:', Object.keys(mermaidPreviewSvgs.value))
          await nextTick()
        } else {
          console.error('容器渲染器返回了无效的结果')
          mermaidPreviewSvgs.value[fragment.id] =
            '<div class="mermaid-error">渲染结果格式错误</div>'
        }
      } else {
        console.error('无法获取Mermaid渲染器')
        mermaidPreviewSvgs.value[fragment.id] = '<div class="mermaid-error">渲染器不可用</div>'
      }
      return
    }

    // 使用注入的渲染器
    if (typeof mermaidRenderer.value.renderDiagram !== 'function') {
      console.error('Mermaid渲染器方法不可用')
      mermaidPreviewSvgs.value[fragment.id] = '<div class="mermaid-error">渲染器方法不可用</div>'
      return
    }

    console.log('开始渲染Mermaid预览:', fragment.id)
    console.log('Mermaid代码:', fragment.previewMermaidCode)
    const svg = await mermaidRenderer.value.renderDiagram(fragment.previewMermaidCode, {
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    })

    console.log('Mermaid渲染返回结果类型:', typeof svg)
    console.log('Mermaid渲染返回结果长度:', svg?.length)
    console.log('Mermaid渲染返回结果预览:', svg?.substring(0, 300))

    if (typeof svg === 'string') {
      // Mermaid渲染器返回的是包装在div中的HTML，我们需要提取SVG或优化容器样式
      let finalHtml = svg

      // 如果包含SVG，提取并优化样式
      if (svg.includes('<svg')) {
        // 提取SVG元素（可能在div包装中）
        const svgMatch = svg.match(/<svg[^>]*>[\s\S]*?<\/svg>/i)
        if (svgMatch) {
          let svgContent = svgMatch[0]

          // 优化SVG样式和颜色
          svgContent = svgContent.replace(/<svg([^>]*)style="[^"]*"([^>]*)>/gi, '<svg$1$2>')
          svgContent = svgContent.replace(
            /<svg([^>]*)>/,
            '<svg$1 style="max-width: 100%; max-height: 150px; height: auto; width: auto; display: block; margin: 0 auto; background: white;">',
          )

          // 修复颜色问题：将黑色填充改为白色，确保内容可见
          // 处理节点背景（rect、circle等）的fill属性
          // 使用更精确的正则表达式，只替换节点背景，不替换文字
          svgContent = svgContent.replace(/(<rect[^>]*fill=")black(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<rect[^>]*fill=")#000000(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<rect[^>]*fill=")#000(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<circle[^>]*fill=")black(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<circle[^>]*fill=")#000000(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<circle[^>]*fill=")#000(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<ellipse[^>]*fill=")black(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<ellipse[^>]*fill=")#000000(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<ellipse[^>]*fill=")#000(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<polygon[^>]*fill=")black(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<polygon[^>]*fill=")#000000(")/gi, '$1white$2')
          svgContent = svgContent.replace(/(<polygon[^>]*fill=")#000(")/gi, '$1white$2')

          // 确保文字颜色是黑色（可见）- 只处理text元素
          svgContent = svgContent.replace(/(<text[^>]*fill=")white(")/gi, '$1#333$2')
          svgContent = svgContent.replace(/(<text[^>]*fill=")#ffffff(")/gi, '$1#333$2')
          svgContent = svgContent.replace(/(<text[^>]*fill=")#fff(")/gi, '$1#333$2')

          // 确保stroke颜色可见（边框和线条）
          svgContent = svgContent.replace(/(stroke=")black(")/gi, '$1#333$2')
          svgContent = svgContent.replace(/(stroke=")#000000(")/gi, '$1#333$2')
          svgContent = svgContent.replace(/(stroke=")#000(")/gi, '$1#333$2')

          // 包装在适合预览的容器中
          finalHtml = `
            <div style="width: 100%; max-height: 150px; overflow: hidden; background: white; display: flex; align-items: center; justify-content: center; padding: 8px;">
              ${svgContent}
            </div>
          `
        } else {
          // 如果没有找到SVG，直接使用原始HTML，但优化容器样式
          finalHtml = svg.replace(
            /<div[^>]*class="mermaid-container"[^>]*>/,
            '<div class="mermaid-container" style="background-color: white; margin: 0; padding: 8px; max-height: 150px; overflow: hidden; display: flex; align-items: center; justify-content: center;">',
          )
        }
      }

      // 使用Vue的响应式更新
      mermaidPreviewSvgs.value = {
        ...mermaidPreviewSvgs.value,
        [fragment.id]: finalHtml,
      }

      console.log('Mermaid预览渲染成功:', fragment.id)
      console.log('最终HTML长度:', finalHtml.length)
      console.log('最终HTML前300字符:', finalHtml.substring(0, 300))
      console.log('已设置到响应式对象:', Object.keys(mermaidPreviewSvgs.value))
      console.log('检查响应式值:', mermaidPreviewSvgs.value[fragment.id] ? '有值' : '无值')

      // 强制触发响应式更新
      await nextTick()
      // 再次等待确保DOM更新
      await nextTick()
    } else {
      console.error('Mermaid返回了无效的结果:', svg)
      console.error('结果类型:', typeof svg)
      throw new Error('Mermaid返回了无效的结果')
    }
  } catch (error) {
    console.error('Error rendering Mermaid preview:', error)
    mermaidPreviewSvgs.value[fragment.id] =
      `<div class="mermaid-error">渲染失败: ${error instanceof Error ? error.message : '未知错误'}</div>`
  }
}

// 监听片段变化，自动渲染预览
watch(
  fragments,
  async (newFragments) => {
    console.log('片段列表变化，开始渲染预览，数量:', newFragments.length)
    for (const fragment of newFragments) {
      // 渲染Markdown预览
      if (!fragmentPreviewHtml.value[fragment.id]) {
        await renderFragmentPreview(fragment)
      }
      // 加载图片预览URL
      if (fragment.previewType === 'image' && fragment.previewImage) {
        await loadPreviewImageUrl(fragment)
      }
      // 渲染Mermaid预览
      if (fragment.previewType === 'mermaid' && !mermaidPreviewSvgs.value[fragment.id]) {
        console.log('watch中检测到Mermaid片段，开始渲染:', fragment.id)
        await renderMermaidPreview(fragment)
        // 强制触发响应式更新
        await nextTick()
      }
    }
  },
  { deep: true },
)

// 创建片段
const handleCreateFragment = async () => {
  if (!newFragmentTitle.value.trim()) {
    alert('请输入标题')
    return
  }

  try {
    console.log('=== 开始创建知识片段（UI层） ===')
    console.log('内容长度:', newFragmentContent.value.length)
    console.log('内容预览:', newFragmentContent.value.substring(0, 200))

    // 直接使用源代码内容（已经是从编辑器获取的源代码，包含引用标记等原始内容）
    // 将Markdown解析为AST节点
    const nodes = parseMarkdownToNodes(newFragmentContent.value)
    console.log('解析后的节点数量:', nodes.length)
    console.log(
      '节点类型:',
      nodes.map((n) => n.type),
    )

    // 检查是否有图片节点
    const imageNodes = nodes.filter((n) => n.type === NodeType.IMAGE)
    console.log('图片节点数量:', imageNodes.length)
    if (imageNodes.length > 0) {
      console.log(
        '图片节点详情:',
        imageNodes.map((n) => ({ src: n.src })),
      )
    }

    const tags = newFragmentTags.value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    // 在创建片段前，尝试从父组件获取最新的上下文
    // 通过emit事件请求上下文，或者直接从全局状态获取
    let context = {
      // 外部文档优先使用稳定 filePath，避免 external-xxx 会话重启后失配
      sourceDocumentId: currentDocumentContext.value.filePath || currentDocumentContext.value.documentId,
      sourceFilePath: currentDocumentContext.value.filePath,
    }

    // 如果当前上下文为空，尝试从父组件获取
    if (!context.sourceDocumentId && !context.sourceFilePath) {
      console.warn('当前文档上下文为空，尝试从父组件获取...')
      // 这里可以通过emit事件请求上下文，或者等待父组件更新
      // 暂时先使用当前值，但添加警告
    }

    console.log('=== 创建知识片段时的上下文检查 ===')
    console.log('currentDocumentContext.value:', currentDocumentContext.value)
    console.log('context (传递给createFragment):', context)
    console.log('sourceDocumentId:', context.sourceDocumentId)
    console.log('sourceFilePath:', context.sourceFilePath)

    await createFragment({
      title: newFragmentTitle.value,
      nodes,
      tags,
      sourceDocumentId: context.sourceDocumentId,
      sourceFilePath: context.sourceFilePath,
    })

    console.log('知识片段创建完成（UI层）')

    // 重置表单
    newFragmentTitle.value = ''
    newFragmentContent.value = ''
    newFragmentTags.value = ''
    showCreateDialog.value = false

    // 恢复编辑器焦点
    await nextTick()
    restoreEditorFocus()
  } catch (error) {
    console.error('Error creating fragment:', error)
    alert('创建失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

// 简单的Markdown解析为AST节点（简化版）
const parseMarkdownToNodes = (markdown: string): any[] => {
  const nodes: any[] = []
  const lines = markdown.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      nodes.push({
        type: NodeType.HEADING,
        level: headingMatch[1].length,
        text: headingMatch[2],
      })
      continue
    }

    // 代码块
    if (line.startsWith('```')) {
      const language = line.substring(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      nodes.push({
        type: NodeType.CODE_BLOCK,
        content: codeLines.join('\n'),
        language,
      })
      continue
    }

    // 图片
    const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (imageMatch) {
      const imageSrc = imageMatch[2]
      console.log('解析到图片节点:', { alt: imageMatch[1], src: imageSrc })
      nodes.push({
        type: NodeType.IMAGE,
        src: imageSrc,
        alt: imageMatch[1],
      })
      continue
    }

    // 普通文本
    if (line.trim()) {
      nodes.push({
        type: NodeType.TEXT,
        content: line,
        marks: [],
      })
    }
  }

  return nodes
}

// 处理拖入创建知识片段
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()
  // 检查是否是文本拖拽
  if (
    event.dataTransfer?.types.includes('text/plain') ||
    event.dataTransfer?.types.includes('text/html')
  ) {
    isDragging.value = true
  }
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
}

// 存储当前文档上下文（用于复制图片）
const currentDocumentContext = ref<{ documentId?: string; filePath?: string }>({})

// 设置文档上下文（由父组件调用）
const setDocumentContext = (context: { documentId?: string; filePath?: string }) => {
  currentDocumentContext.value = context
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation() // 阻止事件冒泡，避免影响编辑器
  isDragging.value = false

  let sourceCode = ''

  // 优先从 dataTransfer 获取源代码（在 dragstart 时保存的）
  if (event.dataTransfer) {
    const savedSourceCode = event.dataTransfer.getData('text/x-markdown-source')
    if (savedSourceCode && savedSourceCode.trim()) {
      sourceCode = savedSourceCode
      console.log('[知识片段库] 从拖拽数据获取源代码:', sourceCode.substring(0, 100))
      console.log('[知识片段库] 源代码长度:', sourceCode.length)
    }
  }

  // 如果没有从拖拽数据获取到，尝试从编辑器获取选中内容的源代码
  if (!sourceCode.trim() && props.markdownEditorRef) {
    try {
      const selectedSourceCode = (props.markdownEditorRef as any).getSelectedSourceCode?.()
      if (selectedSourceCode && selectedSourceCode.trim()) {
        sourceCode = selectedSourceCode
        console.log('[知识片段库] 从编辑器获取选中内容的源代码:', sourceCode.substring(0, 100))
        console.log('[知识片段库] 源代码长度:', sourceCode.length)
      }
    } catch (error) {
      console.warn('[知识片段库] 获取编辑器选中内容失败:', error)
    }
  }

  // 如果还是没有，使用拖拽的文本（降级方案，但这是渲染后的内容）
  if (!sourceCode.trim()) {
    const text = event.dataTransfer?.getData('text/plain') || ''
    if (!text.trim()) {
      return
    }
    sourceCode = text
    console.log('[知识片段库] 使用拖拽的文本内容（渲染后的）:', sourceCode.substring(0, 100))
    console.warn('[知识片段库] 警告：使用的是渲染后的文本，可能包含 [知识片段：xxx] 格式')
  }

  // 自动填充内容并打开创建对话框
  newFragmentContent.value = sourceCode
  newFragmentTitle.value = sourceCode.substring(0, 50).replace(/\n/g, ' ').trim() || '新知识片段'
  showCreateDialog.value = true
}

// 处理知识片段拖拽开始
const handleFragmentDragStart = (event: DragEvent, fragment: KnowledgeFragmentResponse) => {
  draggedFragment.value = fragment
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', fragment.markdown)
    event.dataTransfer.setData('application/x-knowledge-fragment', fragment.id)
  }
}

// 处理知识片段拖拽结束
const handleFragmentDragEnd = () => {
  draggedFragment.value = null
}

// 处理对话框 overlay 的 mousedown 事件（用于检测是否从对话框内拖动出来）
let dialogMouseDownTarget: EventTarget | null = null
const handleDialogOverlayMouseDown = (event: MouseEvent) => {
  // 记录 mousedown 时的目标元素
  dialogMouseDownTarget = event.target
}

// 关闭创建对话框并恢复编辑器焦点
const handleCloseCreateDialog = () => {
  showCreateDialog.value = false
  nextTick(() => {
    restoreEditorFocus()
  })
}

// 关闭编辑对话框并恢复编辑器焦点
const handleCloseEditDialog = () => {
  showEditDialog.value = false
  nextTick(() => {
    restoreEditorFocus()
  })
}

// 处理对话框 overlay 的 click 事件（只有在真正点击 overlay 时才关闭）
const handleDialogOverlayClick = (event: MouseEvent) => {
  // 只有当 mousedown 和 click 的目标都是 overlay 本身时，才关闭对话框
  // 这样可以防止用户在输入框中选中文本并拖动超出对话框时关闭对话框
  if (event.target === event.currentTarget && dialogMouseDownTarget === event.currentTarget) {
    if (showCreateDialog.value) {
      showCreateDialog.value = false
      // 恢复编辑器焦点
      nextTick(() => {
        restoreEditorFocus()
      })
    }
    if (showEditDialog.value) {
      showEditDialog.value = false
      // 恢复编辑器焦点
      nextTick(() => {
        restoreEditorFocus()
      })
    }
  }
  // 重置记录
  dialogMouseDownTarget = null
}

onMounted(async () => {
  await loadFragments()

  // 组件挂载后，主动请求父组件更新上下文
  // 通过emit事件或者等待父组件自动更新
  console.log('KnowledgeFragmentSidebar onMounted, 当前上下文:', currentDocumentContext.value)

  // 渲染所有片段的预览
  await nextTick()
  for (const fragment of fragments.value) {
    await renderFragmentPreview(fragment)
  }

  // 监听来自编辑器的文本拖拽
  document.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA') {
      const textarea = target as HTMLTextAreaElement
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (start !== end) {
        const selectedText = textarea.value.substring(start, end)
        e.dataTransfer?.setData('text/plain', selectedText)
      }
    }
  })
})

// 暴露方法供父组件调用
defineExpose({
  setDocumentContext,
})
</script>

<style scoped>
.knowledge-fragment-sidebar {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-secondary);
  overflow: hidden;
  position: relative;
}

.knowledge-fragment-sidebar.drag-over {
  background: var(--bg-active);
  border: 2px dashed var(--accent-primary);
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
}

.drag-message {
  font-size: 1.2rem;
  color: var(--accent-primary);
  font-weight: 600;
  background: var(--bg-primary);
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: var(--shadow-md);
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-icon {
  padding: 4px 8px;
  background: transparent;
  font-size: 1.2rem;
}

.btn-icon:hover {
  background: var(--bg-tertiary);
}

.btn-icon-small {
  padding: 2px 6px;
  background: transparent;
  font-size: 0.9rem;
}

.btn-primary {
  background: var(--accent-info);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: var(--text-inverse);
}

.btn-secondary:hover {
  background: #5a6268;
}

.search-box {
  padding: 12px;
  border-bottom: 1px solid var(--border-secondary);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.tag-filter {
  padding: 12px;
  border-bottom: 1px solid var(--border-secondary);
  max-height: 150px;
  overflow-y: auto;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--text-primary);
}

.tag:hover {
  background: var(--border-primary);
}

.tag.active {
  background: var(--accent-info);
  color: var(--text-inverse);
}

.fragment-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.fragment-item {
  padding: 12px;
  margin-bottom: 8px;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-secondary);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.fragment-item[draggable='true'] {
  cursor: grab;
}

.fragment-item[draggable='true']:active {
  cursor: grabbing;
  opacity: 0.8;
}

.fragment-item:hover {
  border-color: var(--accent-info);
  box-shadow: var(--shadow-sm);
}

.fragment-item.active {
  border-color: var(--accent-info);
  background: var(--bg-active);
}

.fragment-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
}

.fragment-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.fragment-actions {
  display: flex;
  gap: 4px;
}

.fragment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tag-small {
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.fragment-preview-image {
  margin-bottom: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--bg-hover);
  height: 150px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.preview-img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  object-position: center;
  display: block;
}

.preview-mermaid {
  width: 100%;
  min-height: 100px;
  max-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  padding: 8px;
  overflow: hidden; /* 移除滚动，只在外层显示 */
}

.mermaid-svg-container {
  width: 100%;
  min-height: 100px;
  max-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* 移除滚动 */
  background: var(--bg-primary);
}

.mermaid-svg-container :deep(svg) {
  max-width: 100% !important;
  max-height: 150px !important;
  width: auto !important;
  height: auto !important;
  display: block !important;
  margin: 0 auto;
  background: var(--bg-primary) !important;
}

.mermaid-svg-container :deep(text) {
  /* 确保文字可见 */
  fill: var(--text-primary) !important;
  stroke: none !important;
}

.mermaid-svg-container :deep(.node rect),
.mermaid-svg-container :deep(.node circle),
.mermaid-svg-container :deep(.node ellipse),
.mermaid-svg-container :deep(.node polygon) {
  /* 节点背景：白色填充，深色边框 */
  fill: var(--bg-primary) !important;
  stroke: var(--text-primary) !important;
  stroke-width: 2px !important;
}

.mermaid-svg-container :deep(.edgePath path),
.mermaid-svg-container :deep(.edgePath .path) {
  /* 连接线：深色，无填充 */
  stroke: var(--text-primary) !important;
  fill: none !important;
  stroke-width: 2px !important;
}

.mermaid-svg-container :deep(.cluster rect),
.mermaid-svg-container :deep(.cluster polygon) {
  /* 集群/分组：浅色背景 */
  fill: var(--bg-hover) !important;
  stroke: var(--text-secondary) !important;
  stroke-width: 2px !important;
}

.mermaid-placeholder {
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.mermaid-error {
  text-align: center;
  font-size: 0.85rem;
  color: var(--accent-danger);
  padding: 8px;
}

.fragment-preview {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
  max-height: 80px;
  overflow: hidden;
}

.fragment-preview :deep(p) {
  margin: 0.25em 0;
}

.fragment-preview :deep(h1),
.fragment-preview :deep(h2),
.fragment-preview :deep(h3),
.fragment-preview :deep(h4),
.fragment-preview :deep(h5),
.fragment-preview :deep(h6) {
  margin: 0.5em 0 0.25em 0;
  font-size: 1em;
  font-weight: 600;
}

.fragment-preview :deep(code) {
  background: var(--bg-secondary);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

.fragment-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.loading,
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input,
.textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.textarea {
  resize: vertical;
  min-height: 200px;
}

.dialog-footer {
  padding: 16px;
  border-top: 1px solid var(--border-secondary);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.settings-item {
  margin-bottom: 16px;
}

.settings-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-primary);
}

.path-display {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.path-input {
  flex: 1;
}

.settings-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 8px 0;
}

</style>

<style>
.fragment-context-menu {
  position: fixed;
  z-index: 10050;
  margin: 0;
  padding: 4px 0;
  min-width: 200px;
  list-style: none;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-primary, #e2e8f0);
  border-radius: 8px;
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12));
}

.fragment-context-menu-item {
  display: block;
  width: 100%;
  padding: 8px 14px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 0.875rem;
  color: var(--text-primary, #1e293b);
  cursor: pointer;
  font-family: inherit;
}

.fragment-context-menu-item:hover {
  background: var(--bg-hover, #f1f5f9);
}
</style>
