import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../theme';
import { AccountsScreen } from './accounts/AccountsScreen';
import { CategorySettingsScreen } from './settings/CategorySettingsScreen';
import { RecurringTemplatesScreen } from './settings/RecurringTemplatesScreen';
import { DebtTrackingScreen } from './debt/DebtTrackingScreen';
import { FriendsScreen } from './friends/FriendsScreen';
import { ReportsScreen } from './reports/ReportsScreen';

// ── Generic full-screen modal shell ─────────────────────────────────────────

function ScreenModal({
  title, visible, onClose, children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={shell.container} edges={['top', 'bottom']}>
        <View style={shell.header}>
          <TouchableOpacity onPress={onClose} style={shell.backBtn}>
            <Text style={shell.backText}>‹ 返回</Text>
          </TouchableOpacity>
          <Text style={shell.title}>{title}</Text>
          <View style={shell.backBtn} />
        </View>
        {children}
      </SafeAreaView>
    </Modal>
  );
}

const shell = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  backBtn: { width: 64 },
  backText: { fontSize: typography.sizes.md, color: colors.primary },
});

// ── Menu components ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuItem({
  label, icon, onPress, disabled,
}: {
  label: string;
  icon: string;
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
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, disabled && styles.menuLabelDisabled]}>{label}</Text>
      {!disabled && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

// ── More screen ──────────────────────────────────────────────────────────────

export function MoreScreen() {
  const [showAccounts, setShowAccounts] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showDebt, setShowDebt] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showReports, setShowReports] = useState(false);

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>更多</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <SectionHeader title="財務" />
          <MenuItem label="帳戶管理" icon="🏦" onPress={() => setShowAccounts(true)} />
          <MenuItem label="負債追蹤" icon="🤝" onPress={() => setShowDebt(true)} />
          <MenuItem label="好友" icon="👥" onPress={() => setShowFriends(true)} />

          <SectionHeader title="分析" />
          <MenuItem label="報表" icon="📊" onPress={() => setShowReports(true)} />

          <SectionHeader title="設定" />
          <MenuItem label="分類管理" icon="🏷️" onPress={() => setShowCategories(true)} />
          <MenuItem label="定期記錄" icon="🔁" onPress={() => setShowRecurring(true)} />
        </ScrollView>
      </SafeAreaView>

      <ScreenModal title="帳戶管理" visible={showAccounts} onClose={() => setShowAccounts(false)}>
        <AccountsScreen />
      </ScreenModal>

      <ScreenModal title="分類管理" visible={showCategories} onClose={() => setShowCategories(false)}>
        <CategorySettingsScreen />
      </ScreenModal>

      <ScreenModal title="定期記錄" visible={showRecurring} onClose={() => setShowRecurring(false)}>
        <RecurringTemplatesScreen />
      </ScreenModal>

      <ScreenModal title="負債追蹤" visible={showDebt} onClose={() => setShowDebt(false)}>
        <DebtTrackingScreen />
      </ScreenModal>

      <ScreenModal title="好友" visible={showFriends} onClose={() => setShowFriends(false)}>
        <FriendsScreen />
      </ScreenModal>

      <ScreenModal title="報表" visible={showReports} onClose={() => setShowReports(false)}>
        <ReportsScreen />
      </ScreenModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pageHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  pageTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
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
  menuIcon: { fontSize: typography.sizes.lg, marginRight: spacing.sm, width: 28 },
  menuLabel: { flex: 1, fontSize: typography.sizes.md, color: colors.text },
  menuLabelDisabled: { color: colors.textSecondary },
  chevron: { fontSize: typography.sizes.lg, color: colors.textSecondary },
});
