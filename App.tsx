import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { onAuthStateChange } from './src/lib/auth';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
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
      <>
        <StatusBar style="dark" />
        <AuthNavigator />
      </>
    );
  }

  // Main app tab navigator — implemented in task 1.4
  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </>
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
