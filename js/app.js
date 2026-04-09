/* ============================================================
   PostGenerate — Main App (Thin Orchestrator)
   Only wires imports, creates instances, and orchestrates.
   All business logic is in controllers/services.
   ============================================================ */

import {
  initDB,
  BrandsDB,
  FontsDB,
  AssetsDB,
  PresetsDB,
  ColorsDB,
  PostHistoryDB,
  ProjectsDB,
  AIConfigDB,
  BrandDocsDB,
} from "./db.js";
import { FORMATS, FORMAT_GROUPS, getFormat } from "./formats.js";
import {
  CanvasEngine,
  createDefaultState,
  makeBadgeLayer,
  makeHeadlineLayer,
  makeSubLayer,
  makeTextLayer,
  makeImageLayer,
  makeIconLayer,
  makeShapeLayer,
  ANIM_DEFAULTS,
} from "./canvas-engine.js";
import { ExportEngine } from "./export-engine.js";
import { BrandManager } from "./brand-manager.js";
import { ColorPicker } from "./color-picker.js";
import { IconSearch } from "./icon-search.js";
import { SlideManager } from "./slide-manager.js";
import { AnimEngine } from "./anim-engine.js";
import { aiEngine } from "./ai-engine.js";
import { shareCode } from "../network/ShareCodeManager.js";
import { network } from "../network/NetworkManager.js";
import { bus } from "../network/EventBus.js";

import { HeaderController } from "./controllers/HeaderController.js";
import { LayerPanelController } from "./controllers/LayerPanelController.js";
import { PropertiesPanelController } from "./controllers/PropertiesPanelController.js";
import { SidebarController } from "./controllers/SidebarController.js";
import { CanvasController } from "./controllers/CanvasController.js";
import { KeyboardController } from "./controllers/KeyboardController.js";
import { FormatModalController } from "./controllers/FormatModalController.js";
import { ExportModalController } from "./controllers/ExportModalController.js";
import { IconModalController } from "./controllers/IconModalController.js";
import { AnimationPanelController } from "./controllers/AnimationPanelController.js";
import { SlideCaptionController } from "./controllers/SlideCaptionController.js";
import { PanelVisibilityController } from "./controllers/PanelVisibilityController.js";
import { ShareModalController } from "./controllers/ShareModalController.js";
import { ThemeController } from "./controllers/ThemeController.js";
import { ShortcutsModalController } from "./controllers/ShortcutsModalController.js";
import { ProjectsHomeController } from "./controllers/ProjectsHomeController.js";
import { ContextMenuController } from "./controllers/ContextMenuController.js";
import { RealtimeCollabController } from "./controllers/RealtimeCollabController.js";

import { ProjectService } from "./services/ProjectService.js";
import { HistoryService } from "./services/HistoryService.js";
import { BackupService } from "./services/BackupService.js";
import { ShareService } from "./services/ShareService.js";
import { PresetService } from "./services/PresetService.js";
import { AIService } from "./services/AIService.js";

import { uuid, openFilePicker as openFilePickerFn } from "./utils/ui-helpers.js";

const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Playfair+Display",
  "Oswald",
  "Lato",
  "Nunito",
  "Open+Sans",
  "Source+Sans+3",
  "Ubuntu",
  "Josefin+Sans",
  "DM+Sans",
];

class App {
  _loadFonts() {
    const existing = document.getElementById("google-fonts-link");
    if (existing) return;
    const families = GOOGLE_FONTS.join("&family=");
    const link = document.createElement("link");
    link.id = "google-fonts-link";
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    document.head.appendChild(link);
  }
  constructor() {
    this.canvas = null;
    this.exporter = null;
    this.brands = null;
    this.picker = null;
    this.icons = null;
    this.slides = null;
    this.anim = null;

    this._projectService = null;
    this._historyService = null;
    this._backupService = null;
    this._shareService = null;
    this._presetService = null;
    this._ai = null;

    this._headerController = null;
    this._layerPanelController = null;
    this._propertiesPanelController = null;
    this._sidebarController = null;
    this._canvasController = null;
    this._keyboardController = null;
    this._formatModalController = null;
    this._exportModalController = null;
    this._iconModalController = null;
    this._animationPanelController = null;
    this._slideCaptionController = null;
    this._panelVisibilityController = null;
    this._shareModalController = null;
    this._themeController = null;
    this._shortcutsModalController = null;
    this._projectsHomeController = null;
    this._contextMenuController = null;
    this._realtimeCollabController = null;

    this._canvasPreviewZoom = 1;
  }

