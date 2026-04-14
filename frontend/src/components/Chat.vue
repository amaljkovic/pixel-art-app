<template>
  <div class="chat-container">
    <div class="chat-users">
      <strong>Active users:</strong>
      <ul>
        <li v-for="user in users" :key="user.userId">{{ user.username }}</li>
      </ul>
    </div>
    
    <div class="chat-messages">
      <div v-for="(msg, idx) in messages" :key="idx" class="chat-message">
        <strong>{{ msg.username }}:</strong> {{ msg.message }}
      </div>
    </div>

    <input
      v-model="newMessage"
      @keyup.enter="sendMessage"
      placeholder="Type a message..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { socket } from '@/socket';
import { useAuthStore } from '@/stores/authStore';

const props = defineProps<{
  pictureId: string;
}>();

const authStore = useAuthStore();

const newMessage = ref('');
const messages = ref<{ message: string, username: string, userId: string }[]>([]);
const users = ref<{ userId: string; username: string }[]>([]);

const sendMessage = () => {
  if (newMessage.value.trim()) {
    socket.emit('sendMessage', {
      pictureId: props.pictureId,
      message: newMessage.value,
      userId: authStore.userId,
      username: authStore.username
    });
    newMessage.value = '';
  }
};

onMounted(() => {
  socket.emit('joinChat', {
    pictureId: props.pictureId,
    userId: authStore.userId,
    username: authStore.username
  });

  socket.on('chatMessage', (msg) => {
    messages.value.push(msg);
  });

  socket.on('chatUsers', (list) => {
    users.value = list;
  });
});

onBeforeUnmount(() => {
  socket.off('chatMessage');
  socket.off('chatUsers');
});
</script>

<style scoped>
.chat-container {
  border: 1px solid #c0bebe;
  background-color: #f8f7f7;
  border-radius: 8px;
  padding: 10px;
  width: 300px;
  height: 400px;
  display: flex;
  flex-direction: column;
}
.chat-users {
  font-size: 14px;
  margin-bottom: 10px;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px;
}
.chat-message {
  margin-bottom: 5px;
}
input {
  padding: 5px;
  border: 1px solid #aaa;
  border-radius: 4px;
}
</style>