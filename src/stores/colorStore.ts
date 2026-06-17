import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MARD_COLORS, MARD_COLOR_MAP, MARD_SERIES_ORDER, getColorsBySeries } from '@/assets/colors/mard-221'
import type { BeadColor } from '@/types'

export const useColorStore = defineStore('color', () => {
  const colors = MARD_COLORS
  const colorMap = MARD_COLOR_MAP
  const seriesOrder = MARD_SERIES_ORDER

  const colorsBySeries = computed(() => {
    const map: Record<string, BeadColor[]> = {}
    for (const s of seriesOrder) {
      map[s] = getColorsBySeries(s)
    }
    return map
  })

  function findByCode(code: string): BeadColor | undefined {
    return colorMap.get(code)
  }

  return { colors, colorMap, seriesOrder, colorsBySeries, findByCode }
})
