'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Loader2, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#F8F9FA' }}
    >
      <div className="w-full max-w-[400px] flex flex-col items-center gap-6">
        {/* Logo container */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-[90px] h-[90px] flex items-center justify-center"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '22px',
              boxShadow: '0 2px 6px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.08)',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 800,
                fontSize: '42px',
                color: '#1A365D',
                lineHeight: 1,
              }}
            >
              K
            </span>
          </div>
          <div className="text-center">
            <h1
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 700,
                fontSize: '34px',
                color: '#1A365D',
                letterSpacing: '1px',
                lineHeight: 1.1,
              }}
            >
              KAZA
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#6B7280', marginTop: '4px' }}>
              Conciergerie Airbnb
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div
          className="w-full"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 2px 6px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.08)',
            padding: '24px',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="flex items-center gap-2 text-sm"
                style={{
                  color: '#EF4444',
                  backgroundColor: '#EF444422',
                  border: '1px solid #EF4444',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#333333' }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: '#9CA3AF' }}
                />
                <input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    paddingLeft: '36px',
                    paddingRight: '12px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: '#333333',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1A365D'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(26,54,93,0.15)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#333333' }}
              >
                Mot de passe
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: '#9CA3AF' }}
                />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    paddingLeft: '36px',
                    paddingRight: '12px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: '#333333',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1A365D'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(26,54,93,0.15)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#1A365D', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label
                htmlFor="remember"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6B7280', cursor: 'pointer' }}
              >
                Se souvenir de moi
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
              style={{
                backgroundColor: '#1A365D',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '11px 0',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: '15px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 18px rgba(26,54,93,0.25)',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#15294A' }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1A365D' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#6B7280', textAlign: 'center' }}>
          Pas encore de compte ?{' '}
          <span style={{ color: '#1A365D', fontWeight: 600, cursor: 'pointer' }}>
            Créer un compte
          </span>
        </p>
      </div>
    </div>
  )
}
