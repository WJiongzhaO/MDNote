<template>
  <div class="file-list">
    <div
      v-for="file in files"
      :key="file"
      :class="['file-item', { selected: isSelected(file) }]"
      @click="toggleSelect(file)"
    >
      <span class="file-icon">📄</span>
      <span class="file-name">{{ file }}</span>
      <span class="check-icon">{{ isSelected(file) ? '✓' : '' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  files: string[];
  selected: string[];
}>();

const emit = defineEmits<{
  'toggle-select': [file: string];
}>();

const isSelected = (file: string) => {
  return props.selected.includes(file);
};

const toggleSelect = (file: string) => {
  emit('toggle-select', file);
};
</script>

<style scoped>
.file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.file-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
}

.file-item.selected {
  background: var(--bg-active);
  border-color: var(--accent-primary);
}

.file-icon {
  font-size: 14px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  word-break: break-all;
  color: var(--text-primary);
}

.check-icon {
  font-size: 14px;
  color: var(--accent-primary);
  font-weight: bold;
}
</style>
