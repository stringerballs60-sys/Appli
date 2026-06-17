import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SignOutButton } from './SignOutButton'
import { User, Shield, Info } from 'lucide-react'

export const revalidate = 0

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null }

  return (
    <div>
      {/* Navy header */}
      <div className="px-5 py-4" style={{ backgroundColor: '#1A365D' }}>
        <h1
          className="text-white text-xl"
          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '1px' }}
        >
          Paramètres
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
          Gestion du compte
        </p>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Compte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: '#1A365D', fontFamily: 'Montserrat, sans-serif' }}
              >
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="font-medium text-slate-800">
                  {profile?.full_name ?? 'Gestionnaire'}
                </p>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">
              La modification du mot de passe se fait depuis l'email de réinitialisation Supabase.
            </p>
            <SignOutButton />
          </CardContent>
        </Card>

        {/* App info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              À propos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Application</span>
              <span className="font-medium">KAZA Web</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Version</span>
              <span className="font-medium">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stack</span>
              <span className="font-medium">Next.js 15 · Supabase</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
