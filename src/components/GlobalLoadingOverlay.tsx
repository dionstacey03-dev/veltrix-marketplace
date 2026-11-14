import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';

export const GlobalLoadingOverlay: React.FC = () => {
  const { isLoading, loadingMessage } = useMarketplace();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="veltrix-global-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={loadingMessage}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 dark:bg-[#050814]/65 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative glass-panel w-full max-w-sm rounded-3xl px-8 py-7 text-center shadow-2xl border border-white/40 dark:border-white/15 overflow-hidden"
          >
            {/* Subtle ambient glass glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-32 rounded-full bg-gradient-to-r from-violet-600/25 via-cyan-400/20 to-violet-600/25 blur-2xl"
            />

            <div className="relative flex flex-col items-center gap-5">
              {/* Dual-ring orbital loader with centered brand mark */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-slate-200/80 dark:border-white/10" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.15, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-600 border-r-cyan-400 dark:border-t-violet-400 dark:border-r-cyan-300"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                  className="absolute inset-2 rounded-full border border-transparent border-b-cyan-500/70 border-l-violet-500/70"
                />
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-md shadow-violet-600/25">
                  <span className="font-display text-sm font-bold tracking-tight text-white">
                    V
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-display text-xs font-bold tracking-[0.22em] uppercase text-violet-700 dark:text-cyan-300">
                  VELTRIX
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {loadingMessage}
                </p>
              </div>

              {/* Indeterminate frosted progress rail */}
              <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '220%' }}
                  transition={{ repeat: Infinity, duration: 1.35, ease: 'easeInOut' }}
                  className="h-full w-2/5 rounded-full bg-gradient-to-r from-violet-600 via-cyan-400 to-violet-600"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
