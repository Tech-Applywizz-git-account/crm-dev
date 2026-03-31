'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function SchedulingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute allowedRoles={["Super Admin", "Account Management", "Accounts Associate"]}>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  )
}
