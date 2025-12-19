import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import FolderManager from '../components/FolderManager.vue';
import { Application } from '../../core/application';

// 使用依赖注入容器创建应用服务
const application = new Application();
const applicationService = application.getApplicationService();

// 在控制台显示环境信息（开发时有用）
console.log('🚀 MD Note 启动信息: 依赖注入架构已启用');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'app',
      component: AppLayout,
      props: { applicationService }
    },
    {
      path: '/folders',
      name: 'folders',
      component: FolderManager,
      props: { applicationService }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
});

export default router;