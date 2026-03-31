import { supabase } from './supabase';
import { Category } from '../types/database';

export type CategoryWithChildren = Category & { children: Category[] };

export async function fetchCategories(userId: string): Promise<CategoryWithChildren[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];

  const parents = data.filter((c) => c.parent_id === null);
  return parents.map((parent) => ({
    ...parent,
    children: data.filter((c) => c.parent_id === parent.id),
  }));
}

export async function createCategory(
  userId: string,
  name: string,
  emoji: string | null,
  parentId: string | null
): Promise<{ data: Category | null; error: string | null }> {
  // Unique name check within same level under same parent
  const { count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('name', name.trim())
    .is('parent_id', parentId);

  if (count && count > 0) {
    return { data: null, error: '同層級已有相同名稱的分類' };
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: name.trim(), emoji, parent_id: parentId, is_default: false })
    .select()
    .single();

  return { data: data ?? null, error: error?.message ?? null };
}

export async function updateCategory(
  id: string,
  name: string,
  emoji: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('categories')
    .update({ name: name.trim(), emoji })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteCategory(
  id: string
): Promise<{ error: string | null }> {
  // Block if any transactions reference this category
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0) {
    return { error: `此分類有 ${count} 筆交易，請先重新指定後再刪除` };
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  return { error: error?.message ?? null };
}
