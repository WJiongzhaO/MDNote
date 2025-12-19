<template>
  <div class="mermaid-editor">
    <!-- 编辑器头部 -->
    <div class="editor-header">
      <div class="chart-type-selector">
        <label for="chartType">图表类型:</label>
        <select id="chartType" v-model="selectedChartType" @change="changeChartType">
          <option v-for="type in chartTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
      </div>
      
      <div class="editor-actions">
        <button @click="insertTemplate" class="btn btn-secondary">插入模板</button>
        <button @click="validateCode" class="btn btn-info">检查语法</button>
        <button @click="copyToClipboard" class="btn btn-success">复制代码</button>
        <button @click="saveAndClose" class="btn btn-primary">保存并关闭</button>
        <button @click="closeEditor" class="btn btn-danger">关闭</button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="editor-content">
      <!-- 左侧：代码编辑区 -->
      <div class="code-panel">
        <div class="panel-header">
          <h3>Mermaid代码编辑</h3>
          <div class="symbol-toolbar">
            <button 
              v-for="symbol in currentSymbols" 
              :key="symbol.name"
              @click="insertSymbol(symbol)"
              :title="symbol.description"
              class="symbol-btn"
            >
              {{ symbol.icon }}
            </button>
          </div>
        </div>
        
        <textarea
          v-model="mermaidCode"
          class="code-editor"
          placeholder="在此输入Mermaid代码..."
          @input="handleCodeChange"
          ref="codeEditor"
        ></textarea>
        
        <div v-if="errorMessage" class="error-message">
          <span class="error-icon">⚠️</span>
          {{ errorMessage }}
        </div>
      </div>

      <!-- 右侧：实时预览区 -->
      <div class="preview-panel">
        <div class="panel-header">
          <h3>实时预览</h3>
          <div class="preview-actions">
            <button @click="refreshPreview" class="btn btn-sm">刷新</button>
            <button @click="toggleFullscreen" class="btn btn-sm">全屏</button>
          </div>
        </div>
        
        <div class="preview-container" ref="previewContainer">
          <div v-if="isRendering" class="rendering-indicator">
            <div class="spinner"></div>
            <span>渲染中...</span>
          </div>
          
          <div 
            v-else-if="previewHtml" 
            class="mermaid-preview" 
            v-html="previewHtml"
          ></div>
          
          <div v-else class="empty-preview">
            <div class="empty-icon">📊</div>
            <p>输入Mermaid代码后，这里将显示实时预览</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 模板选择模态框 -->
    <div v-if="showTemplateModal" class="modal-overlay" @click="closeTemplateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>选择图表模板</h3>
          <button @click="closeTemplateModal" class="close-btn">×</button>
        </div>
        
        <div class="template-grid">
          <div 
            v-for="template in chartTemplates" 
            :key="template.name"
            class="template-card"
            @click="selectTemplate(template)"
          >
            <div class="template-preview">
              <div class="template-icon">{{ template.icon }}</div>
            </div>
            <div class="template-info">
              <h4>{{ template.name }}</h4>
              <p>{{ template.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, inject, type Ref } from 'vue'
import { TYPES } from '../../core/container/container.types'
import type { MermaidRenderer } from '../../domain/services/markdown-processor.interface'

// Props定义
interface Props {
  mermaidCode?: string
  chartType?: string
}

const props = withDefaults(defineProps<Props>(), {
  mermaidCode: '',
  chartType: 'flowchart'
})

// 依赖注入
const mermaidRenderer = inject<Ref<MermaidRenderer | null>>(TYPES.MermaidRenderer)

// 事件定义
const emit = defineEmits<{
  'save': [code: string]
  'close': []
}>()

// 响应式数据
const mermaidCode = ref(props.mermaidCode)
const selectedChartType = ref(props.chartType)
const previewHtml = ref('')
const errorMessage = ref('')
const isRendering = ref(false)

// 调试信息
console.log('MermaidEditor组件已加载');
console.log('初始代码:', props.mermaidCode);
console.log('Mermaid渲染器状态:', mermaidRenderer ? '已注入' : '未注入');
if (mermaidRenderer && mermaidRenderer.value) {
  console.log('Mermaid渲染器方法检查:');
  console.log('- renderDiagram:', typeof mermaidRenderer.value.renderDiagram);
  console.log('- supportsDiagramType:', typeof mermaidRenderer.value.supportsDiagramType);
  console.log('- initialize:', typeof mermaidRenderer.value.initialize);
}
const showTemplateModal = ref(false)
const codeEditor = ref<HTMLTextAreaElement | null>(null)
const previewContainer = ref<HTMLDivElement | null>(null)

// Mermaid渲染逻辑
let renderTimeout: number | null = null
const debounceRender = () => {
  if (renderTimeout) {
    clearTimeout(renderTimeout)
  }
  renderTimeout = setTimeout(() => {
    renderMermaid()
  }, 300)
}

// 监听props变化
watch(() => props.mermaidCode, (newCode: string) => {
  if (newCode !== undefined) {
    mermaidCode.value = newCode
    // 延迟渲染，确保Mermaid渲染器已初始化
    setTimeout(() => {
      debounceRender()
    }, 100)
  }
}, { immediate: true })

// 图表类型定义
const chartTypes = [
  { value: 'flowchart', label: '流程图', icon: '📊' },
  { value: 'sequenceDiagram', label: '序列图', icon: '🔄' },
  { value: 'classDiagram', label: '类图', icon: '🏗️' },
  { value: 'stateDiagram', label: '状态图', icon: '🔄' },
  { value: 'gantt', label: '甘特图', icon: '📅' },
  { value: 'pie', label: '饼图', icon: '🥧' },
  { value: 'userJourney', label: '用户旅程图', icon: '👤' },
  { value: 'gitGraph', label: 'Git图', icon: '📚' },
  { value: 'mindmap', label: '思维导图', icon: '🧠' }
]

// 符号工具栏配置
const symbolConfig = {
  flowchart: [
    { name: 'node', icon: '□', code: 'A[节点名称]', description: '添加矩形节点' },
    { name: 'decision', icon: '◇', code: 'B{条件判断}', description: '添加菱形决策节点' },
    { name: 'arrow', icon: '→', code: ' --> ', description: '添加连接箭头' },
    { name: 'text-arrow', icon: '→|文', code: ' --> |说明文字| ', description: '带文字的箭头' },
    { name: 'subgraph', icon: '▤', code: 'subgraph 子图名称\n  内容\nend', description: '添加子图' }
  ],
  sequenceDiagram: [
    { name: 'participant', icon: '👤', code: 'participant 参与者', description: '添加参与者' },
    { name: 'message', icon: '→', code: '->>', description: '同步消息' },
    { name: 'async-message', icon: '⇢', code: '-->>', description: '异步消息' },
    { name: 'activation', icon: '▮', code: 'activate 参与者', description: '激活参与者' },
    { name: 'note', icon: '📝', code: 'Note right of 参与者: 备注', description: '添加备注' }
  ],
  classDiagram: [
    { name: 'class', icon: '□', code: 'class 类名 {\n  +属性\n  +方法()\n}', description: '添加类' },
    { name: 'inheritance', icon: '◁', code: ' <|-- ', description: '继承关系' },
    { name: 'composition', icon: '◆', code: ' *-- ', description: '组合关系' },
    { name: 'aggregation', icon: '○', code: ' o-- ', description: '聚合关系' },
    { name: 'association', icon: '--', code: ' --> ', description: '关联关系' }
  ]
}

// 图表模板库
const chartTemplates = [
  {
    name: '基本流程图',
    type: 'flowchart',
    icon: '📊',
    description: '简单的开始-处理-结束流程',
    code: `flowchart TD
    A[开始] --> B{条件判断}
    B -->|是| C[执行操作1]
    B -->|否| D[执行操作2]
    C --> E[结束]
    D --> E`
  },
  {
    name: '用户登录序列图',
    type: 'sequenceDiagram',
    icon: '🔐',
    description: '用户登录认证流程',
    code: `sequenceDiagram
    participant U as 用户
    participant S as 系统
    participant D as 数据库
    
    U->>S: 输入用户名密码
    S->>D: 验证用户信息
    D-->>S: 返回验证结果
    S-->>U: 登录成功/失败`
  },
  {
    name: '类继承关系图',
    type: 'classDiagram',
    icon: '🏗️',
    description: '展示类之间的继承关系',
    code: `classDiagram
    class Animal {
        +String name
        +int age
        +void eat()
        +void sleep()
    }
    
    class Dog {
        +String breed
        +void bark()
    }
    
    class Cat {
        +String color
        +void meow()
    }
    
    Animal <|-- Dog
    Animal <|-- Cat`
  },
  {
    name: '项目甘特图',
    type: 'gantt',
    icon: '📅',
    description: '项目进度计划',
    code: `gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD
    section 设计阶段
    需求分析 :done, des1, 2024-01-01, 7d
    技术设计 :active, des2, after des1, 5d
    section 开发阶段
    前端开发 :dev1, after des2, 10d
    后端开发 :dev2, after des2, 15d`
  }
]

// 计算属性
const currentSymbols = computed(() => {
  return symbolConfig[selectedChartType.value as keyof typeof symbolConfig] || []
})

// 方法定义
const handleCodeChange = () => {
  debounceRender()
}

const changeChartType = () => {
  // 切换图表类型时，可以清空代码或加载默认模板
  if (!mermaidCode.value.trim()) {
    loadDefaultTemplate()
  }
  debounceRender()
}

const loadDefaultTemplate = () => {
  const template = chartTemplates.find(t => t.type === selectedChartType.value)
  if (template) {
    mermaidCode.value = template.code
  }
}

const insertSymbol = (symbol: any) => {
  if (codeEditor.value) {
    const textarea = codeEditor.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    
    const newText = text.substring(0, start) + symbol.code + text.substring(end)
    mermaidCode.value = newText
    
    // 设置光标位置
    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(start + symbol.code.length, start + symbol.code.length)
    })
  }
}

