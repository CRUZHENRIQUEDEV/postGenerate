/* ============================================================
   AnimationPanelController — Animation panel, alignment, zoom
   ============================================================ */

import { toast } from "../app.js";

export class AnimationPanelController {
  constructor({ canvas, slides, anim, onFitCanvas }) {
    this._canvas = canvas;
    this._slides = slides;
    this._anim = anim;
    this._onFitCanvas = onFitCanvas;
    this._canvasPreviewZoom = 1;
  }

  wire() {
    this._wireAnimationPanel();
  }

  _wireAnimationPanel() {
    document
      .getElementById("btn-play-animation")
      ?.addEventListener("click", async () => {
        await this._anim.play();
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

    document.getElementById("btn-align-left")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.alignSelectedLayers("left");
    });
    document.getElementById("btn-align-center-h")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.alignSelectedLayers("centerH");
    });
    document.getElementById("btn-align-right")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.alignSelectedLayers("right");
    });
    document.getElementById("btn-align-top")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.alignSelectedLayers("top");
    });
    document.getElementById("btn-align-center-v")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.alignSelectedLayers("centerV");
    });
    document.getElementById("btn-align-bottom")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.alignSelectedLayers("bottom");
    });
    document.getElementById("btn-distribute-h")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.distributeSelectedLayers("horizontal");
    });
    document.getElementById("btn-distribute-v")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.distributeSelectedLayers("vertical");
    });
  }

  _adjustCanvasPreviewZoom(delta) {
    this._canvasPreviewZoom = Math.max(
      0.25,
      Math.min(3, Number(this._canvasPreviewZoom || 1) + Number(delta || 0)),
    );
    this._onFitCanvas();
  }

  async _applyCurrentBgToAllSlides() {
    const slides = this._slides.getSlides();
    if (slides.length <= 1) {
      toast("Só há um slide no projeto.", "info");
      return;
    }
    const bg = structuredClone(this._canvas.getState().background);
    if (!bg) {
      toast("Sem fundo definido no slide atual.", "info");
      return;
    }
    this._canvas.snapshot();
    const activeIdx = this._slides.getActiveIndex();
    const updated = slides.map((s) => {
      const state = structuredClone(s.state ?? {});
      state.background = structuredClone(bg);
      return { ...s, state };
    });
    await this._slides.loadSlides(updated, activeIdx);
    toast(`Fundo aplicado em todos os ${slides.length} slides.`, "success");
  }
}
