<template>
  <div class="content-editor">
    <header class="editor-header">
      <div><el-button text @click="close">← 返回列表</el-button><h2>{{ source.id ? '编辑' : '添加' }}{{ sectionInfo.label }}</h2><p>填好文字、上传图片，保存后即可在小程序中展示。</p></div>
      <el-button @click="previewOpen = true">预览内容</el-button>
    </header>
    <div class="editor-layout">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="editor-form" :disabled="saving">
        <section>
          <h3>基本信息</h3>
          <el-form-item :label="nameLabel" :prop="section === 'news' ? 'title' : 'name'"><el-input v-model="form[section === 'news' ? 'title' : 'name']" maxlength="200" show-word-limit :placeholder="'请输入' + nameLabel" /></el-form-item>
          <el-form-item :label="section === 'doctor' ? '医生照片' : '封面图片'"><ContentImages :model-value="form.coverImage ? [form.coverImage] : []" :disabled="saving" @update:model-value="form.coverImage = $event[0] || ''" @busy="trackUpload" /><p v-if="source.id && !form.coverImage" class="help">未上传时沿用原来的示意图片。</p></el-form-item>
          <template v-if="section === 'hospital'">
            <div class="field-pair"><el-form-item label="医院类型"><el-select v-model="form.type" filterable allow-create default-first-option placeholder="选择或输入医院类型"><el-option v-for="type in ['综合医院', '专科医院', '健康管理中心']" :key="type" :label="type" :value="type" /></el-select></el-form-item><el-form-item label="联系电话"><el-input v-model="form.phone" maxlength="60" placeholder="例如：0898-12345678" /></el-form-item></div>
            <el-form-item label="医院地址"><el-input v-model="form.address" maxlength="300" placeholder="填写医院的详细地址" /></el-form-item>
            <el-form-item label="一句话介绍"><el-input v-model="form.subtitle" maxlength="100" placeholder="例如：多学科诊疗 · 全程服务" /></el-form-item>
            <el-form-item label="特色标签"><el-select v-model="form.tags" multiple filterable allow-create default-first-option :multiple-limit="6" placeholder="输入一个标签后按回车，可添加多个"><el-option v-for="tag in ['综合医疗', '国际诊疗', '专科诊疗', '健康管理', '医学检查']" :key="tag" :label="tag" :value="tag" /></el-select></el-form-item>
          </template>
          <template v-if="section === 'news'">
            <div class="field-pair"><el-form-item label="资讯分类"><el-select v-model="form.category" filterable allow-create default-first-option placeholder="选择或输入分类"><el-option v-for="category in ['园区生活', '就医指南', '医疗资讯', '乐城动态']" :key="category" :label="category" :value="category" /></el-select></el-form-item><el-form-item label="发布日期"><el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" /></el-form-item></div>
          </template>
          <template v-if="section === 'doctor'">
            <el-form-item label="所属医院" prop="hospitalId"><el-select v-model="form.hospitalId" filterable placeholder="选择所属医院"><el-option v-for="hospital in hospitals" :key="hospital.id" :label="hospital.name + (hospital.status !== '1' ? '（未展示）' : '')" :value="hospital.id" :disabled="hospital.status !== '1'" /></el-select></el-form-item>
            <div class="field-pair"><el-form-item label="所属科室"><el-select v-model="form.department" filterable allow-create default-first-option placeholder="选择或输入科室"><el-option v-for="d in departments" :key="d" :label="d" :value="d" /></el-select></el-form-item><el-form-item label="职称"><el-input v-model="form.title" maxlength="100" placeholder="例如：主任医师" /></el-form-item></div>
            <el-form-item label="医生介绍"><el-input v-model="form.intro" type="textarea" :rows="5" maxlength="10000" show-word-limit placeholder="填写医生简介、专业方向等" /></el-form-item>
            <el-form-item label="服务方向"><el-select v-model="form.services" multiple filterable allow-create default-first-option placeholder="输入服务方向后按回车" /></el-form-item>
          </template>
          <el-form-item v-if="section !== 'doctor'" :label="section === 'hospital' ? '医院简介' : '列表摘要'"><el-input v-model="form[section === 'hospital' ? 'description' : 'summary']" type="textarea" :rows="3" :maxlength="section === 'hospital' ? 10000 : 500" show-word-limit :placeholder="section === 'hospital' ? '用文字介绍医院的基本情况' : '简要介绍这条内容，显示在列表中'" /></el-form-item>
        </section>
        <section v-if="section !== 'news' && section !== 'doctor'">
          <h3>查询分类</h3><p class="section-help">选择后，用户可以在小程序中按科室、疾病找到这条内容。</p>
          <el-form-item v-if="section === 'hospital' || section === 'project'" label="所属科室"><el-select v-model="form.departments" multiple filterable allow-create default-first-option placeholder="可选择多个科室"><el-option v-for="d in departments" :key="d" :label="d" :value="d" /></el-select></el-form-item>
          <el-form-item v-if="section !== 'hospital'" class="category-field"><template #label>{{ section === 'project' ? '展示标签' : '所属科室' }}</template><el-select v-model="form.category" filterable allow-create default-first-option placeholder="选择或输入科室 / 标签"><el-option v-for="d in departments" :key="d" :label="d" :value="d" /></el-select></el-form-item>
          <el-form-item label="疾病分类（选填）"><el-select :model-value="form.diseaseCategories || []" multiple clearable placeholder="选择相关疾病分类" @update:model-value="form.diseaseCategories = $event"><el-option v-for="d in diseases" :key="d" :label="d" :value="d" /></el-select></el-form-item>
        </section>
        <section v-if="section !== 'doctor'">
          <h3>{{ section === 'news' ? '正文内容' : '详细介绍' }}</h3><p class="section-help">像编辑文章一样添加内容。文字、图片可以自由调整顺序。</p>
          <ContentBlocksEditor v-model="form.contentBlocks" @busy="trackUpload" />
        </section>
        <section v-if="section === 'hospital'">
          <h3>医院环境</h3><p class="section-help">可上传院区、诊室、设备等照片，显示为轮播图和相册。</p>
          <ContentImages v-model="form.environmentImages" :limit="12" :disabled="saving" @busy="trackUpload" />
        </section>
        <section v-if="isProject">
          <h3>落地医院</h3><p class="section-help">直接选择医院名称，用户可从详情页进入医院介绍。</p>
          <el-form-item label="选择落地医院"><el-select v-model="form.hospitalIds" multiple filterable placeholder="可选择多家医院"><el-option v-for="hospital in hospitals" :key="hospital.id" :label="hospital.name + (hospital.status !== '1' ? '（未展示）' : '')" :value="hospital.id" :disabled="hospital.status !== '1'" /></el-select></el-form-item>
          <el-collapse><el-collapse-item title="补充资料（选填）：获批信息、适用范围、规格等" name="details">
            <div class="field-pair"><el-form-item label="获批日期"><el-date-picker v-model="form.approvalDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" /></el-form-item><el-form-item label="获批地区 / 国家"><el-input v-model="form.approvalRegion" maxlength="100" /></el-form-item></div>
            <el-form-item label="生产企业"><el-input v-model="form.manufacturer" maxlength="200" /></el-form-item>
            <el-form-item label="别名"><el-input v-model="form.aliases" maxlength="200" /></el-form-item>
            <el-form-item label="适用范围"><el-input v-model="form.indications" type="textarea" :rows="3" maxlength="5000" /></el-form-item>
            <el-form-item label="适用人群"><el-input v-model="form.suitableFor" maxlength="500" /></el-form-item>
            <div class="field-pair"><el-form-item label="剂型"><el-input v-model="form.dosageForm" maxlength="200" /></el-form-item><el-form-item label="规格 / 项目说明"><el-input v-model="form.spec" maxlength="500" /></el-form-item></div>
            <div class="field-pair"><el-form-item label="包装规格"><el-input v-model="form.packaging" maxlength="200" /></el-form-item><el-form-item label="储存条件"><el-input v-model="form.storage" maxlength="300" /></el-form-item></div>
            <el-form-item label="资料来源"><el-input v-model="form.brand" maxlength="200" /></el-form-item>
          </el-collapse-item></el-collapse>
        </section>
      </el-form>
      <aside class="publish-settings">
        <h3>展示设置</h3>
        <el-switch v-model="form.published" active-text="在小程序展示" aria-label="在小程序展示" :disabled="saving" />
        <p>{{ form.published ? '保存后，用户重新打开小程序即可看到更新。' : '保存为草稿，暂不显示在小程序中。' }}</p>
        <label for="content-order">列表排序</label><el-input-number id="content-order" v-model="form.sortOrder" :min="0" :max="100000" :precision="0" :disabled="saving" /><p>数字越小越靠前。不需要调整时保持原值即可。</p>
        <div class="editing-guide"><strong>添加内容只需三步</strong><ol><li>填写名称和简介</li><li>上传图片、添加正文</li><li>开启展示并保存</li></ol></div>
      </aside>
    </div>
    <footer class="editor-footer"><span role="status">{{ uploading ? '图片正在上传，请稍候…' : dirty ? '有尚未保存的修改' : '可以开始编辑内容' }}</span><div><el-button :disabled="saving || uploading > 0" @click="close">取消</el-button><el-button type="primary" :loading="saving" :disabled="uploading > 0" @click="submit">{{ form.published ? '保存并展示' : '保存草稿' }}</el-button></div></footer>
    <el-drawer v-model="previewOpen" title="内容预览" size="420px" append-to-body>
      <div class="content-preview"><img v-if="form.coverImage" :src="form.coverImage" alt="封面图片" /><div v-else class="preview-placeholder">封面图片</div><h2>{{ form[section === 'news' ? 'title' : 'name'] || nameLabel }}</h2><p class="preview-meta">{{ form.date || form.subtitle || form.category }}</p><p>{{ form.description || form.summary || form.intro }}</p><template v-for="(block, i) in form.contentBlocks" :key="i"><template v-if="block.type === 'text'"><h3 v-if="block.title">{{ block.title }}</h3><p>{{ block.text }}</p></template><figure v-else-if="block.url"><img :src="block.url" :alt="block.caption || '正文图片'" /><figcaption>{{ block.caption }}</figcaption></figure></template><template v-if="form.environmentImages.length"><h3>医院环境</h3><div class="preview-gallery"><img v-for="url in form.environmentImages" :key="url" :src="url" alt="医院环境" /></div></template><template v-if="isProject && form.hospitalIds.length"><h3>落地医院</h3><p v-for="id in form.hospitalIds" :key="id">{{ hospitals.find(h => h.id === id)?.name }}</p></template><p class="preview-meta">此处用于核对图片和文字，实际排版以小程序为准。</p></div>
    </el-drawer>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { saveContent } from '@/api/lecheng'
