'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Settings, Save, RefreshCw } from 'lucide-react'

const holidays2026 = [
  { date: '2026-01-01', holiday: 'New Year' },
  { date: '2026-01-15', holiday: 'Republic Day' },
  { date: '2026-05-01', holiday: 'May Day' },
  { date: '2026-05-25', holiday: 'Geeta Jayanti' },
  { date: '2026-05-27', holiday: 'Ramzan Eid (approx)' },
  { date: '2026-07-03', holiday: 'Muharram' },
  { date: '2026-09-07', holiday: 'Janmashtami' },
  { date: '2026-10-20', holiday: 'Dussehra' },
  { date: '2026-11-08', holiday: 'Diwali' },
  { date: '2026-12-25', holiday: 'Christmas' },
]

const callTypeConfig = [
  {
    type: 'DISCOVERY',
    minSLA: 20,
    maxSLA: 30,
    priority: 2,
    description: 'Initial discovery call for new sales',
  },
  {
    type: 'ORIENTATION',
    minSLA: 0,
    maxSLA: 1,
    priority: 4,
    description: 'Service orientation call (same/next working day)',
  },
  {
    type: 'PROGRESS_REVIEW',
    minSLA: 15,
    maxSLA: 15,
    priority: 3,
    description: 'Periodic progress review every 15 days',
  },
  {
    type: 'RENEWAL',
    minSLA: 3,
    maxSLA: 10,
    priority: 1,
    description: '3-day SLA, extend to +7 days if unavailable',
  },
]

export default function SchedulingSettingsPage() {
  const [morningStart, setMorningStart] = useState('08:45')
  const [morningEnd, setMorningEnd] = useState('23:30')
  const [eveningStart, setEveningStart] = useState('00:30')
  const [eveningEnd, setEveningEnd] = useState('05:30')
  const [schedulerInterval, setSchedulerInterval] = useState('5')
  const [maxCallsPerDay, setMaxCallsPerDay] = useState('10')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Scheduling Settings</h1>
        <p className="text-gray-600 mt-2">Configure the Account Manager scheduling system.</p>
      </div>

      {saved && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <AlertDescription>✓ Settings saved successfully</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="working-hours" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="working-hours">
            <Clock className="w-4 h-4 mr-2" />
            Working Hours
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <Calendar className="w-4 h-4 mr-2" />
            Holidays
          </TabsTrigger>
          <TabsTrigger value="call-types">
            <Settings className="w-4 h-4 mr-2" />
            Call Types
          </TabsTrigger>
          <TabsTrigger value="scheduler">
            <RefreshCw className="w-4 h-4 mr-2" />
            Scheduler
          </TabsTrigger>
        </TabsList>

        {/* Working Hours Tab */}
        <TabsContent value="working-hours">
          <Card>
            <CardHeader>
              <CardTitle>IST Timezone Configuration</CardTitle>
              <CardDescription>
                Set the working hours for Account Manager availability scheduling. Times are in IST (UTC+5:30).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  💡 <strong>Tip:</strong> Account Managers can take calls during two time windows to maximize availability across different time zones.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Morning Session</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="morning-start">Start Time</Label>
                    <Input
                      id="morning-start"
                      type="time"
                      value={morningStart}
                      onChange={(e) => setMorningStart(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="morning-end">End Time</Label>
                    <Input
                      id="morning-end"
                      type="time"
                      value={morningEnd}
                      onChange={(e) => setMorningEnd(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Default: 8:45 AM - 11:30 PM</p>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Evening Session</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="evening-start">Start Time</Label>
                    <Input
                      id="evening-start"
                      type="time"
                      value={eveningStart}
                      onChange={(e) => setEveningStart(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="evening-end">End Time</Label>
                    <Input
                      id="evening-end"
                      type="time"
                      value={eveningEnd}
                      onChange={(e) => setEveningEnd(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Default: 12:30 AM - 5:30 AM</p>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Call Slot Configuration</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Slot Duration:</span>
                    <span className="font-medium">30 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Calls Per AM:</span>
                    <Input
                      type="number"
                      value={maxCallsPerDay}
                      onChange={(e) => setMaxCallsPerDay(e.target.value)}
                      className="w-20 h-8 text-center"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save Working Hours
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <CardTitle>2026 India Holidays</CardTitle>
              <CardDescription>
                Public holidays when no calls are scheduled. {holidays2026.length} holidays configured.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {holidays2026.map((holiday, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                    <div>
                      <div className="font-medium text-gray-900">{holiday.holiday}</div>
                      <div className="text-sm text-gray-500">{holiday.date}</div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t">
                <Button variant="outline" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Add Holiday for 2027
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call Types Tab */}
        <TabsContent value="call-types">
          <div className="space-y-4">
            {callTypeConfig.map((config, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{config.type.replace(/_/g, ' ')}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">P{config.priority}</div>
                      <div className="text-xs text-gray-500">Priority</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`sla-min-${index}`}>Min SLA (hours)</Label>
                      <Input
                        id={`sla-min-${index}`}
                        type="number"
                        defaultValue={config.minSLA}
                        className="mt-1"
                        disabled
                      />
                    </div>
                    <div>
                      <Label htmlFor={`sla-max-${index}`}>Max SLA (hours)</Label>
                      <Input
                        id={`sla-max-${index}`}
                        type="number"
                        defaultValue={config.maxSLA}
                        className="mt-1"
                        disabled
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler">
          <Card>
            <CardHeader>
              <CardTitle>Scheduler Configuration</CardTitle>
              <CardDescription>
                Configure how frequently the scheduling engine runs and processes calls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  💡 The scheduler automatically processes PENDING calls and assigns them to available Account Managers based on workload and SLA requirements.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-4">CRON Jobs</h3>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">Scheduler</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Runs every 5 minutes to assign PENDING calls to Account Managers
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-blue-600">*/5 * * * *</div>
                        <div className="text-xs text-gray-500">Every 5 minutes</div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">Renewal Check</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Runs daily at midnight (IST) to create renewal calls for upcoming renewals
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-blue-600">0 0 * * *</div>
                        <div className="text-xs text-gray-500">Daily at 12:00 AM</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Advanced Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="scheduler-interval">Scheduler Interval (minutes)</Label>
                    <Input
                      id="scheduler-interval"
                      type="number"
                      value={schedulerInterval}
                      onChange={(e) => setSchedulerInterval(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">How often the scheduler processes pending calls</p>
                  </div>

                  <div>
                    <Label htmlFor="max-calls">Max Calls Per AM Per Day</Label>
                    <Input
                      id="max-calls"
                      type="number"
                      value={maxCallsPerDay}
                      onChange={(e) => setMaxCallsPerDay(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum calls an AM can be assigned in 24 hours</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save Scheduler Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
