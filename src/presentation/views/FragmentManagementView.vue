<template>
  <div class="fragment-management">
    <!-- 顶部导航栏 -->
    <header class="fm-header">
      <div class="fm-header-left">
        <div class="fm-breadcrumb">
          <button class="breadcrumb-btn" @click="goHome">
            <span class="breadcrumb-icon">🏠</span>
            首页
          </button>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">片段管理</span>
        </div>
      </div>
      <div class="fm-header-right">
        <router-link class="fm-nav-link" to="/fragments/health">
          <span class="nav-icon">📊</span>
          健康度
        </router-link>
        <button class="fm-btn fm-btn-primary" @click="showCreateDialog = true">
          <span>+</span> 新建片段
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="fm-container">
      <!-- 左侧分类侧边栏 -->
      <aside class="fm-sidebar fm-sidebar-left">
        <div class="sidebar-header">
          <span class="sidebar-title">分类</span>
          <button class="fm-btn-icon" @click="onAddRootCategory" title="添加分类">+</button>
        </div>
        <FragmentCategoryTree
          :nodes="categoryTree"
          :selected-category-id="selectedCategoryId"
          :drag-over-id="dragOverCategoryId"
          @select="onSelectCategory"
          @add-root="onAddRootCategory"
          @add-child="onAddChildCategory"
          @rename="onRenameCategory"
          @delete="onDeleteCategory"
          @move="onMoveCategory"
          @drag-over="dragOverCategoryId = $event"
          @drag-start="() => {}"
          @drag-end="dragOverCategoryId = null"
        />
      </aside>

      <!-- 中间列表区 -->
      <main class="fm-main">
        <!-- 搜索和筛选工具栏 -->
        <div class="fm-toolbar">
          <div class="fm-search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="filters.keyword"
              type="text"
              class="fm-search-input"
              placeholder="搜索片段..."
              @input="handleSearch"
            />
          </div>
          <div class="fm-filter-group">
            <select v-model="filters.status" class="fm-select" @change="load">
              <option value="">全部状态</option>
              <option value="active">活跃</option>
              <option value="archived">归档</option>
              <option value="deprecated">废弃</option>
            </select>
            <label class="fm-checkbox-label">
              <input v-model="filters.recentUpdated" type="checkbox" @change="load" />
              最近更新
            </label>
          </div>
        </div>

        <!-- 标签筛选 -->
        <div v-if="allTags.length > 0" class="fm-tags-filter">
          <span class="tags-label">标签:</span>
          <div class="tags-list">
            <span
              v-for="tag in allTags"
              :key="tag"
              class="fm-tag"
              :class="{ active: filters.selectedTags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- 活跃筛选提示 -->
        <div v-if="selectedCategoryId || filters.selectedTags.length" class="fm-active-filters">
          <span v-if="selectedCategoryId" class="filter-chip" @click="clearCategoryFilter">
            分类筛选中 ×
          </span>
          <span v-if="filters.selectedTags.length" class="filter-chip" @click="clearTagsFilter">
            {{ filters.selectedTags.length }} 个标签 ×
          </span>
          <button class="fm-link-btn" @click="clearAllFilters">清除全部</button>
        </div>

        <!-- 批量操作栏 -->
        <div v-if="selectedFragmentIds.length" class="fm-bulk-bar">
          <span class="bulk-count">已选择 {{ selectedFragmentIds.length }} 项</span>
          <div class="bulk-actions">
            <select v-model="bulkStatus" class="fm-select small">
              <option value="">设置为...</option>
              <option value="active">活跃</option>
              <option value="archived">归档</option>
              <option value="deprecated">废弃</option>
            </select>
            <button class="fm-btn fm-btn-sm" @click="applyBulkStatus">应用</button>
          </div>
          <button class="fm-btn-icon" @click="selectedFragmentIds = []">✕</button>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="fm-loading">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!fragments.length" class="fm-empty">
          <div class="empty-icon">📚</div>
          <h3 class="empty-title">暂无片段</h3>
          <p class="empty-desc">点击"新建片段"或调整筛选条件开始管理知识片段</p>
        </div>

        <!-- 片段列表 -->
        <div v-else class="fm-list">
          <div
            v-for="f in fragments"
            :key="f.id"
            class="fm-card"
            :class="{ selected: selectedId === f.id }"
            @click="select(f, $event)"
          >
            <div class="card-checkbox">
              <input
                type="checkbox"
                :checked="selectedFragmentIds.includes(f.id)"
                @click.stop="toggleSelect(f.id)"
              />
            </div>
            <div class="card-content">
              <div class="card-header">
                <router-link class="card-title" :to="`/fragments/${f.id}`" @click.stop>
                  {{ f.title }}
                </router-link>
                <span class="card-status" :class="`status-${f.status}`">
                  {{ statusLabel(f.status) }}
                </span>
              </div>
              <div class="card-meta">
                <span class="meta-item">
                  <span class="meta-icon">📎</span>
                  {{ f.referencedDocuments?.length ?? 0 }} 次引用
                </span>
                <span v-if="f.tags?.length" class="meta-item">
                  <span class="meta-icon">🏷️</span>
                  {{ f.tags.slice(0, 3).join(', ') }}
                </span>
              </div>
              <div v-if="f.tags?.length" class="card-tags">
                <span v-for="tag in f.tags" :key="tag" class="card-tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 右侧详情面板 -->
      <aside class="fm-sidebar fm-sidebar-right">
        <template v-if="selectedDetail">
          <div class="detail-header">
            <h3 class="detail-title">{{ selectedDetail.title }}</h3>
            <router-link :to="`/fragments/${selectedDetail.id}`" class="detail-link">
              查看详情 →
            </router-link>
          </div>
          <FragmentMetadataPanel
            :detail="selectedDetail"
            :categories-flat="categoriesFlat"
            :saving="metadataSaving"
            :feedback="metadataFeedback"
            @save="onSaveMetadata"
          />
        </template>
        <div v-else class="detail-empty">
          <div class="empty-icon">👈</div>
          <p>选择一个片段查看和编辑元数据</p>
        </div>
      </aside>
    </div>

    <!-- 新建片段对话框 -->
    <div v-if="showCreateDialog" class="fm-modal-overlay" @click="showCreateDialog = false">
      <div class="fm-modal" @click.stop>
        <div class="modal-header">
          <h3>新建片段</h3>
          <button class="fm-btn-icon" @click="showCreateDialog = false">✕</button>
        </div>
        <div class="modal-body">
          <input v-model="newFragment.title" type="text" class="fm-input" placeholder="片段标题" />
          <textarea
            v-model="newFragment.content"
            class="fm-textarea"
            placeholder="片段内容（支持 Markdown）..."
            rows="8"
          ></textarea>
          <input
            v-model="newFragment.tags"
            type="text"
            class="fm-input"
            placeholder="标签（用逗号分隔）"
          />
        </div>
        <div class="modal-footer">
          <button class="fm-btn fm-btn-secondary" @click="showCreateDialog = false">取消</button>
          <button class="fm-btn fm-btn-primary" @click="handleCreateFragment">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Application } from '../../core/application'
