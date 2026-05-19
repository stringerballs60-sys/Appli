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
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { APP_COLORS } from '@/constants/colors';
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
  urgent: { label: 'Urgent', color: '#EF4444', icon: 'alert-circle' },
  info:   { label: 'Info',   color: '#3B82F6', icon: 'information' },
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
    <View style={[memoStyles.item, isDone && memoStyles.itemDone]}>
      <TouchableOpacity
        onPress={isDone ? onUndone : onDone}
        style={memoStyles.checkbox}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons
          name={isDone ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
          size={22}
          color={isDone ? APP_COLORS.success : APP_COLORS.border}
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={[memoStyles.itemText, isDone && memoStyles.itemTextDone]} numberOfLines={3}>
          {memo.text}
        </Text>
        {isDone && memo.completed_at && (
          <Text style={memoStyles.itemDate}>
            {format(parseISO(memo.completed_at), "d MMM 'à' HH'h'mm", { locale: fr })}
          </Text>
        )}
      </View>

      {!isDone && memo.priority !== 'normal' && (
        <MaterialCommunityIcons name={pCfg.icon as any} size={16} color={pCfg.color} />
      )}

      {isDone && (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={APP_COLORS.border} />
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
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mémo</Text>
          <Text style={styles.subtitle}>
            {pendingCount === 0 ? 'Aucune note en cours' : `${pendingCount} note${pendingCount > 1 ? 's' : ''} en cours`}
          </Text>
        </View>
        <View style={[styles.headerBadge, { opacity: pendingCount > 0 ? 1 : 0 }]}>
          <Text style={styles.headerBadgeText}>{pendingCount}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.addCard}>
            <View style={styles.addRow}>
              <TextInput
                ref={inputRef}
                style={styles.addInput}
                placeholder="Ajouter une note..."
                placeholderTextColor={APP_COLORS.textSecondary}
                value={text}
                onChangeText={setText}
                onSubmitEditing={handleAdd}
                returnKeyType="send"
                multiline={false}
              />
              <TouchableOpacity
                style={[styles.addBtn, !text.trim() && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!text.trim() || adding}
              >
                <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.priorityRow}>
              {(Object.entries(PRIORITY_CFG) as [MemoPriority, typeof PRIORITY_CFG[MemoPriority]][]).map(([key, cfg]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.priorityPill,
                    priority === key && { backgroundColor: cfg.color + '22', borderColor: cfg.color },
                  ]}
                  onPress={() => setPriority(key)}
                >
                  <MaterialCommunityIcons
                    name={cfg.icon as any}
                    size={12}
                    color={priority === key ? cfg.color : APP_COLORS.textSecondary}
                  />
                  <Text style={[
                    styles.priorityPillText,
                    priority === key && { color: cfg.color, fontWeight: '700' },
                  ]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>À FAIRE</Text>
          </View>

          {pendingLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={APP_COLORS.primary} />
          ) : pendingCount === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-all" size={32} color={APP_COLORS.success} style={{ opacity: 0.6 }} />
              <Text style={styles.emptyText}>Aucune note en cours</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {pending!.map((memo, i) => (
                <View key={memo.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <MemoItem
                    memo={memo}
                    onDone={() => markDone(memo.id)}
                  />
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowDone(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionHeaderText}>HISTORIQUE ({done?.length ?? 0})</Text>
            <MaterialCommunityIcons
              name={showDone ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={APP_COLORS.textSecondary}
            />
          </TouchableOpacity>

          {showDone && (
            doneLoading ? (
              <ActivityIndicator style={{ marginTop: 12 }} color={APP_COLORS.primary} />
            ) : !done || done.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Aucun historique</Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {done.map((memo, i) => (
                  <View key={memo.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <MemoItem
                      memo={memo}
                      onUndone={() => markPending(memo.id)}
                      onDelete={() => handleDelete(memo.id)}
                    />
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
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerBadge: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    minWidth: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  scroll: { flex: 1 },
  addCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addInput: {
    flex: 1,
    fontSize: 15,
    color: APP_COLORS.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  addBtnDisabled: { opacity: 0.35 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: '#F8F9FA',
  },
  priorityPillText: { fontSize: 11, color: APP_COLORS.textSecondary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  divider: { height: 1, backgroundColor: APP_COLORS.border, marginLeft: 48 },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: APP_COLORS.textSecondary, fontStyle: 'italic' },
});

const memoStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  itemDone: { opacity: 0.65 },
  checkbox: { paddingTop: 1, flexShrink: 0 },
  itemText: { fontSize: 14, color: APP_COLORS.textPrimary, lineHeight: 20 },
  itemTextDone: { textDecorationLine: 'line-through', color: APP_COLORS.textSecondary },
  itemDate: { fontSize: 11, color: APP_COLORS.textSecondary, marginTop: 3 },
});
