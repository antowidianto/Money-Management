import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react-native';

import { categoryOptions, transactionTypeLabel, transactionTypeShortLabel } from './src/constants';
import {
  filterTransactionsByPeriod,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  getCategoryBreakdown,
  getMonthlyTrend,
  getSummary,
  getYearMonths,
  isValidDateInput,
  onlyDigits,
  parseAmountInput,
  periodLabel,
  shiftPeriod,
  sortTransactionsNewestFirst,
  todayInputValue,
} from './src/finance';
import { loadTransactions, saveTransactions } from './src/storage';
import { colors, shadow } from './src/theme';
import { CategoryTotal, PeriodMode, Transaction, TransactionType, TrendPoint } from './src/types';

type TabKey = 'dashboard' | 'transactions' | 'reports';
type TypeFilter = TransactionType | 'all';

type TransactionDraft = {
  title: string;
  amount: string;
  type: TransactionType;
  category: string;
  date: string;
  note: string;
};

const iconByType: Record<TransactionType, LucideIcon> = {
  income: ArrowDownCircle,
  expense: ArrowUpCircle,
  saving: PiggyBank,
};

const colorByType: Record<TransactionType, { color: string; tint: string }> = {
  income: { color: colors.income, tint: colors.incomeTint },
  expense: { color: colors.expense, tint: colors.expenseTint },
  saving: { color: colors.saving, tint: colors.savingTint },
};

