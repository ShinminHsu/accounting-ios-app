import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography } from '../theme';
import { MoreScreen } from '../screens/MoreScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { CategorySettingsScreen } from '../screens/settings/CategorySettingsScreen';
import { RecurringTemplatesScreen } from '../screens/settings/RecurringTemplatesScreen';
import { DebtTrackingScreen } from '../screens/debt/DebtTrackingScreen';
import { FriendsScreen } from '../screens/friends/FriendsScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';

export type MoreStackParamList = {
  MoreHome: undefined;
  AccountsScreen: undefined;
  CategorySettingsScreen: undefined;
  RecurringTemplatesScreen: undefined;
  DebtTrackingScreen: undefined;
  FriendsScreen: undefined;
  ReportsScreen: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  headerBackTitle: '返回',
  presentation: 'card' as const,
};

export function MoreStackNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MoreHome"
        component={MoreScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AccountsScreen"
        component={AccountsScreen}
        options={{ title: '帳戶管理' }}
      />
      <Stack.Screen
        name="CategorySettingsScreen"
        component={CategorySettingsScreen}
        options={{ title: '分類管理' }}
      />
      <Stack.Screen
        name="RecurringTemplatesScreen"
        component={RecurringTemplatesScreen}
        options={{ title: '定期記錄' }}
      />
      <Stack.Screen
        name="DebtTrackingScreen"
        component={DebtTrackingScreen}
        options={{ title: '借還款追蹤' }}
      />
      <Stack.Screen
        name="FriendsScreen"
        component={FriendsScreen}
        options={{ title: '好友' }}
      />
      <Stack.Screen
        name="ReportsScreen"
        component={ReportsScreen}
        options={{ title: '報表' }}
      />
    </Stack.Navigator>
  );
}
