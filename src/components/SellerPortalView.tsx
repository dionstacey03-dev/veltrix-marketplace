import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Box,
  CheckCircle2,
  ClipboardList,
  Plus,
  Store,
  Trash2,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatPrice } from '../lib/currency.ts';
import { PRODUCT_IMAGE_PRESETS } from '../lib/mediaAssets.ts';
import {
  deleteProduct,
  makeSafeId,
  registerSellerStore,
  slugify,
  updateOrderRecord,
  updateSellerStore,
  upsertProduct,
} from '../services/firestoreService.ts';
import type { Order, Product } from '../types/marketplace.ts';
import { ProductImage } from './ProductImage.tsx';

type SellerTab = 'analytics' | 'products' | 'orders' | 'profile';

export const SellerPortalView: React.FC = () => {
  const {
    firebaseUser,
    signInWithGoogle,
    sellers,
    products,
    categories,
    reviews,
    sellerOrders,
    currency,
    settings,
    pushToast,
  } = useMarketplace();

  const [tab, setTab] = useState<SellerTab>('analytics');

  // Registration state
  const [regStoreName, setRegStoreName] = useState('');
  const [regDescription, setRegDescription] = useState('');
  const [regCountry, setRegCountry] = useState('Sri Lanka');
  const [registering, setRegistering] = useState(false);

  // Product editor state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pTitle, setPTitle] = useState('');
  const [pCategoryId, setPCategoryId] = useState('');
  const [pPriceUsd, setPPriceUsd] = useState('199');
  const [pStock, setPStock] = useState('15');
  const [pSku, setPSku] = useState('');
  const [pImageUrl, setPImageUrl] = useState(PRODUCT_IMAGE_PRESETS[0].key);
  const [pDescription, setPDescription] = useState('');
  const [pSpecLabel, setPSpecLabel] = useState('Material');
  const [pSpecValue, setPSpecValue] = useState('Anodized Aluminum');
  const [pFlashSale, setPFlashSale] = useState(false);
  const [pFlashPct, setPFlashPct] = useState('10');
  const [savingProduct, setSavingProduct] = useState(false);

  // Tracking input cache per order
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});

  // Store profile editor
  const mySeller = useMemo(
    () => (firebaseUser ? sellers.find((s) => s.ownerUid === firebaseUser.uid) : undefined),
    [sellers, firebaseUser]
  );

  const [profileDesc, setProfileDesc] = useState('');
  const [profileCountry, setProfileCountry] = useState('');

  const myProducts = useMemo(
    () => (firebaseUser ? products.filter((p) => p.sellerId === firebaseUser.uid) : []),
    [products, firebaseUser]
  );

  const myProductIds = useMemo(() => new Set(myProducts.map((p) => p.id)), [myProducts]);
  const myReviews = useMemo(
    () => reviews.filter((r) => myProductIds.has(r.productId)),
    [reviews, myProductIds]
  );

  const salesMetrics = useMemo(() => {
    if (!firebaseUser || !mySeller) {
      return { grossUsd: 0, commissionUsd: 0, netUsd: 0, unitsSold: 0 };
    }
    let grossUsd = 0;
    let unitsSold = 0;
    for (const order of sellerOrders) {
      if (order.status === 'cancelled') continue;
      for (const item of order.items) {
        if (item.sellerId === firebaseUser.uid) {
          grossUsd += item.unitPriceUsd * item.quantity;
          unitsSold += item.quantity;
        }
      }
    }
    const commissionUsd = (grossUsd * mySeller.commissionRate) / 100;
    const netUsd = grossUsd - commissionUsd;
    return { grossUsd, commissionUsd, netUsd, unitsSold };
  }, [firebaseUser, mySeller, sellerOrders]);

  const lowStockProducts = useMemo(
    () => myProducts.filter((p) => p.stock <= 10),
    [myProducts]
  );

  if (!firebaseUser) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16">
        <div className="glass-surface rounded-3xl p-8 sm:p-10 text-center space-y-6">
          <Store className="w-10 h-10 mx-auto text-violet-600 dark:text-cyan-400" />
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
              VELTRIX Seller Studio
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Sign in with Google to register your independent storefront, manage inventory, and
              track commission payouts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="w-full rounded-xl bg-slate-950 dark:bg-white py-3.5 text-sm font-semibold text-white dark:text-slate-950 cursor-pointer"
          >
            Sign In to Open Seller Studio
          </button>
        </div>
      </div>
    );
  }

  const handleRegisterSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regStoreName.trim().length < 2) {
      pushToast('Enter a valid store name.', 'error');
      return;
    }
    setRegistering(true);
    try {
      await registerSellerStore({
        uid: firebaseUser.uid,
        storeName: regStoreName,
        description: regDescription || 'Independent VELTRIX partner studio.',
        country: regCountry || 'Sri Lanka',
        commissionRate: settings.defaultCommissionPercent,
      });
      pushToast('Seller storefront created.', 'success');
    } catch {
      pushToast('Failed to register seller storefront.', 'error');
    } finally {
      setRegistering(false);
    }
  };

  if (!mySeller) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
        <form
          onSubmit={handleRegisterSeller}
          className="glass-surface rounded-3xl p-8 sm:p-10 space-y-6"
        >
          <div>
            <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
              Marketplace Onboarding
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-950 dark:text-white">
              Register Your Seller Storefront
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Platform commission rate: {settings.defaultCommissionPercent}% per fulfilled order.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Studio / Brand Name
            </label>
            <input
              type="text"
              required
              value={regStoreName}
              onChange={(e) => setRegStoreName(e.target.value)}
              placeholder="e.g. Kandy Acoustic Works"
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Country / Origin
            </label>
            <input
              type="text"
              required
              value={regCountry}
              onChange={(e) => setRegCountry(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Studio Description
            </label>
            <textarea
              rows={3}
              required
              value={regDescription}
              onChange={(e) => setRegDescription(e.target.value)}
              placeholder="Describe your product craft, materials, and warranty..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={registering}
            className="w-full rounded-xl bg-slate-950 dark:bg-white py-3.5 text-sm font-semibold text-white dark:text-slate-950 disabled:opacity-50 cursor-pointer"
          >
            {registering ? 'Creating Storefront...' : 'Launch Seller Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  const startEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setPTitle(p.title);
    setPCategoryId(p.categoryId);
    setPPriceUsd(String(p.priceUsd));
    setPStock(String(p.stock));
    setPSku(p.sku);
    setPImageUrl(p.imageUrl);
    setPDescription(p.description);
    setPSpecLabel(p.specs[0]?.label || 'Material');
    setPSpecValue(p.specs[0]?.value || 'Anodized Aluminum');
    setPFlashSale(p.isFlashSale);
    setPFlashPct(String(p.flashDiscountPercent));
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setPTitle('');
    setPCategoryId(categories[0]?.id || 'cat_audio');
    setPPriceUsd('199');
    setPStock('15');
    setPSku('');
    setPImageUrl(PRODUCT_IMAGE_PRESETS[0].key);
    setPDescription('');
    setPFlashSale(false);
    setPFlashPct('10');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === (pCategoryId || categories[0]?.id)) || categories[0];
    if (!cat) {
      pushToast('Create a category first.', 'error');
      return;
    }
    if (pTitle.trim().length < 2 || pDescription.trim().length < 10) {
      pushToast('Title (2+ chars) and description (10+ chars) are required.', 'error');
      return;
    }
    setSavingProduct(true);
    try {
      const isNew = !editingProductId;
      const productId = editingProductId || makeSafeId('prod');
      const existing = myProducts.find((item) => item.id === editingProductId);
      await upsertProduct(
        {
          id: productId,
          sellerId: firebaseUser.uid,
          sellerName: mySeller.storeName,
          categoryId: cat.id,
          categoryName: cat.name,
          title: pTitle.trim(),
          slug: slugify(pTitle),
          description: pDescription.trim(),
          priceUsd: Math.max(1, Number(pPriceUsd)),
          stock: Math.max(0, Math.round(Number(pStock))),
          sku: pSku.trim() || `VTX-${Date.now().toString().slice(-5)}`,
          imageUrl: pImageUrl,
          gallery: [pImageUrl],
          specs: pSpecLabel.trim() && pSpecValue.trim() ? [{ label: pSpecLabel.trim(), value: pSpecValue.trim() }] : [],
          tags: [cat.name.toLowerCase(), 'studio'],
          isFeatured: existing?.isFeatured ?? false,
          isFlashSale: pFlashSale,
          flashDiscountPercent: pFlashSale ? Math.min(90, Math.max(1, Number(pFlashPct))) : 0,
          rating: existing?.rating ?? 5,
          reviewCount: existing?.reviewCount ?? 0,
          status: 'active',
          isDemo: false,
        },
        isNew
      );
      pushToast(isNew ? 'Product published.' : 'Product updated.', 'success');
      resetProductForm();
    } catch {
      pushToast('Could not save product.', 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateOrder = async (orderId: string, status: Order['status']) => {
    try {
      const tracking = trackingDrafts[orderId]?.trim();
      await updateOrderRecord(orderId, {
        status,
        ...(tracking ? { trackingNumber: tracking } : {}),
      });
      pushToast(`Order updated to ${status}.`, 'success');
    } catch {
      pushToast('Could not update order.', 'error');
    }
  };

  const handleSaveSellerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSellerStore(mySeller.id, {
        description: profileDesc.trim() || mySeller.description,
        country: profileCountry.trim() || mySeller.country,
      });
      pushToast('Store profile updated.', 'success');
    } catch {
      pushToast('Failed to update store profile.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
            Seller Dashboard · {mySeller.verified ? 'Verified Studio' : 'Standard Studio'} ·{' '}
            {mySeller.commissionRate}% Fee
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            {mySeller.storeName}
          </h1>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
          {(
            [
              { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { id: 'products', label: `Products (${myProducts.length})`, icon: <Box className="w-3.5 h-3.5" /> },
              { id: 'orders', label: `Orders (${sellerOrders.length})`, icon: <ClipboardList className="w-3.5 h-3.5" /> },
              { id: 'profile', label: 'Store Profile', icon: <Store className="w-3.5 h-3.5" /> },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                tab === item.id
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Gross Sales</div>
          <div className="mt-1 font-display text-2xl font-bold text-slate-950 dark:text-white tabular-nums">
            {formatPrice(salesMetrics.grossUsd, currency, settings.lkrPerUsd)}
          </div>
        </div>
        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Net Payout ({100 - mySeller.commissionRate}%)
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatPrice(salesMetrics.netUsd, currency, settings.lkrPerUsd)}
          </div>
        </div>
        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Units Ordered</div>
          <div className="mt-1 font-display text-2xl font-bold text-slate-950 dark:text-white tabular-nums">
            {salesMetrics.unitsSold}
          </div>
        </div>
        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Low Stock Alerts</div>
          <div className="mt-1 font-display text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {lowStockProducts.length}
          </div>
        </div>
      </div>

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 glass-surface rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Commission &amp; Earnings Breakdown
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-200/70 dark:border-white/10">
                <span className="text-slate-600 dark:text-slate-300">Gross Merchandise Volume</span>
                <span className="font-semibold tabular-nums text-slate-950 dark:text-white">
                  {formatPrice(salesMetrics.grossUsd, currency, settings.lkrPerUsd)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200/70 dark:border-white/10">
                <span className="text-slate-600 dark:text-slate-300">
                  Marketplace Commission ({mySeller.commissionRate}%)
                </span>
                <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  -{formatPrice(salesMetrics.commissionUsd, currency, settings.lkrPerUsd)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold">
                <span className="text-slate-950 dark:text-white">Estimated Net Seller Earnings</span>
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatPrice(salesMetrics.netUsd, currency, settings.lkrPerUsd)}
                </span>
              </div>
            </div>

            {lowStockProducts.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Inventory Replenishment Needed</span>
                </div>
                {lowStockProducts.map((lp) => (
                  <div key={lp.id} className="text-xs text-slate-700 dark:text-slate-200 flex justify-between tabular-nums">
                    <span>{lp.title}</span>
                    <span className="font-semibold">{lp.stock} remaining</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 glass-surface rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Recent Product Reviews ({myReviews.length})
            </h2>
            {myReviews.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer reviews on your listed hardware will appear here.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/70 dark:divide-white/10">
                {myReviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="py-3 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-slate-950 dark:text-white">
                      <span>{r.title}</span>
                      <span className="text-amber-500">{r.rating} ★</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveProduct}
            className="lg:col-span-5 glass-surface rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                {editingProductId ? 'Edit Listing' : 'Add New Product'}
              </h2>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="text-xs text-violet-700 dark:text-cyan-300 cursor-pointer"
                >
                  New Item
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Product Title
              </label>
              <input
                type="text"
                required
                value={pTitle}
                onChange={(e) => setPTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={pCategoryId || categories[0]?.id || ''}
                  onChange={(e) => setPCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={pSku}
                  onChange={(e) => setPSku(e.target.value)}
                  placeholder="VTX-001"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Price (USD)
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  value={pPriceUsd}
                  onChange={(e) => setPPriceUsd(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3 py-2 text-sm text-slate-900 dark:text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Stock Units
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={pStock}
                  onChange={(e) => setPStock(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3 py-2 text-sm text-slate-900 dark:text-white tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Product Photo Preset
              </label>
              <select
                value={pImageUrl}
                onChange={(e) => setPImageUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                {PRODUCT_IMAGE_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Primary Spec Label
                </label>
                <input
                  type="text"
                  value={pSpecLabel}
                  onChange={(e) => setPSpecLabel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Primary Spec Value
                </label>
                <input
                  type="text"
                  value={pSpecValue}
                  onChange={(e) => setPSpecValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                required
                value={pDescription}
                onChange={(e) => setPDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pFlashSale}
                  onChange={(e) => setPFlashSale(e.target.checked)}
                  className="accent-violet-600"
                />
                <span>Include in Flash Sale</span>
              </label>
              {pFlashSale && (
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={pFlashPct}
                  onChange={(e) => setPFlashPct(e.target.value)}
                  className="w-20 rounded-lg border border-slate-200 dark:border-white/15 px-2.5 py-1 text-xs tabular-nums"
                  aria-label="Flash sale discount percent"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={savingProduct}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 dark:bg-white py-3 text-sm font-semibold text-white dark:text-slate-950 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{savingProduct ? 'Saving...' : editingProductId ? 'Update Listing' : 'Publish Product'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 glass-surface rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Your Inventory ({myProducts.length})
            </h2>
            {myProducts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You haven&apos;t published any products yet. Use the form on the left to publish your first item.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/70 dark:divide-white/10">
                {myProducts.map((p) => (
                  <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <ProductImage
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-950 dark:text-white truncate">
                          {p.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatPrice(p.priceUsd, currency, settings.lkrPerUsd)} · Stock: {p.stock} ·{' '}
                          {p.sku}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditProduct(p)}
                        className="rounded-lg border border-slate-200 dark:border-white/15 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteProduct(p.id)}
                        aria-label={`Delete ${p.title}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="glass-surface rounded-3xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Orders to Fulfill ({sellerOrders.length})
          </h2>
          {sellerOrders.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No customer orders for your products yet.
            </p>
          ) : (
            <div className="space-y-4">
              {sellerOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-mono text-sm font-bold text-slate-950 dark:text-white">
                      {order.orderNumber} · {order.status}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Ship to {order.shippingName} ({order.shippingCity}, {order.shippingCountry})
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Tracking #"
                      value={trackingDrafts[order.id] ?? order.trackingNumber ?? ''}
                      onChange={(e) =>
                        setTrackingDrafts((d) => ({ ...d, [order.id]: e.target.value }))
                      }
                      className="rounded-lg border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3 py-1.5 text-xs"
                    />
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleUpdateOrder(order.id, 'processing')}
                          className="rounded-lg border border-slate-200 dark:border-white/15 px-3 py-1.5 text-xs font-medium cursor-pointer"
                        >
                          Process
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUpdateOrder(order.id, 'shipped')}
                          className="rounded-lg bg-violet-600 text-white px-3 py-1.5 text-xs font-medium cursor-pointer"
                        >
                          Mark Shipped
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUpdateOrder(order.id, 'delivered')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Delivered
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <form
          onSubmit={handleSaveSellerProfile}
          className="glass-surface rounded-3xl p-6 sm:p-8 max-w-2xl space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Public Storefront Profile
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Origin Country
            </label>
            <input
              type="text"
              value={profileCountry || mySeller.country}
              onChange={(e) => setProfileCountry(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Studio Bio
            </label>
            <textarea
              rows={3}
              value={profileDesc || mySeller.description}
              onChange={(e) => setProfileDesc(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-950 dark:bg-white px-6 py-2.5 text-sm font-semibold text-white dark:text-slate-950 cursor-pointer"
          >
            Save Store Profile
          </button>
        </form>
      )}
    </div>
  );
};