import FragmentMetadataPanel from '../components/fragment/FragmentMetadataPanel.vue'
import FragmentCategoryTree from '../components/fragment/FragmentCategoryTree.vue'
import type { FragmentCategoryTreeNode } from '../../domain/types/fragment-category.types'
import type {
  KnowledgeFragmentResponse,
  KnowledgeFragmentDetailResponse,
  UpdateFragmentMetadataRequest,
} from '../../application/dto/knowledge-fragment.dto'

const props = defineProps<{
  vaultId?: string
}>()

const route = useRoute()
const router = useRouter()

function goHome() {
  router.push('/')
}
const vaultId = ref(
  (props.vaultId as string | undefined) ?? (route.query.vaultId as string | undefined) ?? 'default',
)
const categoryTree = ref<FragmentCategoryTreeNode[]>([])
const selectedCategoryId = ref<string | null>(null)
const dragOverCategoryId = ref<string | null>(null)

const fragments = ref<KnowledgeFragmentResponse[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const metadataSaving = ref(false)
const metadataFeedback = ref<{ kind: 'success' | 'error'; message: string } | null>(null)
const selectedId = ref<string | null>(null)
const selectedDetail = ref<KnowledgeFragmentDetailResponse | null>(null)
const selectedFragmentIds = ref<string[]>([])
const bulkStatus = ref('')
const allTags = ref<string[]>([])

const filters = ref({
  status: '',
  keyword: '',
  selectedTags: [] as string[],
  recentUpdated: false,
  recentUsed: false,
})

const showCreateDialog = ref(false)
const newFragment = ref({
  title: '',
  content: '',
  tags: '',
})

function handleSearch() {
  if (filters.value.keyword) {
    searchFragments(filters.value.keyword)
  } else {
    load()
  }
}

function toggleTag(tag: string) {
  const i = filters.value.selectedTags.indexOf(tag)
  if (i === -1) {
    filters.value.selectedTags.push(tag)
  } else {
    filters.value.selectedTags.splice(i, 1)
  }
  load()
}

function clearTagsFilter() {
  filters.value.selectedTags = []
  load()
}

async function handleCreateFragment() {
  if (!newFragment.value.title.trim()) return
  try {
    const app = Application.getInstance()
    const useCases = app.getKnowledgeFragmentUseCases()
    const tags = newFragment.value.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t)

    await useCases.createFragment({
      title: newFragment.value.title,
      nodes: [{ type: 'paragraph', text: newFragment.value.content }],
      tags,
    })

    showCreateDialog.value = false
    newFragment.value = { title: '', content: '', tags: '' }
    await load()
  } catch (e) {
    console.error('创建片段失败:', e)
  }
}

