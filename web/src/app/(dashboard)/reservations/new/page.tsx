import { createClient } from '@/lib/supabase/server'
import { ReservationForm } from '@/components/reservation/ReservationForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewReservationPage() {
  const supabase = await createClient()
  const { data: properties } = await supabase
    .from('properties')
    .select('id,name,color,nb_double_beds,nb_single_beds,nb_sofa_beds,nb_baby_cribs,nb_bathrooms,max_guests')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/reservations">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle réservation</h1>
      </div>
      <ReservationForm properties={properties ?? []} />
    </div>
  )
}
