import React, { useMemo, useState } from 'react';
import { GitCompareArrows, Sparkles, Trash2 } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatPrice, getEffectivePriceUsd } from '../lib/currency.ts';
import { ProductImage } from './ProductImage.tsx';

interface AiComparisonResult {
  winnerId: string;
  comparisonSummary: string;
  keyTradeoffs: string[];
  bestFor: { productId: string; verdict: string }[];
}

export const CompareView: React.FC = () => {
  const {
    products,
    compareIds,
    toggleCompare,
    clearCompare,
    currency,
    settings,
    addToCart,
    navigate,
    withLoading,
    pushToast,
  } = useMarketplace();

  const [focusQuestion, setFocusQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiComparisonResult | null>(null);

  const selectedProducts = useMemo(
    () => products.filter((p) => compareIds.includes(p.id)),
    [products, compareIds]
  );

  const allSpecLabels = useMemo(() => {
    const set = new Set<string>();
    selectedProducts.forEach((p) => p.specs.forEach((s) => set.add(s.label)));
    return Array.from(set);
  }, [selectedProducts]);

  const handleAiCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProducts.length < 2) {
      pushToast('Select at least 2 products to compare.', 'error');
      return;
    }
    setAiLoading(true);
    try {
      await withLoading(async () => {
        const res = await fetch('/api/ai/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            focusQuestion: focusQuestion.trim() || undefined,
            products: selectedProducts.map((p) => ({
              id: p.id,
              title: p.title,
              categoryName: p.categoryName,
              priceUsd: getEffectivePriceUsd(p),
              rating: p.rating,
              stock: p.stock,
              specs: p.specs,
              description: p.description,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          pushToast(data.error || 'Comparison failed.', 'error');
          return;
        }
        setAiResult(data);
      }, 'Analyzing product specifications...');
    } catch {
      pushToast('Network error during AI comparison.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
            Side-by-Side Specification Matrix
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Product Comparison ({selectedProducts.length}/4)
          </h1>
        </div>
        {selectedProducts.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearCompare();
              setAiResult(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/15 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Tray
          </button>
        )}
      </div>

      {selectedProducts.length < 2 ? (
        <div className="glass-surface rounded-3xl p-10 text-center space-y-5">
          <GitCompareArrows className="w-8 h-8 mx-auto text-slate-400" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              Select at least 2 products to compare side by side
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add items using the compare button on any product card, or pick quickly below.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {products.slice(0, 4).map((p) => {
              const active = compareIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleCompare(p.id)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-medium cursor-pointer ${
                    active
                      ? 'border-violet-600 bg-violet-600 text-white dark:border-cyan-400 dark:bg-cyan-400 dark:text-slate-950'
                      : 'border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {p.title}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Gemini Comparison Assistant */}
          <div className="glass-surface rounded-3xl p-6 space-y-4">
            <form onSubmit={handleAiCompare} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={focusQuestion}
                onChange={(e) => setFocusQuestion(e.target.value)}
                placeholder="Ask Gemini what matters most (e.g. 'Which offers better travel battery & portability?')"
                className="flex-1 rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 dark:bg-cyan-400 px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-950 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiLoading ? 'Analyzing...' : 'Analyze with AI'}</span>
              </button>
            </form>

            {aiResult && (
              <div className="rounded-2xl border border-violet-500/20 dark:border-cyan-400/20 bg-violet-600/5 dark:bg-cyan-400/5 p-5 space-y-3">
                <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                  {aiResult.comparisonSummary}
                </p>
                {aiResult.keyTradeoffs.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    {aiResult.keyTradeoffs.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  {aiResult.bestFor.map((bf) => {
                    const p = selectedProducts.find((item) => item.id === bf.productId);
                    if (!p) return null;
                    const isWinner = bf.productId === aiResult.winnerId;
                    return (
                      <div
                        key={bf.productId}
                        className={`rounded-xl border p-3 text-xs ${
                          isWinner
                            ? 'border-violet-600/50 dark:border-cyan-400/50 bg-white/80 dark:bg-slate-900/80'
                            : 'border-slate-200/70 dark:border-white/10 bg-white/50 dark:bg-white/5'
                        }`}
                      >
                        <div className="font-semibold text-slate-950 dark:text-white">
                          {p.title} {isWinner ? '· Top Pick' : ''}
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-300">{bf.verdict}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Comparison Table */}
          <div className="glass-surface rounded-3xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-white/10">
                  <th className="p-5 text-xs font-semibold text-slate-500 dark:text-slate-400 w-44">
                    Attribute
                  </th>
                  {selectedProducts.map((p) => (
                    <th key={p.id} className="p-5 align-top">
                      <div className="space-y-3">
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full aspect-[4/3] rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => navigate('product', { productId: p.id })}
                          className="text-left font-display text-sm font-bold text-slate-950 dark:text-white hover:underline cursor-pointer"
                        >
                          {p.title}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void addToCart(p.id, 1)}
                            className="rounded-lg bg-slate-950 dark:bg-white px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-950 cursor-pointer"
                          >
                            Add to Bag
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCompare(p.id)}
                            className="text-xs text-slate-500 hover:text-rose-600 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/10 text-xs">
                <tr>
                  <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">Price</td>
                  {selectedProducts.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 font-semibold text-slate-950 dark:text-white tabular-nums"
                    >
                      {formatPrice(getEffectivePriceUsd(p), currency, settings.lkrPerUsd)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">Category</td>
                  {selectedProducts.map((p) => (
                    <td key={p.id} className="p-4 text-slate-700 dark:text-slate-200">
                      {p.categoryName}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">Seller</td>
                  {selectedProducts.map((p) => (
                    <td key={p.id} className="p-4 text-slate-700 dark:text-slate-200">
                      {p.sellerName}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">Rating</td>
                  {selectedProducts.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 text-slate-700 dark:text-slate-200 tabular-nums"
                    >
                      {p.rating.toFixed(1)} ★ ({p.reviewCount})
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">Stock</td>
                  {selectedProducts.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 text-slate-700 dark:text-slate-200 tabular-nums"
                    >
                      {p.stock > 0 ? `${p.stock} available` : 'Out of stock'}
                    </td>
                  ))}
                </tr>
                {allSpecLabels.map((label) => (
                  <tr key={label}>
                    <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                      {label}
                    </td>
                    {selectedProducts.map((p) => {
                      const found = p.specs.find((s) => s.label === label);
                      return (
                        <td key={p.id} className="p-4 text-slate-700 dark:text-slate-200">
                          {found ? found.value : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
