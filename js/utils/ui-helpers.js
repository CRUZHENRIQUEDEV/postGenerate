/* ============================================================
   UI Helpers — DOM utilities for PostGenerate
   ============================================================ */

export function uuid() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

export function setSwatch(id, color) {
  const el = document.getElementById(id);
  if (!el) return;
  const fill = el.querySelector(".swatch-fill");
  if (fill) fill.style.background = color;
  else el.style.background = color;
}

export function setAlign(id, align) {
  document
    .querySelectorAll(`[data-align-group="${id}"] .align-btn`)
    .forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.align === align);
    });
}

export function withOpacity(color, opacityPercent = 100) {
  const alpha = Math.max(0, Math.min(1, (opacityPercent ?? 100) / 100));
  const c = String(color ?? "#000000").trim();
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split("").map((ch) => ch + ch).join("");
    }
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  const rgbaMatch = c.match(
    /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/i,
  );
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]);
    const g = Number(rgbaMatch[2]);
    const b = Number(rgbaMatch[3]);
    const baseA = rgbaMatch[4] == null ? 1 : Math.max(0, Math.min(1, Number(rgbaMatch[4])));
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, baseA * alpha))})`;
  }
  return c;
}

export function openFilePicker(accept, onFile) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  });
  input.click();
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function bgSwatchStyle(bg) {
  if (!bg) return "background:#000;";
  if (bg.type === "solid") return `background:${bg.color ?? "#000"};`;
  if (bg.type === "gradient") {
    const g = bg.gradient ?? {};
    const dir = g.type === "radial"
      ? `radial-gradient(ellipse at center,${g.from ?? "#000"},${g.to ?? "#fff"})`
      : `linear-gradient(${g.angle ?? 135}deg,${g.from ?? "#000"},${g.to ?? "#fff"})`;
    return `background:${dir};`;
  }
  if (bg.type === "image") return "background:#333;";
  return "background:#000;";
}

export function formatBrandColor(entry) {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return "";
  return entry.hex || entry.value || entry.color || (entry.name ? `${entry.name}` : "") || "";
}
