import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useTeamMembers, useInviteMember, useRemoveMember } from '@/hooks/useRoles';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

type RoleKey = 'cleaner' | 'comptable';

const ROLE_CONFIG: Record<RoleKey, { label: string; labelSingular: string; icon: string; color: string; description: string }> = {
  cleaner: {
    label: 'AIDES MÉNAGÈRES',
    labelSingular: 'Aide ménagère',
    icon: 'broom',
    color: '#7C3AED',
    description: "Accès aux tâches, au calendrier et aux réservations (lecture seule). Ne peut pas modifier les logements ni l'inventaire.",
  },
  comptable: {
    label: 'COMPTABLES',
    labelSingular: 'Comptable',
    icon: 'calculator',
    color: '#0891B2',
    description: 'Accès au calendrier et aux réservations en lecture seule. Accèdera aux données financières à venir.',
  },
};

export default function RolesScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: members, isLoading } = useTeamMembers();
  const { mutateAsync: inviteMember, isPending: inviting } = useInviteMember();
  const { mutateAsync: removeMember } = useRemoveMember();

  const [pendingRole, setPendingRole] = useState<RoleKey | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const resetModal = () => { setFullName(''); setEmail(''); setPassword(''); setError(''); };
  const openModal = (role: RoleKey) => { resetModal(); setPendingRole(role); };
  const closeModal = () => { setPendingRole(null); resetModal(); };

  const handleInvite = async () => {
    if (!pendingRole) return;
    if (!fullName.trim()) { setError('Le nom est obligatoire'); return; }
    if (!email.trim()) { setError("L'email est obligatoire"); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return; }
    setError('');
    try {
      await inviteMember({ email: email.trim(), password, fullName: fullName.trim(), role: pendingRole });
      closeModal();
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création du compte');
    }
  };

  const handleRemove = (memberId: string, memberName: string) => {
    Alert.alert('Retirer ce membre', `Retirer ${memberName} de l'équipe ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => removeMember(memberId) },
    ]);
  };

  const renderSection = (roleKey: RoleKey) => {
    const cfg = ROLE_CONFIG[roleKey];
    const roleMembers = members?.filter((m) => m.role === roleKey) ?? [];

    return (
      <View key={roleKey}>
        <View style={styles.sectionLabel}>
          <View style={[styles.sectionAccent, { backgroundColor: cfg.color }]} />
          <Text style={styles.sectionLabelText}>{cfg.label} ({isLoading ? '…' : roleMembers.length})</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 12 }} color={APP_COLORS.primary} />
        ) : roleMembers.length === 0 ? (
          <View style={[styles.emptyBox, SHADOWS.xs]}>
            <MaterialCommunityIcons name={cfg.icon as any} size={28} color={APP_COLORS.textTertiary} />
            <Text style={styles.emptyText}>Aucun membre</Text>
          </View>
        ) : (
          <View style={[styles.card, SHADOWS.sm]}>
            {roleMembers.map((m, idx) => (
              <View key={m.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.memberRow}>
                  <View style={[styles.avatar, { backgroundColor: cfg.color + '15' }]}>
                    <MaterialCommunityIcons name={cfg.icon as any} size={19} color={cfg.color} />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.member_name}</Text>
                    <Text style={styles.memberEmail}>{m.member_email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(m.member_id, m.member_name)} style={styles.removeBtn}>
                    <MaterialCommunityIcons name="account-remove-outline" size={19} color={APP_COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: cfg.color }, SHADOWS.sm]}
          onPress={() => openModal(roleKey)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="account-plus" size={18} color="#FFFFFF" />
          <Text style={styles.inviteBtnText}>Inviter un{roleKey === 'cleaner' ? 'e' : ''} {cfg.labelSingular.toLowerCase()}</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={14} color={APP_COLORS.textTertiary} />
          <Text style={styles.infoText}>{cfg.description}</Text>
        </View>
      </View>
    );
  };

  const activeConfig = pendingRole ? ROLE_CONFIG[pendingRole] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(248,245,239,0.8)" />
        </TouchableOpacity>
        <Text style={styles.title}>Rôles</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Manager */}
        <View style={styles.sectionLabel}>
          <View style={[styles.sectionAccent, { backgroundColor: APP_COLORS.accent }]} />
          <Text style={styles.sectionLabelText}>MANAGER</Text>
        </View>
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.memberRow}>
            <View style={[styles.avatar, { backgroundColor: APP_COLORS.primaryPale }]}>
              <MaterialCommunityIcons name="crown" size={19} color={APP_COLORS.primary} />
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{profile?.full_name ?? 'Moi'}</Text>
              <Text style={styles.memberEmail}>Accès complet</Text>
            </View>
            <View style={styles.managerBadge}>
              <Text style={styles.managerBadgeText}>Manager</Text>
            </View>
          </View>
        </View>

        {renderSection('cleaner')}
        {renderSection('comptable')}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!pendingRole} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={modal.overlay}>
          <View style={[modal.container, SHADOWS.lg]}>
            <View style={modal.handle} />
            <View style={modal.header}>
              <Text style={modal.title}>
                Inviter un{pendingRole === 'cleaner' ? 'e' : ''} {activeConfig?.labelSingular.toLowerCase()}
              </Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput label="Nom complet" mode="outlined" value={fullName} onChangeText={setFullName} style={modal.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
            <TextInput label="Email" mode="outlined" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={modal.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
            <TextInput label="Mot de passe" mode="outlined" value={password} onChangeText={setPassword} secureTextEntry style={modal.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />

            {error ? <Text style={modal.error}>{error}</Text> : null}

            <View style={modal.actions}>
              <Button mode="outlined" onPress={closeModal} style={{ flex: 1 }}>Annuler</Button>
              <Button
                mode="contained"
                onPress={handleInvite}
                loading={inviting}
                buttonColor={activeConfig?.color ?? APP_COLORS.primary}
                style={{ flex: 1 }}
                labelStyle={{ color: '#FFFFFF' }}
              >
                Créer
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: { padding: 2 },
  title: { fontSize: 24, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 1 },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },

  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  sectionAccent: { width: 3, height: 13, borderRadius: 2 },
  sectionLabelText: { fontSize: 11, fontWeight: '700', color: APP_COLORS.textSecondary, letterSpacing: 0.8 },

  card: { backgroundColor: APP_COLORS.surfaceElevated, marginHorizontal: 16, borderRadius: RADII.md, overflow: 'hidden' },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary },
  memberEmail: { fontSize: 12, color: APP_COLORS.textSecondary, marginTop: 1 },
  managerBadge: { backgroundColor: APP_COLORS.primaryPale, borderRadius: RADII.full, paddingHorizontal: 9, paddingVertical: 3 },
  managerBadgeText: { fontSize: 11, color: APP_COLORS.primary, fontWeight: '700' },
  removeBtn: { padding: 6 },
  divider: { height: 1, backgroundColor: APP_COLORS.borderLight, marginHorizontal: 14 },

  emptyBox: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 18,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
    gap: 6,
  },
  emptyText: { fontSize: 13, color: APP_COLORS.textTertiary },

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: RADII.md,
    paddingVertical: 13,
  },
  inviteBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  infoBox: {
    flexDirection: 'row',
    gap: 7,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: APP_COLORS.glassDark,
    borderRadius: RADII.sm,
    padding: 11,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: APP_COLORS.textSecondary, lineHeight: 17 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(5,14,26,0.62)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    padding: 20,
    paddingBottom: 36,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: APP_COLORS.border, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: APP_COLORS.textPrimary, fontFamily: FONTS.titleBold },
  input: { marginBottom: 10, backgroundColor: APP_COLORS.surface },
  error: { color: APP_COLORS.danger, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
