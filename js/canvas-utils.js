/* ============================================================
   PostGenerate — Canvas Utilities
   Helpers, CSS injection, animation defaults.
   ============================================================ */

/* ── UUID helper ─────────────────────────────────────────── */
export const uuid = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`);

/* ── Animation CSS (injected once) ──────────────────────── */
const ANIM_CSS_ID = "pg-anim-styles";
export function injectAnimCSS() {
  if (document.getElementById(ANIM_CSS_ID)) return;
  const s = document.createElement("style");
  s.id = ANIM_CSS_ID;
  s.textContent = `
    @keyframes pg-fade    { from { opacity:0 } to { opacity:1 } }
    @keyframes pg-slide-up    { from { opacity:0; transform:translateY(6%)  } to { opacity:1; transform:translateY(0) } }
    @keyframes pg-slide-down  { from { opacity:0; transform:translateY(-6%) } to { opacity:1; transform:translateY(0) } }
    @keyframes pg-slide-left  { from { opacity:0; transform:translateX(-8%)} to { opacity:1; transform:translateX(0) } }
    @keyframes pg-slide-right { from { opacity:0; transform:translateX(8%) } to { opacity:1; transform:translateX(0) } }
    @keyframes pg-scale   { from { opacity:0; transform:scale(0.82) } to { opacity:1; transform:scale(1) } }
    @keyframes pg-blur-in { from { opacity:0; filter:blur(18px) }    to { opacity:1; filter:blur(0) } }
    @keyframes pg-bounce  { 0%{opacity:0;transform:scale(0.6)} 60%{transform:scale(1.08)} 80%{transform:scale(0.96)} 100%{opacity:1;transform:scale(1)} }
    @keyframes pg-move-up { from { opacity:0; transform:translateY(14%) } to { opacity:1; transform:translateY(0) } }
    @keyframes pg-move-down { from { opacity:0; transform:translateY(-14%) } to { opacity:1; transform:translateY(0) } }
    @keyframes pg-move-left { from { opacity:0; transform:translateX(-14%) } to { opacity:1; transform:translateX(0) } }
    @keyframes pg-move-right { from { opacity:0; transform:translateX(14%) } to { opacity:1; transform:translateX(0) } }
    @keyframes pg-rotate-in { from { opacity:0; transform:rotate(-12deg) scale(0.84) } to { opacity:1; transform:rotate(0deg) scale(1) } }

    @keyframes pg-fade-out    { from { opacity:1 } to { opacity:0 } }
    @keyframes pg-slide-up-out    { from { opacity:1; transform:translateY(0) } to { opacity:0; transform:translateY(-6%) } }
    @keyframes pg-slide-down-out  { from { opacity:1; transform:translateY(0) } to { opacity:0; transform:translateY(6%) } }
    @keyframes pg-slide-left-out  { from { opacity:1; transform:translateX(0)} to { opacity:0; transform:translateX(-8%)} }
    @keyframes pg-slide-right-out { from { opacity:1; transform:translateX(0) } to { opacity:0; transform:translateX(8%) } }
    @keyframes pg-scale-out   { from { opacity:1; transform:scale(1) } to { opacity:0; transform:scale(0.82) } }
    @keyframes pg-blur-out { from { opacity:1; filter:blur(0) }    to { opacity:0; filter:blur(18px) } }
    @keyframes pg-bounce-out  { 0%{opacity:1;transform:scale(1)} 20%{transform:scale(0.9)} 40%{transform:scale(1.02)} 60%{transform:scale(0.96)} 80%{transform:scale(1.02)} 100%{opacity:0;transform:scale(0.6)} }
    @keyframes pg-move-up-out { from { opacity:1; transform:translateY(0) } to { opacity:0; transform:translateY(-14%) } }
    @keyframes pg-move-down-out { from { opacity:1; transform:translateY(0) } to { opacity:0; transform:translateY(14%) } }
    @keyframes pg-move-left-out { from { opacity:1; transform:translateX(0) } to { opacity:0; transform:translateX(-14%) } }
    @keyframes pg-move-right-out { from { opacity:1; transform:translateX(0) } to { opacity:0; transform:translateX(14%) } }
    @keyframes pg-rotate-out { from { opacity:1; transform:rotate(0deg) scale(1) } to { opacity:0; transform:rotate(12deg) scale(0.84) } }

    .pg-layer.pg-playing[data-anim]:not([data-anim="none"]) {
      animation-fill-mode: both;
      animation-timing-function: cubic-bezier(0.22,1,0.36,1);
    }
    .pg-layer.pg-playing[data-anim-out]:not([data-anim-out="none"]) {
      animation-fill-mode: both;
      animation-timing-function: cubic-bezier(0.22,1,0.36,1);
    }
    .pg-layer.pg-paused { opacity: 0 !important; }
  `;
  document.head.appendChild(s);
}

/* ── Shared anim defaults ───────────────────────────────── */
export const ANIM_DEFAULTS = {
  animIn: "none",
  animDuration: 0.65,
  animDelay: 0,
  animEasing: "cubic-bezier(0.22,1,0.36,1)",
  animOut: "none",
  animOutDuration: 0.65,
  animOutDelay: 0,
};

/* ── Color helper ────────────────────────────────────────── */
export function withOpacity(color, opacityPercent = 100) {
  const alpha = Math.max(0, Math.min(1, (opacityPercent ?? 100) / 100));
  const c = String(color ?? "#000000").trim();
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split("").map(ch => ch + ch).join("");
    }
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  const rgbaMatch = c.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]);
    const g = Number(rgbaMatch[2]);
    const b = Number(rgbaMatch[3]);
    const baseA = rgbaMatch[4] == null ? 1 : Math.max(0, Math.min(1, Number(rgbaMatch[4])));
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, baseA * alpha))})`;
  }
  return c;
}
