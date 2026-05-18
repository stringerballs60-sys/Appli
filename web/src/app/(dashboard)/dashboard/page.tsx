import { createClient } from '@/lib/supabase/server'
import { format, isToday, parseISO, startOfDay, endOfDay, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CalendarCheck,
  Home,
  Package,
  TrendingUp,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Reservation, Consumable, ReservationStatus } from '@/types'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const nextWeekStr = format(addDays(today, 7), 'yyyy-MM-dd')

  const [
    { data: checkInsToday },
    { data: checkOutsToday },
    { data: upcomingReservations },
    { data: lowConsumables },
    { data: properties },
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select('*, property:properties(id,name,color)')
      .eq('check_in', todayStr)
      .neq('status', ReservationStatus.CANCELLED)
      .order('check_in_time', { ascending: true }),
    supabase
      .from('reservations')
      .select('*, property:properties(id,name,color)')
      .eq('check_out', todayStr)
      .neq('status', ReservationStatus.CANCELLED),
    supabase
      .from('reservations')
      .select('*, property:properties(id,name,color)')
      .gt('check_in', todayStr)
      .lte('check_in', nextWeekStr)
      .neq('status', ReservationStatus.CANCELLED)
      .order('check_in', { ascending: true })
      .limit(10),
    supabase
      .from('consumables')
      .select('*, property:properties(id,name,color)')
      .lt('current_stock', supabase.from('consumables').select('min_threshold'))
      .limit(5),
    supabase.from('properties').select('id').eq('is_active', true),
  ])

  // Manual filter for low consumables since Supabase doesn't support column comparison in select
  const { data: allConsumables } = await supabase
    .from('consumables')
    .select('*, property:properties(id,name,color)')

  const lowStockItems = (allConsumables || []).filter(
    (c: Consumable) => c.current_stock <= c.min_threshold
  )

  const totalCheckIns = checkInsToday?.length ?? 0
  const totalCheckOuts = checkOutsToday?.length ?? 0
  const totalActiveProperties = properties?.length ?? 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">
            {format(today, 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <Link href="/reservations/new">
          <Button className="bg-kaza-blue hover:bg-blue-700">
            Nouvelle réservation
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Check-ins aujourd'hui"
          value={totalCheckIns}
          icon={<ArrowRight className="w-5 h-5 text-emerald-600" />}
          color="emerald"
          href="/reservations?filter=checkin"
        />
        <KpiCard
          title="Check-outs aujourd'hui"
          value={totalCheckOuts}
          icon={<ArrowLeft className="w-5 h-5 text-orange-500" />}
          color="orange"
          href="/reservations?filter=checkout"
        />
        <KpiCard
          title="Logements actifs"
          value={totalActiveProperties}
          icon={<Home className="w-5 h-5 text-blue-600" />}
          color="blue"
          href="/properties"
        />
        <KpiCard
          title="Alertes stock"
          value={lowStockItems.length}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          color={lowStockItems.length > 0 ? 'red' : 'gray'}
          href="/inventory/consumables"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Check-ins */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Check-ins du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!checkInsToday || checkInsToday.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">Aucun check-in aujourd'hui</p>
              ) : (
                <div className="space-y-2">
                  {checkInsToday.map((r: Reservation) => (
                    <ReservationRow key={r.id} reservation={r} type="checkin" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check-outs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                Check-outs du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!checkOutsToday || checkOutsToday.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">Aucun check-out aujourd'hui</p>
              ) : (
                <div className="space-y-2">
                  {checkOutsToday.map((r: Reservation) => (
                    <ReservationRow key={r.id} reservation={r} type="checkout" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-slate-500" />
                Prochaines arrivées (7 jours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!upcomingReservations || upcomingReservations.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">Aucune arrivée prévue</p>
              ) : (
                <div className="space-y-2">
                  {upcomingReservations.map((r: Reservation) => (
                    <ReservationRow key={r.id} reservation={r} type="upcoming" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Low stock alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Stocks bas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-emerald-600 font-medium py-2">✓ Tous les stocks sont OK</p>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.slice(0, 6).map((c: Consumable) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{c.item_name}</p>
                        {c.property && (
                          <p className="text-xs text-slate-400">{(c.property as { name: string }).name}</p>
                        )}
                      </div>
                      <Badge variant="danger">
                        {c.current_stock} {c.unit}
                      </Badge>
                    </div>
                  ))}
                  {lowStockItems.length > 6 && (
                    <Link
                      href="/inventory/consumables"
                      className="block text-xs text-kaza-blue hover:underline pt-1"
                    >
                      +{lowStockItems.length - 6} autres →
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/reservations/new" className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors group">
                <span className="text-sm text-slate-700">Nouvelle réservation</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </Link>
              <Link href="/properties/new" className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors group">
                <span className="text-sm text-slate-700">Ajouter un logement</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </Link>
              <Link href="/calendar" className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors group">
                <span className="text-sm text-slate-700">Voir le calendrier</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </Link>
              <Link href="/inventory/linen" className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors group">
                <span className="text-sm text-slate-700">Gérer le linge</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  icon,
  color,
  href,
}: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  href: string
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-100',
    orange: 'bg-orange-50 border-orange-100',
    blue: 'bg-blue-50 border-blue-100',
    red: 'bg-red-50 border-red-100',
    gray: 'bg-slate-50 border-slate-100',
  }

  return (
    <Link href={href}>
      <Card className={`border hover:shadow-md transition-shadow cursor-pointer ${colorMap[color] || colorMap.gray}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{title}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function ReservationRow({
  reservation,
  type,
}: {
  reservation: Reservation
  type: 'checkin' | 'checkout' | 'upcoming'
}) {
  const totalGuests =
    reservation.nb_couples * 2 +
    reservation.nb_solo_adults +
    reservation.nb_children +
    reservation.nb_babies

  const property = reservation.property as (typeof reservation.property & { name: string; color: string }) | undefined

  return (
    <Link
      href={`/reservations/${reservation.id}`}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        {property && (
          <div
            className="w-3 h-8 rounded-sm flex-shrink-0"
            style={{ backgroundColor: property.color }}
          />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{reservation.guest_name}</p>
          <p className="text-xs text-slate-400 truncate">
            {property?.name} · {reservation.nb_nights} nuit{reservation.nb_nights > 1 ? 's' : ''} · {totalGuests} pers.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {type === 'checkin' && reservation.check_in_time && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {reservation.check_in_time.slice(0, 5)}
          </span>
        )}
        {type === 'upcoming' && (
          <span className="text-xs font-medium text-blue-600">
            {formatDate(reservation.check_in, 'dd MMM')}
          </span>
        )}
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
      </div>
    </Link>
  )
}
