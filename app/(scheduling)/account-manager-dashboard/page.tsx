'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Clock, CheckCircle, AlertCircle, Phone, Calendar, User } from 'lucide-react'
import { DateTime } from 'luxon'

interface Call {
  id: string
  lead_id: string
  call_type: 'DISCOVERY' | 'ORIENTATION' | 'PROGRESS_REVIEW' | 'RENEWAL'
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED'
  scheduled_at: string | null
  completed_at: string | null
  priority: number
  sla_deadline: string
  client_name?: string
  client_email?: string
  is_preempted?: boolean
}

interface DashboardData {
  totalClients: number
  totalCalls: Record<string, number>
  callsByType: Record<string, number>
  amMetrics: Array<{
    am_id: string
    am_name: string
    assigned_calls: number
    completed_calls: number
    pending_calls: number
    utilization: number
  }>
  upcomingCalls: Call[]
  unscheduledCalls: Call[]
  slaBreach: Call[]
}

const COLORS = {
  DISCOVERY: '#3b82f6',
  ORIENTATION: '#10b981',
  PROGRESS_REVIEW: '#f59e0b',
  RENEWAL: '#ef4444',
}

const STATUS_COLORS = {
  PENDING: '#9ca3af',
  SCHEDULED: '#3b82f6',
  COMPLETED: '#10b981',
  MISSED: '#ef4444',
  RESCHEDULED: '#f59e0b',
}

// Mock data for development/testing
const getMockDashboardData = (): DashboardData => ({
  totalClients: 42,
  totalCalls: {
    pending: 15,
    scheduled: 25,
    completed: 45,
    missed: 2,
    rescheduled: 3,
  },
  callsByType: {
    DISCOVERY: 10,
    ORIENTATION: 8,
    PROGRESS_REVIEW: 35,
    RENEWAL: 5,
  },
  amMetrics: [
    {
      am_id: '1',
      am_name: 'John Doe',
      assigned_calls: 12,
      completed_calls: 8,
      pending_calls: 4,
      utilization: 0.75,
    },
  ],
  upcomingCalls: [],
  unscheduledCalls: [],
  slaBreach: [],
})

export default function AccountManagerDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(getMockDashboardData())
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/scheduling/dashboard')
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      if (data) {
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Use mock data on error
      setDashboardData(getMockDashboardData())
    } finally {
      setLoading(false)
    }
  }

  const getFilteredCalls = (calls: Call[]) => {
    let filtered = calls

    if (selectedFilter === 'today') {
      const today = DateTime.now().toISODate()
      filtered = filtered.filter(call => {
        if (!call.scheduled_at) return false
        return DateTime.fromISO(call.scheduled_at).toISODate() === today
      })
    } else if (selectedFilter === 'week') {
      const now = DateTime.now()
      const weekEnd = now.plus({ days: 7 })
      filtered = filtered.filter(call => {
        if (!call.scheduled_at) return false
        const callDate = DateTime.fromISO(call.scheduled_at)
        return callDate >= now && callDate <= weekEnd
      })
    }

    if (searchQuery) {
      filtered = filtered.filter(call =>
        call.lead_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.client_email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  const upcomingCalls = getFilteredCalls(dashboardData.upcomingCalls || [])
  const slaBreach = getFilteredCalls(dashboardData.slaBreach || [])
  const unscheduledCalls = getFilteredCalls(dashboardData.unscheduledCalls || [])

  const callTypeData = Object.entries(dashboardData.callsByType).map(([type, count]) => ({
    name: type.replace(/_/g, ' '),
    value: count,
    color: COLORS[type as keyof typeof COLORS],
  }))

  const callStatusData = Object.entries(dashboardData.totalCalls).map(([status, count]) => ({
    name: status,
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your scheduling overview.</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalClients}</div>
            <p className="text-xs text-gray-500 mt-1">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Scheduled Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dashboardData.totalCalls.scheduled || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Coming up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData.totalCalls.completed || 0}</div>
            <p className="text-xs text-gray-500 mt-1">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">SLA Breaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{slaBreach.length}</div>
            <p className="text-xs text-gray-500 mt-1">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calls by Type</CardTitle>
            <CardDescription>Distribution of call types this period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={callTypeData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {callTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calls by Status</CardTitle>
            <CardDescription>Current status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={callStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {callStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">
            <Calendar className="w-4 h-4 mr-2" />
            Upcoming Calls ({upcomingCalls.length})
          </TabsTrigger>
          <TabsTrigger value="sla">
            <AlertCircle className="w-4 h-4 mr-2" />
            SLA Breaches ({slaBreach.length})
          </TabsTrigger>
          <TabsTrigger value="unscheduled">
            <Clock className="w-4 h-4 mr-2" />
            Unscheduled ({unscheduledCalls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <Input
                placeholder="Search by lead ID or client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>
            <Select value={selectedFilter} onValueChange={(v: any) => setSelectedFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {upcomingCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No upcoming calls</div>
            ) : (
              upcomingCalls.map(call => (
                <CallCard key={call.id} call={call} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          {slaBreach.length === 0 ? (
            <div className="text-center py-8 text-gray-500">All SLA targets on track!</div>
          ) : (
            slaBreach.map(call => (
              <CallCard key={call.id} call={call} showSlaWarning={true} />
            ))
          )}
        </TabsContent>

        <TabsContent value="unscheduled" className="space-y-4">
          {unscheduledCalls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">All calls scheduled!</div>
          ) : (
            unscheduledCalls.map(call => (
              <CallCard key={call.id} call={call} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CallCard({ call, showSlaWarning }: { call: Call; showSlaWarning?: boolean }) {
  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case 'DISCOVERY':
        return <Phone className="w-4 h-4" />
      case 'RENEWAL':
        return <Calendar className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'secondary',
      SCHEDULED: 'default',
      COMPLETED: 'default',
      MISSED: 'destructive',
      RESCHEDULED: 'outline',
    }
    return variants[status] || 'default'
  }

  const isOverdue = call.sla_deadline && DateTime.fromISO(call.sla_deadline) < DateTime.now()

  return (
    <Card className={isOverdue && showSlaWarning ? 'border-red-400 bg-red-50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-2 rounded-lg bg-gray-100">{getCallTypeIcon(call.call_type)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{call.client_name || call.lead_id}</h3>
                <Badge variant={getStatusBadge(call.status)}>{call.status}</Badge>
                {call.is_preempted && <Badge variant="outline">Preempted</Badge>}
              </div>
              <p className="text-sm text-gray-600 mt-1">{call.call_type.replace(/_/g, ' ')}</p>
              {call.client_email && <p className="text-sm text-gray-500">{call.client_email}</p>}
              {call.scheduled_at && (
                <p className="text-sm text-gray-600 mt-2">
                  📅 {DateTime.fromISO(call.scheduled_at).toFormat('MMM dd, yyyy hh:mm a')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {call.status === 'SCHEDULED' && (
              <>
                <Button variant="outline" size="sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete
                </Button>
                <Button variant="outline" size="sm">
                  Reschedule
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
