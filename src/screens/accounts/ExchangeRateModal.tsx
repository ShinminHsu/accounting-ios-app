import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { upsertExchangeRate, SUPPORTED_CURRENCIES } from '../../lib/accounts';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  visible: boolean;
  currentRates: Record<string, number>;
  onClose: () => void;
  onSaved: () => void;
};

export function ExchangeRateModal({ visible, currentRates, onClose, onSaved }: Props) {
  const FOREIGN = SUPPORTED_CURRENCIES.filter((c) => c !== 'TWD');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const c of FOREIGN) {
      initial[c] = currentRates[c]?.toString() ?? '';
    }
    setValues(initial);
  }, [currentRates, visible]);

  async function handleSave() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSaving(true);

    for (const currency of FOREIGN) {
      const raw = values[currency];
      if (!raw || raw.trim() === '') continue;
      const rate = parseFloat(raw);
      if (isNaN(rate) || rate <= 0) {
        Alert.alert('錯誤', `${currency} 匯率無效`);
        setSaving(false);
        return;
      }
      const { error } = await upsertExchangeRate(session.user.id, currency, rate);
      if (error) { Alert.alert('失敗', error); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>匯率設定</Text>
          <Text style={styles.subtitle}>1 單位外幣 = 多少 TWD</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {FOREIGN.map((currency) => (
              <View key={currency} style={styles.row}>
                <Text style={styles.currencyLabel}>{currency}</Text>
                <TextInput
                  style={styles.rateInput}
                  placeholder="未設定"
                  placeholderTextColor={colors.textSecondary}
                  value={values[currency] ?? ''}
                  onChangeText={(v) => setValues((prev) => ({ ...prev, [currency]: v }))}
                  keyboardType="numeric"
                />
                <Text style={styles.unit}>TWD</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.saveText}>儲存</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  card: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '70%' },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  currencyLabel: { width: 48, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  rateInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: typography.sizes.md, color: colors.text, backgroundColor: colors.surfaceAlt, textAlign: 'right' },
  unit: { width: 36, fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'right', marginLeft: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: typography.sizes.md },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});
