
<template>
  <Navbar /> 
  <div class="login-container">
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          v-model="username"
          placeholder="Enter your username"
          required
        />
        <span v-if="usernameError" class="error">{{ usernameError }}</span>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          v-model="password"
          placeholder="Enter your password"
          required
        />
        <span v-if="passwordError" class="error">{{ passwordError }}</span>
      </div>

      <button type="submit" :disabled="!isFormValid">Login</button>
    </form>

    <p v-if="loginError" class="error">{{ loginError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import Navbar from '@/components/Navbar.vue';
import { useAuthStore } from '@/stores/authStore';

const username = ref<string>('');
const password = ref<string>('');
const usernameError = ref<string>('');
const passwordError = ref<string>('');
const loginError = ref<string>('');

const router = useRouter();

const authStore = useAuthStore();

const validateForm = (): boolean => {
  let isValid = true;
  
  if (username.value.length < 2 || username.value.length > 32) {
    usernameError.value = 'username treba da bude izmedju 2 i 32 karakteraa';
    isValid = false;
  } else {
    usernameError.value = '';
  }

  if (password.value.length < 8 || password.value.length > 128) {
    passwordError.value = 'password mora biti izmedju 8 i 128';
    isValid = false;
  } else {
    passwordError.value = '';
  }

  return isValid;
};

const handleLogin = async (): Promise<void> => {
  if (!validateForm()) 
    return;

  try {
    const response = await axios.post(
      'http://localhost:3000/api/auth/login',
      {
        username: username.value,
        password: password.value
      }
    );

    authStore.login(response.data.token, response.data.user_id, response.data.username);
    router.push('/'); 
  } catch (error) {
    loginError.value = 'Greskica';
  }
};

const isFormValid = computed<boolean>(() => {
  return username.value.length >= 2 && username.value.length <= 32 && password.value.length >= 8 && password.value.length <= 128;
});
</script>
<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

input {
  width: 100%;
  padding: 10px;
  margin-top: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
}

.error {
  color: red;
  font-size: 12px;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}
</style>