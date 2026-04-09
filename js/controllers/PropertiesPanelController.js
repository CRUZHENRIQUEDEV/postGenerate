/* ============================================================
   PropertiesPanelController — Layer properties panel UI
   ============================================================ */

import { setVal, setSwatch, setAlign, openFilePicker as openFilePickerFn } from "../utils/ui-helpers.js";
import { uuid } from "../utils/ui-helpers.js";
import { imageColorService } from "../services/ImageColorService.js";

export class PropertiesPanelController {
  constructor({ canvas, picker, openPickerCallback, updateGradientBar, openFilePicker, ColorsDB, toast, slides }) {
    this._canvas = canvas;
    this._picker = picker;
    this._openPicker = (initialColor, onLive) => {
      ColorsDB.getAll().then((colors) => {
        this._picker.loadSavedColors(colors);
      });
      return openPickerCallback(initialColor, onLive);
    };
    this._setVal = setVal;
    this._setSwatch = setSwatch;
    this._setAlign = setAlign;
    this._updateGradientBar = updateGradientBar;
    this._openFilePicker = openFilePicker || openFilePickerFn;
    this._ColorsDB = ColorsDB;
    this._toast = toast || (() => {});
    this._slides = slides;
    this._layerClipboard = null;
    this._imageColorService = imageColorService;
    this._originalImageSrc = null;
  }

  wire() {
    this._wireBgControls();
    this._wirePropertyInputs();
  }

  refresh(layer) {
    const empty = document.getElementById("props-empty");
    const textSection = document.getElementById("props-text");
    const posSection = document.getElementById("props-position");
    const badgeSection = document.getElementById("props-badge");
    const imageSection = document.getElementById("props-image");
    const shapeSection = document.getElementById("props-shape");
    const iconSection = document.getElementById("props-icon");
    const animSection = document.getElementById("props-animation");
    const layerHeader = document.getElementById("props-layer-name");

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
    const counter = document.getElementById("prop-content-counter");
    if (counter) {
      if (layer.maxChars) {
        counter.style.display = "block";
        counter.textContent = `${(layer.content ?? "").length} / ${layer.maxChars}`;
      } else {
        counter.style.display = "none";
      }
    }
    this._setVal("prop-font-family", layer.fontFamily);
    this._setVal("prop-font-size", layer.fontSize);
    this._setVal("prop-font-weight", layer.fontWeight);
    const weightSlider = document.querySelector("#prop-font-weight-slider");
    if (weightSlider) weightSlider.value = layer.fontWeight ?? 400;
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
    const ratioRow = document.getElementById("prop-ratio-lock-row");
    if (ratioRow) {
      const show = layer.type === "image" || layer.type === "shape";
      ratioRow.style.display = show ? "flex" : "none";
      const checkbox = document.getElementById("prop-ratio-lock");
      if (checkbox) checkbox.checked = !!(layer._lockRatio);
    }
    this._setVal("prop-layer-blur", layer.layerBlur ?? 0);
    const s = layer.boxShadow ?? { x: 2, y: 4, blur: 8, color: "rgba(0,0,0,0.4)" };
    this._setVal("prop-shadow-x", s.x ?? 2);
    this._setVal("prop-shadow-y", s.y ?? 4);
    this._setVal("prop-shadow-blur", s.blur ?? 8);
    this._setSwatch("prop-shadow-color-swatch", s.color ?? "rgba(0,0,0,0.4)");
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
    this._originalImageSrc = layer.src ?? null;
    const colorSwatch = document.getElementById("prop-img-color-swatch");
    if (colorSwatch) colorSwatch.style.background = "transparent";
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
    this._setVal("prop-anim-out", layer.animOut ?? "none");
    this._setVal("prop-anim-out-duration", layer.animOutDuration ?? 0.65);
    this._setVal("prop-anim-out-delay", layer.animOutDelay ?? 0);
  }

