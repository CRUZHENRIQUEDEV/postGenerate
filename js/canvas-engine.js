/* ============================================================
   PostGenerate — Canvas Engine
   Manages canvas state (layers, background, format) and
   renders them as DOM elements.  Same render fn is used for
   both the live preview (scaled) and the full-resolution
   export clone.
   ============================================================ */

import { getFormat } from './formats.js'

/* ── Default state (mirrors ZenithSolutions Home scene 0) ── */
export function createDefaultState(formatId = 'ig-feed-square') {
  return {
    formatId,
    background: {
      type: 'solid',       // 'solid' | 'gradient' | 'image'
      color: '#000000',
      gradient: { type: 'linear', from: '#000000', to: '#0e1a2e', angle: 135 },
      image: null,
      imageSize: 'cover',  // 'cover' | 'contain' | 'fill'
    },
    layers: [
      makeBadgeLayer('layer-badge', 'Badge', 'Simple Bridge'),
      makeHeadlineLayer('layer-headline', 'Headline', 'Modelar pontes\nnunca foi\ntão rápido.'),
      makeSubLayer('layer-sub', 'Subtítulo', 'Do levantamento de campo ao modelo 3D completo\n— com quantitativos, insumos para orçamento\ne exportação IFC gerados em segundos.'),
    ],
  }
}

/* ── Layer factories ────────────────────────────────────── */
export function makeBadgeLayer(id, name, content = 'Badge') {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? 'Badge',
    type: 'text',
    subtype: 'badge',
    visible: true,
    locked: false,
    /* Position (% of canvas dimensions) */
    x: 8.5,
    y: 9.5,
    width: 'auto',   // 'auto' or number%
    /* Typography */
    content,
    fontFamily: 'Inter',
    fontSize: 2.1,   // % of canvas width
    fontWeight: 500,
    fontStyle: 'normal',
    color: '#7BC4EC',
    textAlign: 'left',
    lineHeight: 1.2,
    letterSpacing: '0.07em',
    textTransform: 'none',
    opacity: 1,
    /* Badge extras */
    badgeBg: 'transparent',
    badgeBorderColor: 'rgba(123,196,236,0.4)',
    badgeBorderWidth: 1,  // px at 1080w
    badgeBorderRadius: 100,
    badgePaddingX: 1.1,   // % of canvas width
    badgePaddingY: 0.33,  // % of canvas width
  }
}

export function makeHeadlineLayer(id, name, content = 'Título\nPrincipal') {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? 'Headline',
    type: 'text',
    subtype: 'headline',
    visible: true,
    locked: false,
    x: 8.5,
    y: 18,
    width: 75,
    content,
    fontFamily: 'Inter',
    fontSize: 9.0,
    fontWeight: 800,
    fontStyle: 'normal',
    color: '#ffffff',
    textAlign: 'left',
    lineHeight: 1.02,
    letterSpacing: '-0.03em',
    textTransform: 'none',
    opacity: 1,
  }
}

export function makeSubLayer(id, name, content = 'Texto de suporte aqui.') {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? 'Subtítulo',
    type: 'text',
    subtype: 'sub',
    visible: true,
    locked: false,
    x: 8.5,
    y: 68,
    width: 62,
    content,
    fontFamily: 'Inter',
    fontSize: 2.3,
    fontWeight: 400,
    fontStyle: 'normal',
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'left',
    lineHeight: 1.55,
    letterSpacing: '0.01em',
    textTransform: 'none',
    opacity: 1,
  }
}

export function makeTextLayer(id, name) {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? 'Texto',
    type: 'text',
    subtype: 'body',
    visible: true,
    locked: false,
    x: 8.5,
    y: 50,
    width: 65,
    content: 'Novo texto',
    fontFamily: 'Inter',
    fontSize: 3.5,
    fontWeight: 400,
    fontStyle: 'normal',
    color: '#ffffff',
    textAlign: 'left',
    lineHeight: 1.4,
    letterSpacing: '0em',
    textTransform: 'none',
    opacity: 1,
  }
}

