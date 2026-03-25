<template>
  <div class="fragment-detail fragment-asset-page">
    <header class="page-header">
      <router-link to="/fragments" class="back">← 返回列表</router-link>
      <h1>{{ detail?.title ?? (loading ? '加载中…' : '片段') }}</h1>
    </header>
    <div v-if="loading" class="detail-skeleton" aria-busy="true">
      <div class="sk-block lg" />
      <div class="sk-block" />
      <div class="sk-block" />
    </div>
    <p v-else-if="loadError" class="error-panel" role="alert">
      {{ loadError }}
      <button type="button" class="btn-retry" @click="load">重试</button>
    </p>
    <template v-else-if="detail">
      <div class="layout">
        <section class="content-section fm-surface">
          <p class="fm-section-title">内容</p>
          <div class="markdown-preview" v-html="renderedMarkdown"></div>
        </section>
        <aside class="meta-section">
          <div class="fm-surface health-card">
            <p class="fm-section-title">健康度</p>
            <div v-if="health" class="health">
              <div class="health-score-wrap">
                <span class="health-score" :class="healthScoreClass(health.healthScore)">{{
                  health.healthScore
                }}</span>
                <span class="health-score-label">综合得分</span>
              </div>
              <div v-if="healthFlagChips.length" class="flag-chips">
                <span v-for="f in healthFlagChips" :key="f" class="flag-chip">{{ f }}</span>
              </div>
              <p v-else class="health-ok">当前无风险标记</p>
            </div>
            <p v-else class="muted">暂无健康数据</p>
          </div>
          <div class="fm-surface block-card">
            <p class="fm-section-title">影响范围</p>
            <div v-if="impact" class="impact">
              <p class="impact-lead">
                被 <strong>{{ impact.affectedCount }}</strong> 个文档引用
              </p>
              <p v-if="impact.highImpactCount && impact.highImpactCount > 0" class="impact-high">
                近 30 天高影响文档：{{ impact.highImpactCount }}
              </p>
              <ul v-if="impact.documentTitles.length" class="impact-list">
                <li v-for="(t, i) in impact.documentTitles" :key="i">{{ t }}</li>
              </ul>
              <p v-else class="muted small">暂无引用文档标题</p>
            </div>
          </div>
          <div class="fm-surface block-card">
            <p class="fm-section-title">引用文档</p>
            <ul v-if="detail.referencedDocuments.length" class="ref-list">
              <li v-for="r in detail.referencedDocuments" :key="r.documentId">
                <span class="ref-title">{{ r.documentTitle }}</span>
                <span class="ref-date">{{ r.referencedAt.slice(0, 10) }}</span>
              </li>
            </ul>
            <p v-else class="muted small">暂无引用记录</p>
          </div>
          <div class="fm-surface block-card">
            <p class="fm-section-title">派生链</p>
            <div v-if="detail.derivedFromId" class="derived-parent">
              <span class="derived-label">父片段：</span>
              <router-link :to="fragmentLink(detail.derivedFromId)" class="derived-link">{{
                parentTitle || detail.derivedFromId
              }}</router-link>
            </div>
            <div v-if="childFragments.length" class="derived-children">
              <span class="derived-label">子片段 ({{ childFragments.length }})：</span>
              <ul class="child-list">
                <li v-for="child in childFragments" :key="child.id">
                  <router-link :to="fragmentLink(child.id)" class="derived-link">{{
                    child.title
                  }}</router-link>
                  <span class="child-status" :class="'status-' + child.status">{{
                    statusLabel(child.status)
                  }}</span>
                </li>
              </ul>
            </div>
            <p v-if="!detail.derivedFromId && !childFragments.length" class="muted small">
              无派生关系
            </p>
          </div>
          <div class="fm-surface block-card">
            <p class="fm-section-title">版本历史</p>
            <div v-if="detail.versionHistory && detail.versionHistory.length" class="version-list">
              <div
                v-for="v in detail.versionHistory.slice(-5).reverse()"
                :key="v.id"
                class="version-item"
              >
                <div class="version-header">
                  <span class="version-date">{{ v.timestamp.slice(0, 10) }}</span>
                  <span v-if="v.changedBy" class="version-by">{{ v.changedBy }}</span>
                </div>
                <p class="version-summary">{{ v.summary }}</p>
              </div>
            </div>
            <p v-else class="muted small">暂无版本记录（工作4将实现完整版本功能）</p>
          </div>
          <div class="fm-surface meta-panel-wrap">
            <FragmentMetadataPanel
              :detail="detail"
              :categories-flat="categoriesFlat"
              :saving="metadataSaving"
              :feedback="metadataFeedback"
              @save="onSaveMetadata"
            />
          </div>
        </aside>
      </div>
    </template>
    <p v-else class="error">片段不存在或已删除</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Application } from '../../core/application'
