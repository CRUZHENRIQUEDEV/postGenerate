/* ============================================================
   BackupService — Import/export backup
   ============================================================ */

import { BrandsDB, FontsDB, AssetsDB, ColorsDB, PostHistoryDB, BrandDocsDB, AIConfigDB, ProjectsDB, PresetsDB } from "../db.js";
import { uuid } from "../utils/ui-helpers.js";

export class BackupService {
  constructor(brands) {
    this._brands = brands;
  }

  async exportFullBackup() {
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
  }

  async collectBrandBundle(brandId) {
    if (!brandId) return null;
    const brand = await BrandsDB.get(brandId);
    if (!brand) return null;
    const [fonts, assets, colors, history, docs, aiConfigs] = await Promise.all([
      FontsDB.getByBrand(brandId),
      AssetsDB.getByBrand(brandId),
      ColorsDB.getByBrand(brandId),
      PostHistoryDB.getByBrand(brandId),
      BrandDocsDB.getByBrand(brandId),
      AIConfigDB.getByBrand(brandId),
    ]);
    return { brand, fonts, assets, colors, history, docs, aiConfigs };
  }

  async importBrandBundle(bundle, setCurrent = true) {
    const sourceBrand = bundle?.brand;
    if (!sourceBrand) throw new Error("Pacote de marca inválido.");
    const now = new Date().toISOString();
    const newBrandId = uuid();
    const fontIdMap = new Map();
    const importedFonts = [];

    for (const font of bundle.fonts ?? []) {
      const newFontId = uuid();
      fontIdMap.set(font.id, newFontId);
      importedFonts.push({ ...font, id: newFontId, brandId: newBrandId, createdAt: now });
    }
    for (const font of importedFonts) await FontsDB.save(font);

    await BrandsDB.save({
      ...sourceBrand,
      id: newBrandId,
      name: `${sourceBrand.name || "Marca"} (importada)`,
      fontIds: (sourceBrand.fontIds ?? []).map((id) => fontIdMap.get(id)).filter(Boolean),
      createdAt: now,
      updatedAt: now,
    });

    for (const asset of bundle.assets ?? []) {
      await AssetsDB.save({ ...asset, id: uuid(), brandId: newBrandId, createdAt: now });
    }
    for (const color of bundle.colors ?? []) {
      await ColorsDB.save({ ...color, id: uuid(), brandId: newBrandId, isGlobal: 0, createdAt: now });
    }
    for (const h of bundle.history ?? []) {
      await PostHistoryDB.save({ ...h, id: uuid(), brandId: newBrandId, createdAt: now, updatedAt: now });
    }
    for (const doc of bundle.docs ?? []) {
      await BrandDocsDB.save({ ...doc, id: uuid(), brandId: newBrandId, createdAt: now, updatedAt: now });
    }
    for (const cfg of bundle.aiConfigs ?? []) {
      await AIConfigDB.save({ ...cfg, id: uuid(), brandId: newBrandId, createdAt: now, updatedAt: now });
    }
    for (const preset of bundle.presets ?? []) {
      await PresetsDB.save({ ...preset, id: uuid(), ownerBrandId: newBrandId, brandId: null, createdAt: now, updatedAt: now });
    }

    await this._brands.init();
    if (setCurrent) await this._brands.setCurrentBrand(newBrandId);
    return newBrandId;
  }

  async readBrandPayloadFromFile(file) {
    const name = String(file?.name ?? "").toLowerCase();
    if (name.endsWith(".zip") && window.JSZip) {
      const buffer = await file.arrayBuffer();
      const zip = await window.JSZip.loadAsync(buffer);
      const entry = zip.file("brand.json");
      if (!entry) throw new Error("brand.json não encontrado no ZIP.");
      const text = await entry.async("text");
      return JSON.parse(text);
    }
    const raw = await file.text();
    return JSON.parse(raw);
  }

  async importProjectFromFile(file) {
    const raw = await file.text();
    const data = JSON.parse(raw);
    if (!data?.project || !String(data?.schema || "").startsWith("postgenerate-project-v")) {
      throw new Error("Arquivo inválido.");
    }
    let importedBrandId = null;
    if (data?.brandBundle?.brand) {
      importedBrandId = await this.importBrandBundle(data.brandBundle, { setCurrent: false });
    }
    if (Array.isArray(data?.associatedPresets) && data.associatedPresets.length) {
      for (const preset of data.associatedPresets) {
        await PresetsDB.save({
          ...preset,
          id: uuid(),
          ownerBrandId: importedBrandId ?? preset.ownerBrandId ?? null,
          brandId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    const source = data.project;
    const importedId = uuid();
    await ProjectsDB.save({
      ...source,
      id: importedId,
      name: `${source.name || "Projeto"} (importado)`,
      brandId: importedBrandId ?? source.brandId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return importedId;
  }
}
