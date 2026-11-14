import React, { useState } from 'react';
import {
  Bell,
  Heart,
  Menu,
  Monitor,
  Moon,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import type { AppView, ThemeMode } from '../types/marketplace.ts';
import { CurrencySwitcher } from './CurrencySwitcher.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export const Navbar: React.FC = () => {
  const {
    view,
    navigate,
    cartCount,
    setCartDrawerOpen,
    wishlistIds,
    compareIds,
    unreadNotificationCount,
    setNotificationDrawerOpen,
    setAiDrawerOpen,
    firebaseUser,
    isAdmin,
    settings,
  } = useMarketplace();
  const { mode, setMode } = useTheme();
  const [quickQuery, setQuickQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: AppView; label: string }[] = [
    { id: 'home', label: 'Discover' },
    { id: 'catalog', label: 'Catalog' },
    { id: 'compare', label: compareIds.length > 0 ? `Compare (${compareIds.length})` : 'Compare' },
    { id: 'seller', label: 'Sell' },
    { id: 'account', label: firebaseUser ? 'Account' : 'Sign In' },
  ];

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('catalog', { search: quickQuery.trim() });
  };

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {settings.flashSaleActive && (
        <div className="bg-[#0B1026] dark:bg-violet-950/80 text-slate-100 border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 h-9 flex items-center justify-between gap-4 text-xs">
            <p className="truncate font-medium tracking-tight">{settings.flashSaleTitle}</p>
            <button
              type="button"
              onClick={() => navigate('catalog')}
              className="text-cyan-300 hover:text-cyan-200 font-medium underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Shop Drop
            </button>
          </div>
        </div>
      )}

      {/* Strict 3-Zone Sticky Top Bar */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-15 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => navigate('home')}
            className="font-display text-xl font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            VELTRIX
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'text-violet-700 dark:text-cyan-300'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-violet-600 dark:bg-cyan-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action CTA (+ mobile drawer toggle) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              aria-label={`Open shopping bag with ${cartCount} items`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 hover:bg-violet-700 dark:hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Bag · {cartCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle navigation menu"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation sheet */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 dark:border-white/10 px-4 py-3 space-y-2 bg-white/95 dark:bg-[#080C1B]/95 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    navigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                    view === item.id
                      ? 'bg-violet-600/10 text-violet-700 dark:bg-cyan-400/10 dark:text-cyan-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-violet-700 dark:text-cyan-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Admin Console
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Scrollable Storefront Utility & Preferences Bar */}
      <div className="border-b border-slate-200/70 dark:border-white/10 bg-white/55 dark:bg-[#0B1026]/55 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleQuickSearch} className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Search precision audio, watches, desk gear..."
                aria-label="Search catalog"
                className="w-full rounded-lg border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-white/5 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/40 dark:focus:ring-cyan-400/40"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAiDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/25 dark:border-cyan-400/25 bg-violet-600/10 dark:bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-cyan-300 hover:bg-violet-600/15 dark:hover:bg-cyan-400/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Specialist
            </button>

            <button
              type="button"
              onClick={() => navigate('wishlist')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                view === 'wishlist'
                  ? 'border-violet-600/40 bg-violet-600/10 text-violet-700 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300'
                  : 'border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Saved ({wishlistIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setNotificationDrawerOpen(true)}
              aria-label="Open notifications"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alerts ({unreadNotificationCount})</span>
            </button>

            {/* Currency Switcher */}
            <CurrencySwitcher variant="header" />

            {/* Theme Mode Switcher: Light / Dark / System */}
            <div
              role="group"
              aria-label="Theme mode"
              className="inline-flex items-center rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 p-0.5"
            >
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  title={`${opt.label} theme`}
                  aria-label={`${opt.label} theme`}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === opt.value
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.icon}
                  <span className="hidden lg:inline">{opt.label}</span>
                </button>
              ))}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('admin')}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  view === 'admin'
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-violet-500/30 bg-violet-600/10 text-violet-700 dark:text-violet-300 hover:bg-violet-600/20'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            )}

            <PWAInstallButton />
          </div>
        </div>
      </div>
    </>
  );
};
