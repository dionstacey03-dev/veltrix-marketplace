import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  DEFAULT_PLATFORM_SETTINGS,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_REVIEWS,
  DEMO_SELLERS,
} from '../data/demoCatalog.ts';
import { auth, googleProvider } from '../lib/firebase.ts';
import {
  checkIsAdminUser,
  clearFirestoreCart,
  createNotification,
  createOrderRecord,
  removeCartItem,
  subscribeAllOrders,
  subscribeCart,
  subscribeCategories,
  subscribeNotifications,
  subscribePlatformSettings,
  subscribeProducts,
  subscribeReviews,
  subscribeSellerOrders,
  subscribeSellers,
  subscribeUserOrders,
  subscribeWishlist,
  syncUserProfile,
  toggleWishlistDoc,
  updateUserProfile,
  upsertCartItem,
} from '../services/firestoreService.ts';
import type {
  AppNotification,
  AppView,
  BreadcrumbNode,
  CartItem,
  Category,
  CurrencyCode,
  ExchangeRateInfo,
  IntegrationStatus,
  Order,
  PlatformSettings,
  Product,
  Review,
  SellerPublic,
  UserProfile,
} from '../types/marketplace.ts';

interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'error';
}

interface MarketplaceContextValue {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  authLoading: boolean;
  catalogLoading: boolean;
  isLoading: boolean;
  loadingMessage: string;
  startLoading: (message?: string) => string;
  stopLoading: (token: string) => void;
  withLoading: <T>(operation: () => Promise<T>, message?: string) => Promise<T>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  view: AppView;
  selectedProductId: string | null;
  catalogCategoryFilter: string;
  catalogSearchQuery: string;
  selectCatalogCategory: (categoryId: string) => void;
  setCatalogSearchQuery: (query: string) => void;
  navigationHistory: BreadcrumbNode[];
  breadcrumbs: BreadcrumbNode[];
  previousTrailNode: BreadcrumbNode | null;
  goBack: () => void;
  navigate: (view: AppView, opts?: { productId?: string; categoryId?: string; search?: string }) => void;

  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  exchangeRateInfo: ExchangeRateInfo;
  exchangeRateLoading: boolean;
  refreshExchangeRate: (options?: { force?: boolean; showGlobalLoader?: boolean }) => Promise<number>;
  settings: PlatformSettings;
  integrations: IntegrationStatus;

  products: Product[];
  isUsingDemoFallback: boolean;
  categories: Category[];
  sellers: SellerPublic[];
  reviews: Review[];

  cartItems: { product: Product; quantity: number }[];
  cartCount: number;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateCartQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;

  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<void>;

  compareIds: string[];
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;

  recentlyViewedIds: string[];
  recordProductView: (productId: string) => void;

  userOrders: Order[];
  sellerOrders: Order[];
  allOrders: Order[];
  placeOrder: (input: {
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    shippingCity: string;
    shippingPostalCode: string;
    shippingCountry: string;
    paymentMethod: 'cod' | 'invoice_reservation';
    couponCode?: string;
    discountUsd: number;
    notes?: string;
  }) => Promise<Order>;

  notifications: AppNotification[];
  unreadNotificationCount: number;
  notificationDrawerOpen: boolean;
  setNotificationDrawerOpen: (open: boolean) => void;

  aiDrawerOpen: boolean;
  setAiDrawerOpen: (open: boolean) => void;
  aiInitialPrompt: string;
  openAiWithPrompt: (prompt: string) => void;

  toasts: ToastMessage[];
  pushToast: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(undefined);

const CURRENCY_KEY = 'veltrix_currency';
const RECENT_KEY = 'veltrix_recently_viewed';
const COMPARE_KEY = 'veltrix_compare_ids';
const GUEST_CART_KEY = 'veltrix_guest_cart';
const GUEST_WISHLIST_KEY = 'veltrix_guest_wishlist';

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState<{ id: string; message: string }[]>([]);
  const loadingSeqRef = useRef(0);

