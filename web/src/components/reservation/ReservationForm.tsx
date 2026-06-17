'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Calculator } from 'lucide-react'
import {
  ReservationCategory,
  ReservationStatus,
  RESERVATION_CATEGORY_LABELS,
  RESERVATION_STATUS_LABELS,
  LinenCalculation,
} from '@/types'
import { differenceInDays, parseISO } from 'date-fns'

interface PropertyOption {
  id: string
  name: string
  color: string
  nb_double_beds: number
  nb_single_beds: number
  nb_sofa_beds: number
  nb_baby_cribs: number
  nb_bathrooms: number
  max_guests: number
}

function calculateLinen(
  nbCouples: number,
  nbSoloAdults: number,
  nbChildren: number,
  nbBabies: number,
  bedsDoubleUsed: number,
  bedsSingleUsed: number,
  bedsSofaUsed: number,
  bedsCribUsed: number,
  nbBathrooms: number
): LinenCalculation {
  return {
    double_sheets: bedsDoubleUsed,
    single_sheets: bedsSingleUsed + bedsSofaUsed,
    baby_sheets: bedsCribUsed,
    bath_towels: nbCouples * 2 + nbSoloAdults + nbChildren,
    hand_towels: nbCouples * 2 + nbSoloAdults + nbChildren,
    bath_mats: nbBathrooms,
    kitchen_towels: 1,
  }
}

export function ReservationForm({
  properties,
  defaultValues,
  reservationId,
}: {
  properties: PropertyOption[]
  defaultValues?: Partial<Record<string, unknown>>
  reservationId?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    property_id: (defaultValues?.property_id as string) ?? '',
    category: (defaultValues?.category as ReservationCategory) ?? ReservationCategory.AIRBNB_SCI,
    status: (defaultValues?.status as ReservationStatus) ?? ReservationStatus.CONFIRMED,
    guest_name: (defaultValues?.guest_name as string) ?? '',
    guest_email: (defaultValues?.guest_email as string) ?? '',
    guest_phone: (defaultValues?.guest_phone as string) ?? '',
    check_in: (defaultValues?.check_in as string) ?? '',
    check_out: (defaultValues?.check_out as string) ?? '',
    check_in_time: (defaultValues?.check_in_time as string) ?? '',
    nb_couples: (defaultValues?.nb_couples as number) ?? 0,
    nb_solo_adults: (defaultValues?.nb_solo_adults as number) ?? 0,
    nb_children: (defaultValues?.nb_children as number) ?? 0,
    nb_babies: (defaultValues?.nb_babies as number) ?? 0,
    beds_double_used: (defaultValues?.beds_double_used as number) ?? 0,
    beds_single_used: (defaultValues?.beds_single_used as number) ?? 0,
    beds_sofa_used: (defaultValues?.beds_sofa_used as number) ?? 0,
    beds_crib_used: (defaultValues?.beds_crib_used as number) ?? 0,
    notes: (defaultValues?.notes as string) ?? '',
  })

  const selectedProperty = properties.find((p) => p.id === form.property_id)

  const nbNights =
    form.check_in && form.check_out
      ? Math.max(0, differenceInDays(parseISO(form.check_out), parseISO(form.check_in)))
      : 0

  const linenCalc =
    selectedProperty
      ? calculateLinen(
          form.nb_couples,
          form.nb_solo_adults,
          form.nb_children,
          form.nb_babies,
          form.beds_double_used,
          form.beds_single_used,
          form.beds_sofa_used,
          form.beds_crib_used,
          selectedProperty.nb_bathrooms
        )
      : null

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setNum(key: string, value: string) {
    set(key, Math.max(0, parseInt(value) || 0))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.property_id) { setError('Sélectionnez un logement'); return }
    if (!form.check_in || !form.check_out) { setError('Sélectionnez les dates'); return }
    if (nbNights <= 0) { setError('La date de départ doit être après la date d\'arrivée'); return }

    setLoading(true)
    setError(null)

    const payload = {
      ...form,
      nb_nights: nbNights,
      linen_calculation: linenCalc,
      check_in_time: form.check_in_time || null,
      check_in_time_confirmed: false,
      guest_email: form.guest_email || null,
      guest_phone: form.guest_phone || null,
      notes: form.notes || null,
    }

    let err
    if (reservationId) {
      const res = await supabase.from('reservations').update(payload).eq('id', reservationId)
      err = res.error
    } else {
      const res = await supabase.from('reservations').insert(payload)
      err = res.error
    }

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push('/reservations')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Logement & catégorie */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Logement *</Label>
              <Select value={form.property_id} onValueChange={(v) => set('property_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un logement" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v as ReservationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ReservationStatus).map((s) => (
                    <SelectItem key={s} value={s}>{RESERVATION_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v as ReservationCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ReservationCategory).map((c) => (
                    <SelectItem key={c} value={c}>{RESERVATION_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voyageur */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Voyageur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.guest_name} onChange={(e) => set('guest_name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.guest_email} onChange={(e) => set('guest_email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input type="tel" value={form.guest_phone} onChange={(e) => set('guest_phone', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Dates
            {nbNights > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({nbNights} nuit{nbNights > 1 ? 's' : ''})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Check-in *</Label>
              <Input type="date" value={form.check_in} onChange={(e) => set('check_in', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out *</Label>
              <Input type="date" value={form.check_out} onChange={(e) => set('check_out', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Heure d'arrivée</Label>
              <Input type="time" value={form.check_in_time} onChange={(e) => set('check_in_time', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voyageurs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Composition du groupe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'nb_couples', label: 'Couples' },
              { key: 'nb_solo_adults', label: 'Adultes seuls' },
              { key: 'nb_children', label: 'Enfants' },
              { key: 'nb_babies', label: 'Bébés' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setNum(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Couchages */}
      {selectedProperty && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Couchages utilisés
              <span className="ml-2 text-sm font-normal text-slate-400">
                (dispo : {selectedProperty.nb_double_beds}D / {selectedProperty.nb_single_beds}S / {selectedProperty.nb_sofa_beds}C / {selectedProperty.nb_baby_cribs}B)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { key: 'beds_double_used', label: 'Doubles', max: selectedProperty.nb_double_beds },
                { key: 'beds_single_used', label: 'Simples', max: selectedProperty.nb_single_beds },
                { key: 'beds_sofa_used', label: 'Canapés-lits', max: selectedProperty.nb_sofa_beds },
                { key: 'beds_crib_used', label: 'Berceaux', max: selectedProperty.nb_baby_cribs },
              ].map(({ key, label, max }) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={max}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setNum(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linge preview */}
      {linenCalc && (
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Linge calculé automatiquement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(linenCalc).map(([key, value]) => (
                <div key={key} className="bg-white rounded-lg px-3 py-2 text-center shadow-sm">
                  <p className="text-2xl font-bold text-blue-700">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                    {key.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder="Informations supplémentaires…"
          />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading} className="bg-kaza-blue hover:bg-blue-700 min-w-[120px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : reservationId ? 'Enregistrer' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}
