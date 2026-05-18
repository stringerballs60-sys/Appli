'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Building2,
  Package,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shirt,
  Wrench,
  ShoppingCart,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendrier', icon: Calendar },
  { href: '/reservations', label: 'Réservations', icon: BookOpen },
  { href: '/properties', label: 'Logements', icon: Building2 },
]

const inventoryItems = [
  { href: '/inventory/linen', label: 'Linge', icon: Shirt },
  { href: '/inventory/equipment', label: 'Équipements', icon: Wrench },
  { href: '/inventory/consumables', label: 'Consommables', icon: ShoppingCart },
]

const bottomItems = [
  { href: '/tasks', label: 'Tâches', icon: ClipboardList },
  { href: '/settings', label: 'Paramètres', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen text-white transition-all duration-300 ease-in-out relative',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{ backgroundColor: '#1A365D' }}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-white/15', collapsed ? 'justify-center' : 'gap-3')}>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
          style={{ backgroundColor: '#D4AF37', color: '#1A365D', fontFamily: 'Montserrat, sans-serif' }}
        >
          K
        </div>
        {!collapsed && (
          <span
            className="text-lg text-white"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '1px' }}
          >
            KAZA
          </span>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
        style={{ backgroundColor: '#15294A' }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-0.5 px-2">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </div>

        <div className="mt-4 px-2">
          {!collapsed && (
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Inventaire
            </p>
          )}
          {collapsed && <Separator className="my-2" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />}
          <div className="space-y-0.5">
            {inventoryItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="pb-4 px-2 space-y-0.5">
        <Separator className="mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        {bottomItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
        <button
          onClick={handleSignOut}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 hover:text-white',
            collapsed && 'justify-center'
          )}
          style={{ color: 'rgba(255,255,255,0.60)' }}
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}

function NavLink({
  item,
  pathname,
  collapsed,
}: {
  item: { href: string; label: string; icon: React.ElementType }
  pathname: string
  collapsed: boolean
}) {
  const Icon = item.icon
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        collapsed && 'justify-center',
        isActive
          ? 'text-white font-medium'
          : 'hover:text-white hover:bg-white/10'
      )}
      style={
        isActive
          ? { backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }
          : { color: 'rgba(255,255,255,0.60)' }
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}
