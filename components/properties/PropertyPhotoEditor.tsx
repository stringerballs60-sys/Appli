import { View, Text, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Property } from '@/types';
import { usePropertyPhoto } from '@/hooks/usePropertyPhoto';
import { Alert } from '@/utils/alert';

interface Props {
  property: Property;
  size?: number;
  dark?: boolean;
}

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(' ').filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

export function PropertyPhotoEditor({ property, size = 120, dark = false }: Props) {
  const { choose, remove, busy, error } = usePropertyPhoto(property.id, property.photo_url);
  const ink = dark ? '#FFFFFF' : '#0F2240';
  const soft = dark ? 'rgba(255,255,255,0.7)' : '#5B6472';

  const confirmRemove = () =>
    Alert.alert('Retirer la photo ?', `La photo de ${property.name} sera supprimée.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: remove },
    ]);

  return (
    <View style={styles.row}>
      <Pressable onPress={choose} disabled={busy} accessibilityLabel={property.photo_url ? 'Changer la photo' : 'Ajouter une photo'}>
        {property.photo_url ? (
          <Image source={{ uri: property.photo_url }} style={[styles.img, { width: size, height: size }]} />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size, backgroundColor: `${property.color}40`, borderColor: `${property.color}90` }]}>
            <Text style={[styles.initials, { fontSize: size * 0.28 }]}>{initials(property.name)}</Text>
          </View>
        )}
        {busy && (
          <View style={[styles.overlay, { width: size, height: size }]}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        )}
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <Pressable onPress={choose} disabled={busy} style={({ hovered }: any) => [styles.btn, { borderColor: dark ? 'rgba(255,255,255,0.35)' : '#D5DAE0' }, hovered && { opacity: 0.8 }]}>
          <Text style={[styles.btnText, { color: ink }]}>{busy ? 'Envoi en cours…' : property.photo_url ? 'Changer la photo' : 'Ajouter une photo'}</Text>
        </Pressable>
        {property.photo_url && !busy ? (
          <Pressable onPress={confirmRemove} style={({ hovered }: any) => [hovered && { opacity: 0.7 }]}>
            <Text style={[styles.link, { color: soft }]}>Retirer la photo</Text>
          </Pressable>
        ) : null}
        {!property.photo_url && !busy ? <Text style={[styles.hint, { color: soft }]}>Une photo carrée marche le mieux. Elle est réduite automatiquement.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  img: { borderRadius: 10, backgroundColor: '#EEF0F2' },
  placeholder: { borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '800', color: '#0F2240' },
  overlay: { position: 'absolute', top: 0, left: 0, borderRadius: 10, backgroundColor: 'rgba(15,34,64,0.45)', alignItems: 'center', justifyContent: 'center' },
  btn: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  btnText: { fontSize: 14, fontWeight: '700' },
  link: { fontSize: 13, textDecorationLine: 'underline' },
  hint: { fontSize: 12, maxWidth: 260 },
  error: { fontSize: 13, color: '#D64545' },
});
