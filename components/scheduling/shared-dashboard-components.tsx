import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Clock, Phone } from 'lucide-react'
import { DateTime } from 'luxon'

interface CallMetric {
  label: string
  value: number
  color: 'blue' | 'green' | 'red' | 'yellow' | 'gray'
  icon: React.ReactNode
}

const colorClasses = {
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-green-600 bg-green-50',
  red: 'text-red-600 bg-red-50',
  yellow: 'text-yellow-600 bg-yellow-50',
  gray: 'text-gray-600 bg-gray-50',
}

export function MetricsGrid({ metrics }: { metrics: CallMetric[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index} className={`border-l-4 ${metric.color === 'red' ? 'border-l-red-500' : metric.color === 'yellow' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">{metric.label}</p>
                <p className={`text-3xl font-bold mt-2 ${colorClasses[metric.color]}`}>
                  {metric.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${colorClasses[metric.color]}`}>
                {metric.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface CallListProps {
  calls: Array<{
    id: string
    lead_id: string
    call_type: string
    status: string
    scheduled_at: string | null
    sla_deadline: string
    client_name?: string
    am_name?: string
  }>
  isLoading?: boolean
  emptyMessage?: string
}

export function CallsList({ calls, isLoading = false, emptyMessage = 'No calls found' }: CallListProps) {
  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (calls.length === 0) {
    return <div className="text-center py-8 text-gray-500">{emptyMessage}</div>
  }

  return (
    <div className="space-y-2">
      {calls.map(call => (
        <div key={call.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">{call.client_name || call.lead_id}</h4>
                <Badge variant="outline">{call.status}</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">{call.call_type.replace(/_/g, ' ')}</p>
              {call.am_name && <p className="text-sm text-gray-500">Assigned to: {call.am_name}</p>}
              {call.scheduled_at && (
                <p className="text-sm text-gray-600 mt-1">
                  📅 {DateTime.fromISO(call.scheduled_at).toFormat('MMM dd, yyyy hh:mm a')}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">SLA Deadline</p>
              <p className="text-sm font-medium">{DateTime.fromISO(call.sla_deadline).toFormat('MMM dd')}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SchedulingMetricsCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