  const [view, setView] = useState<AppView>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const [navigationHistory, setNavigationHistory] = useState<BreadcrumbNode[]>([
    { id: 'home', label: 'Home', view: 'home' },
  ]);

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      return localStorage.getItem(CURRENCY_KEY) === 'LKR' ? 'LKR' : 'USD';
    } catch {
      return 'USD';
    }
  });

  const [firestoreSettings, setFirestoreSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [exchangeRateInfo, setExchangeRateInfo] = useState<ExchangeRateInfo>(() => {
    const defaultRate = DEFAULT_PLATFORM_SETTINGS.lkrPerUsd;
    try {
      const cached = localStorage.getItem('veltrix_fx_cache');
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<ExchangeRateInfo>;
        if (typeof parsed.lkrPerUsd === 'number' && parsed.lkrPerUsd > 0) {
          return {
            base: 'USD',
            rates: { USD: 1, LKR: parsed.lkrPerUsd },
            lkrPerUsd: parsed.lkrPerUsd,
            source: parsed.source || 'cache',
            provider: parsed.provider || 'cached-rate',
            fetchedAt: parsed.fetchedAt || null,
          };
        }
      }
    } catch {
      // Ignore cache read error
    }
    return {
      base: 'USD',
      rates: { USD: 1, LKR: defaultRate },
      lkrPerUsd: defaultRate,
      source: 'platform',
      provider: 'platform-settings',
      fetchedAt: null,
    };
  });
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);

  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    geminiConfigured: true,
    smtpConfigured: false,
    paymentGatewayConfigured: false,
    activePaymentProviders: [],
  });

  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [firestoreCategories, setFirestoreCategories] = useState<Category[]>([]);
  const [firestoreSellers, setFirestoreSellers] = useState<SellerPublic[]>([]);
  const [firestoreReviews, setFirestoreReviews] = useState<Review[]>([]);

  const [firestoreCart, setFirestoreCart] = useState<CartItem[]>([]);
  const [guestCart, setGuestCart] = useState<{ productId: string; quantity: number }[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      return raw ? (JSON.parse(raw) as { productId: string; quantity: number }[]) : [];
    } catch {
      return [];
    }
  });

  const [firestoreWishlist, setFirestoreWishlist] = useState<string[]>([]);
  const [guestWishlist, setGuestWishlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(COMPARE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (text: string, tone: ToastMessage['tone'] = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const startLoading = useCallback((message: string = 'Loading marketplace data...') => {
    loadingSeqRef.current += 1;
    const token = `vtx_load_${loadingSeqRef.current}`;
    setLoadingTasks((prev) => [...prev, { id: token, message }]);
    return token;
  }, []);

  const stopLoading = useCallback((token: string) => {
    setLoadingTasks((prev) => prev.filter((task) => task.id !== token));
  }, []);

  const withLoading = useCallback(
    async <T,>(operation: () => Promise<T>, message?: string): Promise<T> => {
      const token = startLoading(message);
      try {
        return await operation();
      } finally {
        stopLoading(token);
      }
    },
    [startLoading, stopLoading]
  );

  const refreshExchangeRate = useCallback(
    async (options?: { force?: boolean; showGlobalLoader?: boolean }): Promise<number> => {
      const execute = async () => {
        setExchangeRateLoading(true);
        try {
          const url = options?.force ? '/api/currency/rates?refresh=1' : '/api/currency/rates';
          const res = await fetch(url);
          if (!res.ok) throw new Error('Exchange rate fetch failed');
          const data = (await res.json()) as ExchangeRateInfo;
          if (typeof data.lkrPerUsd === 'number' && Number.isFinite(data.lkrPerUsd) && data.lkrPerUsd > 0) {
            setExchangeRateInfo(data);
            try {
              localStorage.setItem('veltrix_fx_cache', JSON.stringify(data));
            } catch {
              // Ignore storage quota error
            }
            return data.lkrPerUsd;
          }
        } catch {
          // Keep active rate if endpoint is temporarily unreachable
        } finally {
          setExchangeRateLoading(false);
        }
        return exchangeRateInfo.lkrPerUsd;
      };

      if (options?.showGlobalLoader) {
        return withLoading(execute, 'Fetching live USD/LKR exchange rates...');
      }
      return execute();
    },
    [exchangeRateInfo.lkrPerUsd, withLoading]
  );

  // Load server integration readiness flags & live FX rates
  useEffect(() => {
    fetch('/api/integrations/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setIntegrations(data);
      })
      .catch(() => {
        // Ignore transient startup checks
      });

    void refreshExchangeRate({ force: false, showGlobalLoader: false });
  }, []);

  // Public catalog subscriptions
  useEffect(() => {
    const ready = {
      products: false,
      categories: false,
      sellers: false,
      settings: false,
    };
    const checkAllReady = () => {
      if (ready.products && ready.categories && ready.sellers && ready.settings) {
        setCatalogLoading(false);
      }
    };
    const fallbackTimer = window.setTimeout(() => {
      setCatalogLoading(false);
    }, 3000);

    const unsubProducts = subscribeProducts((items) => {
      setFirestoreProducts(items);
      ready.products = true;
      checkAllReady();
    });
    const unsubCategories = subscribeCategories((items) => {
      setFirestoreCategories(items);
      ready.categories = true;
      checkAllReady();
    });
    const unsubSellers = subscribeSellers((items) => {
      setFirestoreSellers(items);
      ready.sellers = true;
      checkAllReady();
    });
    const unsubReviews = subscribeReviews(setFirestoreReviews);
    const unsubSettings = subscribePlatformSettings((nextSettings) => {
      setFirestoreSettings(nextSettings);
      setExchangeRateInfo((prev) =>
        prev.source === 'platform' || prev.source === 'fallback'
          ? {
              ...prev,
              rates: { USD: 1, LKR: nextSettings.lkrPerUsd },
              lkrPerUsd: nextSettings.lkrPerUsd,
            }
          : prev
      );
      ready.settings = true;
      checkAllReady();
    });

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubProducts();
      unsubCategories();
      unsubSellers();
      unsubReviews();
      unsubSettings();
    };
  }, []);

  // Auth listener & user-scoped subscriptions
  useEffect(() => {
    let unsubCart: (() => void) | undefined;
    let unsubWish: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;
    let unsubSellerOrders: (() => void) | undefined;
    let unsubAllOrders: (() => void) | undefined;
    let unsubNotif: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      unsubCart?.();
      unsubWish?.();
      unsubOrders?.();
      unsubSellerOrders?.();
      unsubAllOrders?.();
      unsubNotif?.();

      if (!user) {
        setUserProfile(null);
        setIsAdmin(false);
        setFirestoreCart([]);
        setFirestoreWishlist([]);
        setUserOrders([]);
        setSellerOrders([]);
        setAllOrders([]);
        setNotifications([]);
        setAuthLoading(false);
        return;
      }

      try {
        const [profile, adminFlag] = await Promise.all([
          syncUserProfile(user),
          checkIsAdminUser(user),
        ]);
        setUserProfile(profile);
        setIsAdmin(adminFlag);
        if (profile.preferredCurrency) {
          setCurrencyState(profile.preferredCurrency);
        }

        // Merge guest cart items into Firestore cart upon login
        if (guestCart.length > 0) {
          for (const item of guestCart) {
            await upsertCartItem(user.uid, item.productId, item.quantity);
          }
          setGuestCart([]);
          localStorage.removeItem(GUEST_CART_KEY);
        }

        unsubCart = subscribeCart(user.uid, setFirestoreCart);
        unsubWish = subscribeWishlist(user.uid, setFirestoreWishlist);
        unsubOrders = subscribeUserOrders(user.uid, setUserOrders);
        unsubSellerOrders = subscribeSellerOrders(user.uid, setSellerOrders);
        unsubNotif = subscribeNotifications(user.uid, setNotifications);
        if (adminFlag) {
          unsubAllOrders = subscribeAllOrders(setAllOrders);
        }
      } catch (err) {
        console.error('Auth sync error:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubCart?.();
      unsubWish?.();
      unsubOrders?.();
      unsubSellerOrders?.();
      unsubAllOrders?.();
      unsubNotif?.();
    };
  }, []);

  const isUsingDemoFallback = firestoreProducts.length === 0;
  const products = isUsingDemoFallback ? DEMO_PRODUCTS : firestoreProducts;
  const categories = firestoreCategories.length > 0 ? firestoreCategories : DEMO_CATEGORIES;
  const sellers = firestoreSellers.length > 0 ? firestoreSellers : DEMO_SELLERS;
  const reviews = useMemo(() => {
    if (firestoreReviews.length === 0) return DEMO_REVIEWS;
    const ids = new Set(firestoreReviews.map((r) => r.id));
    return [...firestoreReviews, ...DEMO_REVIEWS.filter((r) => !ids.has(r.id))];
  }, [firestoreReviews]);

  const settings = useMemo<PlatformSettings>(
    () => ({
      ...firestoreSettings,
      lkrPerUsd: exchangeRateInfo.lkrPerUsd,
    }),
    [firestoreSettings, exchangeRateInfo.lkrPerUsd]
  );

  const setCurrency = async (next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      // Ignore
    }
    if (firebaseUser) {
      void updateUserProfile(firebaseUser.uid, { preferredCurrency: next });
    }
    const latestRate = await refreshExchangeRate({
      force: false,
      showGlobalLoader: next === 'LKR' && (exchangeRateInfo.source === 'platform' || exchangeRateInfo.source === 'fallback'),
    });
    pushToast(
      next === 'LKR'
        ? `Prices updated to LKR (1 USD = ${latestRate.toFixed(2)} LKR)`
        : 'Prices updated to USD',
      'info'
    );
  };

  const signInWithGoogle = async () => {
    await withLoading(async () => {
      try {
        await signInWithPopup(auth, googleProvider);
        pushToast('Signed in to VELTRIX', 'success');
      } catch (error) {
        console.error('Google Sign-In failed:', error);
        pushToast('Sign-in cancelled or blocked by popup settings.', 'error');
      }
    }, 'Connecting Google account...');
  };

  const logout = async () => {
    await withLoading(async () => {
      await signOut(auth);
      if (view === 'admin' || view === 'seller') {
        setView('home');
      }
      pushToast('Signed out', 'info');
    }, 'Signing out...');
  };

  const pushHistoryNode = useCallback((node: BreadcrumbNode) => {
    setNavigationHistory((prev) => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.view === node.view &&
        last.categoryId === node.categoryId &&
        last.productId === node.productId &&
        last.search === node.search
      ) {
        return prev;
      }
      if (node.view === 'home') {
        return [{ id: 'home', label: 'Home', view: 'home' }];
      }
      return [...prev.slice(-11), node];
    });
  }, []);

  const buildNodeLabel = useCallback(
    (
      nextView: AppView,
      opts?: { productId?: string; categoryId?: string; search?: string }
    ): string => {
      if (nextView === 'home') return 'Home';
      if (nextView === 'catalog') {
        if (opts?.search?.trim()) return `"${opts.search.trim()}"`;
        if (opts?.categoryId && opts.categoryId !== 'all') {
          return categories.find((c) => c.id === opts.categoryId)?.name || 'Category';
        }
        return 'Catalog';
      }
      if (nextView === 'product') {
        const prod = products.find((p) => p.id === (opts?.productId ?? selectedProductId));
        return prod?.title || 'Product Details';
      }
      if (nextView === 'wishlist') return 'Saved Wishlist';
      if (nextView === 'compare') return 'Compare Tray';
      if (nextView === 'checkout') return 'Checkout';
      if (nextView === 'account') return 'Account & Orders';
      if (nextView === 'seller') return 'Seller Studio';
      return 'Admin Console';
    },
    [categories, products, selectedProductId]
  );

  const navigate = (
    nextView: AppView,
    opts?: { productId?: string; categoryId?: string; search?: string }
  ) => {
    const nextCategory = opts?.categoryId !== undefined ? opts.categoryId : catalogCategoryFilter;
    const nextSearch = opts?.search !== undefined ? opts.search : catalogSearchQuery;

    setView(nextView);
    if (opts?.productId !== undefined) {
      setSelectedProductId(opts.productId);
      recordProductView(opts.productId);
    }
    if (opts?.categoryId !== undefined) {
      setCatalogCategoryFilter(opts.categoryId);
    }
    if (opts?.search !== undefined) {
      setCatalogSearchQuery(opts.search);
    }

    const label = buildNodeLabel(nextView, {
      productId: opts?.productId,
      categoryId: nextView === 'catalog' ? nextCategory : opts?.categoryId,
      search: nextView === 'catalog' ? nextSearch : opts?.search,
    });

    pushHistoryNode({
      id: `${nextView}_${opts?.productId ?? nextCategory ?? 'root'}`,
      label,
      view: nextView,
      categoryId: nextView === 'catalog' ? nextCategory : undefined,
      productId: nextView === 'product' ? (opts?.productId ?? selectedProductId ?? undefined) : undefined,
      search: nextView === 'catalog' ? nextSearch : undefined,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectCatalogCategory = useCallback(
    (categoryId: string) => {
      setCatalogCategoryFilter(categoryId);
      const label =
        categoryId === 'all'
          ? 'Catalog'
          : categories.find((c) => c.id === categoryId)?.name || 'Category';
      pushHistoryNode({
        id: `catalog_${categoryId}`,
        label,
        view: 'catalog',
        categoryId,
        search: '',
      });
    },
    [categories, pushHistoryNode]
  );

  const goBack = useCallback(() => {
    if (navigationHistory.length <= 1) {
      navigate('home');
      return;
    }
    const target = navigationHistory[navigationHistory.length - 2];
    setNavigationHistory((prev) => prev.slice(0, -1));
    setView(target.view);
    if (target.productId !== undefined) {
      setSelectedProductId(target.productId);
    }
    if (target.categoryId !== undefined) {
      setCatalogCategoryFilter(target.categoryId);
    }
    if (target.search !== undefined) {
      setCatalogSearchQuery(target.search);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigationHistory]);

  const previousTrailNode = useMemo(
    () => (navigationHistory.length > 1 ? navigationHistory[navigationHistory.length - 2] : null),
    [navigationHistory]
  );

  const breadcrumbs = useMemo<BreadcrumbNode[]>(() => {
    const root: BreadcrumbNode = { id: 'home', label: 'Home', view: 'home' };
    if (view === 'home') return [root];

    const catalogRoot: BreadcrumbNode = {
      id: 'catalog_all',
      label: 'Catalog',
      view: 'catalog',
      categoryId: 'all',
      search: '',
    };

    if (view === 'catalog') {
      const items: BreadcrumbNode[] = [root, catalogRoot];
      if (catalogCategoryFilter && catalogCategoryFilter !== 'all') {
        const catName =
          categories.find((c) => c.id === catalogCategoryFilter)?.name || catalogCategoryFilter;
        items.push({
          id: `cat_${catalogCategoryFilter}`,
          label: catName,
          view: 'catalog',
          categoryId: catalogCategoryFilter,
          search: '',
        });
      }
      if (catalogSearchQuery.trim()) {
        items.push({
          id: `search_${catalogSearchQuery.trim()}`,
          label: `Search: "${catalogSearchQuery.trim()}"`,
          view: 'catalog',
          categoryId: catalogCategoryFilter,
          search: catalogSearchQuery,
        });
      }
      return items;
    }

    if (view === 'product') {
      const product = products.find((p) => p.id === selectedProductId) || products[0];
      const items: BreadcrumbNode[] = [root];
      if (previousTrailNode && (previousTrailNode.view === 'wishlist' || previousTrailNode.view === 'compare')) {
        items.push({
          id: previousTrailNode.id,
          label: previousTrailNode.label,
          view: previousTrailNode.view,
        });
      } else {
        items.push(catalogRoot);
      }
      if (product) {
        items.push({
          id: `product_cat_${product.categoryId}`,
          label: product.categoryName,
          view: 'catalog',
          categoryId: product.categoryId,
          search: '',
        });
        items.push({
          id: `product_${product.id}`,
          label: product.title,
          view: 'product',
          productId: product.id,
        });
      }
      return items;
    }

    if (view === 'wishlist') {
      return [root, catalogRoot, { id: 'wishlist', label: 'Saved Wishlist', view: 'wishlist' }];
    }
    if (view === 'compare') {
      return [root, catalogRoot, { id: 'compare', label: 'Compare Tray', view: 'compare' }];
    }
    if (view === 'checkout') {
      return [root, catalogRoot, { id: 'checkout', label: 'Checkout', view: 'checkout' }];
    }
    if (view === 'account') {
      return [root, { id: 'account', label: 'Account & Orders', view: 'account' }];
    }
    if (view === 'seller') {
      return [root, { id: 'seller', label: 'Seller Studio', view: 'seller' }];
    }
    return [root, { id: 'admin', label: 'Admin Console', view: 'admin' }];
  }, [
    view,
    categories,
    catalogCategoryFilter,
    catalogSearchQuery,
    products,
    selectedProductId,
    previousTrailNode,
  ]);

  const recordProductView = (productId: string) => {
    setRecentlyViewedIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const cartItems = useMemo(() => {
    const source = firebaseUser ? firestoreCart : guestCart;
    const map = new Map(products.map((p) => [p.id, p]));
    return source
      .map((item) => {
        const product = map.get(item.productId);
        return product ? { product, quantity: item.quantity } : null;
      })
      .filter((x): x is { product: Product; quantity: number } => x !== null);
  }, [firebaseUser, firestoreCart, guestCart, products]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const addToCart = async (productId: string, quantity: number = 1) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const existing = cartItems.find((c) => c.product.id === productId);
    const nextQty = Math.min(99, (existing?.quantity ?? 0) + quantity);

    if (firebaseUser) {
      await upsertCartItem(firebaseUser.uid, productId, nextQty);
    } else {
      setGuestCart((prev) => {
        const filtered = prev.filter((item) => item.productId !== productId);
        const next = [...filtered, { productId, quantity: nextQty }];
        try {
          localStorage.setItem(GUEST_CART_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    }
    pushToast(`Added ${product.title} to bag`, 'success');
    setCartDrawerOpen(true);
  };

  const updateCartQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    if (firebaseUser) {
      await upsertCartItem(firebaseUser.uid, productId, quantity);
    } else {
      setGuestCart((prev) => {
        const next = prev.map((item) =>
          item.productId === productId ? { ...item, quantity: Math.min(99, quantity) } : item
        );
        try {
          localStorage.setItem(GUEST_CART_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    }
  };

  const removeFromCart = async (productId: string) => {
    if (firebaseUser) {
      await removeCartItem(firebaseUser.uid, productId);
    } else {
      setGuestCart((prev) => {
        const next = prev.filter((item) => item.productId !== productId);
        try {
          localStorage.setItem(GUEST_CART_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    }
  };

  const clearCart = async () => {
    if (firebaseUser) {
      await clearFirestoreCart(
        firebaseUser.uid,
        firestoreCart.map((c) => c.productId)
      );
    } else {
      setGuestCart([]);
      try {
        localStorage.removeItem(GUEST_CART_KEY);
      } catch {
        // Ignore
      }
    }
  };

  const wishlistIds = firebaseUser ? firestoreWishlist : guestWishlist;

  const toggleWishlist = async (productId: string) => {
    const isSaved = wishlistIds.includes(productId);
    if (firebaseUser) {
      await toggleWishlistDoc(firebaseUser.uid, productId, isSaved);
    } else {
      setGuestWishlist((prev) => {
        const next = isSaved ? prev.filter((id) => id !== productId) : [...prev, productId];
        try {
          localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    }
    pushToast(isSaved ? 'Removed from wishlist' : 'Saved to wishlist', 'info');
  };

  const toggleCompare = (productId: string) => {
    setCompareIds((prev) => {
      let next: string[];
      if (prev.includes(productId)) {
        next = prev.filter((id) => id !== productId);
        pushToast('Removed from comparison', 'info');
      } else if (prev.length >= 4) {
        pushToast('You can compare up to 4 products at once.', 'error');
        return prev;
      } else {
        next = [...prev, productId];
        pushToast('Added to comparison tray', 'success');
      }
      try {
        localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const clearCompare = () => {
    setCompareIds([]);
    try {
      localStorage.removeItem(COMPARE_KEY);
    } catch {
      // Ignore
    }
  };

  const placeOrder: MarketplaceContextValue['placeOrder'] = async (input) => {
    if (!firebaseUser) {
      throw new Error('Please sign in with Google to place an order.');
    }
    if (cartItems.length === 0) {
      throw new Error('Your shopping bag is empty.');
    }

    return withLoading(async () => {
      const subtotalUsd =
        Math.round(
          cartItems.reduce((sum, item) => {
            const eff =
              item.product.isFlashSale && item.product.flashDiscountPercent > 0
                ? item.product.priceUsd * (1 - item.product.flashDiscountPercent / 100)
                : item.product.priceUsd;
            return sum + eff * item.quantity;
          }, 0) * 100
        ) / 100;

      const shippingUsd = subtotalUsd >= settings.freeShippingThresholdUsd ? 0 : 18;
      const totalUsd = Math.max(0, Math.round((subtotalUsd - input.discountUsd + shippingUsd) * 100) / 100);
      const sellerIds = Array.from(new Set(cartItems.map((c) => c.product.sellerId)));

      const order = await createOrderRecord({
        userId: firebaseUser.uid,
        customerEmail: firebaseUser.email || userProfile?.email || 'customer@veltrix.example',
        shippingName: input.shippingName,
        shippingPhone: input.shippingPhone,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        shippingPostalCode: input.shippingPostalCode,
        shippingCountry: input.shippingCountry,
        currency,
        exchangeRate: settings.lkrPerUsd,
        subtotalUsd,
        discountUsd: input.discountUsd,
        shippingUsd,
        totalUsd,
        couponCode: input.couponCode,
        paymentMethod: input.paymentMethod,
        sellerIds,
        items: cartItems.map((c) => ({
          productId: c.product.id,
          title: c.product.title,
          sku: c.product.sku,
          sellerId: c.product.sellerId,
          sellerName: c.product.sellerName,
          unitPriceUsd:
            c.product.isFlashSale && c.product.flashDiscountPercent > 0
              ? Math.round(c.product.priceUsd * (1 - c.product.flashDiscountPercent / 100) * 100) / 100
              : c.product.priceUsd,
          quantity: c.quantity,
          imageUrl: c.product.imageUrl,
        })),
        notes: input.notes,
      });

      // Save shipping details on profile for future checkouts
      await updateUserProfile(firebaseUser.uid, {
        displayName: input.shippingName,
        phone: input.shippingPhone,
        address: input.shippingAddress,
        city: input.shippingCity,
        postalCode: input.shippingPostalCode,
        country: input.shippingCountry,
      });

      await clearCart();

      await createNotification({
        userId: firebaseUser.uid,
        title: `Order ${order.orderNumber} Confirmed`,
        message:
          input.paymentMethod === 'cod'
            ? 'Cash on Delivery order received and queued for seller dispatch.'
            : 'Order reservation recorded. Payment awaits gateway settlement.',
        type: 'order',
      });

      // Trigger backend email integration hook transparently
      fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: firebaseUser.email || 'customer@veltrix.example',
          subject: `VELTRIX Order ${order.orderNumber} Confirmation`,
          message: `Order ${order.orderNumber} has been placed for ${order.items.length} item(s).`,
          eventType: 'order_confirmation',
        }),
      }).catch(() => {});

      return order;
    }, 'Confirming your order...');
  };

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const openAiWithPrompt = (prompt: string) => {
    setAiInitialPrompt(prompt);
    setAiDrawerOpen(true);
  };

  const isLoading = authLoading || catalogLoading || loadingTasks.length > 0;
  const loadingMessage =
    loadingTasks.length > 0
      ? loadingTasks[loadingTasks.length - 1].message
      : authLoading
        ? 'Verifying account session...'
        : catalogLoading
          ? 'Syncing marketplace catalog...'
          : 'Loading...';

  return (
    <MarketplaceContext.Provider
      value={{
        firebaseUser,
        userProfile,
        isAdmin,
        authLoading,
        catalogLoading,
        isLoading,
        loadingMessage,
        startLoading,
        stopLoading,
        withLoading,
        signInWithGoogle,
        logout,
        view,
        selectedProductId,
        catalogCategoryFilter,
        catalogSearchQuery,
        selectCatalogCategory,
        setCatalogSearchQuery,
        navigationHistory,
        breadcrumbs,
        previousTrailNode,
        goBack,
        navigate,
        currency,
        setCurrency,
        exchangeRateInfo,
        exchangeRateLoading,
        refreshExchangeRate,
        settings,
        integrations,
        products,
        isUsingDemoFallback,
        categories,
        sellers,
        reviews,
        cartItems,
        cartCount,
        cartDrawerOpen,
        setCartDrawerOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        compareIds,
        toggleCompare,
        clearCompare,
        recentlyViewedIds,
        recordProductView,
        userOrders,
        sellerOrders,
        allOrders,
        placeOrder,
        notifications,
        unreadNotificationCount,
        notificationDrawerOpen,
        setNotificationDrawerOpen,
        aiDrawerOpen,
        setAiDrawerOpen,
        aiInitialPrompt,
        openAiWithPrompt,
        toasts,
        pushToast,
        dismissToast,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return ctx;
}