async function searchFragments(query: string) {
  loading.value = true
  try {
    const app = Application.getInstance()
    const useCases = app.getKnowledgeFragmentUseCases()
    fragments.value = await useCases.searchFragments(query)
  } catch (e) {
    console.error('搜索失败:', e)
  } finally {
    loading.value = false
  }
}

function flattenCategories(
  nodes: FragmentCategoryTreeNode[],
  prefix = '',
): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = []
  for (const n of nodes) {
    const label = prefix ? `${prefix} / ${n.name}` : n.name
    out.push({ id: n.id, label })
    if (n.children?.length) out.push(...flattenCategories(n.children, label))
  }
  return out
}

const categoriesFlat = computed(() => flattenCategories(categoryTree.value))

async function loadCategoryTree() {
  const app = Application.getInstance()
  await app.getApplicationService().initialize()
  const catUC = app.getFragmentCategoryUseCases()
  categoryTree.value = await catUC.getCategoryTree(vaultId.value)
}

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const app = Application.getInstance()
    await app.getApplicationService().initialize()
    const useCases = app.getKnowledgeFragmentUseCases()
    const list = await useCases.listFragments({
      keyword: filters.value.keyword || undefined,
      statuses: filters.value.status
        ? [filters.value.status as 'active' | 'archived' | 'deprecated']
        : undefined,
      categoryIds: selectedCategoryId.value ? [selectedCategoryId.value] : undefined,
      tags: filters.value.selectedTags.length > 0 ? filters.value.selectedTags : undefined,
      recentUpdated: filters.value.recentUpdated || undefined,
      recentUsed: filters.value.recentUsed || undefined,
      sortBy: filters.value.recentUsed ? 'referencedAt' : 'updatedAt',
      sortOrder: 'desc',
    })
    fragments.value = list
  } catch (e) {
    console.error(e)
    loadError.value = e instanceof Error ? e.message : '加载片段列表失败'
    fragments.value = []
  } finally {
    loading.value = false
  }
}

