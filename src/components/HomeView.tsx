import React, { useMemo, useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, Truck, Globe } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { HERO_STUDIO_IMAGE } from '../lib/mediaAssets.ts';
import { ProductCard } from './ProductCard.tsx';
import { ProductImage } from './ProductImage.tsx';

export const HomeView: React.FC = () => {
  const {
    products,
    categories,
    sellers,
    recentlyViewedIds,
    wishlistIds,
    cartItems,
    navigate,
    openAiWithPrompt,
    isUsingDemoFallback,
    withLoading,
    pushToast,
  } = useMarketplace();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [aiPicksLoading, setAiPicksLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiPickItems, setAiPickItems] = useState<{ productId: string; reason: string }[]>([]);

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'active'),
    [products]
  );

  const visibleFeatured = useMemo(() => {
    const filtered =
      selectedCategory === 'all'
        ? activeProducts
        : activeProducts.filter((p) => p.categoryId === selectedCategory);
    const featuredFirst = [...filtered].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    return featuredFirst.slice(0, 6);
  }, [activeProducts, selectedCategory]);

  const recentlyViewedProducts = useMemo(() => {
    const map = new Map(activeProducts.map((p) => [p.id, p]));
    return recentlyViewedIds
      .map((id) => map.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .slice(0, 4);
  }, [activeProducts, recentlyViewedIds]);

  const handleGenerateRecommendations = async () => {
    setAiPicksLoading(true);
    try {
      await withLoading(async () => {
        const res = await fetch('/api/ai/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recentlyViewedIds,
            wishlistIds,
            cartIds: cartItems.map((c) => c.product.id),
            products: activeProducts.map((p) => ({
              id: p.id,
              title: p.title,
              categoryName: p.categoryName,
              priceUsd: p.priceUsd,
              rating: p.rating,
              tags: p.tags,
              description: p.description,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          pushToast(data.error || 'Could not load AI recommendations.', 'error');
          return;
        }
        setAiSummary(data.summary || null);
        setAiPickItems(Array.isArray(data.recommendations) ? data.recommendations : []);
      }, 'Curating personalized recommendations...');
    } catch {
      pushToast('Failed to reach AI recommendation service.', 'error');
    } finally {
      setAiPicksLoading(false);
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Section 1: Storefront Split Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-8">
        <div className="glass-surface rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="text-xs font-medium tracking-wide text-violet-700 dark:text-cyan-300">
                VELTRIX Marketplace · Shop Smarter. Live Better.
              </div>
              <h1
                className="font-display font-bold tracking-tight text-slate-950 dark:text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)' }}
              >
                Precision Hardware for Modern Living
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Curated acoustic instruments, titanium wearables, and architectural desk tools from
                verified independent studios — backed by transparent USD &amp; LKR pricing.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('catalog')}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 dark:bg-white px-6 py-3.5 text-sm font-semibold text-white dark:text-slate-950 hover:bg-violet-700 dark:hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Explore Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openAiWithPrompt('Recommend a cohesive desk & audio setup under $700')
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/70 dark:bg-white/5 px-5 py-3.5 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-white dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-violet-600 dark:text-cyan-400" />
                  <span>Ask AI Specialist</span>
                </button>
              </div>

              <div className="pt-5 border-t border-slate-200/70 dark:border-white/10 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-slate-950 dark:text-white tabular-nums">
                    {activeProducts.length} Flagships
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {isUsingDemoFallback ? 'Demo catalog preview' : 'Live studio inventory'}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-950 dark:text-white tabular-nums">
                    USD &amp; LKR
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Live dual-currency pricing
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-950 dark:text-white">
                    COD &amp; Verified
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Full order tracking
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative min-h-[280px] lg:min-h-[460px] bg-slate-900">
            <img
              src={HERO_STUDIO_IMAGE}
              alt="VELTRIX precision audio headphones, titanium smartwatch, and studio monitor"
              className="w-full h-full lg:h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-5 left-5 right-5 glass-surface rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="text-xs">
                <div className="font-semibold text-slate-950 dark:text-white">
                  Autumn Studio Collection
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Aethel Acoustics · Vanguard Horology · Atelier Lumen
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('catalog')}
                className="text-xs font-semibold text-violet-700 dark:text-cyan-300 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                View All
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Curated Collection & Category Filter */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
              Curated Collection
            </div>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Featured Studio Releases
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              All ({activeProducts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleFeatured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => navigate('catalog', { categoryId: selectedCategory })}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 dark:border-white/15 glass-surface px-6 py-3 text-sm font-medium text-slate-900 dark:text-white hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Section 3: Personalized Recommendations & Recently Viewed */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
        <div className="glass-surface rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
                Personalized Discovery
              </div>
              <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white">
                Tailored Picks &amp; Recently Viewed
              </h2>
            </div>
            <button
              type="button"
              disabled={aiPicksLoading}
              onClick={() => void handleGenerateRecommendations()}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 dark:bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white dark:text-slate-950 hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{aiPicksLoading ? 'Analyzing catalog...' : 'Get AI Recommendations'}</span>
            </button>
          </div>

          {aiSummary && (
            <div className="rounded-2xl border border-violet-500/20 dark:border-cyan-400/20 bg-violet-600/5 dark:bg-cyan-400/5 p-4 text-sm text-slate-700 dark:text-slate-200">
              {aiSummary}
            </div>
          )}

          {aiPickItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiPickItems.map((pick) => {
                const prod = activeProducts.find((p) => p.id === pick.productId);
                if (!prod) return null;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => navigate('product', { productId: prod.id })}
                    className="text-left rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 flex items-start gap-3.5 hover:border-violet-500/40 dark:hover:border-cyan-400/40 transition-colors cursor-pointer"
                  >
                    <ProductImage
                      src={prod.imageUrl}
                      alt={prod.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-950 dark:text-white line-clamp-1">
                        {prod.title}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {pick.reason}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {recentlyViewedProducts.length > 0 ? (
            <div className="pt-4 border-t border-slate-200/70 dark:border-white/10">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                Recently Viewed
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recentlyViewedProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate('product', { productId: p.id })}
                    className="text-left rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3 hover:border-violet-500/40 dark:hover:border-cyan-400/40 transition-colors cursor-pointer"
                  >
                    <ProductImage
                      src={p.imageUrl}
                      alt={p.title}
                      className="w-full aspect-[4/3] rounded-lg object-cover mb-2.5"
                    />
                    <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {p.categoryName}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inspect any product to track your recently viewed history, or generate personalized AI
              suggestions from the live catalog.
            </p>
          )}
        </div>
      </section>

      {/* Section 4: Independent Studios & Marketplace Guarantees */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-surface rounded-3xl p-8 space-y-5">
          <div>
            <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
              Verified Independent Makers
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-950 dark:text-white">
              Partner Studios on VELTRIX
            </h2>
          </div>

          <div className="divide-y divide-slate-200/70 dark:divide-white/10">
            {sellers.slice(0, 4).map((seller) => (
              <div key={seller.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {seller.storeName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {seller.country} · {seller.description}
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 tabular-nums shrink-0">
                  {seller.rating.toFixed(1)} ★
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 glass-surface rounded-3xl p-8 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold text-slate-950 dark:text-white">
              Built for Transparent Commerce
            </h3>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-violet-600 dark:text-cyan-400 mt-1 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Multi-Currency Clarity
                  </div>
                  <p className="text-xs mt-0.5">
                    Instant switching between USD and Sri Lankan Rupees (LKR) across catalog, cart,
                    and checkout.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="w-4 h-4 text-violet-600 dark:text-cyan-400 mt-1 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Cash on Delivery &amp; Tracked Dispatch
                  </div>
                  <p className="text-xs mt-0.5">
                    Place verified COD or invoice-reserved orders with live status updates from
                    sellers.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-violet-600 dark:text-cyan-400 mt-1 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Seller Onboarding
                  </div>
                  <p className="text-xs mt-0.5">
                    Launch your own verified VELTRIX studio storefront with inventory and order
                    analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('seller')}
            className="w-full rounded-xl border border-slate-300/80 dark:border-white/15 py-3 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Open Seller Portal
          </button>
        </div>
      </section>
    </div>
  );
};
