import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserPlus, LogOut, Trash2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import {
  fetchLedgerMembers, inviteToLedger, leaveLedger, deleteLedger,
} from '../../lib/ledgers';
import { fetchFriendships, FriendWithContact } from '../../lib/friends';
import { Ledger, LedgerMember } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';
import { MoreStackParamList } from '../../navigation/MoreStackNavigator';

type NavProp = NativeStackNavigationProp<MoreStackParamList>;

type Props = {
  ledger: Ledger;
};

export function LedgerMembersScreen({ ledger }: Props) {
  const navigation = useNavigation<NavProp>();
  const [members, setMembers] = useState<LedgerMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friends, setFriends] = useState<FriendWithContact[]>([]);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setCurrentUserId(session.user.id);
    const m = await fetchLedgerMembers(ledger.id);
    setMembers(m);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function openFriendPicker() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const allFriends = await fetchFriendships(session.user.id);
    const active = allFriends.filter((f) => f.status === 'active');
    const memberUserIds = new Set(members.map((m) => m.user_id));
    const available = active.filter((f) => !memberUserIds.has(f.friendUserId));
    setFriends(available);
    setShowFriendPicker(true);
  }

  async function handleInvite(friend: FriendWithContact) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setInviting(true);
    const { error } = await inviteToLedger(ledger.id, session.user.id, friend.friendUserId);
    setInviting(false);
    if (error) { Alert.alert('失敗', error); return; }
    setShowFriendPicker(false);
    load();
  }

  async function handleLeave() {
    Alert.alert('退出帳本', '確定要退出此帳本？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出', style: 'destructive',
        onPress: async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const { error } = await leaveLedger(ledger.id, session.user.id);
          if (error) { Alert.alert('失敗', error); return; }
          navigation.goBack();
          navigation.goBack();
        },
      },
    ]);
  }

  async function handleDelete() {
    Alert.alert('刪除帳本', `確定刪除「${ledger.name}」？此操作無法復原。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除', style: 'destructive',
        onPress: async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const { error } = await deleteLedger(ledger.id, session.user.id);
          if (error) { Alert.alert('失敗', error); return; }
          navigation.goBack();
          navigation.goBack();
        },
      },
    ]);
  }

  const isOwner = currentUserId === ledger.owner_user_id;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionHeader}>成員</Text>
        {members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{m.user_id.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.memberName} numberOfLines={1}>{m.user_id}</Text>
            {m.user_id === ledger.owner_user_id && (
              <Text style={styles.ownerBadge}>建立者</Text>
            )}
          </View>
        ))}

        {/* Invite button (owner only) */}
        {isOwner && (
          <TouchableOpacity style={styles.actionRow} onPress={openFriendPicker}>
            <UserPlus size={18} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>邀請好友</Text>
          </TouchableOpacity>
        )}

        {/* Leave / Delete */}
        <View style={styles.dangerZone}>
          {!isOwner && (
            <TouchableOpacity style={[styles.actionRow, styles.dangerRow]} onPress={handleLeave}>
              <LogOut size={18} color={colors.expense} style={styles.actionIcon} />
              <Text style={[styles.actionText, styles.dangerText]}>退出帳本</Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity style={[styles.actionRow, styles.dangerRow]} onPress={handleDelete}>
              <Trash2 size={18} color={colors.expense} style={styles.actionIcon} />
              <Text style={[styles.actionText, styles.dangerText]}>刪除帳本</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Friend picker modal */}
      <Modal visible={showFriendPicker} animationType="slide" transparent>
        <View style={picker.overlay}>
          <TouchableOpacity style={picker.backdrop} onPress={() => setShowFriendPicker(false)} />
          <View style={picker.sheet}>
            <View style={picker.handle} />
            <Text style={picker.title}>選擇要邀請的好友</Text>
            <ScrollView>
              {friends.length === 0 ? (
                <Text style={picker.empty}>沒有可邀請的好友（已是成員或尚無好友）</Text>
              ) : (
                friends.map((f) => (
                  <TouchableOpacity
                    key={f.friendUserId}
                    style={picker.friendRow}
                    onPress={() => handleInvite(f)}
                    disabled={inviting}
                  >
                    <Text style={picker.friendName}>
                      {f.friendDisplayName ?? f.friendEmail}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: spacing.xxl },
  sectionHeader: {
    fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold,
    color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  avatarText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.primary },
  memberName: { flex: 1, fontSize: typography.sizes.md, color: colors.text },
  ownerBadge: {
    fontSize: typography.sizes.xs, color: colors.primary,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary,
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    marginTop: spacing.lg,
  },
  actionIcon: { marginRight: spacing.sm },
  actionText: { fontSize: typography.sizes.md, color: colors.primary },
  dangerZone: { marginTop: spacing.md },
  dangerRow: { marginTop: 0 },
  dangerText: { color: colors.expense },
});

const picker = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: spacing.md, maxHeight: '60%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  title: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.md },
  empty: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  friendRow: {
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  friendName: { fontSize: typography.sizes.md, color: colors.text },
});
