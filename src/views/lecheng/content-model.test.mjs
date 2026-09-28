import test from 'node:test'
import assert from 'node:assert/strict'
import { createForm, serializeForm, belongsToSection } from './content-model.mjs'

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
