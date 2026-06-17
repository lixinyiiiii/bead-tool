import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { InventoryItem } from '@/types'
import { MARD_COLORS } from '@/assets/colors/mard-221'

function loadInventory(): Map<string, InventoryItem> {
  try {
    const raw = localStorage.getItem('pindou-inventory')
    if (!raw) return new Map()
    const obj = JSON.parse(raw)
    const map = new Map<string, InventoryItem>()
    for (const [key, val] of Object.entries(obj)) {
      map.set(key, val as InventoryItem)
    }
    return map
  } catch {
    return new Map()
  }
}

function saveInventory(items: Map<string, InventoryItem>) {
  const obj: Record<string, InventoryItem> = {}
  for (const [key, val] of items) {
    obj[key] = val
  }
  localStorage.setItem('pindou-inventory', JSON.stringify(obj))
}

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref<Map<string, InventoryItem>>(loadInventory())

  function persist() {
    saveInventory(items.value)
  }

  watch(items, persist, { deep: true })

  function init() {
    for (const c of MARD_COLORS) {
      if (!items.value.has(c.code)) {
        items.value.set(c.code, { code: c.code, quantity: 0, updatedAt: new Date().toISOString() })
      }
    }
  }

  function getQuantity(code: string): number {
    return items.value.get(code)?.quantity ?? 0
  }

  function adjust(code: string, delta: number, reason: string = 'manual') {
    const item = items.value.get(code)
    if (item) {
      item.quantity = Math.max(0, item.quantity + delta)
      item.updatedAt = new Date().toISOString()
    }
  }

  function setQuantity(code: string, quantity: number) {
    const item = items.value.get(code)
    if (item) {
      item.quantity = Math.max(0, quantity)
      item.updatedAt = new Date().toISOString()
    }
  }

  function deductPattern(colorCounts: Map<string, number>): { success: boolean; shortfalls: { code: string; needed: number; available: number }[] } {
    const shortfalls: { code: string; needed: number; available: number }[] = []
    for (const [code, needed] of colorCounts) {
      const available = getQuantity(code)
      if (available < needed) {
        shortfalls.push({ code, needed, available })
      }
    }
    for (const [code, needed] of colorCounts) {
      adjust(code, -needed, 'pattern-deduction')
    }
    return { success: shortfalls.length === 0, shortfalls }
  }

  init()

  return { items, getQuantity, adjust, setQuantity, deductPattern }
})
