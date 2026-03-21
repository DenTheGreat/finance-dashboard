const STORAGE_KEY = 'finance-dashboard-custom-rules';

export interface CustomRule {
  keyword: string; // lowercase merchant/description keyword
  category: string; // category name
}

export function loadCustomRules(): CustomRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomRule(keyword: string, category: string): void {
  const rules = loadCustomRules();
  const lower = keyword.toLowerCase().trim();
  const existing = rules.findIndex(r => r.keyword === lower);
  if (existing !== -1) {
    rules[existing].category = category;
  } else {
    rules.push({ keyword: lower, category });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function deleteCustomRule(keyword: string): void {
  const rules = loadCustomRules().filter(r => r.keyword !== keyword.toLowerCase().trim());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}
