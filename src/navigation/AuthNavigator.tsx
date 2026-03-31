import React, { useState } from 'react';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';

type AuthScreen = 'login' | 'register' | 'resetPassword';

export function AuthNavigator() {
  const [screen, setScreen] = useState<AuthScreen>('login');

  if (screen === 'register') {
    return <RegisterScreen onNavigateToLogin={() => setScreen('login')} />;
  }

  if (screen === 'resetPassword') {
    return <ResetPasswordScreen onNavigateToLogin={() => setScreen('login')} />;
  }

  return (
    <LoginScreen
      onNavigateToRegister={() => setScreen('register')}
      onNavigateToResetPassword={() => setScreen('resetPassword')}
    />
  );
}
