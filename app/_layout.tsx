import 'react-native-url-polyfill/auto';
import '@/i18n';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';

const REMEMBER_ME_KEY = 'kaza_remember_me';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1a56db',
    primaryContainer: '#dbeafe',
    secondary: '#4ECDC4',
  },
};

export default function RootLayout() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      if (rememberMe === 'false') {
        // user chose not to stay logged in — clear the persisted session
        await AsyncStorage.removeItem(REMEMBER_ME_KEY);
        try {
          await supabase.auth.signOut();
        } catch (_) {}
        setSession(null);
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </QueryClientProvider>
  );
}
