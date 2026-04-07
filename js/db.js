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

const DB_NAME = 'PostGenerateDB'
const DB_VERSION = 1

let _db = null

/* ── Open / upgrade ─────────────────────────────────────── */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onerror = () => reject(new Error('Erro ao abrir banco de dados'))

    req.onsuccess = (e) => {
      _db = e.target.result
      resolve(_db)
    }

    req.onupgradeneeded = (e) => {
      const db = e.target.result

      /* brands */
      if (!db.objectStoreNames.contains('brands')) {
        const s = db.createObjectStore('brands', { keyPath: 'id' })
        s.createIndex('name', 'name', { unique: false })
        s.createIndex('createdAt', 'createdAt', { unique: false })
      }

      /* fonts */
      if (!db.objectStoreNames.contains('fonts')) {
        const s = db.createObjectStore('fonts', { keyPath: 'id' })
        s.createIndex('family', 'family', { unique: false })
        s.createIndex('brandId', 'brandId', { unique: false })
      }

      /* assets */
      if (!db.objectStoreNames.contains('assets')) {
        const s = db.createObjectStore('assets', { keyPath: 'id' })
        s.createIndex('type', 'type', { unique: false })
        s.createIndex('brandId', 'brandId', { unique: false })
        s.createIndex('createdAt', 'createdAt', { unique: false })
      }

      /* colors */
      if (!db.objectStoreNames.contains('colors')) {
        const s = db.createObjectStore('colors', { keyPath: 'id' })
        s.createIndex('brandId', 'brandId', { unique: false })
        s.createIndex('isGlobal', 'isGlobal', { unique: false })
      }

      /* presets */
      if (!db.objectStoreNames.contains('presets')) {
        const s = db.createObjectStore('presets', { keyPath: 'id' })
        s.createIndex('brandId', 'brandId', { unique: false })
        s.createIndex('formatId', 'formatId', { unique: false })
        s.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

/* ── Generic helpers ────────────────────────────────────── */
function tx(store, mode = 'readonly') {
  return _db.transaction([store], mode).objectStore(store)
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

function getAll(store) {
  return openDB().then(() => promisify(tx(store).getAll()))
}

function getOne(store, id) {
  return openDB().then(() => promisify(tx(store).get(id)))
}

function put(store, data) {
  return openDB().then(() => promisify(tx(store, 'readwrite').put(data)))
}

function remove(store, id) {
  return openDB().then(() => promisify(tx(store, 'readwrite').delete(id)))
}

function getByIndex(store, indexName, value) {
  return openDB().then(() => {
    const s = tx(store)
    const idx = s.index(indexName)
    return promisify(idx.getAll(value))
  })
}

/* ── Brands ─────────────────────────────────────────────── */
export const BrandsDB = {
  getAll: () => getAll('brands'),

  get: (id) => getOne('brands', id),

  save: (brand) => {
    const now = new Date().toISOString()
    return put('brands', {
      id: brand.id ?? crypto.randomUUID(),
      name: brand.name ?? 'Nova Marca',
      description: brand.description ?? '',
      logo: brand.logo ?? null,          // base64 or null
      palette: brand.palette ?? [],      // [{ id, name, hex }]
      fontIds: brand.fontIds ?? [],      // references to fonts store
      createdAt: brand.createdAt ?? now,
      updatedAt: now,
    })
  },

  delete: (id) => remove('brands', id),
}

/* ── Fonts ──────────────────────────────────────────────── */
export const FontsDB = {
  getAll: () => getAll('fonts'),

  getByBrand: (brandId) => getByIndex('fonts', 'brandId', brandId),

  getGlobal: () => getByIndex('fonts', 'brandId', null),

  get: (id) => getOne('fonts', id),

  save: (font) => {
    const now = new Date().toISOString()
    return put('fonts', {
      id: font.id ?? crypto.randomUUID(),
      name: font.name ?? 'Fonte',
      family: font.family ?? 'Inter',      // CSS font-family name
      source: font.source ?? 'google',     // 'google' | 'upload' | 'system'
      url: font.url ?? null,               // Google Fonts URL or null
      base64: font.base64 ?? null,         // for uploaded fonts
      weights: font.weights ?? [400, 700],
      brandId: font.brandId ?? null,       // null = global
      createdAt: font.createdAt ?? now,
    })
  },

  delete: (id) => remove('fonts', id),
}

/* ── Assets ─────────────────────────────────────────────── */
export const AssetsDB = {
  getAll: () => getAll('assets'),

  getByType: (type) => getByIndex('assets', 'type', type),

  getByBrand: (brandId) => getByIndex('assets', 'brandId', brandId),

  get: (id) => getOne('assets', id),

  save: (asset) => {
    const now = new Date().toISOString()
    return put('assets', {
      id: asset.id ?? crypto.randomUUID(),
      name: asset.name ?? 'Asset',
      type: asset.type ?? 'logo',          // 'logo' | 'icon' | 'element' | 'photo'
      data: asset.data ?? null,            // base64 string
      mimeType: asset.mimeType ?? 'image/png',
      tags: asset.tags ?? [],
      brandId: asset.brandId ?? null,
      createdAt: asset.createdAt ?? now,
    })
  },

  delete: (id) => remove('assets', id),
}

/* ── Colors ─────────────────────────────────────────────── */
export const ColorsDB = {
  getAll: () => getAll('colors'),

  getGlobal: () => getByIndex('colors', 'isGlobal', 1),

  getByBrand: (brandId) => getByIndex('colors', 'brandId', brandId),

  get: (id) => getOne('colors', id),

  save: (color) => {
    const now = new Date().toISOString()
    return put('colors', {
      id: color.id ?? crypto.randomUUID(),
      name: color.name ?? '',
      hex: color.hex ?? '#000000',
      brandId: color.brandId ?? null,
      isGlobal: color.isGlobal ? 1 : 0,   // IndexedDB can't index booleans properly, use 0/1
      createdAt: color.createdAt ?? now,
    })
  },

  delete: (id) => remove('colors', id),
}

/* ── Presets ─────────────────────────────────────────────── */
export const PresetsDB = {
  getAll: () => getAll('presets'),

  getByBrand: (brandId) => getByIndex('presets', 'brandId', brandId),

  getByFormat: (formatId) => getByIndex('presets', 'formatId', formatId),

  get: (id) => getOne('presets', id),

  save: (preset) => {
    const now = new Date().toISOString()
    return put('presets', {
      id: preset.id ?? crypto.randomUUID(),
      name: preset.name ?? 'Preset sem nome',
      formatId: preset.formatId ?? 'ig-feed-square',
      state: preset.state ?? null,         // JSON serialized canvas state
      thumbnail: preset.thumbnail ?? null, // base64 PNG thumbnail
      brandId: preset.brandId ?? null,
      createdAt: preset.createdAt ?? now,
      updatedAt: now,
    })
  },

  delete: (id) => remove('presets', id),
}

/* ── Convenience: init and seed defaults ─────────────────── */
export async function initDB() {
  await openDB()

  // Seed a default global color palette if empty
  const existing = await ColorsDB.getAll()
  if (existing.length === 0) {
    const defaults = [
      { name: 'Preto', hex: '#000000', isGlobal: true },
      { name: 'Branco', hex: '#ffffff', isGlobal: true },
      { name: 'Zenith Blue', hex: '#7BC4EC', isGlobal: true },
      { name: 'Cinza Escuro', hex: '#1a1a2e', isGlobal: true },
      { name: 'Cinza Médio', hex: '#4a5568', isGlobal: true },
      { name: 'Vermelho', hex: '#f87171', isGlobal: true },
      { name: 'Verde', hex: '#4ade80', isGlobal: true },
      { name: 'Amarelo', hex: '#fbbf24', isGlobal: true },
    ]
    await Promise.all(defaults.map(c => ColorsDB.save(c)))
  }
}
