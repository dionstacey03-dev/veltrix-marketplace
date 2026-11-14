import React from 'react';
import { AccountOrdersView } from './components/AccountOrdersView.tsx';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { AiAssistantDrawer } from './components/AiAssistantDrawer.tsx';
import { Breadcrumb } from './components/Breadcrumb.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CatalogView } from './components/CatalogView.tsx';
import { CheckoutView } from './components/CheckoutView.tsx';
import { CompareView } from './components/CompareView.tsx';
import { Footer } from './components/Footer.tsx';
import { GlobalLoadingOverlay } from './components/GlobalLoadingOverlay.tsx';
import { HomeView } from './components/HomeView.tsx';
import { Navbar } from './components/Navbar.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { ProductDetailView } from './components/ProductDetailView.tsx';
import { SellerPortalView } from './components/SellerPortalView.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { WishlistView } from './components/WishlistView.tsx';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';

const MarketplaceShell: React.FC = () => {
  const { view } = useMarketplace();

  return (
    <div className="min-h-screen flex flex-col veltrix-atmosphere bg-slate-50 text-slate-900 dark:bg-[#080C1B] dark:text-slate-100 transition-colors duration-200">
      <Navbar />
      <main className="flex-1">
        <Breadcrumb />
        {view === 'home' && <HomeView />}
        {view === 'catalog' && <CatalogView />}
        {view === 'product' && <ProductDetailView />}
        {view === 'wishlist' && <WishlistView />}
        {view === 'compare' && <CompareView />}
        {view === 'checkout' && <CheckoutView />}
        {view === 'account' && <AccountOrdersView />}
        {view === 'seller' && <SellerPortalView />}
        {view === 'admin' && <AdminDashboardView />}
      </main>
      <Footer />
      <CartDrawer />
      <NotificationDrawer />
      <AiAssistantDrawer />
      <OfflineIndicator />
      <ToastContainer />
      <GlobalLoadingOverlay />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <MarketplaceProvider>
        <MarketplaceShell />
      </MarketplaceProvider>
    </ThemeProvider>
  );
}
