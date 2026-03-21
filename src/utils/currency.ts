import type { Currency } from '../types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  PLN: 'zł',
  UAH: '₴',
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  USD: 'en-US',
  PLN: 'pl-PL',
  UAH: 'uk-UA',
};

export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  exchangeRate: number, // USD to PLN
  exchangeRates?: Record<string, number>,
): number {
  if (from === to) return amount;

  // Use USD-based cross rates when available
  if (exchangeRates) {
    const fromRate = from === 'USD' ? 1 : exchangeRates[from];
    const toRate = to === 'USD' ? 1 : exchangeRates[to];
    if (fromRate && toRate) {
      return amount * (toRate / fromRate);
    }
  }

  // Fall back to the old exchangeRate param for USD<->PLN
  if (from === 'USD' && to === 'PLN') return amount * exchangeRate;
  if (from === 'PLN' && to === 'USD') return amount / exchangeRate;

  console.warn(`[convertCurrency] Cannot convert ${from} -> ${to}: no exchange rate available`);
  return amount;
}
