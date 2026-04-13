<template>
  <form class="ai-graph-provider-settings" @submit.prevent="handleSave">
    <header class="settings-header">
      <h3 class="settings-title">模型设置</h3>
      <p class="settings-helper">配置用于 AI 知识图谱构建的服务商、模型和连接地址。</p>
    </header>

    <p
      v-if="feedbackMessage"
      data-testid="ai-graph-feedback"
      class="feedback"
      :class="feedbackClass"
      role="status"
    >
      {{ feedbackMessage }}
    </p>

    <div class="form-group">
      <label for="provider">服务商</label>
      <select
        id="provider"
        v-model="draft.providerName"
        class="input"
        name="provider"
        :disabled="isBusy"
        @change="handleFieldEdit('provider')"
      >
        <option v-for="provider in providerOptions" :key="provider" :value="provider">
          {{ provider }}
        </option>
      </select>
      <p v-if="fieldErrors.provider" data-testid="ai-graph-error-provider" class="field-error">
        {{ fieldErrors.provider }}
      </p>
    </div>

    <div class="form-group">
      <label for="apiKey">API Key</label>
      <input
        id="apiKey"
        v-model="draft.apiKey"
        class="input"
        type="password"
        name="apiKey"
        :disabled="isBusy"
        @input="handleFieldEdit('apiKey')"
      />
      <p v-if="fieldErrors.apiKey" data-testid="ai-graph-error-apiKey" class="field-error">
        {{ fieldErrors.apiKey }}
      </p>
    </div>

    <div class="form-group">
      <label for="model">模型</label>
      <input
        id="model"
        v-model="draft.model"
        class="input"
        name="model"
        type="text"
        :disabled="isBusy"
        @input="handleFieldEdit('model')"
      />
      <p v-if="fieldErrors.model" data-testid="ai-graph-error-model" class="field-error">
        {{ fieldErrors.model }}
      </p>
    </div>

    <div class="form-group">
      <label for="baseUrl">连接地址</label>
      <input
        id="baseUrl"
        v-model="draft.baseUrl"
        class="input"
        name="baseUrl"
        type="text"
        :disabled="isBusy"
        @input="handleFieldEdit('baseUrl')"
      />
      <p v-if="fieldErrors.baseUrl" data-testid="ai-graph-error-baseUrl" class="field-error">
        {{ fieldErrors.baseUrl }}
      </p>
    </div>

    <div class="actions">
      <button
        type="button"
        data-testid="ai-graph-test-button"
        class="btn btn-secondary"
        :disabled="isBusy"
        @click="handleTest"
      >
        {{ status === 'testing' ? '测试连接中...' : '测试连接' }}
      </button>
      <button
        type="submit"
        data-testid="ai-graph-save-button"
        class="btn btn-primary"
        :disabled="isBusy"
      >
        {{ status === 'saving' ? '保存中...' : '保存设置' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import type { AiGraphSettingsService } from '../../application/services/ai-graph-settings.service';
import type {
  AiGraphProviderConfig,
  AiGraphProviderName
} from '../../domain/types/ai-knowledge-graph.types';

type Status = 'idle' | 'testing' | 'test_success' | 'test_error' | 'saving';
type FieldName = 'provider' | 'apiKey' | 'model' | 'baseUrl';

const providerOptions: AiGraphProviderName[] = [
  'dashscope',
  'openai',
  'deepseek',
  'volcengine',
  'ollama',
  'custom'
];

const props = defineProps<{
  service: Pick<AiGraphSettingsService, 'load' | 'save' | 'testConnection'>;
}>();

const draft = reactive<AiGraphProviderConfig>({
  providerName: 'dashscope',
  apiKey: '',
  model: '',
  baseUrl: '',
  temperature: undefined,
  maxTokens: undefined
});

const status = ref<Status>('idle');
const feedbackMessage = ref('');
const fieldErrors = reactive<Record<FieldName, string>>({
  provider: '',
  apiKey: '',
  model: '',
  baseUrl: ''
});

const isBusy = computed(() => status.value === 'testing' || status.value === 'saving');
const feedbackClass = computed(() => ({
  'is-success': status.value === 'test_success',
  'is-error': status.value === 'test_error'
}));

let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  const loaded = await props.service.load();
  Object.assign(draft, loaded);
});

