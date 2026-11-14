export type ThemeMode = 'light' | 'dark' | 'system';
export type CurrencyCode = 'USD' | 'LKR';
export type UserRole = 'customer' | 'seller' | 'admin';

export type AppView =
  | 'home'
  | 'catalog'
  | 'product'
  | 'wishlist'
  | 'compare'
  | 'checkout'
  | 'account'
  | 'seller'
  | 'admin';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  categoryId: string;
  categoryName: string;
  title: string;
  slug: string;
  description: string;
  priceUsd: number;
  compareAtUsd?: number;
  stock: number;
  sku: string;
  imageUrl: string;
  gallery: string[];
  specs: ProductSpec[];
  tags: string[];
  isFeatured: boolean;
  isFlashSale: boolean;
  flashDiscountPercent: number;
  rating: number;
  reviewCount: number;
  status: 'active' | 'draft' | 'archived';
  isDemo: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SellerPublic {
  id: string;
  ownerUid: string;
  storeName: string;
  slug: string;
  description: string;
  country: string;
  status: 'active' | 'suspended';
  verified: boolean;
  commissionRate: number;
  rating: number;
  reviewCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  preferredCurrency: CurrencyCode;
  role: UserRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt?: unknown;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderItem {
  productId: string;
  title: string;
  sku: string;
  sellerId: string;
  sellerName: string;
  unitPriceUsd: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  currency: CurrencyCode;
  exchangeRate: number;
  subtotalUsd: number;
  discountUsd: number;
  shippingUsd: number;
  totalUsd: number;
  couponCode?: string;
  paymentMethod: 'cod' | 'invoice_reservation';
  paymentStatus: 'cod_pending' | 'awaiting_gateway' | 'paid_verified';
  status: 'pending_confirmation' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  sellerIds: string[];
  items: OrderItem[];
  trackingNumber?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed_usd';
  discountValue: number;
  minOrderUsd: number;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'inventory' | 'system';
  read: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PlatformSettings {
  id: string;
  flashSaleActive: boolean;
  flashSaleTitle: string;
  flashSaleEndsAt?: string;
  lkrPerUsd: number;
  freeShippingThresholdUsd: number;
  defaultCommissionPercent: number;
  updatedAt?: unknown;
}

export interface IntegrationStatus {
  geminiConfigured: boolean;
  smtpConfigured: boolean;
  paymentGatewayConfigured: boolean;
  activePaymentProviders: string[];
}

export type ExchangeRateSource = 'live' | 'cache' | 'fallback' | 'platform';

export interface ExchangeRateInfo {
  base: 'USD';
  rates: Record<CurrencyCode, number>;
  lkrPerUsd: number;
  source: ExchangeRateSource;
  provider: string;
  fetchedAt: string | null;
}

export interface BreadcrumbNode {
  id: string;
  label: string;
  view: AppView;
  categoryId?: string;
  productId?: string;
  search?: string;
}


