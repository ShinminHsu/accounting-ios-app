import { getDb } from './db';
import { Category } from '../types/database';

export type CategoryWithChildren = Category & { children: Category[] };

function rowToCategory(row: any): Category {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    emoji: row.emoji ?? null,
    parent_id: row.parent_id ?? null,
    is_default: row.is_default === 1,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
  };
}

export async function fetchCategories(userId: string): Promise<CategoryWithChildren[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order ASC',
    [userId]
  );
  const all = rows.map(rowToCategory);
  const parents = all.filter((c) => c.parent_id === null);
  return parents.map((parent) => ({
    ...parent,
    children: all.filter((c) => c.parent_id === parent.id),
  }));
}

export async function createCategory(
  userId: string,
  name: string,
  emoji: string | null,
  parentId: string | null
): Promise<{ data: Category | null; error: string | null }> {
  const db = await getDb();

  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND name = ? AND parent_id IS ?',
    [userId, name.trim(), parentId]
  );
  if (existing && existing.count > 0) {
    return { data: null, error: '同層級已有相同名稱的分類' };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO categories (id, user_id, name, emoji, parent_id, is_default, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?)',
    [id, userId, name.trim(), emoji ?? null, parentId ?? null, now]
  );
  const row = await db.getFirstAsync<any>('SELECT * FROM categories WHERE id = ?', [id]);
  return { data: row ? rowToCategory(row) : null, error: null };
}

export async function updateCategory(
  id: string,
  name: string,
  emoji: string | null
): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE categories SET name = ?, emoji = ? WHERE id = ?',
    [name.trim(), emoji ?? null, id]
  );
  return { error: null };
}

export async function deleteCategory(id: string): Promise<{ error: string | null }> {
  const db = await getDb();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
    [id]
  );
  if (result && result.count > 0) {
    return { error: `此分類有 ${result.count} 筆交易，請先重新指定後再刪除` };
  }
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  return { error: null };
}
