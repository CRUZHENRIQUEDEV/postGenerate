/* ============================================================
   PostGenerate — Canvas Engine v2
   ============================================================ */

import { getFormat } from "./formats.js";

/* ── Animation CSS (injected once) ──────────────────────── */
const ANIM_CSS_ID = "pg-anim-styles";
export function injectAnimCSS() {
  if (document.getElementById(ANIM_CSS_ID)) return;
  const s = document.createElement("style");
  s.id = ANIM_CSS_ID;
  s.textContent = `
    @keyframes pg-fade    { from { opacity:0 } to { opacity:1 } }
    @keyframes pg-slide-up    { from { opacity:0; transform:translateY(6%)  } to { opacity:1; transform:translateY(0) } }
    @keyframes pg-slide-down  { from { opacity:0; transform:translateY(-6%) } to { opacity:1; transform:translateY(0) } }
    @keyframes pg-slide-left  { from { opacity:0; transform:translateX(-8%)} to { opacity:1; transform:translateX(0) } }
    @keyframes pg-slide-right { from { opacity:0; transform:translateX(8%) } to { opacity:1; transform:translateX(0) } }
    @keyframes pg-scale   { from { opacity:0; transform:scale(0.82) } to { opacity:1; transform:scale(1) } }
    @keyframes pg-blur-in { from { opacity:0; filter:blur(18px) }    to { opacity:1; filter:blur(0) } }
    @keyframes pg-bounce  { 0%{opacity:0;transform:scale(0.6)} 60%{transform:scale(1.08)} 80%{transform:scale(0.96)} 100%{opacity:1;transform:scale(1)} }
    @keyframes pg-move-up { from { opacity:0; transform:translateY(14%) } to { opacity:1; transform:translateY(0) } }
    @keyframes pg-move-down { from { opacity:0; transform:translateY(-14%) } to { opacity:1; transform:translateY(0) } }
    @keyframes pg-move-left { from { opacity:0; transform:translateX(-14%) } to { opacity:1; transform:translateX(0) } }
    @keyframes pg-move-right { from { opacity:0; transform:translateX(14%) } to { opacity:1; transform:translateX(0) } }
    @keyframes pg-rotate-in { from { opacity:0; transform:rotate(-12deg) scale(0.84) } to { opacity:1; transform:rotate(0deg) scale(1) } }

    .pg-layer.pg-playing[data-anim]:not([data-anim="none"]) {
      animation-fill-mode: both;
      animation-timing-function: cubic-bezier(0.22,1,0.36,1);
    }
    .pg-layer.pg-paused { opacity: 0 !important; }
  `;
  document.head.appendChild(s);
}

/* ── Shared anim defaults ───────────────────────────────── */
const ANIM_DEFAULTS = {
  animIn: "none", // 'none'|'fade'|'slide-up'|'slide-down'|'slide-left'|'slide-right'|'scale'|'blur-in'|'bounce'|'move-up'|'move-down'|'move-left'|'move-right'|'rotate-in'
  animDuration: 0.65, // seconds
  animDelay: 0, // seconds
  animEasing: "cubic-bezier(0.22,1,0.36,1)",
};

/* ── Default state ──────────────────────────────────────── */
export function createDefaultState(formatId = "ig-feed-square") {
  return {
    formatId,
    background: {
      type: "solid",
      color: "#000000",
      gradient: {
        type: "linear",
        from: "#000000",
        to: "#0e1a2e",
        angle: 135,
        reach: 100,
        opacity: 100,
        fromOpacity: 100,
        toOpacity: 100,
      },
      image: null,
      imageSize: "cover",
    },
    layers: [
      makeBadgeLayer("layer-badge", "Badge", "Simple Bridge"),
      makeHeadlineLayer(
        "layer-headline",
        "Headline",
        "Modelar pontes\nnunca foi\ntão rápido.",
      ),
      makeSubLayer(
        "layer-sub",
        "Subtítulo",
        "Do levantamento de campo ao modelo 3D completo\n— com quantitativos, insumos para orçamento\ne exportação IFC gerados em segundos.",
      ),
    ],
  };
}

