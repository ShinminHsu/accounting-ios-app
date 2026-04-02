import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import {
  createRewardRule, updateRewardRule,
} from '../../lib/rewards';
import { fetchCategories, CategoryWithChildren } from '../../lib/categories';
import { fetchAccounts, AccountWithBalance } from '../../lib/accounts';
import { CreditCardRewardRule, RewardRuleType, RewardType } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';

const RULE_TYPE_LABELS: Record<RewardRuleType, string> = {
  category: '分類',
  merchant: '特定商家',
};

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  cashback_offset: '帳單折抵',
  points: '點數',
  account_deposit: '帳戶回饋',
};

type Props = {
  creditCardId: string;
  editingRule: CreditCardRewardRule | null;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function CreateRewardRuleModal({
  creditCardId, editingRule, visible, onClose, onSaved,
}: Props) {
  const [ruleType, setRuleType] = useState<RewardRuleType>('category');
  const [rewardType, setRewardType] = useState<RewardType>('cashback_offset');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [rewardRate, setRewardRate] = useState('');
  const [monthlyCap, setMonthlyCap] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [pointsRate, setPointsRate] = useState('');
  const [depositAccountId, setDepositAccountId] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (editingRule) {
      setRuleType(editingRule.rule_type);
      setRewardType(editingRule.reward_type);
      setSelectedCategoryId(editingRule.category_id);
      setMerchantName(editingRule.merchant_name ?? '');
      setRewardRate(String(editingRule.reward_rate));
      setMonthlyCap(editingRule.monthly_cap != null ? String(editingRule.monthly_cap) : '');
      setMinSpend(editingRule.min_spend_threshold != null ? String(editingRule.min_spend_threshold) : '');
      setPointsRate(editingRule.points_conversion_rate != null ? String(editingRule.points_conversion_rate) : '');
      setDepositAccountId(editingRule.deposit_account_id);
    } else {
      setRuleType('category'); setRewardType('cashback_offset');
      setSelectedCategoryId(null); setMerchantName('');
      setRewardRate(''); setMonthlyCap(''); setMinSpend('');
      setPointsRate(''); setDepositAccountId(null);
    }

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [cats, accs] = await Promise.all([
        fetchCategories(session.user.id),
        fetchAccounts(session.user.id),
      ]);
      setCategories(cats);
      setAccounts(accs.filter((a) => a.type !== 'credit_card'));
    })();
  }, [visible, editingRule]);

  async function handleSave() {
    const rate = parseFloat(rewardRate);
    if (!rate || rate <= 0 || rate > 100) {
      Alert.alert('錯誤', '請輸入有效回饋率（0–100%）'); return;
    }
    if (ruleType === 'category' && !selectedCategoryId) {
      Alert.alert('錯誤', '請選擇分類'); return;
    }
    if (ruleType === 'merchant' && !merchantName.trim()) {
      Alert.alert('錯誤', '請輸入商家名稱'); return;
    }
    if (rewardType === 'account_deposit' && !depositAccountId) {
      Alert.alert('錯誤', '帳戶回饋需選擇入帳帳戶'); return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setSaving(true);
    const input = {
      ruleType,
      categoryId: ruleType === 'category' ? selectedCategoryId : null,
      merchantName: ruleType === 'merchant' ? merchantName.trim() : null,
      rewardRate: rate,
      rewardType,
      monthlyCap: monthlyCap ? parseFloat(monthlyCap) : null,
      minSpendThreshold: minSpend ? parseFloat(minSpend) : null,
      depositAccountId: rewardType === 'account_deposit' ? depositAccountId : null,
      pointsConversionRate: rewardType === 'points' && pointsRate ? parseFloat(pointsRate) : null,
    };

    const { error } = editingRule
      ? await updateRewardRule(editingRule.id, input)
      : await createRewardRule(session.user.id, creditCardId, input);

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
          <Text style={styles.title}>{editingRule ? '編輯回饋規則' : '新增回饋規則'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.saveText}>儲存</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>規則類型</Text>
          <View style={styles.chipRow}>
            {(Object.keys(RULE_TYPE_LABELS) as RewardRuleType[]).map((rt) => (
              <TouchableOpacity
                key={rt}
                style={[styles.chip, ruleType === rt && styles.chipActive]}
                onPress={() => setRuleType(rt)}
              >
                <Text style={[styles.chipText, ruleType === rt && styles.chipTextActive]}>
                  {RULE_TYPE_LABELS[rt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {ruleType === 'merchant' ? (
            <>
              <Text style={styles.label}>商家名稱</Text>
              <TextInput
                style={styles.input}
                placeholder="例如：全家、好市多"
                placeholderTextColor={colors.textSecondary}
                value={merchantName}
                onChangeText={setMerchantName}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          <Text style={styles.label}>回饋率（%）</Text>
          <TextInput
            style={styles.input}
            placeholder="例如：3"
            placeholderTextColor={colors.textSecondary}
            value={rewardRate}
            onChangeText={setRewardRate}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>回饋類型</Text>
          <View style={styles.chipRow}>
            {(Object.keys(REWARD_TYPE_LABELS) as RewardType[]).map((rwt) => (
              <TouchableOpacity
                key={rwt}
                style={[styles.chip, rewardType === rwt && styles.chipActive]}
                onPress={() => setRewardType(rwt)}
              >
                <Text style={[styles.chipText, rewardType === rwt && styles.chipTextActive]}>
                  {REWARD_TYPE_LABELS[rwt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {rewardType === 'points' && (
            <>
              <Text style={styles.label}>1 點 = TWD（選填，用於換算顯示）</Text>
              <TextInput
                style={styles.input}
                placeholder="例如：0.5"
                placeholderTextColor={colors.textSecondary}
                value={pointsRate}
                onChangeText={setPointsRate}
                keyboardType="decimal-pad"
              />
            </>
          )}

          {rewardType === 'account_deposit' && (
            <>
              <Text style={styles.label}>入帳帳戶</Text>
              <View style={styles.chipRow}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.chip, depositAccountId === acc.id && styles.chipActive]}
                    onPress={() => setDepositAccountId(acc.id)}
                  >
                    <Text style={[styles.chipText, depositAccountId === acc.id && styles.chipTextActive]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>每月上限（選填）</Text>
          <TextInput
            style={styles.input}
            placeholder="無限制則留空"
            placeholderTextColor={colors.textSecondary}
            value={monthlyCap}
            onChangeText={setMonthlyCap}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>單筆最低消費門檻（選填）</Text>
          <TextInput
            style={styles.input}
            placeholder="無門檻則留空"
            placeholderTextColor={colors.textSecondary}
            value={minSpend}
            onChangeText={setMinSpend}
            keyboardType="decimal-pad"
          />
        </ScrollView>
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
});
