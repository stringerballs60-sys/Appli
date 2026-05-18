import { createClient } from '@/lib/supabase/server'
import { Consumable, Property } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertTriangle, Plus } from 'lucide-react'

export const revalidate = 0

export default async function ConsumablesPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: consumables }, { data: properties }] = await Promise.all([
    supabase
      .from('consumables')
      .select('*, property:properties(id,name,color)')
      .order('item_name'),
    supabase.from('properties').select('id,name,color').eq('is_active', true).order('name'),
  ])

  const filtered = params.property
    ? (consumables ?? []).filter((c: Consumable) => c.property_id === params.property)
    : (consumables ?? [])

  const lowStock = filtered.filter((c: Consumable) => c.current_stock <= c.min_threshold)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consommables</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {lowStock.length > 0 && (
              <span className="text-red-500 font-medium">
                ⚠ {lowStock.length} alerte{lowStock.length > 1 ? 's' : ''} de stock ·{' '}
              </span>
            )}
            {filtered.length} article{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Property filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/inventory/consumables"
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
            href={`/inventory/consumables?property=${p.id}`}
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-medium">Aucun consommable</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-400 px-6 py-3">Article</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3 hidden sm:table-cell">Logement</th>
                  <th className="text-center text-xs font-semibold text-slate-400 px-4 py-3">Stock actuel</th>
                  <th className="text-center text-xs font-semibold text-slate-400 px-4 py-3">Seuil min</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c: Consumable) => {
                  const isLow = c.current_stock <= c.min_threshold
                  const prop = c.property as { name: string; color: string } | undefined
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${isLow ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-slate-800">{c.item_name}</p>
                        {c.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{c.notes}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {prop && (
                          <span className="text-sm text-slate-600">{prop.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold tabular-nums ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                          {c.current_stock} {c.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-slate-500 tabular-nums">
                          {c.min_threshold} {c.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isLow ? (
                          <Badge variant="danger" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            Rupture
                          </Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
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
