<template>
  <div class="drawing-container">
    <Navbar />
    <div class="controls">
        <div class="name-save">
          <input  v-model="drawingName"  :placeholder="pictureId ? 'Drawing name' : 'Enter name for new drawing'"  :disabled="!isAuthor"/>
          <button @click="saveDrawing" :disabled="!drawingName || isSaving || !isValidData || !isAuthor">Save Drawing</button>
        </div>
      <div class="size-input">
        <label for="gridSize">Grid Size:</label>
        <input type="number" v-model="gridSize" min="1" max="24" />
      </div>
    </div>

  <div class="main-content">
    <Toolbox @colorSelected="setColor" @toolSelected="setTool" />
    <Grid 
      :pictureData="pictureData"
      @update:pictureData="(val) => pictureData = val"
      @pixelUpdate="handlePixelChange"
      :color="currentColor"
      :gridSize="gridSize"
      :tool="currentTool"
      :pictureId="pictureId"
      :otherCursors="otherCursors"
    />
    <Chat v-if="pictureId" :pictureId="pictureId" />
  </div>
    <div v-if="isAuthor" class="edit-controls">
  <button @click="renameDrawing">Rename</button>
  <button @click="confirmDeleteDrawing">Delete</button>
</div>
  
  </div>
</template>

<script setup lang="ts">
import Navbar from '@/components/Navbar.vue';
import Toolbox from '@/components/Toolbox.vue';
import Grid from '@/components/Grid.vue';
import Chat from '@/components/Chat.vue';
import { computed, watch } from 'vue';

