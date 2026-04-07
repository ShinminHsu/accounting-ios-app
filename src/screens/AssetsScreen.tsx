import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Eye, EyeOff, ChevronDown, ChevronRight, TrendingUp, Plus, RefreshCw } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import {
  fetchAccounts, fetchExchangeRates, convertToTWD, AccountWithBalance, ACCOUNT_TYPE_LABELS,
} from '../lib/accounts';
import { EditAccountModal } from './accounts/EditAccountModal';
import { fetchOutstandingTotals } from '../lib/debts';
import { AccountType } from '../types/database';
import { colors, typography, spacing, radius, shadows } from '../theme';

const ASSET_TYPES: AccountType[] = ['cash', 'bank', 'e_payment', 'investment'];
const CREDIT_TYPES: AccountType[] = ['credit_card'];

const GROUP_LABELS: Partial<Record<AccountType, string>> = {
  cash: '現金帳戶',
  bank: '銀行帳戶',
  e_payment: '電子支付',
  investment: '投資帳戶',
  credit_card: '信用帳戶',
};

function fmtAmount(amount: number, hidden: boolean): string {
  if (hidden) return '****';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${abs.toLocaleString()}`;
}

export function AssetsScreen() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [lent, setLent] = useState(0);
  const [borrowed, setBorrowed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [editTarget, setEditTarget] = useState<AccountWithBalance | null>(null);

  // Which account type groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['cash', 'bank', 'e_payment', 'investment', 'credit_card'])
  );

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const [accs, r, totals] = await Promise.all([
      fetchAccounts(session.user.id),
      fetchExchangeRates(session.user.id),
      fetchOutstandingTotals(session.user.id),
    ]);
    setAccounts(accs);
    setRates(r);
    setLent(totals.lent);
    setBorrowed(totals.borrowed);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Compute figures
  let netWorth: number | null = 0;
  let disposable = 0;
  let creditDebt = 0;
  for (const acc of accounts) {
    const twd = convertToTWD(acc.balance, acc.currency, rates);
    if (twd === null) { netWorth = null; }
    if (ASSET_TYPES.includes(acc.type)) {
      if (twd !== null && netWorth !== null) { netWorth += twd; disposable += twd; }
    } else {
      if (twd !== null && netWorth !== null) { netWorth -= twd; creditDebt += twd; }
    }
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // Group accounts by type
  const groups: { key: AccountType; label: string; accounts: AccountWithBalance[] }[] = [];
  const typeOrder: AccountType[] = ['cash', 'bank', 'e_payment', 'investment', 'credit_card'];
  for (const type of typeOrder) {
    const members = accounts.filter((a) => a.type === type);
    if (members.length > 0) {
      groups.push({ key: type, label: GROUP_LABELS[type] ?? ACCOUNT_TYPE_LABELS[type], accounts: members });
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const netColor = netWorth === null ? colors.text : netWorth >= 0 ? colors.income : colors.expense;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Net asset header ── */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>資產</Text>
          <View style={styles.netRow}>
            <Text style={[styles.netAmount, { color: hidden ? colors.textSecondary : netColor }]}>
              {netWorth === null ? '匯率未設定' : fmtAmount(netWorth, hidden)}
            </Text>
            <TouchableOpacity
              onPress={() => setHidden((h) => !h)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {hidden
                ? <EyeOff size={20} color={colors.textSecondary} />
                : <Eye size={20} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.netLabel}>淨資產</Text>
        </View>

        {/* ── 2×2 summary grid ── */}
        <View style={[styles.gridCard, shadows.sm]}>
          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>可支配</Text>
              <Text style={[styles.gridValue, { color: colors.income }]}>
                {fmtAmount(disposable, hidden)}
              </Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellRight]}>
              <Text style={styles.gridLabel}>負債</Text>
              <Text style={[styles.gridValue, { color: colors.expense }]}>
                {fmtAmount(-creditDebt, hidden)}
              </Text>
            </View>
          </View>
          <View style={styles.gridDivider} />
          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>借出</Text>
              <Text style={[styles.gridValue, { color: colors.info }]}>
                {fmtAmount(lent, hidden)}
              </Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellRight]}>
              <Text style={styles.gridLabel}>借入</Text>
              <Text style={[styles.gridValue, { color: colors.info }]}>
                {fmtAmount(borrowed, hidden)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 淨資產趨勢 link ── */}
        <TouchableOpacity style={styles.trendLink}>
          <TrendingUp size={14} color={colors.primary} />
          <Text style={styles.trendText}>淨資產趨勢</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>

        {/* ── Grouped account list ── */}
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.key);
          const groupTotal = group.accounts.reduce((sum, a) => {
            const twd = convertToTWD(a.balance, a.currency, rates);
            return sum + (twd ?? 0);
          }, 0);
          const isCredit = CREDIT_TYPES.includes(group.key);

          return (
            <View key={group.key} style={styles.group}>
              {/* Group header */}
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(group.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.groupLabel}>{group.label}</Text>
                <Text style={[styles.groupTotal, { color: isCredit ? colors.expense : colors.income }]}>
                  {hidden ? '****' : `${isCredit ? '-' : ''}$${Math.abs(groupTotal).toLocaleString()}`}
                </Text>
                {isExpanded
                  ? <ChevronDown size={16} color={colors.textSecondary} />
                  : <ChevronRight size={16} color={colors.textSecondary} />}
              </TouchableOpacity>

              {/* Account rows */}
              {isExpanded && group.accounts.map((acc) => {
                const twd = convertToTWD(acc.balance, acc.currency, rates);
                const balanceStr = hidden ? '****' : (twd !== null
                  ? `$${Math.abs(twd).toLocaleString()}`
                  : `${acc.balance.toLocaleString()} ${acc.currency}`);
                const signColor = isCredit ? colors.expense : colors.text;

                return (
                  <TouchableOpacity key={acc.id} style={styles.accountRow} onPress={() => setEditTarget(acc)} activeOpacity={0.7}>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{acc.name}</Text>
                      {acc.type === 'credit_card' && !hidden && (
                        <Text style={styles.accountSub}>
                          額度已用 ${acc.balance.toLocaleString()}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.accountBalance, { color: signColor }]}>
                      {isCredit ? `-${balanceStr}` : balanceStr}
                    </Text>
                    <ChevronRight size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <EditAccountModal
        visible={!!editTarget}
        account={editTarget}
        bankAccounts={accounts.filter((a) => a.type === 'bank')}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  netAmount: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
  },
  netLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // 2×2 grid
  gridCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  gridCellRight: {
    borderLeftWidth: 1,
    borderLeftColor: colors.borderLight,
  },
  gridDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  gridLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  gridValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },

  // Trend link
  trendLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  trendText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    flex: 1,
  },

  // Groups
  group: {
    marginBottom: spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  groupLabel: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  groupTotal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginRight: spacing.xs,
  },

  // Account rows
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  accountInfo: { flex: 1 },
  accountName: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  accountSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
});
