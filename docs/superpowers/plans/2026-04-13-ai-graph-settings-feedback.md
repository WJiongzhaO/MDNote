# AI Graph Settings Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clear test/save feedback, field-level errors, loading states, and light visual polish to the existing AI graph provider settings panel inside the knowledge graph modal.

**Architecture:** Keep the work local to `AiGraphProviderSettings.vue`. Add a small amount of component-local UI state for `testing` / `test_success` / `test_error` / `saving`, a lightweight field-error map, and a top feedback block. Do not move feedback into `MarkdownEditor.vue` or add new routes.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, Vue Test Utils, scoped CSS.

---

## Planned file structure

### Modified files

- `src/presentation/components/AiGraphProviderSettings.vue` - add titled form shell, async button states, top success/error feedback, field-level error rendering, error classification, and light visual polish.
- `src/presentation/components/__tests__/AiGraphProviderSettings.test.ts` - add red/green coverage for connection success, connection failure, save success, and stale-error clearing.
- `src/presentation/components/__tests__/AiDocumentGraphPanel.test.ts` - verification-only surface; no new code planned, but keep green because it already proves the settings view is reachable from the modal path.

### Existing files to inspect before editing

- `docs/superpowers/specs/2026-04-13-ai-graph-settings-feedback-design.md`
- `src/domain/services/ai-graph-provider.service.ts`
- `src/presentation/components/fragment/FragmentMetadataPanel.vue`

---

### Task 1: Add red tests for connection feedback and error mapping

**Files:**
- Modify: `src/presentation/components/__tests__/AiGraphProviderSettings.test.ts`
- Modify later in task: `src/presentation/components/AiGraphProviderSettings.vue`

- [ ] **Step 1: Replace the smoke test with focused failing tests**

Update `src/presentation/components/__tests__/AiGraphProviderSettings.test.ts` to this exact shape:

```ts
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AiGraphProviderSettings from '../AiGraphProviderSettings.vue';

function createService(overrides: Partial<{
  load: () => Promise<unknown>;
  save: (config: unknown) => Promise<void>;
  testConnection: (config: unknown) => Promise<{ success: boolean; message?: string }>;
}> = {}) {
  return {
    load: vi.fn().mockResolvedValue({
      providerName: 'dashscope',
      apiKey: 'sk-test',
      model: 'qwen3.6-plus',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    }),
    save: vi.fn().mockResolvedValue(undefined),
    testConnection: vi.fn().mockResolvedValue({ success: true, message: '连接测试成功' }),
    ...overrides
  };
}

async function flushForm() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

describe('AiGraphProviderSettings', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the titled settings form with helper copy and action buttons', async () => {
    const wrapper = mount(AiGraphProviderSettings, {
      props: { service: createService() }
    });

    await flushForm();

    expect(wrapper.text()).toContain('模型设置');
    expect(wrapper.text()).toContain('配置用于 AI 知识图谱构建的服务商、模型和连接地址。');
    expect(wrapper.find('select[name="provider"]').exists()).toBe(true);
    expect(wrapper.find('input[name="model"]').exists()).toBe(true);
    expect(wrapper.find('input[name="baseUrl"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="ai-graph-test-button"]').text()).toContain('测试连接');
    expect(wrapper.get('[data-testid="ai-graph-save-button"]').text()).toContain('保存设置');
  });

  it('shows a success notice after a successful connection test', async () => {
    vi.useFakeTimers();
    const service = createService();
    const wrapper = mount(AiGraphProviderSettings, {
      props: { service }
    });

    await flushForm();

    await wrapper.get('[data-testid="ai-graph-test-button"]').trigger('click');
    expect(wrapper.get('[data-testid="ai-graph-test-button"]').text()).toContain('测试连接中...');

    await flushForm();

    expect(service.testConnection).toHaveBeenCalledWith(
      expect.objectContaining({ providerName: 'dashscope', model: 'qwen3.6-plus' })
    );
    expect(wrapper.get('[data-testid="ai-graph-feedback"]').text()).toContain('连接测试成功');

    vi.advanceTimersByTime(2500);
    await nextTick();

    expect(wrapper.find('[data-testid="ai-graph-feedback"]').exists()).toBe(false);
  });

  it('shows an error banner and api key field error after a failed connection test', async () => {
    const service = createService({
      testConnection: vi.fn().mockRejectedValue(new Error('API key is required for provider "openai".'))
    });
    const wrapper = mount(AiGraphProviderSettings, {
      props: { service }
    });

    await flushForm();
    await wrapper.get('select[name="provider"]').setValue('openai');
    await wrapper.get('input[name="apiKey"]').setValue('');

    await wrapper.get('[data-testid="ai-graph-test-button"]').trigger('click');
    await flushForm();

    expect(wrapper.get('[data-testid="ai-graph-feedback"]').classes()).toContain('is-error');
    expect(wrapper.text()).toContain('连接测试失败，请检查配置后重试');
    expect(wrapper.get('[data-testid="ai-graph-error-apiKey"]').text()).toContain('请输入有效的 API Key');
  });
});
```

