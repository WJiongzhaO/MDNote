<template>
  <div class="health-dashboard">
    <!-- 顶部导航 -->
    <header class="hd-header">
      <div class="hd-header-left">
        <div class="hd-breadcrumb">
          <button class="breadcrumb-btn" @click="goHome">
            <span class="breadcrumb-icon">🏠</span>
            首页
          </button>
          <span class="breadcrumb-sep">/</span>
          <router-link to="/fragments" class="breadcrumb-link">片段管理</router-link>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">健康度</span>
        </div>
      </div>
    </header>

    <!-- 加载状态 -->
    <div v-if="loading" class="hd-loading">
      <div class="hd-stat-grid">
        <div v-for="n in 4" :key="n" class="hd-stat-card skeleton" />
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="loadError" class="hd-error">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ loadError }}</p>
      <button class="hd-btn hd-btn-primary" @click="loadSummary">重新加载</button>
    </div>

    <!-- 内容区 -->
    <template v-else-if="summary">
      <!-- 统计卡片 -->
      <div class="hd-stat-grid">
        <div class="hd-stat-card" :class="getStatCardClass('active')">
          <div class="stat-icon">✓</div>
          <div class="stat-content">
            <span class="stat-number">{{ summary.activeCount }}</span>
            <span class="stat-label">活跃片段</span>
          </div>
          <div class="stat-trend positive"><span>↑</span> 健康</div>
        </div>

        <div class="hd-stat-card" :class="getStatCardClass('isolated')">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <span class="stat-number">{{ summary.isolatedCount }}</span>
            <span class="stat-label">孤立片段</span>
          </div>
          <div class="stat-trend" :class="summary.isolatedCount > 0 ? 'warning' : 'positive'">
            <span v-if="summary.isolatedCount > 0">⚠</span>
            <span v-else>✓</span>
            {{ summary.isolatedCount > 0 ? '需关注' : '无' }}
          </div>
        </div>

        <div class="hd-stat-card" :class="getStatCardClass('pending')">
          <div class="stat-icon">⏱</div>
          <div class="stat-content">
            <span class="stat-number">{{ summary.pendingVerificationCount }}</span>
            <span class="stat-label">待验证</span>
          </div>
          <div
            class="stat-trend"
            :class="summary.pendingVerificationCount > 0 ? 'warning' : 'positive'"
          >
            <span v-if="summary.pendingVerificationCount > 0">!</span>
            <span v-else>✓</span>
            {{ summary.pendingVerificationCount > 0 ? '需验证' : '已完善' }}
          </div>
        </div>

        <div class="hd-stat-card" :class="getStatCardClass('lowtrust')">
          <div class="stat-icon">⚠</div>
          <div class="stat-content">
            <span class="stat-number">{{ summary.lowTrustCount }}</span>
            <span class="stat-label">低可信</span>
          </div>
          <div class="stat-trend" :class="summary.lowTrustCount > 0 ? 'negative' : 'positive'">
            <span v-if="summary.lowTrustCount > 0">⚠</span>
            <span v-else>✓</span>
            {{ summary.lowTrustCount > 0 ? '需提升' : '良好' }}
          </div>
        </div>
      </div>

      <!-- 最近活跃片段 -->
      <section class="hd-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">📈</span>
            最近活跃片段
          </h2>
          <span class="section-count">{{ summary.recentActiveFragments.length }} 个</span>
        </div>
        <div v-if="summary.recentActiveFragments.length" class="hd-list">
          <router-link
            v-for="f in summary.recentActiveFragments"
            :key="f.id"
            :to="fragmentLink(f.id)"
            class="hd-list-item"
          >
            <div class="item-icon">📄</div>
            <div class="item-content">
              <span class="item-title">{{ f.title }}</span>
              <span class="item-meta">最近引用于 {{ formatDate(f.referencedAt) }}</span>
            </div>
            <span class="item-arrow">→</span>
          </router-link>
        </div>
        <div v-else class="hd-empty">
          <span class="empty-text">暂无最近活跃片段</span>
        </div>
      </section>

      <!-- 影响面较大片段 -->
      <section class="hd-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">🔥</span>
            高影响片段
          </h2>
          <span class="section-count">{{ summary.topImpactFragments.length }} 个</span>
        </div>
        <div v-if="summary.topImpactFragments.length" class="hd-list">
          <router-link
            v-for="f in summary.topImpactFragments"
            :key="f.id"
            :to="fragmentLink(f.id)"
            class="hd-list-item"
          >
            <div class="item-badge" :class="getHealthBadgeClass(f.healthScore)">
              {{ f.healthScore }}
            </div>
            <div class="item-content">
              <span class="item-title">{{ f.title }}</span>
              <span class="item-meta">
                被引用 {{ f.referenceCount }} 次 · 健康度 {{ f.healthScore }}
              </span>
            </div>
            <span class="item-arrow">→</span>
          </router-link>
        </div>
        <div v-else class="hd-empty">
          <span class="empty-text">暂无高影响片段</span>
        </div>
      </section>
    </template>

    <!-- 无数据状态 -->
    <div v-else class="hd-no-data">
      <div class="no-data-icon">📊</div>
      <p class="no-data-text">暂无汇总数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Application } from '../../core/application'
