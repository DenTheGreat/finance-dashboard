import { useState, useEffect } from 'react';
import { Plus, Trash2, X, CreditCard, DollarSign } from 'lucide-react';
import type { AppData, Debt, Currency } from '../types';
import { useI18n } from '../i18n';

interface DebtsProps {
  data: AppData;
  onAdd: (debt: Omit<Debt, 'id'>) => void;
  onUpdate: (debt: Debt) => void;
  onDelete: (id: string) => void;
}

interface FormState {
  name: string;
  totalAmount: string;
  paidAmount: string;
  currency: Currency;
  interestRate: string;
  dueDate: string;
  minimumPayment: string;
}

const defaultForm: FormState = {
  name: '',
  totalAmount: '',
  paidAmount: '',
  currency: 'USD',
  interestRate: '',
  dueDate: '',
  minimumPayment: '',
};

export default function Debts({ data, onAdd, onUpdate, onDelete }: DebtsProps) {
  const { t, formatCurrency } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
  const [activePayment, setActivePayment] = useState<string | null>(null);

  // Calculate paid amounts from linked transactions
  const debtsWithLinkedPayments = data.debts.map(debt => {
    const linkedTransactions = data.transactions.filter(tx => tx.debtId === debt.id);
    const linkedTotal = linkedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    return {
      ...debt,
      paidAmount: Math.max(debt.paidAmount, linkedTotal),
      linkedTransactions,
    };
  });

  const debts = debtsWithLinkedPayments;

  // Summary calculations
  const totalDebt = debts.reduce(
    (sum, d) => sum + (d.totalAmount - d.paidAmount),
    0,
  );
  const activeCount = debts.filter(d => d.paidAmount < d.totalAmount).length;
  const avgInterestRate =
    debts.length > 0
      ? debts.reduce((sum, d) => sum + (d.interestRate ?? 0), 0) / debts.length
      : 0;

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSave() {
    const totalAmount = parseFloat(form.totalAmount);
    const paidAmount = parseFloat(form.paidAmount) || 0;
    if (!form.name.trim() || isNaN(totalAmount) || totalAmount <= 0) return;

    onAdd({
      name: form.name.trim(),
      totalAmount,
      paidAmount,
      currency: form.currency,
      interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
      dueDate: form.dueDate || undefined,
      minimumPayment: form.minimumPayment ? parseFloat(form.minimumPayment) : undefined,
    });

    setForm(defaultForm);
    setShowModal(false);
  }

  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal]);

  function handleMakePayment(debt: Debt) {
    const amount = parseFloat(paymentInputs[debt.id] || '');
    if (isNaN(amount) || amount <= 0) return;
    const newPaid = Math.min(debt.paidAmount + amount, debt.totalAmount);
    onUpdate({ ...debt, paidAmount: newPaid });
    setPaymentInputs(prev => ({ ...prev, [debt.id]: '' }));
    setActivePayment(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{t('debts.title')}</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {t('debts.totalRemaining')}:{' '}
            <span className="text-red-400 font-semibold">
              {debts.length > 0
                ? formatCurrency(totalDebt, data.settings.primaryCurrency)
                : '\u2014'}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('debts.addDebt')}</span>
          <span className="sm:hidden">{t('common.add')}</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-red-500/10 p-3 rounded-lg">
            <DollarSign className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">{t('debts.totalDebt')}</p>
            <p className="text-white font-semibold text-lg mt-0.5">
              {formatCurrency(totalDebt, data.settings.primaryCurrency)}
            </p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-primary-500/10 p-3 rounded-lg">
            <CreditCard className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">{t('debts.activeDebts')}</p>
            <p className="text-white font-semibold text-lg mt-0.5">{activeCount}</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-yellow-500/10 p-3 rounded-lg">
            <span className="text-yellow-400 font-bold text-sm">%</span>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">{t('debts.avgInterestRate')}</p>
            <p className="text-white font-semibold text-lg mt-0.5">
              {debts.length > 0 ? `${avgInterestRate.toFixed(2)}%` : '\u2014'}
            </p>
          </div>
        </div>
      </div>

      {/* Debt cards */}
      {debts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <CreditCard className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">{t('debts.noDebts')}</p>
          <p className="text-gray-600 text-sm mt-1">
            {t('debts.clickAddDebt')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {debts.map(debt => {
            const remaining = debt.totalAmount - debt.paidAmount;
            const percentPaid =
              debt.totalAmount > 0
                ? Math.min((debt.paidAmount / debt.totalAmount) * 100, 100)
                : 0;
            const isFullyPaid = remaining <= 0;

            return (
              <div
                key={debt.id}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-lg text-white leading-tight">
                      {debt.name}
                    </h3>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {isFullyPaid ? (
                        <span className="text-green-400 font-medium">{t('debts.fullyPaid')}</span>
                      ) : (
                        <>
                          <span className="text-red-400 font-semibold">
                            {formatCurrency(remaining, debt.currency)}
                          </span>{' '}
                          {t('debts.remaining')}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(debt.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-300"
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{percentPaid.toFixed(1)}% {t('debts.paid')}</span>
                    <span>
                      {formatCurrency(debt.paidAmount, debt.currency)} /{' '}
                      {formatCurrency(debt.totalAmount, debt.currency)}
                    </span>
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  {debt.interestRate !== undefined && (
                    <span className="bg-gray-800 px-2 py-1 rounded-md">
                      {debt.interestRate}% {t('debts.interest')}
                    </span>
                  )}
                  {debt.dueDate && (
                    <span className="bg-gray-800 px-2 py-1 rounded-md">
                      {t('debts.due')} {debt.dueDate}
                    </span>
                  )}
                  {debt.minimumPayment !== undefined && (
                    <span className="bg-gray-800 px-2 py-1 rounded-md">
                      {t('debts.minPayment')} {formatCurrency(debt.minimumPayment, debt.currency)}{t('debts.perMonth')}
                    </span>
                  )}
                </div>

                {/* Make payment */}
                {!isFullyPaid && (
                  <div>
                    {activePayment === debt.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={t('form.amount')}
                          value={paymentInputs[debt.id] ?? ''}
                          onChange={e =>
                            setPaymentInputs(prev => ({
                              ...prev,
                              [debt.id]: e.target.value,
                            }))
                          }
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm flex-1 min-w-0 focus:outline-none focus:border-primary-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleMakePayment(debt)}
                          className="bg-primary-600 hover:bg-primary-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          {t('common.apply')}
                        </button>
                        <button
                          onClick={() => {
                            setActivePayment(null);
                            setPaymentInputs(prev => ({ ...prev, [debt.id]: '' }));
                          }}
                          className="text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActivePayment(debt.id)}
                        className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
                      >
                        {t('debts.makePayment')}
                      </button>
                    )}
                  </div>
                )}

                {/* Linked transactions */}
                {debt.linkedTransactions && debt.linkedTransactions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-2">{t('debts.linkedTransactions')} ({debt.linkedTransactions.length})</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {debt.linkedTransactions.map(tx => (
                        <div key={tx.id} className="flex justify-between text-xs">
                          <span className="text-gray-400 truncate flex-1">{tx.description || tx.date}</span>
                          <span className="text-green-400 ml-2">+{formatCurrency(tx.amount, tx.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Debt Modal */}
      {showModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-xl p-4 sm:p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">{t('debts.addDebt')}</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(defaultForm);
                }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('debts.name')}</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Car Loan"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Total Amount + Currency row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.totalAmount')}</label>
                  <input
                    type="number"
                    name="totalAmount"
                    value={form.totalAmount}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('form.currency')}</label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleFormChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-primary-500"
                  >
                    <option value="USD">USD</option>
                    <option value="PLN">PLN</option>
                    <option value="UAH">UAH</option>
                  </select>
                </div>
              </div>

              {/* Already Paid */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('debts.alreadyPaid')}</label>
                <input
                  type="number"
                  name="paidAmount"
                  value={form.paidAmount}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Interest Rate + Minimum Payment row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.interestRate')}</label>
                  <input
                    type="number"
                    name="interestRate"
                    value={form.interestRate}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.minimumPayment')}</label>
                  <input
                    type="number"
                    name="minimumPayment"
                    value={form.minimumPayment}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('debts.dueDate')}</label>
                <input
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={handleFormChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(defaultForm);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.totalAmount}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('debts.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
