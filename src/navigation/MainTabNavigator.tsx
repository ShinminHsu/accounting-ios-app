import React from 'react';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography, spacing } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { LedgerScreen } from '../screens/LedgerScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { MoreScreen } from '../screens/MoreScreen';

export type MainTabParamList = {
  Home: undefined;
  Ledger: undefined;
  Add: undefined;
  Projects: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder until AddTransactionSheet is built in task 5.1
function AddPlaceholder() {
  return null;
}

type TabBarIconProps = {
  label: string;
  focused: boolean;
  isCenter?: boolean;
};

function TabIcon({ label, focused, isCenter }: TabBarIconProps) {
  if (isCenter) {
    return (
      <View style={styles.centerButton}>
        <Text style={styles.centerButtonText}>＋</Text>
      </View>
    );
  }
  return (
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="首頁" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Ledger"
        component={LedgerScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="帳本" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddPlaceholder}
        options={{
          tabBarIcon: () => <TabIcon label="＋" focused={false} isCenter />,
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={styles.centerTabButton}
              activeOpacity={0.8}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="專案" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="更多" focused={focused} />,
        }}
      />
    </Tab.Navigator>
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
  tabLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  centerButtonText: {
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    lineHeight: 24,
  },
});
