import { getDb } from './db';

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
    const dow = today.getDay();
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
  } else {
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

export function computeCustomPrevPeriod(start: string, end: string): { prevStart: string; prevEnd: string } {
  const s = new Date(start);
  const e = new Date(end);
  const len = e.getTime() - s.getTime();
  const prevEnd = new Date(s.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - len);
  return { prevStart: toDateStr(prevStart), prevEnd: toDateStr(prevEnd) };
}

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
  const db = await getDb();

  const [current, prev] = await Promise.all([
    db.getAllAsync<any>(
      `SELECT t.amount, t.category_id, c.name as cat_name, c.emoji as cat_emoji, c.parent_id
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.is_income = 0 AND t.payer_type != 'paid_for_other'
         AND t.date >= ? AND t.date <= ?`,
      [userId, start, end]
    ),
    db.getAllAsync<{ amount: number }>(
      `SELECT amount FROM transactions
       WHERE user_id = ? AND is_income = 0 AND payer_type != 'paid_for_other'
         AND date >= ? AND date <= ?`,
      [userId, prevStart, prevEnd]
    ),
  ]);

  const total = current.reduce((s: number, t: any) => s + t.amount, 0);
  const prevTotal = prev.reduce((s, t) => s + t.amount, 0);

  // Build parent-level spending map
  const catMap: Record<string, { name: string; emoji: string | null; amount: number; isParent: boolean }> = {};
  const subcatParentIds = new Set<string>();

  for (const t of current) {
    if (!t.category_id) continue;
    if (t.parent_id) {
      // subcategory — accumulate under parent
      if (!catMap[t.parent_id]) {
        catMap[t.parent_id] = { name: '...', emoji: null, amount: 0, isParent: false };
        subcatParentIds.add(t.parent_id);
      }
      catMap[t.parent_id].amount += t.amount;
    } else {
      if (!catMap[t.category_id]) catMap[t.category_id] = { name: t.cat_name ?? '', emoji: t.cat_emoji ?? null, amount: 0, isParent: true };
      catMap[t.category_id].amount += t.amount;
    }
  }

  // Resolve parent names for entries we only know by ID
  if (subcatParentIds.size > 0) {
    const ids = [...subcatParentIds];
    const placeholders = ids.map(() => '?').join(',');
    const parents = await db.getAllAsync<{ id: string; name: string; emoji: string | null }>(
      `SELECT id, name, emoji FROM categories WHERE id IN (${placeholders})`, ids
    );
    for (const p of parents) {
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

export type DrillDownResult = {
  subcategories: { id: string; name: string; emoji: string | null; amount: number }[];
  transactions: { id: string; date: string; amount: number; notes: string | null; accountName: string | null; subcategoryName: string | null }[];
};

export async function fetchCategoryDrillDown(
  userId: string,
  parentCategoryId: string,
  start: string,
  end: string
): Promise<DrillDownResult> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT t.id, t.date, t.amount, t.notes, t.category_id,
            c.name as cat_name, c.emoji as cat_emoji, c.parent_id,
            a.name as account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     WHERE t.user_id = ? AND t.is_income = 0 AND t.payer_type != 'paid_for_other'
       AND t.date >= ? AND t.date <= ?
       AND (t.category_id = ? OR c.parent_id = ?)`,
    [userId, start, end, parentCategoryId, parentCategoryId]
  );

  const subMap: Record<string, { name: string; emoji: string | null; amount: number }> = {};
  for (const t of rows) {
    if (t.parent_id) {
      if (!subMap[t.category_id]) subMap[t.category_id] = { name: t.cat_name, emoji: t.cat_emoji, amount: 0 };
      subMap[t.category_id].amount += t.amount;
    }
  }

  return {
    subcategories: Object.entries(subMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.amount - a.amount),
    transactions: rows.map((t: any) => ({
      id: t.id, date: t.date, amount: t.amount, notes: t.notes ?? null,
      accountName: t.account_name ?? null,
      subcategoryName: t.parent_id ? t.cat_name : null,
    })).sort((a: any, b: any) => b.date.localeCompare(a.date)),
  };
}

export type TrendBar = { label: string; amount: number };
export type TrendData = {
  bars: TrendBar[];
  top5Categories: { name: string; emoji: string | null; amount: number }[];
  netCashFlow: number;
  useWeeklyBars: boolean;
};

export async function fetchTrendData(userId: string, start: string, end: string): Promise<TrendData> {
  const db = await getDb();
  const daysDiff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  const useWeeklyBars = daysDiff <= 92;

  const rows = await db.getAllAsync<any>(
    `SELECT t.amount, t.date, t.is_income, t.payer_type, t.category_id,
            c.name as cat_name, c.emoji as cat_emoji, c.parent_id
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?`,
    [userId, start, end]
  );

  const barMap: Record<string, number> = {};
  const catMap: Record<string, { name: string; emoji: string | null; amount: number }> = {};
  let income = 0, expenses = 0;

  for (const t of rows) {
    const isExpense = !t.is_income && t.payer_type !== 'paid_for_other';
    if (t.is_income) income += t.amount;
    else if (isExpense) expenses += t.amount;

    if (isExpense) {
      const d = new Date(t.date);
      let key: string;
      if (useWeeklyBars) {
        const dayOfWeek = d.getDay() || 7;
        const ws = new Date(d);
        ws.setDate(d.getDate() - (dayOfWeek - 1));
        key = toDateStr(ws);
      } else {
        key = t.date.slice(0, 7);
      }
      barMap[key] = (barMap[key] ?? 0) + t.amount;

      if (t.category_id) {
        const catKey = t.parent_id ?? t.category_id;
        if (!catMap[catKey]) catMap[catKey] = { name: t.parent_id ? '' : (t.cat_name ?? ''), emoji: t.cat_emoji ?? null, amount: 0 };
        catMap[catKey].amount += t.amount;
      }
    }
  }

  // Resolve unnamed parent categories
  const missingIds = Object.entries(catMap).filter(([, v]) => !v.name).map(([id]) => id);
  if (missingIds.length > 0) {
    const ph = missingIds.map(() => '?').join(',');
    const parents = await db.getAllAsync<{ id: string; name: string; emoji: string | null }>(
      `SELECT id, name, emoji FROM categories WHERE id IN (${ph})`, missingIds
    );
    for (const p of parents) {
      if (catMap[p.id]) { catMap[p.id].name = p.name; catMap[p.id].emoji = p.emoji; }
    }
  }

  return {
    bars: Object.entries(barMap).sort(([a], [b]) => a.localeCompare(b)).map(([k, amount]) => ({ label: k.slice(5), amount })),
    top5Categories: Object.values(catMap).sort((a, b) => b.amount - a.amount).slice(0, 5),
    netCashFlow: income - expenses,
    useWeeklyBars,
  };
}

export type BalancePoint = { date: string; balance: number };

export async function fetchAccountBalanceHistory(
  userId: string,
  accountId: string,
  rangeMonths: 1 | 3 | 6 | 12,
  ratesTWD: Record<string, number>
): Promise<BalancePoint[]> {
  const db = await getDb();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - rangeMonths);
  const start = toDateStr(startDate);
  const end = toDateStr(endDate);

  const account = await db.getFirstAsync<{ initial_balance: number; currency: string }>(
    'SELECT initial_balance, currency FROM accounts WHERE id = ?',
    [accountId]
  );
  if (!account) return [];

  const txns = await db.getAllAsync<{ amount: number; date: string; is_income: number; payer_type: string }>(
    `SELECT amount, date, is_income, payer_type FROM transactions
     WHERE account_id = ? AND payer_type != 'paid_by_other' AND date <= ?
     ORDER BY date ASC`,
    [accountId, end]
  );

  let runningBalance = account.initial_balance;
  const txnByDate: Record<string, number> = {};
  for (const t of txns) {
    const delta = t.is_income ? t.amount : -t.amount;
    if (t.date < start) runningBalance += delta;
    else txnByDate[t.date] = (txnByDate[t.date] ?? 0) + delta;
  }

  const points: BalancePoint[] = [];
  const cursor = new Date(startDate);
  const daysDiff = (endDate.getTime() - startDate.getTime()) / 86400000;
  const sampleInterval = daysDiff <= 31 ? 1 : 7;
  let dayNum = 0;

  while (cursor <= endDate) {
    const dateStr = toDateStr(cursor);
    runningBalance += txnByDate[dateStr] ?? 0;
    if (dayNum % sampleInterval === 0 || dateStr === end) {
      let balance = runningBalance;
      if (account.currency !== 'TWD') {
        const rate = ratesTWD[account.currency];
        if (rate) balance = balance * rate;
      }
      points.push({ date: dateStr, balance });
    }
    cursor.setDate(cursor.getDate() + 1);
    dayNum++;
  }

  return points;
}
