import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Users, Bed, Calendar, Phone, Mail, FileText, Shirt } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  Reservation,
  ReservationStatus,
  RESERVATION_STATUS_LABELS,
  RESERVATION_CATEGORY_LABELS,
  LINEN_TYPE_LABELS,
} from '@/types'
import { DeleteReservationButton } from './DeleteReservationButton'

export const revalidate = 0

const statusVariant: Record<ReservationStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  [ReservationStatus.CONFIRMED]: 'success',
  [ReservationStatus.PENDING]: 'warning',
  [ReservationStatus.CANCELLED]: 'danger',
  [ReservationStatus.COMPLETED]: 'info',
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('*, property:properties(*)')
    .eq('id', id)
    .single()

  if (!reservation) notFound()

  const r = reservation as Reservation
  const property = r.property as { id: string; name: string; color: string; address: string | null } | undefined
  const totalGuests =
    r.nb_couples * 2 + r.nb_solo_adults + r.nb_children + r.nb_babies

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reservations">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{r.guest_name}</h1>
            <Badge variant={statusVariant[r.status]}>
              {RESERVATION_STATUS_LABELS[r.status]}
            </Badge>
          </div>
          {property && (
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: property.color }}
              />
              <span className="text-sm text-slate-500">{property.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/reservations/${id}/edit`}>
            <Button variant="outline" size="sm">Modifier</Button>
          </Link>
          <DeleteReservationButton id={id} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Dates du séjour
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Check-in</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {formatDate(r.check_in, 'dd')}
                </p>
                <p className="text-sm text-emerald-600">{formatDate(r.check_in, 'MMM yyyy')}</p>
                {r.check_in_time && (
                  <p className="text-xs text-emerald-500 mt-1">à {r.check_in_time.slice(0, 5)}</p>
                )}
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xs text-orange-500 font-medium uppercase tracking-wide">Check-out</p>
                <p className="text-xl font-bold text-orange-600 mt-1">
                  {formatDate(r.check_out, 'dd')}
                </p>
                <p className="text-sm text-orange-500">{formatDate(r.check_out, 'MMM yyyy')}</p>
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm text-slate-500">
                {r.nb_nights} nuit{r.nb_nights > 1 ? 's' : ''}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Catégorie</p>
              <p className="text-sm font-medium text-slate-700">{RESERVATION_CATEGORY_LABELS[r.category]}</p>
            </div>
          </CardContent>
        </Card>

        {/* Guests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Voyageurs ({totalGuests} personnes)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <GuestStat label="Couples" value={r.nb_couples} />
              <GuestStat label="Adultes seuls" value={r.nb_solo_adults} />
              <GuestStat label="Enfants" value={r.nb_children} />
              <GuestStat label="Bébés" value={r.nb_babies} />
            </div>

            {(r.guest_email || r.guest_phone) && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                {r.guest_email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`mailto:${r.guest_email}`} className="hover:text-kaza-blue truncate">
                      {r.guest_email}
                    </a>
                  </div>
                )}
                {r.guest_phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`tel:${r.guest_phone}`} className="hover:text-kaza-blue">
                      {r.guest_phone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Beds */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bed className="w-4 h-4 text-slate-400" />
              Couchages utilisés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <GuestStat label="Lits doubles" value={r.beds_double_used} />
              <GuestStat label="Lits simples" value={r.beds_single_used} />
              <GuestStat label="Canapés-lits" value={r.beds_sofa_used} />
              <GuestStat label="Berceaux" value={r.beds_crib_used} />
            </div>
          </CardContent>
        </Card>

        {/* Linen */}
        {r.linen_calculation && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shirt className="w-4 h-4 text-slate-400" />
                Linge calculé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(r.linen_calculation).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-600">
                      {LINEN_TYPE_LABELS[key as keyof typeof LINEN_TYPE_LABELS] ?? key}
                    </span>
                    <span className="font-semibold text-slate-800 tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes */}
      {r.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{r.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function GuestStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  )
}
