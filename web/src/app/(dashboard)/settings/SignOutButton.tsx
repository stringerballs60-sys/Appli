'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      className="text-red-500 border-red-200 hover:bg-red-50"
      onClick={handleSignOut}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Se déconnecter
    </Button>
  )
}
