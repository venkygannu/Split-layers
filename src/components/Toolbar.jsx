import { motion } from 'framer-motion';
import { FileDown } from 'lucide-react';

export function Toolbar({
  onExportCSV,
  hasImage,
  hasLayers,
  isProcessing,
}) {
  if (!hasImage) return null;

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2">
      <motion.button
        type="button"
        whileHover={{ scale: isProcessing || !hasLayers ? 1 : 1.02 }}
        whileTap={{ scale: isProcessing || !hasLayers ? 1 : 0.97 }}
        onClick={onExportCSV}
        disabled={!hasLayers || isProcessing}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-gray-100 text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <FileDown className="w-4 h-4" />
        <span className="hidden sm:inline">CSV</span>
      </motion.button>
    </nav>
  );
}
