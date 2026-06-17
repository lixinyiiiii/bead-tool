<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { usePatternStore } from '@/stores/patternStore'
import { useColorStore } from '@/stores/colorStore'
import { MARD_COLORS, MARD_SERIES_ORDER } from '@/assets/colors/mard-221'
import { showDialog, showConfirmDialog } from 'vant'
import type { BeadPattern, BeadCell } from '@/types'

const inventoryStore = useInventoryStore()
const colorStore = useColorStore()
const patternStore = usePatternStore()

const searchCode = ref('')
const adjustCode = ref('')
const adjustDelta = ref(0)
const showAdjust = ref(false)
const showBatch = ref(false)
const batchSeries = ref('A')
const batchAll = ref(false)
const batchDelta = ref(0)
const batchSet = ref(0)
const batchMode = ref<'adjust' | 'set'>('set')
const batchSelectAll = ref(false)
const batchSelected = ref<Set<string>>(new Set())

// Deduct from pattern state
const showDeduct = ref(false)
const deductStep = ref<'source' | 'crop' | 'select'>('source')
const deductSource = ref<'pattern' | 'image'>('pattern')
const deductSelectedPattern = ref<BeadPattern | null>(null)
const deductShowPatternPicker = ref(false)
const deductImageSrc = ref<string | null>(null)
const deductProcessing = ref(false)
const deductImageGrid = ref<BeadCell[][]>([])
const deductColorCounts = ref<{ code: string; hex: string; count: number; inputCount: string; deduct: boolean }[]>([])
const deductTotalBeads = ref(0)

// Crop state
const cropContainer = ref<HTMLDivElement | null>(null)
const cropCanvas = ref<HTMLCanvasElement | null>(null)
const cropImgEl = ref<HTMLImageElement | null>(null)
const cropDisplay = ref({ width: 0, height: 0, scale: 1 })
const cropRect = ref({ x1: -1, y1: -1, x2: -1, y2: -1 })
const cropDragging = ref(false)
const cropDragStart = ref({ x: 0, y: 0 })
const cropHasRect = ref(false)
const cropOrigImage = ref<HTMLImageElement | null>(null)

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

const filteredItems = computed(() => {
  const items: { code: string; hex: string; quantity: number; series: string }[] = []
  for (const series of MARD_SERIES_ORDER) {
    for (const color of colorStore.colorsBySeries[series]) {
      const qty = inventoryStore.getQuantity(color.code)
      if (searchCode.value && !color.code.toLowerCase().includes(searchCode.value.toLowerCase())) continue
      items.push({ code: color.code, hex: color.hex, quantity: qty, series: color.series })
    }
  }
  return items
})

const totalQuantity = computed(() => {
  let total = 0
  for (const item of filteredItems.value) {
    total += item.quantity
  }
  return total
})

function openAdjust(code: string) {
  adjustCode.value = code
  adjustDelta.value = 0
  showAdjust.value = true
}

function applyAdjust() {
  if (adjustDelta.value !== 0) {
    inventoryStore.adjust(adjustCode.value, adjustDelta.value)
  }
  showAdjust.value = false
}

function setDirect(code: string, quantity: number) {
  inventoryStore.setQuantity(code, quantity)
}

const adjustColor = computed(() => colorStore.findByCode(adjustCode.value))

// Batch logic
const batchSeriesColors = computed(() => {
  return colorStore.colorsBySeries[batchSeries.value] ?? []
})

function toggleBatchSelect(code: string) {
  if (batchSelected.value.has(code)) {
    batchSelected.value.delete(code)
  } else {
    batchSelected.value.add(code)
  }
  batchAll.value = batchSelected.value.size === MARD_COLORS.length
  batchSelectAll.value = batchSeriesColors.value.every(c => batchSelected.value.has(c.code))
}

function toggleBatchSelectAll() {
  if (batchAll.value) {
    batchSelected.value.clear()
    batchAll.value = false
    batchSelectAll.value = false
  } else {
    batchSelected.value.clear()
    for (const s of MARD_SERIES_ORDER) {
      for (const c of colorStore.colorsBySeries[s]) {
        batchSelected.value.add(c.code)
      }
    }
    batchAll.value = true
    batchSelectAll.value = true
  }
}

