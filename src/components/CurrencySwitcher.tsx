import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatExchangeRate } from '../lib/currency.ts';
import type { CurrencyCode } from '../types/marketplace.ts';

interface CurrencySwitcherProps {
  variant?: 'header' | 'footer';
}

export const CurrencySwitcher: React.FC<CurrencySwitcherProps> = ({ variant = 'header' }) => {
  const {
    currency,
    setCurrency,
    exchangeRateInfo,
    exchangeRateLoading,
    refreshExchangeRate,
    pushToast,
  } = useMarketplace();

  const currencies: { code: CurrencyCode; symbol: string }[] = [
    { code: 'USD', symbol: '$' },
    { code: 'LKR', symbol: 'Rs' },
  ];

  const handleRefreshRate = async () => {
    const rate = await refreshExchangeRate({ force: true, showGlobalLoader: true });
    pushToast(`Exchange rate synced: ${formatExchangeRate(rate)}`, 'success');
  };

  const sourceLabel =
    exchangeRateInfo.source === 'live'
      ? `Live FX (${exchangeRateInfo.provider})`
      : exchangeRateInfo.source === 'cache'
        ? `Cached FX (${exchangeRateInfo.provider})`
        : 'Default rate';

  if (variant === 'footer') {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/5 px-2.5 py-1.5">
        <div role="group" aria-label="Footer currency selector" className="inline-flex items-center gap-1">
          {currencies.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => void setCurrency(item.code)}
              className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currency === item.code
                  ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {item.symbol} {item.code}
            </button>
          ))}
        </div>
        <span className="h-3.5 w-px bg-slate-200 dark:bg-white/10" aria-hidden="true" />
        <span
          className="text-[11px] font-mono text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap"
          title={sourceLabel}
        >
          {formatExchangeRate(exchangeRateInfo.lkrPerUsd)}
        </span>
        <button
          type="button"
          onClick={() => void handleRefreshRate()}
          disabled={exchangeRateLoading}
          aria-label="Refresh live exchange rate"
          title={`Refresh live rate (${sourceLabel})`}
          className="p-1 rounded-md text-slate-500 hover:text-violet-700 dark:text-slate-400 dark:hover:text-cyan-300 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${exchangeRateLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 p-0.5"
      title={`${formatExchangeRate(exchangeRateInfo.lkrPerUsd)} · ${sourceLabel}`}
    >
      <div role="group" aria-label="Currency selector" className="inline-flex items-center">
        {currencies.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => void setCurrency(item.code)}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currency === item.code
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {item.code}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleRefreshRate()}
        disabled={exchangeRateLoading}
        aria-label="Sync live USD to LKR exchange rate"
        className="hidden sm:inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer disabled:opacity-50"
      >
        <span>1:{Math.round(exchangeRateInfo.lkrPerUsd)}</span>
        <RefreshCw className={`w-3 h-3 text-violet-600 dark:text-cyan-400 ${exchangeRateLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};
