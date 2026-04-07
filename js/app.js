/* ============================================================
   PostGenerate — Main App
   Orchestrates all modules, wires UI events.
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

/* ── Google Fonts preload list ──────────────────────────── */
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

/* ─────────────────────────────────────────────────────────── */
class App {
  constructor() {
    this.canvas = null; // CanvasEngine
    this.exporter = null; // ExportEngine
    this.brands = null; // BrandManager
    this.picker = null; // ColorPicker
    this.icons = null; // IconSearch
    this.slides = null; // SlideManager
    this.anim = null; // AnimEngine
    this._pickerTarget = null; // { prop, layerId } or { target: 'bg', prop }
    this._history = []; // undo/redo handled by CanvasEngine
    this._historySaveTimer = null;
    this._lastHistorySignature = "";
    this._projectSaveTimer = null;
    this._currentProjectId = null;
    this._loadingProject = false;
    this._projectDirty = false;
    this._savePresetClickTimer = null;
    this._selectedPresetOverwriteId = null;
    this._presetSaveModalBound = false;
    this._aiModalBound = false;
    this._aiConfigId = null;
    this._aiDocs = [];
    this._aiChatHistory = [];
    this._aiBusy = false;
    this._aiPendingResponse = null;
    this._aiPendingCursor = 0;
    this._aiUndoStack = [];
    this._aiSideOpen = false;
    this._aiBasePresetId = "";
    this._aiPresetsCache = [];
    this._syncingCaptionUI = false;
    this._shareReadOnly = false;
    this._realtime = {
      active: false,
      roomId: null,
      role: null,
      applyingRemote: false,
      lastRemoteTs: 0,
      syncTimer: null,
      bound: false,
    };
    this._canvasPreviewZoom = 1;
  }

  /* ── Boot ─────────────────────────────────────────────── */
  async init() {
    this._loadFonts();
    await initDB();

    // Canvas engine
    const canvasEl = document.getElementById("post-canvas");
    this.canvas = new CanvasEngine(canvasEl);

    // Exporter
    this.exporter = new ExportEngine(this.canvas);

    // Brand manager
    this.brands = new BrandManager();
    await this.brands.init();

    // Color picker
    this.picker = new ColorPicker();
    this.icons = new IconSearch();
    this.anim = new AnimEngine(this.canvas);
    this.slides = new SlideManager(this.canvas);

    // Initial render
    this.canvas.render();
    this.canvas.snapshot();
    this._fitCanvas();

    // Wire everything
    this._wireCanvasEvents();
    this._wireLayerPanel();
    this._wirePropertiesPanel();
    this._wireHeader();
    this._wireSidebar();
    this._wireKeyboard();
    this._wireBrandEvents();
    this._wireFormatModal();
    this._wireExportModal();
    this._wireIconModal();
    this._wireAnimationPanel();
    this._wireProjectsHome();
    this._wireSlideCaption();
    this._wirePanelVisibilityControls();
    this._wireShareModal();
    this._wireAIModal();
    this._wireRealtimeCollab();
    await this.slides.init();
    this.slides.on("change", () => {
      this._refreshSlideCaptionUI();
      this._markProjectDirty();
      this._queueProjectSave();
    });

    // Fit on resize
    window.addEventListener("resize", () => this._fitCanvas());

    // Click canvas background = deselect
    document.getElementById("post-canvas").addEventListener("click", (e) => {
      if (e.target === canvasEl || e.target.classList.contains("pg-bg")) {
        this.canvas.selectLayer(null);
      }
    });

    // Initial sidebar render
    await this._refreshSidebar();
    this._fillBrandIdentityFields(await this.brands.getCurrentBrand());
    await this._renderProjectsHome();
    this._showProjectsHome(true);
    await this._consumeShareLinkFromURL();

    toast("PostGenerate pronto.", "info");
  }

