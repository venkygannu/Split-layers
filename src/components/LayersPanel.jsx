import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Layers,
  Trash2,
  ImageIcon,
  Download,
  CheckSquare,
  Square,
  Edit3,
  GripVertical,
} from 'lucide-react';
import { rgbToHex } from '../utils/colorUtils';
import { layerDisplayName } from '../utils/layerUtils';

export function LayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onSelectFullImage,
  onDeleteLayer,
  onMoveLayer,
  onMoveLayerToIndex,
  onDownloadAllLayers,
  hasImage,
  editorMode = 'split',
  selectedLayerIdsForReconstruct = new Set(),
  onReconstructToggleLayer,
  onDownloadReconstructed,
  onSelectAllReconstruct,
  onClearReconstructSelection,
  onEditLayer,
}) {
  const isReconstruct = editorMode === 'reconstruct';
  const showFullImageRow = hasImage && !isReconstruct;
  const noLayerSelected = selectedLayerId == null;
  const reconstructSet = selectedLayerIdsForReconstruct instanceof Set ? selectedLayerIdsForReconstruct : new Set(selectedLayerIdsForReconstruct);
  const reconstructCount = reconstructSet.size;
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggingLayerId, setDraggingLayerId] = useState(null);

  const handleDragStart = (e, layer, index) => {
    if (isReconstruct) return;
    setDraggingLayerId(layer.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ id: layer.id, fromIndex: index }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layer.id);
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDragEnd = () => {
    setDraggingLayerId(null);
    setDragOverIndex(null);
  };
  const handleDragOver = (e, index) => {
    if (isReconstruct) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (e, targetIndex) => {
    if (isReconstruct || !onMoveLayerToIndex) return;
    e.preventDefault();
    setDragOverIndex(null);
    setDraggingLayerId(null);
    try {
      const { id } = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      if (id) onMoveLayerToIndex(id, targetIndex);
    } catch (_) {
      const id = e.dataTransfer.getData('text/plain');
      if (id) onMoveLayerToIndex(id, targetIndex);
    }
  };

  return (
    <div className="flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="font-semibold text-gray-800 text-sm">Color Layers</span>
          {layers.length > 0 && (
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{layers.length}</span>
          )}
        </div>
      </div>

      {/* Info text */}
      <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
        {isReconstruct
          ? 'Select layers to include, then download a single image with only those colors.'
          : 'Click a layer to select. Drag to reorder (first in list = on top). Click "Full image" to see everything.'}
      </p>

      {/* Layer list - no inner scroll; sidebar scrolls as a whole */}
      <div className="flex flex-col gap-1.5">
        {showFullImageRow && (
          <motion.div
            whileHover={{ scale: 1.01 }}
            role="button"
            tabIndex={0}
            onClick={() => onSelectFullImage?.()}
            onKeyDown={(e) => e.key === 'Enter' && onSelectFullImage?.()}
            className={`rounded-xl border transition-all p-2.5 flex items-center gap-2.5 cursor-pointer ${
              noLayerSelected
                ? 'border-blue-300 bg-blue-50/80 shadow-sm'
                : 'border-gray-100 bg-white/60 hover:border-blue-200 hover:bg-blue-50/30'
            }`}
            title="Show whole image"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${noLayerSelected ? 'bg-blue-100' : 'bg-gray-50'}`}>
              <ImageIcon className={`w-4 h-4 ${noLayerSelected ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            <div className="min-w-0">
              <span className={`text-sm font-medium block ${noLayerSelected ? 'text-blue-700' : 'text-gray-700'}`}>Full image</span>
              <span className="text-[10px] text-gray-400 block">All colors visible</span>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {layers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="py-6 text-center text-sm text-gray-400 rounded-xl bg-white/40"
            >
              Upload an image to auto-create color layers
            </motion.div>
          ) : (
            layers.map((layer, index) => {
              const isSelected = isReconstruct
                ? reconstructSet.has(layer.id)
                : selectedLayerId === layer.id;
              const hex = rgbToHex(layer.color.r, layer.color.g, layer.color.b);

              const isDragging = draggingLayerId === layer.id;
              const isDropTarget = dragOverIndex === index && !isDragging;

              return (
                <motion.div
                  key={layer.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{
                    opacity: isDragging ? 0.6 : 1,
                    y: 0,
                    scale: isDragging ? 0.98 : 1,
                    boxShadow: isDragging ? '0 10px 25px -5px rgba(0,0,0,0.15)' : 'none',
                  }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  draggable={!isReconstruct && !!onMoveLayerToIndex}
                  onDragStart={(e) => handleDragStart(e, layer, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`rounded-xl border transition-colors duration-150 ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50/70 shadow-sm'
                      : 'border-gray-100 bg-white/60 hover:border-blue-200 hover:bg-blue-50/20'
                  } ${isDropTarget ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50/50' : ''}`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isReconstruct) onReconstructToggleLayer?.(layer.id);
                      else onSelectLayer?.(layer.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (isReconstruct) onReconstructToggleLayer?.(layer.id);
                        else onSelectLayer?.(layer.id);
                      }
                    }}
                    className="p-2 flex items-center gap-2 cursor-pointer"
                  >
                    {!isReconstruct && onMoveLayerToIndex && (
                      <div className="shrink-0 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing" title="Drag to reorder" onPointerDown={(e) => e.stopPropagation()}>
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    {isReconstruct ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onReconstructToggleLayer?.(layer.id); }}
                        className="shrink-0 p-0.5 rounded"
                      >
                        {reconstructSet.has(layer.id)
                          ? <CheckSquare className="w-4 h-4 text-blue-500" />
                          : <Square className="w-4 h-4 text-gray-300" />
                        }
                      </button>
                    ) : null}
                    <div
                      className="w-7 h-7 rounded-lg border border-white shadow-inner-soft shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-gray-700 truncate block">
                        {layerDisplayName(layer)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{hex}</span>
                    </div>
                    {!isReconstruct && onEditLayer && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLayer(layer.id);
                        }}
                        className="shrink-0 p-1 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-600 transition-colors"
                        title="Edit this layer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                      className="shrink-0 p-1 rounded-lg hover:bg-rose-50 text-gray-300 hover:text-rose-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {/* Bottom actions */}
        {isReconstruct ? (
          layers.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex gap-1.5">
                <button type="button" onClick={onSelectAllReconstruct}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  Select all
                </button>
                <button type="button" onClick={onClearReconstructSelection}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 transition-colors">
                  Clear
                </button>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onDownloadReconstructed}
                disabled={reconstructCount === 0}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                Download reconstructed {reconstructCount > 0 ? `(${reconstructCount})` : ''}
              </motion.button>
            </div>
          )
        ) : (
          layers.length > 0 && onDownloadAllLayers && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onDownloadAllLayers}
              className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download all layers
            </motion.button>
          )
        )}
      </div>
    </div>
  );
}
