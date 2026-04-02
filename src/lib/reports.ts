import { supabase } from './supabase';

// ── Period utilities ─────────────────────────────────────────────────────────

export type PeriodPreset =
  | 'this_week' | 'this_month' | 'this_quarter' | 'this_year'
  | 'last_month' | 'last_year';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computePeriodDates(preset: PeriodPreset): {
  start: string; end: string; prevStart: string; prevEnd: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let start: Date, end: Date, prevStart: Date, prevEnd: Date;

  if (preset === 'this_week') {
    const dow = today.getDay(); // 0=Sun
    start = new Date(today); start.setDate(today.getDate() - dow);
    end = new Date(today);
    const len = today.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - len);
  } else if (preset === 'this_month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today);
    prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    prevEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (preset === 'this_quarter') {
    const q = Math.floor(today.getMonth() / 3);
    start = new Date(today.getFullYear(), q * 3, 1);
    end = new Date(today);
    prevStart = new Date(today.getFullYear(), q * 3 - 3, 1);
    prevEnd = new Date(today.getFullYear(), q * 3, 0);
  } else if (preset === 'this_year') {
    start = new Date(today.getFullYear(), 0, 1);
    end = new Date(today);
    prevStart = new Date(today.getFullYear() - 1, 0, 1);
    prevEnd = new Date(today.getFullYear() - 1, 11, 31);
  } else if (preset === 'last_month') {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
    prevStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
  } else { // last_year
    start = new Date(today.getFullYear() - 1, 0, 1);
    end = new Date(today.getFullYear() - 1, 11, 31);
    prevStart = new Date(today.getFullYear() - 2, 0, 1);
    prevEnd = new Date(today.getFullYear() - 2, 11, 31);
  }

  return {
    start: toDateStr(start), end: toDateStr(end),
    prevStart: toDateStr(prevStart), prevEnd: toDateStr(prevEnd),
  };
}

export function computeCustomPrevPeriod(
  start: string, end: string
): { prevStart: string; prevEnd: string } {
  const s = new Date(start);
  const e = new Date(end);
  const len = e.getTime() - s.getTime();
  const prevEnd = new Date(s.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - len);
  return { prevStart: toDateStr(prevStart), prevEnd: toDateStr(prevEnd) };
}

// ── Spending summary ──────────────────────────────────────────────────────────

export type CategorySpend = {
  categoryId: string;
  categoryName: string;
  categoryEmoji: string | null;
  amount: number;
  percentage: number;
};

export type SpendingSummary = {
  total: number;
  prevTotal: number;
  categories: CategorySpend[];
};

