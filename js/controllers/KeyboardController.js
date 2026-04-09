/* ============================================================
   KeyboardController — Keyboard shortcut wiring
   ============================================================ */

import { toast } from "../app.js";

export class KeyboardController {
  constructor({ canvas, slides, onShowShortcutsModal }) {
    this._canvas = canvas;
    this._slides = slides;
    this._onShowShortcutsModal = onShowShortcutsModal;
    this._styleClipboard = null;
    this._layerClipboard = null;
    this._shareReadOnly = false;
  }

  setReadOnly(val) {
    this._shareReadOnly = val;
  }

  wire() {
    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (this._shareReadOnly) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        this._canvas.undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        this._canvas.redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const layer = this._canvas.getSelectedLayer();
        if (layer && !layer.locked) {
          e.preventDefault();
          this._canvas.snapshot();
          this._canvas.removeLayer(layer.id);
        }
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const layers = this._canvas.getSelectedLayers();
        if (layers.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          layers.forEach((layer) => {
            if (layer.locked) return;
            const dx =
              e.key === "ArrowRight"
                ? step
                : e.key === "ArrowLeft"
                ? -step
                : 0;
            const dy =
              e.key === "ArrowDown"
                ? step
                : e.key === "ArrowUp"
                ? -step
                : 0;
            this._canvas.updateLayer(layer.id, {
              x: (layer.x ?? 0) + dx,
              y: (layer.y ?? 0) + dy,
            });
          });
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        this._canvas.selectAllLayers();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        const group = this._canvas.groupSelectedLayers();
        if (group) toast("Camadas agrupadas.", "success");
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "g") {
        e.preventDefault();
        const layer = this._canvas.getSelectedLayer();
        if (layer?.type === "group") {
          this._canvas.ungroupLayer(layer.id);
          toast("Grupo desfeito.", "success");
        }
      }
      if (e.key === "Escape") {
        this._canvas.clearSelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        const layer = this._canvas.getSelectedLayer();
        if (layer) {
          this._canvas.snapshot();
          this._canvas.duplicateLayer(layer.id);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "[") {
        e.preventDefault();
        const layer = this._canvas.getSelectedLayer();
        if (layer) {
          this._canvas.snapshot();
          this._canvas.moveLayer(layer.id, "up");
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "]") {
        e.preventDefault();
        const layer = this._canvas.getSelectedLayer();
        if (layer) {
          this._canvas.snapshot();
          this._canvas.moveLayer(layer.id, "down");
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === "c") {
        const layers = this._canvas.getSelectedLayers();
        if (layers.length > 0) {
          e.preventDefault();
          this._styleClipboard = layers.map((l) => {
            const { id, content, src, x, y, ...styleProps } = l;
            return styleProps;
          });
          toast(`Estilo de ${layers.length} camada(s) copiado.`, "info");
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === "v") {
        const layers = this._canvas.getSelectedLayers();
        if (layers.length > 0 && this._styleClipboard) {
          e.preventDefault();
          this._canvas.snapshot();
          layers.forEach((l, i) => {
            const style = this._styleClipboard[i % this._styleClipboard.length];
            this._canvas.updateLayer(l.id, { ...style });
          });
          toast(`Estilo aplicado a ${layers.length} camada(s).`, "success");
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const layer = this._canvas.getSelectedLayer();
        if (layer) {
          e.preventDefault();
          this._copyLayer(layer);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (this._layerClipboard) {
          e.preventDefault();
          this._pasteLayer();
        }
      }
    });
  }

  _copyLayer(layer) {
    this._layerClipboard = {
      layer: structuredClone(layer),
      sourceSlideIndex: this._slides.getActiveIndex(),
    };
    this._updateClipboardBadge();
    toast(`Camada "${layer.name || layer.type}" copiada.`, "info");
  }

  _pasteLayer() {
    if (!this._layerClipboard) return;
    const clone = structuredClone(this._layerClipboard.layer);
    clone.id = crypto.randomUUID();
    this._canvas.snapshot();
    this._canvas.addLayer(clone);
    toast(`Camada colada no slide ${this._slides.getActiveIndex() + 1}.`, "success");
  }

  _updateClipboardBadge() {
    const badge = document.getElementById("clipboard-badge");
    const pasteBtn = document.getElementById("btn-paste-layer");
    const pasteAllBtn = document.getElementById("btn-paste-layer-all");
    const has = !!this._layerClipboard;
    if (badge) {
      if (has) {
        const name = this._layerClipboard.layer.name || this._layerClipboard.layer.type;
        badge.textContent = `📋 ${name}`;
        badge.style.display = "";
      } else {
        badge.style.display = "none";
      }
    }
    if (pasteBtn) pasteBtn.style.display = has ? "" : "none";
    if (pasteAllBtn) pasteAllBtn.style.display = has ? "" : "none";
  }
}
