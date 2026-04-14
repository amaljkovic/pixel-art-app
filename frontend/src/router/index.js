import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Login from '@/views/Login.vue';
import Register from '@/views/Register.vue';
import Gallery from '@/views/Gallery.vue';
import Drawing from '@/views/Drawing.vue';
import SinglePic from '@/views/SinglePic.vue';
import { useAuthStore } from '@/stores/authStore';
import MyGallery from '@/views/MyGallery.vue';
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: Home
        },
        {
            path: '/login',
            name: 'login',
            component: Login
        },
        {
            path: '/register',
            name: 'register',
            component: Register
        }, {
            path: '/gallery',
            name: 'gallery',
            component: Gallery
        }, {
            path: '/myGallery',
            name: 'myGallery',
            component: MyGallery,
            meta: {
                requiresAuth: true
            }
        }, {
            path: '/drawing/:id?',
            name: 'drawing',
            component: Drawing
        }, {
            path: '/singlePic',
            name: 'singlePic',
            component: SinglePic
        }
    ]
});
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();
    if (to.meta.requiresAuth && !authStore.token) {
        next({ name: 'Home' });
    }
    else {
        next();
    }
});
export default router;
