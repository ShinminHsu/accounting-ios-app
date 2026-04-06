import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import {
  createAccount, createCreditCardSettings,
  SUPPORTED_CURRENCIES, ACCOUNT_TYPE_LABELS, AccountWithBalance,
} from '../../lib/accounts';
import { AccountType } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  visible: boolean;
  bankAccounts: AccountWithBalance[];
  onClose: () => void;
  onCreated: () => void;
};

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'e_payment', 'credit_card', 'investment'];

export function CreateAccountModal({ visible, bankAccounts, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState('TWD');
  const [initialBalance, setInitialBalance] = useState('0');
  const [createdAccountId, setCreatedAccountId] = useState('');

  // Credit card step 2
  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('15');
  const [autoDebitId, setAutoDebitId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep(1); setName(''); setType('bank'); setCurrency('TWD');
    setInitialBalance('0'); setCreatedAccountId('');
    setClosingDay('25'); setDueDay('15'); setAutoDebitId('');
  }

  async function handleStep1() {
    if (!name.trim()) { Alert.alert('錯誤', '請輸入帳戶名稱'); return; }
    const balance = parseFloat(initialBalance) || 0;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { data, error } = await createAccount(session.user.id, name.trim(), type, currency, balance);
    setSaving(false);
    if (error || !data) { Alert.alert('失敗', error ?? '建立失敗'); return; }

    if (type === 'credit_card') {
      setCreatedAccountId(data.id);
      setStep(2);
    } else {
      reset(); onCreated();
    }
  }

  async function handleStep2() {
    const closing = parseInt(closingDay);
    const due = parseInt(dueDay);
    if (isNaN(closing) || closing < 1 || closing > 31) { Alert.alert('錯誤', '請輸入有效的結帳日（1–31）'); return; }
    if (isNaN(due) || due < 1 || due > 31) { Alert.alert('錯誤', '請輸入有效的繳費日（1–31）'); return; }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { error } = await createCreditCardSettings(
      createdAccountId, session.user.id, closing, due,
      autoDebitId || null
    );
    setSaving(false);
    if (error) { Alert.alert('失敗', error); return; }
    reset(); onCreated();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{step === 1 ? '新增帳戶' : '信用卡設定'}</Text>

          {step === 1 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>帳戶名稱</Text>
              <TextInput style={styles.input} placeholder="例：玉山銀行" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />

              <Text style={styles.label}>帳戶類型</Text>
              <View style={styles.typeGrid}>
                {ACCOUNT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>幣別</Text>
              <View style={styles.typeGrid}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.typeBtn, currency === c && styles.typeBtnActive]}
                    onPress={() => setCurrency(c)}
                  >
                    <Text style={[styles.typeBtnText, currency === c && styles.typeBtnTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>初始餘額</Text>
              <TextInput style={styles.input} value={initialBalance} onChangeText={setInitialBalance} keyboardType="numeric" />
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>帳單結帳日（每月幾號）</Text>
              <TextInput style={styles.input} value={closingDay} onChangeText={setClosingDay} keyboardType="number-pad" maxLength={2} />

              <Text style={styles.label}>繳費截止日（每月幾號）</Text>
              <TextInput style={styles.input} value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" maxLength={2} />

              <Text style={styles.label}>自動扣款帳戶（選填）</Text>
              {bankAccounts.length === 0 ? (
                <Text style={styles.hint}>尚無銀行帳戶可選</Text>
              ) : (
                bankAccounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.typeBtn, autoDebitId === acc.id && styles.typeBtnActive]}
                    onPress={() => setAutoDebitId(autoDebitId === acc.id ? '' : acc.id)}
                  >
                    <Text style={[styles.typeBtnText, autoDebitId === acc.id && styles.typeBtnTextActive]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={step === 1 ? handleStep1 : handleStep2}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.saveText}>{step === 1 && type === 'credit_card' ? '下一步' : '儲存'}</Text>}
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
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.sizes.md, color: colors.text, backgroundColor: colors.surfaceAlt },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { fontSize: typography.sizes.sm, color: colors.text },
  typeBtnTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
  hint: { fontSize: typography.sizes.sm, color: colors.textSecondary, paddingVertical: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: typography.sizes.md },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});
