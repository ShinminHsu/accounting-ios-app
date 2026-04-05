import { getDb } from './db';
import { DebtRecord, DebtStatus } from '../types/database';
import { createTransaction } from './transactions';

export type DebtRecordWithRefs = DebtRecord & {
  contact_name: string | null;
  transaction_date: string | null;
  transaction_notes: string | null;
};

export type ContactDebtSummary = {
  contactId: string | null;   // null for free-text payer (no saved contact)
  contactName: string;
  netBalance: number;
  outstandingCount: number;
};

function rowToDebt(row: any): DebtRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    transaction_id: row.transaction_id ?? null,
    contact_id: row.contact_id ?? null,
    payer_name: row.payer_name ?? null,
    type: row.type,
    original_amount: row.original_amount,
    repaid_amount: row.repaid_amount,
    currency: row.currency,
    status: row.status as DebtStatus,
    dispute_note: row.dispute_note ?? null,
    created_at: row.created_at,
    settled_at: row.settled_at ?? null,
  };
}

export async function fetchOutstandingTotals(
  userId: string
): Promise<{ lent: number; borrowed: number }> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT type, SUM(original_amount - repaid_amount) as total
     FROM debt_records
     WHERE user_id = ? AND status != 'settled'
     GROUP BY type`,
    [userId]
  );
  let lent = 0;
  let borrowed = 0;
  for (const row of rows) {
    if (row.type === 'receivable') lent = row.total ?? 0;
    else borrowed = row.total ?? 0;
  }
  return { lent, borrowed };
}

export async function fetchDebtSummaryByContact(userId: string): Promise<ContactDebtSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT d.*, c.name as contact_name
     FROM debt_records d
     LEFT JOIN contacts c ON d.contact_id = c.id
     WHERE d.user_id = ? AND d.status != 'settled'
       AND (d.contact_id IS NOT NULL OR d.payer_name IS NOT NULL)`,
    [userId]
  );

  const map: Record<string, ContactDebtSummary> = {};
  for (const row of rows) {
    // Group by contactId when available, otherwise by payer_name
    const key: string = row.contact_id ?? `name:${row.payer_name}`;
    const contactName: string = row.contact_name ?? row.payer_name ?? '未知';
    if (!map[key]) {
      map[key] = {
        contactId: row.contact_id ?? null,
        contactName,
        netBalance: 0,
        outstandingCount: 0,
      };
    }
    const outstanding = row.original_amount - row.repaid_amount;
    if (row.type === 'receivable') map[key].netBalance += outstanding;
    else map[key].netBalance -= outstanding;
    map[key].outstandingCount++;
  }
  return Object.values(map).sort((a, b) => b.outstandingCount - a.outstandingCount);
}

export async function fetchDebtRecordsForContact(
  userId: string,
  contactId: string | null,
  payerNameFilter?: string
): Promise<DebtRecordWithRefs[]> {
  const db = await getDb();
  let rows: any[];
  if (contactId) {
    rows = await db.getAllAsync<any>(
      `SELECT d.*, c.name as contact_name, t.date as transaction_date, t.notes as transaction_notes
       FROM debt_records d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN transactions t ON d.transaction_id = t.id
       WHERE d.user_id = ? AND d.contact_id = ?
       ORDER BY d.created_at DESC`,
      [userId, contactId]
    );
  } else {
    rows = await db.getAllAsync<any>(
      `SELECT d.*, c.name as contact_name, t.date as transaction_date, t.notes as transaction_notes
       FROM debt_records d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN transactions t ON d.transaction_id = t.id
       WHERE d.user_id = ? AND d.contact_id IS NULL AND d.payer_name = ?
       ORDER BY d.created_at DESC`,
      [userId, payerNameFilter ?? '']
    );
  }
  return rows.map((row) => ({
    ...rowToDebt(row),
    contact_name: row.contact_name ?? null,
    transaction_date: row.transaction_date ?? null,
    transaction_notes: row.transaction_notes ?? null,
  }));
}

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

  const isIncome = debtRecord.type === 'receivable';
  const { error: txErr } = await createTransaction(userId, {
    amount, date, name: null, categoryId: null, accountId, projectId: null,
    notes: debtRecord.type === 'receivable' ? '應收款回收' : '應付款還款',
    payerType: 'self', contactId: debtRecord.contact_id, payerName: null, isIncome,
  });
  if (txErr) return { error: txErr };

  const db = await getDb();
  const newRepaid = debtRecord.repaid_amount + amount;
  const isFullyRepaid = newRepaid >= debtRecord.original_amount;
  await db.runAsync(
    'UPDATE debt_records SET repaid_amount = ?, status = ?, settled_at = ? WHERE id = ?',
    [newRepaid, isFullyRepaid ? 'settled' : debtRecord.status, isFullyRepaid ? new Date().toISOString() : null, debtRecord.id]
  );
  return { error: null };
}

export async function toggleDisputeFlag(
  debtRecordId: string,
  isDisputed: boolean,
  note: string | null
): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE debt_records SET status = ?, dispute_note = ? WHERE id = ?',
    [isDisputed ? 'disputed' : 'outstanding', isDisputed ? note : null, debtRecordId]
  );
  return { error: null };
}
