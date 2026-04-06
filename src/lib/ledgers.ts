import { getDb, generateUUID } from './db';
import { supabase } from './supabase';
import { Ledger, LedgerMember } from '../types/database';

function rowToLedger(row: any): Ledger {
  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    name: row.name,
    is_personal: row.is_personal === 1,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToLedgerMember(row: any): LedgerMember {
  return {
    id: row.id,
    ledger_id: row.ledger_id,
    user_id: row.user_id,
    status: row.status as 'invited' | 'active',
    joined_at: row.joined_at ?? null,
    created_at: row.created_at,
  };
}

// ─── 2.1 Personal ledger initialization ──────────────────────────────────────
export async function seedPersonalLedger(userId: string): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM ledgers WHERE owner_user_id = ? AND is_personal = 1',
    [userId]
  );
  if (existing) return;

  const id = generateUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO ledgers (id, owner_user_id, name, is_personal, start_date, end_date, created_at, updated_at)
     VALUES (?, ?, ?, 1, NULL, NULL, ?, ?)`,
    [id, userId, '個人', now, now]
  );
  await db.runAsync(
    `INSERT INTO ledger_members (id, ledger_id, user_id, status, joined_at, created_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
    [generateUUID(), id, userId, now, now]
  );
}

// ─── 2.2 Fetch user's ledgers ─────────────────────────────────────────────────
export async function fetchLedgers(
  userId: string
): Promise<{ active: Ledger[]; invited: Ledger[] }> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT l.*, lm.status as member_status
     FROM ledgers l
     JOIN ledger_members lm ON lm.ledger_id = l.id AND lm.user_id = ?
     ORDER BY l.is_personal DESC, l.created_at ASC`,
    [userId]
  );

  const active: Ledger[] = [];
  const invited: Ledger[] = [];
  for (const row of rows) {
    const ledger = rowToLedger(row);
    if (row.member_status === 'active') active.push(ledger);
    else if (row.member_status === 'invited') invited.push(ledger);
  }
  return { active, invited };
}

// ─── 2.3 Create shared ledger ─────────────────────────────────────────────────
export async function createLedger(
  userId: string,
  name: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<{ data: Ledger | null; error: string | null }> {
  const db = await getDb();
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO ledgers (id, owner_user_id, name, is_personal, start_date, end_date, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
    [id, userId, name, startDate ?? null, endDate ?? null, now, now]
  );
  await db.runAsync(
    `INSERT INTO ledger_members (id, ledger_id, user_id, status, joined_at, created_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
    [generateUUID(), id, userId, now, now]
  );

  const row = await db.getFirstAsync<any>('SELECT * FROM ledgers WHERE id = ?', [id]);
  return { data: row ? rowToLedger(row) : null, error: null };
}

// ─── 2.4 Delete shared ledger ─────────────────────────────────────────────────
export async function deleteLedger(
  ledgerId: string,
  userId: string
): Promise<{ error: string | null }> {
  const db = await getDb();
  const ledger = await db.getFirstAsync<any>('SELECT * FROM ledgers WHERE id = ?', [ledgerId]);
  if (!ledger) return { error: '找不到帳本' };
  if (ledger.is_personal === 1) return { error: '個人帳本無法刪除' };
  if (ledger.owner_user_id !== userId) return { error: '只有帳本建立者可以刪除帳本' };

  await db.runAsync('DELETE FROM ledgers WHERE id = ?', [ledgerId]);
  return { error: null };
}

// ─── 3.1 Invite friend to shared ledger ───────────────────────────────────────
export async function inviteToLedger(
  ledgerId: string,
  ownerUserId: string,
  friendUserId: string
): Promise<{ error: string | null }> {
  // Verify active friendship via Supabase friendships table
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('status', 'active')
    .or(
      `and(user_a.eq.${ownerUserId},user_b.eq.${friendUserId}),and(user_a.eq.${friendUserId},user_b.eq.${ownerUserId})`
    )
    .maybeSingle();

  if (!friendship) return { error: '只能邀請好友加入帳本' };

  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM ledger_members WHERE ledger_id = ? AND user_id = ?',
    [ledgerId, friendUserId]
  );
  if (existing) return { error: '該使用者已在帳本中' };

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO ledger_members (id, ledger_id, user_id, status, joined_at, created_at)
     VALUES (?, ?, ?, 'invited', NULL, ?)`,
    [generateUUID(), ledgerId, friendUserId, now]
  );
  return { error: null };
}

// ─── 3.2 Accept ledger invitation ─────────────────────────────────────────────
export async function acceptLedgerInvite(
  ledgerId: string,
  userId: string
): Promise<{ error: string | null }> {
  const db = await getDb();
  const member = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM ledger_members WHERE ledger_id = ? AND user_id = ? AND status = 'invited'",
    [ledgerId, userId]
  );
  if (!member) return { error: '找不到邀請記錄' };

  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE ledger_members SET status = 'active', joined_at = ? WHERE id = ?",
    [now, member.id]
  );
  return { error: null };
}

// ─── 3.3 Leave shared ledger ──────────────────────────────────────────────────
export async function leaveLedger(
  ledgerId: string,
  userId: string
): Promise<{ error: string | null }> {
  const db = await getDb();
  const ledger = await db.getFirstAsync<{ owner_user_id: string }>(
    'SELECT owner_user_id FROM ledgers WHERE id = ?',
    [ledgerId]
  );
  if (!ledger) return { error: '找不到帳本' };
  if (ledger.owner_user_id === userId) return { error: '帳本建立者無法退出，請刪除帳本' };

  await db.runAsync(
    'DELETE FROM ledger_members WHERE ledger_id = ? AND user_id = ?',
    [ledgerId, userId]
  );
  return { error: null };
}

// ─── 3.4 Fetch ledger members ─────────────────────────────────────────────────
export async function fetchLedgerMembers(ledgerId: string): Promise<LedgerMember[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM ledger_members WHERE ledger_id = ? AND status = 'active'",
    [ledgerId]
  );
  return rows.map(rowToLedgerMember);
}
