import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import {
  fetchOrCreateCurrentBill, fetchTransactionsForBillingPeriod,
  parseBillWithGemini, fuzzyMatchLineItems,
  saveBillLineItems, confirmReconciliation,
  MatchedLineItem, ParsedLineItem, CreditCardBill,
} from '../../lib/reconciliation';
import { fetchRewardSummary } from '../../lib/rewards';
import { AddTransactionSheet } from '../transactions/AddTransactionSheet';
import { CreditCard } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';
import { Check } from 'lucide-react-native';

type Step = 'idle' | 'parsing' | 'review' | 'done';

type Props = {
  creditCard: CreditCard;
  accountId: string;
};

export function ReconciliationScreen({ creditCard, accountId }: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [bill, setBill] = useState<CreditCardBill | null>(null);
  const [matchedItems, setMatchedItems] = useState<MatchedLineItem[]>([]);
  const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set());
  const [totalAmount, setTotalAmount] = useState(0);
  const [cashbackOffset, setCashbackOffset] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefillItem, setPrefillItem] = useState<ParsedLineItem | null>(null);
  const [showAddTxn, setShowAddTxn] = useState(false);

  const yearMonth = new Date().toISOString().slice(0, 7);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);

    const currentBill = await fetchOrCreateCurrentBill(
      session.user.id, creditCard.id, creditCard.statement_closing_day
    );
    setBill(currentBill);
  }, [creditCard]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setStep('parsing');

    try {
      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const mimeType = asset.mimeType ?? 'application/pdf';
      const { items, error } = await parseBillWithGemini(base64, mimeType);

      if (error || items.length === 0) {
        Alert.alert('解析失敗', error ?? '未找到消費明細');
        setStep('idle');
        return;
      }

      await processLineItems(items);
    } catch (err) {
      Alert.alert('錯誤', String(err));
      setStep('idle');
    }
  }

  async function processLineItems(items: ParsedLineItem[]) {
    if (!bill) return;

    const transactions = await fetchTransactionsForBillingPeriod(
      accountId, bill.billing_period_start, bill.billing_period_end
    );

    const matched = fuzzyMatchLineItems(items, transactions);
    setMatchedItems(matched);

    // Pre-check matched items
    const initialChecked = new Set<number>();
    matched.forEach((m, i) => { if (m.isChecked) initialChecked.add(i); });
    setCheckedSet(initialChecked);

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    setTotalAmount(total);

    // Get cashback offset from rewards
    if (userId) {
      const summary = await fetchRewardSummary(userId, creditCard.id, yearMonth);
      setCashbackOffset(summary.cashbackTotal);
    }

    // Update bill status to reconciling
    await supabase
      .from('credit_card_bills')
      .update({ status: 'reconciling' })
      .eq('id', bill.id);

    setStep('review');
  }

  function toggleCheck(index: number) {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleAddMissing(item: ParsedLineItem) {
    setPrefillItem(item);
    setShowAddTxn(true);
  }

  async function handleConfirm() {
    if (!bill || !userId) return;

    const unchecked = matchedItems.filter((_, i) => !checkedSet.has(i));
    if (unchecked.length > 0) {
      Alert.alert(
        '仍有未勾選項目',
        `以下 ${unchecked.length} 筆尚未確認：\n` +
        unchecked.map((m) => `• ${m.lineItem.merchant} NT$ ${m.lineItem.amount}`).join('\n') +
        '\n\n確定要繼續完成對帳？',
        [
          { text: '返回檢查', style: 'cancel' },
          {
            text: '確定完成',
            onPress: () => doConfirm(),
          },
        ]
      );
    } else {
      doConfirm();
    }
  }

  async function doConfirm() {
    if (!bill || !userId) return;

    // Save line items
    const finalItems = matchedItems.map((m, i) => ({ ...m, isChecked: checkedSet.has(i) }));
    await saveBillLineItems(userId, bill.id, finalItems);

    const { error } = await confirmReconciliation(
      userId,
      bill.id,
      creditCard.id,
      totalAmount,
      cashbackOffset,
      creditCard.payment_due_day,
      creditCard.auto_debit_account_id
    );

    if (error) {
      Alert.alert('失敗', error);
      return;
    }

    setStep('done');
    load();
  }

  if (step === 'parsing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>正在解析帳單...</Text>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>✅</Text>
        <Text style={styles.doneTitle}>對帳完成</Text>
        <Text style={styles.doneSub}>
          帳單金額 NT$ {totalAmount.toLocaleString('zh-TW')}
          {cashbackOffset > 0 ? `\n折抵回饋 NT$ ${cashbackOffset.toLocaleString('zh-TW')}` : ''}
          {'\n實付 NT$ ' + Math.max(0, totalAmount - cashbackOffset).toLocaleString('zh-TW')}
        </Text>
      </View>
    );
  }

  if (step === 'review') {
    return (
      <>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>帳單總額</Text>
            <Text style={styles.summaryValue}>NT$ {totalAmount.toLocaleString('zh-TW')}</Text>
          </View>
          {cashbackOffset > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>折抵回饋</Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>
                - NT$ {cashbackOffset.toLocaleString('zh-TW')}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>實付金額</Text>
            <Text style={styles.summaryTotalValue}>
              NT$ {Math.max(0, totalAmount - cashbackOffset).toLocaleString('zh-TW')}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>消費明細（{matchedItems.length} 筆）</Text>

          {matchedItems.map((item, i) => (
            <LineItemRow
              key={i}
              item={item}
              isChecked={checkedSet.has(i)}
              onToggle={() => toggleCheck(i)}
              onAdd={() => handleAddMissing(item.lineItem)}
            />
          ))}

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>確認對帳完成</Text>
          </TouchableOpacity>
        </ScrollView>

        <AddTransactionSheet
          visible={showAddTxn}
          onClose={() => { setShowAddTxn(false); setPrefillItem(null); }}
          onSaved={() => {
            setShowAddTxn(false);
            setPrefillItem(null);
          }}
        />
      </>
    );
  }

  // idle state
  const statusLabel: Record<string, string> = {
    pending: '待對帳',
    reconciling: '對帳中',
    reconciled: '已對帳',
  };

  return (
    <View style={styles.idle}>
      <View style={styles.billStatusCard}>
        <Text style={styles.billStatusLabel}>帳單狀態</Text>
        <Text style={[
          styles.billStatusValue,
          bill?.status === 'reconciled' && { color: colors.income },
          bill?.status === 'reconciling' && { color: colors.warning },
        ]}>
          {statusLabel[bill?.status ?? 'pending'] ?? '待對帳'}
        </Text>
        {bill && (
          <Text style={styles.billPeriod}>
            {bill.billing_period_start} ~ {bill.billing_period_end}
          </Text>
        )}
      </View>

      {bill?.status !== 'reconciled' && (
        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
          <Text style={styles.uploadBtnText}>📄 上傳帳單（PDF / 圖片）</Text>
        </TouchableOpacity>
      )}

      {bill?.status === 'reconciled' && bill?.total_amount != null && (
        <View style={styles.reconciledSummary}>
          <Text style={styles.reconciledText}>
            帳單金額 NT$ {bill.total_amount.toLocaleString('zh-TW')}
            {bill.cashback_offset > 0
              ? `，折抵後實付 NT$ ${(bill.total_amount - bill.cashback_offset).toLocaleString('zh-TW')}`
              : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Line item row ─────────────────────────────────────────────────────────────

function LineItemRow({
  item, isChecked, onToggle, onAdd,
}: {
  item: MatchedLineItem;
  isChecked: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  return (
    <TouchableOpacity style={styles.lineItem} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.checkbox}>
        {isChecked && <Check size={14} color={colors.white} strokeWidth={3} />}
      </View>
      <View style={styles.lineItemInfo}>
        <Text style={styles.lineItemMerchant}>{item.lineItem.merchant}</Text>
        <Text style={styles.lineItemDate}>
          {item.lineItem.date}
          {item.dateOffsetDays > 0 && (
            <Text style={styles.offsetBadge}> ±{item.dateOffsetDays}天</Text>
          )}
        </Text>
        {item.matchedTransactionNotes && !item.isMissing && (
          <Text style={styles.matchedNote}>匹配：{item.matchedTransactionNotes}</Text>
        )}
      </View>
      <View style={styles.lineItemRight}>
        <Text style={styles.lineItemAmount}>NT$ {item.lineItem.amount.toLocaleString('zh-TW')}</Text>
        {item.isMissing && (
          <TouchableOpacity style={styles.addBtn} onPress={(e) => { e.stopPropagation?.(); onAdd(); }}>
            <Text style={styles.addBtnText}>＋ 新增</Text>
          </TouchableOpacity>
        )}
        {item.isMissing && <Text style={styles.missingBadge}>未匹配</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  loadingText: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.sm },
  doneEmoji: { fontSize: 48, marginBottom: spacing.md },
  doneTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.sm },
  doneSub: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  idle: { flex: 1, padding: spacing.md },
  billStatusCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  billStatusLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  billStatusValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.warning },
  billPeriod: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: spacing.xs },
  uploadBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  uploadBtnText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  reconciledSummary: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  reconciledText: { fontSize: typography.sizes.sm, color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  summaryLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  summaryValue: { fontSize: typography.sizes.sm, color: colors.text, fontWeight: typography.weights.medium },
  summaryTotal: {
    borderTopWidth: 1, borderTopColor: colors.borderLight,
    marginTop: spacing.xs, paddingTop: spacing.sm, marginBottom: spacing.md,
  },
  summaryTotalLabel: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  summaryTotalValue: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.primary },
  sectionTitle: {
    fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold,
    color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  lineItem: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs, gap: spacing.sm,
  },
  checkbox: {
    width: 22, height: 22, borderWidth: 2, borderColor: colors.border,
    borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { alignItems: 'center', justifyContent: 'center' },
  lineItemInfo: { flex: 1 },
  lineItemMerchant: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text },
  lineItemDate: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  offsetBadge: { color: colors.warning },
  matchedNote: { fontSize: typography.sizes.xs, color: colors.primary, marginTop: 2 },
  lineItemRight: { alignItems: 'flex-end', minWidth: 80 },
  lineItemAmount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text },
  addBtn: {
    marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 2,
    backgroundColor: colors.primary, borderRadius: radius.full,
  },
  addBtnText: { fontSize: typography.sizes.xs, color: colors.white, fontWeight: typography.weights.semibold },
  missingBadge: { fontSize: typography.sizes.xs, color: colors.expense, marginTop: 2 },
  confirmBtn: {
    marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  confirmBtnText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
});
