// Monobank Open API — https://api.monobank.ua
// Users get their personal token from the Monobank app: Settings → Other → API

export interface MonobankTransaction {
  id: string;
  time: number; // Unix timestamp
  description: string;
  mcc: number;
  originalMcc: number;
  hold: boolean;
  amount: number; // in coins (UAH kopecks), negative = expense
  operationAmount: number;
  currencyCode: number; // ISO 4217 numeric
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  comment?: string;
  receiptId?: string;
  invoiceId?: string;
  counterName?: string;
  counterIban?: string;
}

export interface MonobankAccount {
  id: string;
  sendId: string;
  balance: number;
  creditLimit: number;
  type: string;
  currencyCode: number;
  cashbackType: string;
  maskedPan: string[];
  iban: string;
}

export interface MonobankClientInfo {
  clientId: string;
  name: string;
  webHookUrl: string;
  permissions: string;
  accounts: MonobankAccount[];
}

const BASE_URL = 'https://api.monobank.ua';

export async function fetchMonobankClientInfo(token: string): Promise<MonobankClientInfo> {
  const res = await fetch(`${BASE_URL}/personal/client-info`, {
    headers: { 'X-Token': token },
  });
  if (!res.ok) throw new Error(`Monobank API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchMonobankStatement(
  token: string,
  accountId: string,
  from: Date,
  to: Date,
): Promise<MonobankTransaction[]> {
  const fromTs = Math.floor(from.getTime() / 1000);
  const toTs = Math.floor(to.getTime() / 1000);
  const res = await fetch(`${BASE_URL}/personal/statement/${accountId}/${fromTs}/${toTs}`, {
    headers: { 'X-Token': token },
  });
  if (!res.ok) throw new Error(`Monobank API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ISO 4217 numeric to currency code mapping (subset)
const CURRENCY_MAP: Record<number, string> = {
  980: 'UAH',
  840: 'USD',
  985: 'PLN',
  978: 'EUR',
};

export function monobankCurrencyCode(code: number): string {
  return CURRENCY_MAP[code] ?? 'UAH';
}

// Convert Monobank transaction to our Transaction format (without id — caller adds it)
export function mapMonobankTransaction(tx: MonobankTransaction): {
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  date: string;
  counterparty?: string;
  notes?: string;
  source: 'Monobank';
} {
  const amount = Math.abs(tx.amount) / 100;
  const type = tx.amount > 0 ? 'income' : 'expense';
  const date = new Date(tx.time * 1000).toISOString().slice(0, 10);
  return {
    type,
    amount,
    currency: monobankCurrencyCode(tx.currencyCode),
    description: tx.description,
    date,
    counterparty: tx.counterName,
    notes: tx.comment,
    source: 'Monobank',
  };
}
