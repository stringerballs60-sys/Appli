import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PropertyForm } from '@/components/property/PropertyForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: property } = await supabase.from('properties').select('*').eq('id', id).single()

  if (!property) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/properties/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Modifier {property.name}</h1>
      </div>
      <PropertyForm defaultValues={property} propertyId={id} />
    </div>
  )
}
