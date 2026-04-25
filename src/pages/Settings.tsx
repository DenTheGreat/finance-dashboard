import { useState, useRef, useEffect } from 'react';
import { Settings as SettingsIcon, Download, Upload, Info, RefreshCw, Database, Trash2, Filter, Tag, Bell, Plus, X } from 'lucide-react';
import { fetchAllRates } from '../utils/exchangeRate';
import type { AppData, UserSettings, Transaction } from '../types';
import { useI18n } from '../i18n';
import type { Locale } from '../i18n';
import BankImport from './BankImport';
import { requestNotificationPermission } from '../utils/reminders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface SettingsProps {
  data: AppData;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  onExport: () => void;
  onImport: (json: string) => void;
  onLoadSeed: () => void;
  onClear: () => void;
  onDeduplicate: () => number;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onAddRule: (keyword: string, category: string) => void;
  onAddCustomCategory: (kind: 'income' | 'expense', name: string) => void;
  onRemoveCustomCategory: (kind: 'income' | 'expense', name: string) => void;
}

export default function Settings({
  data,
  onUpdateSettings,
  onExport,
  onImport,
  onLoadSeed,
  onClear,
  onDeduplicate,
  onAddTransaction,
  onAddRule,
  onAddCustomCategory,
  onRemoveCustomCategory,
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

  // Custom categories
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [newIncomeCat, setNewIncomeCat] = useState('');

  // Notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const [reminderDays, setReminderDays] = useState<string>(() =>
    localStorage.getItem('reminders-days-ahead') ?? '3',
  );

  useEffect(() => {
    localStorage.setItem('reminders-days-ahead', reminderDays);
  }, [reminderDays]);

  async function handleEnableReminders() {
    const granted = await requestNotificationPermission();
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
    }
    if (!granted && typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      setNotifPermission('denied');
    }
  }

  function handleAddExpenseCat() {
    const name = newExpenseCat.trim();
    if (!name) return;
    onAddCustomCategory('expense', name);
    setNewExpenseCat('');
  }

  function handleAddIncomeCat() {
    const name = newIncomeCat.trim();
    if (!name) return;
    onAddCustomCategory('income', name);
    setNewIncomeCat('');
  }

  const customExpenseCategories = settings.customExpenseCategories ?? [];
  const customIncomeCategories = settings.customIncomeCategories ?? [];

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
          <div className="flex items-center gap-3">
            <Switch checked={autoRate} onCheckedChange={setAutoRate} />
            <span className="text-sm text-gray-300">
              {t('settings.autoFetchRate')} {autoRate && <span className="text-accent-400 text-xs ml-1">{t('settings.active')}</span>}
            </span>
          </div>

          <div className="flex gap-2">
            <Input
              id="exchangeRate"
              type="number"
              min={0}
              step={0.01}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="4.05"
              disabled={autoRate && !fetchingRate}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleRefreshRate}
              disabled={fetchingRate}
              className="shrink-0 gap-1.5 min-h-[44px]"
              title={t('settings.refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${fetchingRate ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('settings.refresh')}</span>
            </Button>
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
          <Label
            htmlFor="monthlyBudget"
            className="block text-sm font-medium text-gray-300"
          >
            {t('settings.monthlyBudget')}{' '}
            <span className="text-gray-500 font-normal">({t('common.optional')})</span>
          </Label>
          <Input
            id="monthlyBudget"
            type="number"
            min={0}
            step={1}
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder="e.g. 3000"
          />
        </div>

        {/* Save */}
        <Button
          onClick={handleSaveSettings}
          className="gap-2 min-h-[44px]"
        >
          <SettingsIcon className="h-4 w-4" />
          {t('settings.saveSettings')}
        </Button>
      </section>

      {/* Custom Categories */}
      <section className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 space-y-5">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">Custom Categories</h2>
        </div>
        <p className="text-xs text-gray-500">Built-in categories cannot be removed.</p>

        {/* Expense */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Expense Categories</h3>
          {customExpenseCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customExpenseCategories.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full pl-3 pr-1.5 py-1 text-xs text-gray-200"
                >
                  {c}
                  <button
                    onClick={() => onRemoveCustomCategory('expense', c)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-0.5"
                    aria-label={`Remove ${c}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No custom expense categories.</p>
          )}
          <div className="flex gap-2 pt-1">
            <Input
              value={newExpenseCat}
              onChange={(e) => setNewExpenseCat(e.target.value)}
              placeholder="New expense category"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddExpenseCat(); } }}
            />
            <Button onClick={handleAddExpenseCat} variant="outline" className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Income */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Income Categories</h3>
          {customIncomeCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customIncomeCategories.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full pl-3 pr-1.5 py-1 text-xs text-gray-200"
                >
                  {c}
                  <button
                    onClick={() => onRemoveCustomCategory('income', c)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-0.5"
                    aria-label={`Remove ${c}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No custom income categories.</p>
          )}
          <div className="flex gap-2 pt-1">
            <Input
              value={newIncomeCat}
              onChange={(e) => setNewIncomeCat(e.target.value)}
              placeholder="New income category"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIncomeCat(); } }}
            />
            <Button onClick={handleAddIncomeCat} variant="outline" className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
        </div>
        <p className="text-sm text-gray-400">
          Get a browser notification when planned expenses are coming up.
        </p>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="text-gray-400">Permission: </span>
            <span className={
              notifPermission === 'granted' ? 'text-green-400'
                : notifPermission === 'denied' ? 'text-red-400'
                : 'text-gray-300'
            }>
              {notifPermission === 'unsupported' ? 'Not supported in this browser' : notifPermission}
            </span>
          </div>
          {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
            <Button onClick={handleEnableReminders} variant="outline" className="gap-2">
              <Bell className="h-4 w-4" />
              Enable reminders
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label className="block text-sm font-medium text-gray-300">Days before due</Label>
          <select
            value={reminderDays}
            onChange={(e) => setReminderDays(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="1">1 day</option>
            <option value="2">2 days</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
          </select>
        </div>
      </section>

      {/* Bank Import */}
      <BankImport
        data={data}
        onAdd={onAddTransaction}
        onAddRule={onAddRule}
        onUpdateSettings={onUpdateSettings}
      />

      {/* Data Management */}
      <section className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 space-y-4 sm:space-y-5">
        <h2 className="text-lg font-semibold text-white">{t('settings.dataManagement')}</h2>

        {/* Export */}
        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            {t('settings.exportDescription')}
          </p>
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('settings.exportData')}
          </Button>
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
            <Button
              variant="outline"
              onClick={() => {
                setImportError(null);
                setImportSuccess(false);
                fileInputRef.current?.click();
              }}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {t('settings.importFromFile')}
            </Button>
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

        {data.transactions.length > 0 && (
          <>
            <hr className="border-gray-800" />

            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-gray-400">
                  {t('import.transactionsStored', { count: String(data.transactions.length), plural: data.transactions.length !== 1 ? 's' : '' })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const removed = onDeduplicate();
                      if (removed > 0) {
                        alert(t('import.removedDuplicates', { count: String(removed), plural: removed !== 1 ? 's' : '' }));
                      } else {
                        alert(t('import.noDuplicates'));
                      }
                    }}
                    className="gap-2 bg-yellow-900/40 hover:bg-yellow-900/60 text-yellow-400 hover:text-yellow-300 border-yellow-800 text-sm"
                  >
                    <Filter className="h-4 w-4" />
                    {t('import.deduplicate')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm(t('import.clearConfirm', { count: String(data.transactions.length) }))) {
                        onClear();
                      }
                    }}
                    className="gap-2 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('import.clearAll')}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
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
        <Button
          onClick={onLoadSeed}
          className="gap-2"
        >
          <Database className="h-4 w-4" />
          {t('settings.loadDemoData')}
        </Button>
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
