/* ============================================================
   PostGenerate — Canvas Engine v2
   ============================================================ */

import { uuid, injectAnimCSS, ANIM_DEFAULTS } from "./canvas-utils.js";
import {
  createDefaultState,
  makeBadgeLayer,
  makeHeadlineLayer,
  makeSubLayer,
  makeTextLayer,
  makeImageLayer,
  makeIconLayer,
  makeShapeLayer,
} from "./layer-factories.js";
import { getFormat } from "./formats.js";

export { ANIM_DEFAULTS };

/* ── Re-export factories for external use ─────────────── */
export { createDefaultState, makeBadgeLayer, makeHeadlineLayer, makeSubLayer, makeTextLayer, makeImageLayer, makeIconLayer, makeShapeLayer };

/* ── Canvas Engine ──────────────────────────────────────── */
export class CanvasEngine {
  constructor(canvasEl) {
    this._el = canvasEl;
    this._state = createDefaultState();
    this._selectedIds = new Set();
    this._listeners = {};
    this._previewW = 0;
    this._previewH = 0;
    this._scale = 1;
    this._previewZoom = 1;
    this._availW = 0;
    this._availH = 0;
    this._animMode = false; // true while playing preview animation
    this._dragState = null; // { layerId, startX, startY, startLayerX, startLayerY }
    this._resizeState = null; // { handle, startX, startY, startW, startH, startLayerX, startLayerY }
    this._editingText = null; // { layerId, el }
    injectAnimCSS();
    this._wireCanvasDrag();
  }

  /* ── State ────────────────────────────────────────────── */
  getState() {
    return structuredClone(this._state);
  }

  setState(state) {
    const prevFormatId = this._state.formatId;
    this._state = structuredClone(state);
    this._selectedIds.clear();
    this.render();
    if (this._state.formatId !== prevFormatId) {
      this._emit("formatChange", this._state.formatId);
    }
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
    if (this._selectedIds.has(id)) {
      this._selectedIds.delete(id);
    }
    this.render();
    this._emit("layersChange", this._state.layers);
    this._emit("stateChange", this._state);
    if (this._selectedIds.size === 0) this._emit("selectionChange", null);
    else this._emit("selectionChange", this.getSelectedLayers());
  }

  groupSelectedLayers() {
    const ids = [...this._selectedIds];
    if (ids.length < 2) return null;
    const layers = this._state.layers.filter(l => ids.includes(l.id));
    const minX = Math.min(...layers.map(l => l.x ?? 0));
    const minY = Math.min(...layers.map(l => l.y ?? 0));
    const maxX = Math.max(...layers.map(l => (l.x ?? 0) + (l.width === "auto" ? 0 : (l.width ?? 0))));
    const maxY = Math.max(...layers.map(l => (l.y ?? 0) + (l.height === "auto" ? 0 : (l.height ?? 0))));
    this.snapshot();
    const groupId = uuid();
    const group = {
      id: groupId,
      name: "Grupo",
      type: "group",
      visible: true,
      locked: false,
      collapsed: false,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      children: layers.map(l => ({ ...l })),
      ...ANIM_DEFAULTS,
    };
    this._state.layers = this._state.layers.filter(l => !ids.includes(l.id));
    this._state.layers.push(group);
    this._selectedIds.clear();
    this._selectedIds.add(groupId);
    this.render();
    this._emit("layersChange", this._state.layers);
    this._emit("stateChange", this._state);
    return group;
  }

  ungroupLayer(groupId) {
    const group = this._state.layers.find(l => l.id === groupId);
    if (!group || group.type !== "group") return;
    this.snapshot();
    const children = group.children ?? [];
    this._state.layers = this._state.layers.filter(l => l.id !== groupId);
    children.forEach(child => {
      const restored = { ...child, id: uuid() };
      this._state.layers.push(restored);
    });
    this._selectedIds.clear();
    children.forEach(c => this._selectedIds.add(c.id));
    this.render();
    this._emit("layersChange", this._state.layers);
    this._emit("stateChange", this._state);
  }