/* ── Layer factories ────────────────────────────────────── */
export function makeBadgeLayer(id, name, content = "Badge") {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? "Badge",
    type: "text",
    subtype: "badge",
    visible: true,
    locked: false,
    x: 8.5,
    y: 9.5,
    width: "auto",
    content,
    fontFamily: "-apple-system",
    fontSize: 2.1,
    fontWeight: 500,
    fontStyle: "normal",
    color: "#7BC4EC",
    textAlign: "left",
    lineHeight: 1.2,
    letterSpacing: "0.07em",
    textTransform: "none",
    opacity: 1,
    /* Badge border */
    badgeBg: "transparent",
    badgeBorderColor: "rgba(123,196,236,0.4)",
    badgeBorderWidth: 1,
    badgeBorderRadius: 100,
    badgePaddingX: 1.1,
    badgePaddingY: 0.33,
    ...ANIM_DEFAULTS,
    animIn: "fade",
    animDelay: 0,
  };
}

export function makeHeadlineLayer(id, name, content = "Título\nPrincipal") {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? "Headline",
    type: "text",
    subtype: "headline",
    visible: true,
    locked: false,
    x: 8.5,
    y: 18,
    width: 75,
    content,
    fontFamily: "-apple-system",
    fontSize: 9.0,
    fontWeight: 800,
    fontStyle: "normal",
    color: "#ffffff",
    textAlign: "left",
    lineHeight: 1.02,
    letterSpacing: "-0.03em",
    textTransform: "none",
    opacity: 1,
    /* Box border */
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 2,
    borderRadius: 8,
    borderPaddingX: 32,
    borderPaddingY: 16,
    ...ANIM_DEFAULTS,
    animIn: "slide-left",
    animDelay: 0.1,
  };
}

export function makeSubLayer(id, name, content = "Texto de suporte aqui.") {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? "Subtítulo",
    type: "text",
    subtype: "sub",
    visible: true,
    locked: false,
    x: 8.5,
    y: 68,
    width: 62,
    content,
    fontFamily: "-apple-system",
    fontSize: 2.3,
    fontWeight: 400,
    fontStyle: "normal",
    color: "rgba(255,255,255,0.62)",
    textAlign: "left",
    lineHeight: 1.55,
    letterSpacing: "0.01em",
    textTransform: "none",
    opacity: 1,
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderRadius: 6,
    borderPaddingX: 16,
    borderPaddingY: 8,
    ...ANIM_DEFAULTS,
    animIn: "slide-up",
    animDelay: 0.22,
  };
}

export function makeTextLayer(id, name) {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? "Texto",
    type: "text",
    subtype: "body",
    visible: true,
    locked: false,
    x: 8.5,
    y: 50,
    width: 65,
    content: "Novo texto",
    fontFamily: "-apple-system",
    fontSize: 3.5,
    fontWeight: 400,
    fontStyle: "normal",
    color: "#ffffff",
    textAlign: "left",
    lineHeight: 1.4,
    letterSpacing: "0em",
    textTransform: "none",
    opacity: 1,
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    borderRadius: 6,
    borderPaddingX: 16,
    borderPaddingY: 8,
    ...ANIM_DEFAULTS,
  };
}

export function makeImageLayer(id, name, src) {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? "Imagem",
    type: "image",
    subtype: "image",
    visible: true,
    locked: false,
    x: 50,
    y: 20,
    width: 40,
    height: 40,
    src: src ?? "",
    objectFit: "contain",
    imageZoom: 1,
    opacity: 1,
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 2,
    borderRadius: 0,
    ...ANIM_DEFAULTS,
    animIn: "scale",
  };
}

export function makeIconLayer(id, name, iconId = "", svg = "") {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? "Ícone",
    type: "icon",
    subtype: "icon",
    visible: true,
    locked: false,
    x: 40,
    y: 40,
    size: 8, // % of canvas width
    iconId, // e.g. 'ph:star-bold'
    svg, // raw SVG string (already using currentColor)
    color: "#ffffff",
    background: "transparent",
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.32)",
    borderWidth: 1,
    borderRadius: 12,
    opacity: 1,
    ...ANIM_DEFAULTS,
    animIn: "scale",
  };
}

export function makeShapeLayer(id, name) {
  return {
    id: id ?? crypto.randomUUID(),
    name: name ?? "Forma",
    type: "shape",
    subtype: "rect",
    visible: true,
    locked: false,
    x: 8.5,
    y: 85,
    width: 15,
    height: 0.4,
    fillColor: "#7BC4EC",
    strokeColor: "transparent",
    strokeWidth: 0,
    borderRadius: 100,
    opacity: 1,
    ...ANIM_DEFAULTS,
    animIn: "slide-left",
    animDelay: 0.05,
  };
}

