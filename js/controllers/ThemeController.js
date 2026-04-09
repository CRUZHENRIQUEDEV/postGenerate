/* ============================================================
   ThemeController — Theme toggle and safe area wiring
   ============================================================ */

export class ThemeController {
  constructor({ canvas }) {
    this._canvas = canvas;
  }

  wire() {
    this._wireTheme();
  }

  _wireTheme() {
    const saved = localStorage.getItem("pg_theme");
    if (saved) document.documentElement.dataset.theme = saved;
    document.getElementById("btn-theme")?.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme;
      const next = current === "light" ? "" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("pg_theme", next);
    });
    document.getElementById("btn-safe-area")?.addEventListener("click", () => {
      if (this._canvas) this._canvas.toggleSafeArea();
    });
  }
}