onBeforeUnmount(() => {
  clearFeedbackTimer();
});

function clearFeedbackTimer() {
  if (!feedbackTimer) {
    return;
  }

  clearTimeout(feedbackTimer);
  feedbackTimer = null;
}

function resetFieldErrors() {
  fieldErrors.provider = '';
  fieldErrors.apiKey = '';
  fieldErrors.model = '';
  fieldErrors.baseUrl = '';
}

function clearFeedback() {
  clearFeedbackTimer();
  feedbackMessage.value = '';

  if (status.value === 'test_success' || status.value === 'test_error') {
    status.value = 'idle';
  }
}

function handleFieldEdit(field: FieldName) {
  fieldErrors[field] = '';

  if (status.value === 'test_error') {
    clearFeedback();
  }
}

function applyMappedFieldError(message?: string) {
  if (!message) {
    return;
  }

  if (/api key/i.test(message)) {
    fieldErrors.apiKey = '请输入有效的 API Key';
    return;
  }

  if (/base url/i.test(message)) {
    fieldErrors.baseUrl = '请输入有效的连接地址';
    return;
  }

  if (/model/i.test(message)) {
    fieldErrors.model = '请输入有效的模型名称';
    return;
  }

  if (/provider/i.test(message)) {
    fieldErrors.provider = '请选择服务商';
  }
}

function showTestSuccess(message?: string) {
  clearFeedbackTimer();
  status.value = 'test_success';
  feedbackMessage.value = message?.trim() || '连接测试成功';
  feedbackTimer = setTimeout(() => {
    if (status.value !== 'test_success') {
      return;
    }

    feedbackMessage.value = '';
    status.value = 'idle';
    feedbackTimer = null;
  }, 2500);
}

function showTestError(message?: string) {
  clearFeedbackTimer();
  status.value = 'test_error';
  feedbackMessage.value = '连接测试失败，请检查配置后重试';
  applyMappedFieldError(message);
}

async function handleTest() {
  clearFeedback();
  resetFieldErrors();
  status.value = 'testing';

  const connectionPromise = Promise.resolve().then(() => props.service.testConnection({ ...draft }));

  await nextTick();

  try {
    const result = await connectionPromise;
    resetFieldErrors();

    if (result.success) {
      showTestSuccess(result.message);
      return;
    }

    showTestError(result.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    showTestError(message);
  }
}

async function handleSave() {
  clearFeedback();
  resetFieldErrors();
  status.value = 'saving';

  try {
    await props.service.save({ ...draft });
  } finally {
    if (status.value === 'saving') {
      status.value = 'idle';
    }
  }
}
</script>

<style scoped>
.ai-graph-provider-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-title {
  margin: 0;
  font-size: 1rem;
}

.settings-helper {
  margin: 0;
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 0.9rem;
  color: var(--text-secondary, #666);
}

.input {
  padding: 8px 10px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 6px;
}

.feedback {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.feedback.is-success {
  background: rgba(5, 150, 105, 0.12);
  color: var(--accent-success, #047857);
}

.feedback.is-error {
  background: rgba(220, 38, 38, 0.1);
  color: var(--accent-danger, #b91c1c);
}

.field-error {
  margin: 0;
  color: var(--accent-danger, #b91c1c);
  font-size: 0.85rem;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-info, #2563eb);
  color: #fff;
}

.btn-secondary {
  background: var(--surface-secondary, #f3f4f6);
  color: var(--text-primary, #111827);
}

.input:focus-visible,
.btn:focus-visible {
  outline: 2px solid var(--accent-info, #2563eb);
  outline-offset: 1px;
}
</style>
