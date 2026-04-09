/* ============================================================
   FormatModalController — Format selection modal
   ============================================================ */

import { FORMATS, FORMAT_GROUPS } from "../formats.js";

export class FormatModalController {
  constructor({ canvas, onFitCanvas, onUpdateFormatBadge }) {
    this._canvas = canvas;
    this._FORMATS = FORMATS;
    this._FORMAT_GROUPS = FORMAT_GROUPS;
    this._onFitCanvas = onFitCanvas;
    this._onUpdateFormatBadge = onUpdateFormatBadge;
  }

  wire() {
    this._wireFormatModal();
  }

  open() {
    this._openFormatModal();
  }

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
    const currentFmtId = this._canvas.getState().formatId;

    this._FORMAT_GROUPS.forEach((group) => {
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
        const fmt = this._FORMATS[fmtId];
        const isActive = fmtId === currentFmtId;

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
          this._canvas.snapshot();
          this._canvas.setFormat(fmtId);
          this._onFitCanvas();
          this._onUpdateFormatBadge(fmtId);
          modal.classList.remove("open");
        });
        grid.appendChild(card);
      });
    });

    modal.classList.add("open");
  }
}
