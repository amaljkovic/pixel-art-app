<template>
    <div class="thumbnail-grid">
      <!-- Iterate over the rows in picture_data -->
      <div
        v-for="(row, rowIndex) in pictureData"
        :key="'row-' + rowIndex"
        class="thumbnail-row"
      >
        <!-- Iterate over each color in the row -->
        <div
          v-for="(color, colIndex) in row"
          :key="'cell-' + rowIndex + '-' + colIndex"
          class="thumbnail-cell"
          :style="{ backgroundColor: color }"
        ></div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { PropType } from 'vue';
  
  defineProps({
    pictureData: {
      type: Array as PropType<string[][]>,
      required: true,
    },
  });
  </script>
  
  <style scoped>
  .thumbnail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, 20px); 
    grid-template-rows: repeat(auto-fill, 20px); 
    width: max-content;
    height: max-content;
  }
  
  .thumbnail-row {
    display: flex;
  }
  
  .thumbnail-cell {
    width: 20px;
    height: 20px;
    background-color: #ffffff; 
  }
  </style>