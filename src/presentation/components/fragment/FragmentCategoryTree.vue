<template>
  <div class="category-tree">
    <div class="tree-header">
      <span>分类</span>
      <button type="button" class="btn-icon" title="新建根分类" @click="emit('add-root')">＋</button>
    </div>
    <div
      class="drop-root"
      @dragover.prevent
      @drop.prevent="onDropRoot"
    >
      <p v-if="!nodes.length" class="empty">暂无分类，点击 ＋ 添加</p>
      <FragmentCategoryTreeNodeView
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :depth="0"
        :selected-id="selectedCategoryId"
        :drag-over-id="dragOverId"
        @select="emit('select', $event)"
        @add-child="emit('add-child', $event)"
        @rename="(id, name) => emit('rename', id, name)"
        @delete="emit('delete', $event)"
        @drag-start="emit('drag-start', $event)"
        @drag-end="emit('drag-end')"
        @drag-over="emit('drag-over', $event)"
        @move="(fromId, newParentId) => emit('move', fromId, newParentId)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FragmentCategoryTreeNode } from '../../../domain/types/fragment-category.types';
import FragmentCategoryTreeNodeView from './FragmentCategoryTreeNode.vue';

defineProps<{
  nodes: FragmentCategoryTreeNode[];
  selectedCategoryId: string | null;
  dragOverId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string | null];
  'add-root': [];
  'add-child': [parentId: string];
  rename: [id: string, name: string];
  delete: [id: string];
  move: [id: string, newParentId: string | null];
  'drag-over': [id: string | null];
  'drag-start': [id: string];
  'drag-end': [];
}>();

function onDropRoot(e: DragEvent) {
  const fromId = e.dataTransfer?.getData('text/plain');
  if (!fromId) return;
  emit('move', fromId, null);
}
</script>

<style scoped>
.category-tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}
.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.9rem;
}
.btn-icon {
  border: none;
  background: var(--bg-tertiary, #eee);
  border-radius: 4px;
  cursor: pointer;
  padding: 2px 8px;
}
.drop-root {
  flex: 1;
  min-height: 80px;
  border-radius: 6px;
  padding: 4px 0;
}
.empty {
  font-size: 0.85rem;
  color: var(--text-secondary, #888);
  margin: 0;
}
</style>
