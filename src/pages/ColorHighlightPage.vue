<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePatternStore } from '@/stores/patternStore'
import { useColorStore } from '@/stores/colorStore'
import { MARD_COLORS, MARD_SERIES_ORDER } from '@/assets/colors/mard-221'
import type { BeadCell, BeadPattern, CanvasSize } from '@/types'

const router = useRouter()
const patternStore = usePatternStore()
const colorStore = useColorStore()

type ImportMode = 'pattern' | 'image'

const importMode = ref<ImportMode>('pattern')
const showPicker = ref(false)

// Pattern mode state
const selectedPattern = ref<BeadPattern | null>(null)
const grid = ref<BeadCell[][]>([])
const patternColors = ref<{ code: string; hex: string }[]>([])
const highlightCode = ref<string | null>(null)

// Image mode state
const imageSrc = ref<string | null>(null)
const targetSize = ref<CanvasSize>('52x52')
const maxColors = ref(32)
const processing = ref(false)
const recognizedColors = ref<{ code: string; hex: string; confirmed: boolean }[]>([])
const showConfirm = ref(false)
const editCode = ref('')
const editIndex = ref(-1)
const showEditPicker = ref(false)
const imageGrid = ref<BeadCell[][]>([])

// Canvas refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

function parseCanvasSize(size: CanvasSize): { cols: number; rows: number } {
  const [c, r] = size.split('x').map(Number)
  return { cols: c, rows: r }
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

function srgbToLinear(c: number): number {
  c = c / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)
  let x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375
  let y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750
  let z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041
  x /= 0.95047
  y /= 1.0
  z /= 1.08883
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116)
  const L = 116 * f(y) - 16
  const a = 500 * (f(x) - f(y))
  const bVal = 200 * (f(y) - f(z))
  return [L, a, bVal]
}

function findClosestColor(r: number, g: number, b: number) {
  const lab = rgbToLab(r, g, b)
  let minDist = Infinity
  let closest = MARD_COLORS[0]
  for (const c of MARD_COLORS) {
    const d = ciede2000(lab, c.lab)
    if (d < minDist) { minDist = d; closest = c }
  }
  return closest
}

function ciede2000(lab1: [number, number, number], lab2: [number, number, number]): number {
  const L1 = lab1[0], a1 = lab1[1], b1 = lab1[2]
  const L2 = lab2[0], a2 = lab2[1], b2 = lab2[2]
  const kL = 1, kC = 1, kH = 1
  const C1ab = Math.sqrt(a1 * a1 + b1 * b1)
  const C2ab = Math.sqrt(a2 * a2 + b2 * b2)
  const Cab = (C1ab + C2ab) / 2
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))))
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G)
  const C1p = Math.sqrt(a1p * a1p + b1 * b1), C2p = Math.sqrt(a2p * a2p + b2 * b2)
  const h1p = Math.atan2(b1, a1p) * 180 / Math.PI, h2p = Math.atan2(b2, a2p) * 180 / Math.PI
  const h1pN = h1p >= 0 ? h1p : h1p + 360, h2pN = h2p >= 0 ? h2p : h2p + 360
  const dLp = L2 - L1, dCp = C2p - C1p
  let dhp: number
  if (C1p * C2p === 0) dhp = 0
  else if (Math.abs(h2pN - h1pN) <= 180) dhp = h2pN - h1pN
  else if (h2pN - h1pN > 180) dhp = h2pN - h1pN - 360
  else dhp = h2pN - h1pN + 360
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360)
  const Lp = (L1 + L2) / 2, Cp = (C1p + C2p) / 2
  let hp: number
  if (C1p * C2p === 0) hp = h1pN + h2pN
  else if (Math.abs(h1pN - h2pN) <= 180) hp = (h1pN + h2pN) / 2
  else if (h1pN + h2pN < 360) hp = (h1pN + h2pN + 360) / 2
  else hp = (h1pN + h2pN - 360) / 2
  const T = 1 - 0.17 * Math.cos((hp - 30) * Math.PI / 180) + 0.24 * Math.cos(2 * hp * Math.PI / 180) + 0.32 * Math.cos((3 * hp + 6) * Math.PI / 180) - 0.20 * Math.cos((4 * hp - 63) * Math.PI / 180)
  const SL = 1 + 0.015 * (Lp - 50) * (Lp - 50) / Math.sqrt(20 + (Lp - 50) * (Lp - 50))
  const SC = 1 + 0.045 * Cp
  const SH = 1 + 0.015 * Cp * T
  const dtheta = 30 * Math.exp(-((hp - 275) / 25) * ((hp - 275) / 25))
  const RC = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)))
  const RT = -Math.sin(2 * dtheta * Math.PI / 180) * RC
  return Math.sqrt(Math.pow(dLp / (kL * SL), 2) + Math.pow(dCp / (kC * SC), 2) + Math.pow(dHp / (kH * SH), 2) + RT * (dCp / (kC * SC)) * (dHp / (kH * SH)))
}

