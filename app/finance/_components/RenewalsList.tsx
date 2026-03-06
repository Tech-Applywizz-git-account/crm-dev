
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ExternalLink, Calendar, Search, Loader2, DollarSign } from "lucide-react";
import dayjs from "dayjs";

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
}

export default function RenewalsList() {
    const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchRenewals = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("sales_closure")
                .select("*")
                .not("onboarded_date", "is", null)
                .order("onboarded_date", { ascending: false });

            if (error) throw error;

            const latestMap = new Map<string, any>();
            (data || []).forEach((row) => {
                if (!latestMap.has(row.lead_id)) {
                    latestMap.set(row.lead_id, row);
                }
            });

            const processed: RenewalRecord[] = Array.from(latestMap.values()).map((row) => {
                const onboarded = dayjs(row.onboarded_date);
                const expiry = onboarded.add(row.subscription_cycle, "day");
                const daysRemaining = expiry.diff(dayjs(), "day");

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
                    closed_by: row.closed_by,
                };
            });

            // Filter for those expiring soon (within 60 days) or already expired
            const filtered = processed.filter(r => r.days_remaining <= 60 && r.days_remaining >= -45);
            setRenewals(filtered.sort((a, b) => a.days_remaining - b.days_remaining));
        } catch (err) {
            console.error("Error fetching renewals:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRenewals();
    }, []);

    const filteredRenewals = renewals.filter(r =>
        r.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-400 ml-2" />
                    <Input
                        placeholder="Search by name, email or ID..."
                        className="w-80 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                </div>
                <Button variant="outline" size="sm" onClick={fetchRenewals} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh List
                </Button>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client Details</TableHead>
                            <TableHead className="text-center">Subscription</TableHead>
                            <TableHead className="text-center">Expiry Date</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Renewed By</TableHead>
                            <TableHead className="text-center">Remaining</TableHead>
                            <TableHead className="text-center">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRenewals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                                    {loading ? "Fetching renewal data..." : "No renewals found matching criteria."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRenewals.map((r) => (
                                <TableRow key={r.lead_id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{r.lead_name}</span>
                                            <span className="text-xs text-gray-500">{r.lead_id}</span>
                                            <span className="text-xs text-gray-400">{r.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col">
                                            <span>{r.subscription_cycle} Days</span>
                                            <span className="text-xs text-gray-400">${r.sale_value}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-medium">
                                        {r.expiry_date.format("DD/MM/YYYY")}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={r.days_remaining < 0 ? "destructive" : "outline"} className={
                                            r.days_remaining < 0 ? "bg-red-100 text-red-700" :
                                                r.days_remaining <= 15 ? "bg-orange-100 text-orange-700" :
                                                    "bg-blue-100 text-blue-700"
                                        }>
                                            {r.days_remaining < 0 ? "Expired" : r.days_remaining <= 15 ? "Action Needed" : "Active"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-medium text-slate-700">{r.closed_by || "System"}</span>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Associate</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`font-bold ${r.days_remaining < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                            {r.days_remaining < 0 ? `${Math.abs(r.days_remaining)}d Overdue` : `${r.days_remaining}d Left`}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-500 text-white gap-1"
                                            onClick={() => window.open(`/finance/renewal/${r.lead_id}`, "_blank")}
                                        >
                                            <DollarSign className="w-3 h-3" /> Renew
                                        </Button>
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