export function makeImageLayer(id, name, src) {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? 'Imagem',
    type: 'image',
    subtype: 'image',
    visible: true,
    locked: false,
    x: 50,
    y: 20,
    width: 40,
    height: 40,
    src: src ?? '',
    objectFit: 'contain',
    opacity: 1,
    borderRadius: 0,
  }
}

export function makeShapeLayer(id, name) {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? 'Forma',
    type: 'shape',
    subtype: 'rect',
    visible: true,
    locked: false,
    x: 8.5,
    y: 85,
    width: 15,
    height: 0.4,   // % of canvas height (thin line)
    fillColor: '#7BC4EC',
    strokeColor: 'transparent',
    strokeWidth: 0,
    borderRadius: 100,
    opacity: 1,
  }
}

/* ── Canvas Engine class ────────────────────────────────── */
export class CanvasEngine {
  constructor(canvasEl) {
    this._el = canvasEl
    this._state = createDefaultState()
    this._selectedId = null
    this._listeners = {}
    this._previewW = 0
    this._previewH = 0
    this._scale = 1
  }

  /* ── State management ─────────────────────────────────── */
  getState() {
    return structuredClone(this._state)
  }

  setState(state) {
    this._state = structuredClone(state)
    this._selectedId = null
    this.render()
    this._emit('stateChange', this._state)
    this._emit('selectionChange', null)
  }

  updateBackground(patch) {
    Object.assign(this._state.background, patch)
    this._renderBackground()
    this._emit('stateChange', this._state)
  }

  updateLayer(id, patch) {
    const layer = this._state.layers.find(l => l.id === id)
    if (!layer) return
    Object.assign(layer, patch)
    this._renderLayer(layer)
    this._emit('layerUpdate', layer)
    this._emit('stateChange', this._state)
  }

  addLayer(layer) {
    this._state.layers.push(layer)
    this.render()
    this.selectLayer(layer.id)
    this._emit('layersChange', this._state.layers)
    this._emit('stateChange', this._state)
  }

  removeLayer(id) {
    const idx = this._state.layers.findIndex(l => l.id === id)
    if (idx === -1) return
    this._state.layers.splice(idx, 1)
    if (this._selectedId === id) {
      this._selectedId = null
      this._emit('selectionChange', null)
    }
    this.render()
    this._emit('layersChange', this._state.layers)
    this._emit('stateChange', this._state)
  }

