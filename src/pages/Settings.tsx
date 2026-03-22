import { useState, useRef } from 'react';
import { Settings as SettingsIcon, Download, Upload, Info, RefreshCw, Database } from 'lucide-react';
import { fetchAllRates } from '../utils/exchangeRate';
import type { AppData, UserSettings } from '../types';
import { useI18n } from '../i18n';
import type { Locale } from '../i18n';

interface SettingsProps {
  data: AppData;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  onExport: () => void;
  onImport: (json: string) => void;
  onLoadSeed: () => void;
}

const inputClass =
  'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full';

export default function Settings({
  data,
  onUpdateSettings,
  onExport,
  onImport,
  onLoadSeed,
}: SettingsProps) {
  const { t, locale, setLocale } = useI18n();
  const { settings } = data;

  // Local form state initialised from current settings
  const [primaryCurrency, setPrimaryCurrency] = useState<import('../types').Currency>(
    settings.primaryCurrency,
  );
  const [exchangeRate, setExchangeRate] = useState<string>(
    String(settings.exchangeRate ?? 4.05),
  );
  const [monthlyBudget, setMonthlyBudget] = useState<string>(
    settings.monthlyBudget !== undefined ? String(settings.monthlyBudget) : '',
  );

  const [autoRate, setAutoRate] = useState(settings.autoExchangeRate ?? true);
  const [fetchingRate, setFetchingRate] = useState(false);

  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleRefreshRate() {
    setFetchingRate(true);
    const rates = await fetchAllRates();
    if (rates) {
      const plnRate = rates['PLN'];
      if (typeof plnRate === 'number' && plnRate > 0) {
        setExchangeRate(String(plnRate));
      }
      onUpdateSettings({ exchangeRates: rates });
    }
    setFetchingRate(false);
  }

  // Compute cross rates for display
  const allRates = settings.exchangeRates;
  const usdToPlnDisplay = allRates?.['PLN'] ?? settings.exchangeRate;
  const usdToUahDisplay = allRates?.['UAH'] ?? null;
  const plnToUahDisplay = usdToUahDisplay && usdToPlnDisplay ? (usdToUahDisplay / usdToPlnDisplay) : null;

  // --- Currency settings save ---
  function handleSaveSettings() {
    const rate = parseFloat(exchangeRate);
    const budget = monthlyBudget !== '' ? parseFloat(monthlyBudget) : undefined;
    const updates: Partial<import('../types').UserSettings> = {
      primaryCurrency,
      exchangeRate: isNaN(rate) ? 4.05 : rate,
      autoExchangeRate: autoRate,
      monthlyBudget: budget !== undefined && isNaN(budget) ? undefined : budget,
    };
    // Preserve existing exchangeRates if available
    if (settings.exchangeRates) {
      updates.exchangeRates = settings.exchangeRates;
    }
    onUpdateSettings(updates);
  }

  // --- Export ---
  function handleExport() {
    onExport();
  }

  // --- Import via file input ---
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') {
        setImportError(t('import.couldNotRead'));
        return;
      }
      try {
        JSON.parse(text); // validate JSON before passing up
        onImport(text);
        setImportSuccess(true);
      } catch {
        setImportError(t('settings.importError'));
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400" />
        <h1 className="text-xl sm:text-2xl font-bold text-white">{t('settings.title')}</h1>
      </div>

      {/* Language Settings */}
      <section className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 space-y-4 sm:space-y-5">
        <h2 className="text-lg font-semibold text-white">{t('settings.language')}</h2>
        <p className="text-sm text-gray-400">{t('settings.languageDescription')}</p>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {([
            { code: 'en' as Locale, label: 'English' },
            { code: 'uk' as Locale, label: '\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430' },
            { code: 'ru' as Locale, label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439' },
          ]).map((l) => (
            <label
              key={l.code}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                type="radio"
                name="locale"
                value={l.code}
                checked={locale === l.code}
                onChange={() => setLocale(l.code)}
                className="accent-primary-500 h-4 w-4"
              />
              <span className="text-gray-200 text-sm font-medium">{l.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Currency Settings */}
      <section className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 space-y-4 sm:space-y-5">
        <h2 className="text-lg font-semibold text-white">{t('settings.currencySettings')}</h2>

        {/* Primary Currency */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            {t('settings.primaryCurrency')}
          </label>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {(['USD', 'PLN', 'UAH'] as const).map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  type="radio"
                  name="primaryCurrency"
                  value={c}
                  checked={primaryCurrency === c}
                  onChange={() => setPrimaryCurrency(c)}
                  className="accent-primary-500 h-4 w-4"
                />
                <span className="text-gray-200 text-sm font-medium">{c}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Exchange Rate */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            {t('settings.exchangeRate')}{' '}
            <span className="text-gray-500 font-normal">({t('settings.usdToPlnRate')})</span>
          </label>

          {/* Auto/Manual toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={autoRate}
              onClick={() => setAutoRate(!autoRate)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                autoRate ? 'bg-primary-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                  autoRate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm text-gray-300">
              {t('settings.autoFetchRate')} {autoRate && <span className="text-accent-400 text-xs ml-1">{t('settings.active')}</span>}
            </span>
          </label>

          <div className="flex gap-2">
            <input
              id="exchangeRate"
              type="number"
              min={0}
              step={0.01}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="4.05"
              className={inputClass}
              disabled={autoRate && !fetchingRate}
            />
            <button
              type="button"
              onClick={handleRefreshRate}
              disabled={fetchingRate}
              className="shrink-0 inline-flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 text-sm font-medium px-2.5 sm:px-3 py-2 rounded-lg transition-colors min-h-[44px]"
              title={t('settings.refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${fetchingRate ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('settings.refresh')}</span>
            </button>
          </div>
          {autoRate && (
            <p className="text-xs text-gray-500">
              {t('settings.rateAutoUpdates')}
            </p>
          )}

          {/* Multi-currency rates display */}
          {allRates && (
            <div className="mt-3 bg-gray-800 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-400 mb-2">{t('settings.exchangeRates')}</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">{t('settings.usdToPlnRate')}</span>
                  <p className="text-gray-100 font-semibold">{usdToPlnDisplay.toFixed(2)}</p>
                </div>
                {usdToUahDisplay !== null && (
                  <div>
                    <span className="text-gray-500 text-xs">{t('settings.usdToUah')}</span>
                    <p className="text-gray-100 font-semibold">{usdToUahDisplay.toFixed(2)}</p>
                  </div>
                )}
                {plnToUahDisplay !== null && (
                  <div>
                    <span className="text-gray-500 text-xs">{t('settings.plnToUah')}</span>
                    <p className="text-gray-100 font-semibold">{plnToUahDisplay.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Monthly Budget */}
        <div className="space-y-2">
          <label
            htmlFor="monthlyBudget"
            className="block text-sm font-medium text-gray-300"
          >
            {t('settings.monthlyBudget')}{' '}
            <span className="text-gray-500 font-normal">({t('common.optional')})</span>
          </label>
          <input
            id="monthlyBudget"
            type="number"
            min={0}
            step={1}
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder="e.g. 3000"
            className={inputClass}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSaveSettings}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors min-h-[44px]"
        >
          <SettingsIcon className="h-4 w-4" />
          {t('settings.saveSettings')}
        </button>
      </section>

      {/* Data Management */}
      <section className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 space-y-4 sm:space-y-5">
        <h2 className="text-lg font-semibold text-white">{t('settings.dataManagement')}</h2>

        {/* Export */}
        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            {t('settings.exportDescription')}
          </p>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            {t('settings.exportData')}
          </button>
        </div>

        <hr className="border-gray-800" />

        {/* Import */}
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-400">
              {t('settings.importDescription')}
            </p>
            <p className="mt-1 text-sm text-warning-400 font-medium">
              {t('settings.importWarning')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="importFileInput"
            />
            <button
              onClick={() => {
                setImportError(null);
                setImportSuccess(false);
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Upload className="h-4 w-4" />
              {t('settings.importFromFile')}
            </button>
          </div>

          {importError && (
            <p className="text-sm text-danger-400">{importError}</p>
          )}
          {importSuccess && (
            <p className="text-sm text-accent-400">
              {t('settings.importSuccess')}
            </p>
          )}
        </div>
      </section>

      {/* Demo Data */}
      <section className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-white">{t('settings.demoData')}</h2>
        <p className="text-sm text-gray-400">
          {t('settings.demoDescription')}
        </p>
        <p className="text-sm text-warning-400 font-medium">
          {t('settings.demoWarning')}
        </p>
        <button
          onClick={onLoadSeed}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          <Database className="h-4 w-4" />
          {t('settings.loadDemoData')}
        </button>
      </section>

      {/* About */}
      <section className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">{t('settings.about')}</h2>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-400">{t('settings.app')}</dt>
            <dd className="text-gray-100 font-medium">{t('layout.appTitle')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">{t('settings.version')}</dt>
            <dd className="text-gray-100 font-medium">1.0.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">{t('settings.storage')}</dt>
            <dd className="text-gray-100">{t('settings.storageDescription')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">{t('settings.roadmap')}</dt>
            <dd className="text-gray-500 italic">
              {t('settings.roadmapDescription')}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
