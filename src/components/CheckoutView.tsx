import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, Tag } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { DEMO_COUPONS } from '../data/demoCatalog.ts';
import { formatPrice, getEffectivePriceUsd } from '../lib/currency.ts';
import { validateCouponCode } from '../services/firestoreService.ts';
import type { Coupon, Order } from '../types/marketplace.ts';
import { ProductImage } from './ProductImage.tsx';

export const CheckoutView: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    signInWithGoogle,
    cartItems,
    currency,
    settings,
    integrations,
    placeOrder,
    navigate,
    withLoading,
    pushToast,
  } = useMarketplace();

  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('Sri Lanka');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'invoice_reservation'>('cod');
  const [notes, setNotes] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (userProfile) {
      setShippingName((prev) => prev || userProfile.displayName || '');
      setShippingPhone((prev) => prev || userProfile.phone || '');
      setShippingAddress((prev) => prev || userProfile.address || '');
      setShippingCity((prev) => prev || userProfile.city || '');
      setShippingPostalCode((prev) => prev || userProfile.postalCode || '');
      setShippingCountry((prev) => prev || userProfile.country || 'Sri Lanka');
    }
  }, [userProfile]);

  const subtotalUsd =
    Math.round(
      cartItems.reduce(
        (sum, item) => sum + getEffectivePriceUsd(item.product) * item.quantity,
        0
      ) * 100
    ) / 100;

  const discountUsd = (() => {
    if (!appliedCoupon || subtotalUsd < appliedCoupon.minOrderUsd) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return Math.round(subtotalUsd * (appliedCoupon.discountValue / 100) * 100) / 100;
    }
    return Math.min(subtotalUsd, appliedCoupon.discountValue);
  })();

  const shippingUsd = subtotalUsd >= settings.freeShippingThresholdUsd ? 0 : 18;
  const totalUsd = Math.max(0, Math.round((subtotalUsd - discountUsd + shippingUsd) * 100) / 100);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      await withLoading(async () => {
        let found: Coupon | null = null;
        if (firebaseUser) {
          found = await validateCouponCode(code);
        }
        if (!found) {
          found = DEMO_COUPONS.find((c) => c.code === code && c.active) || null;
        }
        if (!found) {
          pushToast('Coupon code not found or inactive.', 'error');
          return;
        }
        if (subtotalUsd < found.minOrderUsd) {
          pushToast(
            `Minimum order of ${formatPrice(found.minOrderUsd, currency, settings.lkrPerUsd)} required for ${found.code}.`,
            'error'
          );
          return;
        }
        setAppliedCoupon(found);
        pushToast(`Applied coupon ${found.code}`, 'success');
      }, 'Validating discount coupon...');
    } catch {
      pushToast('Failed to validate coupon.', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      await signInWithGoogle();
      return;
    }
    if (
      shippingName.trim().length < 2 ||
      shippingPhone.trim().length < 4 ||
      shippingAddress.trim().length < 4 ||
      shippingCity.trim().length < 2 ||
      shippingPostalCode.trim().length < 2
    ) {
      pushToast('Please complete all required delivery fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder({
        shippingName: shippingName.trim(),
        shippingPhone: shippingPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        shippingCity: shippingCity.trim(),
        shippingPostalCode: shippingPostalCode.trim(),
        shippingCountry: shippingCountry.trim(),
        paymentMethod,
        couponCode: appliedCoupon?.code,
        discountUsd,
        notes: notes.trim() || undefined,
      });
      setConfirmedOrder(order);
      pushToast(`Order ${order.orderNumber} placed`, 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Order placement failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <div className="glass-surface rounded-3xl p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Order Recorded in Database
              </div>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                Order {confirmedOrder.orderNumber} Confirmed
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {confirmedOrder.paymentMethod === 'cod'
                  ? 'Payment Method: Cash on Delivery (Pending settlement upon courier handoff).'
                  : 'Payment Method: Order Reservation (Awaiting external payment gateway configuration or invoice settlement).'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 space-y-3 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Recipient</span>
              <span className="font-medium text-slate-950 dark:text-white">
                {confirmedOrder.shippingName} · {confirmedOrder.shippingPhone}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Delivery Address</span>
              <span className="font-medium text-slate-950 dark:text-white text-right">
                {confirmedOrder.shippingAddress}, {confirmedOrder.shippingCity}{' '}
                {confirmedOrder.shippingPostalCode}, {confirmedOrder.shippingCountry}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/70 dark:border-white/10">
              <span>Total Amount</span>
              <span className="font-bold text-slate-950 dark:text-white tabular-nums">
                {formatPrice(
                  confirmedOrder.totalUsd,
                  confirmedOrder.currency,
                  confirmedOrder.exchangeRate
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('account')}
              className="rounded-xl bg-slate-950 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-950 cursor-pointer"
            >
              Track Order in Account
            </button>
            <button
              type="button"
              onClick={() => navigate('catalog')}
              className="rounded-xl border border-slate-300 dark:border-white/15 px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
          Your Checkout Bag is Empty
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Add products to your bag before proceeding to checkout.
        </p>
        <button
          type="button"
          onClick={() => navigate('catalog')}
          className="rounded-xl bg-slate-950 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-950 cursor-pointer"
        >
          Browse Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
      <div>
        <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
          Verified Order Submission
        </div>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Checkout &amp; Delivery
        </h1>
      </div>

      {!firebaseUser && (
        <div className="glass-surface rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-slate-700 dark:text-slate-200">
            Sign in with Google to persist your order to your account and enable live tracking.
          </div>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="rounded-xl bg-slate-950 dark:bg-white px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sign In with Google
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleSubmitOrder} className="lg:col-span-7 glass-surface rounded-3xl p-6 sm:p-8 space-y-6">
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            1. Shipping Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={shippingName}
                onChange={(e) => setShippingName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={shippingPhone}
                onChange={(e) => setShippingPhone(e.target.value)}
                placeholder="+94 77 123 4567"
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Street Address
            </label>
            <input
              type="text"
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="House / Suite, Street Name"
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                City
              </label>
              <input
                type="text"
                required
                value={shippingCity}
                onChange={(e) => setShippingCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                required
                value={shippingPostalCode}
                onChange={(e) => setShippingPostalCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Country
              </label>
              <input
                type="text"
                required
                value={shippingCountry}
                onChange={(e) => setShippingCountry(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              2. Settlement Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`text-left rounded-2xl border p-4 transition-colors cursor-pointer ${
                  paymentMethod === 'cod'
                    ? 'border-violet-600 dark:border-cyan-400 bg-violet-600/5 dark:bg-cyan-400/5'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              >
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Cash on Delivery (COD)
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pay upon verified courier delivery in {currency}.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('invoice_reservation')}
                className={`text-left rounded-2xl border p-4 transition-colors cursor-pointer ${
                  paymentMethod === 'invoice_reservation'
                    ? 'border-violet-600 dark:border-cyan-400 bg-violet-600/5 dark:bg-cyan-400/5'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              >
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Order Reservation / Invoice
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Reserve inventory now; settles via bank or configured gateway.
                </p>
              </button>
            </div>

            {!integrations.paymentGatewayConfigured && (
              <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 p-3.5 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Online card checkout requires configuring external gateway credentials
                  (Stripe or PayHere) on the server. COD and Order Reservations are fully active.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Delivery Instructions (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate code, preferred delivery window..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 dark:bg-white py-3.5 text-sm font-semibold text-white dark:text-slate-950 hover:bg-violet-700 dark:hover:bg-cyan-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>
              {submitting
                ? 'Submitting Order...'
                : firebaseUser
                  ? `Confirm ${paymentMethod === 'cod' ? 'COD' : 'Reserved'} Order · ${formatPrice(
                      totalUsd,
                      currency,
                      settings.lkrPerUsd
                    )}`
                  : 'Sign In with Google to Confirm Order'}
            </span>
          </button>
        </form>

        {/* Order Summary */}
        <aside className="lg:col-span-5 glass-surface rounded-3xl p-6 sm:p-8 space-y-6">
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Order Summary
          </h2>

          <div className="divide-y divide-slate-200/70 dark:divide-white/10">
            {cartItems.map(({ product, quantity }) => (
              <div key={product.id} className="py-3 flex items-center gap-3">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-950 dark:text-white truncate">
                    {product.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    Qty {quantity} · {product.sellerName}
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-950 dark:text-white tabular-nums">
                  {formatPrice(getEffectivePriceUsd(product) * quantity, currency, settings.lkrPerUsd)}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Coupon code (e.g. VELTRIX10)"
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={couponLoading}
              className="rounded-xl border border-slate-300 dark:border-white/15 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              {couponLoading ? '...' : 'Apply'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatPrice(subtotalUsd, currency, settings.lkrPerUsd)}
              </span>
            </div>
            {discountUsd > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount ({appliedCoupon?.code})</span>
                <span className="tabular-nums">
                  -{formatPrice(discountUsd, currency, settings.lkrPerUsd)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Shipping</span>
              <span className="tabular-nums">
                {shippingUsd === 0
                  ? 'Free'
                  : formatPrice(shippingUsd, currency, settings.lkrPerUsd)}
              </span>
            </div>
            <div className="flex justify-between font-display text-lg font-bold text-slate-950 dark:text-white pt-3 border-t border-slate-200/70 dark:border-white/10">
              <span>Total</span>
              <span className="tabular-nums">
                {formatPrice(totalUsd, currency, settings.lkrPerUsd)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
