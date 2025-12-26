<template>
  <div class="git-panel" :class="{ 'loading': isLoading }">
    <!-- 仓库未初始化 -->
    <div v-if="!isRepo" class="init-section">
      <div class="init-icon">🔧</div>
      <h3>未初始化 Git 仓库</h3>
      <p class="init-desc">
        初始化后可以开始追踪文档版本历史
      </p>
      <button @click="initRepository" :disabled="isLoading" class="btn-primary">
        {{ isLoading ? '初始化中...' : '初始化 Git 仓库' }}
      </button>
    </div>

    <!-- Git 仓库已初始化 -->
    <template v-else>
      <!-- 顶部信息栏 -->
      <div class="panel-header">
        <div class="branch-info">
          <span class="branch-icon">🌿</span>
          <span class="branch-name">{{ currentBranch }}</span>
        </div>
        <button @click="refreshStatus" class="btn-icon" title="刷新状态">
          🔄
        </button>
      </div>

      <!-- 状态标签页 -->
      <div class="tabs">
        <button
          :class="['tab', { active: activeTab === 'status' }]"
          @click="activeTab = 'status'"
        >
          状态
          <span v-if="totalChanges > 0" class="badge">{{ totalChanges }}</span>
        </button>
        <button
          :class="['tab', { active: activeTab === 'history' }]"
          @click="activeTab = 'history'"
        >
          历史
          <span class="badge">{{ commits.length }}</span>
        </button>
      </div>

      <!-- 状态标签页内容 -->
      <div v-show="activeTab === 'status'" class="tab-content">
        <!-- 工作区干净 -->
        <div v-if="!hasChanges" class="clean-state">
          <div class="clean-icon">✨</div>
          <p>工作区是干净的</p>
          <small>没有需要提交的更改</small>
        </div>

        <!-- 有更改 -->
        <div v-else class="changes-section">
          <!-- 已修改 -->
          <div v-if="modifiedFiles.length > 0" class="file-group">
            <h4 class="group-header">
              <span class="group-icon">📝</span>
              已修改 ({{ modifiedFiles.length }})
            </h4>
            <FileList
              :files="modifiedFiles"
              :selected="selectedFiles"
              @toggle-select="toggleSelectFile"
            />
          </div>

          <!-- 已添加 -->
          <div v-if="addedFiles.length > 0" class="file-group">
            <h4 class="group-header">
              <span class="group-icon">➕</span>
              新增 ({{ addedFiles.length }})
            </h4>
            <FileList
              :files="addedFiles"
              :selected="selectedFiles"
              @toggle-select="toggleSelectFile"
            />
          </div>

          <!-- 已删除 -->
          <div v-if="deletedFiles.length > 0" class="file-group">
            <h4 class="group-header">
              <span class="group-icon">🗑️</span>
              删除 ({{ deletedFiles.length }})
            </h4>
            <FileList
              :files="deletedFiles"
              :selected="selectedFiles"
              @toggle-select="toggleSelectFile"
            />
          </div>

          <!-- 未跟踪 -->
          <div v-if="untrackedFiles.length > 0" class="file-group">
            <h4 class="group-header">
              <span class="group-icon">❓</span>
              未跟踪 ({{ untrackedFiles.length }})
            </h4>
            <FileList
              :files="untrackedFiles"
              :selected="selectedFiles"
              @toggle-select="toggleSelectFile"
            />
          </div>

          <!-- 提交区域 -->
          <div class="commit-section">
            <input
              v-model="commitMessage"
              type="text"
              class="commit-input"
              placeholder="输入提交信息..."
              @keydown.enter="handleCommit"
              :disabled="isLoading"
            />
            <div class="commit-actions">
              <button
                @click="handleCommit"
                :disabled="!commitMessage.trim() || isLoading"
                class="btn-primary"
              >
                提交
              </button>
              <button
                v-if="selectedFiles.length > 0"
                @click="discardSelectedChanges"
                class="btn-danger"
              >
                丢弃选中
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 历史标签页内容 -->
      <div v-show="activeTab === 'history'" class="tab-content">
        <CommitHistory
          :commits="commits"
          :is-loading="isLoading"
          @view-diff="handleViewDiff"
          @revert="handleRevert"
          @load-more="loadMoreCommits"
        />
      </div>
    </template>

    <!-- 差异对比对话框 -->
    <DiffDialog
      v-if="showDiffDialog"
      :diff="currentDiff"
      @close="showDiffDialog = false"
    />

    <!-- 错误提示 -->
    <div v-if="error" class="error-toast">
      {{ error }}
      <button @click="error = null" class="close-btn">×</button>
    </div>

    <!-- 加载遮罩 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGit } from '../../composables/git/useGit';
