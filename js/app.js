/* ============================================================
   PostGenerate — Main App
   Orchestrates all modules, wires UI events.
   ============================================================ */

import {
  initDB,
  PresetsDB,
  ColorsDB,
  PostHistoryDB,
  ProjectsDB,
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
    await this.slides.init();
    this.slides.on("change", () => this._queueProjectSave());

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
    await this._renderProjectsHome();
    this._showProjectsHome(true);

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
      this._queueProjectSave();
    });

    this.canvas.on("stateChange", () => {
      this._queueBrandHistorySave();
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

    // Save preset
    document
      .getElementById("btn-save-preset")
      ?.addEventListener("click", async () => {
        const name = prompt("Nome do preset:");
        if (!name) return;
        try {
          const thumbnail = await this.exporter.generateThumbnail();
          await PresetsDB.save({
            name,
            formatId: this.canvas.getState().formatId,
            state: this.canvas.getState(),
            thumbnail,
            brandId: this.brands.getCurrentBrandId(),
          });
          toast("Preset salvo!", "success");
          await this._refreshPresetsTab();
        } catch (e) {
          toast("Erro ao salvar preset.", "error");
          console.error(e);
        }
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
      .getElementById("btn-projects-home")
      ?.addEventListener("click", async () => {
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

    // Brand switcher in dropdown
    this.brands.on("brandsChange", () => this._refreshBrandDropdown());
    this.brands.on("currentBrandChange", async () => {
      await this._refreshSidebar();
      this._refreshBrandDropdown();
    });

    this._refreshBrandDropdown();
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
      .getElementById("btn-export-all-formats")
      ?.addEventListener("click", async () => {
        const formatIds = Object.keys(FORMATS);
        const transparent =
          document.getElementById("export-transparent")?.checked ?? false;
        document.getElementById("export-modal")?.classList.remove("open");
        toast("Exportando todos os formatos...", "info");
        try {
          await this.exporter.exportMultiple(formatIds, { transparent });
          toast("Exportação concluída!", "success");
        } catch (e) {
          toast("Erro na exportação.", "error");
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
    document.getElementById("export-modal")?.classList.add("open");
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

  async _openProject(projectId) {
    if (!projectId) return;
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
          <button class="project-card-delete" data-delete-project="${project.id}" title="Excluir projeto">×</button>
          </div>
          <div class="project-card-sub">${slidesCount} slide${slidesCount === 1 ? "" : "s"} • ${project.mode === "single" ? "Imagem única" : "Carrossel"}</div>
        </div>
      `;
      card.addEventListener("click", () => this._openProject(project.id));
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

  _showProjectsHome(show) {
    const home = document.getElementById("projects-home");
    if (!home) return;
    home.classList.toggle("open", !!show);
  }

  _updateProjectNameLabel(name) {
    const el = document.getElementById("project-name-label");
    if (!el) return;
    if (name) {
      el.textContent = name;
      return;
    }
    el.textContent = this._currentProjectId ? "Projeto" : "Sem projeto";
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
      bar.style.background =
        g.type === "linear"
          ? `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`
          : `radial-gradient(ellipse at center, ${g.from}, ${g.to})`;
    }
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
    if (this._loadingProject || !this._currentProjectId) return;
    clearTimeout(this._projectSaveTimer);
    this._projectSaveTimer = setTimeout(async () => {
      try {
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
        await this._renderProjectsHome();
      } catch (e) {
        console.error("Erro ao salvar projeto:", e);
      }
    }, 800);
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
