const API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'finance-dashboard-live-rate';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface CachedRate {
  rate: number;
  timestamp: number;
}

export async function fetchLiveRate(): Promise<number | null> {
  // Check cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rate, timestamp }: CachedRate = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return rate;
      }
    }
  } catch {}

  // Fetch fresh rate
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.PLN;
    if (typeof rate === 'number' && rate > 0) {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ rate, timestamp: Date.now() }),
      );
      return rate;
    }
    return null;
  } catch {
    return null;
  }
}
