"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronDown, ExternalLink, Calendar, Phone, Mail, Clock, RefreshCw, CheckCircle2, XCircle, Search, Edit2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

interface RenewalRecord {
  lead_id: string;
  name: string;
  email: string;
  phone: string;
  dueDate: string;
  paidDate: string | null;
  assignedTo: string;
  isRenewed: boolean;
  notes: string;
  sale_id: string;
  type: "Due" | "Paid" | "Both";
  assignedTL: string;
  feedback?: {
    rating: number;
    emotion: string;
  };
}

interface DateGroup {
  date: string;
  totalDue: number;
  renewedCount: number;
  notRenewedCount: number;
  clients: RenewalRecord[];
}

export default function CumulativeDataPage() {
  const [loading, setLoading] = useState(true);
  const [allGroups, setAllGroups] = useState<DateGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClient, setEditingClient] = useState<RenewalRecord | null>(null);
  const [tempNote, setTempNote] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sales, error: salesErr } = await supabase
        .from("sales_closure")
        .select("*")
        .order("onboarded_date", { ascending: true });

      if (salesErr) throw salesErr;

      const leadIds = Array.from(new Set(sales.map(s => s.lead_id)));
      const { data: leads, error: leadsErr } = await supabase
        .from("leads")
        .select("business_id, name, phone")
        .in("business_id", leadIds);
      
      const leadMap = new Map(leads?.map(l => [l.business_id, l]) || []);

      // Group sales by lead_id
      const leadSalesMap = new Map<string, any[]>();
      sales.forEach(s => {
        if (!leadSalesMap.has(s.lead_id)) leadSalesMap.set(s.lead_id, []);
        leadSalesMap.get(s.lead_id)!.push(s);
      });

      // Fetch Feedback for these leads
      const { data: feedbackRows } = await supabase
        .from("client_feedback")
        .select("lead_id, client_emotion, rating")
        .in("lead_id", leadIds)
        .order("id", { ascending: false });
      
      const latestFbMap = new Map();
      feedbackRows?.forEach(fb => {
        if (!latestFbMap.has(fb.lead_id)) {
          latestFbMap.set(fb.lead_id, fb);
        }
      });

      const dateGroupsMap = new Map<string, Set<string>>(); // date -> set of record keys

      const processedRecords: RenewalRecord[] = [];

      leadSalesMap.forEach((userSales, leadId) => {
        const lead = leadMap.get(leadId);
        
        for (let i = 0; i < userSales.length; i++) {
          const current = userSales[i];
          const next = userSales[i + 1];

          if (!current.onboarded_date) continue;

          const onboarded = new Date(current.onboarded_date);
          const due = new Date(onboarded);
          due.setDate(onboarded.getDate() + (current.subscription_cycle || 0));
          const dueDateStr = due.toISOString().split("T")[0];

          const paidDateStr = next ? (next.onboarded_date || null) : null;
          const isRenewed = !!next;

          processedRecords.push({
            lead_id: leadId,
            name: lead?.name || current.lead_name || "Unnamed",
            email: current.email,
            phone: lead?.phone || "-",
            dueDate: dueDateStr,
            paidDate: paidDateStr,
            assignedTo: current.account_assigned_name || "Unassigned",
            isRenewed: isRenewed,
            notes: current.reason_for_close || "",
            sale_id: current.id,
            type: "Due",
            assignedTL: current.associates_tl_email || "Not Assigned",
            feedback: latestFbMap.has(leadId) ? {
              rating: latestFbMap.get(leadId).rating,
              emotion: latestFbMap.get(leadId).client_emotion
            } : undefined
          });
        }
      });

      // Construct Date Groups
      const groups: Record<string, DateGroup> = {};

      processedRecords.forEach(rec => {
        // Add to Due Date group
        if (!groups[rec.dueDate]) groups[rec.dueDate] = { date: rec.dueDate, totalDue: 0, renewedCount: 0, notRenewedCount: 0, clients: [] };
        
        const dueEntry = { ...rec, type: "Due" as const };
        groups[rec.dueDate].clients.push(dueEntry);
        groups[rec.dueDate].totalDue++;
        if (rec.isRenewed) groups[rec.dueDate].renewedCount++;
        else groups[rec.dueDate].notRenewedCount++;

        // If paid on a different date, add to Paid Date group
        if (rec.paidDate && rec.paidDate !== rec.dueDate) {
          if (!groups[rec.paidDate]) groups[rec.paidDate] = { date: rec.paidDate, totalDue: 0, renewedCount: 0, notRenewedCount: 0, clients: [] };
          const paidEntry = { ...rec, type: "Paid" as const };
          groups[rec.paidDate].clients.push(paidEntry);
        }
      });

      const sortedGroups = Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllGroups(sortedGroups);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch cumulative data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingClient) return;
    try {
      const { error } = await supabase
        .from("sales_closure")
        .update({ reason_for_close: tempNote })
        .eq("id", editingClient.sale_id);

      if (error) throw error;
      toast.success("Note updated");
      setEditingClient(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to update note");
    }
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return allGroups;
    const term = searchTerm.toLowerCase();

    return allGroups.map(group => ({
      ...group,
      clients: group.clients.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.email.toLowerCase().includes(term) || 
        c.lead_id.toLowerCase().includes(term)
      )
    })).filter(group => group.clients.length > 0);
  }, [allGroups, searchTerm]);

  if (loading) return <FullScreenLoader />;

  return (
    <ProtectedRoute allowedRoles={["Finance", "Super Admin"]}>
      <DashboardLayout>
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cumulative Renewal Records</h1>
              <p className="text-slate-500 mt-1 text-base">Daily summary of due and processed renewals</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="Search clients..." 
                className="pl-9 h-10 bg-white border-slate-200 shadow-sm rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-6">
            {filteredGroups.map((group) => (
              <Card key={group.date} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl">
                <Accordion type="single" collapsible>
                  <AccordionItem value={group.date} className="border-none">
                    <CardHeader className="p-0 bg-slate-50/50">
                      <AccordionTrigger className="px-8 py-6 hover:no-underline transition-colors group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4 text-left pr-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100/50 rounded-lg">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                               <span className="text-xl font-bold text-slate-800">{new Date(group.date).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                               <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Organizational Status</div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                             <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Due:</span>
                               <span className="text-base font-black text-slate-700">{group.totalDue}</span>
                             </div>
                             <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Renewed:</span>
                               <span className="text-base font-black text-emerald-700">{group.renewedCount}</span>
                             </div>
                             <div className="flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 shadow-sm">
                               <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tighter">Pending:</span>
                               <span className="text-base font-black text-rose-700">{group.notRenewedCount}</span>
                             </div>
                             <ChevronDown className="w-5 h-5 text-slate-300 group-data-[state=open]:rotate-180 transition-transform duration-300 ml-1" />
                          </div>
                        </div>
                      </AccordionTrigger>
                    </CardHeader>
                    
                    <AccordionContent className="p-0 border-t border-slate-100 bg-white">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="w-[50px] text-[10px] font-black uppercase text-slate-400 pl-8">#</TableHead>
                            <TableHead className="w-[calc((100%-50px)/6)] text-[10px] font-black uppercase text-slate-400">Client Details</TableHead>
                            <TableHead className="w-[calc((100%-50px)/6)] text-[10px] font-black uppercase text-slate-400">Due Date</TableHead>
                            <TableHead className="w-[calc((100%-50px)/6)] text-[10px] font-black uppercase text-slate-400">Status</TableHead>
                            <TableHead className="w-[calc((100%-50px)/6)] text-[10px] font-black uppercase text-slate-400">Ownership</TableHead>
                            <TableHead className="w-[calc((100%-50px)/6)] text-[10px] font-black uppercase text-slate-400">Feedback</TableHead>
                            <TableHead className="w-[calc((100%-50px)/6)] text-[10px] font-black uppercase text-slate-400 pr-8">Notes (Followup / Specs / Issues)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.clients.map((client, cIdx) => (
                            <TableRow key={`${client.lead_id}-${cIdx}`} className="group/row border-slate-50 hover:bg-slate-50/20 transition-colors">
                              <TableCell className="w-[50px] pl-8 py-5">
                                <span className="text-xs font-bold text-slate-400">{cIdx + 1}</span>
                              </TableCell>
                              <TableCell className="w-[calc((100%-50px)/6)] py-5">
                                <div className="space-y-1">
                                  <a 
                                    href={`/leads/${client.lead_id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline leading-tight"
                                  >
                                    {client.name}
                                  </a>
                                  <div className="flex flex-col text-[10px] text-slate-500 font-medium tracking-tight">
                                    <span>{client.email}</span>
                                    <span>{client.phone}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="w-[calc((100%-50px)/6)]">
                                <div className="text-sm font-bold text-slate-700">
                                  {new Date(client.dueDate).toLocaleDateString("en-GB")}
                                </div>
                              </TableCell>
                              <TableCell className="w-[calc((100%-50px)/6)]">
                                {client.isRenewed ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 text-[9px] font-black tracking-widest px-2 py-0.5 shadow-sm">
                                    RENEWED
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-rose-600 border-rose-100 bg-rose-50/30 text-[9px] font-black tracking-widest px-2 py-0.5 shadow-sm">
                                    PENDING
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="w-[calc((100%-50px)/6)]">
                                <div className="space-y-1.5">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Account Manager</span>
                                    <span className="text-xs font-bold text-slate-800 leading-none">{client.assignedTo}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Team Leader</span>
                                    <span className="text-xs font-bold text-blue-700/80 leading-none">{client.assignedTL}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="w-[calc((100%-50px)/6)]">
                                {client.feedback ? (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3 h-3 ${i < client.feedback!.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />
                                      ))}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${client.feedback.emotion === 'happy' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {client.feedback.emotion}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-300 uppercase italic">No Feedback</span>
                                )}
                              </TableCell>
                              <TableCell className="w-[calc((100%-50px)/6)] pr-8">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="text-xs text-slate-600 italic line-clamp-2 leading-relaxed">
                                    {client.notes || <span className="text-slate-300">No notes recorded...</span>}
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setEditingClient(client);
                                      setTempNote(client.notes);
                                    }}
                                    className="h-8 px-2.5 text-[10px] font-black uppercase tracking-wider text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm shrink-0"
                                  >
                                    <Edit2 className="w-3 h-3 mr-1.5" /> Edit
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            ))}
          </div>
        </div>

        {/* Note Edit Modal */}
        <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">Client Specific Notes</DialogTitle>
              <CardDescription>Followup calls, client specifications or issues for {editingClient?.name}</CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Label className="font-bold text-slate-700">Detailed Record</Label>
              <Textarea 
                value={tempNote} 
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="Record followup calls, client specifications, or any critical issues here..."
                className="min-h-[150px] rounded-2xl border-slate-100 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setEditingClient(null)} className="rounded-xl font-bold border-slate-100">Discard</Button>
              <Button onClick={handleUpdateNote} className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold px-8 shadow-md">Commit Change</Button>
            </div>
          </DialogContent>
        </Dialog>

      </DashboardLayout>
    </ProtectedRoute>
  );
}