function toggleBatchSeriesSelect() {
  if (batchSelectAll.value) {
    for (const c of batchSeriesColors.value) {
      batchSelected.value.delete(c.code)
    }
    batchSelectAll.value = false
  } else {
    for (const c of batchSeriesColors.value) {
      batchSelected.value.add(c.code)
    }
    batchSelectAll.value = true
  }
  batchAll.value = batchSelected.value.size === MARD_COLORS.length
}

function applyBatch() {
  if (batchSelected.value.size === 0) return
  for (const code of batchSelected.value) {
    if (batchMode.value === 'set') {
      inventoryStore.setQuantity(code, batchSet.value)
    } else {
      inventoryStore.adjust(code, batchDelta.value)
    }
  }
  showBatch.value = false
  batchSelected.value.clear()
  batchSelectAll.value = false
}

// ========= Deduct from pattern =========

function openDeduct() {
  deductStep.value = 'source'
  deductSource.value = 'pattern'
  deductSelectedPattern.value = null
  deductImageSrc.value = null
  deductColorCounts.value = []
  deductTotalBeads.value = 0
  cropHasRect.value = false
  cropOrigImage.value = null
  showDeduct.value = true
}

// CIEDE2000 color distance
function ciede2000(lab1: [number, number, number], lab2: [number, number, number]): number {
  const L1 = lab1[0], a1 = lab1[1], b1 = lab1[2]
  const L2 = lab2[0], a2 = lab2[1], b2 = lab2[2]
  const kL = 1, kC = 1, kH = 1

  const C1ab = Math.sqrt(a1 * a1 + b1 * b1)
  const C2ab = Math.sqrt(a2 * a2 + b2 * b2)
  const Cab = (C1ab + C2ab) / 2

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))))
  const a1p = a1 * (1 + G)
  const a2p = a2 * (1 + G)

  const C1p = Math.sqrt(a1p * a1p + b1 * b1)
  const C2p = Math.sqrt(a2p * a2p + b2 * b2)

  const h1p = Math.atan2(b1, a1p) * 180 / Math.PI
  const h2p = Math.atan2(b2, a2p) * 180 / Math.PI
  const h1pN = h1p >= 0 ? h1p : h1p + 360
  const h2pN = h2p >= 0 ? h2p : h2p + 360

  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp: number
  if (C1p * C2p === 0) {
    dhp = 0
  } else if (Math.abs(h2pN - h1pN) <= 180) {
    dhp = h2pN - h1pN
  } else if (h2pN - h1pN > 180) {
    dhp = h2pN - h1pN - 360
  } else {
    dhp = h2pN - h1pN + 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360)

  const Lp = (L1 + L2) / 2
  const Cp = (C1p + C2p) / 2

  let hp: number
  if (C1p * C2p === 0) {
    hp = h1pN + h2pN
  } else if (Math.abs(h1pN - h2pN) <= 180) {
    hp = (h1pN + h2pN) / 2
  } else if (h1pN + h2pN < 360) {
    hp = (h1pN + h2pN + 360) / 2
  } else {
    hp = (h1pN + h2pN - 360) / 2
  }

  const T = 1
    - 0.17 * Math.cos((hp - 30) * Math.PI / 180)
    + 0.24 * Math.cos(2 * hp * Math.PI / 180)
    + 0.32 * Math.cos((3 * hp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hp - 63) * Math.PI / 180)

  const SL = 1 + 0.015 * (Lp - 50) * (Lp - 50) / Math.sqrt(20 + (Lp - 50) * (Lp - 50))
  const SC = 1 + 0.045 * Cp
  const SH = 1 + 0.015 * Cp * T

  const dtheta = 30 * Math.exp(-((hp - 275) / 25) * ((hp - 275) / 25))
  const RC = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)))
  const RT = -Math.sin(2 * dtheta * Math.PI / 180) * RC

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
    Math.pow(dCp / (kC * SC), 2) +
    Math.pow(dHp / (kH * SH), 2) +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  )
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
  x /= 0.95047; y /= 1.0; z /= 1.08883
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
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

function selectDeductPattern(p: BeadPattern) {
  deductSelectedPattern.value = p
  deductShowPatternPicker.value = false
  computeColorCountsFromGrid(p.grid)
  deductStep.value = 'select'
}

