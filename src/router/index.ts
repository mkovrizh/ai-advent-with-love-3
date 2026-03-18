import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'Home',
        component: () => import('@/views/HomePage.vue')
    },
    {
        path: '/day01',
        name: 'Day01',
        component: () => import('@/views/Day01.vue')
    },
    {
        path: '/day02',
        name: 'Day02',
        component: () => import('@/views/Day02.vue')
    }
]

const router = createRouter({history: createWebHistory(), routes})

export default router