  async init() {
    this._loadFonts();
    await initDB();

    const canvasEl = document.getElementById("post-canvas");
    this.canvas = new CanvasEngine(canvasEl);
    this.exporter = new ExportEngine(this.canvas);
    this.brands = new BrandManager();
    await this.brands.init();
    this.picker = new ColorPicker();
    this.icons = new IconSearch();
    this.anim = new AnimEngine(this.canvas);
    this.slides = new SlideManager(this.canvas);

    this._projectService = new ProjectService(this.canvas, this.slides, this.brands, this.exporter);
    this._historyService = new HistoryService(this.canvas, this.brands, this.exporter);
    this._backupService = new BackupService(this.brands);
    this._shareService = new ShareService(this._projectService, this.brands);
    this._presetService = new PresetService(this.canvas, this.exporter, this.brands);

    this._ai = new AIService({
      canvas: this.canvas,
      brands: this.brands,
      slides: this.slides,
      icons: this.icons,
      aiEngine,
      PresetsDB,
      AIConfigDB,
      BrandDocsDB,
      FORMATS,
      makeIconLayer,
      makeTextLayer,
      onFitCanvas: () => this._fitCanvas(),
      onUpdateFormatBadge: (fmtId) => this._updateFormatBadge(fmtId),
      onUpdateGradientBar: () => this._updateGradientBar(),
    });

    this._initControllers();
    this._wireCanvasEvents();
    this._wireGlobalEvents();

    await this.slides.init();
    this._canvasController.wire();
    this._headerController.wire();
    this._layerPanelController.wire({ openFilePicker: this._openFilePicker.bind(this), icons: this.icons });
    this._propertiesPanelController.wire();
    this._sidebarController.wire();
    this._keyboardController.wire();
    this._formatModalController.wire();
    this._exportModalController.wire();
    this._iconModalController.wire();
    this._animationPanelController.wire();
    this._slideCaptionController.wire();
    this._panelVisibilityController.wire();
    this._shareModalController.wire();
    this._shareModalController.init();
    this._themeController.wire();
    this._shortcutsModalController.wire();
    this._projectsHomeController.wire();
    this._contextMenuController.wire();
    this._realtimeCollabController.wire();
    this._ai.wire();

    this._fitCanvas();
    this._updateFormatBadge(this.canvas.getState().formatId);
    this.slides.on("change", () => {
      this._slideCaptionController.refresh();
      this._refreshPresetsTab();
      this._projectService.setDirty(true);
      this._queueProjectSave();
    });

    await this._sidebarController.refresh();
    this._fillBrandIdentityFields(await this.brands.getCurrentBrand());
    await this._projectsHomeController.render();
    this._projectsHomeController.show();

    toast("PostGenerate pronto.", "info");
  }

