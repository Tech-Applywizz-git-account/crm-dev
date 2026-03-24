"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Loader2, Phone, PhoneForwarded, PhoneIncoming, MessageSquare, Download, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";

interface UserCallLog {
    id: string;
    start_time: string;
    duration: number;
    durationFormatted: string;
    direction: string;
    other_party: string;
    result: string;
    recording: boolean;
    call_id: string;
}

function UserCallHistoryContent() {
    const searchParams = useSearchParams();
    const extension = searchParams.get("extension") || "";
    const name = searchParams.get("name") || "";
    const email = searchParams.get("email") || "";

    const [startDate, setStartDate] = useState(dayjs().subtract(1, 'month').format("YYYY-MM-DD"));
    const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [logs, setLogs] = useState<UserCallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/zoom-user-history?extension=${extension}&email=${email}&startDate=${startDate}&endDate=${endDate}`);
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs);
            } else {
                setError(data.error || "Failed to load call history");
            }
        } catch (err: any) {
            setError(err.message || "Network error while loading history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (extension || email) {
            fetchHistory();
        }
    }, [extension, email, startDate, endDate]);

    const totalDurationSeconds = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalDurationFormatted = (() => {
        const h = Math.floor(totalDurationSeconds / 3600);
        const m = Math.floor((totalDurationSeconds % 3600) / 60);
        const s = totalDurationSeconds % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    })();

    const summary = {
        total: logs.length,
        outbound: logs.filter(l => l.direction === "outbound").length,
        inbound: logs.filter(l => l.direction === "inbound").length,
        connected: logs.filter(l => l.result?.toLowerCase() === "answered" || l.result?.toLowerCase() === "connected").length,
        notConnected: logs.filter(l => !(l.result?.toLowerCase() === "answered" || l.result?.toLowerCase() === "connected")).length,
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f9fb]">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => window.close()} className="h-8 gap-1.5 border-gray-200 hover:bg-gray-50">
                        <ArrowLeft className="w-3.5 h-3.5" /> Close
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-xl text-gray-800 tracking-tight">
                            Full Call History: <span className="text-blue-600">{name || extension}</span>
                        </h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                            Report showing records from Zoom since Day 1 (Last 3 Months)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center bg-gray-100/50 border border-gray-200 rounded-lg p-1 px-3 gap-4 shadow-sm group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase text-gray-400 tracking-tighter">From</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-xs text-gray-700 focus:ring-0 cursor-pointer h-7 outline-none"
                            />
                        </div>
                        <div className="w-px h-6 bg-gray-200" />
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase text-gray-400 tracking-tighter">To</label>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-xs text-gray-700 focus:ring-0 cursor-pointer h-7 outline-none"
                            />
                        </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading} className="gap-1.5 h-9 bg-white border-blue-100 text-blue-600 hover:bg-blue-50 px-4 shadow-sm">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full">
                {error && (
                    <div className="p-5 mb-6 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm shadow-sm">
                        {error}
                    </div>
                )}

                {/* Aggregated Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase text-gray-400 font-normal tracking-widest mb-1">Extension</span>
                        <span className="text-lg text-gray-800 font-mono">{extension || "-"}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase text-gray-400 font-normal tracking-widest mb-1">Total Calls</span>
                        <span className="text-2xl text-blue-600">{summary.total}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase text-gray-400 font-normal tracking-widest mb-1">Outbound</span>
                        <span className="text-2xl text-indigo-600">{summary.outbound}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase text-gray-400 font-normal tracking-widest mb-1">Inbound</span>
                        <span className="text-2xl text-green-600">{summary.inbound}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase text-gray-400 font-normal tracking-widest mb-1">Connected</span>
                        <span className="text-2xl text-emerald-600">{summary.connected}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase text-gray-400 font-normal tracking-widest mb-1">Missed/Cancelled</span>
                        <span className="text-2xl text-red-500">{summary.notConnected}</span>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden transition-all duration-300">
                    <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between px-6">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Global Activity Ledger</span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-2.5 py-0.5 text-[10px] rounded-full">
                                {logs.length} Total Logs
                            </Badge>
                            <div className="w-px h-4 bg-gray-200 mx-1" />
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full border border-gray-200/50">
                                <span className="text-[10px] uppercase text-gray-400 font-normal tracking-wider">Total Duration:</span>
                                <span className="text-xs font-mono text-gray-700">{totalDurationFormatted}</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-[#fcfdfe] text-gray-500 text-[10px] tracking-widest uppercase border-b border-gray-100">
                                <tr>
                                    <th className="pl-8 py-4 w-12 text-center text-gray-400">#</th>
                                    <th className="px-4 py-4">Direction</th>
                                    <th className="px-4 py-4">Other Party</th>
                                    <th className="px-4 py-4">Start Time (IST)</th>
                                    <th className="px-4 py-4 text-center">Duration</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-4 py-4 text-center pr-8">Recording</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-gray-700 transition-all">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-24 text-center">
                                            <div className="flex flex-col items-center justify-center animate-pulse">
                                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                                                <span className="text-gray-500 text-base">Retrieving records from Zoom Cloud...</span>
                                                <span className="text-gray-400 text-xs mt-1">This takes a few moments.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Phone className="w-12 h-12 text-gray-200 mb-4 stroke-[1px]" />
                                                <span className="text-gray-400 text-base">No call records found for this user in the last 3 months.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => {
                                        const isOutbound = log.direction === "outbound";
                                        const isAnswered = log.result?.toLowerCase() === "answered" || log.result?.toLowerCase() === "connected";
                                        
                                        return (
                                            <tr key={log.id} className="hover:bg-blue-50/40 transition-colors group">
                                                <td className="pl-8 py-5 text-center text-black text-xs">
                                                    {logs.indexOf(log) + 1}
                                                </td>
                                                <td className="px-4 py-5 font-normal">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isOutbound ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'} transition-transform group-hover:scale-110 shadow-sm border border-transparent group-hover:border-blue-100`}>
                                                            {isOutbound ? <PhoneForwarded className="w-4 h-4" /> : <PhoneIncoming className="w-4 h-4" />}
                                                        </div>
                                                        <span className={`text-[11px] uppercase tracking-wider ${isOutbound ? 'text-indigo-600' : 'text-green-600'}`}>
                                                            {log.direction}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{log.other_party}</span>
                                                        <span className="text-[10px] text-gray-400 font-normal">External Party</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-800">{dayjs(log.start_time).format("MMM DD, YYYY")}</span>
                                                        <span className="text-[11px] text-gray-500 font-mono">{dayjs(log.start_time).format("hh:mm:ss A")} IST</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-mono tracking-tighter ${log.duration > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                                        {log.durationFormatted}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isAnswered ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-400 opacity-60'}`} />
                                                        <span className={`text-[11px] uppercase tracking-tight ${isAnswered ? 'text-green-700' : 'text-red-500'}`}>
                                                            {log.result || "N/A"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 text-center pr-8">
                                                    {log.recording ? (
                                                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 px-3 py-1 flex items-center justify-center gap-1.5 w-fit mx-auto shadow-sm">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            REC
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-gray-300 text-[10px]">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <p className="mt-8 text-center text-gray-400 text-[11px] uppercase tracking-[0.2em] opacity-60">
                    &copy; {new Date().getFullYear()} ApplyWizz Official Call Logging Systems | Zoom Cloud Integration
                </p>
            </div>
        </div>
    );
}

export default function UserCallHistoryPage() {
    return (
        <SidebarProvider>
            <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-hidden">
                        <Suspense fallback={
                            <div className="flex h-full items-center justify-center bg-white">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        }>
                            <UserCallHistoryContent />
                        </Suspense>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
