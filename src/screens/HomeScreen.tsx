import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { fetchAccounts, fetchExchangeRates, convertToTWD } from '../lib/accounts';
import { fetchSpendingSummary, computePeriodDates } from '../lib/reports';
import { colors, typography, spacing, radius } from '../theme';

type HomeData = {
  netWorth: number | null;
  currentMonthSpend: number;
  lastMonthSpend: number;
  unreconciledBillCount: number;
  outstandingDebtCount: number;
  overdueTemplateCount: number;
};

function addFrequency(d: Date, frequency: string): Date {
  const result = new Date(d);
  if (frequency === 'daily') result.setDate(result.getDate() + 1);
  else if (frequency === 'weekly') result.setDate(result.getDate() + 7);
  else if (frequency === 'monthly') result.setMonth(result.getMonth() + 1);
  else if (frequency === 'yearly') result.setFullYear(result.getFullYear() + 1);
  return result;
}

async function fetchHomeData(userId: string): Promise<HomeData> {
  const today = new Date().toISOString().slice(0, 10);

  const [accounts, rates] = await Promise.all([
    fetchAccounts(userId),
    fetchExchangeRates(userId),
  ]);

  let netWorth: number | null = 0;
  for (const acc of accounts) {
    const twd = convertToTWD(acc.balance, acc.currency, rates);
    if (twd === null) { netWorth = null; break; }
    if (acc.type === 'credit_card') (netWorth as number) -= twd;
    else (netWorth as number) += twd;
  }

  const { start: curStart, end: curEnd, prevStart, prevEnd } = computePeriodDates('this_month');
  const summary = await fetchSpendingSummary(userId, curStart, curEnd, prevStart, prevEnd);

  const [bills, debts, templates] = await Promise.all([
    supabase
      .from('credit_card_bills')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('status', 'reconciled'),
    supabase
      .from('debt_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'outstanding'),
    supabase
      .from('recurring_templates')
      .select('start_date, last_generated_date, frequency')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  let overdueCount = 0;
  for (const t of templates.data ?? []) {
    if (!t.last_generated_date && t.start_date <= today) {
      overdueCount++;
    } else if (t.last_generated_date) {
      const nextDue = addFrequency(new Date(t.last_generated_date), t.frequency);
      if (nextDue.toISOString().slice(0, 10) <= today) overdueCount++;
    }
  }

  return {
    netWorth,
    currentMonthSpend: summary.total,
    lastMonthSpend: summary.prevTotal,
    unreconciledBillCount: bills.count ?? 0,
    outstandingDebtCount: debts.count ?? 0,
    overdueTemplateCount: overdueCount,
  };
}

export function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const d = await fetchHomeData(session.user.id);
    setData(d);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = new Date();
  const monthLabel = today.toLocaleDateString('zh-TW', { month: 'long' });

  function fmtCurrency(n: number): string {
    return 'NT$ ' + Math.round(n).toLocaleString('zh-TW');
  }

  function spendDiff() {
    if (!data || data.lastMonthSpend === 0) return null;
    const pct = ((data.currentMonthSpend - data.lastMonthSpend) / data.lastMonthSpend) * 100;
    return { label: (pct >= 0 ? '↑ ' : '↓ ') + Math.abs(pct).toFixed(1) + '%', up: pct >= 0 };
  }

  const pendingTotal = data
    ? data.unreconciledBillCount + data.outstandingDebtCount + data.overdueTemplateCount
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>首頁</Text>
        <TouchableOpacity onPress={load}>
          <Text style={styles.refreshBtn}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Net worth */}
          <View style={styles.netWorthCard}>
            <Text style={styles.netWorthLabel}>總資產淨值</Text>
            <Text style={styles.netWorthAmount}>
              {data?.netWorth == null ? '—（缺少匯率）' : fmtCurrency(data.netWorth)}
            </Text>
          </View>

          {/* Monthly spending */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>{monthLabel}支出</Text>
            <View style={styles.spendRow}>
              <Text style={styles.spendAmount}>
                {data ? fmtCurrency(data.currentMonthSpend) : '—'}
              </Text>
              {spendDiff() && (
                <Text style={[styles.spendDiff, { color: spendDiff()!.up ? colors.expense : colors.income }]}>
                  {spendDiff()!.label} 較上月
                </Text>
              )}
            </View>
            <Text style={styles.spendCompareText}>
              上月：{data ? fmtCurrency(data.lastMonthSpend) : '—'}
            </Text>
          </View>

          {/* Pending items */}
          {pendingTotal > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>待處理項目</Text>
              {data!.unreconciledBillCount > 0 && (
                <View style={styles.pendingRow}>
                  <Text style={styles.pendingIcon}>💳</Text>
                  <Text style={styles.pendingText}>{data!.unreconciledBillCount} 張帳單待對帳</Text>
                  <View style={styles.badge}><Text style={styles.badgeText}>{data!.unreconciledBillCount}</Text></View>
                </View>
              )}
              {data!.outstandingDebtCount > 0 && (
                <View style={styles.pendingRow}>
                  <Text style={styles.pendingIcon}>🤝</Text>
                  <Text style={styles.pendingText}>{data!.outstandingDebtCount} 筆未結清帳款</Text>
                  <View style={styles.badge}><Text style={styles.badgeText}>{data!.outstandingDebtCount}</Text></View>
                </View>
              )}
              {data!.overdueTemplateCount > 0 && (
                <View style={styles.pendingRow}>
                  <Text style={styles.pendingIcon}>🔁</Text>
                  <Text style={styles.pendingText}>{data!.overdueTemplateCount} 筆定期記錄逾期</Text>
                  <View style={styles.badge}><Text style={styles.badgeText}>{data!.overdueTemplateCount}</Text></View>
                </View>
              )}
            </View>
          )}

          {pendingTotal === 0 && data && (
            <View style={styles.allClearCard}>
              <Text style={styles.allClearIcon}>✓</Text>
              <Text style={styles.allClearText}>無待處理項目</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  refreshBtn: { fontSize: typography.sizes.xl, color: colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, gap: spacing.md },
  netWorthCard: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center',
  },
  netWorthLabel: { fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.8)', fontWeight: typography.weights.medium },
  netWorthAmount: { fontSize: typography.sizes.xxxl, fontWeight: typography.weights.bold, color: colors.white, marginTop: spacing.xs },
  sectionCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight,
  },
  cardTitle: {
    fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold,
    color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  spendRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  spendAmount: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.expense },
  spendDiff: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  spendCompareText: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: spacing.xs },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  pendingIcon: { fontSize: typography.sizes.lg, marginRight: spacing.sm, width: 28 },
  pendingText: { flex: 1, fontSize: typography.sizes.md, color: colors.text },
  badge: {
    backgroundColor: colors.expense, borderRadius: radius.full,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  allClearCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight,
    flexDirection: 'row', justifyContent: 'center', gap: spacing.sm,
  },
  allClearIcon: { fontSize: typography.sizes.xl, color: colors.income },
  allClearText: { fontSize: typography.sizes.md, color: colors.textSecondary },
});
