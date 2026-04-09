/* ============================================================
   PostGenerate — IndexedDB Layer
   Version: 1
   Stores:
     brands   — brand profiles (colors, fonts, logo)
     fonts    — saved font references
     assets   — logos, icons, graphic elements (base64)
     colors   — color library (global + per-brand)
     presets  — saved post states
   ============================================================ */

const DB_NAME = "PostGenerateDB";
const DB_VERSION = 4;

let _db = null;
const uuid = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`);

/* ── Open / upgrade ─────────────────────────────────────── */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) {
      resolve(_db);
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(new Error("Erro ao abrir banco de dados"));

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      /* brands */
      if (!db.objectStoreNames.contains("brands")) {
        const s = db.createObjectStore("brands", { keyPath: "id" });
        s.createIndex("name", "name", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }

      /* fonts */
      if (!db.objectStoreNames.contains("fonts")) {
        const s = db.createObjectStore("fonts", { keyPath: "id" });
        s.createIndex("family", "family", { unique: false });
        s.createIndex("brandId", "brandId", { unique: false });
      }

      /* assets */
      if (!db.objectStoreNames.contains("assets")) {
        const s = db.createObjectStore("assets", { keyPath: "id" });
        s.createIndex("type", "type", { unique: false });
        s.createIndex("brandId", "brandId", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }

      /* colors */
      if (!db.objectStoreNames.contains("colors")) {
        const s = db.createObjectStore("colors", { keyPath: "id" });
        s.createIndex("brandId", "brandId", { unique: false });
        s.createIndex("isGlobal", "isGlobal", { unique: false });
      }

      /* presets */
      if (!db.objectStoreNames.contains("presets")) {
        const s = db.createObjectStore("presets", { keyPath: "id" });
        s.createIndex("brandId", "brandId", { unique: false });
        s.createIndex("formatId", "formatId", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("postHistory")) {
        const s = db.createObjectStore("postHistory", { keyPath: "id" });
        s.createIndex("brandId", "brandId", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("projects")) {
        const s = db.createObjectStore("projects", { keyPath: "id" });
        s.createIndex("name", "name", { unique: false });
        s.createIndex("brandId", "brandId", { unique: false });
        s.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("aiConfig")) {
        const s = db.createObjectStore("aiConfig", { keyPath: "id" });
        s.createIndex("brandId", "brandId", { unique: false });
        s.createIndex("provider", "provider", { unique: false });
        s.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("brandDocs")) {
        const s = db.createObjectStore("brandDocs", { keyPath: "id" });
        s.createIndex("brandId", "brandId", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

/* ── Generic helpers ────────────────────────────────────── */
function tx(store, mode = "readonly") {
  return _db.transaction([store], mode).objectStore(store);
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAll(store) {
  return openDB().then(() => promisify(tx(store).getAll()));
}

function getOne(store, id) {
  if (id == null) return Promise.resolve(null);
  return openDB().then(() => promisify(tx(store).get(id)));
}

function put(store, data) {
  return openDB().then(() => promisify(tx(store, "readwrite").put(data)));
}

function remove(store, id) {
  return openDB().then(() => promisify(tx(store, "readwrite").delete(id)));
}

function getByIndex(store, indexName, value) {
  return openDB().then(() => {
    const s = tx(store);
    const idx = s.index(indexName);
    return promisify(idx.getAll(value));
  });
}

/* ── Brands ─────────────────────────────────────────────── */
export const BrandsDB = {
  getAll: () => getAll("brands"),

  get: (id) => getOne("brands", id),

  save: (brand) => {
    const now = new Date().toISOString();
    return put("brands", {
      id: brand.id ?? uuid(),
      name: brand.name ?? "Nova Marca",
      description: brand.description ?? "",
      logo: brand.logo ?? null, // base64 or null
      palette: brand.palette ?? [], // [{ id, name, hex }]
      fontIds: brand.fontIds ?? [], // references to fonts store
      primaryFont: brand.primaryFont ?? "", // CSS font-family name, e.g. "Montserrat"
      secondaryFont: brand.secondaryFont ?? "", // optional secondary font
      brandVoice: brand.brandVoice ?? "", // tone/style description for AI, e.g. "profissional, direto, inspirador"
      brandKeywords: brand.brandKeywords ?? "", // comma-separated keywords/values
      createdAt: brand.createdAt ?? now,
      updatedAt: now,
    });
  },

  delete: (id) => remove("brands", id),
};

/* ── Fonts ──────────────────────────────────────────────── */
export const FontsDB = {
  getAll: () => getAll("fonts"),

  getByBrand: (brandId) => getByIndex("fonts", "brandId", brandId),

  getGlobal: () => getByIndex("fonts", "brandId", null),

  get: (id) => getOne("fonts", id),

  save: (font) => {
    const now = new Date().toISOString();
    return put("fonts", {
      id: font.id ?? uuid(),
      name: font.name ?? "Fonte",
      family: font.family ?? "Inter", // CSS font-family name
      source: font.source ?? "google", // 'google' | 'upload' | 'system'
      url: font.url ?? null, // Google Fonts URL or null
      base64: font.base64 ?? null, // for uploaded fonts
      weights: font.weights ?? [400, 700],
      brandId: font.brandId ?? null, // null = global
      createdAt: font.createdAt ?? now,
    });
  },

  delete: (id) => remove("fonts", id),
};

/* ── Assets ─────────────────────────────────────────────── */
export const AssetsDB = {
  getAll: () => getAll("assets"),

  getByType: (type) => getByIndex("assets", "type", type),

  getByBrand: (brandId) => getByIndex("assets", "brandId", brandId),

  get: (id) => getOne("assets", id),

  save: (asset) => {
    const now = new Date().toISOString();
    return put("assets", {
      id: asset.id ?? uuid(),
      name: asset.name ?? "Asset",
      type: asset.type ?? "logo", // 'logo' | 'icon' | 'element' | 'photo'
      data: asset.data ?? null, // base64 string
      mimeType: asset.mimeType ?? "image/png",
      tags: asset.tags ?? [],
      brandId: asset.brandId ?? null,
      createdAt: asset.createdAt ?? now,
    });
  },

  delete: (id) => remove("assets", id),
};

/* ── Colors ─────────────────────────────────────────────── */
export const ColorsDB = {
  getAll: () => getAll("colors"),

  getGlobal: () => getByIndex("colors", "isGlobal", 1),

  getByBrand: (brandId) => getByIndex("colors", "brandId", brandId),

  get: (id) => getOne("colors", id),

  save: (color) => {
    const now = new Date().toISOString();
    return put("colors", {
      id: color.id ?? uuid(),
      name: color.name ?? "",
      hex: color.hex ?? "#000000",
      brandId: color.brandId ?? null,
      isGlobal: color.isGlobal ? 1 : 0, // IndexedDB can't index booleans properly, use 0/1
      createdAt: color.createdAt ?? now,
    });
  },

  delete: (id) => remove("colors", id),
};

/* ── Presets ─────────────────────────────────────────────── */
export const PresetsDB = {
  getAll: () => getAll("presets"),

  getByBrand: (brandId) => getByIndex("presets", "brandId", brandId),

  getByFormat: (formatId) => getByIndex("presets", "formatId", formatId),

  get: (id) => getOne("presets", id),

  save: (preset) => {
    const now = new Date().toISOString();
    return put("presets", {
      id: preset.id ?? uuid(),
      name: preset.name ?? "Preset sem nome",
      formatId: preset.formatId ?? "ig-feed-square",
      state: preset.state ?? null, // JSON serialized canvas state
      thumbnail: preset.thumbnail ?? null, // base64 PNG thumbnail
      brandId: preset.brandId ?? null,
      // Template metadata for AI — describes what text each layer expects
      description: preset.description ?? "", // what this template is for
      textFields: preset.textFields ?? [], // [{ layerId, layerName, role, hint, maxChars, fontSize, fontFamily, fontWeight, color, textAlign, animIn, ... }]
      fixedLayerIds: preset.fixedLayerIds ?? null, // null = all non-text layers; array = specific ids marked as fixed
      // Visual identity snapshot (used when applying preset to all slides)
      background: preset.background ?? null, // background state at save time
      brandPalette: preset.brandPalette ?? [], // brand palette snapshot
      brandPrimaryFont: preset.brandPrimaryFont ?? "",
      brandVoice: preset.brandVoice ?? "",
      animations: preset.animations ?? [], // [{ layerName, animIn, animDuration, animDelay }]
      createdAt: preset.createdAt ?? now,
      updatedAt: now,
    });
  },

  delete: (id) => remove("presets", id),
};

export const PostHistoryDB = {
  getAll: () => getAll("postHistory"),

  getByBrand: (brandId) => getByIndex("postHistory", "brandId", brandId),

  get: (id) => getOne("postHistory", id),

  save: (entry) => {
    const now = new Date().toISOString();
    return put("postHistory", {
      id: entry.id ?? uuid(),
      brandId: entry.brandId ?? null,
      name: entry.name ?? "Post",
      formatId: entry.formatId ?? "ig-feed-square",
      state: entry.state ?? null,
      thumbnail: entry.thumbnail ?? null,
      createdAt: entry.createdAt ?? now,
      updatedAt: now,
    });
  },

  delete: (id) => remove("postHistory", id),
};

export const ProjectsDB = {
  getAll: () => getAll("projects"),

  getByBrand: (brandId) => getByIndex("projects", "brandId", brandId),

  get: (id) => getOne("projects", id),

  save: (project) => {
    const now = new Date().toISOString();
    return put("projects", {
      id: project.id ?? uuid(),
      name: project.name ?? "Projeto sem nome",
      brandId: project.brandId ?? null,
      mode: project.mode ?? "slides",
      slides: project.slides ?? [],
      activeSlideIndex: project.activeSlideIndex ?? 0,
      coverThumbnail: project.coverThumbnail ?? null,
      createdAt: project.createdAt ?? now,
      updatedAt: now,
    });
  },

  delete: (id) => remove("projects", id),
};

export const AIConfigDB = {
  getAll: () => getAll("aiConfig"),

  getByBrand: (brandId) => getByIndex("aiConfig", "brandId", brandId),

  get: (id) => getOne("aiConfig", id),

  save: (config) => {
    const now = new Date().toISOString();
    return put("aiConfig", {
      id: config.id ?? uuid(),
      brandId: config.brandId ?? null,
      provider: config.provider ?? "minimax",
      model: config.model ?? "MiniMax-M1",
      endpoint: config.endpoint ?? "",
      apiKey: config.apiKey ?? "",
      temperature: Number.isFinite(config.temperature) ? config.temperature : 0.8,
      createdAt: config.createdAt ?? now,
      updatedAt: now,
    });
  },

  delete: (id) => remove("aiConfig", id),
};

export const BrandDocsDB = {
  getAll: () => getAll("brandDocs"),

  getByBrand: (brandId) => getByIndex("brandDocs", "brandId", brandId),

  get: (id) => getOne("brandDocs", id),

  save: (doc) => {
    const now = new Date().toISOString();
    return put("brandDocs", {
      id: doc.id ?? uuid(),
      brandId: doc.brandId ?? null,
      name: doc.name ?? "Documento",
      mimeType: doc.mimeType ?? "text/plain",
      content: doc.content ?? "",
      createdAt: doc.createdAt ?? now,
      updatedAt: now,
    });
  },

  delete: (id) => remove("brandDocs", id),
};

/* ── Convenience: init and seed defaults ─────────────────── */
export async function initDB() {
  await openDB();

  // Seed a default global color palette if empty
  const existing = await ColorsDB.getAll();
  if (existing.length === 0) {
    const defaults = [
      { name: "Preto", hex: "#000000", isGlobal: true },
      { name: "Branco", hex: "#ffffff", isGlobal: true },
      { name: "Zenith Blue", hex: "#7BC4EC", isGlobal: true },
      { name: "Cinza Escuro", hex: "#1a1a2e", isGlobal: true },
      { name: "Cinza Médio", hex: "#4a5568", isGlobal: true },
      { name: "Vermelho", hex: "#f87171", isGlobal: true },
      { name: "Verde", hex: "#4ade80", isGlobal: true },
      { name: "Amarelo", hex: "#fbbf24", isGlobal: true },
    ];
    await Promise.all(defaults.map((c) => ColorsDB.save(c)));
  }
}
