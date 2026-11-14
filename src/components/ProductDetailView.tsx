import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  GitCompareArrows,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatPrice, getEffectivePriceUsd } from '../lib/currency.ts';
import { createProductReview } from '../services/firestoreService.ts';
import { ProductCard } from './ProductCard.tsx';
import { ProductImage } from './ProductImage.tsx';

export const ProductDetailView: React.FC = () => {
  const {
    products,
    selectedProductId,
    reviews,
    currency,
    settings,
    navigate,
    addToCart,
    wishlistIds,
    toggleWishlist,
    compareIds,
    toggleCompare,
    firebaseUser,
    userProfile,
    signInWithGoogle,
    openAiWithPrompt,
    pushToast,
  } = useMarketplace();

  const product = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!product) return;
    setActiveImage(product.imageUrl);
    setQuantity(1);
    document.title = `${product.title} — VELTRIX`;

    // SEO Product JSON-LD structured data
    const scriptId = 'veltrix-product-jsonld';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      sku: product.sku,
      description: product.description,
      brand: { '@type': 'Brand', name: product.sellerName },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: getEffectivePriceUsd(product),
        availability:
          product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: Math.max(1, product.reviewCount),
      },
    });

    return () => {
      document.title = 'VELTRIX — Shop Smarter. Live Better.';
    };
  }, [product]);

  if (!product) return null;

  const gallery = product.gallery.length > 0 ? product.gallery : [product.imageUrl];
  const effectiveUsd = getEffectivePriceUsd(product);
  const isSaved = wishlistIds.includes(product.id);
  const isCompared = compareIds.includes(product.id);
  const productReviews = reviews.filter((r) => r.productId === product.id);
  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.status === 'active')
    .sort((a, b) => Number(b.categoryId === product.categoryId) - Number(a.categoryId === product.categoryId))
    .slice(0, 3);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      await signInWithGoogle();
      return;
    }
    if (reviewTitle.trim().length < 2 || reviewComment.trim().length < 4) {
      pushToast('Please enter a review headline and comment.', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      await createProductReview({
        productId: product.id,
        userId: firebaseUser.uid,
        userName: userProfile?.displayName || firebaseUser.displayName || 'VELTRIX Customer',
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
        verifiedPurchase: false,
      });
      setReviewTitle('');
      setReviewComment('');
      setReviewRating(5);
      pushToast('Review published.', 'success');
    } catch {
      pushToast('Could not submit review. Ensure demo catalog is seeded or product is live.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-16 pb-20">
      {/* Main Sticky Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Sticky Gallery */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="glass-surface rounded-3xl overflow-hidden aspect-[4/3]">
            <ProductImage
              src={activeImage || product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>

          {gallery.length > 1 && (
            <div className="flex items-center gap-3">
              {gallery.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`w-24 aspect-[4/3] rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    activeImage === img
                      ? 'border-violet-600 dark:border-cyan-400 ring-2 ring-violet-600/20 dark:ring-cyan-400/20'
                      : 'border-slate-200 dark:border-white/10 opacity-75 hover:opacity-100'
                  }`}
                >
                  <ProductImage src={img} alt={`${product.title} angle ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 glass-surface rounded-3xl p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {product.categoryName} · {product.sellerName} · SKU {product.sku}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {product.rating.toFixed(1)} ({productReviews.length})
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white leading-tight">
              {product.title}
            </h1>
          </div>

          <div className="pb-5 border-b border-slate-200/70 dark:border-white/10">
            <div className="flex items-baseline gap-3 tabular-nums">
              <span className="font-display text-3xl font-bold text-slate-950 dark:text-white">
                {formatPrice(effectiveUsd, currency, settings.lkrPerUsd)}
              </span>
              {effectiveUsd < product.priceUsd && (
                <span className="text-sm text-slate-400 line-through">
                  {formatPrice(product.priceUsd, currency, settings.lkrPerUsd)}
                </span>
              )}
            </div>
            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {product.stock > 0
                ? `${product.stock} units ready to ship · Free shipping over ${formatPrice(
                    settings.freeShippingThresholdUsd,
                    currency,
                    settings.lkrPerUsd
                  )}`
                : 'Currently out of stock'}
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {product.description}
          </p>

          {/* Quantity + Primary Add CTA */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/5">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3 text-slate-700 dark:text-slate-200 hover:text-slate-950 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums text-slate-950 dark:text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                  className="p-3 text-slate-700 dark:text-slate-200 hover:text-slate-950 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => void addToCart(product.id, quantity)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 dark:bg-white px-6 py-3.5 text-sm font-semibold text-white dark:text-slate-950 hover:bg-violet-700 dark:hover:bg-cyan-300 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{product.stock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => void toggleWishlist(product.id)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium cursor-pointer ${
                  isSaved
                    ? 'border-violet-600 bg-violet-600/10 text-violet-700 dark:border-cyan-400 dark:bg-cyan-400/10 dark:text-cyan-300'
                    : 'border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                <span>{isSaved ? 'Saved' : 'Wishlist'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleCompare(product.id)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium cursor-pointer ${
                  isCompared
                    ? 'border-cyan-600 bg-cyan-600/10 text-cyan-700 dark:text-cyan-300'
                    : 'border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                }`}
              >
                <GitCompareArrows className="w-3.5 h-3.5" />
                <span>{isCompared ? 'Comparing' : 'Compare'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  openAiWithPrompt(`Tell me if the ${product.title} fits my workflow and summarize its specs.`)
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/15 py-2.5 text-xs font-medium text-violet-700 dark:text-cyan-300 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI</span>
              </button>
            </div>
          </div>

          {/* Specifications Table */}
          {product.specs.length > 0 && (
            <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-2.5">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Technical Specifications
              </div>
              <dl className="divide-y divide-slate-200/60 dark:divide-white/10 text-xs">
                {product.specs.map((spec) => (
                  <div key={spec.label} className="py-2 flex items-center justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">{spec.label}</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100 text-right tabular-nums">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 glass-surface rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-950 dark:text-white">
            Write a Customer Review
          </h2>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= reviewRating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your experience"
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Review Details
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share build quality, daily comfort, or acoustic notes..."
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full rounded-xl bg-slate-950 dark:bg-white py-3 text-sm font-semibold text-white dark:text-slate-950 hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {firebaseUser
                ? submittingReview
                  ? 'Publishing...'
                  : 'Submit Review'
                : 'Sign In with Google to Review'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 glass-surface rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-slate-950 dark:text-white">
              Verified Reviews ({productReviews.length})
            </h2>
            <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
              {product.rating.toFixed(1)} / 5.0
            </span>
          </div>

          {productReviews.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No reviews yet for this product. Be the first to share your experience.
            </p>
          ) : (
            <div className="divide-y divide-slate-200/70 dark:divide-white/10">
              {productReviews.map((rev) => (
                <div key={rev.id} className="py-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      {rev.title}
                    </div>
                    <div className="text-xs font-medium text-amber-500 tabular-nums shrink-0">
                      {'★'.repeat(rev.rating)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{rev.userName}</span>
                    {rev.verifiedPurchase && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3 h-3" /> Verified Buyer
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Related Products */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
          Related Hardware
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {relatedProducts.map((rel) => (
            <ProductCard key={rel.id} product={rel} />
          ))}
        </div>
      </section>
    </div>
  );
};
