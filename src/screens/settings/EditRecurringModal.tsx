import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { updateRecurringTemplate, RecurringTemplateWithRefs } from '../../lib/recurring';
import { fetchCategories, CategoryWithChildren } from '../../lib/categories';
import { fetchAccounts, AccountWithBalance } from '../../lib/accounts';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  template: RecurringTemplateWithRefs | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditRecurringModal({ template, onClose, onSaved }: Props) {
  const visible = template !== null;
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!template) return;
    setAmount(String(template.amount));
    setSelectedCategoryId(template.category_id);
    setSelectedAccountId(template.account_id);
    setNotes(template.notes ?? '');

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [cats, accs] = await Promise.all([
        fetchCategories(session.user.id),
        fetchAccounts(session.user.id),
      ]);
      setCategories(cats);
      setAccounts(accs);
    })();
  }, [template]);

  async function handleSave() {
    if (!template) return;
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { Alert.alert('錯誤', '請輸入有效金額'); return; }

    setSaving(true);
    const { error } = await updateRecurringTemplate(template.id, {
      amount: parsed,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      notes: notes || null,
    });
    setSaving(false);

    if (error) { Alert.alert('失敗', error); return; }
    onSaved();
  }

  const allCategories = categories.flatMap((p) => [
    { id: p.id, name: p.name, emoji: p.emoji, isChild: false },
    ...p.children.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, isChild: true })),
  ]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>編輯定期記錄</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.saveText}>儲存</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.notice}>僅修改未來產生的記錄，已產生的記錄不受影響。</Text>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>金額</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>分類</Text>
          {allCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catRow,
                cat.isChild && styles.catRowIndent,
                selectedCategoryId === cat.id && styles.catSelected,
              ]}
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <Text style={styles.catEmoji}>{cat.emoji ?? '📦'}</Text>
              <Text style={[styles.catName, selectedCategoryId === cat.id && styles.catNameSelected]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}

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

          <Text style={styles.label}>備註（選填）</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="輸入備註..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
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
  notice: {
    fontSize: typography.sizes.xs, color: colors.textSecondary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight + '20',
  },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
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
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm,
  },
  catRowIndent: { paddingLeft: spacing.lg },
  catSelected: { backgroundColor: colors.primaryLight + '20' },
  catEmoji: { fontSize: typography.sizes.md, marginRight: spacing.sm },
  catName: { fontSize: typography.sizes.sm, color: colors.text },
  catNameSelected: { color: colors.primary, fontWeight: typography.weights.semibold },
  notesInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: spacing.sm, fontSize: typography.sizes.md, color: colors.text,
    backgroundColor: colors.surface, minHeight: 60, textAlignVertical: 'top',
  },
});
