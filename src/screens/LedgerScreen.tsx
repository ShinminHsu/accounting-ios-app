import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, FlatList, Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import {
  fetchTransactionsForMonth, deleteTransaction,
  groupByDate, TransactionWithRefs,
} from '../lib/transactions';
import { EditTransactionSheet } from './transactions/EditTransactionSheet';
import { CategoryIcon } from '../components/CategoryIcon';
import { LedgerStackParamList } from '../navigation/LedgerStackNavigator';
import { colors, typography, spacing, radius } from '../theme';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const PAYER_LABELS: Record<string, string> = {
  self: '',
  paid_by_other: '別人付',
  paid_for_other: '代付',
};

type NavProp = NativeStackNavigationProp<LedgerStackParamList>;

export function LedgerScreen() {
  const navigation = useNavigation<NavProp>();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [transactions, setTransactions] = useState<TransactionWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<TransactionWithRefs | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarAnim = useRef(new Animated.Value(0)).current;

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

  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedDate(now.toISOString().slice(0, 10));
  }

  function toggleCalendar() {
    const toValue = showCalendar ? 0 : 1;
    setShowCalendar(!showCalendar);
    Animated.timing(calendarAnim, {
      toValue,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
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

  // ── List helpers ──────────────────────────────────────────────────────────

  const uniqueCategories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of transactions) {
      if (t.category_id && t.category_name) seen.set(t.category_id, t.category_name);
    }
    return Array.from(seen.entries());
  }, [transactions]);

  const filteredList = useMemo(() => {
    let list = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.created_at.localeCompare(a.created_at);
    });
    if (filterCategory) list = list.filter((t) => t.category_id === filterCategory);
    return list;
  }, [transactions, filterCategory]);

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

  const calendarMaxHeight = calendarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 480],
  });

  function renderListHeader() {
    return (
      <>
        {/* Animated calendar section */}
        <Animated.View style={[styles.calendarWrapper, { maxHeight: calendarMaxHeight, opacity: calendarAnim }]}>
          <View style={styles.calendarGrid}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={styles.weekdayHeader}>{d}</Text>
            ))}
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
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
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
        </Animated.View>

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
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={toggleCalendar} style={styles.calendarToggle}>
          <Text style={styles.calendarToggleText}>{showCalendar ? '隱藏月曆' : '顯示月曆'}</Text>
        </TouchableOpacity>

        <View style={styles.monthNavCenter}>
          <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{year} 年 {month} 月</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthNavRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('TransactionSearch')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.todayBtn} onPress={goToday}>
            <Text style={styles.todayBtnText}>今天</Text>
          </TouchableOpacity>
        </View>
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

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Text style={styles.emptyText}>本月無記錄</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TransactionRow
              txn={item}
              showDate
              onEdit={() => setEditTarget(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
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
  const swipeRef = useRef<Swipeable>(null);

  function renderRightActions() {
    return (
      <TouchableOpacity
        style={rowStyles.deleteAction}
        onPress={() => {
          swipeRef.current?.close();
          onDelete();
        }}
      >
        <Text style={rowStyles.deleteActionText}>刪除</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false} rightThreshold={40}>
      <TouchableOpacity style={rowStyles.row} onPress={onEdit} activeOpacity={0.7}>
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
    </Swipeable>
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
  deleteAction: {
    backgroundColor: colors.expense, justifyContent: 'center', alignItems: 'center',
    width: 80, marginBottom: 2, borderRadius: radius.md,
  },
  deleteActionText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Month nav — 3-column layout
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  calendarToggle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  calendarToggleText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  monthNavCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { padding: spacing.xs },
  navArrowText: { fontSize: typography.sizes.xl, color: colors.primary },
  monthLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginHorizontal: spacing.sm,
  },
  monthNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  todayBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  todayBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  summaryValue: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },

  // Calendar
  calendarWrapper: {
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  weekdayHeader: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
  },
  dayCell: { width: '14.285%', minHeight: 52, alignItems: 'center', paddingVertical: spacing.xs, borderRadius: radius.sm },
  dayCellSelected: { backgroundColor: colors.primary + '18' },
  dayNum: { fontSize: typography.sizes.sm, color: colors.text },
  dayNumToday: { color: colors.primary, fontWeight: typography.weights.bold },
  dayNumSelected: { color: colors.primary, fontWeight: typography.weights.bold },
  dayTotal: { fontSize: 10, color: colors.expense, marginTop: 2 },
  dayTotalSelected: { color: colors.primary },
  dayDetail: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  dayDetailTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  // Filter chips
  filterScroll: { maxHeight: 40, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: typography.sizes.xs, color: colors.text },
  filterChipTextActive: { color: colors.white, fontWeight: typography.weights.semibold },

  // List
  listContent: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xxl },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
