import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet, Upload, Pencil, Calendar, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onClose: () => void;
  onNavigate: (path: string) => void;
}

const STORAGE_KEY = 'finance-onboarding-done';

export default function Onboarding({ onClose, onNavigate }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    onClose();
  }

  function skip() {
    localStorage.setItem(STORAGE_KEY, '1');
    onClose();
  }

  function goTo(path: string) {
    localStorage.setItem(STORAGE_KEY, '1');
    onNavigate(path);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) finish(); }}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-medium">{step}/3</span>
          <button
            onClick={skip}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip
          </button>
        </div>

        {step === 1 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-primary-600/20 p-2.5 rounded-lg">
                  <Wallet className="h-6 w-6 text-primary-400" />
                </div>
                <DialogTitle className="text-white text-xl">Welcome to your Finance Dashboard</DialogTitle>
              </div>
              <DialogDescription className="text-gray-400 mt-3">
                Everything stays on your device — no accounts, no servers. Track your income,
                expenses, debts, savings, and plan your budgets, all locally.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)} className="gap-2">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-primary-600/20 p-2.5 rounded-lg">
                  <Upload className="h-6 w-6 text-primary-400" />
                </div>
                <DialogTitle className="text-white text-xl">Add your first transaction</DialogTitle>
              </div>
              <DialogDescription className="text-gray-400 mt-3">
                Import a bank statement (CSV/Excel) or connect your Monobank account directly.
                You can also enter transactions manually.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => goTo('/bank-import')}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-primary-500 rounded-lg p-4 text-left transition-colors"
              >
                <Upload className="h-5 w-5 text-primary-400 mb-2" />
                <p className="text-white font-medium text-sm">Import bank data</p>
                <p className="text-gray-500 text-xs mt-1">CSV, Excel, or Monobank API</p>
              </button>
              <button
                onClick={() => goTo('/transactions')}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-primary-500 rounded-lg p-4 text-left transition-colors"
              >
                <Pencil className="h-5 w-5 text-primary-400 mb-2" />
                <p className="text-white font-medium text-sm">Enter manually</p>
                <p className="text-gray-500 text-xs mt-1">Add one transaction at a time</p>
              </button>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-gray-400">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-primary-600/20 p-2.5 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary-400" />
                </div>
                <DialogTitle className="text-white text-xl">Set up planning</DialogTitle>
              </div>
              <DialogDescription className="text-gray-400 mt-3">
                Add your recurring bills (rent, subscriptions, utilities) on the Planning page
                to see what's coming up and compare planned vs actual each month.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-2">
              <button
                onClick={() => goTo('/planning')}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-primary-500 rounded-lg p-4 text-left transition-colors flex items-center justify-between"
              >
                <span>
                  <p className="text-white font-medium text-sm">Go to Planning</p>
                  <p className="text-gray-500 text-xs mt-1">Track recurring expenses and income</p>
                </span>
                <ArrowRight className="h-4 w-4 text-primary-400" />
              </button>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(2)} className="text-gray-400">
                Back
              </Button>
              <Button onClick={finish}>
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
