export const sections = [
  { value: 'hospital', label: '医院', kind: 'hospital' },
  { value: 'project', label: '批复项目', kind: 'project' },
  { value: 'medicine', label: '特许药械', kind: 'resource' },
  { value: 'wellness', label: '亚健康项目', kind: 'resource' },
  { value: 'news', label: '乐城动态', kind: 'news' },
  { value: 'doctor', label: '医生', kind: 'doctor' }
]
export const departments = ['内科', '外科', '消化内科', '心内科', '神经外科', '内分泌科', '血液科', '肾病学', '泌尿外科', '肿瘤科', '呼吸科', '神经内科', '心血管内科', '全科', '肝胆外科', '男科', '眼科', '骨科', '健康管理']
export const diseases = ['肿瘤癌症', '内分泌、营养和代谢疾病及免疫疾病', '血液和造血器官疾病', '循环系统疾病', '呼吸系统疾病', '消化系统疾病', '泌尿生殖系统疾病']
// 小程序“按科室”筛选能识别的名称（16 个固定科室及其别名，与小程序 data/search-filters.js 一致）
const filterableDepartments = new Set([...departments, '综合内科'])
export const isFilterableDepartment = value => !value || filterableDepartments.has(String(value).trim())
const clone = value => JSON.parse(JSON.stringify(value))
// 旧内核浏览器没有 crypto.randomUUID，退回随机字符串
export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10))
const array = value => Array.isArray(value) ? clone(value) : []
export function createForm(source = {}, section = 'hospital') {
  const form = clone(source)
  const textFields = ['name', 'title', 'coverImage', 'subtitle', 'type', 'address', 'phone', 'description', 'summary', 'category', 'date', 'hospitalId', 'department', 'intro', 'spec', 'brand', 'approvalDate', 'approvalRegion', 'manufacturer', 'aliases', 'indications', 'suitableFor', 'dosageForm', 'packaging', 'storage']
  textFields.forEach(key => { form[key] = source[key] || '' })
  ;['tags', 'departments', 'environmentImages', 'hospitalIds', 'services'].forEach(key => { form[key] = array(source[key]) })
  // Leave legacy disease associations untouched until the operator actually selects a category.
  form.diseaseCategories = source.diseaseCategories == null ? null : array(source.diseaseCategories)
  form.contentBlocks = Array.isArray(source.contentBlocks) ? clone(source.contentBlocks) : array(source.paragraphs).map(p => typeof p === 'string' ? { type: 'text', title: '', text: p } : { type: 'text', title: p.title || '', text: p.text || '' })
  form.published = source.status === '1'
  form.sortOrder = Number(source.sortOrder) || 0
  if (!source.id && section === 'news') form.date = new Date().toLocaleDateString('sv-SE')
  return form
}
export function serializeForm(form, source = {}, section, uuid = uid) {
  const kind = sections.find(s => s.value === section).kind
  const data = { ...clone(source), ...clone(form), id: source.id || `${kind}-${uuid()}`, kindCode: kind, contentVersion: 2, status: form.published ? '1' : '0' }
  delete data.published
  if (data.diseaseCategories === null) delete data.diseaseCategories
  data.name = data.name.trim(); data.title = data.title.trim()
  // 分类、科室、类型去掉首尾空格，否则小程序按科室筛选会对不上
  ;['category', 'department', 'type'].forEach(key => { if (typeof data[key] === 'string') data[key] = data[key].trim() })
  if (Array.isArray(data.departments)) data.departments = data.departments.map(d => String(d).trim()).filter(Boolean)
  data.contentBlocks = data.contentBlocks.filter(b => b.type === 'image' ? b.url : b.text?.trim() || b.title?.trim())
  if (section === 'news') data.paragraphs = data.contentBlocks.filter(b => b.type === 'text').map(b => ({ title: b.title, text: b.text }))
  // 动态没填列表摘要时，自动取正文第一段前 60 字（小程序动态列表会显示它，空着会出现乱码）
  if (section === 'news' && !String(data.summary || '').trim()) {
    const first = data.contentBlocks.find(b => b.type === 'text' && b.text?.trim())
    data.summary = first ? first.text.replace(/\s+/g, ' ').trim().slice(0, 60) : ''
  }
  // 医生没填科室时不发送空值，让后端使用默认的“待更新”
  if (section === 'doctor' && !String(data.department || '').trim()) delete data.department
  if (section === 'medicine' || section === 'wellness') data.kind = section === 'medicine' ? '药品' : '器械'
  if (section === 'project') data.kind = '批复项目'
  if (section === 'hospital') data.type ||= '医院'
  // Resource filtering uses category, while hospitals and projects use departments.
  if (kind === 'resource') delete data.departments
  return data
}
export function belongsToSection(item, section) {
  return section === 'medicine' ? item.kind === '药品' : section === 'wellness' ? item.kind === '器械' : true
}
