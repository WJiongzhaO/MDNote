<template>
  <div class="commit-history">
    <div v-if="commits.length === 0" class="empty-state">
      <p>暂无提交记录</p>
    </div>

    <div v-else class="commit-list">
      <div
        v-for="commit in commits"
        :key="commit.hash"
        class="commit-item"
      >
        <div class="commit-header">
          <span class="commit-hash">{{ commit.shortHash }}</span>
          <span class="commit-date">{{ formatDate(commit.date) }}</span>
        </div>
        <div class="commit-message">{{ commit.message }}</div>
        <div class="commit-author">👤 {{ commit.author }}</div>
        <div class="commit-actions">
          <button
            @click="$emit('view-diff', commit)"
            class="btn-small"
            title="查看差异"
          >
            查看差异
          </button>
          <button
            @click="$emit('revert', commit.hash)"
            class="btn-small btn-warning"
            title="回滚到此版本"
          >
            回滚
          </button>
        </div>
      </div>

      <button
        v-if="commits.length > 0"
        @click="$emit('load-more')"
        class="load-more-btn"
      >
        加载更多
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GitCommit } from '../../../domain/entities/git';

defineProps<{
  commits: GitCommit[];
  isLoading: boolean;
}>();

defineEmits<{
  'view-diff': [commit: GitCommit];
  'revert': [hash: string];
  'load-more': [];
}>();

const formatDate = (date: Date | string) => {
  // 处理 Electron IPC 传输后 Date 被转换为字符串的情况
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  return dateObj.toLocaleDateString('zh-CN');
};
</script>

<style scoped>
.commit-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
}

.commit-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.commit-item {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  padding: 12px;
  transition: box-shadow 0.2s;
}

.commit-item:hover {
  box-shadow: var(--shadow-md);
}

.commit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.commit-hash {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--accent-primary);
  font-weight: bold;
}

.commit-date {
  font-size: 12px;
  color: var(--text-tertiary);
}

.commit-message {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.4;
}

.commit-author {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.commit-actions {
  display: flex;
  gap: 8px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid var(--border-secondary);
  background: var(--bg-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}

.btn-small:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.btn-warning {
  color: var(--accent-danger);
}

.btn-warning:hover {
  background: rgba(255, 107, 107, 0.1);
  border-color: var(--accent-danger);
}

.load-more-btn {
  width: 100%;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}

.load-more-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}
</style>
