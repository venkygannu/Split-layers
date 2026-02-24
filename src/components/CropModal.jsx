import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crop, X } from 'lucide-react';

function clamp(min, val, max) {
  return Math.max(min, Math.min(max, val));
}

export function CropModal({ dimensions, imageUrl, onApply, onClose }) {
  const w = dimensions?.width ?? 0;
  const h = dimensions?.height ?? 0;
  const imgRef = useRef(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState(null);
  const [current, setCurrent] = useState(null);
  const [rect, setRect] = useState(null);

  const updateDisplaySize = useCallback(() => {
    const img = imgRef.current;
    if (!img || !w || !h) return;
    const r = img.getBoundingClientRect();
    setDisplaySize({ width: r.width, height: r.height });
  }, [w, h]);

  useEffect(() => {
    if (!imageUrl || !w || !h) return;
    const img = imgRef.current;
    if (!img) {
      const t = setTimeout(updateDisplaySize, 50);
      return () => clearTimeout(t);
    }
    if (img.complete) updateDisplaySize();
    else img.addEventListener('load', updateDisplaySize);
    const ro = new ResizeObserver(updateDisplaySize);
    ro.observe(img);
    const t = setTimeout(updateDisplaySize, 100);
    return () => {
      img.removeEventListener('load', updateDisplaySize);
      ro.disconnect();
      clearTimeout(t);
    };
  }, [imageUrl, w, h, updateDisplaySize]);

  const eventToImageCoords = useCallback(
    (e) => {
      const img = imgRef.current;
      if (!img || !w || !h) return { x: 0, y: 0 };
      const r = img.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * w;
      const y = ((e.clientY - r.top) / r.height) * h;
      return {
        x: Math.round(clamp(0, x, w)),
        y: Math.round(clamp(0, y, h)),
      };
    },
    [w, h]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      const pt = eventToImageCoords(e);
      setStart(pt);
      setCurrent(pt);
      setDragging(true);
      setRect(null);
    },
    [eventToImageCoords]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging || !start) return;
      setCurrent(eventToImageCoords(e));
    },
    [dragging, start, eventToImageCoords]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging || !start || !current) return;
    const x0 = Math.min(start.x, current.x);
    const y0 = Math.min(start.y, current.y);
    const x1 = Math.max(start.x, current.x);
    const y1 = Math.max(start.y, current.y);
    let x = x0;
    let y = y0;
    let width = x1 - x0;
    let height = y1 - y0;
    if (width < 4) width = 4;
    if (height < 4) height = 4;
    if (x + width > w) x = w - width;
    if (y + height > h) y = h - height;
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    setRect({ x, y, width, height });
    setDragging(false);
    setStart(null);
    setCurrent(null);
  }, [dragging, start, current, w, h]);

  useEffect(() => {
    const onUp = () => {
      if (dragging) handlePointerUp();
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [dragging, handlePointerUp]);

  useEffect(() => {
    const onMove = (e) => handlePointerMove(e);
    if (dragging) window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [dragging, handlePointerMove]);

  const handleApply = () => {
    if (rect && rect.width > 0 && rect.height > 0) {
      onApply(rect);
      onClose();
    }
  };

  const cropRect = rect || (start && current
    ? (() => {
        const x0 = Math.min(start.x, current.x);
        const y0 = Math.min(start.y, current.y);
        const x1 = Math.max(start.x, current.x);
        const y1 = Math.max(start.y, current.y);
        return { x: x0, y: y0, width: Math.max(4, x1 - x0), height: Math.max(4, y1 - y0) };
      })()
    : null);

  const scaleX = displaySize.width && w ? displaySize.width / w : 0;
  const scaleY = displaySize.height && h ? displaySize.height / h : 0;

  if (!dimensions || !imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-2xl bg-white shadow-xl border border-white/60 p-4 max-w-[95vw] max-h-[90dvh] flex flex-col overflow-y-auto"
        >
          <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Crop className="w-5 h-5 text-violet-500" />
              <span className="font-semibold text-gray-800">Crop image</span>
            </div>
            <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 text-gray-500 touch-manipulation" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-3 shrink-0">
            Drag on the image to select the area to keep. Then click Apply crop.
          </p>
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-xl bg-gray-100" style={{ maxHeight: 'min(70vh, 60dvh)' }}>
            <div className="relative inline-block max-w-full touch-draw" style={{ maxHeight: 'min(70vh, 60dvh)' }}>
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                className="block max-w-full max-h-[70vh] max-h-[60dvh] w-auto h-auto select-none object-contain"
                draggable={false}
              />
              <div
                className="absolute inset-0 cursor-crosshair touch-draw"
                onPointerDown={handlePointerDown}
              >
                {cropRect && scaleX > 0 && scaleY > 0 && (
                  <>
                    <div
                      className="absolute bg-black/50 pointer-events-none"
                      style={{
                        left: 0,
                        top: 0,
                        right: 0,
                        height: cropRect.y * scaleY,
                      }}
                    />
                    <div
                      className="absolute bg-black/50 pointer-events-none"
                      style={{
                        left: 0,
                        top: cropRect.y * scaleY,
                        width: cropRect.x * scaleX,
                        height: cropRect.height * scaleY,
                      }}
                    />
                    <div
                      className="absolute bg-black/50 pointer-events-none"
                      style={{
                        left: (cropRect.x + cropRect.width) * scaleX,
                        top: cropRect.y * scaleY,
                        right: 0,
                        height: cropRect.height * scaleY,
                      }}
                    />
                    <div
                      className="absolute bg-black/50 pointer-events-none"
                      style={{
                        left: 0,
                        top: (cropRect.y + cropRect.height) * scaleY,
                        right: 0,
                        bottom: 0,
                      }}
                    />
                    <div
                      className="absolute border-2 border-white shadow-lg pointer-events-none"
                      style={{
                        left: cropRect.x * scaleX,
                        top: cropRect.y * scaleY,
                        width: cropRect.width * scaleX,
                        height: cropRect.height * scaleY,
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          {cropRect && (
            <p className="text-xs text-gray-500 mt-2 shrink-0">
              Selection: {cropRect.width} × {cropRect.height} px
            </p>
          )}
          <div className="flex gap-2 justify-end mt-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!cropRect || cropRect.width < 4 || cropRect.height < 4}
              className="min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
            >
              Apply crop
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
