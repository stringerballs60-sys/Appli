import { useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text, HelperText, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

type Status = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let settled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        settled = true;
        setStatus('ready');
      }
    });
    const timer = setTimeout(async () => {
      if (settled) return;
      const { data: { session } } = await supabase.auth.getSession();
      setStatus(session ? 'ready' : 'invalid');
    }, 2500);
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSave = async () => {
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await AsyncStorage.setItem('kaza_remember_me', 'true');
    setStatus('done');
  };

  return (
    <LinearGradient colors={GRADIENTS.navyHeader as [string, string, ...string[]]} style={styles.gradient}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={[styles.logoWrap, SHADOWS.md]}>
            <Image source={require('@/assets/icon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>KAZA</Text>
          <Text style={styles.subtitle}>Nouveau mot de passe</Text>
        </View>

        <View style={[styles.form, SHADOWS.lg]}>
          {status === 'checking' && <ActivityIndicator color={APP_COLORS.primary} />}

          {status === 'invalid' && (
            <>
              <Text style={styles.message}>Ce lien est invalide ou a expiré. Redemande un lien depuis l'écran de connexion.</Text>
              <Button mode="contained" onPress={() => router.replace('/(auth)/login')} style={styles.button} buttonColor={APP_COLORS.primary} textColor="#FFFFFF">
                Retour à la connexion
              </Button>
            </>
          )}

          {status === 'ready' && (
            <>
              <TextInput
                label="Nouveau mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
                mode="outlined"
                style={styles.input}
                outlineColor={APP_COLORS.border}
                activeOutlineColor={APP_COLORS.primary}
                left={<TextInput.Icon icon="lock-outline" color={APP_COLORS.primaryLight} />}
                right={<TextInput.Icon icon={secureText ? 'eye-outline' : 'eye-off-outline'} onPress={() => setSecureText(!secureText)} color={APP_COLORS.primaryLight} />}
              />
              <TextInput
                label="Confirmer le mot de passe"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={secureText}
                mode="outlined"
                style={styles.input}
                outlineColor={APP_COLORS.border}
                activeOutlineColor={APP_COLORS.primary}
                left={<TextInput.Icon icon="lock-check-outline" color={APP_COLORS.primaryLight} />}
              />
              {error ? <HelperText type="error">{error}</HelperText> : null}
              <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading} style={styles.button} buttonColor={APP_COLORS.primary} textColor="#FFFFFF">
                Enregistrer
              </Button>
            </>
          )}

          {status === 'done' && (
            <>
              <Text style={styles.message}>Mot de passe modifié. Tu es connecté.</Text>
              <Button mode="contained" onPress={() => router.replace('/(app)')} style={styles.button} buttonColor={APP_COLORS.primary} textColor="#FFFFFF">
                Ouvrir KAZA
              </Button>
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
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
  appName: { fontSize: 36, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 4 },
  subtitle: { fontSize: 14, color: 'rgba(248,245,239,0.65)', fontFamily: FONTS.body },
  form: { backgroundColor: APP_COLORS.surfaceElevated, borderRadius: RADII.lg, padding: 24, gap: 4 },
  input: { marginBottom: 8, backgroundColor: APP_COLORS.surface },
  message: { fontSize: 14, fontFamily: FONTS.body, color: APP_COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  button: { borderRadius: RADII.sm, marginTop: 4 },
});
