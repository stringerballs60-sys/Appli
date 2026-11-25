import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FONTS } from '@/constants/typography';

export type LoginVariant = 'keybox' | 'ticket' | 'village';

export interface LoginFormProps {
  email: string;
  password: string;
  rememberMe: boolean;
  loading: boolean;
  sending: boolean;
  error: string;
  info: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onRemember: (v: boolean) => void;
  onLogin: () => void;
  onForgot: () => void;
  onRegister: () => void;
}

const C = {
  nuit: '#0F2240',
  nuitSoft: '#1B2F52',
  or: '#C9A227',
  orClair: '#E8CF7A',
  kraft: '#F3EDE2',
  papier: '#FFFDF8',
  carbone: '#2F4A78',
  trait: '#DCD2C0',
  texte: '#0F2240',
  doux: '#5B6472',
  rouge: '#B4453A',
  pierre: '#E9E4DA',
};

type Tone = { bg: string; field: string; border: string; focus: string; text: string; soft: string; button: string; buttonText: string; link: string };

const PAPER_TONE: Tone = { bg: C.papier, field: '#FFFFFF', border: C.trait, focus: C.carbone, text: C.texte, soft: C.doux, button: C.nuit, buttonText: '#FFFFFF', link: C.carbone };

function Field({
  label, value, onChange, secure, tone, icon, onSubmit, autoFocus, type,
}: {
  label: string; value: string; onChange: (v: string) => void; secure?: boolean; tone: Tone; icon: string; onSubmit: () => void; autoFocus?: boolean; type: 'email' | 'password';
}) {
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[f.label, { color: tone.soft }]}>{label}</Text>
      <View style={[f.box, { backgroundColor: tone.field, borderColor: focus ? tone.focus : tone.border }, focus && { boxShadow: `0 0 0 3px ${tone.focus}22` } as any]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={focus ? tone.focus : tone.soft} />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          secureTextEntry={secure && hidden}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          keyboardType={type === 'email' ? 'email-address' : 'default'}
          autoComplete={type === 'email' ? 'email' : 'current-password'}
          onSubmitEditing={onSubmit}
          style={[f.input, { color: tone.text }] as any}
          placeholderTextColor={tone.soft}
          accessibilityLabel={label}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'} hitSlop={8}>
            <MaterialCommunityIcons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={tone.soft} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function LoginForm(p: LoginFormProps & { tone: Tone; title?: string; subtitle?: string; titleFont?: string }) {
  const { tone } = p;
  return (
    <View style={{ gap: 16, width: '100%' }}>
      {p.title ? (
        <View style={{ gap: 4, marginBottom: 4 }}>
          <Text style={[f.title, { color: tone.text, fontFamily: p.titleFont ?? FONTS.stubSerif }]}>{p.title}</Text>
          {p.subtitle ? <Text style={[f.sub, { color: tone.soft }]}>{p.subtitle}</Text> : null}
        </View>
      ) : null}
      <Field label="E-mail" value={p.email} onChange={p.onEmail} tone={tone} icon="email-outline" onSubmit={p.onLogin} autoFocus type="email" />
      <Field label="Mot de passe" value={p.password} onChange={p.onPassword} secure tone={tone} icon="lock-outline" onSubmit={p.onLogin} type="password" />

      <View style={f.row}>
        <Pressable onPress={() => p.onRemember(!p.rememberMe)} style={f.check} accessibilityRole="checkbox" accessibilityState={{ checked: p.rememberMe }}>
          <MaterialCommunityIcons name={p.rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={tone.focus} />
          <Text style={[f.small, { color: tone.text }]}>Rester connecté</Text>
        </Pressable>
        <Pressable onPress={p.onForgot} disabled={p.sending}>
          <Text style={[f.small, f.link, { color: tone.link }]}>{p.sending ? 'Envoi en cours…' : 'Mot de passe oublié ?'}</Text>
        </Pressable>
      </View>

      {p.error ? <Text style={f.error} accessibilityLiveRegion="polite">{p.error}</Text> : null}
      {p.info ? <Text style={[f.info, { color: tone.focus }]} accessibilityLiveRegion="polite">{p.info}</Text> : null}

      <Pressable
        onPress={p.onLogin}
        disabled={p.loading}
        style={({ hovered, pressed }: any) => [f.button, { backgroundColor: tone.button }, (hovered || pressed) && { opacity: 0.9 }, p.loading && { opacity: 0.6 }]}
      >
        <Text style={[f.buttonText, { color: tone.buttonText }]}>{p.loading ? 'Connexion…' : 'Se connecter'}</Text>
        {!p.loading ? <MaterialCommunityIcons name="arrow-right" size={18} color={tone.buttonText} /> : null}
      </Pressable>

      <View style={[f.row, { justifyContent: 'center', gap: 6 }]}>
        <Text style={[f.small, { color: tone.soft }]}>Pas encore de compte ?</Text>
        <Pressable onPress={p.onRegister}>
          <Text style={[f.small, f.link, { color: tone.link }]}>Créer un compte</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ───────── A · Boîte à clés ───────── */
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function KeyboxLogin(p: LoginFormProps) {
  const wheels = ['K', 'A', 'Z', 'A'];
  return (
    <View style={[s.root, { flexDirection: 'row' }]}>
      <View style={[s.half, { backgroundColor: C.nuit, alignItems: 'center', justifyContent: 'center', gap: 34 }]}>
        <View style={k.box}>
          <View style={k.shackle} />
          <View style={k.body}>
            <View style={k.window}>
              {wheels.map((w, i) => (
                <View key={i} style={k.wheel}>
                  <Text style={k.ghost}>{ABC[(ABC.indexOf(w) + 25) % 26]}</Text>
                  <Text style={k.digit}>{w}</Text>
                  <Text style={k.ghost}>{ABC[(ABC.indexOf(w) + 1) % 26]}</Text>
                </View>
              ))}
            </View>
            <View style={k.lever} />
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 6, maxWidth: 380 }}>
          <Text style={k.brand}>KAZA</Text>
          <Text style={k.tagline}>Les clés de tes logements, au même endroit.</Text>
        </View>
      </View>
      <View style={[s.half, { backgroundColor: C.kraft, alignItems: 'center', justifyContent: 'center' }]}>
        <View style={k.card}>
          <LoginForm {...p} tone={PAPER_TONE} title="Ouvre la boîte" subtitle="Connecte-toi pour retrouver ta conciergerie." />
        </View>
      </View>
    </View>
  );
}

/* ───────── B · Ticket d'entrée ───────── */
function TicketLogin(p: LoginFormProps) {
  const now = useMemo(() => new Date(), []);
  return (
    <View style={[s.root, { backgroundColor: C.kraft, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
      <View style={t.ticket}>
        <View style={t.stub}>
          <Image source={require('@/assets/icon.png')} style={t.logo} resizeMode="contain" />
          <View style={{ alignItems: 'center' }}>
            <Text style={t.stubLabel}>entrée du</Text>
            <Text style={t.day}>{format(now, 'd')}</Text>
            <Text style={t.month}>{format(now, 'MMMM', { locale: fr }).toUpperCase()}</Text>
            <Text style={t.year}>{format(now, 'EEEE yyyy', { locale: fr })}</Text>
          </View>
          <Text style={t.stubFoot}>N° {format(now, 'ddMM')}·KZ</Text>
        </View>
        <View style={t.perf}>
          <View style={[t.notch, { top: -12 }]} />
          <View style={t.dash} />
          <View style={[t.notch, { bottom: -12 }]} />
        </View>
        <View style={t.body}>
          <View style={t.stamp} pointerEvents="none">
            <Text style={t.stampText}>KAZA</Text>
          </View>
          <LoginForm {...p} tone={PAPER_TONE} title="Ton ticket d’entrée" subtitle="Conciergerie · gestion des logements" />
        </View>
      </View>
    </View>
  );
}

/* ───────── C · Lama, le soir ───────── */
const HOUSES = [
  { w: 90, h: 70, roof: 34, lit: [0, 2] }, { w: 70, h: 110, roof: 30, lit: [1, 4] }, { w: 120, h: 80, roof: 40, lit: [3] },
  { w: 60, h: 140, roof: 26, lit: [0, 5] }, { w: 100, h: 95, roof: 36, lit: [2] }, { w: 80, h: 60, roof: 30, lit: [] },
  { w: 110, h: 120, roof: 40, lit: [1, 3] }, { w: 70, h: 85, roof: 28, lit: [0] }, { w: 95, h: 105, roof: 34, lit: [2, 4] },
  { w: 130, h: 75, roof: 44, lit: [1] }, { w: 65, h: 130, roof: 26, lit: [3] }, { w: 100, h: 90, roof: 36, lit: [0, 2] },
];

function House({ w, h, roof, lit }: { w: number; h: number; roof: number; lit: number[] }) {
  const cols = Math.max(2, Math.floor(w / 26));
  const rows = Math.max(1, Math.floor((h - 18) / 30));
  return (
    <View style={{ width: w, alignItems: 'center', marginHorizontal: -4 }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: w / 2 + 6, borderRightWidth: w / 2 + 6, borderBottomWidth: roof, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0A1830' }} />
      <View style={{ width: w, height: h, backgroundColor: '#13284A', flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 12, gap: 10, alignContent: 'flex-start' }}>
        {Array.from({ length: cols * rows }).map((_, i) => (
          <View key={i} style={{ width: 9, height: 13, borderRadius: 1, backgroundColor: lit.includes(i) ? C.orClair : '#0C1C36', boxShadow: lit.includes(i) ? `0 0 10px ${C.or}AA` : undefined } as any} />
        ))}
      </View>
    </View>
  );
}

function VillageLogin(p: LoginFormProps) {
  return (
    <View style={[s.root, { backgroundColor: C.nuit, overflow: 'hidden' }]}>
      <View style={v.sky} />
      <View style={v.moon} />
      <View style={v.brandWrap}>
        <Text style={v.brand}>KAZA</Text>
        <Text style={v.tagline}>Le soir tombe sur Lama. Tes logements t’attendent.</Text>
      </View>
      <View style={v.village} pointerEvents="none">
        {HOUSES.concat(HOUSES.slice(0, 6)).map((h, i) => <House key={i} {...h} />)}
      </View>
      <View style={v.ground} />
      <View style={v.cardWrap}>
        <View style={v.card}>
          <LoginForm {...p} tone={PAPER_TONE} title="Bonsoir" subtitle="Connecte-toi à ta conciergerie." />
        </View>
      </View>
    </View>
  );
}

export function WebLogin({ variant, ...p }: LoginFormProps & { variant: LoginVariant }) {
  if (variant === 'ticket') return <TicketLogin {...p} />;
  if (variant === 'village') return <VillageLogin {...p} />;
  return <KeyboxLogin {...p} />;
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: '100vh' as any },
  half: { flex: 1, padding: 48 },
});

const f = StyleSheet.create({
  label: { fontFamily: FONTS.readableBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 7, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, height: 44, fontFamily: FONTS.readable, fontSize: 15, outlineStyle: 'none' } as any,
  title: { fontSize: 34, lineHeight: 38 },
  sub: { fontFamily: FONTS.readable, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  small: { fontFamily: FONTS.readable, fontSize: 13 },
  link: { fontFamily: FONTS.readableBold, textDecorationLine: 'underline' },
  error: { fontFamily: FONTS.readableBold, fontSize: 13, color: C.rouge, backgroundColor: '#FBECEC', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 10 },
  info: { fontFamily: FONTS.readable, fontSize: 13, backgroundColor: '#EAF0F8', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 10 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 7, height: 48, marginTop: 4 },
  buttonText: { fontFamily: FONTS.readableBold, fontSize: 15, letterSpacing: 0.3 },
});

const k = StyleSheet.create({
  box: { alignItems: 'center' },
  shackle: { width: 120, height: 70, borderWidth: 14, borderBottomWidth: 0, borderColor: '#8D96A6', borderTopLeftRadius: 60, borderTopRightRadius: 60, marginBottom: -4 },
  body: { width: 300, height: 220, backgroundColor: '#2A3550', borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 22, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.08), 0 24px 50px rgba(0,0,0,0.35)' } as any,
  window: { flexDirection: 'row', gap: 10, backgroundColor: '#141C2E', padding: 10, borderRadius: 10 },
  wheel: { width: 44, height: 84, backgroundColor: '#E9E4DA', borderRadius: 6, alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 10px 12px rgba(0,0,0,0.25), inset 0 -10px 12px rgba(0,0,0,0.25)' } as any,
  digit: { fontFamily: FONTS.readableBold, fontSize: 28, color: C.nuit, lineHeight: 32 },
  ghost: { fontFamily: FONTS.readableBold, fontSize: 13, color: 'rgba(15,34,64,0.25)', lineHeight: 18 },
  lever: { width: 150, height: 14, borderRadius: 7, backgroundColor: C.or },
  brand: { fontFamily: FONTS.stubSerif, fontSize: 64, color: '#FFFFFF', letterSpacing: 6 },
  tagline: { fontFamily: FONTS.readable, fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  card: { width: 400, maxWidth: '100%', backgroundColor: C.papier, borderRadius: 10, borderWidth: 1, borderColor: C.trait, padding: 36, boxShadow: '0 18px 40px rgba(47,74,120,0.12)' } as any,
});

const t = StyleSheet.create({
  ticket: { flexDirection: 'row', width: 860, maxWidth: '100%', minHeight: 470, backgroundColor: C.papier, borderRadius: 12, borderWidth: 1, borderColor: C.trait, boxShadow: '0 2px 0 rgba(47,74,120,0.10), 0 30px 60px rgba(47,74,120,0.12)' } as any,
  stub: { width: 240, backgroundColor: C.carbone, borderTopLeftRadius: 11, borderBottomLeftRadius: 11, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 32 },
  logo: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#FFFFFF' },
  stubLabel: { fontFamily: FONTS.readable, fontSize: 12, color: '#C9D4E8', textTransform: 'uppercase', letterSpacing: 1.5 },
  day: { fontFamily: FONTS.stubSerif, fontSize: 120, lineHeight: 124, color: '#FFFFFF' },
  month: { fontFamily: FONTS.readableBold, fontSize: 16, color: '#FFFFFF', letterSpacing: 3 },
  year: { fontFamily: FONTS.readable, fontSize: 13, color: '#C9D4E8', marginTop: 4 },
  stubFoot: { fontFamily: FONTS.readable, fontSize: 11, color: '#9FB1D2', letterSpacing: 1.5 },
  perf: { width: 24, alignItems: 'center', position: 'relative' },
  dash: { flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: C.trait, marginVertical: 16 },
  notch: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: C.kraft, borderWidth: 1, borderColor: C.trait },
  body: { flex: 1, paddingVertical: 44, paddingHorizontal: 56, justifyContent: 'center', position: 'relative' },
  stamp: { position: 'absolute', top: 28, right: 32, borderWidth: 2, borderColor: C.carbone, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 10, transform: [{ rotate: '-8deg' }], opacity: 0.55 },
  stampText: { fontFamily: FONTS.readableBold, fontSize: 15, letterSpacing: 4, color: C.carbone },
});

const v = StyleSheet.create({
  sky: { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 30% 20%, #23406E 0%, #0F2240 55%, #0A1730 100%)' } as any,
  moon: { position: 'absolute', top: 70, left: '18%', width: 46, height: 46, borderRadius: 23, backgroundColor: '#F4EBD0', boxShadow: '0 0 40px rgba(244,235,208,0.45)' } as any,
  brandWrap: { position: 'absolute', top: 150, left: '8%', gap: 10, maxWidth: 460 },
  brand: { fontFamily: FONTS.stubSerif, fontSize: 92, color: '#FFFFFF', letterSpacing: 8, lineHeight: 96 },
  tagline: { fontFamily: FONTS.readable, fontSize: 18, color: 'rgba(255,255,255,0.72)' },
  village: { position: 'absolute', left: -20, right: -20, bottom: 40, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, backgroundColor: '#0A1730' },
  cardWrap: { position: 'absolute', top: 0, bottom: 0, right: '8%', justifyContent: 'center' },
  card: { width: 410, backgroundColor: C.papier, borderRadius: 12, padding: 36, boxShadow: '0 30px 70px rgba(0,0,0,0.45)' } as any,
});
