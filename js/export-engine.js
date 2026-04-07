/* ============================================================
   PostGenerate — Export Engine
   Captures the post canvas using html2canvas and exports
   as PNG at full format resolution.
   Requires html2canvas (loaded via CDN in index.html).
   ============================================================ */

import { getFormat, FORMATS } from './formats.js'

export class ExportEngine {
  constructor(canvasEngine) {
    this._engine = canvasEngine
  }

  /**
   * Export the current canvas state as PNG.
   * @param {object} opts
   * @param {boolean} opts.transparent - If true, removes background layer
   * @param {string}  opts.formatId    - Override format (optional)
   * @param {string}  opts.filename    - Override download filename
   */
  async exportPNG({ transparent = false, formatId, filename } = {}) {
    const state = this._engine.getState()
    const fmtId = formatId ?? state.formatId
    const fmt = getFormat(fmtId)

    // Build a hidden clone of the canvas at full resolution
    const clone = document.createElement('div')
    clone.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: ${fmt.width}px;
      height: ${fmt.height}px;
      overflow: hidden;
      z-index: -1;
    `
    document.body.appendChild(clone)

    // Render state into clone (re-use canvas-engine render logic inline)
    const exportState = structuredClone(state)
    if (transparent) {
      // Remove background — let html2canvas handle transparency
    } else {
      // Apply background
      const bg = exportState.background
      if (bg.type === 'solid') clone.style.background = bg.color
      else if (bg.type === 'gradient') {
        const g = bg.gradient
        clone.style.background = g.type === 'linear'
          ? `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`
          : `radial-gradient(ellipse at center, ${g.from}, ${g.to})`
      } else if (bg.type === 'image' && bg.image) {
        clone.style.background = `url(${bg.image}) center/${bg.imageSize ?? 'cover'} no-repeat`
      }
    }

    // Render layers
    for (const layer of exportState.layers) {
      if (!layer.visible) continue
      const el = this._buildExportLayer(layer, fmt.width, fmt.height)
      clone.appendChild(el)
    }

    try {
      // Wait for fonts/images to load
      await document.fonts.ready
      await new Promise(r => setTimeout(r, 100))

      const canvas = await window.html2canvas(clone, {
        width: fmt.width,
        height: fmt.height,
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: transparent ? null : null,
        logging: false,
      })

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      const name = filename ?? this._buildFilename(state, fmtId)
      this._download(blob, name)
      return blob
    } finally {
      clone.remove()
    }
  }

  /**
   * Export in multiple formats at once — downloads a ZIP.
   * Requires JSZip (CDN).
   */
  async exportMultiple(formatIds, { transparent = false } = {}) {
    if (!window.JSZip) {
      this._fallbackMultiple(formatIds, transparent)
      return
    }

    const zip = new window.JSZip()
    const state = this._engine.getState()

    for (const fmtId of formatIds) {
      try {
        const blob = await this.exportPNG({ transparent, formatId: fmtId })
        zip.file(this._buildFilename(state, fmtId), blob)
      } catch (e) {
        console.error(`Export ${fmtId} failed:`, e)
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    this._download(zipBlob, 'post-generate-export.zip')
  }

  /** Fallback: sequential downloads (no zip) */
  async _fallbackMultiple(formatIds, transparent) {
    for (const fmtId of formatIds) {
      await this.exportPNG({ transparent, formatId: fmtId })
      await new Promise(r => setTimeout(r, 300))
    }
  }

  /** Generate thumbnail (small base64) for preset saving */
  async generateThumbnail(size = 240) {
    const state = this._engine.getState()
    const fmt = getFormat(state.formatId)
    const scale = size / Math.max(fmt.width, fmt.height)
    const tw = Math.round(fmt.width * scale)
    const th = Math.round(fmt.height * scale)

    const clone = document.createElement('div')
    clone.style.cssText = `
      position: fixed; top: -9999px; left: -9999px;
      width: ${fmt.width}px; height: ${fmt.height}px;
      overflow: hidden; z-index: -1;
    `
    document.body.appendChild(clone)

    const bg = state.background
    if (bg.type === 'solid') clone.style.background = bg.color
    else if (bg.type === 'gradient') {
      const g = bg.gradient
      clone.style.background = g.type === 'linear'
        ? `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`
        : `radial-gradient(ellipse at center, ${g.from}, ${g.to})`
    }

    for (const layer of state.layers) {
      if (!layer.visible) continue
      clone.appendChild(this._buildExportLayer(layer, fmt.width, fmt.height))
    }

    try {
      await document.fonts.ready
      const canvas = await window.html2canvas(clone, {
        width: fmt.width, height: fmt.height,
        scale: scale, useCORS: true, logging: false,
      })
      return canvas.toDataURL('image/jpeg', 0.7)
    } finally {
      clone.remove()
    }
  }

  /* ── Layer builder (mirrors canvas-engine, no event overhead) ── */
  _buildExportLayer(layer, cw, ch) {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      left: ${(layer.x ?? 0) * cw / 100}px;
      top: ${(layer.y ?? 0) * ch / 100}px;
      opacity: ${layer.opacity ?? 1};
    `

    if (layer.width !== 'auto' && layer.width != null) {
      el.style.width = `${layer.width * cw / 100}px`
    }

    if (layer.type === 'text') {
      const fs = layer.fontSize * cw / 100
      if (layer.subtype === 'badge') {
        const span = document.createElement('span')
        const bpx = layer.badgePaddingX * cw / 100
        const bpy = layer.badgePaddingY * cw / 100
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
          border: ${layer.badgeBorderWidth ?? 1}px solid ${layer.badgeBorderColor};
          border-radius: ${layer.badgeBorderRadius ?? 100}px;
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
        if (layer.width !== 'auto') el.style.width = `${layer.width * cw / 100}px`
        el.textContent = layer.content
      }
    } else if (layer.type === 'image' && layer.src) {
      el.style.width = `${(layer.width ?? 40) * cw / 100}px`
      el.style.height = `${(layer.height ?? 40) * ch / 100}px`
      el.style.overflow = 'hidden'
      el.style.borderRadius = `${(layer.borderRadius ?? 0) * cw / 100}px`
      const img = document.createElement('img')
      img.src = layer.src
      img.crossOrigin = 'anonymous'
      img.style.cssText = `width:100%;height:100%;object-fit:${layer.objectFit ?? 'contain'};display:block;`
      el.appendChild(img)
    } else if (layer.type === 'shape') {
      el.style.width = `${(layer.width ?? 20) * cw / 100}px`
      el.style.height = `${(layer.height ?? 0.5) * ch / 100}px`
      el.style.background = layer.fillColor ?? '#7BC4EC'
      el.style.borderRadius = `${layer.borderRadius ?? 0}px`
    }

    return el
  }

  _buildFilename(state, formatId) {
    const fmt = FORMATS[formatId]
    const platform = fmt?.platform ?? 'post'
    const label = (fmt?.label ?? formatId).toLowerCase().replace(/\s+/g, '-')
    const ts = new Date().toISOString().slice(0, 10)
    return `${platform}-${label}-${ts}.png`
  }

  _download(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
