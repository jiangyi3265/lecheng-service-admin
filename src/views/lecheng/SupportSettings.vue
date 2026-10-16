<template>
  <div v-loading="loading" class="support-settings">
    <el-alert v-if="loadError" type="error" show-icon :closable="false" class="support-tip" title="客服设置读取失败，暂时不能保存。请检查网络后点击“重新读取”。"><el-button size="small" @click="load">重新读取</el-button></el-alert>
    <el-alert v-else-if="loaded && !exists" type="info" show-icon :closable="false" class="support-tip" title="还没有保存过客服设置，下面是小程序目前显示的默认内容，修改后保存即可生效。" />
    <el-alert v-if="!canEdit" type="warning" show-icon :closable="false" class="support-tip" title="当前账号只能查看客服设置，如需修改请联系管理员开通“内容编辑”权限。" />
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="support-form" :disabled="saving || !canEdit || !!loadError">
      <section v-if="part !== 'contact'" class="support-card">
        <h3 class="card-title">客服页</h3>
        <p class="card-help">小程序“客服”页的头像、开场白和在线时间。</p>
        <div class="support-layout">
          <div class="support-fields">
            <el-form-item label="客服头像">
              <div class="avatar-row">
                <figure v-if="!form.avatar" class="default-avatar"><img :src="DEFAULT_AVATAR" alt="默认客服头像" /><figcaption>默认头像</figcaption></figure>
                <ContentImages class="avatar-upload" :model-value="form.avatar ? [form.avatar] : []" :disabled="saving || !canEdit || !!loadError" hint="显示在小程序客服消息旁，建议使用正方形照片。" @update:model-value="form.avatar = $event[0] || ''" @busy="trackUpload" />
              </div>
              <p class="help">{{ form.avatar ? '正在使用上传的头像。' : '当前使用默认头像，上传照片即可替换。' }}</p>
              <el-button v-if="form.avatar" class="restore-avatar" :disabled="uploading > 0" @click="form.avatar = ''">恢复默认头像</el-button>
            </el-form-item>
            <el-form-item label="顶部标题" prop="caption">
              <el-input v-model="form.caption" maxlength="30" show-word-limit :placeholder="DEFAULT_CAPTION" />
              <p class="help">显示在聊天记录最上方的灰色小字；不填则显示“{{ DEFAULT_CAPTION }}”。</p>
            </el-form-item>
            <el-form-item label="开场白" prop="greeting">
              <el-input v-model="form.greeting" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" maxlength="500" show-word-limit placeholder="用户进入客服页时看到的第一句话" />
              <p class="help">用户打开客服页时，客服头像旁显示的第一条消息。按回车可以换行。</p>
            </el-form-item>
            <el-form-item label="在线时间" prop="hours">
              <el-input v-model="form.hours" maxlength="100" show-word-limit placeholder="例如：人工在线时间：早8：00-晚22：00" />
              <p class="help">显示在开场白下方；不填则不显示。</p>
            </el-form-item>
          </div>
          <aside class="support-preview" aria-label="小程序客服页预览">
            <h3>小程序预览</h3>
            <div class="phone">
              <div class="phone-title">客服</div>
              <div class="chat">
                <p class="chat-caption">{{ form.caption.trim() || DEFAULT_CAPTION }}</p>
                <p class="chat-note">客服留言 · 消息同步至乐城后台</p>
                <div class="chat-row">
                  <img class="chat-avatar" :src="form.avatar || DEFAULT_AVATAR" alt="客服头像" />
                  <div class="chat-bubble">
                    <p :class="{ placeholder: !form.greeting.trim() }">{{ form.greeting.trim() ? form.greeting : '（请填写开场白）' }}</p>
                    <p v-if="form.hours.trim()" class="chat-hours">{{ form.hours }}</p>
                  </div>
                </div>
              </div>
            </div>
            <p class="help">修改后右侧会同步显示，实际效果以小程序为准。</p>
          </aside>
        </div>
      </section>
      <section v-if="part !== 'chat'" class="support-card">
        <h3 class="card-title">「我的」页联系方式</h3>
        <p class="card-help">显示在小程序“我的”页最下方的在线时间、地址和电话按钮。</p>
        <div class="support-layout">
          <div class="support-fields">
            <el-form-item label="客服在线时间" prop="contactHours">
              <el-input v-model="form.contactHours" maxlength="50" show-word-limit :placeholder="DEFAULT_CONTACT_HOURS" />
              <p class="help">显示为“客服在线时间：{{ form.contactHours.trim() || DEFAULT_CONTACT_HOURS }}”，建议简短；不填则显示“{{ DEFAULT_CONTACT_HOURS }}”。</p>
            </el-form-item>
            <el-form-item label="联系地址" prop="contactAddress">
              <el-input v-model="form.contactAddress" maxlength="200" show-word-limit :placeholder="DEFAULT_CONTACT_ADDRESS" />
              <p class="help">建议不超过 13 个字，太长会换行；不填则显示“{{ DEFAULT_CONTACT_ADDRESS }}”。</p>
            </el-form-item>
            <el-form-item label="客服电话" prop="contactPhone">
              <el-input v-model="form.contactPhone" maxlength="30" show-word-limit placeholder="例如：0898-12345678 或 13800000000" />
              <p class="help">填写后“我的”页电话按钮可直接拨打；不填显示“待更新”。只能填写数字、空格、+、-、括号和“转”（分机可写成“0898-12345678转123”）。</p>
            </el-form-item>
          </div>
          <aside class="support-preview" aria-label="小程序“我的”页联系方式预览">
            <h3>小程序预览</h3>
            <div class="mine-page">
              <div class="mine-contact">
                <div class="mine-rows">
                  <div class="mine-row mine-hours-row">
                    <svg class="mine-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 6v7l4 2" /></svg>
                    <span class="mine-hours">客服在线时间：{{ form.contactHours.trim() || DEFAULT_CONTACT_HOURS }}</span>
                  </div>
                  <div class="mine-row">
                    <svg class="mine-icon mine-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    <span class="mine-address">{{ form.contactAddress.trim() || DEFAULT_CONTACT_ADDRESS }}</span>
                  </div>
                </div>
                <div class="mine-phone">
                  <img :src="PHONE_ICON" alt="" />
                  <span v-if="!form.contactPhone.trim()">待更新</span>
                </div>
              </div>
            </div>
            <p class="help">{{ form.contactPhone.trim() ? '点电话按钮将拨打：' + normalizePhone(form.contactPhone) : '没有填写客服电话，电话按钮显示“待更新”，点击不会拨号。' }}</p>
          </aside>
        </div>
      </section>
      <div class="support-actions">
        <span role="status">{{ uploading ? '图片正在上传，请稍候…' : dirty ? '有尚未保存的修改' : exists ? '已是最新保存的内容' : '' }}</span>
        <div>
          <el-button :disabled="!dirty || saving || uploading > 0" @click="undo">撤销修改</el-button>
          <el-button v-hasPermi="['lecheng:content:edit']" type="primary" :loading="saving" :disabled="uploading > 0 || !!loadError || loading" @click="save">保存客服设置</el-button>
        </div>
      </div>
    </el-form>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import auth from '@/plugins/auth'
