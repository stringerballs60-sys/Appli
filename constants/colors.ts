// 8 families × 3 shades (light → mid → dark) — unchanged
export const PROPERTY_COLORS = [
  '#FFCDD2', '#F44336', '#B71C1C',
  '#FFE0B2', '#FF9800', '#E65100',
  '#FFF9C4', '#FFEB3B', '#F57F17',
  '#C8E6C9', '#4CAF50', '#1B5E20',
  '#B2EBF2', '#00BCD4', '#006064',
  '#BBDEFB', '#2196F3', '#0D47A1',
  '#E1BEE7', '#9C27B0', '#4A148C',
  '#FCE4EC', '#E91E63', '#880E4F',
];

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  confirmed: '#2D7A4F',
  pending: '#C07800',
  cancelled: '#C0392B',
  completed: '#7A8A9A',
};

export const PROPERTY_TYPE_COLORS: Record<string, string> = {
  SCI: '#2563EB',
  COHOST_AIRBNB: '#E05252',
  HOST_AIRBNB: '#7C3AED',
  EXTERNAL_CLEANING: '#0891B2',
  EXTERNAL_CLEANING_CHECKIN: '#C05621',
};

export const APP_COLORS = {
  // ── Navy ──────────────────────────────────────────────────────
  primaryDark:  '#0A1628',
  primary:      '#1B2B4B',
  primaryMed:   '#243756',
  primaryLight: '#4A6490',
  primaryPale:  '#E8EEF7',

  // ── Gold ──────────────────────────────────────────────────────
  accentDark:  '#8B6914',
  accent:      '#C9A84C',
  accentLight: '#E2C87A',
  accentPale:  '#FBF4E0',

  // ── Backgrounds & surfaces ────────────────────────────────────
  background:        '#F2EEE6',
  backgroundAlt:     '#EAE5DC',
  surface:           '#FDFAF5',
  surfaceElevated:   '#FFFFFF',

  // ── Text ──────────────────────────────────────────────────────
  textPrimary:   '#0A1628',
  textSecondary: '#5A5248',
  textTertiary:  '#9E9890',
  textOnDark:    '#F8F5EF',
  textOnAccent:  '#3A2800',

  // ── Borders ───────────────────────────────────────────────────
  border:      '#DDD8CF',
  borderLight: '#EDE9E2',

  // ── Semantic ──────────────────────────────────────────────────
  success:      '#2D7A4F',
  successLight: '#E8F5EE',
  warning:      '#B45309',
  warningLight: '#FEF3CD',
  danger:       '#C0392B',
  dangerLight:  '#FEE8E6',
  info:         '#1E4ED8',
  infoLight:    '#EEF2FF',

  // ── Glass helpers ─────────────────────────────────────────────
  glassDark:  'rgba(10, 22, 40, 0.06)',
  glassGold:  'rgba(201, 168, 76, 0.10)',
  glassWhite: 'rgba(253, 250, 245, 0.80)',
};
