import { getDb, generateUUID } from './db';
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

function rowToProject(row: any): Project {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type as ProjectType,
    interval: row.interval ?? null,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    status: row.status as ProjectStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function currentPeriodRange(p: Project): { start: string | null; end: string | null } {
  const today = new Date();
  if (p.type === 'one_time') return { start: p.start_date, end: p.end_date };
  if (p.interval === 'monthly') {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(lastDay).padStart(2, '0')}` };
  }
  if (p.interval === 'yearly') {
    const y = today.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  return { start: null, end: null };
}

export async function fetchActiveProjects(userId: string): Promise<ProjectWithBudgets[]> {
  const db = await getDb();
  const projects = await db.getAllAsync<any>(
    'SELECT * FROM projects WHERE user_id = ? AND status = ? ORDER BY created_at DESC',
    [userId, 'active']
  );

  const result: ProjectWithBudgets[] = [];
  for (const p of projects) {
    const project = rowToProject(p);
    const budgetRows = await db.getAllAsync<any>(
      `SELECT pcb.*, c.name as category_name, c.emoji as category_emoji
       FROM project_category_budgets pcb
       LEFT JOIN categories c ON pcb.category_id = c.id
       WHERE pcb.project_id = ?`,
      [project.id]
    );

    const { start, end } = currentPeriodRange(project);
    let spentQuery = `SELECT category_id, amount FROM transactions
                      WHERE project_id = ? AND is_income = 0 AND payer_type != 'paid_for_other'`;
    const spentParams: any[] = [project.id];
    if (start) { spentQuery += ' AND date >= ?'; spentParams.push(start); }
    if (end) { spentQuery += ' AND date <= ?'; spentParams.push(end); }

    const txns = await db.getAllAsync<{ category_id: string | null; amount: number }>(spentQuery, spentParams);
    const spentByCategory: Record<string, number> = {};
    for (const t of txns) {
      if (t.category_id) spentByCategory[t.category_id] = (spentByCategory[t.category_id] ?? 0) + t.amount;
    }

    const category_budgets: CategoryBudget[] = budgetRows.map((b) => ({
      id: b.id,
      category_id: b.category_id,
      category_name: b.category_name ?? null,
      category_emoji: b.category_emoji ?? null,
      budget_amount: b.budget_amount,
      spent_amount: spentByCategory[b.category_id] ?? 0,
    }));

    result.push({
      ...project,
      category_budgets,
      total_budget: category_budgets.reduce((s, b) => s + b.budget_amount, 0),
      total_spent: Object.values(spentByCategory).reduce((s, v) => s + v, 0),
    });
  }
  return result;
}

export async function fetchActiveProjectsSimple(userId: string): Promise<Project[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM projects WHERE user_id = ? AND status = ? ORDER BY name ASC',
    [userId, 'active']
  );
  return rows.map(rowToProject);
}

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
  const db = await getDb();
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO projects (id, user_id, name, type, interval, start_date, end_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, input.name, input.type, input.interval ?? null, input.start_date ?? null, input.end_date ?? null, 'active', now, now]
  );

  for (const cb of input.categoryBudgets) {
    await db.runAsync(
      'INSERT INTO project_category_budgets (id, project_id, category_id, budget_amount, created_at) VALUES (?, ?, ?, ?, ?)',
      [generateUUID(), id, cb.category_id, cb.budget_amount, now]
    );
  }

  const row = await db.getFirstAsync<any>('SELECT * FROM projects WHERE id = ?', [id]);
  return { data: row ? rowToProject(row) : null, error: null };
}

export async function updateProjectStatus(id: string, status: ProjectStatus): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE projects SET status = ?, updated_at = ? WHERE id = ?',
    [status, new Date().toISOString(), id]
  );
  return { error: null };
}

export async function checkProjectCompletions(userId: string): Promise<void> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM projects WHERE user_id = ? AND type = 'one_time' AND status = 'active' AND end_date < ?`,
    [userId, today]
  );
  const now = new Date().toISOString();
  for (const row of rows) {
    await db.runAsync(
      `UPDATE projects SET status = 'completed', updated_at = ? WHERE id = ?`,
      [now, row.id]
    );
  }
}

export async function getProjectSpend(projectId: string, start?: string, end?: string): Promise<number> {
  const db = await getDb();
  let sql = `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
             WHERE project_id = ? AND is_income = 0 AND payer_type != 'paid_for_other'`;
  const params: any[] = [projectId];
  if (start) { sql += ' AND date >= ?'; params.push(start); }
  if (end) { sql += ' AND date <= ?'; params.push(end); }
  const result = await db.getFirstAsync<{ total: number }>(sql, params);
  return result?.total ?? 0;
}

export async function resetPeriodicProjects(userId: string): Promise<void> {
  // Periodic projects reset by relying on date-scoped spend queries — no stored counters to reset
  // This is a no-op in the SQLite model: spend is always computed live for the current period
  void userId;
}
