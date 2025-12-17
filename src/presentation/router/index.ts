import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import FolderManager from '../components/FolderManager.vue';
import { ApplicationService } from '../../application';
import { StorageAdapter } from '../../infrastructure/storage.adapter';

// 使用存储适配器自动选择合适的存储实现
const documentRepository = StorageAdapter.createDocumentRepository();
const folderRepository = StorageAdapter.createFolderRepository();
const applicationService = new ApplicationService(documentRepository, folderRepository);

// 在控制台显示环境信息（开发时有用）
console.log('🚀 MD Note 启动信息:', StorageAdapter.getEnvironmentInfo());

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