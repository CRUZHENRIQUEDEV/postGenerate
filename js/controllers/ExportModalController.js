/* ============================================================
   ExportModalController — Export buttons and helpers
   ============================================================ */

import { toast } from "../app.js";

export class ExportModalController {
  constructor({ canvas, slides, exporter, anim, onFitCanvas, onUpdateFormatBadge }) {
    this._canvas = canvas;
    this._slides = slides;
    this._exporter = exporter;
    this._anim = anim;
    this._onFitCanvas = onFitCanvas;
    this._onUpdateFormatBadge = onUpdateFormatBadge;
  }

  wire() {
    this._wireExportModal();
  }

  open() {
    document.getElementById("export-modal")?.classList.add("open");
  }

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
          await this._exporter.exportPNG({ transparent });
          toast("Exportado com sucesso!", "success");
        } catch (e) {
          toast("Erro na exportação.", "error");
          console.error(e);
        }
      });

    document.getElementById("btn-export-jpeg")?.addEventListener("click", async () => {
      const transparent = document.getElementById("export-transparent")?.checked ?? false;
      const quality = parseFloat(document.getElementById("export-image-quality")?.value ?? "0.9");
      document.getElementById("export-modal")?.classList.remove("open");
      toast("Exportando JPEG...", "info");
      try {
        await this._exporter.exportImage({ format: "jpeg", quality, transparent });
        toast("JPEG exportado!", "success");
      } catch (e) {
        toast("Erro na exportação.", "error");
        console.error(e);
      }
    });

    document.getElementById("btn-export-webp")?.addEventListener("click", async () => {
      const transparent = document.getElementById("export-transparent")?.checked ?? false;
      const quality = parseFloat(document.getElementById("export-image-quality")?.value ?? "0.9");
      document.getElementById("export-modal")?.classList.remove("open");
      toast("Exportando WebP...", "info");
      try {
        await this._exporter.exportImage({ format: "webp", quality, transparent });
        toast("WebP exportado!", "success");
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
        const slides = this._slides.getSlides();
        if (!slides.length) {
          toast("Nenhum slide no projeto.", "info");
          return;
        }
        toast(`Exportando ${slides.length} slide(s)...`, "info");
        try {
          await this._exporter.exportAllSlides(slides, {
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
        const slides = this._slides.getSlides();
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
        const slides = this._slides.getSlides();
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
          await this._exporter.exportSVG();
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
          await this._anim.exportGIF();
          toast("GIF exportado com sucesso!", "success");
        } catch (e) {
          toast("Erro ao exportar GIF.", "error");
          console.error(e);
        }
      });

    document
      .getElementById("btn-export-pdf")
      ?.addEventListener("click", async () => {
        if (!window.jspdf) {
          toast("Biblioteca jsPDF não carregada.", "error");
          return;
        }
        document.getElementById("export-modal")?.classList.remove("open");
        toast("Gerando PDF...", "info");
        try {
          const { jsPDF } = window.jspdf;
          const state = this._canvas.getState();
          const { FORMATS, getFormat } = await import("../formats.js");
          const fmt = getFormat(state.formatId) ?? FORMATS["ig-feed-square"];
          const slide = this._slides.getActiveSlide();
          if (!slide) throw new Error("Nenhum slide ativo.");

          const pdf = new jsPDF({
            orientation: fmt.width > fmt.height ? "landscape" : "portrait",
            unit: "px",
            format: [fmt.width, fmt.height],
          });

          const thumb = await this._exporter.generateThumbnail(Math.max(fmt.width, fmt.height));
          const imgData = thumb.split(",")[1] ?? thumb;
          pdf.addImage(imgData, "JPEG", 0, 0, fmt.width, fmt.height);

          const safeName = String(slide.name || "slide").toLowerCase().replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
          pdf.save(`${safeName || "slide"}.pdf`);
          toast("PDF exportado!", "success");
        } catch (e) {
          toast("Erro ao exportar PDF.", "error");
          console.error(e);
        }
      });
  }

  _getSelectedExportFormatIds() {
    const nodes = document.querySelectorAll(".export-format-checkbox:checked");
    return Array.from(nodes)
      .map((n) => n.value)
      .filter(Boolean);
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async _exportCurrentAcrossFormatsZip({ formatIds, mediaType, transparent }) {
    if (!window.JSZip) throw new Error("JSZip não carregado.");
    const zip = new window.JSZip();
    const savedState = structuredClone(this._canvas.getState());
    try {
      for (const fmtId of formatIds) {
        const next = structuredClone(savedState);
        next.formatId = fmtId;
        this._canvas.setState(next);
        this._onFitCanvas();
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
        zip.file(this._exporter._buildFilename(next, fmtId, ext), blob);
      }
    } finally {
      this._canvas.setState(savedState);
      this._onFitCanvas();
      this._onUpdateFormatBadge(this._canvas.getState().formatId);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const ts = new Date().toISOString().slice(0, 10);
    this._exporter._download(blob, `slide-atual-${mediaType}-${ts}.zip`);
  }

  async _exportAllSlidesAcrossFormatsZip({
    slides,
    formatIds,
    mediaType,
    transparent,
  }) {
    if (!window.JSZip) throw new Error("JSZip não carregado.");
    const zip = new window.JSZip();
    const savedState = structuredClone(this._canvas.getState());
    let successCount = 0;
    try {
      for (let i = 0; i < slides.length; i++) {
        for (const fmtId of formatIds) {
          try {
            const base = structuredClone(slides[i].state);
            base.formatId = fmtId;
            this._canvas.setState(base);
            this._onFitCanvas();
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
            const name = `slide-${pad}-${this._exporter._buildFilename(base, fmtId, ext)}`;
            zip.file(name, blob);
            successCount++;
          } catch (e) {
            console.error(`Falha slide ${i + 1} / formato ${fmtId}:`, e);
          }
        }
      }
    } finally {
      this._canvas.setState(savedState);
      this._onFitCanvas();
      this._onUpdateFormatBadge(this._canvas.getState().formatId);
    }
    if (!successCount) throw new Error("Nenhum arquivo exportado.");
    const blob = await zip.generateAsync({ type: "blob" });
    const ts = new Date().toISOString().slice(0, 10);
    this._exporter._download(blob, `slides-${mediaType}-${ts}.zip`);
  }

  async _exportAllSlidesAcrossFormatsSeparate({
    slides,
    formatIds,
    mediaType,
    transparent,
  }) {
    const savedState = structuredClone(this._canvas.getState());
    let successCount = 0;
    try {
      for (let i = 0; i < slides.length; i++) {
        for (const fmtId of formatIds) {
          const base = structuredClone(slides[i].state);
          base.formatId = fmtId;
          this._canvas.setState(base);
          this._onFitCanvas();
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
            const name = `slide-${pad}-${this._exporter._buildFilename(base, fmtId, ext)}`;
            this._exporter._download(blob, name);
            successCount++;
          } catch (e) {
            console.error(`Falha slide ${i + 1} / formato ${fmtId}:`, e);
          }
        }
      }
    } finally {
      this._canvas.setState(savedState);
      this._onFitCanvas();
      this._onUpdateFormatBadge(this._canvas.getState().formatId);
    }
    if (!successCount) throw new Error("Nenhum arquivo exportado.");
  }

  async _exportBlobByMediaType({ mediaType, transparent, formatId }) {
    if (mediaType === "png") {
      return await this._exporter._exportBlob({ format: "png", transparent, formatId });
    }
    if (mediaType === "jpeg" || mediaType === "jpg") {
      const quality = parseFloat(document.getElementById("export-image-quality")?.value ?? "0.9");
      return await this._exporter._exportBlob({ format: "jpeg", quality, transparent, formatId });
    }
    if (mediaType === "webp") {
      const quality = parseFloat(document.getElementById("export-image-quality")?.value ?? "0.9");
      return await this._exporter._exportBlob({ format: "webp", quality, transparent, formatId });
    }
    if (mediaType === "gif") {
      return await this._exporter._exportBlob({ format: "gif", transparent, formatId });
    }
    if (mediaType === "video") {
      return await this._exporter._exportBlob({ format: "webm", transparent, formatId });
    }
    throw new Error(`Unsupported media type: ${mediaType}`);
  }
}
