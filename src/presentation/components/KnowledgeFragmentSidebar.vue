<template>
  <div 
    class="knowledge-fragment-sidebar"
    @drop="handleDrop"
    @dragover.prevent
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    :class="{ 'drag-over': isDragging }"
  >
    <div class="sidebar-header">
      <h2>📚 知识片段库</h2>
      <div class="header-actions">
        <button class="btn btn-icon" @click="showCreateDialog = true" title="创建知识片段">
          ➕
        </button>
        <button class="btn btn-icon" @click="showSettingsDialog = true" title="设置">
          ⚙️
        </button>
        <button class="btn btn-icon" @click="refreshFragments" title="刷新">
          🔄
        </button>
      </div>
    </div>
    
    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-message">📎 释放以创建知识片段</div>
    </div>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索知识片段..."
        @input="handleSearch"
        class="search-input"
      />
    </div>

    <div class="tag-filter">
      <div class="tag-list">
        <span
          v-for="tag in allTags"
          :key="tag"
          :class="['tag', { active: selectedTags.includes(tag) }]"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div v-if="isLoading" class="loading">加载中...</div>
    <div v-else-if="filteredFragments.length === 0" class="empty-state">
      <p>暂无知识片段</p>
      <button class="btn btn-primary" @click="showCreateDialog = true">
        创建第一个知识片段
      </button>
    </div>
    <div v-else class="fragment-list">
      <div
        v-for="fragment in filteredFragments"
        :key="fragment.id"
        class="fragment-item"
        @click="selectFragment(fragment)"
        @dblclick="editFragment(fragment)"
        :class="{ active: selectedFragmentId === fragment.id }"
        draggable="true"
        @dragstart="handleFragmentDragStart($event, fragment)"
        @dragend="handleFragmentDragEnd"
      >
        <div class="fragment-header">
          <h3 class="fragment-title">{{ fragment.title }}</h3>
          <div class="fragment-actions">
            <button
              class="btn btn-icon-small"
              @click.stop="insertFragment(fragment)"
              title="插入到文档"
            >
              📎
            </button>
            <button
              class="btn btn-icon-small"
              @click.stop="deleteFragment(fragment.id)"
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>
        <div class="fragment-tags">
          <span v-for="tag in fragment.tags" :key="tag" class="tag-small">{{ tag }}</span>
        </div>
        <!-- 预览图 -->
        <div v-if="fragment.previewType" class="fragment-preview-image">
          <img 
            v-if="fragment.previewType === 'image' && fragment.previewImage && previewImageUrl[fragment.id]" 
            :src="previewImageUrl[fragment.id]" 
            :alt="fragment.title"
            @error="handleImageError"
            class="preview-img"
            :data-fragment-id="fragment.id"
            :data-image-path="fragment.previewImage"
          />
          <div v-else-if="fragment.previewType === 'image' && fragment.previewImage" class="mermaid-placeholder">
            📷 加载中...
          </div>
          <div 
            v-else-if="fragment.previewType === 'mermaid' && fragment.previewMermaidCode"
            class="preview-mermaid"
          >
            <div 
              v-if="mermaidPreviewSvgs && mermaidPreviewSvgs[fragment.id]" 
              class="mermaid-svg-container" 
              v-html="mermaidPreviewSvgs[fragment.id]"
              :data-fragment-id="fragment.id"
            ></div>
            <div v-else class="mermaid-placeholder">
              📊 渲染中...
              <div style="font-size: 0.7rem; margin-top: 4px; color: #999;">
                片段ID: {{ fragment.id }}
              </div>
            </div>
          </div>
        </div>
        <!-- 只有当没有预览图片或Mermaid图表时才显示完整的Markdown预览 -->
        <div v-if="!fragment.previewType" class="fragment-preview" v-html="fragmentPreviewHtml[fragment.id] || '加载中...'"></div>
      </div>
    </div>

    <!-- 设置对话框 -->
    <div v-if="showSettingsDialog" class="dialog-overlay" @click="showSettingsDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>知识片段库设置</h3>
          <button class="btn btn-icon" @click="showSettingsDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <div class="settings-item">
            <label>存储位置：</label>
            <div class="path-display">
              <input
                type="text"
                :value="currentDataPath"
                readonly
                class="input path-input"
              />
              <button class="btn btn-secondary" @click="selectStoragePath">选择位置</button>
            </div>
            <p class="settings-hint">当前知识片段库存储在：{{ currentDataPath }}</p>
            <button v-if="hasCustomPath" class="btn btn-secondary" @click="resetStoragePath">重置为默认位置</button>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-primary" @click="showSettingsDialog = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 创建对话框 -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click="showCreateDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>创建知识片段</h3>
          <button class="btn btn-icon" @click="showCreateDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <input
            v-model="newFragmentTitle"
            type="text"
            placeholder="标题"
            class="input"
          />
          <textarea
            v-model="newFragmentContent"
            placeholder="Markdown内容..."
            class="textarea"
            rows="10"
          ></textarea>
          <input
            v-model="newFragmentTags"
            type="text"
            placeholder="标签（用逗号分隔）"
            class="input"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showCreateDialog = false">取消</button>
          <button class="btn btn-primary" @click="handleCreateFragment">创建</button>
        </div>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" @click="showEditDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>编辑知识片段</h3>
          <button class="btn btn-icon" @click="showEditDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <input
            v-model="editingFragmentTitle"
            type="text"
            placeholder="标题"
            class="input"
          />
          <textarea
            v-model="editingFragmentContent"
            placeholder="Markdown内容..."
            class="textarea"
            rows="10"
          ></textarea>
          <input
            v-model="editingFragmentTags"
            type="text"
            placeholder="标签（用逗号分隔）"
            class="input"
          />
          <div v-if="editingFragmentId" class="edit-warning">
            ⚠️ 修改将应用到所有引用该片段的文档（已连接的引用）
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showEditDialog = false">取消</button>
          <button class="btn btn-primary" @click="handleUpdateFragment">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, inject, type Ref } from 'vue';
