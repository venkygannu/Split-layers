import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus } from 'lucide-react';

const ACCEPT = 'image/png,image/jpeg,image/jpg';

export function ReplaceImageButton({ onImageLoad }) {
  const inputRef = useRef(null);

  const handleFile = useCallback(
    (e) => {
      const file = e.target?.files?.[0];
      if (!file || !file.type.match(/^image\/(png|jpeg|jpg)$/i)) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result;
        if (dataUrl) onImageLoad(dataUrl);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [onImageLoad]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFile}
        className="hidden"
        aria-label="Replace image"
      />
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-white/70 border border-white/60 text-gray-600 hover:bg-white hover:border-violet-200 hover:text-violet-700 transition-colors"
      >
        <ImagePlus className="w-4 h-4" />
        Replace image
      </motion.button>
    </>
  );
}
