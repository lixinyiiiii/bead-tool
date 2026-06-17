<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePatternStore } from '@/stores/patternStore'
import { showConfirmDialog } from 'vant'

const route = useRoute()
const router = useRouter()
const patternStore = usePatternStore()

const patternId = computed(() => route.params.id as string)
const pattern = computed(() => patternStore.patterns.find(p => p.id === patternId.value))

const colorCounts = computed(() => {
  if (!pattern.value) return []
  const map = new Map<string, { code: string; hex: string; count: number }>()
  for (const row of pattern.value.grid) {
    for (const cell of row) {
      if (!cell.code) continue
      const existing = map.get(cell.code)
      if (existing) {
        existing.count++
      } else {
        map.set(cell.code, { code: cell.code, hex: cell.hex, count: 1 })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
})

const totalBeads = computed(() => {
  if (!pattern.value) return 0
  let count = 0
  for (const row of pattern.value.grid) {
    for (const cell of row) {
      if (cell.code) count++
    }
  }
  return count
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

function drawCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !pattern.value) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cols = pattern.value.cols
  const rows = pattern.value.rows
  const cs = Math.max(4, Math.min(12, Math.floor((window.innerWidth - 32) / cols)))

  canvas.width = cols * cs
  canvas.height = rows * cs
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = pattern.value.grid[r]?.[c]
      if (!cell) continue
      ctx.fillStyle = cell.hex
      ctx.fillRect(c * cs, r * cs, cs, cs)

      if (cs >= 10 && cell.code) {
        ctx.fillStyle = isLightColor(cell.hex) ? '#333' : '#fff'
        ctx.font = `bold ${Math.max(6, cs * 0.25)}px sans-serif`
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

function handleResize() {
  drawCanvas()
}

function handleDelete() {
  showConfirmDialog({
    title: '删除图纸',
    message: '确定删除此图纸？删除后不可恢复。',
  }).then(() => {
    patternStore.removePattern(patternId.value)
    router.back()
  }).catch(() => {})
}

function exportImage() {
  const canvas = canvasRef.value
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `${pattern.value?.name ?? 'pattern'}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

onMounted(() => {
  drawCanvas()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="pattern-view-page" v-if="pattern">
    <van-nav-bar :title="pattern.name" left-arrow @click-left="router.back()">
      <template #right>
        <van-icon name="delete-o" size="20" @click="handleDelete" />
      </template>
    </van-nav-bar>

    <div class="info-bar">
      <span>{{ pattern.cols }}x{{ pattern.rows }}</span>
      <span>{{ totalBeads }} 颗</span>
      <span>{{ pattern.sourceType === 'image' ? '图片转图' : '手绘' }}</span>
      <van-button size="mini" type="primary" @click="exportImage">导出</van-button>
    </div>

    <div class="canvas-wrapper">
      <canvas ref="canvasRef" />
    </div>

    <div class="count-section">
      <div class="count-header">用豆统计 ({{ colorCounts.length }} 色)</div>
      <div class="count-list">
        <div v-for="c in colorCounts" :key="c.code" class="count-row">
          <div class="count-swatch" :style="{ backgroundColor: c.hex }" />
          <span class="count-code">{{ c.code }}</span>
          <span class="count-num">{{ c.count }}</span>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="empty-page">
    <van-nav-bar title="图纸详情" left-arrow @click-left="router.back()" />
    <van-empty description="图纸不存在" />
  </div>
</template>

<style scoped>
.pattern-view-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.info-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
  font-size: 13px;
  color: #646566;
}

.canvas-wrapper {
  padding: 8px;
  overflow: auto;
  display: flex;
  justify-content: center;
}

canvas {
  image-rendering: pixelated;
}

.count-section {
  background: #fff;
  margin-top: 8px;
}

.count-header {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  border-bottom: 1px solid #ebedf0;
}

.count-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid #f7f8fa;
}

.count-swatch {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid #ebedf0;
  flex-shrink: 0;
}

.count-code {
  font-size: 13px;
  font-weight: 600;
  color: #323233;
  min-width: 32px;
}

.count-num {
  font-size: 13px;
  color: #646566;
  margin-left: auto;
}

.empty-page {
  min-height: 100vh;
  background: #f7f8fa;
}
</style>