import { useDocuments } from '../composables/useDocuments'
import FragmentMetadataPanel from '../components/fragment/FragmentMetadataPanel.vue'
import type {
  KnowledgeFragmentDetailResponse,
  UpdateFragmentMetadataRequest,
} from '../../application/dto/knowledge-fragment.dto'
import type { FragmentCategoryTreeNode } from '../../domain/types/fragment-category.types'

const route = useRoute()
const fragmentId = computed(() => route.params.fragmentId as string)
const vaultId = computed(
  () =>
    (route.params.vaultId as string | undefined) ??
    (route.query.vaultId as string | undefined) ??
    'default',
)
const { renderMarkdown } = useDocuments()

const detail = ref<KnowledgeFragmentDetailResponse | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const metadataSaving = ref(false)
const metadataFeedback = ref<{ kind: 'success' | 'error'; message: string } | null>(null)
const categoryTree = ref<FragmentCategoryTreeNode[]>([])
const health = ref<{
  healthScore: number
  flags: { isolated: boolean; expired: boolean; lowTrust: boolean }
} | null>(null)
const impact = ref<{
  affectedCount: number
  documentTitles: string[]
  highImpactCount?: number
} | null>(null)
const childFragments = ref<Array<{ id: string; title: string; status: string; updatedAt: string }>>(
  [],
)
const parentTitle = ref<string>('')
const renderedMarkdown = ref('')

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

const healthFlagChips = computed(() => {
  const h = health.value
  if (!h) return []
  const chips: string[] = []
  if (h.flags.isolated) chips.push('孤立')
  if (h.flags.expired) chips.push('待验证')
  if (h.flags.lowTrust) chips.push('低可信')
  return chips
})

function healthScoreClass(score: number) {
  if (score >= 75) return 'score-good'
  if (score >= 45) return 'score-mid'
  return 'score-low'
}

function statusLabel(s: string) {
  const m: Record<string, string> = { active: '活跃', archived: '归档', deprecated: '废弃' }
  return m[s] ?? s
}

function fragmentLink(id: string) {
  const q = route.query.vaultId ? `?vaultId=${encodeURIComponent(String(route.query.vaultId))}` : ''
  return `/fragments/${id}${q}`
}

async function loadCategoryTree() {
  const app = Application.getInstance()
  await app.getApplicationService().initialize()
  categoryTree.value = await app.getFragmentCategoryUseCases().getCategoryTree(vaultId.value)
}

async function load() {
  if (!fragmentId.value) return
  loading.value = true
  loadError.value = null
  try {
    const app = Application.getInstance()
    await app.getApplicationService().initialize()
    const fragmentUC = app.getKnowledgeFragmentUseCases()
    const healthSvc = app.getKnowledgeHealthService()
    await loadCategoryTree()
    detail.value = await fragmentUC.getFragmentDetail(fragmentId.value)
    if (detail.value) {
      health.value = await healthSvc.getFragmentHealth(fragmentId.value)
      const impactResult = await healthSvc.getImpactOfFragmentChange(fragmentId.value)
      impact.value = {
        affectedCount: impactResult.affectedCount,
        documentTitles: impactResult.documentTitles,
        highImpactCount: impactResult.highImpactCount,
      }
      childFragments.value = await healthSvc.getFragmentChildrenDetails(fragmentId.value)
      if (detail.value.derivedFromId) {
        const parentFragment = await fragmentUC.getFragmentDetail(detail.value.derivedFromId)
        parentTitle.value = parentFragment?.title ?? ''
      }
      renderedMarkdown.value = await renderMarkdown(
        detail.value.markdown,
        `fragment:${fragmentId.value}`,
      )
    }
  } catch (e) {
    console.error(e)
    loadError.value = e instanceof Error ? e.message : '加载失败'
    detail.value = null
    health.value = null
    impact.value = null
  } finally {
    loading.value = false
  }
}

