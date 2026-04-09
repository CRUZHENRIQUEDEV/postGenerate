/* ============================================================
   ImageTrimService — Detecta bounds reais de imagens
   e remove espaço transparente (trim)
   ============================================================ */

export class ImageTrimService {
  async trimPNG(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const data = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = data.data;

        let minX = img.width, minY = img.height, maxX = 0, maxY = 0;

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            const alpha = pixels[i + 3];
            if (alpha > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < minX || maxY < minY) {
          resolve(dataUrl);
          return;
        }

        const padding = 2;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(img.width - 1, maxX + padding);
        maxY = Math.min(img.height - 1, maxY + padding);

        const trimW = maxX - minX + 1;
        const trimH = maxY - minY + 1;

        const trimmed = document.createElement("canvas");
        trimmed.width = trimW;
        trimmed.height = trimH;
        const tCtx = trimmed.getContext("2d");
        tCtx.drawImage(img, minX, minY, trimW, trimH, 0, 0, trimW, trimH);

        resolve(trimmed.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async getImageBounds(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;

        let minX = img.width, minY = img.height, maxX = 0, maxY = 0;

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            const alpha = pixels[i + 3];
            if (alpha > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < minX || maxY < minY) {
          resolve({ x: 0, y: 0, width: img.width, height: img.height, hasContent: false });
          return;
        }

        resolve({
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
          hasContent: true,
          originalWidth: img.width,
          originalHeight: img.height,
        });
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async fitImageToLayer(dataUrl, targetWidthPct, targetHeightPct, formatId = "ig-feed-square") {
    const bounds = await this.getImageBounds(dataUrl);
    if (!bounds.hasContent) return { dataUrl, width: targetWidthPct, height: targetHeightPct };

    const aspectRatio = bounds.width / bounds.height;
    const targetAspect = targetWidthPct / targetHeightPct;

    let newWidth, newHeight;
    if (aspectRatio > targetAspect) {
      newWidth = targetWidthPct;
      newHeight = targetWidthPct / aspectRatio;
    } else {
      newHeight = targetHeightPct;
      newWidth = targetHeightPct * aspectRatio;
    }

    return {
      dataUrl,
      width: Math.min(newWidth, 90),
      height: Math.min(newHeight, 90),
      bounds,
    };
  }
}

export const imageTrimService = new ImageTrimService();
