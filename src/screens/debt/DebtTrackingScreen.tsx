import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import {
  fetchDebtSummaryByContact, fetchDebtRecordsForContact,
  recordRepayment, toggleDisputeFlag,
  ContactDebtSummary, DebtRecordWithRefs,
} from '../../lib/debts';
import { fetchAccounts, AccountWithBalance } from '../../lib/accounts';
import { DebtRecord } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';

// ── Main screen ───────────────────────────────────────────────────────────────

export function DebtTrackingScreen() {
  const [summaries, setSummaries] = useState<ContactDebtSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactDebtSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);
    const data = await fetchDebtSummaryByContact(session.user.id);
    setSummaries(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {summaries.length === 0 ? (
            <Text style={styles.empty}>目前無未結清的債務記錄</Text>
          ) : (
            summaries.map((s) => (
              <TouchableOpacity
                key={s.contactId ?? `name:${s.contactName}`}
                style={styles.contactCard}
                onPress={() => setSelectedContact(s)}
                activeOpacity={0.7}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{s.contactName}</Text>
                  <Text style={styles.contactSub}>{s.outstandingCount} 筆未結清</Text>
                </View>
                <View style={styles.balanceCol}>
                  <Text style={[
                    styles.balanceText,
                    s.netBalance > 0 ? styles.positive : styles.negative,
                  ]}>
                    {s.netBalance > 0 ? '+' : ''}NT$ {Math.abs(s.netBalance).toLocaleString('zh-TW')}
                  </Text>
                  <Text style={styles.balanceLabel}>
                    {s.netBalance > 0 ? '對方欠我' : '我欠對方'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Contact detail sheet */}
      <Modal
        visible={selectedContact !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => { setSelectedContact(null); load(); }}>
              <Text style={styles.backText}>‹ 返回</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{selectedContact?.contactName}</Text>
            <View style={{ width: 48 }} />
          </View>
          {selectedContact && userId && (
            <ContactDebtSheet
              contactId={selectedContact.contactId}
              payerNameFilter={selectedContact.contactId ? undefined : selectedContact.contactName}
              userId={userId}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ── Contact debt detail sheet ─────────────────────────────────────────────────

function ContactDebtSheet({ contactId, payerNameFilter, userId }: { contactId: string | null; payerNameFilter?: string; userId: string }) {
  const [records, setRecords] = useState<DebtRecordWithRefs[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [repayTarget, setRepayTarget] = useState<DebtRecordWithRefs | null>(null);
  const [showRepay, setShowRepay] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [recs, accs] = await Promise.all([
      fetchDebtRecordsForContact(userId, contactId, payerNameFilter),
      fetchAccounts(userId),
    ]);
    setRecords(recs);
    setAccounts(accs);
    setLoading(false);
  }, [userId, contactId, payerNameFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleDisputeToggle(rec: DebtRecordWithRefs) {
    const isCurrentlyDisputed = rec.status === 'disputed';
    if (!isCurrentlyDisputed) {
      Alert.prompt('標記為爭議', '請輸入備註（選填）', async (note) => {
        const { error } = await toggleDisputeFlag(rec.id, true, note || null);
        if (error) Alert.alert('失敗', error);
        else load();
      });
    } else {
      Alert.alert('取消爭議標記', '確定取消此筆的爭議標記？', [
        { text: '取消', style: 'cancel' },
        {
          text: '確定', onPress: async () => {
            const { error } = await toggleDisputeFlag(rec.id, false, null);
            if (error) Alert.alert('失敗', error);
            else load();
          },
        },
      ]);
    }
  }

  const outstanding = records.filter((r) => r.status !== 'settled');
  const settled = records.filter((r) => r.status === 'settled');

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll}>
        {outstanding.length > 0 && (
          <>
            <Text style={styles.groupHeader}>未結清</Text>
            {outstanding.map((rec) => (
              <DebtRow
                key={rec.id}
                rec={rec}
                onRepay={() => { setRepayTarget(rec); setShowRepay(true); }}
                onDispute={() => handleDisputeToggle(rec)}
              />
            ))}
          </>
        )}
        {settled.length > 0 && (
          <>
            <Text style={[styles.groupHeader, { marginTop: spacing.lg }]}>已結清</Text>
            {settled.map((rec) => <DebtRow key={rec.id} rec={rec} />)}
          </>
        )}
        {records.length === 0 && (
          <Text style={styles.empty}>此聯絡人無債務記錄</Text>
        )}
      </ScrollView>

      <RepaymentModal
        visible={showRepay}
        debtRecord={repayTarget}
        accounts={accounts}
        onClose={() => { setShowRepay(false); setRepayTarget(null); }}
        onSaved={() => {
          setShowRepay(false);
          setRepayTarget(null);
          load();
        }}
        userId={userId}
      />
    </>
  );
}

// ── Debt record row ───────────────────────────────────────────────────────────

function DebtRow({
  rec, onRepay, onDispute,
}: {
  rec: DebtRecordWithRefs;
  onRepay?: () => void;
  onDispute?: () => void;
}) {
  const isSettled = rec.status === 'settled';
  const isDisputed = rec.status === 'disputed';
  const outstanding = rec.original_amount - rec.repaid_amount;
  const typeLabel = rec.type === 'liability' ? '我欠對方' : '對方欠我';
  const amtColor = rec.type === 'receivable' ? colors.income : colors.expense;

  return (
    <View style={[styles.debtRow, isSettled && styles.debtRowSettled]}>
      <View style={styles.debtInfo}>
        <View style={styles.debtTitleRow}>
          <Text style={styles.debtType}>{typeLabel}</Text>
          {isDisputed && <Text style={styles.disputeBadge}>⚠ 爭議</Text>}
          {isSettled && <Text style={styles.settledBadge}>已結清</Text>}
        </View>
        {rec.transaction_notes && (
          <Text style={styles.debtNotes}>{rec.transaction_notes}</Text>
        )}
        {rec.transaction_date && (
          <Text style={styles.debtDate}>{rec.transaction_date}</Text>
        )}
        {rec.repaid_amount > 0 && !isSettled && (
          <Text style={styles.debtDate}>已還 NT$ {rec.repaid_amount.toLocaleString('zh-TW')}</Text>
        )}
        {isDisputed && rec.dispute_note && (
          <Text style={styles.debtNotes}>爭議：{rec.dispute_note}</Text>
        )}
      </View>
      <View style={styles.debtRight}>
        <Text style={[styles.debtAmount, { color: amtColor }]}>
          NT$ {outstanding.toLocaleString('zh-TW')}
        </Text>
        {!isSettled && (
          <View style={styles.debtActions}>
            {onRepay && (
              <TouchableOpacity onPress={onRepay} style={styles.actionBtn}>
                <Text style={styles.repayText}>還款</Text>
              </TouchableOpacity>
            )}
            {onDispute && (
              <TouchableOpacity onPress={onDispute} style={styles.actionBtn}>
                <Text style={[styles.disputeText, isDisputed && { color: colors.textSecondary }]}>
                  {isDisputed ? '取消爭議' : '爭議'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Repayment modal ───────────────────────────────────────────────────────────

function RepaymentModal({
  visible, debtRecord, accounts, userId, onClose, onSaved,
}: {
  visible: boolean;
  debtRecord: DebtRecord | null;
  accounts: AccountWithBalance[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !debtRecord) return;
    const outstanding = debtRecord.original_amount - debtRecord.repaid_amount;
    setAmount(String(outstanding));
    if (accounts.length > 0) setSelectedAccountId(accounts[0].id);
  }, [visible, debtRecord, accounts]);

  async function handleSave() {
    if (!debtRecord) return;
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { Alert.alert('錯誤', '請輸入有效金額'); return; }
    if (!selectedAccountId) { Alert.alert('錯誤', '請選擇帳戶'); return; }

    setSaving(true);
    const { error } = await recordRepayment(
      userId, debtRecord as DebtRecord, parsed, date, selectedAccountId
    );
    setSaving(false);

    if (error) { Alert.alert('失敗', error); return; }
    onSaved();
  }

  if (!debtRecord) return null;
  const outstanding = debtRecord.original_amount - debtRecord.repaid_amount;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.backText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>記錄還款</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.saveText}>儲存</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.formInfo}>
            {debtRecord.type === 'liability' ? '我欠對方' : '對方欠我'} NT$ {outstanding.toLocaleString('zh-TW')}
          </Text>

          <Text style={styles.label}>還款金額</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>日期（YYYY-MM-DD）</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-04-01"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>帳戶</Text>
          <View style={styles.chipRow}>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.chip, selectedAccountId === acc.id && styles.chipActive]}
                onPress={() => setSelectedAccountId(acc.id)}
              >
                <Text style={[styles.chipText, selectedAccountId === acc.id && styles.chipTextActive]}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  empty: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  contactSub: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  balanceCol: { alignItems: 'flex-end', marginRight: spacing.sm },
  balanceText: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  positive: { color: colors.income },
  negative: { color: colors.expense },
  balanceLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: typography.sizes.lg, color: colors.textSecondary },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  sheetTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  backText: { fontSize: typography.sizes.md, color: colors.primary },
  saveText: { fontSize: typography.sizes.md, color: colors.primary, fontWeight: typography.weights.semibold },
  groupHeader: {
    fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold,
    color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  debtRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs,
  },
  debtRowSettled: { opacity: 0.55 },
  debtInfo: { flex: 1 },
  debtTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  debtType: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text },
  disputeBadge: { fontSize: typography.sizes.xs, color: colors.warning, fontWeight: typography.weights.semibold },
  settledBadge: { fontSize: typography.sizes.xs, color: colors.income },
  debtNotes: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  debtDate: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  debtRight: { alignItems: 'flex-end', minWidth: 90 },
  debtAmount: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  debtActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  actionBtn: { paddingHorizontal: spacing.xs },
  repayText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.semibold },
  disputeText: { fontSize: typography.sizes.xs, color: colors.warning },
  formScroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  formInfo: {
    fontSize: typography.sizes.sm, color: colors.textSecondary,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
    padding: spacing.sm, marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm, color: colors.textSecondary,
    marginBottom: spacing.xs, marginTop: spacing.md, fontWeight: typography.weights.medium,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: typography.sizes.md, color: colors.text, backgroundColor: colors.surface,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sizes.sm, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
});