function statusLabel(s: string | undefined) {
  const m: Record<string, string> = { active: '活跃', archived: '归档', deprecated: '废弃' }
  return m[s ?? 'active'] ?? '活跃'
}

function statusChipClass(s: string | undefined) {
  const v = s ?? 'active'
  if (v === 'archived') return 'fragment-asset-chip--archived'
  if (v === 'deprecated') return 'fragment-asset-chip--deprecated'
  return 'fragment-asset-chip--active'
}

function clearCategoryFilter() {
  selectedCategoryId.value = null
  void load()
}

function clearAllFilters() {
  selectedCategoryId.value = null
  filters.value = {
    status: '',
    keyword: '',
    selectedTags: [],
    recentUpdated: false,
    recentUsed: false,
  }
  void load()
}

async function loadTags() {
  try {
    const app = Application.getInstance()
    await app.getApplicationService().initialize()
    const useCases = app.getKnowledgeFragmentUseCases()
    allTags.value = await useCases.getAllTags()
  } catch (e) {
    console.error('[FragmentManagementView] loadTags failed', e)
    allTags.value = []
  }
}

function onSelectCategory(id: string | null) {
  selectedCategoryId.value = id
  load()
}

async function onAddRootCategory() {
  const name = window.prompt('根分类名称')
  if (!name?.trim()) return
  const app = Application.getInstance()
  await app.getFragmentCategoryUseCases().createCategory(vaultId.value, null, name.trim())
  await loadCategoryTree()
}

async function onAddChildCategory(parentId: string) {
  const name = window.prompt('子分类名称')
  if (!name?.trim()) return
  const app = Application.getInstance()
  await app.getFragmentCategoryUseCases().createCategory(vaultId.value, parentId, name.trim())
  await loadCategoryTree()
}

async function onRenameCategory(id: string, name: string) {
  const app = Application.getInstance()
  await app.getFragmentCategoryUseCases().renameCategory(id, name)
  await loadCategoryTree()
}

async function onDeleteCategory(id: string) {
  if (!window.confirm('删除该分类？子分类将提升到上一级。')) return
  const app = Application.getInstance()
  await app.getFragmentCategoryUseCases().deleteCategory(id, { moveChildrenToParent: true })
  if (selectedCategoryId.value === id) selectedCategoryId.value = null
  await loadCategoryTree()
  await load()
}

async function onMoveCategory(id: string, newParentId: string | null) {
  const app = Application.getInstance()
  await app.getFragmentCategoryUseCases().moveCategory(id, newParentId)
  await loadCategoryTree()
}

async function select(f: KnowledgeFragmentResponse, e?: MouseEvent) {
  if (e?.shiftKey) {
    toggleSelect(f.id)
    return
  }
  selectedId.value = f.id
  const app = Application.getInstance()
  const useCases = app.getKnowledgeFragmentUseCases()
  const detail = await useCases.getFragmentDetail(f.id)
  selectedDetail.value = detail
}

function toggleSelect(id: string) {
  const i = selectedFragmentIds.value.indexOf(id)
  if (i === -1) selectedFragmentIds.value = [...selectedFragmentIds.value, id]
  else selectedFragmentIds.value = selectedFragmentIds.value.filter((x) => x !== id)
}

async function applyBulkStatus() {
  if (!bulkStatus.value || !selectedFragmentIds.value.length) return
  const app = Application.getInstance()
  await app.getKnowledgeFragmentUseCases().bulkUpdateFragments({
    ids: selectedFragmentIds.value,
    status: bulkStatus.value as 'active' | 'archived' | 'deprecated',
  })
  selectedFragmentIds.value = []
  bulkStatus.value = ''
  await load()
  if (selectedId.value) {
    const detail = await app.getKnowledgeFragmentUseCases().getFragmentDetail(selectedId.value)
    selectedDetail.value = detail
  }
}

