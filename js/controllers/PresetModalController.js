/* ============================================================
   PresetModalController — Preset save modal wiring
   ============================================================ */

import { toast } from "../app.js";
import { bgSwatchStyle } from "../utils/ui-helpers.js";

export class PresetModalController {
  constructor({ presetService, canvas, brands }) {
    this._presetService = presetService;
    this._canvas = canvas;
    this._brands = brands;
    this._modal = null;
    this._existingPresets = [];
  }

  wire() {
    this._modal = document.getElementById("preset-save-modal");

    document.getElementById("btn-save-preset")?.addEventListener("click", () => this._openModal());
    document.getElementById("btn-close-preset-save-modal")?.addEventListener("click", () => this._closeModal());
    this._modal?.addEventListener("click", (e) => {
      if (e.target?.id === "preset-save-modal") this._closeModal();
    });

    document.getElementById("btn-preset-save-confirm")?.addEventListener("click", () => this._savePreset());

    document.getElementById("preset-save-target")?.addEventListener("change", (e) => {
      this._onTargetChange(e.target.value);
    });

    document.getElementById("btn-export-preset-json")?.addEventListener("click", () => this._exportSelectedPresetJson());

    document.getElementById("btn-import-preset-json")?.addEventListener("click", () => {
      document.getElementById("preset-import-file")?.click();
    });
    document.getElementById("preset-import-file")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) this._importPresetJson(file);
      e.target.value = "";
    });

    document.getElementById("btn-preset-delete")?.addEventListener("click", () => this._deleteSelectedPreset());
  }

  async _deleteSelectedPreset() {
    const targetId = document.getElementById("preset-save-target")?.value;
    if (!targetId || targetId === "__new__") return;
    const preset = this._existingPresets.find((p) => p.id === targetId);
    if (!preset) return;
    if (!confirm(`Excluir o preset "${preset.name}"?\n\nSlides vinculados a ele não serão afetados, mas perderão a referência ao preset.`)) return;
    try {
      await this._presetService.delete(targetId);
      this._existingPresets = this._existingPresets.filter((p) => p.id !== targetId);
      this._renderTargetSelect(null);
      toast(`Preset "${preset.name}" excluído.`, "success");
    } catch (e) {
      toast("Erro ao excluir preset.", "error");
      console.error(e);
    }
  }

  async _openModal() {
    if (!this._modal) return;
    this._existingPresets = await this._presetService.getAll();
    this._modal.style.display = "flex";
    this._modal.classList.add("open");
    // auto-select the preset linked to the current slide
    const activePresetId = this._canvas.getState()?._presetId ?? null;
    this._renderTargetSelect(activePresetId);
    const activePreset = activePresetId
      ? this._existingPresets.find((p) => p.id === activePresetId) ?? null
      : null;
    this._renderTextFieldsEditor(activePreset);
    this._renderMediaLayersEditor();
    this._updateBgPreview();
    await this._renderPalettePreview();
  }

  _closeModal() {
    this._modal?.classList.remove("open");
    if (this._modal) this._modal.style.display = "none";
  }

  /* ── Target select ──────────────────────────────────────── */

  _renderTargetSelect(autoSelectId = null) {
    const sel = document.getElementById("preset-save-target");
    if (!sel) return;
    sel.innerHTML = `<option value="__new__">✦ Criar novo preset</option>`;
    if (this._existingPresets.length) {
      const grp = document.createElement("optgroup");
      grp.label = "Sobrescrever existente";
      this._existingPresets.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    }
    const initial = autoSelectId && this._existingPresets.find((p) => p.id === autoSelectId)
      ? autoSelectId
      : "__new__";
    sel.value = initial;
    this._onTargetChange(initial);
  }

  _onTargetChange(value) {
    const nameRow = document.getElementById("preset-save-name-row");
    const overwriteInfo = document.getElementById("preset-overwrite-info");
    const overwriteName = document.getElementById("preset-overwrite-name");
    const deleteBtn = document.getElementById("btn-preset-delete");
    const isNew = value === "__new__";

    if (nameRow) nameRow.style.display = isNew ? "block" : "none";
    if (deleteBtn) deleteBtn.style.display = isNew ? "none" : "inline-flex";

    if (!isNew) {
      const preset = this._existingPresets.find((p) => p.id === value);
      if (overwriteName) overwriteName.textContent = `"${preset?.name ?? value}"`;
      if (overwriteInfo) overwriteInfo.style.display = "flex";
      const descInput = document.getElementById("preset-save-description");
      if (descInput && preset?.description != null) descInput.value = preset.description;
      // reload text fields with saved hint/maxChars
      this._renderTextFieldsEditor(preset ?? null);
    } else {
      if (overwriteInfo) overwriteInfo.style.display = "none";
      this._renderTextFieldsEditor(null);
    }
  }

  /* ── Text fields editor ─────────────────────────────────── */

  _renderTextFieldsEditor(existingPreset = null) {
    const el = document.getElementById("preset-text-fields-editor");
    const empty = document.getElementById("preset-no-text-fields");
    if (!el) return;

    const state = this._canvas.getState();
    const layers = state?.layers?.filter((l) => l?.type === "text") ?? [];
    // pass existingPreset so saved hint/maxChars/role are loaded from DB
    const existingFields = this._presetService.extractTextFields(state, existingPreset);

    if (!layers.length) {
      el.innerHTML = "";
      el.style.display = "none";
      if (empty) empty.style.display = "block";
      return;
    }

    el.style.display = "flex";
    if (empty) empty.style.display = "none";

    el.innerHTML = layers.map((l, idx) => {
      const field = existingFields[idx] ?? {};
      const maxChars = field.maxChars ?? 120;
      const hint = field.hint ?? "";
      const role = field.role ?? "texto";
      const ROLES = [
        ["título principal", "Título principal"],
        ["subtítulo ou descrição", "Subtítulo / Descrição"],
        ["tag ou categoria", "Tag / Categoria"],
        ["chamada para ação", "CTA / Botão"],
        ["nome ou autor", "Nome / Autor"],
        ["número ou etapa", "Número / Etapa"],
        ["texto", "Outro texto"],
      ];
      const roleOptions = ROLES.map(([v, lbl]) =>
        `<option value="${v}"${role === v ? " selected" : ""}>${lbl}</option>`
      ).join("");

      const preview = l.content ? `<span style="color:var(--text-muted);font-size:11px;font-style:italic;">"${String(l.content).slice(0, 40)}${l.content.length > 40 ? "…" : ""}"</span>` : "";

      return `<div style="border:1px solid var(--border);border-radius:8px;padding:10px;background:var(--surface-2);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:11px;font-weight:600;color:var(--accent);background:var(--accent-dim,rgba(100,120,255,0.15));padding:2px 6px;border-radius:4px;">${l.name ?? "Texto"}</span>
          <span style="font-size:11px;color:var(--text-muted);">${l.fontSize ?? ""}px · ${l.fontFamily ?? ""}</span>
          ${preview}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
          <div>
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">Papel deste campo</div>
            <select data-text-field-role="${l.id}" class="input input-sm" style="width:100%;">${roleOptions}</select>
          </div>
          <div>
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">Limite de caracteres</div>
            <input type="number" min="10" max="1000" data-text-field-maxchars="${l.id}" class="input input-sm" value="${maxChars}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">Dica para a IA <span style="opacity:.6;">(o que escrever aqui?)</span></div>
          <input type="text" data-text-field-hint="${l.id}" class="input input-sm" value="${hint}" placeholder="Ex: Uma frase curta de impacto, sem ponto final" style="width:100%;box-sizing:border-box;" />
        </div>
      </div>`;
    }).join("");
  }

  /* ── Media layers editor ────────────────────────────────── */

  _renderMediaLayersEditor() {
    const el = document.getElementById("preset-media-layers-editor");
    const empty = document.getElementById("preset-no-media-layers");
    if (!el) return;

    const state = this._canvas.getState();
    const layers = state?.layers?.filter((l) => l?.type === "image" || l?.type === "icon") ?? [];

    if (!layers.length) {
      el.innerHTML = "";
      el.style.display = "none";
      if (empty) empty.style.display = "block";
      return;
    }

    el.style.display = "flex";
    if (empty) empty.style.display = "none";

    el.innerHTML = layers.map((l) => {
      const isImage = l.type === "image";
      const thumb = isImage && l.src
        ? `<img src="${l.src}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;display:block;" />`
        : `<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--surface-3);border-radius:4px;font-size:20px;">${l.type === "icon" ? "◆" : "🖼"}</div>`;
      return `<label style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border:2px solid var(--border);border-radius:8px;cursor:pointer;transition:border-color .15s;position:relative;"
        title="${l.name ?? l.type}">
        <input type="checkbox" checked data-fixed-layer-id="${l.id}" style="position:absolute;top:4px;right:4px;width:14px;height:14px;" />
        ${thumb}
        <span style="font-size:10px;color:var(--text-muted);max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${l.name ?? l.type}</span>
      </label>`;
    }).join("");

    // highlight selected labels on toggle
    el.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      const label = cb.closest("label");
      const update = () => {
        if (label) label.style.borderColor = cb.checked ? "var(--accent)" : "var(--border)";
      };
      update();
      cb.addEventListener("change", update);
    });
  }

  /* ── Background preview ─────────────────────────────────── */

  _updateBgPreview() {
    const el = document.getElementById("preset-bg-preview");
    if (!el) return;
    const bg = this._canvas.getState()?.background;
    if (!bg) { el.innerHTML = "<span style='color:var(--text-muted)'>Sem fundo</span>"; return; }

    const swatchStyle = bgSwatchStyle(bg);
    const swatch = `<div style="width:36px;height:36px;border-radius:6px;flex-shrink:0;border:1px solid rgba(255,255,255,.1);${swatchStyle}"></div>`;

    if (bg.type === "solid") {
      el.innerHTML = `${swatch}<div><div style="font-size:12px;font-weight:500;">Sólido</div><div style="font-size:11px;color:var(--text-muted);">${bg.color ?? "#000000"}</div></div>`;
    } else if (bg.type === "gradient") {
      const g = bg.gradient ?? {};
      const typeLbl = g.type === "radial" ? "Radial" : "Linear";
      const angle = g.type === "radial" ? "centro" : `${g.angle ?? 135}°`;
      el.innerHTML = `${swatch}<div>
        <div style="font-size:12px;font-weight:500;">Gradiente ${typeLbl} — ${angle}</div>
        <div style="display:flex;gap:8px;margin-top:3px;align-items:center;">
          <div style="display:flex;align-items:center;gap:4px;">
            <div style="width:12px;height:12px;border-radius:2px;background:${g.from ?? "#000"};border:1px solid rgba(255,255,255,.15);"></div>
            <span style="font-size:11px;color:var(--text-muted);">${g.from ?? "#000"} ${(g.fromOpacity ?? 100) < 100 ? `· ${g.fromOpacity}%` : ""}</span>
          </div>
          <span style="color:var(--text-disabled);font-size:10px;">→</span>
          <div style="display:flex;align-items:center;gap:4px;">
            <div style="width:12px;height:12px;border-radius:2px;background:${g.to ?? "#fff"};border:1px solid rgba(255,255,255,.15);"></div>
            <span style="font-size:11px;color:var(--text-muted);">${g.to ?? "#fff"} ${(g.toOpacity ?? 100) < 100 ? `· ${g.toOpacity}%` : ""}</span>
          </div>
        </div>
        <div style="font-size:10px;color:var(--text-disabled);margin-top:2px;">de ${g.fromReach ?? 0}% até ${g.toReach ?? g.reach ?? 100}%</div>
      </div>`;
    } else if (bg.type === "image") {
      const imgThumb = bg.image
        ? `<img src="${bg.image}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0;" />`
        : swatch;
      el.innerHTML = `${imgThumb}<div><div style="font-size:12px;font-weight:500;">Imagem</div><div style="font-size:11px;color:var(--text-muted);">Tamanho: ${bg.imageSize ?? "cover"}</div></div>`;
    }
  }

  /* ── Palette preview ────────────────────────────────────── */

  async _renderPalettePreview() {
    const el = document.getElementById("preset-palette-preview");
    const empty = document.getElementById("preset-no-palette");
    if (!el) return;

    const brandId = this._brands?.getCurrentBrandId?.();
    const brand = brandId ? await this._brands.getCurrentBrand?.() : null;
    const palette = brand?.palette ?? [];

    if (!palette.length) {
      el.style.display = "none";
      if (empty) empty.style.display = "block";
      return;
    }

    el.style.display = "flex";
    if (empty) empty.style.display = "none";

    el.innerHTML = palette.map((entry) => {
      const color = typeof entry === "string" ? entry : entry?.hex ?? entry?.value ?? "#888";
      return `<div title="${color}" style="width:22px;height:22px;border-radius:4px;background:${color};border:1px solid rgba(255,255,255,.12);flex-shrink:0;"></div>`;
    }).join("");
  }

  /* ── Collect & save ─────────────────────────────────────── */

  async _savePreset() {
    const targetSel = document.getElementById("preset-save-target");
    const targetId = targetSel?.value ?? "__new__";
    const isNew = targetId === "__new__";

    const name = isNew
      ? document.getElementById("preset-save-name-input")?.value?.trim()
      : this._existingPresets.find((p) => p.id === targetId)?.name;

    if (!name) {
      toast("Informe um nome para o preset.", "error");
      return;
    }

    const description = document.getElementById("preset-save-description")?.value?.trim() ?? "";
    const textFields = this._collectTextFields();
    const fixedLayerIds = this._collectFixedLayerIds();
    const includePalette = document.getElementById("preset-save-include-palette")?.checked !== false;

    try {
      await this._presetService.save(
        name, description, textFields, fixedLayerIds,
        { overwriteId: isNew ? null : targetId, includePalette }
      );
      toast(isNew ? `Preset "${name}" criado.` : `Preset "${name}" atualizado.`, "success");
      this._closeModal();
    } catch (e) {
      toast("Erro ao salvar preset.", "error");
      console.error(e);
    }
  }

  _collectTextFields() {
    const state = this._canvas.getState();
    const existingFields = this._presetService.extractTextFields(state);
    const items = [];
    (state?.layers ?? []).filter((l) => l?.type === "text").forEach((l, idx) => {
      const roleEl = document.querySelector(`[data-text-field-role="${l.id}"]`);
      const hintEl = document.querySelector(`[data-text-field-hint="${l.id}"]`);
      const maxCharsEl = document.querySelector(`[data-text-field-maxchars="${l.id}"]`);
      const base = existingFields[idx] ?? {};
      items.push({
        ...base,
        layerId: l.id,
        layerName: l.name ?? "Texto",
        role: roleEl?.value ?? base.role ?? "texto",
        hint: hintEl?.value?.trim() ?? base.hint ?? "",
        maxChars: parseInt(maxCharsEl?.value ?? base.maxChars ?? 120) || 120,
      });
    });
    return items;
  }

  _collectFixedLayerIds() {
    const ids = [];
    document.querySelectorAll("[data-fixed-layer-id]").forEach((cb) => {
      if (cb.checked) ids.push(cb.dataset.fixedLayerId);
    });
    return ids;
  }

  /* ── Export / Import JSON ───────────────────────────────── */

  async _exportSelectedPresetJson() {
    const targetSel = document.getElementById("preset-save-target");
    const targetId = targetSel?.value;
    if (!targetId || targetId === "__new__") {
      toast("Selecione um preset existente para exportar.", "info");
      return;
    }
    const preset = await this._presetService.get(targetId);
    if (!preset) { toast("Preset não encontrado.", "error"); return; }
    const json = JSON.stringify({ _schema: "postgenerate-preset-v1", preset }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `preset-${preset.name.toLowerCase().replace(/[^\w]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Preset exportado.", "success");
  }

  async _importPresetJson(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const preset = data.preset ?? data;
      if (!preset?.name || !preset?.state) throw new Error("Formato inválido");
      const { uuid } = await import("../utils/ui-helpers.js");
      const { PresetsDB } = await import("../db.js");
      await PresetsDB.save({ ...preset, id: uuid(), importedAt: new Date().toISOString() });
      this._existingPresets = await this._presetService.getAll();
      this._renderTargetSelect();
      toast(`Preset "${preset.name}" importado.`, "success");
    } catch (e) {
      toast("Erro ao importar preset.", "error");
      console.error(e);
    }
  }
}
