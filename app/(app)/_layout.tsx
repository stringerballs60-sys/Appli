import { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { View, ActivityIndicator } from 'react-native';
import { APP_COLORS } from '@/constants/colors';

export default function AppLayout() {
  const { t } = useTranslation();
  const { session, isLoading, setProfile, setMembership, setEffectiveUserId } = useAuthStore();
  const membership = useAuthStore((s) => s.membership);
  const isManager = !membership;

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: APP_COLORS.primary,
        tabBarInactiveTintColor: APP_COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: APP_COLORS.border,
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Aujourd'hui",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: t('navigation.calendar'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-range" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="planning/index" options={{ href: null }} />
      <Tabs.Screen
        name="reservations/index"
        options={{
          title: t('navigation.reservations'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bed-king-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="properties/index"
        options={{
          href: isManager ? undefined : null,
          title: t('navigation.properties'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-group-plus" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu/index"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="menu" size={size} color={color} />
          ),
        }}
      />
      {/* Hide nested screens from tab bar */}
      <Tabs.Screen name="reservations/new" options={{ href: null }} />
      <Tabs.Screen name="reservations/[id]" options={{ href: null }} />
      <Tabs.Screen name="properties/new" options={{ href: null }} />
      <Tabs.Screen name="properties/[id]" options={{ href: null }} />
      <Tabs.Screen name="inventory/index" options={{ href: null }} />
      <Tabs.Screen name="inventory/linen/[propertyId]" options={{ href: null }} />
      <Tabs.Screen name="inventory/equipment/[propertyId]" options={{ href: null }} />
      <Tabs.Screen name="inventory/consumables/[propertyId]" options={{ href: null }} />
      <Tabs.Screen name="settings/index" options={{ href: null }} />
      <Tabs.Screen name="reservations/edit/[id]" options={{ href: null }} />
      <Tabs.Screen name="tasks/index" options={{ href: null }} />
      <Tabs.Screen name="cleaning/index" options={{ href: null }} />
      <Tabs.Screen name="memo/index" options={{ href: null }} />
      <Tabs.Screen name="tasks/new" options={{ href: null }} />
      <Tabs.Screen name="tasks/[id]" options={{ href: null }} />
      <Tabs.Screen name="roles/index" options={{ href: null }} />
    </Tabs>
  );
}
