<template>
  <div class="tree-node">
    <div
      class="row"
      :class="{
        selected: selectedId === node.id,
        'drag-over': dragOverId === node.id
      }"
      :style="{ paddingLeft: `${8 + depth * 14}px` }"
      draggable="true"
      @dragstart="handleDragStart"
      @dragend="$emit('drag-end')"
      @dragover.prevent="$emit('drag-over', node.id)"
      @dragleave="$emit('drag-over', null)"
      @drop.prevent.stop="handleDrop"
    >
      <button
        v-if="node.children?.length"
        type="button"
        class="expand"
        @click.stop="expanded = !expanded"
      >
        {{ expanded ? '▼' : '▶' }}
      </button>
      <span v-else class="expand-placeholder"></span>
      <span class="label" @click="$emit('select', node.id)">{{ node.name }}</span>
      <span class="actions">
        <button type="button" title="子分类" @click.stop="$emit('add-child', node.id)">＋</button>
        <button type="button" title="重命名" @click.stop="doRename">✎</button>
        <button type="button" title="删除" @click.stop="$emit('delete', node.id)">🗑</button>
      </span>
    </div>
    <div v-if="expanded && node.children?.length" class="children">
      <FragmentCategoryTreeNode
        v-for="ch in node.children"
        :key="ch.id"
        :node="ch"
        :depth="depth + 1"
        :selected-id="selectedId"
        :drag-over-id="dragOverId"
        @select="$emit('select', $event)"
        @add-child="$emit('add-child', $event)"
        @rename="(id, name) => $emit('rename', id, name)"
        @delete="$emit('delete', $event)"
        @drag-start="$emit('drag-start', $event)"
        @drag-end="$emit('drag-end')"
        @drag-over="$emit('drag-over', $event)"
        @move="$emit('move', $event[0], $event[1])"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FragmentCategoryTreeNode } from '../../../domain/types/fragment-category.types';

const props = defineProps<{
  node: FragmentCategoryTreeNode;
  depth: number;
  selectedId: string | null;
  dragOverId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string];
  'add-child': [parentId: string];
  rename: [id: string, name: string];
  delete: [id: string];
  'drag-start': [id: string];
  'drag-end': [];
  'drag-over': [id: string | null];
  move: [fromId: string, newParentId: string | null];
}>();

const expanded = ref(true);

function handleDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/plain', props.node.id);
  e.dataTransfer!.effectAllowed = 'move';
  emit('drag-start', props.node.id);
}

function handleDrop(e: DragEvent) {
  const fromId = e.dataTransfer?.getData('text/plain');
  if (fromId && fromId !== props.node.id) {
    emit('move', fromId, props.node.id);
  }
}

function doRename() {
  const name = window.prompt('新名称', props.node.name);
  if (name && name.trim()) emit('rename', props.node.id, name.trim());
}
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.88rem;
}
.row:hover {
  background: var(--bg-hover, #f0f0f0);
}
.row.selected {
  background: var(--bg-active, #e8f0fe);
}
.row.drag-over {
  outline: 2px dashed var(--accent-info, #06c);
}
.expand {
  width: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.expand-placeholder {
  width: 20px;
  display: inline-block;
}
.label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions button {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.7;
}
.actions button:hover {
  opacity: 1;
}
.children {
  margin-left: 0;
}
</style>
