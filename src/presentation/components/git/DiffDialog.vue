<template>
  <div class="diff-dialog-overlay" @click="$emit('close')">
    <div class="diff-dialog" @click.stop>
      <div class="dialog-header">
        <h3>差异对比</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>

      <div class="dialog-content">
        <div v-if="diff.hunks.length === 0" class="no-diff">
          <p>没有差异</p>
        </div>

        <div v-else class="diff-content">
          <div v-for="(hunk, index) in diff.hunks" :key="index" class="diff-hunk">
            <div class="hunk-header">
              @@ -{{ hunk.oldStart }},{{ hunk.oldLines }} +{{ hunk.newStart }},{{ hunk.newLines }} @@
            </div>

            <div class="diff-lines">
              <div
                v-for="(line, lineIndex) in hunk.lines"
                :key="lineIndex"
                :class="['diff-line', `line-${line.type}`]"
              >
                <span class="line-prefix">{{ line.type }}</span>
                <span class="line-content">{{ line.content }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GitDiff } from '../../../domain/entities/git';

defineProps<{
  diff: GitDiff;
}>();

defineEmits<{
  'close': [];
}>();
</script>

<style scoped>
.diff-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.diff-dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-primary);
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.no-diff {
  text-align: center;
  color: var(--text-tertiary);
  padding: 40px 20px;
}

.diff-content {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.diff-hunk {
  margin-bottom: 16px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  overflow: hidden;
}

.hunk-header {
  background: var(--bg-secondary);
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.diff-lines {
  background: var(--bg-tertiary);
}

.diff-line {
  display: flex;
  line-height: 1.6;
}

.line-prefix {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  user-select: none;
}

.line-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary);
}

.line- {
  background: var(--bg-tertiary);
}

.line-+ {
  background: rgba(81, 207, 102, 0.15);
}

.line-+ .line-prefix {
  color: var(--accent-success);
}

.line- {
  background: rgba(255, 107, 107, 0.15);
}

.line-- .line-prefix {
  color: var(--accent-danger);
}
</style>
