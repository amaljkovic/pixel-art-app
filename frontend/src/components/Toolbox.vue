<script setup lang="ts">
import { ref, defineEmits } from 'vue'

const emit = defineEmits(['colorSelected', 'toolSelected'])
const selectedTool = ref('pencil')

const color = ref('#000000') 

const changeColor = () => {
  emit('colorSelected', color.value)
}

const selectTool = (tool: string) => {
  selectedTool.value = tool
  emit('toolSelected', tool)
}
</script>

<template>
    <div class="toolbox">
      

      <button @click="selectTool('pencil')">Pencil</button>
      <button @click="selectTool('eraser')">Eraser</button>
      
      <div class="color-picker">
        <label for="color">Color:</label>
        <input type="color" id="color" v-model="color" @input="changeColor" />
      </div>
    </div>
  </template>


<style scoped>
.toolbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 8px;
  width: 200px;
  height: 200px;
  margin: 0 auto; 
}

.tool-label,
.color-picker label {
  font-weight: bold;
  color: #959696;
  margin-bottom: 4px;
  text-align: center;
}

.color-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.color-picker input[type="color"] {
  margin-top: 6px;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

button {
  padding: 8px 12px;
  background-color: #bcbfbf;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}

button:hover {
  background-color: #4e4f50;
}
</style>