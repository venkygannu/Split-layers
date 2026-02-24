import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Layers,
  Download,
  Palette,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Combine,
  Pipette,
  Eraser,
  Brush,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
} from 'lucide-react';
import { ParticleBackground } from './components/ParticleBackground';
import { Toast } from './components/Toast';
import { useToast } from './hooks/useToast';
import { CanvasEditor } from './components/CanvasEditor';
import { LayersPanel } from './components/LayersPanel';
import { StitchPanel } from './components/StitchPanel';
import { CropModal } from './components/CropModal';
import { createLayer, createFullMask } from './utils/layerUtils';
import { getDominantColors, colorMatches, rgbToHex } from './utils/colorUtils';
import {
  invertImageData,
  imageDataToDataUrl,
  adjustImageData,
  replaceColorInImageData,
  exportLayerToImageData,
  exportReconstructedImageData,
  mergePaintOverlay,
  rotateImageData,
  flipImageData,
  cropImageData,
  cropMask,
  rotateMask,
  flipMask,
} from './utils/imageUtils';
import { exportColorReportCSV } from './utils/reportUtils';
import { useHistory } from './hooks/useHistory';

function SidebarBtn({ onClick, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    >
      {label}
    </button>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }),
};

function HeroLanding({ onUpload }) {
  const features = [
    {
      icon: Layers,
      title: 'Split layers',
      desc: 'Upload any image and it automatically separates into individual color layers.',
      highlight: false,
    },
    {
      icon: Combine,
      title: 'Reconstruct',
      desc: 'Pick which layers to keep and build a new image from only the colors you want.',
      highlight: true,
    },
    {
      icon: Palette,
      title: 'Edit',
      desc: 'Isolate a layer, erase, paint, or replace colors. Then export layers or the full image.',
      highlight: false,
    },
  ];

  const steps = [
    { num: '1', title: 'Upload', desc: 'Drop any PNG or JPG image' },
    { num: '2', title: 'Separate', desc: 'Colors auto-split into layers' },
    { num: '3', title: 'Edit', desc: 'Isolate, erase, paint, adjust' },
    { num: '4', title: 'Download', desc: 'Export layers or full image' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero section - centered in viewport */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 sm:py-20 min-h-[70vh]">
        <motion.div
          initial="hidden"
          animate="visible"
          className="max-w-3xl mx-auto"
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Free, client-side, no uploads to servers
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1] whitespace-nowrap"
          >
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #3b93f7, #1abf50, #2577e5)' }}>Split. Reconstruct. Edit.</span>
          </motion.h1>

          <motion.div
            variants={fadeUp}
            custom={2}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onUpload}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-semibold text-white shadow-lg hover:shadow-xl transition-all text-base" style={{ background: 'linear-gradient(135deg, #3b93f7, #2577e5)' }}
            >
              <Upload className="w-5 h-5" />
              Upload image
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={3}
            className="mt-6 flex items-center justify-center gap-1 text-gray-400 text-sm cursor-pointer"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span>See how it works</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4" id="features">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3"
          >
            How it works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gray-500 text-center mb-12 max-w-lg mx-auto"
          >
            Split layers → Reconstruct → Edit. Three steps to full control.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-3">
                  {s.num}
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">{s.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent to-blue-50/20">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12"
          >
            Everything you need
          </motion.h2>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl p-6 transition-all group ring-2 ring-blue-200 border border-blue-100 bg-white shadow-sm hover:shadow-card hover:ring-blue-300"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors bg-blue-50 border border-blue-100 group-hover:bg-blue-100">
                  <f.icon className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced features mention */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4"
          >
            Advanced editing, if you need it
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gray-500 mb-8 max-w-lg mx-auto"
          >
            Brightness, contrast, saturation adjustments. Crop, rotate, flip. Replace colors. Stitch multiple images. Export color reports as CSV.
          </motion.p>
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onUpload}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-semibold text-white shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg, #3b93f7, #2577e5)' }}
          >
            <Upload className="w-5 h-5" />
            Get started
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-gray-400 border-t border-gray-100">
        Color Separator — 100% client-side, your images never leave your browser.
      </footer>
    </div>
  );
}

