import { supabase } from './supabase';
import { RecurringTemplate, RecurrenceFrequency, RecurrenceSubtype } from '../types/database';
import { createTransaction } from './transactions';

export type RecurringTemplateWithRefs = RecurringTemplate & {
  category_name: string | null;
  category_emoji: string | null;
  account_name: string | null;
  contact_name: string | null;
};

// ── Fetch templates ─────────────────────────────────────────────────────────

export async function fetchRecurringTemplates(
  userId: string
): Promise<RecurringTemplateWithRefs[]> {
  const { data, error } = await supabase
    .from('recurring_templates')
    .select(`
      *,
      categories(name, emoji),
      accounts(name),
      contacts(name)
    `)
    .eq('user_id', userId)
    .order('status')
    .order('start_date');

  if (error || !data) return [];

  return data.map((t: any) => ({
    ...t,
    category_name: t.categories?.name ?? null,
    category_emoji: t.categories?.emoji ?? null,
    account_name: t.accounts?.name ?? null,
    contact_name: t.contacts?.name ?? null,
  }));
}

// ── Create template ─────────────────────────────────────────────────────────

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
  const { error } = await supabase.from('recurring_templates').insert({
    user_id: userId,
    amount: input.amount,
    category_id: input.categoryId,
    account_id: input.accountId,
    project_id: input.projectId,
    notes: input.notes || null,
    frequency: input.frequency,
    subtype: input.subtype,
    contact_id: input.contactId,
    start_date: input.startDate,
    end_date: input.endDate,
    status: 'active',
  });
  return { error: error?.message ?? null };
}

// ── Edit template (amount, category, account, notes only) ───────────────────

export async function updateRecurringTemplate(
  id: string,
  updates: {
    amount: number;
    categoryId: string | null;
    accountId: string | null;
    notes: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('recurring_templates')
    .update({
      amount: updates.amount,
      category_id: updates.categoryId,
      account_id: updates.accountId,
      notes: updates.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

// ── Cancel template ─────────────────────────────────────────────────────────

export async function cancelRecurringTemplate(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('recurring_templates')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

// ── Compute next due date after a given date ────────────────────────────────

export function computeNextDueDate(template: RecurringTemplate): string {
  const base = template.last_generated_date ?? template.start_date;
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  if (template.last_generated_date) {
    return toDateStr(addFrequency(d, template.frequency));
  }
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

// ── Generate due instances on app open ─────────────────────────────────────

export type GeneratedRecord = { date: string; templateId: string; amount: number; categoryName: string | null };

export async function generateDueInstances(
  userId: string
): Promise<GeneratedRecord[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const { data: templates } = await supabase
    .from('recurring_templates')
    .select(`*, categories(name)`)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!templates || templates.length === 0) return [];

  const created: GeneratedRecord[] = [];

  for (const tmpl of templates) {
    // Determine start of generation: day after last_generated_date or start_date
    let cursor = tmpl.last_generated_date
      ? new Date(tmpl.last_generated_date)
      : new Date(tmpl.start_date);
    cursor.setHours(0, 0, 0, 0);

    // If last_generated_date exists, advance one period to get the next due date
    if (tmpl.last_generated_date) {
      cursor = addFrequency(cursor, tmpl.frequency);
    }

    const endDate = tmpl.end_date ? new Date(tmpl.end_date) : null;
    let latestGenerated: string | null = tmpl.last_generated_date;

    while (cursor <= today) {
      if (endDate && cursor > endDate) break;
      const dateStr = toDateStr(cursor);

      const isIncome = tmpl.subtype === 'investment_contribution';
      const payerType = tmpl.subtype === 'paid_for_other' ? 'paid_for_other' : 'self';

      await createTransaction(userId, {
        amount: tmpl.amount,
        date: dateStr,
        categoryId: tmpl.category_id,
        accountId: tmpl.account_id,
        projectId: tmpl.project_id,
        notes: tmpl.notes ?? '',
        payerType,
        contactId: tmpl.contact_id,
        isIncome,
      });

      created.push({
        date: dateStr,
        templateId: tmpl.id,
        amount: tmpl.amount,
        categoryName: (tmpl.categories as any)?.name ?? null,
      });

      latestGenerated = dateStr;
      cursor = addFrequency(cursor, tmpl.frequency);
    }

    if (latestGenerated && latestGenerated !== tmpl.last_generated_date) {
      await supabase
        .from('recurring_templates')
        .update({ last_generated_date: latestGenerated, updated_at: new Date().toISOString() })
        .eq('id', tmpl.id);
    }

    // Mark completed if end date passed
    if (endDate && today > endDate && tmpl.status === 'active') {
      await supabase
        .from('recurring_templates')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', tmpl.id);
    }
  }

  return created;
}
