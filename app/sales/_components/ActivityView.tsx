"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
    TrendingUp,
    Users,
    PhoneCall,
    CheckCircle2,
    AlertCircle,
    Calendar as CalendarIcon,
    BarChart3,
    PieChart as PieChartIcon,
    RefreshCcw,
    ArrowLeft
} from "lucide-react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts"
import { supabase } from "@/utils/supabase/client"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Package, ListOrdered, Calendar as CalendarIconLucide } from "lucide-react"

dayjs.extend(relativeTime)

type SalesStage = "Prospect" | "DNP" | "Out of TG" | "Not Interested" | "Conversation Done" | "sale done" | "Target";

interface SalesPerson {
    full_name: string;
    user_email: string;
}

interface ActivityMetrics {
    totalLeadsAssigned: number;
    totalCallsMade: number;
    totalSalesClosed: number;
    completedFollowups: number;
    missedFollowups: number;
    conversionRate: number;
}

interface ChartData {
    name: string;
    value: number;
}

interface DailyActivity {
    date: string;
    calls: number;
    assignments: number;
}

interface SalesPersonStats {
    name: string;
    leads: number;
    calls: number;
    sales: number;
    revenue: number;
    missed?: number;
    followups: number;
    assignments: number;
}

export default function ActivityView({ userProfile, onBack }: { userProfile?: any, onBack?: () => void }) {
    const isAssociate = userProfile?.roles === "Sales Associate" || userProfile?.roles === "Sale Associate";
    const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
    const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>("all")
    const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all" | "custom">("month")
    const [customStart, setCustomStart] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [customEnd, setCustomEnd] = useState<string>(dayjs().format('YYYY-MM-DD'))
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState<ActivityMetrics>({
        totalLeadsAssigned: 0,
        totalCallsMade: 0,
        totalSalesClosed: 0,
        completedFollowups: 0,
        missedFollowups: 0,
        conversionRate: 0
    })
    const [stageDistribution, setStageDistribution] = useState<ChartData[]>([])
    const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const [salesPersonStats, setSalesPersonStats] = useState<any[]>([])
    const [revenueMetrics, setRevenueMetrics] = useState({
        totalRevenue: 0,
        averageDeal: 0,
        resumeSales: 0,
        portfolioSales: 0,
        linkedinSales: 0,
        githubSales: 0
    })
    const [productDistribution, setProductDistribution] = useState<ChartData[]>([])
    const [salesLog, setSalesLog] = useState<any[]>([])
    const [leadsWithHistory, setLeadsWithHistory] = useState<any[]>([])

    // Use a ref to track the latest request to prevent race conditions
    const lastRequestRef = useRef<number>(0)

    useEffect(() => {
        fetchSalesPersons()
    }, [])

    useEffect(() => {
        if (isAssociate && userProfile?.full_name && selectedSalesPerson === "all") {
            setSelectedSalesPerson(userProfile.full_name);
        }
    }, [userProfile, isAssociate])

    useEffect(() => {
        // Only fetch if we have a valid selection (either "all" for admins or a specific name for associates)
        if (isAssociate && selectedSalesPerson === "all") return;

        const requestId = Date.now()
        lastRequestRef.current = requestId

        fetchDashboardData(requestId)
    }, [selectedSalesPerson, dateRange, customStart, customEnd, isAssociate])

    const fetchSalesPersons = async () => {
        const { data, error } = await supabase
            .from("profiles")
            .select("full_name, user_email")
            .in("roles", ["Sales Associate", "Sale Associate", "Sales"])

        if (error) console.error("Error fetching salespersons:", error)
        else setSalesPersons(data || [])
    }

    const fetchDashboardData = async (reqId?: number) => {
        try {
            setLoading(true)
            const now = dayjs()
            let startOfRange = now.hour(20).minute(0).second(0)
            let endOfRange = now.add(1, 'day').hour(8).minute(0).second(0)

            if (dateRange === "today") {
                // If it's currently during a shift (before 8 AM), show the shift that started yesterday
                // If it's before 8 PM today, show the shift that started yesterday as well (last completed/current)
                const currentHour = now.hour();
                const shiftDate = currentHour < 20 ? now.subtract(1, 'day') : now;
                startOfRange = shiftDate.hour(20).minute(0).second(0)
                endOfRange = shiftDate.add(1, 'day').hour(8).minute(0).second(0)
            } else if (dateRange === "week") {
                startOfRange = now.startOf("week").hour(20).minute(0).second(0)
                endOfRange = now.endOf("week").add(1, 'day').hour(8).minute(0).second(0)
            } else if (dateRange === "month") {
                startOfRange = now.startOf("month").hour(20).minute(0).second(0)
                endOfRange = now.endOf("month").add(1, 'day').hour(8).minute(0).second(0)
            } else if (dateRange === "all") {
                startOfRange = now.subtract(10, 'year')
                endOfRange = now.add(1, 'year')
            } else if (dateRange === "custom") {
                startOfRange = dayjs(customStart).hour(20).minute(0).second(0)
                endOfRange = dayjs(customEnd).add(1, 'day').hour(8).minute(0).second(0)
            }

            const startISO = startOfRange.toISOString()
            const endISO = endOfRange.toISOString()

            // Helper to determine if a timestamp belongs to a specific shift date, and if it's within 8PM-8AM mapping
            const getShiftDate = (ts: any) => {
                const d = dayjs(ts);
                const h = d.hour();
                if (h < 8) return d.subtract(1, 'day').format('YYYY-MM-DD');
                if (h >= 20) return d.format('YYYY-MM-DD');
                return null; // Ignore data between 8AM and 8PM
            };

            // 1. Fetch Assignments (Ownership) - NO DATE FILTER FOR BASE OWNERSHIP
            let assignmentsQuery = supabase.from("leads").select("business_id, assigned_to, assigned_at, current_stage, name")
            if (selectedSalesPerson !== "all") {
                assignmentsQuery = assignmentsQuery.eq("assigned_to", selectedSalesPerson)
            }
            const { data: allAssignedLeads, error: assignErr } = await assignmentsQuery
            if (assignErr) throw assignErr;
            const myLeadIds = allAssignedLeads?.map(l => l.business_id) || []

            // 2. Fetch Sales Closures
            let salesQuery = supabase.from("sales_closure").select("*")
            if (selectedSalesPerson !== "all") {
                if (myLeadIds.length > 0) {
                    salesQuery = salesQuery.in("lead_id", myLeadIds)
                } else {
                    salesQuery = salesQuery.eq("lead_id", "NON_EXISTENT_ID")
                }
            }
            if (dateRange !== "all") {
                // Use ISO for precise 8PM-8AM filtering
                salesQuery = salesQuery.gte("closed_at", startISO).lte("closed_at", endISO)
            }
            const { data: rawSales, error: salesErr } = await salesQuery
            if (salesErr) throw salesErr;
            // Filter out sales that happen between 8 AM and 8 PM
            const salesData = (rawSales || []).filter(s => getShiftDate(s.closed_at) !== null);

            // 3. Fetch calls
            let callsQuery = supabase.from("call_history").select("*")
            if (selectedSalesPerson !== "all") {
                callsQuery = callsQuery.eq("assigned_to", selectedSalesPerson)
            }
            if (dateRange !== "all") {
                callsQuery = callsQuery.gte("call_started_at", startISO).lte("call_started_at", endISO)
            }
            const { data: rawCalls, error: callsErr } = await callsQuery
            if (callsErr) throw callsErr;
            // Filter out calls that happen between 8 AM and 8 PM
            const callsData = (rawCalls || []).filter(c => getShiftDate(c.call_started_at) !== null);

            // If this request is stale (a newer one has started), stop here
            if (reqId && reqId !== lastRequestRef.current) return;

            // 4. GET COMPLETE LEAD CONTEXT (Metadata for UI)
            // We need metadata for every lead the person:
            // - Has assigned to them (and assigned in the period)
            // - Made a call to
            // - Closed a sale for
            const periodLeads = (allAssignedLeads || []).filter(l => {
                if (dateRange === "all") return true;
                const shiftDate = getShiftDate(l.assigned_at);
                if (!shiftDate) return false;
                const d = dayjs(l.assigned_at);
                return d.isAfter(startOfRange) && d.isBefore(endOfRange);
            });

            const touchedLeadIds = new Set([
                ...periodLeads.map(l => l.business_id),
                ...(callsData || []).map(c => c.lead_id),
                ...(salesData || []).map(s => s.lead_id)
            ].filter(Boolean))

            let leadsData: any[] = []
            if (touchedLeadIds.size > 0) {
                const { data: allTouchedLeads } = await supabase
                    .from("leads")
                    .select("*")
                    .in("business_id", Array.from(touchedLeadIds))
                leadsData = allTouchedLeads || []
            }

            // Calculate Metrics
            const totalRev = salesData?.reduce((acc, s) => acc + (Number(s.sale_value) || 0), 0) || 0
            const avgRev = salesData?.length ? totalRev / salesData.length : 0
            const resSales = salesData?.filter(s => Number(s.resume_sale_value) > 0).length || 0
            const portSales = salesData?.filter(s => Number(s.portfolio_sale_value) > 0).length || 0
            const linkSales = salesData?.filter(s => Number(s.linkedin_sale_value) > 0).length || 0
            const gitSales = salesData?.filter(s => Number(s.github_sale_value) > 0).length || 0

            setRevenueMetrics({
                totalRevenue: Math.round(totalRev),
                averageDeal: Math.round(avgRev),
                resumeSales: resSales,
                portfolioSales: portSales,
                linkedinSales: linkSales,
                githubSales: gitSales
            })

            setProductDistribution([
                { name: "Resume", value: resSales },
                { name: "Portfolio", value: portSales },
                { name: "LinkedIn", value: linkSales },
                { name: "GitHub", value: gitSales },
                { name: "Base Sub", value: (salesData?.length || 0) }
            ])

            setSalesLog(salesData || [])

            // Follow-up logic
            const businessIds = leadsData?.map(l => l.business_id) || []
            const { data: followupsHistory } = await supabase
                .from("call_history")
                .select("lead_id, followup_date")
                .in("lead_id", businessIds)
                .order("id", { ascending: false })

            const latestFUMap = new Map<string, string>()
            followupsHistory?.forEach(fh => {
                if (!latestFUMap.has(fh.lead_id) && fh.followup_date) {
                    latestFUMap.set(fh.lead_id, fh.followup_date)
                }
            })

            let missedCount = 0
            leadsData?.forEach(l => {
                const lastFU = latestFUMap.get(l.business_id)
                if (lastFU && lastFU !== "N/A" && dayjs(lastFU).isBefore(dayjs(), 'day')) {
                    if (l.current_stage !== "sale done" && l.current_stage !== "Not Interested") {
                        missedCount++
                    }
                }
            })

            setMetrics({
                totalLeadsAssigned: leadsData?.length || 0,
                totalCallsMade: callsData?.length || 0,
                totalSalesClosed: salesData?.length || 0, // Using actual closure table for total sales
                completedFollowups: callsData?.length || 0,
                missedFollowups: missedCount,
                conversionRate: leadsData?.length ? Math.round(((salesData?.length || 0) / leadsData.length) * 100) : 0
            })

            // 5. Data Aggregation (Stats Map)
            const statsMap = new Map<string, SalesPersonStats>()
            const emailToNameMap = new Map<string, string>()

            salesPersons.forEach(sp => {
                const initialStats: SalesPersonStats = {
                    name: sp.full_name,
                    leads: 0,
                    calls: 0,
                    sales: 0,
                    revenue: 0,
                    followups: 0,
                    assignments: 0
                }
                statsMap.set(sp.full_name, initialStats)
                if (sp.user_email) {
                    emailToNameMap.set(sp.user_email.toLowerCase(), sp.full_name)
                    // Also seed statsMap with email for direct lookup
                    statsMap.set(sp.user_email.toLowerCase(), initialStats)
                }
            })

            // Helper to get stats entry by name or email
            const getEntry = (identifier: string) => {
                if (!identifier) return null
                const cleanId = identifier.trim().toLowerCase()
                return statsMap.get(cleanId) || statsMap.get(identifier.trim()) || null
            }

            periodLeads.forEach(l => {
                const entry = getEntry(l.assigned_to)
                if (entry) {
                    entry.leads++
                    entry.assignments++
                }
            })

            callsData?.forEach(c => {
                const entry = getEntry(c.assigned_to)
                if (entry) entry.calls++
            })

            salesData?.forEach(s => {
                // Try to find the lead owner for this sale
                const leadInfo = leadsData.find(l => l.business_id === s.lead_id);
                const owner = leadInfo?.assigned_to || s.associates_name;

                const entry = getEntry(owner)
                if (entry) {
                    entry.sales++
                    entry.revenue += (Number(s.sale_value) || 0)
                }
            })

            // Only update salesperson leaderboard if viewing "all"
            if (selectedSalesPerson === "all") {
                setSalesPersonStats(Array.from(new Set(statsMap.values())).sort((a, b) => b.revenue - a.revenue))
            }
            // Charts
            const stages: Record<string, number> = {}
            leadsData?.forEach(l => {
                stages[l.current_stage] = (stages[l.current_stage] || 0) + 1
            })
            setStageDistribution(Object.entries(stages).map(([name, value]) => ({ name, value })))

            const last14Days = Array.from({ length: 14 }).map((_, i) => dayjs().subtract(i, "day").format("YYYY-MM-DD")).reverse()
            setDailyActivity(last14Days.map(date => ({
                date: dayjs(date).format("MMM DD"),
                calls: callsData?.filter(c => getShiftDate(c.call_started_at) === date).length || 0,
                assignments: leadsData?.filter(l => getShiftDate(l.assigned_at) === date).length || 0
            })))

            setRecentActivities([
                ...(callsData || []).map(c => ({ type: "call", date: c.call_started_at, lead_id: c.lead_id, notes: c.notes, assigned_to: c.assigned_to })),
                ...(leadsData || []).map(l => ({ type: "assignment", date: l.assigned_at, lead_id: l.business_id, notes: `Assigned to ${l.assigned_to}`, assigned_to: l.assigned_to })),
                ...(salesData || []).map(s => ({ type: "sale", date: s.closed_at, lead_id: s.lead_id, notes: `SALE CLOSED: $${s.sale_value}`, assigned_to: s.associates_name }))
            ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()).slice(0, selectedSalesPerson === "all" ? 10 : 100))

            // 5. FETCH LIFETIME SALES HISTORY FOR THESE LEADS (Ignore date filter for Intelligence Box)
            let fullSalesHistory: any[] = []
            if (touchedLeadIds.size > 0) {
                const { data: bh } = await supabase
                    .from("sales_closure")
                    .select("*")
                    .in("lead_id", Array.from(touchedLeadIds))
                fullSalesHistory = bh || []
            }

            // Lead-specific intelligence grouping (using Lifetime History)
            const combinedLeads = (leadsData || []).map(lead => {
                const leadCalls = (callsData || []).filter(c => c.lead_id === lead.business_id)
                    .sort((a, b) => dayjs(b.call_started_at).valueOf() - dayjs(a.call_started_at).valueOf());

                const leadSales = (fullSalesHistory || []).filter(s => s.lead_id === lead.business_id)
                    .sort((a, b) => dayjs(b.closed_at).valueOf() - dayjs(a.closed_at).valueOf());

                const totalLeadValue = leadSales.reduce((acc, s) => acc + (Number(s.sale_value) || 0), 0);

                return {
                    ...lead,
                    history: leadCalls,
                    purchases: leadSales,
                    totalRevenue: totalLeadValue
                };
            }).sort((a, b) => b.totalRevenue - a.totalRevenue);

            setLeadsWithHistory(combinedLeads);

        } catch (err) {
            console.error("Fetch Error:", err)
        } finally {
            setLoading(false)
        }
    }

    const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"]

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filters Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold">Sales Activity Overview</h2>
                        <p className="text-sm text-gray-500">Tracking performance for {selectedSalesPerson === "all" ? "Whole Team" : selectedSalesPerson}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {!isAssociate && (
                        <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
                            <SelectTrigger className="w-[180px]">
                                <Users className="w-4 h-4 mr-2 text-gray-400" />
                                <SelectValue placeholder="Salesperson" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Team View</SelectItem>
                                {salesPersons.map(sp => <SelectItem key={sp.user_email} value={sp.full_name}>{sp.full_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                        <SelectTrigger className="w-[140px]">
                            <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>

                    {dateRange === "custom" && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                            <Input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="w-[160px] h-9 text-xs px-2"
                            />
                            <span className="text-gray-400 font-medium">to</span>
                            <Input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-[160px] h-9 text-xs px-2"
                            />
                        </div>
                    )}

                    <Button variant="outline" size="icon" onClick={() => fetchDashboardData()} disabled={loading}>
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* CEO Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SmallMetric title="Target Leads" value={metrics.totalLeadsAssigned} icon={<Users className="w-4 h-4" />} color="blue" />
                <SmallMetric title="Call Intensity" value={metrics.totalCallsMade} icon={<PhoneCall className="w-4 h-4" />} color="green" />
                <SmallMetric title="Conversion" value={`${metrics.conversionRate}%`} icon={<TrendingUp className="w-4 h-4" />} color="purple" />
                <SmallMetric title="Missed Followups" value={metrics.missedFollowups} icon={<AlertCircle className="w-4 h-4" />} color="red" critical={metrics.missedFollowups > 0} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SmallMetric title="Total Revenue" value={`$${revenueMetrics.totalRevenue}`} icon={<TrendingUp className="w-4 h-4" />} color="green" />
                <SmallMetric title="Avg Deal Value" value={`$${revenueMetrics.averageDeal}`} icon={<RefreshCcw className="w-4 h-4" />} color="blue" />
                <SmallMetric title="Sales Closed" value={metrics.totalSalesClosed} icon={<CheckCircle2 className="w-4 h-4" />} color="purple" />
                <SmallMetric title="Add-on Uptake" value={revenueMetrics.resumeSales + revenueMetrics.portfolioSales} icon={<PieChartIcon className="w-4 h-4" />} color="blue" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <Card className="lg:col-span-2 border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-gray-400" /> Interaction vs Assignments (Last 14 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            {loading ? <Skeleton className="h-full w-full" /> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyActivity}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="calls" name="Calls" fill="#10b981" radius={[4, 4, 0, 0]} barSize={15} />
                                        <Bar dataKey="assignments" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={15} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Product Distribution Table (Formerly Pie Chart) */}
                <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <ListOrdered className="w-4 h-4 text-gray-400" /> Revenue Source Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-[10px] h-8">Product</TableHead>
                                    <TableHead className="text-right text-[10px] h-8">Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productDistribution.map((item, i) => (
                                    <TableRow key={i} className="h-8 hover:bg-gray-50/50">
                                        <TableCell className="py-1 flex items-center gap-2 text-xs font-medium">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                            {item.name}
                                        </TableCell>
                                        <TableCell className="text-right py-1 text-xs font-bold text-gray-700">
                                            {item.value}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="h-8 bg-gray-50/30">
                                    <TableCell className="py-1 text-xs font-black uppercase text-gray-400">Total Units</TableCell>
                                    <TableCell className="text-right py-1 text-xs font-black text-blue-600">
                                        {productDistribution.reduce((acc, curr) => acc + curr.value, 0)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {selectedSalesPerson === "all" && (
                <Card className="border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Leaderboard: Revenue & Conversion</CardTitle>
                        <CardDescription>A-Z view of team performance sorted by revenue</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50">
                                    <TableHead>Sales Person</TableHead>
                                    <TableHead className="text-center">Leads</TableHead>
                                    <TableHead className="text-center">Calls</TableHead>
                                    <TableHead className="text-center">Sales</TableHead>
                                    <TableHead className="text-center">Revenue</TableHead>
                                    <TableHead className="text-center text-red-600">Missed FU</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                                    salesPersonStats.map((stat: any) => (
                                        <TableRow key={stat.name} className="hover:bg-gray-50">
                                            <TableCell className="font-semibold">{stat.name}</TableCell>
                                            <TableCell className="text-center">{stat.leads}</TableCell>
                                            <TableCell className="text-center text-green-600 font-medium">{stat.calls}</TableCell>
                                            <TableCell className="text-center text-purple-600 font-bold">{stat.sales}</TableCell>
                                            <TableCell className="text-center text-blue-600 font-black">${Math.round(stat.revenue)}</TableCell>
                                            <TableCell className="text-center text-red-600">{stat.missed}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="link" size="sm" onClick={() => setSelectedSalesPerson(stat.name)}>See Profile</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                }
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {selectedSalesPerson !== "all" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
                        <CardHeader>
                            <CardTitle>Strategic Summary: {selectedSalesPerson}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-6">
                                <div>
                                    <p className="text-5xl font-black text-blue-600">{metrics.conversionRate}%</p>
                                    <p className="text-sm font-medium text-blue-800/60 uppercase tracking-widest mt-1">Lead Conversion</p>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-500">
                                        <span>Pipeline Efficiency</span>
                                        <span>{metrics.totalCallsMade > 0 ? Math.round((metrics.totalCallsMade / (metrics.totalCallsMade + metrics.missedFollowups)) * 100) : 0}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white rounded-full overflow-hidden border">
                                        <div className="h-full bg-blue-500" style={{ width: `${metrics.totalCallsMade > 0 ? (metrics.totalCallsMade / (metrics.totalCallsMade + metrics.missedFollowups)) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
                        <CardHeader>
                            <CardTitle>Financial Impact</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-4xl font-black text-green-600">${revenueMetrics.totalRevenue}</p>
                                    <p className="text-xs font-bold text-green-800/60 uppercase">Total Revenue Generated</p>
                                </div>
                                <div className="text-right border-l pl-6 border-green-200">
                                    <p className="text-lg font-bold">${revenueMetrics.averageDeal}</p>
                                    <p className="text-[10px] text-gray-500 uppercase">Avg. Ticket Size</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Lead Intelligence & Strategic History Accordion Section - UNIFIED BOX */}
            <Card className="border shadow-sm overflow-hidden mt-6">
                <CardHeader className="bg-gray-50/50 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ListOrdered className="w-5 h-5 text-blue-500" /> Lead Intelligence & Strategic History
                    </CardTitle>
                    <CardDescription>Deep dive into every lead's call history and purchase value</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {leadsWithHistory.slice(0, 50).map((lead, idx) => (
                                <AccordionItem key={lead.business_id} value={lead.business_id} className="border-b last:border-0">
                                    <AccordionTrigger className="hover:no-underline px-6 py-4 hover:bg-gray-50/80 transition-all">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between w-full text-left gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${lead.totalRevenue > 0 ? 'bg-green-500' : 'bg-blue-400'}`}>
                                                    {lead.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 leading-tight">{lead.name}</p>
                                                    <p className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1">
                                                        ID: {lead.business_id}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8 pr-4">
                                                <div className="text-center">
                                                    <p className="text-[10px] text-gray-400 uppercase font-black">Interactions</p>
                                                    <p className="text-sm font-bold text-gray-700">{lead.history.length}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-gray-400 uppercase font-black">Total Value</p>
                                                    <p className={`text-sm font-black ${lead.totalRevenue > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                        ${Math.round(lead.totalRevenue)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="bg-gray-50/30 px-6 pb-6 pt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Call History */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 mb-4">
                                                    <PhoneCall className="w-3 h-3" /> interaction Log
                                                </h4>
                                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                                    {lead.history.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic py-4">No calls recorded for this lead.</p>
                                                    ) : (
                                                        lead.history.map((call: any, ci: number) => (
                                                            <div key={ci} className="bg-white p-3 rounded-lg border shadow-sm">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <Badge variant="secondary" className="text-[10px] h-4">{call.current_stage}</Badge>
                                                                    <span className="text-[10px] text-gray-400">{dayjs(call.call_started_at).format("MMM DD, HH:mm")}</span>
                                                                </div>
                                                                <p className="text-xs text-gray-600 line-clamp-2">"{call.notes}"</p>
                                                                <p className="text-[9px] text-gray-400 mt-1">Agent: {call.assigned_to}</p>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            {/* Purchased Items */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 mb-4">
                                                    <Package className="w-3 h-3" /> Purchased Services
                                                </h4>
                                                <div className="space-y-2">
                                                    {lead.purchases.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic py-4">No purchases recorded yet.</p>
                                                    ) : (
                                                        lead.purchases.map((sale: any, si: number) => (
                                                            <div key={si} className="bg-white p-3 rounded-lg border-l-4 border-l-green-500 shadow-sm">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <p className="text-xs font-bold font-mono text-green-700">${sale.sale_value}</p>
                                                                    <span className="text-[10px] text-gray-400 font-medium">{dayjs(sale.closed_at).format("MMM DD, YYYY")}</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {Number(sale.resume_sale_value) > 0 && <Badge variant="outline" className="text-[9px] bg-blue-50 border-blue-100">Resume</Badge>}
                                                                    {Number(sale.portfolio_sale_value) > 0 && <Badge variant="outline" className="text-[9px] bg-green-50 border-green-100">Portfolio</Badge>}
                                                                    {Number(sale.linkedin_sale_value) > 0 && <Badge variant="outline" className="text-[9px] bg-purple-50 border-purple-100">LinkedIn</Badge>}
                                                                    {Number(sale.github_sale_value) > 0 && <Badge variant="outline" className="text-[9px] bg-slate-50 border-slate-100">GitHub</Badge>}
                                                                    {Number(sale.courses_sale_value) > 0 && <Badge variant="outline" className="text-[9px] bg-orange-50 border-orange-100">Course</Badge>}
                                                                    {Number(sale.job_board_value) > 0 && <Badge variant="outline" className="text-[9px] bg-red-50 border-red-100">Job Board</Badge>}
                                                                    <Badge variant="secondary" className="text-[9px]">{sale.payment_mode}</Badge>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function SmallMetric({ title, value, icon, color, critical }: any) {
    const themes: any = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-green-50 text-green-600 border-green-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        red: "bg-red-50 text-red-600 border-red-100",
    }
    return (
        <Card className="shadow-none border p-4 flex items-center gap-4">
            <div className={`p-2 rounded-lg ${themes[color]}`}>{icon}</div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                <div className="flex items-center gap-2">
                    <p className="text-xl font-bold">{value}</p>
                    {critical && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>}
                </div>
            </div>
        </Card>
    )
}