import FileList from './FileList.vue';
import CommitHistory from './CommitHistory.vue';
import DiffDialog from './DiffDialog.vue';

const props = defineProps<{
  repoPath: string;
}>();

// 添加调试输出
console.log('[GitPanel] RepoPath prop:', props.repoPath);

const {
  isRepo,
  status,
  commits,
  currentBranch,
  isLoading,
  error,
  hasChanges,
  modifiedFiles,
  addedFiles,
  deletedFiles,
  untrackedFiles,
  totalChanges,
  checkRepository,
  initRepository,
  refreshStatus,
  commit,
  loadMoreCommits,
  revertTo,
  discardChanges,
  compareCommits,
} = useGit(props.repoPath);

// UI 状态
const activeTab = ref<'status' | 'history'>('status');
const commitMessage = ref('');
const selectedFiles = ref<string[]>([]);
const showDiffDialog = ref(false);
const currentDiff = ref<any>(null);

// 初始化
onMounted(async () => {
  console.log('[GitPanel] onMounted - Starting initialization');
  console.log('[GitPanel] Current repoPath:', props.repoPath);

  const repo = await checkRepository();
  console.log('[GitPanel] Is repository?', repo);

  if (repo) {
    console.log('[GitPanel] Repository exists, refreshing status...');
    await refreshStatus();
    await loadMoreCommits();
    console.log('[GitPanel] Status refreshed, commits:', commits.value.length);
  } else {
    console.log('[GitPanel] No repository found');
  }
});

// 处理提交
const handleCommit = async () => {
  if (!commitMessage.value.trim()) return;

  const result = await commit(
    commitMessage.value,
    selectedFiles.value.length > 0 ? selectedFiles.value : undefined
  );

  if (result.success) {
    commitMessage.value = '';
    selectedFiles.value = [];
  }
};

// 切换文件选择
const toggleSelectFile = (file: string) => {
  const index = selectedFiles.value.indexOf(file);
  if (index >= 0) {
    selectedFiles.value.splice(index, 1);
  } else {
    selectedFiles.value.push(file);
  }
};

// 丢弃选中的更改
const discardSelectedChanges = async () => {
  if (!confirm(`确定要丢弃 ${selectedFiles.value.length} 个文件的更改吗？`)) {
    return;
  }

  await discardChanges(selectedFiles.value);
  selectedFiles.value = [];
};

// 查看差异
const handleViewDiff = async (commit: any) => {
  try {
    // 获取提交与其父提交之间的差异
    // 如果是第一次提交（没有父提交），后端会自动使用空树作为对比基准
    const diff = await compareCommits(`${commit.hash}^`, commit.hash);
    if (diff) {
      currentDiff.value = diff;
      showDiffDialog.value = true;
    }
  } catch (error) {
    console.error('Error getting diff:', error);
    error.value = '获取差异失败';
  }
};

// 回滚
const handleRevert = async (hash: string) => {
  if (!confirm('确定要回滚到此版本吗？当前更改将被丢弃。')) {
    return;
  }

  await revertTo(hash, 'mixed');
};
</script>

<style scoped>
.git-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  position: relative;
}

.git-panel.loading {
  pointer-events: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.branch-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.branch-icon {
  font-size: 16px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #f0f0f0;
}

.tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.tab {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab:hover {
  color: #333;
  background: #f9f9f9;
}

.tab.active {
  color: #0066cc;
  border-bottom-color: #0066cc;
}

.badge {
  background: #e0e0e0;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: normal;
}

.tab.active .badge {
  background: #0066cc;
  color: white;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.init-section {
  text-align: center;
  padding: 40px 20px;
}

.init-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.init-desc {
  color: #666;
  margin-bottom: 24px;
}

.btn-primary {
  background: #0066cc;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #0052a3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  background: #ff4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  margin-left: 8px;
}

.btn-danger:hover {
  background: #cc0000;
}

.clean-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.clean-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.file-group {
  margin-bottom: 24px;
}

.group-header {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.commit-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.commit-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 12px;
}

.commit-input:focus {
  outline: none;
  border-color: #0066cc;
}

.commit-actions {
  display: flex;
  gap: 8px;
}

.error-toast {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: #ffebee;
  color: #c62828;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #c62828;
  padding: 0;
  line-height: 1;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
