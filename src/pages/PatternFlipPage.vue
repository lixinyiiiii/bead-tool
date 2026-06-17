<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePatternStore } from '@/stores/patternStore'
import { useDrawingStore } from '@/stores/drawingStore'
import type { BeadCell, BeadPattern } from '@/types'

const router = useRouter()
const patternStore = usePatternStore()
const drawingStore = useDrawingStore()

type FlipMode = 'horizontal' | 'vertical' | 'both'

const sourcePattern = ref<BeadPattern | null>(null)
const sourceType = ref<'saved' | 'current'>('saved')
const flipMode = ref<FlipMode>('horizontal')
const flippedGrid = ref<BeadCell[][]>([])
const flipResultName = ref('')

const showPatternPicker = ref(false)

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

function flipGrid(grid: BeadCell[][], mode: FlipMode): BeadCell[][] {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const result: BeadCell[][] = []

  for (let r = 0; r < rows; r++) {
    const row: BeadCell[] = []
    for (let c = 0; c < cols; c++) {
      let srcR = r
      let srcC = c
      if (mode === 'horizontal' || mode === 'both') srcC = cols - 1 - c
      if (mode === 'vertical' || mode === 'both') srcR = rows - 1 - r
      row.push({ ...grid[srcR][srcC] })
    }
    result.push(row)
  }
  return result
}

const hasPattern = computed(() => sourcePattern.value !== null)

watch([sourcePattern, flipMode], () => {
  if (sourcePattern.value) {
    flippedGrid.value = flipGrid(sourcePattern.value.grid, flipMode.value)
    flipResultName.value = `${sourcePattern.value.name}_${flipMode.value === 'horizontal' ? '左右翻转' : flipMode.value === 'vertical' ? '上下翻转' : '双向翻转'}`
  } else {
    flippedGrid.value = []
    flipResultName.value = ''
  }
})

// Canvas preview
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const previewContainerRef = ref<HTMLDivElement | null>(null)

