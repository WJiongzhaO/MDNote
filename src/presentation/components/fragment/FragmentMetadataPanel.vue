<template>
  <div class="fragment-metadata-panel">
    <h4 class="panel-title">元数据</h4>
    <p v-if="feedback" class="feedback" :class="feedback.kind" role="status">{{ feedback.message }}</p>
    <div class="form-group">
      <label>来源</label>
      <input
        v-model="form.source"
        type="text"
        class="input"
        placeholder="来源"
        :disabled="saving"
      />
    </div>
    <div class="form-group">
      <label>可信度 <span class="trust-num">{{ form.trustScore }}</span> / 5</label>
      <input
        v-model.number="form.trustScore"
        type="range"
        min="1"
        max="5"
        step="1"
        class="range"
        :disabled="saving"
      />
      <input v-model.number="form.trustScore" type="number" min="1" max="5" class="input trust-input" :disabled="saving" />
    </div>
    <div class="form-group">
      <label>最后验证时间</label>
      <input v-model="form.lastVerifiedAt" type="date" class="input" :disabled="saving" />
    </div>
    <div class="form-group">
      <label>验证人</label>
      <input v-model="form.verifiedBy" type="text" class="input" placeholder="验证人" :disabled="saving" />
    </div>
    <div class="form-group">
      <label>状态</label>
      <select v-model="form.status" class="input" :disabled="saving">
        <option value="active">活跃</option>
        <option value="archived">归档</option>
        <option value="deprecated">废弃</option>
      </select>
    </div>
    <div v-if="detail?.derivedFromId" class="form-group">
      <label>派生自</label>
      <router-link :to="`/fragments/${detail.derivedFromId}`" class="link">{{ detail.derivedFromId }}</router-link>
    </div>
    <div v-if="categoriesFlat.length" class="form-group">
      <label>分类（可多选）</label>
      <div class="category-checks">
        <label v-for="c in categoriesFlat" :key="c.id" class="check-row">
          <input type="checkbox" :value="c.id" v-model="form.categoryPathIds" :disabled="saving" />
          <span>{{ c.label }}</span>
        </label>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-primary" :disabled="saving" @click="save">
        <span v-if="saving" class="btn-spinner" aria-hidden="true" />
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { KnowledgeFragmentDetailResponse, UpdateFragmentMetadataRequest } from '../../../application/dto/knowledge-fragment.dto';
import type { FragmentStatus } from '../../../domain/types/knowledge-fragment.types';

const props = defineProps<{
  detail: KnowledgeFragmentDetailResponse | null;
  /** 扁平分类列表（id + 展示路径） */
  categoriesFlat?: Array<{ id: string; label: string }>;
  /** 正在保存（由父级在异步保存期间置 true） */
  saving?: boolean;
  /** 保存结果提示 */
  feedback?: { kind: 'success' | 'error'; message: string } | null;
}>();

const emit = defineEmits<{
  save: [patch: UpdateFragmentMetadataRequest];
}>();

const categoriesFlat = computed(() => props.categoriesFlat ?? []);
const saving = computed(() => props.saving ?? false);
const feedback = computed(() => props.feedback ?? null);

const form = ref({
  source: '',
  trustScore: 3,
  lastVerifiedAt: '' as string,
  verifiedBy: '',
  status: 'active' as FragmentStatus,
  categoryPathIds: [] as string[]
});

watch(
  () => props.detail,
  (d) => {
    if (!d) return;
    form.value = {
      source: d.source ?? '',
      trustScore: d.trustScore ?? 3,
      lastVerifiedAt: d.lastVerifiedAt ? d.lastVerifiedAt.slice(0, 10) : '',
      verifiedBy: d.verifiedBy ?? '',
      status: (d.status ?? 'active') as FragmentStatus,
      categoryPathIds: [...(d.categoryPathIds ?? [])]
    };
  },
  { immediate: true }
);

function save() {
  const patch: UpdateFragmentMetadataRequest = {
    source: form.value.source,
    trustScore: form.value.trustScore,
    lastVerifiedAt: form.value.lastVerifiedAt ? new Date(form.value.lastVerifiedAt).toISOString() : null,
    verifiedBy: form.value.verifiedBy,
    status: form.value.status,
    categoryPathIds: [...form.value.categoryPathIds]
  };
  emit('save', patch);
}
</script>

<style scoped>
.fragment-metadata-panel {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel-title {
  margin: 0 0 8px 0;
  font-size: 1rem;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-group label {
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 4px;
}
.link {
  color: var(--accent-info, #0066cc);
}
.actions {
  margin-top: 8px;
}
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary {
  background: var(--accent-info, #0066cc);
  color: #fff;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
}
.btn-primary:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}
.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: fm-spin 0.65s linear infinite;
}
@keyframes fm-spin {
  to {
    transform: rotate(360deg);
  }
}
.feedback {
  margin: 0 0 8px 0;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
}
.feedback.success {
  background: rgba(5, 150, 105, 0.12);
  color: var(--accent-success, #047857);
}
.feedback.error {
  background: rgba(220, 38, 38, 0.1);
  color: var(--accent-danger, #b91c1c);
}
.trust-num {
  font-weight: 700;
  color: var(--accent-info, #2563eb);
}
.range {
  width: 100%;
  accent-color: var(--accent-info, #2563eb);
  margin-bottom: 6px;
}
.trust-input {
  max-width: 72px;
}
.input:focus-visible,
.range:focus-visible,
.btn:focus-visible {
  outline: 2px solid var(--accent-info, #2563eb);
  outline-offset: 1px;
}
.category-checks {
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 4px;
  padding: 6px;
}
.check-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  margin-bottom: 4px;
}
</style>