function computeColorCountsFromGrid(g: BeadCell[][]) {
  const map = new Map<string, { code: string; hex: string; count: number }>()
  let total = 0
  for (const row of g) {
    for (const cell of row) {
      if (!cell.code) continue
      total++
      const existing = map.get(cell.code)
      if (existing) existing.count++
      else map.set(cell.code, { code: cell.code, hex: cell.hex, count: 1 })
    }
  }
  deductTotalBeads.value = total
  deductColorCounts.value = Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .map(c => ({ ...c, inputCount: String(c.count), deduct: true }))
}

function handleDeductImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (!file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    deductImageSrc.value = ev.target?.result as string
    cropHasRect.value = false
    deductStep.value = 'crop'
  }
  reader.readAsDataURL(file)
}

function onCropImageLoad() {
  const img = cropImgEl.value
  if (!img || !cropContainer.value) return
  const containerW = cropContainer.value.clientWidth
  const containerH = 200
  const scale = Math.min(containerW / img.naturalWidth, containerH / img.naturalHeight)
  const displayW = img.naturalWidth * scale
  const displayH = img.naturalHeight * scale
  cropDisplay.value = { width: displayW, height: displayH, scale }
  img.style.width = displayW + 'px'
  img.style.height = displayH + 'px'

  const canvas = cropCanvas.value
  if (canvas) {
    canvas.width = displayW
    canvas.height = displayH
    canvas.style.width = displayW + 'px'
    canvas.style.height = displayH + 'px'
  }

  cropOrigImage.value = new Image()
  cropOrigImage.value!.src = deductImageSrc.value!
}

function getCropPos(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = cropCanvas.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onCropMouseDown(e: MouseEvent) {
  e.preventDefault()
  const pos = getCropPos(e)
  cropDragging.value = true
  cropDragStart.value = pos
  cropRect.value = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
}

function onCropMouseMove(e: MouseEvent) {
  if (!cropDragging.value) return
  const pos = getCropPos(e)
  cropRect.value = { ...cropRect.value, x2: pos.x, y2: pos.y }
  drawCropOverlay()
}

function onCropMouseUp() {
  cropDragging.value = false
  const r = cropRect.value
  if (Math.abs(r.x2 - r.x1) > 10 && Math.abs(r.y2 - r.y1) > 10) {
    cropHasRect.value = true
  }
  drawCropOverlay()
}

function onCropTouchStart(e: TouchEvent) {
  e.preventDefault()
  if (e.touches.length !== 1) return
  const pos = getCropPos(e.touches[0])
  cropDragging.value = true
  cropDragStart.value = pos
  cropRect.value = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
}

function onCropTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (!cropDragging.value || e.touches.length !== 1) return
  const pos = getCropPos(e.touches[0])
  cropRect.value = { ...cropRect.value, x2: pos.x, y2: pos.y }
  drawCropOverlay()
}

function onCropTouchEnd() {
  cropDragging.value = false
  const r = cropRect.value
  if (Math.abs(r.x2 - r.x1) > 10 && Math.abs(r.y2 - r.y1) > 10) {
    cropHasRect.value = true
  }
  drawCropOverlay()
}

function drawCropOverlay() {
  const canvas = cropCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const { width, height } = cropDisplay.value
  ctx.clearRect(0, 0, width, height)

  // Dim outside
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, width, height)

  const r = cropRect.value
  const x = Math.min(r.x1, r.x2)
  const y = Math.min(r.y1, r.y2)
  const w = Math.abs(r.x2 - r.x1)
  const h = Math.abs(r.y2 - r.y1)

  if (w < 2 || h < 2) return

  // Clear the selected area
  ctx.clearRect(x, y, w, h)

  // Draw border
  ctx.strokeStyle = '#1989fa'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 3])
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])

  // Draw corner handles
  const hs = 8
  ctx.fillStyle = '#1989fa'
  const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs)
  }
}

