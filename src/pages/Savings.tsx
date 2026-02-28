import { useState } from 'react';
import { differenceInDays, format } from 'date-fns';
import { Plus, Trash2, X, PiggyBank, Target } from 'lucide-react';
import type { AppData, SavingsGoal } from '../types';
import { formatCurrency } from '../utils/currency';
import { getMonthlyBreakdown, getSavingsAdvice } from '../utils/advisor';

interface SavingsProps {
  data: AppData;
  onAdd: (goal: Omit<SavingsGoal, 'id'>) => void;
  onUpdate: (goal: SavingsGoal) => void;
  onDelete: (id: string) => void;
}

interface AddGoalForm {
  name: string;
  targetAmount: string;
  currentAmount: string;
  currency: 'USD' | 'PLN';
  deadline: string;
}

const STATUS_CONFIG = {
  excellent: {
    label: 'Excellent',
    classes: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  },
  good: {
    label: 'Good',
    classes: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  },
  fair: {
    label: 'Fair',
    classes: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
  needs_attention: {
    label: 'Needs Attention',
    classes: 'bg-red-500/20 text-red-400 border border-red-500/30',
  },
};

export default function Savings({ data, onAdd, onUpdate, onDelete }: SavingsProps) {
  const [showModal, setShowModal] = useState(false);
  const [addFundsId, setAddFundsId] = useState<string | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [form, setForm] = useState<AddGoalForm>({
    name: '',
    targetAmount: '',
    currentAmount: '',
    currency: data.settings.primaryCurrency,
    deadline: '',
  });

  // Advisor data — use current month
  const now = new Date();
  const breakdown = getMonthlyBreakdown(
    data.transactions,
    now.getMonth(),
    now.getFullYear(),
    data.settings.primaryCurrency,
    data.settings.exchangeRate,
  );
  const advice = getSavingsAdvice(breakdown);

  // 50/30/20 bar percentages — clamp each to [0,100] so bar never overflows
  const needsPct = Math.min(100, Math.max(0, advice.needsPercent));
  const wantsPct = Math.min(100, Math.max(0, advice.wantsPercent));
  const savingsPct = Math.min(100, Math.max(0, advice.savingsPercent));
  const totalPct = needsPct + wantsPct + savingsPct;
  // Normalise so they fill exactly 100 % of the bar width
  const barNeeds = totalPct > 0 ? (needsPct / totalPct) * 100 : 33.33;
  const barWants = totalPct > 0 ? (wantsPct / totalPct) * 100 : 33.33;
  const barSavings = totalPct > 0 ? (savingsPct / totalPct) * 100 : 33.34;

  const statusCfg = STATUS_CONFIG[advice.status];

  // --- Handlers ---
  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    const target = parseFloat(form.targetAmount);
    const current = parseFloat(form.currentAmount) || 0;
    if (!form.name.trim() || isNaN(target) || target <= 0) return;

    onAdd({
      name: form.name.trim(),
      targetAmount: target,
      currentAmount: Math.min(current, target),
      currency: form.currency,
      deadline: form.deadline || undefined,
    });

    setForm({
      name: '',
      targetAmount: '',
      currentAmount: '',
      currency: data.settings.primaryCurrency,
      deadline: '',
    });
    setShowModal(false);
  }

  function handleAddFunds(goal: SavingsGoal) {
    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) return;
    onUpdate({
      ...goal,
      currentAmount: Math.min(goal.currentAmount + amount, goal.targetAmount),
    });
    setAddFundsId(null);
    setAddFundsAmount('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Savings Goals</h1>
          <p className="text-gray-400 text-sm mt-1">Track and grow your savings targets</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </button>
      </div>

      {/* Savings Advisor Panel */}
      <div className="bg-gradient-to-r from-primary-900/50 to-primary-800/30 rounded-xl p-6 border border-primary-700/30">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-white font-semibold text-lg">Savings Advisor</h2>
            <p className="text-primary-300/70 text-sm">Based on the 50/30/20 rule</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${statusCfg.classes}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* Stacked bar */}
        <div className="mb-3">
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            <div
              className="bg-blue-500 transition-all duration-500"
              style={{ width: `${barNeeds}%` }}
              title={`Needs: ${advice.needsPercent.toFixed(1)}%`}
            />
            <div
              className="bg-purple-500 transition-all duration-500"
              style={{ width: `${barWants}%` }}
              title={`Wants: ${advice.wantsPercent.toFixed(1)}%`}
            />
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${barSavings}%` }}
              title={`Savings: ${advice.savingsPercent.toFixed(1)}%`}
            />
          </div>
        </div>

        {/* Legend — actual vs recommended */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {/* Needs */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
              <span className="text-gray-300 text-xs font-medium">Needs</span>
            </div>
            <p className="text-white text-sm font-semibold">{advice.needsPercent.toFixed(1)}%</p>
            <p className="text-gray-500 text-xs">Recommended: 50%</p>
          </div>
          {/* Wants */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 shrink-0" />
              <span className="text-gray-300 text-xs font-medium">Wants</span>
            </div>
            <p className="text-white text-sm font-semibold">{advice.wantsPercent.toFixed(1)}%</p>
            <p className="text-gray-500 text-xs">Recommended: 30%</p>
          </div>
          {/* Savings */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
              <span className="text-gray-300 text-xs font-medium">Savings</span>
            </div>
            <p className="text-white text-sm font-semibold">{advice.savingsPercent.toFixed(1)}%</p>
            <p className="text-gray-500 text-xs">Recommended: 20%</p>
          </div>
        </div>

        {/* Optimal savings amount */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-primary-900/40 rounded-lg border border-primary-700/20">
          <Target className="h-4 w-4 text-primary-300 shrink-0" />
          <span className="text-gray-300 text-sm">
            Optimal monthly savings:&nbsp;
            <span className="text-white font-semibold">
              {formatCurrency(advice.optimalSavingsAmount, data.settings.primaryCurrency)}
            </span>
            <span className="text-gray-500 ml-1">({advice.optimalSavingsRate}% of income)</span>
          </span>
        </div>

        {/* Tips */}
        {advice.tips.length > 0 && (
          <ul className="space-y-1.5">
            {advice.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-primary-400 mt-0.5 shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Goals Grid */}
      {data.savingsGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PiggyBank className="h-14 w-14 text-gray-700 mb-4" />
          <p className="text-gray-400 text-lg font-medium">No savings goals yet</p>
          <p className="text-gray-600 text-sm mt-1 mb-5">Add a goal to start tracking your progress</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.savingsGoals.map((goal) => {
            const pct = goal.targetAmount > 0
              ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
              : 0;
            const daysLeft = goal.deadline
              ? differenceInDays(new Date(goal.deadline), now)
              : null;
            const isComplete = pct >= 100;

            return (
              <div
                key={goal.id}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-4"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <PiggyBank className="h-5 w-5 text-primary-400 shrink-0" />
                    <h3 className="text-white font-semibold truncate">{goal.name}</h3>
                  </div>
                  <button
                    onClick={() => onDelete(goal.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors shrink-0 p-0.5"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>{pct.toFixed(1)}% complete</span>
                    {isComplete && (
                      <span className="text-emerald-400 font-medium">Goal reached!</span>
                    )}
                  </div>
                  <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isComplete ? 'bg-emerald-500' : 'bg-accent-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Current</p>
                    <p className="text-white font-bold text-lg leading-tight">
                      {formatCurrency(goal.currentAmount, goal.currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs mb-0.5">Target</p>
                    <p className="text-gray-300 font-semibold text-lg leading-tight">
                      {formatCurrency(goal.targetAmount, goal.currency)}
                    </p>
                  </div>
                </div>

                {/* Deadline / days remaining */}
                {goal.deadline && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Target className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                    {daysLeft !== null && daysLeft < 0 ? (
                      <span className="text-red-400">
                        Deadline passed ({format(new Date(goal.deadline), 'MMM d, yyyy')})
                      </span>
                    ) : daysLeft === 0 ? (
                      <span className="text-amber-400">Due today</span>
                    ) : (
                      <span className="text-gray-400">
                        {daysLeft} days left &mdash;{' '}
                        <span className="text-gray-500">
                          {format(new Date(goal.deadline), 'MMM d, yyyy')}
                        </span>
                      </span>
                    )}
                  </div>
                )}

                {/* Add Funds */}
                {!isComplete && (
                  <div className="pt-1 border-t border-gray-800">
                    {addFundsId === goal.id ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Amount"
                          value={addFundsAmount}
                          onChange={(e) => setAddFundsAmount(e.target.value)}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddFunds(goal);
                            if (e.key === 'Escape') {
                              setAddFundsId(null);
                              setAddFundsAmount('');
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddFunds(goal)}
                          className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setAddFundsId(null);
                            setAddFundsAmount('');
                          }}
                          className="px-2 py-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddFundsId(goal.id);
                          setAddFundsAmount('');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Funds
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-semibold text-lg">New Savings Goal</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleAddGoal} className="px-6 py-5 space-y-4">
              {/* Goal Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Goal Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Emergency Fund"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Target Amount + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Target Amount
                  </label>
                  <input
                    type="number"
                    name="targetAmount"
                    value={form.targetAmount}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleFormChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="USD">USD</option>
                    <option value="PLN">PLN</option>
                  </select>
                </div>
              </div>

              {/* Current Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Current Amount <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  name="currentAmount"
                  value={form.currentAmount}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Deadline <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={form.deadline}
                  onChange={handleFormChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