const insertTemplate = () => {
  showTemplateModal.value = true
}

const selectTemplate = (template: any) => {
  mermaidCode.value = template.code
  selectedChartType.value = template.type
  showTemplateModal.value = false
  debounceRender()
}

const closeTemplateModal = () => {
  showTemplateModal.value = false
}

const validateCode = async () => {
  errorMessage.value = ''
  
  try {
    // 这里可以添加更复杂的语法验证逻辑
    if (!mermaidCode.value.trim()) {
      errorMessage.value = '代码不能为空'
      return
    }
    
    // 简单的语法检查
    const lines = mermaidCode.value.split('\n')
    const firstLine = lines[0]?.trim() || ''
    
    if (!chartTypes.some(type => firstLine.includes(type.value))) {
      errorMessage.value = '请确保第一行包含正确的图表类型声明'
      return
    }
    
    // 如果验证通过，尝试渲染
    await renderMermaid()
    errorMessage.value = '✅ 语法检查通过'
    
    // 3秒后清除成功消息
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
    
  } catch (error) {
    errorMessage.value = `语法错误: ${error instanceof Error ? error.message : '未知错误'}`
  }
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(mermaidCode.value)
    errorMessage.value = '✅ 代码已复制到剪贴板'
    setTimeout(() => {
      errorMessage.value = ''
    }, 2000)
  } catch (error) {
    errorMessage.value = '复制失败，请手动复制代码'
  }
}

