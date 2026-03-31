import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { createProject } from '../../lib/projects';
import { fetchCategories, CategoryWithChildren } from '../../lib/categories';
import { ProjectType, ProjectInterval } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const TYPE_LABELS: Record<ProjectType, string> = {
  periodic: '週期性',
  one_time: '一次性',
};

const INTERVAL_LABELS: Record<ProjectInterval, string> = {
  monthly: '每月',
  yearly: '每年',
};

export function CreateProjectModal({ visible, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('periodic');
  const [interval, setInterval] = useState<ProjectInterval>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [budgets, setBudgets] = useState<Record<string, string>>({}); // category_id → amount string
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const cats = await fetchCategories(session.user.id);
      setCategories(cats);
    })();
  }, [visible]);

  function reset() {
    setName(''); setType('periodic'); setInterval('monthly');
    setStartDate(''); setEndDate(''); setBudgets({});
  }

  function setBudget(categoryId: string, value: string) {
    setBudgets((prev) => ({ ...prev, [categoryId]: value }));
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('錯誤', '請輸入專案名稱'); return; }
    if (type === 'one_time') {
      if (!startDate || !endDate) { Alert.alert('錯誤', '請輸入開始與結束日期（YYYY-MM-DD）'); return; }
    }

    const categoryBudgets = Object.entries(budgets)
      .filter(([, v]) => v && parseFloat(v) > 0)
      .map(([category_id, v]) => ({ category_id, budget_amount: parseFloat(v) }));

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { error } = await createProject(session.user.id, {
      name: name.trim(),
      type,
      interval: type === 'periodic' ? interval : null,
      start_date: type === 'one_time' ? startDate : null,
      end_date: type === 'one_time' ? endDate : null,
      categoryBudgets,
    });

    setSaving(false);
    if (error) { Alert.alert('失敗', error); return; }
    reset(); onCreated();
  }

  // Flatten categories for display (parent + children)
  const allCategories = categories.flatMap((p) => [
    { id: p.id, name: p.name, emoji: p.emoji, indent: false },
    ...p.children.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, indent: true })),
  ]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>新增專案</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.saveText}>儲存</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>專案名稱</Text>
          <TextInput
            style={styles.input}
            placeholder="例：日本旅遊"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>專案類型</Text>
          <View style={styles.chipRow}>
            {(['periodic', 'one_time'] as ProjectType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, type === t && styles.chipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                  {TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {type === 'periodic' && (
            <>
              <Text style={styles.label}>週期</Text>
              <View style={styles.chipRow}>
                {(['monthly', 'yearly'] as ProjectInterval[]).map((iv) => (
                  <TouchableOpacity
                    key={iv}
                    style={[styles.chip, interval === iv && styles.chipActive]}
                    onPress={() => setInterval(iv)}
                  >
                    <Text style={[styles.chipText, interval === iv && styles.chipTextActive]}>
                      {INTERVAL_LABELS[iv]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {type === 'one_time' && (
            <>
              <Text style={styles.label}>開始日期（YYYY-MM-DD）</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-01-01"
                placeholderTextColor={colors.textSecondary}
                value={startDate}
                onChangeText={setStartDate}
              />
              <Text style={styles.label}>結束日期（YYYY-MM-DD）</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-12-31"
                placeholderTextColor={colors.textSecondary}
                value={endDate}
                onChangeText={setEndDate}
              />
            </>
          )}

          <Text style={styles.label}>各分類預算（選填，留空則不限額）</Text>
          {allCategories.map((cat) => (
            <View key={cat.id} style={[styles.budgetRow, cat.indent && styles.budgetRowIndent]}>
              <Text style={styles.budgetCatName}>
                {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
              </Text>
              <TextInput
                style={styles.budgetInput}
                placeholder="—"
                placeholderTextColor={colors.textSecondary}
                value={budgets[cat.id] ?? ''}
                onChangeText={(v) => setBudget(cat.id, v)}
                keyboardType="decimal-pad"
              />
            </View>
          ))}
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
  budgetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  budgetRowIndent: { paddingLeft: spacing.lg },
  budgetCatName: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  budgetInput: { width: 90, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, fontSize: typography.sizes.sm, color: colors.text, backgroundColor: colors.surface, textAlign: 'right' },
});
