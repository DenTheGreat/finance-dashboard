import type { Currency, CategoryRule } from '../../types';
import type { ColumnMapping, ParsedBankTransaction } from './types';
import { parseCSVLine, parseAmount, parseDate, findColumnIndex, detectCategory } from './shared';

export const PRIVAT_COLUMNS = {
  date: ['дата операції', 'дата', 'trandate'],
  description: ['опис операції', 'деталі операції', 'description'],
  category: ['категорія'],
  card: ['картка', 'card'],
  amount: ['сума (uah)', 'сума', 'amount', 'cardamount'],
  currency: ['валюта операції', 'валюта'],
  amountOp: ['сума'],
  balance: ['залишок', 'rest'],
};

export function parsePrivat(
  lines: string[],
  delimiter: string,
  headers: string[],
  appRules?: CategoryRule[],
): { transactions: ParsedBankTransaction[]; mapping: ColumnMapping; detectedCurrency?: Currency } {
  const privatDateIdx = findColumnIndex(headers, PRIVAT_COLUMNS.date);
  const privatDescIdx = findColumnIndex(headers, PRIVAT_COLUMNS.description);
  const privatAmountIdx = findColumnIndex(headers, PRIVAT_COLUMNS.amount);
  const privatCurrencyIdx = findColumnIndex(headers, PRIVAT_COLUMNS.currency);

  const mapping: ColumnMapping = {
    date: privatDateIdx,
    amount: privatAmountIdx,
    description: privatDescIdx,
    currency: privatCurrencyIdx,
    counterparty: -1,
  };

  const transactions: ParsedBankTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], delimiter);
    if (fields.length < 2) continue;

    const rawAmount = fields[privatAmountIdx] || '0';
    const amount = parseAmount(rawAmount);
    if (isNaN(amount) || amount === 0) continue;

    const isIncome = amount > 0;
    const description = (fields[privatDescIdx] || '').trim();

    const rawCurrency = privatCurrencyIdx >= 0 ? (fields[privatCurrencyIdx] || '').trim().toUpperCase() : '';
    const currency: Currency = rawCurrency === 'PLN' ? 'PLN' : rawCurrency === 'USD' ? 'USD' : rawCurrency === 'UAH' ? 'UAH' : 'UAH';

    let category = detectCategory(description, appRules);

    const suggestedCategory = isIncome && category === 'Other' ? 'Other Income' : category;

    const tx: ParsedBankTransaction = {
      date: parseDate(fields[privatDateIdx] || ''),
      amount: Math.abs(amount),
      description: description.slice(0, 200),
      currency,
      counterparty: '',
      suggestedCategory,
      suggestedType: isIncome ? 'income' : 'expense',
      raw: fields,
    };
    transactions.push(tx);
  }

  let detectedCurrency: Currency | undefined;
  if (transactions.length > 0) {
    const counts: Partial<Record<Currency, number>> = {};
    for (const tx of transactions) {
      counts[tx.currency] = (counts[tx.currency] ?? 0) + 1;
    }
    detectedCurrency = (Object.entries(counts) as [Currency, number][]).reduce(
      (best, [cur, count]) => (count > (counts[best] ?? 0) ? cur : best),
      transactions[0].currency,
    );
  }

  return { transactions, mapping, detectedCurrency };
}
