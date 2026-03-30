
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ExternalLink, Calendar, Search, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

interface RenewalRecord {
    lead_id: string;
    lead_name: string;
    email: string;
    onboarded_date: string;
    subscription_cycle: number;
    sale_value: number;
    finance_status: string;
    expiry_date: dayjs.Dayjs;
    days_remaining: number;
    closed_by?: string;
    account_assigned_name?: string;
}

export default function RenewalsView() {
    const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedForecastDay, setSelectedForecastDay] = useState<string | null>(null);
    const [summary, setSummary] = useState<{
        todayCount: number;
        expiredCount: number;
        weekly: { label: string, date: string, count: number, color: string }[];
    }>({ todayCount: 0, expiredCount: 0, weekly: [] });

    const fetchRenewals = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("sales_closure")
                .select("*")
                .not("onboarded_date", "is", null)
                .order("onboarded_date", { ascending: false });

            if (error) throw error;

            // Group by lead_id and take the latest sale_closure for each
            const latestMap = new Map<string, any>();
            (data || []).forEach((row) => {
                if (!latestMap.has(row.lead_id)) {
                    latestMap.set(row.lead_id, row);
                }
            });

            const processed: RenewalRecord[] = Array.from(latestMap.values()).map((row) => {
                const onboarded = dayjs(row.onboarded_date);
                const expiry = onboarded.add(row.subscription_cycle, "day");
                // Use calendar days (start of day) to avoid time-of-day diff discrepancies
                const daysRemaining = expiry.startOf('day').diff(dayjs().startOf('day'), "day");

                return {
                    lead_id: row.lead_id,
                    lead_name: row.lead_name || "Unknown",
                    email: row.email,
                    onboarded_date: row.onboarded_date,
                    subscription_cycle: row.subscription_cycle,
                    sale_value: row.sale_value,
                    finance_status: row.finance_status,
                    expiry_date: expiry,
                    days_remaining: daysRemaining,
                    closed_by: row.closed_by || row.account_assigned_name,
                    account_assigned_name: row.account_assigned_name,
                };
            });

            // Filter for those expiring soon (within 60 days) or already expired (within last 30 days)
            const filtered = processed.filter(r => r.days_remaining <= 60 && r.days_remaining >= -30);
            setRenewals(filtered.sort((a, b) => a.days_remaining - b.days_remaining));

            // GENERATE SUMMARY
            const today = dayjs().startOf('day');
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

            const weeklyBreakdown = Array.from({ length: 7 }).map((_, i) => {
                const targetDay = today.add(i, 'day');
                const count = processed.filter(r => dayjs(r.expiry_date).isSame(targetDay, 'day')).length;
                return {
                    day: i === 0 ? "Today" : targetDay.format("dddd"),
                    count,
                    color: colors[i % colors.length]
                };
            });

            setSummary({
                todayCount: processed.filter(r => r.days_remaining === 0).length,
                expiredCount: processed.filter(r => r.days_remaining < 0).length,
                weekly: weeklyBreakdown.map((wb, idx) => ({
                    label: wb.day,
                    date: today.add(idx, 'day').format("YYYY-MM-DD"),
                    count: wb.count,
                    color: wb.color
                }))
            });
        } catch (err) {
            console.error("Error fetching renewals:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRenewals();
    }, []);

    const filteredRenewals = renewals.filter(r => {
        const matchesSearch = r.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.email.toLowerCase().includes(searchTerm.toLowerCase());

        if (selectedForecastDay) {
            return matchesSearch && dayjs(r.expiry_date).format("YYYY-MM-DD") === selectedForecastDay;
        }

        return matchesSearch;
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                        <RefreshCw className="w-5 h-5 animate-spin-slow" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Active Renewals</h2>
                        <p className="text-xs text-gray-500">Clients whose subscription is ending soon or expired.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search clients..."
                            className="pl-9 w-64 h-9 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchRenewals} className="h-9 gap-2">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </Button>
                </div>
            </div>

            {/* TIGHT HIGH-CONTRAST STATS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch mb-2">

                {/* 1. SEVEN DAY FORECAST STRIP - COMPACT (Spans 3 columns) */}
                <div className="md:col-span-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm p-3.5 flex flex-col justify-between min-h-[110px]">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-100 shadow-sm">
                                <Calendar className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">7-Day Forecast</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedForecastDay && (
                                <button
                                    onClick={() => setSelectedForecastDay(null)}
                                    className="text-[10px] text-blue-700 font-black hover:text-blue-900 transition-colors"
                                >
                                    SHOW ALL
                                </button>
                            )}
                            <span className="text-[10px] bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-black">
                                {summary.weekly.reduce((acc, curr) => acc + curr.count, 0)} TOTAL DUE
                            </span>
                        </div>
                    </div>

                    <div className="flex items-end justify-between px-1">
                        {summary.weekly.map((item, idx) => {
                            const isActive = selectedForecastDay === item.date;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedForecastDay(isActive ? null : item.date)}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 group transition-all p-1.5 rounded-xl min-w-[70px] border-2",
                                        isActive
                                            ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-200"
                                            : "hover:bg-slate-50 border-transparent hover:border-slate-100"
                                    )}
                                >
                                    <span className={cn(
                                        "text-[13px] font-black tabular-nums transition-all tracking-tight",
                                        isActive ? "text-white" : "text-slate-900"
                                    )}>
                                        {item.count}
                                    </span>
                                    <div
                                        className={cn(
                                            "w-9 h-1.5 rounded-full transition-all",
                                            isActive ? "bg-white/40" : "opacity-60"
                                        )}
                                        style={!isActive ? { backgroundColor: item.color } : {}}
                                    />
                                    <span className={cn(
                                        "text-[9px] uppercase truncate w-full text-center font-black tracking-widest",
                                        isActive ? "text-white" : "text-slate-500"
                                    )}>
                                        {item.label === "Today" ? "Today" : item.label.substring(0, 3)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. EXPIRED TOTAL STAT - COMPACT IMPACT */}
                <button
                    onClick={() => {
                        setSelectedForecastDay(null);
                        setSearchTerm("");
                    }}
                    className="bg-white border-2 border-red-50 rounded-2xl shadow-sm p-3.5 flex flex-col justify-between border-l-8 border-l-red-600 hover:bg-slate-50 transition-all group text-left min-h-[110px]"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                            <Badge className="bg-red-600 h-1.5 w-1.5 rounded-full p-0 shadow-sm" />
                        </div>
                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Expired</h3>
                    </div>
                    <div className="flex items-baseline gap-2 py-0.5">
                        <span className="text-4xl font-black text-red-600 leading-none tracking-tighter">{summary.expiredCount}</span>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-red-700 font-bold uppercase tracking-tight leading-none">Pending</span>
                            <span className="text-[10px] text-red-700 font-bold uppercase tracking-tight leading-none">Renewal</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-900 transition-colors">
                        <span className="text-[9px] font-bold uppercase tracking-widest italic leading-none">Archive View</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                </button>

            </div>

            {/* MAIN DATA TABLE */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 border-b">
                        <TableRow>
                            <TableHead className="font-bold">Client</TableHead>
                            <TableHead className="font-bold text-center">Last Cycle</TableHead>
                            <TableHead className="font-bold text-center">Expiry Date</TableHead>
                            <TableHead className="font-bold text-center">Status</TableHead>
                            <TableHead className="font-bold text-center">Renewed By</TableHead>
                            <TableHead className="font-bold text-center">Remaining</TableHead>
                            <TableHead className="font-bold text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <p>Loading renewals...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredRenewals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center italic text-gray-400">
                                    No renewals due in the next 60 days.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRenewals.map((r) => (
                                <TableRow key={r.lead_id} className="hover:bg-slate-50/50 transition-colors h-14">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{r.lead_name}</span>
                                            <span className="text-[11px] text-gray-500">{r.lead_id} | {r.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{r.subscription_cycle} Days</span>
                                            <span className="text-[10px] text-gray-400">Paid: {dayjs(r.onboarded_date).format("DD MMM YYYY")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-medium">
                                        {r.expiry_date.format("DD MMM YYYY")}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={cn(
                                            "rounded-md px-2 py-0.5 text-[11px] font-medium border shadow-none",
                                            r.days_remaining < 0 ? "bg-red-50 text-red-700 border-red-200" :
                                                r.days_remaining <= 15 ? "bg-orange-50 text-orange-700 border-orange-200" :
                                                    "bg-blue-50 text-blue-700 border-blue-200"
                                        )}>
                                            {r.days_remaining < 0 ? "Expired" : r.days_remaining <= 15 ? "Expiring Soon" : "Active"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-medium text-slate-700">{r.closed_by || "System"}</span>
                                            <span className="text-[9px] text-gray-400 uppercase font-bold">Associate</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className={`text-sm font-bold ${r.days_remaining < 0 ? 'text-red-500' : r.days_remaining <= 15 ? 'text-orange-500' : 'text-slate-700'}`}>
                                            {r.days_remaining < 0 ? `${Math.abs(r.days_remaining)} days ago` : `${r.days_remaining} days left`}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => window.open(`/leads/${r.lead_id}`, "_blank")}
                                                title="View Profile"
                                            >
                                                <ExternalLink className="w-4 h-4 text-gray-400" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-[11px] px-3 border-orange-200 text-orange-600 hover:bg-orange-50"
                                                onClick={() => window.open(`/finance/renewal/${r.lead_id}`, "_blank")}
                                            >
                                                Renew Now
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
