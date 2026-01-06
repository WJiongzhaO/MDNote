import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  define: {
    // 为浏览器环境提供 Buffer polyfill
    global: 'globalThis',
    'process.env': '{}',
  },
  server: {
    strictPort: true,
    port: 5173
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      }
    },
    include: ['src/**/*.ts', 'src/**/*.tsx']
  },
  optimizeDeps: {
    exclude: ['puppeteer', 'jsdom'], // 排除 Node.js 专用库
    esbuildOptions: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true
        }
      }
    }
  },
  build: {
    rollupOptions: {
      external: ['puppeteer', 'jsdom'] // 构建时排除这些依赖
    }
  }
})
