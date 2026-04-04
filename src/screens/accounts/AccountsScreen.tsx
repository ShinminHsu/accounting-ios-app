import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import {
  fetchAccounts, fetchExchangeRates, convertToTWD,
  deleteAccount, AccountWithBalance, ACCOUNT_TYPE_LABELS,
} from '../../lib/accounts';
import { AccountType } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';
import { AlertTriangle } from 'lucide-react-native';
import { CreateAccountModal } from './CreateAccountModal';
import { ExchangeRateModal } from './ExchangeRateModal';
import { CreditCardDetailScreen } from '../creditcards/CreditCardDetailScreen';

const ASSET_TYPES: AccountType[] = ['cash', 'bank', 'e_payment', 'investment'];
const LIABILITY_TYPES: AccountType[] = ['credit_card'];

export function AccountsScreen() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AccountWithBalance | null>(null);
  const [unreconciledByAccount, setUnreconciledByAccount] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const today = new Date().toISOString().slice(0, 10);
    const [accs, r, bills] = await Promise.all([
      fetchAccounts(session.user.id),
      fetchExchangeRates(session.user.id),
      supabase
        .from('credit_card_bills')
        .select('credit_card_id, credit_cards!inner(account_id)')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'reconciling'])
        .lte('billing_period_end', today),
    ]);
    setAccounts(accs);
    setRates(r);
    const byAccount: Record<string, number> = {};
    for (const b of bills.data ?? []) {
      const accountId = (b.credit_cards as any)?.account_id;
      if (accountId) byAccount[accountId] = (byAccount[accountId] ?? 0) + 1;
    }
    setUnreconciledByAccount(byAccount);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const assets = accounts.filter((a) => ASSET_TYPES.includes(a.type));
  const liabilities = accounts.filter((a) => LIABILITY_TYPES.includes(a.type));

  function netWorthTWD(): number | null {
    let total = 0;
    for (const acc of accounts) {
      const twd = convertToTWD(acc.balance, acc.currency, rates);
      if (twd === null) return null;
      total += ASSET_TYPES.includes(acc.type) ? twd : -twd;
    }
    return total;
  }

  const netWorth = netWorthTWD();

  async function handleDelete(acc: AccountWithBalance) {
    Alert.alert('刪除帳戶', `確定刪除「${acc.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除', style: 'destructive',
        onPress: async () => {
          const { error } = await deleteAccount(acc.id);
          if (error) Alert.alert('無法刪除', error);
          else load();
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>總資產淨值</Text>
          {netWorth !== null ? (
            <Text style={styles.netWorthValue}>
              NT$ {netWorth.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}
            </Text>
          ) : (
            <View>
              <Text style={styles.netWorthValue}>—</Text>
              <View style={styles.rateWarningRow}>
                <AlertTriangle size={13} color={colors.warning} />
                <Text style={styles.rateWarning}> 部分外幣匯率未設定</Text>
              </View>
            </View>
          )}
          <TouchableOpacity onPress={() => setShowRates(true)} style={styles.rateBtn}>
            <Text style={styles.rateBtnText}>設定匯率</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title="資產" />
        {assets.map((acc) => (
          <AccountRow
            key={acc.id}
            account={acc}
            rates={rates}
            onDelete={() => handleDelete(acc)}
          />
        ))}

        <SectionHeader title="負債" />
        {liabilities.map((acc) => (
          <AccountRow
            key={acc.id}
            account={acc}
            rates={rates}
            isLiability
            unreconciledCount={unreconciledByAccount[acc.id] ?? 0}
            onPress={acc.type === 'credit_card' ? () => setSelectedCard(acc) : undefined}
            onDelete={() => handleDelete(acc)}
          />
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>＋ 新增帳戶</Text>
        </TouchableOpacity>
      </ScrollView>

      <CreateAccountModal
        visible={showCreate}
        bankAccounts={assets.filter((a) => a.type === 'bank')}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
      <ExchangeRateModal
        visible={showRates}
        currentRates={rates}
        onClose={() => setShowRates(false)}
        onSaved={() => { setShowRates(false); load(); }}
      />

      <Modal visible={selectedCard !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={ccShell.container} edges={['top', 'bottom']}>
          <View style={ccShell.header}>
            <TouchableOpacity onPress={() => setSelectedCard(null)} style={ccShell.backBtn}>
              <Text style={ccShell.backText}>‹ 返回</Text>
            </TouchableOpacity>
            <Text style={ccShell.title}>{selectedCard?.name ?? ''}</Text>
            <View style={ccShell.backBtn} />
          </View>
          {selectedCard && (
            <CreditCardDetailScreen
              accountId={selectedCard.id}
              accountName={selectedCard.name}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function AccountRow({
  account, rates, isLiability = false, unreconciledCount = 0, onPress, onDelete,
}: {
  account: AccountWithBalance;
  rates: Record<string, number>;
  isLiability?: boolean;
  unreconciledCount?: number;
  onPress?: () => void;
  onDelete: () => void;
}) {
  const twd = convertToTWD(account.balance, account.currency, rates);
  const balanceColor = isLiability
    ? colors.expense
    : account.balance >= 0 ? colors.text : colors.expense;

  return (
    <TouchableOpacity
      style={styles.accountRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.accountInfo}>
        <View style={styles.accountNameRow}>
          <Text style={styles.accountName}>{account.name}</Text>
          {unreconciledCount > 0 && (
            <View style={styles.unreconciledBadge}>
              <Text style={styles.unreconciledBadgeText}>{unreconciledCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.accountType}>{ACCOUNT_TYPE_LABELS[account.type]}</Text>
      </View>
      <View style={styles.accountBalance}>
        <Text style={[styles.balanceText, { color: balanceColor }]}>
          {account.currency !== 'TWD' && `${account.currency} `}
          {account.balance.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}
        </Text>
        {account.currency !== 'TWD' && (
          twd !== null
            ? <Text style={styles.twdEquiv}>≈ NT$ {twd.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}</Text>
            : <View style={styles.rateWarningRow}><AlertTriangle size={12} color={colors.warning} /><Text style={styles.rateWarning}> 未設匯率</Text></View>
        )}
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>刪除</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md },
  netWorthCard: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg, alignItems: 'center',
  },
  netWorthLabel: { color: 'rgba(255,255,255,0.8)', fontSize: typography.sizes.sm, marginBottom: spacing.xs },
  netWorthValue: { color: colors.white, fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  rateWarningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  rateWarning: { color: 'rgba(255,255,255,0.7)', fontSize: typography.sizes.xs },
  rateBtn: { marginTop: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full },
  rateBtnText: { color: colors.white, fontSize: typography.sizes.xs },
  sectionHeader: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  accountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs },
  accountInfo: { flex: 1 },
  accountNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  accountName: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.text },
  unreconciledBadge: { backgroundColor: colors.expense, borderRadius: radius.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreconciledBadgeText: { color: colors.white, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  accountType: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  accountBalance: { alignItems: 'flex-end', marginRight: spacing.sm },
  balanceText: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  twdEquiv: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  deleteBtn: { paddingHorizontal: spacing.xs },
  deleteBtnText: { fontSize: typography.sizes.xs, color: colors.expense },
  addBtn: { borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  addBtnText: { color: colors.primary, fontSize: typography.sizes.md },
});

const ccShell = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  title: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  backBtn: { width: 64 },
  backText: { fontSize: typography.sizes.md, color: colors.primary },
});
