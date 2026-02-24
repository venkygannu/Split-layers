import { rgbToHex } from './colorUtils';

/**
 * Create a new color layer. Each layer = one color + a mask (1=keep, 0=erase).
 * When viewing "isolate", only this color is shown. Erase/paint tools edit the mask.
 * @param {object} color - { r, g, b }
 * @param {string} [id] - Optional id
 * @param {Uint8Array | null} [mask] - Optional; if null, caller must init when dimensions known
 */
export function createLayer(color, id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, mask = null) {
  return {
    id,
    color: { r: color.r, g: color.g, b: color.b },
    name: rgbToHex(color.r, color.g, color.b),
    visible: true,
    tolerance: 10,
    mask, // Uint8Array same size as image: 1 = keep this color here, 0 = erase
  };
}

/**
 * Create a full mask (all keep) for given dimensions.
 */
export function createFullMask(width, height) {
  const m = new Uint8Array(width * height);
  m.fill(1);
  return m;
}

export function layerDisplayName(layer) {
  return layer.name || rgbToHex(layer.color.r, layer.color.g, layer.color.b);
}
