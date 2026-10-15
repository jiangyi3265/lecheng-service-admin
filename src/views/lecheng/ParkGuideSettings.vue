<template>
  <div v-loading="loading" class="guide-settings">
    <el-alert v-if="loadError" type="error" show-icon :closable="false" class="guide-tip" title="园区导航读取失败，暂时不能保存。请检查网络后点击“重新读取”。"><el-button size="small" @click="load">重新读取</el-button></el-alert>
    <el-alert v-else-if="loaded && !exists" type="info" show-icon :closable="false" class="guide-tip" title="还没有保存过园区导航，下面是小程序目前显示的默认内容，修改后保存即可生效。" />
    <el-alert v-if="!canEdit" type="warning" show-icon :closable="false" class="guide-tip" title="当前账号只能查看园区导航，如需修改请联系管理员开通“内容编辑”权限。" />
    <div class="guide-layout">
      <div class="guide-main">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="guide-form" :disabled="saving || !canEdit || !!loadError">
          <el-form-item label="园区名称" prop="title">
            <el-input v-model="form.title" maxlength="100" show-word-limit :placeholder="DEFAULTS.title" />
            <p class="help">显示在地图下方的大字标题。</p>
          </el-form-item>
          <el-form-item label="地址" prop="address">
            <el-input v-model="form.address" maxlength="200" show-word-limit :placeholder="DEFAULTS.address" />
            <p class="help">显示在园区名称下方；“复制园区名称和地址”按钮复制的就是园区名称和这里的地址。</p>
          </el-form-item>
          <el-form-item label="说明" prop="note">
            <el-input v-model="form.note" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" maxlength="300" show-word-limit :placeholder="DEFAULTS.note" />
            <p class="help">地址下方的灰色小字，可提醒用户出发前确认院区和入口。按回车可以换行。</p>
          </el-form-item>
          <el-form-item label="地图标记文字" prop="markerName">
            <el-input v-model="form.markerName" maxlength="30" show-word-limit :placeholder="DEFAULTS.markerName" />
            <p class="help">小程序地图上标记点旁边的白色小牌子，建议简短。</p>
          </el-form-item>
          <div class="coord-pair">
            <el-form-item label="纬度" prop="latitude">
              <el-input-number v-model="form.latitude" :min="LAT_MIN" :max="LAT_MAX" :precision="6" :step="0.0001" controls-position="right" aria-label="纬度" />
              <p class="help">范围 {{ LAT_MIN }}–{{ LAT_MAX }}，博鳌约为 19.15</p>
            </el-form-item>
            <el-form-item label="经度" prop="longitude">
              <el-input-number v-model="form.longitude" :min="LNG_MIN" :max="LNG_MAX" :precision="6" :step="0.0001" controls-position="right" aria-label="经度" />
              <p class="help">范围 {{ LNG_MIN }}–{{ LNG_MAX }}，博鳌约为 110.50</p>
            </el-form-item>
          </div>
          <p class="help coord-help">坐标请用腾讯地图坐标拾取器获取（<a href="https://lbs.qq.com/getPoint/" target="_blank" rel="noopener noreferrer">https://lbs.qq.com/getPoint/</a> ，GCJ-02）：搜索或点选位置后，把显示的“纬度,经度”分别填入上面两格。不要使用百度地图的坐标，位置会偏。</p>
        </el-form>
        <div class="guide-tools">
          <el-button :disabled="!coordsValid" @click="openTencentMap">在腾讯地图中查看</el-button>
          <el-button v-hasPermi="['lecheng:content:edit']" :disabled="saving || !!loadError || isDefault" @click="restoreDefaults">恢复默认</el-button>
        </div>
        <div class="guide-actions">
          <span role="status">{{ dirty ? '有尚未保存的修改' : exists ? '已是最新保存的内容' : '' }}</span>
          <div>
            <el-button :disabled="!dirty || saving" @click="undo">撤销修改</el-button>
            <el-button v-hasPermi="['lecheng:content:edit']" type="primary" :loading="saving" :disabled="!!loadError || loading" @click="save">保存园区导航</el-button>
          </div>
        </div>
      </div>
      <aside class="guide-preview" aria-label="小程序园区导航页预览">
        <h3>小程序预览</h3>
        <div class="phone">
          <div class="phone-title">园区导航</div>
          <div class="map-box" role="img" :aria-label="'地图示意：标记“' + (form.markerName.trim() || DEFAULTS.markerName) + '”'">
            <span class="map-sample">地图示意</span>
            <div class="map-marker">
              <span class="map-callout">{{ form.markerName.trim() || DEFAULTS.markerName }}</span>
              <svg class="map-pin" viewBox="0 0 24 32" aria-hidden="true"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0z" fill="#0785ff" /><circle cx="12" cy="12" r="4.6" fill="#fff" /></svg>
            </div>
            <span class="map-coords">{{ coordsText }}</span>
          </div>
          <div class="map-content">
            <p class="map-title">{{ form.title.trim() || DEFAULTS.title }}</p>
            <p class="map-address">{{ form.address.trim() || DEFAULTS.address }}</p>
            <p class="map-note">{{ form.note.trim() || DEFAULTS.note }}</p>
            <div class="map-button">打开地图导航</div>
            <p class="map-note map-hint">在导航页选择手机支持的地图应用</p>
            <div class="map-copy">复制园区名称和地址</div>
          </div>
        </div>
        <p class="help">修改后右侧会同步显示；地图位置以坐标为准，可点“在腾讯地图中查看”核对。</p>
      </aside>
    </div>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import auth from '@/plugins/auth'
