import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import FolderManager from '../components/FolderManager.vue';
import { ApplicationService } from '../../application';
import { LocalStorageDocumentRepository, LocalStorageFolderRepository } from '../../infrastructure';

const documentRepository = new LocalStorageDocumentRepository();
const folderRepository = new LocalStorageFolderRepository();
const applicationService = new ApplicationService(documentRepository, folderRepository);

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