import { listContent, saveContent } from '@/api/lecheng'
import ContentImages from './ContentImages.vue'
import defaultAvatar from '@/assets/images/customer-service-avatar.jpg'
import phoneIcon from '@/assets/images/lecheng-mine-phone.png'

// part：'chat' 只显示客服页设置，'contact' 只显示「我的」页联系方式，空 = 两块都显示（两块存在同一条记录里，一起保存）
defineProps({ part: { type: String, default: '' } })

// 与小程序 data/support.js 的默认内容一致；后台没有保存过时显示这些
const SUPPORT_ID = 'support-settings'
// 默认头像打包进 static 目录（不能放 public/lecheng，否则会和旧地址 /lecheng 冲突）
const DEFAULT_AVATAR = defaultAvatar
const DEFAULT_CAPTION = '乐城服务为您服务'
const DEFAULT_GREETING = '您好：我是人工客服，我可以为您提供博鳌乐城：项目介绍、预约评估、陪诊服务咨询、预约流程相关信息。'
const DEFAULT_HOURS = '人工在线时间：早8：00-晚22：00'
// “我的”页联系方式的默认内容，与小程序 data/service-contact.js 一致；保存为空时小程序也显示这些
const DEFAULT_CONTACT_HOURS = '8:00—22:00'
const DEFAULT_CONTACT_ADDRESS = '海南省博鳌镇乐城医疗先行区'
const PHONE_ICON = phoneIcon
// 客服电话只允许数字、空格、+、-、( ) 和“转”（与后台校验一致）；全角的数字、括号、加减号和空格先换成半角
const PHONE_PATTERN = /^[0-9 +\-()转]*$/
const normalizePhone = value => String(value || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/（/g, '(').replace(/）/g, ')').replace(/＋/g, '+').replace(/－/g, '-').replace(/　/g, ' ').trim()

