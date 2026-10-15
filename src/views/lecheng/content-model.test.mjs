import test from 'node:test'
import assert from 'node:assert/strict'
import { createForm, serializeForm, belongsToSection, sections, titleKey, itemLabel, isWebUrl } from './content-model.mjs'

test('editing legacy content preserves existing links and unknown fields', () => {
  const source = { id: 'international', name: '医院', status: '1', features: [{ name: '眼科' }], scene: 2, customField: 'keep', tags: ['国际医疗'], departments: ['眼科'] }
  const form = createForm(source, 'hospital')
  form.description = '新的医院介绍'
  const saved = serializeForm(form, source, 'hospital')
  assert.equal(saved.id, source.id)
  assert.deepEqual(saved.features, source.features)
  assert.equal(saved.customField, 'keep')
  assert.equal(saved.scene, 2)
  assert.equal(saved.status, '1')
  assert.equal(saved.description, '新的医院介绍')
  assert.equal(saved.diseaseCategories, undefined)
  assert.equal(source.description, undefined)
})
test('new content is a draft with automatic ID and correct resource section', () => {
  for (const section of ['medicine', 'wellness']) {
    const form = createForm({}, section); form.name = ' 新资料 '; form.category = '内科'
    const saved = serializeForm(form, {}, section, () => 'unique')
    assert.equal(saved.id, 'resource-unique')
    assert.equal(saved.name, '新资料')
    assert.equal(saved.status, '0')
    assert.equal(saved.departments, undefined)
    assert.equal(belongsToSection(saved, section), true)
    assert.equal(belongsToSection(saved, section === 'medicine' ? 'wellness' : 'medicine'), false)
  }
})
test('article migration and mixed image/text roundtrip retain order', () => {
  const source = { id: 'news-old', title: '旧文章', paragraphs: ['旧正文', { title: '标题', text: '第二段' }] }
  const form = createForm(source, 'news')
  form.contentBlocks.splice(1, 0, { type: 'image', url: 'https://example.com/photo.jpg', caption: '照片说明' })
  form.contentBlocks.push({ type: 'text', title: '', text: '' }, { type: 'image', url: '' })
  const saved = serializeForm(form, source, 'news')
  assert.equal(saved.contentBlocks.length, 3)
  assert.equal(saved.contentBlocks[1].type, 'image')
  assert.deepEqual(saved.paragraphs, [{ title: '', text: '旧正文' }, { title: '标题', text: '第二段' }])
  assert.deepEqual(createForm(saved, 'news').contentBlocks, saved.contentBlocks)
})
test('policy and about sections use their own kinds and the title field', () => {
  assert.deepEqual(sections.find(s => s.value === 'policy'), { value: 'policy', label: '国家政策', kind: 'policy' })
  assert.deepEqual(sections.find(s => s.value === 'about'), { value: 'about', label: '了解乐城', kind: 'about' })
  for (const section of ['news', 'policy', 'about']) assert.equal(titleKey(section), 'title')
  for (const section of ['hospital', 'project', 'medicine', 'wellness', 'doctor']) assert.equal(titleKey(section), 'name')
  assert.equal(itemLabel('policy'), '政策文件')
  assert.equal(itemLabel('hospital'), '医院')
})
test('policy roundtrip keeps fields, trims text, fills summary and string paragraphs', () => {
  const source = { id: 'policy-device-2018', kindCode: 'policy', title: '临床急需医疗器械政策', date: '2018-04-02', scene: 2, tags: ['医疗器械'], status: '1', sortOrder: 1, paragraphs: ['第一段', '第二段'] }
  const form = createForm(source, 'policy')
  assert.equal(form.date, '2018-04-02')
  assert.deepEqual(form.contentBlocks, [{ type: 'text', title: '', text: '第一段' }, { type: 'text', title: '', text: '第二段' }])
  form.title = ' 新标题 '; form.fullTitle = ' 完整标题 '; form.sourceName = ' 国务院 '; form.sourceUrl = ' https://www.gov.cn/ '
  form.contentBlocks.push({ type: 'image', url: 'https://example.com/a.jpg', caption: '' }, { type: 'text', title: '只有小标题', text: '' })
  const saved = serializeForm(form, source, 'policy')
  assert.equal(saved.id, 'policy-device-2018')
  assert.equal(saved.kindCode, 'policy')
  assert.equal(saved.title, '新标题')
  assert.equal(saved.fullTitle, '完整标题')
  assert.equal(saved.sourceName, '国务院')
  assert.equal(saved.sourceUrl, 'https://www.gov.cn/')
  assert.equal(saved.scene, 2)
  assert.equal(saved.summary, '第一段')
  assert.deepEqual(saved.paragraphs, ['第一段', '第二段'])
  assert.equal(saved.contentBlocks.length, 4)
  assert.equal(saved.status, '1')
})
test('legacy policy source object fills the source fields', () => {
  const form = createForm({ id: 'p', title: '旧政策', source: { name: '国家发展和改革委员会', url: 'https://www.ndrc.gov.cn/' } }, 'policy')
  assert.equal(form.sourceName, '国家发展和改革委员会')
  assert.equal(form.sourceUrl, 'https://www.ndrc.gov.cn/')
  const saved = serializeForm(form, { id: 'p', source: { name: 'x' } }, 'policy')
  assert.equal(saved.source, undefined)
  assert.equal(saved.sourceName, '国家发展和改革委员会')
})
test('new policy has no default date; new about section keeps caption and string paragraphs', () => {
  assert.equal(createForm({}, 'policy').date, '')
  const form = createForm({}, 'about')
  form.title = ' 先行区概况 '; form.caption = '园区实景'; form.contentBlocks = [{ type: 'text', title: '', text: '第一行\n第二行' }]
  const saved = serializeForm(form, {}, 'about', () => 'u1')
  assert.equal(saved.id, 'about-u1')
  assert.equal(saved.kindCode, 'about')
  assert.equal(saved.title, '先行区概况')
  assert.equal(saved.caption, '园区实景')
  assert.deepEqual(saved.paragraphs, ['第一行\n第二行'])
  assert.equal(saved.summary, '')
  assert.equal(saved.status, '0')
})
test('source links must be http or https', () => {
  assert.equal(isWebUrl(''), true)
  assert.equal(isWebUrl('https://www.gov.cn/zhengce/'), true)
  assert.equal(isWebUrl('http://example.com'), true)
  assert.equal(isWebUrl('www.gov.cn'), false)
  assert.equal(isWebUrl('javascript:alert(1)'), false)
})
