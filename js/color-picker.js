/* ============================================================
   PostGenerate — Color Picker Component
   Standalone, reusable modal color picker.
   Adapted from color-picker-feito.html (ZenithSolutions)
   ============================================================ */

export class ColorPicker {
  constructor() {
    this._resolve = null
    this._hue = 0
    this._sat = 0
    this._lum = 100
    this._alpha = 1
    this._draggingCanvas = false
    this._draggingHue = false
    this._draggingAlpha = false
    this._el = null
    this._onChangeCb = null
    this._recentColors = this._loadRecentColors()
    this._build()
  }

  _loadRecentColors() {
    try {
      return JSON.parse(localStorage.getItem('pg_recent_colors') || '[]')
    } catch { return [] }
  }

  _saveRecentColors() {
    localStorage.setItem('pg_recent_colors', JSON.stringify(this._recentColors.slice(0, 8)));
  }

  _addRecentColor(hex) {
    this._recentColors = this._recentColors.filter(c => c !== hex)
    this._recentColors.unshift(hex)
    this._recentColors = this._recentColors.slice(0, 8)
    this._saveRecentColors()
    this._renderRecentSwatches()
  }

  /* ── Public API ─────────────────────────────────────────── */

  /** Open picker at color, returns Promise<hex|null> */
  open(initialHex = '#000000', onChange = null) {
    this._onChangeCb = onChange
    this._setFromHex(initialHex)
    this._originalHex = initialHex
    this._updateAll()
    this._renderRecentSwatches()
    this._el.style.display = 'flex'
    document.body.style.overflow = 'hidden'
    return new Promise(resolve => { this._resolve = resolve })
  }

  close(result = null) {
    this._el.style.display = 'none'
    document.body.style.overflow = ''
    if (this._resolve) {
      this._resolve(result)
      this._resolve = null
    }
  }

  destroy() {
    this._el?.remove()
  }

