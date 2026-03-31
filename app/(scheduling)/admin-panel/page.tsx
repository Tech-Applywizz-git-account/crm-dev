'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import { AlertCircle, Users, TrendingUp, Calendar, Settings, Edit2, Trash2, Plus } from 'lucide-react'
import { DateTime } from 'luxon'

interface AccountManager {
  am_id: string
  am_name: string
  assigned_calls: number
  completed_calls: number
  pending_calls: number
  utilization: number
  completion_rate?: number
}

interface Call {
  id: string
  lead_id: string
  call_type: 'DISCOVERY' | 'ORIENTATION' | 'PROGRESS_REVIEW' | 'RENEWAL'
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED'
  scheduled_at: string | null
  completed_at: string | null
  priority: number
  sla_deadline: string
  am_id: string | null
  am_name?: string
  is_preempted?: boolean
}

interface DashboardData {
  totalClients: number
  totalCalls: Record<string, number>
  callsByType: Record<string, number>
  amMetrics: AccountManager[]
  upcomingCalls: Call[]
  unscheduledCalls: Call[]
  slaBreach: Call[]
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
    {
      am_id: '2',
      am_name: 'Jane Smith',
      assigned_calls: 15,
      completed_calls: 12,
      pending_calls: 3,
      utilization: 0.85,
    },
  ],
  upcomingCalls: [],
  unscheduledCalls: [],
  slaBreach: [],
})

