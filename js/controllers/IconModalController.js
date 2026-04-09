/* ============================================================
   IconModalController — Icon picker modal
   ============================================================ */

export class IconModalController {
  constructor({ canvas, icons, makeIconLayer }) {
    this._canvas = canvas;
    this._icons = icons;
    this._makeIconLayer = makeIconLayer;
  }

  wire() {
    this._wireIconModal();
  }

  _wireIconModal() {
    document
      .getElementById("btn-open-icon-modal")
      ?.addEventListener("click", () => {
        this._icons.open(({ iconId, svg }) => {
          this._canvas.snapshot();
          this._canvas.addLayer(this._makeIconLayer(null, iconId, iconId, svg));
        });
      });
  }
}
