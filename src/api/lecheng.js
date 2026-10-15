import request from '@/utils/request'

export async function uploadContentImage(file) {
  const data = new FormData()
  data.append('file', file)
  const result = await request({ url: '/common/upload', method: 'post', data, timeout: 60000, headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false } })
  const base = new URL(import.meta.env.VITE_APP_BASE_API + '/', window.location.origin)
  return new URL(result.fileName.replace(/^\//, ''), base).href
}

export const listContent = kind => request({ url: '/lecheng/content', method: 'get', params: { kind } })
export const saveContent = data => request({ url: '/lecheng/content', method: 'post', data })
export const deleteContent = id => request({ url: `/lecheng/content/${encodeURIComponent(id)}`, method: 'delete' })
// config 可传 { silent: true }：定时刷新出错时不弹提示（见 utils/request.js）
export const listConsultations = config => request({ url: '/lecheng/consultations', method: 'get', ...config })
export const listMessages = (sessionId, config) => request({ url: `/lecheng/consultations/${encodeURIComponent(sessionId)}`, method: 'get', ...config })
export const replyConsultation = (sessionId, text) => request({ url: `/lecheng/consultations/${encodeURIComponent(sessionId)}/reply`, method: 'post', data: { text } })
// 未读的用户消息总数 { count, sessions }：左侧菜单红点与新消息提醒在后台定时查询，出错不弹提示
export const getConsultUnread = () => request({ url: '/lecheng/consultations/unread', method: 'get', silent: true })
// 打开会话即视为已读；会话打开期间每次刷新都可能调用，所以关掉防重复提交检查
export const markConsultationRead = sessionId => request({ url: `/lecheng/consultations/${encodeURIComponent(sessionId)}/read`, method: 'post', silent: true, headers: { repeatSubmit: false } })
export const listAppointments = () => request({ url: '/lecheng/appointments', method: 'get' })
export const updateAppointment = (id, status) => request({ url: `/lecheng/appointments/${id}`, method: 'put', data: { status } })
export const listFeedback = () => request({ url: '/lecheng/feedback', method: 'get' })
export const updateFeedback = (id, status) => request({ url: `/lecheng/feedback/${id}`, method: 'put', data: { status } })
