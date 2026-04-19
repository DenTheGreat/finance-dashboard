import type { ExpenseCategory, IncomeCategory, CategoryRule } from '../../types';

export const MCC_CATEGORIES: Record<string, ExpenseCategory | IncomeCategory> = {
  // Food
  '5411': 'Food', '5412': 'Food', '5422': 'Food', '5441': 'Food',
  '5451': 'Food', '5462': 'Food', '5499': 'Food', '5812': 'Food',
  '5813': 'Food', '5814': 'Food',
  // Transportation
  '4011': 'Transportation', '4111': 'Transportation', '4112': 'Transportation',
  '4121': 'Transportation', '4131': 'Transportation', '4789': 'Transportation',
  '5541': 'Transportation', '5542': 'Transportation', '7512': 'Transportation',
  // Healthcare
  '5912': 'Healthcare', '8011': 'Healthcare', '8021': 'Healthcare',
  '8031': 'Healthcare', '8041': 'Healthcare', '8042': 'Healthcare',
  '8043': 'Healthcare', '8049': 'Healthcare', '8050': 'Healthcare',
  '8062': 'Healthcare', '8071': 'Healthcare', '8099': 'Healthcare',
  // Entertainment
  '7832': 'Entertainment', '7841': 'Entertainment', '7911': 'Entertainment',
  '7922': 'Entertainment', '7929': 'Entertainment', '7932': 'Entertainment',
  '7933': 'Entertainment', '7941': 'Entertainment', '7991': 'Entertainment',
  '7993': 'Entertainment', '7994': 'Entertainment', '7995': 'Entertainment',
  '7996': 'Entertainment', '7997': 'Entertainment', '7998': 'Entertainment',
  '7999': 'Entertainment',
  // Shopping
  '5200': 'Shopping', '5211': 'Shopping', '5231': 'Shopping',
  '5251': 'Shopping', '5261': 'Shopping', '5271': 'Shopping',
  '5300': 'Shopping', '5310': 'Shopping', '5311': 'Shopping',
  '5331': 'Shopping', '5399': 'Shopping', '5611': 'Shopping',
  '5621': 'Shopping', '5631': 'Shopping', '5641': 'Shopping',
  '5651': 'Shopping', '5661': 'Shopping', '5691': 'Shopping',
  '5699': 'Shopping', '5712': 'Shopping', '5713': 'Shopping',
  '5714': 'Shopping', '5719': 'Shopping', '5722': 'Shopping',
  '5732': 'Shopping', '5733': 'Shopping', '5734': 'Shopping',
  '5735': 'Shopping', '5921': 'Shopping', '5931': 'Shopping',
  '5941': 'Shopping', '5942': 'Shopping', '5943': 'Shopping',
  '5944': 'Shopping', '5945': 'Shopping', '5946': 'Shopping',
  '5947': 'Shopping', '5948': 'Shopping', '5949': 'Shopping',
  '5950': 'Shopping', '5970': 'Shopping', '5971': 'Shopping',
  '5972': 'Shopping', '5973': 'Shopping', '5977': 'Shopping',
  '5978': 'Shopping', '5983': 'Shopping', '5992': 'Shopping',
  '5993': 'Shopping', '5994': 'Shopping', '5995': 'Shopping',
  '5996': 'Shopping', '5997': 'Shopping', '5998': 'Shopping',
  '5999': 'Shopping',
  // Utilities
  '4814': 'Utilities', '4816': 'Utilities', '4899': 'Utilities',
  '4900': 'Utilities',
  // Education
  '8211': 'Education', '8220': 'Education', '8241': 'Education',
  '8244': 'Education', '8249': 'Education', '8299': 'Education',
  // Insurance
  '6300': 'Insurance', '6381': 'Insurance',
  // Subscriptions
  '5815': 'Subscriptions', '5816': 'Subscriptions', '5817': 'Subscriptions',
  '5818': 'Subscriptions',
  // Housing
  '6513': 'Housing',
  // Transfers
  '4829': 'Transfers', '6012': 'Other Income', '6051': 'Transfers', '6050': 'Transfers',
  // Personal
  '7230': 'Personal', '7251': 'Personal', '7298': 'Personal',
};

