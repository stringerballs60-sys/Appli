import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { ReservationSource } from '@/types';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '@/constants/channels';

interface ChannelBadgeProps {
  channel: ReservationSource;
  size?: number;
  withLabel?: boolean;
  labelColor?: string;
  ring?: boolean;
}

export function ChannelBadge({ channel, size = 16, withLabel = false, labelColor, ring = false }: ChannelBadgeProps) {
  const bg = CHANNEL_COLORS[channel];
  const glyph =
    channel === 'airbnb' ? (
      <FontAwesome5 name="airbnb" size={size * 0.62} color="#FFFFFF" brand />
    ) : channel === 'manual' ? (
      <MaterialCommunityIcons name="home-variant" size={size * 0.66} color="#FFFFFF" />
    ) : (
      <Text style={[styles.letter, { fontSize: size * 0.56, lineHeight: size * 0.7 }]}>
        {channel === 'booking' ? 'B' : 'A'}
      </Text>
    );

  const badge = (
    <View
      accessibilityLabel={CHANNEL_LABELS[channel]}
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        ring && styles.ring,
      ]}
    >
      {glyph}
    </View>
  );

  if (!withLabel) return badge;
  return (
    <View style={styles.row}>
      {badge}
      <Text style={[styles.label, labelColor ? { color: labelColor } : null]}>{CHANNEL_LABELS[channel]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
  letter: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, color: '#0F2240' },
});
