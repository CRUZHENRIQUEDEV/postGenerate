/* ============================================================
   ContextMenuController — Right-click context menu wiring
   ============================================================ */

import { toast } from "../app.js";

export class ContextMenuController {
  constructor({ canvas, slides, openFilePicker, onRefreshLayerList, onToast }) {
    this._canvas = canvas;
    this._slides = slides;
    this._openFilePicker = openFilePicker;
    this._onRefreshLayerList = onRefreshLayerList;
    this._onToast = onToast;
    this._layerClipboard = null;
  }

  wire() {
    this._wireContextMenu();
  }

  close() {
    this._closeContextMenu();
  }

  showEvent(e) {
    this._showContextMenu(e);
  }

  _wireContextMenu() {
    const menu = document.getElementById("ctx-menu");
    if (!menu) return;

    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this._showContextMenu(e);
    });

    document.addEventListener("click", () => this._closeContextMenu());
    document.addEventListener("scroll", () => this._closeContextMenu(), true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this._closeContextMenu();
    });
  }

  _closeContextMenu() {
    const menu = document.getElementById("ctx-menu");
    if (menu) menu.style.display = "none";
  }

  _showContextMenu(e) {
    const menu = document.getElementById("ctx-menu");
    if (!menu) return;

    const slideThumbEl = e.target.closest?.(".slide-thumb");
    if (slideThumbEl) {
      const track = document.getElementById("slides-track");
      const idx = Array.from(track?.children ?? []).indexOf(slideThumbEl);
      if (idx >= 0) {
        const items = this._buildSlideThumbContextItems(idx);
        this._renderContextMenuItems(menu, items, e);
        return;
      }
    }

    const layerEl = e.target.closest?.("[data-layer-id]");
    const layerId = layerEl?.dataset?.layerId ?? null;
    const layer = layerId
      ? this._canvas.getLayers().find((l) => l.id === layerId)
      : null;

    if (layer && this._canvas.getSelectedLayer()?.id !== layerId) {
      this._canvas.selectLayer(layerId);
    }

    const items = layer
      ? this._buildLayerContextItems(layer)
      : this._buildCanvasContextItems();

    this._renderContextMenuItems(menu, items, e);
  }

  _renderContextMenuItems(menu, items, e) {
    menu.innerHTML = "";
    items.forEach((item) => {
      if (item === "sep") {
        const sep = document.createElement("div");
        sep.className = "ctx-separator";
        menu.appendChild(sep);
        return;
      }
      if (item.label && !item.action) {
        const lbl = document.createElement("div");
        lbl.className = "ctx-label";
        lbl.textContent = item.label;
        menu.appendChild(lbl);
        return;
      }
      const el = document.createElement("div");
      el.className = "ctx-item" + (item.danger ? " danger" : "");
      el.innerHTML = `
        <span class="ctx-icon">${item.icon ?? ""}</span>
        <span>${item.text}</span>
        ${item.shortcut ? `<span class="ctx-shortcut">${item.shortcut}</span>` : ""}
      `;
      el.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._closeContextMenu();
        item.action();
      });
      menu.appendChild(el);
    });

    if (!menu.children.length) return;

    menu.style.display = "block";
    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = 200, mh = menu.scrollHeight;
    const x = e.clientX + mw > vw ? e.clientX - mw : e.clientX;
    const y = e.clientY + mh > vh ? e.clientY - mh : e.clientY;
    menu.style.left = x + "px";
    menu.style.top = y + "px";
  }

  _buildSlideThumbContextItems(idx) {
    const slides = this._slides.getSlides();
    const slide = slides[idx];
    const isActive = idx === this._slides.getActiveIndex();
    const items = [];
    items.push({ label: `Slide ${idx + 1}` });

    if (!isActive) {
      items.push({
        icon: "▶", text: "Ir para este slide",
        action: () => this._slides.setActive(idx),
      });
      items.push("sep");
    }

    items.push({
      icon: "⧉", text: "Duplicar slide",
      action: async () => {
        await this._slides.setActive(idx);
        await this._slides.duplicateActive();
      },
    });
    items.push({
      icon: "🗑", text: "Remover slide", danger: true,
      action: async () => {
        await this._slides.setActive(idx);
        await this._slides.removeActive();
      },
    });

    const presetId = slide?.state?._presetId;
    if (presetId) {
      const slidesWithPreset = slides.filter(
        (s) => s.state?._presetId === presetId,
      ).length;
      items.push("sep");
      items.push({ label: "Preset" });
      items.push({
        icon: "↺", text: "Resetar este slide para o preset",
        action: () => this._resetSlideToPreset(idx),
      });
      if (slidesWithPreset > 1) {
        items.push({
          icon: "↺", text: `Resetar todos os ${slidesWithPreset} slides`,
          action: () => this._resetAllSlidesToPreset(presetId),
        });
      }
    }

    return items;
  }

  _buildLayerContextItems(layer) {
    const items = [];
    const isLocked = !!layer.locked;
    const isVisible = layer.visible !== false;
    const slides = this._slides.getSlides();

    items.push({ label: layer.name || layer.type });

    if (layer.type === "text" && !isLocked) {
      items.push({
        icon: "✏️", text: "Editar texto",
        action: () => {
          const el = document.querySelector(`[data-layer-id="${layer.id}"]`);
          el?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        },
      });
    }
    if (layer.type === "image" && !isLocked) {
      items.push({
        icon: "🖼️", text: "Substituir imagem",
        action: () => {
          this._openFilePicker("image/*", (file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              this._canvas.snapshot();
              this._canvas.updateLayer(layer.id, { src: ev.target.result });
            };
            reader.readAsDataURL(file);
          });
        },
      });
    }

    items.push("sep");

    items.push({
      icon: "📋", text: "Copiar camada", shortcut: "Ctrl+C",
      action: () => this._copyLayer(layer),
    });
    if (slides.length > 1) {
      items.push({
        icon: "⊛", text: "Colar em todos os slides",
        action: () => {
          this._copyLayer(layer);
          this._pasteLayerToAllSlides();
        },
      });
    }
    items.push({
      icon: "⧉", text: "Duplicar", shortcut: "Ctrl+D",
      action: () => {
        this._canvas.snapshot();
        this._canvas.duplicateLayer(layer.id);
      },
    });

    items.push("sep");

    items.push({
      icon: "⬆", text: "Mover para frente",
      action: () => { this._canvas.snapshot(); this._canvas.moveLayer(layer.id, "up"); },
    });
    items.push({
      icon: "⬇", text: "Mover para trás",
      action: () => { this._canvas.snapshot(); this._canvas.moveLayer(layer.id, "down"); },
    });

    items.push("sep");

    items.push({
      icon: isVisible ? "👁" : "🚫", text: isVisible ? "Ocultar" : "Mostrar",
      action: () => { this._canvas.snapshot(); this._canvas.updateLayer(layer.id, { visible: !isVisible }); },
    });
    items.push({
      icon: isLocked ? "🔓" : "🔒", text: isLocked ? "Desbloquear" : "Bloquear",
      action: () => this._canvas.updateLayer(layer.id, { locked: !isLocked }),
    });

    if (!isLocked) {
      items.push("sep");
      items.push({ label: "Alinhar" });
      items.push({
        icon: "⬛", text: "Centralizar horizontalmente",
        action: () => {
          this._canvas.snapshot();
          const w = layer.width ?? 30;
          this._canvas.updateLayer(layer.id, { x: 50 - w / 2 });
        },
      });
      items.push({
        icon: "⬛", text: "Centralizar verticalmente",
        action: () => {
          this._canvas.snapshot();
          const h = layer.height ?? 10;
          this._canvas.updateLayer(layer.id, { y: 50 - h / 2 });
        },
      });
      items.push({
        icon: "⬛", text: "Centralizar na tela",
        action: () => {
          this._canvas.snapshot();
          const w = layer.width ?? 30, h = layer.height ?? 10;
          this._canvas.updateLayer(layer.id, { x: 50 - w / 2, y: 50 - h / 2 });
        },
      });
    }

    items.push("sep");

    items.push({
      icon: "🗑", text: "Deletar", shortcut: "Del", danger: true,
      action: () => {
        if (isLocked) { toast("Camada bloqueada.", "error"); return; }
        this._canvas.snapshot();
        this._canvas.removeLayer(layer.id);
      },
    });

    return items;
  }

  _buildCanvasContextItems() {
    const items = [];
    items.push({ label: "Canvas" });
    items.push({
      icon: "↩", text: "Desfazer", shortcut: "Ctrl+Z",
      action: () => this._canvas.undo(),
    });
    items.push({
      icon: "↪", text: "Refazer", shortcut: "Ctrl+Y",
      action: () => this._canvas.redo(),
    });
    if (this._layerClipboard) {
      items.push("sep");
      items.push({
        icon: "⊙", text: "Colar camada", shortcut: "Ctrl+V",
        action: () => this._pasteLayer(),
      });
      if (this._slides.getSlides().length > 1) {
        items.push({
          icon: "⊛", text: "Colar em todos os slides",
          action: () => this._pasteLayerToAllSlides(),
        });
      }
    }
    items.push("sep");
    items.push({
      icon: "➕", text: "Adicionar texto",
      action: () => { this._canvas.snapshot(); this._canvas.addLayer({ type: "text", name: "Texto" }); },
    });
    items.push({
      icon: "🖼️", text: "Adicionar imagem",
      action: () => document.getElementById("btn-add-image")?.click(),
    });
    items.push({
      icon: "◼", text: "Adicionar forma",
      action: () => document.getElementById("btn-add-shape")?.click(),
    });

    const activeState = this._canvas.getState();
    const presetId = activeState._presetId;
    if (presetId) {
      const allSlides = this._slides.getSlides();
      const slidesWithPreset = allSlides.filter(
        (s) => s.state?._presetId === presetId,
      ).length;
      items.push("sep");
      items.push({ label: "Preset vinculado" });
      items.push({
        icon: "↺", text: "Resetar este slide para o preset",
        action: () => this._resetSlideToPreset(this._slides.getActiveIndex()),
      });
      if (slidesWithPreset > 1) {
        items.push({
          icon: "↺", text: `Resetar todos os slides (${slidesWithPreset})`,
          action: () => this._resetAllSlidesToPreset(presetId),
        });
      }
    }

    return items;
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

  _pasteLayerToAllSlides() {
    if (!this._layerClipboard) return;
    const allSlides = this._slides.getSlides();
    if (allSlides.length <= 1) {
      this._pasteLayer();
      return;
    }
    const activeIdx = this._slides.getActiveIndex();
    const updatedSlides = allSlides.map((slide, idx) => {
      if (idx === activeIdx) return slide;
      const clone = structuredClone(this._layerClipboard.layer);
      clone.id = crypto.randomUUID();
      return {
        ...slide,
        state: {
          ...slide.state,
          layers: [...(slide.state.layers ?? []), clone],
        },
      };
    });
    this._pasteLayer();
    this._slides.loadSlides(updatedSlides, activeIdx);
    toast(`Camada colada em ${allSlides.length} slides.`, "success");
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

  async _resetSlideToPreset(slideIndex) {
    const slides = this._slides.getSlides();
    const slide = slides[slideIndex];
    if (!slide?.state?._presetId) {
      toast("Este slide não tem preset vinculado.", "error");
      return;
    }
    const preset = await this._getPreset(slide.state._presetId);
    if (!preset?.state) {
      toast("Preset não encontrado.", "error");
      return;
    }
    const nextState = this._applyPresetToSlideState(slide.state, preset);
    this._canvas.snapshot();
    this._canvas.setState(nextState);
    toast("Slide resetado para o preset.", "success");
  }

  async _resetAllSlidesToPreset(presetId) {
    const preset = await this._getPreset(presetId);
    if (!preset?.state) {
      toast("Preset não encontrado.", "error");
      return;
    }
    const allSlides = this._slides.getSlides();
    const activeIdx = this._slides.getActiveIndex();
    const updatedSlides = allSlides.map((slide) => {
      if (slide.state?._presetId !== presetId) return slide;
      return { ...slide, state: this._applyPresetToSlideState(slide.state, preset) };
    });
    const resetCount = updatedSlides.filter(
      (s) => s.state?._presetId === presetId,
    ).length;
    await this._slides.loadSlides(updatedSlides, activeIdx);
    toast(`${resetCount} slide(s) resetados para o preset.`, "success");
  }

  _applyPresetToSlideState(slideState, preset) {
    const TEXT_STYLE_PROPS = [
      "fontFamily","fontSize","fontWeight","fontStyle","color","textAlign",
      "letterSpacing","lineHeight","textTransform","opacity",
      "animIn","animDuration","animDelay","animEasing",
      "x","y","width","height","badgeBg","badgeBorderColor","badgeBorderRadius",
      "badgePaddingX","badgePaddingY","badgeBorderWidth","subtype",
    ];

    const nextState = structuredClone(preset.state);
    nextState._presetId = preset.id;

    if (preset.background && typeof preset.background === "object") {
      nextState.background = structuredClone(preset.background);
    } else {
      nextState.background = structuredClone(slideState.background);
    }

    const existingTextLayers = (slideState.layers ?? []).filter(
      (l) => l.type === "text",
    );
    const presetTextLayers = (preset.state.layers ?? []).filter(
      (l) => l.type === "text",
    );

    nextState.layers = nextState.layers.map((presetLayer) => {
      if (presetLayer.type !== "text") return presetLayer;
      const byName = existingTextLayers.find(
        (el) => el.name && el.name === presetLayer.name,
      );
      const byIndex = existingTextLayers[
        presetTextLayers.findIndex((pl) => pl.id === presetLayer.id)
      ];
      const existing = byName ?? byIndex;
      if (!existing) return presetLayer;
      const merged = structuredClone(presetLayer);
      TEXT_STYLE_PROPS.forEach((prop) => {
        if (prop in presetLayer) merged[prop] = presetLayer[prop];
      });
      merged.content = existing.content;
      merged.id = existing.id;
      return merged;
    });

    return nextState;
  }

  async _getPreset(presetId) {
    try {
      const { PresetsDB } = await import("../db.js");
      return await PresetsDB.get(presetId);
    } catch {
      return null;
    }
  }
}
