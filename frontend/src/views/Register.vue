
<template>
  <Navbar />
  <div class="register-container">
    <h2>Register</h2>
    <form @submit.prevent="handleRegister">
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

      <div class="form-group">
        <label for="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          v-model="confirmPassword"
          placeholder="Confirm your password"
          required
        />
        <span v-if="confirmPasswordError" class="error">{{ confirmPasswordError }}</span>
      </div>

      <button type="submit" :disabled="!isFormValid">Register</button>
    </form>

    <p v-if="registerError" class="error">{{ registerError }}</p>
  </div>
</template>


<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';
import Navbar from '@/components/Navbar.vue'
import { useRouter } from 'vue-router';

const username = ref<string>('');
const password = ref<string>('');
const confirmPassword = ref<string>('');
const usernameError = ref<string>('');
const passwordError = ref<string>('');
const confirmPasswordError = ref<string>('');
const registerError = ref<string>('');

const router = useRouter();

const validateForm = (): boolean => {
  let isValid = true;

  if (username.value.length < 2 || username.value.length > 32) {
    usernameError.value = 'username mora biti izmedju 2 i 32';
    isValid = false;
  } else {
    usernameError.value = '';
  }

  if (password.value.length < 8 || password.value.length > 128) {
    passwordError.value = '8<=duzina<=128';
    isValid = false;
  } else {
    passwordError.value = '';
  }

  if (confirmPassword.value !== password.value) {
    confirmPasswordError.value = 'lozinke nisu matching';
    isValid = false;
  } else {
    confirmPasswordError.value = '';
  }

  return isValid;
};

const handleRegister = async (): Promise<void> => {
  if (!validateForm()) return;

  try {
    const response = await axios.post(
      'http://localhost:3000/api/auth/register',
      {
        username: username.value,
        password: password.value,
      }
    );

    router.push('/login');
  } catch (error: any) {
    if (error.response?.data?.code === 'DUPLICATE_USERNAME') {
      registerError.value = 'username je vec zauzet:(';
    } else {
      registerError.value = 'error, try again';
    }
  }
};

const isFormValid = computed<boolean>(() => {
  return username.value.length >= 2 && username.value.length <= 32 && password.value.length >= 8 && password.value.length <= 128 && confirmPassword.value === password.value;
});
</script>

<style scoped>
.register-container {
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
  background-color: #007bff;
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