// ========= Pattern Mode =========

function selectPattern(p: BeadPattern) {
  selectedPattern.value = p
  grid.value = JSON.parse(JSON.stringify(p.grid))
  const seen = new Set<string>()
  patternColors.value = []
  for (const row of p.grid) {
    for (const cell of row) {
      if (cell.code && !seen.has(cell.code)) {
        seen.add(cell.code)
        patternColors.value.push({ code: cell.code, hex: cell.hex })
      }
    }
  }
  patternColors.value.sort((a, b) => a.code.localeCompare(b.code))
  highlightCode.value = null
  showPicker.value = false
  nextTick(draw)
}

function toggleHighlight(code: string) {
  highlightCode.value = (highlightCode.value === code) ? null : code
  draw()
}

// ========= Image Mode =========

function handleImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (!file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    imageSrc.value = ev.target?.result as string
    processImage()
  }
  reader.readAsDataURL(file)
}

async function processImage() {
  if (!imageSrc.value) return
  processing.value = true

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageSrc.value

  await new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r() })
  if (!img.width) { processing.value = false; return }

  const { cols, rows } = parseCanvasSize(targetSize.value)
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = cols
  tempCanvas.height = rows
  const ctx = tempCanvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, cols, rows)
  const data = ctx.getImageData(0, 0, cols, rows)

  const colorMap = new Map<string, { code: string; hex: string; count: number }>()
  const g: BeadCell[][] = []

  for (let r = 0; r < rows; r++) {
    const row: BeadCell[] = []
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4
      const red = data.data[i]
      const green = data.data[i + 1]
      const blue = data.data[i + 2]
      const alpha = data.data[i + 3]

      if (alpha < 30) {
        row.push({ code: '', hex: '#FFFFFF' })
        continue
      }

      const closest = findClosestColor(red, green, blue)
      row.push({ code: closest.code, hex: closest.hex })
      const existing = colorMap.get(closest.code)
      if (existing) {
        existing.count++
      } else {
        colorMap.set(closest.code, { code: closest.code, hex: closest.hex, count: 1 })
      }
    }
    g.push(row)
  }

  // Limit colors
  if (colorMap.size > maxColors.value) {
    const colorCount = new Map<string, number>()
    for (const row of g) {
      for (const cell of row) {
        if (cell.code) {
          colorCount.set(cell.code, (colorCount.get(cell.code) ?? 0) + 1)
        }
      }
    }
    const sorted = Array.from(colorCount.entries()).sort((a, b) => b[1] - a[1])
    const allowed = new Set(sorted.slice(0, maxColors.value).map(([code]) => code))

    for (const row of g) {
      for (let c = 0; c < row.length; c++) {
        if (row[c].code && !allowed.has(row[c].code)) {
          const cellColor = MARD_COLORS.find(mc => mc.code === row[c].code)!
          let bestReplacement = MARD_COLORS[0]
          let minDist = Infinity
          for (const [code, color] of colorMap) {
            if (!allowed.has(code)) continue
            const mc = MARD_COLORS.find(m => m.code === code)!
            const d = ciede2000(cellColor.lab, mc.lab)
            if (d < minDist) {
              minDist = d
              bestReplacement = mc
            }
          }
          row[c] = { code: bestReplacement.code, hex: bestReplacement.hex }
        }
      }
    }
  }

  imageGrid.value = g
  recognizedColors.value = Array.from(colorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors.value)
    .map(c => ({ code: c.code, hex: c.hex, confirmed: true }))

  processing.value = false
  showConfirm.value = true
}

function removeRecognizedColor(idx: number) {
  recognizedColors.value.splice(idx, 1)
}

function startEditColor(idx: number) {
  editIndex.value = idx
  editCode.value = recognizedColors.value[idx].code
  showEditPicker.value = true
}

function confirmEditColor(color: { code: string; hex: string }) {
  if (editIndex.value >= 0 && editIndex.value < recognizedColors.value.length) {
    recognizedColors.value[editIndex.value] = { code: color.code, hex: color.hex, confirmed: true }
  }
  showEditPicker.value = false
}

function confirmRecognition() {
  const allowedCodes = new Set(recognizedColors.value.filter(c => c.confirmed).map(c => c.code))
  const finalGrid = imageGrid.value.map(row =>
    row.map(cell => {
      if (cell.code && allowedCodes.has(cell.code)) return { ...cell }
      return { code: '', hex: '#FFFFFF' }
    })
  )
  grid.value = finalGrid
  selectedPattern.value = null
  patternColors.value = recognizedColors.value.filter(c => c.confirmed).map(c => ({ code: c.code, hex: c.hex }))
  patternColors.value.sort((a, b) => a.code.localeCompare(b.code))
  highlightCode.value = null
  showConfirm.value = false
  importMode.value = 'pattern'
  nextTick(draw)
}

