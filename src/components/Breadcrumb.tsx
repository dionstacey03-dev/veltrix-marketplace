import React from 'react';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import type { BreadcrumbNode } from '../types/marketplace.ts';

export const Breadcrumb: React.FC = () => {
  const {
    view,
    breadcrumbs,
    previousTrailNode,
    navigate,
    goBack,
  } = useMarketplace();

  if (view === 'home' || breadcrumbs.length <= 1) {
    return null;
  }

  const handleCrumbClick = (crumb: BreadcrumbNode) => {
    navigate(crumb.view, {
      categoryId: crumb.categoryId,
      productId: crumb.productId,
      search: crumb.search ?? '',
    });
  };

  const immediateParent = breadcrumbs[breadcrumbs.length - 2];
  const showBackStep =
    previousTrailNode &&
    (previousTrailNode.view !== immediateParent?.view ||
      previousTrailNode.categoryId !== immediateParent?.categoryId ||
      previousTrailNode.productId !== immediateParent?.productId);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-5">
      <div className="glass-surface rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 overflow-x-auto">
          <ol className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const isHome = index === 0;

              return (
                <li key={`${crumb.id}_${index}`} className="inline-flex items-center gap-1.5 min-w-0">
                  {index > 0 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0"
                    />
                  )}

                  {isLast ? (
                    <span
                      aria-current="page"
                      className="font-semibold text-slate-950 dark:text-white truncate max-w-[180px] sm:max-w-xs"
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCrumbClick(crumb)}
                      className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {isHome && <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                      <span>{crumb.label}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {showBackStep && previousTrailNode && (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-cyan-300 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {previousTrailNode.label}</span>
          </button>
        )}
      </div>
    </div>
  );
};
