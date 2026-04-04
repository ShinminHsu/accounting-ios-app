import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import {
  fetchRecurringTemplates, cancelRecurringTemplate, computeNextDueDate,
  RecurringTemplateWithRefs,
} from '../../lib/recurring';
import { CreateRecurringModal } from './CreateRecurringModal';
import { EditRecurringModal } from './EditRecurringModal';
import { colors, typography, spacing, radius } from '../../theme';
import { RecurrenceFrequency } from '../../types/database';

const FREQ_LABELS: Record<RecurrenceFrequency, string> = {
  daily: '每天', weekly: '每週', monthly: '每月', yearly: '每年',
};

export function RecurringTemplatesScreen() {
  const [templates, setTemplates] = useState<RecurringTemplateWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<RecurringTemplateWithRefs | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const list = await fetchRecurringTemplates(session.user.id);
    setTemplates(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = templates
    .filter((t) => t.status === 'active')
    .sort((a, b) => computeNextDueDate(a).localeCompare(computeNextDueDate(b)));
  const archived = templates.filter((t) => t.status !== 'active');

  function handleCancel(t: RecurringTemplateWithRefs) {
    Alert.alert('取消定期記錄', `確定取消「${t.category_name ?? '未知'}」的定期記錄？過去已建立的記錄不受影響。`, [
      { text: '保留', style: 'cancel' },
      {
        text: '取消定期', style: 'destructive',
        onPress: async () => {
          const { error } = await cancelRecurringTemplate(t.id);
          if (error) Alert.alert('失敗', error);
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>進行中</Text>
          <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>＋ 新增</Text>
          </TouchableOpacity>
        </View>

        {active.length === 0 ? (
          <Text style={styles.empty}>尚無定期記錄</Text>
        ) : (
          active.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              nextDueDate={computeNextDueDate(t)}
              onEdit={() => setEditing(t)}
              onCancel={() => handleCancel(t)}
            />
          ))
        )}

        {archived.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>已結束 / 已取消</Text>
            {archived.map((t) => (
              <TemplateRow key={t.id} template={t} nextDueDate={null} />
            ))}
          </>
        )}
      </ScrollView>

      <CreateRecurringModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />

      <EditRecurringModal
        template={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    </SafeAreaView>
  );
}

function TemplateRow({
  template, nextDueDate, onEdit, onCancel,
}: {
  template: RecurringTemplateWithRefs;
  nextDueDate: string | null;
  onEdit?: () => void;
  onCancel?: () => void;
}) {
  const isActive = template.status === 'active';
  return (
    <View style={[styles.card, !isActive && styles.cardArchived]}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardEmoji}>{template.category_emoji ?? '📋'}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>
          {template.category_name ?? '未分類'} · {FREQ_LABELS[template.frequency]}
        </Text>
        <Text style={styles.cardSub}>
          NT$ {template.amount.toLocaleString('zh-TW')}
          {template.account_name ? ` · ${template.account_name}` : ''}
          {template.contact_name ? ` · ${template.contact_name}` : ''}
        </Text>
        {nextDueDate && (
          <Text style={styles.cardDates}>下次：{nextDueDate}</Text>
        )}
        {!isActive && (
          <Text style={styles.cardDates}>
            {template.start_date}{template.end_date ? ` → ${template.end_date}` : ' 起'}
          </Text>
        )}
      </View>
      {isActive && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
              <Text style={styles.editBtnText}>編輯</Text>
            </TouchableOpacity>
          )}
          {onCancel && (
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>取消</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {!isActive && (
        <Text style={styles.statusTag}>
          {template.status === 'cancelled' ? '已取消' : '已完成'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.full },
  addBtnText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  empty: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs },
  cardArchived: { opacity: 0.55 },
  cardLeft: { marginRight: spacing.sm },
  cardEmoji: { fontSize: typography.sizes.xl },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text },
  cardSub: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  cardDates: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'column', alignItems: 'flex-end', gap: spacing.xs },
  editBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  editBtnText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.semibold },
  cancelBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  cancelBtnText: { fontSize: typography.sizes.xs, color: colors.expense },
  statusTag: { fontSize: typography.sizes.xs, color: colors.textSecondary },
});
