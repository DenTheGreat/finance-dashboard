import { describe, it, expect } from 'vitest';
import { formatCurrency, getCurrencySymbol, convertCurrency } from '../currency';

describe('formatCurrency', () => {
  it('formats USD amounts', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234.56');
    expect(result).toContain('$');
  });

  it('formats PLN amounts', () => {
    const result = formatCurrency(1234.56, 'PLN');
    // jsdom may not add thousands separator; verify decimal comma and currency symbol
    expect(result).toContain('1234,56');
    expect(result).toContain('zł');
  });

  it('formats zero', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toContain('0.00');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-500, 'USD');
    expect(result).toContain('500.00');
  });

  it('formats large numbers', () => {
    const result = formatCurrency(1000000, 'USD');
    expect(result).toContain('1,000,000.00');
  });

  it('rounds to 2 decimal places', () => {
    const result = formatCurrency(99.999, 'USD');
    expect(result).toContain('100.00');
  });
});

describe('getCurrencySymbol', () => {
  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns zł for PLN', () => {
    expect(getCurrencySymbol('PLN')).toBe('zł');
  });
});

describe('convertCurrency', () => {
  const rate = 4.0; // 1 USD = 4 PLN

  it('converts USD to PLN', () => {
    expect(convertCurrency(100, 'USD', 'PLN', rate)).toBe(400);
  });

  it('converts PLN to USD', () => {
    expect(convertCurrency(400, 'PLN', 'USD', rate)).toBe(100);
  });

  it('returns same amount when currencies match', () => {
    expect(convertCurrency(100, 'USD', 'USD', rate)).toBe(100);
    expect(convertCurrency(100, 'PLN', 'PLN', rate)).toBe(100);
  });

  it('handles zero amount', () => {
    expect(convertCurrency(0, 'USD', 'PLN', rate)).toBe(0);
  });

  it('handles fractional amounts', () => {
    expect(convertCurrency(1.5, 'USD', 'PLN', rate)).toBe(6);
  });

  it('handles small exchange rates', () => {
    expect(convertCurrency(100, 'USD', 'PLN', 0.5)).toBe(50);
  });
});
