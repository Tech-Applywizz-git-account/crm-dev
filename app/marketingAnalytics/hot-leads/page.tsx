"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/utils/supabase/client";
import dayjs from "dayjs";
import { Flame, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Lead {
    id: string;
    business_id: string;
    name: string;
    source: string;
    created_at: string;
    assigned_to: string | null;
}

export default function HotLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHotLeads = useCallback(async () => {
        setLoading(true);
        try {
            const hotSourcesString = localStorage.getItem('crm_hot_leads_sources');
            const hotSources: string[] = hotSourcesString ? JSON.parse(hotSourcesString) : [];

            if (hotSources.length === 0) {
                setLeads([]);
                return;
            }

            // Fetch leads from the last 3 days
            const threeDaysAgo = dayjs().subtract(3, 'day').toISOString();
            
            const { data, error } = await supabase
                .from("leads")
                .select("id, business_id, name, source, created_at, assigned_to")
                .in("source", hotSources)
                .gte("created_at", threeDaysAgo)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error("Error fetching hot leads:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHotLeads();
    }, [fetchHotLeads]);

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => window.close()}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
                            Active Hot Leads
                        </h1>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Showing leads from hot sources created in the last 3 days
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Hot Leads ({leads.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lead Name</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">Loading hot leads...</TableCell>
                                    </TableRow>
                                ) : leads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No hot leads found</TableCell>
                                    </TableRow>
                                ) : (
                                    leads.map((lead) => (
                                        <TableRow key={lead.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                {lead.name}
                                                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                                            </TableCell>
                                            <TableCell>
                                              <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                                                {lead.source}
                                              </span>
                                            </TableCell>
                                            <TableCell>{dayjs(lead.created_at).format("DD MMM, YYYY HH:mm")}</TableCell>
                                            <TableCell>
                                                {lead.assigned_to ? (
                                                    <span className="text-slate-900">{lead.assigned_to}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Not Assigned</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