- [ ] **Step 2: Run the focused component test and verify RED**

Run: `npm run test:unit -- src/presentation/components/__tests__/AiGraphProviderSettings.test.ts`

Expected: FAIL because `AiGraphProviderSettings.vue` does not yet render the Chinese title/helper copy, feedback block, data-testids, loading labels, or inline field errors.

- [ ] **Step 3: Implement the minimal connection-feedback UI to make these tests pass**

Update `src/presentation/components/AiGraphProviderSettings.vue` with these concrete pieces.

Replace the template body with this structure:

```vue
<template>
  <form class="ai-graph-provider-settings" @submit.prevent="handleSave">
    <div class="ai-graph-provider-settings__header">
      <h4>模型设置</h4>
      <p>配置用于 AI 知识图谱构建的服务商、模型和连接地址。</p>
    </div>

    <p
      v-if="feedback"
      :class="['ai-graph-provider-settings__feedback', `is-${feedback.kind}`]"
      data-testid="ai-graph-feedback"
      role="status"
    >
      {{ feedback.message }}
    </p>

    <div class="ai-graph-provider-settings__field">
      <label for="provider">Provider</label>
      <select id="provider" v-model="draft.providerName" name="provider" @change="clearFieldError('provider')">
        <option v-for="provider in providerOptions" :key="provider" :value="provider">
          {{ provider }}
        </option>
      </select>
      <p v-if="fieldErrors.provider" class="ai-graph-provider-settings__error" data-testid="ai-graph-error-provider">
        {{ fieldErrors.provider }}
      </p>
    </div>

    <div class="ai-graph-provider-settings__field">
      <label for="apiKey">API Key</label>
      <input id="apiKey" v-model="draft.apiKey" type="password" name="apiKey" @input="clearFieldError('apiKey')" />
      <p v-if="fieldErrors.apiKey" class="ai-graph-provider-settings__error" data-testid="ai-graph-error-apiKey">
        {{ fieldErrors.apiKey }}
      </p>
    </div>

    <div class="ai-graph-provider-settings__field">
      <label for="model">Model</label>
      <input id="model" v-model="draft.model" name="model" type="text" @input="clearFieldError('model')" />
      <p v-if="fieldErrors.model" class="ai-graph-provider-settings__error" data-testid="ai-graph-error-model">
        {{ fieldErrors.model }}
      </p>
    </div>

    <div class="ai-graph-provider-settings__field">
      <label for="baseUrl">Base URL</label>
      <input id="baseUrl" v-model="draft.baseUrl" name="baseUrl" type="text" @input="clearFieldError('baseUrl')" />
      <p v-if="fieldErrors.baseUrl" class="ai-graph-provider-settings__error" data-testid="ai-graph-error-baseUrl">
        {{ fieldErrors.baseUrl }}
      </p>
    </div>

    <div class="ai-graph-provider-settings__actions">
      <button type="button" data-testid="ai-graph-test-button" :disabled="isBusy" @click="handleTest">
        {{ status === 'testing' ? '测试连接中...' : '测试连接' }}
      </button>
      <button type="submit" data-testid="ai-graph-save-button" :disabled="isBusy">
        {{ status === 'saving' ? '保存中...' : '保存设置' }}
      </button>
    </div>
  </form>
</template>
```

