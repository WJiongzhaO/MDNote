<template>
  <div class="fragment-recommendation-panel fragment-rec-panel">
    <div class="panel-head">
      <span class="panel-title">推荐片段</span>
      <button type="button" class="btn-refresh" title="刷新推荐" :disabled="loading" @click="refresh">↻</button>
    </div>
    <p class="context-hint">
      上下文：标题 {{ props.titleKeywords.length }} 词 · 标签 {{ props.documentTags.length }} 项 · 已引用 {{ props.alreadyReferencedFragmentIds.length }} 条
    </p>
    <div v-if="loading" class="rec-skeleton" aria-busy="true">
      <div v-for="n in 5" :key="n" class="sk-line" />
    </div>
    <ul v-else-if="items.length" class="rec-list">
      <li v-for="item in items" :key="item.fragmentId" class="rec-item">
        <button type="button" class="rec-title" @click="$emit('insert', item.fragmentId)">
          {{ item.title }}
        </button>
        <span v-if="item.reason" class="rec-reason">{{ item.reason }}</span>
        <span class="rec-score" :title="'相关度 ' + item.score">{{ Math.round(item.score) }}</span>
      </li>
    </ul>
    <div v-else class="rec-empty">
      <p class="empty-title">暂无推荐</p>
      <p class="empty-hint">可补充标题关键词、frontmatter 的 <code>tags:</code>，或在正文中引用片段后重试。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { Application } from '../../../core/application';
import type { RecommendedFragment } from '../../../domain/types/reference-graph.types';

const props = defineProps<{
  titleKeywords: string[];
  documentTags: string[];
  /** 正文关键词（已在外层剔除代码块与引用语法） */
  contextKeywords?: string[];
  alreadyReferencedFragmentIds: string[];
  recentUsedFragmentIds?: string[];
}>();

defineEmits<{
  insert: [fragmentId: string];
}>();

const loading = ref(false);
const items = ref<RecommendedFragment[]>([]);
const referencedCategoryIds = ref<string[]>([]);
const refCategoryCache = new Map<string, string[]>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 避免对 props 整对象 deep watch，降低无关刷新 */
const contextFingerprint = computed(() =>
  JSON.stringify({
    t: props.titleKeywords,
    d: props.documentTags,
    c: props.contextKeywords ?? [],
    a: props.alreadyReferencedFragmentIds,
    r: props.recentUsedFragmentIds ?? []
  })
);

async function refresh() {
  loading.value = true;
  try {
    const app = Application.getInstance();
    await app.getApplicationService().initialize();
    const fragmentUC = app.getKnowledgeFragmentUseCases();
    const aggregatedCategoryIds = new Set<string>();
    for (const fragmentId of props.alreadyReferencedFragmentIds ?? []) {
      try {
        let categories = refCategoryCache.get(fragmentId);
        if (!categories) {
          const detail = await fragmentUC.getFragmentDetail(fragmentId);
          categories = detail?.categoryPathIds ?? [];
          refCategoryCache.set(fragmentId, categories);
        }
        for (const cid of categories) {
          aggregatedCategoryIds.add(cid);
        }
      } catch (e) {
        console.warn('[RecommendationPanel] load referenced fragment detail failed', fragmentId, e);
      }
    }
    referencedCategoryIds.value = [...aggregatedCategoryIds];
    const rec = app.getRecommendationService();
    items.value = await rec.recommendFragments(
      {
        documentTitleKeywords: props.titleKeywords,
        documentTags: props.documentTags,
        contextKeywords: props.contextKeywords ?? [],
        contextCategoryIds: referencedCategoryIds.value,
        alreadyReferencedFragmentIds: props.alreadyReferencedFragmentIds,
        recentUsedFragmentIds: props.recentUsedFragmentIds ?? []
      },
      15
    );
  } catch (e) {
    console.error('[RecommendationPanel]', e);
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function scheduleRefresh() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void refresh();
  }, 500);
}

watch(contextFingerprint, () => scheduleRefresh());

onMounted(() => void refresh());
</script>

<style scoped>
.fragment-recommendation-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 0 8px 8px;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 4px;
  font-weight: 600;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--border-secondary);
}
.panel-title {
  letter-spacing: 0.02em;
}
.context-hint {
  margin: 6px 4px 8px;
  color: var(--text-secondary, #666);
  font-size: 0.75rem;
}
.btn-refresh {
  border: none;
  background: var(--bg-tertiary, #f0f0f0);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  transition: background 0.15s, transform 0.15s;
}
.btn-refresh:hover:not(:disabled) {
  background: var(--bg-hover, #e8e8e8);
}
.btn-refresh:active:not(:disabled) {
  transform: rotate(90deg);
}
.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.rec-skeleton {
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--bg-tertiary, #eee) 0%,
    var(--bg-hover, #f5f5f5) 50%,
    var(--bg-tertiary, #eee) 100%
  );
  background-size: 200% 100%;
  animation: rec-shimmer 1.1s ease-in-out infinite;
}
@keyframes rec-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
.rec-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}
.rec-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  padding: 10px 8px;
  margin-bottom: 2px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 0.85rem;
  transition: background 0.12s, border-color 0.12s;
}
.rec-item:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.04));
  border-color: var(--border-secondary, #e5e5e5);
}
.rec-title {
  flex: 1;
  min-width: 0;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--rec-accent, var(--accent-info, #06c));
  cursor: pointer;
  padding: 0;
  font-weight: 500;
}
.rec-title:hover {
  text-decoration: underline;
}
.rec-reason {
  flex: 100%;
  color: var(--text-tertiary, #888);
  font-size: 0.75rem;
  line-height: 1.35;
}
.rec-score {
  flex-shrink: 0;
  min-width: 1.5rem;
  text-align: center;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--bg-tertiary, #f0f0f0);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
}
.rec-empty {
  padding: 16px 8px;
  text-align: center;
}
.empty-title {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: var(--text-primary, #222);
  font-size: 0.9rem;
}
.empty-hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--text-secondary, #666);
}
.empty-hint code {
  font-size: 0.85em;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--bg-tertiary, #f0f0f0);
}
</style>
