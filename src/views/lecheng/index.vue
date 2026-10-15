<template>
  <div class="app-container lecheng-console">
    <ContentEditor v-if="editorOpen" :source="editorSource" :section="kind" :hospitals="hospitalOptions" @close="editorOpen = false" @saved="contentSaved" />
    <template v-else>
    <div class="page-heading">
      <div><h2>{{ heading ? heading.title : '乐城运营' }}<span v-if="active === 'consultations' && totalUnread" class="unread-badge heading-badge" :aria-label="'未读消息 ' + totalUnread + ' 条'">{{ unreadText(totalUnread) }}</span></h2><p>{{ heading ? heading.hint : '管理小程序里的图片、文字和客户咨询' }}</p></div>
      <el-button v-if="active !== 'support'" @click="refresh()">刷新当前列表</el-button>
    </div>
    <el-tabs v-model="active" :class="{ 'menu-mode': !!menuSection }" :before-leave="beforeTabLeave" @tab-change="refresh()">
      <el-tab-pane label="内容管理" name="content">
        <div class="toolbar">
          <el-segmented v-if="!menuSection" v-model="kind" :options="contentKinds" @change="loadContent" /><span v-else />
          <el-button v-hasPermi="['lecheng:content:edit']" type="primary" :disabled="loading" @click="createContent">添加{{ kindLabel }}</el-button>
        </div>
        <div class="content-filters"><el-input v-model="searchText" clearable placeholder="输入名称查找内容" aria-label="查找内容" /><el-select v-model="statusFilter" placeholder="全部状态" aria-label="展示状态"><el-option label="全部状态" value="" /><el-option label="正在展示" value="1" /><el-option label="未展示 / 草稿" value="0" /></el-select><span>共 {{ visibleContent.length }} 条内容</span></div>
        <el-table v-loading="loading" :data="visibleContent" :empty-text="searchText.trim() || statusFilter ? '没有找到符合条件的内容，可以换个关键词或清空筛选。' : '这里还没有内容，点击上方按钮添加。'">
          <el-table-column :label="kind === 'about' ? '配图' : '封面'" width="100"><template #default="{ row }"><el-image v-if="row.coverImage" :src="row.coverImage" fit="cover" class="list-thumbnail" /><span v-else class="muted-label">示意图片</span></template></el-table-column>
          <el-table-column :label="kind === 'policy' ? '政策标题' : kind === 'about' ? '段落标题' : '名称'" min-width="220"><template #default="{ row }">{{ row[titleKey(kind)] }}</template></el-table-column>
          <el-table-column :label="kind === 'policy' ? '成文日期 · 标签' : kind === 'about' ? '图片说明' : '分类'" min-width="120"><template #default="{ row }">{{ categoryText(row) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? '展示中' : '未展示' }}</el-tag></template></el-table-column>
          <el-table-column label="排序" prop="sortOrder" width="85" />
          <el-table-column label="操作" width="180" fixed="right"><template #default="{ row }">
            <el-button v-hasPermi="['lecheng:content:edit']" link type="primary" @click="editContent(row)">编辑</el-button>
            <el-button v-hasPermi="['lecheng:content:edit']" link type="danger" @click="removeContent(row)">删除</el-button>
          </template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="客服咨询" name="consultations">
        <div class="consult-toolbar">
          <p class="consult-summary" role="status">共 {{ consultations.length }} 个会话<template v-if="totalUnread">，<b>{{ unreadSessions }} 个会话有 {{ totalUnread }} 条未读消息</b></template><template v-else-if="consultations.length">，没有未读消息</template><span v-if="pollFailed" class="poll-warning">自动刷新失败，正在重试…</span></p>
          <el-button v-hasPermi="['lecheng:content:edit']" @click="openSupportSettings">客服设置</el-button>
        </div>
        <div class="consult-layout">
          <el-table v-loading="loading" :data="consultations" row-key="sessionId" :current-row-key="selectedSession" highlight-current-row :row-class-name="consultRowClass" @current-change="selectConsultation">
            <el-table-column label="会话" min-width="130"><template #default="{ row }">
              <div class="session-cell"><span>{{ row.sessionId?.slice(0, 12) }}…</span><span v-if="row.unreadCount > 0" class="unread-badge" :aria-label="'未读 ' + row.unreadCount + ' 条'">{{ unreadText(row.unreadCount) }}</span></div>
              <el-tag v-if="row.lastRole === 'user'" type="warning" size="small" effect="plain" class="pending-tag">待回复</el-tag>
            </template></el-table-column>
            <el-table-column label="最新消息" prop="lastMessage" min-width="180" show-overflow-tooltip />
            <el-table-column label="消息数" prop="messageCount" width="80" />
          </el-table>
          <div class="conversation-panel">
            <template v-if="selectedSession">
              <h3>会话记录</h3>
              <div ref="messageList" class="message-list"><div v-for="item in messages" :key="item.id" class="message" :class="item.role"><span>{{ item.role === 'user' ? '用户' : '客服' }}</span><p>{{ item.text }}</p></div></div>
              <div class="reply-row"><el-input ref="replyInput" v-model="replyText" type="textarea" :rows="3" maxlength="1000" show-word-limit :placeholder="canReply ? '输入回复内容，按 Enter 发送' : '当前账号没有回复权限'" aria-label="回复内容" @keydown="onReplyKeydown" /><el-button v-hasPermi="['lecheng:consult:reply']" type="primary" :loading="saving" :disabled="!replyText.trim()" @click="sendReply">回复</el-button></div>
              <p v-if="canReply" class="field-help">按 Enter 发送，Shift + Enter 换行</p>
            </template>
            <el-empty v-else description="选择一条咨询会话" />
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="预约申请" name="appointments">
        <el-alert title="此处是预约咨询意向记录，未与医院号源系统打通，请人工核实后联系用户。" type="info" show-icon :closable="false" class="table-tip" />
        <el-table v-loading="loading" :data="appointments" border>
          <el-table-column prop="id" label="编号" width="140" /><el-table-column prop="name" label="姓名" width="110" />
          <el-table-column prop="phone" label="电话" width="145" /><el-table-column prop="hospitalName" label="医院" min-width="180" />
          <el-table-column prop="doctorName" label="医生" width="120" /><el-table-column prop="date" label="日期" width="120" />
          <el-table-column prop="slot" label="时段" width="140" /><el-table-column prop="status" label="状态" width="100" />
          <el-table-column label="处理" width="120" fixed="right"><template #default="{ row }"><el-button v-if="row.status === '待处理'" v-hasPermi="['lecheng:booking:edit']" link type="primary" @click="setAppointment(row, '已联系')">标记已联系</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="用户反馈" name="feedback">
        <el-table v-loading="loading" :data="feedback" border>
          <el-table-column prop="id" label="编号" width="100" /><el-table-column prop="text" label="内容" min-width="350" />
          <el-table-column prop="status" label="状态" width="110" />
          <el-table-column label="处理" width="150" fixed="right"><template #default="{ row }"><el-button v-if="row.status === '待处理'" v-hasPermi="['lecheng:feedback:edit']" link type="primary" @click="setFeedback(row, '已处理')">标记已处理</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="客服设置" name="support">
        <el-button v-if="menuSection && menuSection.tab !== 'support'" text class="back-button" @click="leaveSupport">← 返回{{ menuSection.title }}</el-button>
        <SupportSettings v-if="active === 'support'" ref="supportRef" />
      </el-tab-pane>
    </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import auth from '@/plugins/auth'
