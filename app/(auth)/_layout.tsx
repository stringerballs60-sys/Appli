import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function AuthLayout() {
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  if (session) return <Redirect href="/(app)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