function drawPreview() {
  const canvas = previewCanvasRef.value
  if (!canvas || flippedGrid.value.length === 0) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rows = flippedGrid.value.length
  const cols = flippedGrid.value[0]?.length ?? 0
  const containerW = previewContainerRef.value?.clientWidth ?? 360
  const cs = Math.max(3, Math.min(14, Math.floor((containerW - 16) / cols)))

  canvas.width = cols * cs
  canvas.height = rows * cs
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = flippedGrid.value[r][c]
      ctx.fillStyle = cell.hex
      ctx.fillRect(c * cs, r * cs, cs, cs)

      if (cs >= 8 && cell.code) {
        ctx.fillStyle = isLightColor(cell.hex) ? '#333' : '#fff'
        ctx.font = `bold ${Math.max(5, cs * 0.26)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(cell.code, c * cs + cs / 2, r * cs + cs / 2)
      }
    }
  }

  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 0.5
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * cs)
    ctx.lineTo(cols * cs, r * cs)
    ctx.stroke()
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath()
    ctx.moveTo(c * cs, 0)
    ctx.lineTo(c * cs, rows * cs)
    ctx.stroke()
  }
}

watch(flippedGrid, () => nextTick(drawPreview))

function selectPattern(p: BeadPattern) {
  sourcePattern.value = p
  sourceType.value = 'saved'
  showPatternPicker.value = false
}

function importFromCanvas() {
  const grid = drawingStore.grid
  if (!grid.length || !grid[0].length) return
  sourcePattern.value = {
    id: '__canvas__',
    name: '当前画布',
    cols: grid[0].length,
    rows: grid.length,
    grid: grid,
    sourceType: 'drawing',
    createdAt: new Date().toISOString(),
  }
  sourceType.value = 'current'
}

function saveFlippedPattern() {
  if (flippedGrid.value.length === 0) return
  const rows = flippedGrid.value.length
  const cols = flippedGrid.value[0]?.length ?? 0
  const pattern = patternStore.createPattern(flipResultName.value, cols, rows, sourcePattern.value?.sourceType)
  pattern.grid = JSON.parse(JSON.stringify(flippedGrid.value))
  router.push(`/pattern/${pattern.id}`)
}

function exportFlippedPNG() {
  if (flippedGrid.value.length === 0) return
  const rows = flippedGrid.value.length
  const cols = flippedGrid.value[0]?.length ?? 0
  const cs = 16
  const padding = 24
  const headerH = 48

  const canvas = document.createElement('canvas')
  canvas.width = cols * cs + padding * 2
  canvas.height = headerH + rows * cs + padding
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#333333'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${flipResultName.value}  (${cols}x${rows})`, padding, headerH / 2)

  const gridY = headerH
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = flippedGrid.value[r][c]
      ctx.fillStyle = cell.hex
      ctx.fillRect(padding + c * cs, gridY + r * cs, cs, cs)

      if (cell.code) {
        ctx.fillStyle = isLightColor(cell.hex) ? '#333' : '#fff'
        ctx.font = `bold ${Math.max(6, cs * 0.32)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(cell.code, padding + c * cs + cs / 2, gridY + r * cs + cs / 2)
      }
    }
  }

  ctx.strokeStyle = '#cccccc'
  ctx.lineWidth = 0.5
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath()
    ctx.moveTo(padding, gridY + r * cs)
    ctx.lineTo(padding + cols * cs, gridY + r * cs)
    ctx.stroke()
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath()
    ctx.moveTo(padding + c * cs, gridY)
    ctx.lineTo(padding + c * cs, gridY + rows * cs)
    ctx.stroke()
  }

  const link = document.createElement('a')
  link.download = `${flipResultName.value}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

onMounted(() => {
  drawPreview()
  window.addEventListener('resize', drawPreview)
})
onUnmounted(() => {
  window.removeEventListener('resize', drawPreview)
})
</script>

<template>
  <div class="flip-page">
    <van-nav-bar title="图纸翻转" left-arrow @click-left="router.back()" />

    <!-- Source selection -->
    <div class="section">
      <div class="section-title">选择图纸来源</div>
      <div class="source-btns">
        <van-button
          :type="sourceType === 'saved' ? 'primary' : 'default'"
          size="small"
          @click="showPatternPicker = true; sourceType = 'saved'"
        >从图纸库选择</van-button>
        <van-button
          :type="sourceType === 'current' ? 'primary' : 'default'"
          size="small"
          @click="importFromCanvas"
        >从画布导入</van-button>
      </div>

      <div v-if="sourcePattern" class="source-info">
        <span class="source-name">{{ sourcePattern.name }}</span>
        <span class="source-meta">{{ sourcePattern.cols }}x{{ sourcePattern.rows }}</span>
      </div>
      <div v-else class="source-empty">未选择图纸</div>
    </div>

    <!-- Flip mode -->
    <div class="section">
      <div class="section-title">翻转方式</div>
      <van-radio-group v-model="flipMode" direction="horizontal">
        <van-radio name="horizontal">左右翻转</van-radio>
        <van-radio name="vertical">上下翻转</van-radio>
        <van-radio name="both">双向翻转</van-radio>
      </van-radio-group>
    </div>

    <!-- Preview -->
    <div class="section" v-if="flippedGrid.length > 0">
      <div class="section-title">翻转预览</div>
      <div class="result-name">{{ flipResultName }}</div>
      <div class="preview-container" ref="previewContainerRef">
        <canvas ref="previewCanvasRef" />
      </div>
      <div class="action-btns">
        <van-button type="primary" size="small" @click="saveFlippedPattern">保存到图纸库</van-button>
        <van-button size="small" @click="exportFlippedPNG">导出 PNG</van-button>
      </div>
    </div>

    <!-- Pattern picker popup -->
    <van-popup v-model:show="showPatternPicker" position="bottom" round :style="{ maxHeight: '60vh' }">
      <div class="picker-popup">
        <div class="popup-header">
          <span>选择图纸</span>
          <van-icon name="cross" size="18" @click="showPatternPicker = false" />
        </div>
        <div v-if="patternStore.patterns.length === 0" class="picker-empty">
          <van-empty description="暂无图纸" image="search" />
        </div>
        <div v-else class="picker-list">
          <div
            v-for="p in patternStore.patterns"
            :key="p.id"
            class="picker-item"
            :class="{ active: sourcePattern?.id === p.id }"
            @click="selectPattern(p)"
          >
            <span class="picker-name">{{ p.name }}</span>
            <span class="picker-meta">{{ p.cols }}x{{ p.rows }}</span>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.flip-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 20px;
}

.section {
  background: #fff;
  margin: 8px 0;
  padding: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 12px;
}

.source-btns {
  display: flex;
  gap: 10px;
}

.source-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 8px 12px;
  background: #f7f8fa;
  border-radius: 6px;
}

.source-name {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}

.source-meta {
  font-size: 12px;
  color: #969799;
}

.source-empty {
  margin-top: 10px;
  font-size: 13px;
  color: #969799;
}

.result-name {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
}

.preview-container {
  overflow: auto;
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.preview-container canvas {
  image-rendering: pixelated;
}

.action-btns {
  display: flex;
  gap: 10px;
}

.picker-popup {
  padding: 0 0 16px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  font-size: 16px;
  font-weight: 600;
}

.picker-empty {
  padding: 20px 0;
}

.picker-list {
  max-height: 45vh;
  overflow-y: auto;
}

.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f7f8fa;
  cursor: pointer;
  transition: background 0.1s;
}

.picker-item:active {
  background: #f2f3f5;
}

.picker-item.active {
  background: #ecf5ff;
}

.picker-name {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
}

.picker-meta {
  font-size: 12px;
  color: #969799;
}
</style>
