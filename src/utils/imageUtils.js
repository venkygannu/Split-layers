import { colorMatches } from './colorUtils';

/**
 * Invert RGB (negative to positive). Alpha unchanged.
 * @param {ImageData} imageData
 */
export function invertImageData(imageData) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  return imageData;
}

/**
 * Export a single layer as ImageData: only pixels matching the layer (with mask) are opaque; rest transparent.
 * @param {ImageData} originalImageData
 * @param {{ color: {r,g,b}, tolerance?: number, mask: Uint8Array }} layer
 * @returns {ImageData}
 */
export function exportLayerToImageData(originalImageData, layer) {
  const { width: w, height: h, data: src } = originalImageData;
  const out = new ImageData(w, h);
  const outData = out.data;
  const mask = layer.mask;
  const tol = layer.tolerance ?? 10;
  const { r: tr, g: tg, b: tb } = layer.color;
  for (let i = 0; i < src.length; i += 4) {
    const idx = i / 4;
    const keep = mask && mask[idx] === 1;
    const match = colorMatches(src[i], src[i + 1], src[i + 2], tr, tg, tb, tol);
    if (keep && match && src[i + 3] > 0) {
      outData[i] = src[i];
      outData[i + 1] = src[i + 1];
      outData[i + 2] = src[i + 2];
      outData[i + 3] = src[i + 3];
    }
  }
  return out;
}

/**
 * Export multiple layers as a single ImageData (reconstructed image).
 * A pixel is visible if it belongs to any of the given layers (mask + color match).
 * @param {ImageData} originalImageData
 * @param {Array<{ id: string, color, tolerance?, mask }>} layers
 * @param {Set<string>|string[]} layerIds - ids of layers to include
 * @returns {ImageData}
 */
export function exportReconstructedImageData(originalImageData, layers, layerIds) {
  const ids = layerIds instanceof Set ? layerIds : new Set(layerIds);
  const selected = layers.filter((l) => ids.has(l.id));
  if (selected.length === 0) {
    const { width: w, height: h } = originalImageData;
    return new ImageData(w, h);
  }
  const { width: w, height: h, data: src } = originalImageData;
  const len = w * h * 4;
  const result = new Uint8ClampedArray(len);
  // First in list = top (drawn last), last in list = bottom
  for (let i = 0; i < len; i += 4) {
    const idx = i / 4;
    for (let j = selected.length - 1; j >= 0; j--) {
      const layer = selected[j];
      const mask = layer.mask;
      const tol = layer.tolerance ?? 10;
      const { r: tr, g: tg, b: tb } = layer.color;
      let lr = 0, lg = 0, lb = 0, la = 0;
      if (mask && mask[idx] === 1 && colorMatches(src[i], src[i + 1], src[i + 2], tr, tg, tb, tol) && src[i + 3] > 0) {
        lr = src[i]; lg = src[i + 1]; lb = src[i + 2]; la = src[i + 3];
      }
      const pd = layer.paintData;
      if (pd && pd[i + 3] > 0) {
        const pA = pd[i + 3] / 255;
        if (la > 0) {
          const bA = la / 255;
          const oA = pA + bA * (1 - pA);
          lr = (pd[i] * pA + lr * bA * (1 - pA)) / oA;
          lg = (pd[i + 1] * pA + lg * bA * (1 - pA)) / oA;
          lb = (pd[i + 2] * pA + lb * bA * (1 - pA)) / oA;
          la = Math.round(oA * 255);
        } else {
          lr = pd[i]; lg = pd[i + 1]; lb = pd[i + 2]; la = pd[i + 3];
        }
      }
      if (la > 0) {
        const sA = la / 255;
        const dA = result[i + 3] / 255;
        const oA = sA + dA * (1 - sA);
        if (oA > 0) {
          result[i] = Math.round((lr * sA + result[i] * dA * (1 - sA)) / oA);
          result[i + 1] = Math.round((lg * sA + result[i + 1] * dA * (1 - sA)) / oA);
          result[i + 2] = Math.round((lb * sA + result[i + 2] * dA * (1 - sA)) / oA);
          result[i + 3] = Math.round(oA * 255);
        }
      }
    }
  }
  return new ImageData(result, w, h);
}

/**
 * Merge new paint (RGBA) on top of existing layer paint. "New over base" alpha blend.
 * @param {Uint8ClampedArray | null} existing - existing layer paint or null
 * @param {Uint8ClampedArray} newData - new paint (e.g. overlay)
 * @param {number} w - width
 * @param {number} h - height
 * @returns {Uint8ClampedArray}
 */
