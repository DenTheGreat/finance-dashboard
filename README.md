# Finance Dashboard

A personal finance dashboard built for tracking income and expenses across multiple currencies (USD/PLN). Designed for expats earning in USD while spending in PLN, with accurate historical exchange rate tracking per transaction.

## Features

- **Dual-Currency Support** — Track transactions in both USD and PLN with automatic conversion
- **Per-Transaction Exchange Rates** — Each PLN transaction stores the exchange rate at the time it occurred, giving historically accurate USD cost tracking
- **Live Exchange Rates** — Fetches current USD/PLN rate on load (with manual override option)
- **Budget Advisor** — 50/30/20 rule analysis with personalized savings tips based on your spending patterns
- **Bank CSV Import** — Import transactions from PKO BP, Santander, or generic CSV formats with auto-detection and column mapping
- **Expense Breakdown** — Category-based spending visualization with interactive pie charts
- **Debt Tracking** — Monitor outstanding debts with interest rates, due dates, and payment progress
- **Savings Goals** — Set and track progress toward financial targets
- **Data Portability** — Export/import all data as JSON; everything stored in localStorage

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 7
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Routing:** React Router 7
- **Icons:** Lucide React
- **Testing:** Vitest + Testing Library
- **Linting:** ESLint 9

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/DenTheGreat/finance-dashboard.git
cd finance-dashboard
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Build

```bash
npm run build
npm run preview
```

### Testing

```bash
npm run test        # watch mode
npm run test:run    # single run
npm run test:coverage
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── components/
│   └── Layout.tsx          # Sidebar navigation layout
├── pages/
│   ├── Dashboard.tsx       # Overview with charts and budget advice
│   ├── Transactions.tsx    # Transaction list + add form
│   ├── BankImport.tsx      # CSV import wizard (upload -> map -> review)
│   ├── Debts.tsx           # Debt tracker
│   ├── Savings.tsx         # Savings goals
│   └── Settings.tsx        # Currency, exchange rate, data management
├── store/
│   └── index.ts            # LocalStorage-backed state management
├── types/
│   └── index.ts            # TypeScript interfaces and constants
└── utils/
    ├── advisor.ts          # Budget breakdown and savings advice
    ├── currency.ts         # Formatting and conversion helpers
    ├── exchangeRate.ts     # Live rate fetching
    ├── pkoImport.ts        # CSV parsing and bank format detection
    └── seed.ts             # Demo data generator
```

## Exchange Rate Tracking

PLN transactions store the USD to PLN exchange rate at the time of creation (`exchangeRateAtTime`). This means:

- **Adding transactions:** The form pre-fills the current rate; you can override with the actual rate you received
- **Importing CSV:** Each PLN transaction gets the current rate attached automatically
- **Dashboard/Advisor:** Historical calculations use the per-transaction rate for accurate USD totals
- **Backward compatible:** Older transactions without a stored rate fall back to the global rate

In the transaction list, PLN transactions display a USD equivalent subtitle:

```
-500,00 zl
~$124.38 @ 4.02
```

## License

MIT
