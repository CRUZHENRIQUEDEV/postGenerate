/* ============================================================
   PanelVisibilityController — Panel collapse/expand controls
   ============================================================ */

export class PanelVisibilityController {
  constructor({}) {
  }

  wire() {
    this._wirePanelVisibilityControls();
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
}
