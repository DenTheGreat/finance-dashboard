import { format } from 'date-fns';

interface MonthSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

export default function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const [y, m] = value.split('-').map(Number);
  const label = format(new Date(y, m - 1, 1), 'MMMM yyyy');

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    onChange(format(d, 'yyyy-MM'));
  }

  return (
    <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => shift(-1)}
        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="px-4 py-2 text-white text-sm font-medium min-w-[130px] text-center select-none">
        {label}
      </span>
      <button
        onClick={() => shift(1)}
        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}
