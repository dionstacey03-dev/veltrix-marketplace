import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatPrice, getEffectivePriceUsd } from '../lib/currency.ts';
import { ProductImage } from './ProductImage.tsx';

export const CartDrawer: React.FC = () => {
  const {
    cartItems,
    cartCount,
    cartDrawerOpen,
    setCartDrawerOpen,
    updateCartQuantity,
    removeFromCart,
    currency,
    settings,
    navigate,
  } = useMarketplace();

  if (!cartDrawerOpen) return null;

  const subtotalUsd = cartItems.reduce(
    (sum, item) => sum + getEffectivePriceUsd(item.product) * item.quantity,
    0
  );
  const freeThreshold = settings.freeShippingThresholdUsd;
  const remainingForFree = Math.max(0, freeThreshold - subtotalUsd);
  const progressPct = Math.min(100, (subtotalUsd / Math.max(1, freeThreshold)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div
        className="flex-1"
        onClick={() => setCartDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        aria-label="Shopping bag"
        className="glass-panel w-full max-w-md h-full flex flex-col justify-between shadow-2xl border-l border-slate-200/80 dark:border-white/10"
      >
        <div className="p-6 border-b border-slate-200/70 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-violet-600 dark:text-cyan-400" />
              <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white tabular-nums">
                Shopping Bag ({cartCount})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCartDrawerOpen(false)}
              aria-label="Close bag"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
              {remainingForFree === 0
                ? 'Unlocked complimentary tracked shipping'
                : `Add ${formatPrice(remainingForFree, currency, settings.lkrPerUsd)} more for free shipping`}
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-violet-600 dark:bg-cyan-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <ShoppingBag className="w-10 h-10 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Your bag is empty
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Explore flagship studio gear to get started.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('catalog');
                }}
                className="rounded-xl bg-slate-950 dark:bg-white px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-950 cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            cartItems.map(({ product, quantity }) => {
              const effUsd = getEffectivePriceUsd(product);
              return (
                <div
                  key={product.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3.5 flex gap-3.5"
                >
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCartDrawerOpen(false);
                          navigate('product', { productId: product.id });
                        }}
                        className="text-left text-xs font-semibold text-slate-950 dark:text-white line-clamp-2 hover:underline cursor-pointer"
                      >
                        {product.title}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${product.title}`}
                        onClick={() => void removeFromCart(product.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-white/15">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => void updateCartQuantity(product.id, quantity - 1)}
                          className="p-1.5 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => void updateCartQuantity(product.id, quantity + 1)}
                          className="p-1.5 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-xs font-semibold text-slate-950 dark:text-white tabular-nums">
                        {formatPrice(effUsd * quantity, currency, settings.lkrPerUsd)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-6 border-t border-slate-200/70 dark:border-white/10 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-950 dark:text-white tabular-nums">
                  {formatPrice(subtotalUsd, currency, settings.lkrPerUsd)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Estimated Shipping</span>
                <span className="tabular-nums">
                  {remainingForFree === 0
                    ? 'Free'
                    : formatPrice(18, currency, settings.lkrPerUsd)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCartDrawerOpen(false);
                navigate('checkout');
              }}
              className="w-full rounded-xl bg-slate-950 dark:bg-white py-3.5 text-sm font-semibold text-white dark:text-slate-950 hover:bg-violet-700 dark:hover:bg-cyan-300 transition-colors cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
