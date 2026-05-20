import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, Appbar, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useTeamMembers, useInviteMember, useRemoveMember } from '@/hooks/useRoles';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';

type RoleKey = 'cleaner' | 'comptable';

const ROLE_CONFIG: Record<RoleKey, {
  label: string;
  labelSingular: string;
  icon: string;
  color: string;
  description: string;
}> = {
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

  const resetModal = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const openModal = (role: RoleKey) => {
    resetModal();
    setPendingRole(role);
  };

  const closeModal = () => {
    setPendingRole(null);
    resetModal();
  };

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
    Alert.alert(
      'Retirer ce membre',
      `Retirer ${memberName} de l'équipe ? Son compte reste actif mais il n'aura plus accès aux données.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Retirer', style: 'destructive', onPress: () => removeMember(memberId) },
      ]
    );
  };

  const renderSection = (roleKey: RoleKey) => {
    const cfg = ROLE_CONFIG[roleKey];
    const roleMembers = members?.filter((m) => m.role === roleKey) ?? [];

    return (
      <View key={roleKey}>
        <Text style={styles.sectionLabel}>{cfg.label} ({isLoading ? '…' : roleMembers.length})</Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 12 }} color={APP_COLORS.primary} />
        ) : roleMembers.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name={cfg.icon as any} size={32} color={APP_COLORS.textSecondary} />
            <Text style={styles.emptyText}>Aucun membre</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {roleMembers.map((m, idx) => (
              <View key={m.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.memberRow}>
                  <View style={[styles.avatar, { backgroundColor: cfg.color + '22' }]}>
                    <MaterialCommunityIcons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.member_name}</Text>
                    <Text style={styles.memberEmail}>{m.member_email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(m.member_id, m.member_name)} style={styles.removeBtn}>
                    <MaterialCommunityIcons name="account-remove-outline" size={20} color={APP_COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: cfg.color }]} onPress={() => openModal(roleKey)} activeOpacity={0.8}>
          <MaterialCommunityIcons name="account-plus" size={20} color="#FFFFFF" />
          <Text style={styles.inviteBtnLabel}>Inviter un{roleKey === 'cleaner' ? 'e' : ''} {cfg.labelSingular.toLowerCase()}</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color={APP_COLORS.textSecondary} />
          <Text style={styles.infoText}>{cfg.description}</Text>
        </View>
      </View>
    );
  };

  const activeConfig = pendingRole ? ROLE_CONFIG[pendingRole] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content title="Rôles" titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Manager section */}
        <Text style={styles.sectionLabel}>MANAGER</Text>
        <View style={styles.card}>
          <View style={styles.memberRow}>
            <View style={[styles.avatar, { backgroundColor: APP_COLORS.primary + '22' }]}>
              <MaterialCommunityIcons name="crown" size={20} color={APP_COLORS.primary} />
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{profile?.full_name ?? 'Moi'}</Text>
              <Text style={styles.memberRole}>Accès complet</Text>
            </View>
            <View style={styles.badgeManager}>
              <Text style={styles.badgeManagerText}>Manager</Text>
            </View>
          </View>
        </View>

        {renderSection('cleaner')}
        {renderSection('comptable')}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Invite modal */}
      <Modal visible={!!pendingRole} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Inviter un{pendingRole === 'cleaner' ? 'e' : ''} {activeConfig?.labelSingular.toLowerCase()}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <MaterialCommunityIcons name="close" size={22} color={APP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              label="Nom complet"
              mode="outlined"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              outlineColor={APP_COLORS.border}
              activeOutlineColor={APP_COLORS.primary}
            />
            <TextInput
              label="Email"
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineColor={APP_COLORS.border}
              activeOutlineColor={APP_COLORS.primary}
            />
            <TextInput
              label="Mot de passe"
              mode="outlined"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              outlineColor={APP_COLORS.border}
              activeOutlineColor={APP_COLORS.primary}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={closeModal} style={styles.cancelBtn}>
                Annuler
              </Button>
              <Button
                mode="contained"
                onPress={handleInvite}
                loading={inviting}
                buttonColor={activeConfig?.color ?? APP_COLORS.primary}
                style={styles.confirmBtn}
                labelStyle={{ color: '#FFFFFF' }}
              >
                Créer le compte
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: { color: '#FFFFFF', fontSize: 17, fontFamily: FONTS.titleBold },
  scroll: { flex: 1 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: APP_COLORS.textPrimary },
  memberRole: { fontSize: 12, color: APP_COLORS.textSecondary, marginTop: 1 },
  memberEmail: { fontSize: 12, color: APP_COLORS.textSecondary, marginTop: 1 },
  badgeManager: {
    backgroundColor: APP_COLORS.primary + '18',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeManagerText: { fontSize: 11, color: APP_COLORS.primary, fontWeight: '700' },
  removeBtn: { padding: 6 },
  divider: { height: 1, backgroundColor: APP_COLORS.border, marginHorizontal: 14 },

  emptyBox: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    gap: 6,
  },
  emptyText: { fontSize: 13, color: APP_COLORS.textSecondary },

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 13,
  },
  inviteBtnLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  infoBox: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: APP_COLORS.border + '55',
    borderRadius: 10,
    padding: 12,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: APP_COLORS.textSecondary, lineHeight: 18 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: APP_COLORS.textPrimary, fontFamily: FONTS.titleBold },
  input: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  error: { color: APP_COLORS.danger, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1 },
  confirmBtn: { flex: 1 },
});
