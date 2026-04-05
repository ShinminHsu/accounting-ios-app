import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography } from '../theme';
import { LedgerScreen } from '../screens/LedgerScreen';
import { TransactionSearchScreen } from '../screens/transactions/TransactionSearchScreen';

export type LedgerStackParamList = {
  LedgerHome: undefined;
  TransactionSearch: undefined;
};

const Stack = createNativeStackNavigator<LedgerStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  headerBackTitle: '返回',
};

export function LedgerStackNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="LedgerHome"
        component={LedgerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TransactionSearch"
        component={TransactionSearchScreen}
        options={{ title: '搜尋記錄' }}
      />
    </Stack.Navigator>
  );
}