/* ── Canvas Engine ──────────────────────────────────────── */
export class CanvasEngine {
  constructor(canvasEl) {
    this._el = canvasEl;
    this._state = createDefaultState();
    this._selectedId = null;
    this._listeners = {};
    this._previewW = 0;
    this._previewH = 0;
    this._scale = 1;
    this._animMode = false; // true while playing preview animation
    injectAnimCSS();
  }

  /* ── State ────────────────────────────────────────────── */
  getState() {
    return structuredClone(this._state);
  }

  setState(state) {
    this._state = structuredClone(state);
    this._selectedId = null;
    this.render();
    this._emit("stateChange", this._state);
    this._emit("selectionChange", null);
  }

  updateBackground(patch) {
    Object.assign(this._state.background, patch);
    this._renderBackground();
    this._emit("stateChange", this._state);
  }

  updateLayer(id, patch) {
    const layer = this._state.layers.find((l) => l.id === id);
    if (!layer) return;
    Object.assign(layer, patch);
    this._renderLayer(layer);
    this._emit("layerUpdate", layer);
    this._emit("stateChange", this._state);
  }

  addLayer(layer) {
    this._state.layers.push(layer);
    this.render();
    this.selectLayer(layer.id);
    this._emit("layersChange", this._state.layers);
    this._emit("stateChange", this._state);
  }

  removeLayer(id) {
    const idx = this._state.layers.findIndex((l) => l.id === id);
    if (idx === -1) return;
    this._state.layers.splice(idx, 1);
    if (this._selectedId === id) {
      this._selectedId = null;
      this._emit("selectionChange", null);
    }
    this.render();
    this._emit("layersChange", this._state.layers);
    this._emit("stateChange", this._state);
  }

