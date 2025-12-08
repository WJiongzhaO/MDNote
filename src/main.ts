// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';

// 如果你使用了 Vue Router、Pinia 等，可以在这里引入并 use

const app = createApp(App);

// 示例：如果你以后加了 Pinia
// import { createPinia } from 'pinia';
// app.use(createPinia());

// 示例：如果你以后加了 Vue Router
// import router from './router';
// app.use(router);

app.mount('#app');