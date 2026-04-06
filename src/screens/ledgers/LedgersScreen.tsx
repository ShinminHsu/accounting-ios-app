import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Users, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { fetchLedgers, fetchLedgerMembers, acceptLedgerInvite } from '../../lib/ledgers';
import { Ledger } from '../../types/database';
import { CreateLedgerModal } from './CreateLedgerModal';
import { colors, typography, spacing, radius } from '../../theme';
import { MoreStackParamList } from '../../navigation/MoreStackNavigator';

type NavProp = NativeStackNavigationProp<MoreStackParamList>;

export function LedgersScreen() {
  const navigation = useNavigation<NavProp>();
  const [active, setActive] = useState<Ledger[]>([]);
  const [invited, setInvited] = useState<Ledger[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { active: a, invited: i } = await fetchLedgers(session.user.id);
    setActive(a);
    setInvited(i);

    const counts: Record<string, number> = {};
    await Promise.all(
      a.filter((l) => !l.is_personal).map(async (l) => {
        const members = await fetchLedgerMembers(l.id);
        counts[l.id] = members.length;
      })
    );
    setMemberCounts(counts);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAccept(ledger: Ledger) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await acceptLedgerInvite(ledger.id, session.user.id);
    if (error) Alert.alert('失敗', error);
    else load();
  }

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
        {/* Active ledgers */}
        <Text style={styles.sectionHeader}>我的帳本</Text>
        {active.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={styles.row}
            onPress={() => navigation.navigate('LedgerDetailScreen', { ledger: l })}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              {l.is_personal
                ? <Text style={styles.personalEmoji}>📒</Text>
                : <Users size={20} color={colors.primary} />}
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{l.name}</Text>
              {!l.is_personal && memberCounts[l.id] != null && (
                <Text style={styles.rowSub}>{memberCounts[l.id]} 位成員</Text>
              )}
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {/* Pending invitations */}
        {invited.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: spacing.lg }]}>待接受邀請</Text>
            {invited.map((l) => (
              <View key={l.id} style={styles.inviteRow}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{l.name}</Text>
                  <Text style={styles.rowSub}>有人邀請你加入此帳本</Text>
                </View>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(l)}>
                  <Text style={styles.acceptBtnText}>接受</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Plus size={24} color={colors.white} />
      </TouchableOpacity>

      <CreateLedgerModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 100 },
  sectionHeader: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowIcon: { width: 36, alignItems: 'center', marginRight: spacing.sm },
  personalEmoji: { fontSize: 20 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: typography.sizes.md, color: colors.text },
  rowSub: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  acceptBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    fontSize: typography.sizes.sm,
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
