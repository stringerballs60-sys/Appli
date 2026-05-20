import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { APP_COLORS } from '@/constants/colors';

export default function TabsLayout() {
  const { t } = useTranslation();
  const membership = useAuthStore((s) => s.membership);
  const isManager = !membership;

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
    </Tabs>
  );
}
