<template>
  <Navbar />
  <div>
    <div v-if="isLoading" class="loading-indicator">
      Loading...
    </div>

    <div v-if="!isLoading && pictures.length === 0" class="empty-state">
      No pictures available.
    </div>

    <div v-if="!isLoading && pictures.length > 0" class="drawing-gallery">
      <div v-for="picture in pictures" :key="picture.id" class="drawing-card" @click="goToDrawing(picture.id)">
        <div
  class="thumbnail"
  :style="{
    gridTemplateColumns: 'repeat(' + parsePictureData(picture.picture_data)[0]?.length + ', 1fr)',
    gridTemplateRows: 'repeat(' + parsePictureData(picture.picture_data).length + ', 1fr)'
  }"
>
  <div
    v-for="(row, rowIndex) in parsePictureData(picture.picture_data)"
    :key="rowIndex"
    class="pixel-row"
  >
    <div
      v-for="(color, colIndex) in row"
      :key="colIndex"
      class="pixel-cell"
      :style="{ backgroundColor: color }"
    ></div>
  </div>
</div>
        <div class="drawing-info">
        <h3>{{ picture.name || 'Untitled Drawing' }}</h3>
        <p @click.stop="filterByAuthor(picture.author.user_id)" class="clickable-author">{{ picture.author.username }}</p>
        <p>Created: {{ new Date(picture.created_at).toLocaleString() }}</p>
</div>
<div v-if="authStore.userId === picture.author.user_id" class="edit-controls">
  <button @click.stop="renamePicture(picture)">Rename</button>
  <button @click.stop="confirmDelete(picture.id)">Delete</button>
</div>
      </div>
    </div>

    <div class="pagination">
      <button :disabled="currPage <= 1" @click="changePage(currPage - 1)">Previous</button>
      <span>Page {{ currPage }} of {{ totalPages }}</span>
      <button :disabled="currPage >= totalPages" @click="changePage(currPage + 1)">Next</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import Navbar from '@/components/Navbar.vue';
import Thumbnail from '@/components/Thumbnail.vue';  
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();

const pictures = ref([]);
const currPage = ref(1);
const totalPages = ref(1);
const isLoading = ref(false);
const router = useRouter();
const route = useRoute();

const loadPictures = async () => {
  isLoading.value = true;
  const author = route.query.author;
  try {
    const response = await axios.get('http://localhost:3000/api/pictures/', {
      params: {
        limit: 10, 
        page: currPage.value,
        older_first: false, 
        author,
      },
    });

    console.log('API response:', response.data);  
    
    const data = response.data;
    console.log('[Gallery pictures]', JSON.stringify(data.pictures, null, 2))
    pictures.value = data.pictures.map((pic: any) => ({
  id: pic.picture_id,
  name: pic.name,
  created_at: pic.created_at,
  updated_at: pic.updated_at,
  picture_data: pic.picture_data,
  author: pic.author,
}));

    
    totalPages.value = Math.ceil(data.total / 10); 
  } catch (error) {
    console.error('Error loading pictures:', error);
    pictures.value = []; 
  } finally {
    isLoading.value = false;

  }
};

const filterByAuthor = (authorId: string) =>{
  router.push({path:'/gallery', query:{author:authorId}});
}

const goToDrawing=(id:string)=>{
  router.push({ name: 'drawing', params: { id: id } });
}

const parsePictureData = (pictureData: string[][]):string[][]=> {
  if (Array.isArray(pictureData)) {
    const cols = pictureData.length;
    const rows = pictureData[0]?.length || 0;
    const transposed: string[][] = [];
    console.log('log with picturedata',pictureData)
    for (let row = 0; row < rows; row++) {
      transposed[row]=[];
      for(let col = 0; col<cols; col++){
        transposed[row][col] = pictureData[col][row];
      }
    }
      return transposed;
  }
  return pictureData;
};
 
const renamePicture = async (picture: any) => {
  const newName = prompt('Enter new name:', picture.name);
  if (newName && newName !== picture.name) {
    try {
      await axios.patch(`http://localhost:3000/api/pictures/${picture.id}`, {
        name: newName
      }, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      loadPictures(); 
    } catch (err) {
      alert('Failed to rename picture');
      console.error(err);
    }
  }
};

const confirmDelete = async (id: string) => {
  const confirmed = confirm('Are you sure you want to delete this drawing? This action cannot be undone.');
  if (!confirmed) return;

  try {
    await axios.delete(`http://localhost:3000/api/pictures/${id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    loadPictures();
  } catch (err) {
    alert('Failed to delete picture');
    console.error(err);
  }
};

const changePage = (newPage: number) => {
  if (newPage > 0 && newPage <= totalPages.value) {
    currPage.value = newPage;
    loadPictures();
  }
};

watch(() => route.query.author, () => {
  loadPictures(); 
});

onMounted(() => {
  loadPictures();
});
</script>

<style scoped>
.drawing-gallery {
  display: grid;
  grid-template-columns: repeat(5, 270px); 
  gap: 20px;
  justify-content: center; 
  margin-top: 0px;
  background-color: #fff;
}

.drawing-card {
  aspect-ratio: 1 / 1; 
  width: 100%;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  box-sizing: border-box;
  transition: transform 0.2s ease;
}

.thumbnail {
  flex-grow: 1;
  width: 100%;
  aspect-ratio: 1 / 1;
  display: grid;
  background-color: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.pixel-cell {
  width: 100%;
  height: 100%;
  border: 0.5px solid #ddd;
}

.pixel-row {
  display: contents;
}
.drawing-info {
  margin-top: 12px;
  width: 100%;
  text-align: center;
  color: #ddd;
}
.clickable-author {
  color: #5ea2ff;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s ease;
}
.edit-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.edit-controls button {
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
}
.drawing-info h3 {
  font-size: 1.1rem;
  margin-bottom: 6px;
  color: #575757;
}

.drawing-info p {
  margin: 4px 0;
  font-size: 0.9rem;
  color: #bbb;
}
.pagination {
  display: flex;
  justify-content: center;
  padding: 3%;
  
}
</style>