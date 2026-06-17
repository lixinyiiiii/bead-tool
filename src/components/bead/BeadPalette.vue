<script setup lang="ts">
import { ref } from 'vue'
import { useColorStore } from '@/stores/colorStore'
import { MARD_SERIES_ORDER } from '@/assets/colors/mard-221'
import type { BeadColor } from '@/types'

const colorStore = useColorStore()
const activeTab = ref(0)

const emit = defineEmits<{
  select: [color: BeadColor]
}>()

const props = defineProps<{
  selectedCode?: string
}>()

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}
</script>

<template>
  <div class="bead-palette">
    <van-tabs v-model:active="activeTab" scrollspy sticky>
      <van-tab v-for="series in MARD_SERIES_ORDER" :key="series" :title="series + '系'">
        <div class="series-label">{{ series }}系列</div>
        <div class="color-grid">
          <div
            v-for="color in colorStore.colorsBySeries[series]"
            :key="color.code"
            class="color-swatch"
            :class="{
              selected: color.code === selectedCode,
              'light-bg': isLightColor(color.hex),
            }"
            :style="{ backgroundColor: color.hex }"
            @click="emit('select', color)"
          >
            <span class="color-code">{{ color.code }}</span>
          </div>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped>
.bead-palette {
  background: #fff;
}

.series-label {
  padding: 12px 16px 8px;
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  gap: 6px;
  padding: 0 12px 16px;
}

.color-swatch {
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.1s, border-color 0.15s;
}

.color-swatch:active {
  transform: scale(0.92);
}

.color-swatch.selected {
  border-color: #1989fa;
  box-shadow: 0 0 0 2px rgba(25, 137, 250, 0.25);
}

.color-code {
  font-size: 9px;
  font-weight: 600;
  pointer-events: none;
}

.color-swatch:not(.light-bg) .color-code {
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.light-bg .color-code {
  color: #333;
  text-shadow: none;
}
</style>
