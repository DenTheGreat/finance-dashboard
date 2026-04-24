const API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'finance-dashboard-live-rates';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Frankfurter is free, no API key, supports historical dates back to 1999
const HISTORICAL_API = 'https://api.frankfurter.app';
const HISTORICAL_CACHE_PREFIX = 'finance-dashboard-hist-';

export async function fetchHistoricalRatesForDate(
  date: string, // YYYY-MM-DD
): Promise<Record<string, number> | null> {
  const today = new Date().toISOString().slice(0, 10);
  if (date >= today) return null; // future dates use current rates

  const cacheKey = HISTORICAL_CACHE_PREFIX + date;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as Record<string, number>;
  } catch {}

  try {
    const res = await fetch(`${HISTORICAL_API}/${date}?from=USD`);
    if (!res.ok) return null;
    const data = await res.json();
    const rates = data?.rates;
    if (rates && typeof rates === 'object') {
      localStorage.setItem(cacheKey, JSON.stringify(rates));
      return rates as Record<string, number>;
    }
    return null;
  } catch {
    return null;
  }
}

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

async function fetchRates(): Promise<Record<string, number> | null> {
  // Check cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rates, timestamp }: CachedRates = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return rates;
      }
    }
  } catch {}

  // Fetch fresh rates
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    const data = await res.json();
    const rates = data?.rates;
    if (rates && typeof rates === 'object') {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ rates, timestamp: Date.now() }),
      );
      return rates as Record<string, number>;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchLiveRate(): Promise<number | null> {
  const rates = await fetchRates();
  if (!rates) return null;
  const rate = rates['PLN'];
  return typeof rate === 'number' && rate > 0 ? rate : null;
}

export async function fetchLiveRateForCurrency(currency: string): Promise<number | null> {
  const rates = await fetchRates();
  if (!rates) return null;
  const rate = rates[currency];
  return typeof rate === 'number' && rate > 0 ? rate : null;
}

export async function fetchAllRates(): Promise<Record<string, number> | null> {
  return fetchRates();
}
