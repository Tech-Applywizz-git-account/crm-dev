"use client";

import { useState, useEffect } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MemberStats {
    name: string;
    email: string;
    extension: string;
    totalCalls: number;
    outbound: number;
    inbound: number;
    connected: number;
    notConnected: number;
    totalDurationFormatted: string;
}

interface CallStatsResponse {
    success: boolean;
    date: string;
    members: MemberStats[];
    totals: MemberStats;
    totalLogs: number;
    error?: string;
}

export default function CallStatsView({ date = new Date().toISOString().split("T")[0] }: { date?: string }) {
    const [selectedDate, setSelectedDate] = useState(date);
    const [stats, setStats] = useState<CallStatsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/zoom-call-stats?date=${selectedDate}`);
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

    useEffect(() => {
        fetchStats();
    }, [selectedDate]);

    return (
        <div className="bg-white border rounded shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-gray-800">Zoom Call Statistics</h2>
                        <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-tight">Shift: 8:00 PM - 8:00 AM IST</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="date-picker" className="text-sm text-gray-500">Date:</Label>
                        <Input
                            id="date-picker"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="h-8 w-36 text-sm"
                        />
                    </div>
                </div>

                <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh
                </Button>
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
                                    <th className="px-4 py-3 border-r border-[#e5e7eb]">Team Member</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Extension</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Total Calls</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Outbound</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Inbound</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Connected / Answered</th>
                                    <th className="px-4 py-3 border-r border-[#e5e7eb] text-center">Not Connected / Cancelled</th>
                                    <th className="px-4 py-3 text-center">Total Duration (HH:MM:SS)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-gray-700">
                                {stats.members.map((member, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 border-r border-[#e5e7eb] font-medium text-gray-900">
                                            {member.name}
                                        </td>
                                        <td className="px-4 py-3 border-r border-[#e5e7eb] text-center font-mono text-xs text-gray-500">
                                            {member.extension || "-"}
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
                                        <td className="px-4 py-3 border-r border-[#e5e7eb] text-center text-red-500 font-medium">
                                            {member.notConnected}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono text-xs">
                                            {member.totalDurationFormatted}
                                        </td>
                                    </tr>
                                ))}

                                {/* Totals Row */}
                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-200 uppercase text-gray-900">
                                    <td className="px-4 py-3 border-r border-gray-200">Total</td>
                                    <td className="px-4 py-3 border-r border-gray-200"></td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center">{stats.totals.totalCalls}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center">{stats.totals.outbound}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center">{stats.totals.inbound}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center">{stats.totals.connected}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-center">{stats.totals.notConnected}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">{stats.totals.totalDurationFormatted}</td>
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