In the script, add these exact helpers above `onMounted`:

```ts
type SettingsField = 'provider' | 'apiKey' | 'model' | 'baseUrl';
type SettingsStatus = 'idle' | 'testing' | 'test_success' | 'test_error' | 'saving';

const status = ref<SettingsStatus>('idle');
const feedback = ref<{ kind: 'success' | 'error'; message: string } | null>(null);
const fieldErrors = reactive<Record<SettingsField, string>>({
  provider: '',
  apiKey: '',
  model: '',
  baseUrl: ''
});
const isBusy = computed(() => status.value === 'testing' || status.value === 'saving');
let successTimer: ReturnType<typeof setTimeout> | null = null;

function clearSuccessTimer() {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
}

function clearAllErrors() {
  fieldErrors.provider = '';
  fieldErrors.apiKey = '';
  fieldErrors.model = '';
  fieldErrors.baseUrl = '';
}

function clearFieldError(field: SettingsField) {
  fieldErrors[field] = '';
  if (feedback.value?.kind === 'error') {
    feedback.value = null;
  }
}

function resetBeforeAction(nextStatus: Extract<SettingsStatus, 'testing' | 'saving'>) {
  clearSuccessTimer();
  clearAllErrors();
  feedback.value = null;
  status.value = nextStatus;
}

function mapMessageToField(message: string): SettingsField | null {
  const normalized = message.toLowerCase();
  if (normalized.includes('api key')) return 'apiKey';
  if (normalized.includes('model')) return 'model';
  if (normalized.includes('base url') || normalized.includes('baseurl') || normalized.includes('url')) return 'baseUrl';
  if (normalized.includes('provider')) return 'provider';
  return null;
}

function getFieldMessage(field: SettingsField) {
  switch (field) {
    case 'apiKey':
      return '请输入有效的 API Key';
    case 'model':
      return '请输入模型名称';
    case 'baseUrl':
      return '请输入有效的服务地址';
    case 'provider':
      return '请选择可用的服务商';
  }
}

function showSuccess(message: string) {
  clearSuccessTimer();
  feedback.value = { kind: 'success', message };
  status.value = 'test_success';
  successTimer = setTimeout(() => {
    feedback.value = null;
    status.value = 'idle';
    successTimer = null;
  }, 2500);
}

function showFailure(message: string, rawMessage?: string) {
  feedback.value = { kind: 'error', message };
  status.value = 'test_error';
  if (!rawMessage) return;
  const field = mapMessageToField(rawMessage);
  if (field) {
    fieldErrors[field] = getFieldMessage(field);
  }
}
```

Then replace `handleTest` with:

```ts
async function handleTest() {
  resetBeforeAction('testing');
  try {
    const result = await props.service.testConnection({ ...draft });
    if (!result.success) {
      showFailure(result.message ?? '连接测试失败，请检查配置后重试');
      return;
    }
    showSuccess(result.message ?? '连接测试成功');
  } catch (error) {
    showFailure(
      '连接测试失败，请检查配置后重试',
      error instanceof Error ? error.message : String(error)
    );
  }
}
```

Also add these imports at the top:

```ts
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
```

And clean up the timer on unmount:

```ts
onBeforeUnmount(() => {
  clearSuccessTimer();
});
```

Add this minimal scoped CSS block below the script:

