import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { BeadPattern, BeadCell } from '@/types'

function loadPatterns(): BeadPattern[] {
  try {
    const raw = localStorage.getItem('pindou-patterns')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function savePatterns(patterns: BeadPattern[]) {
  localStorage.setItem('pindou-patterns', JSON.stringify(patterns))
}

export const usePatternStore = defineStore('pattern', () => {
  const patterns = ref<BeadPattern[]>(loadPatterns())
  const currentPattern = ref<BeadPattern | null>(null)

  function persist() {
    savePatterns(patterns.value)
  }

  watch(patterns, persist, { deep: true })

  function createPattern(name: string, cols: number, rows: number, sourceType?: 'image' | 'drawing', sourceImage?: string): BeadPattern {
    const grid: BeadCell[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ code: '', hex: '#FFFFFF' }))
    )
    const pattern: BeadPattern = {
      id: crypto.randomUUID(),
      name,
      cols,
      rows,
      grid,
      sourceType,
      sourceImage,
      createdAt: new Date().toISOString(),
    }
    patterns.value.push(pattern)
    return pattern
  }

  function setCurrentPattern(pattern: BeadPattern) {
    currentPattern.value = pattern
  }

  function removePattern(id: string) {
    patterns.value = patterns.value.filter(p => p.id !== id)
    if (currentPattern.value?.id === id) {
      currentPattern.value = null
    }
  }

  return { patterns, currentPattern, createPattern, setCurrentPattern, removePattern }
})
