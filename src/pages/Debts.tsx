import { useState } from 'react';
import { Plus, Trash2, X, CreditCard, DollarSign } from 'lucide-react';
import type { AppData, Debt, Currency } from '../types';
import { useI18n } from '../i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

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
    e: React.ChangeEvent<HTMLInputElement>,
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{t('debts.title')}</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {t('debts.totalRemaining')}:{' '}
            <span className="text-red-400 font-semibold">
              {debts.length > 0
                ? formatCurrency(totalDebt, data.settings.primaryCurrency)
                : '—'}
            </span>
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 shrink-0 min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('debts.addDebt')}</span>
          <span className="sm:hidden">{t('common.add')}</span>
        </Button>
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
              {debts.length > 0 ? `${avgInterestRate.toFixed(2)}%` : '—'}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(debt.id)}
                    className="text-gray-600 hover:text-red-400 flex-shrink-0 mt-0.5"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                        <Input
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
                          className="flex-1 min-w-0 min-h-[44px]"
                          autoFocus
                        />
                        <Button
                          onClick={() => handleMakePayment(debt)}
                          className="min-h-[44px]"
                        >
                          {t('common.apply')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setActivePayment(null);
                            setPaymentInputs(prev => ({ ...prev, [debt.id]: '' }));
                          }}
                          className="text-gray-500 hover:text-gray-300 min-h-[44px]"
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setForm(defaultForm);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('debts.addDebt')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="debt-name">{t('debts.name')}</Label>
              <Input
                id="debt-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="e.g. Car Loan"
              />
            </div>

            {/* Total Amount + Currency row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="debt-totalAmount">{t('debts.totalAmount')}</Label>
                <Input
                  id="debt-totalAmount"
                  type="number"
                  name="totalAmount"
                  value={form.totalAmount}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.currency')}</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm(prev => ({ ...prev, currency: v as Currency }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="PLN">PLN</SelectItem>
                    <SelectItem value="UAH">UAH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Already Paid */}
            <div className="space-y-1.5">
              <Label htmlFor="debt-paidAmount">{t('debts.alreadyPaid')}</Label>
              <Input
                id="debt-paidAmount"
                type="number"
                name="paidAmount"
                value={form.paidAmount}
                onChange={handleFormChange}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {/* Interest Rate + Minimum Payment row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="debt-interestRate">{t('debts.interestRate')}</Label>
                <Input
                  id="debt-interestRate"
                  type="number"
                  name="interestRate"
                  value={form.interestRate}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="debt-minimumPayment">{t('debts.minimumPayment')}</Label>
                <Input
                  id="debt-minimumPayment"
                  type="number"
                  name="minimumPayment"
                  value={form.minimumPayment}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="debt-dueDate">{t('debts.dueDate')}</Label>
              <Input
                id="debt-dueDate"
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setForm(defaultForm);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.totalAmount}
            >
              {t('debts.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
