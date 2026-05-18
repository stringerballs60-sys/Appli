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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Équipements</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {broken.length > 0 && (
            <span className="text-red-500 font-medium">
              ⚠ {broken.length} cassé{broken.length > 1 ? 's' : ''} ·{' '}
            </span>
          )}
          {filtered.length} article{filtered.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Property filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/inventory/equipment"
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !params.property
              ? 'bg-kaza-blue text-white border-kaza-blue'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          Tous
        </Link>
        {(properties ?? []).map((p: Pick<Property, 'id' | 'name' | 'color'>) => (
          <Link
            key={p.id}
            href={`/inventory/equipment?property=${p.id}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.property === p.id
                ? 'text-white border-transparent'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
            style={params.property === p.id ? { backgroundColor: p.color, borderColor: p.color } : {}}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </Link>
        ))}
      </div>

      <Card>
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
  )
}
