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
    <div>
      {/* Navy header */}
      <div className="px-5 py-4" style={{ backgroundColor: '#1A365D' }}>
        <h1
          className="text-white text-xl"
          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '1px' }}
        >
          Inventaire linge
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
          Gestion du linge par logement
        </p>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Property filter */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventory/linen"
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
              href={`/inventory/linen?property=${p.id}`}
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

        <LinenInventoryTable
          items={filtered as LinenInventory[]}
          properties={(properties ?? []) as Pick<Property, 'id' | 'name' | 'color'>[]}
        />
      </div>
    </div>
  )
}
