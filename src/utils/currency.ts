import type { Currency } from '../types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  PLN: 'zł',
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  USD: 'en-US',
  PLN: 'pl-PL',
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
): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'PLN') return amount * exchangeRate;
  if (from === 'PLN' && to === 'USD') return amount / exchangeRate;
  return amount;
}
