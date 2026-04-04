import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Polyline, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import {
  PeriodPreset, computePeriodDates, computeCustomPrevPeriod,
  fetchSpendingSummary, fetchCategoryDrillDown,
  fetchTrendData, fetchAccountBalanceHistory,
  SpendingSummary, DrillDownResult, TrendData, BalancePoint,
} from '../../lib/reports';
import { fetchActiveProjects, ProjectWithBudgets } from '../../lib/projects';
import { fetchAccounts, fetchExchangeRates, AccountWithBalance } from '../../lib/accounts';
import { colors, typography, spacing, radius } from '../../theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'spending' | 'trend' | 'projects' | 'balance';

type PeriodConfig =
  | { mode: 'preset'; preset: PeriodPreset }
  | { mode: 'custom'; start: string; end: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolvePeriod(cfg: PeriodConfig): {
  start: string; end: string; prevStart: string; prevEnd: string;
} {
  if (cfg.mode === 'preset') return computePeriodDates(cfg.preset);
  const { prevStart, prevEnd } = computeCustomPrevPeriod(cfg.start, cfg.end);
  return { start: cfg.start, end: cfg.end, prevStart, prevEnd };
}

function fmtCurrency(n: number): string {
  return 'NT$ ' + Math.round(n).toLocaleString('zh-TW');
}

function fmtPct(a: number, b: number): string {
  if (b === 0) return '—';
  const pct = ((a - b) / b) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

// ── Period selector ───────────────────────────────────────────────────────────

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'this_week', label: '本週' },
  { id: 'this_month', label: '本月' },
  { id: 'this_quarter', label: '本季' },
  { id: 'this_year', label: '今年' },
  { id: 'last_month', label: '上月' },
  { id: 'last_year', label: '去年' },
];

function PeriodSelector({
  config, onChange,
}: {
  config: PeriodConfig;
  onChange: (cfg: PeriodConfig) => void;
}) {
  const [showCustom, setShowCustom] = useState(config.mode === 'custom');
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [tempStart, setTempStart] = useState(
    config.mode === 'custom' ? new Date(config.start) : new Date()
  );
  const [tempEnd, setTempEnd] = useState(
    config.mode === 'custom' ? new Date(config.end) : new Date()
  );

  function selectPreset(preset: PeriodPreset) {
    setShowCustom(false);
    onChange({ mode: 'preset', preset });
  }

  function applyCustom() {
    onChange({ mode: 'custom', start: toDateStr(tempStart), end: toDateStr(tempEnd) });
  }

  return (
    <View style={ps.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ps.chipRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              ps.chip,
              config.mode === 'preset' && config.preset === p.id && ps.chipActive,
            ]}
            onPress={() => selectPreset(p.id)}
          >
            <Text
              style={[
                ps.chipText,
                config.mode === 'preset' && config.preset === p.id && ps.chipTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[ps.chip, showCustom && ps.chipActive]}
          onPress={() => {
            setShowCustom(true);
            onChange({ mode: 'custom', start: toDateStr(tempStart), end: toDateStr(tempEnd) });
          }}
        >
          <Text style={[ps.chipText, showCustom && ps.chipTextActive]}>自訂</Text>
        </TouchableOpacity>
      </ScrollView>

      {showCustom && (
        <View style={ps.customRow}>
          <TouchableOpacity style={ps.dateBtn} onPress={() => setPickerTarget('start')}>
            <Text style={ps.dateBtnLabel}>開始</Text>
            <Text style={ps.dateBtnValue}>{toDateStr(tempStart)}</Text>
          </TouchableOpacity>
          <Text style={ps.dateSep}>→</Text>
          <TouchableOpacity style={ps.dateBtn} onPress={() => setPickerTarget('end')}>
            <Text style={ps.dateBtnLabel}>結束</Text>
            <Text style={ps.dateBtnValue}>{toDateStr(tempEnd)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ps.applyBtn} onPress={applyCustom}>
            <Text style={ps.applyBtnText}>套用</Text>
          </TouchableOpacity>
        </View>
      )}

      {pickerTarget !== null && (
        <DateTimePicker
          value={pickerTarget === 'start' ? tempStart : tempEnd}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            if (date) {
              if (pickerTarget === 'start') setTempStart(date);
              else setTempEnd(date);
            }
            if (Platform.OS !== 'ios') setPickerTarget(null);
          }}
        />
      )}
      {pickerTarget !== null && Platform.OS === 'ios' && (
        <TouchableOpacity onPress={() => setPickerTarget(null)} style={ps.doneBtn}>
          <Text style={ps.doneBtnText}>完成</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const ps = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  chipRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  dateBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  dateBtnLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  dateBtnValue: { fontSize: typography.sizes.sm, color: colors.text, fontWeight: typography.weights.medium },
  dateSep: { fontSize: typography.sizes.md, color: colors.textSecondary },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  applyBtnText: { color: colors.white, fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm },
  doneBtn: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  doneBtnText: { color: colors.primary, fontWeight: typography.weights.semibold },
});