async function confirmCrop() {
  if (!cropOrigImage.value || !cropHasRect.value) return
  deductProcessing.value = true

  const img = cropOrigImage.value
  const { scale } = cropDisplay.value
  const r = cropRect.value

  // Convert display coords to image coords
  const imgX = Math.min(r.x1, r.x2) / scale
  const imgY = Math.min(r.y1, r.y2) / scale
  const imgW = Math.abs(r.x2 - r.x1) / scale
  const imgH = Math.abs(r.y2 - r.y1) / scale

  // Extract cropped region at full resolution
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = Math.round(imgW)
  tempCanvas.height = Math.round(imgH)
  const ctx = tempCanvas.getContext('2d')!
  ctx.drawImage(img, imgX, imgY, imgW, imgH, 0, 0, tempCanvas.width, tempCanvas.height)
  const data = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)

  // Detect color swatches: cluster pixels by color
  const colorMap = new Map<string, { lab: [number, number, number]; hex: string; pixels: number }>()
  const totalPixels = data.width * data.height

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4
    const a = data.data[idx + 3]
    if (a < 128) continue // skip transparent

    const r = data.data[idx], g = data.data[idx + 1], b = data.data[idx + 2]
    // Skip near-white and near-black (likely background/text)
    const brightness = (r + g + b) / 3
    if (brightness > 240 || brightness < 20) continue

    const lab = rgbToLab(r, g, b)
    // Find existing cluster within threshold
    let matched = false
    for (const [key, cluster] of colorMap) {
      if (ciede2000(lab, cluster.lab) < 8) {
        cluster.pixels++
        matched = true
        break
      }
    }
    if (!matched) {
      const closest = findClosestColor(r, g, b)
      const key = closest.code
      const existing = colorMap.get(key)
      if (existing) {
        existing.pixels++
      } else {
        colorMap.set(key, { lab: closest.lab, hex: closest.hex, pixels: 1 })
      }
    }
  }

  // Filter out noise (very small clusters) and sort by pixel count
  const minPixels = totalPixels * 0.001 // at least 0.1% of cropped area
  const detectedColors = Array.from(colorMap.entries())
    .filter(([_, v]) => v.pixels >= minPixels)
    .sort((a, b) => b[1].pixels - a[1].pixels)
    .map(([code, v]) => ({
      code,
      hex: v.hex,
      count: v.pixels, // pixel count as reference, user edits actual bead count
      inputCount: '',
      deduct: true,
    }))

  deductColorCounts.value = detectedColors
  deductTotalBeads.value = 0 // will be computed from user input
  deductProcessing.value = false
  deductStep.value = 'select'
}

function updateDeductCount(idx: number, val: string) {
  deductColorCounts.value[idx].inputCount = val.replace(/[^\d]/g, '')
  const n = parseInt(deductColorCounts.value[idx].inputCount) || 0
  deductColorCounts.value[idx].count = n
}

function toggleDeductColor(idx: number) {
  deductColorCounts.value[idx].deduct = !deductColorCounts.value[idx].deduct
}

function toggleAllDeductColors(val: boolean) {
  for (const c of deductColorCounts.value) c.deduct = val
}

const deductSelectedCount = computed(() => {
  let count = 0
  let beads = 0
  for (const c of deductColorCounts.value) {
    if (c.deduct) { count++; beads += c.count }
  }
  return { colors: count, beads }
})

const deductShortfalls = computed(() => {
  const result: { code: string; needed: number; available: number; hex: string }[] = []
  for (const c of deductColorCounts.value) {
    if (!c.deduct) continue
    const available = inventoryStore.getQuantity(c.code)
    if (available < c.count) {
      result.push({ code: c.code, needed: c.count, available, hex: c.hex })
    }
  }
  return result
})

function confirmDeduct() {
  if (deductSelectedCount.value.beads === 0) return
  showConfirmDialog({
    title: '确认扣除',
    message: deductShortfalls.value.length > 0
      ? `有 ${deductShortfalls.value.length} 种色号库存不足，不足部分将扣除为0。确认扣除？`
      : `将从库存扣除 ${deductSelectedCount.value.beads} 颗豆子，确认？`,
  }).then(() => {
    for (const c of deductColorCounts.value) {
      if (!c.deduct) continue
      const available = inventoryStore.getQuantity(c.code)
      const delta = -Math.min(c.count, available)
      if (delta !== 0) inventoryStore.adjust(c.code, delta, 'pattern-deduction')
    }
    showDeduct.value = false
    showDialog({ title: '扣除完成', message: `已扣除 ${deductSelectedCount.value.beads} 颗 (${deductSelectedCount.value.colors} 色)`, confirmButtonText: '好的' })
  }).catch(() => {})
}
</script>