export function mergePaintOverlay(existing, newData, w, h) {
  const len = w * h * 4;
  const out = new Uint8ClampedArray(len);
  for (let i = 0; i < len; i += 4) {
    const nA = newData[i + 3] / 255;
    if (existing) {
      const eA = existing[i + 3] / 255;
      out[i] = newData[i] * nA + existing[i] * eA * (1 - nA);
      out[i + 1] = newData[i + 1] * nA + existing[i + 1] * eA * (1 - nA);
      out[i + 2] = newData[i + 2] * nA + existing[i + 2] * eA * (1 - nA);
      out[i + 3] = Math.round(255 * (nA + eA * (1 - nA)));
    } else {
      out[i] = newData[i];
      out[i + 1] = newData[i + 1];
      out[i + 2] = newData[i + 2];
      out[i + 3] = newData[i + 3];
    }
  }
  return out;
}

/**
 * Convert ImageData to PNG data URL (e.g. for replacing the current image).
 * @param {ImageData} imageData
 * @returns {string}
 */
export function imageDataToDataUrl(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Get ImageData from an image URL (data URL or blob URL).
 * @param {string} url
 * @returns {Promise<{ imageData: ImageData, width: number, height: number }>}
 */
export function getImageDataFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      resolve({ imageData, width: w, height: h });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Apply brightness/contrast/saturation to ImageData (in place).
 * @param {ImageData} imageData
 * @param {{ brightness?: number, contrast?: number, saturation?: number }} opts - each -100..100 (0 = no change)
 */
export function adjustImageData(imageData, opts = {}) {
  const { brightness = 0, contrast = 0, saturation = 0 } = opts;
  const data = imageData.data;
  const b = 1 + brightness / 100;
  const c = 1 + contrast / 100;
  const s = 1 + saturation / 100;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b_ = data[i + 2];
    r = Math.max(0, Math.min(255, (r - 127.5) * c * b + 127.5));
    g = Math.max(0, Math.min(255, (g - 127.5) * c * b + 127.5));
    b_ = Math.max(0, Math.min(255, (b_ - 127.5) * c * b + 127.5));
    if (s !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b_;
      r = Math.max(0, Math.min(255, gray + (r - gray) * s));
      g = Math.max(0, Math.min(255, gray + (g - gray) * s));
      b_ = Math.max(0, Math.min(255, gray + (b_ - gray) * s));
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b_;
  }
  return imageData;
}

/**
 * Replace all pixels matching fromColor (within tolerance 0–100) with toColor.
 * Modifies imageData in place.
 */
export function replaceColorInImageData(imageData, fromColor, toColor, tolerancePercent = 10) {
  const data = imageData.data;
  const maxDist = Math.sqrt(3 * 255 * 255);
  const threshold = (tolerancePercent / 100) * maxDist;
  const { r: fr, g: fg, b: fb } = fromColor;
  const { r: tr, g: tg, b: tb } = toColor;
  const dist = (r1, g1, b1, r2, g2, b2) =>
    Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  for (let i = 0; i < data.length; i += 4) {
    if (dist(data[i], data[i + 1], data[i + 2], fr, fg, fb) <= threshold) {
      data[i] = tr;
      data[i + 1] = tg;
      data[i + 2] = tb;
    }
  }
  return imageData;
}

/**
 * Rotate ImageData by 90 (cw), -90 (ccw), or 180. Returns new ImageData.
 */
export function rotateImageData(imageData, degrees) {
  const { width: w, height: h, data } = imageData;
  const out = new Uint8ClampedArray(data.length);
  if (degrees === 180) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const j = ((h - 1 - y) * w + (w - 1 - x)) * 4;
        out[j] = data[i];
        out[j + 1] = data[i + 1];
        out[j + 2] = data[i + 2];
        out[j + 3] = data[i + 3];
      }
    }
    return new ImageData(out, w, h);
  }
  if (degrees === 90) {
    const outW = h;
    const outH = w;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const j = (x * outW + (outW - 1 - y)) * 4;
        out[j] = data[i];
        out[j + 1] = data[i + 1];
        out[j + 2] = data[i + 2];
        out[j + 3] = data[i + 3];
      }
    }
    return new ImageData(out, outW, outH);
  }
  if (degrees === -90) {
    const outW = h;
    const outH = w;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const j = ((outH - 1 - x) * outW + y) * 4;
        out[j] = data[i];
        out[j + 1] = data[i + 1];
        out[j + 2] = data[i + 2];
        out[j + 3] = data[i + 3];
      }
    }
    return new ImageData(out, outW, outH);
  }
  return imageData;
}

/**
 * Flip ImageData horizontally and/or vertically (in place).
 */
export function flipImageData(imageData, horizontal, vertical) {
  const { width: w, height: h, data } = imageData;
  const copy = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = horizontal ? w - 1 - x : x;
      const sy = vertical ? h - 1 - y : y;
      const i = (y * w + x) * 4;
      const j = (sy * w + sx) * 4;
      data[i] = copy[j];
      data[i + 1] = copy[j + 1];
      data[i + 2] = copy[j + 2];
      data[i + 3] = copy[j + 3];
    }
  }
  return imageData;
}

