import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const projectId = 'demo-veltrix';
let testEnv;
const now = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));

const sellerRecord = (uid, status = 'suspended', verified = false) => ({
  id: uid,
  ownerUid: uid,
  storeName: 'Seller One',
  slug: 'seller-one',
  description: 'A valid seller storefront for rules testing.',
  country: 'Sri Lanka',
  status,
  verified,
  commissionRate: 10,
  rating: 5,
  reviewCount: 0,
  createdAt: now,
  updatedAt: now,
});

const productRecord = (uid) => ({
  id: 'product-one',
  sellerId: uid,
  sellerName: 'Seller One',
  categoryId: 'general',
  categoryName: 'General',
  title: 'Test Product',
  slug: 'test-product',
  description: 'A valid product description for emulator rules tests.',
  priceUsd: 25,
  stock: 5,
  sku: 'TEST-001',
  imageUrl: 'https://example.test/product.png',
  gallery: [],
  specs: [],
  tags: [],
  isFeatured: false,
  isFlashSale: false,
  flashDiscountPercent: 0,
  rating: 0,
  reviewCount: 0,
  status: 'active',
  isDemo: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

function sellerDb() {
  return testEnv.authenticatedContext('seller-one', {
    email: 'seller@example.test',
    email_verified: true,
  }).firestore();
}

function adminDb() {
  return testEnv.authenticatedContext('bootstrap-admin', {
    email: 'dion.stacey03@gmail.com',
    email_verified: true,
  }).firestore();
}

async function seedSeller() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), 'sellers_public/seller-one'),
      sellerRecord('seller-one'),
    );
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test('seller can register only as suspended and unverified', async () => {
  await assertSucceeds(setDoc(
    doc(sellerDb(), 'sellers_public/seller-one'),
    {
      ...sellerRecord('seller-one'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ));
});

test('seller cannot self-register as active or verified', async () => {
  await assertFails(setDoc(
    doc(sellerDb(), 'sellers_public/seller-one'),
    {
      ...sellerRecord('seller-one', 'active', true),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ));
});

test('seller cannot self-promote after registration', async () => {
  await seedSeller();
  await assertFails(updateDoc(
    doc(sellerDb(), 'sellers_public/seller-one'),
    { status: 'active', verified: true, updatedAt: serverTimestamp() },
  ));
});

test('seller cannot change their own commission rate', async () => {
  await seedSeller();
  await assertFails(updateDoc(
    doc(sellerDb(), 'sellers_public/seller-one'),
    { commissionRate: 0, updatedAt: serverTimestamp() },
  ));
});

test('seller can edit storefront details without changing approval state', async () => {
  await seedSeller();
  await assertSucceeds(updateDoc(
    doc(sellerDb(), 'sellers_public/seller-one'),
    { storeName: 'Updated Store', slug: 'updated-store', updatedAt: serverTimestamp() },
  ));
});

test('suspended seller cannot publish products', async () => {
  await seedSeller();
  await assertFails(setDoc(
    doc(sellerDb(), 'products/product-one'),
    productRecord('seller-one'),
  ));
});

test('bootstrap admin can approve a seller', async () => {
  await seedSeller();
  await assertSucceeds(updateDoc(
    doc(adminDb(), 'sellers_public/seller-one'),
    { status: 'active', verified: true, updatedAt: serverTimestamp() },
  ));
});

test('approved seller can publish a valid product', async () => {
  await seedSeller();
  await updateDoc(
    doc(adminDb(), 'sellers_public/seller-one'),
    { status: 'active', verified: true, updatedAt: serverTimestamp() },
  );
  await assertSucceeds(setDoc(
    doc(sellerDb(), 'products/product-one'),
    productRecord('seller-one'),
  ));
});
