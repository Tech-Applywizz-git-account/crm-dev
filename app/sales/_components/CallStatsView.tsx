"use client";

import { useState, useEffect } from "react";
import { Copy, Loader2, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface MemberStats {
    name: string;
    email: string;
    extension: string;
    totalCalls: number;
    outbound: number;
    inbound: number;
    connected: number;
    notConnected: number;
    totalDuration: number;
    totalDurationFormatted: string;
}

interface CallStatsResponse {
    success: boolean;
    startDate: string;
    endDate: string;
    members: MemberStats[];
    totals: MemberStats;
    totalLogs: number;
    error?: string;
}

export default function CallStatsView({ date = new Date().toISOString().split("T")[0] }: { date?: string }) {
    const [startDate, setStartDate] = useState(date);
    const [endDate, setEndDate] = useState(date);
    const [startTime, setStartTime] = useState("00:00");
    const [endTime, setEndTime] = useState("23:59");
    const [stats, setStats] = useState<CallStatsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/zoom-call-stats?startDate=${startDate}&endDate=${endDate}&startTime=${startTime}&endTime=${endTime}`);
            const data = await res.json();
            if (data.success) {
                setStats(data);
            } else {
                setError(data.error || "Failed to load call stats");
            }
        } catch (err: any) {
            setError(err.message || "Network error while loading stats");
        } finally {
            setLoading(false);
        }
    };

    const copyTableToClipboard = () => {
        if (!stats) return;
        
        let content = "Team Member\tTotal Duration\tTotal Calls\tOutbound\tInbound\tConnected\tNot Connected\n";
        stats.members.sort((a, b) => b.totalDuration - a.totalDuration).forEach(m => {
            content += `${m.name}\t${m.totalDurationFormatted}\t${m.totalCalls}\t${m.outbound}\t${m.inbound}\t${m.connected}\t${m.notConnected}\n`;
        });
        
        // Add totals row
        content += `TOTAL\t${stats.totals.totalDurationFormatted}\t${stats.totals.totalCalls}\t${stats.totals.outbound}\t${stats.totals.inbound}\t${stats.totals.connected}\t${stats.totals.notConnected}`;

        navigator.clipboard.writeText(content).then(() => {
            alert("Table data copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy table: ", err);
        });
    };

    const setQuickFilter = (minutes: number) => {
        const now = new Date();
        const past = new Date(now.getTime() - minutes * 60000);
        
        const nowDateStr = now.toISOString().split('T')[0];
        const pastDateStr = past.toISOString().split('T')[0];
        
        const formatTime = (d: Date) => {
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        setStartDate(pastDateStr);
        setEndDate(nowDateStr);
        setStartTime(formatTime(past));
        setEndTime(formatTime(now));
    };

    useEffect(() => {
        fetchStats();
    }, [startDate, endDate, startTime, endTime]);

    return (
        <div className="bg-white border rounded shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b flex flex-col gap-4 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Zoom Call Statistics</h2>
                        <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded w-fit border border-blue-100">
                            IST Night Shift: 8:00 PM - 8:00 AM
                        </span>
                    </div>

                    <div className="flex-1 flex justify-center items-center gap-6">
                        <Select onValueChange={(val) => {
                            if (val === "reset") {
                                const today = new Date().toISOString().split('T')[0];
                                setStartDate(today);
                                setEndDate(today);
                                setStartTime("00:00");
                                setEndTime("23:59");
                            } else {
                                setQuickFilter(parseInt(val));
                            }
                        }}>
                            <SelectTrigger className="w-[130px] h-9 bg-white border-blue-100 text-blue-600 font-bold text-[11px] ring-offset-0 focus:ring-0 focus:ring-offset-0 hover:bg-blue-50 transition-all">
                                < Zap className="w-3.5 h-3.5 mr-2" />
                                <SelectValue placeholder="Quick Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1" className="text-[11px] font-medium">Last 1 Minute</SelectItem>
                                <SelectItem value="5" className="text-[11px] font-medium">Last 5 Minutes</SelectItem>
                                <SelectItem value="10" className="text-[11px] font-medium">Last 10 Minutes</SelectItem>
                                <SelectItem value="15" className="text-[11px] font-medium">Last 15 Minutes</SelectItem>
                                <SelectItem value="30" className="text-[11px] font-medium">Last 30 Minutes</SelectItem>
                                <SelectItem value="60" className="text-[11px] font-medium">Last 1 Hour</SelectItem>
                                <SelectItem value="reset" className="text-[11px] font-bold text-red-500 border-t mt-1">Reset Filters</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex shadow-sm rounded-lg border border-slate-200 bg-white hover:border-blue-300 focus-within:border-blue-400 transition-all overflow-hidden h-9">
                            <div className="bg-slate-50 w-11 flex items-center justify-center border-r border-slate-200">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">FROM</span>
                            </div>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className="h-full w-[130px] border-0 focus-visible:ring-0 rounded-none text-[11px] px-2 bg-transparent font-semibold cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                            <div className="w-[1px] h-4 bg-slate-200 my-auto" />
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className="h-full w-[100px] border-0 focus-visible:ring-0 rounded-none text-[11px] px-2 bg-transparent font-semibold cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                        </div>

                        <div className="flex shadow-sm rounded-lg border border-slate-200 bg-white hover:border-blue-300 focus-within:border-blue-400 transition-all overflow-hidden h-9">
                            <div className="bg-slate-50 w-11 flex items-center justify-center border-r border-slate-200">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">TO</span>
                            </div>
                            <Input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className="h-full w-[130px] border-0 focus-visible:ring-0 rounded-none text-[11px] px-2 bg-transparent font-semibold cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                            <div className="w-[1px] h-4 bg-slate-200 my-auto" />
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className="h-full w-[100px] border-0 focus-visible:ring-0 rounded-none text-[11px] px-2 bg-transparent font-semibold cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={copyTableToClipboard} disabled={!stats || loading} className="gap-2 h-9 text-blue-600 border-blue-200 hover:bg-blue-50 font-medium">
                            <Copy className="w-4 h-4" />
                            Copy Table
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2 h-9 font-medium shadow-sm">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {error && (
                    <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                        {error}
                    </div>
                )}

                {loading && !stats ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <p>Loading call logs from Zoom...</p>
                        <p className="text-xs mt-2">This may take a few seconds.</p>
                    </div>
                ) : stats && stats.members.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#f8f9fb] border-b text-gray-600 font-semibold text-xs tracking-wider uppercase">
                                <tr>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] cursor-pointer hover:bg-gray-100" onClick={() => {
                                        const sorted = [...stats.members].sort((a, b) => b.totalDuration - a.totalDuration);
                                        setStats({ ...stats, members: sorted });
                                    }}>Team Member</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center cursor-pointer hover:bg-gray-100" onClick={() => {
                                        const sorted = [...stats.members].sort((a, b) => b.totalDuration - a.totalDuration);
                                        setStats({ ...stats, members: sorted });
                                    }}>Duration (HH:MM:SS)</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Total Calls</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Outbound</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Inbound</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Connected</th>
                                    <th className="px-4 py-3 text-center">Not Connected</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-gray-700">
                                {stats.members
                                    .sort((a, b) => b.totalDuration - a.totalDuration)
                                    .map((member, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 border-r border-[#e5e7eb] font-medium text-gray-900">
                                                <a
                                                    href={`/sales/user-call-history?extension=${member.extension}&name=${encodeURIComponent(member.name)}&email=${member.email}`}
                                                    target="_blank"
                                                    className="text-blue-600 hover:underline hover:text-blue-800"
                                                >
                                                    {member.name}
                                                </a>
                                            </td>
                                            <td className="px-4 py-3 border-r border-[#e5e7eb] text-center font-mono text-xs font-bold text-slate-700 bg-slate-50/50">
                                                {member.totalDurationFormatted}
                                            </td>
                                            <td className="px-4 py-3 border-r border-[#e5e7eb] text-center font-bold">
                                                {member.totalCalls}
                                            </td>
                                            <td className="px-4 py-3 border-r border-[#e5e7eb] text-center">
                                                {member.outbound}
                                            </td>
                                            <td className="px-4 py-3 border-r border-[#e5e7eb] text-center">
                                                {member.inbound}
                                            </td>
                                            <td className="px-4 py-3 border-r border-[#e5e7eb] text-center text-green-600 font-medium">
                                                {member.connected}
                                            </td>
                                            <td className="px-4 py-3 text-center text-red-500 font-medium font-mono">
                                                {member.notConnected}
                                            </td>
                                        </tr>
                                    ))}

                                {/* Totals Row */}
                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-200 uppercase text-gray-900">
                                    <td className="px-4 py-3 border-r border-gray-200">Total</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center font-mono text-xs">{stats.totals.totalDurationFormatted}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center">{stats.totals.totalCalls}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center">{stats.totals.outbound}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center">{stats.totals.inbound}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center">{stats.totals.connected}</td>
                                    <td className="px-4 py-3 text-center font-mono">{stats.totals.notConnected}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : stats ? (
                    <div className="text-center p-12 text-gray-400">
                        <p>No call logs found for this date.</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