import { listContent, deleteContent, listConsultations, listMessages, replyConsultation, markConsultationRead, listAppointments, updateAppointment, listFeedback, updateFeedback } from '@/api/lecheng'
import { lechengUnread, refreshLechengUnread, unreadText } from '@/utils/lecheng-unread'

import ContentEditor from './ContentEditor.vue'
import SupportSettings from './SupportSettings.vue'
import { sections, belongsToSection, titleKey, itemLabel } from './content-model.mjs'

const active = ref('content')
const kind = ref('hospital')

// 左侧菜单每一项对应地址最后一段（如 /lecheng/hospital），据此直接打开对应栏目；旧地址 /lecheng 仍显示原来的选项卡
const MENU_SECTIONS = {
  hospital: { tab: 'content', kind: 'hospital', title: '医院管理', hint: '小程序首页与查询里的医院介绍' },
  project: { tab: 'content', kind: 'project', title: '批复项目', hint: '查询页“批复项目”分类的内容' },
  medicine: { tab: 'content', kind: 'medicine', title: '特许药械', hint: '查询页“特许药械”分类的内容' },
  wellness: { tab: 'content', kind: 'wellness', title: '亚健康项目', hint: '查询页“亚健康项目”分类的内容' },
  news: { tab: 'content', kind: 'news', title: '乐城动态', hint: '首页“乐城介绍 → 乐城动态”与动态页的资讯' },
  policy: { tab: 'content', kind: 'policy', title: '国家政策', hint: '首页“乐城介绍 → 国家政策”的政策文件' },
  about: { tab: 'content', kind: 'about', title: '了解乐城', hint: '首页“乐城介绍 → 了解乐城”的图文介绍' },
  doctor: { tab: 'content', kind: 'doctor', title: '医生管理', hint: '科室与预约页面里的医生资料' },
  consultations: { tab: 'consultations', title: '客服咨询', hint: '查看小程序客服留言并回复' },
  'support-settings': { tab: 'support', title: '客服设置', hint: '小程序客服页的头像、开场白和在线时间' },
  appointments: { tab: 'appointments', title: '预约申请', hint: '用户提交的预约咨询申请' },
  feedback: { tab: 'feedback', title: '用户反馈', hint: '用户提交的意见反馈' }
}
// 旧地址 /lecheng?tab=consultations 可直接打开对应选项卡（新消息提醒在没有独立菜单时用到）
const LEGACY_TABS = ['content', 'consultations', 'appointments', 'feedback', 'support']
const SUPPORT_ROUTE = 'LechengSupportSettings'
const route = useRoute()
const router = useRouter()
const menuSection = computed(() => MENU_SECTIONS[String(route.path).split('/').filter(Boolean).pop()] || null)
// 页面标题：一般跟随菜单；从“客服咨询”临时切到“客服设置”时显示客服设置
const heading = computed(() => menuSection.value && menuSection.value.tab !== active.value ? Object.values(MENU_SECTIONS).find(s => s.tab === active.value) : menuSection.value)
function applyMenuSection() {
  const section = menuSection.value
  if (!section) {
    const tab = route.query.tab
    if (editorOpen.value || !LEGACY_TABS.includes(tab) || tab === active.value) return false
    active.value = tab
    return true
  }
  editorOpen.value = false
  active.value = section.tab
  if (section.kind) kind.value = section.kind
  return true
}
const contentKinds = sections
const apiKind = computed(() => sections.find(s => s.value === kind.value).kind)
const searchText = ref(''), statusFilter = ref('')
const visibleContent = computed(() => content.value.filter(row => belongsToSection(row, kind.value) && (!statusFilter.value || row.status === statusFilter.value) && String(row[titleKey(kind.value)] || '').toLowerCase().includes(searchText.value.trim().toLowerCase())))
const kindLabel = computed(() => itemLabel(kind.value))
const loading = ref(false)
const saving = ref(false)
const content = ref([])
const hospitalOptions = ref([])
const consultations = ref([])
const messages = ref([])
const selectedSession = ref('')
const replyText = ref('')
const appointments = ref([])
const feedback = ref([])
const editorOpen = ref(false)
const editorSource = ref({})
const supportRef = ref()
const canReply = auth.hasPermi('lecheng:consult:reply')
const totalUnread = computed(() => consultations.value.reduce((sum, row) => sum + (Number(row.unreadCount) > 0 ? Number(row.unreadCount) : 0), 0))
const unreadSessions = computed(() => consultations.value.filter(row => Number(row.unreadCount) > 0).length)

