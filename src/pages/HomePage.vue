<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    name: '图片转图纸',
    desc: '导入图片生成拼豆像素图',
    icon: '🖼️',
    route: '/image-to-pattern',
  },
  {
    name: '手绘画布',
    desc: '用221色色号自由绘制',
    icon: '🎨',
    route: '/draw',
  },
  {
    name: '图纸翻转',
    desc: '镜像翻转已有图纸',
    icon: '↔️',
    route: '/flip',
  },
  {
    name: '色号高亮',
    desc: '高亮显示指定色号',
    icon: '🔍',
    route: '/highlight',
  },
  {
    name: '图纸库',
    desc: '查看和管理已保存图纸',
    icon: '📂',
    route: '/patterns',
  },
  {
    name: '我的库存',
    desc: '管理拼豆出入库数量',
    icon: '📦',
    route: '/inventory',
  },
  {
    name: '草稿箱',
    desc: '继续编辑未完成的图纸',
    icon: '📝',
    route: '/drafts',
  },
]
</script>

<template>
  <div class="home-page">
    <div class="header">
      <h1>拼豆工具</h1>
      <p>Mard 221色 像素图纸助手</p>
    </div>
    <div class="feature-grid">
      <div
        v-for="f in features"
        :key="f.route"
        class="feature-card"
        @click="router.push(f.route)"
      >
        <div class="feature-icon">{{ f.icon }}</div>
        <div class="feature-name">{{ f.name }}</div>
        <div class="feature-desc">{{ f.desc }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: 20px 16px;
}

.header {
  text-align: center;
  padding: 30px 0 20px;
}

.header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #323233;
}

.header p {
  font-size: 14px;
  color: #969799;
  margin: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.feature-card:last-child:nth-child(odd) {
  grid-column: span 1;
}

.feature-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.feature-card:active {
  transform: scale(0.97);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.feature-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.feature-name {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 12px;
  color: #969799;
}
</style>
