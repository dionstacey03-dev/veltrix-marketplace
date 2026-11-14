import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  DEFAULT_PLATFORM_SETTINGS,
  DEMO_CATEGORIES,
  DEMO_COUPONS,
  DEMO_PRODUCTS,
  DEMO_SELLERS,
} from '../data/demoCatalog.ts';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import type {
  AppNotification,
  CartItem,
  Category,
  Coupon,
  Order,
  PlatformSettings,
  Product,
  Review,
  SellerPublic,
  UserProfile,
} from '../types/marketplace.ts';

export const BOOTSTRAP_ADMIN_EMAIL = 'dion.stacey03@gmail.com';

export function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 7);
  return `${prefix}_${Date.now()}_${rand || 'vtx'}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

export async function checkIsAdminUser(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email === BOOTSTRAP_ADMIN_EMAIL) return true;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export async function syncUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || 'user@veltrix.example',
      displayName: (user.displayName || user.email?.split('@')[0] || 'VELTRIX Member').slice(0, 120),
      photoURL: user.photoURL || '',
      preferredCurrency: 'USD',
      role: 'customer',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, newProfile);
    const createdSnap = await getDoc(ref);
    return (createdSnap.exists() ? createdSnap.data() : newProfile) as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<
    Pick<
      UserProfile,
      | 'displayName'
      | 'phone'
      | 'address'
      | 'city'
      | 'postalCode'
      | 'country'
      | 'preferredCurrency'
      | 'role'
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeCategories(onData: (cats: Category[]) => void): Unsubscribe {
  const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Category));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'categories');
    }
  );
}

export async function upsertCategory(category: Omit<Category, 'createdAt' | 'updatedAt'>, isNew: boolean): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'categories', category.id), {
        ...category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'categories', category.id), {
        name: category.name,
        slug: category.slug,
        description: category.description,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeProducts(onData: (products: Product[]) => void): Unsubscribe {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Product));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'products');
    }
  );
}

export async function upsertProduct(
  product: Omit<Product, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const cleanPayload: Record<string, unknown> = {
      id: product.id,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      title: product.title,
      slug: product.slug,
      description: product.description,
      priceUsd: Number(product.priceUsd),
      stock: Math.max(0, Math.round(Number(product.stock))),
      sku: product.sku,
      imageUrl: product.imageUrl,
      gallery: product.gallery.slice(0, 8),
      specs: product.specs.slice(0, 20),
      tags: product.tags.slice(0, 10),
      isFeatured: Boolean(product.isFeatured),
      isFlashSale: Boolean(product.isFlashSale),
      flashDiscountPercent: Number(product.flashDiscountPercent || 0),
      rating: Number(product.rating || 0),
      reviewCount: Math.max(0, Math.round(Number(product.reviewCount || 0))),
      status: product.status,
      isDemo: Boolean(product.isDemo),
      updatedAt: serverTimestamp(),
    };
    if (typeof product.compareAtUsd === 'number' && product.compareAtUsd > 0) {
      cleanPayload.compareAtUsd = Number(product.compareAtUsd);
    }

    if (isNew) {
      cleanPayload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'products', product.id), cleanPayload);
    } else {
      const updatePayload = { ...cleanPayload };
      delete updatePayload.id;
      delete updatePayload.sellerId;
      await updateDoc(doc(db, 'products', product.id), updatePayload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeSellers(onData: (sellers: SellerPublic[]) => void): Unsubscribe {
  const q = query(collection(db, 'sellers_public'), orderBy('storeName', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as SellerPublic));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'sellers_public');
    }
  );
}

export async function registerSellerStore(input: {
  uid: string;
  storeName: string;
  description: string;
  country: string;
  commissionRate: number;
}): Promise<void> {
  const path = `sellers_public/${input.uid}`;
  try {
    await setDoc(doc(db, 'sellers_public', input.uid), {
      id: input.uid,
      ownerUid: input.uid,
      storeName: input.storeName.trim(),
      slug: slugify(input.storeName),
      description: input.description.trim(),
      country: input.country.trim(),
      status: 'active',
      verified: false,
      commissionRate: Number(input.commissionRate),
      rating: 5,
      reviewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSellerStore(
  sellerId: string,
  updates: Partial<
    Pick<
      SellerPublic,
      'storeName' | 'slug' | 'description' | 'country' | 'status' | 'verified' | 'commissionRate'
    >
  >
): Promise<void> {
  const path = `sellers_public/${sellerId}`;
  try {
    await updateDoc(doc(db, 'sellers_public', sellerId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeReviews(onData: (reviews: Review[]) => void): Unsubscribe {
  const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Review));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'reviews');
    }
  );
}

export async function createProductReview(input: {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
}): Promise<void> {
  const reviewId = makeSafeId('rev');
  const path = `reviews/${reviewId}`;
  try {
    await setDoc(doc(db, 'reviews', reviewId), {
      id: reviewId,
      productId: input.productId,
      userId: input.userId,
      userName: input.userName.slice(0, 100),
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      title: input.title.trim().slice(0, 120),
      comment: input.comment.trim().slice(0, 1500),
      verifiedPurchase: Boolean(input.verifiedPurchase),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  const path = `reviews/${reviewId}`;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeCart(uid: string, onData: (items: CartItem[]) => void): Unsubscribe {
  const path = `carts/${uid}/items`;
  return onSnapshot(
    collection(db, 'carts', uid, 'items'),
    (snap) => {
      onData(snap.docs.map((d) => d.data() as CartItem));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function upsertCartItem(uid: string, productId: string, quantity: number): Promise<void> {
  const itemRef = doc(db, 'carts', uid, 'items', productId);
  const path = `carts/${uid}/items/${productId}`;
  try {
    const existing = await getDoc(itemRef);
    const boundedQty = Math.min(99, Math.max(1, Math.round(quantity)));
    if (existing.exists()) {
      await updateDoc(itemRef, {
        quantity: boundedQty,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(itemRef, {
        id: productId,
        productId,
        quantity: boundedQty,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeCartItem(uid: string, productId: string): Promise<void> {
  const path = `carts/${uid}/items/${productId}`;
  try {
    await deleteDoc(doc(db, 'carts', uid, 'items', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearFirestoreCart(uid: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  const path = `carts/${uid}/items`;
  try {
    const batch = writeBatch(db);
    for (const pid of productIds) {
      batch.delete(doc(db, 'carts', uid, 'items', pid));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeWishlist(uid: string, onData: (productIds: string[]) => void): Unsubscribe {
  const path = `wishlists/${uid}/items`;
  return onSnapshot(
    collection(db, 'wishlists', uid, 'items'),
    (snap) => {
      onData(snap.docs.map((d) => (d.data() as { productId: string }).productId));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function toggleWishlistDoc(uid: string, productId: string, isSaved: boolean): Promise<void> {
  const path = `wishlists/${uid}/items/${productId}`;
  const ref = doc(db, 'wishlists', uid, 'items', productId);
  try {
    if (isSaved) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        id: productId,
        productId,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserOrders(uid: string, onData: (orders: Order[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Order));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    }
  );
}

export function subscribeSellerOrders(sellerUid: string, onData: (orders: Order[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'orders'),
    where('sellerIds', 'array-contains', sellerUid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Order));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    }
  );
}

export function subscribeAllOrders(onData: (orders: Order[]) => void): Unsubscribe {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Order));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    }
  );
}

export async function createOrderRecord(
  order: Omit<Order, 'id' | 'orderNumber' | 'status' | 'paymentStatus' | 'createdAt' | 'updatedAt'>
): Promise<Order> {
  const orderId = makeSafeId('ord');
  const orderNumber = `VTX-${Math.floor(100000 + Math.random() * 900000)}`;
  const paymentStatus = order.paymentMethod === 'cod' ? 'cod_pending' : 'awaiting_gateway';
  const payload: Record<string, unknown> = {
    id: orderId,
    orderNumber,
    userId: order.userId,
    customerEmail: order.customerEmail,
    shippingName: order.shippingName,
    shippingPhone: order.shippingPhone,
    shippingAddress: order.shippingAddress,
    shippingCity: order.shippingCity,
    shippingPostalCode: order.shippingPostalCode,
    shippingCountry: order.shippingCountry,
    currency: order.currency,
    exchangeRate: order.exchangeRate,
    subtotalUsd: order.subtotalUsd,
    discountUsd: order.discountUsd,
    shippingUsd: order.shippingUsd,
    totalUsd: order.totalUsd,
    paymentMethod: order.paymentMethod,
    paymentStatus,
    status: 'pending_confirmation',
    sellerIds: order.sellerIds,
    items: order.items,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (order.couponCode) payload.couponCode = order.couponCode;
  if (order.notes) payload.notes = order.notes;

  const path = `orders/${orderId}`;
  try {
    await setDoc(doc(db, 'orders', orderId), payload);
    return {
      ...order,
      id: orderId,
      orderNumber,
      paymentStatus,
      status: 'pending_confirmation',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateOrderRecord(
  orderId: string,
  updates: Partial<Pick<Order, 'status' | 'paymentStatus' | 'trackingNumber' | 'notes'>>
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function validateCouponCode(code: string): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!normalized) return null;
  const path = `coupons/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'coupons', normalized));
    if (!snap.exists()) return null;
    const coupon = snap.data() as Coupon;
    return coupon.active ? coupon : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeCoupons(onData: (coupons: Coupon[]) => void): Unsubscribe {
  const q = query(collection(db, 'coupons'), orderBy('code', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Coupon));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'coupons');
    }
  );
}