function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [tolerance, setTolerance] = useState(10);
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [toolMode, setToolMode] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlightOn, setHighlightOn] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [stitchOpen, setStitchOpen] = useState(false);
  const [paintColor, setPaintColor] = useState({ r: 255, g: 0, b: 0 });
  const [paintOpacity, setPaintOpacity] = useState(100);
  const [adjustments, setAdjustments] = useState({ brightness: 0, contrast: 0, saturation: 0 });
  const [exportFormat, setExportFormat] = useState('png');
  const [exportScale, setExportScale] = useState(100);
  const [replaceToColor, setReplaceToColor] = useState({ r: 255, g: 0, b: 0 });
  const [replaceTolerance, setReplaceTolerance] = useState(15);
  const [cropRect, setCropRect] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editorMode, setEditorMode] = useState('split'); // 'split' | 'reconstruct' | 'edit'
  const [selectedLayerIdsForReconstruct, setSelectedLayerIdsForReconstruct] = useState(() => new Set());

  const reconstructLayerIdsArray = useMemo(
    () => Array.from(selectedLayerIdsForReconstruct),
    [selectedLayerIdsForReconstruct]
  );

  const fileInputRef = useRef(null);
  const skipNextImageReadyRef = useRef(false);
  const { toasts, addToast, removeToast } = useToast();
  const history = useHistory();

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const effectiveColor = selectedLayer ? selectedLayer.color : selectedColor;
  const effectiveTolerance = selectedLayer ? (selectedLayer.tolerance ?? 10) : tolerance;

  const updateLayer = useCallback((id, updates) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  }, []);

  // When user picks a new color (eyedropper), select the layer that has that color.
  // Only depend on selectedColor so we don't overwrite user's layer selection when layers change (e.g. after committing paint).
  useEffect(() => {
    if (!selectedColor || layers.length === 0) return;
    const match = layers.find((l) =>
      colorMatches(
        selectedColor.r,
        selectedColor.g,
        selectedColor.b,
        l.color.r,
        l.color.g,
        l.color.b,
        l.tolerance ?? 10
      )
    );
    if (match) setSelectedLayerId(match.id);
  }, [selectedColor]);

  const getCurrentState = useCallback(
    () => ({
      imageUrl,
      dimensions,
      originalImageData,
      layers,
    }),
    [imageUrl, dimensions, originalImageData, layers]
  );

  const applyState = useCallback((state) => {
    if (!state) return;
    const stateLayers = state.layers || [];
    setImageUrl(state.imageUrl);
    setDimensions(state.dimensions);
    setOriginalImageData(state.originalImageData);
    setLayers(stateLayers);
    setSelectedLayerId((prev) => (stateLayers.some((l) => l.id === prev) ? prev : null));
  }, []);

  const handleImageLoad = useCallback((dataUrl) => {
    history.clear();
    setImageUrl(dataUrl);
    setDimensions(null);
    setOriginalImageData(null);
    setSelectedColor(null);
    setLayers([]);
    setSelectedLayerId(null);
    setToolMode(null);
    setHighlightOn(false);
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0 });
    addToast('Image loaded. Creating color layers...', 'success');
  }, [addToast, history]);

  const handleImageReady = useCallback(
    (imageData) => {
      const w = imageData.width;
      const h = imageData.height;
      if (skipNextImageReadyRef.current) {
        skipNextImageReadyRef.current = false;
        setDimensions({ width: w, height: h });
        setOriginalImageData(
          new ImageData(new Uint8ClampedArray(imageData.data), w, h)
        );
        return;
      }
      setDimensions({ width: w, height: h });
      setOriginalImageData(
        new ImageData(new Uint8ClampedArray(imageData.data), w, h)
      );
      const colors = getDominantColors(imageData, 20, 10);
      const newLayers = colors.map((c) => ({
        ...createLayer(c),
        mask: createFullMask(w, h),
      }));
      setLayers(newLayers);
      setSelectedLayerId(null);
      addToast(`${newLayers.length} color layers ready.`, 'success');
    },
    [addToast]
  );

  const handleInvert = useCallback(() => {
    if (!originalImageData) return;
    history.push(getCurrentState());
    skipNextImageReadyRef.current = true;
    const copy = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    invertImageData(copy);
    setImageUrl(imageDataToDataUrl(copy));
    setOriginalImageData(copy);
    addToast('Image inverted.', 'success');
  }, [originalImageData, getCurrentState, history, addToast]);

  const handleStitched = useCallback(
    (dataUrl) => {
      handleImageLoad(dataUrl);
      addToast('Images stitched.', 'success');
    },
    [handleImageLoad, addToast]
  );

  const handleUndo = useCallback(() => {
    const state = history.undo(getCurrentState());
    if (state) {
      skipNextImageReadyRef.current = true;
      applyState(state);
      addToast('Undo.', 'info');
    }
  }, [history, getCurrentState, applyState, addToast]);

  const handleRedo = useCallback(() => {
    const state = history.redo(getCurrentState());
    if (state) {
      skipNextImageReadyRef.current = true;
      applyState(state);
      addToast('Redo.', 'info');
    }
  }, [history, getCurrentState, applyState, addToast]);

  const handleRotate = useCallback(
    (degrees) => {
      if (!originalImageData || !dimensions) return;
      history.push(getCurrentState());
      skipNextImageReadyRef.current = true;
      const w = dimensions.width;
      const h = dimensions.height;
      const rotated = rotateImageData(originalImageData, degrees);
      const newW = degrees === 90 || degrees === -90 ? h : w;
      const newH = degrees === 90 || degrees === -90 ? w : h;
      const newLayers = layers.map((l) => ({
        ...l,
        mask: rotateMask(l.mask, w, h, degrees),
      }));
      setImageUrl(imageDataToDataUrl(rotated));
      setDimensions({ width: newW, height: newH });
      setOriginalImageData(rotated);
      setLayers(newLayers);
      setSelectedLayerId((prev) => (newLayers.some((l) => l.id === prev) ? prev : null));
      addToast(`Rotated ${degrees > 0 ? '90° CW' : '90° CCW'}.`, 'success');
    },
    [originalImageData, dimensions, layers, getCurrentState, history, addToast]
  );

  const handleFlip = useCallback(
    (horizontal, vertical) => {
      if (!originalImageData || !dimensions) return;
      history.push(getCurrentState());
      skipNextImageReadyRef.current = true;
      const w = dimensions.width;
      const h = dimensions.height;
      const copy = new ImageData(new Uint8ClampedArray(originalImageData.data), w, h);
      flipImageData(copy, horizontal, vertical);
      const newLayers = layers.map((l) => {
        const m = new Uint8Array(l.mask);
        flipMask(m, w, h, horizontal, vertical);
        return { ...l, mask: m };
      });
      setImageUrl(imageDataToDataUrl(copy));
      setOriginalImageData(copy);
      setLayers(newLayers);
      addToast(`Flipped ${horizontal ? 'horizontal' : 'vertical'}.`, 'success');
    },
    [originalImageData, dimensions, layers, getCurrentState, history, addToast]
  );

  const handleAdjust = useCallback(() => {
    if (!originalImageData) return;
    history.push(getCurrentState());
    skipNextImageReadyRef.current = true;
    const copy = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    adjustImageData(copy, adjustments);
    setImageUrl(imageDataToDataUrl(copy));
    setOriginalImageData(copy);
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0 });
    addToast('Adjustments applied.', 'success');
  }, [originalImageData, adjustments, getCurrentState, history, addToast]);

  const handleReplaceColor = useCallback(() => {
    if (!originalImageData || !effectiveColor) {
      addToast('Pick a color first, then choose replacement.', 'info');
      return;
    }
    history.push(getCurrentState());
    skipNextImageReadyRef.current = true;
    const copy = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    replaceColorInImageData(copy, effectiveColor, replaceToColor, replaceTolerance);
    setImageUrl(imageDataToDataUrl(copy));
    setOriginalImageData(copy);
    setLayers((prev) =>
      prev.map((layer) => {
        const tol = layer.tolerance ?? 10;
        const matches = colorMatches(
          layer.color.r,
          layer.color.g,
          layer.color.b,
          effectiveColor.r,
          effectiveColor.g,
          effectiveColor.b,
          tol
        );
        if (matches) return { ...layer, color: { ...replaceToColor } };
        return layer;
      })
    );
    addToast('Color replaced.', 'success');
  }, [originalImageData, effectiveColor, replaceToColor, replaceTolerance, getCurrentState, history, addToast]);

  const handleCrop = useCallback(
    (rect) => {
      if (!originalImageData || !dimensions) return;
      history.push(getCurrentState());
      skipNextImageReadyRef.current = true;
      const w = dimensions.width;
      const cropped = cropImageData(originalImageData, rect);
      const newLayers = layers.map((l) => ({
        ...l,
        mask: cropMask(l.mask, w, rect),
      }));
      setImageUrl(imageDataToDataUrl(cropped));
      setDimensions({ width: rect.width, height: rect.height });
      setOriginalImageData(cropped);
      setLayers(newLayers);
      setSelectedLayerId((prev) => (newLayers.some((l) => l.id === prev) ? prev : null));
      setCropRect(null);
      addToast('Cropped.', 'success');
    },
    [originalImageData, dimensions, layers, getCurrentState, history, addToast]
  );

  const handleExportCSV = useCallback(() => {
    if (!originalImageData || layers.length === 0) {
      addToast('No image or layers to export.', 'info');
      return;
    }
    const csv = exportColorReportCSV(layers, originalImageData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `color-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    addToast('CSV downloaded.', 'success');
  }, [originalImageData, layers, addToast]);

  const handleAddLayer = useCallback(() => {
    if (!selectedColor) {
      addToast('Use Pick tool and click on the image first.', 'info');
      return;
    }
    if (!dimensions) return;
    const newLayer = createLayer(selectedColor);
    newLayer.mask = createFullMask(dimensions.width, dimensions.height);
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    addToast('Layer added.', 'success');
  }, [selectedColor, dimensions, addToast]);

  const handleMaskPaint = useCallback((layerId, newMask) => {
    history.push(getCurrentState());
    updateLayer(layerId, { mask: newMask });
  }, [updateLayer, history, getCurrentState]);

  const canvasEditorRef = useRef(null);
  const handleCommitPaint = useCallback(
    (layerId, { data, width, height }) => {
      if (!width || !height || !data || data.length !== width * height * 4) return;
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;
      history.push(getCurrentState());
      const merged = mergePaintOverlay(layer.paintData ?? null, data, width, height);
      updateLayer(layerId, { paintData: merged });
    },
    [layers, updateLayer, history, getCurrentState]
  );

  const handleSelectLayer = useCallback(
    (id) => {
      if (selectedLayerId != null && selectedLayerId !== id) {
        const snap = canvasEditorRef.current?.getPaintOverlayData?.();
        if (snap?.data && snap.width && snap.height) {
          const hasContent = Array.prototype.some.call(snap.data, (v, i) => i % 4 === 3 && v > 0);
          if (hasContent) handleCommitPaint(selectedLayerId, snap);
        }
      }
      setSelectedLayerId(id ?? null);
    },
    [selectedLayerId, handleCommitPaint]
  );

  const handleClearPaint = useCallback(() => {
    canvasEditorRef.current?.clearPaint?.();
    if (selectedLayerId) {
      history.push(getCurrentState());
      updateLayer(selectedLayerId, { paintData: null });
    }
    addToast('Paint cleared.', 'info');
  }, [addToast, selectedLayerId, updateLayer, history, getCurrentState]);

  const handleToleranceChange = useCallback(
    (val) => {
      if (selectedLayerId) updateLayer(selectedLayerId, { tolerance: val });
      else setTolerance(val);
    },
    [selectedLayerId, updateLayer]
  );

  const handleMoveLayer = useCallback((id, delta) => {
    history.push(getCurrentState());
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id);
      if (i === -1) return prev;
      const j = Math.max(0, Math.min(prev.length - 1, i + delta));
      if (i === j) return prev;
      const next = [...prev];
      const [removed] = next.splice(i, 1);
      next.splice(j, 0, removed);
      return next;
    });
  }, [history, getCurrentState]);

  const handleMoveLayerToIndex = useCallback((layerId, toIndex) => {
    history.push(getCurrentState());
    setLayers((prev) => {
      const fromIndex = prev.findIndex((l) => l.id === layerId);
      if (fromIndex === -1) return prev;
      let target = Math.max(0, Math.min(prev.length - 1, toIndex));
      if (fromIndex < target) target -= 1;
      if (fromIndex === target) return prev;
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(target, 0, removed);
      return next;
    });
  }, [history, getCurrentState]);

  const handleDownload = useCallback(() => {
    if (!canvasEditorRef.current) return;
    canvasEditorRef.current.getBlob((blob) => {
      if (!blob) {
        addToast('Could not create image.', 'error');
        return;
      }
      const scale = exportScale / 100;
      const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = exportFormat === 'jpeg' ? 'jpg' : 'png';
      if (scale === 1 && exportFormat === 'png') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `color-separator-${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * scale);
          c.height = Math.round(img.naturalHeight * scale);
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(
            (b) => {
              if (!b) return;
              const a = document.createElement('a');
              a.href = URL.createObjectURL(b);
              a.download = `color-separator-${Date.now()}.${ext}`;
              a.click();
              URL.revokeObjectURL(a.href);
            },
            mime,
            exportFormat === 'jpeg' ? 0.92 : 1
          );
        };
        img.src = URL.createObjectURL(blob);
      }
      addToast(`Downloaded as ${ext.toUpperCase()}.`, 'success');
    });
  }, [addToast, exportFormat, exportScale]);

  const handleReset = useCallback(() => {
    setSelectedColor(null);
    setSelectedLayerId(null);
    setToolMode(null);
    setHighlightOn(false);
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        mask: dimensions ? createFullMask(dimensions.width, dimensions.height) : l.mask,
      }))
    );
    addToast('Masks reset.', 'info');
  }, [addToast, dimensions]);

  const setSelectedLayerIdToNull = useCallback(() => setSelectedLayerId(null), []);

  const hasImage = !!imageUrl;
  const viewMode = selectedLayerId ? 'isolate' : 'whole';

  const handleDownloadAllLayers = useCallback(() => {
    if (!originalImageData || layers.length === 0) {
      addToast('No layers to download.', 'info');
      return;
    }
    layers.forEach((layer, index) => {
      const layerImageData = exportLayerToImageData(originalImageData, layer);
      const dataUrl = imageDataToDataUrl(layerImageData);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `layer-${index + 1}-${(layer.name || 'color').replace(/[#/\\?*]/g, '')}.png`;
      a.click();
    });
    addToast(`Downloaded ${layers.length} layers.`, 'success');
  }, [originalImageData, layers, addToast]);

  const handleDownloadReconstructed = useCallback(() => {
    if (!originalImageData || selectedLayerIdsForReconstruct.size === 0) {
      addToast('Select at least one layer.', 'info');
      return;
    }
    const reconstructed = exportReconstructedImageData(originalImageData, layers, selectedLayerIdsForReconstruct);
    const dataUrl = imageDataToDataUrl(reconstructed);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `reconstructed-${selectedLayerIdsForReconstruct.size}-layers.png`;
    a.click();
    addToast(`Downloaded reconstructed image.`, 'success');
  }, [originalImageData, layers, selectedLayerIdsForReconstruct, addToast]);

  const toggleReconstructLayer = useCallback((id) => {
    setSelectedLayerIdsForReconstruct((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllReconstruct = useCallback(() => {
    setSelectedLayerIdsForReconstruct(new Set(layers.map((l) => l.id)));
  }, [layers]);

  const clearReconstructSelection = useCallback(() => {
    setSelectedLayerIdsForReconstruct(new Set());
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        }
        if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className="min-h-screen relative bg-surface-50 overflow-hidden">
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-br from-[#f0f7ff] via-[#f8fafc] to-[#eef7f0] bg-[length:300%_300%] animate-gradient"
        aria-hidden
      />
      <ParticleBackground />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target?.files?.[0];
          if (file?.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const url = ev.target?.result;
              if (url) handleImageLoad(url);
            };
            reader.readAsDataURL(file);
          }
          e.target.value = '';
        }}
      />

      <div className="relative z-10 overflow-x-hidden min-h-screen">
        <AnimatePresence mode="wait">
          {!hasImage ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="min-h-screen flex flex-col"
            >
              <HeroLanding onUpload={() => fileInputRef.current?.click()} />
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-4 min-h-0 h-[100vh] flex flex-col"
            >
              <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 h-full items-start">
                {/* Canvas area */}
                <div className="flex-1 min-w-0 flex flex-col min-h-0">
                  <div className="glass-panel rounded-2xl p-2 sm:p-3 shadow-card">
                    <CanvasEditor
                      ref={canvasEditorRef}
                      imageUrl={imageUrl}
                      layers={layers}
                      selectedLayerId={selectedLayerId}
                      viewMode={viewMode}
                      toolMode={toolMode}
                      selectedLayerMask={selectedLayer?.mask}
                      onMaskPaint={handleMaskPaint}
                      onImageReady={handleImageReady}
                      onPickColor={setSelectedColor}
                      onDimensions={setDimensions}
                      onProcessingChange={setIsProcessing}
                      isProcessing={isProcessing}
                      highlightOn={highlightOn}
                      brushSize={brushSize}
                      paintColor={paintColor}
                      paintOpacity={paintOpacity}
                      selectedLayerPaintData={selectedLayer?.paintData ?? null}
                      onCommitPaint={handleCommitPaint}
                      adjustments={adjustments}
                      editorMode={editorMode}
                      reconstructLayerIds={reconstructLayerIdsArray}
                    />
                  </div>
                </div>

                {/* Sidebar - same height as canvas column, sticky so it stays in view */}
                <aside className="w-full lg:w-80 xl:w-[340px] flex-shrink-0 flex flex-col min-h-0 lg:h-full lg:sticky lg:top-4">
                  <div className="flex-1 min-h-0 flex flex-col gap-3 pb-4 lg:overflow-y-auto lg:overflow-x-hidden custom-scrollbar">
                    {/* Split | Reconstruct | Edit + content */}
                    <div className="glass-panel rounded-2xl p-3 shadow-card">
                      {hasImage && layers.length > 0 && (
                        <div className="flex rounded-xl overflow-hidden border border-blue-100 bg-blue-50/50 p-0.5 mb-3">
                          {[
                            { id: 'split', label: 'Split', icon: Layers },
                            { id: 'reconstruct', label: 'Reconstruct', icon: Combine },
                            { id: 'edit', label: 'Edit', icon: Palette },
                          ].map(({ id, label, icon: Icon }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setEditorMode(id)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-lg transition-all ${
                                editorMode === id
                                  ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {editorMode === 'edit' ? (
                        <div className="space-y-4 pt-1">
                          {/* Brush & tools - top */}
                          <section>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Brush & tools</h3>
                            <div className="flex gap-1.5">
                              {[
                                { id: 'eyedropper', label: 'Pick', icon: Pipette },
                                { id: 'erase', label: 'Erase', icon: Eraser },
                                { id: 'paint', label: 'Paint', icon: Brush },
                              ].map(({ id, label, icon: Icon }) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => setToolMode(id)}
                                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                                    toolMode === id
                                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                      : 'bg-white text-gray-600 border-gray-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  <span>{label}</span>
                                </button>
                              ))}
                            </div>
                            {(toolMode === 'erase' || toolMode === 'paint') && (
                              <div className="mt-2">
                                <label className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Brush size</span>
                                  <span className="font-mono text-blue-600">{brushSize}px</span>
                                </label>
                                <input type="range" min={1} max={100} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full" />
                              </div>
                            )}
                            {toolMode === 'paint' && (
                              <>
                                <div className="mt-2 flex items-center gap-2">
                                  <label className="text-xs text-gray-500">Color</label>
                                  <input
                                    type="color"
                                    value={`#${[paintColor.r, paintColor.g, paintColor.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`}
                                    onChange={(e) => {
                                      const hex = e.target.value.slice(1);
                                      setPaintColor({ r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) });
                                    }}
                                    className="w-7 h-7 rounded-lg border border-gray-100 cursor-pointer"
                                  />
                                  <label className="text-xs text-gray-500 ml-auto">Opacity</label>
                                  <span className="text-xs font-mono text-blue-600">{paintOpacity}%</span>
                                </div>
                                <input type="range" min={1} max={100} value={paintOpacity} onChange={(e) => setPaintOpacity(Number(e.target.value))} className="w-full mt-1" />
                              </>
                            )}
                          </section>

                          {/* Editing indicator */}
                          {selectedLayer && (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-100">
                              <div className="w-6 h-6 rounded-md border border-white shadow-sm shrink-0" style={{ backgroundColor: `rgb(${selectedLayer.color.r},${selectedLayer.color.g},${selectedLayer.color.b})` }} />
                              <span className="text-xs font-medium text-blue-700 truncate">Editing: {selectedLayer.name || `#${[selectedLayer.color.r, selectedLayer.color.g, selectedLayer.color.b].map((x) => x.toString(16).padStart(2, '0')).join('')}`}</span>
                            </div>
                          )}

                          {/* History */}
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">History</h3>
                            <div className="flex gap-1.5">
                              <SidebarBtn onClick={handleUndo} disabled={!history.canUndo || isProcessing} label="Undo" />
                              <SidebarBtn onClick={handleRedo} disabled={!history.canRedo || isProcessing} label="Redo" />
                            </div>
                          </div>

                          {/* Replace Color */}
                          <section className="rounded-xl border border-blue-100 bg-blue-50/30 p-3">
                            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Replace Color</h3>
                            {!effectiveColor && (
                              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-3">
                                Select a layer or use <span className="font-medium">Pick</span> on the image to set the color to replace.
                              </p>
                            )}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex flex-col items-center gap-1 flex-1">
                                <span className="text-[10px] font-medium text-gray-500 uppercase">From</span>
                                <div
                                  className="w-10 h-10 rounded-xl border-2 border-white shadow-sm shrink-0 ring-1 ring-gray-200"
                                  style={{ backgroundColor: effectiveColor ? `rgb(${effectiveColor.r},${effectiveColor.g},${effectiveColor.b})` : '#e5e7eb' }}
                                  title="Color to replace (layer or picked)"
                                />
                                {effectiveColor && (
                                  <span className="text-[10px] font-mono text-gray-500 truncate max-w-full">
                                    {rgbToHex(effectiveColor.r, effectiveColor.g, effectiveColor.b)}
                                  </span>
                                )}
                              </div>
                              <ArrowRight className="w-5 h-5 text-blue-400 shrink-0" />
                              <div className="flex flex-col items-center gap-1 flex-1">
                                <span className="text-[10px] font-medium text-gray-500 uppercase">To</span>
                                <input
                                  type="color"
                                  value={`#${[replaceToColor.r, replaceToColor.g, replaceToColor.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`}
                                  onChange={(e) => {
                                    const hex = e.target.value.slice(1);
                                    setReplaceToColor({
                                      r: parseInt(hex.slice(0, 2), 16),
                                      g: parseInt(hex.slice(2, 4), 16),
                                      b: parseInt(hex.slice(4, 6), 16),
                                    });
                                  }}
                                  className="w-10 h-10 rounded-xl border-2 border-white shadow-sm cursor-pointer ring-1 ring-gray-200"
                                  title="Replacement color"
                                />
                                <span className="text-[10px] font-mono text-gray-500">
                                  {rgbToHex(replaceToColor.r, replaceToColor.g, replaceToColor.b)}
                                </span>
                              </div>
                            </div>
                            <div className="mb-3">
                              <label className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Tolerance</span>
                                <span className="font-mono text-blue-600">{replaceTolerance}%</span>
                              </label>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={replaceTolerance}
                                onChange={(e) => setReplaceTolerance(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="text-[10px] text-gray-400 mt-0.5">Higher = more similar shades replaced</p>
                            </div>
                            {layers.length > 0 && (
                              <>
                                <p className="text-[10px] font-medium text-gray-500 uppercase mb-1.5">Replace with layer color</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {layers.map((layer) => {
                                    const c = layer.color;
                                    return (
                                      <button
                                        key={layer.id}
                                        type="button"
                                        onClick={() => setReplaceToColor({ r: c.r, g: c.g, b: c.b })}
                                        className="w-7 h-7 rounded-lg border-2 border-white shadow-sm hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                                        title={layer.name || rgbToHex(c.r, c.g, c.b)}
                                      />
                                    );
                                  })}
                                </div>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={handleReplaceColor}
                              disabled={!originalImageData || !effectiveColor || isProcessing}
                              className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              Replace color
                            </button>
                          </section>

                          {/* Transform */}
                          <section>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Transform</h3>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { action: () => handleRotate(90), icon: RotateCw, label: '90° CW', disabled: !dimensions || isProcessing },
                                { action: () => handleRotate(-90), icon: RotateCcw, label: '90° CCW', disabled: !dimensions || isProcessing },
                                { action: handleInvert, icon: Sparkles, label: 'Invert', disabled: !originalImageData || isProcessing },
                                { action: () => handleFlip(true, false), icon: FlipHorizontal, label: 'Flip H', disabled: !dimensions || isProcessing },
                                { action: () => handleFlip(false, true), icon: FlipVertical, label: 'Flip V', disabled: !dimensions || isProcessing },
                                { action: () => setCropModalOpen(true), icon: Crop, label: 'Crop', disabled: !dimensions || isProcessing },
                              ].map(({ action, icon: Icon, label, disabled }) => (
                                <button key={label} type="button" onClick={action} disabled={disabled} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg border text-[11px] text-gray-600 bg-white hover:bg-blue-50 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed" title={label}>
                                  <Icon className="w-4 h-4 text-blue-500" />
                                  <span>{label}</span>
                                </button>
                              ))}
                            </div>
                          </section>

                          {/* Adjustments - last */}
                          <section>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Adjustments</h3>
                            {['brightness', 'contrast', 'saturation'].map((key) => (
                              <div key={key} className="mb-2.5">
                                <div className="flex justify-between text-xs text-gray-500 mb-1"><span className="capitalize">{key}</span><span className="font-mono text-blue-600">{adjustments[key] ?? 0}</span></div>
                                <input type="range" min={-100} max={100} value={adjustments[key] ?? 0} onChange={(e) => setAdjustments((a) => ({ ...a, [key]: Number(e.target.value) }))} className="w-full" />
                              </div>
                            ))}
                            <button type="button" onClick={handleAdjust} disabled={!originalImageData || isProcessing} className="w-full py-2 rounded-xl text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors">Apply adjustments</button>
                          </section>
                        </div>
                      ) : (
                        <LayersPanel
                          layers={layers}
                          selectedLayerId={selectedLayerId}
                          onSelectLayer={handleSelectLayer}
                          onSelectFullImage={() => handleSelectLayer(null)}
                          onAddLayer={handleAddLayer}
                          onDeleteLayer={(id) => {
                            history.push(getCurrentState());
                            setLayers((prev) => prev.filter((l) => l.id !== id));
                            if (selectedLayerId === id) setSelectedLayerId(null);
                            setSelectedLayerIdsForReconstruct((prev) => {
                              const next = new Set(prev);
                              next.delete(id);
                              return next;
                            });
                            addToast('Layer removed.', 'info');
                          }}
                          onMoveLayer={handleMoveLayer}
                          onMoveLayerToIndex={handleMoveLayerToIndex}
                          selectedColor={selectedColor}
                          canAddLayer={!!hasImage}
                          onDownloadAllLayers={handleDownloadAllLayers}
                          hasImage={hasImage}
                          editorMode={editorMode}
                          selectedLayerIdsForReconstruct={selectedLayerIdsForReconstruct}
                          onReconstructToggleLayer={toggleReconstructLayer}
                          onDownloadReconstructed={handleDownloadReconstructed}
                          onSelectAllReconstruct={selectAllReconstruct}
                          onClearReconstructSelection={clearReconstructSelection}
                          onEditLayer={(id) => {
                            const layer = layers.find((l) => l.id === id);
                            handleSelectLayer(id);
                            setEditorMode('edit');
                            if (layer) setSelectedColor(layer.color);
                          }}
                        />
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {stitchOpen && (
        <StitchPanel
          onStitched={handleStitched}
          onClose={() => setStitchOpen(false)}
        />
      )}

      {cropModalOpen && dimensions && imageUrl && (
        <CropModal
          dimensions={dimensions}
          imageUrl={imageUrl}
          onApply={handleCrop}
          onClose={() => setCropModalOpen(false)}
        />
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
