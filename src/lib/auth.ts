import { supabase } from './supabase';

export async function signInAnonymously() {
  return supabase.auth.signInAnonymously();
}

export async function linkAppleIdentity() {
  return supabase.auth.linkIdentity({ provider: 'apple' });
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function ensureUserProfile(
  userId: string
): Promise<{ inviteCode: string | null; error: string | null }> {
  // Check for existing row
  const { data: existing } = await supabase
    .from('users')
    .select('id, invite_code')
    .eq('id', userId)
    .single();

  if (existing?.invite_code) {
    return { inviteCode: existing.invite_code, error: null };
  }

  // Need to insert or update — generate code with up to 3 retries
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();

    if (!existing) {
      const { error } = await supabase
        .from('users')
        .insert({ id: userId, invite_code: code });
      if (!error) return { inviteCode: code, error: null };
      // If not a unique violation, bail immediately
      if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
        return { inviteCode: null, error: error.message };
      }
    } else {
      // Row exists but no invite_code
      const { error } = await supabase
        .from('users')
        .update({ invite_code: code })
        .eq('id', userId);
      if (!error) return { inviteCode: code, error: null };
      if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
        return { inviteCode: null, error: error.message };
      }
    }
  }

  return { inviteCode: null, error: 'invite code collision' };
}