// 列表“分类”一栏：不同栏目显示不同的信息
function categoryText(row) {
  if (kind.value === 'hospital') return [row.type, ...(row.tags || []).slice(0, 2)].filter(Boolean).join(' · ')
  if (kind.value === 'doctor') return row.department
  if (kind.value === 'policy') return [row.date, ...(row.tags || [])].filter(Boolean).join(' · ')
  if (kind.value === 'about') return row.caption
  return row.category
}

async function loadHospitalOptions() { hospitalOptions.value = (await listContent('hospital')).data || [] }

let contentRequest = 0
async function loadContent() {
  const requestId = ++contentRequest
  loading.value = true
  try {
    const rows = (await listContent(apiKind.value)).data || []
    if (requestId === contentRequest) content.value = rows
  } finally { if (requestId === contentRequest) loading.value = false }
}
// silent：定时刷新用，不显示加载遮罩、出错不弹提示
async function refresh(options) {
  const silent = !!(options && options.silent === true)
  if (active.value === 'content') return loadContent()
  if (active.value === 'support') return
  if (!silent) loading.value = true
  try {
    if (active.value === 'consultations') await loadConsultations(silent)
    if (active.value === 'appointments') appointments.value = (await listAppointments()).data || []
    if (active.value === 'feedback') feedback.value = (await listFeedback()).data || []
  } finally { if (!silent) loading.value = false }
}
function createContent() { editorSource.value = { sortOrder: content.value.length }; editorOpen.value = true; loadHospitalOptions().catch(() => {}) }
function editContent(row) { editorSource.value = row; editorOpen.value = true; loadHospitalOptions().catch(() => {}) }
async function contentSaved() { editorOpen.value = false; await loadContent() }
async function removeContent(row) { const ok = await ElMessageBox.confirm(`确定删除“${row[titleKey(kind.value)]}”？`, '删除内容', { type: 'warning' }).then(() => true, () => false); if (!ok) return; await deleteContent(row.id); ElMessage.success('已删除'); await loadContent() }

