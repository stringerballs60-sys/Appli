import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ICalEvent {
  uid: string;
  dtstart: string;
  dtend: string;
  summary: string;
  status: string;
}

function parseICSDate(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function parseICS(text: string): { events: ICalEvent[]; raw_vevent_count: number; raw_vfreebusy_count: number; parseLog: string[] } {
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
  const lines = unfolded.split('\n');
  const events: ICalEvent[] = [];
  const parseLog: string[] = [];
  const raw_vevent_count = lines.filter((l) => l.trim() === 'BEGIN:VEVENT').length;
  const raw_vfreebusy_count = lines.filter((l) => l.trim() === 'BEGIN:VFREEBUSY').length;
  parseLog.push(`ICS lines=${lines.length} VEVENT=${raw_vevent_count} VFREEBUSY=${raw_vfreebusy_count}`);
  let inEvent = false, inFreebusy = false;
  let cur: Partial<ICalEvent> = {};
  let evIdx = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true; evIdx++; cur = { status: 'CONFIRMED', summary: '' };
    } else if (trimmed === 'END:VEVENT') {
      const accepted = !!(cur.uid && cur.dtstart && cur.dtend);
      parseLog.push(`VEVENT#${evIdx} ${cur.dtstart}→${cur.dtend} summary="${cur.summary}" => ${accepted ? 'OK' : 'REJECTED'}`);
      if (accepted) events.push(cur as ICalEvent);
      inEvent = false;
    } else if (trimmed === 'BEGIN:VFREEBUSY') {
      inFreebusy = true; evIdx++; cur = { status: 'CONFIRMED', summary: 'Réservation' };
    } else if (trimmed === 'END:VFREEBUSY') {
      if (cur.dtstart && cur.dtend) {
        cur.uid = cur.uid ?? `freebusy-${cur.dtstart}-${cur.dtend}`;
        events.push(cur as ICalEvent);
      }
      inFreebusy = false;
    } else if (inEvent || inFreebusy) {
      const colon = trimmed.indexOf(':');
      if (colon === -1) continue;
      const key = trimmed.slice(0, colon).split(';')[0].toUpperCase();
      const val = trimmed.slice(colon + 1);
      if (key === 'DTSTART') cur.dtstart = parseICSDate(val);
      else if (key === 'DTEND') cur.dtend = parseICSDate(val);
      else if (key === 'SUMMARY') cur.summary = val;
      else if (key === 'UID') cur.uid = val;
      else if (key === 'STATUS') cur.status = val.toUpperCase();
      else if (key === 'FREEBUSY' && inFreebusy) {
        const slash = val.indexOf('/');
        if (slash !== -1) { cur.dtstart = parseICSDate(val.slice(0, slash)); cur.dtend = parseICSDate(val.slice(slash + 1)); }
      }
    }
  }
  return { events, raw_vevent_count, raw_vfreebusy_count, parseLog };
}

const CLOSURE_THRESHOLD_DAYS = 60;

function classifyEvent(
  ev: ICalEvent,
  source: string,
  propertyType: string,
): { guestName: string; category: string; eventSource: string } | null {
  const sl = ev.summary.toLowerCase().trim();
  if (sl === 'available' || sl === 'open' || sl === 'libre') return null;
  const isBlock = sl === 'not available' || sl === 'airbnb (not available)' || sl === 'unavailable' || sl === 'blocked';
  if (isBlock) {
    if (daysBetween(ev.dtstart, ev.dtend) >= CLOSURE_THRESHOLD_DAYS) return null;
    return { guestName: 'Résa direct ou blocage', category: 'DIRECT_OWN', eventSource: 'manual' };
  }
  let category: string;
  if (source === 'airbnb') {
    if (propertyType === 'SCI') category = 'AIRBNB_SCI';
    else if (propertyType === 'COHOST_AIRBNB') category = 'AIRBNB_COHOST';
    else if (propertyType === 'HOST_AIRBNB') category = 'AIRBNB_HOST_ACCOUNT';
    else category = 'AIRBNB_SCI';
  } else {
    category = 'DIRECT_OWN';
  }
  const guestName = sl === 'reserved' ? 'À renseigner' : ev.summary;
  return { guestName, category, eventSource: source };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const { property_id } = body as { property_id?: string };

    let q = supabase.from('properties').select('id, user_id, ical_url, property_type').not('ical_url', 'is', null).neq('ical_url', '');
    if (property_id) q = q.eq('id', property_id);
    const { data: properties, error: propErr } = await q;
    if (propErr) throw propErr;

    const results = [];

    for (const prop of properties ?? []) {
      try {
        const res = await fetch(prop.ical_url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Kaza/1.0)' },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const icsText = await res.text();
        const { events, raw_vevent_count, raw_vfreebusy_count, parseLog } = parseICS(icsText);
        const source = prop.ical_url.includes('airbnb') ? 'airbnb'
          : prop.ical_url.includes('booking.com') ? 'booking'
          : prop.ical_url.includes('abritel') || prop.ical_url.includes('vrbo') ? 'abritel'
          : 'manual';

        let inserted = 0, updated = 0, cancelled = 0, skipped = 0;
        const upsertErrors: string[] = [];

        for (const ev of events) {
          if (ev.status === 'CANCELLED') {
            await supabase.from('reservations').update({ status: 'cancelled' }).eq('property_id', prop.id).eq('ical_uid', ev.uid);
            cancelled++;
            continue;
          }

          const decision = classifyEvent(ev, source, prop.property_type);
          if (!decision) { skipped++; continue; }

          // Check if this ical_uid already exists
          const { data: existing } = await supabase
            .from('reservations')
            .select('id, guest_name')
            .eq('property_id', prop.id)
            .eq('ical_uid', ev.uid)
            .maybeSingle();

          if (existing) {
            // Already exists — only update dates and status, preserve guest_name and user edits
            const { error: updateErr } = await supabase
              .from('reservations')
              .update({ check_in: ev.dtstart, check_out: ev.dtend, status: 'confirmed' })
              .eq('id', existing.id);
            if (updateErr) {
              upsertErrors.push(`uid=${ev.uid}: ${updateErr.message}`);
            } else {
              updated++;
            }
          } else {
            // New reservation — insert with default guest name
            const { error: insertErr } = await supabase
              .from('reservations')
              .insert({
                user_id: prop.user_id,
                property_id: prop.id,
                ical_uid: ev.uid,
                source: decision.eventSource,
                category: decision.category,
                check_in: ev.dtstart,
                check_out: ev.dtend,
                guest_name: decision.guestName,
                status: 'confirmed',
                check_in_time: '16:00',
                check_in_time_confirmed: false,
                nb_couples: 1,
                nb_solo_adults: 0,
                nb_children: 0,
                nb_babies: 0,
                beds_double_used: 0,
                beds_single_used: 0,
                beds_sofa_used: 0,
                beds_crib_used: 0,
              });
            if (insertErr) {
              upsertErrors.push(`uid=${ev.uid}: ${insertErr.message}`);
            } else {
              inserted++;
            }
          }
        }

        const result: Record<string, unknown> = {
          property_id: prop.id,
          success: true,
          ics_length: icsText.length,
          raw_vevent_count,
          raw_vfreebusy_count,
          total: events.length,
          inserted,
          updated,
          cancelled,
          skipped,
          parse_log: parseLog,
        };
        if (upsertErrors.length > 0) result.upsert_errors = upsertErrors;
        results.push(result);
      } catch (err: any) {
        console.error(`[sync-ical] error prop=${prop.id}: ${err.message}`);
        results.push({ property_id: prop.id, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }, null, 2), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