const saveAndClose = () => {
  emit('save', mermaidCode.value)
}

const closeEditor = () => {
  emit('close')
}

const refreshPreview = () => {
  renderMermaid()
}

const toggleFullscreen = () => {
  if (previewContainer.value) {
    if (!document.fullscreenElement) {
      previewContainer.value.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }
}

const renderMermaid = async () => {
  if (!mermaidCode.value.trim()) {
    previewHtml.value = '<div class="mermaid-placeholder">请输入Mermaid代码</div>';
    return;
  }
  
  isRendering.value = true;
  errorMessage.value = '';
  
  try {
    // 检查Mermaid渲染器是否可用
    if (!mermaidRenderer || !mermaidRenderer.value) {
      previewHtml.value = '<div class="mermaid-error">Mermaid渲染器未初始化，请刷新页面重试</div>';
      errorMessage.value = 'Mermaid渲染器未初始化';
      console.warn('Mermaid渲染器未通过依赖注入获取');
      return;
    }
    
    // 检查渲染器方法是否可用
    if (typeof mermaidRenderer.value.renderDiagram !== 'function') {
      previewHtml.value = '<div class="mermaid-error">Mermaid渲染器方法不可用</div>';
      errorMessage.value = '渲染器方法不可用';
      console.error('Mermaid渲染器renderDiagram方法不存在');
      return;
    }
    
    console.log('开始渲染Mermaid图表');
    console.log('输入代码:', mermaidCode.value);
    
    const svg = await mermaidRenderer.value.renderDiagram(mermaidCode.value, {
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit'
    });
    
    console.log('Mermaid渲染完成，SVG长度:', svg.length);
    console.log('SVG预览:', svg.substring(0, 100));
    
    // 验证SVG格式
    if (typeof svg !== 'string') {
      console.error('Mermaid返回了非字符串结果:', typeof svg, svg);
      throw new Error(`Mermaid返回了无效的格式: ${typeof svg}`);
    }
    
    if (!svg.includes('<svg')) {
      console.error('Mermaid返回的结果不包含SVG标签:', svg);
      throw new Error('Mermaid返回的结果不是有效的SVG');
    }
    
    previewHtml.value = svg;
    console.log('SVG已成功设置到预览界面');
  } catch (error) {
    console.error('Mermaid渲染失败:', error);
    errorMessage.value = `渲染失败: ${error instanceof Error ? error.message : '未知错误'}`;
    previewHtml.value = `<div class="mermaid-error">图表渲染失败: ${error instanceof Error ? error.message : '未知错误'}</div>`;
  } finally {
    isRendering.value = false;
  }
}

// 生命周期
onMounted(() => {
  if (mermaidCode.value) {
    debounceRender()
  } else {
    loadDefaultTemplate()
  }
  
  // 自动聚焦到编辑器
  if (codeEditor.value) {
    codeEditor.value.focus()
  }
})

// 暴露方法给父组件
defineExpose({
  setCode: (code: string) => {
    mermaidCode.value = code
    debounceRender()
  },
  getCode: () => mermaidCode.value,
  validate: validateCode
})
</script>

<style scoped>
.mermaid-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.chart-type-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chart-type-selector select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.editor-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.btn-secondary { background: #6c757d; color: white; }
.btn-info { background: #17a2b8; color: white; }
.btn-success { background: #28a745; color: white; }
.btn-danger { background: #dc3545; color: white; }
.btn-sm { padding: 5px 10px; font-size: 0.8em; }

.btn:hover {
  opacity: 0.9;
}

.editor-content {
  flex: 1;
  display: flex;
  height: calc(100% - 70px);
}

.code-panel, .preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e9ecef;
}

.preview-panel {
  border-right: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1em;
  color: #495057;
}

.symbol-toolbar {
  display: flex;
  gap: 5px;
}

.symbol-btn {
  padding: 5px 10px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.symbol-btn:hover {
  background: #f8f9fa;
}

.code-editor {
  flex: 1;
  border: none;
  padding: 20px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  line-height: 1.5;
  resize: none;
  outline: none;
  background: #fafafa;
}

.preview-container {
  flex: 1;
  padding: 20px;
  overflow: auto;
  background: white;
}

.rendering-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
  text-align: center;
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 10px;
}

.error-message {
  padding: 10px 20px;
  background: #ffeaea;
  border: 1px solid #ff6b6b;
  color: #d63031;
  margin: 0 20px 20px;
  border-radius: 4px;
  font-size: 0.9em;
}

.error-icon {
  margin-right: 5px;
}

/* 模态框样式 */
.modal-overlay {
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

.modal-content {
  background: white;
  border-radius: 8px;
  width: 80%;
  max-width: 800px;
  max-height: 80%;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #6c757d;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;
}

.template-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
}

.template-preview {
  text-align: center;
  margin-bottom: 10px;
}

.template-icon {
  font-size: 2em;
  margin-bottom: 5px;
}

.template-info h4 {
  margin: 0 0 5px 0;
  color: #495057;
}

.template-info p {
  margin: 0;
  color: #6c757d;
  font-size: 0.9em;
  line-height: 1.4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-content {
    flex-direction: column;
  }
  
  .code-panel, .preview-panel {
    border-right: none;
    border-bottom: 1px solid #e9ecef;
  }
  
  .editor-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
  
  .editor-actions {
    justify-content: center;
  }
}
</style>