import {onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import {socket} from '@/socket';

const authStore = useAuthStore();

const route = useRoute();
const router = useRouter();

const currentColor = ref('#000000');
const gridSize = ref(16);
const currentTool = ref('pencil');
const drawingName = ref('');
const isSaving = ref(false);
const pictureData = ref<string[][]>([]); 
const loadedPicture = ref<any | null>(null);
const pictureId = route.params.id as string | undefined;
const authorId = undefined;


const isValidData = ref(true);



const setColor = (color: string) => {
  currentColor.value = color;
};

const setTool = (tool: string) => {
  currentTool.value = tool;
};

const initializeGrid = (size: number) => {
   console.log('[INIT] Initializing grid with size', size);
  pictureData.value = Array(size).fill(null).map(() => Array(size).fill('#ffffff')); 
  console.log('Initialized grid:', pictureData.value);  
};

const renameDrawing = async () => {
  const newName = prompt('Enter new name:', drawingName.value);
  if (newName && newName !== drawingName.value) {
    try {
      await axios.patch(`http://localhost:3000/api/pictures/${pictureId}`, {
        name: newName
      }, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      drawingName.value = newName;
    } catch (err) {
      alert('Rename failed');
    }
  }
};

const confirmDeleteDrawing = async () => {
  if (!pictureId) return;
  const confirmed = confirm('Are you sure you want to delete this drawing?');
  if (!confirmed) return;

  try {
    await axios.delete(`http://localhost:3000/api/pictures/${pictureId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    router.push('/gallery');
  } catch (err) {
    alert('Delete failed');
  }
};

const validateData = (): boolean => {
  if (!drawingName.value || drawingName.value.length < 1 || drawingName.value.length > 40) {
    isValidData.value = false;
    return false;
  }

  if (!Array.isArray(pictureData.value) || pictureData.value.length !== pictureData.value[0].length) {
    isValidData.value = false;
    return false;
  }

  for (let row of pictureData.value) {
    if (!Array.isArray(row) || row.length !== pictureData.value.length) {
      isValidData.value = false;
      return false;
    }
  }

  isValidData.value = true;
  return true;
};

const saveDrawing = async () => {
  if (!validateData()) {
    alert('Invalid data');
    return;
  }
  isSaving.value = true;

  const plainData = JSON.parse(JSON.stringify(pictureData.value));

  const drawingData = {
    name: drawingName.value,
    picture_data: transpose(plainData),
  };

  try {
    if (pictureId && isAuthor.value) {
      await axios.patch(`http://localhost:3000/api/pictures/${pictureId}`, drawingData, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
    } else {
      await axios.post('http://localhost:3000/api/pictures/', drawingData, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
    }
    router.push('/gallery');
  } catch (error) {
    console.error('Error saving drawing:', error);
    alert('Error saving drawing');
  } finally {
    isSaving.value = false;
  }
};

const transpose = (matrix: string[][]): string[][] => {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
};

watch(pictureData, () => {
  console.log('Picture data updated (ref):', pictureData.value)
}, { deep: true })


watch(() => route.params.id, (newId, oldId) => {
  if (!newId) {
    drawingName.value = '';
    loadedPicture.value = null;
    gridSize.value = 16;
    initializeGrid(gridSize.value);
  } else {
    loadExistingDrawing(newId as string);
  }
  if (oldId) {
  socket.emit('leaveDrawing', {
    pictureId: oldId,
    userId: authStore.userId
  });
}
});

const isAuthor = computed(() => {
  return !pictureId || loadedPicture.value?.author?.user_id === authStore.userId;
});

const otherCursors = ref<{ userId: string; x: number; y: number; username: string }[]>([]);

onMounted(() => {
  const id = route.params.id as string | undefined;

  if (id) {
    loadExistingDrawing(id);
  } else {
    initializeGrid(gridSize.value);
    console.log('Initialized empty grid because no id was present');
  }
  if(id){
    socket.emit('enterDrawing', {
    pictureId: id,
    userId: authStore.userId
  });


    socket.on('pixelUpdate', ({ x, y, color }) => {
    if (pictureData.value[y] && pictureData.value[y][x] !== undefined) {
      pictureData.value[y][x] = color;
    }
  });

  

  socket.on('cursorMove', (payload) => {
  const existing = otherCursors.value.find(c => c.userId === payload.userId);
  if (existing) {
    existing.x = payload.x;
    existing.y = payload.y;
  } else {
    otherCursors.value.push(payload);
  }
  });
  socket.on('userLeft', (userId: string) => {
    otherCursors.value = otherCursors.value.filter(c => c.userId !== userId);
  });
  }
});

onBeforeUnmount(() => {
  socket.emit('leaveDrawing', {
    pictureId,
    userId: authStore.userId
  }); 

  socket.off('user_cursor');
  socket.off('userLeft');
  socket.off('pixelUpdate');
});

watch(gridSize, (newSize) => {
  if (!pictureId) {
    initializeGrid(newSize);
  }
});
watch(gridSize, (newSize, oldSize) => {
  if (newSize === oldSize) return;

  const resizeGrid = (oldData: string[][], newSize: number): string[][] => {
    const resized: string[][] = [];

    for (let y = 0; y < newSize; y++) {
      const row: string[] = [];
      for (let x = 0; x < newSize; x++) {
        if (y < oldData.length && x < oldData[y].length) {
          row.push(oldData[y][x]);
        } else {
          row.push('#ffffff'); 
        }
      }
      resized.push(row);
    }

    return resized;
  };

  pictureData.value = resizeGrid(pictureData.value, newSize);
});

const loadExistingDrawing = async (id: string) => {
  try {
    const response = await axios.get(`http://localhost:3000/api/pictures/${id}`);
    const picture = response.data.picture;
    if (picture.picture_data && Array.isArray(picture.picture_data)) {
      drawingName.value = picture.name;
      pictureData.value = transpose(picture.picture_data.map((row: string[]) => [...row]));
      
      gridSize.value = picture.picture_data.length;
      loadedPicture.value = picture;
      console.log('Loaded picture:', picture);
    }
  } catch (error) {
    console.error("Couldn't load picture:", error);
  }
};

const handlePixelChange = ({ x, y, color }: { x: number, y: number, color: string }) => {
  pictureData.value[y][x] = color;
  if (pictureId) {
    socket.emit('pixelUpdate', {
      pictureId,
      x,
      y,
      color
    });
    console.log('[emit] pixelUpdate', { x, y, color });
  }
};

</script>

<style scoped>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.main-content {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
  margin: 0 auto;
  max-width: 1200px;
  padding: 20px;
  box-sizing: border-box;
}
.drawing-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  height: 100%;
  width: 100%;
  background-color: #ffffff;
}
.pixel-grid {
  flex-shrink: 0;
  width: auto;
  height: auto;
}
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  gap: 20px;
}

.name-save {
  display: flex;
  gap: 10px;
  align-items: center;
}

.size-input {
  display: flex;
  align-items: center;
  gap: 6px;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20px, 1fr));
  gap: 1px;
  width: 100%;
  height: 100%;
  max-width: 100%;
}

.grid-row {
  display: flex;
}

.grid-pixel {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.toolbox-container {
  padding-top: 15%;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  z-index: 10;
  width: 200px;
}
</style>
