'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Users, Settings, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

const navigationItems = [
  {
    href: '/account-manager-dashboard',
    label: 'My Dashboard',
    icon: BarChart3,
    description: 'Your scheduled calls and metrics',
  },
  {
    href: '/admin-panel',
    label: 'Admin Panel',
    icon: Users,
    description: 'Team management and system overview',
  },
  {
    href: '/scheduling-settings',
    label: 'Settings',
    icon: Settings,
    description: 'System configuration',
  },
]

export function SchedulingNavigation() {
  const pathname = usePathname()
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const navContent = (
    <nav className="space-y-2">
      {navigationItems.map(item => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-5 h-5" />
            <div>
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </Link>
        )
      })}
    </nav>
  )

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed top-4 left-4 z-40">
            <Menu className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Scheduling</h2>
          </div>
          {navContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside className="w-72 border-r border-gray-200 h-screen sticky top-0 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Scheduling</h2>
        <p className="text-sm text-gray-500">System Dashboard</p>
      </div>
      {navContent}
    </aside>
  )
}
