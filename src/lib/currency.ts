import type { CurrencyCode, Product } from '../types/marketplace.ts';

export function getEffectivePriceUsd(
  product: Pick<Product, 'priceUsd' | 'isFlashSale' | 'flashDiscountPercent'>
): number {
  if (product.isFlashSale && product.flashDiscountPercent > 0) {
    const discounted = product.priceUsd * (1 - product.flashDiscountPercent / 100);
    return Math.round(discounted * 100) / 100;
  }
  return product.priceUsd;
}

export function convertUsdToCurrency(
  amountUsd: number,
  currency: CurrencyCode,
  lkrPerUsd: number = 300
): number {
  if (currency === 'LKR') {
    return Math.round(amountUsd * lkrPerUsd);
  }
  return Math.round(amountUsd * 100) / 100;
}

export function formatPrice(
  amountUsd: number,
  currency: CurrencyCode,
  lkrPerUsd: number = 300
): string {
  if (currency === 'LKR') {
    const lkrValue = convertUsdToCurrency(amountUsd, 'LKR', lkrPerUsd);
    return `LKR ${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(lkrValue)}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountUsd);
}

export function formatExchangeRate(lkrPerUsd: number): string {
  return `1 USD = ${lkrPerUsd.toFixed(2)} LKR`;
}
