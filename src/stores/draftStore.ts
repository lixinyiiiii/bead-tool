import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BeadCell, CanvasSize, MirrorMode } from '@/types'

export interface Draft {
  id: string
  name: string
  canvasSize: CanvasSize
  mirrorMode: MirrorMode
  subGridSize: number
  currentColorCode: string
  grid: BeadCell[][]
  updatedAt: string
}

function loadDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem('pindou-drafts')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveDrafts(drafts: Draft[]) {
  localStorage.setItem('pindou-drafts', JSON.stringify(drafts))
}

export const useDraftStore = defineStore('draft', () => {
  const drafts = ref<Draft[]>(loadDrafts())

  function persist() {
    saveDrafts(drafts.value)
  }

  function saveDraft(
    name: string,
    canvasSize: CanvasSize,
    mirrorMode: MirrorMode,
    subGridSize: number,
    currentColorCode: string,
    grid: BeadCell[][]
  ): Draft {
    const existing = drafts.value.find(d => d.name === name)
    const now = new Date().toISOString()
    if (existing) {
      existing.canvasSize = canvasSize
      existing.mirrorMode = mirrorMode
      existing.subGridSize = subGridSize
      existing.currentColorCode = currentColorCode
      existing.grid = JSON.parse(JSON.stringify(grid))
      existing.updatedAt = now
      persist()
      return existing
    }
    const draft: Draft = {
      id: crypto.randomUUID(),
      name,
      canvasSize,
      mirrorMode,
      subGridSize,
      currentColorCode,
      grid: JSON.parse(JSON.stringify(grid)),
      updatedAt: now,
    }
    drafts.value.unshift(draft)
    persist()
    return draft
  }

  function removeDraft(id: string) {
    drafts.value = drafts.value.filter(d => d.id !== id)
    persist()
  }

  return { drafts, saveDraft, removeDraft }
})
