import 'react-native-url-polyfill/auto';
import '@/i18n';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Montserrat_700Bold,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { APP_COLORS } from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

const REMEMBER_ME_KEY = 'kaza_remember_me';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

const fontConfig = { fontFamily: 'Inter-Regular' };

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: APP_COLORS.primary,
    primaryContainer: APP_COLORS.primaryPale,
    secondary: APP_COLORS.accent,
    secondaryContainer: APP_COLORS.accentPale,
    background: APP_COLORS.background,
    surface: APP_COLORS.surface,
    surfaceVariant: APP_COLORS.backgroundAlt,
    outline: APP_COLORS.border,
  },
  fonts: configureFonts({ config: fontConfig }),
};

export default function RootLayout() {
  const { setSession, setLoading } = useAuthStore();

  const [fontsLoaded] = useFonts({
    'Montserrat-Bold': Montserrat_700Bold,
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    const init = async () => {
      const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      if (rememberMe === 'false') {
        await AsyncStorage.removeItem(REMEMBER_ME_KEY);
        try { await supabase.auth.signOut(); } catch (_) {}
        setSession(null);
        setLoading(false);
        SplashScreen.hideAsync();
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
      SplashScreen.hideAsync();
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </QueryClientProvider>
  );
}
