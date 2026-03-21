import type { CategoryRule } from '../../types';
import type { ParseResult, DetectedBank } from './types';
import { detectDelimiter, parseCSVLine, findColumnIndex } from './shared';
import { MONO_COLUMNS, parseMono } from './monobank';
import { PRIVAT_COLUMNS, parsePrivat } from './privatbank';
import { PKO_COLUMNS, parsePKO } from './pko';

export type { ColumnMapping, ParsedBankTransaction, ParseResult, DetectedBank } from './types';
export { parseDate, detectCategoryForDescription } from './shared';

export function parseCSV(csvText: string, appRules?: CategoryRule[]): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      headers: [],
      transactions: [],
      autoMapped: false,
      mapping: { date: 0, amount: 1, description: 2, currency: -1, counterparty: -1 },
      detectedBank: 'unknown',
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);

  // Detect bank format from headers
  const monoDateIdx = findColumnIndex(headers, MONO_COLUMNS.date);
  const monoDescIdx = findColumnIndex(headers, MONO_COLUMNS.description);
  const monoAmountCardIdx = findColumnIndex(headers, MONO_COLUMNS.amountCard);
  const isMonobank = monoDateIdx !== -1 && monoDescIdx !== -1 && monoAmountCardIdx !== -1;

  const privatDateIdx = findColumnIndex(headers, PRIVAT_COLUMNS.date);
  const privatDescIdx = findColumnIndex(headers, PRIVAT_COLUMNS.description);
  const privatAmountIdx = findColumnIndex(headers, PRIVAT_COLUMNS.amount);
  const isPrivatBank = !isMonobank && privatDateIdx !== -1 && privatDescIdx !== -1 && privatAmountIdx !== -1;

  // Monobank
  if (isMonobank) {
    const { transactions, mapping, detectedCurrency } = parseMono(lines, delimiter, headers, appRules);
    return { headers, transactions, autoMapped: true, mapping, detectedCurrency, detectedBank: 'Monobank' };
  }

  // PrivatBank
  if (isPrivatBank) {
    const { transactions, mapping, detectedCurrency } = parsePrivat(lines, delimiter, headers, appRules);
    return { headers, transactions, autoMapped: true, mapping, detectedCurrency, detectedBank: 'PrivatBank' };
  }

  // PKO BP (or generic)
  const pkoDateIdx = findColumnIndex(headers, PKO_COLUMNS.date);
  const pkoAmountIdx = findColumnIndex(headers, PKO_COLUMNS.amount);
  const pkoDescIdx = findColumnIndex(headers, PKO_COLUMNS.description);
  const autoMapped = pkoDateIdx !== -1 && pkoAmountIdx !== -1 && pkoDescIdx !== -1;
  const detectedBank: DetectedBank = autoMapped ? 'PKO' : 'unknown';

  const { transactions, mapping, detectedCurrency } = parsePKO(lines, delimiter, headers, appRules);
  return { headers, transactions, autoMapped, mapping, detectedCurrency, detectedBank };
}
