// 旧内核浏览器兼容（如搜狗浏览器 Chrome 80 内核、360 兼容模式）：补齐后台用到、但 Chrome 92 之前没有的接口。
// 必须在其他代码之前加载（见 main.js 第一行）。
function define(target, name, value) {
  if (target && !(name in target)) Object.defineProperty(target, name, { value, writable: true, configurable: true })
}

// crypto.randomUUID（Chrome 92+）
if (typeof crypto !== 'undefined') {
  define(crypto, 'randomUUID', function randomUUID() {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  })
}

// Array / TypedArray / String .at（Chrome 92+）
function at(index) {
  const length = this.length
  let i = Math.trunc(index) || 0
  if (i < 0) i += length
  return i < 0 || i >= length ? undefined : this[i]
}
define(Array.prototype, 'at', at)
define(String.prototype, 'at', at)
if (typeof Uint8Array !== 'undefined') define(Object.getPrototypeOf(Uint8Array.prototype), 'at', at)

// Array.findLast / findLastIndex（Chrome 97+）
define(Array.prototype, 'findLast', function findLast(fn, thisArg) {
  for (let i = this.length - 1; i >= 0; i--) if (fn.call(thisArg, this[i], i, this)) return this[i]
  return undefined
})
define(Array.prototype, 'findLastIndex', function findLastIndex(fn, thisArg) {
  for (let i = this.length - 1; i >= 0; i--) if (fn.call(thisArg, this[i], i, this)) return i
  return -1
})

// String.replaceAll（Chrome 85+）
define(String.prototype, 'replaceAll', function replaceAll(search, replacement) {
  if (search instanceof RegExp) {
    if (!search.global) throw new TypeError('replaceAll must be called with a global RegExp')
    return this.replace(search, replacement)
  }
  return this.split(String(search)).join(typeof replacement === 'function' ? replacement(String(search)) : replacement)
})

// Object.hasOwn（Chrome 93+）
define(Object, 'hasOwn', function hasOwn(object, key) { return Object.prototype.hasOwnProperty.call(object, key) })

// structuredClone（Chrome 98+）：后台只用于普通数据，JSON 方式足够
define(globalThis, 'structuredClone', function structuredClone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)) })

// Promise.any（Chrome 85+）
define(Promise, 'any', function any(iterable) {
  return new Promise((resolve, reject) => {
    const list = Array.from(iterable); const errors = []; let pending = list.length
    if (!pending) return reject(new Error('All promises were rejected'))
    list.forEach((p, i) => Promise.resolve(p).then(resolve, e => { errors[i] = e; if (--pending === 0) reject(Object.assign(new Error('All promises were rejected'), { errors })) }))
  })
})

// Element.replaceChildren（Chrome 86+）
if (typeof Element !== 'undefined') {
  define(Element.prototype, 'replaceChildren', function replaceChildren(...nodes) {
    while (this.lastChild) this.removeChild(this.lastChild)
    if (nodes.length) this.append(...nodes)
  })
}

// flex 布局的 gap（Chrome 84+）：不支持时给 <html> 加 no-flexgap 类，配合 assets/styles/legacy-gap.scss 用 margin 补间距
if (typeof document !== 'undefined') {
  const probe = document.createElement('div')
  probe.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden'
  probe.appendChild(document.createElement('div'))
  probe.appendChild(document.createElement('div'))
  document.documentElement.appendChild(probe)
  if (probe.scrollHeight !== 1) document.documentElement.classList.add('no-flexgap')
  probe.parentNode.removeChild(probe)
}
