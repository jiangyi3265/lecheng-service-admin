<template>
  <!-- 仿小程序首页顶部轮播：宽高比 750 : 310，图片铺满裁切，左下角两行白字 -->
  <div class="hero-mock" role="img" :aria-label="'首页轮播预览：' + (title.trim() || '未填写大标题')"><div class="hero-frame">
    <img v-if="coverImage" class="hero-image" :src="coverImage" alt="" />
    <div v-else class="hero-image" :style="sceneStyle(scene)" />
    <div class="hero-shade" />
    <div class="hero-copy">
      <strong :class="{ placeholder: !title.trim() }">{{ title.trim() || '（请填写大标题）' }}</strong>
      <span v-if="subtitle.trim()">{{ subtitle.trim() }}</span>
    </div>
    <div class="hero-dots" aria-hidden="true"><i class="active" /><i /></div>
  </div></div>
</template>
<script setup>
import { sceneStyle } from './scene-atlas'
defineProps({ title: { type: String, default: '' }, subtitle: { type: String, default: '' }, coverImage: { type: String, default: '' }, scene: { type: [Number, String], default: 0 } })
</script>
<style scoped>
.hero-mock { width: 100%; max-width: 420px; overflow: hidden; border-radius: 6px; background: #dfedf7; }
/* 宽高比 750 : 310（旧内核浏览器不支持 aspect-ratio，用上内边距撑高） */
.hero-frame { position: relative; height: 0; padding-top: 41.33%; }
.hero-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-shade { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, transparent 40%, rgba(8, 37, 49, 0.62)); }
/* 与小程序一致：文字太长时换行，不截断 */
.hero-copy { position: absolute; left: 5.9%; right: 0; bottom: 20%; color: #fff; overflow-wrap: anywhere; }
.hero-copy strong { display: block; font-size: 29px; font-weight: 650; letter-spacing: 1.5px; line-height: 1.3; }
.hero-copy strong.placeholder { font-size: 18px; font-weight: 500; opacity: 0.85; }
.hero-copy span { display: block; margin-top: 2px; font-size: 17px; font-weight: 500; letter-spacing: 0.5px; line-height: 1.4; }
.hero-dots { position: absolute; left: 0; right: 0; bottom: 6px; text-align: center; line-height: 0; }
.hero-dots i { display: inline-block; width: 6px; height: 6px; margin: 0 3px; border-radius: 50%; background: rgba(255, 255, 255, 0.5); }
.hero-dots i.active { background: #fff; }
</style>