  _wireBgControls() {
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
        this._canvas.snapshot();
        this._canvas.updateBackground({ type });
      });
    });

    document
      .getElementById("prop-bg-color-swatch")
      ?.addEventListener("click", () => {
        const current = this._canvas.getState().background.color;
        this._openPicker(current, (rgba) => {
          this._canvas.updateBackground({ color: rgba });
          this._setSwatch("prop-bg-color-swatch", rgba);
        });
      });

    document
      .getElementById("prop-grad-from-swatch")
      ?.addEventListener("click", () => {
        const bg = this._canvas.getState().background;
        this._openPicker(bg.gradient?.from ?? "#000", (rgba) => {
          const grad = {
            ...this._canvas.getState().background.gradient,
            from: rgba,
          };
          this._canvas.updateBackground({ gradient: grad });
          this._setSwatch("prop-grad-from-swatch", rgba);
          this._updateGradientBar();
        });
      });

    document
      .getElementById("prop-grad-to-swatch")
      ?.addEventListener("click", () => {
        const bg = this._canvas.getState().background;
        this._openPicker(bg.gradient?.to ?? "#1a1a2e", (rgba) => {
          const grad = {
            ...this._canvas.getState().background.gradient,
            to: rgba,
          };
          this._canvas.updateBackground({ gradient: grad });
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
        const grad = { ...this._canvas.getState().background.gradient, angle };
        this._canvas.updateBackground({ gradient: grad });
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
        const grad = { ...this._canvas.getState().background.gradient, angle };
        this._canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    document
      .getElementById("prop-grad-type")
      ?.addEventListener("change", (e) => {
        const grad = {
          ...this._canvas.getState().background.gradient,
          type: e.target.value,
        };
        this._canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    document
      .getElementById("prop-grad-from-reach")
      ?.addEventListener("input", (e) => {
        const fromReach = parseInt(e.target.value);
        document.getElementById("prop-grad-from-reach-val").textContent =
          fromReach + "%";
        const grad = {
          ...this._canvas.getState().background.gradient,
          fromReach,
        };
        this._canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    document
      .getElementById("prop-grad-to-reach")
      ?.addEventListener("input", (e) => {
        const toReach = parseInt(e.target.value);
        document.getElementById("prop-grad-to-reach-val").textContent =
          toReach + "%";
        const grad = {
          ...this._canvas.getState().background.gradient,
          toReach,
          reach: toReach,
        };
        this._canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    document
      .getElementById("prop-grad-opacity")
      ?.addEventListener("input", (e) => {
        const opacity = parseInt(e.target.value);
        document.getElementById("prop-grad-opacity-val").textContent =
          opacity + "%";
        const grad = {
          ...this._canvas.getState().background.gradient,
          opacity,
          fromOpacity: opacity,
          toOpacity: opacity,
        };
        this._canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    document
      .getElementById("prop-grad-from-opacity")
      ?.addEventListener("input", (e) => {
        const fromOpacity = parseInt(e.target.value);
        document.getElementById("prop-grad-from-opacity-val").textContent =
          fromOpacity + "%";
        const grad = {
          ...this._canvas.getState().background.gradient,
          fromOpacity,
        };
        this._canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    document
      .getElementById("prop-grad-to-opacity")
      ?.addEventListener("input", (e) => {
        const toOpacity = parseInt(e.target.value);
        document.getElementById("prop-grad-to-opacity-val").textContent =
          toOpacity + "%";
        const grad = {
          ...this._canvas.getState().background.gradient,
          toOpacity,
        };
        this._canvas.updateBackground({ gradient: grad });
        this._updateGradientBar();
      });

    document.getElementById("btn-bg-image")?.addEventListener("click", () => {
      this._openFilePicker("image/*", async (file) => {
        const b64 = await this._readFileAsBase64(file);
        this._canvas.snapshot();
        this._canvas.updateBackground({ type: "image", image: b64 });
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
        this._canvas.updateBackground({ imageSize: e.target.value });
      });
  }

  _wirePropertyInputs() {
    const panel = document.getElementById("properties-panel");

    panel.querySelector("#prop-content")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { content: e.target.value });
      const counter = document.getElementById("prop-content-counter");
      if (counter && layer.maxChars) {
        counter.textContent = `${e.target.value.length} / ${layer.maxChars}`;
      }
    });
    panel.querySelector("#prop-content")?.addEventListener("focus", () => this._canvas.snapshot());

    panel.querySelector("#prop-font-family")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { fontFamily: e.target.value });
    });

    panel.querySelector("#prop-font-size")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, {
        fontSize: parseFloat(e.target.value) || layer.fontSize,
      });
    });
    panel.querySelector("#prop-font-size")?.addEventListener("focus", () => this._canvas.snapshot());

    panel.querySelector("#prop-font-weight")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { fontWeight: parseInt(e.target.value) });
      const slider = panel.querySelector("#prop-font-weight-slider");
      if (slider) slider.value = e.target.value;
    });

    panel.querySelector("#prop-font-weight-slider")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      const weight = parseInt(e.target.value);
      this._canvas.updateLayer(layer.id, { fontWeight: weight });
      const select = panel.querySelector("#prop-font-weight");
      if (select) select.value = weight;
    });
    panel.querySelector("#prop-font-weight-slider")?.addEventListener("change", () => this._canvas.snapshot());

    panel.querySelector("#prop-line-height")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { lineHeight: parseFloat(e.target.value) || 1 });
    });
    panel.querySelector("#prop-line-height")?.addEventListener("focus", () => this._canvas.snapshot());

    panel.querySelector("#prop-letter-spacing")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { letterSpacing: e.target.value });
    });
    panel.querySelector("#prop-letter-spacing")?.addEventListener("focus", () => this._canvas.snapshot());

    panel.querySelector("#prop-opacity")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { opacity: parseInt(e.target.value) / 100 });
    });
    panel.querySelector("#prop-opacity")?.addEventListener("focus", () => this._canvas.snapshot());

    panel.querySelector("#prop-text-transform")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { textTransform: e.target.value });
    });

    panel.querySelectorAll(".align-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const layer = this._canvas.getSelectedLayer();
        if (!layer) return;
        this._canvas.snapshot();
        this._canvas.updateLayer(layer.id, { textAlign: btn.dataset.align });
        this._setAlign("prop-align", btn.dataset.align);
      });
    });

    panel.querySelector("#prop-color-swatch")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._openPicker(layer.color, (rgba) => {
        this._canvas.updateLayer(layer.id, { color: rgba });
        this._setSwatch("prop-color-swatch", rgba);
      });
    });

    const bindPos = (id, prop) => {
      panel.querySelector(`#${id}`)?.addEventListener("input", (e) => {
        const layer = this._canvas.getSelectedLayer();
        if (!layer) return;
        const val = e.target.value === "auto" ? "auto" : parseFloat(e.target.value);
        if (!isNaN(val) || val === "auto")
          this._canvas.updateLayer(layer.id, { [prop]: val });
      });
      panel.querySelector(`#${id}`)?.addEventListener("focus", () => this._canvas.snapshot());
    };
    bindPos("prop-x", "x");
    bindPos("prop-y", "y");
    bindPos("prop-width", "width");

    panel.querySelector("#prop-ratio-lock")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { _lockRatio: e.target.checked });
    });

    panel.querySelector("#prop-layer-blur")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { layerBlur: parseFloat(e.target.value) || 0 });
    });
    panel.querySelector("#prop-layer-blur")?.addEventListener("focus", () => this._canvas.snapshot());

    panel.querySelector("#prop-shadow-x")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      const s = layer.boxShadow ?? { x: 2, y: 4, blur: 8, color: "rgba(0,0,0,0.4)" };
      this._canvas.updateLayer(layer.id, { boxShadow: { ...s, x: parseFloat(e.target.value) || 0 } });
    });
    panel.querySelector("#prop-shadow-x")?.addEventListener("focus", () => this._canvas.snapshot());

    panel.querySelector("#prop-shadow-y")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      const s = layer.boxShadow ?? { x: 2, y: 4, blur: 8, color: "rgba(0,0,0,0.4)" };
      this._canvas.updateLayer(layer.id, { boxShadow: { ...s, y: parseFloat(e.target.value) || 0 } });
    });

    panel.querySelector("#prop-shadow-blur")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      const s = layer.boxShadow ?? { x: 2, y: 4, blur: 8, color: "rgba(0,0,0,0.4)" };
      this._canvas.updateLayer(layer.id, { boxShadow: { ...s, blur: parseFloat(e.target.value) || 0 } });
    });

    panel.querySelector("#prop-shadow-color-swatch")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      const s = layer.boxShadow ?? { x: 2, y: 4, blur: 8, color: "rgba(0,0,0,0.4)" };
      this._openPicker(s.color, (rgba) => {
        this._canvas.updateLayer(layer.id, { boxShadow: { ...s, color: rgba } });
        this._setSwatch("prop-shadow-color-swatch", rgba);
      });
    });

    panel.querySelector("#prop-badge-border-radius")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { badgeBorderRadius: parseFloat(e.target.value) || 0 });
    });

    panel.querySelector("#prop-badge-padding-x")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { badgePaddingX: parseFloat(e.target.value) || 0 });
    });

    panel.querySelector("#prop-badge-padding-y")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { badgePaddingY: parseFloat(e.target.value) || 0 });
    });

    panel.querySelector("#prop-badge-bg-swatch")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      const cur = layer.badgeBg === "transparent" ? "#00000000" : layer.badgeBg;
      this._openPicker(cur, (rgba) => {
        this._canvas.updateLayer(layer.id, { badgeBg: rgba });
        this._setSwatch("prop-badge-bg-swatch", rgba);
      });
    });

    panel.querySelector("#prop-badge-border-swatch")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._openPicker(layer.badgeBorderColor, (rgba) => {
        this._canvas.updateLayer(layer.id, { badgeBorderColor: rgba });
        this._setSwatch("prop-badge-border-swatch", rgba);
      });
    });

    panel.querySelector("#prop-shape-fill-swatch")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._openPicker(layer.fillColor, (rgba) => {
        this._canvas.updateLayer(layer.id, { fillColor: rgba });
        this._setSwatch("prop-shape-fill-swatch", rgba);
      });
    });

    panel.querySelector("#prop-shape-height")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { height: parseFloat(e.target.value) || 0.5 });
    });

    panel.querySelector("#prop-shape-radius")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { borderRadius: parseFloat(e.target.value) || 0 });
    });

    panel.querySelector("#prop-img-height")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { height: parseFloat(e.target.value) || 40 });
    });

    panel.querySelector("#prop-img-fit")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { objectFit: e.target.value });
    });

    panel.querySelector("#prop-img-radius")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { borderRadius: parseFloat(e.target.value) || 0 });
    });

    panel.querySelector("#prop-img-zoom")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      const imageZoom = Math.max(0.2, Math.min(4, parseFloat(e.target.value) || 1));
      const zoomVal = document.getElementById("prop-img-zoom-val");
      if (zoomVal) zoomVal.textContent = `${imageZoom.toFixed(2)}x`;
      this._canvas.updateLayer(layer.id, { imageZoom });
    });

    panel.querySelector("#btn-img-zoom-out")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "image") return;
      const next = Math.max(0.2, Math.min(4, Number(layer.imageZoom ?? 1) - 0.1));
      const input = document.getElementById("prop-img-zoom");
      if (input) input.value = next.toFixed(2);
      const zoomVal = document.getElementById("prop-img-zoom-val");
      if (zoomVal) zoomVal.textContent = `${next.toFixed(2)}x`;
      this._canvas.updateLayer(layer.id, { imageZoom: next });
    });

    panel.querySelector("#btn-img-zoom-in")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "image") return;
      const next = Math.max(0.2, Math.min(4, Number(layer.imageZoom ?? 1) + 0.1));
      const input = document.getElementById("prop-img-zoom");
      if (input) input.value = next.toFixed(2);
      const zoomVal = document.getElementById("prop-img-zoom-val");
      if (zoomVal) zoomVal.textContent = `${next.toFixed(2)}x`;
      this._canvas.updateLayer(layer.id, { imageZoom: next });
    });

    panel.querySelector("#btn-img-recolor")?.addEventListener("click", async () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "image" || !layer.src) return;
      try {
        const color = await this._openPicker("#ffffff");
        if (!color) return;
        this._canvas.snapshot();
        const recolored = await this._imageColorService.recolorImage(layer.src, color, { opacity: 1.0 });
        this._canvas.updateLayer(layer.id, { src: recolored });
        const swatch = document.getElementById("prop-img-color-swatch");
        if (swatch) swatch.style.background = color;
      } catch (e) {
        this._toast("Erro ao aplicar cor.", "error");
      }
    });

    panel.querySelector("#btn-img-reset-color")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "image") return;
      if (!this._originalImageSrc) return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { src: this._originalImageSrc });
      const swatch = document.getElementById("prop-img-color-swatch");
      if (swatch) swatch.style.background = "transparent";
    });

    panel.querySelector("#prop-text-has-border")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "text" || layer.subtype === "badge") return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { hasBorder: e.target.checked });
    });

    panel.querySelector("#prop-text-border-width")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "text" || layer.subtype === "badge") return;
      this._canvas.updateLayer(layer.id, { borderWidth: parseFloat(e.target.value) || 1 });
    });

    panel.querySelector("#prop-text-border-radius")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "text" || layer.subtype === "badge") return;
      this._canvas.updateLayer(layer.id, { borderRadius: parseFloat(e.target.value) || 0 });
    });

    panel.querySelector("#prop-text-border-swatch")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "text" || layer.subtype === "badge") return;
      this._openPicker(layer.borderColor ?? "rgba(255,255,255,0.3)", (rgba) => {
        this._canvas.updateLayer(layer.id, { borderColor: rgba });
        this._setSwatch("prop-text-border-swatch", rgba);
      });
    });

    panel.querySelector("#prop-icon-size")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "icon") return;
      this._canvas.updateLayer(layer.id, { size: parseFloat(e.target.value) || 8 });
    });

    panel.querySelector("#prop-icon-has-border")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "icon") return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { hasBorder: e.target.checked });
    });

    panel.querySelector("#prop-icon-border-width")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "icon") return;
      this._canvas.updateLayer(layer.id, { borderWidth: parseFloat(e.target.value) || 1 });
    });

    panel.querySelector("#prop-icon-border-radius")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "icon") return;
      this._canvas.updateLayer(layer.id, { borderRadius: parseFloat(e.target.value) || 0 });
    });

    panel.querySelector("#prop-icon-color-swatch")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "icon") return;
      this._openPicker(layer.color ?? "#ffffff", (rgba) => {
        this._canvas.updateLayer(layer.id, { color: rgba });
        this._setSwatch("prop-icon-color-swatch", rgba);
      });
    });

    panel.querySelector("#prop-icon-bg-swatch")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "icon") return;
      this._openPicker(layer.background ?? "#00000000", (rgba) => {
        this._canvas.updateLayer(layer.id, { background: rgba });
        this._setSwatch("prop-icon-bg-swatch", rgba);
      });
    });

    panel.querySelector("#prop-icon-border-swatch")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer || layer.type !== "icon") return;
      this._openPicker(layer.borderColor ?? "#ffffff", (rgba) => {
        this._canvas.updateLayer(layer.id, { borderColor: rgba });
        this._setSwatch("prop-icon-border-swatch", rgba);
      });
    });

    panel.querySelector("#prop-anim-in")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { animIn: e.target.value });
    });

    panel.querySelector("#prop-anim-duration")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { animDuration: parseFloat(e.target.value) || 0.1 });
    });

    panel.querySelector("#prop-anim-delay")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { animDelay: parseFloat(e.target.value) || 0 });
    });

    panel.querySelector("#prop-anim-easing")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { animEasing: e.target.value });
    });

    panel.querySelector("#prop-anim-out")?.addEventListener("change", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.snapshot();
      this._canvas.updateLayer(layer.id, { animOut: e.target.value });
    });

    panel.querySelector("#prop-anim-out-duration")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { animOutDuration: parseFloat(e.target.value) || 0.1 });
    });

    panel.querySelector("#prop-anim-out-delay")?.addEventListener("input", (e) => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._canvas.updateLayer(layer.id, { animOutDelay: parseFloat(e.target.value) || 0 });
    });

    panel.querySelector("#btn-copy-layer")?.addEventListener("click", () => {
      const layer = this._canvas.getSelectedLayer();
      if (!layer) return;
      this._layerClipboard = {
        layer: structuredClone(layer),
        sourceSlideIndex: this._slides?.getActiveIndex() ?? 0,
      };
      this._updateClipboardBadge();
      this._toast(`Camada "${layer.name || layer.type}" copiada.`, "info");
    });

    panel.querySelector("#btn-paste-layer")?.addEventListener("click", () => {
      if (!this._layerClipboard) return;
      const clone = structuredClone(this._layerClipboard.layer);
      clone.id = uuid();
      this._canvas.snapshot();
      this._canvas.addLayer(clone);
      this._toast(`Camada colada no slide ${(this._slides?.getActiveIndex() ?? 0) + 1}.`, "success");
    });

    panel.querySelector("#btn-paste-layer-all")?.addEventListener("click", () => {
      this._pasteLayerToAllSlides();
    });
  }

  _updateClipboardBadge() {
    const badge = document.getElementById("clipboard-badge");
    const pasteBtn = document.getElementById("btn-paste-layer");
    const pasteAllBtn = document.getElementById("btn-paste-layer-all");
    const has = !!this._layerClipboard;
    if (badge) {
      if (has) {
        const name = this._layerClipboard.layer.name || this._layerClipboard.layer.type;
        badge.textContent = `📋 ${name}`;
        badge.style.display = "";
      } else {
        badge.style.display = "none";
      }
    }
    if (pasteBtn) pasteBtn.style.display = has ? "" : "none";
    if (pasteAllBtn) pasteAllBtn.style.display = has ? "" : "none";
  }

  async _pasteLayerToAllSlides() {
    if (!this._layerClipboard) return;
    const allSlides = this._slides?.getSlides();
    if (!allSlides || allSlides.length <= 1) {
      this._pasteLayer();
      return;
    }
    const activeIdx = this._slides.getActiveIndex();
    const updatedSlides = allSlides.map((slide, idx) => {
      if (idx === activeIdx) return slide;
      const clone = structuredClone(this._layerClipboard.layer);
      clone.id = uuid();
      return {
        ...slide,
        state: {
          ...slide.state,
          layers: [...(slide.state.layers ?? []), clone],
        },
      };
    });
    this._pasteLayer();
    await this._slides.loadSlides(updatedSlides, activeIdx);
    this._toast(`Camada colada em ${allSlides.length} slides.`, "success");
  }

  _pasteLayer() {
    if (!this._layerClipboard) return;
    const clone = structuredClone(this._layerClipboard.layer);
    clone.id = uuid();
    this._canvas.snapshot();
    this._canvas.addLayer(clone);
    this._toast(`Camada colada no slide ${(this._slides?.getActiveIndex() ?? 0) + 1}.`, "success");
  }

  async _readFileAsBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
}
