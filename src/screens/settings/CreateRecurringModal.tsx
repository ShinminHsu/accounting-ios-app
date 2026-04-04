import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { createRecurringTemplate } from '../../lib/recurring';
import { fetchCategories, CategoryWithChildren } from '../../lib/categories';
import { fetchAccounts, AccountWithBalance } from '../../lib/accounts';
import { fetchContacts } from '../../lib/contacts';
import { fetchActiveProjects, ProjectWithBudgets } from '../../lib/projects';
import { Contact, RecurrenceFrequency, RecurrenceSubtype } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const FREQ_LABELS: Record<RecurrenceFrequency, string> = {
  daily: '每天',
  weekly: '每週',
  monthly: '每月',
  yearly: '每年',
};

const SUBTYPE_LABELS: Record<RecurrenceSubtype, string> = {
  expense: '一般支出',
  paid_for_other: '代付（應收）',
  investment_contribution: '投資入帳（收入）',
};

export function CreateRecurringModal({ visible, onClose, onCreated }: Props) {
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [subtype, setSubtype] = useState<RecurrenceSubtype>('expense');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<ProjectWithBudgets[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
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
      if (accs.length > 0) setSelectedAccountId(accs[0].id);
    })();
  }, [visible]);

  function reset() {
    setAmount(''); setFrequency('monthly'); setSubtype('expense');
    setStartDate(''); setEndDate(''); setNotes('');
    setSelectedCategoryId(null); setSelectedAccountId(null);
    setSelectedProjectId(null); setSelectedContactId(null);
    setExpandedCategory(null);
  }

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { Alert.alert('錯誤', '請輸入有效金額'); return; }
    if (!startDate) { Alert.alert('錯誤', '請輸入開始日期'); return; }
    if (subtype === 'paid_for_other' && !selectedContactId) {
      Alert.alert('錯誤', '代付需選擇聯絡人'); return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { error } = await createRecurringTemplate(session.user.id, {
      amount: parsed,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      projectId: selectedProjectId,
      notes,
      frequency,
      subtype,
      contactId: selectedContactId,
      startDate,
      endDate: endDate || null,
    });

    setSaving(false);
    if (error) { Alert.alert('失敗', error); return; }
    reset(); onCreated();
  }

  const allCategories = categories.flatMap((p) => [
    { id: p.id, name: p.name, emoji: p.emoji, isChild: false },
    ...p.children.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, isChild: true })),
  ]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>新增定期記錄</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.saveText}>儲存</Text>}
          </TouchableOpacity>
        </View>

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

          <Text style={styles.label}>類型</Text>
          <View style={styles.chipRow}>
            {(Object.keys(SUBTYPE_LABELS) as RecurrenceSubtype[]).map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.chip, subtype === st && styles.chipActive]}
                onPress={() => setSubtype(st)}
              >
                <Text style={[styles.chipText, subtype === st && styles.chipTextActive]}>
                  {SUBTYPE_LABELS[st]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>頻率</Text>
          <View style={styles.chipRow}>
            {(Object.keys(FREQ_LABELS) as RecurrenceFrequency[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, frequency === f && styles.chipActive]}
                onPress={() => setFrequency(f)}
              >
                <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>
                  {FREQ_LABELS[f]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>開始日期（YYYY-MM-DD）</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-01-01"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>結束日期（選填）</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="留空則無限期"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>分類</Text>
          {allCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catRow, cat.isChild && styles.catRowIndent, selectedCategoryId === cat.id && styles.catSelected]}
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

          {subtype === 'paid_for_other' && (
            <>
              <Text style={styles.label}>聯絡人</Text>
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
            </>
          )}

          {projects.length > 0 && (
            <>
              <Text style={styles.label}>專案（選填）</Text>
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
            </>
          )}

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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface },
  title: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  cancelText: { fontSize: typography.sizes.md, color: colors.textSecondary },
  saveText: { fontSize: typography.sizes.md, color: colors.primary, fontWeight: typography.weights.semibold },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  label: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md, fontWeight: typography.weights.medium },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.sizes.md, color: colors.text, backgroundColor: colors.surface },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sizes.sm, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  catRowIndent: { paddingLeft: spacing.lg },
  catSelected: { backgroundColor: colors.primaryLight + '20' },
  catEmoji: { fontSize: typography.sizes.md, marginRight: spacing.sm },
  catName: { fontSize: typography.sizes.sm, color: colors.text },
  catNameSelected: { color: colors.primary, fontWeight: typography.weights.semibold },
  notesInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, fontSize: typography.sizes.md, color: colors.text, backgroundColor: colors.surface, minHeight: 60, textAlignVertical: 'top' },
});
