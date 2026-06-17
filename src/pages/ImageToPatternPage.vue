<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDrawingStore } from '@/stores/drawingStore'
import { usePatternStore } from '@/stores/patternStore'
import { useColorStore } from '@/stores/colorStore'
import { MARD_COLORS } from '@/assets/colors/mard-221'
import type { CanvasSize, BeadCell, BeadColor } from '@/types'

const router = useRouter()
const drawingStore = useDrawingStore()
const patternStore = usePatternStore()
const colorStore = useColorStore()

const sourceImage = ref<string | null>(null)
const targetSize = ref<CanvasSize>('52x52')
const maxColors = ref(32)
const processing = ref(false)
const showResult = ref(false)

function parseCanvasSize(size: CanvasSize): { cols: number; rows: number } {
  const [c, r] = size.split('x').map(Number)
  return { cols: c, rows: r }
}

function findClosestColor(r: number, g: number, b: number): BeadColor {
  const lab = rgbToLab(r, g, b)
  let minDist = Infinity
  let closest = MARD_COLORS[0]
  for (const color of MARD_COLORS) {
    const d = ciede2000(lab, color.lab)
    if (d < minDist) { minDist = d; closest = color }
  }
  return closest
}

function ciede2000(lab1: [number, number, number], lab2: [number, number, number]): number {
  const L1 = lab1[0], a1 = lab1[1], b1 = lab1[2]
  const L2 = lab2[0], a2 = lab2[1], b2 = lab2[2]
  const kL = 1, kC = 1, kH = 1
  const C1ab = Math.sqrt(a1 * a1 + b1 * b1), C2ab = Math.sqrt(a2 * a2 + b2 * b2)
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

async function processImage() {
  if (!sourceImage.value) return
  processing.value = true

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = sourceImage.value

  await new Promise<void>((resolve) => {
    img.onload = () => resolve()
    img.onerror = () => resolve()
  })

  if (!img.width) {
    processing.value = false
    return
  }

  const { cols, rows } = parseCanvasSize(targetSize.value)
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = cols
  tempCanvas.height = rows
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) { processing.value = false; return }

  ctx.imageSmoothingEnabled = true
  ctx.drawImage(img, 0, 0, cols, rows)
  const imageData = ctx.getImageData(0, 0, cols, rows)

  const grid: BeadCell[][] = []
  const usedColors = new Map<string, BeadColor>()

  for (let r = 0; r < rows; r++) {
    const row: BeadCell[] = []
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4
      const red = imageData.data[i]
      const green = imageData.data[i + 1]
      const blue = imageData.data[i + 2]
      const alpha = imageData.data[i + 3]

      if (alpha < 30) {
        row.push({ code: '', hex: '#FFFFFF' })
      } else {
        const closest = findClosestColor(red, green, blue)
        usedColors.set(closest.code, closest)
        row.push({ code: closest.code, hex: closest.hex })
      }
    }
    grid.push(row)
  }

  // Limit colors if needed
  if (usedColors.size > maxColors.value) {
    const colorCount = new Map<string, number>()
    for (const row of grid) {
      for (const cell of row) {
        if (cell.code) {
          colorCount.set(cell.code, (colorCount.get(cell.code) ?? 0) + 1)
        }
      }
    }
    const sorted = Array.from(colorCount.entries()).sort((a, b) => b[1] - a[1])
    const allowed = new Set(sorted.slice(0, maxColors.value).map(([code]) => code))

    for (const row of grid) {
      for (let c = 0; c < row.length; c++) {
        if (row[c].code && !allowed.has(row[c].code)) {
          const cellColor = usedColors.get(row[c].code)!
          let bestReplacement = MARD_COLORS[0]
          let minDist = Infinity
          for (const [code, color] of usedColors) {
            if (!allowed.has(code)) continue
            const dr = cellColor.r - color.r
            const dg = cellColor.g - color.g
            const db = cellColor.b - color.b
            const dist = dr * dr + dg * dg + db * db
            if (dist < minDist) {
              minDist = dist
              bestReplacement = color
            }
          }
          row[c] = { code: bestReplacement.code, hex: bestReplacement.hex }
        }
      }
    }
  }

  drawingStore.grid = grid
  drawingStore.canvasSize = targetSize.value
  processing.value = false
  showResult.value = true
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (!file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    sourceImage.value = ev.target?.result as string
  }
  reader.readAsDataURL(file)
}

function saveAsPattern() {
  const { cols, rows } = parseCanvasSize(targetSize.value)
  const name = `图片转图 ${patternStore.patterns.length + 1}`
  const pattern = patternStore.createPattern(name, cols, rows, 'image', sourceImage.value ?? undefined)
  pattern.grid = JSON.parse(JSON.stringify(drawingStore.grid))
  router.push(`/pattern/${pattern.id}`)
}

function editOnCanvas() {
  router.push('/draw')
}
</script>

<template>
  <div class="image-to-pattern-page">
    <van-nav-bar title="图片转图纸" left-arrow @click-left="router.back()" />

    <div class="content">
      <div class="section" v-if="!sourceImage">
        <div class="upload-area" @click="($refs.fileInput as HTMLInputElement)?.click()">
          <van-icon name="photograph" size="48" color="#dcdee0" />
          <p>点击选择图片</p>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleFileSelect"
          />
        </div>
      </div>

      <div class="section" v-if="sourceImage && !showResult">
        <div class="preview-image">
          <img :src="sourceImage" alt="source" />
        </div>

        <div class="settings">
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

          <van-button type="primary" block :loading="processing" @click="processImage">
            {{ processing ? '转换中...' : '开始转换' }}
          </van-button>
        </div>
      </div>

      <div class="section" v-if="showResult">
        <div class="result-header">
          <span>转换完成</span>
          <van-button size="small" @click="sourceImage = null; showResult = false">重新选择</van-button>
        </div>

        <div class="result-actions">
          <van-button type="primary" size="small" @click="saveAsPattern">保存为图纸</van-button>
          <van-button size="small" @click="editOnCanvas">在画布中编辑</van-button>
        </div>

        <div class="result-stats">
          <span>大小: {{ targetSize }}</span>
          <span>色数: {{ new Set(drawingStore.grid.flat().filter(c => c.code).map(c => c.code)).size }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-to-pattern-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.content {
  padding: 16px;
}

.section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 16px;
  margin-bottom: 12px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  border: 2px dashed #dcdee0;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.upload-area:active {
  border-color: #1989fa;
}

.upload-area p {
  margin-top: 12px;
  font-size: 14px;
  color: #969799;
}

.preview-image {
  text-align: center;
  margin-bottom: 16px;
}

.preview-image img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
}

.settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.result-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.result-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #646566;
}
</style>