async function onSaveMetadata(patch: UpdateFragmentMetadataRequest) {
  if (!fragmentId.value) return
  metadataSaving.value = true
  metadataFeedback.value = null
  try {
    const app = Application.getInstance()
    const impactResult = await app
      .getKnowledgeHealthService()
      .getImpactOfFragmentChange(fragmentId.value)
    if (impactResult.affectedCount > 0) {
      const high = impactResult.highImpactCount ?? 0
      const msg =
        high > 0
          ? `该片段被 ${impactResult.affectedCount} 个文档引用，其中近 30 天高影响文档 ${high} 个，确认保存修改？`
          : `该片段被 ${impactResult.affectedCount} 个文档引用，确认保存修改？`
      if (!window.confirm(msg)) {
        metadataSaving.value = false
        return
      }
    }
    await app.getKnowledgeFragmentUseCases().updateFragmentMetadata(fragmentId.value, patch)
    detail.value = await app.getKnowledgeFragmentUseCases().getFragmentDetail(fragmentId.value)
    health.value = await app.getKnowledgeHealthService().getFragmentHealth(fragmentId.value)
    impact.value = {
      affectedCount: impactResult.affectedCount,
      documentTitles: impactResult.documentTitles,
      highImpactCount: impactResult.highImpactCount,
    }
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

watch(fragmentId, load)
onMounted(load)
</script>

<style scoped>
.fragment-detail {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 16px;
}
.page-header h1 {
  margin: 8px 0 0 0;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
}
.back {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--accent-info, #0066cc);
  font-weight: 500;
}
.detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
}
.sk-block {
  height: 20px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--bg-tertiary, #eee) 0%,
    var(--bg-hover, #f5f5f5) 50%,
    var(--bg-tertiary, #eee) 100%
  );
  background-size: 200% 100%;
  animation: detail-shimmer 1.1s ease-in-out infinite;
}
.sk-block.lg {
  height: 120px;
}
@keyframes detail-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
.error-panel {
  padding: 20px;
  border-radius: var(--fm-radius, 10px);
  background: rgba(220, 38, 38, 0.08);
  color: var(--accent-danger, #b91c1c);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.btn-retry {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border-primary, #ddd);
  background: var(--bg-primary, #fff);
  cursor: pointer;
  font-weight: 500;
}
.loading,
.error {
  padding: 24px;
  color: var(--text-secondary, #666);
}
.layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
  align-items: start;
}
.meta-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.markdown-preview {
  padding: 14px;
  min-height: 200px;
  line-height: 1.55;
}
.health-card {
  padding: 14px;
}
.health-score-wrap {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.health-score {
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}
.health-score.score-good {
  color: var(--accent-success, #059669);
}
.health-score.score-mid {
  color: var(--accent-warning, #d97706);
}
.health-score.score-low {
  color: var(--accent-danger, #dc2626);
}
.health-score-label {
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
}
.flag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.flag-chip {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.1);
  color: var(--accent-danger, #b91c1c);
}
.health-ok {
  margin: 0;
  font-size: 0.88rem;
  color: var(--accent-success, #047857);
}
.block-card {
  padding: 14px;
}
.impact-lead {
  margin: 0 0 8px 0;
  font-size: 0.95rem;
}
.impact-high {
  margin: 0 0 8px 0;
  color: var(--accent-warning, #d97706);
  font-size: 0.86rem;
  font-weight: 600;
}
.impact-list {
  margin: 0;
  padding-left: 18px;
  font-size: 0.88rem;
  color: var(--text-secondary, #555);
  line-height: 1.45;
}
.muted {
  color: var(--text-secondary, #666);
}
.muted.small {
  font-size: 0.85rem;
  margin: 0;
}
.ref-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ref-list li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-secondary, #eee);
  font-size: 0.88rem;
}
.ref-title {
  flex: 1;
  min-width: 0;
}
.ref-date {
  flex-shrink: 0;
  color: var(--text-secondary, #888);
  font-size: 0.8rem;
}
.meta-panel-wrap {
  padding: 0;
  overflow: hidden;
}
.meta-panel-wrap :deep(.fragment-metadata-panel) {
  padding: 14px;
}
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
.derived-parent,
.derived-children {
  margin-bottom: 10px;
  font-size: 0.88rem;
}
.derived-label {
  display: block;
  font-size: 0.82rem;
  color: var(--text-secondary, #888);
  margin-bottom: 4px;
}
.derived-link {
  color: var(--accent-info, #0066cc);
  text-decoration: none;
  font-weight: 500;
}
.derived-link:hover {
  text-decoration: underline;
}
.child-list {
  list-style: none;
  margin: 6px 0 0 0;
  padding: 0;
}
.child-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-secondary, #eee);
  font-size: 0.88rem;
}
.child-list li:last-child {
  border-bottom: none;
}
.child-status {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}
.child-status.status-active {
  background: rgba(5, 150, 105, 0.1);
  color: var(--accent-success, #047857);
}
.child-status.status-archived {
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-secondary, #64748b);
}
.child-status.status-deprecated {
  background: rgba(220, 38, 38, 0.1);
  color: var(--accent-danger, #b91c1c);
}
.version-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.version-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-secondary, #eee);
  font-size: 0.88rem;
}
.version-item:last-child {
  border-bottom: none;
}
.version-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.version-date {
  font-weight: 600;
  color: var(--text-primary, #222);
}
.version-by {
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
}
.version-summary {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary, #555);
  line-height: 1.4;
}
</style>