const emptyDraft = (): TransactionDraft => ({
  title: '',
  amount: '',
  type: 'expense',
  category: categoryOptions.expense[0],
  date: todayInputValue(),
  note: '',
});

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draft, setDraft] = useState<TransactionDraft>(() => emptyDraft());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    loadTransactions()
      .then((storedTransactions) => {
        if (mounted) {
          setTransactions(storedTransactions);
        }
      })
      .catch(() => {
        Alert.alert('Data tidak terbaca', 'Penyimpanan lokal belum bisa dimuat.');
      })
      .finally(() => {
        if (mounted) {
          setHydrated(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveTransactions(transactions).catch(() => {
      Alert.alert('Gagal menyimpan', 'Perubahan transaksi belum tersimpan.');
    });
  }, [hydrated, transactions]);

  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, selectedDate, periodMode),
    [periodMode, selectedDate, transactions],
  );

  const periodSummary = useMemo(() => getSummary(periodTransactions), [periodTransactions]);
  const sortedPeriodTransactions = useMemo(() => sortTransactionsNewestFirst(periodTransactions), [periodTransactions]);
  const dashboardTrend = useMemo(() => getMonthlyTrend(transactions, selectedDate, 6), [selectedDate, transactions]);
  const yearMonths = useMemo(() => getYearMonths(transactions, selectedDate), [selectedDate, transactions]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return sortTransactionsNewestFirst(transactions).filter((transaction) => {
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      const matchesQuery =
        !query ||
        transaction.title.toLowerCase().includes(query) ||
        transaction.category.toLowerCase().includes(query) ||
        transaction.note?.toLowerCase().includes(query);

      return matchesType && matchesQuery;
    });
  }, [searchQuery, transactions, typeFilter]);

  const openEditor = () => {
    setDraft(emptyDraft());
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
  };

  const handleDraftTypeChange = (type: TransactionType) => {
    setDraft((current) => ({
      ...current,
      type,
      category: categoryOptions[type][0],
    }));
  };

  const handleSaveTransaction = () => {
    const amount = parseAmountInput(draft.amount);
    const title = draft.title.trim();
    const note = draft.note.trim();

    if (!title) {
      Alert.alert('Judul kosong', 'Isi nama transaksi terlebih dahulu.');
      return;
    }

    if (amount <= 0) {
      Alert.alert('Nominal belum valid', 'Masukkan nominal lebih dari nol.');
      return;
    }

    if (!isValidDateInput(draft.date)) {
      Alert.alert('Tanggal belum valid', 'Gunakan format YYYY-MM-DD.');
      return;
    }

    const nextTransaction: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      amount,
      type: draft.type,
      category: draft.category,
      date: draft.date,
      note: note || undefined,
      createdAt: new Date().toISOString(),
    };

    setTransactions((current) => [nextTransaction, ...current]);
    setIsEditorOpen(false);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    Alert.alert('Hapus transaksi', transaction.title, [
      { style: 'cancel', text: 'Batal' },
      {
        onPress: () => setTransactions((current) => current.filter((item) => item.id !== transaction.id)),
        style: 'destructive',
        text: 'Hapus',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        {activeTab === 'dashboard' ? (
          <DashboardScreen
            onAdd={openEditor}
            onShiftPeriod={(amount) => setSelectedDate((current) => shiftPeriod(current, periodMode, amount))}
            periodMode={periodMode}
            periodSummary={periodSummary}
            recentTransactions={sortedPeriodTransactions.slice(0, 4)}
            selectedDate={selectedDate}
            setPeriodMode={setPeriodMode}
            trend={dashboardTrend}
          />
        ) : null}

        {activeTab === 'transactions' ? (
          <TransactionsScreen
            filteredTransactions={filteredTransactions}
            onAdd={openEditor}
            onDelete={handleDeleteTransaction}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setTypeFilter={setTypeFilter}
            typeFilter={typeFilter}
          />
        ) : null}

        {activeTab === 'reports' ? (
          <ReportsScreen
            onShiftPeriod={(amount) => setSelectedDate((current) => shiftPeriod(current, periodMode, amount))}
            periodMode={periodMode}
            periodSummary={periodSummary}
            periodTransactions={periodTransactions}
            selectedDate={selectedDate}
            setPeriodMode={setPeriodMode}
            yearMonths={yearMonths}
          />
        ) : null}
      </View>

      <BottomNavigation activeTab={activeTab} onChange={setActiveTab} />

      <TransactionEditor
        draft={draft}
        isOpen={isEditorOpen}
        onChange={setDraft}
        onClose={closeEditor}
        onSave={handleSaveTransaction}
        onTypeChange={handleDraftTypeChange}
      />
    </SafeAreaView>
  );
}

function DashboardScreen({
  onAdd,
  onShiftPeriod,
  periodMode,
  periodSummary,
  recentTransactions,
  selectedDate,
  setPeriodMode,
  trend,
}: {
  onAdd: () => void;
  onShiftPeriod: (amount: number) => void;
  periodMode: PeriodMode;
  periodSummary: ReturnType<typeof getSummary>;
  recentTransactions: Transaction[];
  selectedDate: Date;
  setPeriodMode: (mode: PeriodMode) => void;
  trend: TrendPoint[];
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.screen}>
      <Header title="Dashboard" onAdd={onAdd} />
      <PeriodToolbar
        mode={periodMode}
        onModeChange={setPeriodMode}
        onShift={onShiftPeriod}
        selectedDate={selectedDate}
      />

      <View style={styles.balancePanel}>
        <View style={styles.balanceTopRow}>
          <View>
            <Text style={styles.panelLabel}>Sisa cash</Text>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[styles.balanceValue, periodSummary.remainingCash < 0 && styles.negativeText]}
            >
              {formatCurrency(periodSummary.remainingCash)}
            </Text>
          </View>
          <View style={styles.scorePill}>
            <ShieldCheck color={colors.income} size={18} strokeWidth={2.2} />
            <Text style={styles.scoreText}>{periodSummary.healthScore}/100</Text>
          </View>
        </View>
        <View style={styles.panelDivider} />
        <ProgressRow color={colors.expense} label="Rasio pengeluaran" value={periodSummary.expenseRate} />
        <ProgressRow color={colors.saving} label="Rasio tabungan" value={periodSummary.savingRate} />
      </View>

      <View style={styles.metricGrid}>
        <MetricCard
          color={colors.income}
          icon={ArrowDownCircle}
          label="Pemasukan"
          tint={colors.incomeTint}
          value={formatCurrency(periodSummary.income)}
        />
        <MetricCard
          color={colors.expense}
          icon={ArrowUpCircle}
          label="Pengeluaran"
          tint={colors.expenseTint}
          value={formatCurrency(periodSummary.expense)}
        />
        <MetricCard
          color={colors.saving}
          icon={PiggyBank}
          label="Tabungan"
          tint={colors.savingTint}
          value={formatCurrency(periodSummary.saving)}
        />
        <MetricCard
          color={colors.warning}
          icon={WalletCards}
          label="Setelah belanja"
          tint={colors.warningTint}
          value={formatCurrency(periodSummary.retainedAfterExpense)}
        />
      </View>

      <Section title="Tren 6 bulan">
        <TrendChart points={trend} />
      </Section>

      <Section title="Transaksi terbaru">
        {recentTransactions.length ? (
          recentTransactions.map((transaction) => (
            <TransactionRow isCompact key={transaction.id} transaction={transaction} />
          ))
        ) : (
          <EmptyState label="Belum ada transaksi di periode ini." />
        )}
      </Section>
    </ScrollView>
  );
}