  /* ── Fonts ────────────────────────────────────────────── */
  _loadFonts() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    const families = GOOGLE_FONTS.map(
      (f) => `family=${f}:wght@300;400;500;600;700;800;900`,
    ).join("&");
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
  }

  /* ── Canvas fit ───────────────────────────────────────── */
  _fitCanvas() {
    const area = document.getElementById("canvas-preview-area");
    if (!area) return;
    const pad = 48;
    const availW = area.clientWidth - pad;
    const availH = area.clientHeight - pad;
    this.canvas.setPreviewSize(availW, availH);
    this.canvas.setPreviewZoom(this._canvasPreviewZoom);

    const { scale } = this.canvas;
    const { w, h } = this.canvas.getPreviewDims();
    document.getElementById("zoom-badge").textContent =
      `${Math.round(this.canvas.getScale() * 100)}%`;
  }

  /* ── Canvas events ────────────────────────────────────── */
  _wireCanvasEvents() {
    this.canvas.on("selectionChange", (layer) => {
      this._refreshLayerList();
      this._refreshPropertiesPanel(layer);
    });

    this.canvas.on("layersChange", () => {
      this._refreshLayerList();
    });

    this.canvas.on("formatChange", (fmtId) => {
      this._fitCanvas();
      this._updateFormatBadge(fmtId);
      this._queueBrandHistorySave();
      this._markProjectDirty();
      this._queueProjectSave();
    });

    this.canvas.on("stateChange", () => {
      this._queueBrandHistorySave();
      this._markProjectDirty();
      this._queueProjectSave();
    });
  }

  /* ── Layer panel ──────────────────────────────────────── */
  _wireLayerPanel() {
    document.getElementById("btn-add-text").addEventListener("click", () => {
      this.canvas.snapshot();
      this.canvas.addLayer(makeTextLayer());
    });

    document.getElementById("btn-add-badge").addEventListener("click", () => {
      this.canvas.snapshot();
      this.canvas.addLayer(makeBadgeLayer());
    });

    document.getElementById("btn-add-image").addEventListener("click", () => {
      this._openFilePicker("image/*", async (file) => {
        const b64 = await BrandManager.readFileAsBase64(file);
        this.canvas.snapshot();
        this.canvas.addLayer(makeImageLayer(null, file.name, b64));
      });
    });

    document.getElementById("btn-add-icon").addEventListener("click", () => {
      this.icons.open(({ iconId, svg }) => {
        this.canvas.snapshot();
        this.canvas.addLayer(makeIconLayer(null, iconId, iconId, svg));
      });
    });

    document.getElementById("btn-add-shape").addEventListener("click", () => {
      this.canvas.snapshot();
      this.canvas.addLayer(makeShapeLayer());
    });
  }

  _refreshLayerList() {
    const list = document.getElementById("layers-list");
    const layers = [...this.canvas.getLayers()].reverse(); // top-first display
    const selected = this.canvas.getSelectedLayer();

    list.innerHTML = "";
    layers.forEach((layer) => {
      const item = document.createElement("div");
      item.className =
        "layer-item" +
        (layer.id === selected?.id ? " selected" : "") +
        (layer.visible ? "" : " hidden");
      item.dataset.layerId = layer.id;

      const typeIcon =
        layer.type === "text"
          ? "T"
          : layer.type === "image"
            ? "🖼"
            : layer.type === "icon"
              ? "⬢"
              : "▭";

      item.innerHTML = `
        <span class="layer-item-drag" title="Reordenar">⠿</span>
        <span class="layer-item-type-icon">${typeIcon}</span>
        <span class="layer-item-name">${layer.name}</span>
        <span class="layer-item-actions">
          <button class="layer-vis-btn" title="${layer.visible ? "Ocultar" : "Mostrar"}">${layer.visible ? "👁" : "◌"}</button>
          <button class="layer-lock-btn" title="${layer.locked ? "Desbloquear" : "Bloquear"}">${layer.locked ? "🔒" : "🔓"}</button>
        </span>
      `;

      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("layer-vis-btn")) return;
        if (e.target.classList.contains("layer-lock-btn")) return;
        this.canvas.selectLayer(layer.id);
      });

      item.querySelector(".layer-vis-btn").addEventListener("click", () => {
        this.canvas.snapshot();
        this.canvas.updateLayer(layer.id, { visible: !layer.visible });
        this._refreshLayerList();
      });

      item.querySelector(".layer-lock-btn").addEventListener("click", () => {
        this.canvas.updateLayer(layer.id, { locked: !layer.locked });
        this._refreshLayerList();
      });

      list.appendChild(item);
    });
  }

  /* ── Properties panel ─────────────────────────────────── */
  _wirePropertiesPanel() {
    // Background section is always visible
    this._wireBgControls();
  }

  _refreshPropertiesPanel(layer) {
    const empty = document.getElementById("props-empty");
    const textSection = document.getElementById("props-text");
    const posSection = document.getElementById("props-position");
    const badgeSection = document.getElementById("props-badge");
    const imageSection = document.getElementById("props-image");
    const shapeSection = document.getElementById("props-shape");
    const iconSection = document.getElementById("props-icon");
    const animSection = document.getElementById("props-animation");
    const layerHeader = document.getElementById("props-layer-name");

    // Hide all
    [
      textSection,
      posSection,
      badgeSection,
      imageSection,
      shapeSection,
      iconSection,
      animSection,
    ].forEach((el) => {
      if (el) el.classList.add("hidden");
    });

    if (!layer) {
      empty?.classList.remove("hidden");
      if (layerHeader) layerHeader.textContent = "Propriedades";
      return;
    }

    empty?.classList.add("hidden");
    if (layerHeader) layerHeader.textContent = layer.name;

    // Position controls always visible when layer selected
    posSection?.classList.remove("hidden");
    animSection?.classList.remove("hidden");
    this._fillPositionControls(layer);
    this._fillAnimControls(layer);

    if (layer.type === "text") {
      textSection?.classList.remove("hidden");
      if (layer.subtype === "badge") badgeSection?.classList.remove("hidden");
      this._fillTextControls(layer);
    } else if (layer.type === "image") {
      imageSection?.classList.remove("hidden");
      this._fillImageControls(layer);
    } else if (layer.type === "shape") {
      shapeSection?.classList.remove("hidden");
      this._fillShapeControls(layer);
    } else if (layer.type === "icon") {
      iconSection?.classList.remove("hidden");
      this._fillIconControls(layer);
    }
  }

  _fillTextControls(layer) {
    this._setVal("prop-content", layer.content);
    this._setVal("prop-font-family", layer.fontFamily);
    this._setVal("prop-font-size", layer.fontSize);
    this._setVal("prop-font-weight", layer.fontWeight);
    this._setVal("prop-line-height", layer.lineHeight);
    this._setVal("prop-letter-spacing", layer.letterSpacing);
    this._setVal("prop-opacity", Math.round((layer.opacity ?? 1) * 100));
    this._setVal("prop-text-transform", layer.textTransform ?? "none");
    this._setSwatch("prop-color-swatch", layer.color);
    this._setAlign("prop-align", layer.textAlign);

    if (layer.subtype === "badge") {
      this._setVal("prop-badge-border-radius", layer.badgeBorderRadius);
      this._setVal("prop-badge-padding-x", layer.badgePaddingX);
      this._setVal("prop-badge-padding-y", layer.badgePaddingY);
      this._setSwatch(
        "prop-badge-bg-swatch",
        layer.badgeBg === "transparent" ? "transparent" : layer.badgeBg,
      );
      this._setSwatch("prop-badge-border-swatch", layer.badgeBorderColor);
    } else {
      const textHasBorder = document.getElementById("prop-text-has-border");
      if (textHasBorder) textHasBorder.checked = !!layer.hasBorder;
      this._setVal("prop-text-border-width", layer.borderWidth ?? 1);
      this._setVal("prop-text-border-radius", layer.borderRadius ?? 6);
      this._setSwatch(
        "prop-text-border-swatch",
        layer.borderColor ?? "rgba(255,255,255,0.3)",
      );
    }
  }

  _fillPositionControls(layer) {
    this._setVal("prop-x", layer.x?.toFixed(1) ?? 0);
    this._setVal("prop-y", layer.y?.toFixed(1) ?? 0);
    this._setVal(
      "prop-width",
      layer.width === "auto" ? "auto" : (layer.width?.toFixed(1) ?? "auto"),
    );
  }

  _fillImageControls(layer) {
    this._setVal("prop-img-height", layer.height?.toFixed(1) ?? 40);
    this._setVal("prop-img-fit", layer.objectFit ?? "contain");
    this._setVal("prop-img-radius", layer.borderRadius ?? 0);
    const zoom = Number(layer.imageZoom ?? 1);
    this._setVal("prop-img-zoom", zoom.toFixed(2));
    const zoomVal = document.getElementById("prop-img-zoom-val");
    if (zoomVal) zoomVal.textContent = `${zoom.toFixed(2)}x`;
    this._setVal("prop-opacity", Math.round((layer.opacity ?? 1) * 100));
  }

  _fillShapeControls(layer) {
    this._setSwatch("prop-shape-fill-swatch", layer.fillColor);
    this._setVal("prop-shape-height", layer.height?.toFixed(2) ?? 0.5);
    this._setVal("prop-shape-radius", layer.borderRadius ?? 0);
    this._setVal("prop-opacity", Math.round((layer.opacity ?? 1) * 100));
  }

  _fillIconControls(layer) {
    this._setVal("prop-icon-size", layer.size?.toFixed(1) ?? 8);
    const iconHasBorder = document.getElementById("prop-icon-has-border");
    if (iconHasBorder) iconHasBorder.checked = !!layer.hasBorder;
    this._setVal("prop-icon-border-width", layer.borderWidth ?? 1);
    this._setVal("prop-icon-border-radius", layer.borderRadius ?? 12);
    this._setSwatch("prop-icon-color-swatch", layer.color ?? "#ffffff");
    this._setSwatch("prop-icon-bg-swatch", layer.background ?? "transparent");
    this._setSwatch(
      "prop-icon-border-swatch",
      layer.borderColor ?? "rgba(255,255,255,0.32)",
    );
  }

  _fillAnimControls(layer) {
    this._setVal("prop-anim-in", layer.animIn ?? "none");
    this._setVal("prop-anim-duration", layer.animDuration ?? 0.65);
    this._setVal("prop-anim-delay", layer.animDelay ?? 0);
    this._setVal(
      "prop-anim-easing",
      layer.animEasing ?? "cubic-bezier(0.22,1,0.36,1)",
    );
  }

  _wireBgControls() {
    // Background type buttons
    document.querySelectorAll(".bg-type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".bg-type-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const type = btn.dataset.bgType;
        document
          .querySelectorAll(".bg-panel")
          .forEach((p) => p.classList.add("hidden"));
        document.getElementById(`bg-panel-${type}`)?.classList.remove("hidden");
        this.canvas.snapshot();
        this.canvas.updateBackground({ type });
      });
    });

    // Solid color
    document
      .getElementById("prop-bg-color-swatch")
      ?.addEventListener("click", () => {
        const current = this.canvas.getState().background.color;
        this._openPicker(current, (rgba) => {
          this.canvas.updateBackground({ color: rgba });
          this._setSwatch("prop-bg-color-swatch", rgba);
        });
      });

    // Gradient
    document
      .getElementById("prop-grad-from-swatch")
      ?.addEventListener("click", () => {
        const bg = this.canvas.getState().background;
        this._openPicker(bg.gradient?.from ?? "#000", (rgba) => {
          const grad = {
            ...this.canvas.getState().background.gradient,
            from: rgba,
          };
          this.canvas.updateBackground({ gradient: grad });
          this._setSwatch("prop-grad-from-swatch", rgba);
          this._updateGradientBar();
        });
      });

    document
      .getElementById("prop-grad-to-swatch")
      ?.addEventListener("click", () => {
        const bg = this.canvas.getState().background;
        this._openPicker(bg.gradient?.to ?? "#1a1a2e", (rgba) => {
          const grad = {
            ...this.canvas.getState().background.gradient,
            to: rgba,
          };
          this.canvas.updateBackground({ gradient: grad });
          this._setSwatch("prop-grad-to-swatch", rgba);
          this._updateGradientBar();
        });
      });

    document
      .getElementById("prop-grad-angle")
      ?.addEventListener("input", (e) => {
        const angle = parseInt(e.target.value);
        document.getElementById("prop-grad-angle-val").textContent =
          angle + "°";
        const angleInput = document.getElementById("prop-grad-angle-input");
        if (angleInput) angleInput.value = String(angle);
        const grad = { ...this.canvas.getState().background.gradient, angle };
        this.canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });
    document
      .getElementById("prop-grad-angle-input")
      ?.addEventListener("input", (e) => {
        const raw = parseInt(e.target.value);
        const angle = Math.max(0, Math.min(360, Number.isNaN(raw) ? 0 : raw));
        document.getElementById("prop-grad-angle-val").textContent =
          angle + "°";
        const angleRange = document.getElementById("prop-grad-angle");
        if (angleRange) angleRange.value = String(angle);
        if (e.target.value !== String(angle)) e.target.value = String(angle);
        const grad = { ...this.canvas.getState().background.gradient, angle };
        this.canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    document
      .getElementById("prop-grad-type")
      ?.addEventListener("change", (e) => {
        const grad = {
          ...this.canvas.getState().background.gradient,
          type: e.target.value,
        };
        this.canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    document
      .getElementById("prop-grad-from-reach")
      ?.addEventListener("input", (e) => {
        const fromReach = parseInt(e.target.value);
        document.getElementById("prop-grad-from-reach-val").textContent =
          fromReach + "%";
        const grad = {
          ...this.canvas.getState().background.gradient,
          fromReach,
        };
        this.canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });
    document
      .getElementById("prop-grad-to-reach")
      ?.addEventListener("input", (e) => {
        const toReach = parseInt(e.target.value);
        document.getElementById("prop-grad-to-reach-val").textContent =
          toReach + "%";
        const grad = {
          ...this.canvas.getState().background.gradient,
          toReach,
          reach: toReach,
        };
        this.canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });
    document
      .getElementById("prop-grad-opacity")
      ?.addEventListener("input", (e) => {
        const opacity = parseInt(e.target.value);
        document.getElementById("prop-grad-opacity-val").textContent =
          opacity + "%";
        const grad = {
          ...this.canvas.getState().background.gradient,
          opacity,
          fromOpacity: opacity,
          toOpacity: opacity,
        };
        this.canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });
    document
      .getElementById("prop-grad-from-opacity")
      ?.addEventListener("input", (e) => {
        const fromOpacity = parseInt(e.target.value);
        document.getElementById("prop-grad-from-opacity-val").textContent =
          fromOpacity + "%";
        const grad = {
          ...this.canvas.getState().background.gradient,
          fromOpacity,
        };
        this.canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });
    document
      .getElementById("prop-grad-to-opacity")
      ?.addEventListener("input", (e) => {
        const toOpacity = parseInt(e.target.value);
        document.getElementById("prop-grad-to-opacity-val").textContent =
          toOpacity + "%";
        const grad = {
          ...this.canvas.getState().background.gradient,
          toOpacity,
        };
        this.canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    // Image upload
    document.getElementById("btn-bg-image")?.addEventListener("click", () => {
      this._openFilePicker("image/*", async (file) => {
        const b64 = await BrandManager.readFileAsBase64(file);
        this.canvas.snapshot();
        this.canvas.updateBackground({ type: "image", image: b64 });
        document
          .querySelectorAll(".bg-type-btn")
          .forEach((b) =>
            b.classList.toggle("active", b.dataset.bgType === "image"),
          );
        document
          .querySelectorAll(".bg-panel")
          .forEach((p) => p.classList.add("hidden"));
        document.getElementById("bg-panel-image")?.classList.remove("hidden");
      });
    });

    document
      .getElementById("prop-bg-image-size")
      ?.addEventListener("change", (e) => {
        this.canvas.updateBackground({ imageSize: e.target.value });
      });

    // Wire live text/position/style controls via event delegation on properties panel
    this._wirePropertyInputs();
  }

  _wirePropertyInputs() {
    const panel = document.getElementById("properties-panel");

    const onInput = (id, apply) => {
      const el = panel.querySelector(`#${id}`);
      if (!el) return;
      const event =
        el.tagName === "TEXTAREA" || el.tagName === "SELECT"
          ? "change"
          : "input";
      el.addEventListener(event, () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.updateLayer(layer.id, apply(el.value, layer));
      });
    };

    const onInputFocus = (id) => {
      const el = panel.querySelector(`#${id}`);
      if (!el) return;
      el.addEventListener("focus", () => this.canvas.snapshot());
    };

    // Text content
    panel.querySelector("#prop-content")?.addEventListener("input", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.updateLayer(layer.id, { content: e.target.value });
    });
    panel
      .querySelector("#prop-content")
      ?.addEventListener("focus", () => this.canvas.snapshot());

    // Font family
    panel
      .querySelector("#prop-font-family")
      ?.addEventListener("change", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.snapshot();
        this.canvas.updateLayer(layer.id, { fontFamily: e.target.value });
      });

    // Font size
    panel.querySelector("#prop-font-size")?.addEventListener("input", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.updateLayer(layer.id, {
        fontSize: parseFloat(e.target.value) || layer.fontSize,
      });
    });
    panel
      .querySelector("#prop-font-size")
      ?.addEventListener("focus", () => this.canvas.snapshot());

    // Font weight
    panel
      .querySelector("#prop-font-weight")
      ?.addEventListener("change", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.snapshot();
        this.canvas.updateLayer(layer.id, {
          fontWeight: parseInt(e.target.value),
        });
      });

    // Line height
    panel.querySelector("#prop-line-height")?.addEventListener("input", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.updateLayer(layer.id, {
        lineHeight: parseFloat(e.target.value) || 1,
      });
    });
    panel
      .querySelector("#prop-line-height")
      ?.addEventListener("focus", () => this.canvas.snapshot());

    // Letter spacing
    panel
      .querySelector("#prop-letter-spacing")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.updateLayer(layer.id, { letterSpacing: e.target.value });
      });
    panel
      .querySelector("#prop-letter-spacing")
      ?.addEventListener("focus", () => this.canvas.snapshot());

    // Opacity
    panel.querySelector("#prop-opacity")?.addEventListener("input", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.updateLayer(layer.id, {
        opacity: parseInt(e.target.value) / 100,
      });
    });
    panel
      .querySelector("#prop-opacity")
      ?.addEventListener("focus", () => this.canvas.snapshot());

    // Text transform
    panel
      .querySelector("#prop-text-transform")
      ?.addEventListener("change", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.snapshot();
        this.canvas.updateLayer(layer.id, { textTransform: e.target.value });
      });

    // Alignment buttons
    panel.querySelectorAll(".align-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.snapshot();
        this.canvas.updateLayer(layer.id, { textAlign: btn.dataset.align });
        this._setAlign("prop-align", btn.dataset.align);
      });
    });

    // Color swatch
    panel.querySelector("#prop-color-swatch")?.addEventListener("click", () => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this._openPicker(layer.color, (rgba) => {
        this.canvas.updateLayer(layer.id, { color: rgba });
        this._setSwatch("prop-color-swatch", rgba);
      });
    });

    // Position
    const bindPos = (id, prop) => {
      panel.querySelector(`#${id}`)?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        const val =
          e.target.value === "auto" ? "auto" : parseFloat(e.target.value);
        if (!isNaN(val) || val === "auto")
          this.canvas.updateLayer(layer.id, { [prop]: val });
      });
      panel
        .querySelector(`#${id}`)
        ?.addEventListener("focus", () => this.canvas.snapshot());
    };
    bindPos("prop-x", "x");
    bindPos("prop-y", "y");
    bindPos("prop-width", "width");

    // Badge extras
    panel
      .querySelector("#prop-badge-border-radius")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.updateLayer(layer.id, {
          badgeBorderRadius: parseFloat(e.target.value) || 0,
        });
      });
    panel
      .querySelector("#prop-badge-padding-x")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.updateLayer(layer.id, {
          badgePaddingX: parseFloat(e.target.value) || 0,
        });
      });
    panel
      .querySelector("#prop-badge-padding-y")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.updateLayer(layer.id, {
          badgePaddingY: parseFloat(e.target.value) || 0,
        });
      });
    panel
      .querySelector("#prop-badge-bg-swatch")
      ?.addEventListener("click", () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        const cur =
          layer.badgeBg === "transparent" ? "#00000000" : layer.badgeBg;
        this._openPicker(cur, (rgba) => {
          this.canvas.updateLayer(layer.id, { badgeBg: rgba });
          this._setSwatch("prop-badge-bg-swatch", rgba);
        });
      });
    panel
      .querySelector("#prop-badge-border-swatch")
      ?.addEventListener("click", () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this._openPicker(layer.badgeBorderColor, (rgba) => {
          this.canvas.updateLayer(layer.id, { badgeBorderColor: rgba });
          this._setSwatch("prop-badge-border-swatch", rgba);
        });
      });

    // Shape controls
    panel
      .querySelector("#prop-shape-fill-swatch")
      ?.addEventListener("click", () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this._openPicker(layer.fillColor, (rgba) => {
          this.canvas.updateLayer(layer.id, { fillColor: rgba });
          this._setSwatch("prop-shape-fill-swatch", rgba);
        });
      });
    panel
      .querySelector("#prop-shape-height")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.updateLayer(layer.id, {
          height: parseFloat(e.target.value) || 0.5,
        });
      });
    panel
      .querySelector("#prop-shape-radius")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.updateLayer(layer.id, {
          borderRadius: parseFloat(e.target.value) || 0,
        });
      });

    // Image controls
    panel.querySelector("#prop-img-height")?.addEventListener("input", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.updateLayer(layer.id, {
        height: parseFloat(e.target.value) || 40,
      });
    });
    panel.querySelector("#prop-img-fit")?.addEventListener("change", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.snapshot();
      this.canvas.updateLayer(layer.id, { objectFit: e.target.value });
    });
    panel.querySelector("#prop-img-radius")?.addEventListener("input", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.updateLayer(layer.id, {
        borderRadius: parseFloat(e.target.value) || 0,
      });
    });
    panel.querySelector("#prop-img-zoom")?.addEventListener("input", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      const imageZoom = Math.max(
        0.2,
        Math.min(4, parseFloat(e.target.value) || 1),
      );
      const zoomVal = document.getElementById("prop-img-zoom-val");
      if (zoomVal) zoomVal.textContent = `${imageZoom.toFixed(2)}x`;
      this.canvas.updateLayer(layer.id, { imageZoom });
    });
    panel.querySelector("#btn-img-zoom-out")?.addEventListener("click", () => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer || layer.type !== "image") {
        toast("Selecione uma imagem para ajustar o zoom.", "info");
        return;
      }
      const next = Math.max(
        0.2,
        Math.min(4, Number(layer.imageZoom ?? 1) - 0.1),
      );
      const input = document.getElementById("prop-img-zoom");
      if (input) input.value = next.toFixed(2);
      const zoomVal = document.getElementById("prop-img-zoom-val");
      if (zoomVal) zoomVal.textContent = `${next.toFixed(2)}x`;
      this.canvas.updateLayer(layer.id, { imageZoom: next });
    });
    panel.querySelector("#btn-img-zoom-in")?.addEventListener("click", () => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer || layer.type !== "image") {
        toast("Selecione uma imagem para ajustar o zoom.", "info");
        return;
      }
      const next = Math.max(
        0.2,
        Math.min(4, Number(layer.imageZoom ?? 1) + 0.1),
      );
      const input = document.getElementById("prop-img-zoom");
      if (input) input.value = next.toFixed(2);
      const zoomVal = document.getElementById("prop-img-zoom-val");
      if (zoomVal) zoomVal.textContent = `${next.toFixed(2)}x`;
      this.canvas.updateLayer(layer.id, { imageZoom: next });
    });

    panel
      .querySelector("#prop-text-has-border")
      ?.addEventListener("change", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "text" || layer.subtype === "badge")
          return;
        this.canvas.snapshot();
        this.canvas.updateLayer(layer.id, { hasBorder: e.target.checked });
      });
    panel
      .querySelector("#prop-text-border-width")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "text" || layer.subtype === "badge")
          return;
        this.canvas.updateLayer(layer.id, {
          borderWidth: parseFloat(e.target.value) || 1,
        });
      });
    panel
      .querySelector("#prop-text-border-radius")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "text" || layer.subtype === "badge")
          return;
        this.canvas.updateLayer(layer.id, {
          borderRadius: parseFloat(e.target.value) || 0,
        });
      });
    panel
      .querySelector("#prop-text-border-swatch")
      ?.addEventListener("click", () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "text" || layer.subtype === "badge")
          return;
        this._openPicker(
          layer.borderColor ?? "rgba(255,255,255,0.3)",
          (rgba) => {
            this.canvas.updateLayer(layer.id, { borderColor: rgba });
            this._setSwatch("prop-text-border-swatch", rgba);
          },
        );
      });

    panel.querySelector("#prop-icon-size")?.addEventListener("input", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer || layer.type !== "icon") return;
      this.canvas.updateLayer(layer.id, {
        size: parseFloat(e.target.value) || 8,
      });
    });
    panel
      .querySelector("#prop-icon-has-border")
      ?.addEventListener("change", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "icon") return;
        this.canvas.snapshot();
        this.canvas.updateLayer(layer.id, { hasBorder: e.target.checked });
      });
    panel
      .querySelector("#prop-icon-border-width")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "icon") return;
        this.canvas.updateLayer(layer.id, {
          borderWidth: parseFloat(e.target.value) || 1,
        });
      });
    panel
      .querySelector("#prop-icon-border-radius")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "icon") return;
        this.canvas.updateLayer(layer.id, {
          borderRadius: parseFloat(e.target.value) || 0,
        });
      });
    panel
      .querySelector("#prop-icon-color-swatch")
      ?.addEventListener("click", () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "icon") return;
        this._openPicker(layer.color ?? "#ffffff", (rgba) => {
          this.canvas.updateLayer(layer.id, { color: rgba });
          this._setSwatch("prop-icon-color-swatch", rgba);
        });
      });
    panel
      .querySelector("#prop-icon-bg-swatch")
      ?.addEventListener("click", () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "icon") return;
        this._openPicker(layer.background ?? "#00000000", (rgba) => {
          this.canvas.updateLayer(layer.id, { background: rgba });
          this._setSwatch("prop-icon-bg-swatch", rgba);
        });
      });
    panel
      .querySelector("#prop-icon-border-swatch")
      ?.addEventListener("click", () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer || layer.type !== "icon") return;
        this._openPicker(layer.borderColor ?? "#ffffff", (rgba) => {
          this.canvas.updateLayer(layer.id, { borderColor: rgba });
          this._setSwatch("prop-icon-border-swatch", rgba);
        });
      });

    panel.querySelector("#prop-anim-in")?.addEventListener("change", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.snapshot();
      this.canvas.updateLayer(layer.id, { animIn: e.target.value });
    });
    panel
      .querySelector("#prop-anim-duration")
      ?.addEventListener("input", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.updateLayer(layer.id, {
          animDuration: parseFloat(e.target.value) || 0.1,
        });
      });
    panel.querySelector("#prop-anim-delay")?.addEventListener("input", (e) => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.updateLayer(layer.id, {
        animDelay: parseFloat(e.target.value) || 0,
      });
    });
    panel
      .querySelector("#prop-anim-easing")
      ?.addEventListener("change", (e) => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.snapshot();
        this.canvas.updateLayer(layer.id, { animEasing: e.target.value });
      });

    // Duplicate layer button
    panel
      .querySelector("#btn-duplicate-layer")
      ?.addEventListener("click", () => {
        const layer = this.canvas.getSelectedLayer();
        if (!layer) return;
        this.canvas.snapshot();
        this.canvas.duplicateLayer(layer.id);
      });

    // Delete layer button
    panel.querySelector("#btn-delete-layer")?.addEventListener("click", () => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.snapshot();
      this.canvas.removeLayer(layer.id);
    });

    // Move up/down buttons
    panel.querySelector("#btn-layer-up")?.addEventListener("click", () => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.snapshot();
      this.canvas.moveLayer(layer.id, "up");
    });
    panel.querySelector("#btn-layer-down")?.addEventListener("click", () => {
      const layer = this.canvas.getSelectedLayer();
      if (!layer) return;
      this.canvas.snapshot();
      this.canvas.moveLayer(layer.id, "down");
    });
  }

  /* ── Header ───────────────────────────────────────────── */
  _wireHeader() {
    // Undo / Redo
    document
      .getElementById("btn-undo")
      ?.addEventListener("click", () => this.canvas.undo());
    document
      .getElementById("btn-redo")
      ?.addEventListener("click", () => this.canvas.redo());

    // Format selector button
    document.getElementById("btn-format")?.addEventListener("click", () => {
      this._openFormatModal();
    });

    // Export button
    document.getElementById("btn-export")?.addEventListener("click", () => {
      this._openExportModal();
    });

    const savePresetBtn = document.getElementById("btn-save-preset");
    savePresetBtn?.addEventListener("click", () => {
      clearTimeout(this._savePresetClickTimer);
      this._savePresetClickTimer = setTimeout(() => {
        this._savePresetByNameFlow();
      }, 260);
    });
    savePresetBtn?.addEventListener("dblclick", () => {
      clearTimeout(this._savePresetClickTimer);
      this._savePresetByNameFlow();
    });

    document
      .getElementById("btn-export-brand")
      ?.addEventListener("click", async () => {
        const brandId = this.brands.getCurrentBrandId();
        if (!brandId) {
          toast("Selecione uma marca para exportar.", "error");
          return;
        }
        try {
          await this.brands.exportBrandPackage(brandId);
          toast("Conteúdo da marca exportado.", "success");
        } catch (e) {
          toast("Erro ao exportar marca.", "error");
          console.error(e);
        }
      });
    document
      .getElementById("btn-import-brand")
      ?.addEventListener("click", () => {
        document.getElementById("brand-file-input")?.click();
      });
    document
      .getElementById("brand-file-input")
      ?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await this._importBrandFromFile(file);
        e.target.value = "";
      });
    document.getElementById("btn-share")?.addEventListener("click", () => {
      this._openShareModal();
    });
    document.getElementById("btn-ai")?.addEventListener("click", async () => {
      this._openAISidePanel();
    });

    document
      .getElementById("btn-projects-home")
      ?.addEventListener("click", async () => {
        const canLeave = await this._confirmLeaveCurrentProject();
        if (!canLeave) return;
        await this._renderProjectsHome();
        this._showProjectsHome(true);
      });

    // Brand selector
    document.getElementById("btn-brand")?.addEventListener("click", () => {
      const menu = document.getElementById("brand-dropdown-menu");
      menu?.classList.toggle("open");
    });

    // Close dropdowns on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#btn-brand")) {
        document
          .getElementById("brand-dropdown-menu")
          ?.classList.remove("open");
      }
    });

    this._updateFormatBadge(this.canvas.getState().formatId);
    this._updateProjectNameLabel();
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

  /* ── Sidebar ──────────────────────────────────────────── */
  _wireSidebar() {
    // Tab switching
    document.querySelectorAll(".sidebar-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".sidebar-tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".tab-panel")
          .forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document
          .getElementById(`tab-${tab.dataset.tab}`)
          ?.classList.add("active");
      });
    });
  }

  _wireBrandEvents() {
    // Add color — only saves when OK is pressed (no live callback)
    document
      .getElementById("btn-add-global-color")
      ?.addEventListener("click", () => {
        this._openPicker("#ffffff", null).then(async (hex) => {
          if (!hex) return; // user cancelled
          const brandId = this.brands.getCurrentBrandId();
          if (brandId) {
            const exists = await this.brands.hasBrandColor(brandId, hex);
            if (exists) {
              toast("Essa cor já existe na paleta da marca.", "info");
              return;
            }
            await this.brands.addColorToBrand(brandId, hex);
          } else {
            const exists = await this.brands.hasGlobalColor(hex);
            if (exists) {
              toast("Essa cor global já foi salva.", "info");
              return;
            }
            await ColorsDB.save({ hex, isGlobal: true });
          }
          await this._refreshSidebar();
          toast("Cor adicionada!", "success");
        });
      });

    // Add font
    document.getElementById("btn-add-font")?.addEventListener("click", () => {
      this._openAddFontModal();
    });

    // Add logo
    this.brands.on("requestAddLogo", () => {
      this._openFilePicker("image/*", async (file) => {
        const b64 = await BrandManager.readFileAsBase64(file);
        const brandId = this.brands.getCurrentBrandId();
        if (brandId) {
          await this.brands.setBrandLogo(brandId, b64, file.type);
        } else {
          await this.brands.addAsset({
            name: file.name,
            type: "logo",
            data: b64,
            mimeType: file.type,
          });
        }
        await this._refreshSidebar();
        toast("Logo adicionado!", "success");
      });
    });

    // Save brand identity (font + voice)
    document
      .getElementById("btn-save-brand-identity")
      ?.addEventListener("click", async () => {
        const brandId = this.brands.getCurrentBrandId();
        if (!brandId) {
          toast("Selecione uma marca para salvar a identidade.", "error");
          return;
        }
        const brand = await this.brands.getCurrentBrand();
        await this.brands.updateBrand(brandId, {
          ...brand,
          primaryFont:
            document.getElementById("brand-primary-font")?.value?.trim() ??
            brand.primaryFont,
          secondaryFont:
            document.getElementById("brand-secondary-font")?.value?.trim() ??
            brand.secondaryFont,
          brandVoice:
            document.getElementById("brand-voice")?.value?.trim() ??
            brand.brandVoice,
          brandKeywords:
            document.getElementById("brand-keywords")?.value?.trim() ??
            brand.brandKeywords,
        });
        toast("Identidade da marca salva.", "success");
      });

    // Brand switcher in dropdown
    this.brands.on("brandsChange", () => this._refreshBrandDropdown());
    this.brands.on("currentBrandChange", async (brand) => {
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
    const brands = this.brands.getBrands();
    const currentId = this.brands.getCurrentBrandId();

    menu.innerHTML = `
      <div class="dropdown-label">Marcas</div>
      <button class="dropdown-item" data-brand-id="">— Sem marca —</button>
      ${brands
        .map(
          (b) => `
        <button class="dropdown-item" data-brand-id="${b.id}">
          ${currentId === b.id ? "✓ " : ""}${b.name}
        </button>
      `,
        )
        .join("")}
      <div class="dropdown-sep"></div>
      <button class="dropdown-item" id="dd-new-brand">+ Nova marca</button>
    `;

    menu.querySelectorAll("[data-brand-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await this.brands.setCurrentBrand(btn.dataset.brandId || null);
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
      const brand = await this.brands.createBrand(name);
      await this.brands.setCurrentBrand(brand.id);
      menu.classList.remove("open");
      document.getElementById("brand-name-label").textContent = brand.name;
      toast(`Marca "${brand.name}" criada!`, "success");
    });
  }

  async _refreshSidebar() {
    // Colors tab
    const colorsContainer = document.getElementById("sidebar-colors");
    if (colorsContainer) {
      await this.brands.renderPalette(
        colorsContainer,
        // onColorClick — applies to selected layer
        (hex) => {
          const layer = this.canvas.getSelectedLayer();
          if (layer && layer.type === "text") {
            this.canvas.snapshot();
            this.canvas.updateLayer(layer.id, { color: hex });
            this._setSwatch("prop-color-swatch", hex);
            this._refreshPropertiesPanel(this.canvas.getSelectedLayer());
          }
        },
        // onColorDelete — removes from brand palette
        async (colorId) => {
          const ok = confirm(
            "Tem certeza que deseja remover essa cor da paleta?",
          );
          if (!ok) return;
          const brandId = this.brands.getCurrentBrandId();
          if (brandId) {
            await this.brands.removeColorFromBrand(brandId, colorId);
            await this._refreshSidebar();
          }
        },
      );
    }

    // Logos tab
    const logosContainer = document.getElementById("sidebar-logos");
    if (logosContainer) {
      await this.brands.renderLogos(logosContainer, (asset) => {
        // Add logo as image layer
        this.canvas.snapshot();
        this.canvas.addLayer(makeImageLayer(null, asset.name, asset.data));
      });
    }

    // Fonts tab
    const fontsContainer = document.getElementById("sidebar-fonts");
    if (fontsContainer) {
      await this.brands.renderFonts(fontsContainer, (font) => {
        const layer = this.canvas.getSelectedLayer();
        if (layer && layer.type === "text") {
          this.canvas.snapshot();
          this.canvas.updateLayer(layer.id, { fontFamily: font.family });
          this._setVal("prop-font-family", font.family);
        }
      });
    }

    await this._refreshPresetsTab();
    await this._refreshHistoryTab();
  }

  async _refreshPresetsTab() {
    const container = document.getElementById("sidebar-presets");
    if (!container) return;
    const presets = await PresetsDB.getAll();

    if (!presets.length) {
      container.innerHTML =
        '<span style="font-size:11px;color:var(--text-disabled);padding:8px;">Nenhum preset salvo</span>';
      return;
    }

    container.innerHTML = "";
    presets.reverse().forEach((preset) => {
      const card = document.createElement("div");
      card.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        padding: 6px 8px; border-radius: 6px; cursor: pointer;
        border: 1px solid transparent; margin-bottom: 4px;
        transition: 0.15s ease;
      `;
      card.addEventListener("mouseenter", () => {
        card.style.background = "var(--surface-hover)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.background = "transparent";
      });

      const thumb = preset.thumbnail
        ? `<img src="${preset.thumbnail}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">`
        : `<div style="width:32px;height:32px;background:var(--surface-3);border-radius:4px;"></div>`;

      card.innerHTML = `
        ${thumb}
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preset.name}</div>
          <div style="font-size:10px;color:var(--text-muted);">${getFormat(preset.formatId).label}</div>
        </div>
        <button data-delete-preset="${preset.id}" style="
          background:none;border:none;color:var(--text-disabled);
          cursor:pointer;font-size:14px;padding:2px;border-radius:4px;
        ">×</button>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.dataset.deletePreset) return;
        this.canvas.snapshot();
        this.canvas.setState(preset.state);
        this._fitCanvas();
        this._updateFormatBadge(preset.state.formatId);
        toast(`Preset "${preset.name}" carregado.`, "info");
      });

      card
        .querySelector(`[data-delete-preset]`)
        ?.addEventListener("click", async (e) => {
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
      container.innerHTML =
        '<span style="font-size:11px;color:var(--text-disabled);padding:8px;">Selecione uma marca para histórico</span>';
      return;
    }
    const entries = await PostHistoryDB.getByBrand(brandId);
    if (!entries.length) {
      container.innerHTML =
        '<span style="font-size:11px;color:var(--text-disabled);padding:8px;">Ainda não há histórico da marca</span>';
      return;
    }
    container.innerHTML = "";
    entries.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    );
    entries.slice(0, 50).forEach((entry) => {
      const card = document.createElement("div");
      card.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;
        border:1px solid transparent;margin-bottom:4px;transition:0.15s ease;
      `;
      card.addEventListener("mouseenter", () => {
        card.style.background = "var(--surface-hover)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.background = "transparent";
      });
      const date = new Date(entry.updatedAt || entry.createdAt).toLocaleString(
        "pt-BR",
      );
      card.innerHTML = `
        ${entry.thumbnail ? `<img src="${entry.thumbnail}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">` : `<div style="width:32px;height:32px;background:var(--surface-3);border-radius:4px;"></div>`}
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${entry.name || "Post"}</div>
          <div style="font-size:10px;color:var(--text-muted);">${date}</div>
        </div>
      `;
      card.addEventListener("click", () => {
        this.canvas.snapshot();
        this.canvas.setState(entry.state);
        this._fitCanvas();
        this._updateFormatBadge(
          entry.formatId || this.canvas.getState().formatId,
        );
        toast("Histórico recuperado.", "success");
      });
      container.appendChild(card);
    });
  }

  /* ── Format modal ─────────────────────────────────────── */
  _wireFormatModal() {
    document
      .getElementById("btn-close-format-modal")
      ?.addEventListener("click", () => {
        document.getElementById("format-modal")?.classList.remove("open");
      });
    document.getElementById("format-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "format-modal") e.target.classList.remove("open");
    });
  }

  _openFormatModal() {
    const modal = document.getElementById("format-modal");
    const container = document.getElementById("format-modal-content");
    if (!modal || !container) return;

    container.innerHTML = "";
    const currentFmtId = this.canvas.getState().formatId;

    FORMAT_GROUPS.forEach((group) => {
      const section = document.createElement("div");
      section.style.marginBottom = "16px";
      section.innerHTML = `
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.06em;margin-bottom:8px;">${group.icon} ${group.label}</div>
        <div class="format-grid" id="fg-${group.id}"></div>
      `;
      container.appendChild(section);

      const grid = section.querySelector(`#fg-${group.id}`);
      group.formats.forEach((fmtId) => {
        const fmt = FORMATS[fmtId];
        const isActive = fmtId === currentFmtId;

        // Calculate thumb size
        const maxW = 38,
          maxH = 46;
        const ratio = fmt.width / fmt.height;
        let tw = maxW,
          th = maxH;
        if (ratio >= 1) {
          th = Math.round(maxW / ratio);
        } else {
          tw = Math.round(maxH * ratio);
        }

        const card = document.createElement("div");
        card.className = "format-card" + (isActive ? " active" : "");
        card.innerHTML = `
          <div class="format-thumb" style="width:${tw}px;height:${th}px;">${fmt.icon}</div>
          <span class="format-label">${fmt.label}<br><span style="opacity:0.5">${fmt.width}×${fmt.height}</span></span>
        `;
        card.addEventListener("click", () => {
          this.canvas.snapshot();
          this.canvas.setFormat(fmtId);
          this._fitCanvas();
          this._updateFormatBadge(fmtId);
          modal.classList.remove("open");
        });
        grid.appendChild(card);
      });
    });

    modal.classList.add("open");
  }

  /* ── Export modal ─────────────────────────────────────── */
  _wireExportModal() {
    document
      .getElementById("btn-close-export-modal")
      ?.addEventListener("click", () => {
        document.getElementById("export-modal")?.classList.remove("open");
      });
    document.getElementById("export-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "export-modal") e.target.classList.remove("open");
    });

    document
      .getElementById("btn-export-png")
      ?.addEventListener("click", async () => {
        const transparent =
          document.getElementById("export-transparent")?.checked ?? false;
        document.getElementById("export-modal")?.classList.remove("open");
        toast("Exportando...", "info");
        try {
          await this.exporter.exportPNG({ transparent });
          toast("Exportado com sucesso!", "success");
        } catch (e) {
          toast("Erro na exportação.", "error");
          console.error(e);
        }
      });

    document
      .getElementById("btn-export-all-slides")
      ?.addEventListener("click", async () => {
        const transparent =
          document.getElementById("export-transparent")?.checked ?? false;
        document.getElementById("export-modal")?.classList.remove("open");
        const slides = this.slides.getSlides();
        if (!slides.length) {
          toast("Nenhum slide no projeto.", "info");
          return;
        }
        toast(`Exportando ${slides.length} slide(s)...`, "info");
        try {
          await this.exporter.exportAllSlides(slides, {
            transparent,
            onProgress: (done, total) => {
              if (done < total)
                toast(`Exportando slide ${done}/${total}...`, "info");
            },
          });
          toast("ZIP gerado com sucesso!", "success");
        } catch (e) {
          toast("Erro ao exportar slides.", "error");
          console.error(e);
        }
      });

    document
      .getElementById("btn-export-all-formats")
      ?.addEventListener("click", async () => {
        const formatIds = this._getSelectedExportFormatIds();
        const mediaType =
          document.getElementById("export-zip-media-type")?.value || "png";
        const transparent =
          document.getElementById("export-transparent")?.checked ?? false;
        document.getElementById("export-modal")?.classList.remove("open");
        if (!formatIds.length) {
          toast("Selecione ao menos um formato.", "info");
          return;
        }
        toast("Gerando ZIP do slide atual...", "info");
        try {
          await this._exportCurrentAcrossFormatsZip({
            formatIds,
            mediaType,
            transparent,
          });
          toast("Exportação concluída!", "success");
        } catch (e) {
          toast("Erro na exportação.", "error");
          console.error(e);
        }
      });
    document
      .getElementById("btn-export-all-slides-selected")
      ?.addEventListener("click", async () => {
        const formatIds = this._getSelectedExportFormatIds();
        const mediaType =
          document.getElementById("export-zip-media-type")?.value || "png";
        const transparent =
          document.getElementById("export-transparent")?.checked ?? false;
        document.getElementById("export-modal")?.classList.remove("open");
        if (!formatIds.length) {
          toast("Selecione ao menos um formato.", "info");
          return;
        }
        const slides = this.slides.getSlides();
        if (!slides.length) {
          toast("Nenhum slide no projeto.", "info");
          return;
        }
        toast(
          `Gerando ZIP ${mediaType.toUpperCase()} (${slides.length} slides)...`,
          "info",
        );
        try {
          await this._exportAllSlidesAcrossFormatsZip({
            slides,
            formatIds,
            mediaType,
            transparent,
          });
          toast("ZIP gerado com sucesso!", "success");
        } catch (e) {
          toast("Erro ao gerar ZIP.", "error");
          console.error(e);
        }
      });
    document
      .getElementById("btn-export-all-slides-selected-separate")
      ?.addEventListener("click", async () => {
        const formatIds = this._getSelectedExportFormatIds();
        const mediaType =
          document.getElementById("export-zip-media-type")?.value || "png";
        const transparent =
          document.getElementById("export-transparent")?.checked ?? false;
        document.getElementById("export-modal")?.classList.remove("open");
        if (!formatIds.length) {
          toast("Selecione ao menos um formato.", "info");
          return;
        }
        const slides = this.slides.getSlides();
        if (!slides.length) {
          toast("Nenhum slide no projeto.", "info");
          return;
        }
        toast(
          `Exportando separadamente: ${slides.length} slides em ${mediaType.toUpperCase()}...`,
          "info",
        );
        try {
          await this._exportAllSlidesAcrossFormatsSeparate({
            slides,
            formatIds,
            mediaType,
            transparent,
          });
          toast("Exportação separada concluída!", "success");
        } catch (e) {
          toast("Erro na exportação separada.", "error");
          console.error(e);
        }
      });
    document
      .getElementById("btn-export-svg")
      ?.addEventListener("click", async () => {
        document.getElementById("export-modal")?.classList.remove("open");
        toast("Exportando SVG...", "info");
        try {
          await this.exporter.exportSVG();
          toast("SVG exportado com sucesso!", "success");
        } catch (e) {
          toast("Erro ao exportar SVG.", "error");
          console.error(e);
        }
      });

    document
      .getElementById("btn-export-gif")
      ?.addEventListener("click", async () => {
        document.getElementById("export-modal")?.classList.remove("open");
        toast("Gerando GIF animado...", "info");
        try {
          await this.anim.exportGIF();
          toast("GIF exportado com sucesso!", "success");
        } catch (e) {
          toast("Erro ao exportar GIF.", "error");
          console.error(e);
        }
      });

    document
      .getElementById("btn-export-video")
      ?.addEventListener("click", async () => {
        document.getElementById("export-modal")?.classList.remove("open");
        toast("Gerando vídeo...", "info");
        try {
          await this.anim.exportVideo();
          toast("Vídeo exportado com sucesso!", "success");
        } catch (e) {
          toast("Erro ao exportar vídeo.", "error");
          console.error(e);
        }
      });
  }

  _openExportModal() {
    this._renderExportFormatOptions();
    document.getElementById("export-modal")?.classList.add("open");
  }

  _renderExportFormatOptions() {
    const host = document.getElementById("export-format-options");
    if (!host) return;
    if (host.childElementCount) return;
    Object.values(FORMATS).forEach((fmt) => {
      const label = document.createElement("label");
      label.style.cssText =
        "display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;";
      label.innerHTML = `
        <input type="checkbox" class="export-format-checkbox" value="${fmt.id}" ${
          fmt.id === this.canvas.getState().formatId ? "checked" : ""
        } />
        <span>${fmt.label}</span>
      `;
      host.appendChild(label);
    });
  }

  _getSelectedExportFormatIds() {
    const nodes = document.querySelectorAll(".export-format-checkbox:checked");
    return Array.from(nodes)
      .map((n) => n.value)
      .filter(Boolean);
  }

  async _exportCurrentAcrossFormatsZip({ formatIds, mediaType, transparent }) {
    if (!window.JSZip) throw new Error("JSZip não carregado.");
    const zip = new window.JSZip();
    const savedState = structuredClone(this.canvas.getState());
    try {
      for (const fmtId of formatIds) {
        const next = structuredClone(savedState);
        next.formatId = fmtId;
        this.canvas.setState(next);
        this._fitCanvas();
        await this._wait(90);
        const blob = await this._exportBlobByMediaType({
          mediaType,
          transparent,
          formatId: fmtId,
        });
        const ext =
          mediaType === "video"
            ? "webm"
            : mediaType === "gif"
              ? "gif"
              : mediaType;
        zip.file(this.exporter._buildFilename(next, fmtId, ext), blob);
      }
    } finally {
      this.canvas.setState(savedState);
      this._fitCanvas();
      this._updateFormatBadge(this.canvas.getState().formatId);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const ts = new Date().toISOString().slice(0, 10);
    this.exporter._download(blob, `slide-atual-${mediaType}-${ts}.zip`);
  }

  async _exportAllSlidesAcrossFormatsZip({
    slides,
    formatIds,
    mediaType,
    transparent,
  }) {
    if (!window.JSZip) throw new Error("JSZip não carregado.");
    const zip = new window.JSZip();
    const savedState = structuredClone(this.canvas.getState());
    let successCount = 0;
    try {
      for (let i = 0; i < slides.length; i++) {
        for (const fmtId of formatIds) {
          try {
            const base = structuredClone(slides[i].state);
            base.formatId = fmtId;
            this.canvas.setState(base);
            this._fitCanvas();
            await this._wait(90);
            const blob = await this._exportBlobByMediaType({
              mediaType,
              transparent,
              formatId: fmtId,
            });
            const pad = String(i + 1).padStart(2, "0");
            const ext =
              mediaType === "video"
                ? "webm"
                : mediaType === "gif"
                  ? "gif"
                  : mediaType;
            const name = `slide-${pad}-${this.exporter._buildFilename(base, fmtId, ext)}`;
            zip.file(name, blob);
            successCount++;
          } catch (e) {
            console.error(`Falha slide ${i + 1} / formato ${fmtId}:`, e);
          }
        }
      }
    } finally {
      this.canvas.setState(savedState);
      this._fitCanvas();
      this._updateFormatBadge(this.canvas.getState().formatId);
    }
    if (!successCount) throw new Error("Nenhum arquivo exportado.");
    const blob = await zip.generateAsync({ type: "blob" });
    const ts = new Date().toISOString().slice(0, 10);
    this.exporter._download(blob, `slides-${mediaType}-${ts}.zip`);
  }

  async _exportAllSlidesAcrossFormatsSeparate({
    slides,
    formatIds,
    mediaType,
    transparent,
  }) {
    const savedState = structuredClone(this.canvas.getState());
    let successCount = 0;
    try {
      for (let i = 0; i < slides.length; i++) {
        for (const fmtId of formatIds) {
          const base = structuredClone(slides[i].state);
          base.formatId = fmtId;
          this.canvas.setState(base);
          this._fitCanvas();
          await this._wait(90);
          try {
            const blob = await this._exportBlobByMediaType({
              mediaType,
              transparent,
              formatId: fmtId,
            });
            const pad = String(i + 1).padStart(2, "0");
            const ext =
              mediaType === "video"
                ? "webm"
                : mediaType === "gif"
                  ? "gif"
                  : mediaType;
            const name = `slide-${pad}-${this.exporter._buildFilename(base, fmtId, ext)}`;
            this.exporter._download(blob, name);
            successCount++;
            await this._wait(220);
          } catch (e) {
            console.error(`Falha export separado slide ${i + 1}/${fmtId}:`, e);
          }
        }
      }
    } finally {
      this.canvas.setState(savedState);
      this._fitCanvas();
      this._updateFormatBadge(this.canvas.getState().formatId);
    }
    if (!successCount)
      throw new Error("Nenhum arquivo foi exportado separadamente.");
  }

  async _exportBlobByMediaType({ mediaType, transparent, formatId }) {
    if (mediaType === "svg") {
      return await this.exporter.exportSVG({
        transparent,
        formatId,
        download: false,
      });
    }
    if (mediaType === "gif") {
      return await this.anim.exportGIF({ download: false });
    }
    if (mediaType === "video") {
      return await this.anim.exportVideo({ download: false });
    }
    return await this.exporter.exportPNG({
      transparent,
      formatId,
      download: false,
    });
  }

  _wireIconModal() {
    document
      .getElementById("btn-open-icon-modal")
      ?.addEventListener("click", () => {
        this.icons.open(({ iconId, svg }) => {
          this.canvas.snapshot();
          this.canvas.addLayer(makeIconLayer(null, iconId, iconId, svg));
        });
      });
  }

  _wireAnimationPanel() {
    document
      .getElementById("btn-play-animation")
      ?.addEventListener("click", async () => {
        await this.anim.play();
      });

    document
      .getElementById("btn-apply-bg-all-slides")
      ?.addEventListener("click", async () => {
        await this._applyCurrentBgToAllSlides();
      });
    document
      .getElementById("btn-canvas-img-zoom-out")
      ?.addEventListener("click", () => this._adjustCanvasPreviewZoom(-0.1));
    document
      .getElementById("btn-canvas-img-zoom-in")
      ?.addEventListener("click", () => this._adjustCanvasPreviewZoom(0.1));
  }

  _adjustCanvasPreviewZoom(delta) {
    this._canvasPreviewZoom = Math.max(
      0.25,
      Math.min(3, Number(this._canvasPreviewZoom || 1) + Number(delta || 0)),
    );
    this._fitCanvas();
  }

  _wireSlideCaption() {
    document
      .getElementById("slide-caption-input")
      ?.addEventListener("input", (e) => {
        if (this._syncingCaptionUI) return;
        this.slides.setActiveCaption(e.target.value ?? "");
      });
    document
      .getElementById("btn-copy-slide-caption")
      ?.addEventListener("click", async () => {
        const value =
          document.getElementById("slide-caption-input")?.value?.trim() ?? "";
        if (!value) {
          toast("Sem legenda para copiar.", "info");
          return;
        }
        try {
          await navigator.clipboard.writeText(value);
          toast("Legenda copiada.", "success");
        } catch {
          toast("Não foi possível copiar automaticamente.", "error");
        }
      });
    this._refreshSlideCaptionUI();
  }

  _wirePanelVisibilityControls() {
    const capBtn = document.getElementById("btn-toggle-caption-box");
    const capBox = document.getElementById("slide-caption-box");
    const layersBtn = document.getElementById("btn-toggle-layers-list");
    const layersList = document.getElementById("layers-list");
    if (capBtn && capBox) {
      const saved = localStorage.getItem("pg_caption_collapsed") === "1";
      capBox.classList.toggle("collapsed", saved);
      capBtn.style.opacity = saved ? "0.65" : "";
      capBtn.addEventListener("click", () => {
        const collapsed = !capBox.classList.contains("collapsed");
        capBox.classList.toggle("collapsed", collapsed);
        capBtn.style.opacity = collapsed ? "0.65" : "";
        localStorage.setItem("pg_caption_collapsed", collapsed ? "1" : "0");
      });
    }
    if (layersBtn && layersList) {
      const saved = localStorage.getItem("pg_layers_collapsed") === "1";
      layersList.classList.toggle("collapsed", saved);
      layersBtn.style.opacity = saved ? "0.65" : "";
      layersBtn.addEventListener("click", () => {
        const collapsed = !layersList.classList.contains("collapsed");
        layersList.classList.toggle("collapsed", collapsed);
        layersBtn.style.opacity = collapsed ? "0.65" : "";
        localStorage.setItem("pg_layers_collapsed", collapsed ? "1" : "0");
      });
    }
  }

  _refreshSlideCaptionUI() {
    const input = document.getElementById("slide-caption-input");
    if (!input) return;
    const active = this.slides?.getActiveSlide?.();
    const text = active?.caption ?? "";
    this._syncingCaptionUI = true;
    input.value = text;
    this._syncingCaptionUI = false;
  }

  async _applyCurrentBgToAllSlides() {
    const slides = this.slides.getSlides(); // already includes latest active state (synced via stateChange)
    if (slides.length <= 1) {
      toast("Só há um slide no projeto.", "info");
      return;
    }
    const bg = structuredClone(this.canvas.getState().background);
    if (!bg) {
      toast("Sem fundo definido no slide atual.", "info");
      return;
    }
    this.canvas.snapshot();
    const activeIdx = this.slides.getActiveIndex();
    const updated = slides.map((s) => {
      const state = structuredClone(s.state ?? {});
      state.background = structuredClone(bg);
      return { ...s, state };
    });
    await this.slides.loadSlides(updated, activeIdx);
    toast(`Fundo aplicado em todos os ${slides.length} slides.`, "success");
  }

  _wireShareModal() {
    document
      .getElementById("btn-close-share-modal")
      ?.addEventListener("click", () => this._closeShareModal());
    document.getElementById("share-modal")?.addEventListener("click", (e) => {
      if (e.target?.id === "share-modal") this._closeShareModal();
    });
    document
      .getElementById("btn-generate-share-code")
      ?.addEventListener("click", async () => {
        await this._generateShareCode();
      });
    document
      .getElementById("btn-copy-share-code")
      ?.addEventListener("click", async () => {
        const el = document.getElementById("share-code-output");
        const value = el?.value?.trim();
        if (!value) {
          toast("Gere um código antes de copiar.", "info");
          return;
        }
        try {
          await navigator.clipboard.writeText(value);
          toast("Código copiado.", "success");
        } catch {
          toast("Não foi possível copiar automaticamente.", "error");
        }
      });
    document
      .getElementById("btn-generate-share-link")
      ?.addEventListener("click", async () => {
        const scope =
          document.getElementById("share-scope")?.value ?? "project";
        if (scope !== "project") {
          toast("Link disponível apenas para projeto.", "info");
          return;
        }
        if (!this._currentProjectId) {
          toast("Abra um projeto para gerar link.", "error");
          return;
        }
        const permission =
          document.getElementById("share-permission")?.value ?? "edit";
        const link = await this._generateProjectShareLink(
          this._currentProjectId,
          permission,
          { copyToClipboard: false, silent: true },
        );
        if (!link) return;
        document.getElementById("share-link-output").value = link;
        toast("Link de compartilhamento gerado.", "success");
      });
    document
      .getElementById("btn-copy-share-link")
      ?.addEventListener("click", async () => {
        const link = document
          .getElementById("share-link-output")
          ?.value?.trim();
        if (!link) {
          toast("Gere um link antes de copiar.", "info");
          return;
        }
        try {
          await navigator.clipboard.writeText(link);
          toast("Link copiado.", "success");
        } catch {
          toast("Não foi possível copiar automaticamente.", "error");
        }
      });
    document
      .getElementById("btn-apply-share-code")
      ?.addEventListener("click", async () => {
        await this._applyShareCode();
      });
  }

  _openShareModal() {
    document.getElementById("share-code-output").value = "";
    const linkEl = document.getElementById("share-link-output");
    if (linkEl) linkEl.value = "";
    document.getElementById("share-modal")?.classList.add("open");
  }

  _closeShareModal() {
    document.getElementById("share-modal")?.classList.remove("open");
  }

  _wireAIModal() {
    if (this._aiModalBound) return;
    this._aiModalBound = true;
    document
      .getElementById("btn-close-ai-modal")
      ?.addEventListener("click", () => {
        document.getElementById("ai-modal")?.classList.remove("open");
      });
    document.getElementById("ai-modal")?.addEventListener("click", (e) => {
      if (e.target?.id === "ai-modal") {
        document.getElementById("ai-modal")?.classList.remove("open");
      }
    });
    document
      .getElementById("btn-ai-save-config")
      ?.addEventListener("click", async () => {
        await this._saveAIConfig();
      });
    document
      .getElementById("btn-ai-add-docs")
      ?.addEventListener("click", async () => {
        await this._addAIDocs();
      });
    document
      .getElementById("btn-ai-generate-post")
      ?.addEventListener("click", async () => {
        await this._requestAIResponse();
      });
    document
      .getElementById("btn-ai-plan")
      ?.addEventListener("click", async () => {
        await this._requestAIResponse();
      });
    document
      .getElementById("btn-ai-apply-partial")
      ?.addEventListener("click", async () => {
        await this._applyAIPending(false);
      });
    document
      .getElementById("btn-ai-apply-all")
      ?.addEventListener("click", async () => {
        await this._applyAIPending(true);
      });
    document
      .getElementById("btn-ai-undo-last")
      ?.addEventListener("click", async () => {
        await this._undoLastAIApply();
      });
    document
      .getElementById("btn-ai-clear-chat")
      ?.addEventListener("click", () => {
        this._aiChatHistory = [];
        this._aiPendingResponse = null;
        this._aiPendingCursor = 0;
        this._renderAIChat();
        this._renderAIActionStatus();
      });
    document
      .getElementById("btn-ai-side-close")
      ?.addEventListener("click", () => this._closeAISidePanel());
    document
      .getElementById("btn-ai-open-config")
      ?.addEventListener("click", async () => {
        await this._openAIModal();
      });
    document
      .getElementById("btn-ai-side-send")
      ?.addEventListener("click", async () => {
        await this._requestAIResponse();
      });
    document
      .getElementById("ai-side-prompt")
      ?.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          await this._requestAIResponse();
        }
      });
    document
      .getElementById("btn-ai-side-plan")
      ?.addEventListener("click", async () => {
        await this._requestAIResponse();
      });
    document
      .getElementById("btn-ai-side-partial")
      ?.addEventListener("click", async () => {
        await this._applyAIPending(false);
      });
    document
      .getElementById("btn-ai-side-all")
      ?.addEventListener("click", async () => {
        await this._applyAIPending(true);
      });
    document
      .getElementById("btn-ai-side-undo")
      ?.addEventListener("click", async () => {
        await this._undoLastAIApply();
      });
    document
      .getElementById("btn-ai-side-clear")
      ?.addEventListener("click", () => {
        this._aiChatHistory = [];
        this._aiPendingResponse = null;
        this._aiPendingCursor = 0;
        const sidePrompt = document.getElementById("ai-side-prompt");
        if (sidePrompt) sidePrompt.value = "";
        this._renderAIChat();
        this._renderAIActionStatus();
      });
    document
      .getElementById("btn-close-ai-doc-modal")
      ?.addEventListener("click", () => this._closeAIDocModal());
    document.getElementById("ai-doc-modal")?.addEventListener("click", (e) => {
      if (e.target?.id === "ai-doc-modal") this._closeAIDocModal();
    });
    document
      .getElementById("btn-save-ai-doc-modal")
      ?.addEventListener("click", async () => {
        await this._saveAIDocModal();
      });
    document
      .getElementById("ai-provider")
      ?.addEventListener("change", () => this._applyAIProviderDefaults());
    const syncBasePreset = (value) => {
      this._aiBasePresetId = value ?? "";
      const a = document.getElementById("ai-base-preset");
      const b = document.getElementById("ai-side-base-preset");
      if (a && a.value !== this._aiBasePresetId) a.value = this._aiBasePresetId;
      if (b && b.value !== this._aiBasePresetId) b.value = this._aiBasePresetId;
      if (this._aiBasePresetId) {
        const preset = this._aiPresetsCache.find(
          (p) => p.id === this._aiBasePresetId,
        );
        if (preset)
          this._pushAIProgress(`Preset base definido: ${preset.name}`);
      } else {
        this._pushAIProgress(
          "Preset base limpo. Usando slide atual como referência.",
        );
      }
    };
    document
      .getElementById("ai-base-preset")
      ?.addEventListener("change", (e) => syncBasePreset(e.target.value));
    document
      .getElementById("ai-side-base-preset")
      ?.addEventListener("change", (e) => syncBasePreset(e.target.value));
    this._initAIStructuredPromptControls();
  }

  async _openAISidePanel() {
    const panel = document.getElementById("ai-side-panel");
    if (!panel) return;
    panel.style.transform = "translateX(0)";
    this._aiSideOpen = true;
    const brandId = this.brands.getCurrentBrandId();
    if (brandId) {
      this._aiPresetsCache = await PresetsDB.getAll();
      this._renderAIPresetSelectors();
    }
    this._syncAIStructuredDefaultsFromCanvas();
    this._renderAIChat();
    this._renderAIActionStatus();
  }

  _closeAISidePanel() {
    const panel = document.getElementById("ai-side-panel");
    if (!panel) return;
    panel.style.transform = "translateX(100%)";
    this._aiSideOpen = false;
  }

  async _openAIModal() {
    const brandId = this.brands.getCurrentBrandId();
    const configs = await AIConfigDB.getByBrand(brandId);
    const config = configs.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    )[0];
    this._aiConfigId = config?.id ?? null;
    document.getElementById("ai-provider").value =
      config?.provider ?? "minimax";
    document.getElementById("ai-model").value = config?.model ?? "MiniMax-M2.7";
    document.getElementById("ai-endpoint").value =
      config?.endpoint ??
      this._getDefaultEndpoint(config?.provider ?? "minimax");
    document.getElementById("ai-api-key").value = config?.apiKey ?? "";
    document.getElementById("ai-temperature").value = String(
      config?.temperature ?? 0.8,
    );
    this._applyAIProviderDefaults();
    this._aiDocs = await BrandDocsDB.getByBrand(brandId);
    this._aiPresetsCache = await PresetsDB.getAll();
    this._renderAIPresetSelectors();
    this._renderAIDocsList();
    this._renderAIChat();
    this._renderAIActionStatus();
    document.getElementById("ai-modal")?.classList.add("open");
  }

  async _saveAIConfig() {
    const brandId = this.brands.getCurrentBrandId();
    if (!brandId) {
      toast("Selecione uma marca para configurar IA.", "error");
      return;
    }
    const provider = document.getElementById("ai-provider")?.value ?? "minimax";
    const model = document.getElementById("ai-model")?.value?.trim() ?? "";
    const endpoint =
      document.getElementById("ai-endpoint")?.value?.trim() ?? "";
    const apiKeyInput =
      document.getElementById("ai-api-key")?.value?.trim() ?? "";
    const temperature = parseFloat(
      document.getElementById("ai-temperature")?.value ?? "0.8",
    );
    const existingList = await AIConfigDB.getByBrand(brandId);
    const existing = existingList.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    )[0];
    const id = this._aiConfigId ?? existing?.id;
    const apiKey = apiKeyInput || existing?.apiKey || "";
    const saved = await AIConfigDB.save({
      id,
      brandId,
      provider,
      model:
        model ||
        (provider === "openai"
          ? "gpt-4o-mini"
          : provider === "minimax_token_plan"
            ? "MiniMax-M2.7"
            : "MiniMax-M2.7"),
      endpoint,
      apiKey,
      temperature: Number.isFinite(temperature) ? temperature : 0.8,
    });
    this._aiConfigId =
      typeof saved === "string" ? saved : (id ?? this._aiConfigId);
    if (!apiKeyInput && existing?.apiKey) {
      document.getElementById("ai-api-key").value = existing.apiKey;
    }
    toast("Configuração de IA salva localmente.", "success");
  }

  async _addAIDocs() {
    const brandId = this.brands.getCurrentBrandId();
    if (!brandId) {
      toast("Selecione uma marca antes de anexar arquivos.", "error");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "*/*";
    input.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files ?? []);
      for (const file of files) {
        const content = await this._extractDocContent(file);
        await BrandDocsDB.save({
          brandId,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          content,
        });
      }
      this._aiDocs = await BrandDocsDB.getByBrand(brandId);
      this._renderAIDocsList();
      toast("Arquivos anexados à marca.", "success");
    });
    input.click();
  }

  async _extractDocContent(file) {
    const name = file.name?.toLowerCase?.() ?? "";
    const isTextLike =
      file.type.startsWith("text/") ||
      name.endsWith(".md") ||
      name.endsWith(".txt") ||
      name.endsWith(".json") ||
      name.endsWith(".csv") ||
      name.endsWith(".xml");
    if (isTextLike) {
      return await BrandManager.readFileAsText(file);
    }
    const b64 = await BrandManager.readFileAsBase64(file);
    return `[ARQUIVO_BINARIO:${file.name}] ${b64.slice(0, 1200)}`;
  }

  _renderAIDocsList() {
    const list = document.getElementById("ai-docs-list");
    if (!list) return;
    if (!this._aiDocs.length) {
      list.innerHTML =
        '<div class="text-xs text-muted" style="padding:8px;">Nenhum arquivo anexado.</div>';
      return;
    }
    list.innerHTML = "";
    this._aiDocs.forEach((doc) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:8px;padding:6px 8px;";
      row.innerHTML = `
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc.name}</div>
          <div class="text-xs text-muted">${doc.mimeType || "arquivo"}</div>
        </div>
        <button class="btn btn-ghost btn-sm" data-doc-view="${doc.id}">Ver</button>
        ${
          this._isEditableAIDoc(doc)
            ? `<button class="btn btn-ghost btn-sm" data-doc-edit="${doc.id}">Editar</button>`
            : ""
        }
        <button class="btn btn-ghost btn-sm" data-doc-del="${doc.id}">Excluir</button>
      `;
      row
        .querySelector("[data-doc-view]")
        ?.addEventListener("click", () => this._openAIDocModal(doc, false));
      row
        .querySelector("[data-doc-edit]")
        ?.addEventListener("click", () => this._openAIDocModal(doc, true));
      row
        .querySelector("[data-doc-del]")
        ?.addEventListener("click", async () => {
          await BrandDocsDB.delete(doc.id);
          this._aiDocs = this._aiDocs.filter((d) => d.id !== doc.id);
          this._renderAIDocsList();
        });
      list.appendChild(row);
    });
  }

  _isEditableAIDoc(doc) {
    const mime = String(doc?.mimeType ?? "").toLowerCase();
    const name = String(doc?.name ?? "").toLowerCase();
    return (
      mime.startsWith("text/") ||
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".markdown")
    );
  }

  _openAIDocModal(doc, editable) {
    const modal = document.getElementById("ai-doc-modal");
    const title = document.getElementById("ai-doc-modal-title");
    const content = document.getElementById("ai-doc-modal-content");
    const saveBtn = document.getElementById("btn-save-ai-doc-modal");
    if (!modal || !title || !content || !saveBtn || !doc) return;
    modal.dataset.docId = doc.id;
    modal.dataset.editable = editable ? "1" : "0";
    title.textContent = editable
      ? `Editar: ${doc.name}`
      : `Visualizar: ${doc.name}`;
    content.value = String(doc.content ?? "");
    content.readOnly = !editable;
    saveBtn.style.display = editable ? "" : "none";
    modal.classList.add("open");
  }

  _closeAIDocModal() {
    const modal = document.getElementById("ai-doc-modal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.dataset.docId = "";
  }

  async _saveAIDocModal() {
    const modal = document.getElementById("ai-doc-modal");
    const content = document.getElementById("ai-doc-modal-content");
    if (!modal || !content) return;
    const docId = modal.dataset.docId;
    if (!docId) return;
    const doc = await BrandDocsDB.get(docId);
    if (!doc) {
      toast("Documento não encontrado.", "error");
      return;
    }
    await BrandDocsDB.save({
      ...doc,
      content: content.value,
    });
    const brandId = this.brands.getCurrentBrandId();
    this._aiDocs = await BrandDocsDB.getByBrand(brandId);
    this._renderAIDocsList();
    this._closeAIDocModal();
    toast("Documento atualizado.", "success");
  }

  async _requestAIResponse() {
    if (this._aiBusy) {
      this._pushAIProgress("IA ainda processando a solicitação anterior...");
      return;
    }
    this._openAISidePanel();
    const brandId = this.brands.getCurrentBrandId();
    if (!brandId) {
      this._pushAIProgress("Selecione uma marca antes de enviar para a IA.");
      toast("Selecione uma marca para usar IA.", "error");
      return;
    }
    await this._saveAIConfig();
    const cfgs = await AIConfigDB.getByBrand(brandId);
    const cfg = cfgs.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    )[0];
    if (!cfg?.apiKey) {
      this._pushAIProgress(
        "API key ausente. Abra Config no chat lateral e salve a chave.",
      );
      await this._openAIModal();
      toast("Informe API key para gerar com IA.", "error");
      return;
    }
    const prompt = this._consumeAIPrompt();
    if (!prompt) {
      this._pushAIProgress(
        "Digite uma mensagem no chat para gerar alterações.",
      );
      toast("Digite o prompt para gerar o post.", "error");
      return;
    }
    this._aiPresetsCache = await PresetsDB.getAll();
    const brief = this._buildAIStructuredBrief();
    const effectivePrompt = this._composeAIPrompt(prompt, brief);
    if (await this._handleAIPresetCommand(prompt)) return;
    this._aiChatHistory.push({ role: "user", content: prompt });
    this._renderAIChat();
    this._pushAIProgress("Iniciando geração com IA...");
    const brand = await this.brands.getCurrentBrand();
    this._pushAIProgress("Carregando documentos e contexto da marca...");
    this._aiDocs = await BrandDocsDB.getByBrand(brandId);
    const { docContext, docMeta } = this._buildAIDocContext(this._aiDocs);
    this._pushAIBasisContext({
      prompt,
      brand,
      docs: this._aiDocs,
      docMeta,
      brief,
    });
    const brandContext = await this._buildRichBrandContext(brand);
    const templateSchema = this._buildTemplateSchema();
    if (templateSchema.length) {
      this._pushAIProgress(
        `Schema do template: ${templateSchema.map((f) => `"${f.layerName}" (${f.role})`).join(", ")}`,
      );
    }
    try {
      this._aiBusy = true;
      this._pushAIProgress(
        `Config IA: provider=${cfg.provider}, model=${cfg.model}, endpoint=${cfg.endpoint || "auto"}`,
      );
      this._pushAIProgress("Chamando modelo e aguardando resposta...");
      const tools = await this._buildAIMCPTools(brandId, brief);
      const historyForAI = this._buildHistoryForAI(
        this._aiChatHistory.slice(-16),
        prompt,
        effectivePrompt,
      );
      const out = await aiEngine.chatWithTools({
        provider: cfg.provider,
        model: cfg.model,
        endpoint: cfg.endpoint,
        apiKey: cfg.apiKey,
        chatHistory: historyForAI,
        brandContext,
        docContext,
        currentFormatId: this.canvas.getState().formatId,
        tools,
        templateSchema,
        temperature: cfg.temperature ?? 0.8,
      });
      this._ensureAISlideCountIntent(
        out,
        prompt,
        brief.postCount,
        brief.formatId,
      );
      this._aiChatHistory.push({
        role: "assistant",
        content: out.assistantMessage || "Ajustei o post conforme solicitado.",
      });
      this._renderAIChat();
      this._pushAIDebugLog(out._debug);
      this._pushAIRawResponse(out);
      this._pushAIProgress(
        "Resposta recebida. Aplicando ações em tempo real...",
      );
      this._aiPendingResponse = out;
      this._aiPendingCursor = 0;
      this._renderAIActionStatus();
      await this._applyAIPending(true);
    } catch (e) {
      toast(`Erro na IA: ${e.message || "falha"}`, "error");
      this._pushAIProgress(`Erro da IA: ${e.message || "falha"}`);
      console.error(e);
    } finally {
      this._aiBusy = false;
    }
  }

  async _applyAIPending(applyAll = false) {
    const out = this._aiPendingResponse;
    if (!out) {
      toast("Não há plano pendente da IA.", "info");
      return;
    }
    const actions = Array.isArray(out.actions) ? out.actions : [];
    const hasActions = actions.length > 0;
    const onlyPlan = !hasActions && !!out.plan;
    if (!hasActions && !out.plan) {
      toast("A resposta atual não possui ações aplicáveis.", "info");
      return;
    }
    this._pushAIUndoSnapshot();
    try {
      if (onlyPlan) {
        if (!this._hasMeaningfulPlan(out.plan)) {
          this._aiPendingResponse = null;
          this._aiPendingCursor = 0;
          this._renderAIActionStatus();
          this._pushAIProgress(
            "A IA não retornou plano aplicável. Peça conteúdo/cópia explícita no prompt.",
          );
          return;
        }
        this._pushAIProgress("Aplicando plano completo...");
        this._applyAIPostPlan(out.plan);
        this._aiPendingResponse = null;
        this._aiPendingCursor = 0;
        this._renderAIActionStatus();
        this._pushAIProgress("Concluído. Plano aplicado no canvas.");
        toast("Plano aplicado.", "success");
        return;
      }
      const start = this._aiPendingCursor;
      const end = applyAll
        ? actions.length
        : Math.min(actions.length, start + 1);
      let appliedAny = false;
      let appliedPlanByAction = false;
      for (let i = start; i < end; i++) {
        const action = actions[i];
        this._pushAIProgress(
          `Executando ${i + 1}/${actions.length}: ${this._humanizeAIAction(action?.type)}`,
        );
        const ok = await this._executeSingleAIAction(action, out);
        appliedAny = appliedAny || !!ok;
        if (action?.type === "apply_plan" && ok) appliedPlanByAction = true;
        await this._wait(160);
      }
      if (
        applyAll &&
        this._hasMeaningfulPlan(out?.plan) &&
        !appliedPlanByAction
      ) {
        this._pushAIProgress(
          "Aplicando conteúdo do plano após ações para preencher textos...",
        );
        this._applyAIPostPlan(out.plan);
        appliedAny = true;
      }
      if (!appliedAny) {
        const fallback = this._applyAssistantMessageFallback(
          out?.assistantMessage,
        );
        if (fallback) {
          this._pushAIProgress(
            "Fallback aplicado: conteúdo inserido no primeiro campo de texto.",
          );
          appliedAny = true;
        }
      }
      this._aiPendingCursor = end;
      if (this._aiPendingCursor >= actions.length) {
        this._aiPendingResponse = null;
        this._aiPendingCursor = 0;
        this._renderAIActionStatus();
        this._pushAIProgress(
          appliedAny
            ? "Concluído. Todas as ações da IA foram aplicadas."
            : "Concluído sem alterações visíveis. Ajuste o prompt para gerar textos/slides.",
        );
        return;
      }
      this._renderAIActionStatus();
      toast(
        `Ação ${this._aiPendingCursor}/${actions.length} aplicada.`,
        "success",
      );
    } catch (e) {
      this._pushAIProgress(
        `Erro ao aplicar ações: ${e?.message || "falha inesperada"}`,
      );
      toast("Falha ao aplicar ações da IA.", "error");
      console.error(e);
    }
  }

  async _undoLastAIApply() {
    const snap = this._aiUndoStack.pop();
    if (!snap) {
      toast("Sem ações da IA para desfazer.", "info");
      return;
    }
    this._loadingProject = true;
    try {
      this.canvas.setState(snap.canvasState);
      await this.slides.loadSlides(snap.slides, snap.activeSlideIndex);
      this._fitCanvas();
      this._updateFormatBadge(this.canvas.getState().formatId);
      this._updateGradientBar();
      toast("Última aplicação da IA desfeita.", "success");
    } finally {
      this._loadingProject = false;
    }
  }

  _renderAIChat() {
    const targets = [
      document.getElementById("ai-chat-log"),
      document.getElementById("ai-side-chat-log"),
    ].filter(Boolean);
    targets.forEach((box) => {
      if (!this._aiChatHistory.length) {
        box.innerHTML =
          '<div class="text-xs text-muted">Converse com a IA. Ela pode criar páginas, usar templates e adicionar ícones.</div>';
        return;
      }
      box.innerHTML = "";
      this._aiChatHistory.forEach((msg) => {
        if (msg.role === "debug") {
          box.appendChild(this._buildAIDebugBlock(msg));
          return;
        }
        const line = document.createElement("div");
        const isUser = msg.role === "user";
        const isProgress = msg.role === "system";
        line.style.cssText = `
          max-width: 92%;
          justify-self: ${isUser ? "end" : "start"};
          background: ${isProgress ? "transparent" : isUser ? "var(--accent-bg)" : "var(--surface-2)"};
          border: ${isProgress ? "0" : `1px solid ${isUser ? "var(--border-accent)" : "var(--border)"}`};
          border-radius: 8px;
          padding: ${isProgress ? "2px 0" : "6px 8px"};
          font-size: 12px;
          white-space: pre-wrap;
          color: ${isProgress ? "var(--text-muted)" : "var(--text-primary)"};
          font-style: ${isProgress ? "italic" : "normal"};
        `;
        line.textContent = msg.content;
        box.appendChild(line);
      });
      box.scrollTop = box.scrollHeight;
    });
  }

  _buildAIDebugBlock(msg) {
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "border:1px solid var(--border);border-radius:8px;overflow:hidden;font-size:11px;max-width:100%;";

    const makeSection = (label, text, color = "var(--text-muted)") => {
      const id = `dbg-${Math.random().toString(36).slice(2)}`;
      const header = document.createElement("div");
      header.style.cssText = `
        display:flex;align-items:center;gap:6px;padding:5px 8px;
        background:var(--surface-2);cursor:pointer;user-select:none;
        border-top:1px solid var(--border);
      `;
      header.innerHTML = `
        <span style="font-size:10px;color:var(--text-disabled);">▶</span>
        <span style="font-weight:600;color:${color};flex:1;">${label}</span>
        <span style="font-size:10px;color:var(--text-disabled);">${String(text ?? "").length} chars</span>
      `;
      const body = document.createElement("div");
      body.id = id;
      body.style.cssText = `
        display:none;padding:8px;background:var(--surface-1);
        overflow:auto;max-height:320px;
        font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
        font-size:10px;white-space:pre-wrap;word-break:break-all;
        color:var(--text-primary);line-height:1.5;
      `;
      body.textContent = text ?? "(vazio)";
      header.addEventListener("click", () => {
        const open = body.style.display !== "none";
        body.style.display = open ? "none" : "block";
        header.querySelector("span").textContent = open ? "▶" : "▼";
      });
      return [header, body];
    };

    // Endpoint/model badge
    const badge = document.createElement("div");
    badge.style.cssText =
      "padding:4px 8px;background:var(--surface-3);font-size:10px;color:var(--text-disabled);display:flex;gap:8px;";
    badge.innerHTML = `
      <span>📡 <b>Endpoint:</b> ${msg.endpoint || "—"}</span>
      <span>🤖 <b>Model:</b> ${msg.model || "—"}</span>
    `;
    wrap.appendChild(badge);

    const [promptHeader, promptBody] = makeSection(
      "PROMPT ENVIADO",
      msg.prompt,
      "#7BC4EC",
    );
    wrap.appendChild(promptHeader);
    wrap.appendChild(promptBody);

    const [respHeader, respBody] = makeSection(
      "RESPOSTA BRUTA",
      msg.rawResponse,
      "#4ade80",
    );
    wrap.appendChild(respHeader);
    wrap.appendChild(respBody);

    return wrap;
  }

  async _buildAIMCPTools(brandId, brief = null) {
    const presets = await PresetsDB.getAll();
    this._aiPresetsCache = presets;
    const basePreset = this._aiBasePresetId
      ? presets.find((p) => p.id === this._aiBasePresetId)
      : null;
    const templateSchema = this._buildTemplateSchema();
    const createPagesDescription = templateSchema.length
      ? `Criar múltiplas páginas/slides. Cada page DEVE ter "textContent" com as chaves: ${templateSchema.map((f) => `"${f.layerName}"`).join(", ")}.`
      : "Criar múltiplas páginas/slides. Cada page deve ter textContent com os textos mapeados por layerName.";
    return [
      {
        name: "base_preset_policy",
        description:
          "Sempre respeitar o preset base e alterar prioritariamente somente textos, sem quebrar layout.",
        selectedBasePreset: basePreset
          ? {
              id: basePreset.id,
              name: basePreset.name,
              description: basePreset.description || "",
            }
          : null,
        templateSchema,
        required: brief
          ? {
              postCount: brief.postCount,
              formatId: brief.formatId,
              network: brief.network || "auto",
            }
          : null,
      },
      {
        name: "apply_plan",
        description: "Aplicar plano completo no post atual",
      },
      {
        name: "create_pages",
        description: createPagesDescription,
        templateSchema,
      },
      {
        name: "use_template",
        description: "Aplicar template/preset existente",
        availablePresets: presets.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
        })),
      },
      {
        name: "add_icon",
        description: "Adicionar ícone (iconId do Iconify) no slide atual",
      },
      {
        name: "add_text",
        description: "Adicionar texto no slide atual",
      },
    ];
  }

  async _executeSingleAIAction(action, out) {
    const type = action?.type;
    const payload = action?.payload ?? {};
    if (type === "apply_plan") {
      if (!this._hasMeaningfulPlan(out?.plan)) return false;
      this._applyAIPostPlan(out.plan);
      return true;
    }
    if (type === "create_pages") {
      return await this._aiCreatePages(payload, !!payload?.replaceAll);
    }
    if (type === "use_template") {
      return await this._aiUseTemplate(payload);
    }
    if (type === "add_icon") {
      return await this._aiAddIcon(payload);
    }
    if (type === "add_text") {
      return this._aiAddText(payload);
    }
    return false;
  }

  _pushAIUndoSnapshot() {
    this._aiUndoStack.push({
      canvasState: structuredClone(this.canvas.getState()),
      slides: this.slides.getSlides().map((s) => ({
        id: s.id,
        state: structuredClone(s.state),
        thumb: s.thumb ?? "",
      })),
      activeSlideIndex: this.slides.getActiveIndex(),
    });
    if (this._aiUndoStack.length > 20) this._aiUndoStack.shift();
  }

  _renderAIActionStatus() {
    const els = [
      document.getElementById("ai-action-status"),
      document.getElementById("ai-side-action-status"),
    ].filter(Boolean);
    els.forEach((el) => {
      if (!this._aiPendingResponse) {
        el.textContent = "Sem plano pendente.";
        return;
      }
      const actions = Array.isArray(this._aiPendingResponse.actions)
        ? this._aiPendingResponse.actions
        : [];
      if (!actions.length && this._aiPendingResponse.plan) {
        el.textContent = "Plano pronto para aplicar.";
        return;
      }
      el.textContent = `Ações pendentes: ${Math.max(
        0,
        actions.length - this._aiPendingCursor,
      )} de ${actions.length}.`;
    });
  }

  _initAIStructuredPromptControls() {
    const formatSelect = document.getElementById("ai-side-format");
    if (!formatSelect || formatSelect.options.length > 0) return;
    Object.entries(FORMATS).forEach(([id, fmt]) => {
      const op = document.createElement("option");
      op.value = id;
      op.textContent = `${fmt.label} (${fmt.platformLabel || fmt.platform})`;
      formatSelect.appendChild(op);
    });
    formatSelect.addEventListener("change", () => {
      const networkSelect = document.getElementById("ai-side-network");
      if (!networkSelect) return;
      if (!networkSelect.value) {
        const platform = FORMATS[formatSelect.value]?.platform || "";
        networkSelect.value = this._normalizePlatformToNetwork(platform);
      }
    });
    this._syncAIStructuredDefaultsFromCanvas();
  }

  _syncAIStructuredDefaultsFromCanvas() {
    const state = this.canvas?.getState?.();
    const currentFormatId = state?.formatId || "ig-feed-square";
    const formatSelect = document.getElementById("ai-side-format");
    const networkSelect = document.getElementById("ai-side-network");
    if (formatSelect && !formatSelect.value) {
      formatSelect.value = currentFormatId;
    }
    if (networkSelect && !networkSelect.value) {
      const platform = FORMATS[formatSelect?.value]?.platform || "";
      networkSelect.value = this._normalizePlatformToNetwork(platform);
    }
  }

  _normalizePlatformToNetwork(platform) {
    const p = String(platform || "").toLowerCase();
    if (p.includes("instagram")) return "instagram";
    if (p.includes("facebook")) return "facebook";
    if (p.includes("linkedin")) return "linkedin";
    if (p.includes("tiktok")) return "tiktok";
    if (p.includes("youtube")) return "youtube";
    if (p.includes("x")) return "x";
    if (p.includes("thread")) return "threads";
    return "";
  }

  _buildAIStructuredBrief() {
    const postCount = Math.max(
      1,
      Math.min(
        12,
        parseInt(
          document.getElementById("ai-side-post-count")?.value ?? "1",
          10,
        ) || 1,
      ),
    );
    const formatId =
      document.getElementById("ai-side-format")?.value ||
      this.canvas.getState().formatId;
    const formatLabel = FORMATS[formatId]?.label || formatId;
    const network = document.getElementById("ai-side-network")?.value || "";
    const goal = document.getElementById("ai-side-goal")?.value?.trim() || "";
    return { postCount, formatId, formatLabel, network, goal };
  }

  _composeAIPrompt(subjectPrompt, brief) {
    const lines = [
      "REQUISITOS ESTRUTURADOS:",
      `- quantidade_posts: ${brief.postCount}`,
      `- format_id: ${brief.formatId}`,
      `- format_label: ${brief.formatLabel}`,
      `- rede_social: ${brief.network || "auto"}`,
      `- objetivo_cta: ${brief.goal || "não informado"}`,
      "",
      "PEDIDO DO USUÁRIO:",
      subjectPrompt,
    ];
    return lines.join("\n");
  }

  /** Build template schema from the active base preset or current canvas state */
  _buildTemplateSchema() {
    const basePreset = this._aiBasePresetId
      ? this._aiPresetsCache.find((p) => p.id === this._aiBasePresetId)
      : null;
    if (basePreset?.textFields?.length) return basePreset.textFields;
    // Fall back to live canvas state
    return this._extractPresetTextFields(this.canvas.getState());
  }

  /** Build enriched brand context including fonts and voice */
  async _buildRichBrandContext(brand) {
    const fonts = brand?.id ? await this.brands.getBrandFonts(brand.id) : [];
    const fontNames = fonts.map((f) => f.family).filter(Boolean);
    return JSON.stringify(
      {
        name: brand?.name,
        description: brand?.description,
        palette: brand?.palette,
        primaryFont: brand?.primaryFont || fontNames[0] || "",
        secondaryFont: brand?.secondaryFont || fontNames[1] || "",
        brandVoice: brand?.brandVoice || "",
        brandKeywords: brand?.brandKeywords || "",
      },
      null,
      2,
    );
  }

  _buildHistoryForAI(history, rawPrompt, effectivePrompt) {
    const arr = Array.isArray(history) ? history.map((m) => ({ ...m })) : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (
        arr[i].role === "user" &&
        String(arr[i].content).trim() === rawPrompt.trim()
      ) {
        arr[i].content = effectivePrompt;
        break;
      }
    }
    return arr;
  }

  _getDefaultEndpoint(provider) {
    const p = String(provider || "minimax").toLowerCase();
    if (p === "openai") return "https://api.openai.com/v1/chat/completions";
    if (p === "minimax_token_plan")
      return "https://api.minimax.io/anthropic/v1/messages";
    if (p === "compatible") return "";
    return "https://api.minimax.io/v1/text/chatcompletion_v2";
  }

  _getDefaultModel(provider) {
    const p = String(provider || "minimax").toLowerCase();
    if (p === "openai") return "gpt-4o-mini";
    return "MiniMax-M2.7";
  }

  _applyAIProviderDefaults() {
    const provider = document.getElementById("ai-provider")?.value ?? "minimax";
    const endpointEl = document.getElementById("ai-endpoint");
    const modelEl = document.getElementById("ai-model");
    if (endpointEl && !endpointEl.value.trim()) {
      endpointEl.value = this._getDefaultEndpoint(provider);
    }
    if (modelEl && !modelEl.value.trim()) {
      modelEl.value = this._getDefaultModel(provider);
    }
  }

  _renderAIPresetSelectors() {
    const selects = [
      document.getElementById("ai-base-preset"),
      document.getElementById("ai-side-base-preset"),
    ].filter(Boolean);
    selects.forEach((sel) => {
      const current = this._aiBasePresetId || "";
      sel.innerHTML = '<option value="">Atual (sem preset fixo)</option>';
      this._aiPresetsCache.forEach((p) => {
        const op = document.createElement("option");
        op.value = p.id;
        op.textContent = p.name;
        sel.appendChild(op);
      });
      sel.value = current;
    });
  }

  async _handleAIPresetCommand(prompt) {
    const text = String(prompt ?? "").trim();
    if (!text.toLowerCase().startsWith("/preset")) return false;
    const arg = text.replace(/^\/preset\s*/i, "").trim();
    if (!arg || arg.toLowerCase() === "atual" || arg.toLowerCase() === "none") {
      this._aiBasePresetId = "";
      this._renderAIPresetSelectors();
      this._pushAIProgress("Preset base removido. A IA usará o estado atual.");
      return true;
    }
    const target = this._aiPresetsCache.find((p) =>
      p.name.toLowerCase().includes(arg.toLowerCase()),
    );
    if (!target) {
      this._pushAIProgress(`Preset não encontrado: "${arg}"`);
      return true;
    }
    this._aiBasePresetId = target.id;
    this._renderAIPresetSelectors();
    this._pushAIProgress(`Preset base definido via chat: ${target.name}`);
    return true;
  }

  _pushAIProgress(message) {
    if (!message) return;
    this._aiChatHistory.push({
      role: "system",
      content: `• ${message}`,
    });
    this._renderAIChat();
  }

  _pushAIBasisContext({ prompt, brand, docs, docMeta, brief }) {
    const preset = this._aiBasePresetId
      ? this._aiPresetsCache.find((p) => p.id === this._aiBasePresetId)
      : null;
    const topic = this._extractPromptTopic(prompt);
    const docsForLine = (docMeta ?? [])
      .slice(0, 8)
      .map((d) => `${d.name} (${d.chars} chars, ${d.kind})`);
    const docLine = docsForLine.length
      ? docsForLine.join(", ")
      : "Nenhum documento anexado";
    const palette = Array.isArray(brand?.palette)
      ? brand.palette.slice(0, 6)
      : [];
    const paletteLine = palette.length
      ? palette
          .map((c) => this._formatBrandColor(c))
          .filter(Boolean)
          .join(", ")
      : "Sem paleta definida";
    const summary = [
      "Base usada pela IA:",
      `- Preset base: ${preset?.name || "Atual (sem preset fixo)"}`,
      `- Marca: ${brand?.name || "Sem nome"}`,
      `- Paleta: ${paletteLine}`,
      `- Materiais enviados para IA: ${docLine}`,
      `- Arquivos no pacote de contexto: ${(docMeta ?? []).length}`,
      `- Quantidade solicitada: ${brief?.postCount || 1}`,
      `- Formato solicitado: ${brief?.formatLabel || brief?.formatId || "auto"}`,
      `- Rede social alvo: ${brief?.network || "auto"}`,
      `- Objetivo/CTA: ${brief?.goal || "não informado"}`,
      `- Tema solicitado: ${topic}`,
      "- Política: preservar template e priorizar preenchimento de conteúdo",
    ].join("\n");
    this._aiChatHistory.push({
      role: "system",
      content: summary,
    });
    this._renderAIChat();
  }

  _formatBrandColor(entry) {
    if (typeof entry === "string") return entry;
    if (!entry || typeof entry !== "object") return "";
    return (
      entry.hex ||
      entry.value ||
      entry.color ||
      (entry.name ? `${entry.name}` : "") ||
      ""
    );
  }

  _buildAIDocContext(docs) {
    const items = Array.isArray(docs) ? docs : [];
    const meta = [];
    let buffer = "";
    for (const doc of items) {
      const name = String(doc?.name ?? "documento");
      const raw = String(doc?.content ?? "");
      const lower = name.toLowerCase();
      const isMd = lower.endsWith(".md") || lower.endsWith(".markdown");
      const isText = this._isEditableAIDoc(doc) || isMd;
      const prepared = isText ? this._normalizeMarkdownForAI(raw) : raw;
      const clipped = prepared.slice(0, isText ? 6000 : 1800);
      const kind = isMd ? "md" : isText ? "text" : "bin";
      meta.push({ name, chars: prepared.length, kind });
      const chunk = `## ${name}\n[TIPO:${kind}] [CHARS:${prepared.length}]\n${clipped}\n\n`;
      if ((buffer + chunk).length > 24000) break;
      buffer += chunk;
    }
    return {
      docContext: buffer.trim(),
      docMeta: meta,
    };
  }

  _normalizeMarkdownForAI(text) {
    return String(text ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, "  ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  _extractPromptTopic(prompt) {
    const text = String(prompt ?? "").trim();
    if (!text) return "Não informado";
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const first = lines[0] || text;
    return first.length > 160 ? `${first.slice(0, 157)}...` : first;
  }

  _pushAIRawResponse(out) {
    const actions = Array.isArray(out?.actions) ? out.actions : [];
    const actionTypes = actions.map((a) => a?.type).filter(Boolean);
    const planLayers = Array.isArray(out?.plan?.layers)
      ? out.plan.layers.length
      : 0;
    const line = [
      "Resumo da resposta:",
      `- assistantMessage: ${String(out?.assistantMessage || "").slice(0, 180) || "(vazio)"}`,
      `- actions: ${actionTypes.length ? actionTypes.join(", ") : "(nenhuma)"}`,
      `- plan.layers: ${planLayers}`,
    ].join("\n");
    this._aiChatHistory.push({ role: "system", content: line });
    this._renderAIChat();
  }

  _pushAIDebugLog(debug) {
    if (!debug) return;
    this._aiChatHistory.push({
      role: "debug",
      prompt: debug.prompt,
      rawResponse: debug.rawResponse,
      endpoint: debug.endpoint,
      model: debug.model,
    });
    this._renderAIChat();
  }

  _inferRequestedSlideCount(prompt) {
    const text = String(prompt ?? "").toLowerCase();
    if (!text) return 0;
    const direct = text.match(/(\d+)\s*(slides?|p[aá]ginas?|posts?)/i);
    if (direct) return Math.max(0, Math.min(12, Number(direct[1]) || 0));
    const words = {
      um: 1,
      uma: 1,
      dois: 2,
      duas: 2,
      tres: 3,
      três: 3,
      quatro: 4,
      cinco: 5,
      seis: 6,
      sete: 7,
      oito: 8,
      nove: 9,
      dez: 10,
    };
    for (const [k, v] of Object.entries(words)) {
      if (
        new RegExp(`\\b${k}\\b\\s*(slides?|p[aá]ginas?|posts?)`, "i").test(text)
      )
        return v;
    }
    return 0;
  }

  _ensureAISlideCountIntent(out, prompt, forcedCount = 0, forcedFormatId = "") {
    if (!out || typeof out !== "object") return;
    const requested = forcedCount || this._inferRequestedSlideCount(prompt);
    if (requested <= 1) return;
    const actions = Array.isArray(out.actions) ? out.actions : [];
    const hasCreate = actions.some((a) => a?.type === "create_pages");
    if (hasCreate) return;
    out.actions = [
      ...actions,
      {
        type: "create_pages",
        payload: {
          count: requested,
          formatId: forcedFormatId || this.canvas.getState().formatId,
          topic: this._extractPromptTopic(prompt),
          replaceAll: false,
        },
      },
    ];
    this._pushAIProgress(
      `Ajuste automático: adicionado create_pages para ${requested} slides.`,
    );
  }

  _humanizeAIAction(type) {
    const map = {
      apply_plan: "aplicar plano",
      create_pages: "criar páginas",
      use_template: "usar template",
      add_icon: "adicionar ícone",
      add_text: "adicionar texto",
    };
    return map[type] || type || "ação";
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _resolveAIBaseState() {
    const preset = this._aiBasePresetId
      ? this._aiPresetsCache.find((p) => p.id === this._aiBasePresetId)
      : null;
    if (preset?.state) return structuredClone(preset.state);
    return structuredClone(this.canvas.getState());
  }

  _applyPlanTextsToState(state, plan) {
    if (!state || !Array.isArray(state.layers)) return false;
    const sourceTexts = (plan?.layers ?? [])
      .filter((l) => l && l.type !== "shape")
      .map((l) => String(l.content ?? "").trim())
      .filter(Boolean);
    if (!sourceTexts.length) return false;
    const targetTextLayers = state.layers.filter((l) => l.type === "text");
    if (!targetTextLayers.length) return false;
    targetTextLayers.forEach((layer, i) => {
      layer.content = sourceTexts[i] ?? sourceTexts[sourceTexts.length - 1];
    });
    return true;
  }

  _consumeAIPrompt() {
    const side = document.getElementById("ai-side-prompt");
    const modal = document.getElementById("ai-prompt");
    const sideText = side?.value?.trim() ?? "";
    const modalText = modal?.value?.trim() ?? "";
    const text = sideText || modalText;
    if (side) side.value = "";
    if (modal) modal.value = "";
    return text;
  }

  async _aiCreatePages(payload, replaceAll = false) {
    const pagesInput = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.pages)
        ? payload.pages
        : [];
    let pages = pagesInput;
    if (!pages.length) {
      const countRaw =
        payload?.count ??
        payload?.slides ??
        payload?.total ??
        payload?.quantity ??
        0;
      const count = Math.max(0, Math.min(12, Number(countRaw) || 0));
      if (count > 0) {
        const topic = String(payload?.topic || payload?.title || "Novo slide");
        pages = Array.from({ length: count }).map((_, i) => ({
          formatId: this.canvas.getState().formatId,
          layers: [
            {
              type: "text",
              name: `Título ${i + 1}`,
              content: `${topic} ${count > 1 ? `#${i + 1}` : ""}`,
              x: 50,
              y: 40,
              width: 84,
              fontSize: 56,
              color: "#FFFFFF",
              align: "center",
            },
          ],
        }));
      }
    }
    if (!Array.isArray(pages) || !pages.length) return false;
    const current = this.slides.getSlides();
    const templateState = this._resolveAIBaseState();

    // Determine which non-text layers are "fixed" (always carried over)
    const basePreset = this._aiBasePresetId
      ? this._aiPresetsCache.find((p) => p.id === this._aiBasePresetId)
      : null;
    const fixedLayerIds = basePreset?.fixedLayerIds ?? null; // null = keep all

    const built = pages.slice(0, 12).map((page) => {
      const base = structuredClone(templateState);
      base.formatId = page?.formatId || base.formatId;
      if (page?.background && typeof page.background === "object") {
        base.background = { ...base.background, ...page.background };
      }
      // Filter out non-text layers not in fixedLayerIds (if set)
      if (Array.isArray(fixedLayerIds)) {
        base.layers = (base.layers ?? []).filter(
          (l) => l.type === "text" || fixedLayerIds.includes(l.id),
        );
      }
      const textCandidates = this._extractPageTextCandidates(page);
      const textContent = page?.textContent ?? null;
      this._applyTextsToTemplateState(base, textCandidates, textContent);
      return {
        id: crypto.randomUUID(),
        state: base,
      };
    });
    const nextSlides = replaceAll ? built : [...current, ...built];
    await this.slides.loadSlides(nextSlides, replaceAll ? 0 : current.length);
    this._pushAIProgress(`${built.length} slide(s) criados.`);
    return true;
  }

  _extractPageTextCandidates(page) {
    const lines = [];
    const push = (v) => {
      const t = String(v ?? "").trim();
      if (t) lines.push(t);
    };
    push(page?.title);
    push(page?.headline);
    push(page?.subtitle);
    push(page?.subheadline);
    push(page?.content);
    push(page?.description);
    if (Array.isArray(page?.bullets)) {
      page.bullets.forEach((b) => push(`• ${String(b ?? "").trim()}`));
    }
    if (Array.isArray(page?.layers)) {
      page.layers
        .filter((l) => l && l.type !== "shape")
        .forEach((l) => push(l.content));
    }
    if (!lines.length) {
      push(page?.topic);
    }
    return lines;
  }

  _applyTextsToTemplateState(state, textCandidates, textContent = null) {
    if (!state || !Array.isArray(state.layers)) return false;
    const textLayers = state.layers.filter((l) => l.type === "text");
    if (!textLayers.length) return false;

    // Prefer named mapping from textContent (AI returns {layerName: text})
    if (textContent && typeof textContent === "object") {
      let applied = false;
      textLayers.forEach((layer) => {
        const key = Object.keys(textContent).find(
          (k) => k.toLowerCase() === (layer.name || "").toLowerCase(),
        );
        if (key != null) {
          layer.content =
            String(textContent[key] ?? "").trim() || layer.content;
          applied = true;
        }
      });
      if (applied) return true;
    }

    // Fallback: apply by index order
    const lines = Array.isArray(textCandidates)
      ? textCandidates.map((t) => String(t ?? "").trim()).filter(Boolean)
      : [];
    if (!lines.length) return false;
    textLayers.forEach((layer, i) => {
      const next = lines[i] ?? lines[lines.length - 1];
      layer.content = next;
      if (!Number.isFinite(layer.fontSize) || layer.fontSize <= 0) {
        layer.fontSize = 24;
      }
    });
    return true;
  }

  _hasMeaningfulPlan(plan) {
    if (!plan || typeof plan !== "object") return false;
    const hasLayers = Array.isArray(plan.layers) && plan.layers.length > 0;
    const hasBg =
      !!plan.background &&
      (plan.background.type === "solid" ||
        plan.background.type === "gradient" ||
        plan.background.type === "image");
    return hasLayers || hasBg;
  }

  async _aiUseTemplate(payload) {
    const presets = await PresetsDB.getAll();
    if (!presets.length) return false;
    const byId = payload?.presetId
      ? presets.find((p) => p.id === payload.presetId)
      : null;
    const byName = payload?.presetName
      ? presets.find((p) =>
          p.name
            .toLowerCase()
            .includes(String(payload.presetName).toLowerCase()),
        )
      : null;
    const target = byId || byName;
    if (!target?.state) return false;
    this.canvas.snapshot();
    this.canvas.setState(target.state);
    this._fitCanvas();
    this._updateFormatBadge(this.canvas.getState().formatId);
    return true;
  }

  async _aiAddIcon(payload) {
    const iconId = String(payload?.iconId ?? "").trim();
    if (!iconId) return false;
    const svg = await this.icons.fetchSVG(iconId);
    if (!svg) return false;
    this.canvas.snapshot();
    this.canvas.addLayer(
      makeIconLayer(null, payload?.name || iconId, iconId, svg),
    );
    const layer = this.canvas.getSelectedLayer();
    if (!layer) return true;
    this.canvas.updateLayer(layer.id, {
      x: Number.isFinite(payload?.x) ? payload.x : layer.x,
      y: Number.isFinite(payload?.y) ? payload.y : layer.y,
      size: Number.isFinite(payload?.size) ? payload.size : layer.size,
      color: payload?.color || layer.color,
    });
    return true;
  }

  _applyAssistantMessageFallback(message) {
    const text = String(message ?? "").trim();
    if (!text) return false;
    const content = text.length > 280 ? `${text.slice(0, 277)}...` : text;
    return this._aiAddText({
      name: "Copy IA",
      content,
    });
  }

  _aiAddText(payload) {
    const content = String(payload?.content ?? "").trim();
    if (!content) return false;
    const state = this.canvas.getState();
    const target = state.layers.find((l) => l.type === "text");
    if (target) {
      this.canvas.snapshot();
      this.canvas.updateLayer(target.id, {
        content,
      });
      return true;
    }
    this.canvas.snapshot();
    const layer = makeTextLayer(null, payload?.name || "Texto IA", content);
    this.canvas.addLayer(layer);
    const selected = this.canvas.getSelectedLayer();
    if (!selected) return true;
    this.canvas.updateLayer(selected.id, {
      x: Number.isFinite(payload?.x) ? payload.x : selected.x,
      y: Number.isFinite(payload?.y) ? payload.y : selected.y,
      width: Number.isFinite(payload?.width) ? payload.width : selected.width,
      fontSize: Number.isFinite(payload?.fontSize)
        ? payload.fontSize
        : selected.fontSize,
      color: payload?.color || selected.color,
      align: ["left", "center", "right"].includes(payload?.align)
        ? payload.align
        : selected.align,
    });
    return true;
  }

  _applyAIPostPlan(plan) {
    const base = this._resolveAIBaseState();
    const next = structuredClone(base);
    const changed = this._applyPlanTextsToState(next, plan);
    if (!changed) {
      this._pushAIProgress(
        "Plano sem textos aplicáveis. Mantendo preset/layout atual sem quebrar.",
      );
      return;
    }
    this.canvas.snapshot();
    this.canvas.setState(next);
    this._fitCanvas();
    this._updateFormatBadge(next.formatId);
    this._updateGradientBar();
  }

  async _generateShareCode() {
    const scope = document.getElementById("share-scope")?.value ?? "project";
    const permission =
      document.getElementById("share-permission")?.value ?? "edit";
    try {
      let code = "";
      if (scope === "project") {
        if (!this._currentProjectId) {
          toast("Abra um projeto para compartilhar.", "error");
          return;
        }
        await this._saveProjectNow();
        code = await shareCode.generateProjectCode(
          this._currentProjectId,
          permission,
        );
      } else {
        const brandId = this.brands.getCurrentBrandId();
        if (!brandId) {
          toast("Selecione uma marca para compartilhar.", "error");
          return;
        }
        code = await shareCode.generateBrandCode(brandId, permission);
      }
      document.getElementById("share-code-output").value = code;
      toast("Código de compartilhamento gerado.", "success");
    } catch (e) {
      toast("Erro ao gerar código de compartilhamento.", "error");
      console.error(e);
    }
  }

  async _generateProjectShareLink(
    projectId,
    permission = "view",
    { copyToClipboard = true, silent = false } = {},
  ) {
    if (!projectId) return;
    try {
      if (this._currentProjectId === projectId) {
        await this._saveProjectNow();
      }
      const code = await shareCode.generateProjectCode(projectId, permission);
      const url = new URL(window.location.origin + window.location.pathname);
      url.hash = `share=${encodeURIComponent(code)}`;
      const link = url.toString();
      if (copyToClipboard) {
        try {
          await navigator.clipboard?.writeText(link);
          if (!silent) toast("Link de compartilhamento copiado.", "success");
        } catch {
          window.prompt("Copie o link do projeto:", link);
        }
      }
      return link;
    } catch (e) {
      if (!silent) toast("Erro ao gerar link do projeto.", "error");
      console.error(e);
      return null;
    }
  }

  async _applyShareCode() {
    const raw = document.getElementById("share-code-input")?.value?.trim();
    if (!raw) {
      toast("Cole um código para importar.", "error");
      return;
    }
    try {
      const envelope = shareCode.parseCode(raw);
      await this._applyShareEnvelope(envelope);
      this._closeShareModal();
      toast(
        envelope.permission === "view"
          ? "Material compartilhado aberto em modo visualização."
          : "Material compartilhado importado com edição liberada.",
        "success",
      );
    } catch (e) {
      toast("Código de compartilhamento inválido.", "error");
      console.error(e);
    }
  }

  async _applyShareEnvelope(envelope) {
    if (envelope.scope === "project") {
      const source = envelope.payload?.project;
      if (!source) throw new Error("Projeto inválido no código.");
      const importedId = crypto.randomUUID();
      const imported = {
        ...source,
        id: importedId,
        name: `${source.name || "Projeto"} (compartilhado)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await ProjectsDB.save(imported);
      await this._renderProjectsHome();
      await this._openProject(importedId, {
        forceReadOnly: envelope.permission === "view",
      });
    } else {
      await this._importSharedBrand(envelope);
    }
  }

  async _consumeShareLinkFromURL() {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams((url.hash || "").replace(/^#/, ""));
    const raw = hashParams.get("share") || url.searchParams.get("share") || "";
    if (!raw) return;
    try {
      const envelope = shareCode.parseCode(raw);
      await this._applyShareEnvelope(envelope);
      toast(
        envelope.permission === "view"
          ? "Projeto compartilhado aberto por link (somente leitura)."
          : "Projeto compartilhado aberto por link.",
        "success",
      );
    } catch (e) {
      toast("Link de compartilhamento inválido.", "error");
      console.error(e);
    } finally {
      url.searchParams.delete("share");
      url.hash = "";
      history.replaceState({}, "", url.toString());
    }
  }

  async _importSharedBrand(envelope) {
    const data = envelope.payload ?? {};
    const sourceBrand = data.brand;
    if (!sourceBrand) throw new Error("Marca inválida no código.");
    const newBrandId = crypto.randomUUID();
    const now = new Date().toISOString();
    await BrandsDB.save({
      id: newBrandId,
      name: `${sourceBrand.name || "Marca"} (compartilhada)`,
      palette: sourceBrand.palette ?? [],
      logo: sourceBrand.logo ?? null,
      fontIds: [],
      createdAt: now,
      updatedAt: now,
    });

    await Promise.all(
      (data.fonts ?? []).map((item) =>
        this.brands.addFontToBrand(newBrandId, {
          ...item,
          id: crypto.randomUUID(),
          brandId: newBrandId,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    await Promise.all(
      (data.assets ?? []).map((item) =>
        this.brands.addAsset(
          {
            ...item,
            id: crypto.randomUUID(),
            brandId: newBrandId,
            createdAt: now,
            updatedAt: now,
          },
          newBrandId,
        ),
      ),
    );

    for (const preset of data.presets ?? []) {
      await PresetsDB.save({
        ...preset,
        id: crypto.randomUUID(),
        brandId: newBrandId,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const entry of data.history ?? []) {
      await PostHistoryDB.save({
        ...entry,
        id: crypto.randomUUID(),
        brandId: newBrandId,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const doc of data.docs ?? []) {
      await BrandDocsDB.save({
        ...doc,
        id: crypto.randomUUID(),
        brandId: newBrandId,
        createdAt: now,
        updatedAt: now,
      });
    }
    let firstProjectId = null;
    for (const project of data.projects ?? []) {
      const id = crypto.randomUUID();
      if (!firstProjectId) firstProjectId = id;
      await ProjectsDB.save({
        ...project,
        id,
        brandId: newBrandId,
        name: `${project.name || "Projeto"} (compartilhado)`,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.brands.init();
    await this.brands.setCurrentBrand(newBrandId);
    await this._refreshSidebar();
    await this._renderProjectsHome();
    if (firstProjectId) {
      await this._openProject(firstProjectId, {
        forceReadOnly: envelope.permission === "view",
      });
    } else {
      this._setReadOnlyMode(envelope.permission === "view");
    }
  }

  _wireRealtimeCollab() {
    if (this._realtime.bound) return;
    this._realtime.bound = true;
    document
      .getElementById("btn-create-live-room")
      ?.addEventListener("click", async () => {
        await this._createLiveRoom();
      });
    document
      .getElementById("btn-join-live-room")
      ?.addEventListener("click", async () => {
        await this._joinLiveRoom();
      });
    document
      .getElementById("btn-leave-live-room")
      ?.addEventListener("click", async () => {
        this._leaveLiveRoom();
      });
    document
      .getElementById("btn-copy-live-room")
      ?.addEventListener("click", async () => {
        const roomId = this._realtime.roomId;
        if (!roomId) {
          toast("Nenhuma sala ativa.", "info");
          return;
        }
        try {
          await navigator.clipboard.writeText(roomId);
          toast("Código da sala copiado.", "success");
        } catch {
          toast("Não foi possível copiar código da sala.", "error");
        }
      });

    bus.on("net:room-created", ({ roomId }) => {
      this._realtime.active = true;
      this._realtime.role = "host";
      this._realtime.roomId = roomId;
      this._setRealtimeStatus(`Ao vivo: host (${roomId})`);
      this._setRealtimeRoomInput(roomId);
      this._queueRealtimeBroadcast(true);
    });

    bus.on("net:room-joined", ({ roomId }) => {
      this._realtime.active = true;
      this._realtime.role = "guest";
      this._realtime.roomId = roomId;
      this._setRealtimeStatus(`Ao vivo: conectado (${roomId})`);
      this._setRealtimeRoomInput(roomId);
      network.broadcast("collab:request-sync", { roomId });
    });

    bus.on("net:peer-joined", () => {
      if (this._realtime.role === "host") this._queueRealtimeBroadcast(true);
    });

    bus.on("net:action", async ({ type, payload, from }) => {
      if (!this._realtime.active) return;
      if (from === network.localId) return;
      if (type === "collab:request-sync" && this._realtime.role === "host") {
        this._queueRealtimeBroadcast(true);
        return;
      }
      if (type !== "collab:project-sync") return;
      await this._applyRemoteRealtimeProject(payload);
    });

    bus.on("net:disconnected", () => {
      this._realtime.active = false;
      this._realtime.role = null;
      this._realtime.roomId = null;
      this._setRealtimeStatus("Offline");
    });

    bus.on("net:error", ({ error }) => {
      toast(`Erro de rede: ${error?.message ?? "falha"}`, "error");
    });
  }

  async _createLiveRoom() {
    if (!this._currentProjectId) {
      toast("Abra um projeto para iniciar colaboração.", "error");
      return;
    }
    try {
      await this._saveProjectNow();
      const roomInput = document.getElementById("live-room-id");
      const roomId = roomInput?.value?.trim() || this._generateLiveRoomId();
      await network.createRoom(roomId);
    } catch (e) {
      toast("Não foi possível criar sala ao vivo.", "error");
      console.error(e);
    }
  }

  async _joinLiveRoom() {
    if (!this._currentProjectId) {
      toast("Abra um projeto antes de entrar em sala.", "error");
      return;
    }
    const roomId = document.getElementById("live-room-id")?.value?.trim();
    if (!roomId) {
      toast("Digite o código da sala.", "error");
      return;
    }
    try {
      await network.joinRoom(roomId);
    } catch (e) {
      toast("Não foi possível entrar na sala.", "error");
      console.error(e);
    }
  }

  _leaveLiveRoom() {
    network.disconnect();
    this._setRealtimeStatus("Offline");
    toast("Sessão ao vivo encerrada.", "info");
  }

  _queueRealtimeBroadcast(immediate = false) {
    if (!this._realtime.active) return;
    if (!this._currentProjectId) return;
    if (this._realtime.applyingRemote) return;
    const send = async () => {
      const payload = this._buildRealtimePayload();
      network.broadcast("collab:project-sync", payload);
    };
    if (immediate) {
      send();
      return;
    }
    clearTimeout(this._realtime.syncTimer);
    this._realtime.syncTimer = setTimeout(send, 220);
  }

  _buildRealtimePayload() {
    return {
      ts: Date.now(),
      roomId: this._realtime.roomId,
      project: {
        name: this._getCurrentProjectName(),
        mode: this._getCurrentProjectMode(),
        brandId: this.brands.getCurrentBrandId(),
        slides: this.slides.getSlides().map((s) => ({
          id: s.id,
          state: structuredClone(s.state),
        })),
        activeSlideIndex: this.slides.getActiveIndex(),
      },
    };
  }

  async _applyRemoteRealtimeProject(payload) {
    const ts = Number(payload?.ts ?? 0);
    if (!ts || ts <= this._realtime.lastRemoteTs) return;
    const project = payload?.project;
    if (!project?.slides?.length) return;
    this._realtime.lastRemoteTs = ts;
    this._realtime.applyingRemote = true;
    this._loadingProject = true;
    try {
      if (project.brandId) await this.brands.setCurrentBrand(project.brandId);
      await this.slides.loadSlides(
        project.slides,
        project.activeSlideIndex ?? 0,
      );
      this._fitCanvas();
      this._updateFormatBadge(this.canvas.getState().formatId);
      const current = this._currentProjectId
        ? await ProjectsDB.get(this._currentProjectId)
        : null;
      if (current) {
        await ProjectsDB.save({
          ...current,
          name: project.name ?? current.name,
          mode: project.mode ?? current.mode,
          brandId: project.brandId ?? current.brandId,
          slides: project.slides.map((s) => ({
            id: s.id,
            state: structuredClone(s.state),
          })),
          activeSlideIndex: project.activeSlideIndex ?? 0,
        });
        this._updateProjectNameLabel(project.name ?? current.name);
      }
      this._projectDirty = false;
      this._setRealtimeStatus(
        `Sincronizado ${new Date(ts).toLocaleTimeString("pt-BR")}`,
      );
    } catch (e) {
      console.error("Erro ao aplicar atualização remota:", e);
    } finally {
      this._loadingProject = false;
      this._realtime.applyingRemote = false;
    }
  }

  _setRealtimeStatus(text) {
    const el = document.getElementById("live-room-status");
    if (el) el.textContent = text;
  }

  _setRealtimeRoomInput(roomId) {
    const el = document.getElementById("live-room-id");
    if (el) el.value = roomId ?? "";
  }

  _generateLiveRoomId() {
    const n = Math.floor(Math.random() * 900 + 100);
    return `post-${n}-${Math.random().toString(36).slice(2, 6)}`;
  }

  _getCurrentProjectName() {
    const el = document.getElementById("project-name-label");
    if (!el) return "Projeto";
    return el.textContent.replace(" • Somente leitura", "").trim() || "Projeto";
  }

  _getCurrentProjectMode() {
    return this.slides.getSlides().length > 1 ? "slides" : "single";
  }

  _wireProjectsHome() {
    document
      .getElementById("btn-new-project-single")
      ?.addEventListener("click", async () => {
        const name = prompt("Nome do projeto:");
        if (!name) return;
        await this._createProject(name, "single");
      });
    document
      .getElementById("btn-new-project-slides")
      ?.addEventListener("click", async () => {
        const name = prompt("Nome do projeto:");
        if (!name) return;
        await this._createProject(name, "slides");
      });
    document
      .getElementById("btn-import-project-file")
      ?.addEventListener("click", () => {
        document.getElementById("project-file-input")?.click();
      });
    document
      .getElementById("project-file-input")
      ?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await this._importProjectFromFile(file);
        e.target.value = "";
      });
  }

  async _createProject(name, mode = "slides") {
    const state = createDefaultState();
    const projectId = crypto.randomUUID();
    await ProjectsDB.save({
      id: projectId,
      name,
      mode,
      brandId: this.brands.getCurrentBrandId(),
      slides: [{ id: crypto.randomUUID(), state }],
      activeSlideIndex: 0,
      coverThumbnail: null,
    });
    await this._openProject(projectId);
    await this._renderProjectsHome();
  }

  async _openProject(projectId, opts = {}) {
    if (!projectId) return;
    const canLeave = await this._confirmLeaveCurrentProject(projectId);
    if (!canLeave) return;
    const project = await ProjectsDB.get(projectId);
    if (!project) return;
    this._loadingProject = true;
    this._currentProjectId = project.id;
    if (project.brandId) await this.brands.setCurrentBrand(project.brandId);
    await this.slides.loadSlides(
      project.slides ?? [],
      project.activeSlideIndex ?? 0,
    );
    this._fitCanvas();
    this._updateFormatBadge(this.canvas.getState().formatId);
    this._updateProjectNameLabel(project.name);
    this._loadingProject = false;
    this._projectDirty = false;
    this._setReadOnlyMode(!!opts.forceReadOnly);
    this._showProjectsHome(false);
  }

  async _renderProjectsHome() {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;
    const projects = await ProjectsDB.getAll();
    if (!projects.length) {
      grid.innerHTML =
        '<div class="projects-empty">Nenhum projeto ainda. Crie um novo projeto para começar.</div>';
      return;
    }
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    grid.innerHTML = "";
    projects.forEach((project) => {
      const card = document.createElement("button");
      card.className = "project-card";
      const slidesCount = (project.slides ?? []).length;
      const cover = project.coverThumbnail
        ? `<img class="project-card-thumb" src="${project.coverThumbnail}" alt="${project.name}">`
        : `<div class="project-card-thumb project-card-thumb-empty">Sem capa</div>`;
      card.innerHTML = `
        ${cover}
        <div class="project-card-meta">
          <div class="project-card-top">
          <div class="project-card-name">${project.name}</div>
          <button class="project-card-rename" data-export-project="${project.id}" title="Exportar projeto (.json)">⇩</button>
          <button class="project-card-rename" data-share-link-project="${project.id}" title="Gerar link de compartilhamento">🔗</button>
          <button class="project-card-rename" data-rename-project="${project.id}" title="Renomear projeto">✎</button>
          <button class="project-card-delete" data-delete-project="${project.id}" title="Excluir projeto">×</button>
          </div>
          <div class="project-card-sub">${slidesCount} slide${slidesCount === 1 ? "" : "s"} • ${project.mode === "single" ? "Imagem única" : "Carrossel"}</div>
        </div>
      `;
      card.addEventListener("click", async () => {
        await this._openProject(project.id);
      });
      card
        .querySelector(`[data-export-project]`)
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this._exportProjectToFile(project.id);
        });
      card
        .querySelector(`[data-share-link-project]`)
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this._generateProjectShareLink(project.id);
        });
      card
        .querySelector(`[data-rename-project]`)
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this._renameProject(project.id, project.name);
        });
      card
        .querySelector(`[data-delete-project]`)
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const ok = confirm(`Deseja excluir o projeto "${project.name}"?`);
          if (!ok) return;
          await this._deleteProject(project.id);
        });
      grid.appendChild(card);
    });
  }

  async _deleteProject(projectId) {
    if (!projectId) return;
    await ProjectsDB.delete(projectId);
    if (this._currentProjectId === projectId) {
      this._currentProjectId = null;
      this._updateProjectNameLabel();
      this._showProjectsHome(true);
    }
    await this._renderProjectsHome();
    toast("Projeto excluído.", "success");
  }

  async _renameProject(projectId, currentName = "") {
    if (!projectId) return;
    const nextName = prompt("Novo nome do projeto:", currentName)?.trim();
    if (!nextName || nextName === currentName) return;
    const project = await ProjectsDB.get(projectId);
    if (!project) return;
    await ProjectsDB.save({
      ...project,
      name: nextName,
    });
    if (this._currentProjectId === projectId) {
      this._updateProjectNameLabel(nextName);
    }
    await this._renderProjectsHome();
    toast("Projeto renomeado.", "success");
  }

  async _exportProjectToFile(projectId) {
    const project = await ProjectsDB.get(projectId);
    if (!project) {
      toast("Projeto não encontrado.", "error");
      return;
    }
    const brandBundle = await this._collectBrandBundle(project.brandId);
    const associatedPresets = await this._collectAssociatedPresets(
      project.brandId,
    );
    const payload = {
      schema: "postgenerate-project-v2",
      exportedAt: new Date().toISOString(),
      project: {
        ...project,
      },
      brandBundle,
      associatedPresets,
    };
    const json = JSON.stringify(payload, null, 2);
    const safeName = String(project.name || "projeto")
      .toLowerCase()
      .replace(/[^\w\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName || "projeto"}.postgenerate.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Projeto exportado em JSON.", "success");
  }

  async _importProjectFromFile(file) {
    try {
      const raw = await file.text();
      const data = JSON.parse(raw);
      if (
        !data?.project ||
        !String(data?.schema || "").startsWith("postgenerate-project-v")
      ) {
        throw new Error("Arquivo inválido.");
      }
      let importedBrandId = null;
      if (data?.brandBundle?.brand) {
        importedBrandId = await this._importBrandBundle(data.brandBundle, {
          setCurrent: false,
        });
      }
      if (
        Array.isArray(data?.associatedPresets) &&
        data.associatedPresets.length
      ) {
        for (const preset of data.associatedPresets) {
          await PresetsDB.save({
            ...preset,
            id: crypto.randomUUID(),
            ownerBrandId: importedBrandId ?? preset.ownerBrandId ?? null,
            brandId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      const source = data.project;
      const importedId = crypto.randomUUID();
      const imported = {
        ...source,
        id: importedId,
        name: `${source.name || "Projeto"} (importado)`,
        brandId: importedBrandId ?? source.brandId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await ProjectsDB.save(imported);
      await this._renderProjectsHome();
      await this._openProject(importedId);
      toast("Projeto importado com sucesso.", "success");
    } catch (e) {
      toast("Falha ao importar arquivo de projeto.", "error");
      console.error(e);
    }
  }

  async _importBrandFromFile(file) {
    try {
      const payload = await this._readBrandPayloadFromFile(file);
      if (!payload?.brand) throw new Error("Arquivo de marca inválido.");
      await this._importBrandBundle(payload, { setCurrent: true });
      await this._refreshSidebar();
      toast("Marca importada com sucesso.", "success");
    } catch (e) {
      toast("Falha ao importar marca.", "error");
      console.error(e);
    }
  }

  async _readBrandPayloadFromFile(file) {
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

  async _collectBrandBundle(brandId) {
    if (!brandId) return null;
    const brand = await BrandsDB.get(brandId);
    if (!brand) return null;
    const [fonts, assets, colors, history, docs, aiConfigs] = await Promise.all(
      [
        FontsDB.getByBrand(brandId),
        AssetsDB.getByBrand(brandId),
        ColorsDB.getByBrand(brandId),
        PostHistoryDB.getByBrand(brandId),
        BrandDocsDB.getByBrand(brandId),
        AIConfigDB.getByBrand(brandId),
      ],
    );
    return { brand, fonts, assets, colors, history, docs, aiConfigs };
  }

  async _collectAssociatedPresets(brandId) {
    const all = await PresetsDB.getAll();
    if (!brandId) return all;
    return all.filter(
      (p) => (p.ownerBrandId ?? p.brandId ?? null) === (brandId ?? null),
    );
  }

  async _importBrandBundle(bundle, { setCurrent = true } = {}) {
    const sourceBrand = bundle?.brand;
    if (!sourceBrand) throw new Error("Pacote de marca inválido.");
    const now = new Date().toISOString();
    const newBrandId = crypto.randomUUID();
    const fontIdMap = new Map();
    const importedFonts = [];
    for (const font of bundle.fonts ?? []) {
      const newFontId = crypto.randomUUID();
      fontIdMap.set(font.id, newFontId);
      importedFonts.push({
        ...font,
        id: newFontId,
        brandId: newBrandId,
        createdAt: now,
      });
    }
    for (const font of importedFonts) await FontsDB.save(font);
    await BrandsDB.save({
      ...sourceBrand,
      id: newBrandId,
      name: `${sourceBrand.name || "Marca"} (importada)`,
      fontIds: (sourceBrand.fontIds ?? [])
        .map((id) => fontIdMap.get(id))
        .filter(Boolean),
      createdAt: now,
      updatedAt: now,
    });
    for (const asset of bundle.assets ?? []) {
      await AssetsDB.save({
        ...asset,
        id: crypto.randomUUID(),
        brandId: newBrandId,
        createdAt: now,
      });
    }
    for (const color of bundle.colors ?? []) {
      await ColorsDB.save({
        ...color,
        id: crypto.randomUUID(),
        brandId: newBrandId,
        isGlobal: 0,
        createdAt: now,
      });
    }
    for (const h of bundle.history ?? []) {
      await PostHistoryDB.save({
        ...h,
        id: crypto.randomUUID(),
        brandId: newBrandId,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const doc of bundle.docs ?? []) {
      await BrandDocsDB.save({
        ...doc,
        id: crypto.randomUUID(),
        brandId: newBrandId,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const cfg of bundle.aiConfigs ?? []) {
      await AIConfigDB.save({
        ...cfg,
        id: crypto.randomUUID(),
        brandId: newBrandId,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const preset of bundle.presets ?? []) {
      await PresetsDB.save({
        ...preset,
        id: crypto.randomUUID(),
        ownerBrandId: newBrandId,
        brandId: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    await this.brands.init();
    await this._refreshBrandDropdown();
    if (setCurrent) {
      await this.brands.setCurrentBrand(newBrandId);
    }
    return newBrandId;
  }

  _showProjectsHome(show) {
    const home = document.getElementById("projects-home");
    if (!home) return;
    home.classList.toggle("open", !!show);
  }

  async _confirmLeaveCurrentProject(nextProjectId = null) {
    if (!this._currentProjectId) return true;
    if (nextProjectId && nextProjectId === this._currentProjectId) return true;
    if (!this._projectDirty) return true;
    const ok = confirm(
      "Existe alteração não salva. Clique OK para salvar e continuar, ou Cancelar para permanecer no projeto atual.",
    );
    if (!ok) return false;
    await this._saveProjectNow();
    return true;
  }

  _updateProjectNameLabel(name) {
    const el = document.getElementById("project-name-label");
    if (!el) return;
    const suffix = this._shareReadOnly ? " • Somente leitura" : "";
    if (name) {
      el.textContent = `${name}${suffix}`;
      return;
    }
    el.textContent = this._currentProjectId
      ? `Projeto${suffix}`
      : "Sem projeto";
  }

  /* ── Add Font modal ───────────────────────────────────── */
  _openAddFontModal() {
    const name = prompt("Nome da fonte (ex: Montserrat):");
    if (!name) return;
    const brandId = this.brands.getCurrentBrandId();
    this.brands
      .addFontToBrand(brandId, { name, family: name, source: "google" })
      .then(async () => {
        await this._refreshSidebar();
        toast(`Fonte "${name}" adicionada!`, "success");
      });
  }

  /* ── Color picker helper ──────────────────────────────── */
  // onLive: called on every picker drag (live preview)
  // Returns a Promise<hex|null> resolved when OK/Cancel pressed
  _openPicker(initialColor, onLive) {
    ColorsDB.getAll().then((colors) => {
      this.picker.loadSavedColors(colors);
    });
    return this.picker.open(initialColor, onLive);
  }

  /* ── Keyboard shortcuts ───────────────────────────────── */
  _wireKeyboard() {
    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (this._shareReadOnly) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        this.canvas.undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        this.canvas.redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const layer = this.canvas.getSelectedLayer();
        if (layer && !layer.locked) {
          e.preventDefault();
          this.canvas.snapshot();
          this.canvas.removeLayer(layer.id);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        const layer = this.canvas.getSelectedLayer();
        if (layer) {
          this.canvas.snapshot();
          this.canvas.duplicateLayer(layer.id);
        }
      }
    });
  }

  /* ── UI helpers ───────────────────────────────────────── */
  _setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  }

  _setSwatch(id, color) {
    const el = document.getElementById(id);
    if (!el) return;
    const fill = el.querySelector(".swatch-fill");
    if (fill) fill.style.background = color;
    else el.style.background = color;
  }

  _setAlign(id, align) {
    document
      .querySelectorAll(`[data-align-group="${id}"] .align-btn`)
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.align === align);
      });
  }

  _updateGradientBar() {
    const bg = this.canvas.getState().background;
    const bar = document.getElementById("gradient-preview-bar");
    if (bar && bg.gradient) {
      const g = bg.gradient;
      const fromReach = Math.max(0, Math.min(100, g.fromReach ?? 0));
      const toReach = Math.max(0, Math.min(100, g.toReach ?? g.reach ?? 100));
      const opacity = Math.max(0, Math.min(100, g.opacity ?? 100));
      const fromOpacity = Math.max(
        0,
        Math.min(100, g.fromOpacity ?? g.opacity ?? 100),
      );
      const toOpacity = Math.max(
        0,
        Math.min(100, g.toOpacity ?? g.opacity ?? 100),
      );
      const from = this._withOpacity(g.from, fromOpacity);
      const to = this._withOpacity(g.to, toOpacity);
      bar.style.background =
        g.type === "linear"
          ? `linear-gradient(${g.angle}deg, ${from} ${fromReach}%, ${to} ${toReach}%)`
          : `radial-gradient(ellipse at center, ${from} ${fromReach}%, ${to} ${toReach}%)`;
      const angleRange = document.getElementById("prop-grad-angle");
      const angleInput = document.getElementById("prop-grad-angle-input");
      const angleVal = document.getElementById("prop-grad-angle-val");
      const fromReachRange = document.getElementById("prop-grad-from-reach");
      const fromReachVal = document.getElementById("prop-grad-from-reach-val");
      const toReachRange = document.getElementById("prop-grad-to-reach");
      const toReachVal = document.getElementById("prop-grad-to-reach-val");
      const opacityRange = document.getElementById("prop-grad-opacity");
      const opacityVal = document.getElementById("prop-grad-opacity-val");
      const fromOpacityRange = document.getElementById(
        "prop-grad-from-opacity",
      );
      const fromOpacityVal = document.getElementById(
        "prop-grad-from-opacity-val",
      );
      const toOpacityRange = document.getElementById("prop-grad-to-opacity");
      const toOpacityVal = document.getElementById("prop-grad-to-opacity-val");
      if (angleRange) angleRange.value = String(g.angle ?? 135);
      if (angleInput) angleInput.value = String(g.angle ?? 135);
      if (angleVal) angleVal.textContent = `${g.angle ?? 135}°`;
      if (fromReachRange) fromReachRange.value = String(fromReach);
      if (fromReachVal) fromReachVal.textContent = `${fromReach}%`;
      if (toReachRange) toReachRange.value = String(toReach);
      if (toReachVal) toReachVal.textContent = `${toReach}%`;
      if (opacityRange) opacityRange.value = String(opacity);
      if (opacityVal) opacityVal.textContent = `${opacity}%`;
      if (fromOpacityRange) fromOpacityRange.value = String(fromOpacity);
      if (fromOpacityVal) fromOpacityVal.textContent = `${fromOpacity}%`;
      if (toOpacityRange) toOpacityRange.value = String(toOpacity);
      if (toOpacityVal) toOpacityVal.textContent = `${toOpacity}%`;
    }
  }

  _withOpacity(color, opacityPercent = 100) {
    const alpha = Math.max(0, Math.min(1, (opacityPercent ?? 100) / 100));
    const c = String(color ?? "#000000").trim();
    if (c.startsWith("#")) {
      let hex = c.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        hex = hex
          .split("")
          .map((ch) => ch + ch)
          .join("");
      }
      if (hex.length === 8) hex = hex.slice(0, 6);
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    const rgbaMatch = c.match(
      /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/i,
    );
    if (rgbaMatch) {
      const r = Number(rgbaMatch[1]);
      const g = Number(rgbaMatch[2]);
      const b = Number(rgbaMatch[3]);
      const baseA =
        rgbaMatch[4] == null
          ? 1
          : Math.max(0, Math.min(1, Number(rgbaMatch[4])));
      return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, baseA * alpha))})`;
    }
    return c;
  }

  async _savePresetByNameFlow() {
    this._bindPresetSaveModal();
    try {
      const scopedPresets = await PresetsDB.getAll();
      this._selectedPresetOverwriteId = null;
      const input = document.getElementById("preset-save-name-input");
      if (input) input.value = "";
      const descInput = document.getElementById("preset-save-description");
      if (descInput) descInput.value = "";
      this._renderPresetTextFieldsEditor();
      this._renderPresetFixedLayersEditor();
      this._renderPresetOverwriteList(scopedPresets);
      document.getElementById("preset-save-modal")?.classList.add("open");
    } catch (e) {
      toast("Erro ao abrir modal de preset.", "error");
      console.error(e);
    }
  }

  _renderPresetTextFieldsEditor() {
    const container = document.getElementById("preset-text-fields-editor");
    if (!container) return;
    const fields = this._extractPresetTextFields(this.canvas.getState());
    if (!fields.length) {
      container.innerHTML =
        '<div class="text-xs text-muted" style="padding:4px;">Nenhuma camada de texto encontrada no canvas atual.</div>';
      return;
    }
    container.innerHTML = "";
    fields.forEach((field) => {
      const row = document.createElement("div");
      row.style.cssText =
        "border:1px solid var(--border);border-radius:6px;padding:6px;display:grid;gap:4px;";
      const fontDisplay = [
        field.fontFamily || "—",
        `${field.fontSize}px`,
        field.fontWeight ? `w${field.fontWeight}` : "",
        field.color
          ? `<span style="display:inline-block;width:10px;height:10px;background:${field.color};border-radius:2px;vertical-align:middle;"></span>`
          : "",
      ]
        .filter(Boolean)
        .join(" · ");
      row.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 60px;gap:6px;align-items:center;">
          <div>
            <div style="font-size:11px;font-weight:600;color:var(--text-primary);">${field.layerName}</div>
            <div class="text-xs text-muted" style="line-height:1.4;">${fontDisplay}</div>
          </div>
          <input class="input input-sm" data-field-role="${field.layerId}"
            placeholder="Papel (ex: título principal)"
            value="${field.role || ""}" />
          <input class="input input-sm" type="number" data-field-maxchars="${field.layerId}"
            min="10" max="500" placeholder="máx chars"
            value="${field.maxChars || ""}" title="Máx caracteres" />
        </div>
      `;
      container.appendChild(row);
    });
  }

  _readPresetTextFieldsFromEditor() {
    const container = document.getElementById("preset-text-fields-editor");
    if (!container) return null;
    const fields = this._extractPresetTextFields(this.canvas.getState());
    return fields.map((field) => {
      const roleEl = container.querySelector(
        `[data-field-role="${field.layerId}"]`,
      );
      const maxEl = container.querySelector(
        `[data-field-maxchars="${field.layerId}"]`,
      );
      return {
        ...field,
        role: roleEl?.value?.trim() || field.role,
        maxChars: maxEl?.value ? parseInt(maxEl.value, 10) : field.maxChars,
      };
    });
  }

  _renderPresetFixedLayersEditor() {
    const container = document.getElementById("preset-fixed-layers-editor");
    if (!container) return;
    const state = this.canvas.getState();
    const nonTextLayers = (state.layers ?? []).filter(
      (l) => l && l.type !== "text",
    );
    if (!nonTextLayers.length) {
      container.innerHTML =
        '<div class="text-xs text-muted" style="padding:4px;">Nenhum ícone, logo ou forma no canvas atual.</div>';
      return;
    }
    const typeIcon = { icon: "⚡", image: "🖼️", shape: "◼", video: "🎬" };
    container.innerHTML = "";
    nonTextLayers.forEach((layer) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;";
      const icon = typeIcon[layer.type] ?? "◻";
      const colorDot = layer.color
        ? `<span style="width:10px;height:10px;border-radius:50%;background:${layer.color};flex-shrink:0;display:inline-block;"></span>`
        : "";
      row.innerHTML = `
        <span style="font-size:13px;flex-shrink:0;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${layer.name || layer.type}</div>
          <div class="text-xs text-muted">${layer.type}${layer.iconId ? ` · ${layer.iconId}` : ""}</div>
        </div>
        ${colorDot}
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);cursor:pointer;flex-shrink:0;">
          <input type="checkbox" data-fixed-layer="${layer.id}" checked
            style="accent-color:var(--accent);width:13px;height:13px;" />
          fixo
        </label>
      `;
      container.appendChild(row);
    });
  }

  _readPresetFixedLayerIds() {
    const container = document.getElementById("preset-fixed-layers-editor");
    if (!container) return null;
    return Array.from(
      container.querySelectorAll("[data-fixed-layer]:checked"),
    ).map((el) => el.dataset.fixedLayer);
  }

  async _overwritePresetByDoubleClickFlow() {
    await this._savePresetByNameFlow();
  }

  _bindPresetSaveModal() {
    if (this._presetSaveModalBound) return;
    this._presetSaveModalBound = true;
    document
      .getElementById("btn-close-preset-save-modal")
      ?.addEventListener("click", () => {
        document.getElementById("preset-save-modal")?.classList.remove("open");
      });
    document
      .getElementById("preset-save-modal")
      ?.addEventListener("click", (e) => {
        if (e.target?.id === "preset-save-modal") {
          document
            .getElementById("preset-save-modal")
            ?.classList.remove("open");
        }
      });
    document
      .getElementById("btn-preset-save-new")
      ?.addEventListener("click", async () => {
        const name = document
          .getElementById("preset-save-name-input")
          ?.value?.trim();
        if (!name) {
          toast("Informe um nome para o novo preset.", "error");
          return;
        }
        const description =
          document.getElementById("preset-save-description")?.value?.trim() ??
          "";
        const textFields = this._readPresetTextFieldsFromEditor();
        const fixedLayerIds = this._readPresetFixedLayerIds();
        await this._persistPreset({
          name,
          description,
          textFields,
          fixedLayerIds,
        });
        document.getElementById("preset-save-modal")?.classList.remove("open");
        toast("Preset salvo!", "success");
        await this._refreshPresetsTab();
      });
    document
      .getElementById("btn-preset-overwrite-selected")
      ?.addEventListener("click", async () => {
        if (!this._selectedPresetOverwriteId) {
          toast("Selecione um preset existente para sobrescrever.", "info");
          return;
        }
        const target = await PresetsDB.get(this._selectedPresetOverwriteId);
        if (!target) {
          toast("Preset selecionado não encontrado.", "error");
          return;
        }
        const description =
          document.getElementById("preset-save-description")?.value?.trim() ??
          target.description ??
          "";
        const textFields =
          this._readPresetTextFieldsFromEditor() ?? target.textFields;
        const fixedLayerIds =
          this._readPresetFixedLayerIds() ?? target.fixedLayerIds;
        await this._persistPreset({
          id: target.id,
          createdAt: target.createdAt,
          name: target.name,
          description,
          textFields,
          fixedLayerIds,
        });
        document.getElementById("preset-save-modal")?.classList.remove("open");
        toast(`Preset "${target.name}" sobrescrito!`, "success");
        await this._refreshPresetsTab();
      });
  }

  _renderPresetOverwriteList(presets) {
    const list = document.getElementById("preset-existing-list");
    if (!list) return;
    if (!presets.length) {
      list.innerHTML =
        '<div class="text-xs text-muted" style="padding:8px;">Nenhum preset disponível para sobrescrever.</div>';
      return;
    }
    list.innerHTML = "";
    presets.forEach((preset) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "btn btn-ghost btn-sm";
      item.style.cssText =
        "justify-content:flex-start;width:100%;border:1px solid var(--border);";
      item.textContent = preset.name;
      item.addEventListener("click", () => {
        this._selectedPresetOverwriteId = preset.id;
        list.querySelectorAll("button").forEach((btn) => {
          btn.style.borderColor = "var(--border)";
          btn.style.background = "transparent";
        });
        item.style.borderColor = "var(--accent)";
        item.style.background = "var(--accent-bg)";
      });
      list.appendChild(item);
    });
  }

  async _persistPreset({
    id,
    createdAt,
    name,
    description,
    textFields,
    fixedLayerIds,
  }) {
    const thumbnail = await this.exporter.generateThumbnail();
    const state = this.canvas.getState();
    const existingPreset = id ? await PresetsDB.get(id) : null;

    // Auto-extract text layer schema if not provided
    const resolvedTextFields =
      textFields ?? this._extractPresetTextFields(state, existingPreset);

    // Capture brand palette for this preset snapshot
    const brandId = this.brands.getCurrentBrandId();
    const brand = brandId ? await this.brands.getCurrentBrand() : null;

    // Summarize animations across all layers
    const animationSummary = (state.layers ?? [])
      .filter((l) => l?.animIn && l.animIn !== "none")
      .map((l) => ({
        layerName: l.name,
        animIn: l.animIn,
        animDuration: l.animDuration,
        animDelay: l.animDelay,
      }));

    await PresetsDB.save({
      id,
      createdAt,
      name,
      formatId: state.formatId,
      state,
      thumbnail,
      brandId: null,
      ownerBrandId: brandId ?? null,
      description: description ?? existingPreset?.description ?? "",
      textFields: resolvedTextFields,
      // Fixed (non-text) layers that appear on every slide
      fixedLayerIds: fixedLayerIds ?? existingPreset?.fixedLayerIds ?? null,
      // Snapshot of visual identity at save time
      background: state.background ?? null,
      brandPalette: brand?.palette ?? [],
      brandPrimaryFont: brand?.primaryFont ?? "",
      brandVoice: brand?.brandVoice ?? "",
      animations: animationSummary,
    });
  }

  /** Extract text layer schema from canvas state for AI context */
  _extractPresetTextFields(state, existingPreset = null) {
    const layers = Array.isArray(state?.layers) ? state.layers : [];
    const existingFields = existingPreset?.textFields ?? [];
    return layers
      .filter((l) => l?.type === "text")
      .map((l) => {
        const existing = existingFields.find((f) => f.layerId === l.id);
        const charsPerLine = Math.max(
          10,
          Math.round(70 / ((l.fontSize || 40) / 40)),
        );
        const estimatedLines = Math.max(
          1,
          Math.round((l.height || 20) / (((l.fontSize || 40) / 1080) * 100)),
        );
        return {
          layerId: l.id,
          layerName: l.name || "Texto",
          role: existing?.role ?? this._inferLayerRole(l),
          hint: existing?.hint ?? "",
          // Typography — exact values from the layer
          fontSize: l.fontSize || 40,
          fontFamily: l.fontFamily || "",
          fontWeight: l.fontWeight || 400,
          color: l.color || "#ffffff",
          textAlign: l.textAlign || l.align || "left",
          lineHeight: l.lineHeight || 1.2,
          letterSpacing: l.letterSpacing || "0em",
          // Animation
          animIn: l.animIn || "none",
          animDelay: l.animDelay ?? 0,
          // Content limits
          maxChars:
            existing?.maxChars ?? Math.min(200, charsPerLine * estimatedLines),
        };
      });
  }

  _inferLayerRole(layer) {
    const name = String(layer?.name ?? "").toLowerCase();
    if (/t[ií]tulo|title|headline|h1/.test(name)) return "título principal";
    if (/sub|descrição|description|body/.test(name))
      return "subtítulo ou descrição";
    if (/badge|tag|pill|label|chip/.test(name)) return "tag ou categoria";
    if (/cta|ação|action|button/.test(name)) return "chamada para ação";
    if (/autor|name|nome/.test(name)) return "nome ou autor";
    if (/num|número|step|etapa/.test(name)) return "número ou etapa";
    return "texto";
  }

  _openFilePicker(accept, onFile) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    });
    input.click();
  }

  _queueBrandHistorySave() {
    const brandId = this.brands?.getCurrentBrandId?.();
    if (!brandId || !this.exporter) return;
    clearTimeout(this._historySaveTimer);
    this._historySaveTimer = setTimeout(async () => {
      try {
        if (this._loadingProject) return;
        const state = this.canvas.getState();
        const signature = JSON.stringify(state);
        if (signature === this._lastHistorySignature) return;
        const thumbnail = await this.exporter.generateThumbnail(180);
        await PostHistoryDB.save({
          brandId,
          name: `Post ${new Date().toLocaleString("pt-BR")}`,
          formatId: state.formatId,
          state,
          thumbnail,
        });
        this._lastHistorySignature = signature;
        await this._refreshHistoryTab();
      } catch (e) {
        console.error("Erro ao salvar histórico da marca:", e);
      }
    }, 1200);
  }

  _queueProjectSave() {
    if (this._loadingProject || !this._currentProjectId || this._shareReadOnly)
      return;
    if (this._realtime.applyingRemote) return;
    clearTimeout(this._projectSaveTimer);
    this._setSaveStatus("saving");
    this._projectSaveTimer = setTimeout(async () => {
      try {
        await this._saveProjectNow();
        this._queueRealtimeBroadcast();
        await this._renderProjectsHome();
      } catch (e) {
        console.error("Erro ao salvar projeto:", e);
        this._setSaveStatus("error");
      }
    }, 800);
  }

  _markProjectDirty() {
    if (this._loadingProject || !this._currentProjectId || this._shareReadOnly)
      return;
    if (this._realtime.applyingRemote) return;
    this._projectDirty = true;
    this._setSaveStatus("dirty");
  }

  async _saveProjectNow() {
    if (this._loadingProject || !this._currentProjectId || this._shareReadOnly)
      return;
    const project = await ProjectsDB.get(this._currentProjectId);
    if (!project) return;
    const slides = this.slides.getSlides().map((s) => ({
      id: s.id,
      state: structuredClone(s.state),
    }));
    const coverThumbnail = await this.exporter.generateThumbnail(220);
    await ProjectsDB.save({
      ...project,
      slides,
      activeSlideIndex: this.slides.getActiveIndex(),
      brandId: this.brands.getCurrentBrandId(),
      coverThumbnail,
    });
    this._projectDirty = false;
    this._setSaveStatus("saved");
  }

  _setSaveStatus(status) {
    const el = document.getElementById("project-save-status");
    if (!el) return;
    if (!this._currentProjectId) {
      el.textContent = "";
      return;
    }
    if (status === "dirty") {
      el.textContent = "●";
      el.style.color = "var(--text-disabled)";
      el.title = "Alterações não salvas";
    }
    if (status === "saving") {
      el.textContent = "↑ salvando…";
      el.style.color = "var(--text-muted)";
      el.title = "";
    }
    if (status === "saved") {
      el.textContent = "✓ salvo";
      el.style.color = "#4ade80";
      el.title = "Projeto salvo";
      setTimeout(() => {
        if (el.textContent === "✓ salvo") el.textContent = "";
      }, 3000);
    }
    if (status === "error") {
      el.textContent = "! erro ao salvar";
      el.style.color = "#f87171";
      el.title = "Falha ao salvar. Tente novamente.";
    }
  }

  _setReadOnlyMode(readOnly) {
    this._shareReadOnly = !!readOnly;
    const controls = document.querySelectorAll(
      [
        "#btn-add-text",
        "#btn-add-image",
        "#btn-add-icon",
        "#btn-add-shape",
        "#btn-save-preset",
        "#btn-slide-add",
        "#btn-slide-duplicate",
        "#btn-slide-remove",
        "#btn-play-animation",
        "#btn-duplicate-layer",
        "#btn-delete-layer",
        "#btn-layer-up",
        "#btn-layer-down",
        ".bg-type-btn",
        "#properties-panel input",
        "#properties-panel select",
        "#properties-panel button",
      ].join(","),
    );
    controls.forEach((el) => {
      if (
        el.id === "btn-export" ||
        el.id === "btn-projects-home" ||
        el.id === "btn-share"
      )
        return;
      if ("disabled" in el) el.disabled = this._shareReadOnly;
      else {
        el.style.pointerEvents = this._shareReadOnly ? "none" : "";
        el.style.opacity = this._shareReadOnly ? "0.6" : "";
      }
    });
    this._updateProjectNameLabel();
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
