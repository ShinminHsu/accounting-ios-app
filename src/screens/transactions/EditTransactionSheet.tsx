import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, ChevronRight, X, Tag, Trash2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { updateTransaction, deleteTransaction, hasLinkedDebt } from '../../lib/transactions';
import { fetchCategories, CategoryWithChildren } from '../../lib/categories';
import { fetchAccounts, AccountWithBalance } from '../../lib/accounts';
import { TransactionWithRefs } from '../../lib/transactions';
import { CategoryIcon } from '../../components/CategoryIcon';
import { colors, typography, spacing, radius, shadows } from '../../theme';

type Props = {
  visible: boolean;
  transaction: TransactionWithRefs | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
};

export function EditTransactionSheet({ visible, transaction, onClose, onSaved, onDeleted }: Props) {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isIncome, setIsIncome] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [hasDebt, setHasDebt] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!visible || !transaction) return;

    setAmount(String(transaction.amount));
    setName(transaction.name ?? '');
    setDate(new Date(transaction.date));
    setIsIncome(transaction.is_income);
    setSelectedCategoryId(transaction.category_id);
    setSelectedAccountId(transaction.account_id);
    setNotes(transaction.notes ?? '');
    setShowCategoryPicker(false);

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [cats, accs, linked] = await Promise.all([
        fetchCategories(session.user.id),
        fetchAccounts(session.user.id),
        hasLinkedDebt(transaction.id),
      ]);
      setCategories(cats);
      setAccounts(accs);
      setHasDebt(linked);

      // Auto-expand parent of selected subcategory
      if (transaction.category_id) {
        const parent = cats.find((p) => p.children.some((ch) => ch.id === transaction.category_id));
        if (parent) setExpandedCategory(parent.id);
      }
    })();
  }, [visible, transaction]);

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { Alert.alert('錯誤', '請輸入有效金額'); return; }
    if (!selectedCategoryId) { Alert.alert('錯誤', '請選擇分類'); return; }
    if (!transaction) return;

    setSaving(true);
    const { error } = await updateTransaction(transaction.id, {
      amount: parsed,
      date: date.toISOString().slice(0, 10),
      name: name.trim() || null,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      notes,
      isIncome,
    });
    setSaving(false);
    if (error) { Alert.alert('失敗', error); return; }
    onSaved();
  }

  async function handleDelete() {
    if (!transaction) return;
    Alert.alert(
      '刪除記錄',
      hasDebt ? '此記錄有關聯借還款，刪除後借還款記錄也會一併移除。確定要刪除嗎？' : '確定要刪除這筆記錄嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await deleteTransaction(transaction.id);
            setDeleting(false);
            if (error) { Alert.alert('失敗', error); return; }
            onDeleted ? onDeleted() : onSaved();
          },
        },
      ],
    );
  }

  if (!transaction) return null;

  const dateStr = date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
  const payerLabel = transaction.payer_type === 'paid_by_other'
    ? '別人幫我付'
    : transaction.payer_type === 'paid_for_other'
    ? '我幫別人付'
    : '自己付';

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

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    setShowCategoryPicker(false);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>編輯記錄</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.deleteBtn}
            >
              {deleting
                ? <ActivityIndicator color={colors.expense} size="small" />
                : <Trash2 size={18} color={colors.expense} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              {saving ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.saveText}>儲存</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
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

            {/* Two-column: Amount | Name + Date */}
            <View style={styles.twoColRow}>
              <View style={styles.amountCol}>
                <Text style={styles.currency}>NT$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
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

            {/* Payer type (read-only) */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>付款方式</Text>
              <Text style={styles.fieldValue}>{payerLabel}</Text>
            </View>
            {hasDebt && (
              <Text style={styles.debtWarning}>此記錄已有關聯債務，無法更改付款方式</Text>
            )}

            {/* Account */}
            {transaction.payer_type !== 'paid_by_other' && accounts.length > 0 && (
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
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Category Picker Bottom Sheet */}
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

                    {expandedCategory === parent.id && parent.children.map((child) => {
                      const active = selectedCategoryId === child.id;
                      return (
                        <TouchableOpacity
                          key={child.id}
                          style={[picker.childRow, active && picker.rowSelected]}
                          onPress={() => selectCategory(child.id)}
                        >
                          <CategoryIcon
                            iconKey={child.emoji}
                            size={15}
                            color={active ? colors.primary : colors.textSecondary}
                            containerSize={28}
                          />
                          <Text style={[picker.childName, active && picker.nameSelected]}>
                            {child.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  deleteBtn: { padding: 2 },
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
  twoColRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm, gap: spacing.sm },
  amountCol: { flex: 55, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  nameDateCol: { flex: 45, gap: spacing.xs },
  currency: { fontSize: typography.sizes.lg, color: colors.textSecondary, marginRight: 4 },
  amountInput: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text, flex: 1 },
  nameInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 7,
    fontSize: typography.sizes.sm, color: colors.text, backgroundColor: colors.surface,
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
  field: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  fieldLabel: { fontSize: typography.sizes.md, color: colors.textSecondary },
  fieldValue: { fontSize: typography.sizes.md, color: colors.text, fontWeight: typography.weights.medium },
  debtWarning: { fontSize: typography.sizes.xs, color: colors.expense, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
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
  notesInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: spacing.sm, fontSize: typography.sizes.md, color: colors.text,
    backgroundColor: colors.surface, minHeight: 72, textAlignVertical: 'top',
  },
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
  childRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    paddingLeft: spacing.md + 36 + spacing.sm,
  },
  childName: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
});