export async function fetchSpendingSummary(
  userId: string,
  start: string,
  end: string,
  prevStart: string,
  prevEnd: string
): Promise<SpendingSummary> {
  const [current, prev] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, category_id, categories(name, emoji, parent_id)')
      .eq('user_id', userId)
      .eq('is_income', false)
      .neq('payer_type', 'paid_for_other')
      .gte('date', start)
      .lte('date', end),
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('is_income', false)
      .neq('payer_type', 'paid_for_other')
      .gte('date', prevStart)
      .lte('date', prevEnd),
  ]);

  const total = (current.data ?? []).reduce((s, t) => s + t.amount, 0);
  const prevTotal = (prev.data ?? []).reduce((s, t) => s + t.amount, 0);

  // Group by parent category (or self if no parent)
  const catMap: Record<string, { name: string; emoji: string | null; amount: number }> = {};

  for (const t of current.data ?? []) {
    const cat = t.categories as any;
    if (!cat) continue;
    const isParent = !cat.parent_id;
    const id = isParent ? t.category_id : cat.parent_id;
    const name = isParent ? cat.name : cat.name; // will be overwritten by parent fetch
    if (!catMap[id]) catMap[id] = { name: cat.parent_id ? '...' : cat.name, emoji: cat.emoji, amount: 0 };
    catMap[id].amount += t.amount;
  }

  // Fetch parent names for subcategory-only hits
  const parentIds = Object.keys(catMap).filter((id) => catMap[id].name === '...');
  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from('categories')
      .select('id, name, emoji')
      .in('id', parentIds);
    for (const p of parents ?? []) {
      if (catMap[p.id]) { catMap[p.id].name = p.name; catMap[p.id].emoji = p.emoji; }
    }
  }

  const categories: CategorySpend[] = Object.entries(catMap)
    .map(([id, val]) => ({
      categoryId: id,
      categoryName: val.name,
      categoryEmoji: val.emoji,
      amount: val.amount,
      percentage: total > 0 ? (val.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { total, prevTotal, categories };
}

// ── Category drill-down ───────────────────────────────────────────────────────

export type DrillDownResult = {
  subcategories: { id: string; name: string; emoji: string | null; amount: number }[];
  transactions: {
    id: string; date: string; amount: number; notes: string | null;
    accountName: string | null; subcategoryName: string | null;
  }[];
};

export async function fetchCategoryDrillDown(
  userId: string,
  parentCategoryId: string,
  start: string,
  end: string
): Promise<DrillDownResult> {
  const { data } = await supabase
    .from('transactions')
    .select(`
      id, date, amount, notes,
      categories(id, name, emoji, parent_id),
      accounts(name)
    `)
    .eq('user_id', userId)
    .eq('is_income', false)
    .neq('payer_type', 'paid_for_other')
    .gte('date', start)
    .lte('date', end);

  const filtered = (data ?? []).filter((t: any) => {
    const cat = t.categories;
    return cat && (cat.id === parentCategoryId || cat.parent_id === parentCategoryId);
  });

  const subMap: Record<string, { name: string; emoji: string | null; amount: number }> = {};
  for (const t of filtered) {
    const cat = t.categories as any;
    if (cat && cat.parent_id) {
      if (!subMap[cat.id]) subMap[cat.id] = { name: cat.name, emoji: cat.emoji, amount: 0 };
      subMap[cat.id].amount += t.amount;
    }
  }

  return {
    subcategories: Object.entries(subMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.amount - a.amount),
    transactions: filtered.map((t: any) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      notes: t.notes,
      accountName: t.accounts?.name ?? null,
      subcategoryName: t.categories?.parent_id ? t.categories.name : null,
    })).sort((a: any, b: any) => b.date.localeCompare(a.date)),
  };
}

// ── Trend data ────────────────────────────────────────────────────────────────

export type TrendBar = { label: string; amount: number };

export type TrendData = {
  bars: TrendBar[];
  top5Categories: { name: string; emoji: string | null; amount: number }[];
  netCashFlow: number;
  useWeeklyBars: boolean;
};

export async function fetchTrendData(
  userId: string,
  start: string,
  end: string
): Promise<TrendData> {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const useWeeklyBars = daysDiff <= 92; // ≤ 3 months

  const { data } = await supabase
    .from('transactions')
    .select('amount, date, is_income, payer_type, categories(name, emoji, parent_id)')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end);

  const txns = data ?? [];

  // Spending bars
  const barMap: Record<string, number> = {};
  for (const t of txns) {
    if (t.is_income || t.payer_type === 'paid_for_other') continue;
    let key: string;
    const d = new Date(t.date);
    if (useWeeklyBars) {
      // Week start (Monday)
      const dayOfWeek = d.getDay() || 7; // 1=Mon...7=Sun
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - (dayOfWeek - 1));
      key = toDateStr(weekStart);
    } else {
      key = t.date.slice(0, 7); // YYYY-MM
    }
    barMap[key] = (barMap[key] ?? 0) + t.amount;
  }

  const bars: TrendBar[] = Object.entries(barMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, amount]) => ({
      label: useWeeklyBars ? k.slice(5) : k.slice(5), // MM-DD or MM
      amount,
    }));

  // Top 5 categories
  const catMap: Record<string, { name: string; emoji: string | null; amount: number }> = {};
  for (const t of txns) {
    if (t.is_income || t.payer_type === 'paid_for_other') continue;
    const cat = t.categories as any;
    if (!cat) continue;
    const id = cat.parent_id ?? (t as any).category_id ?? cat.id;
    const name = cat.parent_id ? '' : cat.name;
    if (!catMap[id]) catMap[id] = { name: name || cat.name, emoji: cat.emoji, amount: 0 };
    else if (!catMap[id].name && name) catMap[id].name = name;
    catMap[id].amount += t.amount;
  }

  const top5Categories = Object.values(catMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Net cash flow
  let income = 0, expenses = 0;
  for (const t of txns) {
    if (t.is_income) income += t.amount;
    else if (t.payer_type !== 'paid_for_other') expenses += t.amount;
  }

  return { bars, top5Categories, netCashFlow: income - expenses, useWeeklyBars };
}

// ── Account balance history ───────────────────────────────────────────────────

export type BalancePoint = { date: string; balance: number };

export async function fetchAccountBalanceHistory(
  userId: string,
  accountId: string,
  rangeMonths: 1 | 3 | 6 | 12,
  ratesTWD: Record<string, number>
): Promise<BalancePoint[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - rangeMonths);

  const start = toDateStr(startDate);
  const end = toDateStr(endDate);

  // Get account initial balance
  const { data: account } = await supabase
    .from('accounts')
    .select('initial_balance, currency')
    .eq('id', accountId)
    .single();

  if (!account) return [];

  // Get all transactions up to end date, ordered by date
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount, date, is_income, payer_type')
    .eq('account_id', accountId)
    .neq('payer_type', 'paid_by_other')
    .lte('date', end)
    .order('date');

  if (!txns) return [];

  // Compute balance for each day in range by replaying transactions
  const txnByDate: Record<string, number> = {};
  let runningBalance = account.initial_balance;

  // Compute initial balance before the range start
  for (const t of txns) {
    if (t.date < start) {
      if (t.is_income) runningBalance += t.amount;
      else runningBalance -= t.amount;
    } else {
      txnByDate[t.date] = (txnByDate[t.date] ?? 0) + (t.is_income ? t.amount : -t.amount);
    }
  }

  // Build daily data points (sample weekly to avoid too many points)
  const points: BalancePoint[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateStr = toDateStr(cursor);
    const delta = txnByDate[dateStr] ?? 0;
    runningBalance += delta;

    // Sample every 7 days (or always for ≤1 month)
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const sampleInterval = daysDiff <= 31 ? 1 : 7;

    const dayNum = Math.floor((cursor.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayNum % sampleInterval === 0 || dateStr === end) {
      let balance = runningBalance;
      if (account.currency !== 'TWD') {
        const rate = ratesTWD[account.currency];
        if (rate) balance = balance * rate;
      }
      points.push({ date: dateStr, balance });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}
