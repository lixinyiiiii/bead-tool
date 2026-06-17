import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem('pindou-favorites')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFavorites(codes: string[]) {
  localStorage.setItem('pindou-favorites', JSON.stringify(codes))
}

export const useFavoriteStore = defineStore('favorite', () => {
  const codes = ref<string[]>(loadFavorites())

  function persist() {
    saveFavorites(codes.value)
  }

  watch(codes, persist, { deep: true })

  function toggle(code: string) {
    const idx = codes.value.indexOf(code)
    if (idx >= 0) {
      codes.value.splice(idx, 1)
    } else {
      codes.value.push(code)
    }
  }

  function isFavorite(code: string): boolean {
    return codes.value.includes(code)
  }

  return { codes, toggle, isFavorite }
})