import { listContent, saveContent } from '@/api/lecheng'

// 与小程序 data/park-map.js、pages/guide/guide.vue 目前显示的内容一致；后台没有保存过时显示这些
const GUIDE_ID = 'park-guide'
const DEFAULTS = Object.freeze({
  title: '博鳌乐城国际医疗旅游先行区',
  address: '海南省琼海市博鳌镇',
  note: '地图标记为园区综合服务中心。前往医院，请在地图中确认具体院区与入口。',
  markerName: '乐城综合服务中心',
  latitude: 19.149250,
  longitude: 110.498542
})
// 坐标范围与后台校验一致（中国境内大致范围，GCJ-02）
const LAT_MIN = 3, LAT_MAX = 54, LNG_MIN = 73, LNG_MAX = 136

const canEdit = auth.hasPermi('lecheng:content:edit')
const form = reactive({ ...DEFAULTS })
const formRef = ref(), loading = ref(false), loaded = ref(false), loadError = ref(false), exists = ref(false), saving = ref(false)
const snapshot = () => JSON.stringify(form)
const baseline = ref(snapshot())
const dirty = computed(() => snapshot() !== baseline.value)
const isDefault = computed(() => snapshot() === JSON.stringify(DEFAULTS))
const inRange = (value, min, max) => typeof value === 'number' && isFinite(value) && value >= min && value <= max
const coordsValid = computed(() => inRange(form.latitude, LAT_MIN, LAT_MAX) && inRange(form.longitude, LNG_MIN, LNG_MAX))
const coordsText = computed(() => coordsValid.value ? form.latitude.toFixed(6) + ', ' + form.longitude.toFixed(6) : '坐标未填写')

const requiredText = label => ({ required: true, validator: (_, value, callback) => String(value || '').trim() ? callback() : callback(new Error('请填写' + label)), trigger: 'blur' })
const coordinate = (label, min, max) => ({ required: true, validator: (_, value, callback) => inRange(value, min, max) ? callback() : callback(new Error(`请填写${min}–${max}之间的${label}`)), trigger: 'change' })
const rules = {
  title: [requiredText('园区名称')],
  address: [requiredText('地址')],
  note: [requiredText('说明')],
  markerName: [requiredText('地图标记文字')],
  latitude: [coordinate('纬度', LAT_MIN, LAT_MAX)],
  longitude: [coordinate('经度', LNG_MIN, LNG_MAX)]
}

const textOr = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback
// 坐标可能以数字或数字字符串保存
function numberOr(value, min, max, fallback) {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return inRange(n, min, max) ? n : fallback
}
async function load() {
  loading.value = true; loadError.value = false
  try {
    const rows = (await listContent('guide')).data || []
    const record = rows.find(row => row.id === GUIDE_ID)
    exists.value = !!record
    const r = record || {}
    Object.assign(form, {
      title: textOr(r.title, DEFAULTS.title),
      address: textOr(r.address, DEFAULTS.address),
      note: textOr(r.note, DEFAULTS.note),
      markerName: textOr(r.markerName, DEFAULTS.markerName),
      latitude: numberOr(r.latitude, LAT_MIN, LAT_MAX, DEFAULTS.latitude),
      longitude: numberOr(r.longitude, LNG_MIN, LNG_MAX, DEFAULTS.longitude)
    })
    baseline.value = snapshot(); loaded.value = true
  } catch { loadError.value = true }
  finally { loading.value = false }
}
function undo() { Object.assign(form, JSON.parse(baseline.value)); formRef.value?.clearValidate() }
function restoreDefaults() {
  Object.assign(form, DEFAULTS); formRef.value?.clearValidate()
  ElMessage.info('已恢复为默认内容，点击“保存园区导航”后生效')
}
// 在新标签页打开腾讯地图标记页，核对坐标位置（与小程序 H5 版“腾讯地图”按钮同一种链接）
function openTencentMap() {
  if (!coordsValid.value) return
  const marker = `coord:${form.latitude.toFixed(6)},${form.longitude.toFixed(6)};title:${form.markerName.trim() || DEFAULTS.markerName};addr:${form.address.trim() || DEFAULTS.address}`
  window.open('https://apis.map.qq.com/uri/v1/marker?marker=' + encodeURIComponent(marker) + '&referer=lecheng-admin', '_blank', 'noopener,noreferrer')
}
async function save() {
  if (saving.value) return
  if (!await formRef.value.validate().catch(() => false)) { ElMessage.warning('请先填写标红的内容'); return }
  saving.value = true
  try {
    const data = { title: form.title.trim(), address: form.address.trim(), note: form.note.trim(), markerName: form.markerName.trim(), latitude: Number(form.latitude.toFixed(6)), longitude: Number(form.longitude.toFixed(6)) }
    await saveContent({ id: GUIDE_ID, kindCode: 'guide', name: '园区导航', ...data, status: '1', sortOrder: 0, contentVersion: 2 })
    Object.assign(form, data)
    baseline.value = snapshot(); exists.value = true
    ElMessage.success('已保存，小程序重新打开园区导航即可看到')
  } catch { /* 接口错误由请求层弹出提示；保留填写的内容 */ }
  finally { saving.value = false }
}

