'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LinenInventory, LinenType, LINEN_TYPE_LABELS, Property } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LINEN_TYPES = Object.values(LinenType)

interface LinenInventoryTableProps {
  items: LinenInventory[]
  properties: Pick<Property, 'id' | 'name' | 'color'>[]
}

export function LinenInventoryTable({ items, properties }: LinenInventoryTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState<string | null>(null)
  const [localItems, setLocalItems] = useState<LinenInventory[]>(items)

  const grouped = properties.map((p) => ({
    property: p,
    linen: LINEN_TYPES.map((type) => {
      return localItems.find((l) => l.property_id === p.id && l.linen_type === type) ?? null
    }),
  })).filter((g) => g.linen.some((l) => l !== null))

  function updateField(id: string, field: keyof LinenInventory, value: number) {
    setLocalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  async function saveItem(item: LinenInventory) {
    setSaving(item.id)
    await supabase
      .from('linen_inventory')
      .update({
        qty_in_property: item.qty_in_property,
        qty_dirty_washing: item.qty_dirty_washing,
        qty_clean_stock: item.qty_clean_stock,
        target_rotation: item.target_rotation,
      })
      .eq('id', item.id)
    setSaving(null)
    router.refresh()
  }

  if (grouped.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg font-medium">Aucun inventaire linge</p>
        <p className="text-sm mt-1">Créez d'abord des logements pour gérer le linge</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ property, linen }) => (
        <Card key={property.id}>
          <div
            className="h-1 rounded-t-lg"
            style={{ backgroundColor: property.color }}
          />
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">{property.name}</h3>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/50">
                    <th className="text-left text-xs font-semibold text-slate-400 px-6 py-3">Type</th>
                    <th className="text-center text-xs font-semibold text-slate-400 px-3 py-3">En logement</th>
                    <th className="text-center text-xs font-semibold text-slate-400 px-3 py-3">Au lavage</th>
                    <th className="text-center text-xs font-semibold text-slate-400 px-3 py-3">Stock propre</th>
                    <th className="text-center text-xs font-semibold text-slate-400 px-3 py-3">Objectif</th>
                    <th className="text-center text-xs font-semibold text-slate-400 px-3 py-3">Total</th>
                    <th className="w-16 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {LINEN_TYPES.map((type, i) => {
                    const item = linen[i]
                    if (!item) return null

                    const total = item.qty_in_property + item.qty_dirty_washing + item.qty_clean_stock
                    const isLow = total < item.target_rotation

                    return (
                      <tr key={type} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">
                              {LINEN_TYPE_LABELS[type]}
                            </span>
                            {isLow && (
                              <Badge variant="warning" className="text-xs">Stock bas</Badge>
                            )}
                          </div>
                        </td>
                        {(
                          [
                            ['qty_in_property', item.qty_in_property],
                            ['qty_dirty_washing', item.qty_dirty_washing],
                            ['qty_clean_stock', item.qty_clean_stock],
                            ['target_rotation', item.target_rotation],
                          ] as [keyof LinenInventory, number][]
                        ).map(([field, value]) => (
                          <td key={field} className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min={0}
                              value={value}
                              onChange={(e) =>
                                updateField(item.id, field, Math.max(0, parseInt(e.target.value) || 0))
                              }
                              className="w-16 text-center text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-kaza-blue bg-white"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-semibold ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>
                            {total}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => saveItem(item)}
                            disabled={saving === item.id}
                          >
                            {saving === item.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3 text-slate-400" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
