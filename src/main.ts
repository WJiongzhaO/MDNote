// src/main.ts
// Buffer polyfill for browser environment
if (typeof window !== 'undefined' && typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = {
    from: function(arr: any[]) {
      if (Array.isArray(arr)) {
        return new Uint8Array(arr);
      }
      return arr;
    },
    isBuffer: function(obj: any) {
      return obj instanceof Uint8Array;
    }
  } as any;
}

import { createApp } from 'vue';
import App from './App.vue';
import router from './presentation/router';
import 'katex/dist/katex.min.css';

const app = createApp(App);
app.use(router);
app.mount('#app');