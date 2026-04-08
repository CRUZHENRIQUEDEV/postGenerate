/* ============================================================
   PostGenerate — Brand Manager
   CRUD for brand profiles + UI rendering for sidebar.
   Handles: brand colors, fonts, logos quick-access.
   ============================================================ */

import {
  BrandsDB,
  FontsDB,
  AssetsDB,
  ColorsDB,
  PresetsDB,
  PostHistoryDB,
  ProjectsDB,
  BrandDocsDB,
} from "./db.js";

export class BrandManager {
  constructor() {
    this._currentBrandId = null;
    this._brands = [];
    this._listeners = {};
  }

  /* ── Init ─────────────────────────────────────────────── */
  async init() {
    this._brands = await BrandsDB.getAll();
    if (this._brands.length > 0 && !this._currentBrandId) {
      this._currentBrandId = this._brands[0].id;
    }
    this._emit("brandsLoaded", this._brands);
  }

  /* ── CRUD ─────────────────────────────────────────────── */
  async createBrand(name) {
    const brand = await BrandsDB.save({
      name,
      palette: [],
      fontIds: [],
      logo: null,
    });
    this._brands = await BrandsDB.getAll();
    this._emit("brandsChange", this._brands);
    return brand;
  }

  async updateBrand(id, patch) {
    const existing = await BrandsDB.get(id);
    if (!existing) return;
    await BrandsDB.save({ ...existing, ...patch });
    this._brands = await BrandsDB.getAll();
    this._emit("brandsChange", this._brands);
    if (id === this._currentBrandId) {
      this._emit("currentBrandChange", await BrandsDB.get(id));
    }
  }

  async deleteBrand(id) {
    await BrandsDB.delete(id);
    this._brands = await BrandsDB.getAll();
    if (this._currentBrandId === id) {
      this._currentBrandId = this._brands[0]?.id ?? null;
    }
    this._emit("brandsChange", this._brands);
  }

  async setCurrentBrand(id) {
    this._currentBrandId = id;
    const brand = id ? await BrandsDB.get(id) : null;
    this._emit("currentBrandChange", brand);
  }

  getCurrentBrandId() {
    return this._currentBrandId;
  }

  async getCurrentBrand() {
    if (!this._currentBrandId) return null;
    return BrandsDB.get(this._currentBrandId);
  }

  getBrands() {
    return this._brands;
  }

  /* ── Brand colors ─────────────────────────────────────── */
  async addColorToBrand(brandId, hex, name = "") {
    const brand = await BrandsDB.get(brandId);
    if (!brand) return;
    const normalizedHex = this._normalizeHex(hex);
    brand.palette = brand.palette ?? [];
    if (brand.palette.some((c) => this._normalizeHex(c.hex) === normalizedHex))
      return null;
    const entry = { id: crypto.randomUUID(), hex, name };
    brand.palette.push(entry);
    await BrandsDB.save(brand);
    this._emit("paletteChange", { brandId, palette: brand.palette });
    return entry;
  }

  async hasGlobalColor(hex) {
    const normalizedHex = this._normalizeHex(hex);
    const colors = await ColorsDB.getAll();
    return colors.some(
      (c) => this._normalizeHex(c.hex) === normalizedHex && !!c.isGlobal,
    );
  }

  async hasBrandColor(brandId, hex) {
    const normalizedHex = this._normalizeHex(hex);
    const brand = await BrandsDB.get(brandId);
    return !!brand?.palette?.some(
      (c) => this._normalizeHex(c.hex) === normalizedHex,
    );
  }

  async removeColorFromBrand(brandId, colorId) {
    const brand = await BrandsDB.get(brandId);
    if (!brand) return;
    brand.palette = (brand.palette ?? []).filter((c) => c.id !== colorId);
    await BrandsDB.save(brand);
    this._emit("paletteChange", { brandId, palette: brand.palette });
  }

  /* ── Brand fonts ──────────────────────────────────────── */
  async addFontToBrand(brandId, fontData) {
    const font = await FontsDB.save({ ...fontData, brandId });
    const brand = await BrandsDB.get(brandId);
    if (brand) {
      brand.fontIds = [...(brand.fontIds ?? []), font.id];
      await BrandsDB.save(brand);
    }
    this._emit("fontsChange", { brandId });
    return font;
  }

  async getBrandFonts(brandId) {
    return FontsDB.getByBrand(brandId);
  }

  async getGlobalFonts() {
    return FontsDB.getGlobal();
  }