export const CATEGORY_KEYWORDS: Array<[string, ExpenseCategory | IncomeCategory]> = [
  // Housing
  ['czynsz', 'Housing'],
  ['wynajem', 'Housing'],
  ['mieszkanie', 'Housing'],
  ['rent', 'Housing'],
  ['mortgage', 'Housing'],
  ['hipoteka', 'Housing'],
  ['ewa ambroziak', 'Housing'],
  // Food — specific multi-word matches before single words like 'uber'
  ['uber eats', 'Food'],
  ['bolt food', 'Food'],
  ['green caffe nero', 'Food'],
  ['caffe nero', 'Food'],
  ['deli padre', 'Food'],
  ['magia ditalia', 'Food'],
  ['gelati', 'Food'],
  ['сільпо', 'Food'],
  ['silpo', 'Food'],
  ['копійка', 'Food'],
  ['таврія', 'Food'],
  ['tavria', 'Food'],
  ['atb', 'Food'],
  ['атб', 'Food'],
  ['odessa od', 'Food'],
  ['mahazyn', 'Food'],
  ['аптека оптових цін', 'Healthcare'],
  ['eva', 'Shopping'],
  ['biedronka', 'Food'],
  ['lidl', 'Food'],
  ['żabka', 'Food'],
  ['zabka', 'Food'],
  ['auchan', 'Food'],
  ['carrefour', 'Food'],
  ['kaufland', 'Food'],
  ['stokrotka', 'Food'],
  ['netto', 'Food'],
  ['restaurant', 'Food'],
  ['restauracja', 'Food'],
  ['mcdonalds', 'Food'],
  ['kfc', 'Food'],
  ['glovo', 'Food'],
  ['pyszne', 'Food'],
  ['stolik', 'Food'],
  ['panda mart', 'Food'],
  ['la fabbrica', 'Food'],
  ['kasap', 'Food'],
  ['bao dao', 'Food'],
  ['goraco polecam', 'Food'],
  ['gorąco polecam', 'Food'],
  ['asian food market', 'Food'],
  ['da grasso', 'Food'],
  ['green lotus', 'Food'],
  // Transportation
  ['uber', 'Transportation'],
  ['bolt', 'Transportation'],
  ['orlen', 'Transportation'],
  ['bp', 'Transportation'],
  ['shell', 'Transportation'],
  ['paliwo', 'Transportation'],
  ['mpk', 'Transportation'],
  ['ztm', 'Transportation'],
  ['koleje', 'Transportation'],
  ['pkp', 'Transportation'],
  ['flixbus', 'Transportation'],
  ['parking', 'Transportation'],
  ['biletomat', 'Transportation'],
  // Utilities
  ['pge', 'Utilities'],
  ['tauron', 'Utilities'],
  ['enea', 'Utilities'],
  ['energa', 'Utilities'],
  ['wodociągi', 'Utilities'],
  ['wodociagi', 'Utilities'],
  ['internet', 'Utilities'],
  ['orange', 'Utilities'],
  ['play', 'Utilities'],
  ['t-mobile', 'Utilities'],
  ['plus', 'Utilities'],
  // Entertainment
  ['netflix', 'Entertainment'],
  ['spotify', 'Entertainment'],
  ['hbo', 'Entertainment'],
  ['disney', 'Entertainment'],
  ['cinema', 'Entertainment'],
  ['kino', 'Entertainment'],
  ['multikino', 'Entertainment'],
  ['helios', 'Entertainment'],
  // Shopping
  ['allegro', 'Shopping'],
  ['amazon', 'Shopping'],
  ['zalando', 'Shopping'],
  ['mediamarkt', 'Shopping'],
  ['media markt', 'Shopping'],
  ['rtv euro', 'Shopping'],
  ['ikea', 'Shopping'],
  ['decathlon', 'Shopping'],
  ['rossmann', 'Shopping'],
  ['hebe', 'Shopping'],
  ['aliexpress', 'Shopping'],
  ['zeccer', 'Shopping'],
  ['pepco', 'Shopping'],
  ['nova post', 'Shopping'],
  ['sklep zoologiczny', 'Shopping'],
  ['lite e-commerce', 'Shopping'],
  ['jmdif', 'Shopping'],
  ['ziko apteka', 'Healthcare'],
  ['orange polska', 'Utilities'],
  // Healthcare
  ['nata dent', 'Healthcare'],
  ['stomatologi', 'Healthcare'],
  ['alfa lek', 'Healthcare'],
  ['receptomat', 'Healthcare'],
  ['apteka melissa', 'Healthcare'],
  ['melissa', 'Healthcare'],
  ['apteka', 'Healthcare'],
  ['pharmacy', 'Healthcare'],
  ['lekarz', 'Healthcare'],
  ['doctor', 'Healthcare'],
  ['medicover', 'Healthcare'],
  ['luxmed', 'Healthcare'],
  ['enel-med', 'Healthcare'],
  // Insurance
  ['ubezpieczenie', 'Insurance'],
  ['pzu', 'Insurance'],
  ['warta', 'Insurance'],
  ['ergo hestia', 'Insurance'],
  // Education
  ['uczelnia', 'Education'],
  ['szkoła', 'Education'],
  ['kurs', 'Education'],
  ['udemy', 'Education'],
  ['coursera', 'Education'],
  // Entertainment
  ['g2a.com', 'Entertainment'],
  ['g2a', 'Entertainment'],
  // Subscriptions
  ['higgsfield', 'Subscriptions'],
  ['subskrypcja', 'Subscriptions'],
  ['subscription', 'Subscriptions'],
  ['apple.com/bill', 'Subscriptions'],
  ['apple', 'Subscriptions'],
  ['google storage', 'Subscriptions'],
  ['youtube premium', 'Subscriptions'],
  // Personal
  ['barbershop', 'Personal'],
  ['brodski', 'Personal'],
  ['ww finance', 'Personal'],
  ['usługi księgowe', 'Personal'],
  ['księgow', 'Personal'],
  // Transfers (money sent to other people)
  ['odbiorca przelewu na telefon', 'Transfers'],
  ['przelew na telefon', 'Transfers'],
  ['transfergo', 'Transfers'],
  ['portmone', 'Transfers'],
  ['svitlana', 'Transfers'],
  ['zwrot kosztów', 'Transfers'],
  // Other
  ['wwf', 'Other'],
  // Income
  ['wynagrodzenie', 'Salary'],
  ['przelew z tytulu wynagrodzenia', 'Salary'],
  ['salary', 'Salary'],
  ['pensja', 'Salary'],
];

