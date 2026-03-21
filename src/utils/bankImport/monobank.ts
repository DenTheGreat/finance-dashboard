import type { Currency, CategoryRule } from '../../types';
import type { ColumnMapping, ParsedBankTransaction } from './types';
import { parseCSVLine, parseAmount, parseDate, findColumnIndex, detectCategory, MCC_CATEGORIES } from './shared';

export const MONO_COLUMNS = {
  date: ['дата i час операції', 'дата і час операції', 'date and time'],
  description: ['деталі операції', 'description'],
  mcc: ['mcc'],
  amountCard: ['сума в валюті картки (uah)', 'сума в валюті картки', 'card currency amount, (uah)', 'card currency amount'],
  amountOp: ['сума в валюті операції', 'operation amount'],
  currency: ['валюта', 'operation currency'],
  rate: ['курс', 'exchange rate'],
  commission: ['сума комісій (uah)', 'commission, (uah)', 'commission'],
  cashback: ['сума кешбеку (uah)', 'cashback amount, (uah)', 'cashback amount'],
  balance: ['залишок після операції', 'balance'],
};

export function parseMono(
  lines: string[],
  delimiter: string,
  headers: string[],
  appRules?: CategoryRule[],
): { transactions: ParsedBankTransaction[]; mapping: ColumnMapping; detectedCurrency: Currency } {
  const monoDateIdx = findColumnIndex(headers, MONO_COLUMNS.date);
  const monoDescIdx = findColumnIndex(headers, MONO_COLUMNS.description);
  const monoAmountCardIdx = findColumnIndex(headers, MONO_COLUMNS.amountCard);
  const monoMccIdx = findColumnIndex(headers, MONO_COLUMNS.mcc);
  const monoCurrencyIdx = findColumnIndex(headers, MONO_COLUMNS.currency);
  const monoRateIdx = findColumnIndex(headers, MONO_COLUMNS.rate);

  const mapping: ColumnMapping = {
    date: monoDateIdx,
    amount: monoAmountCardIdx,
    description: monoDescIdx,
    currency: monoCurrencyIdx,
    counterparty: -1,
  };

  const transactions: ParsedBankTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], delimiter);
    if (fields.length < 2) continue;

    const rawAmount = fields[monoAmountCardIdx] || '0';
    const amount = parseAmount(rawAmount);
    if (isNaN(amount) || amount === 0) continue;

    const isIncome = amount > 0;
    const description = (fields[monoDescIdx] || '').trim();
    const mcc = monoMccIdx >= 0 ? (fields[monoMccIdx] || '').trim() : '';

    const currency: Currency = 'UAH';

    let extractedExchangeRate: number | undefined;
    if (monoRateIdx >= 0) {
      const rateStr = (fields[monoRateIdx] || '').trim();
      if (rateStr) {
        const parsed = parseFloat(rateStr.replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) extractedExchangeRate = parsed;
      }
    }

    let category = 'Other' as ReturnType<typeof detectCategory>;
    if (mcc && MCC_CATEGORIES[mcc]) {
      category = MCC_CATEGORIES[mcc];
    } else {
      category = detectCategory(description, appRules);
    }

    const suggestedCategory = isIncome && category === 'Other' ? 'Other Income' : category;

    const tx: ParsedBankTransaction = {
      date: parseDate(fields[monoDateIdx] || ''),
      amount: Math.abs(amount),
      description: description.slice(0, 200),
      currency,
      counterparty: '',
      suggestedCategory,
      suggestedType: isIncome ? 'income' : 'expense',
      raw: fields,
    };
    if (extractedExchangeRate !== undefined) {
      tx.extractedExchangeRate = extractedExchangeRate;
    }
    transactions.push(tx);
  }

  return { transactions, mapping, detectedCurrency: 'UAH' };
}