/**
 * Crop ImageData to rect { x, y, width, height }. Returns new ImageData.
 */
export function cropImageData(imageData, rect) {
  const { x, y, width: cw, height: ch } = rect;
  const out = new ImageData(cw, ch);
  const src = imageData.data;
  const w = imageData.width;
  for (let dy = 0; dy < ch; dy++) {
    for (let dx = 0; dx < cw; dx++) {
      const sx = x + dx;
      const sy = y + dy;
      const si = (sy * w + sx) * 4;
      const oi = (dy * cw + dx) * 4;
      out.data[oi] = src[si];
      out.data[oi + 1] = src[si + 1];
      out.data[oi + 2] = src[si + 2];
      out.data[oi + 3] = src[si + 3];
    }
  }
  return out;
}

/**
 * Crop a 1-channel mask (Uint8Array, row-major) to rect. Returns new Uint8Array.
 */
export function cropMask(mask, srcWidth, rect) {
  const { x, y, width: cw, height: ch } = rect;
  const out = new Uint8Array(cw * ch);
  for (let dy = 0; dy < ch; dy++) {
    for (let dx = 0; dx < cw; dx++) {
      const sx = x + dx;
      const sy = y + dy;
      out[dy * cw + dx] = mask[sy * srcWidth + sx];
    }
  }
  return out;
}

/**
 * Rotate a 1-channel mask by 90, -90, or 180. (w,h) original size.
 */
export function rotateMask(mask, w, h, degrees) {
  const out = degrees === 90 || degrees === -90 ? new Uint8Array(h * w) : new Uint8Array(mask.length);
  const outW = degrees === 90 || degrees === -90 ? h : w;
  const outH = degrees === 90 || degrees === -90 ? w : h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ox, oy;
      if (degrees === 180) {
        ox = w - 1 - x;
        oy = h - 1 - y;
      } else if (degrees === 90) {
        ox = outW - 1 - y;
        oy = x;
      } else if (degrees === -90) {
        ox = y;
        oy = outH - 1 - x;
      } else {
        continue;
      }
      out[oy * outW + ox] = mask[y * w + x];
    }
  }
  return out;
}

/**
 * Flip a 1-channel mask (in place). (w, h) size.
 */
export function flipMask(mask, w, h, horizontal, vertical) {
  const copy = new Uint8Array(mask);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = horizontal ? w - 1 - x : x;
      const sy = vertical ? h - 1 - y : y;
      mask[y * w + x] = copy[sy * w + sx];
    }
  }
  return mask;
}

/**
 * Stitch multiple image URLs into one. layout: 'horizontal' | 'vertical' | 'grid'
 * @param {string[]} urls
 * @param {'horizontal'|'vertical'|'grid'} layout
 * @returns {Promise<string>} data URL of stitched image
 */
export async function stitchImages(urls, layout = 'horizontal') {
  if (urls.length === 0) throw new Error('No images');
  const loaded = await Promise.all(
    urls.map((url) =>
      getImageDataFromUrl(url).then(({ imageData, width, height }) => ({
        imageData,
        width,
        height,
      }))
    )
  );

  let totalW, totalH, draw;
  if (layout === 'horizontal') {
    totalW = loaded.reduce((s, i) => s + i.width, 0);
    totalH = Math.max(...loaded.map((i) => i.height));
    draw = (ctx) => {
      let x = 0;
      for (const { imageData, width, height } of loaded) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').putImageData(imageData, 0, 0);
        ctx.drawImage(canvas, x, 0, width, height);
        x += width;
      }
    };
  } else if (layout === 'vertical') {
    totalW = Math.max(...loaded.map((i) => i.width));
    totalH = loaded.reduce((s, i) => s + i.height, 0);
    draw = (ctx) => {
      let y = 0;
      for (const { imageData, width, height } of loaded) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').putImageData(imageData, 0, 0);
        ctx.drawImage(canvas, 0, y, width, height);
        y += height;
      }
    };
  } else {
    const cols = Math.ceil(Math.sqrt(loaded.length));
    const rows = Math.ceil(loaded.length / cols);
    const maxW = Math.max(...loaded.map((i) => i.width));
    const maxH = Math.max(...loaded.map((i) => i.height));
    totalW = cols * maxW;
    totalH = rows * maxH;
    draw = (ctx) => {
      loaded.forEach(({ imageData, width, height }, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').putImageData(imageData, 0, 0);
        ctx.drawImage(canvas, col * maxW, row * maxH, width, height);
      });
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  draw(ctx);
  return canvas.toDataURL('image/png');
}