// ── Spending tab ──────────────────────────────────────────────────────────────

function SpendingTab({
  userId, start, end, prevStart, prevEnd,
}: {
  userId: string; start: string; end: string; prevStart: string; prevEnd: string;
}) {
  const [data, setData] = useState<SpendingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchSpendingSummary(userId, start, end, prevStart, prevEnd)
      .then((d) => { setData(d); setLoading(false); });
  }, [userId, start, end, prevStart, prevEnd]);

  if (loading) return <View style={tab.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!data) return null;

  const diff = fmtPct(data.total, data.prevTotal);
  const diffUp = data.total >= data.prevTotal;

  return (
    <ScrollView contentContainerStyle={tab.scroll}>
      {/* Summary header */}
      <View style={tab.summaryCard}>
        <Text style={tab.summaryLabel}>期間總支出</Text>
        <Text style={tab.summaryAmount}>{fmtCurrency(data.total)}</Text>
        <Text style={[tab.summaryCompare, { color: diffUp ? colors.expense : colors.income }]}>
          較上期 {diff}（上期 {fmtCurrency(data.prevTotal)}）
        </Text>
      </View>

      {data.categories.length === 0 ? (
        <View style={tab.empty}>
          <Text style={tab.emptyText}>此期間無支出記錄</Text>
        </View>
      ) : (
        data.categories.map((cat) => (
          <TouchableOpacity
            key={cat.categoryId}
            style={tab.catRow}
            onPress={() => setDrillDown({ id: cat.categoryId, name: cat.categoryName })}
            activeOpacity={0.7}
          >
            <View style={tab.catHeader}>
              <Text style={tab.catEmoji}>{cat.categoryEmoji ?? '📦'}</Text>
              <Text style={tab.catName}>{cat.categoryName}</Text>
              <Text style={tab.catAmount}>{fmtCurrency(cat.amount)}</Text>
              <Text style={tab.catPct}>{cat.percentage.toFixed(1)}%</Text>
            </View>
            <View style={tab.barBg}>
              <View style={[tab.barFill, { width: `${Math.min(cat.percentage, 100)}%` as any }]} />
            </View>
          </TouchableOpacity>
        ))
      )}

      {drillDown && (
        <DrillDownModal
          userId={userId}
          categoryId={drillDown.id}
          categoryName={drillDown.name}
          start={start}
          end={end}
          onClose={() => setDrillDown(null)}
        />
      )}
    </ScrollView>
  );
}

// ── Drill-down modal ──────────────────────────────────────────────────────────