  removeSelectedLayers() {
    const ids = [...this._selectedIds];
    ids.forEach(id => {
      const idx = this._state.layers.findIndex((l) => l.id === id);
      if (idx !== -1) this._state.layers.splice(idx, 1);
    });
    this._selectedIds.clear();
    this.render();
    this._emit("layersChange", this._state.layers);
    this._emit("stateChange", this._state);
    this._emit("selectionChange", null);
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

  moveLayerByIndex(fromIdx, toIdx) {
    const layers = this._state.layers;
    if (fromIdx < 0 || fromIdx >= layers.length) return;
    if (toIdx < 0 || toIdx >= layers.length) return;
    const [moved] = layers.splice(fromIdx, 1);
    layers.splice(toIdx, 0, moved);
    this.render();
    this._emit("layersChange", layers);
    this._emit("stateChange", this._state);
  }

  alignSelectedLayers(direction) {
    const layers = this.getSelectedLayers();
    if (layers.length < 1) return;
    const fmt = getFormat(this._state.formatId);
    const cw = fmt.width, ch = fmt.height;
    if (direction === "left") {
      const minX = Math.min(...layers.map(l => l.x ?? 0));
      layers.forEach(l => this.updateLayer(l.id, { x: minX }));
    } else if (direction === "centerH") {
      const avgX = layers.reduce((sum, l) => sum + (l.x ?? 0), 0) / layers.length;
      layers.forEach(l => this.updateLayer(l.id, { x: avgX }));
    } else if (direction === "right") {
      const maxX = Math.max(...layers.map(l => {
        const w = l.width ?? (l.type === "icon" ? l.size : 20);
        return (l.x ?? 0) + w;
      }));
      layers.forEach(l => {
        const w = l.width ?? (l.type === "icon" ? l.size : 20);
        this.updateLayer(l.id, { x: maxX - w });
      });
    } else if (direction === "top") {
      const minY = Math.min(...layers.map(l => l.y ?? 0));
      layers.forEach(l => this.updateLayer(l.id, { y: minY }));
    } else if (direction === "centerV") {
      const avgY = layers.reduce((sum, l) => sum + (l.y ?? 0), 0) / layers.length;
      layers.forEach(l => this.updateLayer(l.id, { y: avgY }));
    } else if (direction === "bottom") {
      const maxY = Math.max(...layers.map(l => {
        const h = l.height ?? (l.type === "icon" ? l.size : 10);
        return (l.y ?? 0) + h;
      }));
      layers.forEach(l => {
        const h = l.height ?? (l.type === "icon" ? l.size : 10);
        this.updateLayer(l.id, { y: maxY - h });
      });
    }
  }

  distributeSelectedLayers(direction) {
    const layers = this.getSelectedLayers();
    if (layers.length < 3) return;
    const sorted = [...layers].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
    if (direction === "horizontal") {
      const minX = sorted[0].x ?? 0;
      const maxX = sorted[sorted.length - 1].x ?? 0;
      const totalW = sorted.reduce((sum, l) => sum + (l.width ?? 10), 0);
      const space = (maxX - minX - totalW) / (sorted.length - 1);
      let curX = minX;
      sorted.forEach((l, i) => {
        if (i === 0) { curX = l.x ?? 0; return; }
        if (i === sorted.length - 1) return;
        curX += (l.width ?? 10) + space;
        this.updateLayer(l.id, { x: curX });
        curX += space;
      });
    } else if (direction === "vertical") {
      const minY = sorted[0].y ?? 0;
      const maxY = sorted[sorted.length - 1].y ?? 0;
      const totalH = sorted.reduce((sum, l) => sum + (l.height ?? 10), 0);
      const space = (maxY - minY - totalH) / (sorted.length - 1);
      let curY = minY;
      sorted.forEach((l, i) => {
        if (i === 0) { curY = l.y ?? 0; return; }
        if (i === sorted.length - 1) return;
        curY += (l.height ?? 10) + space;
        this.updateLayer(l.id, { y: curY });
        curY += space;
      });
    }
  }

  duplicateLayer(id) {
    const src = this._state.layers.find((l) => l.id === id);
    if (!src) return;
    const clone = structuredClone(src);
    clone.id = uuid();
    clone.name = src.name + " (cópia)";
    clone.x = (src.x ?? 0) + 2;
    clone.y = (src.y ?? 0) + 2;
    this._state.layers.push(clone);
    this.render();
    this.selectLayer(clone.id);
    this._emit("layersChange", this._state.layers);
    this._emit("stateChange", this._state);
  }

  selectLayer(id, { addToSelection = false } = {}) {
    if (addToSelection) {
      if (this._selectedIds.has(id)) {
        this._selectedIds.delete(id);
      } else {
        this._selectedIds.add(id);
      }
    } else {
      this._selectedIds.clear();
      if (id) this._selectedIds.add(id);
    }
    this._el.querySelectorAll(".pg-layer").forEach((el) => {
      el.classList.toggle("pg-layer--selected", this._selectedIds.has(el.dataset.layerId));
    });
    const layers = this._state.layers.filter((l) => this._selectedIds.has(l.id));
    this._emit("selectionChange", layers.length === 1 ? layers[0] : layers.length > 1 ? layers : null);
  }

  getSelectedLayers() {
    return this._state.layers.filter((l) => this._selectedIds.has(l.id));
  }

  getSelectedLayer() {
    if (this._selectedIds.size === 0) return null;
    if (this._selectedIds.size === 1) {
      const id = [...this._selectedIds][0];
      return this._state.layers.find((l) => l.id === id) ?? null;
    }
    return this.getSelectedLayers();
  }

  clearSelection() {
    this._selectedIds.clear();
    this._el.querySelectorAll(".pg-layer").forEach((el) => {
      el.classList.remove("pg-layer--selected");
    });
    this._emit("selectionChange", null);
  }

  selectAllLayers() {
    this._state.layers.forEach(l => this._selectedIds.add(l.id));
    this._el.querySelectorAll(".pg-layer").forEach((el) => {
      el.classList.add("pg-layer--selected");
    });
    const layers = this.getSelectedLayers();
    this._emit("selectionChange", layers);
  }

  setFormat(formatId) {
    this._state.formatId = formatId;
    this.render();
    this._emit("formatChange", formatId);
    this._emit("stateChange", this._state);
  }

  getLayers() {
    return this._state.layers;
  }

  /* ── Preview sizing ───────────────────────────────────── */
  setPreviewSize(availW, availH) {
    this._availW = availW;
    this._availH = availH;
    this._applyPreviewScale();
  }

  setPreviewZoom(zoom = 1) {
    this._previewZoom = Math.max(0.25, Math.min(3, Number(zoom) || 1));
    this._applyPreviewScale();
  }

  _applyPreviewScale() {
    const fmt = getFormat(this._state.formatId);
    const scaleW = (this._availW || fmt.width) / fmt.width;
    const scaleH = (this._availH || fmt.height) / fmt.height;
    this._scale = Math.max(0.05, Math.min(scaleW, scaleH) * this._previewZoom);
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

  _renderSafeAreaGuides(show = false) {
    this._el.querySelectorAll(".pg-safe-area").forEach(el => el.remove());
    if (!show) return;
    const fmt = getFormat(this._state.formatId);
    const cw = fmt.width, ch = fmt.height;
    const overlay = document.createElement("div");
    overlay.className = "pg-safe-area";
    overlay.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden;`;
    const zones = [
      { top: 0, height: ch * 0.14, label: "Stories safe zone" },
      { top: ch * 0.86, height: ch * 0.14, label: "" },
    ];
    zones.forEach(z => {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;top:${z.top}px;left:0;right:0;height:${z.height}px;border:1px dashed rgba(255,100,100,0.5);background:rgba(255,0,0,0.03);`;
      overlay.appendChild(d);
    });
    this._el.appendChild(overlay);
  }