export default function AdminPanel() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(getMockDashboardData())
  const [loading, setLoading] = useState(true)
  const [selectedAM, setSelectedAM] = useState<AccountManager | null>(null)
  const [showReassignDialog, setShowReassignDialog] = useState(false)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [newAMId, setNewAMId] = useState('')

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 60000)
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

  const handleReassignCall = async () => {
    if (!selectedCall || !newAMId) return

    try {
      // This would call an API to reassign the call
      // For now, just show success
      alert(`Reassigned ${selectedCall.id} to AM ${newAMId}`)
      setShowReassignDialog(false)
    } catch (error) {
      console.error('Failed to reassign call:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  const utilizationData = (dashboardData?.amMetrics || []).map(am => ({
    name: am.am_name,
    utilization: Math.round(am.utilization * 100),
    completed: am.completed_calls,
    total: am.assigned_calls,
  }))

  const slaBySeverity = {
    critical: (dashboardData?.slaBreach || []).filter(call => {
      const dueDate = DateTime.fromISO(call.sla_deadline)
      const hoursUntilDue = dueDate.diffNow('hours').hours
      return hoursUntilDue < 0 // Overdue
    }),
    warning: (dashboardData?.slaBreach || []).filter(call => {
      const dueDate = DateTime.fromISO(call.sla_deadline)
      const hoursUntilDue = dueDate.diffNow('hours').hours
      return hoursUntilDue >= 0 && hoursUntilDue < 24
    }),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage Account Managers, calls, and system metrics.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalClients || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Managed accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(dashboardData?.totalCalls || {}).reduce((a, b) => a + b, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">All statuses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active AMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.amMetrics?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Account Managers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.totalCalls?.completed
                ? Math.round(
                  (dashboardData.totalCalls.completed /
                    (dashboardData.totalCalls.completed +
                      dashboardData.totalCalls.missed +
                      dashboardData.totalCalls.rescheduled)) *
                  100
                )
                : 0}
              %
            </div>
            <p className="text-xs text-gray-500 mt-1">Success rate</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">SLA Breaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{slaBySeverity.critical.length}</div>
            <p className="text-xs text-red-600 mt-1">
              Critical: {slaBySeverity.critical.length} | Warning: {slaBySeverity.warning.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Manager Utilization</CardTitle>
            <CardDescription>Current workload distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Completed vs assigned calls by AM</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="total" name="Total Assigned" />
                <YAxis type="number" dataKey="completed" name="Completed" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="AMs" data={utilizationData} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Team ({dashboardData.amMetrics.length})
          </TabsTrigger>
          <TabsTrigger value="calls">
            <Calendar className="w-4 h-4 mr-2" />
            Unscheduled ({dashboardData.unscheduledCalls.length})
          </TabsTrigger>
          <TabsTrigger value="sla">
            <AlertCircle className="w-4 h-4 mr-2" />
            SLA Breaches ({dashboardData.slaBreach.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Team Management Tab */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Account Managers</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add AM
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Assigned Calls</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dashboardData?.amMetrics || []).map(am => (
                  <TableRow key={am.am_id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{am.am_name}</TableCell>
                    <TableCell>{am.assigned_calls}</TableCell>
                    <TableCell className="text-green-600">{am.completed_calls}</TableCell>
                    <TableCell className="text-blue-600">{am.pending_calls}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded overflow-hidden">
                          <div
                            className={`h-full ${am.utilization > 0.9
                              ? 'bg-red-500'
                              : am.utilization > 0.7
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                              }`}
                            style={{ width: `${am.utilization * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{Math.round(am.utilization * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAM(am)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Unscheduled Calls Tab */}
        <TabsContent value="calls" className="space-y-4">
          <div className="space-y-2">
            {(dashboardData?.unscheduledCalls || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">All calls scheduled!</div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Lead ID</TableHead>
                      <TableHead>Call Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>SLA Deadline</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dashboardData?.unscheduledCalls || []).map(call => (
                      <TableRow key={call.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{call.lead_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{call.call_type.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={call.priority === 1 ? 'destructive' : 'secondary'}>
                            P{call.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {DateTime.fromISO(call.sla_deadline).toFormat('MMM dd, yyyy hh:mm a')}
                        </TableCell>
                        <TableCell>
                          <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCall(call)}
                              >
                                Assign
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assign Call to Account Manager</DialogTitle>
                                <DialogDescription>
                                  Assigning {selectedCall?.lead_id} - {selectedCall?.call_type}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Select value={newAMId} onValueChange={setNewAMId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Account Manager" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(dashboardData?.amMetrics || []).map(am => (
                                      <SelectItem key={am.am_id} value={am.am_id}>
                                        {am.am_name} ({am.pending_calls} pending)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button onClick={handleReassignCall} className="w-full">
                                  Assign Call
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* SLA Breaches Tab */}
        <TabsContent value="sla" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-red-600 mb-2">Critical SLA Breaches ({slaBySeverity.critical.length})</h3>
              {slaBySeverity.critical.length === 0 ? (
                <p className="text-gray-500">No critical breaches</p>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-red-100">
                      <TableRow>
                        <TableHead>Lead ID</TableHead>
                        <TableHead>Call Type</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Overdue By</TableHead>
                        <TableHead>Assigned To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slaBySeverity.critical.map(call => {
                        const dueDate = DateTime.fromISO(call.sla_deadline)
                        const overdueHours = dueDate.diffNow('hours').hours
                        return (
                          <TableRow key={call.id}>
                            <TableCell className="font-medium">{call.lead_id}</TableCell>
                            <TableCell>{call.call_type.replace(/_/g, ' ')}</TableCell>
                            <TableCell>{dueDate.toFormat('MMM dd, hh:mm a')}</TableCell>
                            <TableCell className="font-semibold text-red-600">
                              {Math.abs(Math.round(overdueHours))}h overdue
                            </TableCell>
                            <TableCell>{call.am_name || 'Unassigned'}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-yellow-600 mb-2">Warning - Due Soon ({slaBySeverity.warning.length})</h3>
              {slaBySeverity.warning.length === 0 ? (
                <p className="text-gray-500">No warnings</p>
              ) : (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-yellow-100">
                      <TableRow>
                        <TableHead>Lead ID</TableHead>
                        <TableHead>Call Type</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Due In</TableHead>
                        <TableHead>Assigned To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slaBySeverity.warning.map(call => {
                        const dueDate = DateTime.fromISO(call.sla_deadline)
                        const hoursUntilDue = dueDate.diffNow('hours').hours
                        return (
                          <TableRow key={call.id}>
                            <TableCell className="font-medium">{call.lead_id}</TableCell>
                            <TableCell>{call.call_type.replace(/_/g, ' ')}</TableCell>
                            <TableCell>{dueDate.toFormat('MMM dd, hh:mm a')}</TableCell>
                            <TableCell className="font-semibold text-yellow-600">
                              {Math.round(hoursUntilDue)}h remaining
                            </TableCell>
                            <TableCell>{call.am_name || 'Unassigned'}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Manage scheduling system settings and holidays</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-4">Working Hours (IST Timezone)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Morning Start</label>
                    <Input type="time" defaultValue="08:45" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Morning End</label>
                    <Input type="time" defaultValue="23:30" className="mt-1" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Holiday Management</h4>
                <Button variant="outline">Update 2027 Holidays</Button>
                <p className="text-sm text-gray-500 mt-2">Currently 10 holidays configured for 2026</p>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Scheduler Settings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Scheduler Interval:</span>
                    <span className="font-medium">Every 5 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Renewal Check:</span>
                    <span className="font-medium">Daily at midnight</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max AM Calls/Day:</span>
                    <span className="font-medium">10 calls</span>
                  </div>
                </div>
              </div>

              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
