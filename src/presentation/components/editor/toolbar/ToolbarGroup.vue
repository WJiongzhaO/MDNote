<template>
  <div class="toolbar-group">
    <div v-if="title" class="toolbar-group-title">{{ title }}</div>
    <div class="toolbar-group-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 工具栏分组组件
 *
 * @module presentation/components/editor/toolbar
 */

interface Props {
  title?: string;
}

defineProps<Props>();
</script>

<style scoped>
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-group-title {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-right: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toolbar-group-content {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
