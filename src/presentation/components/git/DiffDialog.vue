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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.diff-dialog {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.no-diff {
  text-align: center;
  color: #999;
  padding: 40px 20px;
}

.diff-content {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.diff-hunk {
  margin-bottom: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.hunk-header {
  background: #f5f5f5;
  padding: 8px 12px;
  font-size: 12px;
  color: #666;
  border-bottom: 1px solid #e0e0e0;
}

.diff-lines {
  background: #fafafa;
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
}

.line- {
  background: #fafafa;
}

.line-+ {
  background: #e6ffed;
}

.line-+ .line-prefix {
  color: #22863a;
}

.line- {
  background: #ffeef0;
}

.line-- .line-prefix {
  color: #f85149;
}
</style>
