<template>
  <div
    v-if="visible"
    class="resizable-sidebar"
    :style="{ width: `${width}px` }"
  >
    <div class="sidebar-content">
      <slot></slot>
    </div>
    <div
      class="resize-handle"
      @mousedown="startResize"
      @dblclick="toggleCollapse"
      :title="isCollapsed ? '展开' : '折叠'"
    >
      <div class="resize-indicator"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  visible: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  defaultWidth: 300,
  minWidth: 200,
  maxWidth: 600
});

const width = ref(props.defaultWidth);
const isCollapsed = ref(false);
const isResizing = ref(false);

const startResize = (e: MouseEvent) => {
  isResizing.value = true;
  e.preventDefault();

  const startX = e.clientX;
  const startWidth = width.value;

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return;
    
    const diff = e.clientX - startX;
    const newWidth = startWidth + diff;
    
    if (newWidth >= props.minWidth && newWidth <= props.maxWidth) {
      width.value = newWidth;
    }
  };

  const handleMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const toggleCollapse = () => {
  if (isCollapsed.value) {
    width.value = props.defaultWidth;
    isCollapsed.value = false;
  } else {
    width.value = props.minWidth;
    isCollapsed.value = true;
  }
};
</script>

<style scoped>
.resizable-sidebar {
  position: relative;
  height: 100vh;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  display: flex;
  overflow: hidden;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.resize-handle {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background: #007acc;
}

.resize-handle::before {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
}

.resize-indicator {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 20px;
  background: #ccc;
  border-radius: 1px;
  opacity: 0;
  transition: opacity 0.2s;
}

.resize-handle:hover .resize-indicator {
  opacity: 1;
}
</style>