// ---------- 客服咨询 ----------
let consultRequest = 0
async function loadConsultations(silent) {
  const requestId = ++consultRequest
  const rows = (await listConsultations(silent ? { silent: true } : undefined)).data || []
  if (requestId !== consultRequest) return
  consultations.value = rows
  const session = selectedSession.value
  if (session && !rows.some(row => row.sessionId === session)) { selectedSession.value = ''; messages.value = []; replyText.value = ''; ++messageRequest }
  else if (session) {
    await loadSelectedMessages(silent)
    // 会话开着时新到的用户消息直接算已读；浏览器切到别的标签页时先不算，回来后再标记
    const row = consultations.value.find(item => item.sessionId === session)
    if (row && row.unreadCount > 0 && !document.hidden && selectedSession.value === session) markSessionRead(session)
  }
  // 与左侧菜单的未读数不一致时（来了新消息），顺便刷新菜单上的数字
  if (totalUnread.value !== lechengUnread.count) refreshLechengUnread()
}
function consultRowClass({ row }) { return row.unreadCount > 0 ? 'has-unread' : '' }
// 标记会话已读：先把这一行的未读数清零，再通知后台并刷新左侧菜单的未读数
async function markSessionRead(session) {
  const row = consultations.value.find(item => item.sessionId === session)
  if (row) row.unreadCount = 0
  try { await markConsultationRead(session) } catch { return } // 旧版后台没有该接口时忽略
  refreshLechengUnread()
}
let messageRequest = 0
const messageList = ref()
const replyInput = ref()
let scrolledSession = ''
async function loadSelectedMessages(silent) {
  const session = selectedSession.value, requestId = ++messageRequest
  const rows = (await listMessages(session, silent ? { silent: true } : undefined)).data || []
  if (requestId !== messageRequest || selectedSession.value !== session) return
  const el = messageList.value
  const nearBottom = !!el && el.scrollHeight - el.scrollTop - el.clientHeight < 40
  const grew = rows.length > messages.value.length
  messages.value = rows
  // 刚打开会话，或有新消息且原本停在底部时，滚到最新一条
  if (scrolledSession !== session || (grew && nearBottom)) {
    scrolledSession = session
    await nextTick()
    if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
  }
}
// 选中会话、发送回复后，光标留在回复框里，可以直接继续输入
function focusReply() { nextTick(() => { if (replyInput.value) replyInput.value.focus() }) }
async function selectConsultation(row) {
  if (!row || row.sessionId === selectedSession.value) return
  const session = row.sessionId
  selectedSession.value = session; messages.value = []; replyText.value = ''
  focusReply()
  try { await loadSelectedMessages() } catch { return }
  if (selectedSession.value === session) markSessionRead(session)
}
async function sendReply() {
  const text = replyText.value.trim(), session = selectedSession.value
  if (!session || !text || saving.value) return
  saving.value = true
  try {
    await replyConsultation(session, text)
    if (selectedSession.value === session) replyText.value = ''
    scrolledSession = '' // 发送后滚到最新
    await refresh(); ElMessage.success('回复已发送')
  } catch { /* 接口错误由请求层弹出提示；保留回复内容 */ }
  finally { saving.value = false; focusReply() }
}
// 回复框快捷键：Enter 发送；Shift + Enter（或 Ctrl / Alt / Command + Enter）换行；输入法选字时按回车不发送
function onReplyKeydown(event) {
  if (event.key !== 'Enter' && event.keyCode !== 13) return
  if (event.isComposing || event.keyCode === 229) return
  if (event.shiftKey || !canReply) return // Shift + Enter 由浏览器自己换行
  event.preventDefault()
  if (event.ctrlKey || event.altKey || event.metaKey) insertNewline(event.target)
  else sendReply()
}
function insertNewline(el) {
  const value = replyText.value
  const start = typeof el.selectionStart === 'number' ? el.selectionStart : value.length
  const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : start
  if (value.length - (end - start) >= 1000) return
  replyText.value = value.slice(0, start) + '\n' + value.slice(end)
  nextTick(() => { el.selectionStart = el.selectionEnd = start + 1 })
}
// “客服设置”按钮：有独立菜单时进菜单，否则在当前页切换到客服设置
function openSupportSettings() {
  if (router.hasRoute(SUPPORT_ROUTE)) router.push({ name: SUPPORT_ROUTE })
  else active.value = 'support'
}
async function leaveSupport() {
  if (supportRef.value && !await supportRef.value.canLeave()) return
  active.value = menuSection.value.tab
  refresh()
}
// 点选项卡离开“客服设置”时，有未保存的修改先确认（代码切换选项卡时 active 已是新值，不拦）
function beforeTabLeave(name, oldName) {
  if (oldName !== 'support' || name === active.value || !supportRef.value) return true
  return supportRef.value.canLeave()
}

