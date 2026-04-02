import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainTabNavigator } from './src/navigation/MainTabNavigator';
import { onAuthStateChange } from './src/lib/auth';
import { requestPushPermission } from './src/lib/notifications';
import { seedDefaultCategories } from './src/lib/seedCategories';
import { checkProjectCompletions } from './src/lib/projects';
import { generateDueInstances } from './src/lib/recurring';
import { executePendingDebits } from './src/lib/reconciliation';
import {
  subscribeToSharedTransactions, handleIncomingSharedTransaction,
} from './src/lib/friends';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (newSession) {
        requestPushPermission();
        seedDefaultCategories(newSession.user.id);
        checkProjectCompletions(newSession.user.id);
        executePendingDebits(newSession.user.id);
        generateDueInstances(newSession.user.id).then((records) => {
          if (records.length > 0) {
            const lines = records
              .map((r) => `• ${r.categoryName ?? '未分類'} NT$ ${r.amount.toLocaleString('zh-TW')} (${r.date})`)
              .join('\n');
            Alert.alert('已自動建立定期記錄', lines);
          }
        });

        subscribeToSharedTransactions(newSession.user.id, (sharedTxn) => {
          handleIncomingSharedTransaction(newSession.user.id, sharedTxn);
        });
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthNavigator />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <MainTabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
