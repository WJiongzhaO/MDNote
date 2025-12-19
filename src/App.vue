<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, provide, ref } from 'vue';
import { Application } from './core/application';
import { InversifyContainer } from './core/container/inversify.container';
import { TYPES } from './core/container/container.types';
import type { MermaidRenderer } from './domain/services/markdown-processor.interface';

// 创建响应式变量来存储服务实例
const mermaidRenderer = ref<MermaidRenderer | null>(null);

// 在setup阶段提供响应式引用
provide(TYPES.MermaidRenderer, mermaidRenderer);

onMounted(async () => {
  console.log('MD Note 应用已启动 - DDD架构版本，支持文件夹管理');
  
  try {
    // 初始化应用服务（包括Mermaid渲染器）
    const app = new Application();
    await app.start();
    console.log('应用服务初始化完成，Mermaid渲染器已准备就绪');
    
    // 获取依赖注入服务并更新响应式变量
    const container = InversifyContainer.getInstance();
    if (container) {
      try {
        const renderer = container.get<MermaidRenderer>(TYPES.MermaidRenderer);
        mermaidRenderer.value = renderer;
        console.log('MermaidRenderer服务已提供给子组件');
      } catch (error) {
        console.error('提供MermaidRenderer服务失败:', error);
      }
    }
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: white;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
