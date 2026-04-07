import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, FlatList, Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../navigation/MoreStackNavigator';
import { supabase } from '../../lib/supabase';
import {
  fetchTransactionsForMonth, deleteTransaction,
  groupByDate, TransactionWithRefs, createTransaction,
} from '../../lib/transactions';
import { fetchLedgerMembers } from '../../lib/ledgers';
import { getDb } from '../../lib/db';
import { EditTransactionSheet } from '../transactions/EditTransactionSheet';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Ledger, LedgerMember } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const PAYER_LABELS: Record<string, string> = {
  self: '',
  paid_by_other: '別人付',
  paid_for_other: '代付',
};

type PaidForPrompt = {
  sharedTxnId: string;
  payerName: string;
  amount: number;
  date: string;
  categoryName: string | null;
  notes: string | null;
};

type Props = {
  ledger: Ledger;
};

type NavProp = NativeStackNavigationProp<MoreStackParamList>;

export function LedgerDetailScreen({ ledger }: Props) {
  const navigation = useNavigation<NavProp>();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [transactions, setTransactions] = useState<TransactionWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<TransactionWithRefs | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'members'>('transactions');
  const [members, setMembers] = useState<LedgerMember[]>([]);
  const [paidForPrompts, setPaidForPrompts] = useState<PaidForPrompt[]>([]);
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<string>>(new Set());
  const calendarAnim = useRef(new Animated.Value(0)).current;

  const ledgerParam = ledger.is_personal ? undefined : ledger.id;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const txns = await fetchTransactionsForMonth(session.user.id, year, month, ledgerParam);
    setTransactions(txns);

    if (!ledger.is_personal) {
      const m = await fetchLedgerMembers(ledger.id);
      setMembers(m);
      await loadPaidForPrompts(session.user.id, m);
    }
    setLoading(false);
  }, [year, month]);

  async function loadPaidForPrompts(userId: string, currentMembers: LedgerMember[]) {
    const memberUserIds = currentMembers
      .map((m) => m.user_id)
      .filter((id) => id !== userId);
    if (memberUserIds.length === 0) return;

    const { data: sharedTxns } = await supabase
      .from('shared_transactions')
      .select('*')
      .eq('payee_id', userId)
      .in('payer_id', memberUserIds);

    if (!sharedTxns || sharedTxns.length === 0) return;

    const db = await getDb();
    const prompts: PaidForPrompt[] = [];

    for (const st of sharedTxns) {
      const existing = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM transactions WHERE user_id = ? AND payer_type = 'paid_by_other' AND amount = ? AND date = ? AND ledger_id IS NULL",
        [userId, st.amount, st.date]
      );
      if (existing) continue;

      const { data: contact } = await supabase
        .from('contacts')
        .select('name')
        .eq('user_id', userId)
        .eq('linked_user_id', st.payer_id)
        .maybeSingle();

      prompts.push({
        sharedTxnId: st.id,
        payerName: contact?.name ?? '好友',
        amount: st.amount,
        date: st.date,
        categoryName: st.category_name,
        notes: st.notes,
      });
    }
    setPaidForPrompts(prompts);
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const dailyData = useMemo(() => groupByDate(transactions), [transactions]);

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

  function toggleCalendar() {
    const toValue = showCalendar ? 0 : 1;
    setShowCalendar(!showCalendar);
    Animated.timing(calendarAnim, { toValue, duration: 220, useNativeDriver: false }).start();
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

  const selectedDayItems: TransactionWithRefs[] = selectedDate
    ? (dailyData[selectedDate]?.items ?? [])
    : [];

  const monthlyExpense = useMemo(
    () => transactions.filter((t) => !t.is_income && t.payer_type !== 'paid_for_other').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const monthlyIncome = useMemo(
    () => transactions.filter((t) => t.is_income).reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  function handleDelete(txn: TransactionWithRefs) {
    Alert.alert('刪除記錄', '確定刪除此記錄？', [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: async () => { await deleteTransaction(txn.id); load(); } },
    ]);
  }

  async function handleJoinPersonalLedger(prompt: PaidForPrompt) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await createTransaction(session.user.id, {
      amount: prompt.amount,
      date: prompt.date,
      name: null,
      categoryId: null,
      accountId: null,
      projectId: null,
      ledgerId: null,
      notes: prompt.notes ?? prompt.categoryName ?? `${prompt.payerName} 代付`,
      payerType: 'paid_by_other',
      contactId: null,
      payerName: prompt.payerName,
      isIncome: false,
    });
    if (error) { Alert.alert('失敗', error); return; }
    setDismissedPrompts((prev) => new Set([...prev, prompt.sharedTxnId]));
  }

  const calendarMaxHeight = calendarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 480] });

  // ── Per-member spending for 成員 tab ────────────────────────────────────────
  const memberSpending = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (!t.is_income && t.payer_type !== 'paid_for_other') {
        map[t.user_id] = (map[t.user_id] ?? 0) + t.amount;
      }
    }
    return map;
  }, [transactions]);

  const visiblePrompts = paidForPrompts.filter((p) => !dismissedPrompts.has(p.sharedTxnId));

  function renderListHeader() {
    return (
      <>
        {/* 代付提示 cards */}
        {visiblePrompts.map((p) => (
          <View key={p.sharedTxnId} style={styles.promptCard}>
            <Text style={styles.promptText}>
              {p.payerName} 幫你支付了 NT${p.amount.toLocaleString('zh-TW')}，要加入個人帳本嗎？
            </Text>
            <View style={styles.promptActions}>
              <TouchableOpacity
                style={styles.promptJoinBtn}
                onPress={() => handleJoinPersonalLedger(p)}
              >
                <Text style={styles.promptJoinText}>加入</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDismissedPrompts((prev) => new Set([...prev, p.sharedTxnId]))}
              >
                <Text style={styles.promptDismissText}>略過</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Calendar */}
        <Animated.View style={[styles.calendarWrapper, { maxHeight: calendarMaxHeight, opacity: calendarAnim }]}>
          <View style={styles.calendarGrid}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={styles.weekdayHeader}>{d}</Text>
            ))}
            {calendarDays.map((day, i) => {
              if (day === null) return <View key={`empty-${i}`} style={styles.dayCell} />;
              const key = dateKey(day);
              const dayData = dailyData[key];
              const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();
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
                      {dayData.total >= 1000 ? `${(dayData.total / 1000).toFixed(1)}k` : dayData.total}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedDate && (
            <View style={styles.dayDetail}>
              <Text style={styles.dayDetailTitle}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
              </Text>
              {selectedDayItems.length === 0
                ? <Text style={styles.emptyText}>當日無記錄</Text>
                : selectedDayItems.map((t) => (
                    <TransactionRow key={t.id} txn={t} onEdit={() => setEditTarget(t)} onDelete={() => handleDelete(t)} />
                  ))}
            </View>
          )}
        </Animated.View>
      </>
    );
  }

  function renderMembersTab() {
    return (
      <ScrollView contentContainerStyle={styles.membersContent}>
        <TouchableOpacity
          style={styles.manageMembersBtn}
          onPress={() => navigation.navigate('LedgerMembersScreen', { ledger })}
        >
          <Text style={styles.manageMembersBtnText}>管理成員 →</Text>
        </TouchableOpacity>
        <Text style={styles.membersNote}>本月支出（僅含本裝置資料）</Text>
        {members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{m.user_id.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.memberUserId} numberOfLines={1}>{m.user_id}</Text>
            <Text style={styles.memberAmount}>
              NT$ {(memberSpending[m.user_id] ?? 0).toLocaleString('zh-TW')}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.calendarToggle} onPress={toggleCalendar}>
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
        <View style={{ width: 60 }} />
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>支出</Text>
          <Text style={[styles.summaryValue, { color: colors.expense }]}>{monthlyExpense.toLocaleString('zh-TW')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>收入</Text>
          <Text style={[styles.summaryValue, { color: colors.income }]}>{monthlyIncome.toLocaleString('zh-TW')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>結餘</Text>
          <Text style={styles.summaryValue}>{(monthlyIncome - monthlyExpense).toLocaleString('zh-TW')}</Text>
        </View>
      </View>

      {/* Tab bar (shared ledgers only) */}
      {!ledger.is_personal && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
            onPress={() => setActiveTab('transactions')}
          >
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>交易</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>成員</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : activeTab === 'members' ? (
        renderMembersTab()
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Text style={styles.emptyText}>本月無記錄</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TransactionRow txn={item} showDate onEdit={() => setEditTarget(item)} onDelete={() => handleDelete(item)} />
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

function TransactionRow({
  txn, showDate = false, onEdit, onDelete,
}: {
  txn: TransactionWithRefs;
  showDate?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const amountColor = txn.is_income ? colors.income : colors.expense;
  const sign = txn.is_income ? '+' : '-';
  const payerTag = PAYER_LABELS[txn.payer_type];

  const renderRightActions = () => (
    <TouchableOpacity
      style={rowStyles.deleteAction}
      onPress={() => { swipeRef.current?.close(); onDelete(); }}
    >
      <Text style={rowStyles.deleteActionText}>刪除</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity style={rowStyles.row} onPress={onEdit} activeOpacity={0.7}>
        <CategoryIcon iconKey={txn.category_emoji} size={16} color={colors.primary} bgColor={colors.primary + '14'} containerSize={36} />
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
        <Text style={[rowStyles.amount, { color: amountColor }]}>{sign} {txn.amount.toLocaleString('zh-TW')}</Text>
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
  monthNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  calendarToggle: { paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderLight },
  calendarToggleText: { fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: typography.weights.medium },
  monthNavCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  navArrow: { padding: spacing.xs },
  navArrowText: { fontSize: typography.sizes.xl, color: colors.primary },
  monthLabel: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text, marginHorizontal: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  summaryValue: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: typography.weights.semibold },
  calendarWrapper: { overflow: 'hidden', backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xs, paddingTop: spacing.xs },
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
  listContent: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xxl },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  promptCard: {
    margin: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  promptText: { fontSize: typography.sizes.sm, color: colors.text },
  promptActions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.md },
  promptJoinBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  promptJoinText: { fontSize: typography.sizes.sm, color: colors.white, fontWeight: typography.weights.semibold },
  promptDismissText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  membersContent: { padding: spacing.md },
  manageMembersBtn: { alignSelf: 'flex-end', marginBottom: spacing.md },
  manageMembersBtnText: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: typography.weights.semibold },
  membersNote: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  memberAvatarText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.primary },
  memberUserId: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  memberAmount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.expense },
});
