import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import {
  fetchFriendships, sendFriendRequest, acceptFriendRequest,
  declineFriendRequest, removeFriend, searchUserByInviteCode,
  FriendWithContact,
} from '../../lib/friends';
import { colors, typography, spacing, radius } from '../../theme';

export function FriendsScreen() {
  const [friends, setFriends] = useState<FriendWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);
    const data = await fetchFriendships(session.user.id);
    setFriends(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = friends.filter((f) => f.status === 'active');
  const pendingIncoming = friends.filter((f) => f.status === 'pending' && !f.isRequester);
  const pendingOutgoing = friends.filter((f) => f.status === 'pending' && f.isRequester);

  async function handleAccept(f: FriendWithContact) {
    if (!userId) return;
    const { error } = await acceptFriendRequest(f.friendshipId, userId);
    if (error) Alert.alert('失敗', error);
    else load();
  }

  async function handleDecline(f: FriendWithContact) {
    const { error } = await declineFriendRequest(f.friendshipId);
    if (error) Alert.alert('失敗', error);
    else load();
  }

  async function handleRemove(f: FriendWithContact) {
    Alert.alert('移除好友', `確定移除「${f.friendDisplayName ?? f.friendEmail}」？未來的共同記帳將停止同步，過去記錄不受影響。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '移除', style: 'destructive',
        onPress: async () => {
          const { error } = await removeFriend(f.friendshipId);
          if (error) Alert.alert('失敗', error);
          else load();
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Pending incoming */}
          {pendingIncoming.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>待回覆邀請</Text>
              {pendingIncoming.map((f) => (
                <View key={f.friendshipId} style={styles.card}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.name}>{f.friendDisplayName ?? f.friendEmail}</Text>
                    <Text style={styles.email}>{f.friendEmail}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(f)}>
                      <Text style={styles.acceptText}>接受</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(f)}>
                      <Text style={styles.declineText}>拒絕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Active friends */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>好友（{active.length}）</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
              <Text style={styles.addBtnText}>＋ 新增</Text>
            </TouchableOpacity>
          </View>

          {active.length === 0 ? (
            <Text style={styles.empty}>尚無好友，點擊「新增」以邀請</Text>
          ) : (
            active.map((f) => (
              <View key={f.friendshipId} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{f.friendDisplayName ?? f.friendEmail}</Text>
                  <Text style={styles.email}>{f.friendEmail}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemove(f)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>移除</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Pending outgoing */}
          {pendingOutgoing.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { marginTop: spacing.lg }]}>已發送邀請</Text>
              {pendingOutgoing.map((f) => (
                <View key={f.friendshipId} style={[styles.card, { opacity: 0.6 }]}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.name}>{f.friendDisplayName ?? f.friendEmail}</Text>
                    <Text style={styles.email}>等待對方接受</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {userId && (
        <AddFriendModal
          visible={showAdd}
          userId={userId}
          onClose={() => setShowAdd(false)}
          onSent={() => { setShowAdd(false); load(); }}
        />
      )}
    </>
  );
}

// ── Add friend modal ──────────────────────────────────────────────────────────

function AddFriendModal({
  visible, userId, onClose, onSent,
}: {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; invite_code: string; display_name: string | null } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);

  function reset() {
    setCode(''); setFoundUser(null); setNotFound(false); setSending(false);
  }

  async function handleSearch() {
    if (code.length < 6) return;
    setSearching(true); setFoundUser(null); setNotFound(false);
    const user = await searchUserByInviteCode(code);
    setSearching(false);
    if (!user) { setNotFound(true); return; }
    if (user.id === userId) { Alert.alert('', '不能加自己為好友'); return; }
    setFoundUser(user);
  }

  async function handleSend() {
    if (!foundUser) return;
    setSending(true);
    const { error } = await sendFriendRequest(userId, foundUser.id);
    setSending(false);
    if (error) { Alert.alert('失敗', error); return; }
    Alert.alert('已發送', '好友邀請已送出');
    reset(); onSent();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>新增好友</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.searchBody}>
          <Text style={styles.label}>輸入邀請碼</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, styles.codeInput]}
              value={code}
              onChangeText={(v) => {
                setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                setFoundUser(null);
                setNotFound(false);
              }}
              placeholder="A3K9MZ"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.searchBtn, code.length < 6 && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={searching || code.length < 6}
            >
              {searching
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.searchBtnText}>搜尋</Text>}
            </TouchableOpacity>
          </View>

          {notFound && (
            <Text style={styles.notFound}>找不到此邀請碼對應的用戶</Text>
          )}

          {foundUser && (
            <View style={styles.foundCard}>
              <View style={styles.foundInfo}>
                <Text style={styles.name}>{foundUser.display_name ?? '好友'}</Text>
                <Text style={styles.email}>邀請碼：{foundUser.invite_code}</Text>
              </View>
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
                {sending
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.sendBtnText}>送出邀請</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionHeader: {
    fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold,
    color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.xs, marginTop: spacing.sm,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs, marginTop: spacing.sm },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.full },
  addBtnText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  empty: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs },
  cardInfo: { flex: 1 },
  name: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  email: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  acceptBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.full },
  acceptText: { color: colors.white, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  declineBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full },
  declineText: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  removeBtn: { paddingHorizontal: spacing.sm },
  removeText: { fontSize: typography.sizes.xs, color: colors.expense },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  sheetTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  cancelText: { fontSize: typography.sizes.md, color: colors.textSecondary },
  searchBody: { padding: spacing.md },
  label: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: typography.weights.medium },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: typography.sizes.md, color: colors.text, backgroundColor: colors.surface,
  },
  searchBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.sm },
  searchBtnDisabled: { opacity: 0.45 },
  searchBtnText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  codeInput: { fontFamily: 'Courier', letterSpacing: 4, textTransform: 'uppercase' },
  notFound: { fontSize: typography.sizes.sm, color: colors.expense, marginTop: spacing.sm },
  foundCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  foundInfo: { flex: 1 },
  sendBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.full },
  sendBtnText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
});