import { useKnowledgeFragments } from '../composables/useKnowledgeFragments';
import { Application } from '../../core/application';
import { NodeType } from '../../domain/types/knowledge-fragment.types';
import { TextNode, HeadingNode, CodeBlockNode, ContainerNode, ImageNode } from '../../domain/entities/ast-nodes';
import type { KnowledgeFragmentResponse } from '../../application/dto/knowledge-fragment.dto';
import { useDocuments } from '../composables/useDocuments';
import { TYPES } from '../../core/container/container.types';
import type { MermaidRenderer } from '../../domain/services/markdown-processor.interface';

const emit = defineEmits<{  
  'fragment-updated': [fragmentId: string];
  'insert': [fragment: KnowledgeFragmentResponse];
}>();

const {
  fragments,
  isLoading,
  loadFragments,
  createFragment,
  updateFragment,
  deleteFragment: deleteFragmentAction,
  searchFragments
} = useKnowledgeFragments();

const { renderMarkdown } = useDocuments();

const searchQuery = ref('');
const selectedTags = ref<string[]>([]);
const selectedFragmentId = ref<string | null>(null);
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showSettingsDialog = ref(false);
const newFragmentTitle = ref('');
const newFragmentContent = ref('');
const newFragmentTags = ref('');
const editingFragmentId = ref<string | null>(null);
const editingFragmentTitle = ref('');
const editingFragmentContent = ref('');
const editingFragmentTags = ref('');
const isDragging = ref(false);
const fragmentPreviewHtml = ref<Record<string, string>>({});
const currentDataPath = ref('');
const hasCustomPath = ref(false);
const draggedFragment = ref<KnowledgeFragmentResponse | null>(null);
const previewImageUrls = ref<Record<string, string>>({});
const previewImageUrl = ref<Record<string, string>>({});
const mermaidPreviewSvgs = ref<Record<string, string>>({});

// 依赖注入Mermaid渲染器
const mermaidRenderer = inject<Ref<MermaidRenderer | null>>(TYPES.MermaidRenderer);

// 获取预览图片URL（异步版本，返回Promise）
const getPreviewImageUrl = async (imagePath: string): Promise<string> => {
  console.log('getPreviewImageUrl 调用，路径:', imagePath);
  
  // 如果已经缓存，直接返回
  if (previewImageUrls.value[imagePath]) {
    console.log('使用缓存的URL:', previewImageUrls.value[imagePath]);
    return previewImageUrls.value[imagePath];
  }
  
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.getFullPath) {
      console.log('调用 electronAPI.file.getFullPath，路径:', imagePath);
      const fullPath = await electronAPI.file.getFullPath(imagePath);
      console.log('getFullPath 返回:', fullPath);
      
      // 确保返回的是 app:// 协议URL
      if (!fullPath.startsWith('app://') && !fullPath.startsWith('http')) {
        // 如果返回的是绝对路径，需要转换为 app:// 协议
        // 但 getFullPath 应该已经返回 app:// URL了
        console.warn('getFullPath 返回的不是 app:// URL:', fullPath);
      }
      
      previewImageUrls.value[imagePath] = fullPath;
      return fullPath;
    } else {
      console.warn('electronAPI.file.getFullPath 不可用，使用原路径');
      previewImageUrls.value[imagePath] = imagePath;
      return imagePath;
    }
  } catch (error) {
    console.error('Error getting preview image URL:', error, '路径:', imagePath);
    previewImageUrls.value[imagePath] = imagePath;
    return imagePath;
  }
};