export async function upsertCoupon(coupon: Omit<Coupon, 'createdAt' | 'updatedAt'>, isNew: boolean): Promise<void> {
  const id = coupon.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const path = `coupons/${id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'coupons', id), {
        id,
        code: id,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minOrderUsd: Number(coupon.minOrderUsd),
        active: Boolean(coupon.active),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'coupons', id), {
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minOrderUsd: Number(coupon.minOrderUsd),
        active: Boolean(coupon.active),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const path = `coupons/${couponId}`;
  try {
    await deleteDoc(doc(db, 'coupons', couponId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeNotifications(
  uid: string,
  onData: (notifications: AppNotification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as AppNotification));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    }
  );
}

export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  type: AppNotification['type'];
}): Promise<void> {
  const id = makeSafeId('ntf');
  const path = `notifications/${id}`;
  try {
    await setDoc(doc(db, 'notifications', id), {
      id,
      userId: input.userId,
      title: input.title.slice(0, 140),
      message: input.message.slice(0, 500),
      type: input.type,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribePlatformSettings(
  onData: (settings: PlatformSettings) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'settings', 'platform'),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as PlatformSettings);
      } else {
        onData(DEFAULT_PLATFORM_SETTINGS);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/platform');
    }
  );
}

export async function updatePlatformSettings(
  updates: Omit<PlatformSettings, 'id' | 'updatedAt'>
): Promise<void> {
  const path = 'settings/platform';
  try {
    await setDoc(
      doc(db, 'settings', 'platform'),
      {
        id: 'platform',
        flashSaleActive: Boolean(updates.flashSaleActive),
        flashSaleTitle: updates.flashSaleTitle,
        ...(updates.flashSaleEndsAt ? { flashSaleEndsAt: updates.flashSaleEndsAt } : {}),
        lkrPerUsd: Number(updates.lkrPerUsd),
        freeShippingThresholdUsd: Number(updates.freeShippingThresholdUsd),
        defaultCommissionPercent: Number(updates.defaultCommissionPercent),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeAllUsers(onData: (users: UserProfile[]) => void): Unsubscribe {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as UserProfile));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  );
}

export async function seedDemoCatalogToFirestore(): Promise<void> {
  try {
    const batch = writeBatch(db);

    for (const cat of DEMO_CATEGORIES) {
      batch.set(doc(db, 'categories', cat.id), {
        ...cat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const seller of DEMO_SELLERS) {
      batch.set(doc(db, 'sellers_public', seller.id), {
        ...seller,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const prod of DEMO_PRODUCTS) {
      batch.set(doc(db, 'products', prod.id), {
        ...prod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const coupon of DEMO_COUPONS) {
      batch.set(doc(db, 'coupons', coupon.id), {
        ...coupon,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(doc(db, 'settings', 'platform'), {
      ...DEFAULT_PLATFORM_SETTINGS,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedDemoCatalog');
  }
}
