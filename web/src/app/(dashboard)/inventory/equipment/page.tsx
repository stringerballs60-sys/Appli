import { createClient } from '@/lib/supabase/server'
import { Property } from '@/types'

interface EquipmentInventory {
  id: string
  property_id: string
  item_name: string
  quantity: number
  condition: 'good' | 'worn' | 'broken' | null
  notes: string | null
  property?: { name: string; color: string }
}
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const revalidate = 0

const conditionVariant = {
  good: 'success',
  worn: 'warning',
  broken: 'danger',
} as const

const conditionLabel = {
  good: 'Bon état',
  worn: 'Usé',
  broken: 'Cassé',
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: equipment }, { data: properties }] = await Promise.all([
    supabase
      .from('equipment_inventory')
      .select('*, property:properties(id,name,color)')
      .order('item_name'),
    supabase.from('properties').select('id,name,color').eq('is_active', true).order('name'),
  ])

  const filtered = params.property
    ? (equipment ?? []).filter((e: EquipmentInventory) => e.property_id === params.property)
    : (equipment ?? [])

  const broken = filtered.filter((e: EquipmentInventory) => e.condition === 'broken')

  return (
    <div>
      {/* Navy header */}
      <div className="px-5 py-4" style={{ backgroundColor: '#1A365D' }}>
        <h1
          className="text-white text-xl"
          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '1px' }}
        >
          Équipements
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
          {broken.length > 0 && (
            <>⚠ {broken.length} cassé{broken.length > 1 ? 's' : ''} · </>
          )}
          {filtered.length} article{filtered.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Property filter */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventory/equipment"
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
            style={
              !params.property
                ? { backgroundColor: '#1A365D', color: '#FFFFFF', borderColor: '#1A365D' }
                : { backgroundColor: '#FFFFFF', color: '#4B5563', borderColor: '#E2E8F0' }
            }
          >
            Tous
          </Link>
          {(properties ?? []).map((p: Pick<Property, 'id' | 'name' | 'color'>) => (
            <Link
              key={p.id}
              href={`/inventory/equipment?property=${p.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              style={
                params.property === p.id
                  ? { backgroundColor: p.color, borderColor: p.color, color: '#FFFFFF' }
                  : { backgroundColor: '#FFFFFF', color: '#4B5563', borderColor: '#E2E8F0' }
              }
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </Link>
          ))}
        </div>

        <Card style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 4px rgba(15,23,42,0.06)', borderRadius: '12px' }}>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-lg font-medium">Aucun équipement</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-xs font-semibold text-slate-400 px-6 py-3">Article</th>
                    <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3 hidden sm:table-cell">Logement</th>
                    <th className="text-center text-xs font-semibold text-slate-400 px-4 py-3">Quantité</th>
                    <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((e: EquipmentInventory) => {
                    const prop = e.property as { name: string; color: string } | undefined
                    return (
                      <tr key={e.id} className={`hover:bg-slate-50/50 transition-colors ${e.condition === 'broken' ? 'bg-red-50/30' : ''}`}>
                        <td className="px-6 py-3">
                          <p className="text-sm font-medium text-slate-800">{e.item_name}</p>
                          {e.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{e.notes}</p>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {prop && (
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: prop.color }}
                              />
                              <span className="text-sm text-slate-600">{prop.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-slate-800 tabular-nums">
                            {e.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {e.condition ? (
                            <Badge variant={conditionVariant[e.condition]}>
                              {conditionLabel[e.condition]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
