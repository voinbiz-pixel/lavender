// Liquid Glass for the web.
//
// Chromium (Chrome, Edge, Android): real refraction. Each glass surface gets an SVG filter whose
// displacement map is generated for its exact size and corner radius, so what is behind it bends at
// the rim like a thick convex lens, with red, green and blue bent by slightly different amounts.
// Safari / iOS can't run SVG filters on backdrops, so CSS draws a clear body with a thick, bright,
// refracting-looking rim instead (see styles.css).
//
// No wrapper components: every element matching SEL is picked up automatically, measured, and
// re-measured when it resizes. Glass inside glass is skipped (never glass on glass).
// Only what floats gets glass: the tab bar and its lens, sheets, menus and toasts.

export const CAN_REFRACT = (() => {
  try {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod|CriOS|FxiOS|EdgiOS/.test(ua)) return false
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return false
    if (matchMedia('(prefers-reduced-transparency: reduce)').matches) return false
    return /Chrome\/\d+|Chromium\/\d+|Edg\/\d+/.test(ua) && !!window.CSS?.supports?.('backdrop-filter', 'blur(1px)')
  } catch { return false }
})()

const SEL = '.tabbar, .lens, .sheet, .menu, .toast'
const NS = 'http://www.w3.org/2000/svg'
const maps = new Map()
const filters = new Map()
let defs = null

// Displacement map: R = x offset, G = y offset, 128 = none. Near the rim the backdrop is pulled from
// further inside (a convex bezel); `magnify` adds a gentle zoom toward the centre (the tab lens).
function makeMap(w, h, r, bezel, magnify) {
  const key = `${w}x${h}r${r}b${bezel}m${magnify}`
  if (maps.has(key)) return maps.get(key)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(w, h)
  const d = img.data
  r = Math.min(r, w / 2, h / 2)
  const hw = w / 2, hh = h / 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw, py = y + 0.5 - hh
      const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r)
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
      let nx, ny
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = (qx / l) * Math.sign(px); ny = (qy / l) * Math.sign(py) }
      else if (qx > qy) { nx = Math.sign(px); ny = 0 }
      else { nx = 0; ny = Math.sign(py) }
      const t = Math.min(1, Math.max(0, -sd / bezel))
      const m = Math.pow(1 - t, 1.9) // steep at the rim, flat across the face
      const dx = -nx * m - (px / hw) * magnify
      const dy = -ny * m - (py / hh) * magnify
      const i = (y * w + x) * 4
      d[i] = 128 + Math.max(-1, Math.min(1, dx)) * 127
      d[i + 1] = 128 + Math.max(-1, Math.min(1, dy)) * 127
      d[i + 2] = 128
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const url = c.toDataURL()
  if (maps.size > 60) maps.delete(maps.keys().next().value)
  maps.set(key, url)
  return url
}

const CH = { r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' }

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag)
  for (const k in attrs) n.setAttribute(k, attrs[k])
  parent?.appendChild(n)
  return n
}

function filterFor(w, h, r, bezel, strength, blur, magnify, saturate) {
  const key = `${w}-${h}-${r}-${bezel}-${strength}-${blur}-${magnify}-${saturate}`
  if (filters.has(key)) return filters.get(key)
  if (!defs) {
    const svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;pointer-events:none' })
    defs = el('defs', {}, svg)
    document.body.appendChild(svg)
  }
  const id = `lg${filters.size}`
  const f = el('filter', { id, 'color-interpolation-filters': 'sRGB' }, defs)
  el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: blur, result: 'b' }, f)
  el('feImage', { href: makeMap(w, h, r, bezel, magnify), x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', result: 'map' }, f)
  const s = bezel * strength
  ;[['r', 1], ['g', 1.07], ['b', 1.14]].forEach(([c, k]) => {
    el('feDisplacementMap', { in: 'b', in2: 'map', scale: s * k, xChannelSelector: 'R', yChannelSelector: 'G', result: `d${c}` }, f)
    el('feColorMatrix', { in: `d${c}`, type: 'matrix', values: CH[c], result: `c${c}` }, f)
  })
  el('feBlend', { mode: 'screen', in: 'cr', in2: 'cg', result: 'rg' }, f)
  el('feBlend', { mode: 'screen', in: 'rg', in2: 'cb', result: 'rgb' }, f)
  el('feColorMatrix', { in: 'rgb', type: 'saturate', values: saturate }, f)
  filters.set(key, id)
  return id
}

function nestedInGlass(node) {
  return !!node.parentElement?.closest('.tabbar, .sheet, .menu, .toast')
}

function apply(node) {
  if (!node.isConnected) return
  if (!node.matches(SEL) || (nestedInGlass(node) && !node.matches('.lens'))) {
    if (node.__lg) { node.__lg = null; node.style.backdropFilter = ''; node.style.webkitBackdropFilter = ''; node.classList.remove('lg-on') }
    return
  }
  const w = Math.round(node.offsetWidth), h = Math.round(node.offsetHeight)
  if (!w || !h || w * h > 520000) return
  const r = Math.round(parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0)
  const sheet = node.matches('.sheet')
  const lens = node.matches('.lens')
  const dark = node.matches('.menu, .toast')
  const bezel = Math.round(Math.max(8, Math.min(sheet ? 30 : 22, Math.min(w, h) * (sheet ? 0.22 : 0.32))))
  const id = sheet ? filterFor(w, h, r, bezel, 0.9, 9, 0, 1.6)
    : dark ? filterFor(w, h, r, bezel, 1, 5, 0, 1.6)
    : filterFor(w, h, r, bezel, lens ? 0.9 : 1.15, lens ? 0.6 : 4, lens ? 0.12 : 0, 1.7)
  const v = `url(#${id})`
  if (node.__lg === v) return
  node.__lg = v
  node.style.backdropFilter = v
  node.style.webkitBackdropFilter = v
  if (!node.classList.contains('lg-on')) node.classList.add('lg-on')
}

export function startLiquid(root) {
  if (!CAN_REFRACT || !root) return () => {}
  document.documentElement.classList.add('refract')
  const seen = new WeakSet()
  const ro = new ResizeObserver((es) => es.forEach((e) => apply(e.target)))
  let t = 0
  const scan = () => {
    root.querySelectorAll(SEL).forEach((n) => {
      if (!seen.has(n)) { seen.add(n); ro.observe(n) }
      apply(n)
    })
  }
  scan()
  const mo = new MutationObserver((ms) => {
    let structural = false
    ms.forEach((m) => {
      if (m.type !== 'attributes') { structural = true; return }
      // ignore our own lg-on marker
      const mine = (c) => c && c !== 'lg-on' && c !== 'down'
      const was = (m.oldValue || '').split(/\s+/).filter(mine).sort().join(' ')
      const now = [...m.target.classList].filter(mine).sort().join(' ')
      if (was === now) return
      structural = true
      if (seen.has(m.target)) { m.target.__lg = null; apply(m.target) }
    })
    if (!structural) return
    clearTimeout(t); t = setTimeout(scan, 40)
  })
  mo.observe(root, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['class'] })
  return () => { mo.disconnect(); ro.disconnect() }
}
