import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import RoomManagerView from '../views/RoomManagerView.vue'
import MessageProcessorView from '../views/MessageProcessorView.vue'
import MessageListView from '../views/MessageListView.vue'
import MappingManagerView from '../views/MappingManagerView.vue'
import GiftManagerView from '../views/GiftManagerView.vue'
import StatsView from '../views/StatsView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    redirect: '/rooms',
    children: [
      {
        path: '/rooms',
        name: 'rooms',
        component: RoomManagerView
      },
      {
        path: '/processor',
        name: 'processor',
        component: MessageProcessorView
      },
      {
        path: '/messages',
        name: 'messages',
        component: MessageListView
      },
      {
        path: '/mappings',
        name: 'mappings',
        component: MappingManagerView
      },
      {
        path: '/gifts',
        name: 'gifts',
        component: GiftManagerView
      },
      {
        path: '/stats',
        name: 'stats',
        component: StatsView
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
