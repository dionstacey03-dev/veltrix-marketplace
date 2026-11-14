/**
 * Adversarial Security Rules Verification Matrix ("Dirty Dozen" Payloads)
 * Evaluates VELTRIX Firestore rules invariants against unauthorized mutations.
 */
export interface DirtyDozenCase {
  id: string;
  description: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  payload: Record<string, unknown>;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 'DD-01',
    description: 'Self-admin role escalation on user creation',
    collection: '/users/attacker_uid',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'attacker_uid', email: 'a@test.com', displayName: 'Attacker', preferredCurrency: 'USD', role: 'admin' },
  },
  {
    id: 'DD-02',
    description: 'Shadow field injection on user profile',
    collection: '/users/attacker_uid',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'attacker_uid', email: 'a@test.com', displayName: 'A', preferredCurrency: 'USD', role: 'customer', isVerifiedAdmin: true },
  },
  {
    id: 'DD-03',
    description: 'Cross-user PII read attempt',
    collection: '/users/victim_uid',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    payload: { requesterUid: 'attacker_uid' },
  },
  {
    id: 'DD-04',
    description: 'Unverified email spoofing bootstrap admin',
    collection: '/orders',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    payload: { email: 'dion.stacey03@gmail.com', email_verified: false },
  },
  {
    id: 'DD-05',
    description: 'Product ownership hijack across sellers',
    collection: '/products/prod_1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'prod_1', sellerId: 'victim_seller_uid', title: 'Hijacked Item' },
  },
  {
    id: 'DD-06',
    description: 'ID poisoning with invalid characters / excessive length',
    collection: '/products/' + 'x'.repeat(200),
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'x'.repeat(200) },
  },
  {
    id: 'DD-07',
    description: 'Unbounded tags array resource exhaustion (>10 tags)',
    collection: '/products/prod_2',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { tags: Array.from({ length: 25 }, (_, i) => `tag_${i}`) },
  },
  {
    id: 'DD-08',
    description: 'Client-side fake paid payment status injection on order creation',
    collection: '/orders/order_1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'order_1', paymentStatus: 'paid_verified', status: 'pending_confirmation' },
  },
  {
    id: 'DD-09',
    description: 'Blanket order scraping query by unrelated user',
    collection: '/orders',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    payload: { requesterUid: 'random_user' },
  },
  {
    id: 'DD-10',
    description: 'Immutable createdAt tampering on product update',
    collection: '/products/prod_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
  },
  {
    id: 'DD-11',
    description: 'Non-admin coupon list enumeration',
    collection: '/coupons',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    payload: { requesterUid: 'customer_uid' },
  },
  {
    id: 'DD-12',
    description: 'Terminal state mutation on cancelled order by customer',
    collection: '/orders/order_cancelled',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { status: 'delivered' },
  },
];
