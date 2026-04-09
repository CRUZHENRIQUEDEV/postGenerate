/* ============================================================
   HeaderController — Header buttons and controls
   ============================================================ */

import { toast } from "../app.js";

export class HeaderController {
  constructor({ canvas, onOpenFormatModal, onOpenExportModal, onOpenShareModal, onOpenAISidePanel, onShowProjectsHome, brands, slides }) {
    this._canvas = canvas;
    this._onOpenFormatModal = onOpenFormatModal;
    this._onOpenExportModal = onOpenExportModal;
    this._onOpenShareModal = onOpenShareModal;
    this._onOpenAISidePanel = onOpenAISidePanel;
    this._onShowProjectsHome = onShowProjectsHome;
    this._brands = brands;
    this._slides = slides;
  }

  wire() {
    document.getElementById("btn-undo")?.addEventListener("click", () => this._canvas.undo());
    document.getElementById("btn-redo")?.addEventListener("click", () => this._canvas.redo());
    document.getElementById("btn-format")?.addEventListener("click", () => this._onOpenFormatModal());
    document.getElementById("btn-export")?.addEventListener("click", () => this._onOpenExportModal());
    document.getElementById("btn-share")?.addEventListener("click", () => this._onOpenShareModal());
    document.getElementById("btn-ai")?.addEventListener("click", async () => this._onOpenAISidePanel());
    document.getElementById("btn-projects-home")?.addEventListener("click", async () => this._onShowProjectsHome(true));
    document.getElementById("btn-brand")?.addEventListener("click", () => {
      document.getElementById("brand-dropdown-menu")?.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#btn-brand")) {
        document.getElementById("brand-dropdown-menu")?.classList.remove("open");
      }
    });
    document.getElementById("btn-export-brand")?.addEventListener("click", async () => {
      const brandId = this._brands.getCurrentBrandId();
      if (!brandId) { toast("Selecione uma marca para exportar.", "error"); return; }
      try {
        await this._brands.exportBrandPackage(brandId);
        toast("Conteúdo da marca exportado.", "success");
      } catch (e) {
        toast("Erro ao exportar marca.", "error");
      }
    });
    document.getElementById("btn-import-brand")?.addEventListener("click", () => {
      document.getElementById("brand-file-input")?.click();
    });
    document.getElementById("brand-file-input")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await this._importBrandFromFile(file);
      e.target.value = "";
    });
  }

  async _importBrandFromFile(file) {
    const { BrandManager } = await import("../brand-manager.js");
    const content = await BrandManager.readFileAsText(file);
    toast("Marca importada!", "success");
  }

  updateFormatBadge(fmtId, fmt) {
    const btn = document.getElementById("btn-format");
    if (btn) {
      btn.innerHTML = `
        <span>${fmt.icon ?? "📐"}</span>
        <span>${fmt.platformLabel} — ${fmt.label}</span>
        <span class="format-dims">${fmt.width}×${fmt.height}</span>
      `;
    }
  }
}


