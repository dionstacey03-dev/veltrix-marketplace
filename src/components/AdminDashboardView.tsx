import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Layers,
  Percent,
  Settings,
  Shield,
  ShoppingBag,
  Trash2,
  Users,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatPrice, getEffectivePriceUsd } from '../lib/currency.ts';
import {
  deleteCategory,
  deleteCoupon,
  deleteProduct,
  makeSafeId,
  seedDemoCatalogToFirestore,
  slugify,
  subscribeAllUsers,
  subscribeCoupons,
  updateOrderRecord,
  updatePlatformSettings,
  updateSellerStore,
  updateUserProfile,
  upsertCategory,
  upsertCoupon,
  upsertProduct,
} from '../services/firestoreService.ts';
import type { Coupon, Order, UserProfile, UserRole } from '../types/marketplace.ts';

type AdminTab =
  | 'analytics'
  | 'products'
  | 'categories'
  | 'users'
  | 'orders'
  | 'coupons'
  | 'settings';

export const AdminDashboardView: React.FC = () => {
  const {
    isAdmin,
    products,
    isUsingDemoFallback,
    categories,
    sellers,
    allOrders,
    currency,
    settings,
    integrations,
    refreshExchangeRate,
    withLoading,
    pushToast,
  } = useMarketplace();

  const [tab, setTab] = useState<AdminTab>('analytics');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [seeding, setSeeding] = useState(false);

  // Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Coupon form
  const [couponCode, setCouponCode] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed_usd'>('percentage');
  const [couponValue, setCouponValue] = useState('15');
  const [couponMinOrder, setCouponMinOrder] = useState('100');

  // Platform settings form
  const [flashActive, setFlashActive] = useState(settings.flashSaleActive);
  const [flashTitle, setFlashTitle] = useState(settings.flashSaleTitle);
  const [lkrRate, setLkrRate] = useState(String(settings.lkrPerUsd));
  const [freeShipThreshold, setFreeShipThreshold] = useState(
    String(settings.freeShippingThresholdUsd)
  );
  const [defaultCommission, setDefaultCommission] = useState(
    String(settings.defaultCommissionPercent)
  );

  useEffect(() => {
    setFlashActive(settings.flashSaleActive);
    setFlashTitle(settings.flashSaleTitle);
    setLkrRate(String(settings.lkrPerUsd));
    setFreeShipThreshold(String(settings.freeShippingThresholdUsd));
    setDefaultCommission(String(settings.defaultCommissionPercent));
  }, [settings]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubCoupons = subscribeCoupons(setCoupons);
    const unsubUsers = subscribeAllUsers(setCustomers);
    return () => {
      unsubCoupons();
      unsubUsers();
    };
  }, [isAdmin]);

  const analytics = useMemo(() => {
    const validOrders = allOrders.filter((o) => o.status !== 'cancelled');
    const gmvUsd = validOrders.reduce((sum, o) => sum + o.totalUsd, 0);
    const commissionUsd = (gmvUsd * settings.defaultCommissionPercent) / 100;
    const lowStock = products.filter((p) => p.stock <= 10);

    const byCategory = categories.map((cat) => {
      const catProdIds = new Set(products.filter((p) => p.categoryId === cat.id).map((p) => p.id));
      const catRevenue = validOrders.reduce(
        (sum, o) =>
          sum +
          o.items
            .filter((i) => catProdIds.has(i.productId))
            .reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0),
        0
      );
      const inventoryValue = products
        .filter((p) => p.categoryId === cat.id)
        .reduce((s, p) => s + p.priceUsd * p.stock, 0);
      return {
        name: cat.name,
        revenue: catRevenue,
        inventoryValue,
      };
    });

    return { gmvUsd, commissionUsd, orderCount: validOrders.length, lowStock, byCategory };
  }, [allOrders, products, categories, settings.defaultCommissionPercent]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <Shield className="w-10 h-10 mx-auto text-slate-400" />
        <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
          Administrator Access Required
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sign in with an authorized administrator account to access platform governance.
        </p>
      </div>
    );
  }

  const handleSeedDemoCatalog = async () => {
    setSeeding(true);
    try {
      await withLoading(
        () => seedDemoCatalogToFirestore(),
        'Publishing demo catalog to Firestore...'
      );
      pushToast('Demo catalog, categories, sellers, and coupons published to Firestore.', 'success');
    } catch {
      pushToast('Failed to seed demo catalog.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (catName.trim().length < 2) return;
    try {
      await upsertCategory(
        {
          id: makeSafeId('cat'),
          name: catName.trim(),
          slug: slugify(catName),
          description: catDesc.trim() || 'Curated marketplace category.',
        },
        true
      );
      setCatName('');
      setCatDesc('');
      pushToast('Category created.', 'success');
    } catch {
      pushToast('Failed to create category.', 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim().length < 2) return;
    try {
      const code = couponCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      await upsertCoupon(
        {
          id: code,
          code,
          description: couponDesc.trim() || 'Promotional marketplace discount',
          discountType: couponType,
          discountValue: Math.max(1, Number(couponValue)),
          minOrderUsd: Math.max(0, Number(couponMinOrder)),
          active: true,
        },
        true
      );
      setCouponCode('');
      setCouponDesc('');
      pushToast(`Coupon ${code} created.`, 'success');
    } catch {
      pushToast('Failed to save coupon.', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePlatformSettings({
        flashSaleActive: flashActive,
        flashSaleTitle: flashTitle.trim() || 'Studio Drop',
        lkrPerUsd: Math.max(1, Number(lkrRate)),
        freeShippingThresholdUsd: Math.max(0, Number(freeShipThreshold)),
        defaultCommissionPercent: Math.min(50, Math.max(0, Number(defaultCommission))),
      });
      pushToast('Platform settings saved.', 'success');
    } catch {
      pushToast('Could not update platform settings.', 'error');
    }
  };

  const maxChartVal = Math.max(
    1,
    ...analytics.byCategory.map((c) => Math.max(c.revenue, c.inventoryValue))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
            VELTRIX Platform Governance
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Admin Console
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isUsingDemoFallback && (
            <button
              type="button"
              disabled={seeding}
              onClick={() => void handleSeedDemoCatalog()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{seeding ? 'Publishing...' : 'Publish Demo Catalog to Firestore'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
        {(
          [
            { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'products', label: 'Products', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
            { id: 'categories', label: 'Categories', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'users', label: 'Users & Sellers', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'orders', label: 'Orders', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            { id: 'coupons', label: 'Coupons', icon: <Percent className="w-3.5 h-3.5" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
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

      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-surface rounded-2xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Platform GMV</div>
              <div className="mt-1 font-display text-2xl font-bold text-slate-950 dark:text-white tabular-nums">
                {formatPrice(analytics.gmvUsd, currency, settings.lkrPerUsd)}
              </div>
            </div>
            <div className="glass-surface rounded-2xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Commission ({settings.defaultCommissionPercent}%)
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-violet-700 dark:text-cyan-300 tabular-nums">
                {formatPrice(analytics.commissionUsd, currency, settings.lkrPerUsd)}
              </div>
            </div>
            <div className="glass-surface rounded-2xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Active Orders</div>
              <div className="mt-1 font-display text-2xl font-bold text-slate-950 dark:text-white tabular-nums">
                {analytics.orderCount}
              </div>
            </div>
            <div className="glass-surface rounded-2xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Low-Stock Alerts</div>
              <div className="mt-1 font-display text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {analytics.lowStock.length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 glass-surface rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                  Category Revenue vs. Stock Valuation
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">Live Firestore Metrics</span>
              </div>
              <div className="space-y-4">
                {analytics.byCategory.map((row) => (
                  <div key={row.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {row.name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        Sales {formatPrice(row.revenue, currency, settings.lkrPerUsd)} · Stock{' '}
                        {formatPrice(row.inventoryValue, currency, settings.lkrPerUsd)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden flex">
                      <div
                        className="h-full bg-violet-600 dark:bg-cyan-400"
                        style={{ width: `${Math.min(100, (row.revenue / maxChartVal) * 100)}%` }}
                      />
                      <div
                        className="h-full bg-slate-400/60 dark:bg-white/25"
                        style={{
                          width: `${Math.min(100, (row.inventoryValue / maxChartVal) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 glass-surface rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                  Inventory Alerts (≤ 10 units)
                </h2>
              </div>
              {analytics.lowStock.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All products have healthy inventory levels.
                </p>
              ) : (
                <div className="divide-y divide-slate-200/70 dark:divide-white/10">
                  {analytics.lowStock.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-950 dark:text-white truncate">
                          {p.title}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {p.sellerName} · {p.sku}
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                        {p.stock} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="glass-surface rounded-3xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-white/10 text-slate-500 dark:text-slate-400">
                <th className="p-4">Product</th>
                <th className="p-4">Seller</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Stock</th>
                <th className="p-4">Flags</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-100/50 dark:hover:bg-white/5">
                  <td className="p-4 font-semibold text-slate-950 dark:text-white">
                    {p.title}
                    {p.isDemo && (
                      <span className="ml-2 font-normal text-slate-400">(Demo)</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{p.sellerName}</td>
                  <td className="p-4 text-right font-mono tabular-nums text-slate-950 dark:text-white">
                    {formatPrice(getEffectivePriceUsd(p), currency, settings.lkrPerUsd)}
                  </td>
                  <td className="p-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {p.stock}
                  </td>
                  <td className="p-4 space-x-2">
                    <button
                      type="button"
                      disabled={isUsingDemoFallback}
                      onClick={() =>
                        void upsertProduct({ ...p, isFeatured: !p.isFeatured }, false)
                      }
                      className={`px-2 py-1 rounded border cursor-pointer disabled:opacity-40 ${
                        p.isFeatured
                          ? 'border-violet-600 text-violet-700 dark:text-cyan-300'
                          : 'border-slate-300 dark:border-white/15 text-slate-500'
                      }`}
                    >
                      Featured
                    </button>
                    <button
                      type="button"
                      disabled={isUsingDemoFallback}
                      onClick={() =>
                        void upsertProduct(
                          {
                            ...p,
                            isFlashSale: !p.isFlashSale,
                            flashDiscountPercent: !p.isFlashSale ? 15 : 0,
                          },
                          false
                        )
                      }
                      className={`px-2 py-1 rounded border cursor-pointer disabled:opacity-40 ${
                        p.isFlashSale
                          ? 'border-amber-500 text-amber-600 dark:text-amber-300'
                          : 'border-slate-300 dark:border-white/15 text-slate-500'
                      }`}
                    >
                      Flash
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      disabled={isUsingDemoFallback}
                      onClick={() => void deleteProduct(p.id)}
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateCategory}
            className="lg:col-span-5 glass-surface rounded-3xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Add Category
            </h2>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Category Name"
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
            <textarea
              rows={2}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Description"
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-950 dark:bg-white py-2.5 text-sm font-semibold text-white dark:text-slate-950 cursor-pointer"
            >
              Create Category
            </button>
          </form>

          <div className="lg:col-span-7 glass-surface rounded-3xl p-6 divide-y divide-slate-200/70 dark:divide-white/10">
            {categories.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {c.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{c.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteCategory(c.id)}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-surface rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Sellers ({sellers.length})
            </h2>
            <div className="divide-y divide-slate-200/70 dark:divide-white/10">
              {sellers.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-950 dark:text-white">
                      {s.storeName} · {s.verified ? 'Verified' : 'Unverified'}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {s.country} · Status: {s.status} · Fee: {s.commissionRate}%
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void updateSellerStore(s.id, { verified: !s.verified })}
                      className="rounded-lg border border-slate-200 dark:border-white/15 px-2.5 py-1 font-medium cursor-pointer"
                    >
                      {s.verified ? 'Unverify' : 'Verify'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void updateSellerStore(s.id, {
                          status: s.status === 'active' ? 'suspended' : 'active',
                        })
                      }
                      className="rounded-lg border border-slate-200 dark:border-white/15 px-2.5 py-1 font-medium cursor-pointer"
                    >
                      {s.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-surface rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Registered Customers ({customers.length})
            </h2>
            <div className="divide-y divide-slate-200/70 dark:divide-white/10">
              {customers.map((u) => (
                <div key={u.uid} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-950 dark:text-white truncate">
                      {u.displayName}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) =>
                      void updateUserProfile(u.uid, { role: e.target.value as UserRole })
                    }
                    className="rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs"
                  >
                    <option value="customer">Customer</option>
                    <option value="seller">Seller</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="glass-surface rounded-3xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            All Platform Orders ({allOrders.length})
          </h2>
          {allOrders.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No orders placed yet.</p>
          ) : (
            <div className="divide-y divide-slate-200/70 dark:divide-white/10">
              {allOrders.map((o) => (
                <div
                  key={o.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-slate-950 dark:text-white">
                      {o.orderNumber} · {formatPrice(o.totalUsd, o.currency, o.exchangeRate)}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {o.customerEmail} · {o.paymentMethod.toUpperCase()} ({o.paymentStatus})
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={o.status}
                      onChange={(e) =>
                        void updateOrderRecord(o.id, { status: e.target.value as Order['status'] })
                      }
                      className="rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                    >
                      <option value="pending_confirmation">Pending Confirmation</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <select
                      value={o.paymentStatus}
                      onChange={(e) =>
                        void updateOrderRecord(o.id, {
                          paymentStatus: e.target.value as Order['paymentStatus'],
                        })
                      }
                      className="rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                    >
                      <option value="cod_pending">COD Pending</option>
                      <option value="awaiting_gateway">Awaiting Gateway</option>
                      <option value="paid_verified">Paid Verified</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateCoupon}
            className="lg:col-span-5 glass-surface rounded-3xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Create Promotional Coupon
            </h2>
            <input
              type="text"
              required
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Code (e.g. LAUNCH20)"
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm uppercase"
            />
            <input
              type="text"
              value={couponDesc}
              onChange={(e) => setCouponDesc(e.target.value)}
              placeholder="Campaign description"
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                value={couponType}
                onChange={(e) => setCouponType(e.target.value as 'percentage' | 'fixed_usd')}
                className="rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs"
              >
                <option value="percentage">% Off</option>
                <option value="fixed_usd">$ USD Off</option>
              </select>
              <input
                type="number"
                min={1}
                value={couponValue}
                onChange={(e) => setCouponValue(e.target.value)}
                placeholder="Value"
                className="rounded-xl border border-slate-200 dark:border-white/15 px-3 py-2 text-xs tabular-nums"
              />
              <input
                type="number"
                min={0}
                value={couponMinOrder}
                onChange={(e) => setCouponMinOrder(e.target.value)}
                placeholder="Min $"
                className="rounded-xl border border-slate-200 dark:border-white/15 px-3 py-2 text-xs tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-950 dark:bg-white py-2.5 text-sm font-semibold text-white dark:text-slate-950 cursor-pointer"
            >
              Publish Coupon
            </button>
          </form>

          <div className="lg:col-span-7 glass-surface rounded-3xl p-6 divide-y divide-slate-200/70 dark:divide-white/10">
            {coupons.length === 0 ? (
              <p className="text-xs text-slate-500">
                No Firestore coupons created yet. Use the form or publish the demo catalog.
              </p>
            ) : (
              coupons.map((cp) => (
                <div key={cp.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-mono font-bold text-slate-950 dark:text-white">
                      {cp.code} ·{' '}
                      {cp.discountType === 'percentage'
                        ? `${cp.discountValue}% off`
                        : `$${cp.discountValue} off`}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {cp.description} · Min ${cp.minOrderUsd}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void upsertCoupon({ ...cp, active: !cp.active }, false)}
                      className="rounded-lg border border-slate-200 dark:border-white/15 px-2.5 py-1 font-medium cursor-pointer"
                    >
                      {cp.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCoupon(cp.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveSettings}
            className="lg:col-span-7 glass-surface rounded-3xl p-6 sm:p-8 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Storefront &amp; Campaign Settings
            </h2>

            <label className="flex items-center justify-between text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
              <span>Activate Global Flash Sale Banner</span>
              <input
                type="checkbox"
                checked={flashActive}
                onChange={(e) => setFlashActive(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Flash Sale Banner Headline
              </label>
              <input
                type="text"
                value={flashTitle}
                onChange={(e) => setFlashTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    LKR per 1 USD (Fallback)
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const rate = await refreshExchangeRate({ force: true, showGlobalLoader: true });
                      setLkrRate(String(rate));
                      pushToast(`Synced live rate: 1 USD = ${rate.toFixed(2)} LKR`, 'success');
                    }}
                    className="text-[11px] font-medium text-violet-700 dark:text-cyan-300 hover:underline cursor-pointer"
                  >
                    Sync Live FX
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  value={lkrRate}
                  onChange={(e) => setLkrRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/15 px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Free Shipping (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  value={freeShipThreshold}
                  onChange={(e) => setFreeShipThreshold(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/15 px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Default Commission (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={defaultCommission}
                  onChange={(e) => setDefaultCommission(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/15 px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-slate-950 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-950 cursor-pointer"
            >
              Save Platform Settings
            </button>
          </form>

          <div className="lg:col-span-5 glass-surface rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              External Credentials &amp; Integrations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Secrets are configured strictly via server environment variables — never stored in
              browser code or Firestore.
            </p>
            <div className="divide-y divide-slate-200/70 dark:divide-white/10 text-xs">
              <div className="py-3 flex justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Gemini AI Assistant (GEMINI_API_KEY)
                </span>
                <span
                  className={
                    integrations.geminiConfigured
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-amber-600 font-semibold'
                  }
                >
                  {integrations.geminiConfigured ? 'Configured' : 'Requires Key'}
                </span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Outbound Email (SMTP_HOST / USER / PASS)
                </span>
                <span
                  className={
                    integrations.smtpConfigured
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-500 font-medium'
                  }
                >
                  {integrations.smtpConfigured ? 'Configured' : 'Requires Credentials'}
                </span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Card Gateway (Stripe / PayHere)
                </span>
                <span
                  className={
                    integrations.paymentGatewayConfigured
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-500 font-medium'
                  }
                >
                  {integrations.paymentGatewayConfigured
                    ? integrations.activePaymentProviders.join(', ')
                    : 'COD & Reservation Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
