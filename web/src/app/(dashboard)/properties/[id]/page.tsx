import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Bed, Users, Bath, MapPin, FileText, Calendar } from 'lucide-react'
import { Property, PROPERTY_TYPE_LABELS, ReservationStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import { DeletePropertyButton } from './DeletePropertyButton'

export const revalidate = 0

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: property }, { data: reservations }] = await Promise.all([
    supabase.from('properties').select('*').eq('id', id).single(),
    supabase
      .from('reservations')
      .select('id,guest_name,check_in,check_out,nb_nights,status')
      .eq('property_id', id)
      .neq('status', ReservationStatus.CANCELLED)
      .order('check_in', { ascending: false })
      .limit(10),
  ])

  if (!property) notFound()

  const p = property as Property

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/properties">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <h1 className="text-2xl font-bold text-slate-900 truncate">{p.name}</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{PROPERTY_TYPE_LABELS[p.property_type]}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/properties/${id}/edit`}>
            <Button variant="outline" size="sm">Modifier</Button>
          </Link>
          <DeletePropertyButton id={id} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Infos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={p.is_active ? 'success' : 'secondary'}>
                {p.is_active ? 'Actif' : 'Inactif'}
              </Badge>
              <Badge variant={p.cleaning_status === 'ready' ? 'success' : 'warning'}>
                {p.cleaning_status === 'ready' ? '✓ Prêt' : '⚠ À nettoyer'}
              </Badge>
            </div>

            {p.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>{p.address}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-2">
              <StatBox icon={<Bed className="w-4 h-4" />} label="Doubles" value={p.nb_double_beds} />
              <StatBox icon={<Bed className="w-4 h-4" />} label="Simples" value={p.nb_single_beds} />
              <StatBox icon={<Bed className="w-4 h-4" />} label="Canapés" value={p.nb_sofa_beds} />
              <StatBox icon={<Users className="w-4 h-4" />} label="Max" value={p.max_guests} />
              <StatBox icon={<Bath className="w-4 h-4" />} label="Salles de bain" value={p.nb_bathrooms} />
              <StatBox icon={<Bed className="w-4 h-4" />} label="Berceaux" value={p.nb_baby_cribs} />
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Accès rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/inventory/linen?property=${id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-medium text-slate-700">Inventaire linge</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
            </Link>
            <Link href={`/inventory/equipment?property=${id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-medium text-slate-700">Équipements</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
            </Link>
            <Link href={`/inventory/consumables?property=${id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-medium text-slate-700">Consommables</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
            </Link>
            <Link href={`/reservations/new?property=${id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-medium text-slate-700">Nouvelle réservation</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {p.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{p.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Recent reservations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Réservations récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!reservations || reservations.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune réservation</p>
          ) : (
            <div className="space-y-2">
              {reservations.map((r) => (
                <Link
                  key={r.id}
                  href={`/reservations/${r.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">{r.guest_name}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(r.check_in, 'dd MMM')} → {formatDate(r.check_out, 'dd MMM yyyy')} · {r.nb_nights}n
                    </p>
                  </div>
                  <Badge variant={r.status === ReservationStatus.CONFIRMED ? 'success' : 'secondary'}>
                    {r.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
      <div className="flex justify-center text-slate-400 mb-1">{icon}</div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}
