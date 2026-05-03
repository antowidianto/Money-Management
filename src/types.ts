export type TransactionType = 'income' | 'expense' | 'saving';

export type PeriodMode = 'month' | 'year';

export type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note?: string;
  createdAt: string;
};

export type FinanceSummary = {
  income: number;
  expense: number;
  saving: number;
  remainingCash: number;
  retainedAfterExpense: number;
  savingRate: number;
  expenseRate: number;
  healthScore: number;
};

export type CategoryTotal = {
  category: string;
  total: number;
  percentage: number;
};

export type TrendPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
  saving: number;
  remainingCash: number;
};