// 加载图片URL
const loadPreviewImageUrl = async (fragment: KnowledgeFragmentResponse) => {
  if (!fragment.previewImage || previewImageUrl.value[fragment.id]) {
    return;
  }
  
  try {
    console.log('开始加载预览图片URL:', fragment.id, '路径:', fragment.previewImage);
    const url = await getPreviewImageUrl(fragment.previewImage);
    console.log('预览图片URL加载成功:', fragment.id, 'URL:', url);
    previewImageUrl.value[fragment.id] = url;
    // 强制触发响应式更新
    await nextTick();
  } catch (error) {
    console.error('Error loading preview image URL:', error, '片段ID:', fragment.id, '路径:', fragment.previewImage);
    // 即使出错也设置一个占位符，避免一直显示"加载中"
    previewImageUrl.value[fragment.id] = '';
  }
};

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};

// 计算所有标签
const allTags = computed(() => {
  const tags = new Set<string>();
  fragments.value.forEach(f => f.tags.forEach(tag => tags.add(tag)));
  return Array.from(tags).sort();
});

// 过滤后的片段
const filteredFragments = computed(() => {
  let filtered = fragments.value;

  // 按标签过滤
  if (selectedTags.value.length > 0) {
    filtered = filtered.filter(f =>
      selectedTags.value.every(tag => f.tags.includes(tag))
    );
  }

  // 按搜索查询过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(f =>
      f.title.toLowerCase().includes(query) ||
      f.tags.some(tag => tag.toLowerCase().includes(query)) ||
      f.markdown.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// 搜索处理
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    searchFragments(searchQuery.value);
  } else {
    loadFragments();
  }
};

// 切换标签
const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag);
  if (index === -1) {
    selectedTags.value.push(tag);
  } else {
    selectedTags.value.splice(index, 1);
  }
};

// 选择片段
const selectFragment = (fragment: KnowledgeFragmentResponse) => {
  selectedFragmentId.value = fragment.id;
};

// 编辑片段（双击触发）
const editFragment = async (fragment: KnowledgeFragmentResponse) => {
  editingFragmentId.value = fragment.id;
  editingFragmentTitle.value = fragment.title;
  editingFragmentContent.value = fragment.markdown;
  editingFragmentTags.value = fragment.tags.join(', ');
  showEditDialog.value = true;
};