  /* ── Brand assets (logos, icons) ─────────────────────── */
  async addAsset(assetData, brandId = null) {
    const asset = await AssetsDB.save({ ...assetData, brandId });
    this._emit("assetsChange", { brandId });
    return asset;
  }

  async getBrandAssets(brandId, type = null) {
    const all = await AssetsDB.getByBrand(brandId);
    return type ? all.filter((a) => a.type === type) : all;
  }

  async getAllLogos() {
    return AssetsDB.getByType("logo");
  }

  async getAllIcons() {
    return AssetsDB.getByType("icon");
  }

  async removeAsset(id) {
    await AssetsDB.delete(id);
    this._emit("assetsChange", {});
  }

  async exportBrandPackage(brandId) {
    const brand = await BrandsDB.get(brandId);
    if (!brand) throw new Error("Marca não encontrada.");
    const [fonts, assets, presets, history, projects, docs] = await Promise.all([
      FontsDB.getByBrand(brandId),
      AssetsDB.getByBrand(brandId),
      PresetsDB.getByBrand(brandId),
      PostHistoryDB.getByBrand(brandId),
      ProjectsDB.getByBrand(brandId),
      BrandDocsDB.getByBrand(brandId),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      brand,
      fonts,
      assets,
      presets,
      history,
      projects,
      docs,
    };
    const fileName = `marca-${(brand.name ?? "sem-nome").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`;
    if (window.JSZip) {
      const zip = new window.JSZip();
      zip.file("brand.json", JSON.stringify(payload, null, 2));
      assets.forEach((asset, idx) => {
        if (!asset?.data?.startsWith?.("data:")) return;
        const parts = asset.data.split(",");
        if (parts.length !== 2) return;
        const ext = (asset.mimeType?.split("/")[1] || "bin").split(";")[0];
        zip.file(
          `assets/${idx + 1}-${asset.name || "asset"}.${ext}`,
          parts[1],
          { base64: true },
        );
      });
      const blob = await zip.generateAsync({ type: "blob" });
      this._downloadBlob(blob, `${fileName}.zip`);
      return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    this._downloadBlob(blob, `${fileName}.json`);
  }

  /* ── Logo setter for brand ────────────────────────────── */
  async setBrandLogo(brandId, base64, mimeType = "image/png") {
    // Save as asset
    const asset = await AssetsDB.save({
      name: "Logo",
      type: "logo",
      data: base64,
      mimeType,
      brandId,
    });
    // Also embed in brand record
    await this.updateBrand(brandId, { logo: base64 });
    return asset;
  }

  /* ── UI rendering helpers ─────────────────────────────── */

  /** Render brand selector dropdown content */
  renderBrandOptions(selectEl) {
    selectEl.innerHTML = '<option value="">— Sem marca —</option>';
    this._brands.forEach((brand) => {
      const opt = document.createElement("option");
      opt.value = brand.id;
      opt.textContent = brand.name;
      opt.selected = brand.id === this._currentBrandId;
      selectEl.appendChild(opt);
    });
  }

  /** Render palette swatches into container */
  async renderPalette(container, onColorClick, onColorDelete) {
    container.innerHTML = "";
    const brand = await this.getCurrentBrand();
    if (!brand || !brand.palette?.length) {
      container.innerHTML =
        '<span style="font-size:11px;color:var(--text-disabled);">Sem cores salvas</span>';
      return;
    }
    brand.palette.forEach(({ hex, name, id }) => {
      // Wrapper so X button can be positioned over the swatch
      const wrap = document.createElement("div");
      wrap.style.cssText =
        "position:relative;display:inline-block;flex-shrink:0;";

      const s = document.createElement("div");
      s.className = "palette-swatch";
      s.style.background = hex;
      s.title = (name || hex) + "\nClique para aplicar";
      s.dataset.colorId = id;
      s.addEventListener("click", () => onColorClick?.(hex, name));

      // X button — appears on hover
      const del = document.createElement("button");
      del.innerHTML = "×";
      del.title = "Remover cor";
      del.style.cssText = `
        position: absolute;
        top: -5px; right: -5px;
        width: 14px; height: 14px;
        border-radius: 50%;
        background: #f87171;
        border: 1px solid rgba(0,0,0,0.4);
        color: #fff;
        font-size: 10px;
        line-height: 1;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0;
        z-index: 10;
      `;
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        onColorDelete?.(id, hex);
      });

      wrap.addEventListener("mouseenter", () => {
        del.style.display = "flex";
      });
      wrap.addEventListener("mouseleave", () => {
        del.style.display = "none";
      });

      wrap.appendChild(s);
      wrap.appendChild(del);
      container.appendChild(wrap);
    });
  }

