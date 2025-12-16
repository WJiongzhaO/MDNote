import { createRouter, createWebHistory } from 'vue-router'
import DocumentManager from '../components/DocumentManager.vue'
import MarkdownEditor from '../components/MarkdownEditor.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: DocumentManager
  },
  {
    path: '/editor/:id?',
    name: 'Editor',
    component: MarkdownEditor,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router