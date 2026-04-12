<template>
  <form class="ai-graph-provider-settings" @submit.prevent="handleSave">
    <div>
      <label for="provider">Provider</label>
      <select id="provider" v-model="draft.providerName" name="provider">
        <option v-for="provider in providerOptions" :key="provider" :value="provider">
          {{ provider }}
        </option>
      </select>
    </div>

    <div>
      <label for="apiKey">API Key</label>
      <input id="apiKey" v-model="draft.apiKey" type="password" name="apiKey" />
    </div>

    <div>
      <label for="model">Model</label>
      <input id="model" v-model="draft.model" name="model" type="text" />
    </div>

    <div>
      <label for="baseUrl">Base URL</label>
      <input id="baseUrl" v-model="draft.baseUrl" name="baseUrl" type="text" />
    </div>

    <div>
      <button type="button" @click="handleTest">Test Connection</button>
      <button type="submit">Save</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import type { AiGraphSettingsService } from '../../application/services/ai-graph-settings.service';
import type { AiGraphProviderConfig, AiGraphProviderName } from '../../domain/types/ai-knowledge-graph.types';

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

onMounted(async () => {
  const loaded = await props.service.load();
  Object.assign(draft, loaded);
});

async function handleTest() {
  await props.service.testConnection({ ...draft });
}

async function handleSave() {
  await props.service.save({ ...draft });
}
</script>
