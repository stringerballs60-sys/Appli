import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── ICS parser ──────────────────────────────────────────────────────────────

interface ICalEvent {
  uid: string;
  dtstart: string; // YYYY-MM-DD
  dtend: string;   // YYYY-MM-DD
  summary: string;
  status: string;
}

function parseICSDate(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function parseICS(text: string): {
  events: ICalEvent[];
  raw_vevent_count: number;
  raw_vfreebusy_count: number;
  parseLog: string[];
} {
  const unfolded = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '');

  const lines = unfolded.split('\n');
  const events: ICalEvent[] = [];
  const parseLog: string[] = [];

  // Count raw blocks
  const raw_vevent_count = lines.filter((l) => l.trim() === 'BEGIN:VEVENT').length;
  const raw_vfreebusy_count = lines.filter((l) => l.trim() === 'BEGIN:VFREEBUSY').length;

  parseLog.push(`ICS lines=${lines.length} VEVENT=${raw_vevent_count} VFREEBUSY=${raw_vfreebusy_count}`);

  // Parse VEVENT blocks
  let inEvent = false;
  let inFreebusy = false;
  let cur: Partial<ICalEvent> = {};
  let evIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      evIdx++;
      cur = { status: 'CONFIRMED', summary: '' };
    } else if (trimmed === 'END:VEVENT') {
      const accepted = !!(cur.uid && cur.dtstart && cur.dtend);
      parseLog.push(
        `VEVENT#${evIdx} uid=${cur.uid ?? 'MISSING'} dtstart=${cur.dtstart ?? 'MISSING'} dtend=${cur.dtend ?? 'MISSING'} summary="${cur.summary}" => ${accepted ? 'OK' : 'REJECTED'}`
      );
      if (accepted) events.push(cur as ICalEvent);
      inEvent = false;
    } else if (trimmed === 'BEGIN:VFREEBUSY') {
      inFreebusy = true;
      evIdx++;
      cur = { status: 'CONFIRMED', summary: 'Réservation' };
    } else if (trimmed === 'END:VFREEBUSY') {
      // FREEBUSY:20260801T000000Z/20260805T000000Z — synthesize an event per period
      const accepted = !!(cur.dtstart && cur.dtend);
      parseLog.push(
        `VFREEBUSY#${evIdx} dtstart=${cur.dtstart ?? 'MISSING'} dtend=${cur.dtend ?? 'MISSING'} => ${accepted ? 'OK' : 'REJECTED'}`
      );
      if (accepted) {
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
        // FREEBUSY:20260801T000000Z/20260805T000000Z
        const slash = val.indexOf('/');
        if (slash !== -1) {
          cur.dtstart = parseICSDate(val.slice(0, slash));
          cur.dtend = parseICSDate(val.slice(slash + 1));
        }
      }
    }
  }

  return { events, raw_vevent_count, raw_vfreebusy_count, parseLog };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectSource(url: string): string {
  if (url.includes('airbnb')) return 'airbnb';
  if (url.includes('booking.com')) return 'booking';
  if (url.includes('abritel') || url.includes('vrbo') || url.includes('homeaway')) return 'abritel';
  return 'manual';
}

function guestNameFromSummary(summary: string, source: string): string {
  const lower = summary.toLowerCase();
  if (!summary || lower === 'reserved' || lower === 'blocked' || lower === 'not available' || lower === 'unavailable') {
    const label = source.charAt(0).toUpperCase() + source.slice(1);
    return `Réservation ${label}`;
  }
  return summary;
}

function categoryForSource(source: string, propertyType: string): string {
  if (source === 'airbnb') {
    if (propertyType === 'SCI') return 'AIRBNB_SCI';
    if (propertyType === 'COHOST_AIRBNB') return 'AIRBNB_COHOST';
    if (propertyType === 'HOST_AIRBNB') return 'AIRBNB_HOST_ACCOUNT';
    return 'AIRBNB_SCI';
  }
  return 'DIRECT_OWN';
}

// ── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const { property_id } = body as { property_id?: string };

    let q = supabase
      .from('properties')
      .select('id, user_id, ical_url, property_type')
      .not('ical_url', 'is', null)
      .neq('ical_url', '');
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
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${prop.ical_url}`);

        const icsText = await res.text();
        console.log(`[sync-ical] prop=${prop.id} ics_length=${icsText.length} first100="${icsText.slice(0, 100).replace(/\n/g, '|')}"`);

        const { events, raw_vevent_count, raw_vfreebusy_count, parseLog } = parseICS(icsText);
        console.log(`[sync-ical] parsed=${events.length} log=${JSON.stringify(parseLog)}`);

        const source = detectSource(prop.ical_url);
        const category = categoryForSource(source, prop.property_type);

        let upserted = 0;
        let cancelled = 0;
        let skipped = 0;
        const upsertErrors: string[] = [];

        for (const ev of events) {
          if (ev.status === 'CANCELLED') {
            await supabase
              .from('reservations')
              .update({ status: 'cancelled' })
              .eq('property_id', prop.id)
              .eq('ical_uid', ev.uid);
            cancelled++;
            continue;
          }

          const sl = ev.summary.toLowerCase();
          if (sl === 'available' || sl === 'open' || sl === 'libre') {
            skipped++;
            continue;
          }

          const guestName = guestNameFromSummary(ev.summary, source);

          const { error: upsertErr } = await supabase
            .from('reservations')
            .upsert(
              {
                user_id: prop.user_id,
                property_id: prop.id,
                ical_uid: ev.uid,
                source,
                category,
                check_in: ev.dtstart,
                check_out: ev.dtend,
                guest_name: guestName,
                status: 'confirmed',
                nb_couples: 1,
                nb_solo_adults: 0,
                nb_children: 0,
                nb_babies: 0,
                beds_double_used: 0,
                beds_single_used: 0,
                beds_sofa_used: 0,
                beds_crib_used: 0,
              },
              { onConflict: 'property_id,ical_uid' },
            );

          if (upsertErr) {
            console.error(`[sync-ical] upsert error uid=${ev.uid}: ${upsertErr.message} code=${upsertErr.code}`);
            upsertErrors.push(`uid=${ev.uid}: ${upsertErr.message} (code=${upsertErr.code})`);
          } else {
            upserted++;
          }
        }

        const result: Record<string, unknown> = {
          property_id: prop.id,
          success: true,
          ics_length: icsText.length,
          raw_vevent_count,
          raw_vfreebusy_count,
          total: events.length,
          upserted,
          cancelled,
          skipped,
          parse_log: parseLog,
        };

        if (upsertErrors.length > 0) result.upsert_errors = upsertErrors;

        results.push(result);
      } catch (err: any) {
        console.error(`[sync-ical] fetch error prop=${prop.id}: ${err.message}`);
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