  toggleSafeArea() {
    this._safeAreaVisible = !this._safeAreaVisible;
    this._renderSafeAreaGuides(this._safeAreaVisible);
    return this._safeAreaVisible;
  }

  /* ── Drag & Resize ───────────────────────────────────── */
  _wireCanvasDrag() {
    const onMouseMove = (e) => {
      if (this._editingText) return;
      const rect = this._el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cw = getFormat(this._state.formatId).width;
      const ch = getFormat(this._state.formatId).height;
      const scaleX = cw / (this._previewW || cw);
      const scaleY = ch / (this._previewH || ch);

      if (this._dragState) {
        const dx = (mx - this._dragState.startX) * scaleX;
        const dy = (my - this._dragState.startY) * scaleY;
        const newX = this._dragState.startLayerX + (dx / cw) * 100;
        const newY = this._dragState.startLayerY + (dy / ch) * 100;
        this.updateLayer(this._dragState.layerId, { x: newX, y: newY });
      } else if (this._resizeState) {
        const { handle, startX, startY, startW, startH, startLayerX, startLayerY, layer } = this._resizeState;
        const dx = (mx - startX) * scaleX;
        const dy = (my - startY) * scaleY;
        const dwPct = (dx / cw) * 100;
        const dhPct = (dy / ch) * 100;
        let newX = startLayerX, newY = startLayerY, newW = startW, newH = startH;
        const lockRatio = layer._lockRatio ?? false;
        const ratio = startW / (startH || 1);

        if (handle.includes("w")) { newX = startLayerX + dwPct; newW = Math.max(1, startW - dwPct); }
        if (handle.includes("e")) { newW = Math.max(1, startW + dwPct); }
        if (handle.includes("n")) { newY = startLayerY + dhPct; newH = Math.max(1, startH - dhPct); }
        if (handle.includes("s")) { newH = Math.max(1, startH + dhPct); }

        if (lockRatio) {
          if (handle === "e" || handle === "w") newH = newW / ratio;
          else if (handle === "n" || handle === "s") newW = newH * ratio;
          else { newH = newW / ratio; }
        }

        this.updateLayer(this._resizeState.layerId, { x: newX, y: newY, width: newW, height: newH });
      }
    };

    const onMouseUp = () => {
      if (this._dragState) {
        this._dragState = null;
      }
      if (this._resizeState) {
        this._resizeState = null;
        this._renderResizeHandles();
      }
    };

    this._el.addEventListener("mousemove", onMouseMove);
    this._el.addEventListener("mouseup", onMouseUp);
    this._el.addEventListener("mouseleave", onMouseUp);
  }

