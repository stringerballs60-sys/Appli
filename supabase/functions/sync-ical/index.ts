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
  // Handles: 20260520 | 20260520T100000Z | 20260520T100000
  const digits = raw.replace(/\D/g, '');
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function parseICS(text: string): ICalEvent[] {
  // Unfold RFC 5545 line continuations
  const unfolded = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '');

  const events: ICalEvent[] = [];
  let inEvent = false;
  let cur: Partial<ICalEvent> = {};

  for (const line of unfolded.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      cur = { status: 'CONFIRMED', summary: '' };
    } else if (trimmed === 'END:VEVENT') {
      if (cur.uid && cur.dtstart && cur.dtend) events.push(cur as ICalEvent);
      inEvent = false;
    } else if (inEvent) {
      const colon = trimmed.indexOf(':');
      if (colon === -1) continue;
      const key = trimmed.slice(0, colon).split(';')[0].toUpperCase();
      const val = trimmed.slice(colon + 1);
      if (key === 'DTSTART') cur.dtstart = parseICSDate(val);
      else if (key === 'DTEND') cur.dtend = parseICSDate(val);
      else if (key === 'SUMMARY') cur.summary = val;
      else if (key === 'UID') cur.uid = val;
      else if (key === 'STATUS') cur.status = val.toUpperCase();
    }
  }
  return events;
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

    // Fetch properties with an iCal URL
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
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${prop.ical_url}`);

        const icsText = await res.text();
        const events = parseICS(icsText);
        const source = detectSource(prop.ical_url);
        const category = categoryForSource(source, prop.property_type);

        let upserted = 0;
        let cancelled = 0;
        let skipped = 0;

        for (const ev of events) {
          // Cancel events explicitly marked CANCELLED
          if (ev.status === 'CANCELLED') {
            await supabase
              .from('reservations')
              .update({ status: 'cancelled' })
              .eq('property_id', prop.id)
              .eq('ical_uid', ev.uid);
            cancelled++;
            continue;
          }

          // Skip "Available" or empty events some platforms export
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
            console.error('upsert error', upsertErr.message, ev.uid);
          } else {
            upserted++;
          }
        }

        results.push({
          property_id: prop.id,
          success: true,
          total: events.length,
          upserted,
          cancelled,
          skipped,
        });
      } catch (err: any) {
        results.push({ property_id: prop.id, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