  moveLayer(id, direction) {
    const layers = this._state.layers;
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= layers.length) return;
    [layers[idx], layers[newIdx]] = [layers[newIdx], layers[idx]];
    this.render();
    this._emit("layersChange", layers);
    this._emit("stateChange", this._state);
  }

  duplicateLayer(id) {
    const src = this._state.layers.find((l) => l.id === id);
    if (!src) return;
    const clone = structuredClone(src);
    clone.id = crypto.randomUUID();
    clone.name = src.name + " (cópia)";
    clone.x = (src.x ?? 0) + 2;
    clone.y = (src.y ?? 0) + 2;
    this._state.layers.push(clone);
    this.render();
    this.selectLayer(clone.id);
    this._emit("layersChange", this._state.layers);
    this._emit("stateChange", this._state);
  }

  selectLayer(id) {
    this._selectedId = id;
    this._el.querySelectorAll(".pg-layer").forEach((el) => {
      el.classList.toggle("pg-layer--selected", el.dataset.layerId === id);
    });
    const layer = this._state.layers.find((l) => l.id === id) ?? null;
    this._emit("selectionChange", layer);
  }

  getSelectedLayer() {
    return this._state.layers.find((l) => l.id === this._selectedId) ?? null;
  }

  setFormat(formatId) {
    this._state.formatId = formatId;
    this.render();
    this._emit("formatChange", formatId);
  }

  getLayers() {
    return this._state.layers;
  }

  /* ── Preview sizing ───────────────────────────────────── */
  setPreviewSize(availW, availH) {
    const fmt = getFormat(this._state.formatId);
    const scaleW = availW / fmt.width;
    const scaleH = availH / fmt.height;
    this._scale = Math.min(scaleW, scaleH, 1);
    this._previewW = Math.round(fmt.width * this._scale);
    this._previewH = Math.round(fmt.height * this._scale);

    this._el.style.width = fmt.width + "px";
    this._el.style.height = fmt.height + "px";
    this._el.style.transform = `scale(${this._scale})`;
    this._el.style.transformOrigin = "top left";

    const wrapper = this._el.parentElement;
    if (wrapper) {
      wrapper.style.width = this._previewW + "px";
      wrapper.style.height = this._previewH + "px";
    }

    this._emit("scaleChange", {
      scale: this._scale,
      previewW: this._previewW,
      previewH: this._previewH,
    });
  }

  getScale() {
    return this._scale;
  }
  getPreviewDims() {
    return { w: this._previewW, h: this._previewH };
  }

  /* ── Render ───────────────────────────────────────────── */
  render() {
    const fmt = getFormat(this._state.formatId);
    this._el.style.width = fmt.width + "px";
    this._el.style.height = fmt.height + "px";

    this._el.querySelectorAll(".pg-layer").forEach((el) => el.remove());
    this._renderBackground();

    this._state.layers.forEach((layer) => {
      if (!layer.visible) return;
      const el = this._buildLayerEl(layer, fmt.width, fmt.height);
      this._el.appendChild(el);
    });
  }

  _renderBackground() {
    let bgEl = this._el.querySelector(".pg-bg");
    if (!bgEl) {
      bgEl = document.createElement("div");
      bgEl.className = "pg-bg";
      bgEl.style.cssText = "position:absolute;inset:0;pointer-events:none;";
      this._el.prepend(bgEl);
    }
    const bg = this._state.background;
    if (bg.type === "solid") {
      bgEl.style.background = bg.color;
    } else if (bg.type === "gradient") {
      const g = bg.gradient;
      const reach = Math.max(0, Math.min(100, g.reach ?? 100));
      const opacity = Math.max(0, Math.min(100, g.opacity ?? 100));
      const fromOpacity = Math.max(0, Math.min(100, g.fromOpacity ?? 100));
      const toOpacity = Math.max(0, Math.min(100, g.toOpacity ?? 100));
      const from = this._withOpacity(g.from, (fromOpacity * opacity) / 100);
      const to = this._withOpacity(g.to, (toOpacity * opacity) / 100);
      bgEl.style.background =
        g.type === "linear"
          ? `linear-gradient(${g.angle}deg, ${from} 0%, ${to} ${reach}%)`
          : `radial-gradient(ellipse at center, ${from} 0%, ${to} ${reach}%)`;
    } else if (bg.type === "image" && bg.image) {
      bgEl.style.background = `url(${bg.image}) center/${bg.imageSize ?? "cover"} no-repeat`;
    }
  }

  _renderLayer(layer) {
    const fmt = getFormat(this._state.formatId);
    const existing = this._el.querySelector(`[data-layer-id="${layer.id}"]`);
    if (!layer.visible) {
      existing?.remove();
      return;
    }
    const newEl = this._buildLayerEl(layer, fmt.width, fmt.height);
    if (existing) existing.replaceWith(newEl);
    else this._el.appendChild(newEl);
  }

  _buildLayerEl(layer, cw, ch) {
    const el = document.createElement("div");
    el.className = "pg-layer";
    el.dataset.layerId = layer.id;
    el.dataset.anim = layer.animIn ?? "none";

    const x = ((layer.x ?? 0) * cw) / 100;
    const y = ((layer.y ?? 0) * ch) / 100;
    el.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      opacity: ${layer.opacity ?? 1};
      cursor: pointer;
      will-change: transform, opacity, filter;
    `;

    if (
      layer.type !== "icon" &&
      layer.width !== "auto" &&
      layer.width != null
    ) {
      el.style.width = `${(layer.width * cw) / 100}px`;
    }

    if (layer.type === "text") this._applyTextStyles(el, layer, cw, ch);
    else if (layer.type === "image") this._applyImageStyles(el, layer, cw, ch);
    else if (layer.type === "icon") this._applyIconStyles(el, layer, cw, ch);
    else if (layer.type === "shape") this._applyShapeStyles(el, layer, cw, ch);

    if (layer.id === this._selectedId) el.classList.add("pg-layer--selected");

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectLayer(layer.id);
    });

    return el;
  }

  _applyTextStyles(el, layer, cw, ch) {
    const fs = (layer.fontSize * cw) / 100;

    if (layer.subtype === "badge") {
      const span = document.createElement("span");
      const bpx = (layer.badgePaddingX * cw) / 100;
      const bpy = (layer.badgePaddingY * cw) / 100;
      const bbw = layer.badgeBorderWidth ?? 1;
      span.style.cssText = `
        display: inline-block;
        font-size: ${fs}px;
        font-family: '${layer.fontFamily}', sans-serif;
        font-weight: ${layer.fontWeight};
        font-style: ${layer.fontStyle ?? "normal"};
        color: ${layer.color};
        letter-spacing: ${layer.letterSpacing};
        text-transform: ${layer.textTransform ?? "none"};
        line-height: ${layer.lineHeight};
        padding: ${bpy}px ${bpx}px;
        background: ${layer.badgeBg ?? "transparent"};
        border: ${bbw}px solid ${layer.badgeBorderColor};
        border-radius: ${layer.badgeBorderRadius ?? 100}px;
        white-space: nowrap;
      `;
      span.textContent = layer.content;
      span.style.pointerEvents = "none";
      el.appendChild(span);
    } else {
      el.style.fontSize = `${fs}px`;
      el.style.fontFamily = `'${layer.fontFamily}', sans-serif`;
      el.style.fontWeight = layer.fontWeight;
      el.style.fontStyle = layer.fontStyle ?? "normal";
      el.style.color = layer.color;
      el.style.textAlign = layer.textAlign ?? "left";
      el.style.lineHeight = layer.lineHeight;
      el.style.letterSpacing = layer.letterSpacing;
      el.style.textTransform = layer.textTransform ?? "none";
      el.style.whiteSpace = "pre-line";

      // Box border (non-badge text)
      if (layer.hasBorder) {
        const bw = ((layer.borderWidth ?? 2) * cw) / 1080;
        const px = ((layer.borderPaddingX ?? 16) * cw) / 1080;
        const py = ((layer.borderPaddingY ?? 8) * cw) / 1080;
        el.style.display = "inline-block";
        el.style.border = `${bw}px solid ${layer.borderColor ?? "rgba(255,255,255,0.3)"}`;
        el.style.borderRadius = `${layer.borderRadius ?? 8}px`;
        el.style.padding = `${py}px ${px}px`;
      }

      el.textContent = layer.content;
    }
  }

  _applyImageStyles(el, layer, cw, ch) {
    el.style.width = `${((layer.width ?? 40) * cw) / 100}px`;
    el.style.height = `${((layer.height ?? 40) * ch) / 100}px`;
    el.style.overflow = "hidden";
    el.style.borderRadius = `${((layer.borderRadius ?? 0) * cw) / 100}px`;
    if (layer.hasBorder) {
      const bw = ((layer.borderWidth ?? 2) * cw) / 1080;
      el.style.border = `${bw}px solid ${layer.borderColor ?? "rgba(255,255,255,0.28)"}`;
    }
    if (layer.src) {
      const img = document.createElement("img");
      img.src = layer.src;
      img.crossOrigin = "anonymous";
      img.style.cssText = `width:100%;height:100%;object-fit:${layer.objectFit ?? "contain"};display:block;`;
      img.style.transform = `scale(${Math.max(0.2, Math.min(4, layer.imageZoom ?? 1))})`;
      img.style.transformOrigin = "center center";
      img.style.pointerEvents = "none";
      el.appendChild(img);
    }
  }

  _applyIconStyles(el, layer, cw, ch) {
    const sz = ((layer.size ?? 8) * cw) / 100;
    el.style.width = sz + "px";
    el.style.height = sz + "px";
    el.style.color = layer.color ?? "#ffffff";
    el.style.background = layer.background ?? "transparent";
    el.style.borderRadius = `${layer.borderRadius ?? 12}px`;
    if (layer.hasBorder) {
      const bw = ((layer.borderWidth ?? 1) * cw) / 1080;
      el.style.border = `${bw}px solid ${layer.borderColor ?? "rgba(255,255,255,0.32)"}`;
    }
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";

    if (layer.svg) {
      el.innerHTML = layer.svg;
      const svgEl = el.querySelector("svg");
      if (svgEl) {
        svgEl.style.width = "100%";
        svgEl.style.height = "100%";
        svgEl.style.pointerEvents = "none";
      }
    }
  }

  _applyShapeStyles(el, layer, cw, ch) {
    el.style.width = `${((layer.width ?? 20) * cw) / 100}px`;
    el.style.height = `${((layer.height ?? 0.5) * ch) / 100}px`;
    el.style.background = layer.fillColor ?? "#7BC4EC";
    el.style.borderRadius = `${layer.borderRadius ?? 0}px`;
    if (layer.strokeWidth > 0) {
      el.style.outline = `${layer.strokeWidth}px solid ${layer.strokeColor}`;
    }
  }

  /* ── Animation playback ───────────────────────────────── */

  /**
   * Play all layer entry animations in the live preview.
   * Returns a Promise that resolves when all animations finish.
   */
  playAnimations() {
    this._animMode = true;
    const layers = this._el.querySelectorAll(".pg-layer");

    // First pass: hide everything
    layers.forEach((el) => {
      el.classList.remove("pg-playing");
      el.classList.add("pg-paused");
      el.style.animationName = "";
    });

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        let maxEnd = 0;

        layers.forEach((el) => {
          el.classList.remove("pg-paused");
          const layerId = el.dataset.layerId;
          const layer = this._state.layers.find((l) => l.id === layerId);
          if (!layer || layer.animIn === "none" || !layer.animIn) return;

          const dur = layer.animDuration ?? 0.65;
          const delay = layer.animDelay ?? 0;
          const ease = layer.animEasing ?? "cubic-bezier(0.22,1,0.36,1)";

          el.style.animationName = `pg-${layer.animIn}`;
          el.style.animationDuration = `${dur}s`;
          el.style.animationDelay = `${delay}s`;
          el.style.animationTimingFunction = ease;
          el.style.animationFillMode = "both";
          el.classList.add("pg-playing");

          maxEnd = Math.max(maxEnd, (delay + dur) * 1000);
        });

        setTimeout(() => {
          layers.forEach((el) => {
            el.classList.remove("pg-playing", "pg-paused");
            el.style.animationName = "";
          });
          this._animMode = false;
          resolve();
        }, maxEnd + 50);
      });
    });
  }

  /** Returns total animation duration in ms (max delay + duration across all layers) */
  getAnimDuration() {
    return this._state.layers.reduce((max, l) => {
      if (!l.animIn || l.animIn === "none") return max;
      return Math.max(
        max,
        ((l.animDelay ?? 0) + (l.animDuration ?? 0.65)) * 1000,
      );
    }, 500);
  }

  /* ── Event emitter ────────────────────────────────────── */
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
    return () => this.off(event, cb);
  }

  off(event, cb) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((fn) => fn !== cb);
  }

  _emit(event, data) {
    (this._listeners[event] ?? []).forEach((cb) => cb(data));
  }

  _withOpacity(color, opacityPercent = 100) {
    const alpha = Math.max(0, Math.min(1, (opacityPercent ?? 100) / 100));
    const c = String(color ?? "#000000").trim();
    if (c.startsWith("#")) {
      let hex = c.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        hex = hex
          .split("")
          .map((ch) => ch + ch)
          .join("");
      }
      if (hex.length === 8) hex = hex.slice(0, 6);
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    const rgbaMatch = c.match(
      /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/i,
    );
    if (rgbaMatch) {
      const r = Number(rgbaMatch[1]);
      const g = Number(rgbaMatch[2]);
      const b = Number(rgbaMatch[3]);
      const baseA =
        rgbaMatch[4] == null
          ? 1
          : Math.max(0, Math.min(1, Number(rgbaMatch[4])));
      return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, baseA * alpha))})`;
    }
    return c;
  }

  /* ── History ──────────────────────────────────────────── */
  _history = [];
  _historyIdx = -1;
  _maxHistory = 50;

  snapshot() {
    this._history = this._history.slice(0, this._historyIdx + 1);
    this._history.push(structuredClone(this._state));
    if (this._history.length > this._maxHistory) this._history.shift();
    this._historyIdx = this._history.length - 1;
  }

  undo() {
    if (this._historyIdx <= 0) return;
    this._historyIdx--;
    this._state = structuredClone(this._history[this._historyIdx]);
    this._selectedId = null;
    this.render();
    this._emit("stateChange", this._state);
    this._emit("layersChange", this._state.layers);
    this._emit("selectionChange", null);
  }

  redo() {
    if (this._historyIdx >= this._history.length - 1) return;
    this._historyIdx++;
    this._state = structuredClone(this._history[this._historyIdx]);
    this._selectedId = null;
    this.render();
    this._emit("stateChange", this._state);
    this._emit("layersChange", this._state.layers);
    this._emit("selectionChange", null);
  }

  canUndo() {
    return this._historyIdx > 0;
  }
  canRedo() {
    return this._historyIdx < this._history.length - 1;
  }
}
