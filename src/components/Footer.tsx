import React from 'react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { CurrencySwitcher } from './CurrencySwitcher.tsx';

export const Footer: React.FC = () => {
  const { navigate, setAiDrawerOpen } = useMarketplace();

  return (
    <footer className="border-t border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-[#060914]/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="font-display text-lg font-bold tracking-tight text-slate-950 dark:text-white">
            VELTRIX
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Shop Smarter. Live Better. Precision hardware marketplace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
          <button type="button" onClick={() => navigate('catalog')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer">
            Catalog
          </button>
          <button type="button" onClick={() => navigate('compare')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer">
            Compare
          </button>
          <button type="button" onClick={() => navigate('seller')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer">
            Sell on VELTRIX
          </button>
          <button type="button" onClick={() => navigate('account')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer">
            Order Tracking
          </button>
          <button type="button" onClick={() => setAiDrawerOpen(true)} className="hover:text-slate-950 dark:hover:text-white cursor-pointer">
            AI Specialist
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CurrencySwitcher variant="footer" />
          <div className="text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} VELTRIX Marketplace
          </div>
        </div>
      </div>
    </footer>
  );
};