  /* ── Build DOM ──────────────────────────────────────────── */
  _build() {
    const el = document.createElement('div')
    el.id = 'color-picker-modal'
    el.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
    `
    el.innerHTML = `
      <div class="cp-dialog" style="
        background: #1a2030;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.7);
        width: 360px;
        overflow: hidden;
        user-select: none;
      ">
        <!-- Header -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: #141928;
        ">
          <span style="font-size: 13px; font-weight: 500; color: #e8edf5; font-family: var(--font-ui);">Selecionar Cor</span>
          <div style="display:flex;gap:6px;align-items:center;">
            <div id="cp-wcag-badge" title="Razão de contraste WCAG" style="
              font-size: 10px; font-weight: 600; font-family: var(--font-ui);
              padding: 2px 6px; border-radius: 4px; cursor: default;
              display: none;
            "></div>
            <button id="cp-eyedropper" title="Usar conta-gotas (EyeDropper API)" style="
              background: none; border: 1px solid rgba(255,255,255,0.1); color: #8896b0; font-size: 14px;
              cursor: pointer; width: 28px; height: 28px;
              display: flex; align-items: center; justify-content: center;
              border-radius: 4px; font-family: var(--font-ui);
            ">💧</button>
            <button id="cp-close" style="
              background: none; border: none; color: #5a6880; font-size: 18px;
              cursor: pointer; width: 24px; height: 24px;
              display: flex; align-items: center; justify-content: center;
              border-radius: 4px; font-family: var(--font-ui);
            ">×</button>
          </div>
        </div>

        <!-- Body -->
        <div style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">

          <!-- SL Canvas + Hue + Alpha -->
          <div style="display: flex; gap: 10px; align-items: flex-start;">

            <!-- SL canvas -->
            <div style="position: relative; flex-shrink: 0;">
              <canvas id="cp-sl-canvas" width="220" height="180" style="
                display: block; border-radius: 6px; cursor: crosshair;
                border: 1px solid rgba(255,255,255,0.08);
              "></canvas>
              <div id="cp-sl-thumb" style="
                position: absolute;
                width: 12px; height: 12px;
                border-radius: 50%;
                border: 2px solid #fff;
                box-shadow: 0 0 4px rgba(0,0,0,0.8);
                pointer-events: none;
                transform: translate(-50%, -50%);
                top: 0; left: 0;
              "></div>
            </div>

            <!-- Hue + Alpha bars -->
            <div style="display: flex; gap: 8px;">
              <!-- Hue bar -->
              <div style="position: relative;">
                <canvas id="cp-hue-bar" width="16" height="180" style="
                  display: block; border-radius: 4px; cursor: pointer;
                  border: 1px solid rgba(255,255,255,0.08);
                "></canvas>
                <div id="cp-hue-thumb" style="
                  position: absolute;
                  left: -3px; width: 22px; height: 5px;
                  background: #fff;
                  border: 1px solid rgba(0,0,0,0.5);
                  border-radius: 2px;
                  pointer-events: none;
                  top: 0;
                "></div>
              </div>

              <!-- Alpha bar -->
              <div style="position: relative;">
                <canvas id="cp-alpha-bar" width="16" height="180" style="
                  display: block; border-radius: 4px; cursor: pointer;
                  border: 1px solid rgba(255,255,255,0.08);
                "></canvas>
                <div id="cp-alpha-thumb" style="
                  position: absolute;
                  left: -3px; width: 22px; height: 5px;
                  background: #fff;
                  border: 1px solid rgba(0,0,0,0.5);
                  border-radius: 2px;
                  pointer-events: none;
                  bottom: 0;
                "></div>
              </div>
            </div>
          </div>

          <!-- Hex + RGB inputs -->
          <div style="display: flex; gap: 8px; align-items: flex-end;">
            <!-- Hex -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 10px; color: #5a6880; font-family: var(--font-ui);">HEX</label>
              <input id="cp-hex" type="text" maxlength="9" value="#000000" style="
                width: 80px; padding: 5px 7px; font-size: 12px;
                font-family: monospace; background: #0e1117;
                border: 1px solid rgba(255,255,255,0.1); border-radius: 5px;
                color: #e8edf5; outline: none;
              ">
            </div>

            <!-- R G B -->
            <div style="display: flex; gap: 4px;">
              ${['R','G','B'].map(c => `
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                  <label style="font-size: 10px; color: #5a6880; font-family: var(--font-ui);">${c}</label>
                  <input id="cp-${c.toLowerCase()}" type="number" min="0" max="255" style="
                    width: 44px; padding: 5px 4px; font-size: 12px;
                    font-family: var(--font-ui); background: #0e1117;
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 5px;
                    color: #e8edf5; outline: none; text-align: center;
                    -moz-appearance: textfield;
                  ">
                </div>
              `).join('')}
              <!-- Alpha % -->
              <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                <label style="font-size: 10px; color: #5a6880; font-family: var(--font-ui);">A%</label>
                <input id="cp-alpha-in" type="number" min="0" max="100" style="
                  width: 44px; padding: 5px 4px; font-size: 12px;
                  font-family: var(--font-ui); background: #0e1117;
                  border: 1px solid rgba(255,255,255,0.1); border-radius: 5px;
                  color: #e8edf5; outline: none; text-align: center;
                  -moz-appearance: textfield;
                ">
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div style="display: flex; gap: 8px; align-items: center;">
            <div id="cp-preview-orig" style="
              width: 36px; height: 36px; border-radius: 6px;
              border: 1px solid rgba(255,255,255,0.1);
              flex-shrink: 0;
              background-image: linear-gradient(45deg,#333 25%,transparent 25%),
                linear-gradient(-45deg,#333 25%,transparent 25%),
                linear-gradient(45deg,transparent 75%,#333 75%),
                linear-gradient(-45deg,transparent 75%,#333 75%);
              background-size: 8px 8px;
              background-position: 0 0,0 4px,4px -4px,-4px 0;
              background-color: #1a1a1a;
              position: relative; overflow: hidden;
            ">
              <div id="cp-orig-fill" style="position: absolute; inset: 0;"></div>
            </div>
            <div id="cp-preview-new" style="
              width: 36px; height: 36px; border-radius: 6px;
              border: 1px solid rgba(255,255,255,0.1);
              flex-shrink: 0;
              background-image: linear-gradient(45deg,#333 25%,transparent 25%),
                linear-gradient(-45deg,#333 25%,transparent 25%),
                linear-gradient(45deg,transparent 75%,#333 75%),
                linear-gradient(-45deg,transparent 75%,#333 75%);
              background-size: 8px 8px;
              background-position: 0 0,0 4px,4px -4px,-4px 0;
              background-color: #1a1a1a;
              position: relative; overflow: hidden;
            ">
              <div id="cp-new-fill" style="position: absolute; inset: 0;"></div>
            </div>
            <span id="cp-color-name" style="font-size: 11px; color: #8896b0; font-family: var(--font-ui); flex: 1;"></span>
          </div>

          <!-- Recent colors -->
          <div>
            <div style="font-size: 10px; color: #5a6880; margin-bottom: 6px; font-family: var(--font-ui); text-transform: uppercase; letter-spacing: 0.06em;">Recentes</div>
            <div id="cp-recent-swatches" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>
          </div>

          <!-- Saved colors quick-access -->
          <div>
            <div style="font-size: 10px; color: #5a6880; margin-bottom: 6px; font-family: var(--font-ui); text-transform: uppercase; letter-spacing: 0.06em;">Cores salvas</div>
            <div id="cp-saved-swatches" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>
          </div>
        </div>

        <!-- Footer -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: #141928;
          gap: 8px;
        ">
          <button id="cp-save-color" style="
            padding: 5px 10px; font-size: 11px; background: #1a2030;
            border: 1px solid rgba(255,255,255,0.1); border-radius: 5px;
            color: #8896b0; cursor: pointer; font-family: var(--font-ui);
          ">+ Salvar cor</button>
          <div style="display: flex; gap: 6px;">
            <button id="cp-cancel" style="
              padding: 6px 14px; font-size: 12px; background: #1a2030;
              border: 1px solid rgba(255,255,255,0.12); border-radius: 6px;
              color: #e8edf5; cursor: pointer; font-family: var(--font-ui);
            ">Cancelar</button>
            <button id="cp-ok" style="
              padding: 6px 14px; font-size: 12px; font-weight: 600;
              background: #7BC4EC; border: 1px solid #7BC4EC; border-radius: 6px;
              color: #000; cursor: pointer; font-family: var(--font-ui);
            ">OK</button>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(el)
    this._el = el
    this._bindEvents()
    this._drawHueBar()
    this._drawAlphaBar()
    this._drawSLCanvas()
  }

  /* ── Events ─────────────────────────────────────────────── */
  _bindEvents() {
    const el = this._el

    /* close buttons */
    el.querySelector('#cp-close').addEventListener('click', () => this.close(null))
    el.querySelector('#cp-cancel').addEventListener('click', () => {
      this._setFromHex(this._originalHex)
      this._updateAll()
      this.close(null)
    })
    el.querySelector('#cp-ok').addEventListener('click', () => {
      const hex = this._hexValue()
      this._addRecentColor(hex)
      this.close(hex)
    })

    /* click outside */
    el.addEventListener('click', (e) => {
      if (e.target === el) this.close(null)
    })

    /* SL canvas */
    const slCanvas = el.querySelector('#cp-sl-canvas')
    slCanvas.addEventListener('mousedown', (e) => {
      this._draggingCanvas = true
      this._pickSL(e, slCanvas)
    })

    /* Hue bar */
    const hueBar = el.querySelector('#cp-hue-bar')
    hueBar.addEventListener('mousedown', (e) => {
      this._draggingHue = true
      this._pickHue(e, hueBar)
    })

    /* Alpha bar */
    const alphaBar = el.querySelector('#cp-alpha-bar')
    alphaBar.addEventListener('mousedown', (e) => {
      this._draggingAlpha = true
      this._pickAlpha(e, alphaBar)
    })

    /* Global mouse events */
    document.addEventListener('mousemove', (e) => {
      if (this._draggingCanvas) this._pickSL(e, slCanvas)
      if (this._draggingHue) this._pickHue(e, hueBar)
      if (this._draggingAlpha) this._pickAlpha(e, alphaBar)
    })
    document.addEventListener('mouseup', () => {
      this._draggingCanvas = false
      this._draggingHue = false
      this._draggingAlpha = false
    })

    /* Hex input */
    const hexIn = el.querySelector('#cp-hex')
    hexIn.addEventListener('input', () => {
      const v = hexIn.value
      if (/^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{8}$/.test(v)) {
        this._setFromHex(v)
        this._updateAll(true)
      }
    })
    hexIn.addEventListener('focus', () => hexIn.select())

    /* RGB inputs */
    ;['r', 'g', 'b'].forEach(c => {
      el.querySelector(`#cp-${c}`).addEventListener('input', () => this._updateFromRGB())
    })
    el.querySelector('#cp-alpha-in').addEventListener('input', () => {
      const v = parseFloat(el.querySelector('#cp-alpha-in').value)
      if (!isNaN(v)) {
        this._alpha = Math.max(0, Math.min(1, v / 100))
        this._updateAll(true)
      }
    })

    /* Save color */
    el.querySelector('#cp-save-color').addEventListener('click', () => {
      this._savedColors = this._savedColors || []
      const hex = this._hexValue()
      if (!this._savedColors.includes(hex)) {
        this._savedColors.push(hex)
        this._renderSavedSwatches()
      }
    })

    /* EyeDropper API */
    el.querySelector('#cp-eyedropper')?.addEventListener('click', async () => {
      if (!window.EyeDropper) {
        alert('EyeDropper API não disponível neste navegador.')
        return
      }
      try {
        const picker = new window.EyeDropper()
        const result = await picker.open()
        const hex = result.sRGBHex
        this._setFromHex(hex)
        this._updateAll()
      } catch (e) {
        // User cancelled or error
      }
    })
  }

  /* ── Color picking ──────────────────────────────────────── */
  _pickSL(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    // SL canvas: x = saturation, y = (1 - lightness mapped)
    this._sat = x * 100
    // Map y to lightness: top=100%, bottom=0% in HSL terms, but we use HSL differently
    // We use the standard: white→pure→black gradient
    // So lightness = 100 - y*50 at sat=0 → actually let's use HSV-to-HSL conversion
    this._computeHSLfromSV(x, 1 - y)
    this._updateAll(true)
    this._updateSLThumb(x, y)
  }

  _computeHSLfromSV(sv, vv) {
    // sv = saturation value (0-1), vv = value (0-1)
    const l = vv * (1 - sv / 2)
    const s = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1 - l)
    this._sat = s * 100
    this._lum = l * 100
  }

  _pickHue(e, bar) {
    const rect = bar.getBoundingClientRect()
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    this._hue = y * 360
    this._drawSLCanvas()
    this._drawAlphaBar()
    this._updateAll(true)
    this._el.querySelector('#cp-hue-thumb').style.top = `${y * rect.height - 2}px`
  }

  _pickAlpha(e, bar) {
    const rect = bar.getBoundingClientRect()
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    this._alpha = 1 - y
    this._updateAll(true)
    this._el.querySelector('#cp-alpha-thumb').style.top = `${y * rect.height - 2}px`
  }

  _updateFromRGB() {
    const el = this._el
    const r = parseInt(el.querySelector('#cp-r').value) || 0
    const g = parseInt(el.querySelector('#cp-g').value) || 0
    const b = parseInt(el.querySelector('#cp-b').value) || 0
    const [h, s, l] = this._rgbToHsl(r, g, b)
    this._hue = h
    this._sat = s
    this._lum = l
    this._drawSLCanvas()
    this._drawHueBar()
    this._drawAlphaBar()
    this._updateAll(true)
  }

  /* ── Canvas drawing ─────────────────────────────────────── */
  _drawSLCanvas() {
    const canvas = this._el.querySelector('#cp-sl-canvas')
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    // Hue base gradient (left→right: white to hue color)
    const hGrad = ctx.createLinearGradient(0, 0, W, 0)
    hGrad.addColorStop(0, '#fff')
    hGrad.addColorStop(1, `hsl(${this._hue},100%,50%)`)
    ctx.fillStyle = hGrad
    ctx.fillRect(0, 0, W, H)

    // Dark gradient (top→bottom: transparent to black)
    const dGrad = ctx.createLinearGradient(0, 0, 0, H)
    dGrad.addColorStop(0, 'rgba(0,0,0,0)')
    dGrad.addColorStop(1, '#000')
    ctx.fillStyle = dGrad
    ctx.fillRect(0, 0, W, H)
  }

  _drawHueBar() {
    const canvas = this._el.querySelector('#cp-hue-bar')
    const ctx = canvas.getContext('2d')
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
    for (let i = 0; i <= 6; i++) {
      grad.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`)
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  _drawAlphaBar() {
    const canvas = this._el.querySelector('#cp-alpha-bar')
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    // Checkered
    const sz = 6
    for (let y = 0; y < H; y += sz) {
      for (let x = 0; x < W; x += sz) {
        ctx.fillStyle = ((Math.floor(x/sz) + Math.floor(y/sz)) % 2 === 0) ? '#555' : '#888'
        ctx.fillRect(x, y, sz, sz)
      }
    }

    const color = `hsl(${this._hue},${this._sat}%,${this._lum}%)`
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, color)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  /* ── Update UI ──────────────────────────────────────────── */
  _updateAll(skipHex = false) {
    const el = this._el
    const rgba = this._currentRgba()
    const hex = this._hexValue()

    if (!skipHex) el.querySelector('#cp-hex').value = hex

    const [r, g, b] = this._hslToRgb(this._hue, this._sat, this._lum)
    el.querySelector('#cp-r').value = r
    el.querySelector('#cp-g').value = g
    el.querySelector('#cp-b').value = b
    el.querySelector('#cp-alpha-in').value = Math.round(this._alpha * 100)

    el.querySelector('#cp-new-fill').style.background = rgba
    el.querySelector('#cp-orig-fill').style.background = this._originalHex ?? rgba

    // Update SL thumb position
    const { sv, vv } = this._hslToSV()
    const slCanvas = el.querySelector('#cp-sl-canvas')
    const W = slCanvas.width, H = slCanvas.height
    const tx = sv * W, ty = (1 - vv) * H
    const thumb = el.querySelector('#cp-sl-thumb')
    thumb.style.left = tx + 'px'
    thumb.style.top = ty + 'px'

    // Update hue thumb
    const hueCanvas = el.querySelector('#cp-hue-bar')
    const hy = (this._hue / 360) * hueCanvas.height
    el.querySelector('#cp-hue-thumb').style.top = `${hy - 2}px`

    // Update alpha thumb
    const alphaCanvas = el.querySelector('#cp-alpha-bar')
    const ay = (1 - this._alpha) * alphaCanvas.height
    el.querySelector('#cp-alpha-thumb').style.top = `${ay - 2}px`

    // Redraw alpha bar (color-dependent)
    this._drawAlphaBar()

    if (this._onChangeCb) this._onChangeCb(rgba)
    this._updateWcagBadge(hex)
  }

  _luminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  _wcagRatio(hex1, hex2) {
    const parse = h => {
      const clean = h.replace('#', '');
      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
      ];
    };
    const [r1, g1, b1] = parse(hex1);
    const [r2, g2, b2] = parse(hex2);
    const l1 = this._luminance(r1, g1, b1);
    const l2 = this._luminance(r2, g2, b2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  _updateWcagBadge(currentHex) {
    const badge = this._el?.querySelector('#cp-wcag-badge');
    if (!badge) return;
    const ratio = this._wcagRatio(currentHex, '#ffffff');
    const ratioDark = this._wcagRatio(currentHex, '#000000');
    const best = Math.max(ratio, ratioDark);
    const aa = best >= 4.5;
    const aaa = best >= 7;
    const text = best.toFixed(1);
    badge.textContent = `${text}:1`;
    badge.style.display = 'inline-block';
    if (aaa) {
      badge.style.background = '#1a7f37';
      badge.style.color = '#fff';
    } else if (aa) {
      badge.style.background = '#c78c1a';
      badge.style.color = '#fff';
    } else {
      badge.style.background = '#c42b2b';
      badge.style.color = '#fff';
    }
  }

  _updateSLThumb(x, y) {
    const canvas = this._el.querySelector('#cp-sl-canvas')
    const thumb = this._el.querySelector('#cp-sl-thumb')
    thumb.style.left = `${x * canvas.width}px`
    thumb.style.top = `${y * canvas.height}px`
  }

  _renderSavedSwatches() {
    const container = this._el.querySelector('#cp-saved-swatches')
    container.innerHTML = ''
    ;(this._savedColors || []).forEach(hex => {
      const s = document.createElement('div')
      s.style.cssText = `
        width: 20px; height: 20px; border-radius: 4px;
        background: ${hex}; border: 1px solid rgba(255,255,255,0.1);
        cursor: pointer; flex-shrink: 0;
      `
      s.title = hex
      s.addEventListener('click', () => {
        this._setFromHex(hex)
        this._drawSLCanvas()
        this._drawAlphaBar()
        this._updateAll()
      })
      container.appendChild(s)
    })
  }

  _renderRecentSwatches() {
    const container = this._el.querySelector('#cp-recent-swatches')
    if (!container) return
    container.innerHTML = ''
    ;(this._recentColors || []).forEach(hex => {
      const s = document.createElement('div')
      s.style.cssText = `
        width: 20px; height: 20px; border-radius: 4px;
        background: ${hex}; border: 1px solid rgba(255,255,255,0.15);
        cursor: pointer; flex-shrink: 0;
      `
      s.title = hex
      s.addEventListener('click', () => {
        this._setFromHex(hex)
        this._drawSLCanvas()
        this._drawAlphaBar()
        this._updateAll()
      })
      container.appendChild(s)
    })
  }

  loadSavedColors(colors) {
    this._savedColors = colors.map(c => c.hex)
    this._renderSavedSwatches()
  }

  /* ── Color conversion helpers ───────────────────────────── */
  _hslToRgb(h, s, l) {
    s /= 100; l /= 100
    const k = n => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)]
  }

  _rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h, s
    const l = (max + min) / 2
    if (max === min) { h = s = 0 }
    else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }
    return [h * 360, s * 100, l * 100]
  }

  _hslToSV() {
    const s = this._sat / 100, l = this._lum / 100
    const vv = l + s * Math.min(l, 1 - l)
    const sv = vv === 0 ? 0 : 2 * (1 - l / vv)
    return { sv, vv }
  }

  _currentRgba() {
    const [r, g, b] = this._hslToRgb(this._hue, this._sat, this._lum)
    if (this._alpha >= 1) return `rgb(${r},${g},${b})`
    return `rgba(${r},${g},${b},${this._alpha.toFixed(3)})`
  }

  _hexValue() {
    const [r, g, b] = this._hslToRgb(this._hue, this._sat, this._lum)
    const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')
    if (this._alpha < 1) {
      const a = Math.round(this._alpha * 255).toString(16).padStart(2,'0')
      return hex + a
    }
    return hex
  }

  _setFromHex(hex) {
    let r, g, b, a = 255
    const clean = hex.replace('#','')
    if (clean.length === 6) {
      r = parseInt(clean.slice(0,2),16)
      g = parseInt(clean.slice(2,4),16)
      b = parseInt(clean.slice(4,6),16)
    } else if (clean.length === 8) {
      r = parseInt(clean.slice(0,2),16)
      g = parseInt(clean.slice(2,4),16)
      b = parseInt(clean.slice(4,6),16)
      a = parseInt(clean.slice(6,8),16)
    } else { return }
    const [h, s, l] = this._rgbToHsl(r, g, b)
    this._hue = h
    this._sat = s
    this._lum = l
    this._alpha = a / 255
    this._drawSLCanvas()
    this._drawHueBar()
    this._drawAlphaBar()
  }
}