```css
.ai-graph-provider-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.ai-graph-provider-settings__header h4 {
  margin: 0;
  font-size: 1rem;
}

.ai-graph-provider-settings__header p {
  margin: 6px 0 0;
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
}

.ai-graph-provider-settings__feedback {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.ai-graph-provider-settings__feedback.is-success {
  background: rgba(5, 150, 105, 0.12);
  color: var(--accent-success, #047857);
}

.ai-graph-provider-settings__feedback.is-error {
  background: rgba(220, 38, 38, 0.1);
  color: var(--accent-danger, #b91c1c);
}

.ai-graph-provider-settings__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-graph-provider-settings__error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--accent-danger, #b91c1c);
}

.ai-graph-provider-settings__actions {
  display: flex;
  gap: 10px;
}
```

- [ ] **Step 4: Re-run the focused component test and verify GREEN**

Run: `npm run test:unit -- src/presentation/components/__tests__/AiGraphProviderSettings.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the connection-feedback slice**

```bash
git add src/presentation/components/AiGraphProviderSettings.vue src/presentation/components/__tests__/AiGraphProviderSettings.test.ts
git commit -m "feat: add ai graph connection feedback"
```

---

### Task 2: Add red tests for save feedback and stale-error clearing

**Files:**
- Modify: `src/presentation/components/__tests__/AiGraphProviderSettings.test.ts`
- Modify later in task: `src/presentation/components/AiGraphProviderSettings.vue`

- [ ] **Step 1: Add failing save and error-clearing tests**

Append these tests to `src/presentation/components/__tests__/AiGraphProviderSettings.test.ts`:

```ts
it('shows a success notice after saving settings', async () => {
  vi.useFakeTimers();
  const service = createService({
    save: vi.fn().mockResolvedValue(undefined)
  });
  const wrapper = mount(AiGraphProviderSettings, {
    props: { service }
  });

  await flushForm();

  await wrapper.get('[data-testid="ai-graph-save-button"]').trigger('click');
  expect(wrapper.get('[data-testid="ai-graph-save-button"]').text()).toContain('保存中...');

  await flushForm();

  expect(service.save).toHaveBeenCalledWith(
    expect.objectContaining({ providerName: 'dashscope', model: 'qwen3.6-plus' })
  );
  expect(wrapper.get('[data-testid="ai-graph-feedback"]').text()).toContain('设置已保存');
});

it('clears the api key error and failure banner after the api key changes', async () => {
  const service = createService({
    testConnection: vi.fn().mockRejectedValue(new Error('API key is required for provider "openai".'))
  });
  const wrapper = mount(AiGraphProviderSettings, {
    props: { service }
  });

  await flushForm();
  await wrapper.get('select[name="provider"]').setValue('openai');
  await wrapper.get('input[name="apiKey"]').setValue('');

  await wrapper.get('[data-testid="ai-graph-test-button"]').trigger('click');
  await flushForm();

  expect(wrapper.get('[data-testid="ai-graph-feedback"]').text()).toContain('连接测试失败');
  expect(wrapper.get('[data-testid="ai-graph-error-apiKey"]').text()).toContain('请输入有效的 API Key');

  await wrapper.get('input[name="apiKey"]').setValue('sk-fixed');
  await nextTick();

  expect(wrapper.find('[data-testid="ai-graph-feedback"]').exists()).toBe(false);
  expect(wrapper.find('[data-testid="ai-graph-error-apiKey"]').exists()).toBe(false);
});
```

- [ ] **Step 2: Run the focused component test again and verify RED**

Run: `npm run test:unit -- src/presentation/components/__tests__/AiGraphProviderSettings.test.ts`

Expected: FAIL because save feedback is not implemented yet and the existing field-clear logic does not fully clear stale banner/error state for the edited field.

- [ ] **Step 3: Implement save success feedback and explicit stale-error clearing**

In `src/presentation/components/AiGraphProviderSettings.vue`, update `clearFieldError` so it fully resets the component back to idle after an error:

```ts
function clearFieldError(field: SettingsField) {
  fieldErrors[field] = '';
  if (feedback.value?.kind === 'error') {
    feedback.value = null;
  }
  if (status.value === 'test_error') {
    status.value = 'idle';
  }
}
```

Then replace `handleSave` with:

```ts
async function handleSave() {
  resetBeforeAction('saving');
  try {
    await props.service.save({ ...draft });
    feedback.value = { kind: 'success', message: '设置已保存' };
    status.value = 'idle';
    clearSuccessTimer();
    successTimer = setTimeout(() => {
      feedback.value = null;
      successTimer = null;
    }, 2500);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    feedback.value = {
      kind: 'error',
      message: '保存失败，请检查配置后重试'
    };
    status.value = 'test_error';
    const field = mapMessageToField(rawMessage);
    if (field) {
      fieldErrors[field] = getFieldMessage(field);
    }
  }
}
```

Polish the input/button styling to match nearby product patterns by extending the CSS with:

```css
.ai-graph-provider-settings label {
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
}

