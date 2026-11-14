import React from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { markNotificationRead } from '../services/firestoreService.ts';

export const NotificationDrawer: React.FC = () => {
  const {
    firebaseUser,
    notifications,
    notificationDrawerOpen,
    setNotificationDrawerOpen,
    signInWithGoogle,
  } = useMarketplace();

  if (!notificationDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div
        className="flex-1"
        onClick={() => setNotificationDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        aria-label="Notification center"
        className="glass-panel w-full max-w-md h-full flex flex-col shadow-2xl border-l border-slate-200/80 dark:border-white/10"
      >
        <div className="p-6 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-violet-600 dark:text-cyan-400" />
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Notification Center
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setNotificationDrawerOpen(false)}
            aria-label="Close notifications"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {!firebaseUser ? (
            <div className="py-12 text-center space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Sign in to view order updates, inventory alerts, and promotional drops.
              </p>
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="rounded-xl bg-slate-950 dark:bg-white px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-950 cursor-pointer"
              >
                Sign In with Google
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No notifications yet. Order updates and inventory alerts will appear here.
            </div>
          ) : (
            notifications.map((ntf) => (
              <div
                key={ntf.id}
                className={`rounded-2xl border p-4 space-y-1.5 ${
                  ntf.read
                    ? 'border-slate-200/60 dark:border-white/10 opacity-75'
                    : 'border-violet-500/30 dark:border-cyan-400/30 bg-violet-600/5 dark:bg-cyan-400/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-950 dark:text-white">
                    {ntf.title}
                  </div>
                  {!ntf.read && (
                    <button
                      type="button"
                      onClick={() => void markNotificationRead(ntf.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-cyan-300 hover:underline shrink-0 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      Mark read
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {ntf.message}
                </p>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
