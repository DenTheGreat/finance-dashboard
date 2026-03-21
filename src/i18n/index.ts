import { createContext, useContext } from 'react';
import { format as dateFnsFormat } from 'date-fns';
import { uk as ukLocale, ru as ruLocale } from 'date-fns/locale';
import en from './en';
import uk from './uk';
import ru from './ru';

export type Locale = 'en' | 'uk' | 'ru';

const translations: Record<Locale, Record<string, string>> = { en, uk, ru };

export interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (iso: string) => string;
  formatNumber: (n: number) => string;
  formatCurrency: (amount: number, currency: string) => string;
  /** Translate a category name for display */
  tc: (category: string) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function createI18nValue(locale: Locale, setLocale: (l: Locale) => void): I18nContextValue {
  const dict = translations[locale];

  const t = (key: string, params?: Record<string, string | number>): string => {
    let str = dict[key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  };

  const formatDate = (iso: string): string => {
    const date = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    if (locale === 'uk') {
      return dateFnsFormat(date, 'd MMM yyyy', { locale: ukLocale });
    }
    if (locale === 'ru') {
      return dateFnsFormat(date, 'd MMM yyyy', { locale: ruLocale });
    }
    return dateFnsFormat(date, 'MMM d, yyyy');
  };

  const intlLocale = locale === 'uk' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US';

  const formatNumber = (n: number): string => {
    return new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const tc = (category: string): string => {
    return dict[`category.${category}`] ?? translations.en[`category.${category}`] ?? category;
  };

  return { locale, setLocale, t, formatDate, formatNumber, formatCurrency, tc };
}
