import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, ImageIcon } from 'lucide-react';

const ACCEPT = 'image/png,image/jpeg,image/jpg';

export function ImageUploader({ onImageLoad, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file) => {
      if (!file || !file.type.match(/^image\/(png|jpeg|jpg)$/i)) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result;
        if (dataUrl) onImageLoad(dataUrl, file.name);
      };
      reader.readAsDataURL(file);
    },
    [onImageLoad]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer?.files?.[0];
      handleFile(file);
    },
    [disabled, handleFile]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onSelectFile = useCallback(
    (e) => {
      const file = e.target?.files?.[0];
      handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const clickUpload = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg mx-auto"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onSelectFile}
        className="hidden"
        aria-label="Upload image"
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && clickUpload()}
        onClick={clickUpload}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          relative rounded-3xl border-2 border-dashed transition-all duration-300
          glass-panel
          min-h-[180px] flex flex-col items-center justify-center gap-4 p-10
          ${isDragging
            ? 'border-blue-400 bg-blue-50/60 scale-[1.01]'
            : 'border-gray-200 hover:border-blue-300 hover:shadow-glow'
          }
          ${disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}
        `}
      >
        <motion.div
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-5 shadow-soft"
        >
          <Upload className="w-8 h-8 text-blue-500" />
        </motion.div>
        <div className="text-center">
          <p className="text-gray-800 font-semibold text-lg">Drop your image here</p>
          <p className="text-gray-500 text-sm mt-1">or click to browse — PNG or JPG</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Recommended: up to 4096 x 4096</span>
        </div>
      </div>
    </motion.div>
  );
}
