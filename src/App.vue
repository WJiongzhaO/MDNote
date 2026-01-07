<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, provide, ref } from 'vue';
import { Application } from './core/application';
import { InversifyContainer } from './core/container/inversify.container';
import { TYPES } from './core/container/container.types';
import type { MermaidRenderer } from './domain/services/markdown-processor.interface';
import { useTheme } from './presentation/composables/useTheme';

// 主题系统初始化
const { initialize: initializeTheme } = useTheme();

// 创建响应式变量来存储服务实例
const mermaidRenderer = ref<MermaidRenderer | null>(null);

// 在setup阶段立即初始化应用并配置 DI 容器（必须在子组件挂载之前）
const app = Application.getInstance();
const container = InversifyContainer.getInstance();
provide('diContainer', container);

// 在setup阶段提供响应式引用
provide(TYPES.MermaidRenderer, mermaidRenderer);

onMounted(async () => {
  // 初始化主题系统
  initializeTheme();

  try {
    await app.start();

    try {
      const renderer = container.get<MermaidRenderer>(TYPES.MermaidRenderer);
      mermaidRenderer.value = renderer;
    } catch (error) {
      console.error('提供MermaidRenderer服务失败:', error);
    }
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
});
</script>

<style>
@import './assets/styles/theme-variables.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-primary);
  color: var(--text-primary);
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
</style>
