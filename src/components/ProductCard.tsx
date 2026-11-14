import React from 'react';
import { GitCompareArrows, Heart, ShoppingBag, Star } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatPrice, getEffectivePriceUsd } from '../lib/currency.ts';
import type { Product } from '../types/marketplace.ts';
import { ProductImage } from './ProductImage.tsx';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    currency,
    settings,
    navigate,
    addToCart,
    wishlistIds,
    toggleWishlist,
    compareIds,
    toggleCompare,
  } = useMarketplace();

  const effectiveUsd = getEffectivePriceUsd(product);
  const isSaved = wishlistIds.includes(product.id);
  const isCompared = compareIds.includes(product.id);
  const outOfStock = product.stock <= 0;

  return (
    <article className="group glass-surface rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5 dark:hover:shadow-black/30">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900/80">
        <button
          type="button"
          onClick={() => navigate('product', { productId: product.id })}
          className="w-full h-full block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
          aria-label={`View details for ${product.title}`}
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>

        {/* Subtle single floating action cluster */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void toggleWishlist(product.id)}
            aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`w-9 h-9 rounded-lg backdrop-blur-md border flex items-center justify-center transition-colors cursor-pointer ${
              isSaved
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'bg-white/80 dark:bg-slate-950/75 border-slate-200/80 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => toggleCompare(product.id)}
            aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
            className={`w-9 h-9 rounded-lg backdrop-blur-md border flex items-center justify-center transition-colors cursor-pointer ${
              isCompared
                ? 'bg-cyan-600 border-cyan-500 text-white'
                : 'bg-white/80 dark:bg-slate-950/75 border-slate-200/80 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900'
            }`}
          >
            <GitCompareArrows className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          {/* Unboxed clean metadata with typographic separators (zero pill spam) */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">
              {product.categoryName} · {product.sellerName}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200 tabular-nums shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {product.rating.toFixed(1)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('product', { productId: product.id })}
            className="mt-2 text-left block w-full cursor-pointer"
          >
            <h3 className="font-display text-base font-semibold text-slate-950 dark:text-white leading-snug line-clamp-2 group-hover:text-violet-700 dark:group-hover:text-cyan-300 transition-colors">
              {product.title}
            </h3>
          </button>

          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-base font-semibold text-slate-950 dark:text-white">
                {formatPrice(effectiveUsd, currency, settings.lkrPerUsd)}
              </span>
              {(product.isFlashSale && product.flashDiscountPercent > 0) ||
              (product.compareAtUsd && product.compareAtUsd > effectiveUsd) ? (
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(
                    product.compareAtUsd && product.compareAtUsd > product.priceUsd
                      ? product.compareAtUsd
                      : product.priceUsd,
                    currency,
                    settings.lkrPerUsd
                  )}
                </span>
              ) : null}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {outOfStock
                ? 'Out of stock'
                : product.isFlashSale && product.flashDiscountPercent > 0
                  ? `Flash Drop -${product.flashDiscountPercent}% · ${product.stock} left`
                  : product.isDemo
                    ? `Demo Catalog · ${product.stock} in stock`
                    : `${product.stock} in stock`}
            </div>
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={() => void addToCart(product.id, 1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 dark:bg-white px-3.5 py-2 text-xs font-semibold text-white dark:text-slate-950 hover:bg-violet-700 dark:hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{outOfStock ? 'Sold Out' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
