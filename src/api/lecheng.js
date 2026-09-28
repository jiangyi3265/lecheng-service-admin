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
export const listConsultations = () => request({ url: '/lecheng/consultations', method: 'get' })
export const listMessages = sessionId => request({ url: `/lecheng/consultations/${encodeURIComponent(sessionId)}`, method: 'get' })
export const replyConsultation = (sessionId, text) => request({ url: `/lecheng/consultations/${encodeURIComponent(sessionId)}/reply`, method: 'post', data: { text } })
export const listAppointments = () => request({ url: '/lecheng/appointments', method: 'get' })
export const updateAppointment = (id, status) => request({ url: `/lecheng/appointments/${id}`, method: 'put', data: { status } })
export const listFeedback = () => request({ url: '/lecheng/feedback', method: 'get' })
export const updateFeedback = (id, status) => request({ url: `/lecheng/feedback/${id}`, method: 'put', data: { status } })
