import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatPrice, getEffectivePriceUsd } from '../lib/currency.ts';
import { ProductCard } from './ProductCard.tsx';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

export const CatalogView: React.FC = () => {
  const {
    products,
    categories,
    catalogCategoryFilter,
    catalogSearchQuery,
    selectCatalogCategory,
    setCatalogSearchQuery,
    currency,
    settings,
    withLoading,
    pushToast,
  } = useMarketplace();

  const [searchInput, setSearchInput] = useState(catalogSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(catalogCategoryFilter);
  const [maxPriceUsd, setMaxPriceUsd] = useState<number>(2000);
  const [minRating, setMinRating] = useState<number>(0);
  const [flashOnly, setFlashOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [page, setPage] = useState<number>(1);

  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiMatchedIds, setAiMatchedIds] = useState<string[] | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(catalogSearchQuery);
    setSelectedCategory(catalogCategoryFilter);
    setPage(1);
  }, [catalogSearchQuery, catalogCategoryFilter]);

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'active'),
    [products]
  );

  const runAiSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setAiSearching(true);
    try {
      await withLoading(async () => {
        const res = await fetch('/api/ai/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: queryText,
            products: activeProducts.map((p) => ({
              id: p.id,
              title: p.title,
              categoryName: p.categoryName,
              priceUsd: getEffectivePriceUsd(p),
              rating: p.rating,
              tags: p.tags,
              description: p.description,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          pushToast(data.error || 'AI search unavailable.', 'error');
          return;
        }
        setAiMatchedIds(Array.isArray(data.matchedProductIds) ? data.matchedProductIds : []);
        setAiExplanation(data.explanation || null);
        setPage(1);
      }, 'Searching catalog with Gemini AI...');
    } catch {
      pushToast('Network error during AI search.', 'error');
    } finally {
      setAiSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogSearchQuery(searchInput.trim());
    if (aiSearchMode && searchInput.trim()) {
      void runAiSearch(searchInput);
    } else {
      setAiMatchedIds(null);
      setAiExplanation(null);
      setPage(1);
    }
  };

  const filteredProducts = useMemo(() => {
    let list = [...activeProducts];

    if (aiMatchedIds !== null) {
      const orderMap = new Map(aiMatchedIds.map((id, idx) => [id, idx]));
      list = list
        .filter((p) => orderMap.has(p.id))
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    } else if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }

    list = list.filter((p) => getEffectivePriceUsd(p) <= maxPriceUsd);

    if (minRating > 0) {
      list = list.filter((p) => p.rating >= minRating);
    }

    if (flashOnly) {
      list = list.filter((p) => p.isFlashSale && p.flashDiscountPercent > 0);
    }

    if (aiMatchedIds === null) {
      if (sortBy === 'price-asc') {
        list.sort((a, b) => getEffectivePriceUsd(a) - getEffectivePriceUsd(b));
      } else if (sortBy === 'price-desc') {
        list.sort((a, b) => getEffectivePriceUsd(b) - getEffectivePriceUsd(a));
      } else if (sortBy === 'rating') {
        list.sort((a, b) => b.rating - a.rating);
      } else {
        list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
      }
    }

    return list;
  }, [
    activeProducts,
    aiMatchedIds,
    searchInput,
    selectedCategory,
    maxPriceUsd,
    minRating,
    flashOnly,
    sortBy,
  ]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const clearAllFilters = () => {
    setSearchInput('');
    setSelectedCategory('all');
    selectCatalogCategory('all');
    setCatalogSearchQuery('');
    setMaxPriceUsd(2000);
    setMinRating(0);
    setFlashOnly(false);
    setSortBy('featured');
    setAiMatchedIds(null);
    setAiExplanation(null);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header & Search */}
      <div className="glass-surface rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
              Marketplace Catalog
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              Browse All Products
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAiSearchMode((m) => !m);
                setAiMatchedIds(null);
                setAiExplanation(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                aiSearchMode
                  ? 'border-violet-600 bg-violet-600 text-white dark:border-cyan-400 dark:bg-cyan-400 dark:text-slate-950'
                  : 'border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{aiSearchMode ? 'AI Search Active' : 'Enable AI Natural Search'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value.trim()) {
                  setAiMatchedIds(null);
                  setAiExplanation(null);
                }
                setPage(1);
              }}
              placeholder={
                aiSearchMode
                  ? 'Describe what you need (e.g. "lightweight ANC audio for flights under $400")'
                  : 'Filter by product name, brand, tag, or specification...'
              }
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/40 dark:focus:ring-cyan-400/40"
            />
          </div>
          <button
            type="submit"
            disabled={aiSearching}
            className="rounded-xl bg-slate-950 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-950 hover:bg-violet-700 dark:hover:bg-cyan-300 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {aiSearching ? 'Searching...' : aiSearchMode ? 'Search with Gemini' : 'Filter'}
          </button>
        </form>

        {aiExplanation && (
          <div className="rounded-2xl border border-violet-500/20 dark:border-cyan-400/20 bg-violet-600/5 dark:bg-cyan-400/5 px-4 py-3 flex items-center justify-between gap-4 text-xs text-slate-700 dark:text-slate-200">
            <span>{aiExplanation}</span>
            <button
              type="button"
              onClick={() => {
                setAiMatchedIds(null);
                setAiExplanation(null);
              }}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear AI filter
            </button>
          </div>
        )}
      </div>

      {/* Filters + Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 glass-surface rounded-2xl p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-medium text-violet-700 dark:text-cyan-300 hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  selectCatalogCategory('all');
                  setPage(1);
                }}
                className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    selectCatalogCategory(cat.id);
                    setPage(1);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-200/70 dark:border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Max Price</span>
              <span className="font-mono tabular-nums text-slate-950 dark:text-white">
                {formatPrice(maxPriceUsd, currency, settings.lkrPerUsd)}
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={25}
              value={maxPriceUsd}
              onChange={(e) => {
                setMaxPriceUsd(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Maximum price filter"
              className="w-full accent-violet-600 dark:accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-200/70 dark:border-white/10">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Minimum Rating
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 4.5, 4.8].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setMinRating(r);
                    setPage(1);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer tabular-nums ${
                    minRating === r
                      ? 'border-violet-600 bg-violet-600/10 text-violet-700 dark:border-cyan-400 dark:bg-cyan-400/10 dark:text-cyan-300'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {r === 0 ? 'Any' : `${r}+ ★`}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/70 dark:border-white/10">
            <label className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
              <span>Flash Sale Drops Only</span>
              <input
                type="checkbox"
                checked={flashOnly}
                onChange={(e) => {
                  setFlashOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 accent-violet-600 dark:accent-cyan-400 rounded cursor-pointer"
              />
            </label>
          </div>
        </aside>

        {/* Product Results */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Showing {pagedProducts.length} of {filteredProducts.length} products
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="catalog-sort" className="text-xs text-slate-500 dark:text-slate-400">
                Sort by
              </label>
              <select
                id="catalog-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {pagedProducts.length === 0 ? (
            <div className="glass-surface rounded-2xl p-12 text-center space-y-4">
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                No products match your current filters
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try widening your price range or clearing your search query.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-xl bg-slate-950 dark:bg-white px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-950 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/15 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold tabular-nums cursor-pointer ${
                    safePage === num
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                      : 'border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/15 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