<template>
  <div class="inventory-page">
    <van-nav-bar title="我的库存" left-arrow @click-left="$router.back()">
      <template #right>
        <van-button size="mini" type="primary" plain style="margin-right:6px" @click="showBatch = true">批量</van-button>
        <van-button size="mini" type="success" plain @click="openDeduct">扣图</van-button>
      </template>
    </van-nav-bar>

    <van-search v-model="searchCode" placeholder="搜索色号" shape="round" />

    <div class="summary-bar">
      <span>总计: {{ totalQuantity }} 颗</span>
      <span>共 {{ filteredItems.length }} 色</span>
    </div>

    <van-tabs scrollspy sticky>
      <van-tab v-for="series in MARD_SERIES_ORDER" :key="series" :title="series + '系'">
        <div class="series-label">{{ series }}系列</div>
        <div class="inventory-grid">
          <div
            v-for="item in filteredItems.filter(i => i.series === series)"
            :key="item.code"
            class="inv-item"
            :style="{ backgroundColor: item.hex }"
            :class="{ 'light-bg': isLightColor(item.hex), 'low-stock': item.quantity > 0 && item.quantity < 50 }"
            @click="openAdjust(item.code)"
          >
            <span class="inv-code">{{ item.code }}</span>
            <span class="inv-qty">{{ item.quantity }}</span>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <!-- Single adjust popup -->
    <van-popup v-model:show="showAdjust" position="bottom" round :style="{ maxHeight: '40vh' }">
      <div class="adjust-popup" v-if="adjustColor">
        <div class="adjust-header">
          <div class="adjust-swatch" :style="{ backgroundColor: adjustColor.hex }" />
          <span class="adjust-code">{{ adjustColor.code }}</span>
          <van-icon name="cross" size="18" @click="showAdjust = false" />
        </div>
        <div class="adjust-current">
          当前库存: <strong>{{ inventoryStore.getQuantity(adjustCode) }}</strong> 颗
        </div>
        <div class="adjust-row">
          <van-stepper v-model="adjustDelta" :min="-9999" :max="9999" :step="10" />
          <van-button type="primary" size="small" @click="applyAdjust">调整</van-button>
        </div>
        <div class="adjust-direct">
          <span>直接设置:</span>
          <van-button size="mini" @click="setDirect(adjustCode, 0)">清零</van-button>
          <van-button size="mini" @click="setDirect(adjustCode, 50)">50</van-button>
          <van-button size="mini" @click="setDirect(adjustCode, 100)">100</van-button>
          <van-button size="mini" @click="setDirect(adjustCode, 200)">200</van-button>
        </div>
      </div>
    </van-popup>

    <!-- Batch adjust popup -->
    <van-popup v-model:show="showBatch" position="bottom" round :style="{ maxHeight: '80vh' }">
      <div class="batch-popup">
        <div class="popup-header">
          <span>批量修改库存</span>
          <van-icon name="cross" size="18" @click="showBatch = false" />
        </div>

        <div class="batch-series">
          <div class="setting-label">选择色系</div>
          <van-radio-group v-model="batchSeries" direction="horizontal">
            <van-radio v-for="s in MARD_SERIES_ORDER" :key="s" :name="s">{{ s }}系</van-radio>
          </van-radio-group>
        </div>

        <div class="batch-select-bar">
          <van-button size="small" :type="batchAll ? 'primary' : 'default'" plain @click="toggleBatchSelectAll">
            {{ batchAll ? '取消全选' : '全选221色' }}
          </van-button>
          <van-button size="small" :type="batchSelectAll ? 'primary' : 'default'" plain @click="toggleBatchSeriesSelect">
            {{ batchSelectAll ? '取消色系' : '选中当前色系' }}
          </van-button>
          <span class="selected-count">已选 {{ batchSelected.size }} 色</span>
        </div>

        <div class="batch-colors">
          <div
            v-for="color in batchSeriesColors"
            :key="color.code"
            class="batch-swatch"
            :class="{ selected: batchSelected.has(color.code), 'light-bg': isLightColor(color.hex) }"
            :style="{ backgroundColor: color.hex }"
            @click="toggleBatchSelect(color.code)"
          >
            <span class="color-code">{{ color.code }}</span>
            <span v-if="batchSelected.has(color.code)" class="check-icon">&#10003;</span>
          </div>
        </div>

        <div class="batch-mode">
          <div class="setting-label">修改方式</div>
          <van-radio-group v-model="batchMode" direction="horizontal">
            <van-radio name="set">统一设为</van-radio>
            <van-radio name="adjust">统一增减</van-radio>
          </van-radio-group>
        </div>

        <div class="batch-value">
          <template v-if="batchMode === 'set'">
            <span class="setting-label">设为数量</span>
            <van-stepper v-model="batchSet" :min="0" :max="9999" :step="50" />
          </template>
          <template v-else>
            <span class="setting-label">增减数量</span>
            <van-stepper v-model="batchDelta" :min="-9999" :max="9999" :step="10" />
          </template>
        </div>

        <van-button
          type="primary"
          block
          :disabled="batchSelected.size === 0"
          @click="applyBatch"
        >确认修改 ({{ batchSelected.size }} 色)</van-button>
      </div>
    </van-popup>

    <!-- Deduct from pattern popup -->
    <van-popup v-model:show="showDeduct" position="bottom" round :style="{ maxHeight: '90vh' }">
      <div class="deduct-popup">
        <div class="popup-header">
          <span>导入图纸扣豆</span>
          <van-icon name="cross" size="18" @click="showDeduct = false" />
        </div>

        <!-- Step 1: Source selection -->
        <template v-if="deductStep === 'source'">
          <div class="setting-label">选择导入方式</div>
          <van-radio-group v-model="deductSource" direction="horizontal">
            <van-radio name="pattern">已保存图纸</van-radio>
            <van-radio name="image">导入图片</van-radio>
          </van-radio-group>

          <!-- Pattern source -->
          <template v-if="deductSource === 'pattern'">
            <div class="deduct-action">
              <van-button type="primary" plain block @click="deductShowPatternPicker = true">
                选择图纸 ({{ patternStore.patterns.length }} 个)
              </van-button>
            </div>
            <div v-if="deductSelectedPattern" class="deduct-selected-pattern">
              <span>已选: {{ deductSelectedPattern.name }} ({{ deductSelectedPattern.cols }}x{{ deductSelectedPattern.rows }})</span>
            </div>
          </template>

          <!-- Image source -->
          <template v-if="deductSource === 'image'">
            <div class="deduct-image-upload">
              <van-button type="primary" plain block @click="($refs.deductFileInput as HTMLInputElement).click()">
                {{ deductImageSrc ? '重新选择图片' : '选择图片' }}
              </van-button>
              <input ref="deductFileInput" type="file" accept="image/*" hidden @change="handleDeductImageFile" />
            </div>
            <div v-if="deductImageSrc" class="deduct-image-preview">
              <img :src="deductImageSrc" style="max-width: 100%; max-height: 100px; border-radius: 6px;" />
            </div>
            <div class="deduct-hint">选择图片后，请在下一步手动框选色号区域</div>
          </template>
        </template>

        <!-- Step 2: Crop selection (image only) -->
        <template v-if="deductStep === 'crop'">
          <div class="crop-instruction">请在图片上拖动框选色号统计区域</div>
          <div class="crop-container" ref="cropContainer">
            <img :src="deductImageSrc!" ref="cropImgEl" class="crop-img" @load="onCropImageLoad" />
            <canvas
              ref="cropCanvas"
              class="crop-overlay"
              @mousedown="onCropMouseDown"
              @mousemove="onCropMouseMove"
              @mouseup="onCropMouseUp"
              @mouseleave="onCropMouseUp"
              @touchstart.prevent="onCropTouchStart"
              @touchmove.prevent="onCropTouchMove"
              @touchend="onCropTouchEnd"
            />
          </div>
          <div class="crop-actions">
            <van-button plain @click="deductStep = 'source'; cropHasRect = false">重选图片</van-button>
            <van-button type="primary" :disabled="!cropHasRect" :loading="deductProcessing" @click="confirmCrop">
              {{ deductProcessing ? '识别中...' : '确认选区并识别' }}
            </van-button>
          </div>
        </template>

        <!-- Step 3: Select colors to deduct with editable counts -->
        <template v-if="deductStep === 'select'">
          <div class="deduct-summary">
            <span>识别到 {{ deductColorCounts.length }} 种色号</span>
            <van-button size="mini" plain type="primary" @click="toggleAllDeductColors(true)">全选</van-button>
            <van-button size="mini" plain @click="toggleAllDeductColors(false)">全不选</van-button>
          </div>

          <div class="deduct-color-list">
            <div
              v-for="(c, idx) in deductColorCounts"
              :key="c.code"
              class="deduct-color-row"
              :class="{ 'deduct-deselected': !c.deduct }"
              @click="toggleDeductColor(idx)"
            >
              <div class="deduct-color-swatch" :style="{ backgroundColor: c.hex }" />
              <span class="deduct-color-code">{{ c.code }}</span>
              <input
                class="deduct-count-input"
                type="text"
                inputmode="numeric"
                :value="c.inputCount"
                placeholder="数量"
                @input="updateDeductCount(idx, ($event.target as HTMLInputElement).value)"
                @click.stop
              />
              <span class="deduct-color-stock">库存: {{ inventoryStore.getQuantity(c.code) }}</span>
              <van-icon v-if="c.deduct" name="success" color="#1989fa" size="16" />
              <van-icon v-else name="circle" color="#c8c9cc" size="16" />
            </div>
          </div>

          <div class="deduct-selected-info">
            已选 {{ deductSelectedCount.colors }} 色, 共 {{ deductSelectedCount.beads }} 颗
          </div>

          <div v-if="deductShortfalls.length > 0" class="deduct-shortfall">
            <div class="shortfall-title">库存不足:</div>
            <div v-for="s in deductShortfalls" :key="s.code" class="shortfall-row">
              <div class="deduct-color-swatch small" :style="{ backgroundColor: s.hex }" />
              <span>{{ s.code }}: 需{{ s.needed }}颗, 仅{{ s.available }}颗</span>
            </div>
          </div>

          <div class="deduct-actions">
            <van-button plain @click="deductStep = deductSource === 'image' ? 'crop' : 'source'">上一步</van-button>
            <van-button type="primary" :disabled="deductSelectedCount.beads === 0" @click="confirmDeduct">
              确认扣除
            </van-button>
          </div>
        </template>
      </div>
    </van-popup>

    <!-- Pattern picker sub-popup -->
    <van-popup v-model:show="deductShowPatternPicker" position="bottom" round :style="{ maxHeight: '60vh' }">
      <div class="pattern-picker">
        <div class="popup-header">
          <span>选择图纸</span>
          <van-icon name="cross" size="18" @click="deductShowPatternPicker = false" />
        </div>
        <template v-if="patternStore.patterns.length === 0">
          <van-empty description="暂无已保存图纸" />
        </template>
        <template v-else>
          <div
            v-for="p in patternStore.patterns"
            :key="p.id"
            class="pattern-picker-item"
            :class="{ selected: deductSelectedPattern?.id === p.id }"
            @click="selectDeductPattern(p)"
          >
            <span class="pattern-name">{{ p.name }}</span>
            <span class="pattern-size">{{ p.cols }}x{{ p.rows }}</span>
            <van-icon v-if="deductSelectedPattern?.id === p.id" name="success" color="#1989fa" />
          </div>
        </template>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.inventory-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.summary-bar {
  display: flex;
  justify-content: space-around;
  padding: 6px 16px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
  font-size: 12px;
  color: #646566;
}

