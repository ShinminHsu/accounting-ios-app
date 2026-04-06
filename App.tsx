import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import { MainTabNavigator } from './src/navigation/MainTabNavigator';
import { signInAnonymously, onAuthStateChange, ensureUserProfile } from './src/lib/auth';
import { requestPushPermission } from './src/lib/notifications';
import { seedDefaultCategories } from './src/lib/seedCategories';
import { seedPersonalLedger } from './src/lib/ledgers';
import { checkProjectCompletions } from './src/lib/projects';
import { generateDueInstances } from './src/lib/recurring';
import { executePendingDebits } from './src/lib/reconciliation';
import {
  subscribeToSharedTransactions, handleIncomingSharedTransaction,
} from './src/lib/friends';
import { initDb } from './src/lib/db';
import { InviteCodeProvider } from './src/contexts/InviteCodeContext';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    initDb().then(() => setDbReady(true));
  }, []);

  async function doAnonymousSignIn() {
    setSigningIn(true);
    setSignInError(false);
    const { error } = await signInAnonymously();
    if (error) {
      setSigningIn(false);
      setSignInError(true);
    }
    // On success, onAuthStateChange fires with the new session
  }

  useEffect(() => {
    if (!dbReady) return;
    const { data: listener } = onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (!newSession) {
        // No session — bootstrap anonymous sign-in
        doAnonymousSignIn();
        return;
      }

      // Session established — run initialisation
      requestPushPermission();
      await seedDefaultCategories(newSession.user.id).catch(() => {});
      await seedPersonalLedger(newSession.user.id).catch(() => {});
      checkProjectCompletions(newSession.user.id);
      executePendingDebits(newSession.user.id);

      // Ensure user profile + invite code (non-blocking)
      ensureUserProfile(newSession.user.id).then(({ inviteCode: code }) => {
        if (code) setInviteCode(code);
      });

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

      setLoading(false);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, [dbReady]);

  if (!dbReady || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (signInError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>無法連線，請檢查網路後重試</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={doAnonymousSignIn} disabled={signingIn}>
          {signingIn
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.retryBtnText}>重試</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <InviteCodeProvider value={inviteCode}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <MainTabNavigator />
        </NavigationContainer>
      </InviteCodeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