async function setAppointment(row, status) { await updateAppointment(Number(row.id.slice(2)), status); ElMessage.success('预约 ' + row.id + ' 已标记为' + status); await refresh() }
async function setFeedback(row, status) { await updateFeedback(row.id, status); ElMessage.success('反馈 ' + row.id + ' 已标记为' + status); await refresh() }

// 客服咨询打开时每 4 秒自动刷新；浏览器切到别的标签页时暂停，切回来马上刷新
const CONSULT_POLL_INTERVAL = 4000
const pollFailed = ref(false)
let consultationPoller, polling = false, pollFailures = 0
async function pollConsultations() {
  if (active.value !== 'consultations' || editorOpen.value || document.hidden || loading.value || saving.value || polling) return
  polling = true
  try { await refresh({ silent: true }); pollFailures = 0; pollFailed.value = false }
  catch { pollFailed.value = ++pollFailures >= 2 }
  finally { polling = false }
}
function onVisibilityChange() { if (!document.hidden) pollConsultations() }
watch(() => route.fullPath, () => { if (applyMenuSection()) refresh() })
onMounted(() => {
  applyMenuSection()
  refresh()
  consultationPoller = setInterval(pollConsultations, CONSULT_POLL_INTERVAL)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onUnmounted(() => {
  clearInterval(consultationPoller)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.lecheng-console { color: #22334a; }
.menu-mode :deep(.el-tabs__header) { display: none; }
.page-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.page-heading h2 { margin: 0 0 5px; font-size: 23px; }
.page-heading p { margin: 0; color: #7b8794; }
.toolbar { display: flex; justify-content: space-between; margin: 12px 0 20px; }
.toolbar > * + * { margin-left: 16px; }
.content-filters { display:flex; align-items:center; margin-bottom:6px; flex-wrap:wrap; }
.content-filters > * { margin: 0 12px 12px 0; }
.content-filters .el-input { width:280px; }.content-filters .el-select { width:160px; }.content-filters span { font-size:13px; color:#63758a; }
.list-thumbnail { width:68px; height:48px; border-radius:5px; }.muted-label { color:#8393a3; font-size:12px; }
.table-tip { margin-bottom: 18px; }
/* 未读数红色角标（与左侧菜单一致） */
.unread-badge { display: inline-block; box-sizing: border-box; min-width: 18px; height: 18px; margin-left: 6px; padding: 0 5px; border-radius: 9px; background: var(--el-color-danger, #f56c6c); color: #fff; font-size: 12px; font-weight: 600; line-height: 18px; text-align: center; vertical-align: middle; }
.heading-badge { margin-left: 10px; vertical-align: 3px; }
.consult-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; margin: 4px 0 14px; }
.consult-summary { margin: 0 12px 0 0; font-size: 13px; color: #63758a; }
.consult-summary b { color: #c45656; font-weight: 600; }
.poll-warning { margin-left: 12px; color: #b26a00; }
.consult-layout { display: grid; grid-template-columns: minmax(320px, 42%) 1fr; gap: 18px; min-height: 500px; }
.consult-layout :deep(.has-unread td) { font-weight: 600; }
.session-cell { white-space: nowrap; }
.pending-tag { margin-top: 4px; }
.conversation-panel { display: flex; flex-direction: column; min-height: 500px; border: 1px solid #e8edf2; border-radius: 8px; padding: 18px; }
.conversation-panel h3 { margin: 0 0 12px; }
.message-list { flex: 1; overflow-y: auto; max-height: max(240px, calc(100vh - 400px)); background: #f5f7fa; padding: 16px; }
.message { max-width: 78%; margin-bottom: 14px; }
.message.assistant { margin-left: auto; text-align: right; }
.message span { font-size: 12px; color: #7e8b9b; }
.message p { text-align: left; margin: 5px 0 0; padding: 11px 14px; background: white; border-radius: 8px; white-space: pre-wrap; line-height: 1.5; }
.message.assistant p { background: #d9edff; }
.reply-row { display: flex; align-items: flex-end; margin-top: 14px; }
.reply-row > * + * { margin-left: 12px; }
.field-help { margin-top: 5px; margin-bottom: 0; color: #8291a1; font-size: 12px; }
.back-button { margin: 0 0 12px -12px; }
@media (max-width: 900px) { .consult-layout { grid-template-columns: 1fr; } .toolbar { flex-wrap: wrap; } }
</style>
