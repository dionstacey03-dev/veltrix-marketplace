# VELTRIX Firestore Security Specification

## 1. Data Invariants
1. **Identity & Role Integrity**: A user document in `/users/{userId}` can only be created with `role == 'customer'`, and the user cannot self-escalate `role` to `'admin'`. Admin status is verified via `request.auth.token.email_verified == true` against `/admins/{uid}` or the bootstrapped operator email.
2. **PII Isolation**: User documents containing email, phone, and physical shipping address are strictly readable only by the owning user (`request.auth.uid == userId`) or an administrator. Public seller profiles live separately in `/sellers_public/{sellerId}` with zero PII.
3. **Seller Ownership**: Only a verified user with an active `/sellers_public/{request.auth.uid}` profile (or an admin) can create products, and `product.sellerId` must strictly equal `request.auth.uid`. Sellers can only modify or delete their own products.
4. **Order Integrity**: Orders must have `userId == request.auth.uid`, start in `status == 'pending_confirmation'`, and never claim gateway payment completion from client creation (`paymentStatus in ['cod_pending', 'awaiting_gateway']`). Order listing is restricted via `resource.data.userId == request.auth.uid`, `request.auth.uid in resource.data.sellerIds`, or `isAdmin()`.
5. **Temporal & Boundary Enforcement**: All string fields have explicit `.size()` bounds; all lists have `.size() <= MAX` and element checks; `createdAt` equals `request.time` on creation and remains immutable on update; `updatedAt` equals `request.time` on updates.

## 2. "Dirty Dozen" Adversarial Payloads
1. **Self-Admin Role Escalation on Signup**: `POST /users/{uid}` with `{ role: "admin" }` -> `PERMISSION_DENIED`.
2. **Shadow Field Injection on Profile**: `POST /users/{uid}` with `{ ..., isVerifiedAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` check).
3. **Cross-User PII Read**: Authenticated user A reading `/users/{userB}` -> `PERMISSION_DENIED`.
4. **Unverified Email Spoof**: User with `email: "dion.stacey03@gmail.com"` and `email_verified: false` reading `/orders` -> `PERMISSION_DENIED`.
5. **Product Ownership Hijack**: Seller A creating `/products/p1` with `sellerId: "sellerB"` -> `PERMISSION_DENIED`.
6. **ID Poisoning**: Creating `/products/` with 300-character or `$bad$id` document ID -> `PERMISSION_DENIED` (`isValidId`).
7. **Unbounded Array Resource Exhaustion**: Creating product with 100 tags -> `PERMISSION_DENIED`.
8. **Fake Paid Payment Injection**: Customer creating order with `paymentStatus: "paid_verified"` -> `PERMISSION_DENIED`.
9. **Blanket Order List Scraping**: Authenticated user querying `/orders` without user/seller match -> `PERMISSION_DENIED`.
10. **Immutable Timestamp Tampering**: Updating product while altering `createdAt` -> `PERMISSION_DENIED`.
11. **Coupon Enumeration**: Non-admin attempting `list` on `/coupons` -> `PERMISSION_DENIED`.
12. **Terminal State Mutation**: Customer attempting to set cancelled order back to `'delivered'` -> `PERMISSION_DENIED`.
