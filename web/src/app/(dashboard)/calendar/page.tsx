import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/calendar/CalendarView'
import { Reservation, Property } from '@/types'

export const revalidate = 0

export default async function CalendarPage() {
  const supabase = await createClient()

  const [{ data: reservations }, { data: properties }] = await Promise.all([
    supabase
      .from('reservations')
      .select('*, property:properties(id,name,color)')
      .neq('status', 'cancelled')
      .order('check_in', { ascending: true }),
    supabase
      .from('properties')
      .select('id,name,color')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <div>
      {/* Navy header */}
      <div className="px-5 py-4" style={{ backgroundColor: '#1A365D' }}>
        <h1
          className="text-white text-xl"
          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '1px' }}
        >
          Calendrier
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
          Vue des réservations par période
        </p>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <CalendarView
          reservations={(reservations ?? []) as Reservation[]}
          properties={(properties ?? []) as Pick<Property, 'id' | 'name' | 'color'>[]}
        />
      </div>
    </div>
  )
}