const canEdit = auth.hasPermi('lecheng:content:edit')
const form = reactive({ avatar: '', caption: DEFAULT_CAPTION, greeting: DEFAULT_GREETING, hours: DEFAULT_HOURS, contactHours: DEFAULT_CONTACT_HOURS, contactAddress: DEFAULT_CONTACT_ADDRESS, contactPhone: '' })
const formRef = ref(), loading = ref(false), loaded = ref(false), loadError = ref(false), exists = ref(false), saving = ref(false), uploading = ref(0)
const snapshot = () => JSON.stringify(form)
const baseline = ref(snapshot())
const dirty = computed(() => snapshot() !== baseline.value)
const rules = {
  greeting: [{ required: true, validator: (_, value, callback) => String(value || '').trim() ? callback() : callback(new Error('请填写开场白')), trigger: 'blur' }],
  contactPhone: [{ validator: (_, value, callback) => {
    const phone = normalizePhone(value)
    if (!phone) return callback()
    if (!PHONE_PATTERN.test(phone)) return callback(new Error('客服电话只能填写数字、空格、+、-、括号和“转”'))
    if (!/[0-9]/.test(phone)) return callback(new Error('请填写正确的客服电话'))
    callback()
  }, trigger: 'blur' }]
}
// 联系方式：没保存过或保存为空时，小程序显示默认内容，这里也显示默认内容
const contactText = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback
function trackUpload(value) { uploading.value += value ? 1 : -1 }

async function load() {
  loading.value = true; loadError.value = false
  try {
    const rows = (await listContent('support')).data || []
    const record = rows.find(row => row.id === SUPPORT_ID)
    exists.value = !!record
    // 保存过的设置里，顶部标题、在线时间留空是有意为之（小程序会用默认标题 / 不显示在线时间），不再填回默认值
    Object.assign(form, record
      ? { avatar: record.avatar || '', caption: record.caption || '', greeting: record.greeting || DEFAULT_GREETING, hours: record.hours || '' }
      : { avatar: '', caption: DEFAULT_CAPTION, greeting: DEFAULT_GREETING, hours: DEFAULT_HOURS })
    const r = record || {}
    Object.assign(form, { contactHours: contactText(r.contactHours, DEFAULT_CONTACT_HOURS), contactAddress: contactText(r.contactAddress, DEFAULT_CONTACT_ADDRESS), contactPhone: contactText(r.contactPhone, '') })
    baseline.value = snapshot(); loaded.value = true
  } catch { loadError.value = true }
  finally { loading.value = false }
}
function undo() { Object.assign(form, JSON.parse(baseline.value)); formRef.value?.clearValidate() }
async function save() {
  if (saving.value || uploading.value) return
  if (!await formRef.value.validate().catch(() => false)) { ElMessage.warning('请先修改标红的内容'); return }
  saving.value = true
  try {
    const contact = { contactHours: form.contactHours.trim(), contactAddress: form.contactAddress.trim(), contactPhone: normalizePhone(form.contactPhone) }
    await saveContent({ id: SUPPORT_ID, kindCode: 'support', name: '客服设置', avatar: form.avatar, caption: form.caption.trim(), greeting: form.greeting.trim(), hours: form.hours.trim(), ...contact, status: '1', sortOrder: 0, contentVersion: 2 })
    form.caption = form.caption.trim(); form.greeting = form.greeting.trim(); form.hours = form.hours.trim()
    // 清空的联系方式保存后小程序显示默认内容，这里也换回默认内容
    Object.assign(form, { contactHours: contact.contactHours || DEFAULT_CONTACT_HOURS, contactAddress: contact.contactAddress || DEFAULT_CONTACT_ADDRESS, contactPhone: contact.contactPhone })
    baseline.value = snapshot(); exists.value = true
    ElMessage.success('已保存，小程序重新进入客服页、“我的”页即可看到')
  } catch { /* 接口错误由请求层弹出提示；保留填写的内容 */ }
  finally { saving.value = false }
}

