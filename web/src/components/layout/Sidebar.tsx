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
import { Button } from '@/components/ui/button'
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
        'flex flex-col h-screen bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out relative',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-slate-700', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-kaza-blue flex items-center justify-center font-bold text-white text-sm">
          K
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight">KAZA</span>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors z-10"
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
            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Inventaire
            </p>
          )}
          {collapsed && <Separator className="bg-slate-700 my-2" />}
          <div className="space-y-0.5">
            {inventoryItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="pb-4 px-2 space-y-0.5">
        <Separator className="bg-slate-700 mb-2" />
        {bottomItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
        <button
          onClick={handleSignOut}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors',
            collapsed && 'justify-center'
          )}
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
          ? 'bg-kaza-blue text-white font-medium'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}
