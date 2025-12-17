<template>
  <div class="welcome-container">
    <div class="welcome-card">
      <h1 class="welcome-title">欢迎使用 MD Note</h1>
      <p class="welcome-description">
        一个基于 Vue + Electron 的现代化 Markdown 笔记应用
      </p>
      <div class="features">
        <div class="feature-item">
          <span class="feature-icon">📝</span>
          <span>Markdown 编辑</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">👁️</span>
          <span>实时预览</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📚</span>
          <span>文档管理</span>
        </div>
      </div>
      <p class="ready-text">应用已准备就绪，开始您的创作之旅！</p>
    </div>
  </div>
</template>

<script setup lang="ts">
console.log('MD Note 应用已启动')
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.welcome-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 500px;
  width: 90%;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-description {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 32px;
  line-height: 1.6;
}

.features {
  display: flex;
  justify-content: space-around;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #555;
  background: #f8f9fa;
  padding: 12px 16px;
  border-radius: 8px;
}

.feature-icon {
  font-size: 1.2rem;
}

.ready-text {
  font-size: 1rem;
  color: #888;
  font-style: italic;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
