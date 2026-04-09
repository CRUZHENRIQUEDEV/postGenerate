/* ============================================================
   CanvasController — Canvas event wiring
   ============================================================ */

import { openFilePicker } from "../utils/ui-helpers.js";
import { BrandManager } from "../brand-manager.js";

export class CanvasController {
  constructor({
    canvas,
    onRefreshLayerList,
    onRefreshPropertiesPanel,
    onFitCanvas,
    onUpdateFormatBadge,
    onQueueBrandHistorySave,
    onMarkProjectDirty,
    onQueueProjectSave,
    makeTextLayer,
    makeBadgeLayer,
    makeImageLayer,
    makeIconLayer,
    makeShapeLayer,
    icons,
  }) {
    this._canvas = canvas;
    this._onRefreshLayerList = onRefreshLayerList;
    this._onRefreshPropertiesPanel = onRefreshPropertiesPanel;
    this._onFitCanvas = onFitCanvas;
    this._onUpdateFormatBadge = onUpdateFormatBadge;
    this._onQueueBrandHistorySave = onQueueBrandHistorySave;
    this._onMarkProjectDirty = onMarkProjectDirty;
    this._onQueueProjectSave = onQueueProjectSave;
    this._makeTextLayer = makeTextLayer;
    this._makeBadgeLayer = makeBadgeLayer;
    this._makeImageLayer = makeImageLayer;
    this._makeIconLayer = makeIconLayer;
    this._makeShapeLayer = makeShapeLayer;
    this._icons = icons;
  }

  wire() {
    this.wireCanvasEvents();
    this.wireLayerPanel();
  }

  wireCanvasEvents() {
    this._canvas.on("selectionChange", (layer) => {
      this._onRefreshLayerList?.();
      this._onRefreshPropertiesPanel?.(layer);
    });

    this._canvas.on("layersChange", () => {
      this._onRefreshLayerList?.();
    });

    this._canvas.on("formatChange", (fmtId) => {
      this._onFitCanvas?.();
      this._onUpdateFormatBadge?.(fmtId);
      this._onQueueBrandHistorySave?.();
      this._onMarkProjectDirty?.();
      this._onQueueProjectSave?.();
    });

    this._canvas.on("stateChange", () => {
      this._onQueueBrandHistorySave?.();
      this._onMarkProjectDirty?.();
      this._onQueueProjectSave?.();
    });
  }

  wireLayerPanel() {
    document.getElementById("btn-add-text")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.addLayer(this._makeTextLayer());
    });

    document.getElementById("btn-add-badge")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.addLayer(this._makeBadgeLayer());
    });

    document.getElementById("btn-add-image")?.addEventListener("click", () => {
      openFilePicker("image/*", async (file) => {
        const b64 = await BrandManager.readFileAsBase64(file);
        this._canvas.snapshot();
        this._canvas.addLayer(this._makeImageLayer(null, file.name, b64));
      });
    });

    document.getElementById("btn-add-icon")?.addEventListener("click", () => {
      this._icons.open(({ iconId, svg }) => {
        this._canvas.snapshot();
        this._canvas.addLayer(this._makeIconLayer(null, iconId, iconId, svg));
      });
    });

    document.getElementById("btn-add-shape")?.addEventListener("click", () => {
      this._canvas.snapshot();
      this._canvas.addLayer(this._makeShapeLayer());
    });
  }
}
