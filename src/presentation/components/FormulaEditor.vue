<template>
  <div class="formula-editor">
    <!-- 编辑器头部 -->
    <div class="editor-header">
      <div class="formula-type-selector">
        <label for="formulaType">公式类型:</label>
        <select id="formulaType" v-model="selectedFormulaType" @change="changeFormulaType">
          <option v-for="type in formulaTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
      </div>
      
      <div class="editor-actions">
        <button @click="insertTemplate" class="btn btn-secondary">插入模板</button>
        <button @click="validateFormula" class="btn btn-info">检查语法</button>
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
          <h3>LaTeX公式编辑</h3>
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
          v-model="latexCode"
          class="code-editor"
          placeholder="在此输入LaTeX公式代码..."
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
            class="formula-preview" 
            v-html="previewHtml"
          ></div>
          
          <div v-else class="empty-preview">
            <div class="empty-icon">📐</div>
            <p>输入LaTeX公式后，这里将显示实时预览</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 模板选择模态框 -->
    <div v-if="showTemplateModal" class="modal-overlay" @click="closeTemplateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>选择公式模板</h3>
          <button @click="closeTemplateModal" class="close-btn">×</button>
        </div>
        
        <div class="template-grid">
          <div 
            v-for="template in formulaTemplates" 
            :key="template.name"
            class="template-card"
            @click="selectTemplate(template)"
          >
            <div class="template-icon">{{ template.icon }}</div>
            <div class="template-name">{{ template.name }}</div>
            <div class="template-description">{{ template.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import katex from 'katex';

// Props
interface Props {
  latexCode?: string;
  formulaType?: 'inline' | 'block';
}

// Emits
interface Emits {
  (e: 'save', code: string): void;
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  latexCode: '',
  formulaType: 'inline'
});

const emit = defineEmits<Emits>();

// 响应式数据
const latexCode = ref(props.latexCode)
const selectedFormulaType = ref(props.formulaType)
const previewHtml = ref('')
const errorMessage = ref('')
const isRendering = ref(false)
const showTemplateModal = ref(false)
const codeEditor = ref<HTMLTextAreaElement | null>(null)
const previewContainer = ref<HTMLDivElement | null>(null)

// 公式类型定义
const formulaTypes = [
  { label: '行内公式', value: 'inline' },
  { label: '块级公式', value: 'block' }
]

// 符号工具栏定义
const mathSymbols = {
  inline: [
    { name: 'fraction', icon: '\frac{}{}', description: '分数', code: '\\frac{numerator}{denominator}' },
    { name: 'square-root', icon: '√', description: '平方根', code: '\\sqrt{expression}' },
    { name: 'sum', icon: '∑', description: '求和', code: '\\sum_{i=1}^{n}' },
    { name: 'integral', icon: '∫', description: '积分', code: '\\int_{a}^{b}' },
    { name: 'limit', icon: 'lim', description: '极限', code: '\\lim_{x \\to \\infty}' },
    { name: 'greek-alpha', icon: 'α', description: '希腊字母 α', code: '\\alpha' },
    { name: 'greek-beta', icon: 'β', description: '希腊字母 β', code: '\\beta' },
    { name: 'greek-gamma', icon: 'γ', description: '希腊字母 γ', code: '\\gamma' }
  ],
  block: [
    { name: 'matrix', icon: '[ ]', description: '矩阵', code: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
    { name: 'equation', icon: '=', description: '方程', code: '\\begin{cases} x + y = 2 \\\\ x - y = 0 \\end{cases}' },
    { name: 'align', icon: '≡', description: '对齐', code: '\\begin{align} x &= y \\\\ y &= z \\end{align}' },
    { name: 'integral-block', icon: '∫', description: '积分', code: '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}' },
    { name: 'sum-block', icon: '∑', description: '求和', code: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}' },
    { name: 'product', icon: '∏', description: '乘积', code: '\\prod_{i=1}^{n} i = n!' },
    { name: 'derivative', icon: '∂', description: '偏导数', code: '\\frac{\\partial f}{\\partial x}' }
  ]
}

// 公式模板定义
const formulaTemplates = [
  {
    name: '二次方程',
    icon: 'x²',
    description: '二次方程求根公式',
    code: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
  },
  {
    name: '欧拉公式',
    icon: 'e^i',
    description: '欧拉恒等式',
    code: 'e^{i\\pi} + 1 = 0'
  },
  {
    name: '勾股定理',
    icon: '△',
    description: '直角三角形边长关系',
    code: 'a^2 + b^2 = c^2'
  },
  {
    name: '牛顿第二定律',
    icon: 'F',
    description: '力和加速度关系',
    code: 'F = ma'
  },
  {
    name: '质能方程',
    icon: 'E',
    description: '爱因斯坦质能方程',
    code: 'E = mc^2'
  },
  {
    name: '傅里叶变换',
    icon: 'ℱ',
    description: '傅里叶变换公式',
    code: 'F(\\omega) = \\int_{-\\infty}^{\\infty} f(t) e^{-i\\omega t} dt'
  }
]

// 计算属性
const currentSymbols = computed(() => {
  return mathSymbols[selectedFormulaType.value] || mathSymbols.inline
})

// 渲染逻辑
let renderTimeout: number | null = null
const debounceRender = () => {
  if (renderTimeout) {
    clearTimeout(renderTimeout)
  }
  renderTimeout = setTimeout(() => {
    renderFormula()
  }, 300)
}

// 监听props变化
watch(() => props.latexCode, (newCode: string) => {
  if (newCode !== undefined) {
    latexCode.value = newCode
    debounceRender()
  }
}, { immediate: true })

watch(() => props.formulaType, (newType: string) => {
  if (newType !== undefined) {
    selectedFormulaType.value = newType
    debounceRender()
  }
})

// 渲染公式
const renderFormula = async () => {
  if (!latexCode.value.trim()) {
    previewHtml.value = ''
    errorMessage.value = ''
    return
  }

  isRendering.value = true
  errorMessage.value = ''

  try {
    const displayMode = selectedFormulaType.value === 'block'
    const html = katex.renderToString(latexCode.value, {
      throwOnError: false,
      displayMode: displayMode,
      output: 'html'
    })
    
    previewHtml.value = html
  } catch (error) {
    errorMessage.value = `渲染错误: ${error instanceof Error ? error.message : '未知错误'}`
    previewHtml.value = ''
  } finally {
    isRendering.value = false
  }
}

// 处理代码变化
const handleCodeChange = () => {
  debounceRender()
}

// 改变公式类型
const changeFormulaType = () => {
  debounceRender()
}

// 插入符号
const insertSymbol = (symbol: any) => {
  if (!codeEditor.value) return
  
  const start = codeEditor.value.selectionStart
  const end = codeEditor.value.selectionEnd
  const text = latexCode.value
  
  const newText = text.substring(0, start) + symbol.code + text.substring(end)
  latexCode.value = newText
  
  // 设置光标位置
  nextTick(() => {
    if (codeEditor.value) {
      const newCursorPos = start + symbol.code.length
      codeEditor.value.setSelectionRange(newCursorPos, newCursorPos)
      codeEditor.value.focus()
    }
  })
  
  debounceRender()
}

// 插入模板
const insertTemplate = () => {
  showTemplateModal.value = true
}

// 选择模板
const selectTemplate = (template: any) => {
  latexCode.value = template.code
  showTemplateModal.value = false
  debounceRender()
}

// 关闭模板模态框
const closeTemplateModal = () => {
  showTemplateModal.value = false
}

// 验证公式
const validateFormula = () => {
  try {
    katex.renderToString(latexCode.value, {
      throwOnError: true,
      displayMode: selectedFormulaType.value === 'block'
    })
    errorMessage.value = '✅ 公式语法正确'
  } catch (error) {
    errorMessage.value = `❌ 公式语法错误: ${error instanceof Error ? error.message : '未知错误'}`
  }
}

// 复制到剪贴板
const copyToClipboard = async () => {
  try {
    const formattedCode = selectedFormulaType.value === 'inline' 
      ? `$${latexCode.value}$` 
      : `$$$\\n${latexCode.value}\\n$$$`
    
    await navigator.clipboard.writeText(formattedCode)
    errorMessage.value = '✅ 公式代码已复制到剪贴板'
  } catch (error) {
    errorMessage.value = '❌ 复制失败，请手动复制'
  }
}

// 保存并关闭
const saveAndClose = () => {
  // 传递LaTeX代码和公式类型，让Markdown编辑器正确格式化
  emit('save', {
    latexCode: latexCode.value,
    formulaType: selectedFormulaType.value
  })
}

// 关闭编辑器
const closeEditor = () => {
  emit('close')
}

// 刷新预览
const refreshPreview = () => {
  renderFormula()
}

// 切换全屏
const toggleFullscreen = () => {
  if (!previewContainer.value) return
  
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    previewContainer.value.requestFullscreen()
  }
}

// 初始化时聚焦编辑器
nextTick(() => {
  if (codeEditor.value) {
    codeEditor.value.focus()
  }
})
</script>

<style scoped>
.formula-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.formula-type-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.formula-type-selector label {
  font-weight: 500;
  color: #495057;
}

.formula-type-selector select {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.editor-content {
  display: flex;
  flex: 1;
  height: calc(100% - 80px);
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
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #495057;
}

.symbol-toolbar {
  display: flex;
  gap: 0.25rem;
}

.symbol-btn {
  padding: 0.5rem;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.symbol-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.code-editor {
  flex: 1;
  padding: 1rem;
  border: none;
  resize: none;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  line-height: 1.5;
}

.code-editor:focus {
  outline: none;
}

.error-message {
  padding: 0.75rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  font-size: 0.9rem;
}

.error-icon {
  margin-right: 0.5rem;
}

.preview-container {
  flex: 1;
  padding: 1rem;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.formula-preview {
  text-align: center;
  max-width: 100%;
}

.rendering-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6c757d;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-preview {
  text-align: center;
  color: #6c757d;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 0;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1rem;
  max-height: 60vh;
  overflow-y: auto;
}

.template-card {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.template-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.template-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.template-description {
  font-size: 0.8rem;
  color: #6c757d;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
  border-color: #545b62;
}

.btn-success {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.btn-success:hover {
  background: #1e7e34;
  border-color: #1e7e34;
}

.btn-info {
  background: #17a2b8;
  border-color: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
  border-color: #138496;
}

.btn-danger {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
  border-color: #c82333;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}
</style>