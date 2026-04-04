import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import {
  fetchRewardRules, fetchRewardSummary, deleteRewardRule,
  markDepositReceived, fetchCreditCardByAccountId,
  RewardSummaryData, RuleSummary,
} from '../../lib/rewards';
import { fetchAccounts } from '../../lib/accounts';
import { CreateRewardRuleModal } from './CreateRewardRuleModal';
import { ReconciliationScreen } from './ReconciliationScreen';
import { CreditCard, CreditCardRewardRule, RewardType } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  cashback_offset: '帳單折抵',
  points: '點數',
  account_deposit: '帳戶回饋',
};

type Tab = 'rules' | 'summary' | 'reconcile';

type Props = {
  accountId: string;
  accountName: string;
};

export function CreditCardDetailScreen({ accountId, accountName }: Props) {
  const [tab, setTab] = useState<Tab>('rules');
  const [creditCardId, setCreditCardId] = useState<string | null>(null);
  const [creditCard, setCreditCard] = useState<CreditCard | null>(null);
  const [rules, setRules] = useState<CreditCardRewardRule[]>([]);
  const [summary, setSummary] = useState<RewardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<CreditCardRewardRule | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [depositAccountName, setDepositAccountName] = useState<Record<string, string>>({});

  const yearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);

    const cc = await fetchCreditCardByAccountId(accountId);
    if (!cc) { setLoading(false); return; }
    setCreditCardId(cc.id);
    setCreditCard(cc);

    const [ruleList, sumData, accs] = await Promise.all([
      fetchRewardRules(cc.id),
      fetchRewardSummary(session.user.id, cc.id, yearMonth),
      fetchAccounts(session.user.id),
    ]);

    setRules(ruleList);
    setSummary(sumData);

    const nameMap: Record<string, string> = {};
    for (const acc of accs) nameMap[acc.id] = acc.name;
    setDepositAccountName(nameMap);

    setLoading(false);
  }, [accountId, yearMonth]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(rule: CreditCardRewardRule) {
    Alert.alert('刪除規則', `確定刪除此回饋規則？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除', style: 'destructive',
        onPress: async () => {
          const { error } = await deleteRewardRule(rule.id);
          if (error) Alert.alert('失敗', error);
          else load();
        },
      },
    ]);
  }

  async function handleMarkReceived(amount: number) {
    if (!userId || !creditCardId || !summary) return;

    // Find a deposit account from rules
    const depositRule = rules.find((r) => r.reward_type === 'account_deposit' && r.deposit_account_id);
    if (!depositRule?.deposit_account_id) {
      Alert.alert('錯誤', '找不到設定的入帳帳戶');
      return;
    }

    Alert.alert('標記為已入帳', `確定入帳 NT$ ${amount.toLocaleString('zh-TW')}？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '確定',
        onPress: async () => {
          const { error } = await markDepositReceived(
            userId, creditCardId, amount, depositRule.deposit_account_id!
          );
          if (error) Alert.alert('失敗', error);
          else load();
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!creditCardId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>此帳戶尚未設定信用卡資訊</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['rules', 'summary', 'reconcile'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'rules' ? '回饋規則' : t === 'summary' ? '本月摘要' : '對帳'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'rules' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>規則列表</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { setEditingRule(null); setShowCreate(true); }}
            >
              <Text style={styles.addBtnText}>＋ 新增</Text>
            </TouchableOpacity>
          </View>

          {rules.length === 0 ? (
            <Text style={styles.emptyText}>尚無回饋規則</Text>
          ) : (
            rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                depositAccountName={depositAccountName[rule.deposit_account_id ?? ''] ?? null}
                onEdit={() => { setEditingRule(rule); setShowCreate(true); }}
                onDelete={() => handleDelete(rule)}
              />
            ))
          )}
        </ScrollView>
      ) : tab === 'summary' ? (
        <SummaryView
          summary={summary}
          yearMonth={yearMonth}
          onMarkReceived={handleMarkReceived}
        />
      ) : (
        creditCard ? (
          <ReconciliationScreen creditCard={creditCard} accountId={accountId} />
        ) : null
      )}

      <CreateRewardRuleModal
        creditCardId={creditCardId}
        editingRule={editingRule}
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); load(); }}
      />
    </SafeAreaView>
  );
}

// ── Rule row ─────────────────────────────────────────────────────────────────