async function onSaveMetadata(patch: UpdateFragmentMetadataRequest) {
  if (!selectedId.value) return
  metadataSaving.value = true
  metadataFeedback.value = null
  try {
    const app = Application.getInstance()
    const useCases = app.getKnowledgeFragmentUseCases()
    await useCases.updateFragmentMetadata(selectedId.value, patch)
    const detail = await useCases.getFragmentDetail(selectedId.value)
    selectedDetail.value = detail
    await load()
    metadataFeedback.value = { kind: 'success', message: '已保存' }
    window.setTimeout(() => {
      if (
        metadataFeedback.value?.kind === 'success' &&
        metadataFeedback.value.message === '已保存'
      ) {
        metadataFeedback.value = null
      }
    }, 2500)
  } catch (e) {
    console.error(e)
    metadataFeedback.value = {
      kind: 'error',
      message: e instanceof Error ? e.message : '保存失败',
    }
  } finally {
    metadataSaving.value = false
  }
}

watch(
  [
    () => filters.value.status,
    () => filters.value.keyword,
    () => filters.value.recentUpdated,
    () => filters.value.recentUsed,
    () => filters.value.selectedTags,
  ],
  load,
  { deep: true },
)
onMounted(async () => {
  await loadCategoryTree()
  await loadTags()
  await load()
})
</script>

