import AsyncStorage from '@react-native-async-storage/async-storage';

import { storageKey } from './constants';
import { Transaction } from './types';

export async function loadTransactions() {
  const raw = await AsyncStorage.getItem(storageKey);

  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isTransaction) as Transaction[];
}

export async function saveTransactions(transactions: Transaction[]) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(transactions));
}

function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Transaction;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.amount === 'number' &&
    ['income', 'expense', 'saving'].includes(candidate.type) &&
    typeof candidate.category === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.createdAt === 'string'
  );
}