function TransactionsScreen({
  filteredTransactions,
  onAdd,
  onDelete,
  searchQuery,
  setSearchQuery,
  setTypeFilter,
  typeFilter,
}: {
  filteredTransactions: Transaction[];
  onAdd: () => void;
  onDelete: (transaction: Transaction) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setTypeFilter: (value: TypeFilter) => void;
  typeFilter: TypeFilter;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.screen}>
      <Header title="Transaksi" onAdd={onAdd} />

      <View style={styles.searchBox}>
        <Search color={colors.mutedText} size={19} strokeWidth={2.1} />
        <TextInput
          onChangeText={setSearchQuery}
          placeholder="Cari transaksi"
          placeholderTextColor={colors.mutedText}
          style={styles.searchInput}
          value={searchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller}>
        <FilterChip active={typeFilter === 'all'} label="Semua" onPress={() => setTypeFilter('all')} />
        {(['income', 'expense', 'saving'] as TransactionType[]).map((type) => (
          <FilterChip
            active={typeFilter === type}
            color={colorByType[type].color}
            key={type}
            label={transactionTypeLabel[type]}
            onPress={() => setTypeFilter(type)}
          />
        ))}
      </ScrollView>

      <View style={styles.listStack}>
        {filteredTransactions.length ? (
          filteredTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} onDelete={onDelete} transaction={transaction} />
          ))
        ) : (
          <EmptyState label="Transaksi tidak ditemukan." />
        )}
      </View>
    </ScrollView>
  );
}

function ReportsScreen({
  onShiftPeriod,
  periodMode,
  periodSummary,
  periodTransactions,
  selectedDate,
  setPeriodMode,
  yearMonths,
}: {
  onShiftPeriod: (amount: number) => void;
  periodMode: PeriodMode;
  periodSummary: ReturnType<typeof getSummary>;
  periodTransactions: Transaction[];
  selectedDate: Date;
  setPeriodMode: (mode: PeriodMode) => void;
  yearMonths: TrendPoint[];
}) {
  const incomeBreakdown = getCategoryBreakdown(periodTransactions, 'income');
  const expenseBreakdown = getCategoryBreakdown(periodTransactions, 'expense');
  const savingBreakdown = getCategoryBreakdown(periodTransactions, 'saving');

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.screen}>
      <Header title="Laporan" />
      <PeriodToolbar
        mode={periodMode}
        onModeChange={setPeriodMode}
        onShift={onShiftPeriod}
        selectedDate={selectedDate}
      />

      <View style={styles.reportSummary}>
        <SummaryLine color={colors.income} label="Masuk" value={periodSummary.income} />
        <SummaryLine color={colors.expense} label="Keluar" value={periodSummary.expense} />
        <SummaryLine color={colors.saving} label="Simpan" value={periodSummary.saving} />
        <SummaryLine color={colors.charcoal} label="Cash" value={periodSummary.remainingCash} />
      </View>

      <Section title="Komposisi kategori">
        <CategoryBreakdown color={colors.expense} data={expenseBreakdown} title="Pengeluaran" />
        <CategoryBreakdown color={colors.saving} data={savingBreakdown} title="Tabungan" />
        <CategoryBreakdown color={colors.income} data={incomeBreakdown} title="Pemasukan" />
      </Section>

      {periodMode === 'year' ? (
        <Section title="Rekap bulanan">
          <YearTable points={yearMonths} />
        </Section>
      ) : (
        <Section title="Arus bulan ini">
          <TrendChart points={getMonthlyTrend(periodTransactions, selectedDate, 1)} />
        </Section>
      )}
    </ScrollView>
  );
}

