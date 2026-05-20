import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { NotifPrefs, getNotifPrefs, saveNotifPrefs } from '@/services/notificationPrefs';
import { getCleaningPrefs, saveCleaningPrefs } from '@/services/cleaningPrefs';

const APP_VERSION = '1.0.0';

const NOTIF_ROWS: { key: keyof NotifPrefs; label: string; icon: string; color: string }[] = [
  { key: 'activityHour', label: 'Activité (check-in / check-out)', icon: 'calendar-arrow-right', color: APP_COLORS.success },
  { key: 'cleaningHour', label: 'Ménage à planifier',              icon: 'broom',                color: '#8B5CF6' },
  { key: 'memoHour',     label: 'Rappel Mémo',                     icon: 'note-text-outline',    color: APP_COLORS.accent },
];

function HourPicker({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <View style={picker.row}>
      <TouchableOpacity
        style={picker.btn}
        onPress={() => onChange(Math.max(0, value - 1))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="minus" size={15} color={APP_COLORS.primary} />
      </TouchableOpacity>
      <View style={picker.display}>
        <Text style={picker.hour}>{String(value).padStart(2, '0')}h00</Text>
      </View>
      <TouchableOpacity
        style={picker.btn}
        onPress={() => onChange(Math.min(23, value + 1))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="plus" size={15} color={APP_COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionLabelText}>{text}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, setProfile, reset } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ activityHour: 8, cleaningHour: 9, memoHour: 8 });
  const [notifSaved, setNotifSaved] = useState(false);
  const [maxCleaningsPerDay, setMaxCleaningsPerDay] = useState(2);
  const [cleaningPrefSaved, setCleaningPrefSaved] = useState(false);

  useEffect(() => {
    getNotifPrefs().then(setNotifPrefs);
    getCleaningPrefs().then((p) => setMaxCleaningsPerDay(p.maxPerDay));
  }, []);

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    setSaving(false);
    if (err) { setError(err.message); } else { setProfile({ ...profile!, full_name: fullName }); setSaved(true); }
  };

  const handleNotifHourChange = useCallback((key: keyof NotifPrefs, value: number) => {
    setNotifPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveNotifPrefs = async () => { await saveNotifPrefs(notifPrefs); setNotifSaved(true); };
  const handleSaveCleaningPrefs = async () => { await saveCleaningPrefs({ maxPerDay: maxCleaningsPerDay }); setCleaningPrefSaved(true); };

  const handleLogout = () => {
    Alert.alert(t('settings.logoutConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          try { await supabase.auth.signOut(); } catch (_) {}
          reset();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>{t('settings.title')}</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <SectionLabel text={t('settings.profile')} />
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {(profile?.full_name ?? user?.email ?? 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.nameText}>{profile?.full_name ?? '—'}</Text>
              <Text style={styles.emailText}>{user?.email}</Text>
            </View>
          </View>
          <TextInput
            label={t('settings.fullName')}
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            outlineColor={APP_COLORS.border}
            activeOutlineColor={APP_COLORS.primary}
          />
          <Button
            mode="contained"
            onPress={handleSaveName}
            loading={saving}
            disabled={saving || fullName === profile?.full_name}
            style={styles.saveBtn}
            buttonColor={APP_COLORS.primary}
          >
            {t('common.save')}
          </Button>
        </View>

        <SectionLabel text="Notifications" />
        <View style={[styles.card, SHADOWS.sm]}>
          <Text style={styles.hint}>Choisissez l'heure de réception pour chaque type de notification.</Text>
          {NOTIF_ROWS.map((row, i) => (
            <View key={row.key}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: row.color + '15' }]}>
                  <MaterialCommunityIcons name={row.icon as any} size={17} color={row.color} />
                </View>
                <Text style={styles.rowLabel} numberOfLines={2}>{row.label}</Text>
                <HourPicker value={notifPrefs[row.key]} onChange={(v) => handleNotifHourChange(row.key, v)} />
              </View>
            </View>
          ))}
          <Button mode="contained" onPress={handleSaveNotifPrefs} style={styles.saveBtn} icon="bell-check" buttonColor={APP_COLORS.primary}>
            Enregistrer les heures
          </Button>
        </View>

        <SectionLabel text="Planning ménage" />
        <View style={[styles.card, SHADOWS.sm]}>
          <Text style={styles.hint}>Nombre maximum de ménages par jour. L'algorithme étale la charge en conséquence.</Text>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#8B5CF615' }]}>
              <MaterialCommunityIcons name="broom" size={17} color="#8B5CF6" />
            </View>
            <Text style={styles.rowLabel}>Ménages max / jour</Text>
            <View style={picker.row}>
              <TouchableOpacity style={picker.btn} onPress={() => setMaxCleaningsPerDay((v) => Math.max(1, v - 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="minus" size={15} color={APP_COLORS.primary} />
              </TouchableOpacity>
              <View style={picker.display}>
                <Text style={picker.hour}>{maxCleaningsPerDay}</Text>
              </View>
              <TouchableOpacity style={picker.btn} onPress={() => setMaxCleaningsPerDay((v) => Math.min(6, v + 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="plus" size={15} color={APP_COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <Button mode="contained" onPress={handleSaveCleaningPrefs} style={styles.saveBtn} icon="content-save" buttonColor={APP_COLORS.primary}>
            Enregistrer
          </Button>
        </View>

        <SectionLabel text="Application" />
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="information-outline" size={17} color={APP_COLORS.textTertiary} />
            <Text style={styles.rowLabel}>{t('settings.version')}</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <MaterialCommunityIcons name="email-outline" size={17} color={APP_COLORS.textTertiary} />
            <Text style={styles.rowLabel}>{t('settings.email')}</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.logoutWrap}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <MaterialCommunityIcons name="logout" size={18} color={APP_COLORS.danger} />
            <Text style={styles.logoutText}>{t('settings.logout')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Snackbar visible={saved} onDismiss={() => setSaved(false)} duration={2000}>Profil mis à jour</Snackbar>
      <Snackbar visible={notifSaved} onDismiss={() => setNotifSaved(false)} duration={2000}>Heures de notification enregistrées</Snackbar>
      <Snackbar visible={cleaningPrefSaved} onDismiss={() => setCleaningPrefSaved(false)} duration={2000}>Capacité ménage enregistrée</Snackbar>
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>{error}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22 },
  title: { fontSize: 24, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 1 },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },

  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionAccent: { width: 3, height: 13, borderRadius: 2, backgroundColor: APP_COLORS.accent },
  sectionLabelText: { fontSize: 11, fontWeight: '700', color: APP_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },

  card: { marginHorizontal: 16, borderRadius: RADII.md, padding: 16, backgroundColor: APP_COLORS.surfaceElevated, gap: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: APP_COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  nameText: { fontSize: 15, fontWeight: '600', color: APP_COLORS.textPrimary },
  emailText: { fontSize: 12, color: APP_COLORS.textSecondary, marginTop: 1 },
  input: { backgroundColor: APP_COLORS.surface },
  saveBtn: { borderRadius: RADII.sm },

  hint: { fontSize: 12, color: APP_COLORS.textTertiary, lineHeight: 17 },
  divider: { height: 1, backgroundColor: APP_COLORS.borderLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  iconBox: { width: 32, height: 32, borderRadius: RADII.xs, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  rowLabel: { flex: 1, fontSize: 13, color: APP_COLORS.textPrimary, lineHeight: 17 },
  infoValue: { fontSize: 13, color: APP_COLORS.textSecondary, maxWidth: 180 },

  logoutWrap: { marginHorizontal: 16, marginTop: 24 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: APP_COLORS.danger + '50',
    backgroundColor: APP_COLORS.dangerLight,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.danger },
});

const picker = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  btn: {
    width: 28,
    height: 28,
    borderRadius: RADII.xs,
    backgroundColor: APP_COLORS.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.borderLight,
  },
  display: {
    minWidth: 52,
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADII.xs,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  hour: { fontSize: 13, fontWeight: '700', color: APP_COLORS.primary },
});
