import { isBefore, startOfDay } from 'date-fns';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { PlannedExpense, PlannedIncome } from '../../types';
import {
  RECURRENCE_LABELS,
  getNextDueDate,
  formatNextDueDate,
  isApplicableToMonth,
  isPaidInMonth,
  type Kind,
  type DeleteTarget,
  type TransactionList,
} from './helpers';

interface PlanningCardProps {
  item: PlannedExpense | PlannedIncome;
  kind: Kind;
  selectedMonth: string;
  transactions: TransactionList;
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (iso: string) => string;
  t: (key: string) => string;
  onEdit: (item: PlannedExpense | PlannedIncome, kind: Kind) => void;
  onDelete: (target: DeleteTarget) => void;
  onToggleActive: (item: PlannedExpense | PlannedIncome, kind: Kind) => void;
}

export default function PlanningCard({
  item,
  kind,
  selectedMonth,
  transactions,
  formatCurrency,
  formatDate,
  t,
  onEdit,
  onDelete,
  onToggleActive,
}: PlanningCardProps) {
  const nextDue = getNextDueDate(item);
  const nextDueStr = formatNextDueDate(nextDue, formatDate);
  const isOverdue = nextDue && isBefore(nextDue, startOfDay(new Date()));
  const appliesToMonth = isApplicableToMonth(item, selectedMonth);
  const isPaid = appliesToMonth && isPaidInMonth(item, selectedMonth, transactions);
  const dotColor = item.isActive
    ? kind === 'income' ? '#34d399' : 'var(--color-primary-400, #a78bfa)'
    : '#4b5563';

  return (
    <div
      className={`bg-gray-900 rounded-xl p-5 border flex flex-col gap-3 transition-opacity ${
        item.isActive ? 'border-gray-800' : 'border-gray-800/50 opacity-60'
      } ${appliesToMonth ? 'ring-1 ring-primary-500/30' : ''}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
          <h3 className="text-white font-semibold truncate">{item.name}</h3>
          {appliesToMonth && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary-500/40 text-primary-400 bg-primary-500/10">
              Active
            </Badge>
          )}
          {appliesToMonth && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                isPaid
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
              }`}
            >
              {isPaid ? 'Paid' : 'Pending'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-600 hover:text-primary-400"
            onClick={() => onEdit(item, kind)}
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-600 hover:text-red-400"
            onClick={() => onDelete({ id: item.id, kind, name: item.name })}
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Amount + recurrence */}
      <div>
        <p className={`font-bold text-lg leading-tight ${kind === 'income' ? 'text-emerald-400' : 'text-white'}`}>
          {kind === 'income' ? '+' : ''}{formatCurrency(item.amount, item.currency)}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">{RECURRENCE_LABELS[item.recurrence]}</p>
      </div>

      {/* Category badge */}
      <Badge variant="secondary" className="w-fit text-xs bg-gray-800 text-gray-300 hover:bg-gray-800">
        {item.category}
      </Badge>

      {/* Next due */}
      <div className="flex items-center gap-1.5 text-xs">
        <Calendar className="h-3.5 w-3.5 text-gray-500 shrink-0" />
        {item.isActive ? (
          <span className={isOverdue ? 'text-red-400' : 'text-gray-400'}>
            {nextDue ? `Next: ${nextDueStr}` : 'No upcoming date'}
          </span>
        ) : (
          <span className="text-gray-500 italic">Paused</span>
        )}
      </div>

      {item.endDate && <p className="text-xs text-gray-500">Ends {formatDate(item.endDate)}</p>}
      {item.notes && <p className="text-gray-500 text-xs truncate">{item.notes}</p>}

      {/* Footer: active toggle + start date */}
      <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
        <button
          onClick={() => onToggleActive(item, kind)}
          className="flex items-center gap-2 text-xs font-medium transition-colors"
        >
          <Switch
            checked={item.isActive}
            className="h-4 w-7 data-[state=checked]:bg-emerald-500"
            aria-label={item.isActive ? 'Active' : 'Paused'}
          />
          <span className={item.isActive ? 'text-emerald-400' : 'text-gray-500'}>
            {item.isActive ? 'Active' : 'Paused'}
          </span>
        </button>
        <span className="text-gray-600 text-xs">{formatDate(item.startDate)}</span>
      </div>
    </div>
  );
}
