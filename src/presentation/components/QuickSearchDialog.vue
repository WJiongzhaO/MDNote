<template>
  <div
    v-if="visible"
    class="quick-search-overlay"
    @click.self="handleClose"
  >
    <div class="quick-search-panel" @click.stop>
      <!-- 第一行：查找 -->
      <div class="row">
        <input
          ref="searchInputRef"
          v-model="localQuery"
          class="input"
          type="text"
          placeholder="查找"
          @keyup.enter="handleNext"
        />
        <div class="counter" v-if="total > 0">
          {{ current + 1 }} / {{ total }}
        </div>
        <div class="counter" v-else>0 / 0</div>
        <button class="icon-btn" @click="handlePrev" :disabled="!localQuery">
          ↑
        </button>
        <button class="icon-btn" @click="handleNext" :disabled="!localQuery">
          ↓
        </button>
        <div class="spacer"></div>
        <label class="option">
          <input type="checkbox" v-model="localCaseSensitive" @change="emitSearchOptions" />
          <span>Aa</span>
        </label>
        <label class="option">
          <input type="checkbox" v-model="localUseRegex" @change="emitSearchOptions" />
          <span>.*</span>
        </label>
        <select v-model="localScope" class="scope-select" @change="emitSearchOptions">
          <option value="document">当前文档</option>
          <option value="project">整个项目</option>
        </select>
        <button class="icon-btn close-btn" @click="handleClose">×</button>
      </div>

      <!-- 第二行：替换 -->
      <div class="row">
        <input
          v-model="localReplace"
          class="input"
          type="text"
          placeholder="替换为"
          @keyup.enter="handleReplaceOne"
        />
        <button class="text-btn" @click="handleReplaceOne" :disabled="!localQuery">
          替换
        </button>
        <button class="text-btn" @click="handleReplaceAll" :disabled="!localQuery">
          全部替换
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

interface Props {
  visible: boolean;
  query: string;
  replace: string;
  caseSensitive: boolean;
  useRegex: boolean;
  scope: 'document' | 'project';
  total: number;
  current: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:query', value: string): void;
  (e: 'update:replace', value: string): void;
  (e: 'options-change', options: { caseSensitive: boolean; useRegex: boolean; scope: 'document' | 'project' }): void;
  (e: 'next'): void;
  (e: 'prev'): void;
  (e: 'replace-one'): void;
  (e: 'replace-all'): void;
}>();

const localQuery = ref(props.query);
const localReplace = ref(props.replace);
const localCaseSensitive = ref(props.caseSensitive);
const localUseRegex = ref(props.useRegex);
const localScope = ref<Props['scope']>(props.scope);

const searchInputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      // 弹出时聚焦输入框
      await nextTick();
      searchInputRef.value?.focus();
      searchInputRef.value?.select();
    }
  }
);

watch(
  () => props.query,
  (val) => {
    if (val !== localQuery.value) {
      localQuery.value = val;
    }
  }
);

watch(
  () => props.replace,
  (val) => {
    if (val !== localReplace.value) {
      localReplace.value = val;
    }
  }
);

watch(localQuery, (val) => {
  emit('update:query', val);
});

watch(localReplace, (val) => {
  emit('update:replace', val);
});

const emitSearchOptions = () => {
  emit('options-change', {
    caseSensitive: localCaseSensitive.value,
    useRegex: localUseRegex.value,
    scope: localScope.value
  });
};

const handleNext = () => {
  if (!localQuery.value) return;
  emit('next');
};

const handlePrev = () => {
  if (!localQuery.value) return;
  emit('prev');
};

const handleReplaceOne = () => {
  if (!localQuery.value) return;
  emit('replace-one');
};

const handleReplaceAll = () => {
  if (!localQuery.value) return;
  emit('replace-all');
};

const handleClose = () => {
  emit('close');
};
</script>

<style scoped>
.quick-search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 2500;
}

.quick-search-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  min-width: 520px;
  max-width: 700px;
  background: #252526;
  color: #f3f3f3;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  padding: 6px 8px;
  pointer-events: auto;
  font-size: 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.row:last-child {
  margin-bottom: 0;
}

.input {
  flex: 1;
  padding: 4px 6px;
  border-radius: 2px;
  border: 1px solid #3c3c3c;
  background: #3c3c3c;
  color: #f3f3f3;
  font-size: 12px;
}

.input:focus {
  outline: none;
  border-color: #007acc;
}

.counter {
  min-width: 70px;
  text-align: center;
  color: #cccccc;
}

.icon-btn,
.text-btn {
  border: none;
  border-radius: 2px;
  background: #3c3c3c;
  color: #f3f3f3;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover,
.text-btn:hover {
  background: #454545;
}

.icon-btn:disabled,
.text-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.close-btn {
  font-size: 14px;
  padding: 0 6px;
}

.spacer {
  flex: 1;
}

.option {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #cccccc;
}

.option input {
  margin: 0;
}

.scope-select {
  background: #3c3c3c;
  color: #f3f3f3;
  border-radius: 2px;
  border: 1px solid #3c3c3c;
  padding: 2px 4px;
  font-size: 12px;
}
</style>

