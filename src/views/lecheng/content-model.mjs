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
const clone = value => JSON.parse(JSON.stringify(value))
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
export function serializeForm(form, source = {}, section, uuid = () => crypto.randomUUID()) {
  const kind = sections.find(s => s.value === section).kind
  const data = { ...clone(source), ...clone(form), id: source.id || `${kind}-${uuid()}`, kindCode: kind, contentVersion: 2, status: form.published ? '1' : '0' }
  delete data.published
  if (data.diseaseCategories === null) delete data.diseaseCategories
  data.name = data.name.trim(); data.title = data.title.trim()
  data.contentBlocks = data.contentBlocks.filter(b => b.type === 'image' ? b.url : b.text?.trim() || b.title?.trim())
  if (section === 'news') data.paragraphs = data.contentBlocks.filter(b => b.type === 'text').map(b => ({ title: b.title, text: b.text }))
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
