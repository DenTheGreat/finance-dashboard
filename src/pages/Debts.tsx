import { useState } from 'react';
import { Plus, Trash2, X, CreditCard, DollarSign } from 'lucide-react';
import type { AppData, Debt } from '../types';
import { formatCurrency } from '../utils/currency';

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
  currency: 'USD' | 'PLN';
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
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
  const [activePayment, setActivePayment] = useState<string | null>(null);

  const debts = data.debts;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Debts</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Total remaining:{' '}
            <span className="text-red-400 font-semibold">
              {debts.length > 0
                ? formatCurrency(totalDebt, data.settings.primaryCurrency)
                : '—'}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Debt
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-red-500/10 p-3 rounded-lg">
            <DollarSign className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Total Debt</p>
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
            <p className="text-gray-400 text-xs uppercase tracking-wide">Active Debts</p>
            <p className="text-white font-semibold text-lg mt-0.5">{activeCount}</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-yellow-500/10 p-3 rounded-lg">
            <span className="text-yellow-400 font-bold text-sm">%</span>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Avg Interest Rate</p>
            <p className="text-white font-semibold text-lg mt-0.5">
              {debts.length > 0 ? `${avgInterestRate.toFixed(2)}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Debt cards */}
      {debts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <CreditCard className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No debts added yet.</p>
          <p className="text-gray-600 text-sm mt-1">
            Click "Add Debt" to start tracking your debts.
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
                        <span className="text-green-400 font-medium">Fully paid</span>
                      ) : (
                        <>
                          <span className="text-red-400 font-semibold">
                            {formatCurrency(remaining, debt.currency)}
                          </span>{' '}
                          remaining
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(debt.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                    aria-label="Delete debt"
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
                    <span>{percentPaid.toFixed(1)}% paid</span>
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
                      {debt.interestRate}% interest
                    </span>
                  )}
                  {debt.dueDate && (
                    <span className="bg-gray-800 px-2 py-1 rounded-md">
                      Due {debt.dueDate}
                    </span>
                  )}
                  {debt.minimumPayment !== undefined && (
                    <span className="bg-gray-800 px-2 py-1 rounded-md">
                      Min {formatCurrency(debt.minimumPayment, debt.currency)}/mo
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
                          placeholder="Amount"
                          value={paymentInputs[debt.id] ?? ''}
                          onChange={e =>
                            setPaymentInputs(prev => ({
                              ...prev,
                              [debt.id]: e.target.value,
                            }))
                          }
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm w-32 focus:outline-none focus:border-primary-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleMakePayment(debt)}
                          className="bg-primary-600 hover:bg-primary-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Apply
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
                        + Make Payment
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Debt Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Add Debt</h2>
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
                <label className="block text-sm text-gray-400 mb-1">Name</label>
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
                  <label className="block text-sm text-gray-400 mb-1">Total Amount</label>
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
                  <label className="block text-sm text-gray-400 mb-1">Currency</label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleFormChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-primary-500"
                  >
                    <option value="USD">USD</option>
                    <option value="PLN">PLN</option>
                  </select>
                </div>
              </div>

              {/* Already Paid */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Already Paid</label>
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
                  <label className="block text-sm text-gray-400 mb-1">Interest Rate (%)</label>
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
                  <label className="block text-sm text-gray-400 mb-1">Min Payment</label>
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
                <label className="block text-sm text-gray-400 mb-1">Due Date</label>
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
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.totalAmount}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
