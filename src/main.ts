// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './presentation/router';
import 'katex/dist/katex.min.css';

const app = createApp(App);
app.use(router);
app.mount('#app');