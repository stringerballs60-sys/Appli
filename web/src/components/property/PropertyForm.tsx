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
import { Loader2 } from 'lucide-react'
import { Property, PropertyType, PROPERTY_TYPE_LABELS } from '@/types'

const PRESET_COLORS = [
  '#1a56db', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#84CC16', '#6B7280',
]

export function PropertyForm({
  defaultValues,
  propertyId,
}: {
  defaultValues?: Partial<Property>
  propertyId?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: defaultValues?.name ?? '',
    address: defaultValues?.address ?? '',
    notes: defaultValues?.notes ?? '',
    property_type: defaultValues?.property_type ?? PropertyType.HOST_AIRBNB,
    nb_double_beds: defaultValues?.nb_double_beds ?? 0,
    nb_single_beds: defaultValues?.nb_single_beds ?? 0,
    nb_sofa_beds: defaultValues?.nb_sofa_beds ?? 0,
    nb_baby_cribs: defaultValues?.nb_baby_cribs ?? 0,
    max_guests: defaultValues?.max_guests ?? 2,
    nb_bathrooms: defaultValues?.nb_bathrooms ?? 1,
    is_active: defaultValues?.is_active ?? true,
    color: defaultValues?.color ?? '#1a56db',
    cleaning_status: defaultValues?.cleaning_status ?? 'ready' as const,
  })

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setNum(key: string, value: string) {
    set(key, Math.max(0, parseInt(value) || 0))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est requis'); return }

    setLoading(true)
    setError(null)

    const payload = {
      ...form,
      address: form.address || null,
      notes: form.notes || null,
    }

    let err
    if (propertyId) {
      const res = await supabase.from('properties').update(payload).eq('id', propertyId)
      err = res.error
    } else {
      const res = await supabase.from('properties').insert(payload)
      err = res.error
    }

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push('/properties')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Infos générales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Studio Centre-ville"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.property_type} onValueChange={(v) => set('property_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PropertyType).map((t) => (
                    <SelectItem key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adresse</Label>
            <Input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="12 rue de la Paix, 75001 Paris"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Couleur</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capacité */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Capacité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: 'nb_double_beds', label: 'Lits doubles' },
              { key: 'nb_single_beds', label: 'Lits simples' },
              { key: 'nb_sofa_beds', label: 'Canapés-lits' },
              { key: 'nb_baby_cribs', label: 'Berceaux' },
              { key: 'nb_bathrooms', label: 'Salles de bain' },
              { key: 'max_guests', label: 'Capacité max' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form[key as keyof typeof form] as number}
                  onChange={(e) => setNum(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes & statut */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Statut & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.is_active ? 'active' : 'inactive'} onValueChange={(v) => set('is_active', v === 'active')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>État ménage</Label>
              <Select value={form.cleaning_status} onValueChange={(v) => set('cleaning_status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ready">Prêt</SelectItem>
                  <SelectItem value="to_do">À nettoyer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Informations particulières…"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading} className="bg-kaza-blue hover:bg-blue-700 min-w-[120px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : propertyId ? 'Enregistrer' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}
