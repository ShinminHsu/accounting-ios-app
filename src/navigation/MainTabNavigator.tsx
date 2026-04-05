import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BookOpen, Plus, FolderOpen, MoreHorizontal, Wallet } from 'lucide-react-native';
import { colors, typography, spacing, shadows } from '../theme';
import { LedgerStackNavigator } from './LedgerStackNavigator';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { AssetsScreen } from '../screens/AssetsScreen';
import { MoreStackNavigator } from './MoreStackNavigator';
import { AddTransactionSheet } from '../screens/transactions/AddTransactionSheet';

export type MainTabParamList = {
  Ledger: undefined;
  Projects: undefined;
  Add: undefined;
  Assets: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function AddPlaceholder() {
  return null;
}

type TabBarIconProps = {
  label: string;
  focused: boolean;
  icon: React.ReactNode;
};

function TabIcon({ label, focused, icon }: TabBarIconProps) {
  const color = focused ? colors.primary : colors.textSecondary;
  return (
    <View style={styles.tabIconContainer}>
      {icon}
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
}

export function MainTabNavigator() {
  const [showAddSheet, setShowAddSheet] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name="Ledger"
          component={LedgerStackNavigator}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                label="帳本"
                focused={focused}
                icon={<BookOpen size={22} color={focused ? colors.primary : colors.textSecondary} />}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Projects"
          component={ProjectsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                label="專案"
                focused={focused}
                icon={<FolderOpen size={22} color={focused ? colors.primary : colors.textSecondary} />}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Add"
          component={AddPlaceholder}
          options={{
            tabBarIcon: () => (
              <View style={styles.centerButton}>
                <Plus size={24} color={colors.white} strokeWidth={2.5} />
              </View>
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                style={styles.centerTabButton}
                activeOpacity={0.8}
                onPress={() => setShowAddSheet(true)}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Assets"
          component={AssetsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                label="資產"
                focused={focused}
                icon={<Wallet size={22} color={focused ? colors.primary : colors.textSecondary} />}
              />
            ),
          }}
        />
        <Tab.Screen
          name="More"
          component={MoreStackNavigator}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                label="更多"
                focused={focused}
                icon={<MoreHorizontal size={22} color={focused ? colors.primary : colors.textSecondary} />}
              />
            ),
          }}
        />
      </Tab.Navigator>

      <AddTransactionSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSaved={() => setShowAddSheet(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  centerTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    shadowColor: colors.primary,
  },
});
