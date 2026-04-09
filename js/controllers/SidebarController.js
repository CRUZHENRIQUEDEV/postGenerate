/* ============================================================
   SidebarController — Sidebar tabs, brand management
   ============================================================ */

import { toast } from "../app.js";
import { BrandManager } from "../brand-manager.js";
import { ColorsDB } from "../db.js";

export class SidebarController {
  constructor({ canvas, brands, picker, openFilePicker, onToast, onRefreshPropertiesPanel, onRefreshPresetsTab, onRefreshHistoryTab, onFitCanvas, onUpdateFormatBadge, onUpdateGradientBar }) {
    this._canvas = canvas;
    this._brands = brands;
    this._picker = picker;
    this._openFilePicker = openFilePicker;
    this._onToast = onToast || toast;
    this._onRefreshPropertiesPanel = onRefreshPropertiesPanel;
    this._onRefreshPresetsTab = onRefreshPresetsTab;
    this._onRefreshHistoryTab = onRefreshHistoryTab;
    this._onFitCanvas = onFitCanvas;
    this._onUpdateFormatBadge = onUpdateFormatBadge;
    this._onUpdateGradientBar = onUpdateGradientBar;
  }

  wire() {
    this._wireSidebar();
    this._wireBrandEvents();
    this._wireBrandDropdown();
  }

  refresh() {
    return this._refreshSidebar();
  }

  refreshBrandDropdown() {
    this._refreshBrandDropdown();
  }

