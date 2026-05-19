import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kaza_cleaning_prefs';

export interface CleaningPrefs {
  maxPerDay: number;
}

const DEFAULTS: CleaningPrefs = { maxPerDay: 2 };

export async function getCleaningPrefs(): Promise<CleaningPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function saveCleaningPrefs(prefs: Partial<CleaningPrefs>): Promise<void> {
  const current = await getCleaningPrefs();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...current, ...prefs }));
}
