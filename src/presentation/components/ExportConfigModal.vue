<template>
  <div v-if="show" class="export-config-modal-overlay" @click.self="handleCancel">
    <div class="export-config-modal">
      <div class="modal-header">
        <h2>📤 导出配置</h2>
        <button class="close-btn" @click="handleCancel">✕</button>
      </div>

      <div class="modal-body">
        <!-- 预设选择 -->
        <div class="config-section">
          <h3>📋 选择预设</h3>
          <div class="preset-buttons">
            <button
              v-for="preset in presets"
              :key="preset.key"
              :class="['preset-btn', { active: selectedPreset === preset.key }]"
              @click="selectPreset(preset.key)"
            >
              <span class="preset-icon">{{ preset.icon }}</span>
              <span class="preset-name">{{ preset.name }}</span>
              <span class="preset-desc">{{ preset.description }}</span>
            </button>
          </div>
        </div>

        <!-- 配置选项卡 -->
        <div class="config-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.icon }} {{ tab.name }}
          </button>
        </div>

        <!-- 配置内容 -->
        <div class="config-content">
          <!-- 导出配置 -->
          <div v-show="activeTab === 'export'" class="config-panel">
            <div class="export-file-config">
              <div class="export-main-action">
                <div class="action-icon">📂</div>
                <div class="action-content">
                  <h3>选择保存位置</h3>
                  <p class="action-description">点击下方按钮选择文件保存位置和文件名</p>
                  <button 
                    class="btn-select-path-large" 
                    @click="handleSelectPath"
                    type="button"
                  >
                    <span class="btn-icon">📂</span>
                    <span>选择保存位置和文件名</span>
                  </button>
                </div>
              </div>

              <div v-if="exportSavePath" class="selected-path-display">
                <div class="selected-path-label">✅ 已选择保存位置：</div>
                <div class="selected-path-value">{{ exportSavePath }}</div>
                <button class="btn-reselect" @click="handleSelectPath" type="button">
                  🔄 重新选择
                </button>
              </div>

              <div class="export-info-box">
                <div class="info-icon">ℹ️</div>
                <div class="info-content">
                  <div class="info-title">导出说明</div>
                  <ul class="info-list">
                    <li>点击"选择保存位置和文件名"按钮打开系统保存对话框</li>
                    <li>在对话框中可以：选择保存文件夹、输入文件名</li>
                    <li>默认文件名为当前文件名，您可以在对话框中修改</li>
                    <li>文件格式：{{ format.toUpperCase() }} 格式</li>
                    <li>配置完成后点击"确认导出"开始导出</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- 字体配置 -->
          <div v-show="activeTab === 'font'" class="config-panel">
            <div class="form-group">
              <label>正文字体</label>
              <select v-model="config.font.bodyFont">
                <option v-for="font in fontOptions" :key="font.value" :value="font.value">
                  {{ font.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>标题字体</label>
              <select v-model="config.font.headingFont">
                <option v-for="font in fontOptions" :key="font.value" :value="font.value">
                  {{ font.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>代码字体</label>
              <select v-model="config.font.codeFont">
                <option v-for="font in codeFontOptions" :key="font.value" :value="font.value">
                  {{ font.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- 标题配置 -->
          <div v-show="activeTab === 'heading'" class="config-panel">
            <div class="form-row">
              <div class="form-group">
                <label>H1 字号 (pt)</label>
                <input type="number" v-model.number="config.heading.h1Size" min="12" max="48" />
              </div>
              <div class="form-group">
                <label>H2 字号 (pt)</label>
                <input type="number" v-model.number="config.heading.h2Size" min="12" max="36" />
              </div>
              <div class="form-group">
                <label>H3 字号 (pt)</label>
                <input type="number" v-model.number="config.heading.h3Size" min="12" max="32" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>H4 字号 (pt)</label>
                <input type="number" v-model.number="config.heading.h4Size" min="10" max="24" />
              </div>
              <div class="form-group">
                <label>H5 字号 (pt)</label>
                <input type="number" v-model.number="config.heading.h5Size" min="10" max="20" />
              </div>
              <div class="form-group">
                <label>H6 字号 (pt)</label>
                <input type="number" v-model.number="config.heading.h6Size" min="10" max="18" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>标题颜色</label>
                <input type="color" v-model="config.heading.headingColor" />
              </div>
              <div class="form-group">
                <label>标题粗细</label>
                <select v-model="config.heading.headingWeight">
                  <option value="normal">正常</option>
                  <option value="600">半粗体</option>
                  <option value="bold">粗体</option>
                  <option value="700">加粗</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 正文配置 -->
          <div v-show="activeTab === 'body'" class="config-panel">
            <div class="form-row">
              <div class="form-group">
                <label>正文字号 (pt)</label>
                <input type="number" v-model.number="config.body.fontSize" min="8" max="20" />
              </div>
              <div class="form-group">
                <label>行高</label>
                <input type="number" v-model.number="config.body.lineHeight" min="1.0" max="3.0" step="0.1" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>文本颜色</label>
                <input type="color" v-model="config.body.textColor" />
              </div>
              <div class="form-group">
                <label>段落间距 (em)</label>
                <input type="number" v-model.number="config.body.paragraphSpacing" min="0" max="2" step="0.1" />
              </div>
            </div>
            <div class="form-group">
              <label>文本对齐</label>
              <select v-model="config.body.textAlign">
                <option value="left">左对齐</option>
                <option value="justify">两端对齐</option>
                <option value="center">居中对齐</option>
                <option value="right">右对齐</option>
              </select>
            </div>
          </div>

          <!-- 页面配置 -->
          <div v-show="activeTab === 'page'" class="config-panel">
            <div class="form-row">
              <div class="form-group">
                <label>纸张大小</label>
                <select v-model="config.page.pageSize">
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="A5">A5 (148 × 210 mm)</option>
                  <option value="Letter">Letter (216 × 279 mm)</option>
                  <option value="Legal">Legal (216 × 356 mm)</option>
                </select>
              </div>
              <div class="form-group">
                <label>页面方向</label>
                <select v-model="config.page.orientation">
                  <option value="portrait">纵向</option>
                  <option value="landscape">横向</option>
                </select>
              </div>
            </div>
            <div class="form-group-title">页边距 (cm)</div>
            <div class="form-row">
              <div class="form-group">
                <label>上</label>
                <input type="number" v-model.number="config.page.marginTop" min="0" max="5" step="0.1" />
              </div>
              <div class="form-group">
                <label>右</label>
                <input type="number" v-model.number="config.page.marginRight" min="0" max="5" step="0.1" />
              </div>
              <div class="form-group">
                <label>下</label>
                <input type="number" v-model.number="config.page.marginBottom" min="0" max="5" step="0.1" />
              </div>
              <div class="form-group">
                <label>左</label>
                <input type="number" v-model.number="config.page.marginLeft" min="0" max="5" step="0.1" />
              </div>
            </div>
          </div>

          <!-- 高级配置 -->
          <div v-show="activeTab === 'advanced'" class="config-panel">
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.includeTableOfContents" />
                <span>包含目录</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.includePageNumbers" />
                <span>包含页码</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.includeHeader" />
                <span>包含页眉</span>
              </label>
            </div>
            <div v-if="config.includeHeader" class="form-group indent">
              <label>页眉文本</label>
              <input type="text" v-model="config.headerText" placeholder="输入页眉文本" />
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.includeFooter" />
                <span>包含页脚</span>
              </label>
            </div>
            <div v-if="config.includeFooter" class="form-group indent">
              <label>页脚文本</label>
              <input type="text" v-model="config.footerText" placeholder="输入页脚文本" />
            </div>

            <div class="form-group-title">代码块样式</div>
            <div class="form-row">
              <div class="form-group">
                <label>代码字号 (pt)</label>
                <input type="number" v-model.number="config.code.fontSize" min="8" max="16" />
              </div>
              <div class="form-group">
                <label>背景颜色</label>
                <input type="color" v-model="config.code.backgroundColor" />
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.code.showLineNumbers" />
                <span>显示行号</span>
              </label>
            </div>

            <div class="form-group-title">表格样式</div>
            <div class="form-row">
              <div class="form-group">
                <label>边框颜色</label>
                <input type="color" v-model="config.table.borderColor" />
              </div>
              <div class="form-group">
                <label>表头背景</label>
                <input type="color" v-model="config.table.headerBackground" />
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.table.striped" />
                <span>斑马纹表格</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 预览提示 -->
        <div class="preview-hint">
          <span class="hint-icon">💡</span>
          <span>提示：配置将应用于 PDF 和 HTML 导出</span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleCancel">取消</button>
        <button class="btn btn-secondary" @click="resetToDefault">重置为默认</button>
        <button class="btn btn-primary" @click="handleConfirm">确认导出</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ExportConfig, ExportPreset, ExportPresets } from '../../domain/types/export-config.types';

interface Props {
  show: boolean;
  format: 'pdf' | 'html' | 'markdown';
  defaultFileName?: string;
}

interface Emits {
  (e: 'confirm', config: ExportConfig, fileName: string, savePath: string): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 当前选中的预设
const selectedPreset = ref<ExportPreset>('default');

// 当前配置
const config = ref<ExportConfig>({ ...ExportPresets.default });

// 当前激活的标签页
const activeTab = ref<'font' | 'heading' | 'body' | 'page' | 'advanced' | 'export'>('export');

// 导出文件配置
const exportFileName = ref('');
const exportSavePath = ref('');

// 预设列表
const presets = [
  { key: 'default' as ExportPreset, name: '默认', icon: '📄', description: '通用文档样式' },
  { key: 'academic' as ExportPreset, name: '学术论文', icon: '🎓', description: '适合学术写作' },
  { key: 'professional' as ExportPreset, name: '专业文档', icon: '💼', description: '商务专业风格' },
  { key: 'minimal' as ExportPreset, name: '简约', icon: '✨', description: '简洁优雅' },
  { key: 'custom' as ExportPreset, name: '自定义', icon: '⚙️', description: '自由配置' }
];

// 标签页列表
const tabs = [
  { key: 'export' as const, name: '导出', icon: '📁' },
  { key: 'font' as const, name: '字体', icon: '🔤' },
  { key: 'heading' as const, name: '标题', icon: '📑' },
  { key: 'body' as const, name: '正文', icon: '📝' },
  { key: 'page' as const, name: '页面', icon: '📄' },
  { key: 'advanced' as const, name: '高级', icon: '⚙️' }
];

// 字体选项
const fontOptions = [
  { label: '系统默认', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '宋体', value: '"SimSun", serif' },
  { label: '黑体', value: '"SimHei", sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", "SimSun", serif' },
  { label: 'Arial', value: '"Arial", "Microsoft YaHei", sans-serif' },
  { label: 'Calibri', value: '"Calibri", "Microsoft YaHei", sans-serif' },
  { label: 'Georgia', value: '"Georgia", "SimSun", serif' }
];

// 代码字体选项
const codeFontOptions = [
  { label: 'Consolas', value: '"Consolas", "Monaco", "Courier New", monospace' },
  { label: 'Monaco', value: '"Monaco", "Courier New", monospace' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Fira Code', value: '"Fira Code", "Consolas", monospace' }
];

// 选择预设
const selectPreset = (preset: ExportPreset) => {
  selectedPreset.value = preset;
  config.value = JSON.parse(JSON.stringify(ExportPresets[preset]));
};

// 重置为默认
const resetToDefault = () => {
  selectPreset('default');
};

// 选择保存路径
const handleSelectPath = async () => {
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI || !electronAPI.dialog || !electronAPI.dialog.showSaveDialog) {
    alert('文件选择功能需要在 Electron 环境中运行');
    return;
  }

  try {
    const formatExtension = props.format === 'pdf' ? 'pdf' : props.format === 'html' ? 'html' : 'md';
    const result = await electronAPI.dialog.showSaveDialog({
      title: '选择导出位置',
      defaultPath: exportFileName.value + '.' + formatExtension,
      filters: [
        { name: `${props.format.toUpperCase()} 文件`, extensions: [formatExtension] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      exportSavePath.value = result.filePath;
      // 从路径中提取文件名（不含扩展名）
      const pathParts = result.filePath.split(/[/\\]/);
      const fileNameWithExt = pathParts[pathParts.length - 1];
      const fileNameParts = fileNameWithExt.split('.');
      if (fileNameParts.length > 1) {
        fileNameParts.pop(); // 移除扩展名
      }
      exportFileName.value = fileNameParts.join('.');
    }
  } catch (error) {
    console.error('Failed to select path:', error);
    alert('选择路径失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 确认导出
const handleConfirm = () => {
  // 验证路径
  if (!exportSavePath.value.trim()) {
    alert('请先选择保存位置和文件名');
    return;
  }

  // 保存配置到 localStorage
  try {
    localStorage.setItem('export-config', JSON.stringify(config.value));
    localStorage.setItem('export-preset', selectedPreset.value);
  } catch (error) {
    console.warn('Failed to save export config:', error);
  }
  
  emit('confirm', config.value, exportFileName.value, exportSavePath.value);
};

// 取消
const handleCancel = () => {
  emit('cancel');
};

// 监听 show 属性，打开时加载保存的配置
watch(() => props.show, (newShow) => {
  if (newShow) {
    // 设置默认文件名
    exportFileName.value = props.defaultFileName || '未命名文档';
    exportSavePath.value = '';
    
    try {
      const savedConfig = localStorage.getItem('export-config');
      const savedPreset = localStorage.getItem('export-preset');
      
      if (savedConfig) {
        config.value = JSON.parse(savedConfig);
      }
      
      if (savedPreset) {
        selectedPreset.value = savedPreset as ExportPreset;
      }
    } catch (error) {
      console.warn('Failed to load export config:', error);
    }
  }
});
</script>

<style scoped>
.export-config-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.export-config-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.config-section {
  margin-bottom: 24px;
}

.config-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.preset-btn {
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.preset-btn:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.preset-btn.active {
  border-color: #007bff;
  background: #e7f1ff;
}

.preset-icon {
  font-size: 32px;
}

.preset-name {
  font-weight: 600;
  color: #2c3e50;
}

.preset-desc {
  font-size: 12px;
  color: #6c757d;
}

.config-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #dee2e6;
  margin-bottom: 24px;
}

.tab-btn {
  background: none;
  border: none;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #6c757d;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #495057;
  background: #f8f9fa;
}

.tab-btn.active {
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: 600;
}

.config-panel {
  min-height: 300px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input[type="color"] {
  width: 60px;
  height: 38px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.form-group-title {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin: 24px 0 12px 0;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label span {
  font-weight: normal;
}

.form-group.indent {
  margin-left: 28px;
}

.preview-hint {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  font-size: 14px;
  color: #856404;
}

.hint-icon {
  font-size: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
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

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

/* 导出配置特定样式 */
.export-file-config {
  max-width: 700px;
  margin: 0 auto;
}

.export-main-action {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 24px;
}

.action-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
}

.action-content h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.action-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  opacity: 0.9;
}

.btn-select-path-large {
  padding: 14px 28px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-select-path-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.btn-select-path-large .btn-icon {
  font-size: 20px;
}

.selected-path-display {
  padding: 20px;
  background: #e7f3ff;
  border: 2px solid #007bff;
  border-radius: 8px;
  margin-bottom: 24px;
}

.selected-path-label {
  font-size: 14px;
  font-weight: 600;
  color: #0056b3;
  margin-bottom: 8px;
}

.selected-path-value {
  padding: 12px;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  color: #2c3e50;
  word-break: break-all;
  margin-bottom: 12px;
  border: 1px solid #b3d9ff;
}

.btn-reselect {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-reselect:hover {
  background: #0056b3;
}

.export-info-box {
  margin-top: 24px;
  padding: 16px;
  background: #e7f3ff;
  border: 1px solid #b3d9ff;
  border-radius: 6px;
  display: flex;
  gap: 12px;
}

.info-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-title {
  font-weight: 600;
  color: #0066cc;
  margin-bottom: 8px;
}

.info-list {
  margin: 0;
  padding-left: 20px;
  color: #495057;
  font-size: 13px;
  line-height: 1.6;
}

.info-list li {
  margin: 4px 0;
}
</style>

