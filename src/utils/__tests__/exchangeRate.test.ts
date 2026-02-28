import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLiveRate } from '../exchangeRate';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock fetch
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', { value: mockFetch, writable: true });

describe('fetchLiveRate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('fetches rate from API and caches it', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rates: { PLN: 4.05 } }),
    });

    const rate = await fetchLiveRate();
    expect(rate).toBe(4.05);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'finance-dashboard-live-rate',
      expect.stringContaining('4.05'),
    );
  });

  it('returns cached rate within TTL', async () => {
    const cached = JSON.stringify({ rate: 4.10, timestamp: Date.now() });
    localStorageMock.getItem.mockReturnValueOnce(cached);

    const rate = await fetchLiveRate();
    expect(rate).toBe(4.10);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches new rate when cache is expired', async () => {
    const expired = JSON.stringify({
      rate: 3.90,
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    });
    localStorageMock.getItem.mockReturnValueOnce(expired);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rates: { PLN: 4.15 } }),
    });

    const rate = await fetchLiveRate();
    expect(rate).toBe(4.15);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns null on network error', async () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const rate = await fetchLiveRate();
    expect(rate).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    mockFetch.mockResolvedValueOnce({ ok: false });

    const rate = await fetchLiveRate();
    expect(rate).toBeNull();
  });

  it('returns null when response missing PLN rate', async () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rates: {} }),
    });

    const rate = await fetchLiveRate();
    expect(rate).toBeNull();
  });

  it('returns null when PLN rate is not a number', async () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rates: { PLN: 'invalid' } }),
    });

    const rate = await fetchLiveRate();
    expect(rate).toBeNull();
  });

  it('returns null when PLN rate is zero or negative', async () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rates: { PLN: 0 } }),
    });

    const rate = await fetchLiveRate();
    expect(rate).toBeNull();
  });

  it('handles corrupted cache gracefully', async () => {
    localStorageMock.getItem.mockReturnValueOnce('not-valid-json');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rates: { PLN: 4.0 } }),
    });

    const rate = await fetchLiveRate();
    expect(rate).toBe(4.0);
  });
});