<style scoped>
.fragment-management {
  padding: 16px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.page-header {
  margin-bottom: 16px;
}
.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-header h1 {
  margin: 0 0 4px 0;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
}
.vault-hint {
  font-size: 0.9rem;
  color: var(--text-secondary, #666);
  margin: 4px 0 0 0;
  line-height: 1.5;
}
.vault-id {
  font-size: 0.85em;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-tertiary, #f0f0f0);
}
.nav-pill {
  display: inline-block;
  margin-left: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  color: var(--fm-accent, var(--accent-info, #2563eb));
  background: var(--fm-accent-soft, rgba(37, 99, 235, 0.1));
}
.nav-pill:hover {
  text-decoration: underline;
}
.category-chip-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.8rem;
}
.category-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--fm-accent-soft, rgba(37, 99, 235, 0.1));
  color: var(--fm-accent, #2563eb);
  font-weight: 600;
}
.link-clear {
  border: none;
  background: none;
  color: var(--accent-info, #2563eb);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-size: inherit;
}
.inline-error {
  margin: 0 0 10px 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(220, 38, 38, 0.08);
  color: var(--accent-danger, #b91c1c);
  font-size: 0.85rem;
}
.list-skeleton {
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-row {
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--bg-tertiary, #eee) 0%,
    var(--bg-hover, #f5f5f5) 50%,
    var(--bg-tertiary, #eee) 100%
  );
  background-size: 200% 100%;
  animation: fm-list-shimmer 1.1s ease-in-out infinite;
}
@keyframes fm-list-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
.list-empty {
  padding: 48px 16px;
  text-align: center;
}
.list-empty .empty-title {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: var(--text-primary, #222);
}
.list-empty .empty-hint {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-secondary, #666);
}
.layout {
  flex: 1;
  display: grid;
  grid-template-columns: 220px 180px 1fr 300px;
  gap: 12px;
  min-height: 0;
}
.col-tree,
.col-filters {
  overflow-y: auto;
  border: 1px solid var(--border-secondary, #eee);
  border-radius: 8px;
  padding: 10px;
  background: var(--bg-secondary, #fafafa);
}
.filter-group {
  margin-bottom: 10px;
}
.filter-group label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 4px;
}
.input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 4px;
  box-sizing: border-box;
}
.input.small {
  font-size: 0.85rem;
}
.btn {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-secondary {
  background: var(--bg-tertiary, #eee);
  border: 1px solid var(--border-primary, #ddd);
}
.btn-primary {
  background: var(--accent-info, #06c);
  color: #fff;
  border: none;
}
.btn.small {
  padding: 4px 8px;
  font-size: 0.85rem;
}
.bulk-bar {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-secondary, #eee);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}
.list-area {
  overflow-y: auto;
  padding: 10px;
}
.loading {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary, #666);
}
.row-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}
.fragment-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.fragment-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
}
.fragment-item:hover {
  background: var(--bg-hover, #f5f5f5);
}
.fragment-item.selected {
  background: var(--bg-active, #e8f0fe);
}
.row-check {
  margin-top: 4px;
}
.row-body {
  flex: 1;
  min-width: 0;
}
.fragment-item .title {
  display: block;
  font-weight: 600;
  color: var(--text-primary, #222);
  text-decoration: none;
}
.fragment-item .title:hover {
  text-decoration: underline;
}
.fragment-item .meta {
  font-size: 0.8rem;
  color: var(--text-secondary, #666);
}
.detail-drawer {
  overflow-y: auto;
  border: 1px solid var(--border-secondary, #eee);
  border-radius: 8px;
  padding: 12px;
  background: var(--bg-secondary, #fafafa);
}
.detail-drawer h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
}
.hint {
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
}
@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr auto;
  }
}
.tag-filter-list {
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 4px;
  padding: 4px 6px;
  background: var(--bg-primary, #fff);
}
.tag-check-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  margin-bottom: 4px;
  cursor: pointer;
}
.tag-check-row:hover {
  background: var(--bg-hover, #f5f5f5);
  border-radius: 4px;
  padding: 2px 4px;
  margin: 0 -4px;
}
.tag-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--fm-accent-soft, rgba(37, 99, 235, 0.1));
  color: var(--fm-accent, #2563eb);
  font-weight: 600;
  font-size: 0.75rem;
}

/* 新的现代化样式 */
.fm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg-primary, #fff);
  border-bottom: 1px solid var(--border-primary, #e5e7eb);
}

.fm-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fm-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.breadcrumb-btn:hover {
  background: var(--bg-hover, #f3f4f6);
  color: var(--text-primary, #111827);
}

.breadcrumb-icon {
  font-size: 1rem;
}

.breadcrumb-sep {
  color: var(--text-tertiary, #d1d5db);
}

.breadcrumb-current {
  font-size: 0.9375rem;
  color: var(--text-primary, #111827);
  font-weight: 500;
}

.fm-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
  margin: 0;
}

.fm-count {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  background: var(--bg-secondary, #f3f4f6);
  padding: 4px 12px;
  border-radius: 999px;
}

.fm-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fm-nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.fm-nav-link:hover {
  background: var(--bg-hover, #f3f4f6);
  color: var(--text-primary, #111827);
}

.fm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.fm-btn-primary {
  background: var(--accent-primary, #2563eb);
  color: #fff;
}

.fm-btn-primary:hover {
  background: var(--accent-primary-hover, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.fm-btn-secondary {
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-primary, #111827);
  border: 1px solid var(--border-primary, #e5e7eb);
}

.fm-btn-secondary:hover {
  background: var(--bg-hover, #e5e7eb);
}

.fm-btn-sm {
  padding: 4px 12px;
  font-size: 0.8125rem;
}

.fm-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-secondary, #6b7280);
  transition: all 0.2s;
}

.fm-btn-icon:hover {
  background: var(--bg-hover, #f3f4f6);
  color: var(--text-primary, #111827);
}

.fm-container {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  gap: 0;
  height: calc(100vh - 73px);
  background: var(--bg-secondary, #f9fafb);
}

.fm-sidebar {
  background: var(--bg-primary, #fff);
  border-right: 1px solid var(--border-primary, #e5e7eb);
  overflow-y: auto;
}

.fm-sidebar-right {
  border-right: none;
  border-left: 1px solid var(--border-primary, #e5e7eb);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-primary, #e5e7eb);
}

.sidebar-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.fm-main {
  padding: 20px;
  overflow-y: auto;
}

.fm-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.fm-search-box {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.875rem;
  opacity: 0.5;
}

.fm-search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--bg-primary, #fff);
  transition: all 0.2s;
}

.fm-search-input:focus {
  outline: none;
  border-color: var(--accent-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.fm-filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fm-select {
  padding: 8px 12px;
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--bg-primary, #fff);
  cursor: pointer;
  min-width: 100px;
}

.fm-select:focus {
  outline: none;
  border-color: var(--accent-primary, #2563eb);
}

.fm-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  white-space: nowrap;
}

.fm-tags-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tags-label {
  font-size: 0.8125rem;
  color: var(--text-secondary, #6b7280);
  font-weight: 500;
}

.tags-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.fm-tag {
  display: inline-block;
  padding: 4px 10px;
  font-size: 0.75rem;
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-secondary, #6b7280);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
}

.fm-tag:hover {
  background: var(--bg-hover, #e5e7eb);
}

.fm-tag.active {
  background: var(--accent-primary, #2563eb);
  color: #fff;
}

.fm-active-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 0.8125rem;
  background: rgba(37, 99, 235, 0.1);
  color: var(--accent-primary, #2563eb);
  border-radius: 999px;
  cursor: pointer;
}

.filter-chip:hover {
  background: rgba(37, 99, 235, 0.2);
}

.fm-link-btn {
  background: none;
  border: none;
  font-size: 0.8125rem;
  color: var(--accent-primary, #2563eb);
  cursor: pointer;
  text-decoration: underline;
}

.fm-bulk-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--accent-primary, #2563eb);
  color: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.bulk-count {
  font-size: 0.875rem;
  font-weight: 500;
}

.bulk-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.bulk-actions .fm-select {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  min-width: 80px;
}

.bulk-actions .fm-btn {
  background: #fff;
  color: var(--accent-primary, #2563eb);
}

.fm-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--text-secondary, #6b7280);
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-primary, #e5e7eb);
  border-top-color: var(--accent-primary, #2563eb);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.fm-empty .empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.fm-empty .empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
  margin: 0 0 8px;
}

.fm-empty .empty-desc {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin: 0;
}

.fm-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fm-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.fm-card:hover {
  border-color: var(--accent-primary, #2563eb);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.fm-card.selected {
  border-color: var(--accent-primary, #2563eb);
  background: rgba(37, 99, 235, 0.03);
}

.card-checkbox {
  flex-shrink: 0;
  padding-top: 2px;
}

.card-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--accent-primary, #2563eb);
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
  text-decoration: none;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title:hover {
  color: var(--accent-primary, #2563eb);
  text-decoration: underline;
}

.card-status {
  flex-shrink: 0;
  padding: 3px 10px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: 999px;
}

.card-status.status-active {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.card-status.status-archived {
  background: rgba(234, 179, 8, 0.1);
  color: #ca8a04;
}

.card-status.status-deprecated {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.card-meta {
  display: flex;
  gap: 16px;
  font-size: 0.8125rem;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-icon {
  font-size: 0.75rem;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  padding: 2px 8px;
  font-size: 0.6875rem;
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-secondary, #6b7280);
  border-radius: 4px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-primary, #e5e7eb);
}

.detail-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
  margin: 0;
}

.detail-link {
  font-size: 0.8125rem;
  color: var(--accent-primary, #2563eb);
  text-decoration: none;
}

.detail-link:hover {
  text-decoration: underline;
}

.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, #6b7280);
  text-align: center;
  padding: 20px;
}

.detail-empty .empty-icon {
  font-size: 2rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* 模态框 */
.fm-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fm-modal {
  width: 90%;
  max-width: 560px;
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-primary, #e5e7eb);
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fm-input,
.fm-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: inherit;
  transition: all 0.2s;
}

.fm-input:focus,
.fm-textarea:focus {
  outline: none;
  border-color: var(--accent-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.fm-textarea {
  min-height: 160px;
  resize: vertical;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-primary, #e5e7eb);
}

/* 响应式 */
@media (max-width: 1200px) {
  .fm-container {
    grid-template-columns: 1fr 300px;
  }
  .fm-sidebar-left {
    display: none;
  }
}

@media (max-width: 900px) {
  .fm-container {
    grid-template-columns: 1fr;
  }
  .fm-sidebar-right {
    display: none;
  }
  .fm-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>