// 更新片段
const handleUpdateFragment = async () => {
  if (!editingFragmentId.value) {
    return;
  }

  try {
    const tags = editingFragmentTags.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // 解析Markdown为AST节点
    const nodes = parseMarkdownToNodes(editingFragmentContent.value);

    await updateFragment(editingFragmentId.value, {
      title: editingFragmentTitle.value,
      nodes,
      tags
    });

    // 同步更新到所有引用文档
    try {
      const { InversifyContainer } = await import('../../core/container/inversify.container');
      const container = InversifyContainer.getInstance();
      if (container && typeof container.isBound === 'function' && container.isBound(TYPES.FragmentReferenceSyncService)) {
        const syncService = container.get(TYPES.FragmentReferenceSyncService);
        await syncService.syncFragmentUpdate(editingFragmentId.value);
      }
    } catch (error) {
      console.error('Error syncing fragment update:', error);
    }

    // 重置表单
    editingFragmentId.value = null;
    editingFragmentTitle.value = '';
    editingFragmentContent.value = '';
    editingFragmentTags.value = '';
    showEditDialog.value = false;

    // 刷新列表
    await loadFragments();
    
    // 通知父组件刷新当前文档（如果有）
    emit('fragment-updated', editingFragmentId.value);
  } catch (error) {
    console.error('Error updating fragment:', error);
    alert('更新失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 获取片段的引用文档数量
const getFragmentReferenceCount = (fragmentId: string): number => {
  const fragment = fragments.value.find(f => f.id === fragmentId);
  return fragment?.referencedDocuments?.length || 0;
};

// 插入片段到文档
const insertFragment = async (fragment: KnowledgeFragmentResponse) => {
  // 通过emit传递片段ID，父组件会处理插入逻辑
  emit('insert', fragment);
};

// 删除片段
const deleteFragment = async (id: string) => {
  if (confirm('确定要删除这个知识片段吗？')) {
    await deleteFragmentAction(id);
    if (selectedFragmentId.value === id) {
      selectedFragmentId.value = null;
    }
  }
};

// 刷新片段列表
const refreshFragments = () => {
  loadFragments();
};

// 渲染预览（使用真正的Markdown渲染器）
const renderFragmentPreview = async (fragment: KnowledgeFragmentResponse) => {
  if (fragmentPreviewHtml.value[fragment.id]) {
    return; // 已经渲染过
  }
  
  try {
    // 截取前500个字符作为预览
    const previewMarkdown = fragment.markdown.substring(0, 500);
    // 使用真正的Markdown渲染器，传递片段ID以处理图片路径
    // 使用 fragment: 前缀标识这是知识片段
    const fragmentDocId = `fragment:${fragment.id}`;
    const html = await renderMarkdown(previewMarkdown, fragmentDocId);
    fragmentPreviewHtml.value[fragment.id] = html;
    await nextTick();
  } catch (error) {
    console.error('Error rendering fragment preview:', error);
    fragmentPreviewHtml.value[fragment.id] = '<p>预览加载失败</p>';
  }
};

// 渲染Mermaid图表预览
const renderMermaidPreview = async (fragment: KnowledgeFragmentResponse) => {
  if (!fragment.previewType || fragment.previewType !== 'mermaid' || !fragment.previewMermaidCode) {
    return;
  }
  
  if (mermaidPreviewSvgs.value[fragment.id]) {
    return; // 已经渲染过
  }
  
  try {
    // 检查Mermaid渲染器是否可用
    if (!mermaidRenderer || !mermaidRenderer.value) {
      console.warn('Mermaid渲染器未初始化，尝试从容器获取...');
      // 尝试从容器直接获取
      const { InversifyContainer } = await import('../../core/container/inversify.container');
      const container = InversifyContainer.getInstance();
      const renderer = container.get<MermaidRenderer>(TYPES.MermaidRenderer);
      
      if (renderer && typeof renderer.renderDiagram === 'function') {
        console.log('从容器获取渲染器，开始渲染:', fragment.id);
        const svg = await renderer.renderDiagram(fragment.previewMermaidCode, {
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit'
        });
        console.log('容器渲染器返回结果:', typeof svg, svg?.length);
        console.log('容器渲染器返回结果预览:', svg?.substring(0, 300));
        // 确保SVG有合适的样式
        if (typeof svg === 'string') {
          let finalHtml = svg;
          
          // 如果包含SVG，提取并优化样式
          if (svg.includes('<svg')) {
            const svgMatch = svg.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);
            if (svgMatch) {
              let svgContent = svgMatch[0];
              svgContent = svgContent.replace(/<svg([^>]*)style="[^"]*"([^>]*)>/gi, '<svg$1$2>');
              svgContent = svgContent.replace(
                /<svg([^>]*)>/,
                '<svg$1 style="max-width: 100%; max-height: 150px; height: auto; width: auto; display: block; margin: 0 auto; background: white;">'
              );
              
              // 修复颜色问题
              // 修复颜色问题：将黑色填充改为白色，确保内容可见
              svgContent = svgContent.replace(/(<rect[^>]*fill=")black(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<rect[^>]*fill=")#000000(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<rect[^>]*fill=")#000(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<circle[^>]*fill=")black(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<circle[^>]*fill=")#000000(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<circle[^>]*fill=")#000(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<ellipse[^>]*fill=")black(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<ellipse[^>]*fill=")#000000(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<ellipse[^>]*fill=")#000(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<polygon[^>]*fill=")black(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<polygon[^>]*fill=")#000000(")/gi, '$1white$2');
              svgContent = svgContent.replace(/(<polygon[^>]*fill=")#000(")/gi, '$1white$2');
              // 确保文字颜色是黑色（可见）- 只处理text元素
              svgContent = svgContent.replace(/(<text[^>]*fill=")white(")/gi, '$1#333$2');
              svgContent = svgContent.replace(/(<text[^>]*fill=")#ffffff(")/gi, '$1#333$2');
              svgContent = svgContent.replace(/(<text[^>]*fill=")#fff(")/gi, '$1#333$2');
              // 确保stroke颜色可见（边框和线条）
              svgContent = svgContent.replace(/(stroke=")black(")/gi, '$1#333$2');
              svgContent = svgContent.replace(/(stroke=")#000000(")/gi, '$1#333$2');
              svgContent = svgContent.replace(/(stroke=")#000(")/gi, '$1#333$2');
              
              finalHtml = `
                <div style="width: 100%; max-height: 150px; overflow: hidden; background: white; display: flex; align-items: center; justify-content: center; padding: 8px;">
                  ${svgContent}
                </div>
              `;
            } else {
              // 优化容器样式
              finalHtml = svg.replace(
                /<div[^>]*class="mermaid-container"[^>]*>/,
                '<div class="mermaid-container" style="background-color: white; margin: 0; padding: 8px; max-height: 150px; overflow: hidden; display: flex; align-items: center; justify-content: center;">'
              );
            }
          }
          
          mermaidPreviewSvgs.value[fragment.id] = finalHtml;
          console.log('已设置到响应式对象（容器）:', Object.keys(mermaidPreviewSvgs.value));
          await nextTick();
        } else {
          console.error('容器渲染器返回了无效的结果');
          mermaidPreviewSvgs.value[fragment.id] = '<div class="mermaid-error">渲染结果格式错误</div>';
        }
      } else {
        console.error('无法获取Mermaid渲染器');
        mermaidPreviewSvgs.value[fragment.id] = '<div class="mermaid-error">渲染器不可用</div>';
      }
      return;
    }
    
    // 使用注入的渲染器
    if (typeof mermaidRenderer.value.renderDiagram !== 'function') {
      console.error('Mermaid渲染器方法不可用');
      mermaidPreviewSvgs.value[fragment.id] = '<div class="mermaid-error">渲染器方法不可用</div>';
      return;
    }
    
    console.log('开始渲染Mermaid预览:', fragment.id);
    console.log('Mermaid代码:', fragment.previewMermaidCode);
    const svg = await mermaidRenderer.value.renderDiagram(fragment.previewMermaidCode, {
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit'
    });
    
    console.log('Mermaid渲染返回结果类型:', typeof svg);
    console.log('Mermaid渲染返回结果长度:', svg?.length);
    console.log('Mermaid渲染返回结果预览:', svg?.substring(0, 300));
    
    if (typeof svg === 'string') {
      // Mermaid渲染器返回的是包装在div中的HTML，我们需要提取SVG或优化容器样式
      let finalHtml = svg;
      
      // 如果包含SVG，提取并优化样式
      if (svg.includes('<svg')) {
        // 提取SVG元素（可能在div包装中）
        const svgMatch = svg.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);
        if (svgMatch) {
          let svgContent = svgMatch[0];
          
          // 优化SVG样式和颜色
          svgContent = svgContent.replace(/<svg([^>]*)style="[^"]*"([^>]*)>/gi, '<svg$1$2>');
          svgContent = svgContent.replace(
            /<svg([^>]*)>/,
            '<svg$1 style="max-width: 100%; max-height: 150px; height: auto; width: auto; display: block; margin: 0 auto; background: white;">'
          );
          
          // 修复颜色问题：将黑色填充改为白色，确保内容可见
          // 处理节点背景（rect、circle等）的fill属性
          // 使用更精确的正则表达式，只替换节点背景，不替换文字
          svgContent = svgContent.replace(/(<rect[^>]*fill=")black(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<rect[^>]*fill=")#000000(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<rect[^>]*fill=")#000(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<circle[^>]*fill=")black(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<circle[^>]*fill=")#000000(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<circle[^>]*fill=")#000(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<ellipse[^>]*fill=")black(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<ellipse[^>]*fill=")#000000(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<ellipse[^>]*fill=")#000(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<polygon[^>]*fill=")black(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<polygon[^>]*fill=")#000000(")/gi, '$1white$2');
          svgContent = svgContent.replace(/(<polygon[^>]*fill=")#000(")/gi, '$1white$2');
          
          // 确保文字颜色是黑色（可见）- 只处理text元素
          svgContent = svgContent.replace(/(<text[^>]*fill=")white(")/gi, '$1#333$2');
          svgContent = svgContent.replace(/(<text[^>]*fill=")#ffffff(")/gi, '$1#333$2');
          svgContent = svgContent.replace(/(<text[^>]*fill=")#fff(")/gi, '$1#333$2');
          
          // 确保stroke颜色可见（边框和线条）
          svgContent = svgContent.replace(/(stroke=")black(")/gi, '$1#333$2');
          svgContent = svgContent.replace(/(stroke=")#000000(")/gi, '$1#333$2');
          svgContent = svgContent.replace(/(stroke=")#000(")/gi, '$1#333$2');
          
          // 包装在适合预览的容器中
          finalHtml = `
            <div style="width: 100%; max-height: 150px; overflow: hidden; background: white; display: flex; align-items: center; justify-content: center; padding: 8px;">
              ${svgContent}
            </div>
          `;
        } else {
          // 如果没有找到SVG，直接使用原始HTML，但优化容器样式
          finalHtml = svg.replace(
            /<div[^>]*class="mermaid-container"[^>]*>/,
            '<div class="mermaid-container" style="background-color: white; margin: 0; padding: 8px; max-height: 150px; overflow: hidden; display: flex; align-items: center; justify-content: center;">'
          );
        }
      }
      
      // 使用Vue的响应式更新
      mermaidPreviewSvgs.value = {
        ...mermaidPreviewSvgs.value,
        [fragment.id]: finalHtml
      };
      
      console.log('Mermaid预览渲染成功:', fragment.id);
      console.log('最终HTML长度:', finalHtml.length);
      console.log('最终HTML前300字符:', finalHtml.substring(0, 300));
      console.log('已设置到响应式对象:', Object.keys(mermaidPreviewSvgs.value));
      console.log('检查响应式值:', mermaidPreviewSvgs.value[fragment.id] ? '有值' : '无值');
      
      // 强制触发响应式更新
      await nextTick();
      // 再次等待确保DOM更新
      await nextTick();
    } else {
      console.error('Mermaid返回了无效的结果:', svg);
      console.error('结果类型:', typeof svg);
      throw new Error('Mermaid返回了无效的结果');
    }
  } catch (error) {
    console.error('Error rendering Mermaid preview:', error);
    mermaidPreviewSvgs.value[fragment.id] = `<div class="mermaid-error">渲染失败: ${error instanceof Error ? error.message : '未知错误'}</div>`;
  }
};

// 监听片段变化，自动渲染预览
watch(fragments, async (newFragments) => {
  console.log('片段列表变化，开始渲染预览，数量:', newFragments.length);
  for (const fragment of newFragments) {
    // 渲染Markdown预览
    if (!fragmentPreviewHtml.value[fragment.id]) {
      await renderFragmentPreview(fragment);
    }
    // 加载图片预览URL
    if (fragment.previewType === 'image' && fragment.previewImage) {
      await loadPreviewImageUrl(fragment);
    }
    // 渲染Mermaid预览
    if (fragment.previewType === 'mermaid' && !mermaidPreviewSvgs.value[fragment.id]) {
      console.log('watch中检测到Mermaid片段，开始渲染:', fragment.id);
      await renderMermaidPreview(fragment);
      // 强制触发响应式更新
      await nextTick();
    }
  }
}, { deep: true });

// 创建片段
const handleCreateFragment = async () => {
  if (!newFragmentTitle.value.trim()) {
    alert('请输入标题');
    return;
  }

  try {
    console.log('=== 开始创建知识片段（UI层） ===');
    console.log('内容长度:', newFragmentContent.value.length);
    console.log('内容预览:', newFragmentContent.value.substring(0, 200));
    
    // 简单的Markdown解析为AST节点
    const nodes = parseMarkdownToNodes(newFragmentContent.value);
    console.log('解析后的节点数量:', nodes.length);
    console.log('节点类型:', nodes.map(n => n.type));
    
    // 检查是否有图片节点
    const imageNodes = nodes.filter(n => n.type === NodeType.IMAGE);
    console.log('图片节点数量:', imageNodes.length);
    if (imageNodes.length > 0) {
      console.log('图片节点详情:', imageNodes.map(n => ({ src: n.src })));
    }
    
    const tags = newFragmentTags.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // 在创建片段前，尝试从父组件获取最新的上下文
    // 通过emit事件请求上下文，或者直接从全局状态获取
    let context = {
      sourceDocumentId: currentDocumentContext.value.documentId,
      sourceFilePath: currentDocumentContext.value.filePath
    };
    
    // 如果当前上下文为空，尝试从父组件获取
    if (!context.sourceDocumentId && !context.sourceFilePath) {
      console.warn('当前文档上下文为空，尝试从父组件获取...');
      // 这里可以通过emit事件请求上下文，或者等待父组件更新
      // 暂时先使用当前值，但添加警告
    }
    
    console.log('=== 创建知识片段时的上下文检查 ===');
    console.log('currentDocumentContext.value:', currentDocumentContext.value);
    console.log('context (传递给createFragment):', context);
    console.log('sourceDocumentId:', context.sourceDocumentId);
    console.log('sourceFilePath:', context.sourceFilePath);
    
    await createFragment({
      title: newFragmentTitle.value,
      nodes,
      tags,
      sourceDocumentId: context.sourceDocumentId,
      sourceFilePath: context.sourceFilePath
    });
    
    console.log('知识片段创建完成（UI层）');

    // 重置表单
    newFragmentTitle.value = '';
    newFragmentContent.value = '';
    newFragmentTags.value = '';
    showCreateDialog.value = false;
  } catch (error) {
    console.error('Error creating fragment:', error);
    alert('创建失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 简单的Markdown解析为AST节点（简化版）
const parseMarkdownToNodes = (markdown: string): any[] => {
  const nodes: any[] = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: NodeType.HEADING,
        level: headingMatch[1].length,
        text: headingMatch[2]
      });
      continue;
    }

    // 代码块
    if (line.startsWith('```')) {
      const language = line.substring(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push({
        type: NodeType.CODE_BLOCK,
        content: codeLines.join('\n'),
        language
      });
      continue;
    }

    // 图片
    const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imageMatch) {
      const imageSrc = imageMatch[2];
      console.log('解析到图片节点:', { alt: imageMatch[1], src: imageSrc });
      nodes.push({
        type: NodeType.IMAGE,
        src: imageSrc,
        alt: imageMatch[1]
      });
      continue;
    }

    // 普通文本
    if (line.trim()) {
      nodes.push({
        type: NodeType.TEXT,
        content: line,
        marks: []
      });
    }
  }

  return nodes;
};

// 处理拖入创建知识片段
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  // 检查是否是文本拖拽
  if (event.dataTransfer?.types.includes('text/plain') || event.dataTransfer?.types.includes('text/html')) {
    isDragging.value = true;
  }
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
};

// 存储当前文档上下文（用于复制图片）
const currentDocumentContext = ref<{ documentId?: string; filePath?: string }>({});

// 设置文档上下文（由父组件调用）
const setDocumentContext = (context: { documentId?: string; filePath?: string }) => {
  console.log('知识片段侧边栏收到文档上下文:', context);
  currentDocumentContext.value = context;
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;

  // 获取拖拽的文本内容
  const text = event.dataTransfer?.getData('text/plain') || '';
  
  if (!text.trim()) {
    return;
  }

  // 自动填充内容并打开创建对话框
  newFragmentContent.value = text;
  newFragmentTitle.value = text.substring(0, 50).replace(/\n/g, ' ').trim() || '新知识片段';
  showCreateDialog.value = true;
};

// 处理知识片段拖拽开始
const handleFragmentDragStart = (event: DragEvent, fragment: KnowledgeFragmentResponse) => {
  draggedFragment.value = fragment;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', fragment.markdown);
    event.dataTransfer.setData('application/x-knowledge-fragment', fragment.id);
  }
};

