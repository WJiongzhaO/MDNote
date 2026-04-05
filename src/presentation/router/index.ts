import { createRouter, createWebHistory } from 'vue-router'
import NewAppLayout from '../components/NewAppLayout.vue'
import AppLayout from '../components/AppLayout.vue'
import FolderManager from '../components/FolderManager.vue'
import VaultSelectView from '../views/VaultSelectView.vue'
import FragmentManagementView from '../views/FragmentManagementView.vue'
import FragmentDetailView from '../views/FragmentDetailView.vue'
import KnowledgeHealthDashboardView from '../views/KnowledgeHealthDashboardView.vue'
import { Application } from '../../core/application'

const application = new Application()
const applicationService = application.getApplicationService()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'vault-select',
      component: VaultSelectView,
    },
    {
      path: '/app',
      name: 'app',
      component: NewAppLayout,
      props: { applicationService },
    },
    {
      path: '/folders',
      name: 'folders',
      component: FolderManager,
      props: { applicationService },
    },
    {
      path: '/fragments',
      name: 'fragments',
      component: FragmentManagementView,
      props: (route) => ({ vaultId: (route.query.vaultId as string) || 'default' }),
    },
    {
      path: '/vault/:vaultId/fragments',
      name: 'vault-fragments',
      component: FragmentManagementView,
      props: (route) => ({ vaultId: route.params.vaultId as string }),
    },
    {
      path: '/fragments/health',
      name: 'fragments-health',
      component: KnowledgeHealthDashboardView,
      props: (route) => ({ vaultId: (route.query.vaultId as string) || 'default' }),
    },
    {
      path: '/vault/:vaultId/fragments/health',
      name: 'vault-fragments-health',
      component: KnowledgeHealthDashboardView,
      props: (route) => ({ vaultId: route.params.vaultId as string }),
    },
    {
      path: '/fragments/:fragmentId',
      name: 'fragment-detail',
      component: FragmentDetailView,
      props: (route) => ({ vaultId: (route.query.vaultId as string) || 'default' }),
    },
    {
      path: '/vault/:vaultId/fragments/:fragmentId',
      name: 'vault-fragment-detail',
      component: FragmentDetailView,
      props: (route) => ({ vaultId: route.params.vaultId as string }),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  if (to.path === '/app') {
    const vaultId = to.query.vaultId as string | undefined
    const vaultPath = to.query.vaultPath as string | undefined

    if (!vaultId && !vaultPath) {
      next({ path: '/' })
      return
    }
  }

  next()
})

export default router
