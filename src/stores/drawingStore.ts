import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CanvasSize, DrawingTool, MirrorMode, BeadCell } from '@/types'

function parseCanvasSize(size: CanvasSize): { cols: number; rows: number } {
  const [c, r] = size.split('x').map(Number)
  return { cols: c, rows: r }
}

export const useDrawingStore = defineStore('drawing', () => {
  const canvasSize = ref<CanvasSize>('52x52')
  const currentTool = ref<DrawingTool>('brush')
  const currentColorCode = ref('H7')
  const mirrorMode = ref<MirrorMode>('none')
  const subGridSize = ref<5 | 10>(5)
  const grid = ref<BeadCell[][]>([])

  function initGrid(size?: CanvasSize) {
    if (size) canvasSize.value = size
    const { cols, rows } = parseCanvasSize(canvasSize.value)
    grid.value = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ code: '', hex: '#FFFFFF' }))
    )
  }

  function setCanvasSize(size: CanvasSize) {
    initGrid(size)
  }

  function setTool(tool: DrawingTool) {
    currentTool.value = tool
  }

  function setColor(code: string, hex: string) {
    currentColorCode.value = code
  }

  function setMirrorMode(mode: MirrorMode) {
    mirrorMode.value = mode
  }

  function setSubGridSize(size: 5 | 10) {
    subGridSize.value = size
  }

  initGrid()

  return {
    canvasSize, currentTool, currentColorCode, mirrorMode, subGridSize, grid,
    setCanvasSize, setTool, setColor, setMirrorMode, setSubGridSize, initGrid,
  }
})
