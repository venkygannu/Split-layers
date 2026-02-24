import { motion } from 'framer-motion';
import {
  Eraser,
  Download,
  RotateCcw,
  Highlighter,
  Paintbrush,
  Pipette,
  Trash2,
  Droplets,
} from 'lucide-react';
import { rgbToHex } from '../utils/colorUtils';

function ToolBtn({ active, disabled, onClick, icon: Icon, label }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-blue-500 text-white shadow-sm'
          : 'bg-white border border-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
      }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </motion.button>
  );
}

export function ControlsPanel({
  viewMode,
  toolMode,
  onToolModeChange,
  selectedLayerId,
  selectedColor,
  tolerance,
  onToleranceChange,
  onDownload,
  onReset,
  onReplaceImage,
  imageDimensions,
  hasImage,
  isProcessing,
  highlightOn,
  onHighlightToggle,
  brushSize,
  onBrushSizeChange,
  paintColor,
  onPaintColorChange,
  paintOpacity,
  onPaintOpacityChange,
  onClearPaint,
  onSamplePaintColor,
  exportFormat,
}) {
  const canDownload = hasImage && !isProcessing;
  const canReset = hasImage && !isProcessing;
  const paintHex = paintColor
    ? rgbToHex(paintColor.r, paintColor.g, paintColor.b)
    : '#ff0000';

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-3 gap-1.5">
        <ToolBtn active={toolMode === 'eyedropper'} onClick={() => onToolModeChange('eyedropper')} icon={Pipette} label="Pick" />
        <ToolBtn active={toolMode === 'erase'} disabled={!selectedLayerId} onClick={() => onToolModeChange('erase')} icon={Eraser} label="Erase" />
        <ToolBtn active={toolMode === 'paint'} onClick={() => onToolModeChange('paint')} icon={Paintbrush} label="Paint" />
      </div>

      {selectedLayerId && (
        <div className="min-w-0">
          <label className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Tolerance</span>
            <span className="font-mono text-blue-600">{tolerance}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={tolerance}
            onChange={(e) => onToleranceChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {toolMode === 'paint' && onPaintColorChange != null && (
        <div className="min-w-0 space-y-2">
          <label className="text-xs text-gray-500 block font-medium">Paint color</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="color"
              value={paintHex}
              onChange={(e) => {
                const hex = e.target.value.slice(1);
                onPaintColorChange({
                  r: parseInt(hex.slice(0, 2), 16),
                  g: parseInt(hex.slice(2, 4), 16),
                  b: parseInt(hex.slice(4, 6), 16),
                });
              }}
              className="w-9 h-9 rounded-lg border border-gray-100 cursor-pointer shrink-0"
              title="Paint color"
            />
            {onSamplePaintColor && (
              <button
                type="button"
                onClick={onSamplePaintColor}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
              >
                <Droplets className="w-3.5 h-3.5" />
                Sample
              </button>
            )}
          </div>
          {onPaintOpacityChange != null && (
            <div>
              <label className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Opacity</span>
                <span className="font-mono text-blue-600">{paintOpacity ?? 100}%</span>
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={paintOpacity ?? 100}
                onChange={(e) => onPaintOpacityChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
          {onClearPaint && (
            <button
              type="button"
              onClick={onClearPaint}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear paint
            </button>
          )}
        </div>
      )}

      {onBrushSizeChange != null && (toolMode === 'erase' || toolMode === 'paint') && (
        <div className="min-w-0">
          <label className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Brush size</span>
            <span className="font-mono text-blue-600">{brushSize ?? 20}px</span>
          </label>
          <input
            type="range"
            min={5}
            max={80}
            value={brushSize ?? 20}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {selectedColor != null && onHighlightToggle != null && viewMode === 'whole' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-600">Highlight color</span>
          <button
            type="button"
            onClick={onHighlightToggle}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              highlightOn
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-white border border-gray-100 text-gray-500 hover:bg-amber-50'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5 inline-block align-middle mr-1" />
            {highlightOn ? 'On' : 'Off'}
          </button>
        </div>
      )}

      <div className="flex gap-2 w-full min-w-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onDownload}
          disabled={!canDownload}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{exportFormat === 'jpeg' ? 'JPEG' : 'PNG'}</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onReset}
          disabled={!canReset}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-white border border-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </motion.button>
      </div>

      {imageDimensions && (
        <div className="text-[10px] text-gray-400 text-center">
          {imageDimensions.width} x {imageDimensions.height}
        </div>
      )}
    </div>
  );
}
