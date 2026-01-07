<template>
  <div v-if="show" class="export-progress-overlay">
    <div class="export-progress-modal">
      <div class="progress-header">
        <h3>📤 正在导出</h3>
      </div>
      
      <div class="progress-body">
        <div class="progress-info">
          <div class="progress-filename">
            <span class="label">文件名：</span>
            <span class="value">{{ fileName }}</span>
          </div>
          <div class="progress-format">
            <span class="label">格式：</span>
            <span class="value">{{ format.toUpperCase() }}</span>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar">
            <div 
              class="progress-bar-fill" 
              :style="{ width: progress + '%' }"
            ></div>
          </div>
          <div class="progress-text">{{ progress }}%</div>
        </div>

        <div class="progress-status">
          <div class="status-icon" :class="statusClass">
            <span v-if="status === 'processing'">⏳</span>
            <span v-else-if="status === 'success'">✅</span>
            <span v-else-if="status === 'error'">❌</span>
          </div>
          <div class="status-message">{{ statusMessage }}</div>
        </div>
      </div>

      <div class="progress-footer" v-if="status === 'success' || status === 'error'">
        <button class="btn btn-primary" @click="handleClose">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  show: boolean;
  fileName: string;
  format: string;
  progress: number;
  status: 'processing' | 'success' | 'error';
  statusMessage: string;
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const statusClass = computed(() => {
  return {
    'status-processing': props.status === 'processing',
    'status-success': props.status === 'success',
    'status-error': props.status === 'error'
  };
});

const handleClose = () => {
  emit('close');
};
</script>

<style scoped>
.export-progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.export-progress-modal {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  box-shadow: var(--shadow-lg);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.progress-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-secondary);
}

.progress-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.progress-body {
  padding: 24px;
}

.progress-info {
  margin-bottom: 20px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.progress-filename,
.progress-format {
  display: flex;
  align-items: center;
  margin: 6px 0;
}

.progress-filename .label,
.progress-format .label {
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 60px;
}

.progress-filename .value,
.progress-format .value {
  color: var(--text-primary);
  font-weight: 600;
}

.progress-bar-container {
  margin: 20px 0;
}

.progress-bar {
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-info), #0056b3);
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-text {
  text-align: center;
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.progress-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  margin-top: 20px;
}

.status-icon {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-icon.status-processing {
  background: rgba(255, 212, 59, 0.3);
  animation: pulse 1.5s infinite;
}

.status-icon.status-success {
  background: rgba(105, 219, 108, 0.3);
}

.status-icon.status-error {
  background: rgba(255, 107, 107, 0.3);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.status-message {
  flex: 1;
  color: var(--text-secondary);
  font-size: 14px;
}

.progress-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-secondary);
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-info);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: #0056b3;
}
</style>

