import { useEffect, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Pressable, useWindowDimensions } from 'react-native';
import { TextInput, Button, Text, HelperText, Switch } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { WebLogin, LoginVariant } from '@/components/auth/WebLogin';

const VARIANT_KEY = 'kaza_login_variant';
const VARIANTS: { key: LoginVariant; label: string }[] = [
  { key: 'keybox', label: 'A · Boîte à clés' },
  { key: 'ticket', label: 'B · Ticket' },
  { key: 'village', label: 'C · Lama le soir' },
];

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
  const [info, setInfo] = useState('');
  const [sending, setSending] = useState(false);
  const { width } = useWindowDimensions();
  const [variant, setVariant] = useState<LoginVariant>('keybox');
  useEffect(() => {
    AsyncStorage.getItem(VARIANT_KEY).then((v) => {
      if (v === 'keybox' || v === 'ticket' || v === 'village') setVariant(v);
    }).catch(() => {});
  }, []);
  const chooseVariant = (v: LoginVariant) => {
    setVariant(v);
    AsyncStorage.setItem(VARIANT_KEY, v).catch(() => {});
  };

  const handleForgot = async () => {
    setInfo('');
    if (!email.trim()) {
      setError('Saisis ton email, puis clique sur « Mot de passe oublié ? »');
      return;
    }
    setSending(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo('Si un compte existe pour cet email, un lien pour choisir un nouveau mot de passe vient d\'être envoyé.');
  };

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

  if (Platform.OS === 'web' && width >= 900) {
    return (
      <View style={{ flex: 1 }}>
        <WebLogin
          variant={variant}
          email={email}
          password={password}
          rememberMe={rememberMe}
          loading={loading}
          sending={sending}
          error={error}
          info={info}
          onEmail={(v) => { setEmail(v); setError(''); }}
          onPassword={(v) => { setPassword(v); setError(''); }}
          onRemember={setRememberMe}
          onLogin={handleLogin}
          onForgot={handleForgot}
          onRegister={() => router.push('/(auth)/register')}
        />
        <View style={styles.variantBar}>
          <Text style={styles.variantLabel}>Version à tester :</Text>
          {VARIANTS.map((v) => (
            <Pressable key={v.key} onPress={() => chooseVariant(v.key)} style={[styles.variantChip, variant === v.key && styles.variantChipOn]}>
              <Text style={[styles.variantText, variant === v.key && { color: '#FFFFFF' }]}>{v.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
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
            {info ? <HelperText type="info" style={styles.info}>{info}</HelperText> : null}

            {Platform.OS === 'web' && (
              <TouchableOpacity onPress={handleForgot} disabled={sending} style={styles.forgotWrap}>
                <Text style={styles.forgotLink}>{sending ? 'Envoi en cours…' : 'Mot de passe oublié ?'}</Text>
              </TouchableOpacity>
            )}

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
  variantBar: { position: 'absolute', left: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: 6, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' } as any,
  variantLabel: { fontFamily: FONTS.body, fontSize: 12, color: '#5B6472', marginHorizontal: 4 },
  variantChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5 },
  variantChipOn: { backgroundColor: '#0F2240' },
  variantText: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: '#0F2240' },
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
  info: { color: APP_COLORS.success },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 4 },
  forgotLink: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: APP_COLORS.primary },
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
