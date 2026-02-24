import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, ImageIcon } from 'lucide-react';
import { stitchImages } from '../utils/imageUtils';

const LAYOUTS = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'grid', label: 'Grid' },
];

export function StitchPanel({ onStitched, onClose }) {
  const [urls, setUrls] = useState([]);
  const [layout, setLayout] = useState('horizontal');
  const [isStitching, setIsStitching] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback((e) => {
    const files = Array.from(e.target?.files ?? []);
    const newUrls = [];
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      newUrls.push(url);
    });
    setUrls((prev) => [...prev, ...newUrls]);
    e.target.value = '';
  }, []);

  const removeAt = useCallback((index) => {
    setUrls((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index]);
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    urls.forEach((u) => URL.revokeObjectURL(u));
    setUrls([]);
    onClose();
  }, [urls, onClose]);

  const handleStitch = useCallback(async () => {
    if (urls.length < 2) return;
    setIsStitching(true);
    try {
      const dataUrl = await stitchImages(urls, layout);
      urls.forEach((u) => URL.revokeObjectURL(u));
      setUrls([]);
      onStitched(dataUrl);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsStitching(false);
    }
  }, [urls, layout, onStitched, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-white/50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Stitch images</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Close"
              onClick={handleClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">
              Add two or more images. They will be combined in the chosen layout.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add images
            </button>
            {urls.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {urls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
                  <select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    {LAYOUTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 p-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStitch}
              disabled={urls.length < 2 || isStitching}
              className="flex-1 py-2 rounded-xl bg-violet-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-600"
            >
              {isStitching ? 'Stitching…' : 'Stitch'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
