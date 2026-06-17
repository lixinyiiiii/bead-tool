<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useDrawingStore } from '@/stores/drawingStore'
import { useColorStore } from '@/stores/colorStore'
import { useFavoriteStore } from '@/stores/favoriteStore'
import type { BeadCell, DrawingTool, MirrorMode, SubGridSize, CanvasSize } from '@/types'

const drawingStore = useDrawingStore()
const colorStore = useColorStore()
const favoriteStore = useFavoriteStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const isDrawing = ref(false)
const strokeAction = ref<'paint' | 'erase' | null>(null)

const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

const showPalette = ref(false)
const showSettings = ref(false)
const showStats = ref(false)

const history = ref<string[]>([])
const redoStack = ref<string[]>([])
const MAX_HISTORY = 80

// Zoom & Pan state
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const baseCellSize = ref(8)

const MIN_ZOOM = 0.5
const MAX_ZOOM = 5

// Touch interaction state
let isPinching = false
let isPanning = false
let lastTouchDist = 0
let lastTouchCenter = { x: 0, y: 0 }
let lastSingleTouch = { x: 0, y: 0 }
let singleTouchMoved = false

function snapshot() {
  return JSON.stringify(drawingStore.grid)
}

function pushHistory() {
  history.value.push(snapshot())
  if (history.value.length > MAX_HISTORY) history.value.shift()
  redoStack.value = []
}

function undo() {
  if (history.value.length === 0) return
  redoStack.value.push(snapshot())
  const prev = history.value.pop()!
  drawingStore.grid = JSON.parse(prev)
  drawCanvas()
}

function redo() {
  if (redoStack.value.length === 0) return
  history.value.push(snapshot())
  const next = redoStack.value.pop()!
  drawingStore.grid = JSON.parse(next)
  drawCanvas()
}

const canUndo = computed(() => history.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault()
    redo()
  }
}

function recalcBaseCellSize() {
  if (!containerRef.value) return
  const maxWidth = containerRef.value.clientWidth - 16
  const cols = drawingStore.grid[0]?.length ?? 52
  baseCellSize.value = Math.max(4, Math.floor(maxWidth / cols))
}

function getCellFromEvent(e: MouseEvent | TouchEvent): { row: number; col: number } | null {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  let clientX: number, clientY: number
  if ('touches' in e) {
    if (e.touches.length === 0 && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX
      clientY = e.changedTouches[0].clientY
    } else if (e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      return null
    }
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  // canvas display rect already includes zoom via CSS width/height
  const scaleX = canvas.width / (rect.width * dpr)
  const scaleY = canvas.height / (rect.height * dpr)
  const x = (clientX - rect.left) * scaleX
  const y = (clientY - rect.top) * scaleY
  const cs = baseCellSize.value
  const col = Math.floor(x / cs)
  const row = Math.floor(y / cs)
  const maxRow = drawingStore.grid.length
  const maxCol = drawingStore.grid[0]?.length ?? 0
  if (row < 0 || row >= maxRow || col < 0 || col >= maxCol) return null
  return { row, col }
}

function applyTool(row: number, col: number) {
  const tool = drawingStore.currentTool
  const mirror = drawingStore.mirrorMode
  const cols = drawingStore.grid[0].length
  const rows = drawingStore.grid.length

  const targets: { row: number; col: number }[] = [{ row, col }]

  if (mirror === 'horizontal' || mirror === 'both') {
    targets.push({ row, col: cols - 1 - col })
  }
  if (mirror === 'vertical' || mirror === 'both') {
    targets.push({ row: rows - 1 - row, col })
  }
  if (mirror === 'both') {
    targets.push({ row: rows - 1 - row, col: cols - 1 - col })
  }

  for (const t of targets) {
    if (t.row < 0 || t.row >= rows || t.col < 0 || t.col >= cols) continue

    if (tool === 'brush') {
      const color = colorStore.findByCode(drawingStore.currentColorCode)
      if (color) {
        if (strokeAction.value === 'erase') {
          drawingStore.grid[t.row][t.col] = { code: '', hex: '#FFFFFF' }
        } else {
          drawingStore.grid[t.row][t.col] = { code: color.code, hex: color.hex }
        }
      }
    } else if (tool === 'eraser') {
      drawingStore.grid[t.row][t.col] = { code: '', hex: '#FFFFFF' }
    } else if (tool === 'fill') {
      floodFill(t.row, t.col)
    }
  }
  drawCanvas()
}

function floodFill(startRow: number, startCol: number) {
  const grid = drawingStore.grid
  const target = grid[startRow][startCol]
  const color = colorStore.findByCode(drawingStore.currentColorCode)
  if (!color) return
  const fillColor: BeadCell = { code: color.code, hex: color.hex }
  if (target.code === fillColor.code && target.hex === fillColor.hex) return

  const visited = new Set<string>()
  const stack: [number, number][] = [[startRow, startCol]]

  while (stack.length > 0) {
    const [r, c] = stack.pop()!
    const key = `${r},${c}`
    if (visited.has(key)) continue
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) continue
    if (grid[r][c].code !== target.code || grid[r][c].hex !== target.hex) continue

    visited.add(key)
    grid[r][c] = { ...fillColor }
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1])
  }
}

