/* ============================================================
   PresetService — Preset management
   ============================================================ */

import { PresetsDB } from "../db.js";
import { uuid } from "../utils/ui-helpers.js";
import { formatBrandColor } from "../utils/ui-helpers.js";

export class PresetService {
  constructor(canvas, exporter, brands) {
    this._canvas = canvas;
    this._exporter = exporter;
    this._brands = brands;
  }

  async save(name, description, textFields, fixedLayerIds) {
    const thumbnail = await this._exporter.generateThumbnail();
    const state = this._canvas.getState();
    const includeBg = document.getElementById("preset-save-include-bg")?.checked !== false;
    const normalizedBackground = includeBg
      ? this.normalizeBackground(state.background, null)
      : null;

    state.background = includeBg
      ? structuredClone(normalizedBackground)
      : { type: "solid", color: "#000000" };

    const brandId = this._brands.getCurrentBrandId();
    const brand = brandId ? await this._brands.getCurrentBrand() : null;

    const animationSummary = (state.layers ?? [])
      .filter((l) => l?.animIn && l.animIn !== "none")
      .map((l) => ({
        layerName: l.name,
        animIn: l.animIn,
        animDuration: l.animDuration,
        animDelay: l.animDelay,
      }));

    const resolvedFixedLayerIds = fixedLayerIds ?? null;

    await PresetsDB.save({
      id: uuid(),
      name,
      formatId: state.formatId,
      state,
      thumbnail,
      brandId: null,
      ownerBrandId: brandId ?? null,
      description,
      textFields: textFields ?? this.extractTextFields(state),
      fixedLayerIds: resolvedFixedLayerIds,
      background: normalizedBackground,
      brandPalette: brand?.palette ?? [],
      brandPrimaryFont: brand?.primaryFont ?? "",
      brandVoice: brand?.brandVoice ?? "",
      animations: animationSummary,
      updatedAt: new Date().toISOString(),
    });
  }

  async getAll() {
    return await PresetsDB.getAll();
  }

  async get(id) {
    return await PresetsDB.get(id);
  }

  async delete(id) {
    return await PresetsDB.delete(id);
  }

  normalizeBackground(bg, fallback = null) {
    const source = bg && typeof bg === "object"
      ? bg
      : fallback && typeof fallback === "object"
        ? fallback
        : { type: "solid", color: "#000000" };
    if (source.type === "gradient") {
      const g = source.gradient ?? {};
      return {
        type: "gradient",
        gradient: {
          type: g.type ?? "linear",
          from: g.from ?? "#000000",
          to: g.to ?? "#0e1a2e",
          angle: Number.isFinite(g.angle) ? g.angle : 135,
          reach: Number.isFinite(g.reach) ? g.reach : 100,
          fromReach: Number.isFinite(g.fromReach) ? g.fromReach : 0,
          toReach: Number.isFinite(g.toReach) ? g.toReach : 100,
          opacity: Number.isFinite(g.opacity) ? g.opacity : 100,
          fromOpacity: Number.isFinite(g.fromOpacity) ? g.fromOpacity : Number.isFinite(g.opacity) ? g.opacity : 100,
          toOpacity: Number.isFinite(g.toOpacity) ? g.toOpacity : Number.isFinite(g.opacity) ? g.opacity : 100,
        },
      };
    }
    if (source.type === "image") {
      return { type: "image", image: source.image ?? null, imageSize: source.imageSize ?? "cover" };
    }
    return { type: "solid", color: source.color ?? "#000000" };
  }

  extractTextFields(state, existingPreset = null) {
    const layers = Array.isArray(state?.layers) ? state.layers : [];
    const existingFields = existingPreset?.textFields ?? [];
    return layers
      .filter((l) => l?.type === "text")
      .map((l) => {
        const existing = existingFields.find((f) => f.layerId === l.id);
        const charsPerLine = Math.max(10, Math.round(70 / ((l.fontSize || 40) / 40)));
        const estimatedLines = Math.max(1, Math.round((l.height || 20) / (((l.fontSize || 40) / 1080) * 100)));
        return {
          layerId: l.id,
          layerName: l.name || "Texto",
          role: existing?.role ?? this.inferRole(l),
          hint: existing?.hint ?? "",
          fontSize: l.fontSize || 40,
          fontFamily: l.fontFamily || "",
          fontWeight: l.fontWeight || 400,
          color: l.color || "#ffffff",
          textAlign: l.textAlign || l.align || "left",
          lineHeight: l.lineHeight || 1.2,
          letterSpacing: l.letterSpacing || "0em",
          animIn: l.animIn || "none",
          animDelay: l.animDelay ?? 0,
          maxChars: existing?.maxChars ?? Math.min(200, charsPerLine * estimatedLines),
        };
      });
  }

  inferRole(layer) {
    const name = String(layer?.name ?? "").toLowerCase();
    if (/t[ií]tulo|title|headline|h1/.test(name)) return "título principal";
    if (/sub|descrição|description|body/.test(name)) return "subtítulo ou descrição";
    if (/badge|tag|pill|label|chip/.test(name)) return "tag ou categoria";
    if (/cta|ação|action|button/.test(name)) return "chamada para ação";
    if (/autor|name|nome/.test(name)) return "nome ou autor";
    if (/num|número|step|etapa/.test(name)) return "número ou etapa";
    return "texto";
  }

  applyPresetToSlideState(slideState, preset) {
    return this.applyPresetToState(slideState, preset);
  }

  applyPresetToState(slideState, preset) {
    const TEXT_STYLE_PROPS = [
      "fontFamily", "fontSize", "fontWeight", "fontStyle", "color", "textAlign",
      "letterSpacing", "lineHeight", "textTransform", "opacity",
      "animIn", "animDuration", "animDelay", "animEasing",
      "x", "y", "width", "height", "badgeBg", "badgeBorderColor", "badgeBorderRadius",
      "badgePaddingX", "badgePaddingY", "badgeBorderWidth", "subtype",
    ];

    const nextState = structuredClone(preset.state);
    nextState._presetId = preset.id;

    if (preset.background && typeof preset.background === "object") {
      nextState.background = structuredClone(preset.background);
    } else {
      nextState.background = structuredClone(slideState.background);
    }

    const existingTextLayers = (slideState.layers ?? []).filter((l) => l.type === "text");
    const presetTextLayers = (preset.state.layers ?? []).filter((l) => l.type === "text");

    nextState.layers = nextState.layers.map((presetLayer) => {
      if (presetLayer.type !== "text") return presetLayer;
      const byName = existingTextLayers.find((el) => el.name && el.name === presetLayer.name);
      const byIndex = existingTextLayers[presetTextLayers.findIndex((pl) => pl.id === presetLayer.id)];
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
}