// 处理知识片段拖拽结束
const handleFragmentDragEnd = () => {
  draggedFragment.value = null;
};

// 加载存储路径
const loadStoragePath = async () => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file) {
      currentDataPath.value = await electronAPI.file.getDataPath();
      const customPath = await electronAPI.file.getCustomDataPath();
      hasCustomPath.value = !!customPath;
    }
  } catch (error) {
    console.error('Error loading storage path:', error);
  }
};

// 选择存储路径
const selectStoragePath = async () => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.dialog) {
      const selectedPath = await electronAPI.dialog.openFolder();
      if (selectedPath) {
        const result = await electronAPI.file.setCustomDataPath(selectedPath);
        if (result.success) {
          // 同时将这个路径设置为上次打开的文件夹
          if (electronAPI.file && electronAPI.file.saveLastOpenedFolder) {
            await electronAPI.file.saveLastOpenedFolder(selectedPath);
          }
          await loadStoragePath();
          alert('存储位置已更新，请重启应用以使更改生效');
        } else {
          alert('设置存储位置失败：' + (result.error || '未知错误'));
        }
      }
    }
  } catch (error) {
    console.error('Error selecting storage path:', error);
    alert('选择存储位置失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 重置存储路径
const resetStoragePath = async () => {
  if (!confirm('确定要重置为默认存储位置吗？')) {
    return;
  }
  
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file) {
      const result = await electronAPI.file.resetDataPath();
      if (result.success) {
        await loadStoragePath();
        alert('已重置为默认存储位置，请重启应用以使更改生效');
      } else {
        alert('重置存储位置失败：' + (result.error || '未知错误'));
      }
    }
  } catch (error) {
    console.error('Error resetting storage path:', error);
    alert('重置存储位置失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

onMounted(async () => {
  await loadFragments();
  await loadStoragePath();
  
  // 组件挂载后，主动请求父组件更新上下文
  // 通过emit事件或者等待父组件自动更新
  console.log('KnowledgeFragmentSidebar onMounted, 当前上下文:', currentDocumentContext.value);
  
  // 渲染所有片段的预览
  await nextTick();
  for (const fragment of fragments.value) {
    await renderFragmentPreview(fragment);
  }
  
  // 监听来自编辑器的文本拖拽
  document.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') {
      const textarea = target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        const selectedText = textarea.value.substring(start, end);
        e.dataTransfer?.setData('text/plain', selectedText);
      }
    }
  });
});

