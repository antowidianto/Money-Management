import { TransactionType } from './types';

export const transactionTypeLabel: Record<TransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  saving: 'Tabungan',
};

export const transactionTypeShortLabel: Record<TransactionType, string> = {
  income: 'Masuk',
  expense: 'Keluar',
  saving: 'Simpan',
};

export const categoryOptions: Record<TransactionType, string[]> = {
  income: ['Gaji', 'Bisnis', 'Freelance', 'Bonus', 'Investasi', 'Lainnya'],
  expense: ['Makan', 'Transport', 'Tagihan', 'Belanja', 'Kesehatan', 'Hiburan', 'Lainnya'],
  saving: ['Dana darurat', 'Investasi', 'Tujuan khusus', 'Pensiun', 'Pendidikan', 'Lainnya'],
};

export const storageKey = 'kasku:transactions:v1';
