import { supabase } from './supabase';
import { Contact } from '../types/database';

export async function fetchContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error || !data) return [];
  return data as Contact[];
}

export async function createContact(
  userId: string,
  name: string
): Promise<{ data: Contact | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contacts')
    .insert({ user_id: userId, name: name.trim() })
    .select()
    .single();
  if (error || !data) return { data: null, error: error?.message ?? '建立失敗' };
  return { data: data as Contact, error: null };
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  return { error: error?.message ?? null };
}
