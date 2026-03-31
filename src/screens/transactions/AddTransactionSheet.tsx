import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { createTransaction } from '../../lib/transactions';
import { fetchCategories, CategoryWithChildren } from '../../lib/categories';
import { fetchAccounts, AccountWithBalance } from '../../lib/accounts';
import { fetchContacts } from '../../lib/contacts';
import { fetchActiveProjects, ProjectWithBudgets } from '../../lib/projects';
import { Contact, PayerType } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const PAYER_LABELS: Record<PayerType, string> = {
  self: '自己付',
  paid_by_other: '別人幫我付',
  paid_for_other: '我幫別人付',
};

export function AddTransactionSheet({ visible, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isIncome, setIsIncome] = useState(false);
  const [payerType, setPayerType] = useState<PayerType>('self');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<ProjectWithBudgets[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [cats, accs, ctcts, projs] = await Promise.all([
        fetchCategories(session.user.id),
        fetchAccounts(session.user.id),
        fetchContacts(session.user.id),
        fetchActiveProjects(session.user.id),
      ]);
      setCategories(cats);
      setAccounts(accs);
      setContacts(ctcts);
      setProjects(projs);
      if (accs.length > 0 && !selectedAccountId) setSelectedAccountId(accs[0].id);
    })();
  }, [visible]);

  function reset() {
    setAmount(''); setDate(new Date()); setIsIncome(false);
    setPayerType('self'); setSelectedCategoryId(null);
    setSelectedAccountId(null); setSelectedContactId(null);
    setSelectedProjectId(null); setNotes(''); setExpandedCategory(null);
  }

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { Alert.alert('錯誤', '請輸入有效金額'); return; }
    if (!selectedCategoryId) { Alert.alert('錯誤', '請選擇分類'); return; }
    if (payerType !== 'paid_by_other' && !selectedAccountId) {
      Alert.alert('錯誤', '請選擇帳戶'); return;
    }
    if (payerType !== 'self' && !selectedContactId) {
      Alert.alert('錯誤', '請選擇聯絡人'); return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { error } = await createTransaction(session.user.id, {
      amount: parsed,
      date: date.toISOString().slice(0, 10),
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      projectId: selectedProjectId,
      notes,
      payerType,
      contactId: selectedContactId,
      isIncome,
    });

    setSaving(false);
    if (error) { Alert.alert('失敗', error); return; }
    reset(); onSaved();
  }

  const dateStr = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>新增記錄</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.saveText}>儲存</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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

          {/* Amount */}
          <View style={styles.amountRow}>
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

          {/* Date */}
          <TouchableOpacity style={styles.field} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.fieldLabel}>日期</Text>
            <Text style={styles.fieldValue}>{dateStr}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
              maximumDate={new Date()}
            />
          )}

          {/* Payer type */}
          {!isIncome && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>付款方式</Text>
              <View style={styles.chipRow}>
                {(Object.keys(PAYER_LABELS) as PayerType[]).map((pt) => (
                  <TouchableOpacity
                    key={pt}
                    style={[styles.chip, payerType === pt && styles.chipActive]}
                    onPress={() => { setPayerType(pt); setSelectedContactId(null); }}
                  >
                    <Text style={[styles.chipText, payerType === pt && styles.chipTextActive]}>
                      {PAYER_LABELS[pt]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Contact (when debt-related) */}
          {payerType !== 'self' && !isIncome && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>聯絡人</Text>
              {contacts.length === 0 ? (
                <Text style={styles.hint}>尚無聯絡人，請先在「更多 > 聯絡人」新增</Text>
              ) : (
                <View style={styles.chipRow}>
                  {contacts.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, selectedContactId === c.id && styles.chipActive]}
                      onPress={() => setSelectedContactId(c.id)}
                    >
                      <Text style={[styles.chipText, selectedContactId === c.id && styles.chipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>分類</Text>
            {categories.map((parent) => (
              <View key={parent.id}>
                <TouchableOpacity
                  style={[styles.catParent, selectedCategoryId === parent.id && styles.catSelected]}
                  onPress={() => {
                    setSelectedCategoryId(parent.id);
                    setExpandedCategory(expandedCategory === parent.id ? null : parent.id);
                  }}
                >
                  <Text style={styles.catEmoji}>{parent.emoji}</Text>
                  <Text style={[styles.catName, selectedCategoryId === parent.id && styles.catNameSelected]}>
                    {parent.name}
                  </Text>
                  {parent.children.length > 0 && (
                    <Text style={styles.catArrow}>{expandedCategory === parent.id ? '▾' : '▸'}</Text>
                  )}
                </TouchableOpacity>
                {expandedCategory === parent.id && parent.children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.catChild, selectedCategoryId === child.id && styles.catSelected]}
                    onPress={() => setSelectedCategoryId(child.id)}
                  >
                    <Text style={styles.catEmoji}>{child.emoji}</Text>
                    <Text style={[styles.catName, selectedCategoryId === child.id && styles.catNameSelected]}>
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Account */}
          {payerType !== 'paid_by_other' && (
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

          {/* Project */}
          {projects.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>專案（選填）</Text>
              <View style={styles.chipRow}>
                {projects.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, selectedProjectId === p.id && styles.chipActive]}
                    onPress={() => setSelectedProjectId(selectedProjectId === p.id ? null : p.id)}
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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  cancelText: { fontSize: typography.sizes.md, color: colors.textSecondary },
  saveText: { fontSize: typography.sizes.md, color: colors.primary, fontWeight: typography.weights.semibold },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  typeToggle: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, marginBottom: spacing.md },
  typeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  typeBtnActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  typeBtnText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  typeBtnTextActive: { color: colors.text, fontWeight: typography.weights.semibold },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
  currency: { fontSize: typography.sizes.xl, color: colors.textSecondary, marginRight: spacing.xs },
  amountInput: { fontSize: typography.sizes.xxxl, fontWeight: typography.weights.bold, color: colors.text, minWidth: 120, textAlign: 'center' },
  field: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  fieldLabel: { fontSize: typography.sizes.md, color: colors.textSecondary },
  fieldValue: { fontSize: typography.sizes.md, color: colors.text, fontWeight: typography.weights.medium },
  section: { marginBottom: spacing.md },
  sectionLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: typography.weights.medium },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sizes.sm, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
  hint: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  catParent: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  catChild: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, marginLeft: spacing.lg, borderRadius: radius.sm },
  catSelected: { backgroundColor: colors.primaryLight + '20' },
  catEmoji: { fontSize: typography.sizes.md, marginRight: spacing.sm },
  catName: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  catNameSelected: { color: colors.primary, fontWeight: typography.weights.semibold },
  catArrow: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  notesInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, fontSize: typography.sizes.md, color: colors.text, backgroundColor: colors.surface, minHeight: 80, textAlignVertical: 'top' },
});
