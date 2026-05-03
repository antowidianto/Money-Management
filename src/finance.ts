import { CategoryTotal, FinanceSummary, PeriodMode, Transaction, TransactionType, TrendPoint } from './types';

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  currency: 'IDR',
  maximumFractionDigits: 0,
  style: 'currency',
});

const monthFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
});

const shortMonthFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'short',
});

const fullDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value).replace(/\s/g, '');
}

export function formatCompactCurrency(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}Rp${trimTrailingZero(abs / 1_000_000_000)}M`;
  }

  if (abs >= 1_000_000) {
    return `${sign}Rp${trimTrailingZero(abs / 1_000_000)}jt`;
  }

  if (abs >= 1_000) {
    return `${sign}Rp${trimTrailingZero(abs / 1_000)}rb`;
  }

  return formatCurrency(value);
}

export function parseAmountInput(input: string) {
  const numeric = input.replace(/[^\d]/g, '');
  return Number(numeric || 0);
}

export function onlyDigits(input: string) {
  return input.replace(/[^\d]/g, '');
}

export function todayInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = parseDateInput(value);
  return todayInputValue(date) === value;
}

export function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function formatDate(value: string) {
  return fullDateFormatter.format(parseDateInput(value));
}

export function periodLabel(date: Date, mode: PeriodMode) {
  if (mode === 'year') {
    return String(date.getFullYear());
  }

  return monthFormatter.format(date);
}

export function shiftPeriod(date: Date, mode: PeriodMode, amount: number) {
  const next = new Date(date);
  next.setDate(1);

  if (mode === 'year') {
    next.setFullYear(next.getFullYear() + amount);
    return next;
  }

  next.setMonth(next.getMonth() + amount);
  return next;
}

export function transactionIsInPeriod(transaction: Transaction, date: Date, mode: PeriodMode) {
  const transactionDate = parseDateInput(transaction.date);

  if (transactionDate.getFullYear() !== date.getFullYear()) {
    return false;
  }

  if (mode === 'year') {
    return true;
  }

  return transactionDate.getMonth() === date.getMonth();
}

export function filterTransactionsByPeriod(transactions: Transaction[], date: Date, mode: PeriodMode) {
  return transactions.filter((transaction) => transactionIsInPeriod(transaction, date, mode));
}

export function getSummary(transactions: Transaction[]): FinanceSummary {
  const totals = transactions.reduce(
    (accumulator, transaction) => {
      accumulator[transaction.type] += transaction.amount;
      return accumulator;
    },
    { expense: 0, income: 0, saving: 0 } satisfies Record<TransactionType, number>,
  );

  const remainingCash = totals.income - totals.expense - totals.saving;
  const retainedAfterExpense = totals.income - totals.expense;
  const savingRate = totals.income > 0 ? totals.saving / totals.income : 0;
  const expenseRate = totals.income > 0 ? totals.expense / totals.income : 0;
  const score = 45 + savingRate * 95 - expenseRate * 25 + (remainingCash >= 0 ? 15 : -20);

  return {
    income: totals.income,
    expense: totals.expense,
    saving: totals.saving,
    remainingCash,
    retainedAfterExpense,
    savingRate,
    expenseRate,
    healthScore: clamp(Math.round(score), 0, 100),
  };
}

export function getCategoryBreakdown(transactions: Transaction[], type: TransactionType): CategoryTotal[] {
  const selected = transactions.filter((transaction) => transaction.type === type);
  const total = selected.reduce((sum, transaction) => sum + transaction.amount, 0);
  const byCategory = selected.reduce<Record<string, number>>((accumulator, transaction) => {
    accumulator[transaction.category] = (accumulator[transaction.category] || 0) + transaction.amount;
    return accumulator;
  }, {});

  return Object.entries(byCategory)
    .map(([category, amount]) => ({
      category,
      total: amount,
      percentage: total > 0 ? amount / total : 0,
    }))
    .sort((first, second) => second.total - first.total);
}

export function getMonthlyTrend(transactions: Transaction[], anchorDate: Date, monthCount: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const start = new Date(anchorDate);
  start.setDate(1);
  start.setMonth(start.getMonth() - (monthCount - 1));

  for (let index = 0; index < monthCount; index += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + index);
    const monthlyTransactions = filterTransactionsByPeriod(transactions, date, 'month');
    const summary = getSummary(monthlyTransactions);

    points.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: shortMonthFormatter.format(date),
      income: summary.income,
      expense: summary.expense,
      saving: summary.saving,
      remainingCash: summary.remainingCash,
    });
  }

  return points;
}

export function getYearMonths(transactions: Transaction[], anchorDate: Date): TrendPoint[] {
  const points: TrendPoint[] = [];

  for (let month = 0; month < 12; month += 1) {
    const date = new Date(anchorDate.getFullYear(), month, 1);
    const monthlyTransactions = filterTransactionsByPeriod(transactions, date, 'month');
    const summary = getSummary(monthlyTransactions);

    points.push({
      key: `${date.getFullYear()}-${month}`,
      label: shortMonthFormatter.format(date),
      income: summary.income,
      expense: summary.expense,
      saving: summary.saving,
      remainingCash: summary.remainingCash,
    });
  }

  return points;
}

export function sortTransactionsNewestFirst(transactions: Transaction[]) {
  return [...transactions].sort((first, second) => {
    const byDate = second.date.localeCompare(first.date);

    if (byDate !== 0) {
      return byDate;
    }

    return second.createdAt.localeCompare(first.createdAt);
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function trimTrailingZero(value: number) {
  return value.toFixed(value >= 10 ? 0 : 1).replace(/\.0$/, '');
}
