/* ============================================================
   HistoryService — Brand history management
   ============================================================ */

import { PostHistoryDB } from "../db.js";

export class HistoryService {
  constructor(canvas, brands, exporter) {
    this._canvas = canvas;
    this._brands = brands;
    this._exporter = exporter;
    this._lastSignature = "";
    this._saveTimer = null;
    this._loadingProject = false;
  }

  setLoading(val) { this._loadingProject = val; }

  async save() {
    const brandId = this._brands?.getCurrentBrandId?.();
    if (!brandId) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(async () => {
      try {
        if (this._loadingProject) return;
        const state = this._canvas.getState();
        const signature = JSON.stringify(state);
        if (signature === this._lastSignature) return;
        const thumbnail = await this._exporter.generateThumbnail(180);
        await PostHistoryDB.save({
          brandId,
          name: `Post ${new Date().toLocaleString("pt-BR")}`,
          formatId: state.formatId,
          state,
          thumbnail,
        });
        this._lastSignature = signature;
      } catch (e) {
        console.error("Erro ao salvar histórico:", e);
      }
    }, 1200);
  }

  async getByBrand(brandId) {
    return await PostHistoryDB.getByBrand(brandId);
  }

  async getAll() {
    return await PostHistoryDB.getAll();
  }
}