function DrillDownModal({
  userId, categoryId, categoryName, start, end, onClose,
}: {
  userId: string; categoryId: string; categoryName: string;
  start: string; end: string; onClose: () => void;
}) {
  const [data, setData] = useState<DrillDownResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryDrillDown(userId, categoryId, start, end)
      .then((d) => { setData(d); setLoading(false); });
  }, [userId, categoryId, start, end]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={dd.container} edges={['top', 'bottom']}>
        <View style={dd.header}>
          <TouchableOpacity onPress={onClose} style={dd.backBtn}>
            <Text style={dd.backText}>‹ 返回</Text>
          </TouchableOpacity>
          <Text style={dd.title}>{categoryName}</Text>
          <View style={dd.backBtn} />
        </View>

        {loading ? (
          <View style={tab.center}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <ScrollView contentContainerStyle={tab.scroll}>
            {(data?.subcategories ?? []).length > 0 && (
              <>
                <Text style={dd.sectionTitle}>子分類</Text>
                {data!.subcategories.map((s) => (
                  <View key={s.id} style={dd.row}>
                    <Text style={dd.rowEmoji}>{s.emoji ?? '📦'}</Text>
                    <Text style={dd.rowName}>{s.name}</Text>
                    <Text style={dd.rowAmount}>{fmtCurrency(s.amount)}</Text>
                  </View>
                ))}
              </>
            )}

            <Text style={dd.sectionTitle}>交易記錄</Text>
            {(data?.transactions ?? []).length === 0 ? (
              <Text style={tab.emptyText}>無交易記錄</Text>
            ) : (
              data!.transactions.map((t) => (
                <View key={t.id} style={dd.txRow}>
                  <View style={dd.txLeft}>
                    <Text style={dd.txDate}>{t.date}</Text>
                    <Text style={dd.txNotes} numberOfLines={1}>
                      {t.notes ?? t.subcategoryName ?? '—'}
                    </Text>
                    {t.accountName && (
                      <Text style={dd.txAccount}>{t.accountName}</Text>
                    )}
                  </View>
                  <Text style={dd.txAmount}>{fmtCurrency(t.amount)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const dd = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  title: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  backBtn: { width: 64 },
  backText: { fontSize: typography.sizes.md, color: colors.primary },
  sectionTitle: {
    fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold,
    color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  rowEmoji: { fontSize: typography.sizes.lg, marginRight: spacing.sm, width: 28 },
  rowName: { flex: 1, fontSize: typography.sizes.md, color: colors.text },
  rowAmount: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.expense },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  txLeft: { flex: 1 },
  txDate: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  txNotes: { fontSize: typography.sizes.sm, color: colors.text, marginTop: 2 },
  txAccount: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  txAmount: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.expense },
});

// ── Trend tab ─────────────────────────────────────────────────────────────────

const CHART_HEIGHT = 140;
const CHART_WIDTH = Dimensions.get('window').width - spacing.md * 2;
const BAR_MIN_WIDTH = 28;

function TrendTab({ userId, start, end }: { userId: string; start: string; end: string }) {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchTrendData(userId, start, end)
      .then((d) => { setData(d); setLoading(false); });
  }, [userId, start, end]);

  if (loading) return <View style={tab.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!data) return null;

  const maxAmount = Math.max(...data.bars.map((b) => b.amount), 1);

  return (
    <ScrollView contentContainerStyle={tab.scroll}>
      {/* Net cash flow */}
      <View style={trend.cashFlowCard}>
        <Text style={trend.cashFlowLabel}>淨現金流</Text>
        <Text style={[
          trend.cashFlowAmount,
          { color: data.netCashFlow >= 0 ? colors.income : colors.expense },
        ]}>
          {data.netCashFlow >= 0 ? '+' : ''}{fmtCurrency(data.netCashFlow)}
        </Text>
      </View>

      {/* Bar chart */}
      <View style={trend.chartCard}>
        <Text style={trend.chartTitle}>
          支出趨勢（{data.useWeeklyBars ? '每週' : '每月'}）
        </Text>
        {data.bars.length === 0 ? (
          <Text style={tab.emptyText}>此期間無支出</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[trend.barsContainer, { minWidth: CHART_WIDTH }]}>
              <View style={trend.barsRow}>
                {data.bars.map((bar, i) => {
                  const heightPct = bar.amount / maxAmount;
                  const barH = Math.max(heightPct * CHART_HEIGHT, 2);
                  return (
                    <View key={i} style={[trend.barWrapper, { minWidth: BAR_MIN_WIDTH }]}>
                      <Text style={trend.barValue}>
                        {bar.amount >= 10000 ? (bar.amount / 1000).toFixed(0) + 'K' : ''}
                      </Text>
                      <View style={trend.barColumn}>
                        <View style={[trend.bar, { height: barH }]} />
                      </View>
                      <Text style={trend.barLabel}>{bar.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Top 5 categories */}
      {data.top5Categories.length > 0 && (
        <View style={trend.top5Card}>
          <Text style={trend.chartTitle}>前五大支出類別</Text>
          {data.top5Categories.map((cat, i) => (
            <View key={i} style={trend.top5Row}>
              <Text style={trend.top5Rank}>{i + 1}</Text>
              <Text style={trend.top5Emoji}>{cat.emoji ?? '📦'}</Text>
              <Text style={trend.top5Name}>{cat.name || '（未分類）'}</Text>
              <Text style={trend.top5Amount}>{fmtCurrency(cat.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const trend = StyleSheet.create({
  cashFlowCard: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  cashFlowLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  cashFlowAmount: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, marginTop: 4 },
  chartCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chartTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  barsContainer: { paddingBottom: spacing.xs },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 48 },
  barWrapper: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  barValue: { fontSize: 9, color: colors.textSecondary, marginBottom: 2 },
  barColumn: { height: CHART_HEIGHT, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', backgroundColor: colors.primary, borderRadius: 3, minWidth: 12 },
  barLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 4 },
  top5Card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  top5Row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  top5Rank: { width: 20, fontSize: typography.sizes.sm, color: colors.textSecondary, fontWeight: typography.weights.bold },
  top5Emoji: { fontSize: typography.sizes.lg, marginRight: spacing.sm, width: 28 },
  top5Name: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  top5Amount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.expense },
});

// ── Projects tab ──────────────────────────────────────────────────────────────

function ProjectsTab({ userId }: { userId: string }) {
  const [projects, setProjects] = useState<ProjectWithBudgets[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchActiveProjects(userId).then((data) => { setProjects(data); setLoading(false); });
  }, [userId]);

  if (loading) return <View style={tab.center}><ActivityIndicator color={colors.primary} /></View>;

  if (projects.length === 0) {
    return (
      <View style={tab.empty}>
        <Text style={tab.emptyText}>無進行中的專案</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={tab.scroll}>
      {projects.map((p) => {
        const utilPct = p.total_budget > 0 ? p.total_spent / p.total_budget : 0;
        const overBudget = p.total_budget > 0 && p.total_spent > p.total_budget;
        const remaining = p.total_budget - p.total_spent;
        const expanded = expandedId === p.id;

        return (
          <View key={p.id} style={proj.card}>
            <TouchableOpacity
              style={proj.cardHeader}
              onPress={() => setExpandedId(expanded ? null : p.id)}
              activeOpacity={0.7}
            >
              <Text style={proj.projName}>{p.name}</Text>
              <Text style={[proj.projUtil, overBudget && proj.overBudget]}>
                {(utilPct * 100).toFixed(0)}%
              </Text>
              <Text style={proj.chevron}>{expanded ? '▾' : '›'}</Text>
            </TouchableOpacity>

            <View style={proj.barBg}>
              <View
                style={[
                  proj.barFill,
                  { width: `${Math.min(utilPct * 100, 100)}%` as any },
                  overBudget && proj.barFillOver,
                ]}
              />
            </View>

            <View style={proj.statsRow}>
              <Text style={proj.statText}>已用 {fmtCurrency(p.total_spent)}</Text>
              <Text style={[proj.statText, remaining < 0 && proj.overBudget]}>
                {remaining >= 0 ? `剩餘 ${fmtCurrency(remaining)}` : `超支 ${fmtCurrency(-remaining)}`}
              </Text>
            </View>

            {expanded && p.category_budgets.map((cb) => {
              const cbPct = cb.budget_amount > 0 ? cb.spent_amount / cb.budget_amount : 0;
              const cbOver = cb.budget_amount > 0 && cb.spent_amount > cb.budget_amount;
              return (
                <View key={cb.id} style={proj.catRow}>
                  <Text style={proj.catEmoji}>{cb.category_emoji ?? '📦'}</Text>
                  <View style={proj.catRight}>
                    <View style={proj.catHeader}>
                      <Text style={proj.catName}>{cb.category_name ?? '未分類'}</Text>
                      <Text style={[proj.catUtil, cbOver && proj.overBudget]}>
                        {fmtCurrency(cb.spent_amount)} / {fmtCurrency(cb.budget_amount)}
                      </Text>
                    </View>
                    <View style={proj.catBarBg}>
                      <View
                        style={[
                          proj.catBarFill,
                          { width: `${Math.min(cbPct * 100, 100)}%` as any },
                          cbOver && proj.barFillOver,
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const proj = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  projName: { flex: 1, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  projUtil: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: typography.weights.semibold, marginRight: spacing.sm },
  overBudget: { color: colors.expense },
  chevron: { fontSize: typography.sizes.lg, color: colors.textSecondary },
  barBg: { height: 6, backgroundColor: colors.surfaceAlt, marginHorizontal: spacing.md },
  barFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  barFillOver: { backgroundColor: colors.expense },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  catEmoji: { fontSize: typography.sizes.lg, marginRight: spacing.sm, width: 28 },
  catRight: { flex: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: typography.sizes.sm, color: colors.text },
  catUtil: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  catBarBg: { height: 4, backgroundColor: colors.borderLight, borderRadius: 2 },
  catBarFill: { height: 4, backgroundColor: colors.primaryLight, borderRadius: 2 },
});

// ── Balance history tab ───────────────────────────────────────────────────────

const RANGE_OPTIONS: { months: 1 | 3 | 6 | 12; label: string }[] = [
  { months: 1, label: '1月' },
  { months: 3, label: '3月' },
  { months: 6, label: '6月' },
  { months: 12, label: '1年' },
];

const LINE_CHART_W = Dimensions.get('window').width - spacing.md * 2 - 32;
const LINE_CHART_H = 160;
const LINE_CHART_PAD = { top: 12, bottom: 24, left: 48, right: 8 };

function BalanceTab({ userId }: { userId: string }) {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rangeMonths, setRangeMonths] = useState<1 | 3 | 6 | 12>(3);
  const [points, setPoints] = useState<BalancePoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [accsLoading, setAccsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAccounts(userId), fetchExchangeRates(userId)]).then(([accs, r]) => {
      setAccounts(accs);
      setRates(r);
      if (accs.length > 0) setSelectedId(accs[0].id);
      setAccsLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    if (!selectedId) return;
    setChartLoading(true);
    fetchAccountBalanceHistory(userId, selectedId, rangeMonths, rates).then((pts) => {
      setPoints(pts);
      setChartLoading(false);
    });
  }, [userId, selectedId, rangeMonths, rates]);

  if (accsLoading) return <View style={tab.center}><ActivityIndicator color={colors.primary} /></View>;

  if (accounts.length === 0) {
    return <View style={tab.empty}><Text style={tab.emptyText}>無帳戶資料</Text></View>;
  }

  // Compute chart path
  const w = LINE_CHART_W - LINE_CHART_PAD.left - LINE_CHART_PAD.right;
  const h = LINE_CHART_H - LINE_CHART_PAD.top - LINE_CHART_PAD.bottom;
  const minBal = points.length > 0 ? Math.min(...points.map((p) => p.balance)) : 0;
  const maxBal = points.length > 0 ? Math.max(...points.map((p) => p.balance)) : 0;
  const balRange = maxBal - minBal || 1;

  function toX(i: number) {
    return LINE_CHART_PAD.left + (i / Math.max(points.length - 1, 1)) * w;
  }
  function toY(bal: number) {
    return LINE_CHART_PAD.top + h - ((bal - minBal) / balRange) * h;
  }

  const polyPoints = points.map((p, i) => `${toX(i)},${toY(p.balance)}`).join(' ');

  // Y-axis labels
  const yLabels = [minBal, minBal + balRange / 2, maxBal];

  // X-axis labels (first, middle, last)
  const xLabelIdxs = points.length > 2
    ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
    : points.map((_, i) => i);

  const selectedAcc = accounts.find((a) => a.id === selectedId);

  return (
    <ScrollView contentContainerStyle={tab.scroll}>
      {/* Account selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={bal.chipRow}>
        {accounts.map((acc) => (
          <TouchableOpacity
            key={acc.id}
            style={[bal.chip, selectedId === acc.id && bal.chipActive]}
            onPress={() => setSelectedId(acc.id)}
          >
            <Text style={[bal.chipText, selectedId === acc.id && bal.chipTextActive]}>
              {acc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Range selector */}
      <View style={bal.rangeRow}>
        {RANGE_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r.months}
            style={[bal.rangeBtn, rangeMonths === r.months && bal.rangeBtnActive]}
            onPress={() => setRangeMonths(r.months)}
          >
            <Text style={[bal.rangeBtnText, rangeMonths === r.months && bal.rangeBtnTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={bal.chartCard}>
        {selectedAcc && (
          <Text style={bal.accountCurrency}>
            {selectedAcc.name}
            {selectedAcc.currency !== 'TWD' ? `（換算為 TWD）` : ''}
          </Text>
        )}

        {chartLoading ? (
          <View style={[tab.center, { height: LINE_CHART_H }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : points.length < 2 ? (
          <View style={[tab.empty, { height: LINE_CHART_H }]}>
            <Text style={tab.emptyText}>資料不足</Text>
          </View>
        ) : (
          <Svg
            width={LINE_CHART_W + LINE_CHART_PAD.left + LINE_CHART_PAD.right}
            height={LINE_CHART_H}
          >
            {/* Y-axis grid lines */}
            {yLabels.map((val, i) => (
              <React.Fragment key={i}>
                <SvgLine
                  x1={LINE_CHART_PAD.left}
                  y1={toY(val)}
                  x2={LINE_CHART_PAD.left + w}
                  y2={toY(val)}
                  stroke={colors.borderLight}
                  strokeWidth={1}
                />
                <SvgText
                  x={LINE_CHART_PAD.left - 4}
                  y={toY(val) + 4}
                  fontSize={8}
                  fill={colors.textSecondary}
                  textAnchor="end"
                >
                  {Math.round(val / 1000)}K
                </SvgText>
              </React.Fragment>
            ))}

            {/* Line */}
            <Polyline
              points={polyPoints}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2}
            />

            {/* Data points */}
            {points.map((p, i) => (
              <Circle
                key={i}
                cx={toX(i)}
                cy={toY(p.balance)}
                r={2}
                fill={colors.primary}
              />
            ))}

            {/* X-axis labels */}
            {xLabelIdxs.map((idx) => (
              <SvgText
                key={idx}
                x={toX(idx)}
                y={LINE_CHART_H - 4}
                fontSize={8}
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {points[idx].date.slice(5)}
              </SvgText>
            ))}
          </Svg>
        )}

        {/* Current balance */}
        {points.length > 0 && (
          <View style={bal.balanceRow}>
            <Text style={bal.balanceLabel}>最新餘額</Text>
            <Text style={bal.balanceValue}>
              {fmtCurrency(points[points.length - 1].balance)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const bal = StyleSheet.create({
  chipRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm + 2, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
  rangeRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rangeBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.background },
  rangeBtnActive: { backgroundColor: colors.primary },
  rangeBtnText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  rangeBtnTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
  chartCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  accountCurrency: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  balanceLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  balanceValue: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
});

// ── Shared tab styles ─────────────────────────────────────────────────────────

const tab = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl },
  scroll: { paddingBottom: spacing.xxl },
  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: typography.sizes.md, color: colors.textSecondary },
  summaryCard: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  summaryAmount: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.expense, marginTop: 4 },
  summaryCompare: { fontSize: typography.sizes.sm, marginTop: 4 },
  catRow: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  catHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  catEmoji: { fontSize: typography.sizes.lg, marginRight: spacing.sm, width: 28 },
  catName: { flex: 1, fontSize: typography.sizes.md, color: colors.text },
  catAmount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.expense, marginRight: spacing.xs },
  catPct: { fontSize: typography.sizes.xs, color: colors.textSecondary, width: 40, textAlign: 'right' },
  barBg: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3 },
  barFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
});

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'spending', label: '支出' },
  { id: 'trend', label: '趨勢' },
  { id: 'projects', label: '專案' },
  { id: 'balance', label: '餘額' },
];

// ── Main Reports screen ───────────────────────────────────────────────────────

export function ReportsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [periodCfg, setPeriodCfg] = useState<PeriodConfig>({ mode: 'preset', preset: 'this_month' });
  const [activeTab, setActiveTab] = useState<TabId>('spending');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id ?? null);
    });
  }, []);

  if (!userId) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const { start, end, prevStart, prevEnd } = resolvePeriod(periodCfg);

  return (
    <View style={styles.container}>
      <PeriodSelector config={periodCfg} onChange={setPeriodCfg} />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabItem, activeTab === t.id && styles.tabItemActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {activeTab === 'spending' && (
          <SpendingTab
            userId={userId}
            start={start} end={end}
            prevStart={prevStart} prevEnd={prevEnd}
          />
        )}
        {activeTab === 'trend' && (
          <TrendTab userId={userId} start={start} end={end} />
        )}
        {activeTab === 'projects' && (
          <ProjectsTab userId={userId} />
        )}
        {activeTab === 'balance' && (
          <BalanceTab userId={userId} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: typography.weights.semibold },
  content: { flex: 1 },
});
