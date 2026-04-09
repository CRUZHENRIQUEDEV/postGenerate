/* ============================================================
   SlideCaptionController — Slide caption UI wiring
   ============================================================ */

import { toast } from "../app.js";

export class SlideCaptionController {
  constructor({ slides }) {
    this._slides = slides;
    this._syncingCaptionUI = false;
  }

  wire() {
    this._wireSlideCaption();
  }

  refresh() {
    this._refreshSlideCaptionUI();
  }

  _wireSlideCaption() {
    document
      .getElementById("slide-caption-input")
      ?.addEventListener("input", (e) => {
        if (this._syncingCaptionUI) return;
        this._slides.setActiveCaption(e.target.value ?? "");
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

  _refreshSlideCaptionUI() {
    const input = document.getElementById("slide-caption-input");
    if (!input) return;
    const active = this._slides?.getActiveSlide?.();
    const text = active?.caption ?? "";
    this._syncingCaptionUI = true;
    input.value = text;
    this._syncingCaptionUI = false;

    const resetBtn = document.getElementById("btn-reset-preset");
    if (resetBtn) {
      const hasPreset = !!(active?.state?._presetId);
      resetBtn.style.display = hasPreset ? "" : "none";
    }
  }
}
