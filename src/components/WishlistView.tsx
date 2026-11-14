import React from 'react';
import { Heart } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { ProductCard } from './ProductCard.tsx';

export const WishlistView: React.FC = () => {
  const { products, wishlistIds, navigate } = useMarketplace();
  const savedProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
            Saved Collection
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Your Wishlist ({savedProducts.length})
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('catalog')}
          className="rounded-xl border border-slate-300 dark:border-white/15 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
        >
          Browse Catalog
        </button>
      </div>

      {savedProducts.length === 0 ? (
        <div className="glass-surface rounded-3xl p-12 text-center space-y-4">
          <Heart className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            Your wishlist is currently empty
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tap the heart icon on any product card to save items for later comparison.
          </p>
          <button
            type="button"
            onClick={() => navigate('catalog')}
            className="rounded-xl bg-slate-950 dark:bg-white px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-950 cursor-pointer"
          >
            Explore Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
