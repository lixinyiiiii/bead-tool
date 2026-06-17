export interface BeadColor {
  code: string
  series: string
  seq: number
  hex: string
  r: number
  g: number
  b: number
  lab: [number, number, number]
}

export interface BeadCell {
  code: string
  hex: string
}

export interface BeadPattern {
  id: string
  name: string
  cols: number
  rows: number
  grid: BeadCell[][]
  sourceType?: 'image' | 'drawing'
  sourceImage?: string
  createdAt: string
}

export interface InventoryItem {
  code: string
  quantity: number
  updatedAt: string
}

export interface InventoryTransaction {
  id: number
  code: string
  delta: number
  reason: string
  createdAt: string
}

export interface ColorCount {
  code: string
  hex: string
  count: number
}

export type SubGridSize = 5 | 10 | 'none'
export type MirrorMode = 'none' | 'horizontal' | 'vertical' | 'both'
export type DrawingTool = 'brush' | 'eraser' | 'fill'
export type CanvasSize = '52x52' | '78x78' | '104x104'
