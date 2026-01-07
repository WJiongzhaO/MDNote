<template>
  <div class="file-tree-node">
    <div
      class="node-item"
      :class="{ 
        'is-selected': isSelected,
        'is-folder': node.type === 'folder',
        'is-file': node.type === 'file'
      }"
      :style="{ paddingLeft: `${8 + level * 16}px` }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    >
      <span
        v-if="node.type === 'folder'"
        class="expand-icon"
        @click.stop="toggleExpand"
      >
        {{ node.isExpanded ? '▼' : '▶' }}
      </span>
      <span v-else class="expand-placeholder"></span>
      
      <span class="node-icon">
        {{ node.type === 'folder' ? '📁' : getFileIcon(node.name) }}
      </span>
      
      <span class="node-name">{{ node.name }}</span>
    </div>

    <div v-if="node.type === 'folder' && node.isExpanded && node.children" class="node-children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :selected-path="selectedPath"
        :level="level + 1"
        @select="$emit('select', $event)"
        @context-menu="$emit('context-menu', $event, child)"
        @expand="$emit('expand', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isExpanded?: boolean;
}

interface Props {
  node: FileNode;
  selectedPath: string;
  level?: number;
}

const props = withDefaults(defineProps<Props>(), {
  level: 0
});

const emit = defineEmits<{
  (e: 'select', path: string): void;
  (e: 'context-menu', event: MouseEvent, node: FileNode): void;
  (e: 'expand', node: FileNode): void;
}>();

// 路径标准化函数（统一处理 Windows 路径分隔符）
const normalizePath = (p: string) => p.replace(/\\/g, '/');

const isSelected = computed(() => {
  if (!props.selectedPath || !props.node.path) return false;
  return normalizePath(props.selectedPath) === normalizePath(props.node.path);
});

const handleClick = () => {
  if (props.node.type === 'folder') {
    toggleExpand();
  } else {
    emit('select', props.node.path);
  }
};

const toggleExpand = () => {
  if (props.node.type === 'folder') {
    props.node.isExpanded = !props.node.isExpanded;
    if (props.node.isExpanded) {
      emit('expand', props.node);
    }
  }
};

const handleContextMenu = (event: MouseEvent) => {
  emit('context-menu', event, props.node);
};

const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    'md': '📝',
    'markdown': '📝',
    'txt': '📄',
    'json': '📋',
    'js': '📜',
    'ts': '📜',
    'html': '🌐',
    'css': '🎨',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🖼️',
    'svg': '🖼️'
  };
  return iconMap[ext || ''] || '📄';
};
</script>

<style scoped>
.file-tree-node {
  user-select: none;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.1s;
}

.node-item:hover {
  background: var(--bg-hover);
}

.node-item.is-selected {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.expand-icon {
  width: 16px;
  text-align: center;
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-right: 4px;
}

.node-item.is-selected .expand-icon {
  color: var(--text-inverse);
}

.expand-placeholder {
  width: 16px;
  margin-right: 4px;
}

.node-icon {
  margin-right: 6px;
  font-size: 1rem;
}

.node-name {
  flex: 1;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-children {
  margin-left: 8px;
}
</style>

