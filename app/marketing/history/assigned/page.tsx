"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, ArrowLeft, Search, Calendar, Filter, Users, ExternalLink } from "lucide-react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

dayjs.extend(isBetween);

interface Lead {
    id: string;
    name: string;
    phone: string;
    email: string;
    city: string;
    source: string;
    assigned_to: string;
    assigned_at: string;
    created_at: string;
    business_id: string;
}

export default function AssignedLeadsHistoryPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sourceFilter, setSourceFilter] = useState("all");
    const [salesPersonFilter, setSalesPersonFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    
    // For dropdowns
    const [sources, setSources] = useState<string[]>([]);
    const [salesTeam, setSalesTeam] = useState<string[]>([]);

    const fetchDropdownData = async () => {
        try {
            // Get unique sources from assigned leads
            const { data: sourceData } = await supabase
                .from("leads")
                .select("source")
                .eq("status", "Assigned");
            
            const uniqueSources = Array.from(new Set(sourceData?.map(s => s.source).filter(Boolean))) as string[];
            setSources(uniqueSources.sort());

            // Get unique assigned_to members
            const { data: salesData } = await supabase
                .from("leads")
                .select("assigned_to")
                .eq("status", "Assigned");
            
            const uniqueSales = Array.from(new Set(salesData?.map(s => s.assigned_to).filter(Boolean))) as string[];
            setSalesTeam(uniqueSales.sort());
        } catch (err) {
            console.error("Error fetching dropdown data:", err);
        }
    };

    const fetchAssignedLeads = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("leads")
                .select("*")
                .eq("status", "Assigned");

            if (startDate) {
                query = query.gte("assigned_at", dayjs(startDate).startOf('day').toISOString());
            }
            if (endDate) {
                query = query.lte("assigned_at", dayjs(endDate).endOf('day').toISOString());
            }
            if (sourceFilter !== "all") {
                query = query.eq("source", sourceFilter);
            }
            if (salesPersonFilter !== "all") {
                query = query.eq("assigned_to", salesPersonFilter);
            }

            const { data, error } = await query.order("assigned_at", { ascending: false });

            if (error) throw error;
            
            // Client side search for more flexible matching
            let filteredData = data || [];
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                filteredData = filteredData.filter(lead => 
                    lead.name?.toLowerCase().includes(searchLower) ||
                    lead.email?.toLowerCase().includes(searchLower) ||
                    lead.phone?.toLowerCase().includes(searchLower) ||
                    lead.business_id?.toLowerCase().includes(searchLower)
                );
            }

            setLeads(filteredData);
        } catch (err) {
            console.error("Error fetching assigned leads:", err);
            alert("Failed to fetch assigned leads history.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDropdownData();
    }, []);

    useEffect(() => {
        fetchAssignedLeads();
    }, [startDate, endDate, sourceFilter, salesPersonFilter, searchQuery]);

    const renderSource = (source: string) => {
        if (!source) return <span className="text-muted-foreground">—</span>;
        
        let display = source;
        let url = "";

        if (source.includes("|")) {
            const parts = source.split("|");
            display = parts[0];
            url = parts[1];
        } else if (source.startsWith("http://") || source.startsWith("https://") || source.startsWith("www.")) {
            url = source;
            display = "View Source";
        }

        if (url) {
            const trimmedUrl = url.trim();
            const finalUrl = (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) 
                ? trimmedUrl 
                : `https://${trimmedUrl}`;
                
            return (
                <a 
                    href={finalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium"
                >
                    {display} <ExternalLink className="w-3.5 h-3.5" />
                </a>
            );
        }
        
        return source;
    };

    const downloadCSV = () => {
        const csvContent = [
            ["Name", "Phone", "Email", "City", "Source", "Assigned To", "Assigned At", "Created At"],
            ...leads.map((lead) => [
                lead.name,
                lead.phone,
                lead.email,
                lead.city,
                lead.source,
                lead.assigned_to,
                dayjs(lead.assigned_at).format("DD-MM-YYYY HH:mm"),
                dayjs(lead.created_at).format("DD-MM-YYYY HH:mm"),
            ]),
        ]
            .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `assigned_leads_history_${dayjs().format("YYYY-MM-DD")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => window.close()}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Assigned Leads History</h1>
                            <p className="text-sm text-gray-500">A complete log of all leads currently assigned to the team.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchAssignedLeads} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </Button>
                        <Button onClick={downloadCSV} disabled={leads.length === 0}>
                            <Download className="w-4 h-4 mr-2" /> Download CSV
                        </Button>
                    </div>
                </div>

                <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
                    <CardContent className="p-4 flex flex-wrap gap-4 items-end">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Start Date
                            </Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-40 h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> End Date
                            </Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-40 h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold flex items-center gap-1">
                                <Filter className="w-3 h-3" /> Source
                            </Label>
                            <Select value={sourceFilter} onValueChange={setSourceFilter}>
                                <SelectTrigger className="w-40 h-9">
                                    <SelectValue placeholder="All Sources" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sources</SelectItem>
                                    {sources.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold flex items-center gap-1">
                                <Users className="w-3 h-3" /> Assigned To
                            </Label>
                            <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter}>
                                <SelectTrigger className="w-40 h-9">
                                    <SelectValue placeholder="All Team" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Team</SelectItem>
                                    {salesTeam.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-1">
                            <Label className="text-xs font-bold flex items-center gap-1">
                                <Search className="w-3 h-3" /> Search
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Name, email, phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 text-xs"
                            onClick={() => {
                                setStartDate("");
                                setEndDate("");
                                setSourceFilter("all");
                                setSalesPersonFilter("all");
                                setSearchQuery("");
                            }}
                        >
                            Reset
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium rounded-xl overflow-hidden bg-white/70 backdrop-blur-md">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">
                            Total Assigned Leads: {leads.length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                                <p className="text-gray-500 animate-pulse font-medium">Loading history...</p>
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="py-20 text-center text-gray-500">
                                <p className="text-lg font-medium">No assigned leads found.</p>
                                <p className="text-sm">When leads are assigned, they will appear here.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="font-bold">Lead Name</TableHead>
                                            <TableHead className="font-bold">Contact Info</TableHead>
                                            <TableHead className="font-bold">City</TableHead>
                                            <TableHead className="font-bold">Source</TableHead>
                                            <TableHead className="font-bold">Assigned To</TableHead>
                                            <TableHead className="font-bold">Assigned At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leads.map((lead) => (
                                            <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-semibold text-slate-900 line-clamp-1">
                                                    {lead.name}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs">
                                                        <div className="font-medium">{lead.email}</div>
                                                        <div className="text-slate-500">{lead.phone}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{lead.city || "—"}</TableCell>
                                                <TableCell>
                                                    <div className="max-w-[200px] text-xs">
                                                        {renderSource(lead.source)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-blue-600">
                                                    {lead.assigned_to}
                                                </TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {lead.assigned_at ? (
                                                        <>
                                                            {dayjs(lead.assigned_at).format("DD MMM YYYY")}<br/>
                                                            <span className="text-slate-400">{dayjs(lead.assigned_at).format("HH:mm")} IST</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400">Not Recorded</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
