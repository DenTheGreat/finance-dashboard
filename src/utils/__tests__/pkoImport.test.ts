import { describe, it, expect } from 'vitest';
import { parseCSV } from '../pkoImport';

describe('parseCSV', () => {
  describe('delimiter detection', () => {
    it('detects comma delimiter', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,100.50,Grocery store';
      const result = parseCSV(csv);
      expect(result.headers).toEqual(['Date', 'Amount', 'Description']);
      expect(result.transactions).toHaveLength(1);
    });

    it('detects semicolon delimiter', () => {
      const csv = 'Date;Amount;Description\n2025-01-15;100.50;Grocery store';
      const result = parseCSV(csv);
      expect(result.headers).toEqual(['Date', 'Amount', 'Description']);
      expect(result.transactions).toHaveLength(1);
    });

    it('detects tab delimiter', () => {
      const csv = 'Date\tAmount\tDescription\n2025-01-15\t100.50\tGrocery store';
      const result = parseCSV(csv);
      expect(result.headers).toEqual(['Date', 'Amount', 'Description']);
      expect(result.transactions).toHaveLength(1);
    });
  });

  describe('date parsing', () => {
    it('parses DD.MM.YYYY format', () => {
      const csv = 'Date,Amount,Description\n15.01.2025,-50.00,Test';
      const result = parseCSV(csv);
      expect(result.transactions[0].date).toBe('2025-01-15');
    });

    it('parses DD-MM-YYYY format', () => {
      const csv = 'Date,Amount,Description\n15-01-2025,-50.00,Test';
      const result = parseCSV(csv);
      expect(result.transactions[0].date).toBe('2025-01-15');
    });

    it('passes through YYYY-MM-DD format', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-50.00,Test';
      const result = parseCSV(csv);
      expect(result.transactions[0].date).toBe('2025-01-15');
    });

    it('parses DD/MM/YYYY format', () => {
      const csv = 'Date,Amount,Description\n15/01/2025,-50.00,Test';
      const result = parseCSV(csv);
      expect(result.transactions[0].date).toBe('2025-01-15');
    });
  });

  describe('amount parsing', () => {
    it('parses Polish format with comma decimal (1234,56)', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,"1234,56",Test';
      const result = parseCSV(csv);
      expect(result.transactions[0].amount).toBeCloseTo(1234.56);
      expect(result.transactions[0].suggestedType).toBe('income');
    });

    it('parses negative amounts', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-50.00,Test';
      const result = parseCSV(csv);
      expect(result.transactions[0].amount).toBe(50);
      expect(result.transactions[0].suggestedType).toBe('expense');
    });

    it('parses Polish format with space thousands (1 234,56)', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,"1 234,56",Test';
      const result = parseCSV(csv);
      expect(result.transactions[0].amount).toBeCloseTo(1234.56);
    });

    it('parses dot decimal format', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-99.99,Test';
      const result = parseCSV(csv);
      expect(result.transactions[0].amount).toBeCloseTo(99.99);
    });

    it('parses European format with dot thousands (1.234,56)', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,"1.234,56",Test';
      const result = parseCSV(csv);
      expect(result.transactions[0].amount).toBeCloseTo(1234.56);
    });

    it('skips rows with zero amount', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,0,Test\n2025-01-16,-50,Real';
      const result = parseCSV(csv);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amount).toBe(50);
    });
  });

  describe('category auto-detection', () => {
    it('detects Biedronka as Food', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-50.00,Zakup w Biedronka';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Food');
    });

    it('detects Orlen as Transportation', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-200.00,Orlen paliwo';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Transportation');
    });

    it('detects PGE as Utilities', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-150.00,PGE Energia';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Utilities');
    });

    it('detects Netflix as Entertainment', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-49.99,NETFLIX.COM';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Entertainment');
    });

    it('detects Allegro as Shopping', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-120.00,Allegro zamowienie';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Shopping');
    });

    it('detects salary keywords as Salary income', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,5000.00,Wynagrodzenie za styczeń';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Salary');
      expect(result.transactions[0].suggestedType).toBe('income');
    });

    it('defaults to Other for unknown descriptions', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-30.00,Random purchase XYZ';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Other');
    });

    it('defaults income with unknown description to Other Income', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,500.00,Przelew od znajomego';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Other Income');
      expect(result.transactions[0].suggestedType).toBe('income');
    });

    it('detects Medicover as Healthcare', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-200.00,MEDICOVER wizyta';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Healthcare');
    });

    it('detects housing keywords', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-2000.00,Czynsz za mieszkanie';
      const result = parseCSV(csv);
      expect(result.transactions[0].suggestedCategory).toBe('Housing');
    });
  });

  describe('PKO format auto-mapping', () => {
    it('auto-maps PKO column headers', () => {
      const csv = [
        'Data operacji,Data waluty,Typ transakcji,Kwota,Waluta,Saldo po transakcji,Opis transakcji',
        '2025-01-15,2025-01-15,Przelew,-150.00,PLN,5000.00,Zakupy spożywcze',
      ].join('\n');

      const result = parseCSV(csv);
      expect(result.autoMapped).toBe(true);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].date).toBe('2025-01-15');
      expect(result.transactions[0].amount).toBe(150);
      expect(result.transactions[0].currency).toBe('PLN');
    });

    it('sets autoMapped false for generic CSV', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-50.00,Test';
      const result = parseCSV(csv);
      expect(result.autoMapped).toBe(false);
    });

    it('maps counterparty when available', () => {
      const csv = [
        'Data operacji,Kwota,Opis transakcji,Nadawca / odbiorca',
        '2025-01-15,-50.00,Zakupy,Jan Kowalski',
      ].join('\n');

      const result = parseCSV(csv);
      expect(result.transactions[0].counterparty).toBe('Jan Kowalski');
      expect(result.transactions[0].description).toContain('Jan Kowalski');
    });
  });

  describe('edge cases', () => {
    it('returns empty result for empty CSV', () => {
      const result = parseCSV('');
      expect(result.headers).toEqual([]);
      expect(result.transactions).toHaveLength(0);
      expect(result.autoMapped).toBe(false);
    });

    it('returns empty result for header-only CSV', () => {
      const result = parseCSV('Date,Amount,Description');
      // parseCSV requires at least 2 lines (header + data), single line returns empty
      expect(result.headers).toEqual([]);
      expect(result.transactions).toHaveLength(0);
    });

    it('handles quoted fields with commas', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-50.00,"Zakupy, jedzenie i inne"';
      const result = parseCSV(csv);
      expect(result.transactions[0].description).toContain('Zakupy, jedzenie i inne');
    });

    it('handles escaped quotes in fields', () => {
      const csv = 'Date,Amount,Description\n2025-01-15,-50.00,"Sklep ""Biedronka"""';
      const result = parseCSV(csv);
      expect(result.transactions[0].description).toContain('Sklep "Biedronka"');
    });

    it('handles Windows line endings (CRLF)', () => {
      const csv = 'Date,Amount,Description\r\n2025-01-15,-50.00,Test';
      const result = parseCSV(csv);
      expect(result.transactions).toHaveLength(1);
    });

    it('skips rows with too few fields', () => {
      const csv = 'Date,Amount,Description\n2025-01-15\n2025-01-16,-50.00,Valid';
      const result = parseCSV(csv);
      expect(result.transactions).toHaveLength(1);
    });

    it('truncates long descriptions to 200 characters', () => {
      const longDesc = 'A'.repeat(300);
      const csv = `Date,Amount,Description\n2025-01-15,-50.00,${longDesc}`;
      const result = parseCSV(csv);
      expect(result.transactions[0].description.length).toBeLessThanOrEqual(200);
    });

    it('defaults unknown currency to PLN', () => {
      const csv = [
        'Data operacji,Kwota,Opis transakcji,Waluta',
        '2025-01-15,-50.00,Test,EUR',
      ].join('\n');

      const result = parseCSV(csv);
      expect(result.transactions[0].currency).toBe('PLN');
    });

    it('recognizes USD currency', () => {
      const csv = [
        'Data operacji,Kwota,Opis transakcji,Waluta',
        '2025-01-15,-50.00,Test,USD',
      ].join('\n');

      const result = parseCSV(csv);
      expect(result.transactions[0].currency).toBe('USD');
    });
  });
});