export function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function detectDelimiter(firstLine: string): string {
  const delimiters = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const d of delimiters) {
    const count = firstLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

export function parseAmount(raw: string): number {
  // PKO uses comma as decimal separator, space as thousands separator
  // e.g., "-1 234,56" or "1234,56" or "-50.00"
  let cleaned = raw.trim().replace(/\s/g, '');
  // Handle both comma and dot decimal separators
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // "1.234,56" format
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  return parseFloat(cleaned);
}

export function parseDate(raw: string): string {
  const trimmed = raw.trim();
  
  if (!trimmed) {
    return '';
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  
  const europeanDT = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+\d{2}:\d{2}/);
  if (europeanDT) {
    return `${europeanDT[3]}-${europeanDT[2]}-${europeanDT[1]}`;
  }
  
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('.');
    return `${year}-${month}-${day}`;
  }
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [part1, part2, year] = trimmed.split('/');
    const num1 = parseInt(part1, 10);
    const num2 = parseInt(part2, 10);
    
    if (num1 > 12) {
      return `${year}-${part2}-${part1}`;
    }
    if (num2 > 12) {
      return `${year}-${part1}-${part2}`;
    }
    return `${year}-${part2}-${part1}`;
  }
  
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('-');
    return `${year}-${month}-${day}`;
  }
  
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('.');
    return `${year}-${month}-${day}`;
  }
  
  return trimmed;
}

export function findColumnIndex(headers: string[], candidates: string[]): number {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = normalizedHeaders.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

export function detectCategory(description: string, appRules?: CategoryRule[]): ExpenseCategory | IncomeCategory {
  const lower = description.toLowerCase();
  // Check app-level rules first (shared across users via export/import)
  if (appRules) {
    for (const rule of appRules) {
      if (lower.includes(rule.keyword)) {
        return rule.category as ExpenseCategory | IncomeCategory;
      }
    }
  }
  for (const [keyword, category] of CATEGORY_KEYWORDS) {
    if (lower.includes(keyword)) {
      return category;
    }
  }
  return 'Other';
}

export function detectCategoryForDescription(description: string, appRules?: CategoryRule[]): ExpenseCategory | IncomeCategory {
  return detectCategory(description, appRules);
}
