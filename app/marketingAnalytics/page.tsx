"use client";

import { useEffect, useState, useContext, useMemo, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MarketingCharts } from "./MarketingCharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/utils/supabase/client";
import { LoadingContext } from "@/components/providers/LoadingContext";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Search,
    Filter,
    Calendar,
    Users,
    Target,
    CheckCircle,
    XCircle,
    MessageCircle,
    AlertCircle,
    RefreshCw,
    TrendingUp,
    UserPlus,
    Trash2,
    Flame
} from "lucide-react";

dayjs.extend(isBetween);

interface Lead {
    id: string;
    business_id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    source: string;
    status: string;
    current_stage: string;
    created_at: string;
    assigned_to: string | null;
    assigned_at: string | null;
    extra_data: any;
}

export default function MarketingAnalyticsPage() {
    const { loading, setLoading } = useContext(LoadingContext);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [sources, setSources] = useState<{ name: string; total: number; sales: number }[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [stageFilter, setStageFilter] = useState<string>("all");
    const [scoreFilter, setScoreFilter] = useState<string>("all");
    const [salesPersonFilter, setSalesPersonFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [salesTeamMembers, setSalesTeamMembers] = useState<{ id: string; full_name: string; user_email?: string }[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
    const [selectedSalesMember, setSelectedSalesMember] = useState<string | null>(null);
    const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
    const [performanceRange, setPerformanceRange] = useState<string>("30");
    const [salesPerformances, setSalesPerformances] = useState<Record<string, {
        conversionRate: number;
        avgSaleValue: number;
        leadsAssigned: number;
        salesDone: number;
        revenue: number;
    }>>({});

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(50);
    const [totalLeadsCount, setTotalLeadsCount] = useState(0);
    const [saleDoneCount, setSaleDoneCount] = useState(0);
    const [prospectCount, setProspectCount] = useState(0);
    const [targetCount, setTargetCount] = useState(0);
    const [score90Count, setScore90Count] = useState(0);
    const [score60Count, setScore60Count] = useState(0);
    const [outOfTgCount, setOutOfTgCount] = useState(0);

    // —— Hot Leads States ——
    const [hotSources, setHotSources] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hotSources');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const isHotLead = useCallback((lead: Lead) => {
        if (!lead.source || !hotSources.includes(lead.source)) return false;
        const leadDate = dayjs(lead.created_at);
        const ageInDays = dayjs().diff(leadDate, 'day');
        return ageInDays >= 0 && ageInDays <= 3;
    }, [hotSources]);

    const toggleHotSource = (source: string) => {
        setHotSources(prev => {
            const next = prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source];
            localStorage.setItem('hotSources', JSON.stringify(next));
            return next;
        });
    };

    const [showHotSourcesDialog, setShowHotSourcesDialog] = useState(false);
    const [dnpCount, setDnpCount] = useState(0);
    const [convDoneCount, setConvDoneCount] = useState(0);
    const [chartDataState, setChartDataState] = useState<{ sourceData: any[]; trendData: any[] }>({
        sourceData: [],
        trendData: []
    });


    useEffect(() => {
        if (bulkAssignDialogOpen) {
            fetchSalesPerformance();
        }
    }, [bulkAssignDialogOpen, performanceRange]);

    const fetchSalesPerformance = async () => {
        try {
            let dateFilter = dayjs().subtract(parseInt(performanceRange), 'day').startOf('day').toISOString();
            if (performanceRange === "all") dateFilter = dayjs('2000-01-01').toISOString();
            if (performanceRange === "custom") {
                dateFilter = startDate ? dayjs(startDate).toISOString() : dayjs().subtract(30, 'day').toISOString();
            }

            const endDateFilter = (performanceRange === "custom" && endDate)
                ? dayjs(endDate).endOf('day').toISOString()
                : dayjs().toISOString();

            // 1. Fetch leads assigned in the period
            const { data: leadsData, error: leadsError } = await supabase
                .from("leads")
                .select("assigned_to, assigned_to_email, assigned_at")
                .not("assigned_to", "is", null)
                .gte("assigned_at", dateFilter)
                .lte("assigned_at", endDateFilter);

            if (leadsError) throw leadsError;

            // 2. Fetch sales done in the period
            const { data: salesData, error: salesError } = await supabase
                .from("sales_closure")
                .select("account_assigned_name, account_assigned_email, associates_name, associates_email, sale_value, closed_at")
                .gte("closed_at", dateFilter)
                .lte("closed_at", endDateFilter);

            if (salesError) throw salesError;

            const performances: Record<string, any> = {};

            salesTeamMembers.forEach(member => {
                const mName = (member.full_name || "").toLowerCase().trim();
                const mEmail = (member.user_email || "").toLowerCase().trim();

                let assignedCount = 0;
                let salesCount = 0;
                let revenue = 0;

                // Match leads
                leadsData.forEach(lead => {
                    const lName = (lead.assigned_to || "").toLowerCase().trim();
                    const lEmail = (lead.assigned_to_email || "").toLowerCase().trim();

                    if ((mEmail && lEmail === mEmail) || (lName && lName === mName)) {
                        assignedCount++;
                    }
                });

                // Match sales
                salesData.forEach(sale => {
                    const sName1 = (sale.account_assigned_name || "").toLowerCase().trim();
                    const sEmail1 = (sale.account_assigned_email || "").toLowerCase().trim();
                    const sName2 = (sale.associates_name || "").toLowerCase().trim();
                    const sEmail2 = (sale.associates_email || "").toLowerCase().trim();

                    const matches = (mEmail && (sEmail1 === mEmail || sEmail2 === mEmail)) ||
                        (mName && (sName1 === mName || sName2 === mName));

                    if (matches) {
                        salesCount++;
                        revenue += (sale.sale_value || 0);
                    }
                });

                performances[member.full_name] = {
                    leadsAssigned: assignedCount,
                    salesDone: salesCount,
                    revenue: revenue,
                    conversionRate: assignedCount > 0 ? parseFloat(((salesCount / assignedCount) * 100).toFixed(1)) : 0,
                    avgSaleValue: salesCount > 0 ? Math.round(revenue / salesCount) : 0
                };
            });

            setSalesPerformances(performances);
        } catch (err) {
            console.error("Error fetching sales performance:", err);
        }
    };

    useEffect(() => {
        fetchUniqueSources();
        fetchSalesTeamMembers();
    }, []);

    useEffect(() => {
        fetchLeads(currentPage);
    }, [currentPage]);

    // Reset to page 1 when filters or search change
    useEffect(() => {
        if (currentPage === 1) {
            fetchLeads(1);
        } else {
            setCurrentPage(1);
        }
    }, [selectedSources, startDate, endDate, statusFilter, stageFilter, scoreFilter, salesPersonFilter, searchQuery]);

    const fetchSalesTeamMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('auth_id, full_name, user_email')
                .or('roles.eq.Sales,roles.eq.Sales Associate,roles.eq.Sales Head')
                .eq('is_active', 'true');

            if (error) throw error;

            const formatted = data.map(p => ({
                id: p.auth_id,
                full_name: p.full_name,
                user_email: p.user_email
            })).sort((a, b) => a.full_name.localeCompare(b.full_name));

            setSalesTeamMembers(formatted);
        } catch (err) {
            console.error("Error fetching sales team:", err);
        }
    };


    const fetchUniqueSources = async () => {
        try {
            const { data, error } = await supabase
                .from("leads")
                .select("source")
                .order("source")
                .limit(10000); // Increased limit to capture all potential sources

            if (error) throw error;

            const uniqueSourceNames = Array.from(new Set((data || []).map(item => item.source).filter(Boolean))) as string[];
            setSources(uniqueSourceNames.map(name => ({ name, total: 0, sales: 0 })));
        } catch (err) {
            console.error("Error fetching sources:", err);
        }
    };

    const fetchLeads = async (page: number = currentPage) => {
        setLoading(true);
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from("leads")
                .select("*", { count: "exact" })
                .order("created_at", { ascending: false });

            // Base filters for counts
            const applyFilters = (q: any, skipSource: boolean = false) => {
                let filteredQ = q;
                if (!skipSource && selectedSources.length > 0) {
                    filteredQ = filteredQ.in("source", selectedSources);
                }
                if (startDate && endDate) {
                    const startISO = dayjs(startDate).startOf("day").toISOString();
                    const endISO = dayjs(endDate).endOf("day").toISOString();
                    filteredQ = filteredQ.gte("created_at", startISO).lte("created_at", endISO);
                }
                if (statusFilter !== "all") {
                    filteredQ = filteredQ.eq("status", statusFilter);
                }
                if (stageFilter !== "all") {
                    filteredQ = filteredQ.eq("current_stage", stageFilter);
                }
                if (scoreFilter !== "all") {
                    filteredQ = filteredQ.or(`extra_data->>probability_score.eq.${scoreFilter},extra_data->Form1->>probability_score.eq.${scoreFilter},extra_data->Form2->>probability_score.eq.${scoreFilter}`);
                }
                if (salesPersonFilter !== "all") {
                    filteredQ = filteredQ.eq("assigned_to", salesPersonFilter);
                }
                if (searchQuery) {
                    filteredQ = filteredQ.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,business_id.ilike.%${searchQuery}%`);
                }
                return filteredQ;
            };

            query = applyFilters(query);
            const { data, error, count } = await query.range(from, to);

            if (error) throw error;

            setLeads(data as Lead[] || []);
            setTotalLeadsCount(count || 0);

            // Fetch KPI counts globally (matching active filters)
            const fetchCount = async (stage?: string, score?: string) => {
                let q = supabase.from("leads").select("*", { count: "exact", head: true });
                q = applyFilters(q);
                if (stage) q = q.eq("current_stage", stage);
                if (score) {
                    q = q.or(`extra_data->>probability_score.eq.${score},extra_data->Form1->>probability_score.eq.${score},extra_data->Form2->>probability_score.eq.${score}`);
                }
                const { count: c } = await q;
                return c || 0;
            };

            // Run count queries in parallel for efficiency
            const [
                saleDone,
                prospect,
                target,
                outOfTg,
                s90,
                s60
            ] = await Promise.all([
                fetchCount("sale done"),
                fetchCount("Prospect"),
                fetchCount("Target"),
                fetchCount("Out of TG"),
                fetchCount(undefined, "90"),
                fetchCount(undefined, "60")
            ]);

            setSaleDoneCount(saleDone);
            setProspectCount(prospect);
            setTargetCount(target);
            setOutOfTgCount(outOfTg);
            setScore90Count(s90);
            setScore60Count(s60);

            // Fetch additional counts for stages not in KPIs but needed for Pie Chart
            const [dnp, convDone] = await Promise.all([
                fetchCount("DNP"),
                fetchCount("Conversation Done")
            ]);
            setDnpCount(dnp);
            setConvDoneCount(convDone);

            // Fetch data for Source and Trend charts
            // We fetch the latest 10000 matching leads for visualization to ensure complete data
            // We skip source selection filter here so we can see counts for all available sources
            let chartQuery = supabase.from("leads").select("source, created_at, current_stage");
            chartQuery = applyFilters(chartQuery, true);
            const { data: rawChartData } = await chartQuery.order("created_at", { ascending: false }).limit(10000);

            if (rawChartData) {
                // Secondary In-Memory Filtering for Graphs
                // We keep rawChartData for the Sidebar counts (so all sources show potential totals)
                // but we filter it for the Charts based on user selection
                const filteredChartData = selectedSources.length > 0
                    ? rawChartData.filter(lead => selectedSources.includes(lead.source || "Unknown"))
                    : rawChartData;

                // Aggregating Source Data for Chart (using filtered data)
                const sourceMapForChart: Record<string, { total: number; sales: number }> = {};
                filteredChartData.forEach(lead => {
                    const s = lead.source || "Unknown";
                    if (!sourceMapForChart[s]) sourceMapForChart[s] = { total: 0, sales: 0 };
                    sourceMapForChart[s].total++;
                    if ((lead.current_stage || "").toLowerCase() === "sale done") {
                        sourceMapForChart[s].sales++;
                    }
                });
                const sourceData = Object.entries(sourceMapForChart)
                    .map(([name, counts]) => ({ name, ...counts }))
                    .sort((a, b) => b.total - a.total);

                // Aggregating Trend Data (using filtered data)
                const trendMap: Record<string, number> = {};
                filteredChartData.forEach(lead => {
                    if (!lead.created_at) return;
                    const d = dayjs(lead.created_at);
                    if (!d.isValid()) return;
                    const date = d.format("YYYY-MM-DD");
                    trendMap[date] = (trendMap[date] || 0) + 1;
                });
                const trendData = Object.entries(trendMap)
                    .map(([date, count]) => ({ date, count }))
                    .sort((a, b) => a.date.localeCompare(b.date));

                setChartDataState({ sourceData, trendData });

                // Aggregating Sidebar Counts (using all raw data matching global filters)
                const sourceMapForSidebar: Record<string, { total: number; sales: number }> = {};
                rawChartData.forEach(lead => {
                    const s = lead.source || "Unknown";
                    if (!sourceMapForSidebar[s]) sourceMapForSidebar[s] = { total: 0, sales: 0 };
                    sourceMapForSidebar[s].total++;
                    if ((lead.current_stage || "").toLowerCase() === "sale done") {
                        sourceMapForSidebar[s].sales++;
                    }
                });

                // Update source counts for sidebar
                setSources(prev => {
                    const existingNames = prev.map(s => s.name);
                    const allCurrentNames = Array.from(new Set([
                        ...existingNames,
                        ...Object.keys(sourceMapForSidebar)
                    ])).filter(name => name !== "Unknown");

                    return allCurrentNames.map(name => {
                        const counts = sourceMapForSidebar[name] || { total: 0, sales: 0 };
                        return {
                            name,
                            total: counts.total,
                            sales: counts.sales
                        };
                    });
                });
            }

        } catch (err) {
            console.error("Error fetching leads:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSourceToggle = (sourceName: string) => {
        setSelectedSources(prev =>
            prev.includes(sourceName) ? prev.filter(s => s !== sourceName) : [...prev, sourceName]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedLeads(leads.map(lead => lead.id));
        } else {
            setSelectedLeads([]);
        }
    };

    const handleSelectLead = (leadId: string, checked: boolean) => {
        if (checked) {
            setSelectedLeads(prev => [...prev, leadId]);
        } else {
            setSelectedLeads(prev => prev.filter(id => id !== leadId));
        }
    };

    const handleDeleteLeads = async () => {
        const idsToDelete = leadToDelete ? [leadToDelete] : selectedLeads;
        if (idsToDelete.length === 0) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from("leads")
                .delete()
                .in("id", idsToDelete);

            if (error) throw error;

            setLeads(prev => prev.filter(lead => !idsToDelete.includes(lead.id)));
            setSelectedLeads(prev => prev.filter(id => !idsToDelete.includes(id)));
            setDeleteDialogOpen(false);
            setLeadToDelete(null);
        } catch (err) {
            console.error("Error deleting leads:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedSalesMember || selectedLeads.length === 0) return;

        setLoading(true);
        try {
            const res = await fetch("/api/assign-leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    selectedLeads,
                    assignedTo: selectedSalesMember,
                    assignedAt: new Date().toISOString(),
                }),
            });

            if (!res.ok) throw new Error("Assignment failed");

            setLeads(prev => prev.map(lead =>
                selectedLeads.includes(lead.id)
                    ? { ...lead, status: "Assigned", assigned_to: selectedSalesMember, assigned_at: new Date().toISOString() }
                    : lead
            ));

            setSelectedLeads([]);
            setBulkAssignDialogOpen(false);
            setSelectedSalesMember(null);
        } catch (err) {
            console.error("Bulk assign error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkUnassign = async () => {
        if (selectedLeads.length === 0) return;
        if (!confirm(`Are you sure you want to unassign ${selectedLeads.length} leads?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from("leads")
                .update({
                    status: "New",
                    assigned_to: null,
                    assigned_at: null,
                    assigned_to_email: null
                })
                .in("id", selectedLeads);

            if (error) throw error;

            setLeads(prev => prev.map((lead: Lead) =>
                selectedLeads.includes(lead.id)
                    ? { ...lead, status: "New", assigned_to: null, assigned_at: null } as Lead
                    : lead
            ));

            setSelectedLeads([]);
        } catch (err) {
            console.error("Bulk unassign error:", err);
        } finally {
            setLoading(false);
        }
    };


    const getProbabilityScoreBadge = (extraData: any) => {
        const score = extraData?.probability_score ?? extraData?.Form2?.probability_score ?? extraData?.Form1?.probability_score;
        if (!score) return null;

        let bgColor = "bg-blue-100 text-blue-800";
        if (score === 60 || score === "60") bgColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
        if (score === 90 || score === "90") bgColor = "bg-green-100 text-green-800 border-green-200";

        return (
            <Badge variant="outline" className={`font-bold ${bgColor}`}>
                {score}
            </Badge>
        );
    };

    const getStageBadgeStyles = (stage: string) => {
        const s = (stage || "").toLowerCase();
        switch (s) {
            case "prospect": return "bg-purple-100 text-purple-800 border-purple-200";
            case "target": return "bg-orange-100 text-orange-800 border-orange-200";
            case "dnp": return "bg-red-100 text-red-800 border-red-200";
            case "conversation done": return "bg-teal-100 text-teal-800 border-teal-200";
            case "out of tg": return "bg-slate-100 text-slate-800 border-slate-200";
            case "sale done": return "bg-green-100 text-green-800 border-green-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const stageChartData = useMemo(() => [
        { name: "Prospect", value: prospectCount, color: "hsl(var(--chart-1))" },
        { name: "Target", value: targetCount, color: "hsl(var(--chart-2))" },
        { name: "DNP", value: dnpCount, color: "hsl(var(--chart-3))" },
        { name: "Conversation Done", value: convDoneCount, color: "hsl(var(--chart-4))" },
        { name: "Out of TG", value: outOfTgCount, color: "hsl(var(--chart-5))" },
        { name: "Sale Done", value: saleDoneCount, color: "rgb(34 197 94)" },
    ].filter(d => d.value > 0), [prospectCount, targetCount, dnpCount, convDoneCount, outOfTgCount, saleDoneCount]);

    const sortedLeads = useMemo(() => {
        return [...leads].sort((a, b) => {
            const aHot = isHotLead(a);
            const bHot = isHotLead(b);
            if (aHot && !bHot) return -1;
            if (!aHot && bHot) return 1;
            return 0; // Maintain original creation date order from API
        });
    }, [leads, isHotLead]);

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full gap-4 p-4 lg:flex-row" suppressHydrationWarning>
                {/* Left Sidebar - Sources */}
                <Card className="w-full lg:w-64 h-fit sticky top-4 border-orange-100">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Filter className="w-4 h-4" /> Marketing Sources
                        </CardTitle>
                        <Flame className={`w-4 h-4 ${hotSources.length > 0 ? "text-orange-500 fill-orange-500 animate-pulse" : "text-gray-300"}`} />
                    </CardHeader>
                    <CardContent className="max-h-[75vh] overflow-y-auto space-y-4 p-4 pt-0">
                        {/* Dedicated Hot Bucket Section */}
                        {hotSources.length > 0 && (
                            <div className="bg-orange-50/50 p-2 rounded-lg border border-orange-100 mb-2">
                                <Label className="text-[10px] font-bold text-orange-600 uppercase flex items-center gap-1 mb-2">
                                    <Flame className="w-3 h-3 fill-orange-500" /> Hot Bucket ({hotSources.length})
                                </Label>
                                <div className="flex flex-wrap gap-1">
                                    {hotSources.map(hs => (
                                        <Badge key={hs} variant="outline" className="bg-white text-[10px] border-orange-200 text-orange-700 py-0 h-5 flex items-center gap-1 pr-1">
                                            {hs}
                                            <button
                                                onClick={() => toggleHotSource(hs)}
                                                className="hover:text-red-500 rounded-full hover:bg-red-50 p-0.5"
                                            >
                                                <XCircle className="w-2.5 h-2.5" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">All Sources</Label>
                            {sources.map(source => (
                                <div key={source.name} className="flex items-center space-x-2 w-full group">
                                    <Checkbox
                                        id={`source-${source.name}`}
                                        checked={selectedSources.includes(source.name)}
                                        onCheckedChange={() => handleSourceToggle(source.name)}
                                    />
                                    <label
                                        htmlFor={`source-${source.name}`}
                                        className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 truncate"
                                        title={source.name}
                                    >
                                        {source.name}
                                        <div className="text-[10px] text-muted-foreground">
                                            ({source.total}) - ({source.sales})
                                        </div>
                                    </label>
                                    <button
                                        onClick={(e) => { e.preventDefault(); toggleHotSource(source.name); }}
                                        className={`p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${hotSources.includes(source.name)
                                            ? "text-orange-500 bg-orange-100 shadow-sm border border-orange-200"
                                            : "text-gray-400 opacity-60 hover:opacity-100 hover:text-orange-500 hover:bg-orange-50"
                                            }`}
                                        title={hotSources.includes(source.name) ? "Remove from Hot Bucket" : "Add to Hot Bucket"}
                                    >
                                        <Flame className={`w-3.5 h-3.5 ${hotSources.includes(source.name) ? "fill-orange-500 animate-pulse" : ""}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {sources.length === 0 && <p className="text-xs text-muted-foreground">No sources found.</p>}
                    </CardContent>
                </Card>

                {/* Main Content */}
                <div className="flex-1 space-y-4 overflow-hidden">
                    {/* Header Filters */}
                    <Card>
                        <CardContent className="py-4 flex flex-wrap gap-4 items-end">
                            <div className="space-y-1">
                                <Label className="text-xs">Start Date</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-40"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-40"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="New">New</SelectItem>
                                        <SelectItem value="Assigned">Assigned</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Current Stage</Label>
                                <Select value={stageFilter} onValueChange={setStageFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="All Stages" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Stages</SelectItem>
                                        <SelectItem value="Prospect">Prospect</SelectItem>
                                        <SelectItem value="Target">Target</SelectItem>
                                        <SelectItem value="DNP">DNP</SelectItem>
                                        <SelectItem value="Conversation Done">Conversation Done</SelectItem>
                                        <SelectItem value="Out of TG">Out of TG</SelectItem>
                                        <SelectItem value="sale done">Sale Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Score</Label>
                                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                                    <SelectTrigger className="w-28">
                                        <SelectValue placeholder="All Scores" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Scores</SelectItem>
                                        <SelectItem value="90">90</SelectItem>
                                        <SelectItem value="60">60</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Sales Person</Label>
                                <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter}>
                                    <SelectTrigger className="w-44">
                                        <SelectValue placeholder="All Sales Persons" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sales Persons</SelectItem>
                                        {salesTeamMembers.map(m => (
                                            <SelectItem key={m.id} value={m.full_name}>{m.full_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => fetchLeads(currentPage)}
                                title="Refresh Data"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>

                            {selectedLeads.length > 0 && (
                                <div className="flex gap-2 ml-auto">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                        onClick={() => setBulkAssignDialogOpen(true)}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" /> Assign ({selectedLeads.length})
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                        onClick={handleBulkUnassign}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> Unassign
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            setLeadToDelete(null);
                                            setDeleteDialogOpen(true);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    </Button>
                                </div>
                            )}
                            {/* 
                            <Button
                                variant="outline"
                                onClick={() => setShowHotSourcesDialog(true)}
                                className={`gap-2 ${hotSources.length > 0 ? "border-orange-200 text-orange-600 hover:bg-orange-50" : ""}`}
                            >
                                <Flame className={`w-4 h-4 ${hotSources.length > 0 ? "fill-orange-500 text-orange-500 animate-pulse" : ""}`} />
                                Hot Bucket ({hotSources.length})
                            </Button> */}

                            <Button
                                variant="ghost"
                                className={selectedLeads.length > 0 ? "" : "ml-auto"}
                                onClick={() => {
                                    setStartDate("");
                                    setEndDate("");
                                    setStatusFilter("all");
                                    setStageFilter("all");
                                    setScoreFilter("all");
                                    setSalesPersonFilter("all");
                                    setSelectedSources([]);
                                    setSelectedLeads([]);
                                    setSearchQuery("");
                                    if (searchInputRef.current) searchInputRef.current.value = "";
                                    setCurrentPage(1);
                                }}
                            >
                                Reset
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-2 w-full md:w-[500px]">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Search Name, Email, Phone, or ID..."
                                    className="pl-10"
                                    defaultValue={searchQuery}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            setSearchQuery(e.currentTarget.value);
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    if (searchInputRef.current) {
                                        setSearchQuery(searchInputRef.current.value);
                                    }
                                }}
                                className="gap-2"
                            >
                                <Search className="w-4 h-4" /> Search
                            </Button>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <MarketingCharts
                        stageData={stageChartData}
                        sourceData={chartDataState.sourceData}
                        trendData={chartDataState.trendData}
                        loading={loading}
                    />

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {[
                            { label: "Total Leads", value: `${totalLeadsCount} (${leads.length})`, icon: Users, color: "text-blue-600" },
                            { label: "Sale Done", value: saleDoneCount, icon: CheckCircle, color: "text-green-600" },
                            { label: "Prospects", value: prospectCount, icon: Search, color: "text-purple-600" },
                            { label: "Targets", value: targetCount, icon: Target, color: "text-orange-600" },
                            { label: "Score 90s", value: score90Count, icon: TrendingUp, color: "text-emerald-600" },
                            { label: "Score 60s", value: score60Count, icon: TrendingUp, color: "text-amber-600" },
                            { label: "Out of TG", value: outOfTgCount, icon: AlertCircle, color: "text-gray-600" },
                        ].map((kpi, idx) => (
                            <Card key={idx} className="p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground truncate">{kpi.label}</span>
                                </div>
                                <div className="text-xl font-bold">
                                    {loading ? (
                                        <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                                    ) : (
                                        kpi.value
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Data Table */}
                    <Card className="overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg">Lead Details ({totalLeadsCount} total)</CardTitle>
                                <div className="text-sm text-muted-foreground">
                                    Page {currentPage} of {Math.ceil(totalLeadsCount / pageSize)}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto max-h-[60vh]">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={leads.length > 0 && selectedLeads.length === leads.length}
                                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                />
                                            </TableHead>
                                            <TableHead className="w-[100px] text-sm">s.no</TableHead>
                                            <TableHead className="w-[100px] text-sm">ID</TableHead>
                                            <TableHead className="text-sm">Name</TableHead>
                                            <TableHead className="text-sm">Contact</TableHead>
                                            <TableHead className="text-sm">Location</TableHead>
                                            <TableHead className="text-sm">Date</TableHead>
                                            <TableHead className="text-sm">Source</TableHead>
                                            <TableHead className="text-center text-sm">Score</TableHead>
                                            <TableHead className="text-sm">Status</TableHead>
                                            <TableHead className="text-sm">Stage</TableHead>
                                            <TableHead className="text-sm">Assignment</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array.from({ length: 10 }).map((_, i) => (
                                                <TableRow key={i}>
                                                    {Array.from({ length: 12 }).map((_, j) => (
                                                        <TableCell key={j} className="py-4">
                                                            <div className="h-4 bg-muted animate-pulse rounded" />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        ) : (
                                            sortedLeads.map((lead, index) => (
                                                <TableRow key={lead.id} className={selectedLeads.includes(lead.id) ? "bg-blue-50/50" : ""}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedLeads.includes(lead.id)}
                                                            onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-bold text-slate-900 text-sm">
                                                        {(currentPage - 1) * pageSize + index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{lead.business_id}</TableCell>
                                                    <TableCell className="font-medium whitespace-nowrap text-sm relative group">
                                                        <div className="flex items-center gap-2">
                                                            {lead.name}
                                                            {isHotLead(lead) && (
                                                                <div className="relative">
                                                                    <Flame className="w-4 h-4 text-orange-600 fill-orange-500 animate-hot-float drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs leading-tight">
                                                            <div className="font-medium truncate max-w-[120px]" title={lead.email}>{lead.email}</div>
                                                            <div className="text-muted-foreground">{lead.phone}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{lead.city}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-sm">
                                                        {dayjs(lead.created_at).add(5, 'hour').add(30, 'minute').format("DD MMM, YY")}
                                                        <br />
                                                        <span className="text-xs text-muted-foreground">
                                                            {dayjs(lead.created_at).add(5, 'hour').add(30, 'minute').format("HH:mm")} IST
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{lead.source}</TableCell>
                                                    <TableCell className="text-center">
                                                        {getProbabilityScoreBadge(lead.extra_data)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={lead.status === "Assigned" ? "default" : "secondary"} className="text-xs">
                                                            {lead.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`text-xs whitespace-nowrap ${getStageBadgeStyles(lead.current_stage)}`}>
                                                            {lead.current_stage}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-sm">
                                                        <div className="font-medium text-xs">{lead.assigned_to || "—"}</div>
                                                        {lead.assigned_at && (
                                                            <div className="text-muted-foreground text-[10px]">
                                                                {dayjs(lead.assigned_at).add(5, 'hour').add(30, 'minute').format("DD-MM-YYYY HH:mm")} IST
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => {
                                                                setLeadToDelete(lead.id);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                        {leads.length === 0 && !loading && (
                                            <TableRow>
                                                <TableCell colSpan={11} className="text-center py-20 text-muted-foreground">
                                                    No leads found matching the filters.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <div className="flex items-center justify-between px-4 py-2 border-t text-sm">
                            <div className="text-muted-foreground">
                                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalLeadsCount)} of {totalLeadsCount} records
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-4 font-bold border-2"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1 || loading}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-4 font-bold border-2"
                                    onClick={() => setCurrentPage(prev => (prev * pageSize < totalLeadsCount ? prev + 1 : prev))}
                                    disabled={currentPage * pageSize >= totalLeadsCount || loading}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </Card>
                    {/* Deletion Confirmation Dialog */}
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete {leadToDelete ? "this lead" : `${selectedLeads.length} leads`}? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleDeleteLeads}>Delete</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Bulk Assignment Dialog */}
                    <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-500" />
                                    Assign Leads to Sales Team
                                </DialogTitle>
                                <DialogDescription>
                                    Select a sales team member to assign {selectedLeads.length} leads.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Performance Period</Label>
                                    <Select value={performanceRange} onValueChange={setPerformanceRange}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Select Range" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">Last 7 Days</SelectItem>
                                            <SelectItem value="15">Last 15 Days</SelectItem>
                                            <SelectItem value="30">Last 30 Days</SelectItem>
                                            <SelectItem value="90">Last 90 Days</SelectItem>
                                            <SelectItem value="all">All Time</SelectItem>
                                            <SelectItem value="custom">Use Global Date Filter</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Sales Person</Label>
                                    <Select value={selectedSalesMember || ""} onValueChange={setSelectedSalesMember}>
                                        <SelectTrigger className="h-12">
                                            <SelectValue placeholder="Select sales person" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {salesTeamMembers.map(member => {
                                                const perf = salesPerformances[member.full_name] || { conversionRate: 0, avgSaleValue: 0, leadsAssigned: 0, salesDone: 0 };
                                                return (
                                                    <SelectItem key={member.id} value={member.full_name}>
                                                        <div className="flex flex-col w-full py-2 min-w-[280px]">
                                                            <div className="flex items-center justify-between gap-4 mb-2">
                                                                <span className="text-slate-900 text-base">{member.full_name}</span>
                                                                <div className="flex gap-1">
                                                                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-2 py-0.5">
                                                                        {perf.conversionRate}% CONV
                                                                    </Badge>
                                                                    <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-xs px-2 py-0.5">
                                                                        ${perf.avgSaleValue} AVG
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                                <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded">
                                                                    <Target className="w-3.5 h-3.5 text-slate-900" />
                                                                    <span className="text-slate-900">{perf.leadsAssigned}</span> Leads
                                                                </span>
                                                                <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded">
                                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                                    <span className="text-slate-900">{perf.salesDone}</span> Sales
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Conv. Rate</p>
                                            <p className="text-[9px] text-slate-400 italic">Sales / Assigned</p>
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Avg Sale Value</p>
                                            <p className="text-[9px] text-slate-400 italic">Revenue / Sales</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setBulkAssignDialogOpen(false)}>Cancel</Button>
                                <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={handleBulkAssign}>Assign</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={showHotSourcesDialog} onOpenChange={setShowHotSourcesDialog}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                                    Manage Hot Sources
                                </DialogTitle>
                                <DialogDescription>
                                    Leads from these sources created in the last 3 days will be marked as "Hot" and pinned to the top.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 text-center">
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {sources.map(s => s.name).map(source => (
                                        <Badge
                                            key={source}
                                            variant={hotSources.includes(source) ? "default" : "outline"}
                                            className={`cursor-pointer transition-all hover:scale-105 ${hotSources.includes(source) ? "bg-orange-500 hover:bg-orange-600" : "hover:border-orange-400"}`}
                                            onClick={() => toggleHotSource(source)}
                                        >
                                            {source}
                                            {hotSources.includes(source) && <XCircle className="w-3 h-3 ml-1" />}
                                        </Badge>
                                    ))}
                                </div>
                                {sources.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4 italic">
                                        No sources found to mark as hot.
                                    </p>
                                )}
                            </div>
                            <DialogFooter>
                                <Button onClick={() => setShowHotSourcesDialog(false)} className="w-full">Done</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </div>
            </div>
            <style jsx global>{`
                @keyframes hot-float {
                    0%, 100% { transform: translateY(0) scale(1.0); }
                    50% { transform: translateY(-4px) scale(1.1); }
                }
                .animate-hot-float {
                    animation: hot-float 1.2s ease-in-out infinite;
                }
            `}</style>
        </DashboardLayout>
    );
}


