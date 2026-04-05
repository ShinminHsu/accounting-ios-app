import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronRight,
  Landmark, Handshake, Users, BarChart2, Tag, Repeat,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../theme';
import { MoreStackParamList } from '../navigation/MoreStackNavigator';

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
});
