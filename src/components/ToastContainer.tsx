import React from 'react';
import { X } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useMarketplace();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto glass-panel rounded-xl px-4 py-3 text-xs font-medium shadow-lg flex items-center justify-between gap-3 ${
            toast.tone === 'error'
              ? 'border-rose-500/40 text-rose-700 dark:text-rose-300'
              : toast.tone === 'success'
                ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'text-slate-800 dark:text-slate-100'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss message"
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
