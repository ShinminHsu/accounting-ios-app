import { supabase } from './supabase';
import { Project, ProjectType, ProjectInterval, ProjectStatus } from '../types/database';

export type CategoryBudget = {
  id: string;
  category_id: string;
  category_name: string | null;
  category_emoji: string | null;
  budget_amount: number;
  spent_amount: number;
};

export type ProjectWithBudgets = Project & {
  category_budgets: CategoryBudget[];
  total_budget: number;
  total_spent: number;
};

// ── Fetch active projects with budget utilization ───────────────────────────

export async function fetchActiveProjects(userId: string): Promise<ProjectWithBudgets[]> {
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_category_budgets(
        id,
        category_id,
        budget_amount,
        categories(name, emoji)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error || !projects) return [];

  const result: ProjectWithBudgets[] = [];

  for (const p of projects) {
    const budgets = (p.project_category_budgets ?? []) as any[];

    // Determine date range for this project's current period
    const { start, end } = currentPeriodRange(p);

    // Fetch spent per category for this project in current period
    let spentQuery = supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('project_id', p.id)
      .eq('is_income', false)
      .neq('payer_type', 'paid_for_other');

    if (start) spentQuery = spentQuery.gte('date', start);
    if (end) spentQuery = spentQuery.lte('date', end);

    const { data: txns } = await spentQuery;

    const spentByCategory: Record<string, number> = {};
    for (const t of txns ?? []) {
      if (t.category_id) {
        spentByCategory[t.category_id] = (spentByCategory[t.category_id] ?? 0) + t.amount;
      }
    }

    const category_budgets: CategoryBudget[] = budgets.map((b: any) => ({
      id: b.id,
      category_id: b.category_id,
      category_name: b.categories?.name ?? null,
      category_emoji: b.categories?.emoji ?? null,
      budget_amount: b.budget_amount,
      spent_amount: spentByCategory[b.category_id] ?? 0,
    }));

    const total_budget = category_budgets.reduce((s, b) => s + b.budget_amount, 0);
    const total_spent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);

    result.push({
      ...p,
      category_budgets,
      total_budget,
      total_spent,
    });
  }

  return result;
}

function currentPeriodRange(p: Project): { start: string | null; end: string | null } {
  const today = new Date();
  if (p.type === 'one_time') {
    return { start: p.start_date, end: p.end_date };
  }
  // periodic
  if (p.interval === 'monthly') {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
  }
  if (p.interval === 'yearly') {
    const y = today.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  return { start: null, end: null };
}

// ── Create project ──────────────────────────────────────────────────────────

export async function createProject(
  userId: string,
  input: {
    name: string;
    type: ProjectType;
    interval?: ProjectInterval | null;
    start_date?: string | null;
    end_date?: string | null;
    categoryBudgets: { category_id: string; budget_amount: number }[];
  }
): Promise<{ data: Project | null; error: string | null }> {
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: input.name,
      type: input.type,
      interval: input.interval ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      status: 'active',
    })
    .select()
    .single();

  if (pErr || !project) return { data: null, error: pErr?.message ?? '建立失敗' };

  if (input.categoryBudgets.length > 0) {
    const { error: bErr } = await supabase.from('project_category_budgets').insert(
      input.categoryBudgets.map((cb) => ({
        project_id: project.id,
        category_id: cb.category_id,
        budget_amount: cb.budget_amount,
      }))
    );
    if (bErr) return { data: null, error: bErr.message };
  }

  return { data: project as Project, error: null };
}

// ── Complete or archive project ─────────────────────────────────────────────

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

// ── Check one-time project completion on app open ───────────────────────────

export async function checkProjectCompletions(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'one_time')
    .eq('status', 'active')
    .lt('end_date', today);

  if (!data || data.length === 0) return;

  await supabase
    .from('projects')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .in('id', data.map((p) => p.id));
}
