import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, HelperText, Switch } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

const REMEMBER_ME_KEY = 'kaza_remember_me';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('auth.fillAll'));
      return;
    }
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(t('auth.loginError'));
      return;
    }
    await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
  };

  return (
    <LinearGradient
      colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={[styles.logoWrap, SHADOWS.md]}>
              <Image
                source={require('@/assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>KAZA</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
          </View>

          <View style={[styles.form, SHADOWS.lg]}>
            <TextInput
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              mode="outlined"
              style={styles.input}
              outlineColor={APP_COLORS.border}
              activeOutlineColor={APP_COLORS.primary}
              left={<TextInput.Icon icon="email-outline" color={APP_COLORS.primaryLight} />}
            />
            <TextInput
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              mode="outlined"
              style={styles.input}
              outlineColor={APP_COLORS.border}
              activeOutlineColor={APP_COLORS.primary}
              left={<TextInput.Icon icon="lock-outline" color={APP_COLORS.primaryLight} />}
              right={
                <TextInput.Icon
                  icon={secureText ? 'eye-outline' : 'eye-off-outline'}
                  onPress={() => setSecureText(!secureText)}
                  color={APP_COLORS.primaryLight}
                />
              }
            />
            {error ? <HelperText type="error">{error}</HelperText> : null}

            <View style={styles.rememberRow}>
              <Text style={styles.rememberLabel}>{t('auth.rememberMe')}</Text>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                color={APP_COLORS.accent}
              />
            </View>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              buttonColor={APP_COLORS.primary}
              textColor="#FFFFFF"
            >
              {t('auth.login')}
            </Button>

            <View style={styles.registerRow}>
              <Text style={styles.registerHint}>{t('auth.noAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.registerLink}>{t('auth.createAccount')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  header: { alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: RADII.lg,
    backgroundColor: APP_COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  logo: { width: 80, height: 80 },
  appName: {
    fontSize: 36,
    fontFamily: FONTS.titleBold,
    color: APP_COLORS.accent,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(248,245,239,0.65)',
    fontFamily: FONTS.body,
  },
  form: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.lg,
    padding: 24,
    gap: 4,
  },
  input: {
    marginBottom: 8,
    backgroundColor: APP_COLORS.surface,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  rememberLabel: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: APP_COLORS.textPrimary,
  },
  button: { borderRadius: RADII.sm, marginTop: 4 },
  buttonContent: { paddingVertical: 6 },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  registerHint: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: APP_COLORS.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: APP_COLORS.primary,
    fontWeight: '700',
  },
});
