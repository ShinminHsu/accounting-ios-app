import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays, ChevronRight, X, Tag, Users,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { createTransaction } from '../../lib/transactions';
import { fetchCategories, CategoryWithChildren } from '../../lib/categories';
import { fetchAccounts, AccountWithBalance } from '../../lib/accounts';
import { fetchContacts } from '../../lib/contacts';
import { fetchActiveProjects, ProjectWithBudgets } from '../../lib/projects';
import {
  fetchCreditCardByAccountId, calculateRewardPreview, accumulateTransactionReward,
  RewardPreview,
} from '../../lib/rewards';
import { getActiveFriendship, writeSharedTransaction } from '../../lib/friends';
import { fetchLedgers } from '../../lib/ledgers';
import { CategoryIcon } from '../../components/CategoryIcon';
import { PayerContactPicker } from '../../components/PayerContactPicker';
import { Contact, Ledger, PayerType } from '../../types/database';
import { colors, typography, spacing, radius, shadows } from '../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const PAYER_OPTIONS: { key: PayerType; label: string }[] = [
  { key: 'self',           label: '自己付' },
  { key: 'paid_by_other',  label: '別人付' },
  { key: 'paid_for_other', label: '幫人付' },
];

export function AddTransactionSheet({ visible, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isIncome, setIsIncome] = useState(false);
  const [payerType, setPayerType] = useState<PayerType>('self');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [payerName, setPayerName] = useState('');
  const [showPayerPicker, setShowPayerPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [ledgerId, setLedgerId] = useState<string | null>(null);
  const [ledgers, setLedgers] = useState<{ active: Ledger[]; invited: Ledger[] }>({ active: [], invited: [] });

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<ProjectWithBudgets[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rewardPreview, setRewardPreview] = useState<RewardPreview | null>(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [cats, accs, ctcts, projs, ldgrs] = await Promise.all([
        fetchCategories(session.user.id),
        fetchAccounts(session.user.id),
        fetchContacts(session.user.id),
        fetchActiveProjects(session.user.id),
        fetchLedgers(session.user.id),
      ]);
      setCategories(cats);
      setAccounts(accs);
      setContacts(ctcts);
      setProjects(projs);
      setLedgers(ldgrs);
      if (accs.length > 0 && !selectedAccountId) setSelectedAccountId(accs[0].id);
      if (selectedCategoryId) {
        const parent = cats.find((p) => p.children.some((ch) => ch.id === selectedCategoryId));
        if (parent) setExpandedCategory(parent.id);
      }
    })();
  }, [visible]);

  useEffect(() => {
    if (isIncome || !selectedAccountId || !selectedCategoryId) {
      setRewardPreview(null); return;
    }
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setRewardPreview(null); return; }
    (async () => {
      const cc = await fetchCreditCardByAccountId(selectedAccountId);
      if (!cc) { setRewardPreview(null); return; }
      const yearMonth = new Date().toISOString().slice(0, 7);
      const preview = await calculateRewardPreview(parsed, selectedCategoryId, notes, cc.id, yearMonth);
      setRewardPreview(preview);
    })();
  }, [amount, selectedCategoryId, selectedAccountId, notes, isIncome]);

  function reset() {
    setName(''); setAmount(''); setDate(new Date()); setIsIncome(false);
    setPayerType('self'); setSelectedCategoryId(null);
    setSelectedAccountId(null); setSelectedContactId(null);
    setPayerName(''); setShowPayerPicker(false);
    setSelectedProjectId(null); setLedgerId(null); setNotes(''); setExpandedCategory(null);
    setRewardPreview(null); setShowCategoryPicker(false);
  }

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { Alert.alert('錯誤', '請輸入有效金額'); return; }
    if (!selectedCategoryId) { Alert.alert('錯誤', '請選擇分類'); return; }
    if (payerType !== 'paid_by_other' && !selectedAccountId) {
      Alert.alert('錯誤', '請選擇帳戶'); return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: savedTxn, error } = await createTransaction(session.user.id, {
        amount: parsed,
        date: date.toISOString().slice(0, 10),
        name: name.trim() || null,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
        projectId: selectedProjectId,
        ledgerId,
        notes,
        payerType,
        contactId: selectedContactId,
        payerName: payerName.trim() || null,
        isIncome,
      });

      if (error || !savedTxn) { Alert.alert('失敗', error ?? '儲存失敗'); return; }

      if (rewardPreview?.ruleId && selectedAccountId && !isIncome) {
        const cc = await fetchCreditCardByAccountId(selectedAccountId);
        if (cc) {
          const yearMonth = date.toISOString().slice(0, 7);
          await accumulateTransactionReward(
            session.user.id, rewardPreview.ruleId, rewardPreview.earnedAmount,
            yearMonth, cc.id, rewardPreview.rewardType!,
          );
        }
      }

      if (payerType === 'paid_for_other' && selectedContactId) {
        const friendship = await getActiveFriendship(session.user.id, selectedContactId);
        if (friendship) {
          const catName = categories.find((c) => {
            if (c.id === selectedCategoryId) return true;
            return c.children.some((ch) => ch.id === selectedCategoryId);
          })?.name ?? null;
          await writeSharedTransaction(
            session.user.id,
            friendship.friendUserId,
            parsed,
            accounts.find((a) => a.id === selectedAccountId)?.currency ?? 'TWD',
            date.toISOString().slice(0, 10),
            catName,
            notes,
            savedTxn.id,
          );
        }
      }

      reset(); onSaved();
    } finally {
      setSaving(false);
    }
  }

  // Derived: selected category display info
  const selectedCategoryInfo = (() => {
    if (!selectedCategoryId) return null;
    for (const parent of categories) {
      if (parent.id === selectedCategoryId) return { name: parent.name, emoji: parent.emoji };
      const child = parent.children.find((c) => c.id === selectedCategoryId);
      if (child) return { name: child.name, emoji: child.emoji };
    }
    return null;
  })();

  const dateStr = date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    setShowCategoryPicker(false);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>新增記錄</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              {saving ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.saveText}>儲存</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Income / Expense toggle */}
            <View style={styles.typeToggle}>
              {[false, true].map((inc) => (
                <TouchableOpacity
                  key={String(inc)}
                  style={[styles.typeBtn, isIncome === inc && styles.typeBtnActive]}
                  onPress={() => setIsIncome(inc)}
                >
                  <Text style={[styles.typeBtnText, isIncome === inc && styles.typeBtnTextActive]}>
                    {inc ? '收入' : '支出'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Two-column: Amount (left 55%) | Name + Date (right 45%) */}
            <View style={styles.twoColRow}>
              {/* Left: amount */}
              <View style={styles.amountCol}>
                <Text style={styles.currency}>NT$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>

              {/* Right: name + date */}
              <View style={styles.nameDateCol}>
                <TextInput
                  style={styles.nameInput}
                  placeholder="名稱（選填）"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.datePill} onPress={() => setShowDatePicker(true)}>
                  <CalendarDays size={12} color={colors.textSecondary} />
                  <Text style={styles.datePillText}>{dateStr}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category row */}
            <View style={[styles.quickRow, { marginBottom: spacing.md }]}>
              <TouchableOpacity
                style={[styles.quickPill, styles.quickPillFlex, !selectedCategoryInfo && styles.quickPillRequired]}
                onPress={() => setShowCategoryPicker(true)}
              >
                {selectedCategoryInfo ? (
                  <CategoryIcon iconKey={selectedCategoryInfo.emoji} size={13} color={colors.primary} containerSize={20} />
                ) : (
                  <Tag size={13} color={colors.textSecondary} />
                )}
                <Text style={[styles.quickPillText, selectedCategoryInfo && styles.quickPillTextSelected]} numberOfLines={1}>
                  {selectedCategoryInfo?.name ?? '選擇分類'}
                </Text>
                <ChevronRight size={13} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
                maximumDate={new Date()}
              />
            )}

            {/* Account */}
            {payerType !== 'paid_by_other' && accounts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>帳戶</Text>
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
              </View>
            )}

            {/* Ledger selector — shown only when user has > 1 active ledger */}
            {ledgers.active.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>帳本（選填）</Text>
                <View style={styles.chipRow}>
                  {ledgers.active.map((l) => {
                    const active = ledgerId === l.id || (ledgerId === null && l.is_personal);
                    return (
                      <TouchableOpacity
                        key={l.id}
                        style={[styles.chip, active && styles.chipActive, !l.is_personal && { flexDirection: 'row', alignItems: 'center' }]}
                        onPress={() => setLedgerId(l.is_personal ? null : l.id)}
                      >
                        {!l.is_personal && (
                          <Users size={11} color={active ? colors.white : colors.textSecondary} style={{ marginRight: 4 }} />
                        )}
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{l.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Payer type: compact segmented control */}
            {!isIncome && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>付款方式</Text>
                <View style={styles.segmentedRow}>
                  {PAYER_OPTIONS.map((opt) => {
                    const active = payerType === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.segmentPill, active && styles.segmentPillActive]}
                        onPress={() => {
                          setPayerType(opt.key);
                          setSelectedContactId(null);
                          setPayerName('');
                        }}
                      >
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 代付對象 selector (shown when payer is not self) */}
            {payerType !== 'self' && !isIncome && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.payerContactBtn}
                  onPress={() => setShowPayerPicker(true)}
                >
                  <Text style={styles.sectionLabel}>代付對象（選填）</Text>
                  <Text style={styles.payerContactValue} numberOfLines={1}>
                    {selectedContactId
                      ? (contacts.find((c) => c.id === selectedContactId)?.name ?? '')
                      : payerName || '點此選擇或輸入'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Project */}
            {projects.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>專案（選填）</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, selectedProjectId === null && styles.chipActive]}
                    onPress={() => setSelectedProjectId(null)}
                  >
                    <Text style={[styles.chipText, selectedProjectId === null && styles.chipTextActive]}>不指定</Text>
                  </TouchableOpacity>
                  {projects.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.chip, selectedProjectId === p.id && styles.chipActive]}
                      onPress={() => setSelectedProjectId(p.id)}
                    >
                      <Text style={[styles.chipText, selectedProjectId === p.id && styles.chipTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>備註（選填）</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="輸入備註..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Reward preview */}
            {rewardPreview && !isIncome && (
              <View style={styles.rewardBanner}>
                {rewardPreview.thresholdNotMet ? (
                  <Text style={styles.rewardText}>未達最低消費門檻，無回饋</Text>
                ) : rewardPreview.isCapReached ? (
                  <Text style={styles.rewardText}>本月回饋上限已達</Text>
                ) : (
                  <Text style={styles.rewardText}>
                    回饋：{rewardPreview.rewardType === 'cashback_offset'
                      ? `NT$ ${rewardPreview.earnedAmount.toFixed(1)} 現金回饋`
                      : rewardPreview.rewardType === 'points'
                      ? `${rewardPreview.earnedAmount.toFixed(0)} 點`
                      : `NT$ ${rewardPreview.earnedAmount.toFixed(1)} 入帳回饋`}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── 代付對象 Picker ── */}
        <PayerContactPicker
          contacts={contacts}
          selectedContactId={selectedContactId}
          payerName={payerName}
          onChangeContactId={setSelectedContactId}
          onChangePayerName={setPayerName}
          visible={showPayerPicker}
          onClose={() => setShowPayerPicker(false)}
        />

        {/* ── Category Picker Bottom Sheet ── */}
        <Modal visible={showCategoryPicker} animationType="slide" transparent>
          <View style={picker.overlay}>
            <TouchableOpacity style={picker.backdrop} onPress={() => setShowCategoryPicker(false)} />
            <View style={picker.sheet}>
              <View style={picker.handle} />
              <View style={picker.sheetHeader}>
                <Text style={picker.sheetTitle}>選擇分類</Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={picker.list}>
                {categories.map((parent) => (
                  <View key={parent.id}>
                    {/* Parent row */}
                    <TouchableOpacity
                      style={[picker.parentRow, selectedCategoryId === parent.id && picker.rowSelected]}
                      onPress={() => {
                        if (parent.children.length === 0) {
                          selectCategory(parent.id);
                        } else {
                          setExpandedCategory(expandedCategory === parent.id ? null : parent.id);
                        }
                      }}
                    >
                      <CategoryIcon
                        iconKey={parent.emoji}
                        size={18}
                        color={selectedCategoryId === parent.id ? colors.primary : colors.textSecondary}
                        bgColor={selectedCategoryId === parent.id ? colors.primary + '18' : colors.surfaceAlt}
                        containerSize={36}
                      />
                      <Text style={[picker.parentName, selectedCategoryId === parent.id && picker.nameSelected]}>
                        {parent.name}
                      </Text>
                      {parent.children.length > 0 && (
                        <ChevronRight
                          size={16}
                          color={colors.textSecondary}
                          style={{ transform: [{ rotate: expandedCategory === parent.id ? '90deg' : '0deg' }] }}
                        />
                      )}
                    </TouchableOpacity>

                    {/* Children grid */}
                    {expandedCategory === parent.id && (
                      <View style={picker.childGrid}>
                        {parent.children.map((child) => {
                          const active = selectedCategoryId === child.id;
                          return (
                            <TouchableOpacity
                              key={child.id}
                              style={[picker.childItem, active && picker.childItemActive]}
                              onPress={() => selectCategory(child.id)}
                            >
                              <CategoryIcon
                                iconKey={child.emoji}
                                size={15}
                                color={active ? colors.primary : colors.textSecondary}
                                containerSize={28}
                              />
                              <Text style={[picker.childName, active && picker.nameSelected]} numberOfLines={1}>
                                {child.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  title: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  cancelText: { fontSize: typography.sizes.md, color: colors.textSecondary },
  saveText: { fontSize: typography.sizes.md, color: colors.primary, fontWeight: typography.weights.semibold },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  typeToggle: {
    flexDirection: 'row', backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md, padding: 4, marginBottom: spacing.md,
  },
  typeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  typeBtnActive: { backgroundColor: colors.surface, ...shadows.sm },
  typeBtnText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  typeBtnTextActive: { color: colors.text, fontWeight: typography.weights.semibold },
  // Two-column amount + name/date layout
  twoColRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: spacing.sm, gap: spacing.sm,
  },
  amountCol: {
    flex: 55, flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  nameDateCol: {
    flex: 45, gap: spacing.xs,
  },
  currency: { fontSize: typography.sizes.lg, color: colors.textSecondary, marginRight: 4 },
  amountInput: {
    fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold,
    color: colors.text, flex: 1,
  },
  nameInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 7,
    fontSize: typography.sizes.sm, color: colors.text,
    backgroundColor: colors.surface,
  },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    backgroundColor: colors.surface, alignSelf: 'flex-start',
  },
  datePillText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  quickPillFlex: { flex: 1 },
  quickPillRequired: { borderColor: colors.primary + '60', backgroundColor: colors.primary + '08' },
  quickPillText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  quickPillTextSelected: { color: colors.primary, fontWeight: typography.weights.medium },
  section: { marginBottom: spacing.md },
  sectionLabel: {
    fontSize: typography.sizes.xs, color: colors.textSecondary,
    marginBottom: spacing.xs, fontWeight: typography.weights.medium,
    textTransform: 'uppercase', letterSpacing: 0.4,
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
  // Compact segmented payer control
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 3,
    height: 36,
  },
  segmentPill: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm - 1,
  },
  segmentPillActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  segmentText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  segmentTextActive: { color: colors.primary, fontWeight: typography.weights.semibold },
  // 代付對象
  payerContactBtn: { paddingVertical: spacing.xs },
  payerContactValue: {
    fontSize: typography.sizes.md, color: colors.text,
    marginTop: 2,
  },
  hint: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  notesInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: spacing.sm, fontSize: typography.sizes.md, color: colors.text,
    backgroundColor: colors.surface, minHeight: 72, textAlignVertical: 'top',
  },
  rewardBanner: {
    backgroundColor: colors.primary + '14', borderRadius: radius.sm,
    padding: spacing.sm, marginTop: spacing.xs,
  },
  rewardText: { fontSize: typography.sizes.sm, color: colors.primary },
});

const picker = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    maxHeight: '75%',
    ...shadows.lg,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.borderLight, alignSelf: 'center', marginTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  sheetTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  list: { paddingBottom: spacing.xxl },
  parentRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  rowSelected: { backgroundColor: colors.primary + '08' },
  parentName: { flex: 1, fontSize: typography.sizes.md, color: colors.text, fontWeight: typography.weights.medium },
  nameSelected: { color: colors.primary },
  childGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs,
    marginLeft: 52,
  },
  childItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  childItemActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  childName: { fontSize: typography.sizes.sm, color: colors.text },
});
