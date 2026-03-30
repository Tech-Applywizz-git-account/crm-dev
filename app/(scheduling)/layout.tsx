'use client'

import { SchedulingNavigation } from '@/components/scheduling/scheduling-navigation'

export default function SchedulingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <SchedulingNavigation />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
