<script setup lang="ts">

import { ref, watch, watchEffect, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore';
import { socket } from '@/socket'
import { useRoute } from 'vue-router';
import type { CSSProperties } from 'vue';

const props = defineProps({
  color: {
    type: String,
    required: true
  },
  gridSize: {
    type: Number,
    required: true
  },
  tool: {
    type: String,
    required: true
  },
  readonly: {
    type: Boolean,
    required: false,
    default: false
  },
  pictureData: {
    type: Array as () => string[][],
    required: false,
  },
  pictureId: {                     
    type: String,
    required: false
  },
  otherCursors: {
    type: Array as () => { userId: string; x: number; y: number; username: string }[],
    required: false,
    default: () => []
  }
});
const emit = defineEmits<{
  (e: 'update:pictureData', value: string[][]): void;
  (e: 'pixelUpdate', payload: { x: number, y: number, color: string }): void;
}>();
const isPainting = ref(false);
const internalData = ref<string[][]>([]);
const route = useRoute();

const authStore = useAuthStore();

const paintPixel = (x: number, y: number) => {
  if (props.readonly) {
    console.warn('Painting prevented: readonly is true');
    return;
  }

  if (!internalData.value[y] || internalData.value[y][x] === undefined){
    console.warn(`Invalid cell access at (${x}, ${y})`);
    return;
  }
  const newColor = props.tool === 'eraser' ? '#ffffff' : props.color;

  console.log(`Painting pixel at (${x}, ${y}) with color ${newColor}`);

  internalData.value[y][x] = newColor;

  emit('update:pictureData', internalData.value.map(row => [...row]));
  emit('pixelUpdate', { x, y, color: newColor });
};


watchEffect(() => {
  console.log('Forcing update - internalData changed');
  if (!props.pictureData || props.pictureData.length === 0) {
    internalData.value = Array(props.gridSize).fill(null).map(() => Array(props.gridSize).fill('#ffffff'));
    const deepClone = (data: string[][]) => data.map(row => [...row]);
    emit('update:pictureData', deepClone(internalData.value));
    console.log(' Initialized new grid inside Grid.vue');
  } else {
    internalData.value = props.pictureData.map(row => [...row]);
    console.log('Synced internalData from props:', internalData.value);
  }
});

const gridStyle = computed(() => {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${props.gridSize}, 1fr)`,
    gridTemplateRows: `repeat(${props.gridSize}, 1fr)`,
    aspectRatio: '1 / 1',
    width: '500px',
    height: '500px',
    gap: '1px'
  };
});


const startPainting = (x: number, y: number) => {
  if (props.readonly){
    console.warn('startPainting skipped: readonly is true');
    return;
  }
  isPainting.value = true;
  console.log('startPainting: isPainting = true');
  paintPixel(x, y);
};

const stopPainting = () => {
  if (props.readonly){
      return;
  }
  isPainting.value = false;
};

const getCursorStyle = (x: number, y: number): CSSProperties => {
  const left = (x + 0.5) * (100 / props.gridSize);
  const top = (y + 0.5) * (100 / props.gridSize);
  return {
    position: 'absolute',
    left: `${left}%`,
    top: `${top}%`,
    transform: 'translate(-50%, -50%)'
  };
};

const isAuthenticated = computed(() => !!authStore.token);

const handleMouseOver = (x: number, y: number) => { //fixthis: ---->
  if (isPainting.value) paintPixel(x, y);

  if (isAuthenticated && props.pictureId) {
    socket.emit('cursorMove', {
      x,
      y,
      pictureId:props.pictureId,
      userId: authStore.userId,
      username: authStore.username,
    });
  }
};
</script>

<template>
  <div class="pixel-grid" :style="gridStyle" @mouseup="stopPainting" @mouseleave="stopPainting">
    <template v-for="(row, y) in internalData" :key="y">
      <div
        v-for="(color, x) in row"
        :key="`${y}-${x}`"
        class="pixel"
        :style="{ backgroundColor: color }"
        @mousedown="startPainting(x, y)"
        @mousemove="handleMouseOver(x, y)"
      />
    </template>

    <div
      v-for="cursor in props.otherCursors"
      :key="cursor.userId"
      class="remote-cursor"
      :style="getCursorStyle(cursor.x, cursor.y)"
    >
      <div class="cursor-box">
        <div class="cursor-dot"></div>
        <span class="username">{{ cursor.username }}</span>
      </div>
    </div>
  </div>
</template>


<style scoped>
.pixel-grid {
  display: grid;
  position: relative;
  gap: 1px;
  margin: 0 auto;
  aspect-ratio: 1 / 1;
  width: min(80vmin, 600px);
  flex-shrink: 0;
}

.pixel {
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  border: 1px solid #c5c5c5;
  cursor: pointer;
}
.remote-cursor {
  pointer-events: none;
  z-index: 10;
  position: absolute;
}

.cursor-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cursor-dot {
  width: 8px;
  height: 8px;
  background-color: red;
  border-radius: 50%;
}

.username {
  font-size: 10px;
  background-color: rgba(255, 255, 255, 0.75);
  padding: 1px 4px;
  border-radius: 4px;
  margin-top: 2px;
}
</style>