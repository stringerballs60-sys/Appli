import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kaza_notif_prefs';

export interface NotifPrefs {
  activityHour: number;   // check-ins / check-outs
  cleaningHour: number;   // alertes ménage
  memoHour: number;       // rappel mémo
}

const DEFAULTS: NotifPrefs = {
  activityHour: 8,
  cleaningHour: 9,
  memoHour: 8,
};

export async function getNotifPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function saveNotifPrefs(prefs: Partial<NotifPrefs>): Promise<void> {
  const current = await getNotifPrefs();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...current, ...prefs }));
}
