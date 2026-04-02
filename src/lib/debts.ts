import { supabase } from './supabase';
import { DebtRecord, DebtStatus } from '../types/database';
import { createTransaction } from './transactions';

// ── Types ────────────────────────────────────────────────────────────────────

export type DebtRecordWithRefs = DebtRecord & {
  contact_name: string | null;
  transaction_date: string | null;
  transaction_notes: string | null;
};

export type ContactDebtSummary = {
  contactId: string;
  contactName: string;
  netBalance: number; // positive = they owe me, negative = I owe them
  outstandingCount: number;
};

// ── Per-contact net balance summary (task 10.2) ──────────────────────────────

export async function fetchDebtSummaryByContact(
  userId: string
): Promise<ContactDebtSummary[]> {
  const { data, error } = await supabase
    .from('debt_records')
    .select(`*, contacts(name)`)
    .eq('user_id', userId)
    .neq('status', 'settled')
    .not('contact_id', 'is', null);

  if (error || !data) return [];

  const map: Record<string, ContactDebtSummary> = {};

  for (const row of data) {
    const contactId = row.contact_id as string;
    const contactName = (row.contacts as any)?.name ?? '未知聯絡人';
    if (!map[contactId]) {
      map[contactId] = { contactId, contactName, netBalance: 0, outstandingCount: 0 };
    }
    const outstanding = row.original_amount - row.repaid_amount;
    if (row.type === 'receivable') {
      map[contactId].netBalance += outstanding; // they owe me
    } else {
      map[contactId].netBalance -= outstanding; // I owe them
    }
    if (row.status !== 'settled') map[contactId].outstandingCount++;
  }

  return Object.values(map).sort((a, b) => b.outstandingCount - a.outstandingCount);
}

// ── Debt records for a specific contact ──────────────────────────────────────

export async function fetchDebtRecordsForContact(
  userId: string,
  contactId: string
): Promise<DebtRecordWithRefs[]> {
  const { data, error } = await supabase
    .from('debt_records')
    .select(`*, contacts(name), transactions(date, notes)`)
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    ...row,
    contact_name: row.contacts?.name ?? null,
    transaction_date: row.transactions?.date ?? null,
    transaction_notes: row.transactions?.notes ?? null,
  }));
}

// ── Record repayment (task 10.3) ─────────────────────────────────────────────

export async function recordRepayment(
  userId: string,
  debtRecord: DebtRecord,
  amount: number,
  date: string,
  accountId: string
): Promise<{ error: string | null }> {
  const outstanding = debtRecord.original_amount - debtRecord.repaid_amount;

  if (amount > outstanding) {
    return { error: `還款金額（${amount}）超過剩餘金額（${outstanding.toFixed(0)}）` };
  }

  // Create cash transaction for the repayment
  const isIncome = debtRecord.type === 'receivable'; // receiving repayment = income
  const { error: txErr } = await createTransaction(userId, {
    amount,
    date,
    categoryId: null,
    accountId,
    projectId: null,
    notes: debtRecord.type === 'receivable' ? '應收款回收' : '應付款還款',
    payerType: 'self',
    contactId: debtRecord.contact_id,
    isIncome,
  });
  if (txErr) return { error: txErr };

  const newRepaid = debtRecord.repaid_amount + amount;
  const isFullyRepaid = newRepaid >= debtRecord.original_amount;

  const { error: updateErr } = await supabase
    .from('debt_records')
    .update({
      repaid_amount: newRepaid,
      status: isFullyRepaid ? 'settled' : debtRecord.status,
      settled_at: isFullyRepaid ? new Date().toISOString() : null,
    })
    .eq('id', debtRecord.id);

  return { error: updateErr?.message ?? null };
}

// ── Toggle dispute flag (task 10.4) ─────────────────────────────────────────

export async function toggleDisputeFlag(
  debtRecordId: string,
  isDisputed: boolean,
  note: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('debt_records')
    .update({
      status: isDisputed ? 'disputed' : 'outstanding',
      dispute_note: isDisputed ? note : null,
    })
    .eq('id', debtRecordId);
  return { error: error?.message ?? null };
}
