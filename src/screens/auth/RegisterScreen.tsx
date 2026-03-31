import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { signUp } from '../../lib/auth';

type Props = {
  onNavigateToLogin: () => void;
};

export function RegisterScreen({ onNavigateToLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('錯誤', '請填寫所有欄位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('錯誤', '兩次密碼輸入不一致');
      return;
    }
    if (password.length < 8) {
      Alert.alert('錯誤', '密碼至少需要 8 個字元');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('註冊失敗', error.message);
    } else {
      Alert.alert('確認信已寄出', '請檢查你的電子郵件以完成註冊', [
        { text: '確定', onPress: onNavigateToLogin },
      ]);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>建立帳號</Text>

        <TextInput
          style={styles.input}
          placeholder="電子郵件"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="密碼（至少 8 個字元）"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="確認密碼"
          placeholderTextColor={colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>註冊</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onNavigateToLogin} style={styles.link}>
          <Text style={styles.linkText}>已有帳號？ 登入</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  link: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
  },
});