  /** Render logo thumbnails */
  async renderLogos(container, onLogoClick) {
    container.innerHTML = "";
    const brand = await this.getCurrentBrand();
    const logos = brand
      ? await this.getBrandAssets(brand.id, "logo")
      : await this.getAllLogos();

    logos.forEach((asset) => {
      const thumb = document.createElement("div");
      thumb.className = "asset-thumb";
      if (asset.data) {
        const img = document.createElement("img");
        img.src = asset.data;
        img.alt = asset.name;
        thumb.appendChild(img);
      }
      thumb.addEventListener("click", () => onLogoClick?.(asset));
      container.appendChild(thumb);
    });

    // Add button
    const addBtn = document.createElement("div");
    addBtn.className = "asset-thumb asset-thumb-add";
    addBtn.innerHTML = "+";
    addBtn.title = "Adicionar logo";
    addBtn.addEventListener("click", () => this._emit("requestAddLogo", {}));
    container.appendChild(addBtn);
  }

  /** Render font chips */
  async renderFonts(container, onFontClick) {
    container.innerHTML = "";
    const brand = await this.getCurrentBrand();
    const fonts = brand
      ? [
          ...(await this.getBrandFonts(brand.id)),
          ...(await this.getGlobalFonts()),
        ]
      : await this.getGlobalFonts();

    if (!fonts.length) {
      container.innerHTML =
        '<span style="font-size:11px;color:var(--text-disabled);">Nenhuma fonte salva</span>';
      return;
    }

    fonts.forEach((font) => {
      const chip = document.createElement("div");
      chip.className = "font-chip";
      chip.innerHTML = `
        <span class="font-chip-name" style="font-family:'${font.family}',sans-serif">${font.family}</span>
        <span class="font-chip-sample" style="font-family:'${font.family}',sans-serif">Aa</span>
      `;
      chip.addEventListener("click", () => onFontClick?.(font));
      container.appendChild(chip);
    });
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

  /* ── File reading helper ──────────────────────────────── */
  static readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  static readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  _normalizeHex(hex) {
    return String(hex ?? "")
      .trim()
      .toLowerCase();
  }

  _hexToRgb(hex) {
    const clean = (hex ?? "").replace("#", "");
    if (clean.length < 6) return null;
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }

  _rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  }

  _hslToRgb(h, s, l) {
    const hsl = [h / 360, s / 100, l / 100];
    if (hsl[1] === 0) {
      const v = Math.round(hsl[2] * 255);
      return [v, v, v];
    }
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = hsl[2] < 0.5 ? hsl[2] * (1 + hsl[1]) : hsl[2] + hsl[1] - hsl[2] * hsl[1];
    const p = 2 * hsl[2] - q;
    return [
      Math.round(hue2rgb(p, q, hsl[0] + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, hsl[0]) * 255),
      Math.round(hue2rgb(p, q, hsl[0] - 1 / 3) * 255),
    ];
  }

  generateTones(baseHex, levels = [0.8, 0.6, 0.4, 0.2]) {
    const rgb = this._hexToRgb(baseHex);
    if (!rgb) return [];
    const r1 = rgb.r / 255, g1 = rgb.g / 255, b1 = rgb.b / 255;
    const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r1: h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6; break;
        case g1: h = ((b1 - r1) / d + 2) / 6; break;
        default: h = ((r1 - g1) / d + 4) / 6;
      }
    }
    const h360 = h * 360, s100 = s * 100, l100 = l * 100;
    return levels.map(t => {
      const lighter = Math.min(100, l100 + t * (100 - l100));
      const [r, g, b] = this._hslToRgb(h360, s100, lighter);
      return this._rgbToHex(r, g, b);
    });
  }

  generateShades(baseHex, levels = [0.8, 0.6, 0.4, 0.2]) {
    const rgb = this._hexToRgb(baseHex);
    if (!rgb) return [];
    const r1 = rgb.r / 255, g1 = rgb.g / 255, b1 = rgb.b / 255;
    const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r1: h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6; break;
        case g1: h = ((b1 - r1) / d + 2) / 6; break;
        default: h = ((r1 - g1) / d + 4) / 6;
      }
    }
    const h360 = h * 360, s100 = s * 100, l100 = l * 100;
    return levels.map(t => {
      const darker = Math.max(0, l100 - t * l100);
      const [r, g, b] = this._hslToRgb(h360, s100, darker);
      return this._rgbToHex(r, g, b);
    });
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
