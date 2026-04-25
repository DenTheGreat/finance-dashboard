import type { Currency, Recurrence } from '../../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Kind, FormState } from './helpers';

interface PlanningFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modalKind: Kind;
  editingId: string | null;
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: (e: React.FormEvent) => void;
  t: (key: string) => string;
}

export default function PlanningFormDialog({
  open,
  onOpenChange,
  modalKind,
  editingId,
  form,
  setField,
  onSave,
  t,
}: PlanningFormDialogProps) {
  const categoryOptions = modalKind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {editingId
              ? modalKind === 'income' ? 'Edit Expected Income' : 'Edit Planned Expense'
              : modalKind === 'income' ? 'Add Expected Income' : 'Add Planned Expense'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-gray-300">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={modalKind === 'income' ? 'e.g. Main Salary, Freelance' : 'e.g. Rent, Netflix'}
              required
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-300">Amount</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setField('amount', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300">{t('form.currency')}</Label>
              <Select value={form.currency} onValueChange={(v) => setField('currency', v as Currency)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {(['USD', 'PLN', 'UAH'] as Currency[]).map((c) => (
                    <SelectItem key={c} value={c} className="text-white focus:bg-gray-700">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-300">Category</Label>
              <Select value={form.category} onValueChange={(v) => setField('category', v)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-white focus:bg-gray-700">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300">Recurrence</Label>
              <Select value={form.recurrence} onValueChange={(v) => setField('recurrence', v as Recurrence)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="once" className="text-white focus:bg-gray-700">Once</SelectItem>
                  <SelectItem value="monthly" className="text-white focus:bg-gray-700">Monthly</SelectItem>
                  <SelectItem value="yearly" className="text-white focus:bg-gray-700">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-300">Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white [color-scheme:dark] focus-visible:ring-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300">
                End Date <span className="text-gray-500 font-normal">(optional)</span>
              </Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setField('endDate', e.target.value)}
                className="bg-gray-800 border-gray-700 text-white [color-scheme:dark] focus-visible:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setField('isActive', v)}
              className="data-[state=checked]:bg-primary-600"
            />
            <Label className="text-gray-300 cursor-pointer">
              {form.isActive ? 'Active' : 'Paused'}
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300">
              Notes <span className="text-gray-500 font-normal">(optional)</span>
            </Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Additional details..."
              rows={2}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none focus-visible:ring-primary-500"
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className={`flex-1 text-white ${
                modalKind === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-primary-600 hover:bg-primary-500'
              }`}
            >
              {editingId ? 'Save Changes' : modalKind === 'income' ? 'Add Income' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
