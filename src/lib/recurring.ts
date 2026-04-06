import { getDb, generateUUID } from './db';
import { RecurringTemplate, RecurrenceFrequency, RecurrenceSubtype } from '../types/database';
import { createTransaction } from './transactions';

export type RecurringTemplateWithRefs = RecurringTemplate & {
  category_name: string | null;
  category_emoji: string | null;
  account_name: string | null;
  contact_name: string | null;
};

function rowToTemplate(row: any): RecurringTemplate {
  return {
    id: row.id,
    user_id: row.user_id,
    amount: row.amount,
    category_id: row.category_id ?? null,
    account_id: row.account_id ?? null,
    project_id: row.project_id ?? null,
    notes: row.notes ?? null,
    frequency: row.frequency as RecurrenceFrequency,
    subtype: row.subtype as RecurrenceSubtype,
    contact_id: row.contact_id ?? null,
    start_date: row.start_date,
    end_date: row.end_date ?? null,
    last_generated_date: row.last_generated_date ?? null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchRecurringTemplates(userId: string): Promise<RecurringTemplateWithRefs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT rt.*, c.name as category_name, c.emoji as category_emoji,
            a.name as account_name, co.name as contact_name
     FROM recurring_templates rt
     LEFT JOIN categories c ON rt.category_id = c.id
     LEFT JOIN accounts a ON rt.account_id = a.id
     LEFT JOIN contacts co ON rt.contact_id = co.id
     WHERE rt.user_id = ?
     ORDER BY rt.status ASC, rt.start_date ASC`,
    [userId]
  );
  return rows.map((row) => ({
    ...rowToTemplate(row),
    category_name: row.category_name ?? null,
    category_emoji: row.category_emoji ?? null,
    account_name: row.account_name ?? null,
    contact_name: row.contact_name ?? null,
  }));
}

export async function createRecurringTemplate(
  userId: string,
  input: {
    amount: number;
    categoryId: string | null;
    accountId: string | null;
    projectId: string | null;
    notes: string;
    frequency: RecurrenceFrequency;
    subtype: RecurrenceSubtype;
    contactId: string | null;
    startDate: string;
    endDate: string | null;
  }
): Promise<{ error: string | null }> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO recurring_templates
     (id, user_id, amount, category_id, account_id, project_id, notes, frequency, subtype, contact_id, start_date, end_date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [
      generateUUID(), userId, input.amount,
      input.categoryId ?? null, input.accountId ?? null, input.projectId ?? null,
      input.notes || null, input.frequency, input.subtype, input.contactId ?? null,
      input.startDate, input.endDate ?? null, now, now,
    ]
  );
  return { error: null };
}

export async function updateRecurringTemplate(
  id: string,
  updates: { amount: number; categoryId: string | null; accountId: string | null; notes: string | null }
): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE recurring_templates SET amount = ?, category_id = ?, account_id = ?, notes = ?, updated_at = ? WHERE id = ?',
    [updates.amount, updates.categoryId ?? null, updates.accountId ?? null, updates.notes ?? null, new Date().toISOString(), id]
  );
  return { error: null };
}

export async function cancelRecurringTemplate(id: string): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE recurring_templates SET status = 'cancelled', updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
  return { error: null };
}

export function computeNextDueDate(template: RecurringTemplate): string {
  const base = template.last_generated_date ?? template.start_date;
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  if (template.last_generated_date) return toDateStr(addFrequency(d, template.frequency));
  return toDateStr(d);
}

function addFrequency(date: Date, freq: RecurrenceFrequency): Date {
  const d = new Date(date);
  if (freq === 'daily') d.setDate(d.getDate() + 1);
  else if (freq === 'weekly') d.setDate(d.getDate() + 7);
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type GeneratedRecord = { date: string; templateId: string; amount: number; categoryName: string | null };

export async function generateDueInstances(userId: string): Promise<GeneratedRecord[]> {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const templates = await db.getAllAsync<any>(
    `SELECT rt.*, c.name as category_name
     FROM recurring_templates rt
     LEFT JOIN categories c ON rt.category_id = c.id
     WHERE rt.user_id = ? AND rt.status = 'active'`,
    [userId]
  );

  const created: GeneratedRecord[] = [];

  for (const tmpl of templates) {
    let cursor = tmpl.last_generated_date
      ? new Date(tmpl.last_generated_date)
      : new Date(tmpl.start_date);
    cursor.setHours(0, 0, 0, 0);
    if (tmpl.last_generated_date) cursor = addFrequency(cursor, tmpl.frequency);

    const endDate = tmpl.end_date ? new Date(tmpl.end_date) : null;
    let latestGenerated: string | null = tmpl.last_generated_date;

    while (cursor <= today) {
      if (endDate && cursor > endDate) break;
      const dateStr = toDateStr(cursor);
      const isIncome = tmpl.subtype === 'investment_contribution';
      const payerType = tmpl.subtype === 'paid_for_other' ? 'paid_for_other' : 'self';

      await createTransaction(userId, {
        amount: tmpl.amount, date: dateStr,
        name: null,
        categoryId: tmpl.category_id, accountId: tmpl.account_id,
        projectId: tmpl.project_id, notes: tmpl.notes ?? '',
        payerType, contactId: tmpl.contact_id, payerName: null, isIncome,
      });

      created.push({ date: dateStr, templateId: tmpl.id, amount: tmpl.amount, categoryName: tmpl.category_name ?? null });
      latestGenerated = dateStr;
      cursor = addFrequency(cursor, tmpl.frequency);
    }

    if (latestGenerated && latestGenerated !== tmpl.last_generated_date) {
      await db.runAsync(
        'UPDATE recurring_templates SET last_generated_date = ?, updated_at = ? WHERE id = ?',
        [latestGenerated, new Date().toISOString(), tmpl.id]
      );
    }

    if (endDate && today > endDate) {
      await db.runAsync(
        `UPDATE recurring_templates SET status = 'completed', updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), tmpl.id]
      );
    }
  }

  return created;
}
