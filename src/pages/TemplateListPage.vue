<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useDrawingStore } from '@/stores/drawingStore'
import { TEMPLATES } from '@/data/templates'
import type { PatternTemplate, BeadCell } from '@/types'

const router = useRouter()
const drawingStore = useDrawingStore()

const activeCategory = ref('全部')
const categories = computed(() => {
  const cats = new Set(TEMPLATES.map(t => t.category))
  return ['全部', ...cats]
})

const filteredTemplates = computed(() => {
  if (activeCategory.value === '全部') return TEMPLATES
  return TEMPLATES.filter(t => t.category === activeCategory.value)
})

const canvasRefs = ref<Map<string, HTMLCanvasElement>>(new Map())

function setCanvasRef(id: string, el: any) {
  if (el) canvasRefs.value.set(id, el as HTMLCanvasElement)
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

function drawThumbnail(t: PatternTemplate) {
  const canvas = canvasRefs.value.get(t.id)
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cs = 12
  canvas.width = t.cols * cs
  canvas.height = t.rows * cs
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let r = 0; r < t.rows; r++) {
    for (let c = 0; c < t.cols; c++) {
      const cell = t.grid[r][c]
      ctx.fillStyle = cell.hex
      ctx.fillRect(c * cs, r * cs, cs, cs)
    }
  }

  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 0.5
  for (let r = 0; r <= t.rows; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * cs)
    ctx.lineTo(t.cols * cs, r * cs)
    ctx.stroke()
  }
  for (let c = 0; c <= t.cols; c++) {
    ctx.beginPath()
    ctx.moveTo(c * cs, 0)
    ctx.lineTo(c * cs, t.rows * cs)
    ctx.stroke()
  }
}

function countBeads(t: PatternTemplate): number {
  let count = 0
  for (const row of t.grid) {
    for (const cell of row) {
      if (cell.code) count++
    }
  }
  return count
}

function countColors(t: PatternTemplate): number {
  const set = new Set<string>()
  for (const row of t.grid) {
    for (const cell of row) {
      if (cell.code) set.add(cell.code)
    }
  }
  return set.size
}

function useTemplate(t: PatternTemplate) {
  const maxSize = '52x52' as const
  drawingStore.setCanvasSize(maxSize)

  const targetRows = parseInt(maxSize.split('x')[1])
  const targetCols = parseInt(maxSize.split('x')[0])

  const grid: BeadCell[][] = Array.from({ length: targetRows }, (_, r) =>
    Array.from({ length: targetCols }, (_, c) => {
      const src = t.grid[r]?.[c]
      return src ? { code: src.code, hex: src.hex } : { code: '', hex: '#FFFFFF' }
    })
  )

  drawingStore.grid = grid
  drawingStore.currentColorCode = 'C2'
  router.push('/draw')
}

onMounted(() => {
  nextTick(() => {
    TEMPLATES.forEach(drawThumbnail)
  })
  window.addEventListener('resize', () => TEMPLATES.forEach(drawThumbnail))
})

onUnmounted(() => {
  window.removeEventListener('resize', () => TEMPLATES.forEach(drawThumbnail))
})
</script>

<template>
  <div class="template-page">
    <van-nav-bar title="模板图纸" left-arrow @click-left="router.back()" />

    <div class="category-bar">
      <van-button
        v-for="cat in categories"
        :key="cat"
        size="mini"
        :type="activeCategory === cat ? 'primary' : 'default'"
        plain
        @click="activeCategory = cat"
      >{{ cat }}</van-button>
    </div>

    <div class="template-grid">
      <div
        v-for="t in filteredTemplates"
        :key="t.id"
        class="template-card"
        @click="useTemplate(t)"
      >
        <div class="template-thumb">
          <canvas :ref="(el: any) => setCanvasRef(t.id, el)" style="image-rendering: pixelated" />
        </div>
        <div class="template-info">
          <div class="template-name">{{ t.name }}</div>
          <div class="template-meta">
            <span>{{ t.cols }}x{{ t.rows }}</span>
            <span>{{ countBeads(t) }} 颗</span>
            <span>{{ countColors(t) }} 色</span>
          </div>
        </div>
      </div>
    </div>

    <van-empty v-if="filteredTemplates.length === 0" description="暂无模板" />
  </div>
</template>

<style scoped>
.template-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.category-bar {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
  overflow-x: auto;
  flex-wrap: nowrap;
}

.template-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
}

.template-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.15s;
}

.template-card:active {
  transform: scale(0.97);
}

.template-thumb {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.template-thumb canvas {
  max-width: 100%;
  height: auto;
}

.template-info {
  text-align: center;
}

.template-name {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.template-meta {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  color: #969799;
}
</style>