// Pinch zoom & pan tracking
function getTouchDist(e: TouchEvent): number {
  if (e.touches.length < 2) return 0
  const dx = e.touches[0].clientX - e.touches[1].clientX
  const dy = e.touches[0].clientY - e.touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getTouchCenter(e: TouchEvent): { x: number; y: number } {
  if (e.touches.length < 2) return { x: 0, y: 0 }
  return {
    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
    y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
  }
}

function onPointerDown(e: MouseEvent | TouchEvent) {
  e.preventDefault()

  // Mobile: two fingers = pinch/pan, cancel drawing
  if ('touches' in e && e.touches.length >= 2) {
    isPinching = true
    isPanning = false
    isDrawing.value = false
    lastTouchDist = getTouchDist(e)
    lastTouchCenter = getTouchCenter(e)
    return
  }

  // Mobile: single finger start — track for pan vs draw decision
  if ('touches' in e && e.touches.length === 1) {
    isPinching = false
    singleTouchMoved = false
    lastSingleTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    // Don't start drawing yet — wait for move or a short delay
    return
  }

  // Desktop: mousedown = draw
  if (!('touches' in e)) {
    isDrawing.value = true
    pushHistory()
    const cell = getCellFromEvent(e)
    if (cell) {
      if (drawingStore.currentTool === 'brush') {
        const color = colorStore.findByCode(drawingStore.currentColorCode)
        if (color) {
          const currentCell = drawingStore.grid[cell.row][cell.col]
          strokeAction.value = (currentCell.code === color.code) ? 'erase' : 'paint'
        }
      } else {
        strokeAction.value = null
      }
      applyTool(cell.row, cell.col)
    }
  }
}

function onPointerMove(e: MouseEvent | TouchEvent) {
  e.preventDefault()

  // Mobile: two fingers = pinch zoom + pan
  if ('touches' in e && e.touches.length >= 2) {
    if (!isPinching) {
      isPinching = true
      isPanning = false
      isDrawing.value = false
      lastTouchDist = getTouchDist(e)
      lastTouchCenter = getTouchCenter(e)
      return
    }

    const newDist = getTouchDist(e)
    const newCenter = getTouchCenter(e)

    if (lastTouchDist > 0) {
      const scale = newDist / lastTouchDist
      zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value * scale))
    }

    panX.value += newCenter.x - lastTouchCenter.x
    panY.value += newCenter.y - lastTouchCenter.y

    lastTouchDist = newDist
    lastTouchCenter = newCenter
    drawCanvas()
    return
  }

  // Mobile: single finger moved enough = pan mode
  if ('touches' in e && e.touches.length === 1) {
    if (isPinching) return

    const dx = e.touches[0].clientX - lastSingleTouch.x
    const dy = e.touches[0].clientY - lastSingleTouch.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Threshold to distinguish pan from draw
    if (dist > 8) {
      if (!isPanning && !isDrawing.value) {
        isPanning = true
        singleTouchMoved = true
      }

      if (isPanning) {
        panX.value += dx
        panY.value += dy
        lastSingleTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        drawCanvas()
        return
      }
    }

    // Single finger not moved enough yet — might be a tap for drawing
    return
  }

  // Mobile: no touches (shouldn't reach here but handle edge case)
  if ('touches' in e) return

  // Desktop: mousemove while drawing
  if (isPinching) return
  if (!isDrawing.value) return
  if (drawingStore.currentTool === 'fill') return

  const cell = getCellFromEvent(e)
  if (cell) applyTool(cell.row, cell.col)
}

