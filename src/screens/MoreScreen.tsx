import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import {
  ChevronRight,
  Landmark, Handshake, Users, BarChart2, Tag, Repeat, BookMarked,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../theme';
import { MoreStackParamList } from '../navigation/MoreStackNavigator';
import { supabase } from '../lib/supabase';
import { linkAppleIdentity } from '../lib/auth';
import { useInviteCode } from '../contexts/InviteCodeContext';

type NavigationProp = NativeStackNavigationProp<MoreStackParamList>;

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuItem({
  label, icon, onPress, disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={[styles.menuLabel, disabled && styles.menuLabelDisabled]}>{label}</Text>
      {!disabled && <ChevronRight size={18} color={colors.textSecondary} />}
    </TouchableOpacity>
  );
}

export function MoreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const inviteCode = useInviteCode();
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [linkingApple, setLinkingApple] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAnonymous(session.user.is_anonymous ?? true);
    });
  }, []);

  async function handleCopyCode() {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert('邀請碼已複製');
  }

  async function handleLinkApple() {
    setLinkingApple(true);
    const { error } = await linkAppleIdentity();
    setLinkingApple(false);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAnonymous(session?.user.is_anonymous ?? false);
    } else if (error.message.toLowerCase().includes('already')) {
      Alert.alert('無法連結', '此 Apple ID 已綁定其他帳號，無法連結');
    } else {
      Alert.alert('失敗', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* 帳號 section */}
        <SectionHeader title="帳號" />
        <View style={styles.accountCard}>
          {/* Invite code row */}
          <TouchableOpacity style={styles.accountRow} onPress={handleCopyCode} activeOpacity={0.7}>
            <Text style={styles.accountLabel}>我的邀請碼</Text>
            <Text style={styles.inviteCode}>{inviteCode ?? '—'}</Text>
          </TouchableOpacity>
          <View style={styles.accountDivider} />
          {/* Status row */}
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>帳號狀態</Text>
            <Text style={[styles.accountValue, !isAnonymous && { color: colors.income }]}>
              {isAnonymous ? '訪客帳號' : '已綁定 Apple ID'}
            </Text>
          </View>
          {/* Link Apple ID button */}
          {isAnonymous && (
            <>
              <View style={styles.accountDivider} />
              <TouchableOpacity
                style={styles.accountRow}
                onPress={handleLinkApple}
                disabled={linkingApple}
                activeOpacity={0.7}
              >
                <Text style={[styles.accountLabel, { color: colors.primary }]}>
                  {linkingApple ? '連結中…' : '綁定 Apple ID'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <SectionHeader title="財務" />
        <MenuItem
          label="帳戶管理"
          icon={<Landmark size={20} color={colors.primary} />}
          onPress={() => navigation.navigate('AccountsScreen')}
        />
        <MenuItem
          label="借還款追蹤"
          icon={<Handshake size={20} color={colors.primary} />}
          onPress={() => navigation.navigate('DebtTrackingScreen')}
        />
        <MenuItem
          label="好友"
          icon={<Users size={20} color={colors.primary} />}
          onPress={() => navigation.navigate('FriendsScreen')}
        />
        <MenuItem
          label="帳本"
          icon={<BookMarked size={20} color={colors.primary} />}
          onPress={() => navigation.navigate('LedgersScreen')}
        />

        <SectionHeader title="分析" />
        <MenuItem
          label="報表"
          icon={<BarChart2 size={20} color={colors.primary} />}
          onPress={() => navigation.navigate('ReportsScreen')}
        />

        <SectionHeader title="設定" />
        <MenuItem
          label="分類管理"
          icon={<Tag size={20} color={colors.primary} />}
          onPress={() => navigation.navigate('CategorySettingsScreen')}
        />
        <MenuItem
          label="定期記錄"
          icon={<Repeat size={20} color={colors.primary} />}
          onPress={() => navigation.navigate('RecurringTemplatesScreen')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemDisabled: { opacity: 0.4 },
  menuIcon: { marginRight: spacing.sm, width: 28, alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: typography.sizes.md, color: colors.text },
  menuLabelDisabled: { color: colors.textSecondary },
  accountCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  accountDivider: { height: 1, backgroundColor: colors.borderLight, marginLeft: spacing.md },
  accountLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  accountValue: { fontSize: typography.sizes.sm, color: colors.text, fontWeight: typography.weights.medium },
  inviteCode: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    fontFamily: 'Courier',
    letterSpacing: 3,
  },
});
