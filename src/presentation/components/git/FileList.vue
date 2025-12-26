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
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.file-item:hover {
  background: #f9f9f9;
  border-color: #0066cc;
}

.file-item.selected {
  background: #e3f2fd;
  border-color: #0066cc;
}

.file-icon {
  font-size: 14px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  word-break: break-all;
}

.check-icon {
  font-size: 14px;
  color: #0066cc;
  font-weight: bold;
}
</style>
