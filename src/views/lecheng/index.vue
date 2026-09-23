<template>
  <div class="app-container lecheng-console">
    <div class="page-heading">
      <div><h2>乐城运营</h2><p>小程序内容、咨询、预约申请与反馈</p></div>
      <el-button @click="refresh">刷新当前列表</el-button>
    </div>
    <el-tabs v-model="active" @tab-change="refresh">
      <el-tab-pane label="内容管理" name="content">
        <div class="toolbar">
          <el-segmented v-model="kind" :options="contentKinds" @change="loadContent" />
          <el-button v-hasPermi="['lecheng:content:edit']" type="primary" @click="createContent">新增内容</el-button>
        </div>
        <el-table v-loading="loading" :data="content" border>
          <el-table-column label="ID" prop="id" min-width="180" />
          <el-table-column label="名称" min-width="220"><template #default="{ row }">{{ row.title || row.name }}</template></el-table-column>
          <el-table-column label="分类" prop="category" min-width="120" />
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? '上架' : '下架' }}</el-tag></template></el-table-column>
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
    <el-dialog v-model="editorOpen" :title="editingExisting ? '编辑内容' : '新增内容'" width="760px" destroy-on-close>
      <el-form label-width="95px">
        <el-form-item label="分类"><el-input :model-value="kindLabel" disabled /></el-form-item>
        <el-form-item label="ID"><el-input v-model.trim="editor.id" :disabled="editingExisting" maxlength="80" /></el-form-item>
        <el-form-item label="名称"><el-input v-model.trim="editor.heading" maxlength="200" /></el-form-item>
        <el-form-item v-if="kind === 'resource'" label="展示栏目"><el-select v-model="editor.resourceKind" style="width: 100%"><el-option label="特许药械（药品）" value="药品" /><el-option label="亚健康项目（器械）" value="器械" /></el-select></el-form-item>
        <template v-if="kind === 'doctor'">
          <el-form-item label="所属医院"><el-select v-model="editor.hospitalId" filterable style="width: 100%" placeholder="选择已上架医院"><el-option v-for="hospital in hospitalOptions" :key="hospital.id" :label="hospital.name" :value="hospital.id" /></el-select></el-form-item>
          <el-form-item label="所属科室"><el-input v-model.trim="editor.department" maxlength="50" placeholder="例如：综合内科" /></el-form-item>
        </template>
        <el-form-item label="展示状态"><el-switch v-model="editor.published" active-text="上架" inactive-text="下架" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="editor.sortOrder" :min="0" :max="100000" /></el-form-item>
        <el-form-item label="完整内容"><el-input v-model="editor.json" type="textarea" :rows="15" spellcheck="false" /><div class="field-help">JSON 对应小程序展示字段；保存时 ID、名称、状态和排序以表单上方为准。</div></el-form-item>
      </el-form>
      <template #footer><el-button @click="editorOpen = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitContent">保存并同步小程序</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listContent, saveContent, deleteContent, listConsultations, listMessages, replyConsultation, listAppointments, updateAppointment, listFeedback, updateFeedback } from '@/api/lecheng'

const active = ref('content')
const kind = ref('hospital')
const contentKinds = [{ label: '医院', value: 'hospital' }, { label: '批复项目', value: 'project' }, { label: '特许药械 / 亚健康项目', value: 'resource' }, { label: '乐城动态', value: 'news' }, { label: '医生', value: 'doctor' }]
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
const editingExisting = ref(false)
const editor = ref({ id: '', heading: '', published: true, sortOrder: 0, resourceKind: '药品', hospitalId: '', department: '', json: '{}' })

async function loadHospitalOptions() { hospitalOptions.value = ((await listContent('hospital')).data || []).filter(item => item.status === '1') }

async function loadContent() { loading.value = true; try { content.value = (await listContent(kind.value)).data || [] } finally { loading.value = false } }
async function refresh() {
  loading.value = true
  try {
    if (active.value === 'content') content.value = (await listContent(kind.value)).data || []
    if (active.value === 'consultations') { consultations.value = (await listConsultations()).data || []; if (selectedSession.value) messages.value = (await listMessages(selectedSession.value)).data || [] }
    if (active.value === 'appointments') appointments.value = (await listAppointments()).data || []
    if (active.value === 'feedback') feedback.value = (await listFeedback()).data || []
  } finally { loading.value = false }
}
function createContent() { editingExisting.value = false; editor.value = { id: '', heading: '', published: true, sortOrder: content.value.length, resourceKind: '药品', hospitalId: '', department: '', json: '{}' }; if (kind.value === 'doctor') loadHospitalOptions(); editorOpen.value = true }
function editContent(row) { editingExisting.value = true; editor.value = { id: row.id, heading: row.title || row.name, published: row.status === '1', sortOrder: Number(row.sortOrder) || 0, resourceKind: row.kind || '药品', hospitalId: row.hospitalId || '', department: row.department || '', json: JSON.stringify(row, null, 2) }; if (kind.value === 'doctor') loadHospitalOptions(); editorOpen.value = true }
async function submitContent() {
  let data
  try { data = JSON.parse(editor.value.json); if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('JSON 须为对象') }
  catch (error) { ElMessage.error(`内容 JSON 无效：${error.message}`); return }
  if (!editor.value.id || !editor.value.heading) { ElMessage.warning('请填写 ID 和名称'); return }
  data.id = editor.value.id; data.kindCode = kind.value; data.status = editor.value.published ? '1' : '0'; data.sortOrder = editor.value.sortOrder
  if (kind.value === 'news') data.title = editor.value.heading; else data.name = editor.value.heading
  if (kind.value === 'resource') data.kind = editor.value.resourceKind
  if (kind.value === 'doctor') {
    if (!editor.value.hospitalId) { ElMessage.warning('请选择所属医院'); return }
    data.hospitalId = editor.value.hospitalId
    data.department = editor.value.department || '待更新'
  }
  saving.value = true
  try { await saveContent(data); editorOpen.value = false; ElMessage.success('已保存'); await loadContent() } finally { saving.value = false }
}
async function removeContent(row) { await ElMessageBox.confirm(`确定删除“${row.title || row.name}”？`, '删除内容', { type: 'warning' }); await deleteContent(row.id); ElMessage.success('已删除'); await loadContent() }
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
