import { supabase } from './supabase';
import { Friendship, FriendshipStatus, SharedTransaction } from '../types/database';
import { createTransaction } from './transactions';
import { scheduleLocalNotification } from './notifications';

// ── Types ────────────────────────────────────────────────────────────────────

export type FriendWithContact = {
  friendshipId: string;
  friendUserId: string;
  friendEmail: string;
  friendDisplayName: string | null;
  contactId: string | null;
  status: FriendshipStatus;
  isRequester: boolean;
};

// ── User lookup ──────────────────────────────────────────────────────────────

export async function searchUserByInviteCode(
  code: string
): Promise<{ id: string; invite_code: string; display_name: string | null } | null> {
  const { data } = await supabase
    .from('users')
    .select('id, invite_code, display_name')
    .eq('invite_code', code.toUpperCase().trim())
    .single();
  return data ?? null;
}

// ── Friendship management ────────────────────────────────────────────────────

export async function fetchFriendships(userId: string): Promise<FriendWithContact[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .neq('status', 'removed');

  if (error || !data) return [];

  const results: FriendWithContact[] = [];

  for (const row of data as Friendship[]) {
    const isUserA = row.user_a === userId;
    const friendUserId = isUserA ? row.user_b : row.user_a;

    const { data: friendUser } = await supabase
      .from('users')
      .select('email, display_name')
      .eq('id', friendUserId)
      .single();

    // Find linked contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('linked_user_id', friendUserId)
      .single();

    results.push({
      friendshipId: row.id,
      friendUserId,
      friendEmail: friendUser?.email ?? '',
      friendDisplayName: friendUser?.display_name ?? null,
      contactId: contact?.id ?? null,
      status: row.status,
      isRequester: row.requester_id === userId,
    });
  }

  return results;
}

export async function sendFriendRequest(
  userId: string,
  targetUserId: string
): Promise<{ error: string | null }> {
  // Check if friendship already exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(user_a.eq.${userId},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${userId})`)
    .single();

  if (existing) {
    if (existing.status === 'active') return { error: '你們已是好友' };
    if (existing.status === 'pending') return { error: '已有待處理的好友邀請' };
  }

  const { error } = await supabase.from('friendships').insert({
    user_a: userId,
    user_b: targetUserId,
    requester_id: userId,
    status: 'pending',
  });

  if (error) return { error: error.message };

  // Send push notification to target (best-effort)
  const { data: targetUser } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', targetUserId)
    .single();

  if (targetUser?.push_token) {
    // Fire-and-forget: send via Expo push service
    fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: targetUser.push_token,
        title: '好友邀請',
        body: '有人向你發送好友邀請',
      }),
    }).catch(() => {});
  }

  return { error: null };
}

export async function acceptFriendRequest(
  friendshipId: string,
  acceptingUserId: string
): Promise<{ error: string | null }> {
  const { data: friendship } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .single();

  if (!friendship) return { error: '找不到邀請記錄' };

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);

  if (error) return { error: error.message };

  // Link the contact: find or create a contact for the requester in the accepting user's contacts
  const friendUserId = friendship.requester_id;
  const { data: friendUser } = await supabase
    .from('users')
    .select('email, display_name')
    .eq('id', friendUserId)
    .single();

  const friendName = friendUser?.display_name ?? friendUser?.email ?? '好友';

  // Check if contact already exists with this linked_user_id
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', acceptingUserId)
    .eq('linked_user_id', friendUserId)
    .single();

  if (!existingContact) {
    await supabase.from('contacts').insert({
      user_id: acceptingUserId,
      name: friendName,
      linked_user_id: friendUserId,
    });
  }

  // Also create contact in requester's list for the accepting user
  const { data: requesterContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', friendUserId)
    .eq('linked_user_id', acceptingUserId)
    .single();

  if (!requesterContact) {
    const { data: acceptingUser } = await supabase
      .from('users')
      .select('email, display_name')
      .eq('id', acceptingUserId)
      .single();

    await supabase.from('contacts').insert({
      user_id: friendUserId,
      name: acceptingUser?.display_name ?? acceptingUser?.email ?? '好友',
      linked_user_id: acceptingUserId,
    });
  }

  return { error: null };
}

export async function declineFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  return { error: error?.message ?? null };
}

export async function removeFriend(friendshipId: string): Promise<{ error: string | null }> {
  // Deactivate friendship — stops future sync; existing debt records preserved
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  return { error: error?.message ?? null };
}

// ── Check if contact is an active friend ─────────────────────────────────────

export async function getActiveFriendship(
  userId: string,
  contactId: string
): Promise<{ friendshipId: string; friendUserId: string } | null> {
  // Get contact's linked_user_id
  const { data: contact } = await supabase
    .from('contacts')
    .select('linked_user_id')
    .eq('id', contactId)
    .eq('user_id', userId)
    .single();

  if (!contact?.linked_user_id) return null;

  const friendUserId = contact.linked_user_id;

  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(user_a.eq.${userId},user_b.eq.${friendUserId}),and(user_a.eq.${friendUserId},user_b.eq.${userId})`)
    .eq('status', 'active')
    .single();

  if (!friendship) return null;
  return { friendshipId: friendship.id, friendUserId };
}

// ── Write shared transaction (task 11.3) ─────────────────────────────────────

export async function writeSharedTransaction(
  payerId: string,
  payeeId: string,
  amount: number,
  currency: string,
  date: string,
  categoryName: string | null,
  notes: string | null,
  sourceTransactionId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('shared_transactions').insert({
    payer_id: payerId,
    payee_id: payeeId,
    amount,
    currency,
    date,
    category_name: categoryName,
    notes,
    source_transaction_id: sourceTransactionId,
  });
  return { error: error?.message ?? null };
}

// ── Realtime listener for incoming shared transactions (task 11.4) ────────────

export function subscribeToSharedTransactions(
  userId: string,
  onReceived: (sharedTxn: SharedTransaction) => void
) {
  return supabase
    .channel('shared_transactions_incoming')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shared_transactions',
        filter: `payee_id=eq.${userId}`,
      },
      (payload) => {
        onReceived(payload.new as SharedTransaction);
      }
    )
    .subscribe();
}

// ── Auto-create liability from incoming shared transaction ────────────────────

export async function handleIncomingSharedTransaction(
  userId: string,
  sharedTxn: SharedTransaction
): Promise<void> {
  // Create liability record (paid-by-other type)
  // Find or create contact for the payer
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('linked_user_id', sharedTxn.payer_id)
    .single();

  const contactId = contact?.id ?? null;

  await createTransaction(userId, {
    amount: sharedTxn.amount,
    date: sharedTxn.date,
    name: null,
    categoryId: null,
    accountId: null,
    projectId: null,
    notes: sharedTxn.notes ?? sharedTxn.category_name ?? '好友代付',
    payerType: 'paid_by_other',
    contactId,
    payerName: null,
    isIncome: false,
  });

  // Send local notification
  await scheduleLocalNotification(
    '好友代付通知',
    `NT$ ${sharedTxn.amount.toLocaleString('zh-TW')} 已自動建立負債記錄`
  );
}

// ── Dispute a shared transaction (task 11.7) ─────────────────────────────────

export async function disputeSharedTransaction(
  userId: string,
  sourceTransactionId: string,
  note: string | null
): Promise<{ error: string | null }> {
  // Find the debt record linked to this transaction
  const { data: txn } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('notes', '好友代付')
    .single();

  if (!txn) return { error: '找不到對應的負債記錄' };

  const { error } = await supabase
    .from('debt_records')
    .update({ status: 'disputed', dispute_note: note })
    .eq('transaction_id', txn.id)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}
