'use client'

import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  parseISO,
  isWithinInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Reservation, Property } from '@/types'
import Link from 'next/link'

interface CalendarViewProps {
  reservations: Reservation[]
  properties: Pick<Property, 'id' | 'name' | 'color'>[]
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export function CalendarView({ reservations, properties }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)

  const filteredReservations = useMemo(() => {
    if (!selectedProperty) return reservations
    return reservations.filter((r) => r.property_id === selectedProperty)
  }, [reservations, selectedProperty])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getReservationsForDay(date: Date) {
    return filteredReservations.filter((r) => {
      const checkIn = parseISO(r.check_in)
      const checkOut = parseISO(r.check_out)
      return (
        isSameDay(date, checkIn) ||
        isSameDay(date, checkOut) ||
        isWithinInterval(date, { start: checkIn, end: checkOut })
      )
    })
  }

  function getDayType(date: Date, reservation: Reservation) {
    const checkIn = parseISO(reservation.check_in)
    const checkOut = parseISO(reservation.check_out)
    if (isSameDay(date, checkIn)) return 'checkin'
    if (isSameDay(date, checkOut)) return 'checkout'
    return 'stay'
  }

  const propertyMap = Object.fromEntries(properties.map((p) => [p.id, p]))

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-slate-800 w-44 text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Aujourd'hui
          </Button>
        </div>

        {/* Property filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedProperty(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !selectedProperty
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Tous
          </button>
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProperty(selectedProperty === p.id ? null : p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                selectedProperty === p.id
                  ? 'text-white border-transparent'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              style={selectedProperty === p.id ? { backgroundColor: p.color, borderColor: p.color } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAYS_FR.map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayReservations = getReservationsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={idx}
                className={`min-h-[110px] p-1.5 border-b border-r border-slate-50 ${
                  !isCurrentMonth ? 'bg-slate-50/50' : ''
                }`}
              >
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 font-medium ${
                  isToday
                    ? 'bg-kaza-blue text-white'
                    : isCurrentMonth
                    ? 'text-slate-700'
                    : 'text-slate-300'
                }`}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-0.5">
                  {dayReservations.slice(0, 3).map((r) => {
                    const type = getDayType(day, r)
                    const prop = propertyMap[r.property_id]
                    return (
                      <Link
                        key={r.id}
                        href={`/reservations/${r.id}`}
                        className={`block text-[10px] font-medium px-1.5 py-0.5 rounded truncate text-white transition-opacity hover:opacity-80 ${
                          type === 'checkin' ? 'rounded-l-full' :
                          type === 'checkout' ? 'rounded-r-full' : ''
                        }`}
                        style={{ backgroundColor: prop?.color ?? '#6B7280' }}
                        title={`${r.guest_name} · ${type === 'checkin' ? '→' : type === 'checkout' ? '←' : '•'}`}
                      >
                        {type === 'checkin' && '→ '}
                        {type === 'checkout' && '← '}
                        {r.guest_name.split(' ')[0]}
                      </Link>
                    )
                  })}
                  {dayReservations.length > 3 && (
                    <p className="text-[10px] text-slate-400 px-1">+{dayReservations.length - 3}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="font-mono">→</span> Check-in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono">←</span> Check-out
        </span>
      </div>
    </div>
  )
}
