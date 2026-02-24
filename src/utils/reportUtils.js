import { colorMatches } from './colorUtils';
import { rgbToHex } from './colorUtils';

/**
 * Build CSV content: one row per layer with Hex, R, G, B, Pixel count, Percentage.
 * Uses original image data; counts pixels matching each layer's color (with tolerance).
 * @param {{ color: {r,g,b}, tolerance?: number, name?: string }[]} layers
 * @param {ImageData} imageData
 * @returns {string} CSV string
 */
export function exportColorReportCSV(layers, imageData) {
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  const totalPixels = w * h;
  const header = 'Color (Hex),R,G,B,Pixel Count,Percentage';
  const rows = layers.map((layer) => {
    const tol = layer.tolerance ?? 10;
    const { r: tr, g: tg, b: tb } = layer.color;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      if (colorMatches(data[i], data[i + 1], data[i + 2], tr, tg, tb, tol)) count++;
    }
    const pct = totalPixels > 0 ? ((count / totalPixels) * 100).toFixed(2) : '0';
    const hex = rgbToHex(tr, tg, tb);
    return `${hex},${tr},${tg},${tb},${count},${pct}%`;
  });
  return [header, ...rows].join('\r\n');
}
