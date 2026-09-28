<template>
  <div class="image-picker">
    <div class="pictures">
      <div v-for="(url, index) in modelValue" :key="url + index" class="picture">
        <el-image :src="url" fit="cover" :preview-src-list="modelValue" :initial-index="index" preview-teleported><template #error><span>图片未能加载</span></template></el-image>
        <div class="picture-actions">
          <el-button v-if="limit > 1" text :disabled="index === 0 || busy" :aria-label="'将第' + (index + 1) + '张图片前移'" @click="move(index)">前移</el-button>
          <el-button text type="danger" :disabled="busy" :aria-label="'删除第' + (index + 1) + '张图片'" @click="remove(index)">删除</el-button>
        </div>
      </div>
      <el-button v-if="modelValue.length < limit" class="upload-button" :loading="busy" :disabled="disabled" @click="input.click()">{{ busy ? '正在上传…' : modelValue.length ? '继续添加图片' : '选择图片上传' }}</el-button>
    </div>
    <input ref="input" type="file" accept="image/jpeg,image/png" :multiple="limit > 1" hidden @change="upload" />
    <p class="image-help">{{ hint || (limit === 1 ? '列表和详情页使用这张图片。' : '按排列顺序展示，点击图片可放大查看。') }}支持 JPG、PNG，单张不超过 5 MB。</p>
    <p v-if="error" class="upload-error" role="alert">{{ error }}</p>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { uploadContentImage } from '@/api/lecheng'
const props = defineProps({ modelValue: { type: Array, default: () => [] }, limit: { type: Number, default: 1 }, disabled: Boolean, hint: String })
const emit = defineEmits(['update:modelValue', 'busy'])
const input = ref(), busy = ref(false), error = ref('')
function remove(index) { emit('update:modelValue', props.modelValue.filter((_, i) => i !== index)) }
function move(index) { const list = [...props.modelValue]; [list[index - 1], list[index]] = [list[index], list[index - 1]]; emit('update:modelValue', list) }
async function upload(event) {
  const files = [...event.target.files]; event.target.value = ''; error.value = ''
  if (files.length > props.limit - props.modelValue.length) { error.value = `最多添加 ${props.limit} 张图片，请重新选择。`; return }
  if (files.some(f => !['image/jpeg', 'image/png'].includes(f.type) || f.size > 5 * 1024 * 1024)) { error.value = '请选择不超过 5 MB 的 JPG 或 PNG 图片。'; return }
  busy.value = true; emit('busy', true)
  const urls = [...props.modelValue]
  try {
    for (const file of files) {
      const result = await uploadContentImage(file)
      urls.push(result)
      emit('update:modelValue', [...urls])
    }
  } catch { error.value = '图片上传失败，已上传的图片会保留，请重试。' }
  finally { busy.value = false; emit('busy', false) }
}
</script>
<style scoped>
.pictures { display:flex; flex-wrap:wrap; gap:12px; align-items:flex-start; }
.picture { width:144px; border:1px solid #dce3eb; border-radius:6px; overflow:hidden; background:white; }
.picture .el-image { display:block; width:142px; height:108px; font-size:12px; }
.picture-actions { display:flex; justify-content:space-around; }
.upload-button { height:110px; min-width:144px; border-style:dashed; color:#246db5; background:#f8fbff; }
.image-help { font-size:12px; color:#667688; line-height:1.6; margin:8px 0 0; }
.upload-error { font-size:13px; color:#b42318; margin:8px 0 0; }
</style>