.series-label {
  padding: 12px 16px 8px;
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
  padding: 0 12px 16px;
}

.inv-item {
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.1s;
}

.inv-item:active {
  transform: scale(0.92);
}

.inv-item.low-stock {
  border-color: #ff976a;
}

.inv-code {
  font-size: 10px;
  font-weight: 700;
  pointer-events: none;
}

.inv-qty {
  font-size: 9px;
  pointer-events: none;
  margin-top: 2px;
}

.inv-item:not(.light-bg) .inv-code,
.inv-item:not(.light-bg) .inv-qty {
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.light-bg .inv-code,
.light-bg .inv-qty {
  color: #333;
}

.adjust-popup {
  padding: 16px;
}

.adjust-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.adjust-swatch {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #ebedf0;
}

.adjust-code {
  font-size: 18px;
  font-weight: 700;
  flex: 1;
}

.adjust-current {
  font-size: 14px;
  color: #646566;
  margin-bottom: 16px;
}

.adjust-current strong {
  color: #323233;
  font-size: 18px;
}

.adjust-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.adjust-direct {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #646566;
  flex-wrap: wrap;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  font-size: 16px;
  font-weight: 600;
}

.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
}

.batch-popup {
  padding: 0 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.batch-series {
  display: flex;
  flex-direction: column;
}

.batch-select-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  font-size: 13px;
  color: #646566;
}

