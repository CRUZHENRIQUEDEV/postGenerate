/* ============================================================
   ImageColorService — Recolor SVG and PNG images
   ============================================================ */

export class ImageColorService {
  recolorSVG(svgString, colorMap) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return svgString;

    const entries = Object.entries(colorMap);
    if (!entries.length) return svgString;

    const processNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node;

        const applyColor = (attr) => {
          const val = el.getAttribute(attr);
          if (!val) return;
          let changed = val;
          entries.forEach(([from, to]) => {
            changed = changed.replace(new RegExp(this._escapeRegex(from), "g"), to);
          });
          if (changed !== val) el.setAttribute(attr, changed);
        };

        applyColor("fill");
        applyColor("stroke");

        if (el.hasAttribute("style")) {
          let style = el.getAttribute("style");
          entries.forEach(([from, to]) => {
            style = style.replace(new RegExp(`fill\\s*:\\s*${this._escapeRegex(from)}`, "g"), `fill: ${to}`);
            style = style.replace(new RegExp(`stroke\\s*:\\s*${this._escapeRegex(from)}`, "g"), `stroke: ${to}`);
          });
          el.setAttribute("style", style);
        }

        const children = Array.from(el.children);
        children.forEach(processNode);
      }
    };

    processNode(svg);
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  }

  recolorSVGWithColor(svgString, newColor) {
    return this.recolorSVG(svgString, { "#000000": newColor, "#ffffff": newColor, "black": newColor, "white": newColor });
  }

  async recolorPNG(dataUrl, color, opacity = 1.0) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;
        const newR = parseInt(color.slice(1, 3), 16);
        const newG = parseInt(color.slice(3, 5), 16);
        const newB = parseInt(color.slice(5, 7), 16);

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha > 10) {
            if (opacity >= 1.0) {
              data[i] = newR;
              data[i + 1] = newG;
              data[i + 2] = newB;
            } else {
              data[i] = Math.round(newR * opacity + data[i] * (1 - opacity));
              data[i + 1] = Math.round(newG * opacity + data[i + 1] * (1 - opacity));
              data[i + 2] = Math.round(newB * opacity + data[i + 2] * (1 - opacity));
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async addOutlineToPNG(dataUrl, outlineColor, thickness = 2) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const w = img.width, h = img.height;
        const origData = ctx.getImageData(0, 0, w, h);
        const pixels = origData.data;

        const isFilled = (x, y) => {
          if (x < 0 || x >= w || y < 0 || y >= h) return false;
          return pixels[(y * w + x) * 4 + 3] > 10;
        };

        const hexColor = this._colorToHex(outlineColor);
        const outR = parseInt(hexColor.slice(1, 3), 16);
        const outG = parseInt(hexColor.slice(3, 5), 16);
        const outB = parseInt(hexColor.slice(5, 7), 16);

        const edgePixels = new Set();
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!isFilled(x, y)) continue;
            for (let tx = -thickness; tx <= thickness; tx++) {
              for (let ty = -thickness; ty <= thickness; ty++) {
                if (tx === 0 && ty === 0) continue;
                if (!isFilled(x + tx, y + ty)) {
                  edgePixels.add(y * w + x);
                  break;
                }
              }
              if (edgePixels.has(y * w + x)) break;
            }
          }
        }

        for (const idx of edgePixels) {
          const i = idx * 4;
          pixels[i] = outR;
          pixels[i + 1] = outG;
          pixels[i + 2] = outB;
        }

        ctx.putImageData(origData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async recolorImage(imageDataUrl, newColor, options = {}) {
    const { opacity = 1.0 } = options;
    if (imageDataUrl.startsWith("data:image/svg")) {
      const recolored = this.recolorSVGWithColor(imageDataUrl, newColor);
      return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(recolored)));
    }
    return await this.recolorPNG(imageDataUrl, newColor, opacity);
  }

  async replaceColor(dataUrl, targetColor, newColor) {
    const colorMap = { [targetColor]: newColor };
    if (dataUrl.startsWith("data:image/svg")) {
      const recolored = this.recolorSVG(dataUrl, colorMap);
      return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(recolored)));
    }
    return await this.recolorPNG(dataUrl, newColor, 1.0);
  }

  async recolorLayerWithCanvas(canvasEl, imageDataUrl, newColor, opacity = 0.7) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = newColor;
        ctx.globalAlpha = opacity;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  }

  _colorToHex(color) {
    if (!color) return "#ffffff";
    if (color.startsWith("#")) return color.slice(0, 7);
    if (color.startsWith("rgb")) {
      const m = color.match(/\d+/g);
      if (m && m.length >= 3) {
        return "#" + [m[0], m[1], m[2]].map(v => parseInt(v).toString(16).padStart(2, "0")).join("");
      }
    }
    return "#ffffff";
  }

  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export const imageColorService = new ImageColorService();
