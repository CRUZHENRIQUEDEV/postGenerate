export class SlideManager {
  constructor(
    canvasEngine,
    {
      trackId = "slides-track",
      addBtnId = "btn-slide-add",
      duplicateBtnId = "btn-slide-duplicate",
      removeBtnId = "btn-slide-remove",
    } = {},
  ) {
    this._canvas = canvasEngine;
    this._track = document.getElementById(trackId);
    this._addBtn = document.getElementById(addBtnId);
    this._duplicateBtn = document.getElementById(duplicateBtnId);
    this._removeBtn = document.getElementById(removeBtnId);
    this._slides = [];
    this._active = 0;
    this._thumbTimer = null;
    this._listeners = {};
    this._bound = false;
  }

  async init() {
    this._slides = [
      {
        id: crypto.randomUUID(),
        state: this._canvas.getState(),
        thumb: "",
        caption: "",
      },
    ];
    await this._refreshActiveThumb();
    if (!this._bound) this._bind();
    this.render();
    this._emit("change", this.getSlides());
  }

  _bind() {
    this._bound = true;
    this._addBtn?.addEventListener("click", () => this.addFromCurrent());
    this._duplicateBtn?.addEventListener("click", () => this.duplicateActive());
    this._removeBtn?.addEventListener("click", () => this.removeActive());
    this._canvas.on("stateChange", (state) => {
      if (!this._slides[this._active]) return;
      this._slides[this._active].state = structuredClone(state);
      clearTimeout(this._thumbTimer);
      this._thumbTimer = setTimeout(() => this._refreshActiveThumb(), 250);
      this._emit("change", this.getSlides());
    });
  }

  getSlides() {
    return this._slides.map((s) => ({
      ...s,
      state: structuredClone(s.state),
      caption: s.caption ?? "",
    }));
  }

  getActiveIndex() {
    return this._active;
  }

  getActiveSlide() {
    const s = this._slides[this._active];
    if (!s) return null;
    return {
      ...s,
      state: structuredClone(s.state),
      caption: s.caption ?? "",
    };
  }

  async loadSlides(slides = [], activeIndex = 0) {
    const valid = (slides ?? [])
      .filter((s) => s?.state)
      .map((s) => ({
        id: s.id ?? crypto.randomUUID(),
        state: structuredClone(s.state),
        thumb: s.thumb ?? "",
        caption: s.caption ?? "",
      }));
    this._slides = valid.length
      ? valid
      : [
          {
            id: crypto.randomUUID(),
            state: this._canvas.getState(),
            thumb: "",
            caption: "",
          },
        ];
    this._active = Math.min(Math.max(0, activeIndex), this._slides.length - 1);
    this._canvas.setState(structuredClone(this._slides[this._active].state));
    await this._refreshActiveThumb();
    this.render();
    this._emit("change", this.getSlides());
  }

  async addFromCurrent() {
    const state = this._canvas.getState();
    const slide = {
      id: crypto.randomUUID(),
      state: structuredClone(state),
      thumb: "",
      caption: "",
    };
    this._slides.push(slide);
    this._active = this._slides.length - 1;
    await this._refreshActiveThumb();
    this.render();
    this._emit("change", this.getSlides());
  }

  async duplicateActive() {
    const src = this._slides[this._active];
    if (!src) return;
    const copy = {
      id: crypto.randomUUID(),
      state: structuredClone(src.state),
      thumb: src.thumb,
      caption: src.caption ?? "",
    };
    this._slides.splice(this._active + 1, 0, copy);
    this._active = this._active + 1;
    await this._refreshActiveThumb();
    this.render();
    this._emit("change", this.getSlides());
  }

  async removeActive() {
    if (this._slides.length <= 1) return;
    this._slides.splice(this._active, 1);
    this._active = Math.max(0, this._active - 1);
    const next = this._slides[this._active];
    if (next) this._canvas.setState(structuredClone(next.state));
    await this._refreshActiveThumb();
    this.render();
    this._emit("change", this.getSlides());
  }

  async setActive(index) {
    if (index < 0 || index >= this._slides.length) return;
    this._active = index;
    this._canvas.setState(structuredClone(this._slides[index].state));
    this.render();
    this._emit("change", this.getSlides());
  }

  setActiveCaption(caption = "") {
    const slide = this._slides[this._active];
    if (!slide) return;
    slide.caption = String(caption ?? "");
    this._emit("change", this.getSlides());
  }

  async _refreshActiveThumb() {
    const slide = this._slides[this._active];
    if (!slide) return;
    slide.thumb = await this._captureThumb();
    this.render();
  }

  async _captureThumb() {
    const el = document.getElementById("post-canvas");
    if (!el || !window.html2canvas) return "";
    const canvas = await window.html2canvas(el, {
      useCORS: true,
      backgroundColor: null,
      logging: false,
      scale: 0.24,
    });
    return canvas.toDataURL("image/jpeg", 0.68);
  }

  render() {
    if (!this._track) return;
    this._track.innerHTML = "";
    this._slides.forEach((slide, idx) => {
      const card = document.createElement("button");
      card.className = `slide-thumb${idx === this._active ? " active" : ""}`;
      card.innerHTML = `
        <span class="slide-thumb-label">${idx + 1}</span>
        ${slide.thumb ? `<img src="${slide.thumb}" alt="Slide ${idx + 1}">` : '<span class="text-muted text-xs">Sem preview</span>'}
      `;
      card.addEventListener("click", () => this.setActive(idx));
      this._track.appendChild(card);
    });
  }

  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
    return () => this.off(event, cb);
  }

  off(event, cb) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((fn) => fn !== cb);
  }

  _emit(event, data) {
    (this._listeners[event] ?? []).forEach((cb) => cb(data));
  }
}