.batch-colors {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 0;
}

.batch-swatch {
  aspect-ratio: 1;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
  transition: transform 0.1s, border-color 0.15s;
}

.batch-swatch:active {
  transform: scale(0.92);
}

.batch-swatch.selected {
  border-color: #1989fa;
  box-shadow: 0 0 0 2px rgba(25, 137, 250, 0.25);
}

.color-code {
  font-size: 9px;
  font-weight: 600;
  pointer-events: none;
}

.batch-swatch:not(.light-bg) .color-code {
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.light-bg .color-code {
  color: #333;
}

.check-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: #1989fa;
  font-weight: 700;
}

.batch-mode {
  display: flex;
  flex-direction: column;
}

.batch-value {
  display: flex;
  flex-direction: column;
}

/* Deduct popup */
.deduct-popup {
  padding: 0 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.deduct-action {
  margin-top: 8px;
}

.deduct-selected-pattern {
  font-size: 14px;
  color: #323233;
  padding: 8px 12px;
  background: #f2f3f5;
  border-radius: 6px;
}

.deduct-image-upload {
  margin-top: 8px;
}

.deduct-image-preview {
  margin-top: 10px;
  text-align: center;
}

.deduct-image-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.deduct-hint {
  font-size: 13px;
  color: #969799;
  margin-top: 8px;
}

/* Crop tool */
.crop-instruction {
  font-size: 14px;
  color: #323233;
  font-weight: 600;
  margin-bottom: 8px;
}

.crop-container {
  position: relative;
  display: inline-block;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: #000;
  touch-action: none;
}

.crop-img {
  display: block;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
}

.crop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  cursor: crosshair;
  touch-action: none;
}

