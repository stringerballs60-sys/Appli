import { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { MemoPriority, Memo } from '@/types';
import {
  usePendingMemos,
  useDoneMemos,
  useAddMemo,
  useMarkMemoDone,
  useMarkMemoPending,
  useDeleteMemo,
} from '@/hooks/useMemos';
import { scheduleMemoReminder } from '@/services/notifications';

const PRIORITY_CFG: Record<MemoPriority, { label: string; color: string; icon: string }> = {
  normal: { label: 'Normal', color: APP_COLORS.textSecondary, icon: 'minus-circle-outline' },
  urgent: { label: 'Urgent', color: APP_COLORS.danger,       icon: 'alert-circle' },
  info:   { label: 'Info',   color: APP_COLORS.info,         icon: 'information' },
};

function MemoItem({ memo, onDone, onUndone, onDelete }: {
  memo: Memo;
  onDone?: () => void;
  onUndone?: () => void;
  onDelete?: () => void;
}) {
  const pCfg = PRIORITY_CFG[memo.priority];
  const isDone = memo.status === 'done';

  return (
    <View style={[item.row, isDone && item.rowDone]}>
      <TouchableOpacity onPress={isDone ? onUndone : onDone} style={item.checkbox} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialCommunityIcons
          name={isDone ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
          size={22}
          color={isDone ? APP_COLORS.success : APP_COLORS.border}
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={[item.text, isDone && item.textDone]} numberOfLines={3}>{memo.text}</Text>
        {isDone && memo.completed_at && (
          <Text style={item.date}>{format(parseISO(memo.completed_at), "d MMM 'à' HH'h'mm", { locale: fr })}</Text>
        )}
      </View>

      {!isDone && memo.priority !== 'normal' && (
        <MaterialCommunityIcons name={pCfg.icon as any} size={16} color={pCfg.color} />
      )}

      {isDone && (
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="trash-can-outline" size={17} color={APP_COLORS.border} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function MemoScreen() {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<MemoPriority>('normal');
  const [showDone, setShowDone] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { data: pending, isLoading: pendingLoading } = usePendingMemos();
  const { data: done, isLoading: doneLoading } = useDoneMemos();
  const { mutate: addMemo, isPending: adding } = useAddMemo();
  const { mutate: markDone } = useMarkMemoDone();
  const { mutate: markPending } = useMarkMemoPending();
  const { mutate: deleteMemo } = useDeleteMemo();

  const pendingCount = pending?.length ?? 0;

  useEffect(() => {
    scheduleMemoReminder(pendingCount).catch(() => {});
  }, [pendingCount]);

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addMemo({ text: trimmed, priority });
    setText('');
    inputRef.current?.blur();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer définitivement ce mémo ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMemo(id) },
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
        <View>
          <Text style={styles.title}>Mémo</Text>
          <Text style={styles.headerSub}>
            {pendingCount === 0 ? 'Aucune note en cours' : `${pendingCount} note${pendingCount > 1 ? 's' : ''} en cours`}
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Add input */}
          <View style={[styles.addCard, SHADOWS.sm]}>
            <View style={styles.addRow}>
              <TextInput
                ref={inputRef}
                style={styles.addInput}
                placeholder="Ajouter une note..."
                placeholderTextColor={APP_COLORS.textTertiary}
                value={text}
                onChangeText={setText}
                onSubmitEditing={handleAdd}
                returnKeyType="send"
                multiline={false}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                onPress={handleAdd}
                disabled={!text.trim() || adding}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="send" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.priorityRow}>
              {(Object.entries(PRIORITY_CFG) as [MemoPriority, typeof PRIORITY_CFG[MemoPriority]][]).map(([key, cfg]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.pill, priority === key && { backgroundColor: cfg.color + '18', borderColor: cfg.color }]}
                  onPress={() => setPriority(key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={cfg.icon as any}
                    size={11}
                    color={priority === key ? cfg.color : APP_COLORS.textTertiary}
                  />
                  <Text style={[styles.pillText, priority === key && { color: cfg.color, fontWeight: '700' }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* À faire */}
          <View style={styles.sectionRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionText}>À FAIRE</Text>
          </View>

          {pendingLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={APP_COLORS.primary} />
          ) : pendingCount === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="check-all" size={28} color={APP_COLORS.success} style={{ opacity: 0.55 }} />
              <Text style={styles.emptyText}>Aucune note en cours</Text>
            </View>
          ) : (
            <View style={[styles.listCard, SHADOWS.xs]}>
              {pending!.map((memo, i) => (
                <View key={memo.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <MemoItem memo={memo} onDone={() => markDone(memo.id)} />
                </View>
              ))}
            </View>
          )}

          {/* Historique */}
          <TouchableOpacity style={styles.sectionRow} onPress={() => setShowDone(v => !v)} activeOpacity={0.7}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionText}>HISTORIQUE ({done?.length ?? 0})</Text>
            <MaterialCommunityIcons
              name={showDone ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={APP_COLORS.textTertiary}
            />
          </TouchableOpacity>

          {showDone && (
            doneLoading ? (
              <ActivityIndicator style={{ marginTop: 12 }} color={APP_COLORS.primary} />
            ) : !done || done.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucun historique</Text>
              </View>
            ) : (
              <View style={[styles.listCard, SHADOWS.xs]}>
                {done.map((memo, i) => (
                  <View key={memo.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <MemoItem memo={memo} onUndone={() => markPending(memo.id)} onDelete={() => handleDelete(memo.id)} />
                  </View>
                ))}
              </View>
            )
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 1 },
  headerSub: { fontSize: 12, color: 'rgba(248,245,239,0.65)', marginTop: 2 },
  headerBadge: {
    backgroundColor: APP_COLORS.accent,
    borderRadius: RADII.full,
    minWidth: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    ...SHADOWS.gold,
  },
  headerBadgeText: { fontSize: 13, fontWeight: '800', color: APP_COLORS.textOnAccent },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },

  addCard: {
    backgroundColor: APP_COLORS.surfaceElevated,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: RADII.md,
    padding: 14,
    gap: 10,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addInput: {
    flex: 1,
    fontSize: 15,
    color: APP_COLORS.textPrimary,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.background,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: RADII.sm,
    backgroundColor: APP_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    ...SHADOWS.navy,
  },
  sendBtnDisabled: { opacity: 0.35 },
  priorityRow: { flexDirection: 'row', gap: 7 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.backgroundAlt,
  },
  pillText: { fontSize: 11, color: APP_COLORS.textTertiary },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionAccent: { width: 3, height: 13, borderRadius: 2, backgroundColor: APP_COLORS.accent },
  sectionText: { flex: 1, fontSize: 11, fontWeight: '700', color: APP_COLORS.textSecondary, letterSpacing: 0.8 },

  listCard: {
    backgroundColor: APP_COLORS.surfaceElevated,
    marginHorizontal: 16,
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: APP_COLORS.borderLight, marginLeft: 46 },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: APP_COLORS.textTertiary, fontStyle: 'italic' },
});

const item = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  rowDone: { opacity: 0.6 },
  checkbox: { paddingTop: 1, flexShrink: 0 },
  text: { fontSize: 14, color: APP_COLORS.textPrimary, lineHeight: 20 },
  textDone: { textDecorationLine: 'line-through', color: APP_COLORS.textSecondary },
  date: { fontSize: 11, color: APP_COLORS.textTertiary, marginTop: 3 },
});
