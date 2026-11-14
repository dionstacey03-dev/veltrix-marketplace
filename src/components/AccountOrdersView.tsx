import React, { useEffect, useState } from 'react';
import { LogOut, PackageCheck, Shield, Store, UserCheck } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatPrice } from '../lib/currency.ts';
import { updateOrderRecord, updateUserProfile } from '../services/firestoreService.ts';
import type { Order } from '../types/marketplace.ts';

const ORDER_STEPS: Order['status'][] = [
  'pending_confirmation',
  'processing',
  'shipped',
  'delivered',
];

const STEP_LABELS: Record<Order['status'], string> = {
  pending_confirmation: 'Pending Confirmation',
  processing: 'Preparing Shipment',
  shipped: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const AccountOrdersView: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    isAdmin,
    authLoading,
    signInWithGoogle,
    logout,
    userOrders,
    currency,
    setCurrency,
    navigate,
    pushToast,
  } = useMarketplace();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhone(userProfile.phone || '');
      setAddress(userProfile.address || '');
      setCity(userProfile.city || '');
      setPostalCode(userProfile.postalCode || '');
      setCountry(userProfile.country || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await updateUserProfile(firebaseUser.uid, {
        displayName: displayName.trim() || 'VELTRIX Member',
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        preferredCurrency: currency,
      });
      pushToast('Profile saved.', 'success');
    } catch {
      pushToast('Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await updateOrderRecord(orderId, { status: 'cancelled' });
      pushToast('Order cancelled.', 'info');
    } catch {
      pushToast('Could not cancel order.', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-slate-500">
        Loading account session...
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16">
        <div className="glass-surface rounded-3xl p-8 sm:p-10 text-center space-y-6">
          <UserCheck className="w-10 h-10 mx-auto text-violet-600 dark:text-cyan-400" />
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
              Sign In to VELTRIX
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Sign in with your Google account to sync your shopping bag, saved wishlist, delivery
              profile, order tracking, and seller storefront.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="w-full rounded-xl bg-slate-950 dark:bg-white py-3.5 text-sm font-semibold text-white dark:text-slate-950 hover:bg-violet-700 dark:hover:bg-cyan-300 transition-colors cursor-pointer"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-10">
      {/* Account Summary Header */}
      <div className="glass-surface rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-violet-700 dark:text-cyan-300">
            {isAdmin ? 'Administrator Account' : 'Verified Customer Account'}
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
            {userProfile?.displayName || firebaseUser.displayName || 'VELTRIX Member'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{firebaseUser.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('seller')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/15 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            Seller Dashboard
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('admin')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Console
            </button>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/15 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile & Preferences */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-5 glass-surface rounded-3xl p-6 sm:p-8 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Profile &amp; Default Delivery Address
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Preferred Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'USD' | 'LKR')}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="USD">USD ($)</option>
                <option value="LKR">LKR (Sri Lankan Rupee)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-slate-950 dark:bg-white py-3 text-sm font-semibold text-white dark:text-slate-950 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        {/* Order History & Tracking */}
        <div className="lg:col-span-7 glass-surface rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Order History &amp; Live Tracking ({userOrders.length})
            </h2>
          </div>

          {userOrders.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <PackageCheck className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                You haven&apos;t placed any orders yet.
              </p>
              <button
                type="button"
                onClick={() => navigate('catalog')}
                className="rounded-xl bg-slate-950 dark:bg-white px-5 py-2 text-xs font-semibold text-white dark:text-slate-950 cursor-pointer"
              >
                Explore Products
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {userOrders.map((order) => {
                const currentStepIdx = ORDER_STEPS.indexOf(order.status);
                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-mono text-sm font-bold text-slate-950 dark:text-white">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {order.items.length} item(s) ·{' '}
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Order Reservation'} ·{' '}
                          {STEP_LABELS[order.status]}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-950 dark:text-white tabular-nums">
                          {formatPrice(order.totalUsd, order.currency, order.exchangeRate)}
                        </div>
                        {order.trackingNumber && (
                          <div className="font-mono text-[11px] text-violet-700 dark:text-cyan-300">
                            Tracking: {order.trackingNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tracking Timeline */}
                    {order.status !== 'cancelled' ? (
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {ORDER_STEPS.map((step, idx) => {
                          const completed = currentStepIdx >= idx;
                          return (
                            <div key={step} className="space-y-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  completed
                                    ? 'bg-violet-600 dark:bg-cyan-400'
                                    : 'bg-slate-200 dark:bg-white/10'
                                }`}
                              />
                              <div
                                className={`text-[11px] leading-tight ${
                                  completed
                                    ? 'font-semibold text-slate-900 dark:text-white'
                                    : 'text-slate-400'
                                }`}
                              >
                                {STEP_LABELS[step]}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        Order Cancelled
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span>
                        Ship to: {order.shippingAddress}, {order.shippingCity}
                      </span>
                      {order.status === 'pending_confirmation' && (
                        <button
                          type="button"
                          onClick={() => void handleCancelOrder(order.id)}
                          className="text-rose-600 dark:text-rose-400 font-medium hover:underline cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
