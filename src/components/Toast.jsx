import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info, AlertCircle, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  info: Info,
  error: AlertCircle,
};

const styles = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  error: 'bg-rose-50 text-rose-800 border-rose-200',
};

const iconColors = {
  success: 'text-emerald-500',
  info: 'text-blue-500',
  error: 'text-rose-500',
};

export function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = icons[t.type] || Info;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 35, stiffness: 500 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-card max-w-sm ${styles[t.type]}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${iconColors[t.type]}`} />
              <span className="text-sm font-medium flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
