import type { BeadCell } from '@/types'

export interface PatternTemplate {
  id: string
  name: string
  cols: number
  rows: number
  category: string
  grid: BeadCell[][]
}

function c(code: string, hex: string): BeadCell {
  return { code, hex }
}

function empty(): BeadCell {
  return { code: '', hex: '#FFFFFF' }
}

function buildGrid(rows: number, cols: number, data: (BeadCell | null)[][]): BeadCell[][] {
  return data.map(row =>
    Array.from({ length: cols }, (_, i) => row[i] ?? empty())
  )
}

// Heart 10x10
const heartData: (BeadCell | null)[][] = [
  [null, c('C2', '#E60012'), c('C2', '#E60012'), null, null, c('C2', '#E60012'), c('C2', '#E60012'), null, null, null],
  [c('C2', '#E60012'), c('C19', '#FD543D'), c('C19', '#FD543D'), c('C2', '#E60012'), c('C2', '#E60012'), c('C19', '#FD543D'), c('C19', '#FD543D'), c('C2', '#E60012'), null, null],
  [c('C2', '#E60012'), c('C19', '#FD543D'), c('C19', '#FD543D'), c('C2', '#E60012'), c('C2', '#E60012'), c('C19', '#FD543D'), c('C19', '#FD543D'), c('C2', '#E60012'), null, null],
  [c('C2', '#E60012'), c('C19', '#FD543D'), c('C19', '#FD543D'), c('C2', '#E60012'), c('C2', '#E60012'), c('C19', '#FD543D'), c('C19', '#FD543D'), c('C2', '#E60012'), null, null],
  [null, c('C2', '#E60012'), c('C2', '#E60012'), c('C1', '#FD7C72'), c('C1', '#FD7C72'), c('C2', '#E60012'), c('C2', '#E60012'), null, null, null],
  [null, null, c('C2', '#E60012'), c('C1', '#FD7C72'), c('C1', '#FD7C72'), c('C2', '#E60012'), null, null, null, null],
  [null, null, null, c('C2', '#E60012'), c('C2', '#E60012'), null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
]

// Star 10x10
const starData: (BeadCell | null)[][] = [
  [null, null, null, null, c('A8', '#FFDA45'), null, null, null, null, null],
  [null, null, null, c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), null, null, null, null],
  [null, null, null, c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), null, null, null, null],
  [c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), null],
  [null, c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), null, null],
  [null, null, c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), c('A8', '#FFDA45'), null, null, null],
  [null, c('A8', '#FFDA45'), c('A8', '#FFDA45'), null, c('A8', '#FFDA45'), null, c('A8', '#FFDA45'), c('A8', '#FFDA45'), null, null],
  [c('A8', '#FFDA45'), null, null, null, null, null, null, null, c('A8', '#FFDA45'), null],
  [null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
]

// Smiley 10x10
const smileyData: (BeadCell | null)[][] = [
  [null, null, c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), null, null],
  [null, c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), null],
  [c('A9', '#FF995B'), c('A9', '#FF995B'), c('D1', '#333333'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('D1', '#333333'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B')],
  [c('A9', '#FF995B'), c('A9', '#FF995B'), c('D1', '#333333'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('D1', '#333333'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B')],
  [c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B')],
  [c('A9', '#FF995B'), c('C1', '#FD7C72'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('C1', '#FD7C72'), c('A9', '#FF995B'), c('A9', '#FF995B')],
  [c('A9', '#FF995B'), c('C1', '#FD7C72'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('C1', '#FD7C72'), c('A9', '#FF995B')],
  [null, c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), null],
  [null, null, c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), c('A9', '#FF995B'), null, null],
  [null, null, null, null, null, null, null, null, null, null],
]

// Flower 10x10
const flowerData: (BeadCell | null)[][] = [
  [null, null, null, c('D1', '#333333'), null, c('D1', '#333333'), null, null, null, null],
  [null, null, c('C2', '#E60012'), c('C2', '#E60012'), c('D1', '#333333'), c('C2', '#E60012'), c('C2', '#E60012'), null, null, null],
  [null, c('C2', '#E60012'), c('C2', '#E60012'), c('C2', '#E60012'), c('D1', '#333333'), c('C2', '#E60012'), c('C2', '#E60012'), c('C2', '#E60012'), null, null],
  [null, c('C2', '#E60012'), c('C2', '#E60012'), c('C2', '#E60012'), c('D1', '#333333'), c('C2', '#E60012'), c('C2', '#E60012'), c('C2', '#E60012'), null, null],
  [c('D1', '#333333'), c('D1', '#333333'), c('D1', '#333333'), c('D1', '#333333'), c('A4', '#FBED56'), c('D1', '#333333'), c('D1', '#333333'), c('D1', '#333333'), c('D1', '#333333'), null],
  [null, c('B3', '#9EF780'), c('B3', '#9EF780'), c('C2', '#E60012'), c('D1', '#333333'), c('C2', '#E60012'), c('C2', '#E60012'), c('C2', '#E60012'), c('C2', '#E60012'), null],
  [null, null, c('B3', '#9EF780'), c('C2', '#E60012'), c('D1', '#333333'), c('C2', '#E60012'), c('C2', '#E60012'), c('C2', '#E60012'), null, null],
  [null, null, c('B3', '#9EF780'), c('C2', '#E60012'), c('D1', '#333333'), c('C2', '#E60012'), c('C2', '#E60012'), null, null, null],
  [null, null, null, c('D1', '#333333'), null, c('D1', '#333333'), null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
]

export const TEMPLATES: PatternTemplate[] = [
  {
    id: 'heart',
    name: '爱心',
    cols: 10,
    rows: 10,
    category: '基础',
    grid: buildGrid(10, 10, heartData),
  },
  {
    id: 'star',
    name: '星星',
    cols: 10,
    rows: 10,
    category: '基础',
    grid: buildGrid(10, 10, starData),
  },
  {
    id: 'smiley',
    name: '笑脸',
    cols: 10,
    rows: 10,
    category: '表情',
    grid: buildGrid(10, 10, smileyData),
  },
  {
    id: 'flower',
    name: '花朵',
    cols: 10,
    rows: 10,
    category: '自然',
    grid: buildGrid(10, 10, flowerData),
  },
]
