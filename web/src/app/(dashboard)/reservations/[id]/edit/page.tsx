import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ReservationForm } from '@/components/reservation/ReservationForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: reservation }, { data: properties }] = await Promise.all([
    supabase.from('reservations').select('*').eq('id', id).single(),
    supabase
      .from('properties')
      .select('id,name,color,nb_double_beds,nb_single_beds,nb_sofa_beds,nb_baby_cribs,nb_bathrooms,max_guests')
      .eq('is_active', true)
      .order('name'),
  ])

  if (!reservation) notFound()

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/reservations/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Modifier — {reservation.guest_name}
        </h1>
      </div>
      <ReservationForm
        properties={properties ?? []}
        defaultValues={reservation}
        reservationId={id}
      />
    </div>
  )
}