.crop-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.crop-actions .van-button {
  flex: 1;
}

.deduct-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 14px;
  color: #323233;
}

.deduct-color-list {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #ebedf0;
  border-radius: 8px;
}

.deduct-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #f7f8fa;
  cursor: pointer;
}

.deduct-color-row:last-child {
  border-bottom: none;
}

.deduct-deselected {
  opacity: 0.45;
}

.deduct-color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ebedf0;
  flex-shrink: 0;
}

.deduct-color-swatch.small {
  width: 16px;
  height: 16px;
}

.deduct-color-code {
  font-size: 13px;
  font-weight: 600;
  min-width: 36px;
}

.deduct-count-input {
  width: 56px;
  height: 28px;
  border: 1px solid #dcdee0;
  border-radius: 4px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #323233;
  background: #fff;
  outline: none;
  padding: 0 4px;
}

.deduct-count-input:focus {
  border-color: #1989fa;
}

.deduct-color-stock {
  font-size: 11px;
  color: #969799;
  flex: 1;
  text-align: right;
}

.deduct-selected-info {
  font-size: 14px;
  color: #1989fa;
  font-weight: 600;
  text-align: center;
}

.deduct-shortfall {
  background: #fff3e0;
  border-radius: 8px;
  padding: 10px 12px;
}

.shortfall-title {
  font-size: 13px;
  font-weight: 600;
  color: #e65100;
  margin-bottom: 6px;
}

.shortfall-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #bf360c;
  margin-bottom: 4px;
}

.shortfall-row:last-child {
  margin-bottom: 0;
}

.deduct-actions {
  display: flex;
  gap: 12px;
}

.deduct-actions .van-button {
  flex: 1;
}

/* Pattern picker */
.pattern-picker {
  padding: 0 16px 16px;
}

.pattern-picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid #f7f8fa;
  cursor: pointer;
}

.pattern-picker-item.selected {
  background: #ecf5ff;
}

.pattern-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.pattern-size {
  font-size: 12px;
  color: #969799;
}
</style>