  _initControllers() {
    this._headerController = new HeaderController({
      canvas: this.canvas,
      onOpenFormatModal: () => this._formatModalController.open(),
      onOpenExportModal: () => this._exportModalController.open(),
      onOpenShareModal: () => this._shareModalController._openShareModal(),
      onOpenAISidePanel: () => this._ai._openAISidePanel(),
      onShowProjectsHome: (show) => this._showProjectsHome(show),
      brands: this.brands,
      slides: this.slides,
    });

    this._layerPanelController = new LayerPanelController({
      canvas: this.canvas,
      makeTextLayer,
      makeBadgeLayer,
      makeImageLayer,
      makeIconLayer,
      makeShapeLayer,
    });

    this._propertiesPanelController = new PropertiesPanelController({
      canvas: this.canvas,
      picker: this.picker,
      openPickerCallback: this._openPicker.bind(this),
      updateGradientBar: () => this._updateGradientBar(),
      openFilePicker: this._openFilePicker.bind(this),
      ColorsDB,
      toast,
      slides: this.slides,
    });

    this._sidebarController = new SidebarController({
      canvas: this.canvas,
      brands: this.brands,
      picker: this.picker,
      openFilePicker: this._openFilePicker.bind(this),
      onToast: toast,
      onRefreshPropertiesPanel: (layer) => this._propertiesPanelController.refresh(layer),
      onRefreshPresetsTab: () => this._refreshPresetsTab(),
      onRefreshHistoryTab: () => this._refreshHistoryTab(),
      onFitCanvas: () => this._fitCanvas(),
      onUpdateFormatBadge: (fmtId) => this._updateFormatBadge(fmtId),
      onUpdateGradientBar: () => this._updateGradientBar(),
    });

    this._canvasController = new CanvasController({
      canvas: this.canvas,
      onRefreshLayerList: () => this._layerPanelController.refresh(),
      onRefreshPropertiesPanel: (layer) => this._propertiesPanelController.refresh(layer),
      onFitCanvas: () => this._fitCanvas(),
      onUpdateFormatBadge: (fmtId) => this._updateFormatBadge(fmtId),
      onQueueBrandHistorySave: () => this._queueBrandHistorySave(),
      onMarkProjectDirty: () => this._projectService.setDirty(true),
      onQueueProjectSave: () => this._queueProjectSave(),
      makeTextLayer,
      makeBadgeLayer,
      makeImageLayer,
      makeIconLayer,
      makeShapeLayer,
      icons: this.icons,
    });

    this._keyboardController = new KeyboardController({
      canvas: this.canvas,
      slides: this.slides,
      onShowShortcutsModal: () => this._shortcutsModalController.open(),
    });

    this._formatModalController = new FormatModalController({
      canvas: this.canvas,
      onFitCanvas: () => this._fitCanvas(),
      onUpdateFormatBadge: (fmtId) => this._updateFormatBadge(fmtId),
    });

    this._exportModalController = new ExportModalController({
      canvas: this.canvas,
      slides: this.slides,
      exporter: this.exporter,
      anim: this.anim,
      onFitCanvas: () => this._fitCanvas(),
      onUpdateFormatBadge: (fmtId) => this._updateFormatBadge(fmtId),
    });

    this._iconModalController = new IconModalController({
      canvas: this.canvas,
      icons: this.icons,
      makeIconLayer,
    });

    this._animationPanelController = new AnimationPanelController({
      canvas: this.canvas,
      slides: this.slides,
      anim: this.anim,
      onFitCanvas: () => this._fitCanvas(),
    });

    this._slideCaptionController = new SlideCaptionController({
      slides: this.slides,
    });

    this._panelVisibilityController = new PanelVisibilityController({});

    this._shareModalController = new ShareModalController({
      shareService: this._shareService,
      projectService: this._projectService,
      brands: this.brands,
    });

    this._themeController = new ThemeController({
      canvas: this.canvas,
    });

    this._shortcutsModalController = new ShortcutsModalController({});

    this._projectsHomeController = new ProjectsHomeController({
      projectService: this._projectService,
      canvas: this.canvas,
      slides: this.slides,
      brands: this.brands,
      exporter: this.exporter,
      onToast: toast,
      onShowProjectsHome: (show) => this._showProjectsHome(show),
    });

    this._contextMenuController = new ContextMenuController({
      canvas: this.canvas,
      slides: this.slides,
      openFilePicker: this._openFilePicker.bind(this),
      onRefreshLayerList: () => this._layerPanelController.refresh(),
      onToast: toast,
    });

    this._realtimeCollabController = new RealtimeCollabController({
      canvas: this.canvas,
      slides: this.slides,
      brands: this.brands,
      network,
      bus,
      onToast: toast,
      projectService: this._projectService,
    });
  }