async function canLeave() {
  if (saving.value) { ElMessage.info('请等待保存完成'); return false }
  if (!dirty.value) return true
  try { await ElMessageBox.confirm('园区导航的修改还没有保存，离开后将不会保留。', '离开页面？', { confirmButtonText: '放弃修改并离开', cancelButtonText: '继续编辑', type: 'warning' }); return true } catch { return false }
}
function beforeUnload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
onBeforeRouteLeave(canLeave)
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); load() })
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
defineExpose({ canLeave })
</script>
<style scoped>
.guide-settings { min-height: 300px; }
.guide-tip { margin-bottom: 18px; }
.guide-tip .el-button { margin-top: 8px; }
.guide-layout { display: flex; align-items: flex-start; }
.guide-main { flex: 1; min-width: 0; max-width: 660px; }
.guide-form :deep(.el-form-item__label) { font-weight: 500; color: #34495e; }
.guide-form :deep(.el-form-item__content) { display: block; }
.guide-form :deep(.el-input-number) { width: 100%; }
.help { font-size: 12px; color: #667688; line-height: 1.6; margin: 6px 0 0; }
.help a { color: #246db5; word-break: break-all; }
.coord-pair { display: grid; grid-template-columns: 1fr 1fr; grid-column-gap: 20px; }
.coord-help { margin: -6px 0 0; }
.guide-tools { margin: 16px 0 22px; }
.guide-tools .el-button + .el-button { margin-left: 12px; }
.guide-actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; padding-top: 16px; border-top: 1px solid #e3e9f0; }
.guide-actions > span { margin-right: 12px; font-size: 13px; color: #63758a; }
.guide-actions .el-button + .el-button { margin-left: 12px; }
.guide-preview { flex: 0 0 340px; width: 340px; margin-left: 40px; padding: 18px; background: #f6f8fb; border-radius: 8px; }
.guide-preview h3 { margin: 0 0 14px; font-size: 16px; color: #253c52; }
.phone { overflow: hidden; border: 1px solid #dfe3e7; border-radius: 14px; background: #fff; }
.phone-title { padding: 11px 0; background: #f7f8fa; border-bottom: 1px solid #dfe3e7; text-align: center; font-size: 15px; font-weight: 600; color: #22303d; }
/* 地图区域只是示意：浅色网格当作街道，中间是标记点和标记文字 */
.map-box { position: relative; height: 180px; background-color: #e7eef3; background-image: linear-gradient(90deg, rgba(255, 255, 255, 0.85) 2px, transparent 2px), linear-gradient(0deg, rgba(255, 255, 255, 0.85) 2px, transparent 2px); background-size: 46px 46px; }
.map-sample { position: absolute; top: 8px; left: 10px; font-size: 11px; color: #8292a8; }
.map-marker { position: absolute; left: 50%; bottom: 50%; transform: translateX(-50%); text-align: center; }
.map-callout { display: inline-block; max-width: 220px; margin-bottom: 4px; padding: 4px 8px; border-radius: 8px; background: #fff; box-shadow: 0 1px 4px rgba(24, 52, 81, 0.18); font-size: 12px; line-height: 1.5; color: #183451; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.map-pin { display: block; width: 22px; height: 29px; margin: 0 auto; }
.map-coords { position: absolute; right: 8px; bottom: 6px; font-size: 11px; color: #63758a; }
.map-content { padding: 16px 16px 14px; }
.map-content p { margin: 0; overflow-wrap: anywhere; }
.map-title { font-size: 16px; font-weight: 650; line-height: 1.6; color: #22303d; }
.map-content .map-address { margin-top: 5px; font-size: 13px; color: #738499; }
.map-content .map-note { margin-top: 9px; font-size: 11.5px; line-height: 1.7; color: #8292a8; white-space: pre-wrap; }
.map-button { margin-top: 14px; height: 40px; line-height: 40px; border-radius: 22px; background: #0785ff; color: #fff; text-align: center; font-size: 14.5px; font-weight: 500; }
.map-content .map-hint { margin-top: 6px; white-space: normal; }
.map-copy { margin-top: 12px; text-align: center; font-size: 12.5px; color: #0785ff; }
@media (max-width: 1000px) {
  .guide-layout { flex-direction: column; }
  .guide-main { max-width: none; width: 100%; }
  .guide-preview { flex: none; width: auto; max-width: 340px; margin: 28px 0 0; }
}
@media (max-width: 600px) {
  .coord-pair { grid-template-columns: 1fr; }
}
</style>
