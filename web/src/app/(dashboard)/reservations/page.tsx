import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Reservation, ReservationStatus, RESERVATION_STATUS_LABELS, RESERVATION_CATEGORY_LABELS } from '@/types'

export const revalidate = 0

const statusVariant: Record<ReservationStatus, 'confirmed' | 'pending' | 'cancelled' | 'completed'> = {
  [ReservationStatus.CONFIRMED]: 'confirmed',
  [ReservationStatus.PENDING]: 'pending',
  [ReservationStatus.CANCELLED]: 'cancelled',
  [ReservationStatus.COMPLETED]: 'completed',
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; property?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('reservations')
    .select('*, property:properties(id,name,color)')
    .order('check_in', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.property) {
    query = query.eq('property_id', params.property)
  }

  const { data: reservations } = await query
  const { data: properties } = await supabase
    .from('properties')
    .select('id,name,color')
    .eq('is_active', true)
    .order('name')

  const statuses = Object.values(ReservationStatus)

  return (
    <div>
      {/* Navy header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: '#1A365D' }}>
        <div>
          <h1
            className="text-white text-xl"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '1px' }}
          >
            Réservations
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
            {reservations?.length ?? 0} réservation{(reservations?.length ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/reservations/new">
          <Button
            className="gap-2 text-white border-white/30 hover:bg-white/30 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.30)' }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle
          </Button>
        </Link>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          <FilterLink href="/reservations" active={!params.status} label="Toutes" />
          {statuses.map((s) => (
            <FilterLink
              key={s}
              href={`/reservations?status=${s}`}
              active={params.status === s}
              label={RESERVATION_STATUS_LABELS[s]}
            />
          ))}
        </div>

        {/* Property filter */}
        {properties && properties.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-400 self-center">Logement :</span>
            <FilterLink href="/reservations" active={!params.property} label="Tous" small />
            {properties.map((p) => (
              <FilterLink
                key={p.id}
                href={`/reservations?property=${p.id}${params.status ? `&status=${params.status}` : ''}`}
                active={params.property === p.id}
                label={p.name}
                color={p.color}
                small
              />
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 4px rgba(15,23,42,0.06)' }}>
          {!reservations || reservations.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-medium">Aucune réservation</p>
              <p className="text-sm mt-1">Créez votre première réservation</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">Voyageur</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">Logement</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">Dates</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide hidden md:table-cell">Nuits</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide hidden lg:table-cell">Catégorie</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">Statut</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reservations.map((r: Reservation) => {
                  const property = r.property as { id: string; name: string; color: string } | undefined
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3" style={{ paddingLeft: 0, paddingRight: '16px' }}>
                        <div className="flex items-stretch">
                          {property && (
                            <div
                              className="w-1 mr-3 rounded-sm self-stretch flex-shrink-0"
                              style={{ backgroundColor: property.color, minHeight: '32px' }}
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-800">{r.guest_name}</p>
                            {r.guest_email && (
                              <p className="text-xs text-slate-400 truncate max-w-[160px]">{r.guest_email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {property && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: property.color }}
                            />
                            <span className="text-sm text-slate-700">{property.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">
                          {formatDate(r.check_in, 'dd MMM')} → {formatDate(r.check_out, 'dd MMM yyyy')}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-slate-600">{r.nb_nights}n</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-500">{RESERVATION_CATEGORY_LABELS[r.category]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[r.status]}>
                          {RESERVATION_STATUS_LABELS[r.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/reservations/${r.id}`}>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterLink({
  href,
  active,
  label,
  color,
  small,
}: {
  href: string
  active: boolean
  label: string
  color?: string
  small?: boolean
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium border transition-colors ${
        small ? 'px-2.5 py-1' : 'px-3 py-1.5'
      }`}
      style={
        active
          ? { backgroundColor: '#1A365D', color: '#FFFFFF', borderColor: '#1A365D' }
          : { backgroundColor: '#FFFFFF', color: '#4B5563', borderColor: '#E2E8F0' }
      }
    >
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </Link>
  )
}