  _wireCanvasEvents() {
    this.canvas.on("selectionChange", (layer) => {
      this._layerPanelController.refresh();
      this._propertiesPanelController.refresh(layer);
    });
    this.canvas.on("layersChange", () => {
      this._layerPanelController.refresh();
    });
    this.canvas.on("formatChange", (fmtId) => {
      this._fitCanvas();
      this._updateFormatBadge(fmtId);
      this._queueBrandHistorySave();
      this._projectService.setDirty(true);
      this._queueProjectSave();
    });
    this.canvas.on("stateChange", () => {
      this._queueBrandHistorySave();
      this._projectService.setDirty(true);
      this._queueProjectSave();
    });
  }

  _wireGlobalEvents() {
    window.addEventListener("resize", () => this._fitCanvas());

    document.getElementById("post-canvas").addEventListener("click", (e) => {
      if (e.target === this.canvas || e.target.classList.contains("pg-bg")) {
        this.canvas.selectLayer(null);
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && this._projectService.isDirty) {
        this._saveProjectNow().catch(() => {});
      }
    });

    document.addEventListener("contextmenu", (e) => {
      if (e.target.closest("#ctx-menu")) return;
      e.preventDefault();
    });
  }

  _fitCanvas() {
    const area = document.getElementById("canvas-preview-area");
    if (!area) return;
    const pad = 48;
    const availW = area.clientWidth - pad;
    const availH = area.clientHeight - pad;
    this.canvas.setPreviewSize(availW, availH);
    this.canvas.setPreviewZoom(this._canvasPreviewZoom);
    document.getElementById("zoom-badge").textContent = `${Math.round(this.canvas.getScale() * 100)}%`;
  }

  _updateFormatBadge(fmtId) {
    const fmt = getFormat(fmtId);
    const btn = document.getElementById("btn-format");
    if (btn) {
      btn.innerHTML = `
        <span>${fmt.icon ?? "📐"}</span>
        <span>${fmt.platformLabel} — ${fmt.label}</span>
        <span class="format-dims">${fmt.width}×${fmt.height}</span>
      `;
    }
  }