function onPointerUp(e: MouseEvent | TouchEvent) {
  if ('touches' in e) {
    if (e.touches.length === 0) {
      // All fingers lifted — if single tap without pan, treat as draw tap
      if (!isPinching && !isPanning && !singleTouchMoved) {
        const ct = e.changedTouches[0]
        if (ct) {
          const fakeEvt = { clientX: ct.clientX, clientY: ct.clientY } as MouseEvent
          isDrawing.value = true
          pushHistory()
          const cell = getCellFromEvent(fakeEvt)
          if (cell) {
            if (drawingStore.currentTool === 'brush') {
              const color = colorStore.findByCode(drawingStore.currentColorCode)
              if (color) {
                const currentCell = drawingStore.grid[cell.row][cell.col]
                strokeAction.value = (currentCell.code === color.code) ? 'erase' : 'paint'
              }
            } else {
              strokeAction.value = null
            }
            applyTool(cell.row, cell.col)
          }
          isDrawing.value = false
          strokeAction.value = null
        }
      }
      isPinching = false
      isPanning = false
      singleTouchMoved = false
    }
    if (e.touches.length < 2) {
      isPinching = false
      // Remaining single finger: reset for potential pan
      if (e.touches.length === 1) {
        lastSingleTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        singleTouchMoved = false
        isPanning = false
      }
    }
  } else {
    isPinching = false
  }
  isDrawing.value = false
  strokeAction.value = null
}

// Desktop: mouse wheel = scroll/pan, trackpad pinch (ctrlKey) = zoom centered on viewport
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return

  if (e.ctrlKey || e.metaKey) {
    // Trackpad pinch zoom — center on viewport center
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const oldZoom = zoom.value
    zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value * delta))
    const zoomRatio = zoom.value / oldZoom
    panX.value *= zoomRatio
    panY.value *= zoomRatio
  } else {
    // Trackpad two-finger or mouse wheel = pan in both directions
    const step = e.deltaMode === 1 ? 40 : 1
    panY.value -= e.deltaY * step
    panX.value -= e.deltaX * step
  }
  drawCanvas()
}

function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  drawCanvas()
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

function drawCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cs = baseCellSize.value
  const rows = drawingStore.grid.length
  const cols = drawingStore.grid[0]?.length ?? 0

  const logicW = cols * cs
  const logicH = rows * cs

  // High-DPI rendering: canvas buffer at dpr resolution, CSS at logic size
  canvas.width = logicW * dpr
  canvas.height = logicH * dpr
  canvas.style.width = `${logicW}px`
  canvas.style.height = `${logicH}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, logicW, logicH)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = drawingStore.grid[r][c]
      ctx.fillStyle = cell.hex
      ctx.fillRect(c * cs, r * cs, cs, cs)

      if (cs * zoom.value >= 10 && cell.code) {
        ctx.fillStyle = isLightColor(cell.hex) ? '#333' : '#fff'
        ctx.font = `bold ${Math.max(7, cs * 0.28)}px sans-serif`
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

  const sub = drawingStore.subGridSize
  if (sub > 0) {
    ctx.strokeStyle = '#999'
    ctx.lineWidth = 1.5
    for (let r = 0; r <= rows; r += sub) {
      ctx.beginPath()
      ctx.moveTo(0, r * cs)
      ctx.lineTo(cols * cs, r * cs)
      ctx.stroke()
    }
    for (let c = 0; c <= cols; c += sub) {
      ctx.beginPath()
      ctx.moveTo(c * cs, 0)
      ctx.lineTo(c * cs, rows * cs)
      ctx.stroke()
    }
  }

  if (drawingStore.mirrorMode === 'horizontal' || drawingStore.mirrorMode === 'both') {
    ctx.strokeStyle = 'rgba(25, 137, 250, 0.4)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(cols * cs / 2, 0)
    ctx.lineTo(cols * cs / 2, rows * cs)
    ctx.stroke()
    ctx.setLineDash([])
  }
  if (drawingStore.mirrorMode === 'vertical' || drawingStore.mirrorMode === 'both') {
    ctx.strokeStyle = 'rgba(25, 137, 250, 0.4)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(0, rows * cs / 2)
    ctx.lineTo(cols * cs, rows * cs / 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function onColorSelect(color: { code: string; hex: string }) {
  drawingStore.setColor(color.code, color.hex)
  drawingStore.setTool('brush')
  showPalette.value = false
}

function changeCanvasSize(size: CanvasSize) {
  drawingStore.setCanvasSize(size)
  showSettings.value = false
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  nextTick(() => {
    recalcBaseCellSize()
    drawCanvas()
  })
}

const mirrorCycle: MirrorMode[] = ['none', 'horizontal', 'vertical', 'both']
function cycleMirror() {
  const idx = mirrorCycle.indexOf(drawingStore.mirrorMode)
  const next = mirrorCycle[(idx + 1) % mirrorCycle.length]
  drawingStore.setMirrorMode(next)
  drawCanvas()
}

function changeSubGrid(size: SubGridSize | 'none') {
  if (size === 'none') {
    drawingStore.subGridSize = 0 as any
  } else {
    drawingStore.setSubGridSize(size)
  }
  drawCanvas()
}

const currentColorHex = computed(() => {
  const c = colorStore.findByCode(drawingStore.currentColorCode)
  return c?.hex ?? '#FFFFFF'
})

const currentColorIsLight = computed(() => isLightColor(currentColorHex.value))

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
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
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

const emit = defineEmits<{
  save: []
}>()

watch([() => drawingStore.subGridSize, () => drawingStore.mirrorMode], () => {
  drawCanvas()
})

onMounted(() => {
  recalcBaseCellSize()
  drawCanvas()
  window.addEventListener('mouseup', onPointerUp)
  window.addEventListener('touchend', onPointerUp)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', onPointerUp)
  window.removeEventListener('touchend', onPointerUp)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="drawing-canvas-page">
    <van-nav-bar title="手绘画布" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="bar-chart-o" size="20" @click="showStats = true" style="margin-right: 12px" />
        <van-button size="mini" type="primary" @click="emit('save')">保存</van-button>
      </template>
    </van-nav-bar>

    <!-- Tool bar -->
    <div class="tool-bar">
      <div
        class="current-color"
        :class="{ 'light-bg': currentColorIsLight }"
        :style="{ backgroundColor: currentColorHex }"
        @click="showPalette = true"
      >
        <span class="color-label">{{ drawingStore.currentColorCode }}</span>
      </div>
      <div class="tool-buttons">
        <van-button size="small" :disabled="!canUndo" @click="undo">
          <van-icon name="revoke" />
        </van-button>
        <van-button size="small" :disabled="!canRedo" @click="redo">
          <van-icon name="replay" />
        </van-button>
        <van-button
          size="small"
          :type="drawingStore.currentTool === 'brush' ? 'primary' : 'default'"
          @click="drawingStore.setTool('brush')"
        >画笔</van-button>
        <van-button
          size="small"
          :type="drawingStore.currentTool === 'eraser' ? 'primary' : 'default'"
          @click="drawingStore.setTool('eraser')"
        >橡皮</van-button>
        <van-button
          size="small"
          :type="drawingStore.currentTool === 'fill' ? 'primary' : 'default'"
          @click="drawingStore.setTool('fill')"
        >填充</van-button>
      </div>
      <van-button
        size="small"
        :type="drawingStore.mirrorMode !== 'none' ? 'primary' : 'default'"
        @click="cycleMirror"
      >
        <van-icon name="exchange" />
      </van-button>
      <van-button size="small" @click="showSettings = true">
        <van-icon name="setting-o" />
      </van-button>
    </div>

    <!-- Canvas area with zoom/pan -->
    <div class="canvas-container" ref="containerRef" @wheel="onWheel">
      <div
        class="canvas-transform"
        :style="{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }"
      >
        <canvas
          ref="canvasRef"
          @mousedown="onPointerDown"
          @mousemove="onPointerMove"
          @touchstart.prevent="onPointerDown"
          @touchmove.prevent="onPointerMove"
          @touchend="onPointerUp"
        />
      </div>
    </div>

    <!-- Stats bar -->
    <div class="stats-bar">
      <span>已用 {{ totalCount }} 颗</span>
      <span>{{ drawingStore.canvasSize }}</span>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <van-button size="mini" plain @click="resetZoom">重置</van-button>
      <span>{{ drawingStore.mirrorMode === 'none' ? '镜像关' : drawingStore.mirrorMode === 'horizontal' ? '左右镜像' : drawingStore.mirrorMode === 'vertical' ? '上下镜像' : '双向镜像' }}</span>
    </div>

    <!-- Color palette popup -->
    <van-popup v-model:show="showPalette" position="bottom" round :style="{ maxHeight: '70vh' }">
      <div class="palette-popup">
        <div class="popup-header">
          <span>选择色号</span>
          <van-icon name="cross" size="18" @click="showPalette = false" />
        </div>
        <van-tabs scrollspy sticky>
          <van-tab title="收藏">
            <div class="series-label">收藏色号</div>
            <div v-if="favoriteStore.codes.length === 0" class="fav-empty">长按色号可添加收藏</div>
            <div v-else class="color-grid">
              <div
                v-for="code in favoriteStore.codes"
                :key="code"
                class="color-swatch"
                :class="{
                  selected: code === drawingStore.currentColorCode,
                  'light-bg': isLightColor(colorStore.findByCode(code)?.hex ?? '#fff'),
                }"
                :style="{ backgroundColor: colorStore.findByCode(code)?.hex ?? '#fff' }"
                @click="onColorSelect(colorStore.findByCode(code)!)"
                @contextmenu.prevent="favoriteStore.toggle(code)"
              >
                <span class="color-code">{{ code }}</span>
              </div>
            </div>
          </van-tab>
          <van-tab v-for="series in colorStore.seriesOrder" :key="series" :title="series + '系'">
            <div class="series-label">{{ series }}系列</div>
            <div class="color-grid">
              <div
                v-for="color in colorStore.colorsBySeries[series]"
                :key="color.code"
                class="color-swatch"
                :class="{
                  selected: color.code === drawingStore.currentColorCode,
                  'light-bg': isLightColor(color.hex),
                  fav: favoriteStore.isFavorite(color.code),
                }"
                :style="{ backgroundColor: color.hex }"
                @click="onColorSelect(color)"
                @contextmenu.prevent="favoriteStore.toggle(color.code)"
              >
                <span class="color-code">{{ color.code }}</span>
              </div>
            </div>
          </van-tab>
        </van-tabs>
      </div>
    </van-popup>

    <!-- Settings popup -->
    <van-popup v-model:show="showSettings" position="bottom" round :style="{ maxHeight: '60vh' }">
      <div class="settings-popup">
        <div class="popup-header">
          <span>画布设置</span>
          <van-icon name="cross" size="18" @click="showSettings = false" />
        </div>

        <div class="setting-group">
          <div class="setting-label">画布大小</div>
          <van-radio-group :model-value="drawingStore.canvasSize" @update:model-value="changeCanvasSize">
            <div class="radio-row">
              <van-radio v-for="s in (['52x52', '78x78', '104x104'] as CanvasSize[])" :key="s" :name="s">{{ s }}</van-radio>
            </div>
          </van-radio-group>
        </div>

        <div class="setting-group">
          <div class="setting-label">子网格分区</div>
          <van-radio-group :model-value="drawingStore.subGridSize === 0 ? 'none' : drawingStore.subGridSize" @update:model-value="(v: any) => changeSubGrid(v as SubGridSize | 'none')">
            <div class="radio-row">
              <van-radio :name="5">5x5</van-radio>
              <van-radio :name="10">10x10</van-radio>
              <van-radio name="none">无</van-radio>
            </div>
          </van-radio-group>
        </div>

        <div class="setting-group">
          <div class="setting-label">镜像模式</div>
          <van-radio-group :model-value="drawingStore.mirrorMode" @update:model-value="(v: any) => { drawingStore.setMirrorMode(v as MirrorMode); drawCanvas() }">
            <div class="radio-row">
              <van-radio name="none">关</van-radio>
              <van-radio name="horizontal">左右</van-radio>
              <van-radio name="vertical">上下</van-radio>
              <van-radio name="both">双向</van-radio>
            </div>
          </van-radio-group>
        </div>

        <div class="setting-group">
          <van-button type="danger" size="small" block @click="drawingStore.initGrid(); showSettings = false; nextTick(drawCanvas)">清空画布</van-button>
        </div>
      </div>
    </van-popup>

    <!-- Stats popup -->
    <van-popup v-model:show="showStats" position="bottom" round :style="{ maxHeight: '70vh' }">
      <div class="stats-popup">
        <div class="popup-header">
          <span>用豆统计 (共{{ totalCount }}颗)</span>
          <van-icon name="cross" size="18" @click="showStats = false" />
        </div>
        <div class="color-counts">
          <div v-for="c in colorCounts" :key="c.code" class="count-row">
            <div class="count-swatch" :style="{ backgroundColor: c.hex }" />
            <span class="count-code">{{ c.code }}</span>
            <span class="count-num">{{ c.count }} 颗</span>
          </div>
          <div v-if="colorCounts.length === 0" class="no-colors">画布为空</div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.drawing-canvas-page {
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
}

.tool-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
  flex-shrink: 0;
}

.current-color {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid #ebedf0;
  flex-shrink: 0;
}

.color-label {
  font-size: 10px;
  font-weight: 700;
  pointer-events: none;
}

.current-color:not(.light-bg) .color-label {
  color: #fff;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.light-bg .color-label {
  color: #333;
}

.tool-buttons {
  display: flex;
  gap: 4px;
  flex: 1;
}

.canvas-container {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 8px;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

.canvas-transform {
  display: inline-block;
  transform-origin: 0 0;
}

canvas {
  image-rendering: pixelated;
  touch-action: none;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 6px 12px;
  background: #fff;
  border-top: 1px solid #ebedf0;
  font-size: 12px;
  color: #646566;
  flex-shrink: 0;
}

.palette-popup,
.settings-popup,
.stats-popup {
  padding-bottom: 16px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  font-size: 16px;
  font-weight: 600;
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
}

.color-swatch.fav::after {
  content: '\2605';
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 8px;
  color: #ffd700;
}

.color-swatch {
  position: relative;
}

.fav-empty {
  padding: 24px 16px;
  text-align: center;
  color: #969799;
  font-size: 13px;
}

.setting-group {
  padding: 12px 16px;
}

.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 10px;
}

.radio-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.color-counts {
  max-height: 50vh;
  overflow-y: auto;
}

.count-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid #f7f8fa;
}

.count-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ebedf0;
  flex-shrink: 0;
}

.count-code {
  font-size: 13px;
  font-weight: 600;
  color: #323233;
  min-width: 36px;
}

.count-num {
  font-size: 13px;
  color: #646566;
  margin-left: auto;
}

.no-colors {
  padding: 40px 16px;
  text-align: center;
  color: #969799;
  font-size: 14px;
}
</style>
