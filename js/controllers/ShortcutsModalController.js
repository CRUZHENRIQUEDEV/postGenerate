/* ============================================================
   ShortcutsModalController — Keyboard shortcuts modal wiring
   ============================================================ */

export class ShortcutsModalController {
  constructor({}) {
    this._modal = null;
  }

  wire() {
    this._wireShortcutsModal();
  }

  open() {
    if (this._modal) {
      this._modal.style.display = "flex";
      this._modal.classList.add("open");
    }
  }

  close() {
    this._modal?.classList.remove("open");
  }

  _wireShortcutsModal() {
    this._modal = document.getElementById("shortcuts-modal");
    document.getElementById("btn-shortcuts")?.addEventListener("click", () => {
      if (this._modal) {
        this._modal.style.display = "flex";
        this._modal.classList.add("open");
      }
    });
    document.getElementById("btn-close-shortcuts-modal")?.addEventListener("click", () => {
      this._modal?.classList.remove("open");
    });
    this._modal?.addEventListener("click", (e) => {
      if (e.target?.id === "shortcuts-modal") this._modal?.classList.remove("open");
    });
  }
}
