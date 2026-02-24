import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colorMatches } from '../utils/colorUtils';
import { createFullMask } from '../utils/layerUtils';
import { adjustImageData, exportReconstructedImageData } from '../utils/imageUtils';

/**
 * Canvas: view modes (whole/isolate), erase/paint with working mask ref to avoid lag.
 * Highlight uses original image + layer mask so outline shows only "kept" pixels.
 */
const CANVAS_CONTEXT_OPTIONS = { willReadFrequently: true };

/** Circular brush cursor; positioned relative to canvas container so it matches pointer */
function BrushCursor({ show, brushSize, toolMode, position }) {
  if (!show || !position || !position.rect) return null;
  const rect = position.rect;
  const left = position.x - rect.left;
  const top = position.y - rect.top;
  const scale = rect.width / (position.canvasW || 1);
  const diameterPx = Math.max(12, Math.min(150, 2 * brushSize * scale));
  const isErase = toolMode === 'erase';
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-full border-2 bg-transparent"
      style={{
        left,
        top,
        width: diameterPx,
        height: diameterPx,
        transform: 'translate(-50%, -50%)',
        borderColor: isErase ? '#1f2937' : '#7c3aed',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
      }}
      aria-hidden
    />
  );
}

const CanvasEditor = forwardRef(function CanvasEditor(
  {
    imageUrl,
    layers = [],
    selectedLayerId,
    viewMode = 'whole',
    toolMode = 'eyedropper',
    selectedLayerMask,
    onMaskPaint,
    onImageReady,
    onPickColor,
    onDimensions,
    onProcessingChange,
    isProcessing,
    highlightOn,
    brushSize = 20,
    paintColor = { r: 255, g: 0, b: 0 },
    paintOpacity = 100,
    adjustments = { brightness: 0, contrast: 0, saturation: 0 },
    editorMode = 'split',
    reconstructLayerIds,
    selectedLayerPaintData = null,
    onCommitPaint,
  },
  ref
) {
  const reconstructMode = editorMode === 'reconstruct';
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const originalImageRef = useRef(null);
  const originalImageDataRef = useRef(null);
  const paintOverlayRef = useRef(null);
  const isDrawingRef = useRef(false);
  const didMoveRef = useRef(false);
  const workingMaskRef = useRef(null);
  const rafScheduledRef = useRef(false);
  const [drawVersion, setDrawVersion] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [brushCursorPos, setBrushCursorPos] = useState(null);
  const canvasWrapperRef = useRef(null);

  // Store callbacks in refs so image-load effect doesn't re-fire when they change
  const onDimensionsRef = useRef(onDimensions);
  onDimensionsRef.current = onDimensions;
  const onImageReadyRef = useRef(onImageReady);
  onImageReadyRef.current = onImageReady;
  const onProcessingChangeRef = useRef(onProcessingChange);
  onProcessingChangeRef.current = onProcessingChange;
  const paintColorRef = useRef(paintColor);
  paintColorRef.current = paintColor;
  const paintOpacityRef = useRef(paintOpacity);
  paintOpacityRef.current = paintOpacity;
  const brushSizeRef = useRef(brushSize);
  brushSizeRef.current = brushSize;

  const getCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    return { x, y };
  }, []);

  // Only depends on imageUrl — callbacks are read from refs
  useEffect(() => {
    if (!imageUrl) {
      originalImageRef.current = null;
      originalImageDataRef.current = null;
      paintOverlayRef.current = null;
      setImageLoaded(false);
      return;
    }
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      originalImageRef.current = img;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', CANVAS_CONTEXT_OPTIONS);
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'high';
      }
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.width = w;
        overlay.height = h;
      }
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d', CANVAS_CONTEXT_OPTIONS);
      let imageData = null;
      if (octx) {
        octx.drawImage(img, 0, 0);
        imageData = octx.getImageData(0, 0, w, h);
        originalImageDataRef.current = imageData;
      }
      paintOverlayRef.current = new ImageData(new Uint8ClampedArray(w * h * 4), w, h);
      setImageLoaded(true);
      setDrawVersion((v) => v + 1);
      onDimensionsRef.current?.({ width: w, height: h });
      if (imageData) onImageReadyRef.current?.(imageData);
    };
    img.onerror = () => {
      onProcessingChangeRef.current?.(false);
    };
    img.src = imageUrl;
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  // Sync overlay from selected layer's paint when layer or paint data changes
  useEffect(() => {
    const overlay = paintOverlayRef.current;
    if (!overlay || !imageLoaded) return;
    if (selectedLayerPaintData && selectedLayerPaintData.length === overlay.data.length) {
      overlay.data.set(selectedLayerPaintData);
    } else {
      overlay.data.fill(0);
    }
    setDrawVersion((v) => v + 1);
  }, [imageLoaded, selectedLayerId, selectedLayerPaintData]);

  const applyLayerMask = useCallback((imageData, layer, w, h, maskOverride) => {
    const data = imageData.data;
    const mask = maskOverride ?? layer.mask;
    if (!mask) return;
    const tol = layer.tolerance ?? 10;
    const { r: tr, g: tg, b: tb } = layer.color;
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      if (mask[idx] === 1) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (colorMatches(r, g, b, tr, tg, tb, tol)) {
        data[i + 3] = 0;
      }
    }
  }, []);

  // Redraw: use workingMaskRef for selected layer during drag to avoid lag
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    const origData = originalImageDataRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d', CANVAS_CONTEXT_OPTIONS);
    const w = canvas.width;
    const h = canvas.height;
    const workingMask = workingMaskRef.current;

    const reconSet = reconstructLayerIds instanceof Set ? reconstructLayerIds : (reconstructLayerIds ? new Set(reconstructLayerIds) : new Set());
    const showReconstruct = reconstructMode && reconSet.size > 0;

    const id = requestAnimationFrame(() => {
      if (showReconstruct && origData) {
        const reconstructed = exportReconstructedImageData(origData, layers, reconSet);
        const hasAdj =
          (adjustments?.brightness ?? 0) !== 0 ||
          (adjustments?.contrast ?? 0) !== 0 ||
          (adjustments?.saturation ?? 0) !== 0;
        if (hasAdj) adjustImageData(reconstructed, adjustments);
        ctx.putImageData(reconstructed, 0, 0);
      } else if (viewMode === 'isolate' && selectedLayerId && selectedLayer) {
        const layer = selectedLayer;
        const mask = workingMask ?? layer.mask;
        const tol = layer.tolerance ?? 10;
        let src = origData?.data;
        if (!src || !mask) {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
          return;
        }
        const hasAdj =
          (adjustments?.brightness ?? 0) !== 0 ||
          (adjustments?.contrast ?? 0) !== 0 ||
          (adjustments?.saturation ?? 0) !== 0;
        if (hasAdj) {
          const adjusted = new ImageData(new Uint8ClampedArray(src), w, h);
          adjustImageData(adjusted, adjustments);
          src = adjusted.data;
        }
        const out = ctx.createImageData(w, h);
        const { r: tr, g: tg, b: tb } = layer.color;
        for (let i = 0; i < src.length; i += 4) {
          const idx = i / 4;
          const keep = mask[idx] === 1;
          const match = colorMatches(src[i], src[i + 1], src[i + 2], tr, tg, tb, tol);
          if (keep && match && src[i + 3] > 0) {
            out.data[i] = src[i];
            out.data[i + 1] = src[i + 1];
            out.data[i + 2] = src[i + 2];
            out.data[i + 3] = src[i + 3];
          } else {
            out.data[i + 3] = 0;
          }
        }
        // Blend committed paint and working overlay on top (paint anywhere, even transparent areas)
        const layerPaint = layer.paintData;
        const overlay = paintOverlayRef.current;
        if (layerPaint || overlay) {
          const opacity = Math.max(0, Math.min(1, paintOpacity / 100));
          for (let i = 0; i < out.data.length; i += 4) {
            if (layerPaint && layerPaint[i + 3] > 0) {
              const pA = (layerPaint[i + 3] / 255) * opacity;
              out.data[i] = out.data[i] * (1 - pA) * (out.data[i + 3] / 255) + layerPaint[i] * pA;
              out.data[i + 1] = out.data[i + 1] * (1 - pA) * (out.data[i + 3] / 255) + layerPaint[i + 1] * pA;
              out.data[i + 2] = out.data[i + 2] * (1 - pA) * (out.data[i + 3] / 255) + layerPaint[i + 2] * pA;
              out.data[i + 3] = Math.round(Math.min(255, out.data[i + 3] + (255 - out.data[i + 3]) * pA));
            }
            if (overlay && overlay.data[i + 3] > 0) {
              const t = (overlay.data[i + 3] / 255) * opacity;
              out.data[i] = out.data[i] * (1 - t) * (out.data[i + 3] / 255) + overlay.data[i] * t;
              out.data[i + 1] = out.data[i + 1] * (1 - t) * (out.data[i + 3] / 255) + overlay.data[i + 1] * t;
              out.data[i + 2] = out.data[i + 2] * (1 - t) * (out.data[i + 3] / 255) + overlay.data[i + 2] * t;
              out.data[i + 3] = Math.round(Math.min(255, out.data[i + 3] + (255 - out.data[i + 3]) * t));
            }
          }
        }
        ctx.putImageData(out, 0, 0);
      } else {
        // Full-image view: start with the original image, then apply layer masks (subtractive)
        if (!origData) {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
        } else {
          const hasAdjustments =
            (adjustments?.brightness ?? 0) !== 0 ||
            (adjustments?.contrast ?? 0) !== 0 ||
            (adjustments?.saturation ?? 0) !== 0;
          const src = hasAdjustments
            ? (() => {
                const adj = new ImageData(new Uint8ClampedArray(origData.data), w, h);
                adjustImageData(adj, adjustments);
                return adj.data;
              })()
            : origData.data;
          const len = w * h * 4;
          const result = new Uint8ClampedArray(len);
          const opacity = Math.max(0, Math.min(1, paintOpacity / 100));
          const overlay = paintOverlayRef.current;

          // Paper-cutout stacking: first in list = top (drawn last), last in list = bottom (drawn first).
          for (let i = 0; i < len; i += 4) {
            const idx = i / 4;
            let rR = 0, rG = 0, rB = 0, rA = 0;
            let matchedAny = false;

            for (let j = layers.length - 1; j >= 0; j--) {
              const layer = layers[j];
              if (!layer.visible) continue;
              const mask = (layer.id === selectedLayerId && workingMask) ? workingMask : layer.mask;
              if (!mask) continue;
              const tol = layer.tolerance ?? 10;
              const { r: tr, g: tg, b: tb } = layer.color;
              const pixelMatch = colorMatches(src[i], src[i + 1], src[i + 2], tr, tg, tb, tol) && src[i + 3] > 0;
              if (pixelMatch) matchedAny = true;

              // Build this layer's pixel: color content + paint
              let lr = 0, lg = 0, lb = 0, la = 0;
              if (pixelMatch && mask[idx] === 1) {
                lr = src[i]; lg = src[i + 1]; lb = src[i + 2]; la = src[i + 3];
              }

              // Blend committed paint onto this layer's pixel
              const pd = layer.paintData;
              if (pd && pd[i + 3] > 0) {
                const pA = (pd[i + 3] / 255) * opacity;
                if (la > 0) {
                  const bA = la / 255;
                  const oA = pA + bA * (1 - pA);
                  lr = (pd[i] * pA + lr * bA * (1 - pA)) / oA;
                  lg = (pd[i + 1] * pA + lg * bA * (1 - pA)) / oA;
                  lb = (pd[i + 2] * pA + lb * bA * (1 - pA)) / oA;
                  la = Math.round(oA * 255);
                } else {
                  lr = pd[i]; lg = pd[i + 1]; lb = pd[i + 2];
                  la = Math.round(pA * 255);
                }
              }

              // Blend working overlay for selected layer's current stroke
              if (layer.id === selectedLayerId && overlay && overlay.data[i + 3] > 0) {
                const t = (overlay.data[i + 3] / 255) * opacity;
                if (la > 0) {
                  const bA = la / 255;
                  const oA = t + bA * (1 - t);
                  lr = (overlay.data[i] * t + lr * bA * (1 - t)) / oA;
                  lg = (overlay.data[i + 1] * t + lg * bA * (1 - t)) / oA;
                  lb = (overlay.data[i + 2] * t + lb * bA * (1 - t)) / oA;
                  la = Math.round(oA * 255);
                } else {
                  lr = overlay.data[i]; lg = overlay.data[i + 1]; lb = overlay.data[i + 2];
                  la = Math.round(t * 255);
                }
              }

              // Source-over: composite this layer onto the running result
              if (la > 0) {
                const sA = la / 255;
                const dA = rA / 255;
                const oA = sA + dA * (1 - sA);
                if (oA > 0) {
                  rR = (lr * sA + rR * dA * (1 - sA)) / oA;
                  rG = (lg * sA + rG * dA * (1 - sA)) / oA;
                  rB = (lb * sA + rB * dA * (1 - sA)) / oA;
                  rA = Math.round(oA * 255);
                }
              }
            }

            // Background: pixels not matched by any layer show the original image
            if (!matchedAny && src[i + 3] > 0) {
              const sA = rA / 255;
              const dA = src[i + 3] / 255;
              const oA = sA + dA * (1 - sA);
              if (oA > 0) {
                rR = (rR * sA + src[i] * dA * (1 - sA)) / oA;
                rG = (rG * sA + src[i + 1] * dA * (1 - sA)) / oA;
                rB = (rB * sA + src[i + 2] * dA * (1 - sA)) / oA;
                rA = Math.round(oA * 255);
              }
            }

            result[i] = Math.round(rR);
            result[i + 1] = Math.round(rG);
            result[i + 2] = Math.round(rB);
            result[i + 3] = rA;
          }
          ctx.putImageData(new ImageData(result, w, h), 0, 0);
        }
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    imageLoaded,
    viewMode,
    selectedLayerId,
    selectedLayer,
    layers,
    applyLayerMask,
    drawVersion,
    paintColor,
    paintOpacity,
    adjustments,
    editorMode,
    reconstructLayerIds,
  ]);

  // Highlight: outline where selected layer's color exists AND mask is 1 (using original image)
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const origData = originalImageDataRef.current;
    if (!canvas || !overlay || viewMode !== 'whole' || !selectedLayer || !highlightOn) {
      if (overlay && overlay.getContext) overlay.getContext('2d').clearRect(0, 0, overlay.width || 0, overlay.height || 0);
      return;
    }

    const w = canvas.width;
    const h = canvas.height;
    const ctx = overlay.getContext('2d', CANVAS_CONTEXT_OPTIONS);
    ctx.clearRect(0, 0, w, h);

    const id = requestAnimationFrame(() => {
      const src = origData?.data;
      const mask = selectedLayer.mask;
      if (!src || !mask) return;

      const total = w * h;
      const tol = selectedLayer.tolerance ?? 10;
      const { r: tr, g: tg, b: tb } = selectedLayer.color;
      const overlayData = ctx.createImageData(w, h);

      const match = new Uint8Array(total);
      for (let i = 0; i < src.length; i += 4) {
        const idx = i / 4;
        if (mask[idx] !== 1) continue;
        if (src[i + 3] > 0 && colorMatches(src[i], src[i + 1], src[i + 2], tr, tg, tb, tol)) {
          match[idx] = 1;
        }
      }

      const isEdge = new Uint8Array(total);
      const stroke2 = new Uint8Array(total);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (match[idx] === 0) continue;
          const hasNonMatch =
            (x > 0 && match[idx - 1] === 0) ||
            (x < w - 1 && match[idx + 1] === 0) ||
            (y > 0 && match[idx - w] === 0) ||
            (y < h - 1 && match[idx + w] === 0);
          if (hasNonMatch) {
            isEdge[idx] = 1;
            stroke2[idx] = 1;
            if (x > 0) stroke2[idx - 1] = 1;
            if (x < w - 1) stroke2[idx + 1] = 1;
            if (y > 0) stroke2[idx - w] = 1;
            if (y < h - 1) stroke2[idx + w] = 1;
          }
        }
      }
      for (let i = 0; i < src.length; i += 4) {
        const idx = i / 4;
        if (stroke2[idx] > 0) {
          overlayData.data[i] = 0;
          overlayData.data[i + 1] = 255;
          overlayData.data[i + 2] = 255;
          overlayData.data[i + 3] = isEdge[idx] ? 255 : 180;
        }
      }
      ctx.putImageData(overlayData, 0, 0);
    });
    return () => cancelAnimationFrame(id);
  }, [viewMode, selectedLayer, highlightOn, imageUrl, layers, drawVersion]);

  const paintMaskAt = useCallback(
    (x, y, value, maskRef) => {
      const canvas = canvasRef.current;
      if (!canvas || !selectedLayerId) return;
      const w = canvas.width;
      const h = canvas.height;
      const size = brushSizeRef.current;
      const mask = maskRef.current ?? createFullMask(w, h);
      if (!maskRef.current) maskRef.current = new Uint8Array(mask);
      const next = maskRef.current;
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          if (dx * dx + dy * dy > size * size) continue;
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            next[py * w + px] = value;
          }
        }
      }
    },
    [selectedLayerId]
  );

  const paintColorAt = useCallback(
    (x, y) => {
      const overlay = paintOverlayRef.current;
      if (!overlay) return;
      const w = overlay.width;
      const h = overlay.height;
      const data = overlay.data;
      const size = brushSizeRef.current;
      const { r, g, b } = paintColorRef.current;
      const a = Math.round((paintOpacityRef.current / 100) * 255);
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          if (dx * dx + dy * dy > size * size) continue;
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const i = (py * w + px) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a;
          }
        }
      }
    },
    []
  );

  const scheduleDraw = useCallback(() => {
    if (rafScheduledRef.current) return;
    rafScheduledRef.current = true;
    requestAnimationFrame(() => {
      rafScheduledRef.current = false;
      setDrawVersion((v) => v + 1);
    });
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      const coords = getCoords(e);
      if (!coords) return;
      isDrawingRef.current = true;
      didMoveRef.current = false;
      if (toolMode === 'paint') {
        paintColorAt(coords.x, coords.y);
        scheduleDraw();
      } else if (toolMode === 'erase' && selectedLayerId && onMaskPaint) {
        const w = canvasRef.current?.width ?? 0;
        const h = canvasRef.current?.height ?? 0;
        const current = selectedLayerMask ?? createFullMask(w, h);
        workingMaskRef.current = new Uint8Array(current);
        paintMaskAt(coords.x, coords.y, 0, workingMaskRef);
        scheduleDraw();
      }
    },
    [getCoords, toolMode, selectedLayerId, selectedLayerMask, onMaskPaint, paintMaskAt, paintColorAt, scheduleDraw]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const coords = getCoords(e);
      if (!coords) return;
      if (isDrawingRef.current && toolMode === 'paint') {
        didMoveRef.current = true;
        paintColorAt(coords.x, coords.y);
        scheduleDraw();
      } else if (isDrawingRef.current && toolMode === 'erase' && selectedLayerId && workingMaskRef.current) {
        didMoveRef.current = true;
        paintMaskAt(coords.x, coords.y, 0, workingMaskRef);
        scheduleDraw();
      }
    },
    [getCoords, toolMode, selectedLayerId, paintMaskAt, scheduleDraw]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!isDrawingRef.current) return;
      const wasDrawing = didMoveRef.current;
      if (wasDrawing && toolMode === 'erase' && workingMaskRef.current && selectedLayerId && onMaskPaint) {
        onMaskPaint(selectedLayerId, new Uint8Array(workingMaskRef.current));
      }
      if (wasDrawing && toolMode === 'paint' && selectedLayerId && onCommitPaint) {
        const overlay = paintOverlayRef.current;
        if (overlay) {
          onCommitPaint(selectedLayerId, {
            data: new Uint8ClampedArray(overlay.data),
            width: overlay.width,
            height: overlay.height,
          });
        }
      }
      workingMaskRef.current = null;
      isDrawingRef.current = false;
      didMoveRef.current = false;
      setDrawVersion((v) => v + 1);
      if (!wasDrawing && canvasRef.current && imageUrl && onPickColor && toolMode === 'eyedropper' && !reconstructMode) {
        const { x, y } = getCoords(e);
        const ctx = canvasRef.current.getContext('2d', CANVAS_CONTEXT_OPTIONS);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        onPickColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
      }
    },
    [imageUrl, onPickColor, getCoords, toolMode, selectedLayerId, onMaskPaint, onCommitPaint, reconstructMode]
  );

  useImperativeHandle(
    ref,
    () => ({
      getBlob: (callback) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          callback(null);
          return;
        }
        canvas.toBlob(callback, 'image/png', 1);
      },
      getImageData: () => originalImageDataRef.current,
      getPaintOverlayData: () => {
        const overlay = paintOverlayRef.current;
        if (!overlay) return null;
        return {
          data: new Uint8ClampedArray(overlay.data),
          width: overlay.width,
          height: overlay.height,
        };
      },
      clearPaint: () => {
        const overlay = paintOverlayRef.current;
        if (overlay) {
          overlay.data.fill(0);
          setDrawVersion((v) => v + 1);
        }
      },
    }),
    []
  );

  if (!imageUrl) return null;

  const showBrushCursor = !reconstructMode && (toolMode === 'erase' || toolMode === 'paint');
  const cursorClass = reconstructMode
    ? 'cursor-default'
    : showBrushCursor
      ? 'cursor-none'
      : toolMode === 'eyedropper'
        ? 'canvas-dropper'
        : 'cursor-default';

  return (
    <div className="relative w-full flex justify-center">
      <AnimatePresence>
        {isProcessing && !isDrawingRef.current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
              <p className="text-xs font-medium text-gray-600">Updating…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={canvasWrapperRef} className="relative inline-block max-w-full touch-draw">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => {
            if (showBrushCursor) {
              const el = canvasRef.current;
              const wrapper = canvasWrapperRef.current;
              if (el && wrapper) {
                const rect = wrapper.getBoundingClientRect();
                setBrushCursorPos({
                  x: e.clientX,
                  y: e.clientY,
                  rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                  canvasW: el.width,
                });
              } else {
                setBrushCursorPos({ x: e.clientX, y: e.clientY, rect: null, canvasW: 0 });
              }
            }
            handlePointerMove(e);
          }}
          onPointerUp={handlePointerUp}
          onPointerLeave={(e) => {
            setBrushCursorPos(null);
            if (isDrawingRef.current && workingMaskRef.current && selectedLayerId && onMaskPaint) {
              onMaskPaint(selectedLayerId, new Uint8Array(workingMaskRef.current));
            }
            workingMaskRef.current = null;
            isDrawingRef.current = false;
          }}
          className={`${cursorClass} rounded-xl shadow-inner block`}
          style={{
            maxWidth: '100%',
            height: 'auto',
            maxHeight: 'min(85vh, 80dvh)',
            background:
              'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%) 50% / 16px 16px',
          }}
        />
        <canvas
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 rounded-xl block w-full h-full"
          style={{
            background: 'transparent',
          }}
          aria-hidden
        />
        <BrushCursor
          show={showBrushCursor}
          brushSize={brushSize}
          toolMode={toolMode}
          position={brushCursorPos}
        />
      </div>
    </div>
  );
});

export { CanvasEditor };
