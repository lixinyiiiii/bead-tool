<script setup lang="ts">
import { useRouter } from 'vue-router'
import { usePatternStore } from '@/stores/patternStore'
import { showConfirmDialog } from 'vant'

const router = useRouter()
const patternStore = usePatternStore()

function getThumbnail(pattern: typeof patternStore.patterns[0]): string {
  const canvas = document.createElement('canvas')
  const cols = pattern.cols
  const rows = pattern.rows
  const cs = 4
  canvas.width = cols * cs
  canvas.height = rows * cs
  const ctx = canvas.getContext('2d')
  if (ctx) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = pattern.grid[r]?.[c]
        if (cell) {
          ctx.fillStyle = cell.hex
          ctx.fillRect(c * cs, r * cs, cs, cs)
        }
      }
    }
  }
  return canvas.toDataURL()
}

function handleDelete(id: string) {
  showConfirmDialog({
    title: '删除图纸',
    message: '确定删除此图纸？',
  }).then(() => {
    patternStore.removePattern(id)
  }).catch(() => {})
}

function countBeads(pattern: typeof patternStore.patterns[0]): number {
  let count = 0
  for (const row of pattern.grid) {
    for (const cell of row) {
      if (cell.code) count++
    }
  }
  return count
}
</script>

<template>
  <div class="pattern-list-page">
    <van-nav-bar title="图纸库" left-arrow @click-left="router.back()" />

    <div v-if="patternStore.patterns.length === 0" class="empty-state">
      <van-empty description="暂无保存的图纸">
        <van-button type="primary" size="small" @click="router.push('/draw')">去绘制</van-button>
      </van-empty>
    </div>

    <div v-else class="pattern-list">
      <div
        v-for="p in patternStore.patterns"
        :key="p.id"
        class="pattern-card"
        @click="router.push(`/pattern/${p.id}`)"
      >
        <div class="pattern-thumb">
          <img :src="getThumbnail(p)" :alt="p.name" />
        </div>
        <div class="pattern-info">
          <div class="pattern-name">{{ p.name }}</div>
          <div class="pattern-meta">
            <span>{{ p.cols }}x{{ p.rows }}</span>
            <span>{{ countBeads(p) }} 颗</span>
            <span>{{ p.sourceType === 'image' ? '图片转图' : '手绘' }}</span>
          </div>
        </div>
        <van-icon
          name="delete-o"
          size="20"
          color="#ee0a24"
          class="delete-btn"
          @click.stop="handleDelete(p.id)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pattern-list-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.empty-state {
  padding-top: 80px;
}

.pattern-list {
  padding: 12px;
}

.pattern-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.pattern-thumb {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ebedf0;
  flex-shrink: 0;
}

.pattern-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.pattern-info {
  flex: 1;
  min-width: 0;
}

.pattern-name {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.pattern-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #969799;
}

.delete-btn {
  flex-shrink: 0;
  padding: 8px;
}
</style>
