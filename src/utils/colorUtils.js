/**
 * Color utilities for ColorErase Studio
 * Handles HEX/RGB conversion and tolerance-based color matching using RGB distance.
 */

/**
 * Convert hex color string to RGB object
 * @param {string} hex - e.g. "#ff0000" or "ff0000"
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex string
 * @param {number} r - 0-255
 * @param {number} g - 0-255
 * @param {number} b - 0-255
 * @returns {string} e.g. "#ff0000"
 */
export function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

/**
 * Euclidean distance between two RGB colors (0 - ~441).
 * Used for tolerance: tolerance 0 = exact match, 100 = very loose.
 * @param {number} r1,g1,b1 - First color
 * @param {number} r2,g2,b2 - Second color
 * @returns {number} Distance 0-442
 */
export function rgbDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
  );
}

/**
 * Max possible RGB distance (black to white) ≈ 441
 */
const MAX_RGB_DISTANCE = Math.sqrt(3 * 255 * 255);

/**
 * Convert tolerance slider (0-100) to actual pixel distance threshold.
 * 0 = 0 distance (exact), 100 = allow up to ~max distance (all colors).
 * @param {number} tolerancePercent - 0-100
 * @returns {number} Distance threshold (0 to ~441)
 */
export function toleranceToDistance(tolerancePercent) {
  if (tolerancePercent <= 0) return 0;
  return (tolerancePercent / 100) * MAX_RGB_DISTANCE;
}

/**
 * Check if pixel (r,g,b) matches target color within tolerance
 * @param {number} pr, pg, pb - Pixel RGB
 * @param {number} tr, tg, tb - Target RGB
 * @param {number} tolerancePercent - 0-100
 * @returns {boolean}
 */
export function colorMatches(pr, pg, pb, tr, tg, tb, tolerancePercent) {
  const threshold = toleranceToDistance(tolerancePercent);
  return rgbDistance(pr, pg, pb, tr, tg, tb) <= threshold;
}

/**
 * Quantize channel to N levels (0..levels-1). levels should be e.g. 8 or 16.
 */
function quantize(v, levels = 16) {
  return Math.min(levels - 1, Math.floor((v / 255) * levels));
}

/**
 * Extract dominant colors from ImageData by sampling and quantizing.
 * Returns up to maxColors unique colors, sorted by frequency (most common first).
 * @param {ImageData} imageData
 * @param {number} maxColors - e.g. 15–25
 * @param {number} sampleStep - sample every Nth pixel (higher = faster, less accurate)
 * @returns {{ r: number, g: number, b: number }[]}
 */
export function getDominantColors(imageData, maxColors = 20, sampleStep = 8) {
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  const count = {};
  const levels = 12; // quantize to 12 levels per channel -> 12^3 bins

  for (let y = 0; y < h; y += sampleStep) {
    for (let x = 0; x < w; x += sampleStep) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 128) continue; // skip transparent
      const qr = quantize(data[i], levels);
      const qg = quantize(data[i + 1], levels);
      const qb = quantize(data[i + 2], levels);
      const key = `${qr},${qg},${qb}`;
      count[key] = (count[key] || 0) + 1;
    }
  }

  const entries = Object.entries(count)
    .map(([key, c]) => {
      const [qr, qg, qb] = key.split(',').map(Number);
      return {
        r: Math.round((qr + 0.5) * (255 / levels)),
        g: Math.round((qg + 0.5) * (255 / levels)),
        b: Math.round((qb + 0.5) * (255 / levels)),
        count: c,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors);

  return entries.map(({ r, g, b }) => ({ r, g, b }));
}
