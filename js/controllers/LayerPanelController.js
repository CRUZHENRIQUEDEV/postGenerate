/* ============================================================
   LayerPanelController — Layer list UI
   ============================================================ */

import { uuid } from "../utils/ui-helpers.js";

export class LayerPanelController {
  constructor({ canvas, makeTextLayer, makeBadgeLayer, makeImageLayer, makeIconLayer, makeShapeLayer }) {
    this._canvas = canvas;
    this._makeTextLayer = makeTextLayer;
    this._makeBadgeLayer = makeBadgeLayer;
    this._makeImageLayer = makeImageLayer;
    this._makeIconLayer = makeIconLayer;
    this._makeShapeLayer = makeShapeLayer;
  }

  wire({ openFilePicker, icons }) {
    document.getElementById("btn-add-text")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.addLayer(this._makeTextLayer());
    });
    document.getElementById("btn-add-badge")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.addLayer(this._makeBadgeLayer());
    });
    document.getElementById("btn-add-image")?.addEventListener("click", () => {
      openFilePicker("image/*", async (file) => {
        const b64 = await this._readFileAsBase64(file);
        this._canvas.snapshot();
        this._canvas.addLayer(this._makeImageLayer(null, file.name, b64));
      });
    });
    document.getElementById("btn-add-icon")?.addEventListener("click", () => {
      icons.open(({ iconId, svg }) => {
        this._canvas.snapshot();
        this._canvas.addLayer(this._makeIconLayer(null, iconId, iconId, svg));
      });
    });
    document.getElementById("btn-add-shape")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.addLayer(this._makeShapeLayer());
    });
  }

  refresh() {
    const list = document.getElementById("layers-list");
    if (!list) return;
    const layers = [...this._canvas.getLayers()].reverse();
    const selected = this._canvas.getSelectedLayer();
    list.innerHTML = "";

    layers.forEach((layer) => {
      const item = document.createElement("div");
      item.className = "layer-item" + (layer.id === selected?.id ? " selected" : "") + (layer.visible ? "" : " hidden");
      item.dataset.layerId = layer.id;
      item.draggable = true;

      const typeIcon = layer.type === "text" ? "T" : layer.type === "image" ? "🖼" : layer.type === "icon" ? "⬢" : layer.type === "group" ? "📁" : "▭";

      item.innerHTML = `
        <span class="layer-item-drag" title="Reordenar">⠿</span>
        <span class="layer-item-type-icon">${typeIcon}</span>
        <span class="layer-item-name" data-layer-id="${layer.id}">${layer.name}</span>
        <span class="layer-item-actions">
          <button class="layer-vis-btn" title="${layer.visible ? "Ocultar" : "Mostrar"}">${layer.visible ? "👁" : "◌"}</button>
          <button class="layer-lock-btn" title="${layer.locked ? "Desbloquear" : "Bloquear"}">${layer.locked ? "🔒" : "🔓"}</button>
        </span>
      `;

      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("layer-vis-btn")) return;
        if (e.target.classList.contains("layer-lock-btn")) return;
        if (e.target.classList.contains("layer-item-name")) return;
        this._canvas.selectLayer(layer.id, { addToSelection: e.ctrlKey || e.metaKey });
      });

      this._wireLayerNameEdit(item, layer);
      this._wireLayerActions(item, layer);
      this._wireLayerDrag(item, layer, list);
      if (layer.type === "group") this._wireGroupCollapse(item, layer);

      list.appendChild(item);
    });
  }

  _wireLayerNameEdit(item, layer) {
    const nameEl = item.querySelector(".layer-item-name");
    nameEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const input = document.createElement("input");
      input.type = "text";
      input.className = "layer-name-input";
      input.value = layer.name;
      input.style.cssText = "background:transparent;border:1px solid var(--accent);border-radius:3px;padding:1px 4px;font-size:12px;width:calc(100% - 8px);color:var(--text);";
      nameEl.replaceWith(input);
      input.focus();
      input.select();
      const finish = () => {
        const newName = input.value.trim() || layer.name;
        this._canvas.snapshot();
        this._canvas.updateLayer(layer.id, { name: newName });
        this.refresh();
      };
      input.addEventListener("blur", finish);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); input.blur(); }
        if (e.key === "Escape") { input.value = layer.name; input.blur(); }
      });
    });
  }

  _wireLayerActions(item, layer) {
    item.querySelector(".layer-vis-btn")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { visible: !layer.visible });
      this.refresh();
    });
    item.querySelector(".layer-lock-btn")?.addEventListener("click", () => {
      this._canvas.updateLayer(layer.id, { locked: !layer.locked });
      this.refresh();
    });
  }

  _wireLayerDrag(item, layer, list) {
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", layer.id);
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => item.classList.remove("dragging"));
    item.addEventListener("dragover", (e) => { e.preventDefault(); item.classList.add("drag-over"); });
    item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      item.classList.remove("drag-over");
      const draggedId = e.dataTransfer.getData("text/plain");
      const allLayers = [...this._canvas.getLayers()].reverse();
      const fromIdx = allLayers.findIndex(l => l.id === draggedId);
      const targetIdx = [...list.querySelectorAll(".layer-item:not(.dragging)")].indexOf(item);
      const toIdx = allLayers.length - 1 - targetIdx;
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      this._canvas.snapshot();
      this._canvas.moveLayerByIndex(fromIdx, toIdx);
      this.refresh();
    });
  }

  _wireGroupCollapse(item, layer) {
    const collapseBtn = document.createElement("button");
    collapseBtn.className = "layer-collapse-btn";
    collapseBtn.title = layer.collapsed ? "Expandir" : "Colapsar";
    collapseBtn.textContent = layer.collapsed ? "▶" : "▼";
    collapseBtn.style.cssText = "background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0 2px;font-size:9px;";
    collapseBtn.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { collapsed: !layer.collapsed });
      this.refresh();
    });
    item.querySelector(".layer-item-actions")?.prepend(collapseBtn);
  }

  async _readFileAsBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
}
