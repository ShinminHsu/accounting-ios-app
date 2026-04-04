import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { fetchActiveProjects, ProjectWithBudgets, CategoryBudget } from '../lib/projects';
import { CreateProjectModal } from './projects/CreateProjectModal';
import { colors, typography, spacing, radius, shadows } from '../theme';

export function ProjectsScreen() {
  const [projects, setProjects] = useState<ProjectWithBudgets[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const list = await fetchActiveProjects(session.user.id);
    setProjects(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {projects.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>尚無專案</Text>
            <Text style={styles.emptyHint}>點擊右下角「＋」建立專案</Text>
          </View>
        ) : (
          projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
        <Plus size={24} color={colors.white} strokeWidth={2.5} />
      </TouchableOpacity>

      <CreateProjectModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </SafeAreaView>
  );
}

// ── Project card ──────────────────────────────────────────────────────────

function ProjectCard({
  project, expanded, onToggle,
}: {
  project: ProjectWithBudgets;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { total_budget, total_spent } = project;
  const utilPct = total_budget > 0 ? Math.min(total_spent / total_budget, 1) : 0;
  const overBudget = total_budget > 0 && total_spent > total_budget;
  const periodLabel = project.type === 'periodic'
    ? (project.interval === 'monthly' ? '本月' : '本年')
    : `${project.start_date ?? ''} — ${project.end_date ?? ''}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onToggle} activeOpacity={0.8}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{project.name}</Text>
          <Text style={styles.cardPeriod}>{periodLabel}</Text>
        </View>
        {overBudget && <Text style={styles.overBudgetBadge}>超支</Text>}
        <Text style={styles.expandArrow}>{expanded ? '▾' : '▸'}</Text>
      </View>

      {/* Overall utilization bar */}
      {total_budget > 0 ? (
        <View style={styles.barContainer}>
          <View
            style={[
              styles.barFill,
              { width: `${utilPct * 100}%` as any },
              overBudget && styles.barFillOver,
            ]}
          />
        </View>
      ) : null}
      <Text style={styles.cardTotals}>
        {total_budget > 0
          ? `NT$ ${total_spent.toLocaleString('zh-TW')} / ${total_budget.toLocaleString('zh-TW')}`
          : `NT$ ${total_spent.toLocaleString('zh-TW')} 已花費（無預算上限）`}
      </Text>

      {/* Expanded: per-category breakdown */}
      {expanded && project.category_budgets.map((cb) => (
        <CategoryBudgetRow key={cb.id} budget={cb} />
      ))}
    </TouchableOpacity>
  );
}

function CategoryBudgetRow({ budget }: { budget: CategoryBudget }) {
  const { budget_amount, spent_amount } = budget;
  const pct = budget_amount > 0 ? Math.min(spent_amount / budget_amount, 1) : 0;
  const over = budget_amount > 0 && spent_amount > budget_amount;

  return (
    <View style={styles.catRow}>
      <Text style={styles.catEmoji}>{budget.category_emoji ?? '📦'}</Text>
      <View style={{ flex: 1 }}>
        <View style={styles.catRowHeader}>
          <Text style={styles.catName}>{budget.category_name ?? '未知分類'}</Text>
          {over && <Text style={styles.overBudgetTag}>超支</Text>}
        </View>
        {budget_amount > 0 ? (
          <>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct * 100}%` as any },
                  over && styles.barFillOver,
                ]}
              />
            </View>
            <Text style={styles.catAmounts}>
              {spent_amount.toLocaleString('zh-TW')} / {budget_amount.toLocaleString('zh-TW')}
            </Text>
          </>
        ) : (
          <Text style={styles.catAmounts}>{spent_amount.toLocaleString('zh-TW')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.lg,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    ...shadows.lg, shadowColor: colors.primary,
  },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.xs },
  emptyHint: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  cardName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  cardPeriod: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  overBudgetBadge: { fontSize: typography.sizes.xs, color: colors.white, backgroundColor: colors.expense, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2, marginRight: spacing.xs, overflow: 'hidden' },
  expandArrow: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginLeft: spacing.xs },
  barContainer: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3, marginVertical: spacing.xs, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  barFillOver: { backgroundColor: colors.expense },
  cardTotals: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  catRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.xs, paddingLeft: spacing.xs, borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: spacing.xs },
  catEmoji: { fontSize: typography.sizes.md, marginRight: spacing.sm, marginTop: 2 },
  catRowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  catName: { fontSize: typography.sizes.sm, color: colors.text, fontWeight: typography.weights.medium, flex: 1 },
  overBudgetTag: { fontSize: 10, color: colors.expense, marginLeft: spacing.xs },
  catAmounts: { fontSize: typography.sizes.xs, color: colors.textSecondary },
});
