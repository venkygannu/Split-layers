import { motion } from 'framer-motion';
import { Pipette } from 'lucide-react';
import { rgbToHex } from '../utils/colorUtils';

export function ColorPreviewPanel({ selectedColor }) {
  const hasColor = selectedColor != null;
  const hex = hasColor
    ? rgbToHex(selectedColor.r, selectedColor.g, selectedColor.b)
    : null;
  const rgb = hasColor
    ? `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`
    : null;

  return (
    <div className="rounded-xl bg-white/60 border border-gray-100 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Pipette className="w-4 h-4 text-blue-500" />
        <span className="font-medium text-gray-700 text-sm">Selected color</span>
      </div>
      {hasColor ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-lg border border-gray-100 shadow-inner-soft shrink-0"
            style={{ backgroundColor: hex }}
          />
          <div className="text-xs min-w-0">
            <p className="font-mono font-semibold text-gray-800">{hex}</p>
            <p className="font-mono text-gray-500">{rgb}</p>
          </div>
        </motion.div>
      ) : (
        <p className="text-gray-400 text-xs">Click on the image to pick a color.</p>
      )}
    </div>
  );
}
