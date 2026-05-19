import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Snackbar, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { NotifPrefs, getNotifPrefs, saveNotifPrefs } from '@/services/notificationPrefs';

const APP_VERSION = '1.0.0';

const NOTIF_ROWS: { key: keyof NotifPrefs; label: string; icon: string; color: string }[] = [
  { key: 'activityHour', label: 'Activité (check-in / check-out)', icon: 'calendar-arrow-right', color: APP_COLORS.success },
  { key: 'cleaningHour', label: 'Ménage à planifier',              icon: 'broom',                color: '#8B5CF6' },
  { key: 'memoHour',     label: 'Rappel Mémo',                     icon: 'note-text-outline',    color: '#D4AF37' },
];

function HourPicker({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <View style={picker.row}>
      <TouchableOpacity
        style={picker.btn}
        onPress={() => onChange(Math.max(0, value - 1))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="minus" size={16} color={APP_COLORS.primary} />
      </TouchableOpacity>
      <View style={picker.display}>
        <Text style={picker.hour}>{String(value).padStart(2, '0')}h00</Text>
      </View>
      <TouchableOpacity
        style={picker.btn}
        onPress={() => onChange(Math.min(23, value + 1))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="plus" size={16} color={APP_COLORS.primary} />
      </TouchableOpacity>
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

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    activityHour: 8,
    cleaningHour: 9,
    memoHour: 8,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    getNotifPrefs().then(setNotifPrefs);
  }, []);

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setProfile({ ...profile!, full_name: fullName });
      setSaved(true);
    }
  };

  const handleNotifHourChange = useCallback((key: keyof NotifPrefs, value: number) => {
    setNotifPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveNotifPrefs = async () => {
    await saveNotifPrefs(notifPrefs);
    setNotifSaved(true);
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutConfirm'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (_) {}
            reset();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profil */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>{t('settings.profile')}</Text>
        </View>
        <Surface style={styles.card} elevation={1}>
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
          />
          <Button
            mode="contained"
            onPress={handleSaveName}
            loading={saving}
            disabled={saving || fullName === profile?.full_name}
            style={styles.saveBtn}
          >
            {t('common.save')}
          </Button>
        </Surface>

        {/* Notifications */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>Notifications</Text>
        </View>
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.notifHint}>
            Choisissez l'heure de réception pour chaque type de notification.
          </Text>
          {NOTIF_ROWS.map((row, i) => (
            <View key={row.key}>
              {i > 0 && <View style={styles.notifDivider} />}
              <View style={styles.notifRow}>
                <View style={[styles.notifIconBox, { backgroundColor: row.color + '18' }]}>
                  <MaterialCommunityIcons name={row.icon as any} size={18} color={row.color} />
                </View>
                <Text style={styles.notifLabel} numberOfLines={2}>{row.label}</Text>
                <HourPicker
                  value={notifPrefs[row.key]}
                  onChange={(v) => handleNotifHourChange(row.key, v)}
                />
              </View>
            </View>
          ))}
          <Button
            mode="contained"
            onPress={handleSaveNotifPrefs}
            style={styles.saveBtn}
            icon="bell-check"
          >
            Enregistrer les heures
          </Button>
        </Surface>

        {/* Application */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>Application</Text>
        </View>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information" size={18} color={APP_COLORS.textSecondary} />
            <Text style={styles.infoLabel}>{t('settings.version')}</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email" size={18} color={APP_COLORS.textSecondary} />
            <Text style={styles.infoLabel}>{t('settings.email')}</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{user?.email}</Text>
          </View>
        </Surface>

        <View style={styles.logoutContainer}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            textColor={APP_COLORS.danger}
            style={styles.logoutBtn}
            icon="logout"
          >
            {t('settings.logout')}
          </Button>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Snackbar visible={saved} onDismiss={() => setSaved(false)} duration={2000}>
        Profil mis à jour
      </Snackbar>
      <Snackbar visible={notifSaved} onDismiss={() => setNotifSaved(false)} duration={2000}>
        Heures de notification enregistrées
      </Snackbar>
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: { backgroundColor: APP_COLORS.primary, paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: '#FFFFFF' },
  scroll: { flex: 1 },
  sectionLabel: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: { marginHorizontal: 16, borderRadius: 12, padding: 16, backgroundColor: '#FFFFFF', gap: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: APP_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  nameText: { fontSize: 16, fontWeight: '600', color: APP_COLORS.textPrimary },
  emailText: { fontSize: 13, color: APP_COLORS.textSecondary },
  input: { backgroundColor: '#FFFFFF' },
  saveBtn: { borderRadius: 8, backgroundColor: APP_COLORS.primary },
  notifHint: { fontSize: 12, color: APP_COLORS.textSecondary, lineHeight: 17 },
  notifDivider: { height: 1, backgroundColor: APP_COLORS.border },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  notifIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  notifLabel: { flex: 1, fontSize: 13, color: APP_COLORS.textPrimary, lineHeight: 17 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary },
  infoValue: { fontSize: 14, color: APP_COLORS.textSecondary, maxWidth: 180 },
  logoutContainer: { marginHorizontal: 16, marginTop: 24 },
  logoutBtn: { borderColor: APP_COLORS.danger, borderRadius: 8 },
});

const picker = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primary + '14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  display: {
    minWidth: 52,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  hour: {
    fontSize: 13,
    fontWeight: '700',
    color: APP_COLORS.primary,
  },
});
