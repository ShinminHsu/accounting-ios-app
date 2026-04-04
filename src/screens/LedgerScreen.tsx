import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import {
  fetchTransactionsForMonth, deleteTransaction,
  groupByDate, TransactionWithRefs,
} from '../lib/transactions';
import { EditTransactionSheet } from './transactions/EditTransactionSheet';
import { CategoryIcon } from '../components/CategoryIcon';
import { colors, typography, spacing, radius } from '../theme';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const PAYER_LABELS: Record<string, string> = {
  self: '',
  paid_by_other: '別人付',
  paid_for_other: '代付',
};

export function LedgerScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [transactions, setTransactions] = useState<TransactionWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<TransactionWithRefs | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const txns = await fetchTransactionsForMonth(session.user.id, year, month);
    setTransactions(txns);
    setLoading(false);
  }, [year, month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const dailyData = useMemo(() => groupByDate(transactions), [transactions]);

  // ── Calendar helpers ──────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return;
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  function dateKey(day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // ── Selected day transactions ─────────────────────────────────────────────

  const selectedDayItems: TransactionWithRefs[] = selectedDate
    ? (dailyData[selectedDate]?.items ?? [])
    : [];

  // ── List view ─────────────────────────────────────────────────────────────

  const uniqueCategories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of transactions) {
      if (t.category_id && t.category_name) seen.set(t.category_id, t.category_name);
    }
    return Array.from(seen.entries()); // [id, name][]
  }, [transactions]);

  const filteredList = useMemo(() => {
    let list = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.created_at.localeCompare(b.created_at);
    });
    if (filterCategory) list = list.filter((t) => t.category_id === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.notes ?? '').toLowerCase().includes(q) ||
          (t.category_name ?? '').toLowerCase().includes(q) ||
          (t.account_name ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filterCategory, searchQuery]);

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(txn: TransactionWithRefs) {
    Alert.alert('刪除記錄', '確定刪除此記錄？相關債務記錄也會一併刪除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除', style: 'destructive',
        onPress: async () => {
          const { error } = await deleteTransaction(txn.id);
          if (error) Alert.alert('失敗', error);
          else load();
        },
      },
    ]);
  }

  // ── Month totals ──────────────────────────────────────────────────────────

  const monthlyExpense = useMemo(
    () => transactions
      .filter((t) => !t.is_income && t.payer_type !== 'paid_for_other')
      .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const monthlyIncome = useMemo(
    () => transactions.filter((t) => t.is_income).reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{year} 年 {month} 月</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.todayBtn}
          onPress={() => {
            const now = new Date();
            setYear(now.getFullYear());
            setMonth(now.getMonth() + 1);
            setSelectedDate(now.toISOString().slice(0, 10));
          }}
        >
          <Text style={styles.todayBtnText}>今天</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>支出</Text>
          <Text style={[styles.summaryValue, { color: colors.expense }]}>
            {monthlyExpense.toLocaleString('zh-TW')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>收入</Text>
          <Text style={[styles.summaryValue, { color: colors.income }]}>
            {monthlyIncome.toLocaleString('zh-TW')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>結餘</Text>
          <Text style={styles.summaryValue}>
            {(monthlyIncome - monthlyExpense).toLocaleString('zh-TW')}
          </Text>
        </View>
      </View>

      {/* View toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'calendar' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'calendar' && styles.viewToggleTextActive]}>
            月曆
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
            清單
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : viewMode === 'calendar' ? (
        <ScrollView>
          {/* Weekday headers */}
          <View style={styles.calendarGrid}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={styles.weekdayHeader}>{d}</Text>
            ))}
            {/* Day cells */}
            {calendarDays.map((day, i) => {
              if (day === null) return <View key={`empty-${i}`} style={styles.dayCell} />;
              const key = dateKey(day);
              const dayData = dailyData[key];
              const isToday =
                year === today.getFullYear() &&
                month === today.getMonth() + 1 &&
                day === today.getDate();
              const isSelected = selectedDate === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => setSelectedDate(isSelected ? null : key)}
                >
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday, isSelected && styles.dayNumSelected]}>
                    {day}
                  </Text>
                  {dayData && dayData.total > 0 && (
                    <Text style={[styles.dayTotal, isSelected && styles.dayTotalSelected]} numberOfLines={1}>
                      {dayData.total >= 1000
                        ? `${(dayData.total / 1000).toFixed(1)}k`
                        : dayData.total}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected day detail */}
          {selectedDate && (
            <View style={styles.dayDetail}>
              <Text style={styles.dayDetailTitle}>
                {new Date(selectedDate).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
              </Text>
              {selectedDayItems.length === 0 ? (
                <Text style={styles.emptyText}>當日無記錄</Text>
              ) : (
                selectedDayItems.map((t) => (
                  <TransactionRow
                    key={t.id}
                    txn={t}
                    onEdit={() => setEditTarget(t)}
                    onDelete={() => handleDelete(t)}
                  />
                ))
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        /* List view */
        <View style={styles.listContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="搜尋備註、分類、帳戶..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {/* Category filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
              onPress={() => setFilterCategory(null)}
            >
              <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>全部</Text>
            </TouchableOpacity>
            {uniqueCategories.map(([id, name]) => (
              <TouchableOpacity
                key={id}
                style={[styles.filterChip, filterCategory === id && styles.filterChipActive]}
                onPress={() => setFilterCategory(filterCategory === id ? null : id)}
              >
                <Text style={[styles.filterChipText, filterCategory === id && styles.filterChipTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredList.length === 0 ? (
            <View style={styles.center}><Text style={styles.emptyText}>無符合記錄</Text></View>
          ) : (
            <FlatList
              data={filteredList}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <TransactionRow
                  txn={item}
                  showDate
                  onEdit={() => setEditTarget(item)}
                  onDelete={() => handleDelete(item)}
                />
              )}
              contentContainerStyle={{ paddingBottom: spacing.xxl }}
            />
          )}
        </View>
      )}

      <EditTransactionSheet
        visible={!!editTarget}
        transaction={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); }}
      />
    </SafeAreaView>
  );
}

// ── Transaction row ────────────────────────────────────────────────────────

function TransactionRow({
  txn, showDate = false, onEdit, onDelete,
}: {
  txn: TransactionWithRefs;
  showDate?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const amountColor = txn.is_income ? colors.income : colors.expense;
  const sign = txn.is_income ? '+' : '-';
  const payerTag = PAYER_LABELS[txn.payer_type];

  return (
    <TouchableOpacity style={rowStyles.row} onPress={onEdit} onLongPress={onDelete} activeOpacity={0.7}>
      <CategoryIcon
        iconKey={txn.category_emoji}
        size={16}
        color={colors.primary}
        bgColor={colors.primary + '14'}
        containerSize={36}
      />
      <View style={rowStyles.info}>
        <Text style={rowStyles.category} numberOfLines={1}>
          {txn.name ?? txn.category_name ?? '未分類'}
          {payerTag ? <Text style={rowStyles.payerTag}> · {payerTag}</Text> : null}
        </Text>
        {(txn.name || txn.notes || txn.account_name) ? (
          <Text style={rowStyles.sub} numberOfLines={1}>
            {[txn.name ? txn.category_name : null, txn.account_name, txn.notes].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {showDate && <Text style={rowStyles.date}>{txn.date}</Text>}
      </View>
      <Text style={[rowStyles.amount, { color: amountColor }]}>
        {sign} {txn.amount.toLocaleString('zh-TW')}
      </Text>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: 2 },
  info: { flex: 1, marginRight: spacing.sm, marginLeft: spacing.sm },
  category: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text },
  payerTag: { fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: typography.weights.regular },
  sub: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  date: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  amount: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  navArrow: { padding: spacing.sm },
  navArrowText: { fontSize: typography.sizes.xl, color: colors.primary },
  monthLabel: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text, marginHorizontal: spacing.lg },
  todayBtn: { position: 'absolute', right: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary },
  todayBtnText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.semibold },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  summaryValue: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  viewToggle: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, margin: spacing.sm, borderRadius: radius.md, padding: 3 },
  viewToggleBtn: { flex: 1, paddingVertical: spacing.xs, borderRadius: radius.sm, alignItems: 'center' },
  viewToggleBtnActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  viewToggleText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  viewToggleTextActive: { color: colors.text, fontWeight: typography.weights.semibold },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xs },
  weekdayHeader: { width: '14.285%', textAlign: 'center', fontSize: typography.sizes.xs, color: colors.textSecondary, paddingVertical: spacing.xs },
  dayCell: { width: '14.285%', minHeight: 52, alignItems: 'center', paddingVertical: spacing.xs, borderRadius: radius.sm },
  dayCellSelected: { backgroundColor: colors.primary + '18' },
  dayNum: { fontSize: typography.sizes.sm, color: colors.text },
  dayNumToday: { color: colors.primary, fontWeight: typography.weights.bold },
  dayNumSelected: { color: colors.primary, fontWeight: typography.weights.bold },
  dayTotal: { fontSize: 10, color: colors.expense, marginTop: 2 },
  dayTotalSelected: { color: colors.primary },
  dayDetail: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight },
  dayDetailTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  listContainer: { flex: 1, paddingHorizontal: spacing.sm },
  searchInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.sizes.sm, color: colors.text, backgroundColor: colors.surface, marginVertical: spacing.sm },
  filterScroll: { maxHeight: 40, marginBottom: spacing.xs },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginRight: spacing.xs },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: typography.sizes.xs, color: colors.text },
  filterChipTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
});
