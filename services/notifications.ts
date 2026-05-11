import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reservation } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('kaza-reminders', {
      name: 'Rappels KAZA',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await setupAndroidChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleUpcomingNotifications(
  arrivals: Reservation[],
  departures: Reservation[]
): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const byDate = new Map<string, { arr: number; dep: number }>();

  for (const r of arrivals) {
    if (r.check_in <= today) continue;
    const entry = byDate.get(r.check_in) ?? { arr: 0, dep: 0 };
    entry.arr++;
    byDate.set(r.check_in, entry);
  }

  for (const r of departures) {
    if (r.check_out <= today) continue;
    const entry = byDate.get(r.check_out) ?? { arr: 0, dep: 0 };
    entry.dep++;
    byDate.set(r.check_out, entry);
  }

  for (const [date, { arr, dep }] of byDate.entries()) {
    const parts: string[] = [];
    if (arr > 0) parts.push(`${arr} arrivée${arr > 1 ? 's' : ''}`);
    if (dep > 0) parts.push(`${dep} départ${dep > 1 ? 's' : ''}`);
    if (parts.length === 0) continue;

    const [year, month, day] = date.split('-').map(Number);
    const notifDate = new Date(year, month - 1, day, 8, 0, 0);
    if (notifDate <= now) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'KAZA – Activité du jour',
        body: parts.join(' · '),
        data: { date },
        ...(Platform.OS === 'android' ? { channelId: 'kaza-reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notifDate,
      },
    });
  }
}