  _startDrag(layer, e) {
    if (layer.locked) return;
    e.stopPropagation();
    const rect = this._el.getBoundingClientRect();
    const cw = getFormat(this._state.formatId).width;
    const ch = getFormat(this._state.formatId).height;
    this._dragState = {
      layerId: layer.id,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startLayerX: layer.x ?? 0,
      startLayerY: layer.y ?? 0,
    };
  }

  _startResize(handle, layer, e) {
    if (layer.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = this._el.getBoundingClientRect();
    this._resizeState = {
      handle,
      layerId: layer.id,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startW: layer.width ?? 10,
      startH: layer.height ?? (layer.type === "image" ? 40 : 10),
      startLayerX: layer.x ?? 0,
      startLayerY: layer.y ?? 0,
      layer,
    };
    this._renderResizeHandles();
  }

  _renderResizeHandles() {
    this._el.querySelectorAll(".pg-resize-handle").forEach(el => el.remove());
    if (this._selectedIds.size !== 1) return;
    const layerId = [...this._selectedIds][0];
    const layer = this._state.layers.find(l => l.id === layerId);
    if (!layer || layer.locked) return;
    if (layer.type === "text" && layer.width === "auto") return;
    const fmt = getFormat(this._state.formatId);
    const cw = fmt.width, ch = fmt.height;
    const x = ((layer.x ?? 0) * cw) / 100;
    const y = ((layer.y ?? 0) * ch) / 100;
    const w = ((layer.width ?? (layer.type === "icon" ? layer.size : 20)) * cw) / 100;
    const h = ((layer.height ?? (layer.type === "icon" ? layer.size : 10)) * ch) / 100;
    const handleSize = 8;
    const positions = [
      { h: "nw", x: x - handleSize / 2, y: y - handleSize / 2, cur: "nwse-resize" },
      { h: "n", x: x + w / 2 - handleSize / 2, y: y - handleSize / 2, cur: "ns-resize" },
      { h: "ne", x: x + w - handleSize / 2, y: y - handleSize / 2, cur: "nesw-resize" },
      { h: "e", x: x + w - handleSize / 2, y: y + h / 2 - handleSize / 2, cur: "ew-resize" },
      { h: "se", x: x + w - handleSize / 2, y: y + h - handleSize / 2, cur: "nwse-resize" },
      { h: "s", x: x + w / 2 - handleSize / 2, y: y + h - handleSize / 2, cur: "ns-resize" },
      { h: "sw", x: x - handleSize / 2, y: y + h - handleSize / 2, cur: "nesw-resize" },
      { h: "w", x: x - handleSize / 2, y: y + h / 2 - handleSize / 2, cur: "ew-resize" },
    ];
    positions.forEach(pos => {
      const handle = document.createElement("div");
      handle.className = "pg-resize-handle";
      handle.dataset.handle = pos.h;
      handle.style.cssText = `position:absolute;width:${handleSize}px;height:${handleSize}px;background:#7bc4ec;border:1px solid #fff;border-radius:2px;cursor:${pos.cur};z-index:10;`;
      handle.style.left = pos.x + "px";
      handle.style.top = pos.y + "px";
      handle.addEventListener("mousedown", (e) => this._startResize(pos.h, layer, e));
      this._el.appendChild(handle);
    });
  }

  _startTextEdit(layer, el) {
    if (layer.locked || layer.type !== "text") return;
    this._editingText = { layerId: layer.id, el };
    el.contentEditable = "true";
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const finish = () => {
      if (!this._editingText) return;
      const newContent = el.textContent;
      el.contentEditable = "false";
      this._editingText = null;
      this.snapshot();
      this.updateLayer(layer.id, { content: newContent });
    };
    el.addEventListener("blur", finish, { once: true });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.blur(); }
      if (e.key === "Escape") { el.textContent = layer.content; el.blur(); }
    });
  }

  /* ── Render ───────────────────────────────────────────── */
  render() {
    const fmt = getFormat(this._state.formatId);
    this._el.style.width = fmt.width + "px";
    this._el.style.height = fmt.height + "px";

    this._el.querySelectorAll(".pg-layer").forEach((el) => el.remove());
    this._el.querySelectorAll(".pg-resize-handle").forEach(el => el.remove());
    this._renderBackground();

    this._state.layers.forEach((layer) => {
      if (!layer.visible) return;
      const el = this._buildLayerEl(layer, fmt.width, fmt.height);
      this._el.appendChild(el);
    });

    this._renderResizeHandles();
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
      const fromReach = Math.max(0, Math.min(100, g.fromReach ?? 0));
      const toReach = Math.max(0, Math.min(100, g.toReach ?? g.reach ?? 100));
      const fromOpacity = Math.max(
        0,
        Math.min(100, g.fromOpacity ?? g.opacity ?? 100),
      );
      const toOpacity = Math.max(
        0,
        Math.min(100, g.toOpacity ?? g.opacity ?? 100),
      );
      const from = this._withOpacity(g.from, fromOpacity);
      const to = this._withOpacity(g.to, toOpacity);
      bgEl.style.background =
        g.type === "linear"
          ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
          : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`;
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
    this._renderResizeHandles();
  }

  _buildLayerEl(layer, cw, ch) {
    const el = document.createElement("div");
    el.className = "pg-layer";
    el.dataset.layerId = layer.id;
    el.dataset.anim = layer.animIn ?? "none";
    el.dataset.animOut = layer.animOut ?? "none";

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
    else if (layer.type === "group") {
      el.style.border = "1px dashed rgba(255,255,255,0.2)";
      el.style.borderRadius = "4px";
      el.style.background = "rgba(255,255,255,0.03)";
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.gap = "2px";
      el.style.padding = "4px";
      if (layer.collapsed) {
        el.style.minHeight = "24px";
      } else {
        const children = layer.children ?? [];
        children.forEach(child => {
          const childEl = this._buildLayerEl(child, cw, ch);
          childEl.style.position = "relative";
          childEl.style.left = "0";
          childEl.style.top = "0";
          childEl.style.transform = `translate(${(child.x - layer.x) * cw / 100}px, ${(child.y - layer.y) * ch / 100}px)`;
          el.appendChild(childEl);
        });
      }
    }

    if (this._selectedIds.has(layer.id)) el.classList.add("pg-layer--selected");

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectLayer(layer.id, { addToSelection: e.ctrlKey || e.metaKey });
    });

    el.addEventListener("mousedown", (e) => {
      if (layer.locked) return;
      if (e.button !== 0) return;
      this._startDrag(layer, e);
    });

    if (layer.type === "text") {
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const textEl = el.querySelector("span") || el;
        this._startTextEdit(layer, textEl);
      });
    }

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

      // Shadow / blur effects
      if (layer.textShadow) {
        const s = layer.textShadow;
        const blurPx = ((s.blur ?? 4) * cw) / 1080;
        el.style.textShadow = `${((s.x ?? 2) * cw) / 1080}px ${((s.y ?? 2) * cw) / 1080}px ${blurPx}px ${s.color ?? "rgba(0,0,0,0.5)"}`;
      }
      if (layer.layerBlur > 0) {
        const blurPx = ((layer.layerBlur ?? 0) * cw) / 1080;
        el.style.filter = `blur(${blurPx}px)`;
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
    // Shadow
    if (layer.boxShadow) {
      const s = layer.boxShadow;
      const blurPx = ((s.blur ?? 8) * cw) / 1080;
      const spreadPx = ((s.spread ?? 0) * cw) / 1080;
      el.style.boxShadow = `${((s.x ?? 2) * cw) / 1080}px ${((s.y ?? 4) * cw) / 1080}px ${blurPx}px ${spreadPx}px ${s.color ?? "rgba(0,0,0,0.4)"}`;
    }
    if (layer.layerBlur > 0) {
      const blurPx = ((layer.layerBlur ?? 0) * cw) / 1080;
      el.style.filter = `blur(${blurPx}px)`;
    }
    if (layer.src) {
      const img = document.createElement("img");
      img.src = layer.src;
      img.crossOrigin = "anonymous";
      img.style.cssText = `width:100%;height:100%;object-fit:${layer.objectFit ?? "cover"};display:block;`;
      img.style.transform = `scale(${Math.max(0.2, Math.min(4, layer.imageZoom ?? 1))})`;
      img.style.transformOrigin = "center center";
      img.style.pointerEvents = "none";
      const hasCrop = layer.cropX != null || layer.cropY != null || layer.cropW != null || layer.cropH != null;
      if (hasCrop) {
        const cropX = layer.cropX ?? 0;
        const cropY = layer.cropY ?? 0;
        const cropW = layer.cropW ?? 100;
        const cropH = layer.cropH ?? 100;
        img.style.clipPath = `inset(${cropY}% ${100 - cropW - cropX}% ${100 - cropH - cropY}% ${cropX}% round ${((layer.borderRadius ?? 0) * cw) / 100}px)`;
        img.style.transform = `scale(${Math.max(0.2, Math.min(4, layer.imageZoom ?? 1))})`;
      }
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
    if (layer.boxShadow) {
      const s = layer.boxShadow;
      const blurPx = ((s.blur ?? 8) * cw) / 1080;
      const spreadPx = ((s.spread ?? 0) * cw) / 1080;
      el.style.boxShadow = `${((s.x ?? 2) * cw) / 1080}px ${((s.y ?? 4) * cw) / 1080}px ${blurPx}px ${spreadPx}px ${s.color ?? "rgba(0,0,0,0.4)"}`;
    }
    if (layer.layerBlur > 0) {
      const blurPx = ((layer.layerBlur ?? 0) * cw) / 1080;
      el.style.filter = `blur(${blurPx}px)`;
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
    this._selectedIds.clear();
    this.render();
    this._emit("stateChange", this._state);
    this._emit("layersChange", this._state.layers);
    this._emit("selectionChange", null);
  }

  redo() {
    if (this._historyIdx >= this._history.length - 1) return;
    this._historyIdx++;
    this._state = structuredClone(this._history[this._historyIdx]);
    this._selectedIds.clear();
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
