import { createRouter, createWebHistory } from 'vue-router';
import NewAppLayout from '../components/NewAppLayout.vue';
import AppLayout from '../components/AppLayout.vue';
import FolderManager from '../components/FolderManager.vue';
import VaultSelectView from '../views/VaultSelectView.vue';
import { Application } from '../../core/application';

const application = new Application();
const applicationService = application.getApplicationService();

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'vault-select',
      component: VaultSelectView
    },
    {
      path: '/app',
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

router.beforeEach(async (to, _from, next) => {
  if (to.path === '/app') {
    const vaultId = to.query.vaultId as string | undefined;
    const vaultPath = to.query.vaultPath as string | undefined;
    
    if (!vaultId && !vaultPath) {
      next({ path: '/' });
      return;
    }
  }
  
  next();
});

export default router;
