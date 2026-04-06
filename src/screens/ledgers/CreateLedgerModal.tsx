import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { createLedger } from '../../lib/ledgers';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateLedgerModal({ visible, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(''); setStartDate(null); setEndDate(null);
  }

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('錯誤', '請輸入帳本名稱'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await createLedger(
        session.user.id,
        name.trim(),
        startDate ? startDate.toISOString().slice(0, 10) : null,
        endDate ? endDate.toISOString().slice(0, 10) : null,
      );
      if (error) { Alert.alert('失敗', error); return; }
      reset();
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>建立共享帳本</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              {saving ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.saveText}>建立</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.label}>帳本名稱</Text>
            <TextInput
              style={styles.input}
              placeholder="例：旅遊、婚禮"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={[styles.label, { marginTop: spacing.lg }]}>開始日期（選填）</Text>
            <TouchableOpacity style={styles.datePill} onPress={() => setShowStartPicker(true)}>
              <CalendarDays size={14} color={colors.textSecondary} />
              <Text style={styles.datePillText}>
                {startDate ? startDate.toLocaleDateString('zh-TW') : '選擇日期'}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => { setShowStartPicker(false); if (d) setStartDate(d); }}
              />
            )}

            <Text style={[styles.label, { marginTop: spacing.lg }]}>結束日期（選填）</Text>
            <TouchableOpacity style={styles.datePill} onPress={() => setShowEndPicker(true)}>
              <CalendarDays size={14} color={colors.textSecondary} />
              <Text style={styles.datePillText}>
                {endDate ? endDate.toLocaleDateString('zh-TW') : '選擇日期'}
              </Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => { setShowEndPicker(false); if (d) setEndDate(d); }}
              />
            )}
          </View>
        </KeyboardAvoidingView>
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
  body: { padding: spacing.md },
  label: {
    fontSize: typography.sizes.xs, color: colors.textSecondary,
    fontWeight: typography.weights.medium, textTransform: 'uppercase',
    letterSpacing: 0.4, marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: typography.sizes.md, color: colors.text,
    backgroundColor: colors.surface,
  },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, alignSelf: 'flex-start',
  },
  datePillText: { fontSize: typography.sizes.sm, color: colors.text },
});
