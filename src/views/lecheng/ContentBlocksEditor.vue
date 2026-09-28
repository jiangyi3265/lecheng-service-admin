<template>
  <div class="blocks-editor">
    <div v-for="(block, index) in modelValue" :key="keys[index]" class="block">
      <div class="block-toolbar"><strong>{{ block.type === 'image' ? '图片' : '文字' }} {{ index + 1 }}</strong><div>
        <el-button text :disabled="index === 0 || busy" @click="move(index, -1)">上移</el-button>
        <el-button text :disabled="index === modelValue.length - 1 || busy" @click="move(index, 1)">下移</el-button>
        <el-button text type="danger" :disabled="busy" @click="remove(index)">删除</el-button>
      </div></div>
      <template v-if="block.type === 'text'">
        <el-input :model-value="block.title" placeholder="小标题（选填）" maxlength="100" :aria-label="'第' + (index + 1) + '段小标题'" @update:model-value="update(index, 'title', $event)" />
        <el-input :model-value="block.text" type="textarea" :rows="5" placeholder="在这里填写正文，按回车换行" maxlength="10000" show-word-limit :aria-label="'第' + (index + 1) + '段正文'" @update:model-value="update(index, 'text', $event)" />
      </template>
      <template v-else>
        <ContentImages :model-value="block.url ? [block.url] : []" :disabled="busy" hint="这张图片会显示在正文的当前位置。" @update:model-value="update(index, 'url', $event[0] || '')" @busy="setBusy" />
        <el-input :model-value="block.caption" placeholder="图片说明（选填）" maxlength="200" @update:model-value="update(index, 'caption', $event)" />
      </template>
    </div>
    <p v-if="!modelValue.length" class="empty-copy">按下面的按钮添加文字或图片，展示顺序与这里一致。</p>
    <el-button :disabled="busy || modelValue.length >= 40" @click="add('text')">＋ 添加文字</el-button>
    <el-button :disabled="busy || modelValue.length >= 40" @click="add('image')">＋ 添加图片</el-button>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import ContentImages from './ContentImages.vue'
const props = defineProps({ modelValue: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue', 'busy'])
const busy = ref(false), keys = ref(props.modelValue.map(() => crypto.randomUUID()))
function setBusy(value) { busy.value = value; emit('busy', value) }
function add(type) { keys.value.push(crypto.randomUUID()); emit('update:modelValue', [...props.modelValue, type === 'text' ? { type, title: '', text: '' } : { type, url: '', caption: '' }]) }
function update(index, field, value) { emit('update:modelValue', props.modelValue.map((b, i) => i === index ? { ...b, [field]: value } : b)) }
function remove(index) { keys.value.splice(index, 1); emit('update:modelValue', props.modelValue.filter((_, i) => i !== index)) }
function move(index, offset) { const list = [...props.modelValue]; [list[index], list[index + offset]] = [list[index + offset], list[index]]; [keys.value[index], keys.value[index + offset]] = [keys.value[index + offset], keys.value[index]]; emit('update:modelValue', list) }
</script>
<style scoped>
.block { margin-bottom:16px; padding:14px; background:#f7f9fc; border:1px solid #e0e6ee; border-radius:6px; }
.block-toolbar { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
.block-toolbar strong { font-size:13px; color:#536478; }
.block :deep(.el-textarea), .block > .el-input:last-child { margin-top:10px; }
.empty-copy { margin:0 0 16px; color:#667688; font-size:14px; }
</style>
