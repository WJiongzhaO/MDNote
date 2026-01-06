<template>
  <button
    class="toolbar-btn"
    :class="{ active: active, disabled: disabled }"
    :disabled="disabled"
    @click="handleClick"
    :title="tooltip"
  >
    <slot v-if="!icon">
      {{ text }}
    </slot>
    <svg v-else viewBox="0 0 24 24" fill="currentColor" v-html="icon"></svg>
    <span class="btn-tooltip" v-if="showTooltip && tooltip">{{ tooltip }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * 工具栏按钮组件
 *
 * @module presentation/components/editor/toolbar
 */

interface Props {
  text?: string;
  icon?: string;
  tooltip?: string;
  active?: boolean;
  disabled?: boolean;
  showTooltip?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  disabled: false,
  showTooltip: true
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const handleClick = () => {
  if (!props.disabled) {
    emit('click');
  }
};
</script>

<style scoped>
.toolbar-btn {
  width: 32px;
  height: 32px;
  padding: 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
  color: #495057;
}

.toolbar-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.toolbar-btn.active {
  background: #667eea;
  color: white;
}

.toolbar-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn svg {
  width: 18px;
  height: 18px;
}

.btn-tooltip {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 12px;
  white-space: nowrap;
  border-radius: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.toolbar-btn:hover .btn-tooltip {
  opacity: 1;
}
</style>
