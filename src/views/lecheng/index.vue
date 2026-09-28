<template>
  <div class="app-container lecheng-console">
    <ContentEditor v-if="editorOpen" :source="editorSource" :section="kind" :hospitals="hospitalOptions" @close="editorOpen = false" @saved="contentSaved" />
    <template v-else>
    <div class="page-heading">
      <div><h2>乐城运营</h2><p>管理小程序里的图片、文字和客户咨询</p></div>
      <el-button @click="refresh">刷新当前列表</el-button>
    </div>
    <el-tabs v-model="active" @tab-change="refresh">
      <el-tab-pane label="内容管理" name="content">
        <div class="toolbar">
          <el-segmented v-model="kind" :options="contentKinds" @change="loadContent" />
          <el-button v-hasPermi="['lecheng:content:edit']" type="primary" :disabled="loading" @click="createContent">添加{{ kindLabel }}</el-button>
        </div>
        <div class="content-filters"><el-input v-model="searchText" clearable placeholder="输入名称查找内容" aria-label="查找内容" /><el-select v-model="statusFilter" placeholder="全部状态" aria-label="展示状态"><el-option label="全部状态" value="" /><el-option label="正在展示" value="1" /><el-option label="未展示 / 草稿" value="0" /></el-select><span>共 {{ visibleContent.length }} 条内容</span></div>
        <el-table v-loading="loading" :data="visibleContent" empty-text="这里还没有内容，点击上方按钮添加。">
          <el-table-column label="封面" width="100"><template #default="{ row }"><el-image v-if="row.coverImage" :src="row.coverImage" fit="cover" class="list-thumbnail" /><span v-else class="muted-label">示意图片</span></template></el-table-column>
          <el-table-column label="名称" min-width="220"><template #default="{ row }">{{ kind === 'news' ? row.title : row.name }}</template></el-table-column>
          <el-table-column label="分类" prop="category" min-width="120" />
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? '展示中' : '未展示' }}</el-tag></template></el-table-column>
          <el-table-column label="排序" prop="sortOrder" width="85" />
          <el-table-column label="操作" width="180" fixed="right"><template #default="{ row }">
            <el-button v-hasPermi="['lecheng:content:edit']" link type="primary" @click="editContent(row)">编辑</el-button>
            <el-button v-hasPermi="['lecheng:content:edit']" link type="danger" @click="removeContent(row)">删除</el-button>
          </template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="客服咨询" name="consultations">
        <div class="consult-layout">
          <el-table v-loading="loading" :data="consultations" highlight-current-row @current-change="selectConsultation">
            <el-table-column label="会话" min-width="120"><template #default="{ row }">{{ row.sessionId?.slice(0, 12) }}…</template></el-table-column>
            <el-table-column label="最新消息" prop="lastMessage" min-width="180" show-overflow-tooltip />
            <el-table-column label="消息数" prop="messageCount" width="80" />
          </el-table>
          <div class="conversation-panel">
            <template v-if="selectedSession">
              <h3>会话记录</h3>
              <div class="message-list"><div v-for="item in messages" :key="item.id" class="message" :class="item.role"><span>{{ item.role === 'user' ? '用户' : '客服' }}</span><p>{{ item.text }}</p></div></div>
              <div class="reply-row"><el-input v-model="replyText" type="textarea" :rows="2" maxlength="1000" show-word-limit placeholder="输入回复" /><el-button v-hasPermi="['lecheng:consult:reply']" type="primary" :loading="saving" @click="sendReply">回复</el-button></div>
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
          <el-table-column label="处理" width="165"><template #default="{ row }"><el-button v-if="row.status === '待处理'" v-hasPermi="['lecheng:booking:edit']" link type="primary" @click="setAppointment(row, '已联系')">标记已联系</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="用户反馈" name="feedback">
        <el-table v-loading="loading" :data="feedback" border>
          <el-table-column prop="id" label="编号" width="100" /><el-table-column prop="text" label="内容" min-width="350" />
          <el-table-column prop="status" label="状态" width="110" />
          <el-table-column label="处理" width="150"><template #default="{ row }"><el-button v-if="row.status === '待处理'" v-hasPermi="['lecheng:feedback:edit']" link type="primary" @click="setFeedback(row, '已处理')">标记已处理</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listContent, deleteContent, listConsultations, listMessages, replyConsultation, listAppointments, updateAppointment, listFeedback, updateFeedback } from '@/api/lecheng'

