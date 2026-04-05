import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { searchTransactions, TransactionWithRefs } from '../../lib/transactions';
import { CategoryIcon } from '../../components/CategoryIcon';
import { colors, typography, spacing, radius } from '../../theme';

const PAYER_LABELS: Record<string, string> = {
  self: '',
  paid_by_other: '別人付',
  paid_for_other: '代付',
};

export function TransactionSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TransactionWithRefs[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const rows = await searchTransactions(session.user.id, q.trim());
      setResults(rows);
    }
    setSearched(true);
    setLoading(false);
  }, []);

  function onChangeText(text: string) {
    setQuery(text);
    if (!text.trim()) { setResults([]); setSearched(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="搜尋名稱、備註、分類..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={onChangeText}
          onSubmitEditing={() => handleSearch(query)}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch(query)}>
          <Text style={styles.searchBtnText}>搜尋</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : searched && results.length === 0 ? (
        <View style={styles.center}><Text style={styles.empty}>無符合結果</Text></View>
      ) : !searched ? (
        <View style={styles.center}><Text style={styles.hint}>輸入關鍵字搜尋所有記帳記錄</Text></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const amountColor = item.is_income ? colors.income : colors.expense;
            const sign = item.is_income ? '+' : '-';
            const payerTag = PAYER_LABELS[item.payer_type];
            return (
              <View style={styles.row}>
                <CategoryIcon
                  iconKey={item.category_emoji}
                  size={16}
                  color={colors.primary}
                  bgColor={colors.primary + '14'}
                  containerSize={36}
                />
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name ?? item.category_name ?? '未分類'}
                    {payerTag ? <Text style={styles.payerTag}> · {payerTag}</Text> : null}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {[item.date, item.account_name, item.notes].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={[styles.amount, { color: amountColor }]}>
                  {sign}{item.amount.toLocaleString('zh-TW')}
                </Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  searchBar: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
    backgroundColor: colors.background,
  },
  searchBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  list: { padding: spacing.sm, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: 2,
  },
  info: { flex: 1, marginLeft: spacing.sm, marginRight: spacing.sm },
  name: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  payerTag: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  sub: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  amount: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  empty: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  hint: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center' },
});
