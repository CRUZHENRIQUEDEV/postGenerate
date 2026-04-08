/* ============================================================
   PostGenerate — Export Engine
   Captures the post canvas using html2canvas and exports
   as PNG at full format resolution.
   Requires html2canvas (loaded via CDN in index.html).
   ============================================================ */

import { getFormat, FORMATS } from "./formats.js";

export class ExportEngine {
  constructor(canvasEngine) {
    this._engine = canvasEngine;
  }

  /**
   * Export the current canvas state as PNG.
   * @param {object} opts
   * @param {boolean} opts.transparent - If true, removes background layer
   * @param {string}  opts.formatId    - Override format (optional)
   * @param {string}  opts.filename    - Override download filename
   */
  async exportPNG({
    transparent = false,
    formatId,
    filename,
    download = true,
  } = {}) {
    const state = this._engine.getState();
    const fmtId = formatId ?? state.formatId;
    const fmt = getFormat(fmtId);

    // Build a hidden clone of the canvas at full resolution
    const clone = document.createElement("div");
    clone.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: ${fmt.width}px;
      height: ${fmt.height}px;
      overflow: hidden;
      z-index: -1;
    `;
    document.body.appendChild(clone);

    // Render state into clone (re-use canvas-engine render logic inline)
    const exportState = structuredClone(state);
    if (transparent) {
      // Remove background — let html2canvas handle transparency
    } else {
      // Apply background
      const bg = exportState.background;
      if (bg.type === "solid") clone.style.background = bg.color;
      else if (bg.type === "gradient") {
        const g = bg.gradient;
        const fromReach = Math.max(0, Math.min(100, g.fromReach ?? 0));
        const toReach = Math.max(0, Math.min(100, g.toReach ?? g.reach ?? 100));
        const fromOpacity = Math.max(0, Math.min(100, g.fromOpacity ?? g.opacity ?? 100));
        const toOpacity = Math.max(0, Math.min(100, g.toOpacity ?? g.opacity ?? 100));
        const from = this._withOpacity(g.from, fromOpacity);
        const to = this._withOpacity(g.to, toOpacity);

        // If any stop has low opacity, composite over solid fallback to avoid transparency
        if (fromOpacity < 100 || toOpacity < 100) {
          clone.style.background = g.to;
          clone.style.position = "relative";
          const overlay = document.createElement("div");
          overlay.style.cssText = `
            position: absolute; inset: 0;
            background: ${
              g.type === "linear"
                ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
                : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`
            };
          `;
          clone.appendChild(overlay);
        } else {
          clone.style.background =
            g.type === "linear"
              ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
              : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`;
        }
      } else if (bg.type === "image" && bg.image) {
        clone.style.background = `url(${bg.image}) center/${bg.imageSize ?? "cover"} no-repeat`;
      }
    }

    // Render layers
    for (const layer of exportState.layers) {
      if (!layer.visible) continue;
      const el = this._buildExportLayer(layer, fmt.width, fmt.height);
      clone.appendChild(el);
    }

    try {
      // Wait for fonts/images to load
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await window.html2canvas(clone, {
        width: fmt.width,
        height: fmt.height,
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: transparent ? null : null,
        logging: false,
      });

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      const name = filename ?? this._buildFilename(state, fmtId, "png");
      if (download) this._download(blob, name);
      return blob;
    } finally {
      clone.remove();
    }
  }

  async exportImage({
    format = "png",
    quality = 0.92,
    transparent = false,
    formatId,
    filename,
    download = true,
  } = {}) {
    const state = this._engine.getState();
    const fmtId = formatId ?? state.formatId;
    const fmt = getFormat(fmtId);

    const clone = document.createElement("div");
    clone.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: ${fmt.width}px;
      height: ${fmt.height}px;
      overflow: hidden;
      z-index: -1;
    `;
    document.body.appendChild(clone);

    const exportState = structuredClone(state);
    if (!transparent) {
      const bg = exportState.background;
      if (bg.type === "solid") clone.style.background = bg.color;
      else if (bg.type === "gradient") {
        const g = bg.gradient;
        const fromReach = Math.max(0, Math.min(100, g.fromReach ?? 0));
        const toReach = Math.max(0, Math.min(100, g.toReach ?? g.reach ?? 100));
        const fromOpacity = Math.max(0, Math.min(100, g.fromOpacity ?? g.opacity ?? 100));
        const toOpacity = Math.max(0, Math.min(100, g.toOpacity ?? g.opacity ?? 100));
        const from = this._withOpacity(g.from, fromOpacity);
        const to = this._withOpacity(g.to, toOpacity);

        if (fromOpacity < 100 || toOpacity < 100) {
          clone.style.background = g.to;
          clone.style.position = "relative";
          const overlay = document.createElement("div");
          overlay.style.cssText = `
            position: absolute; inset: 0;
            background: ${
              g.type === "linear"
                ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
                : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`
            };
          `;
          clone.appendChild(overlay);
        } else {
          clone.style.background = g.type === "linear"
            ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
            : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`;
        }
      } else if (bg.type === "image" && bg.image) {
        clone.style.background = `url(${bg.image}) center/${bg.imageSize ?? "cover"} no-repeat`;
      }
    }

    for (const layer of exportState.layers) {
      if (!layer.visible) continue;
      const el = this._buildExportLayer(layer, fmt.width, fmt.height);
      clone.appendChild(el);
    }

    try {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await window.html2canvas(clone, {
        width: fmt.width,
        height: fmt.height,
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: transparent ? null : "#000000",
        logging: false,
      });

      const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
      const qualityVal = format === "png" ? undefined : quality;
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, mimeType, qualityVal),
      );
      const ext = format === "jpeg" ? "jpg" : format;
      const name = filename ?? this._buildFilename(state, fmtId, ext);
      if (download) this._download(blob, name);
      return blob;
    } finally {
      clone.remove();
    }
  }

  async exportSVG({
    transparent = false,
    formatId,
    filename,
    download = true,
  } = {}) {
    const state = this._engine.getState();
    const fmtId = formatId ?? state.formatId;
    const fmt = getFormat(fmtId);
    const clone = document.createElement("div");
    clone.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: ${fmt.width}px;
      height: ${fmt.height}px;
      overflow: hidden;
      z-index: -1;
    `;
    document.body.appendChild(clone);

    const exportState = structuredClone(state);
    if (!transparent) {
      const bg = exportState.background;
      if (bg.type === "solid") clone.style.background = bg.color;
      else if (bg.type === "gradient") {
        const g = bg.gradient;
        const fromReach = Math.max(0, Math.min(100, g.fromReach ?? 0));
        const toReach = Math.max(0, Math.min(100, g.toReach ?? g.reach ?? 100));
        const fromOpacity = Math.max(0, Math.min(100, g.fromOpacity ?? g.opacity ?? 100));
        const toOpacity = Math.max(0, Math.min(100, g.toOpacity ?? g.opacity ?? 100));
        const from = this._withOpacity(g.from, fromOpacity);
        const to = this._withOpacity(g.to, toOpacity);

        if (fromOpacity < 100 || toOpacity < 100) {
          clone.style.background = g.to;
          clone.style.position = "relative";
          const overlay = document.createElement("div");
          overlay.style.cssText = `
            position: absolute; inset: 0;
            background: ${
              g.type === "linear"
                ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
                : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`
            };
          `;
          clone.appendChild(overlay);
        } else {
          clone.style.background = g.type === "linear"
            ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
            : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`;
        }
      } else if (bg.type === "image" && bg.image) {
        clone.style.background = `url(${bg.image}) center/${bg.imageSize ?? "cover"} no-repeat`;
      }
    }
    for (const layer of exportState.layers) {
      if (!layer.visible) continue;
      const el = this._buildExportLayer(layer, fmt.width, fmt.height);
      clone.appendChild(el);
    }

    try {
      await document.fonts.ready;
      const xhtml = clone.innerHTML;
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${fmt.width}" height="${fmt.height}" viewBox="0 0 ${fmt.width} ${fmt.height}">
  <foreignObject x="0" y="0" width="${fmt.width}" height="${fmt.height}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${fmt.width}px;height:${fmt.height}px;overflow:hidden;position:relative;${clone.style.background ? `background:${clone.style.background};` : ""}">${xhtml}</div>
  </foreignObject>
</svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const name = filename ?? this._buildFilename(state, fmtId, "svg");
      if (download) this._download(blob, name);
      return blob;
    } finally {
      clone.remove();
    }
  }

  /**
   * Export in multiple formats at once — downloads a ZIP.
   * Requires JSZip (CDN).
   */
  async exportMultiple(formatIds, { transparent = false } = {}) {
    if (!window.JSZip) {
      toast?.(
        "JSZip não carregado — baixando arquivos individualmente.",
        "info",
      );
      await this._fallbackMultiple(formatIds, transparent);
      return;
    }

    const zip = new window.JSZip();
    const state = this._engine.getState();

    for (const fmtId of formatIds) {
      try {
        // download: false — we collect blobs into the ZIP, not individual files
        const blob = await this.exportPNG({
          transparent,
          formatId: fmtId,
          download: false,
        });
        zip.file(this._buildFilename(state, fmtId), blob);
      } catch (e) {
        console.error(`Export ${fmtId} failed:`, e);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    this._download(zipBlob, "post-generate-export.zip");
  }

  /**
   * Export all slides in the project as individual PNGs inside a ZIP.
   * @param {Array<{id, state}>} slides  — slides array from SlideManager
   * @param {function} onProgress        — optional (done, total) callback
   */
  async exportAllSlides(slides, { transparent = false, onProgress } = {}) {
    if (!Array.isArray(slides) || !slides.length) return;

    if (!window.JSZip) {
      // Fallback: export only the current slide
      await this.exportPNG({ transparent });
      return;
    }

    const zip = new window.JSZip();
    const savedState = structuredClone(this._engine.getState());

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      try {
        this._engine.setState(structuredClone(slide.state));
        await new Promise((r) => setTimeout(r, 60)); // let canvas settle
        const state = this._engine.getState();
        const fmtId = state.formatId;
        const blob = await this.exportPNG({ transparent, download: false });
        const pad = String(i + 1).padStart(2, "0");
        const name = `slide-${pad}-${this._buildFilename(state, fmtId)}`;
        zip.file(name, blob);
        onProgress?.(i + 1, slides.length);
      } catch (e) {
        console.error(`Slide ${i + 1} export failed:`, e);
      }
    }

    // Restore original state
    this._engine.setState(savedState);

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const ts = new Date().toISOString().slice(0, 10);
    this._download(zipBlob, `slides-${ts}.zip`);
  }

  /** Fallback: sequential downloads (no zip) */
  async _fallbackMultiple(formatIds, transparent) {
    for (const fmtId of formatIds) {
      await this.exportPNG({ transparent, formatId: fmtId });
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  /** Generate thumbnail (small base64) for preset saving */
  async generateThumbnail(size = 240) {
    const state = this._engine.getState();
    const fmt = getFormat(state.formatId);
    const scale = size / Math.max(fmt.width, fmt.height);
    const tw = Math.round(fmt.width * scale);
    const th = Math.round(fmt.height * scale);

    const clone = document.createElement("div");
    clone.style.cssText = `
      position: fixed; top: -9999px; left: -9999px;
      width: ${fmt.width}px; height: ${fmt.height}px;
      overflow: hidden; z-index: -1;
    `;
    document.body.appendChild(clone);

    const bg = state.background;
    if (bg.type === "solid") clone.style.background = bg.color;
    else if (bg.type === "gradient") {
      const g = bg.gradient;
      const fromReach = Math.max(0, Math.min(100, g.fromReach ?? 0));
      const toReach = Math.max(0, Math.min(100, g.toReach ?? g.reach ?? 100));
      const fromOpacity = Math.max(0, Math.min(100, g.fromOpacity ?? g.opacity ?? 100));
      const toOpacity = Math.max(0, Math.min(100, g.toOpacity ?? g.opacity ?? 100));
      const from = this._withOpacity(g.from, fromOpacity);
      const to = this._withOpacity(g.to, toOpacity);

      if (fromOpacity < 100 || toOpacity < 100) {
        clone.style.background = g.to;
        clone.style.position = "relative";
        const overlay = document.createElement("div");
        overlay.style.cssText = `
          position: absolute; inset: 0;
          background: ${
            g.type === "linear"
              ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
              : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`
          };
        `;
        clone.appendChild(overlay);
      } else {
        clone.style.background = g.type === "linear"
          ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
          : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`;
      }
    }

    for (const layer of state.layers) {
      if (!layer.visible) continue;
      clone.appendChild(this._buildExportLayer(layer, fmt.width, fmt.height));
    }

    try {
      await document.fonts.ready;
      const canvas = await window.html2canvas(clone, {
        width: fmt.width,
        height: fmt.height,
        scale: scale,
        useCORS: true,
        logging: false,
      });
      return canvas.toDataURL("image/jpeg", 0.7);
    } finally {
      clone.remove();
    }
  }

  /* ── Layer builder (mirrors canvas-engine, no event overhead) ── */
  _buildExportLayer(layer, cw, ch) {
    const el = document.createElement("div");
    el.style.cssText = `
      position: absolute;
      left: ${((layer.x ?? 0) * cw) / 100}px;
      top: ${((layer.y ?? 0) * ch) / 100}px;
      opacity: ${layer.opacity ?? 1};
    `;

    if (layer.width !== "auto" && layer.width != null) {
      el.style.width = `${(layer.width * cw) / 100}px`;
    }

    if (layer.type === "text") {
      const fs = (layer.fontSize * cw) / 100;
      if (layer.subtype === "badge") {
        const span = document.createElement("span");
        const bpx = (layer.badgePaddingX * cw) / 100;
        const bpy = (layer.badgePaddingY * cw) / 100;
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
          border: ${layer.badgeBorderWidth ?? 1}px solid ${layer.badgeBorderColor};
          border-radius: ${layer.badgeBorderRadius ?? 100}px;
          white-space: nowrap;
        `;
        span.textContent = layer.content;
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
        if (layer.hasBorder) {
          const bw = ((layer.borderWidth ?? 2) * cw) / 1080;
          const px = ((layer.borderPaddingX ?? 16) * cw) / 1080;
          const py = ((layer.borderPaddingY ?? 8) * cw) / 1080;
          el.style.display = "inline-block";
          el.style.border = `${bw}px solid ${layer.borderColor ?? "rgba(255,255,255,0.3)"}`;
          el.style.borderRadius = `${layer.borderRadius ?? 8}px`;
          el.style.padding = `${py}px ${px}px`;
        }
        if (layer.width !== "auto")
          el.style.width = `${(layer.width * cw) / 100}px`;
        el.textContent = layer.content;
      }
    } else if (layer.type === "image" && layer.src) {
      el.style.width = `${((layer.width ?? 40) * cw) / 100}px`;
      el.style.height = `${((layer.height ?? 40) * ch) / 100}px`;
      el.style.overflow = "hidden";
      el.style.borderRadius = `${((layer.borderRadius ?? 0) * cw) / 100}px`;
      if (layer.hasBorder) {
        const bw = ((layer.borderWidth ?? 2) * cw) / 1080;
        el.style.border = `${bw}px solid ${layer.borderColor ?? "rgba(255,255,255,0.28)"}`;
      }
      const img = document.createElement("img");
      img.src = layer.src;
      img.crossOrigin = "anonymous";
      img.style.cssText = `width:100%;height:100%;object-fit:${layer.objectFit ?? "contain"};display:block;`;
      img.style.transform = `scale(${Math.max(0.2, Math.min(4, layer.imageZoom ?? 1))})`;
      img.style.transformOrigin = "center center";
      el.appendChild(img);
    } else if (layer.type === "icon" && layer.svg) {
      const sz = ((layer.size ?? 8) * cw) / 100;
      el.style.width = sz + "px";
      el.style.height = sz + "px";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.color = layer.color ?? "#ffffff";
      el.style.background = layer.background ?? "transparent";
      el.style.borderRadius = `${layer.borderRadius ?? 12}px`;
      if (layer.hasBorder) {
        const bw = ((layer.borderWidth ?? 1) * cw) / 1080;
        el.style.border = `${bw}px solid ${layer.borderColor ?? "rgba(255,255,255,0.32)"}`;
      }
      el.innerHTML = layer.svg;
      const svgEl = el.querySelector("svg");
      if (svgEl) {
        svgEl.style.width = "100%";
        svgEl.style.height = "100%";
      }
    } else if (layer.type === "shape") {
      el.style.width = `${((layer.width ?? 20) * cw) / 100}px`;
      el.style.height = `${((layer.height ?? 0.5) * ch) / 100}px`;
      el.style.background = layer.fillColor ?? "#7BC4EC";
      el.style.borderRadius = `${layer.borderRadius ?? 0}px`;
    }

    return el;
  }

  _buildFilename(state, formatId, ext = "png") {
    const fmt = FORMATS[formatId];
    const platform = fmt?.platform ?? "post";
    const label = (fmt?.label ?? formatId).toLowerCase().replace(/\s+/g, "-");
    const ts = new Date().toISOString().slice(0, 10);
    return `${platform}-${label}-${ts}.${ext}`;
  }

  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
}
