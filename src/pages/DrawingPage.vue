<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDrawingStore } from '@/stores/drawingStore'
import { usePatternStore } from '@/stores/patternStore'
import { useDraftStore } from '@/stores/draftStore'
import { showDialog, showConfirmDialog } from 'vant'
import DrawingCanvas from '@/components/canvas/DrawingCanvas.vue'

const route = useRoute()
const router = useRouter()
const drawingStore = useDrawingStore()
const patternStore = usePatternStore()
const draftStore = useDraftStore()

const showExport = ref(false)
const sortBy = ref<'alpha' | 'count'>('count')
const patternName = ref('')

const draftId = computed(() => (route.query.draft as string) || '')
const currentDraft = computed(() => draftStore.drafts.find(d => d.id === draftId.value))

onMounted(() => {
  if (currentDraft.value) {
    const d = currentDraft.value
    drawingStore.canvasSize = d.canvasSize
    drawingStore.mirrorMode = d.mirrorMode
    drawingStore.subGridSize = d.subGridSize as any
    drawingStore.currentColorCode = d.currentColorCode
    drawingStore.grid = JSON.parse(JSON.stringify(d.grid))
  }
})

function openSaveSheet() {
  showDialog({
    title: '保存',
    message: '请选择保存方式',
    showCancelButton: true,
    confirmButtonText: '导出图纸',
    cancelButtonText: '存为草稿',
  }).then(() => {
    openExport()
  }).catch(() => {
    saveAsDraft()
  })
}

function saveAsDraft() {
  const name = currentDraft.value?.name || `草稿 ${draftStore.drafts.length + 1}`
  draftStore.saveDraft(
    name,
    drawingStore.canvasSize,
    drawingStore.mirrorMode,
    drawingStore.subGridSize as number,
    drawingStore.currentColorCode,
    drawingStore.grid
  )
  showDialog({ title: '已保存', message: '草稿已保存到草稿箱', confirmButtonText: '好的' })
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

const colorCounts = computed(() => {
  const map = new Map<string, { code: string; hex: string; count: number }>()
  for (const row of drawingStore.grid) {
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
  return Array.from(map.values()).sort((a, b) =>
    sortBy.value === 'count' ? b.count - a.count : a.code.localeCompare(b.code)
  )
})

const totalCount = computed(() => {
  let count = 0
  for (const row of drawingStore.grid) {
    for (const cell of row) {
      if (cell.code) count++
    }
  }
  return count
})

function openExport() {
  patternName.value = currentDraft.value?.name || `图纸 ${patternStore.patterns.length + 1}`
  sortBy.value = 'count'
  showExport.value = true
}

function generatePNG() {
  const grid = drawingStore.grid
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const cs = 16

  const padding = 24
  const headerH = 48
  const legendGap = 20
  const legendEntryW = 110
  const legendEntryH = 32
  const legendCols = Math.max(1, Math.floor((cols * cs + padding * 2) / legendEntryW))
  const legendRows = Math.ceil(colorCounts.value.length / legendCols)
  const legendH = legendRows * legendEntryH

  const canvasW = cols * cs + padding * 2
  const canvasH = headerH + rows * cs + legendGap + legendH + padding

  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvasW, canvasH)

  ctx.fillStyle = '#333333'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${patternName.value}  总计: ${totalCount.value} 颗`, padding, headerH / 2)

  const gridY = headerH
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c]
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

  const legendY = gridY + rows * cs + legendGap
  ctx.fillStyle = '#333333'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('用豆统计', padding, legendY - 2)

  const legendStartY = legendY + 18
  const swatchSize = 20
  const textPad = 4

  colorCounts.value.forEach((c, i) => {
    const col = i % legendCols
    const row = Math.floor(i / legendCols)
    const x = padding + col * legendEntryW
    const y = legendStartY + row * legendEntryH

    ctx.fillStyle = c.hex
    ctx.fillRect(x, y + 4, swatchSize, swatchSize)
    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = 0.5
    ctx.strokeRect(x, y + 4, swatchSize, swatchSize)

    ctx.fillStyle = '#333333'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${c.code}(${c.count})`, x + swatchSize + textPad, y + 4 + swatchSize / 2)
  })

  const link = document.createElement('a')
  link.download = `${patternName.value}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()

  const pattern = patternStore.createPattern(patternName.value, cols, rows, 'drawing')
  pattern.grid = JSON.parse(JSON.stringify(grid))

  // Remove the draft after export
  if (currentDraft.value) {
    draftStore.removeDraft(currentDraft.value.id)
  }

  showExport.value = false
}
</script>

<template>
  <DrawingCanvas @save="openSaveSheet" />

  <van-popup v-model:show="showExport" position="bottom" round :style="{ maxHeight: '80vh' }">
    <div class="export-popup">
      <div class="popup-header">
        <span>导出图纸</span>
        <van-icon name="cross" size="18" @click="showExport = false" />
      </div>

      <div class="export-field">
        <span class="field-label">图纸名称</span>
        <van-field v-model="patternName" placeholder="输入名称" :border="false" />
      </div>

      <div class="export-field">
        <span class="field-label">色号排列</span>
        <van-radio-group v-model="sortBy" direction="horizontal">
          <van-radio name="count">按数量排序</van-radio>
          <van-radio name="alpha">按色号排序</van-radio>
        </van-radio-group>
      </div>

      <div class="export-preview">
        <div class="preview-total">总计: {{ totalCount }} 颗 ({{ colorCounts.length }} 色)</div>
        <div class="preview-legend">
          <div v-for="c in colorCounts" :key="c.code" class="legend-item">
            <div class="legend-swatch" :style="{ backgroundColor: c.hex }" />
            <span class="legend-text">{{ c.code }}({{ c.count }})</span>
          </div>
        </div>
      </div>

      <van-button type="primary" block @click="generatePNG">导出 PNG</van-button>
    </div>
  </van-popup>
</template>

<style scoped>
.export-popup {
  padding: 0 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  font-size: 16px;
  font-weight: 600;
}

.export-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}

.export-preview {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 12px;
}

.preview-total {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
}

.preview-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 80px;
}

.legend-swatch {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: 1px solid #ebedf0;
  flex-shrink: 0;
}

.legend-text {
  font-size: 11px;
  font-weight: 600;
  color: #323233;
}
</style>
