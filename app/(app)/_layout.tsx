import { useEffect } from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { View, ActivityIndicator } from 'react-native';
import { APP_COLORS } from '@/constants/colors';

export default function AppLayout() {
  const { session, isLoading, setProfile, setMembership, setEffectiveUserId } = useAuthStore();

  useEffect(() => {
    if (session?.user) {
      Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('team_members').select('owner_id, role').eq('member_id', session.user.id).maybeSingle(),
      ]).then(([profileRes, membershipRes]) => {
        if (profileRes.data) setProfile(profileRes.data);
        if (membershipRes.data) {
          setMembership({ ownerId: membershipRes.data.owner_id, role: membershipRes.data.role as 'cleaner' });
          setEffectiveUserId(membershipRes.data.owner_id);
        } else {
          setMembership(null);
          setEffectiveUserId(session.user.id);
        }
      });
    }
  }, [session?.user?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
