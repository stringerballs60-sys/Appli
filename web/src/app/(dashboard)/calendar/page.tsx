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
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Calendrier</h1>
        <p className="text-slate-500 text-sm mt-0.5">Vue des réservations par période</p>
      </div>
      <CalendarView
        reservations={(reservations ?? []) as Reservation[]}
        properties={(properties ?? []) as Pick<Property, 'id' | 'name' | 'color'>[]}
      />
    </div>
  )
}
