<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useDraftStore } from '@/stores/draftStore'
import { showConfirmDialog } from 'vant'
import type { Draft } from '@/stores/draftStore'

const router = useRouter()
const draftStore = useDraftStore()

function formatDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function thumbnail(draft: Draft) {
  const canvas = document.createElement('canvas')
  const rows = draft.grid.length
  const cols = draft.grid[0]?.length ?? 1
  const cs = 3
  canvas.width = cols * cs
  canvas.height = rows * cs
  const ctx = canvas.getContext('2d')!
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = draft.grid[r][c].hex
      ctx.fillRect(c * cs, r * cs, cs, cs)
    }
  }
  return canvas.toDataURL()
}

function openDraft(draft: Draft) {
  router.push(`/draw?draft=${draft.id}`)
}

function handleDelete(id: string) {
  showConfirmDialog({
    title: '删除草稿',
    message: '确定删除此草稿？删除后不可恢复。',
  }).then(() => {
    draftStore.removeDraft(id)
  }).catch(() => {})
}
</script>

<template>
  <div class="draft-list-page">
    <van-nav-bar title="草稿箱" left-arrow @click-left="$router.back()" />

    <div v-if="draftStore.drafts.length === 0" class="empty-state">
      <van-empty description="暂无草稿">
        <van-button type="primary" size="small" @click="router.push('/draw')">去绘制</van-button>
      </van-empty>
    </div>

    <div v-else class="draft-list">
      <div
        v-for="d in draftStore.drafts"
        :key="d.id"
        class="draft-card"
        @click="openDraft(d)"
      >
        <div class="draft-thumb">
          <img :src="thumbnail(d)" :alt="d.name" />
        </div>
        <div class="draft-info">
          <div class="draft-name">{{ d.name }}</div>
          <div class="draft-meta">
            <span>{{ d.canvasSize }}</span>
            <span>{{ formatDate(d.updatedAt) }}</span>
          </div>
        </div>
        <van-icon
          name="delete-o"
          size="20"
          color="#ee0a24"
          class="delete-btn"
          @click.stop="handleDelete(d.id)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.draft-list-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.empty-state {
  padding-top: 80px;
}

.draft-list {
  padding: 12px;
}

.draft-card {
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

.draft-card:active {
  background: #f7f8fa;
}

.draft-thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ebedf0;
  flex-shrink: 0;
}

.draft-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.draft-info {
  flex: 1;
  min-width: 0;
}

.draft-name {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-meta {
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