  moveLayer(id, direction) {
    const layers = this._state.layers
    const idx = layers.findIndex(l => l.id === id)
    if (idx === -1) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= layers.length) return
    ;[layers[idx], layers[newIdx]] = [layers[newIdx], layers[idx]]
    this.render()
    this._emit('layersChange', layers)
    this._emit('stateChange', this._state)
  }

  duplicateLayer(id) {
    const src = this._state.layers.find(l => l.id === id)
    if (!src) return
    const clone = structuredClone(src)
    clone.id = crypto.randomUUID()
    clone.name = src.name + ' (cópia)'
    clone.x = (src.x ?? 0) + 2
    clone.y = (src.y ?? 0) + 2
    this._state.layers.push(clone)
    this.render()
    this.selectLayer(clone.id)
    this._emit('layersChange', this._state.layers)
    this._emit('stateChange', this._state)
  }

  selectLayer(id) {
    this._selectedId = id
    // Update visual selection on canvas
    this._el.querySelectorAll('.pg-layer').forEach(el => {
      el.classList.toggle('pg-layer--selected', el.dataset.layerId === id)
    })
    const layer = this._state.layers.find(l => l.id === id) ?? null
    this._emit('selectionChange', layer)
  }

  getSelectedLayer() {
    return this._state.layers.find(l => l.id === this._selectedId) ?? null
  }

  setFormat(formatId) {
    this._state.formatId = formatId
    this.render()
    this._emit('formatChange', formatId)
  }

  getLayers() {
    return this._state.layers
  }

  /* ── Rendering ────────────────────────────────────────── */

  /**
   * Set preview dimensions and scale factor.
   * Call this when the available canvas area changes.
   */
  setPreviewSize(availW, availH) {
    const fmt = getFormat(this._state.formatId)
    const scaleW = availW / fmt.width
    const scaleH = availH / fmt.height
    this._scale = Math.min(scaleW, scaleH, 1)  // never upscale
    this._previewW = Math.round(fmt.width * this._scale)
    this._previewH = Math.round(fmt.height * this._scale)

    this._el.style.width = fmt.width + 'px'
    this._el.style.height = fmt.height + 'px'
    this._el.style.transform = `scale(${this._scale})`
    this._el.style.transformOrigin = 'top left'

    // The wrapper needs to be sized to the scaled dimensions
    const wrapper = this._el.parentElement
    if (wrapper) {
      wrapper.style.width = this._previewW + 'px'
      wrapper.style.height = this._previewH + 'px'
    }

    this._emit('scaleChange', { scale: this._scale, previewW: this._previewW, previewH: this._previewH })
  }

  getScale() { return this._scale }
  getPreviewDims() { return { w: this._previewW, h: this._previewH } }

  /** Full re-render (background + all layers) */
  render() {
    const fmt = getFormat(this._state.formatId)
    this._el.style.width = fmt.width + 'px'
    this._el.style.height = fmt.height + 'px'

    // Clear non-background children
    this._el.querySelectorAll('.pg-layer').forEach(el => el.remove())

    this._renderBackground()

    // Render layers bottom to top (index 0 = bottom)
    this._state.layers.forEach(layer => {
      if (!layer.visible) return
      const el = this._buildLayerEl(layer, fmt.width, fmt.height)
      this._el.appendChild(el)
    })
  }

  _renderBackground() {
    let bgEl = this._el.querySelector('.pg-bg')
    if (!bgEl) {
      bgEl = document.createElement('div')
      bgEl.className = 'pg-bg'
      bgEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;'
      this._el.prepend(bgEl)
    }
    const bg = this._state.background
    if (bg.type === 'solid') {
      bgEl.style.background = bg.color
    } else if (bg.type === 'gradient') {
      const g = bg.gradient
      if (g.type === 'linear') {
        bgEl.style.background = `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`
      } else {
        bgEl.style.background = `radial-gradient(ellipse at center, ${g.from}, ${g.to})`
      }
    } else if (bg.type === 'image' && bg.image) {
      bgEl.style.background = `url(${bg.image}) center/cover no-repeat`
    }
  }

  /** Re-render a single layer in place */
  _renderLayer(layer) {
    const fmt = getFormat(this._state.formatId)
    const existing = this._el.querySelector(`[data-layer-id="${layer.id}"]`)
    if (!layer.visible) {
      existing?.remove()
      return
    }
    const newEl = this._buildLayerEl(layer, fmt.width, fmt.height)
    if (existing) {
      existing.replaceWith(newEl)
    } else {
      this._el.appendChild(newEl)
    }
  }

  _buildLayerEl(layer, cw, ch) {
    const el = document.createElement('div')
    el.className = 'pg-layer'
    el.dataset.layerId = layer.id

    // Base positioning
    const x = (layer.x ?? 0) * cw / 100
    const y = (layer.y ?? 0) * ch / 100

    el.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      opacity: ${layer.opacity ?? 1};
      cursor: pointer;
    `

    if (layer.width !== 'auto' && layer.width != null) {
      el.style.width = `${layer.width * cw / 100}px`
    }

    if (layer.type === 'text') {
      this._applyTextStyles(el, layer, cw, ch)
    } else if (layer.type === 'image') {
      this._applyImageStyles(el, layer, cw, ch)
    } else if (layer.type === 'shape') {
      this._applyShapeStyles(el, layer, cw, ch)
    }

    // Selection outline
    if (layer.id === this._selectedId) {
      el.classList.add('pg-layer--selected')
    }

    // Click to select
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      if (!layer.locked) this.selectLayer(layer.id)
    })

    return el
  }

  _applyTextStyles(el, layer, cw, ch) {
    const fs = layer.fontSize * cw / 100

    if (layer.subtype === 'badge') {
      const span = document.createElement('span')
      const bpx = layer.badgePaddingX * cw / 100
      const bpy = layer.badgePaddingY * cw / 100
      const bbrW = layer.badgeBorderRadius   // always pill radius in px (at 1080)
      const bbw = layer.badgeBorderWidth ?? 1

      span.style.cssText = `
        display: inline-block;
        font-size: ${fs}px;
        font-family: '${layer.fontFamily}', sans-serif;
        font-weight: ${layer.fontWeight};
        font-style: ${layer.fontStyle ?? 'normal'};
        color: ${layer.color};
        letter-spacing: ${layer.letterSpacing};
        text-transform: ${layer.textTransform ?? 'none'};
        line-height: ${layer.lineHeight};
        padding: ${bpy}px ${bpx}px;
        background: ${layer.badgeBg ?? 'transparent'};
        border: ${bbw}px solid ${layer.badgeBorderColor};
        border-radius: ${bbrW}px;
        white-space: nowrap;
      `
      span.textContent = layer.content
      el.appendChild(span)
    } else {
      el.style.fontSize = `${fs}px`
      el.style.fontFamily = `'${layer.fontFamily}', sans-serif`
      el.style.fontWeight = layer.fontWeight
      el.style.fontStyle = layer.fontStyle ?? 'normal'
      el.style.color = layer.color
      el.style.textAlign = layer.textAlign ?? 'left'
      el.style.lineHeight = layer.lineHeight
      el.style.letterSpacing = layer.letterSpacing
      el.style.textTransform = layer.textTransform ?? 'none'
      el.style.whiteSpace = 'pre-line'
      el.textContent = layer.content
    }
  }

  _applyImageStyles(el, layer, cw, ch) {
    el.style.height = `${(layer.height ?? 40) * ch / 100}px`
    el.style.overflow = 'hidden'
    el.style.borderRadius = `${(layer.borderRadius ?? 0) * cw / 100}px`

    if (layer.src) {
      const img = document.createElement('img')
      img.src = layer.src
      img.style.cssText = `
        width: 100%; height: 100%;
        object-fit: ${layer.objectFit ?? 'contain'};
        display: block;
      `
      el.appendChild(img)
    }
  }

  _applyShapeStyles(el, layer, cw, ch) {
    el.style.width = `${(layer.width ?? 20) * cw / 100}px`
    el.style.height = `${(layer.height ?? 0.5) * ch / 100}px`
    el.style.background = layer.fillColor ?? '#7BC4EC'
    el.style.borderRadius = `${layer.borderRadius ?? 0}px`
    if (layer.strokeWidth > 0) {
      el.style.outline = `${layer.strokeWidth}px solid ${layer.strokeColor}`
    }
  }

  /* ── Event emitter ────────────────────────────────────── */
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(cb)
    return () => this.off(event, cb)
  }

  off(event, cb) {
    if (!this._listeners[event]) return
    this._listeners[event] = this._listeners[event].filter(fn => fn !== cb)
  }

  _emit(event, data) {
    ;(this._listeners[event] ?? []).forEach(cb => cb(data))
  }

  /* ── History (undo/redo) ──────────────────────────────── */
  _history = []
  _historyIdx = -1
  _maxHistory = 50

  snapshot() {
    // Trim future
    this._history = this._history.slice(0, this._historyIdx + 1)
    this._history.push(structuredClone(this._state))
    if (this._history.length > this._maxHistory) {
      this._history.shift()
    }
    this._historyIdx = this._history.length - 1
  }

  undo() {
    if (this._historyIdx <= 0) return
    this._historyIdx--
    this._state = structuredClone(this._history[this._historyIdx])
    this._selectedId = null
    this.render()
    this._emit('stateChange', this._state)
    this._emit('layersChange', this._state.layers)
    this._emit('selectionChange', null)
  }

  redo() {
    if (this._historyIdx >= this._history.length - 1) return
    this._historyIdx++
    this._state = structuredClone(this._history[this._historyIdx])
    this._selectedId = null
    this.render()
    this._emit('stateChange', this._state)
    this._emit('layersChange', this._state.layers)
    this._emit('selectionChange', null)
  }

  canUndo() { return this._historyIdx > 0 }
  canRedo() { return this._historyIdx < this._history.length - 1 }
}
