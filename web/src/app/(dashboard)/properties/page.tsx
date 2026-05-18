import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, ArrowRight, Bed, Users, Bath } from 'lucide-react'
import { Property, PROPERTY_TYPE_LABELS } from '@/types'

export const revalidate = 0

export default async function PropertiesPage() {
  const supabase = await createClient()
  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .order('name')

  return (
    <div>
      {/* Navy header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: '#1A365D' }}>
        <div>
          <h1
            className="text-white text-xl"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '1px' }}
          >
            Logements
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
            {properties?.filter((p) => p.is_active).length ?? 0} actif(s)
          </p>
        </div>
        <Link href="/properties/new">
          <Button
            className="gap-2 text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.30)' }}
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </Button>
        </Link>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!properties || properties.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <p className="text-lg font-medium">Aucun logement</p>
              <p className="text-sm mt-1">Ajoutez votre premier logement</p>
            </div>
          ) : (
            properties.map((p: Property) => (
              <Link key={p.id} href={`/properties/${p.id}`}>
                <Card
                  className={`hover:shadow-md transition-all cursor-pointer overflow-hidden ${!p.is_active ? 'opacity-60' : ''}`}
                  style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 4px rgba(15,23,42,0.06)', borderRadius: '12px' }}
                >
                  <div className="flex">
                    {/* Left color strip */}
                    <div
                      className="w-1.5 flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <CardContent className="p-5 flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate">{p.name}</h3>
                          {p.address && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">{p.address}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <Badge variant={p.is_active ? 'success' : 'secondary'} className="text-xs">
                            {p.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Badge
                            variant={p.cleaning_status === 'ready' ? 'success' : 'warning'}
                            className="text-xs"
                          >
                            {p.cleaning_status === 'ready' ? '✓ Prêt' : '⚠ À nettoyer'}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mb-3">{PROPERTY_TYPE_LABELS[p.property_type]}</p>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          {p.nb_double_beds}D / {p.nb_single_beds}S
                          {p.nb_sofa_beds > 0 && ` / ${p.nb_sofa_beds}C`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {p.max_guests} max
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-3.5 h-3.5 text-slate-400" />
                          {p.nb_bathrooms}
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
