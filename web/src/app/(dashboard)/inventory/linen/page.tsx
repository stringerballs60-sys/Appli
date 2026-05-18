import { createClient } from '@/lib/supabase/server'
import { LinenInventory, LinenType, LINEN_TYPE_LABELS, Property } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { LinenInventoryTable } from '@/components/inventory/LinenInventoryTable'

export const revalidate = 0

export default async function LinenPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: linenItems }, { data: properties }] = await Promise.all([
    supabase
      .from('linen_inventory')
      .select('*, property:properties(id,name,color)')
      .order('property_id'),
    supabase.from('properties').select('id,name,color').eq('is_active', true).order('name'),
  ])

  const filtered = params.property
    ? (linenItems ?? []).filter((l: LinenInventory) => l.property_id === params.property)
    : (linenItems ?? [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventaire linge</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gestion du linge par logement</p>
      </div>

      {/* Property filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/inventory/linen"
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
            href={`/inventory/linen?property=${p.id}`}
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

      <LinenInventoryTable
        items={filtered as LinenInventory[]}
        properties={(properties ?? []) as Pick<Property, 'id' | 'name' | 'color'>[]}
      />
    </div>
  )
}