  _wireSidebar() {
    document.querySelectorAll(".sidebar-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".sidebar-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add("active");
      });
    });
  }

  _wireBrandEvents() {
    document.getElementById("btn-add-global-color")?.addEventListener("click", () => {
      this._openPicker("#ffffff", null).then(async (hex) => {
        if (!hex) return;
        const brandId = this._brands.getCurrentBrandId();
        if (brandId) {
          const exists = await this._brands.hasBrandColor(brandId, hex);
          if (exists) {
            this._onToast("Essa cor já existe na paleta da marca.", "info");
            return;
          }
          await this._brands.addColorToBrand(brandId, hex);
        } else {
          const exists = await this._brands.hasGlobalColor(hex);
          if (exists) {
            this._onToast("Essa cor global já foi salva.", "info");
            return;
          }
          await ColorsDB.save({ hex, isGlobal: true });
        }
        await this._refreshSidebar();
        this._onToast("Cor adicionada!", "success");
      });
    });

    document.getElementById("btn-add-font")?.addEventListener("click", () => {
      this._openAddFontModal();
    });

    this._brands.on("requestAddLogo", () => {
      this._openFilePicker("image/*", async (file) => {
        const b64 = await BrandManager.readFileAsBase64(file);
        const brandId = this._brands.getCurrentBrandId();
        if (brandId) {
          await this._brands.setBrandLogo(brandId, b64, file.type);
        } else {
          await this._brands.addAsset({
            name: file.name,
            type: "logo",
            data: b64,
            mimeType: file.type,
          });
        }
        await this._refreshSidebar();
        this._onToast("Logo adicionado!", "success");
      });
    });

    document.getElementById("btn-save-brand-identity")?.addEventListener("click", async () => {
      const brandId = this._brands.getCurrentBrandId();
      if (!brandId) {
        this._onToast("Selecione uma marca para salvar a identidade.", "error");
        return;
      }
      const brand = await this._brands.getCurrentBrand();
      await this._brands.updateBrand(brandId, {
        ...brand,
        primaryFont: document.getElementById("brand-primary-font")?.value?.trim() ?? brand.primaryFont,
        secondaryFont: document.getElementById("brand-secondary-font")?.value?.trim() ?? brand.secondaryFont,
        brandVoice: document.getElementById("brand-voice")?.value?.trim() ?? brand.brandVoice,
        brandKeywords: document.getElementById("brand-keywords")?.value?.trim() ?? brand.brandKeywords,
      });
      this._onToast("Identidade da marca salva.", "success");
    });
  }

  _wireBrandDropdown() {
    this._brands.on("brandsChange", () => this._refreshBrandDropdown());
    this._brands.on("currentBrandChange", async (brand) => {
      await this._refreshSidebar();
      this._refreshBrandDropdown();
      this._fillBrandIdentityFields(brand);
    });
    this._refreshBrandDropdown();
  }

  _fillBrandIdentityFields(brand) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? "";
    };
    set("brand-primary-font", brand?.primaryFont);
    set("brand-secondary-font", brand?.secondaryFont);
    set("brand-voice", brand?.brandVoice);
    set("brand-keywords", brand?.brandKeywords);
  }

  _refreshBrandDropdown() {
    const menu = document.getElementById("brand-dropdown-menu");
    if (!menu) return;
    const brands = this._brands.getBrands();
    const currentId = this._brands.getCurrentBrandId();

    menu.innerHTML = `
      <div class="dropdown-label">Marcas</div>
      <button class="dropdown-item" data-brand-id="">— Sem marca —</button>
      ${brands.map((b) => `
        <button class="dropdown-item" data-brand-id="${b.id}">
          ${currentId === b.id ? "✓ " : ""}${b.name}
        </button>
      `).join("")}
      <div class="dropdown-sep"></div>
      <button class="dropdown-item" id="dd-new-brand">+ Nova marca</button>
      <button class="dropdown-item" id="dd-backup-all">⬇ Backup completo</button>
    `;

    menu.querySelectorAll("[data-brand-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await this._brands.setCurrentBrand(btn.dataset.brandId || null);
        menu.classList.remove("open");
        const label = btn.dataset.brandId
          ? (brands.find((b) => b.id === btn.dataset.brandId)?.name ?? "Marca")
          : "Sem marca";
        document.getElementById("brand-name-label").textContent = label;
      });
    });

    menu.querySelector("#dd-new-brand")?.addEventListener("click", async () => {
      const name = prompt("Nome da nova marca:");
      if (!name) return;
      const brand = await this._brands.createBrand(name);
      await this._brands.setCurrentBrand(brand.id);
      menu.classList.remove("open");
      document.getElementById("brand-name-label").textContent = brand.name;
      this._onToast(`Marca "${brand.name}" criada!`, "success");
    });

    menu.querySelector("#dd-backup-all")?.addEventListener("click", async () => {
      menu.classList.remove("open");
      await this._exportFullBackup();
    });
  }

  async _refreshSidebar() {
    const colorsContainer = document.getElementById("sidebar-colors");
    if (colorsContainer) {
      await this._brands.renderPalette(
        colorsContainer,
        (hex) => {
          const layer = this._canvas.getSelectedLayer();
          if (layer && layer.type === "text") {
            this._canvas.snapshot();
            this._canvas.updateLayer(layer.id, { color: hex });
            this._setSwatch("prop-color-swatch", hex);
            if (this._onRefreshPropertiesPanel) this._onRefreshPropertiesPanel(this._canvas.getSelectedLayer());
          }
        },
        async (colorId) => {
          const ok = confirm("Tem certeza que deseja remover essa cor da paleta?");
          if (!ok) return;
          const brandId = this._brands.getCurrentBrandId();
          if (brandId) {
            await this._brands.removeColorFromBrand(brandId, colorId);
            await this._refreshSidebar();
          }
        },
      );
    }

    const logosContainer = document.getElementById("sidebar-logos");
    if (logosContainer) {
      const { makeImageLayer } = await import("../canvas-engine.js");
      await this._brands.renderLogos(logosContainer, (asset) => {
        this._canvas.snapshot();
        this._canvas.addLayer(makeImageLayer(null, asset.name, asset.data));
      });
    }

    const fontsContainer = document.getElementById("sidebar-fonts");
    if (fontsContainer) {
      await this._brands.renderFonts(fontsContainer, (font) => {
        const layer = this._canvas.getSelectedLayer();
        if (layer && layer.type === "text") {
          this._canvas.snapshot();
          this._canvas.updateLayer(layer.id, { fontFamily: font.family });
          this._setVal("prop-font-family", font.family);
        }
      });
    }

    if (this._onRefreshPresetsTab) await this._onRefreshPresetsTab();
    if (this._onRefreshHistoryTab) await this._onRefreshHistoryTab();
  }

  _setSwatch(id, color) {
    const el = document.getElementById(id);
    if (!el) return;
    const fill = el.querySelector(".swatch-fill");
    if (fill) fill.style.background = color;
    else el.style.background = color;
  }

  _setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  }

  _openPicker(initialColor, onLive) {
    ColorsDB.getAll().then((colors) => {
      this._picker.loadSavedColors(colors);
    });
    return this._picker.open(initialColor, onLive);
  }

  _openAddFontModal() {
    const name = prompt("Nome da fonte (ex: Montserrat):");
    if (!name) return;
    const brandId = this._brands.getCurrentBrandId();
    this._brands.addFontToBrand(brandId, { name, family: name, source: "google" }).then(async () => {
      await this._refreshSidebar();
      this._onToast(`Fonte "${name}" adicionada!`, "success");
    });
  }

  async _exportFullBackup() {
    try {
      const { BrandsDB, ProjectsDB, PresetsDB, ColorsDB, FontsDB, AssetsDB } = await import("../db.js");
      this._onToast("Preparando backup completo...", "info");
      const [brands, projects, presets, colors, fonts, assets] = await Promise.all([
        BrandsDB.getAll(),
        ProjectsDB.getAll(),
        PresetsDB.getAll(),
        ColorsDB.getAll(),
        FontsDB.getAll(),
        AssetsDB.getAll(),
      ]);
      const payload = {
        schema: "postgenerate-backup-v1",
        exportedAt: new Date().toISOString(),
        appVersion: "v1.0.1",
        brands,
        projects,
        presets,
        colors,
        fonts,
        assets,
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `postgenerate-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this._onToast("Backup completo exportado!", "success");
    } catch (e) {
      this._onToast("Erro ao exportar backup.", "error");
      console.error(e);
    }
  }
}