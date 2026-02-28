import { useState, useRef } from 'react';
import { Settings as SettingsIcon, Download, Upload, Info, RefreshCw, Database } from 'lucide-react';
import { fetchLiveRate } from '../utils/exchangeRate';
import type { AppData, UserSettings } from '../types';

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
  const { settings } = data;

  // Local form state initialised from current settings
  const [primaryCurrency, setPrimaryCurrency] = useState<'USD' | 'PLN'>(
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
    const rate = await fetchLiveRate();
    if (rate) {
      setExchangeRate(String(rate));
    }
    setFetchingRate(false);
  }

  // --- Currency settings save ---
  function handleSaveSettings() {
    const rate = parseFloat(exchangeRate);
    const budget = monthlyBudget !== '' ? parseFloat(monthlyBudget) : undefined;
    onUpdateSettings({
      primaryCurrency,
      exchangeRate: isNaN(rate) ? 4.05 : rate,
      autoExchangeRate: autoRate,
      monthlyBudget: budget !== undefined && isNaN(budget) ? undefined : budget,
    });
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
        setImportError('Could not read file.');
        return;
      }
      try {
        JSON.parse(text); // validate JSON before passing up
        onImport(text);
        setImportSuccess(true);
      } catch {
        setImportError('Invalid JSON file. Please select a valid export file.');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-7 w-7 text-primary-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Currency Settings */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-5">
        <h2 className="text-lg font-semibold text-white">Currency Settings</h2>

        {/* Primary Currency */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Primary Currency
          </label>
          <div className="flex gap-4">
            {(['USD', 'PLN'] as const).map((c) => (
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
            Exchange Rate{' '}
            <span className="text-gray-500 font-normal">(USD to PLN)</span>
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
              Auto-fetch live rate {autoRate && <span className="text-accent-400 text-xs ml-1">Active</span>}
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
              className="shrink-0 inline-flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              title="Fetch latest rate"
            >
              <RefreshCw className={`h-4 w-4 ${fetchingRate ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          {autoRate && (
            <p className="text-xs text-gray-500">
              Rate updates automatically on app load (cached for 1 hour). You can still refresh manually or disable auto-fetch to set your own rate.
            </p>
          )}
        </div>

        {/* Monthly Budget */}
        <div className="space-y-2">
          <label
            htmlFor="monthlyBudget"
            className="block text-sm font-medium text-gray-300"
          >
            Monthly Budget{' '}
            <span className="text-gray-500 font-normal">(optional)</span>
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
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          <SettingsIcon className="h-4 w-4" />
          Save Settings
        </button>
      </section>

      {/* Data Management */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-5">
        <h2 className="text-lg font-semibold text-white">Data Management</h2>

        {/* Export */}
        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            Download all your data as a JSON file for backup or migration.
          </p>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>

        <hr className="border-gray-800" />

        {/* Import */}
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-400">
              Import a previously exported JSON file to restore your data.
            </p>
            <p className="mt-1 text-sm text-warning-400 font-medium">
              Warning: importing will overwrite all existing data and cannot be
              undone.
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
              Import from File
            </button>
          </div>

          {importError && (
            <p className="text-sm text-danger-400">{importError}</p>
          )}
          {importSuccess && (
            <p className="text-sm text-accent-400">
              Data imported successfully.
            </p>
          )}
        </div>
      </section>

      {/* Demo Data */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-white">Demo Data</h2>
        <p className="text-sm text-gray-400">
          Load sample transactions, debts, and savings goals to explore the dashboard.
        </p>
        <p className="text-sm text-warning-400 font-medium">
          Warning: this will replace all existing data.
        </p>
        <button
          onClick={onLoadSeed}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          <Database className="h-4 w-4" />
          Load Demo Data
        </button>
      </section>

      {/* About */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">About</h2>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-400">App</dt>
            <dd className="text-gray-100 font-medium">Finance Dashboard</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Version</dt>
            <dd className="text-gray-100 font-medium">1.0.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Storage</dt>
            <dd className="text-gray-100">Data stored locally in your browser</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Roadmap</dt>
            <dd className="text-gray-500 italic">
              Future: cloud sync &amp; banking integration
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