import type { VaultHealthSummary } from '../../domain/types/reference-graph.types'

const props = defineProps<{
  vaultId?: string
}>()

const route = useRoute()
const router = useRouter()
const vaultId = computed(
  () => props.vaultId ?? (route.query.vaultId as string | undefined) ?? 'default',
)
const loading = ref(true)
const loadError = ref<string | null>(null)
const summary = ref<VaultHealthSummary | null>(null)
const highImpactTotal = computed(() =>
  (summary.value?.topImpactFragments ?? []).reduce(
    (acc, x) => acc + (x.referenceCount > 0 ? 1 : 0),
    0,
  ),
)

function fragmentLink(id: string) {
  const q = route.query.vaultId ? `?vaultId=${encodeURIComponent(String(route.query.vaultId))}` : ''
  return `/fragments/${id}${q}`
}

function goHome() {
  router.push('/')
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

function getStatCardClass(type: string) {
  if (!summary.value) return ''
  switch (type) {
    case 'active':
      return summary.value.activeCount > 0 ? 'positive' : ''
    case 'isolated':
      return summary.value.isolatedCount > 0 ? 'warning' : 'positive'
    case 'pending':
      return summary.value.pendingVerificationCount > 0 ? 'warning' : 'positive'
    case 'lowtrust':
      return summary.value.lowTrustCount > 0 ? 'negative' : 'positive'
    default:
      return ''
  }
}

function getHealthBadgeClass(score: number) {
  if (score >= 80) return 'health-good'
  if (score >= 50) return 'health-medium'
  return 'health-poor'
}

async function loadSummary() {
  loading.value = true
  loadError.value = null
  try {
    const app = Application.getInstance()
    await app.getApplicationService().initialize(vaultId.value)
    summary.value = await app.getKnowledgeHealthService().getVaultHealthSummary(vaultId.value)
  } catch (e) {
    console.error(e)
    loadError.value = e instanceof Error ? e.message : '加载失败'
    summary.value = null
  } finally {
    loading.value = false
  }
}

watch(vaultId, () => void loadSummary(), { immediate: true })
</script>

<style scoped>
.health-dashboard {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 24px;
}
.page-header h1 {
  margin: 8px 0 6px 0;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
}
.back {
  display: inline-block;
  margin-bottom: 4px;
  color: var(--accent-info, #06c);
  font-weight: 500;
}
.sub {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}
.vault-code {
  font-size: 0.88em;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-tertiary, #f0f0f0);
}
.dash-loading {
  animation: fade-in 0.2s ease;
}
.sk-cards {
  margin-bottom: 24px;
}
.card.sk {
  min-height: 96px;
  background: linear-gradient(
    90deg,
    var(--bg-tertiary, #eee) 0%,
    var(--bg-hover, #f5f5f5) 50%,
    var(--bg-tertiary, #eee) 100%
  );
  background-size: 200% 100%;
  animation: dash-shimmer 1.1s ease-in-out infinite;
  border: 1px solid var(--border-secondary, #e5e5e5);
}
.sk-section {
  padding: 16px;
  border-radius: var(--fm-radius, 10px);
  border: 1px solid var(--border-secondary, #e5e5e5);
}
.sk-line {
  height: 14px;
  border-radius: 6px;
  margin-bottom: 10px;
  background: var(--bg-tertiary, #eee);
}
.sk-line.wide {
  height: 18px;
  width: 40%;
  margin-bottom: 16px;
}
@keyframes dash-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
@keyframes fade-in {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}
.error-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px 18px;
  border-radius: var(--fm-radius, 10px);
  background: rgba(220, 38, 38, 0.08);
  color: var(--accent-danger, #b91c1c);
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
  padding: 32px;
  color: var(--text-secondary);
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}
.card {
  position: relative;
  background: var(--bg-primary, #fff);
  border-radius: var(--fm-radius, 10px);
  padding: 18px 14px;
  text-align: center;
  border: 1px solid var(--border-secondary, #e5e5e5);
  box-shadow: var(--fm-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.06));
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.card:hover {
  transform: translateY(-1px);
  box-shadow: var(--fm-shadow, 0 4px 12px rgba(0, 0, 0, 0.08));
}
.card.ok {
  border-color: rgba(5, 150, 105, 0.35);
}
.card.warn {
  border-color: rgba(217, 119, 6, 0.4);
}
.card-icon {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 0.65rem;
  opacity: 0.35;
}
.card .num {
  display: block;
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
}
.card .label {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-top: 4px;
  display: block;
}
.section {
  margin-bottom: 18px;
  padding: 16px 18px;
}
.section h2 {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary, #64748b);
  margin: 0 0 12px 0;
}
.section ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.section li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-secondary);
}
.section li:last-child {
  border-bottom: none;
}
.section a {
  color: var(--accent-info, #2563eb);
  font-weight: 500;
  text-decoration: none;
  flex: 1;
  min-width: 0;
}
.section a:hover {
  text-decoration: underline;
}
.muted {
  font-size: 0.82rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.empty-inline {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* 新的现代化样式 */
.health-dashboard {
  min-height: 100vh;
  background: var(--bg-secondary, #f9fafb);
}

.hd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: var(--bg-primary, #fff);
  border-bottom: 1px solid var(--border-primary, #e5e7eb);
}

.hd-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hd-breadcrumb {
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

.breadcrumb-link {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: var(--text-primary, #111827);
  text-decoration: underline;
}

.breadcrumb-current {
  font-size: 0.875rem;
  color: var(--text-primary, #111827);
  font-weight: 500;
}

.hd-back {
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

.hd-back:hover {
  background: var(--bg-hover, #f3f4f6);
  color: var(--text-primary, #111827);
}

.back-icon {
  font-size: 1rem;
}

.hd-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
  margin: 0;
}

.hd-loading {
  padding: 40px 24px;
}

.hd-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.hd-stat-card {
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.hd-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.hd-stat-card.skeleton {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  min-height: 100px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.hd-stat-card.positive {
  border-left: 4px solid #22c55e;
}

.hd-stat-card.warning {
  border-left: 4px solid #f59e0b;
}

.hd-stat-card.negative {
  border-left: 4px solid #ef4444;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.positive .stat-icon {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.warning .stat-icon {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.negative .stat-icon {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.stat-content {
  flex: 1;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary, #111827);
  line-height: 1.2;
}

.stat-label {
  display: block;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin-top: 4px;
}

.stat-trend {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
}

.stat-trend.positive {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.stat-trend.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.stat-trend.negative {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.hd-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.error-message {
  font-size: 1rem;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 20px;
}

.hd-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.hd-btn-primary {
  background: var(--accent-primary, #2563eb);
  color: #fff;
}

.hd-btn-primary:hover {
  background: var(--accent-primary-hover, #1d4ed8);
}

.hd-section {
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 12px;
  margin: 0 24px 24px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary, #e5e7eb);
  background: var(--bg-secondary, #f9fafb);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 1.125rem;
}

.section-count {
  font-size: 0.8125rem;
  color: var(--text-secondary, #6b7280);
  background: var(--bg-primary, #fff);
  padding: 4px 12px;
  border-radius: 999px;
}

.hd-list {
  padding: 8px;
}

.hd-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.hd-list-item:hover {
  background: var(--bg-hover, #f3f4f6);
}

.hd-list-item:last-child {
  margin-bottom: 0;
}

.item-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary, #f3f4f6);
  border-radius: 8px;
  font-size: 1rem;
}

.item-badge {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 700;
  flex-shrink: 0;
}

.item-badge.health-good {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.item-badge.health-medium {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.item-badge.health-poor {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  display: block;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary, #111827);
}

.item-meta {
  display: block;
  font-size: 0.8125rem;
  color: var(--text-secondary, #6b7280);
  margin-top: 2px;
}

.item-arrow {
  color: var(--text-tertiary, #d1d5db);
  font-size: 1.25rem;
}

.hd-empty {
  padding: 40px 20px;
  text-align: center;
}

.empty-text {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
}

.hd-no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.no-data-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-data-text {
  font-size: 1rem;
  color: var(--text-secondary, #6b7280);
}

@media (max-width: 768px) {
  .hd-stat-grid {
    grid-template-columns: 1fr;
  }
  .hd-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>
