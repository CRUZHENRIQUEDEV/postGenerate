/* ============================================================
   PresetModalController — Preset save modal wiring
   ============================================================ */

import { toast } from "../app.js";

export class PresetModalController {
  constructor({ presetService, canvas }) {
    this._presetService = presetService;
    this._canvas = canvas;
    this._modal = null;
  }

  wire() {
    this._modal = document.getElementById("preset-save-modal");

    document.getElementById("btn-save-preset")?.addEventListener("click", () => {
      this._openModal();
    });

    document.getElementById("btn-close-preset-save-modal")?.addEventListener("click", () => {
      this._closeModal();
    });

    this._modal?.addEventListener("click", (e) => {
      if (e.target?.id === "preset-save-modal") this._closeModal();
    });

    document.getElementById("btn-preset-save-new")?.addEventListener("click", () => {
      this._saveNewPreset();
    });
  }

  _openModal() {
    if (!this._modal) return;
    this._modal.style.display = "flex";
    this._modal.classList.add("open");
    this._renderTextFieldsEditor();
    this._renderFixedLayersEditor();
    this._updateBgPreview();
  }

  _closeModal() {
    this._modal?.classList.remove("open");
    this._modal.style.display = "none";
  }

  async _saveNewPreset() {
    const name = document.getElementById("preset-save-name-input")?.value?.trim();
    if (!name) {
      toast("Informe um nome para o preset.", "error");
      return;
    }
    const description = document.getElementById("preset-save-description")?.value?.trim() || "";
    const textFields = this._collectTextFields();
    const fixedLayerIds = this._collectFixedLayerIds();
    try {
      await this._presetService.save(name, description, textFields, fixedLayerIds);
      toast("Preset salvo.", "success");
      this._closeModal();
    } catch (e) {
      toast("Erro ao salvar preset.", "error");
    }
  }

  _renderTextFieldsEditor() {
    const el = document.getElementById("preset-text-fields-editor");
    if (!el) return;
    const state = this._canvas.getState();
    const layers = state?.layers?.filter(l => l?.type === "text") ?? [];
    el.innerHTML = layers.map(l => `
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="text" class="input input-sm" value="${l.name ?? ""}" data-text-field-name="${l.id}" style="flex:1" />
        <select data-text-field-role="${l.id}" class="input input-sm" style="width:100px">
          <option value="headline">Headline</option>
          <option value="subheadline">Subheadline</option>
          <option value="badge">Badge</option>
          <option value="caption">Caption</option>
          <option value="author">Author</option>
        </select>
      </div>
    `).join("");
  }

  _renderFixedLayersEditor() {
    const el = document.getElementById("preset-fixed-layers-editor");
    if (!el) return;
    const state = this._canvas.getState();
    const layers = state?.layers?.filter(l => l?.type !== "text") ?? [];
    el.innerHTML = layers.map(l => `
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
        <input type="checkbox" checked data-fixed-layer-id="${l.id}" />
        <span>${l.name ?? l.type ?? ""}</span>
      </div>
    `).join("");
  }

  _collectTextFields() {
    const items = [];
    document.querySelectorAll("[data-text-field-name]").forEach(input => {
      const layerId = input.dataset.textFieldName;
      const roleEl = document.querySelector(`[data-text-field-role="${layerId}"]`);
      items.push({
        layerId,
        layerName: input.value,
        role: roleEl?.value ?? "text",
      });
    });
    return items;
  }

  _collectFixedLayerIds() {
    const ids = [];
    document.querySelectorAll("[data-fixed-layer-id]").forEach(cb => {
      if (cb.checked) ids.push(cb.dataset.fixedLayerId);
    });
    return ids;
  }

  _updateBgPreview() {
    const el = document.getElementById("preset-bg-preview");
    if (!el) return;
    const state = this._canvas.getState();
    const bg = state?.background;
    if (!bg) { el.textContent = "Sem fundo"; return; }
    if (bg.type === "solid") el.textContent = `Fundo sólido: ${bg.color ?? "#000"}`;
    else if (bg.type === "gradient") el.textContent = "Fundo gradiente";
    else el.textContent = "Fundo customizado";
  }
}
