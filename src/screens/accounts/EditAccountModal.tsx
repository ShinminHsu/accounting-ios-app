import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  updateAccount, fetchCreditCardSettings,
  SUPPORTED_CURRENCIES, AccountWithBalance,
} from '../../lib/accounts';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  visible: boolean;
  account: AccountWithBalance | null;
  bankAccounts: AccountWithBalance[];
  onClose: () => void;
  onSaved: () => void;
};

export function EditAccountModal({ visible, account, bankAccounts, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [autoDebitId, setAutoDebitId] = useState<string>('');
  const [loadingCC, setLoadingCC] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !account) return;
    setName(account.name);
    setCurrency(account.currency);
    setClosingDay('');
    setDueDay('');
    setAutoDebitId('');
    if (account.type === 'credit_card') {
      setLoadingCC(true);
      fetchCreditCardSettings(account.id).then((settings) => {
        if (settings) {
          setClosingDay(String(settings.statement_closing_day));
          setDueDay(String(settings.payment_due_day));
          setAutoDebitId(settings.auto_debit_account_id ?? '');
        }
        setLoadingCC(false);
      });
    }
  }, [visible, account]);

  async function handleSave() {
    if (!account) return;
    if (!name.trim()) {
      Alert.alert('錯誤', '請輸入帳戶名稱');
      return;
    }

    const fields: Parameters<typeof updateAccount>[1] = {
      name: name.trim(),
      currency,
    };

    if (account.type === 'credit_card') {
      const closing = parseInt(closingDay, 10);
      const due = parseInt(dueDay, 10);
      if (isNaN(closing) || closing < 1 || closing > 31) {
        Alert.alert('錯誤', '請輸入有效日期（1–31）');
        return;
      }
      if (isNaN(due) || due < 1 || due > 31) {
        Alert.alert('錯誤', '請輸入有效日期（1–31）');
        return;
      }
      fields.closing_day = closing;
      fields.due_day = due;
      fields.auto_debit_account_id = autoDebitId || null;
    }

    setSaving(true);
    const { error } = await updateAccount(account.id, fields);
    setSaving(false);

    if (error) {
      Alert.alert('失敗', error);
      return;
    }
    onSaved();
  }

  if (!account) return null;
  const isCC = account.type === 'credit_card';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>編輯帳戶</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>帳戶名稱</Text>
              <TextInput
                style={styles.input}
                placeholder="帳戶名稱"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>幣別</Text>
              <View style={styles.chipRow}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, currency === c && styles.chipActive]}
                    onPress={() => setCurrency(c)}
                  >
                    <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {isCC && (
                loadingCC ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
                ) : (
                  <>
                    <Text style={styles.sectionLabel}>信用卡設定</Text>

                    <Text style={styles.label}>帳單結帳日（每月幾號）</Text>
                    <TextInput
                      style={styles.input}
                      value={closingDay}
                      onChangeText={setClosingDay}
                      keyboardType="number-pad"
                      maxLength={2}
                    />

                    <Text style={styles.label}>繳費截止日（每月幾號）</Text>
                    <TextInput
                      style={styles.input}
                      value={dueDay}
                      onChangeText={setDueDay}
                      keyboardType="number-pad"
                      maxLength={2}
                    />

                    <Text style={styles.label}>自動扣款帳戶（選填）</Text>
                    {bankAccounts.length === 0 ? (
                      <Text style={styles.hint}>尚無銀行帳戶可選</Text>
                    ) : (
                      bankAccounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[styles.chip, autoDebitId === acc.id && styles.chipActive]}
                          onPress={() => setAutoDebitId(autoDebitId === acc.id ? '' : acc.id)}
                        >
                          <Text style={[styles.chipText, autoDebitId === acc.id && styles.chipTextActive]}>
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )
              )}
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  card: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '85%' },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.md },
  label: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  sectionLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.sizes.md, color: colors.text, backgroundColor: colors.surfaceAlt },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sizes.sm, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
  hint: { fontSize: typography.sizes.sm, color: colors.textSecondary, paddingVertical: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: typography.sizes.md },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});
