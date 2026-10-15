// 客服咨询未读提醒：左侧“客服咨询”菜单上的红色数字，以及来了新消息时右上角弹出的提醒。
// 登录后由 layout 启动一次，每 15 秒查询一次未读数；浏览器切到别的标签页时不查询，查询出错后暂停 60 秒再试。
// 只有能查看客服咨询（lecheng:consult:list）的账号才查询。
import { reactive } from 'vue'
import { ElNotification } from 'element-plus'
import router from '@/router'
import { getToken } from '@/utils/auth'
import useUserStore from '@/store/modules/user'
import { getConsultUnread } from '@/api/lecheng'

// 客服咨询菜单的路由名称（sys_menu.route_name）
export const CONSULT_ROUTE = 'LechengConsultations'
const POLL_INTERVAL = 15000
const ERROR_PAUSE = 60000

// count：未读的用户消息条数；sessions：有未读消息的会话数
export const lechengUnread = reactive({ count: 0, sessions: 0 })
// 角标上的文字，超过 99 显示 99+
export const unreadText = count => (count > 99 ? '99+' : String(count))

let running = false, timer = null, loaded = false, requestSeq = 0, errorUntil = 0, notice = null

function allowed() {
  const permissions = useUserStore().permissions || []
  return !!getToken() && (permissions.includes('*:*:*') || permissions.includes('lecheng:consult:list'))
}

// 打开客服咨询页：有独立菜单时进菜单，否则进旧的合并页并切到“客服咨询”
export function openConsultations() {
  if (router.hasRoute(CONSULT_ROUTE)) router.push({ name: CONSULT_ROUTE })
  else router.push({ path: '/lecheng', query: { tab: 'consultations' } })
}
function onConsultPage() {
  const route = router.currentRoute.value
  return route.name === CONSULT_ROUTE || (route.path === '/lecheng' && route.query.tab === 'consultations')
}

function notify(count) {
  if (notice) notice.close()
  const handle = ElNotification({
    title: '新的客服咨询',
    message: `有 ${count} 条未读消息，点击查看`,
    type: 'primary',
    duration: 8000,
    customClass: 'lecheng-unread-notice',
    onClick() { handle.close(); openConsultations() },
    onClose() { if (notice === handle) notice = null }
  })
  notice = handle
}

async function fetchUnread() {
  const seq = ++requestSeq
  const data = (await getConsultUnread()).data || {}
  // 同时发出了多次查询时只采用最后一次的结果，避免旧数字覆盖新数字
  if (seq !== requestSeq) return
  const count = Math.max(0, Math.floor(Number(data.count)) || 0)
  const increased = loaded && count > lechengUnread.count
  lechengUnread.count = count
  lechengUnread.sessions = Math.max(0, Math.floor(Number(data.sessions)) || 0)
  loaded = true
  // 第一次加载不提醒；正在客服咨询页时页面本身会显示新消息，也不提醒
  if (increased && !document.hidden && !onConsultPage()) notify(count)
}

// 立即刷新一次未读数（客服咨询页标记已读后调用）；出错时保留原来的数字
export function refreshLechengUnread() {
  if (!allowed()) return Promise.resolve()
  return fetchUnread().catch(() => {})
}

function schedule(delay) {
  clearTimeout(timer)
  timer = setTimeout(tick, delay)
}
async function tick() {
  if (!running) return
  if (document.hidden || !allowed()) return schedule(POLL_INTERVAL)
  try {
    await fetchUnread()
    errorUntil = 0
    if (running) schedule(POLL_INTERVAL)
  } catch {
    errorUntil = Date.now() + ERROR_PAUSE
    if (running) schedule(ERROR_PAUSE)
  }
}
// 切回这个标签页时马上查一次（出错暂停期间除外）
function onVisibilityChange() {
  if (running && !document.hidden && Date.now() >= errorUntil) schedule(0)
}

export function startLechengUnread() {
  if (running) return
  running = true
  document.addEventListener('visibilitychange', onVisibilityChange)
  schedule(0)
}
export function stopLechengUnread() {
  running = false
  clearTimeout(timer)
  timer = null
  document.removeEventListener('visibilitychange', onVisibilityChange)
}
