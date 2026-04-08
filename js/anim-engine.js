import { getFormat } from "./formats.js";

export class AnimEngine {
  constructor(canvasEngine, { canvasId = "post-canvas" } = {}) {
    this._canvas = canvasEngine;
    this._canvasId = canvasId;
  }

  async play() {
    await this._canvas.playAnimations();
  }

  async exportGIF({
    fps = 10,
    filename = "post-animado.gif",
    download = true,
    qualityScale = 1,
  } = {}) {
    if (!window.gifshot || !window.html2canvas) {
      throw new Error("Dependências de GIF não carregadas.");
    }
    const state = this._canvas.getState?.();
    const fmt = state?.formatId ? getFormat(state.formatId) : null;
    const target = document.getElementById(this._canvasId);
    const gifWidth = Math.round(fmt?.width ?? target?.clientWidth ?? 600);
    const gifHeight = Math.round(fmt?.height ?? target?.clientHeight ?? 600);
    const frames = await this._captureFrames(fps, {
      qualityScale,
      targetWidth: gifWidth,
      targetHeight: gifHeight,
    });
    if (!frames.length) throw new Error("Não foi possível gerar frames.");
    return new Promise((resolve, reject) => {
      window.gifshot.createGIF(
        {
          images: frames,
          gifWidth,
          gifHeight,
          interval: 1 / fps,
        },
        (result) => {
          if (!result || result.error) {
            reject(new Error("Falha ao gerar GIF."));
            return;
          }
          const blob = this._dataURLToBlob(result.image);
          if (download) this._downloadDataURL(result.image, filename);
          resolve(blob);
        },
      );
    });
  }

  async exportVideo({
    fps = 24,
    filename = "post-animado.webm",
    download = true,
    qualityScale = 1,
    videoBitsPerSecond = 12_000_000,
  } = {}) {
    if (typeof MediaRecorder === "undefined") {
      throw new Error("MediaRecorder não suportado neste navegador.");
    }
    const state = this._canvas.getState?.();
    const fmt = state?.formatId ? getFormat(state.formatId) : null;
    const base = document.getElementById(this._canvasId);
    const w = Math.round(fmt?.width ?? base?.clientWidth ?? 720);
    const h = Math.round(fmt?.height ?? base?.clientHeight ?? 720);
    const frames = await this._captureFrames(fps, {
      qualityScale,
      targetWidth: w,
      targetHeight: h,
    });
    if (!frames.length) throw new Error("Não foi possível gerar frames.");
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d");
    const stream = out.captureStream(fps);
    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";
    let recorder = null;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
    recorder.start();
    for (const frame of frames) {
      const img = await this._loadImage(frame);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      await this._wait(1000 / fps);
    }
    recorder.stop();
    await new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
    if (download) this._downloadBlob(blob, filename);
    return blob;
  }

  async _captureFrames(
    fps,
    { qualityScale = 1, targetWidth, targetHeight } = {},
  ) {
    const el = document.getElementById(this._canvasId);
    if (!el || !window.html2canvas) return [];
    const total = this._canvas.getAnimDuration() + 350;
    const interval = 1000 / fps;
    const frameCount = Math.max(2, Math.ceil(total / interval));
    const frames = [];
    const desiredW = Math.max(1, Number(targetWidth) || el.clientWidth || 1);
    const desiredH = Math.max(1, Number(targetHeight) || el.clientHeight || 1);
    const baseW = Math.max(1, el.clientWidth || desiredW);
    const baseH = Math.max(1, el.clientHeight || desiredH);
    const scaleW = desiredW / baseW;
    const scaleH = desiredH / baseH;
    const captureScale = Math.max(1, qualityScale, scaleW, scaleH);
    this._canvas.playAnimations();
    for (let i = 0; i < frameCount; i++) {
      const start = performance.now();
      const snapshot = await window.html2canvas(el, {
        useCORS: true,
        backgroundColor: null,
        logging: false,
        scale: captureScale,
      });
      frames.push(snapshot.toDataURL("image/png"));
      const elapsed = performance.now() - start;
      const rest = interval - elapsed;
      if (rest > 1) await this._wait(rest);
    }
    return frames;
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  _downloadDataURL(dataURL, filename) {
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  _dataURLToBlob(dataURL) {
    const [meta, data] = String(dataURL).split(",");
    const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "image/gif";
    const bytes = atob(data || "");
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