  _updateGradientBar() {
    const bg = this.canvas.getState().background;
    const bar = document.getElementById("gradient-preview-bar");
    if (!bar || !bg.gradient) return;
    const g = bg.gradient;
    const fromReach = Math.max(0, Math.min(100, g.fromReach ?? 0));
    const toReach = Math.max(0, Math.min(100, g.toReach ?? g.reach ?? 100));
    const opacity = Math.max(0, Math.min(100, g.opacity ?? 100));
    const fromOpacity = Math.max(0, Math.min(100, g.fromOpacity ?? g.opacity ?? 100));
    const toOpacity = Math.max(0, Math.min(100, g.toOpacity ?? g.opacity ?? 100));
    const from = this._withOpacity(g.from, fromOpacity);
    const to = this._withOpacity(g.to, toOpacity);
    bar.style.background = g.type === "linear"
      ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
      : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`;
  }

  _withOpacity(color, opacityPercent = 100) {
    const alpha = Math.max(0, Math.min(1, (opacityPercent ?? 100) / 100));
    const c = String(color ?? "#000000").trim();
    if (c.startsWith("#")) {
      let hex = c.slice(1);
      if (hex.length === 3 || hex.length === 4) hex = hex.split("").map((ch) => ch + ch).join("");
      if (hex.length === 8) hex = hex.slice(0, 6);
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g2 = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g2}, ${b}, ${alpha})`;
      }
    }
    const rgbaMatch = c.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
    if (rgbaMatch) {
      const r = Number(rgbaMatch[1]);
      const g2 = Number(rgbaMatch[2]);
      const b = Number(rgbaMatch[3]);
      const baseA = rgbaMatch[4] == null ? 1 : Math.max(0, Math.min(1, Number(rgbaMatch[4])));
      return `rgba(${r}, ${g2}, ${b}, ${Math.max(0, Math.min(1, baseA * alpha))})`;
    }
    return c;
  }

  _openPicker(initialColor, onLive) {
    ColorsDB.getAll().then((colors) => {
      this.picker.loadSavedColors(colors);
    });
    return this.picker.open(initialColor, onLive);
  }

  _openFilePicker(accept, onFile) {
    openFilePickerFn(accept, onFile);
  }

  _showProjectsHome(show) {
    const home = document.getElementById("projects-home");
    if (home) home.classList.toggle("open", !!show);
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

  async _refreshPresetsTab() {
    const container = document.getElementById("sidebar-presets");
    if (!container) return;
    const presets = await PresetsDB.getAll();
    if (!presets.length) {
      container.innerHTML = '<span style="font-size:11px;color:var(--text-disabled);padding:8px;">Nenhum preset salvo</span>';
      return;
    }
    const activePresetId = this.canvas.getState()._presetId ?? null;
    const allSlides = this.slides.getSlides();
    container.innerHTML = "";
    presets.reverse().forEach((preset) => {
      const isActive = preset.id === activePresetId;
      const slidesUsingPreset = allSlides.filter((s) => s.state?._presetId === preset.id).length;
      const card = document.createElement("div");
      card.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;border:1px solid ${isActive ? "var(--accent)" : "transparent"};background:${isActive ? "rgba(123,196,236,0.08)" : "transparent"};margin-bottom:4px;transition:0.15s ease;`;
      card.addEventListener("mouseenter", () => { if (!isActive) card.style.background = "var(--surface-hover)"; });
      card.addEventListener("mouseleave", () => { if (!isActive) card.style.background = "transparent"; });
      const thumb = preset.thumbnail ? `<img src="${preset.thumbnail}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">` : `<div style="width:32px;height:32px;background:var(--surface-3);border-radius:4px;"></div>`;
      const activeBadge = isActive ? `<span style="font-size:9px;background:var(--accent);color:#000;border-radius:3px;padding:1px 4px;font-weight:600;">ATIVO</span>` : "";
      const usageText = slidesUsingPreset > 0 ? `<span style="font-size:10px;color:var(--text-disabled);">${slidesUsingPreset} slide${slidesUsingPreset > 1 ? "s" : ""}</span>` : "";
      card.innerHTML = `${thumb}<div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;"><span style="font-size:12px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preset.name}</span>${activeBadge}</div><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:10px;color:var(--text-muted);">${getFormat(preset.formatId).label}</span>${usageText}</div></div>`;
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-delete-preset]")) return;
        if (e.target.closest("[data-reset-slide]")) return;
        if (e.target.closest("[data-reset-all]")) return;
        if (e.target.closest("[data-apply-style]")) return;
        this.canvas.snapshot();
        const nextState = structuredClone(preset.state ?? createDefaultState());
        if (preset.background && typeof preset.background === "object") {
          nextState.background = structuredClone(preset.background);
        } else {
          nextState.background = structuredClone(this.canvas.getState().background);
        }
        nextState._presetId = preset.id;
        this.canvas.setState(nextState);
        this._fitCanvas();
        this._updateFormatBadge(nextState.formatId);
        this._updateGradientBar();
        toast(`Preset "${preset.name}" carregado.`, "info");
      });
      card.querySelector("[data-apply-style]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const nextState = this._presetService.applyPresetToState(this.canvas.getState(), preset);
        this.canvas.snapshot();
        this.canvas.setState(nextState);
        this._fitCanvas();
        this._updateFormatBadge(nextState.formatId);
        this._updateGradientBar();
        toast(`Estilo de "${preset.name}" aplicado.`, "success");
      });
      card.querySelector("[data-reset-slide]")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this._resetSlideToPreset(this.slides.getActiveIndex());
      });
      card.querySelector("[data-reset-all]")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this._resetAllSlidesToPreset(preset.id);
      });
      card.querySelector("[data-delete-preset]")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        await PresetsDB.delete(preset.id);
        await this._refreshPresetsTab();
      });
      container.appendChild(card);
    });
  }

  async _refreshHistoryTab() {
    const container = document.getElementById("sidebar-history");
    if (!container) return;
    const brandId = this.brands.getCurrentBrandId();
    if (!brandId) {
      container.innerHTML = '<span style="font-size:11px;color:var(--text-disabled);padding:8px;">Selecione uma marca para histórico</span>';
      return;
    }
    const entries = await PostHistoryDB.getByBrand(brandId);
    if (!entries.length) {
      container.innerHTML = '<span style="font-size:11px;color:var(--text-disabled);padding:8px;">Ainda não há histórico da marca</span>';
      return;
    }
    container.innerHTML = "";
    entries.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    entries.slice(0, 50).forEach((entry) => {
      const card = document.createElement("div");
      card.style.cssText = "display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;border:1px solid transparent;margin-bottom:4px;transition:0.15s ease;";
      card.addEventListener("mouseenter", () => { card.style.background = "var(--surface-hover)"; });
      card.addEventListener("mouseleave", () => { card.style.background = "transparent"; });
      const date = new Date(entry.updatedAt || entry.createdAt).toLocaleString("pt-BR");
      card.innerHTML = `${entry.thumbnail ? `<img src="${entry.thumbnail}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">` : `<div style="width:32px;height:32px;background:var(--surface-3);border-radius:4px;"></div>`}<div style="flex:1;min-width:0;"><div style="font-size:12px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${entry.name || "Post"}</div><div style="font-size:10px;color:var(--text-muted);">${date}</div></div>`;
      card.addEventListener("click", () => {
        this.canvas.snapshot();
        this.canvas.setState(entry.state);
        this._fitCanvas();
        this._updateFormatBadge(entry.formatId || this.canvas.getState().formatId);
        toast("Histórico recuperado.", "success");
      });
      container.appendChild(card);
    });
  }

  async _resetSlideToPreset(slideIndex) {
    const slides = this.slides.getSlides();
    const slide = slides[slideIndex];
    if (!slide?.state?._presetId) {
      toast("Este slide não tem preset vinculado.", "error");
      return;
    }
    const preset = await PresetsDB.get(slide.state._presetId);
    if (!preset?.state) {
      toast("Preset não encontrado.", "error");
      return;
    }
    const nextState = this._presetService.applyPresetToSlideState(slide.state, preset);
    this.canvas.snapshot();
    this.canvas.setState(nextState);
    this._updateGradientBar();
    toast("Slide resetado para o preset.", "success");
  }

  async _resetAllSlidesToPreset(presetId) {
    const preset = await PresetsDB.get(presetId);
    if (!preset?.state) {
      toast("Preset não encontrado.", "error");
      return;
    }
    const allSlides = this.slides.getSlides();
    const activeIdx = this.slides.getActiveIndex();
    const updatedSlides = allSlides.map((slide) => {
      if (slide.state?._presetId !== presetId) return slide;
      return { ...slide, state: this._presetService.applyPresetToSlideState(slide.state, preset) };
    });
    const resetCount = updatedSlides.filter((s) => s.state?._presetId === presetId).length;
    await this.slides.loadSlides(updatedSlides, activeIdx);
    this._updateGradientBar();
    toast(`${resetCount} slide(s) resetados para o preset.`, "success");
  }

  _queueBrandHistorySave() {
    this._historyService.save();
  }

  _queueProjectSave() {
    if (this._projectService.isLoading || !this._projectService.currentProjectId || this._projectService.isReadOnly) return;
    clearTimeout(this._projectSaveTimer);
    this._projectSaveTimer = setTimeout(async () => {
      try {
        await this._projectService.save();
        await this._projectsHomeController.render();
      } catch (e) {
        console.error("Erro ao salvar projeto:", e);
      }
    }, 800);
  }

  async _saveProjectNow() {
    await this._projectService.save();
  }
}

/* ── Toast utility ────────────────────────────────────────── */
export function toast(msg, type = "info", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icons = { info: "ℹ", success: "✓", error: "✕" };
  el.innerHTML = `<span>${icons[type] ?? ""}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("removing");
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ── Boot ────────────────────────────────────────────────── */
const app = new App();
app.init().catch((err) => {
  console.error("PostGenerate boot error:", err);
});
