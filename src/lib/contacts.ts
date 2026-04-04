import { getDb } from './db';
import { Contact } from '../types/database';

function rowToContact(row: any): Contact {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    linked_user_id: row.linked_user_id ?? null,
    created_at: row.created_at,
  };
}

export async function fetchContacts(userId: string): Promise<Contact[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM contacts WHERE user_id = ? ORDER BY name ASC',
    [userId]
  );
  return rows.map(rowToContact);
}

export async function createContact(
  userId: string,
  name: string
): Promise<{ data: Contact | null; error: string | null }> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO contacts (id, user_id, name, linked_user_id, created_at) VALUES (?, ?, ?, NULL, ?)',
    [id, userId, name.trim(), now]
  );
  const row = await db.getFirstAsync<any>('SELECT * FROM contacts WHERE id = ?', [id]);
  return { data: row ? rowToContact(row) : null, error: null };
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync('DELETE FROM contacts WHERE id = ?', [id]);
  return { error: null };
}