function RuleRow({
  rule, depositAccountName, onEdit, onDelete,
}: {
  rule: CreditCardRewardRule;
  depositAccountName: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const target = rule.rule_type === 'merchant'
    ? `🏪 ${rule.merchant_name}`
    : `🏷️ 分類`;

  return (
    <View style={styles.ruleCard}>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleTitle}>{target}</Text>
        <Text style={styles.ruleSub}>
          {REWARD_TYPE_LABELS[rule.reward_type]} · {rule.reward_rate}%
          {rule.monthly_cap != null ? ` · 上限 ${rule.monthly_cap}` : ''}
          {rule.min_spend_threshold != null ? ` · 門檻 ${rule.min_spend_threshold}` : ''}
        </Text>
        {rule.reward_type === 'points' && rule.points_conversion_rate != null && (
          <Text style={styles.ruleSub}>1 點 = NT$ {rule.points_conversion_rate}</Text>
        )}
        {rule.reward_type === 'account_deposit' && depositAccountName && (
          <Text style={styles.ruleSub}>入帳：{depositAccountName}</Text>
        )}
      </View>
      <View style={styles.ruleActions}>
        <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
          <Text style={styles.editText}>編輯</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
          <Text style={styles.deleteText}>刪除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Summary view ─────────────────────────────────────────────────────────────

function SummaryView({
  summary, yearMonth, onMarkReceived,
}: {
  summary: RewardSummaryData | null;
  yearMonth: string;
  onMarkReceived: (amount: number) => void;
}) {
  if (!summary) return null;

  const [year, month] = yearMonth.split('-');
  const title = `${year} 年 ${parseInt(month)} 月`;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.summaryPeriod}>{title} 回饋摘要</Text>

      {/* Totals */}
      <View style={styles.totalsRow}>
        {summary.cashbackTotal > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>帳單折抵</Text>
            <Text style={styles.totalValue}>NT$ {summary.cashbackTotal.toLocaleString('zh-TW')}</Text>
          </View>
        )}
        {summary.pointsTotal > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>點數</Text>
            <Text style={styles.totalValue}>{Math.floor(summary.pointsTotal).toLocaleString('zh-TW')} 點</Text>
          </View>
        )}
        {summary.pendingDeposit > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>待入帳回饋</Text>
            <Text style={styles.totalValue}>NT$ {summary.pendingDeposit.toLocaleString('zh-TW')}</Text>
            <TouchableOpacity
              style={styles.receiveBtn}
              onPress={() => onMarkReceived(summary.pendingDeposit)}
            >
              <Text style={styles.receiveBtnText}>標記已入帳</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Per-rule breakdown */}
      <Text style={styles.sectionTitle}>規則明細</Text>
      {summary.rules.length === 0 ? (
        <Text style={styles.emptyText}>尚無回饋記錄</Text>
      ) : (
        summary.rules.map((rs) => <RuleSummaryRow key={rs.rule.id} rs={rs} />)
      )}
    </ScrollView>
  );
}

function RuleSummaryRow({ rs }: { rs: RuleSummary }) {
  const target = rs.rule.rule_type === 'merchant'
    ? rs.rule.merchant_name
    : '分類回饋';

  const earnedLabel = rs.rule.reward_type === 'points'
    ? `${Math.floor(rs.earned)} 點`
    : `NT$ ${rs.earned.toLocaleString('zh-TW')}`;

  const ytdLabel = rs.rule.reward_type === 'points'
    ? `${Math.floor(rs.ytdEarned)} 點`
    : `NT$ ${rs.ytdEarned.toLocaleString('zh-TW')}`;

  return (
    <View style={styles.summaryRuleCard}>
      <View style={styles.summaryRuleHeader}>
        <Text style={styles.summaryRuleName}>{target}</Text>
        <Text style={styles.summaryRuleEarned}>{earnedLabel}</Text>
      </View>
      <Text style={styles.summaryRuleSub}>本年累計：{ytdLabel}</Text>
      {rs.capUtilization !== null && (
        <View style={styles.capBar}>
          <View style={[styles.capFill, { width: `${Math.round(rs.capUtilization * 100)}%` as any }]} />
        </View>
      )}
      {rs.capUtilization !== null && (
        <Text style={styles.capText}>
          上限使用 {Math.round(rs.capUtilization * 100)}%
          {rs.capUtilization >= 1 ? '（已達上限）' : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  tabBtn: {
    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: typography.weights.semibold },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold,
    color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  addBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.full,
  },
  addBtnText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  ruleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs,
  },
  ruleInfo: { flex: 1 },
  ruleTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text },
  ruleSub: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  ruleActions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  editText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.semibold },
  deleteText: { fontSize: typography.sizes.xs, color: colors.expense },
  summaryPeriod: {
    fontSize: typography.sizes.lg, fontWeight: typography.weights.bold,
    color: colors.text, marginBottom: spacing.md,
  },
  totalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  totalCard: {
    flex: 1, minWidth: 140, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md,
  },
  totalLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  totalValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.primary },
  receiveBtn: {
    marginTop: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.full, alignSelf: 'flex-start',
  },
  receiveBtnText: { fontSize: typography.sizes.xs, color: colors.white, fontWeight: typography.weights.semibold },
  summaryRuleCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.xs,
  },
  summaryRuleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  summaryRuleName: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text },
  summaryRuleEarned: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.primary },
  summaryRuleSub: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  capBar: { height: 4, backgroundColor: colors.borderLight, borderRadius: 2, marginBottom: 2 },
  capFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  capText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
});
