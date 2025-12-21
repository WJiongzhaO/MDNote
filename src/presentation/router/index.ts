import { createRouter, createWebHistory } from 'vue-router';
import NewAppLayout from '../components/NewAppLayout.vue';
import AppLayout from '../components/AppLayout.vue';
import FolderManager from '../components/FolderManager.vue';
import { Application } from '../../core/application';

// 使用依赖注入容器创建应用服务
const application = new Application();
const applicationService = application.getApplicationService();

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'app',
      component: NewAppLayout,
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