import ContentEditor from './ContentEditor.vue'
import { sections, belongsToSection } from './content-model.mjs'

const active = ref('content')
const kind = ref('hospital')
const contentKinds = sections
const apiKind = computed(() => sections.find(s => s.value === kind.value).kind)
const searchText = ref(''), statusFilter = ref('')
const visibleContent = computed(() => content.value.filter(row => belongsToSection(row, kind.value) && (!statusFilter.value || row.status === statusFilter.value) && (kind.value === 'news' ? row.title : row.name)?.toLowerCase().includes(searchText.value.trim().toLowerCase())))
const kindLabel = computed(() => contentKinds.find(item => item.value === kind.value)?.label || '')
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
async function refresh() {
  if (active.value === 'content') return loadContent()
  loading.value = true
  try {
    if (active.value === 'consultations') { consultations.value = (await listConsultations()).data || []; if (selectedSession.value) messages.value = (await listMessages(selectedSession.value)).data || [] }
    if (active.value === 'appointments') appointments.value = (await listAppointments()).data || []
    if (active.value === 'feedback') feedback.value = (await listFeedback()).data || []
  } finally { loading.value = false }
}
function createContent() { editorSource.value = { sortOrder: content.value.length }; editorOpen.value = true; loadHospitalOptions().catch(() => {}) }
function editContent(row) { editorSource.value = row; editorOpen.value = true; loadHospitalOptions().catch(() => {}) }
async function contentSaved() { editorOpen.value = false; await loadContent() }
async function removeContent(row) { await ElMessageBox.confirm(`确定删除“${kind.value === 'news' ? row.title : row.name}”？`, '删除内容', { type: 'warning' }); await deleteContent(row.id); ElMessage.success('已删除'); await loadContent() }
async function selectConsultation(row) { selectedSession.value = row?.sessionId || ''; messages.value = selectedSession.value ? (await listMessages(selectedSession.value)).data || [] : [] }
async function sendReply() { const text = replyText.value.trim(); if (!selectedSession.value || !text) return; saving.value = true; try { await replyConsultation(selectedSession.value, text); replyText.value = ''; await refresh(); ElMessage.success('回复已发送') } finally { saving.value = false } }
async function setAppointment(row, status) { await updateAppointment(Number(row.id.slice(2)), status); await refresh() }
async function setFeedback(row, status) { await updateFeedback(row.id, status); await refresh() }
onMounted(refresh)
</script>

<style scoped>
.lecheng-console { color: #22334a; }
.page-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.page-heading h2 { margin: 0 0 5px; font-size: 23px; }
.page-heading p { margin: 0; color: #7b8794; }
.toolbar { display: flex; justify-content: space-between; gap: 16px; margin: 12px 0 20px; }
.content-filters { display:flex; align-items:center; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
.content-filters .el-input { width:280px; }.content-filters .el-select { width:160px; }.content-filters span { font-size:13px; color:#63758a; }
.list-thumbnail { width:68px; height:48px; border-radius:5px; }.muted-label { color:#8393a3; font-size:12px; }
.table-tip { margin-bottom: 18px; }
.consult-layout { display: grid; grid-template-columns: minmax(320px, 42%) 1fr; gap: 18px; min-height: 500px; }
.conversation-panel { display: flex; flex-direction: column; min-height: 500px; border: 1px solid #e8edf2; border-radius: 8px; padding: 18px; }
.conversation-panel h3 { margin: 0 0 12px; }
.message-list { flex: 1; overflow-y: auto; max-height: 520px; background: #f5f7fa; padding: 16px; }
.message { max-width: 78%; margin-bottom: 14px; }
.message.assistant { margin-left: auto; text-align: right; }
.message span { font-size: 12px; color: #7e8b9b; }
.message p { text-align: left; margin: 5px 0 0; padding: 11px 14px; background: white; border-radius: 8px; white-space: pre-wrap; line-height: 1.5; }
.message.assistant p { background: #d9edff; }
.reply-row { display: flex; align-items: flex-end; gap: 12px; margin-top: 14px; }
.field-help { margin-top: 5px; color: #8291a1; font-size: 12px; }
@media (max-width: 900px) { .consult-layout { grid-template-columns: 1fr; } .toolbar { flex-wrap: wrap; } }
</style>