function Header({ onAdd, title }: { onAdd?: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>KasKu</Text>
        <Text style={styles.screenTitle}>{title}</Text>
      </View>
      {onAdd ? (
        <Pressable accessibilityLabel="Tambah transaksi" onPress={onAdd} style={styles.addButton}>
          <Plus color={colors.surface} size={22} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

function PeriodToolbar({
  mode,
  onModeChange,
  onShift,
  selectedDate,
}: {
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
  onShift: (amount: number) => void;
  selectedDate: Date;
}) {
  return (
    <View style={styles.periodToolbar}>
      <View style={styles.modeSegment}>
        <SegmentButton active={mode === 'month'} label="Bulanan" onPress={() => onModeChange('month')} />
        <SegmentButton active={mode === 'year'} label="Tahunan" onPress={() => onModeChange('year')} />
      </View>
      <View style={styles.periodStepper}>
        <IconButton icon={ChevronLeft} label="Periode sebelumnya" onPress={() => onShift(-1)} />
        <View style={styles.periodLabel}>
          <CalendarDays color={colors.slate} size={17} strokeWidth={2.1} />
          <Text numberOfLines={1} style={styles.periodText}>
            {periodLabel(selectedDate, mode)}
          </Text>
        </View>
        <IconButton icon={ChevronRight} label="Periode berikutnya" onPress={() => onShift(1)} />
      </View>
    </View>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Icon color={colors.charcoal} size={19} strokeWidth={2.2} />
    </Pressable>
  );
}

function MetricCard({
  color,
  icon: Icon,
  label,
  tint,
  value,
}: {
  color: string;
  icon: LucideIcon;
  label: string;
  tint: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: tint }]}>
        <Icon color={color} size={19} strokeWidth={2.1} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function ProgressRow({ color, label, value }: { color: string; label: string; value: number }) {
  const percentage = Math.round(Math.min(value, 1) * 100);

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{percentage}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { backgroundColor: color, width: `${percentage}%` }]} />
      </View>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const maxValue = Math.max(
    1,
    ...points.map((point) => Math.max(point.income, point.expense + point.saving)),
  );

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartLegend}>
        <LegendDot color={colors.income} label="Masuk" />
        <LegendDot color={colors.expense} label="Keluar + simpan" />
      </View>
      <View style={styles.trendChart}>
        {points.map((point) => {
          const outflow = point.expense + point.saving;
          const incomeHeight = point.income > 0 ? Math.max(4, (point.income / maxValue) * 82) : 0;
          const outflowHeight = outflow > 0 ? Math.max(4, (outflow / maxValue) * 82) : 0;

          return (
            <View key={point.key} style={styles.trendColumn}>
              <View style={styles.trendTrack}>
                <View style={[styles.trendBar, { backgroundColor: colors.income, height: incomeHeight }]} />
                <View style={[styles.trendBar, { backgroundColor: colors.expense, height: outflowHeight }]} />
              </View>
              <Text style={styles.trendLabel}>{point.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function TransactionRow({
  isCompact,
  onDelete,
  transaction,
}: {
  isCompact?: boolean;
  onDelete?: (transaction: Transaction) => void;
  transaction: Transaction;
}) {
  const Icon = iconByType[transaction.type];
  const typeColor = colorByType[transaction.type].color;
  const amountPrefix = transaction.type === 'income' ? '+' : '-';

  return (
    <View style={[styles.transactionCard, isCompact && styles.transactionCardCompact]}>
      <View style={[styles.transactionIcon, { backgroundColor: colorByType[transaction.type].tint }]}>
        <Icon color={typeColor} size={20} strokeWidth={2.1} />
      </View>
      <View style={styles.transactionMain}>
        <Text numberOfLines={1} style={styles.transactionTitle}>
          {transaction.title}
        </Text>
        <Text numberOfLines={1} style={styles.transactionMeta}>
          {transaction.category} · {formatDate(transaction.date)}
        </Text>
      </View>
      <View style={styles.transactionAmountWrap}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.transactionAmount, { color: typeColor }]}>
          {amountPrefix}
          {formatCompactCurrency(transaction.amount)}
        </Text>
        <Text style={styles.transactionType}>{transactionTypeShortLabel[transaction.type]}</Text>
      </View>
      {onDelete ? (
        <Pressable
          accessibilityLabel="Hapus transaksi"
          onPress={() => onDelete(transaction)}
          style={styles.deleteButton}
        >
          <Trash2 color={colors.expense} size={18} strokeWidth={2.1} />
        </Pressable>
      ) : null}
    </View>
  );
}

function FilterChip({
  active,
  color = colors.charcoal,
  label,
  onPress,
}: {
  active: boolean;
  color?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        active && {
          backgroundColor: color,
          borderColor: color,
        },
      ]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SummaryLine({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.summaryLine}>
      <View style={[styles.summaryAccent, { backgroundColor: color }]} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.summaryValue, value < 0 && styles.negativeText]}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

function CategoryBreakdown({ color, data, title }: { color: string; data: CategoryTotal[]; title: string }) {
  if (!data.length) {
    return (
      <View style={styles.breakdownBlock}>
        <Text style={styles.breakdownTitle}>{title}</Text>
        <EmptyState label="Belum ada data." compact />
      </View>
    );
  }

  return (
    <View style={styles.breakdownBlock}>
      <Text style={styles.breakdownTitle}>{title}</Text>
      {data.map((item) => (
        <View key={item.category} style={styles.categoryRow}>
          <View style={styles.categoryTopLine}>
            <Text numberOfLines={1} style={styles.categoryName}>
              {item.category}
            </Text>
            <Text style={styles.categoryAmount}>{formatCompactCurrency(item.total)}</Text>
          </View>
          <View style={styles.categoryTrack}>
            <View
              style={[
                styles.categoryFill,
                { backgroundColor: color, width: `${Math.max(4, Math.round(item.percentage * 100))}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function YearTable({ points }: { points: TrendPoint[] }) {
  return (
    <View style={styles.yearTable}>
      {points.map((point) => (
        <View key={point.key} style={styles.yearRow}>
          <Text style={styles.yearMonth}>{point.label}</Text>
          <View style={styles.yearValues}>
            <Text style={[styles.yearValue, { color: colors.income }]}>{formatCompactCurrency(point.income)}</Text>
            <Text style={[styles.yearValue, { color: colors.expense }]}>
              {formatCompactCurrency(point.expense + point.saving)}
            </Text>
            <Text style={[styles.yearValue, point.remainingCash < 0 && styles.negativeText]}>
              {formatCompactCurrency(point.remainingCash)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ compact, label }: { compact?: boolean; label: string }) {
  return (
    <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

function BottomNavigation({ activeTab, onChange }: { activeTab: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <View style={styles.bottomNav}>
      <NavButton active={activeTab === 'dashboard'} icon={Home} label="Dashboard" onPress={() => onChange('dashboard')} />
      <NavButton
        active={activeTab === 'transactions'}
        icon={ReceiptText}
        label="Transaksi"
        onPress={() => onChange('transactions')}
      />
      <NavButton active={activeTab === 'reports'} icon={BarChart3} label="Laporan" onPress={() => onChange('reports')} />
    </View>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.navButton, active && styles.navButtonActive]}>
      <Icon color={active ? colors.surface : colors.mutedText} size={20} strokeWidth={2.2} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function TransactionEditor({
  draft,
  isOpen,
  onChange,
  onClose,
  onSave,
  onTypeChange,
}: {
  draft: TransactionDraft;
  isOpen: boolean;
  onChange: (draft: TransactionDraft) => void;
  onClose: () => void;
  onSave: () => void;
  onTypeChange: (type: TransactionType) => void;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={isOpen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.editor}>
          <View style={styles.editorHeader}>
            <Text style={styles.editorTitle}>Tambah transaksi</Text>
            <Pressable accessibilityLabel="Tutup" onPress={onClose} style={styles.closeButton}>
              <X color={colors.charcoal} size={21} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.typeGrid}>
            {(['income', 'expense', 'saving'] as TransactionType[]).map((type) => {
              const Icon = iconByType[type];
              const active = draft.type === type;

              return (
                <Pressable
                  key={type}
                  onPress={() => onTypeChange(type)}
                  style={[
                    styles.typeOption,
                    active && {
                      backgroundColor: colorByType[type].tint,
                      borderColor: colorByType[type].color,
                    },
                  ]}
                >
                  <Icon color={active ? colorByType[type].color : colors.mutedText} size={18} strokeWidth={2.1} />
                  <Text style={[styles.typeOptionText, active && { color: colorByType[type].color }]}>
                    {transactionTypeShortLabel[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nama</Text>
            <TextInput
              onChangeText={(title) => onChange({ ...draft, title })}
              placeholder="Contoh: Makan siang"
              placeholderTextColor={colors.mutedText}
              style={styles.textInput}
              value={draft.title}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Nominal</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(amount) => onChange({ ...draft, amount: onlyDigits(amount) })}
                placeholder="0"
                placeholderTextColor={colors.mutedText}
                style={styles.textInput}
                value={draft.amount}
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Tanggal</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={(date) => onChange({ ...draft, date })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedText}
                style={styles.textInput}
                value={draft.date}
              />
            </View>
          </View>

          {parseAmountInput(draft.amount) > 0 ? (
            <Text style={styles.amountPreview}>{formatCurrency(parseAmountInput(draft.amount))}</Text>
          ) : null}

          <Text style={styles.inputLabel}>Kategori</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroller}>
            {categoryOptions[draft.type].map((category) => (
              <FilterChip
                active={draft.category === category}
                color={colorByType[draft.type].color}
                key={category}
                label={category}
                onPress={() => onChange({ ...draft, category })}
              />
            ))}
          </ScrollView>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Catatan</Text>
            <TextInput
              multiline
              onChangeText={(note) => onChange({ ...draft, note })}
              placeholder="Opsional"
              placeholderTextColor={colors.mutedText}
              style={[styles.textInput, styles.noteInput]}
              value={draft.note}
            />
          </View>

          <Pressable onPress={onSave} style={styles.saveButton}>
            <Plus color={colors.surface} size={20} strokeWidth={2.3} />
            <Text style={styles.saveButtonText}>Simpan transaksi</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: colors.background,
    flex: 1,
  },
  shell: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    color: colors.income,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  screenTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 2,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  periodToolbar: {
    gap: 10,
  },
  modeSegment: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
    ...shadow,
  },
  segmentText: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
  },
  segmentTextActive: {
    color: colors.text,
  },
  periodStepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  periodLabel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  periodText: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'capitalize',
  },
  balancePanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...shadow,
  },
  balanceTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  panelLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  balanceValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 4,
    maxWidth: 235,
  },
  negativeText: {
    color: colors.expense,
  },
  scorePill: {
    alignItems: 'center',
    backgroundColor: colors.incomeTint,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
  },
  scoreText: {
    color: colors.income,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  panelDivider: {
    backgroundColor: colors.border,
    height: 1,
  },
  progressRow: {
    gap: 7,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  progressValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48.5%',
    flexGrow: 1,
    gap: 7,
    minHeight: 124,
    padding: 13,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  metricValue: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  chartWrap: {
    gap: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendDot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  legendText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  trendChart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 9,
    height: 112,
    justifyContent: 'space-between',
  },
  trendColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 7,
  },
  trendTrack: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 7,
    flexDirection: 'row',
    gap: 2,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingBottom: 3,
    width: '100%',
  },
  trendBar: {
    borderRadius: 999,
    width: 8,
  },
  trendLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'capitalize',
  },
  transactionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    padding: 11,
  },
  transactionCardCompact: {
    borderColor: colors.surfaceMuted,
    minHeight: 64,
  },
  transactionIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  transactionMain: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  transactionMeta: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    marginTop: 4,
  },
  transactionAmountWrap: {
    alignItems: 'flex-end',
    maxWidth: 94,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  transactionType: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 4,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.expenseTint,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    height: 48,
    paddingHorizontal: 13,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
    padding: 0,
  },
  chipScroller: {
    marginHorizontal: -18,
    paddingHorizontal: 18,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 37,
    justifyContent: 'center',
    marginRight: 8,
    paddingHorizontal: 13,
  },
  filterChipText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  listStack: {
    gap: 10,
  },
  reportSummary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
  },
  summaryLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    minHeight: 43,
    paddingHorizontal: 10,
  },
  summaryAccent: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  summaryLabel: {
    color: colors.mutedText,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
    maxWidth: 160,
  },
  breakdownBlock: {
    gap: 10,
  },
  breakdownTitle: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  categoryRow: {
    gap: 6,
  },
  categoryTopLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  categoryName: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  categoryAmount: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  categoryTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  categoryFill: {
    borderRadius: 999,
    height: '100%',
  },
  yearTable: {
    gap: 4,
  },
  yearRow: {
    alignItems: 'center',
    borderBottomColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 42,
  },
  yearMonth: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'capitalize',
    width: 42,
  },
  yearValues: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  yearValue: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    minHeight: 84,
    justifyContent: 'center',
    padding: 14,
  },
  emptyStateCompact: {
    minHeight: 48,
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'android' ? 14 : 8,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    gap: 4,
    height: 56,
    justifyContent: 'center',
  },
  navButtonActive: {
    backgroundColor: colors.charcoal,
  },
  navLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  navLabelActive: {
    color: colors.surface,
  },
  modalOverlay: {
    backgroundColor: 'rgba(24, 32, 27, 0.36)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  editor: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    gap: 13,
    maxHeight: '92%',
    padding: 18,
  },
  editorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editorTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    height: 42,
    justifyContent: 'center',
  },
  typeOptionText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  inputGroup: {
    gap: 7,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
    gap: 7,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    height: 46,
    letterSpacing: 0,
    paddingHorizontal: 12,
  },
  noteInput: {
    height: 78,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  amountPreview: {
    color: colors.saving,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: -5,
  },
  categoryScroller: {
    marginHorizontal: -18,
    paddingHorizontal: 18,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
    marginTop: 2,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
