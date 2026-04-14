<template>
    <nav class="navbar">
      <router-link to="/" class="logo">PixelArt</router-link>
      <div class="nav-links">
        <router-link to="/">Home</router-link>
        <router-link to="/gallery">Gallery</router-link>
        <router-link v-if="isLoggedIn" to="/myGallery">My Gallery</router-link>
        <router-link v-if="isLoggedIn" to="/drawing">New</router-link>
        <router-link v-if="!isLoggedIn" to="/login">Login</router-link>
        <router-link v-if="!isLoggedIn" to="/register">Register</router-link>
        <button v-if="isLoggedIn" @click="logout">Logout</button>
      </div>
    </nav>
  </template>
  
  <script setup lang="ts">
  import { computed } from 'vue';
  import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

  const router = useRouter();
  const authStore = useAuthStore();
    
  const isLoggedIn = computed(() => !!authStore.token); //bang bang --> truthy&falseyy

  const logout = () => {
    authStore.logout();
    router.push('/login');
  };
  </script>
  
  <style scoped>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 10%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background-color: #333;
    color: #fff;
    z-index: 10;
  }
  
  .logo {
    font-size: 1.5rem;
    color: #fff;
    text-decoration: none;
  }
  
  .nav-links {
    display: flex;
    gap: 1rem;
  }
  
  .nav-links a {
    color: #fff;
    text-decoration: none;
    font-size: 1rem;
  }
  
  .nav-links a:hover {
    text-decoration: underline;
  }
  </style>