async function canLeave() {
  if (saving.value || uploading.value) { ElMessage.info('请等待保存或图片上传完成'); return false }
  if (!dirty.value) return true
  try { await ElMessageBox.confirm('客服设置的修改还没有保存，离开后将不会保留。', '离开页面？', { confirmButtonText: '放弃修改并离开', cancelButtonText: '继续编辑', type: 'warning' }); return true } catch { return false }
}
function beforeUnload(event) { if (dirty.value || uploading.value) { event.preventDefault(); event.returnValue = '' } }
onBeforeRouteLeave(canLeave)
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); load() })
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
defineExpose({ canLeave })
</script>
<style scoped>
.support-settings { min-height: 300px; }
.support-tip { margin-bottom: 18px; }
.support-tip .el-button { margin-top: 8px; }
.support-card { margin-bottom: 20px; padding: 20px 24px 24px; border: 1px solid #e3e9f0; border-radius: 8px; }
.card-title { margin: 0 0 4px; font-size: 17px; color: #253c52; }
.card-help { margin: 0 0 18px; font-size: 13px; color: #667688; }
.support-layout { display: flex; align-items: flex-start; }
.support-fields { flex: 1; min-width: 0; max-width: 660px; }
.support-form :deep(.el-form-item__label) { font-weight: 500; color: #34495e; }
.support-form :deep(.el-form-item__content) { display: block; }
.help { font-size: 12px; color: #667688; line-height: 1.6; margin: 6px 0 0; }
.avatar-row { display: flex; flex-wrap: wrap; align-items: flex-start; }
.default-avatar { width: 144px; margin: 0 12px 12px 0; border: 1px solid #dce3eb; border-radius: 6px; overflow: hidden; background: #fff; }
.default-avatar img { display: block; width: 142px; height: 108px; object-fit: cover; }
.default-avatar figcaption { font-size: 12px; line-height: 32px; text-align: center; color: #667688; }
.avatar-upload { flex: 1; min-width: 200px; }
.restore-avatar { margin-top: 10px; }
.support-actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 4px 0 8px; }
.support-actions > span { margin-right: 12px; font-size: 13px; color: #63758a; }
.support-actions .el-button + .el-button { margin-left: 12px; }
.support-preview { flex: 0 0 340px; width: 340px; margin-left: 40px; padding: 18px; background: #f6f8fb; border-radius: 8px; }
.support-preview h3 { margin: 0 0 14px; font-size: 16px; color: #253c52; }
.phone { overflow: hidden; border: 1px solid #dfe3e7; border-radius: 14px; background: #ededed; }
.phone-title { padding: 11px 0; background: #f7f8fa; border-bottom: 1px solid #dfe3e7; text-align: center; font-size: 15px; font-weight: 600; color: #22303d; }
.chat { min-height: 280px; padding: 14px 12px 8px; }
.chat-caption { margin: 6px 0; text-align: center; font-size: 12.5px; color: #889199; }
.chat-note { margin: 0 0 19px; text-align: center; font-size: 11px; color: #737d87; }
.chat-row { display: flex; align-items: flex-start; margin-bottom: 14px; }
.chat-avatar { flex-shrink: 0; width: 38px; height: 38px; margin-right: 10px; border-radius: 5px; object-fit: cover; background: #e1effc; }
.chat-bubble { position: relative; min-width: 0; max-width: calc(100% - 50px); padding: 9px 11px; border-radius: 5px; background: #fff; color: #22303d; font-size: 14.5px; line-height: 1.65; overflow-wrap: anywhere; }
.chat-bubble::before { content: ""; position: absolute; top: 12px; left: -6px; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 7px solid #fff; }
.chat-bubble p { margin: 0; white-space: pre-wrap; }
.chat-bubble .chat-hours { margin-top: 9px; }
.chat-bubble .placeholder { color: #9aa5b1; }
/* “我的”页联系方式：按小程序 pages/mine/mine.vue 的比例缩小（1rpx 约 0.43px） */
.mine-page { padding: 12px 10px; border: 1px solid #dfe3e7; border-radius: 14px; background: #f4f6f9; }
.mine-contact { display: flex; align-items: center; padding: 16px 11px; border-radius: 9px; background: #fff; }
.mine-rows { flex: 1; min-width: 0; padding-right: 9px; }
.mine-row { display: flex; align-items: center; box-sizing: border-box; min-height: 35px; }
.mine-hours-row { border-bottom: 1px solid #f0f2f5; }
.mine-icon { flex-shrink: 0; width: 17px; height: 17px; margin-right: 9px; fill: none; stroke: #183451; stroke-width: 1.65; stroke-linecap: round; stroke-linejoin: round; }
.mine-icon.mine-pin { width: 18px; height: 18px; }
.mine-hours, .mine-address { flex: 1; min-width: 0; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
.mine-hours { color: #303944; }
.mine-address { color: #555f6e; }
.mine-phone { display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box; width: 69px; height: 69px; border-left: 1px solid #f0f2f5; }
.mine-phone img { display: block; width: 26px; height: 26px; }
.mine-phone span { margin-top: 3px; font-size: 9px; color: #819096; }
@media (max-width: 1000px) {
  .support-layout { flex-direction: column; }
  .support-fields { max-width: none; width: 100%; }
  .support-preview { flex: none; width: auto; max-width: 340px; margin: 28px 0 0; }
}
</style>