// 暴露方法供父组件调用
defineExpose({
  setDocumentContext
});
</script>

<style scoped>
.knowledge-fragment-sidebar {
  width: 300px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  overflow: hidden;
  position: relative;
}

.knowledge-fragment-sidebar.drag-over {
  background: #f0f7ff;
  border: 2px dashed #667eea;
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
}

.drag-message {
  font-size: 1.2rem;
  color: #667eea;
  font-weight: 600;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-icon {
  padding: 4px 8px;
  background: transparent;
  font-size: 1.2rem;
}

.btn-icon:hover {
  background: #e9ecef;
}

.btn-icon-small {
  padding: 2px 6px;
  background: transparent;
  font-size: 0.9rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.search-box {
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.9rem;
}

.tag-filter {
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
  max-height: 150px;
  overflow-y: auto;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 8px;
  background: #e9ecef;
  border-radius: 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tag:hover {
  background: #dee2e6;
}

.tag.active {
  background: #007bff;
  color: white;
}

.fragment-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.fragment-item {
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.fragment-item[draggable="true"] {
  cursor: grab;
}

.fragment-item[draggable="true"]:active {
  cursor: grabbing;
  opacity: 0.8;
}

.fragment-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.fragment-item.active {
  border-color: #007bff;
  background: #f0f7ff;
}

.fragment-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
}

.fragment-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.fragment-actions {
  display: flex;
  gap: 4px;
}

.fragment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tag-small {
  padding: 2px 6px;
  background: #e9ecef;
  border-radius: 10px;
  font-size: 0.75rem;
  color: #666;
}

.fragment-preview-image {
  margin-bottom: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #f0f0f0;
  height: 150px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.preview-img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  object-position: center;
  display: block;
}

.preview-mermaid {
  width: 100%;
  min-height: 100px;
  max-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  overflow: hidden; /* 移除滚动，只在外层显示 */
}

.mermaid-svg-container {
  width: 100%;
  min-height: 100px;
  max-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* 移除滚动 */
  background: white;
}

.mermaid-svg-container :deep(svg) {
  max-width: 100% !important;
  max-height: 150px !important;
  width: auto !important;
  height: auto !important;
  display: block !important;
  margin: 0 auto;
  background: white !important;
}

.mermaid-svg-container :deep(text) {
  /* 确保文字可见 */
  fill: #333 !important;
  stroke: none !important;
}

.mermaid-svg-container :deep(.node rect),
.mermaid-svg-container :deep(.node circle),
.mermaid-svg-container :deep(.node ellipse),
.mermaid-svg-container :deep(.node polygon) {
  /* 节点背景：白色填充，深色边框 */
  fill: white !important;
  stroke: #333 !important;
  stroke-width: 2px !important;
}

.mermaid-svg-container :deep(.edgePath path),
.mermaid-svg-container :deep(.edgePath .path) {
  /* 连接线：深色，无填充 */
  stroke: #333 !important;
  fill: none !important;
  stroke-width: 2px !important;
}

.mermaid-svg-container :deep(.cluster rect),
.mermaid-svg-container :deep(.cluster polygon) {
  /* 集群/分组：浅色背景 */
  fill: #f0f0f0 !important;
  stroke: #666 !important;
  stroke-width: 2px !important;
}

.mermaid-placeholder {
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: #666;
}

.mermaid-error {
  text-align: center;
  font-size: 0.85rem;
  color: #dc3545;
  padding: 8px;
}

.fragment-preview {
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
  max-height: 80px;
  overflow: hidden;
}

.fragment-preview :deep(p) {
  margin: 0.25em 0;
}

.fragment-preview :deep(h1),
.fragment-preview :deep(h2),
.fragment-preview :deep(h3),
.fragment-preview :deep(h4),
.fragment-preview :deep(h5),
.fragment-preview :deep(h6) {
  margin: 0.5em 0 0.25em 0;
  font-size: 1em;
  font-weight: 600;
}

.fragment-preview :deep(code) {
  background: #f4f4f4;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

.fragment-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.loading,
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.dialog-overlay {
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

.dialog {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input,
.textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
}

.textarea {
  resize: vertical;
  min-height: 200px;
}

.dialog-footer {
  padding: 16px;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.settings-item {
  margin-bottom: 16px;
}

.settings-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.path-display {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.path-input {
  flex: 1;
}

.settings-hint {
  font-size: 0.85rem;
  color: #666;
  margin: 8px 0;
}
</style>

