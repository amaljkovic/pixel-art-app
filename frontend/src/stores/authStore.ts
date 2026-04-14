import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    userId: '',
    username: '',
  }),
  actions: {
    initialAuthFromStorage(){
      this.token = localStorage.getItem('token') || '';
      this.userId = localStorage.getItem('userId') || '';
      this.username = localStorage.getItem('username') || '';
    },
    login(token: string, userId: string, username: string) {
      this.token = token;
      this.userId = userId;
      this.username = username;
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('username', username);
    },
    logout() {
      this.token = '';
      this.userId = '';
      this.username = '';
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
    }
  },
});