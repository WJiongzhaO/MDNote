<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal">
      <h3>新建知识库</h3>

      <div class="form-group">
        <label>知识库名称</label>
        <input
          type="text"
          v-model="vaultName"
          placeholder="输入知识库名称"
          @keyup.enter="handleCreate"
        />
      </div>

      <div class="form-group">
        <label>存储位置</label>
        <div class="path-selector">
          <input
            type="text"
            v-model="vaultPath"
            placeholder="选择知识库存储位置"
            readonly
          />
          <button class="btn-browse" @click="selectFolder">
            浏览...
          </button>
        </div>
        <p class="hint">点击"浏览"选择知识库存储位置，或使用默认路径</p>
      </div>

      <div class="form-group">
        <label>描述（可选）</label>
        <textarea
          v-model="vaultDescription"
          placeholder="输入知识库描述"
          rows="2"
        ></textarea>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" @click="handleClose">取消</button>
        <button
          class="btn btn-primary"
          :disabled="!canCreate"
          @click="handleCreate"
        >
          创建
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits<{
  close: [];
  create: [data: { name: string; path?: string; description?: string }];
}>();

const vaultName = ref('');
const vaultPath = ref('');
const vaultDescription = ref('');

const canCreate = computed(() => {
  return vaultName.value.trim();
});

onMounted(async () => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.vault && electronAPI.vault.getVaultsPath) {
      vaultPath.value = await electronAPI.vault.getVaultsPath();
    }
  } catch (error) {
    console.error('获取知识库存储路径失败:', error);
  }
});

const selectFolder = async () => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.dialog || !electronAPI.dialog.openFolder) {
      alert('文件对话框不可用');
      return;
    }

    const selectedPath = await electronAPI.dialog.openFolder({ skipSaveLastFolder: true });
    if (selectedPath) {
      vaultPath.value = selectedPath;
    }
  } catch (error) {
    console.error('选择文件夹失败:', error);
  }
};

const handleClose = () => {
  emit('close');
};

const handleCreate = () => {
  if (!canCreate.value) return;

  const data: { name: string; path?: string; description?: string } = {
    name: vaultName.value.trim()
  };

  if (vaultPath.value) {
    data.path = vaultPath.value;
  }

  if (vaultDescription.value.trim()) {
    data.description = vaultDescription.value.trim();
  }

  emit('create', data);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 24px;
  min-width: 480px;
  max-width: 600px;
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
}

.modal h3 {
  margin: 0 0 20px 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  font-size: 0.95rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-group input[type="text"]::placeholder,
.form-group textarea::placeholder {
  color: var(--text-tertiary);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.path-selector {
  display: flex;
  gap: 8px;
}

.path-selector input {
  flex: 1;
  cursor: pointer;
  background: var(--bg-secondary);
}

.btn-browse {
  padding: 10px 16px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-browse:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
}

.hint {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin: 6px 0 0 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}
</style>
