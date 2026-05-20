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
        tabBarInactiveTintColor: APP_COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: APP_COLORS.surfaceElevated,
          borderTopColor: APP_COLORS.borderLight,
          borderTopWidth: 1,
          elevation: 12,
          shadowColor: APP_COLORS.primaryDark,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
        tabBarIconStyle: { marginTop: 2 },
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