// ========= Drawing =========

function recalcCellSize() {
  if (!containerRef.value) return
  const maxW = containerRef.value.clientWidth - 16
  const cols = grid.value[0]?.length ?? 1
  cellSize.value = Math.max(4, Math.floor(maxW / cols))
}

const cellSize = ref(8)

function draw() {
  const canvas = canvasRef.value
  if (!canvas || grid.value.length === 0) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cs = cellSize.value
  const rows = grid.value.length
  const cols = grid.value[0]?.length ?? 0

  const logicW = cols * cs
  const logicH = rows * cs

  canvas.width = logicW * dpr
  canvas.height = logicH * dpr
  canvas.style.width = `${logicW}px`
  canvas.style.height = `${logicH}px`
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, logicW, logicH)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid.value[r][c]

      if (highlightCode.value && cell.code !== highlightCode.value) {
        ctx.globalAlpha = 0.12
        ctx.fillStyle = cell.hex
        ctx.fillRect(c * cs, r * cs, cs, cs)
        ctx.globalAlpha = 1.0
      } else {
        ctx.fillStyle = cell.hex
        ctx.fillRect(c * cs, r * cs, cs, cs)

        if (cs >= 8 && cell.code) {
          ctx.fillStyle = isLightColor(cell.hex) ? '#333' : '#fff'
          ctx.font = `bold ${Math.max(5, cs * 0.3)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(cell.code, c * cs + cs / 2, r * cs + cs / 2)
        }
      }
    }
  }

  ctx.strokeStyle = highlightCode.value ? 'rgba(200,200,200,0.3)' : '#e0e0e0'
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
  recalcCellSize()
  draw()
}

watch([importMode, grid], () => nextTick(draw))

onMounted(() => {
  recalcCellSize()
  draw()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="highlight-page">
    <van-nav-bar title="色号高亮" left-arrow @click-left="router.back()" />

    <!-- No data yet: show import mode selection -->
    <div v-if="grid.length === 0 && !showConfirm" class="section">
      <div class="section-title">选择导入方式</div>
      <div class="mode-btns">
        <van-button
          :type="importMode === 'pattern' ? 'primary' : 'default'"
          size="small"
          @click="importMode = 'pattern'; showPicker = true"
        >从我的图纸导入</van-button>
        <van-button
          :type="importMode === 'image' ? 'primary' : 'default'"
          size="small"
          @click="($refs.imageInput as HTMLInputElement)?.click()"
        >导入图片</van-button>
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          style="display:none"
          @change="handleImageFile"
        />
      </div>

      <!-- Image mode settings -->
      <div v-if="importMode === 'image'" class="image-settings">
        <div class="setting-row">
          <span class="setting-label">输出大小</span>
          <van-radio-group v-model="targetSize" direction="horizontal">
            <van-radio v-for="s in (['52x52', '78x78', '104x104'] as CanvasSize[])" :key="s" :name="s">{{ s }}</van-radio>
          </van-radio-group>
        </div>
        <div class="setting-row">
          <span class="setting-label">最大色数</span>
          <van-stepper v-model="maxColors" :min="4" :max="221" :step="4" />
        </div>
        <van-button
          v-if="imageSrc"
          type="primary"
          block
          :loading="processing"
          @click="processImage"
        >{{ processing ? '识别中...' : '开始识别' }}</van-button>
      </div>
    </div>

    <!-- Image recognition confirm panel -->
    <van-popup v-model:show="showConfirm" position="bottom" round :style="{ maxHeight: '85vh' }">
      <div class="confirm-popup">
        <div class="popup-header">
          <span>确认识别色号</span>
          <van-icon name="cross" size="18" @click="showConfirm = false" />
        </div>
        <p class="confirm-hint">已识别以下色号，请检查并修改不准确的项：</p>
        <div class="recognized-list">
          <div v-for="(c, i) in recognizedColors" :key="i" class="recognized-item">
            <div class="rec-swatch" :style="{ backgroundColor: c.hex }" />
            <span class="rec-code">{{ c.code }}</span>
            <van-button size="mini" plain @click="startEditColor(i)">修改</van-button>
            <van-button size="mini" type="danger" plain @click="removeRecognizedColor(i)">移除</van-button>
          </div>
          <div v-if="recognizedColors.length === 0" class="rec-empty">无识别结果</div>
        </div>
        <van-button type="primary" block @click="confirmRecognition">确认并高亮</van-button>
      </div>
    </van-popup>

    <!-- Edit color picker popup -->
    <van-popup v-model:show="showEditPicker" position="bottom" round :style="{ maxHeight: '70vh' }">
      <div class="picker-popup">
        <div class="popup-header">
          <span>选择色号</span>
          <van-icon name="cross" size="18" @click="showEditPicker = false" />
        </div>
        <van-tabs scrollspy sticky>
          <van-tab v-for="series in MARD_SERIES_ORDER" :key="series" :title="series + '系'">
            <div class="series-label">{{ series }}系列</div>
            <div class="color-grid">
              <div
                v-for="color in colorStore.colorsBySeries[series]"
                :key="color.code"
                class="color-swatch"
                :class="{ selected: color.code === editCode, 'light-bg': isLightColor(color.hex) }"
                :style="{ backgroundColor: color.hex }"
                @click="confirmEditColor(color)"
              >
                <span class="color-code">{{ color.code }}</span>
              </div>
            </div>
          </van-tab>
        </van-tabs>
      </div>
    </van-popup>

    <!-- Pattern picker popup -->
    <van-popup v-model:show="showPicker" position="bottom" round :style="{ maxHeight: '60vh' }">
      <div class="picker-popup">
        <div class="popup-header">
          <span>选择图纸</span>
          <van-icon name="cross" size="18" @click="showPicker = false" />
        </div>
        <div v-if="patternStore.patterns.length === 0" class="picker-empty">
          <van-empty description="暂无图纸" image="search" />
        </div>
        <div v-else class="picker-list">
          <div
            v-for="p in patternStore.patterns"
            :key="p.id"
            class="picker-item"
            :class="{ active: selectedPattern?.id === p.id }"
            @click="selectPattern(p)"
          >
            <span class="picker-name">{{ p.name }}</span>
            <span class="picker-meta">{{ p.cols }}x{{ p.rows }}</span>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- Main highlight view -->
    <div v-if="grid.length > 0" class="highlight-view">
      <!-- Canvas area -->
      <div class="canvas-section" ref="containerRef">
        <canvas ref="canvasRef" style="image-rendering: pixelated" />
      </div>

      <!-- Highlight info bar -->
      <div class="highlight-info">
        <span v-if="highlightCode" class="highlight-active">
          高亮: <strong>{{ highlightCode }}</strong>
        </span>
        <span v-else class="highlight-idle">点击下方色号高亮</span>
        <van-button v-if="highlightCode" size="mini" plain @click="highlightCode = null; draw()">取消</van-button>
      </div>

      <!-- Color buttons -->
      <div class="color-buttons">
        <van-button
          v-for="c in patternColors"
          :key="c.code"
          size="small"
          :type="highlightCode === c.code ? 'primary' : 'default'"
          class="color-btn"
          @click="toggleHighlight(c.code)"
        >
          <span class="btn-swatch" :style="{ backgroundColor: c.hex }" />
          <span class="btn-code">{{ c.code }}</span>
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.highlight-page {
  min-height: 100vh;
  background: #f7f8fa;
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

.mode-btns {
  display: flex;
  gap: 12px;
}

.image-settings {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  white-space: nowrap;
  min-width: 72px;
}

.highlight-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 46px);
}

.canvas-section {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 8px;
  background: #f7f8fa;
  -webkit-overflow-scrolling: touch;
}

.highlight-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 12px;
  background: #fff;
  border-top: 1px solid #ebedf0;
  font-size: 13px;
  color: #646566;
}

.highlight-active {
  color: #1989fa;
  font-weight: 600;
}

.highlight-active strong {
  font-size: 16px;
}

.highlight-idle {
  color: #969799;
}

.color-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px 16px;
  background: #fff;
  border-top: 1px solid #ebedf0;
  max-height: 200px;
  overflow-y: auto;
}

.color-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 56px;
}

.btn-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.btn-code {
  font-size: 11px;
  font-weight: 700;
}

/* Confirm popup */
.confirm-popup {
  padding: 0 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  font-size: 16px;
  font-weight: 600;
}

.confirm-hint {
  font-size: 13px;
  color: #969799;
  margin: 0;
}

.recognized-list {
  max-height: 45vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recognized-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #f7f8fa;
  border-radius: 6px;
}

.rec-swatch {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid #ebedf0;
  flex-shrink: 0;
}

.rec-code {
  font-size: 14px;
  font-weight: 700;
  color: #323233;
  flex: 1;
}

.rec-empty {
  padding: 24px 0;
  text-align: center;
  color: #969799;
  font-size: 13px;
}

/* Picker popup */
.picker-popup {
  padding-bottom: 10px;
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

.picker-empty {
  padding: 20px 0;
}

.series-label {
  padding: 10px 16px 6px;
  font-size: 13px;
  font-weight: 600;
  color: #323233;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 5px;
  padding: 0 10px 12px;
}

.color-swatch {
  aspect-ratio: 1;
  border-radius: 6px;
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
  font-size: 8px;
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
</style>