.ai-graph-provider-settings input,
.ai-graph-provider-settings select {
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--border-primary, #d6d6d6);
  border-radius: 8px;
  background: var(--bg-primary, #fff);
}

.ai-graph-provider-settings input:focus-visible,
.ai-graph-provider-settings select:focus-visible,
.ai-graph-provider-settings button:focus-visible {
  outline: 2px solid var(--accent-info, #2563eb);
  outline-offset: 1px;
}

.ai-graph-provider-settings button {
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.ai-graph-provider-settings button[type='submit'] {
  border: none;
  background: var(--accent-info, #2563eb);
  color: #fff;
}

.ai-graph-provider-settings button[type='button'] {
  border: 1px solid var(--border-primary, #d6d6d6);
  background: transparent;
}

.ai-graph-provider-settings button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
```

- [ ] **Step 4: Re-run the focused component test and verify GREEN**

Run: `npm run test:unit -- src/presentation/components/__tests__/AiGraphProviderSettings.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the save-feedback slice**

```bash
git add src/presentation/components/AiGraphProviderSettings.vue src/presentation/components/__tests__/AiGraphProviderSettings.test.ts
git commit -m "feat: polish ai graph settings feedback"
```

---

### Task 3: Run the settings verification sweep

**Files:**
- Verify: `src/presentation/components/__tests__/AiGraphProviderSettings.test.ts`
- Verify: `src/presentation/components/__tests__/AiDocumentGraphPanel.test.ts`
- Verify: `src/presentation/components/AiGraphProviderSettings.vue`

- [ ] **Step 1: Run the focused UI regression suite**

Run:

```bash
npm run test:unit -- \
  src/presentation/components/__tests__/AiGraphProviderSettings.test.ts \
  src/presentation/components/__tests__/AiDocumentGraphPanel.test.ts
```

Expected: PASS. This confirms both the refined settings form and the existing modal path stay green.

- [ ] **Step 2: Run the lightest build verification**

Run: `npm run build`

Expected: PASS for `vue-tsc && vite build`.

- [ ] **Step 3: Commit the verification sweep**

```bash
git add src/presentation/components/AiGraphProviderSettings.vue src/presentation/components/__tests__/AiGraphProviderSettings.test.ts
git commit -m "test: verify ai graph settings feedback"
```

---

## Spec coverage self-review

- **Top success notice for test/save** -> Task 1 Step 3 and Task 2 Step 3.
- **Persistent error banner + field-level errors** -> Task 1 Step 3 and Task 2 Step 3.
- **Loading/disabled button states** -> Task 1 Steps 1-4 and Task 2 Steps 1-4.
- **Small visual polish only** -> Task 2 Step 3.
- **No modal-level redesign / no new routes** -> all tasks stay within `AiGraphProviderSettings.vue` and verification only checks the existing modal path.