import ContentImages from './ContentImages.vue'
import ContentBlocksEditor from './ContentBlocksEditor.vue'
import { createForm, serializeForm, sections, departments, diseases } from './content-model.mjs'
const props = defineProps({ source: { type: Object, default: () => ({}) }, section: String, hospitals: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'saved'])
const form = reactive(createForm(props.source, props.section)), baseline = JSON.stringify(form)
const formRef = ref(), saving = ref(false), uploading = ref(0), previewOpen = ref(false), finished = ref(false)
const dirty = computed(() => JSON.stringify(form) !== baseline)
const sectionInfo = computed(() => sections.find(s => s.value === props.section))
const isProject = computed(() => ['project', 'medicine', 'wellness'].includes(props.section))
const nameLabel = computed(() => props.section === 'news' ? '文章标题' : props.section === 'doctor' ? '医生姓名' : props.section === 'hospital' ? '医院名称' : props.section === 'medicine' ? '药械名称' : '项目名称')
const requiredName = { validator: (_, value, callback) => value?.trim() ? callback() : callback(new Error('请填写' + nameLabel.value)), trigger: 'blur' }
const rules = computed(() => ({ [props.section === 'news' ? 'title' : 'name']: [requiredName], hospitalId: [{ required: props.section === 'doctor', message: '请选择所属医院', trigger: 'change' }] }))
function trackUpload(value) { uploading.value += value ? 1 : -1 }
async function canLeave() {
  if (finished.value) return true
  if (saving.value || uploading.value) { ElMessage.info('请等待保存或图片上传完成'); return false }
  if (!dirty.value) return true
  try { await ElMessageBox.confirm('刚才的修改还没有保存，离开后将不会保留。', '离开编辑？', { confirmButtonText: '放弃修改并离开', cancelButtonText: '继续编辑', type: 'warning' }); return true } catch { return false }
}
async function close() { if (await canLeave()) emit('close') }
async function submit() {
  if (!await formRef.value.validate().catch(() => false)) { ElMessage.warning('请先填写标红的必填内容'); return }
  saving.value = true
  try {
    const data = serializeForm(form, props.source, props.section)
    if (JSON.stringify(data).length > 95000) { ElMessage.warning('这篇内容太长，请精简文字或拆分为多篇后保存。'); return }
    await saveContent(data); finished.value = true; ElMessage.success(form.published ? '已保存，小程序内容已更新' : '草稿已保存'); emit('saved')
  } catch { /* Request layer displays the error; keep the user's draft intact. */ }
  finally { saving.value = false }
}
function beforeUnload(event) { if (!finished.value && (dirty.value || uploading.value)) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
onBeforeRouteLeave(canLeave)
</script>
<style scoped>
.content-editor { max-width:1220px; margin:0 auto; padding-bottom:84px; }
.editor-header { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:28px; }
.editor-header .el-button.is-text { margin-left:-12px; }
.editor-header h2 { font-size:24px; margin:12px 0 8px; }
.editor-header p,.section-help { color:#667688; font-size:14px; line-height:1.6; margin:0; }
.editor-layout { display:grid; grid-template-columns:minmax(0,1fr) 250px; gap:48px; align-items:start; }
.editor-form section { padding-bottom:28px; margin-bottom:28px; border-bottom:1px solid #e3e9f0; }
h3 { margin:0 0 18px; font-size:17px; color:#253c52; }
.section-help { margin:-6px 0 20px; }
.field-pair { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.editor-form :deep(.el-select),.editor-form :deep(.el-date-editor) { width:100%; }
.editor-form :deep(.el-form-item__label) { font-weight:500; color:#34495e; }
.editor-form :deep(.el-form-item__content) { display:block; }
.help { font-size:12px; color:#667688; margin:6px 0 0; }
.publish-settings { position:sticky; top:88px; padding:22px; background:#f6f8fb; border-radius:8px; }
.publish-settings p { font-size:13px; line-height:1.7; color:#617185; margin:10px 0 24px; }
.publish-settings label { display:block; font-size:14px; margin-bottom:10px; }
.editing-guide { border-top:1px solid #dce4ed; padding-top:20px; font-size:13px; color:#526779; }
.editing-guide ol { padding-left:20px; line-height:2.2; margin-bottom:0; }
.editor-footer { position:sticky; bottom:0; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 0; background:#fff; border-top:1px solid #dce4ed; }
.editor-footer span { font-size:13px; color:#63758a; }
.content-preview { color:#253c52; line-height:1.8; overflow-wrap:anywhere; }
.content-preview img { width:100%; height:auto; border-radius:6px; }
.content-preview h2 { font-size:22px; }.content-preview h3 { margin:24px 0 10px; }.content-preview p { white-space:pre-wrap; }
.content-preview figure { margin:24px 0; }.content-preview figcaption,.preview-meta { color:#768696; font-size:12px; }
.preview-placeholder { background:#edf3f9; height:180px; display:grid; place-items:center; color:#8294a6; }
.preview-gallery { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
@media(max-width:1000px) { .editor-layout { grid-template-columns:minmax(0,1fr); gap:0; }.publish-settings { position:static; margin-bottom:24px; } }
@media(max-width:600px) { .field-pair { grid-template-columns:1fr; gap:0; }.editor-header { align-items:flex-start; }.editor-footer { flex-wrap:wrap; } }
</style>
