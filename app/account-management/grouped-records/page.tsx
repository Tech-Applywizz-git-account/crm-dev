"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronDown, ChevronUp, ExternalLink, Calendar, Phone, Mail, DollarSign, Clock, RefreshCw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

interface ClientRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  onboarded_date: string;
  sale_value: number;
  subscription_cycle: number;
  feedback?: {
    isHappy: boolean;
    rating: number;
    notes: string;
  };
  onboarding?: {
    job_role_preferences: string[] | string | null;
    salary_range: string | null;
  };
  renewalDate: string;
  assignedTo?: string;
  assignedTL?: string;
}

export default function GroupedRecordsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClientRecord[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>(
    new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  );
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch sales_closure (onboarded clients)
        const { data: sales, error: salesErr } = await supabase
          .from("sales_closure")
          .select("lead_id, email, onboarded_date, sale_value, subscription_cycle, account_assigned_name, associates_tl_email")
          .not("onboarded_date", "is", null)
          .order("onboarded_date", { ascending: false });

        if (salesErr) throw salesErr;

        const leadIds = sales.map((s) => s.lead_id);
        if (leadIds.length === 0) {
          setData([]);
          return;
        }

        // 2. Fetch leads (name, phone)
        const { data: leads, error: leadsErr } = await supabase
          .from("leads")
          .select("business_id, name, phone")
          .in("business_id", leadIds);

        if (leadsErr) throw leadsErr;
        const leadsMap = new Map(leads.map((l) => [l.business_id, l]));

        // 3. Fetch feedback
        const { data: feedback, error: fbErr } = await supabase
          .from("client_feedback")
          .select("lead_id, client_emotion, rating, notes")
          .in("lead_id", leadIds)
          .order("id", { ascending: false });

        const latestFbMap = new Map();
        if (!fbErr && feedback) {
          for (const fb of feedback) {
            if (!latestFbMap.has(fb.lead_id)) {
              latestFbMap.set(fb.lead_id, {
                isHappy: fb.client_emotion === "happy",
                rating: parseInt(String(fb.rating || "0"), 10),
                notes: fb.notes || "",
              });
            }
          }
        }

        // 4. Fetch onboarding details (Requirement)
        const { data: onboarding, error: obErr } = await supabase
          .from("client_onboarding_details")
          .select("lead_id, job_role_preferences, salary_range")
          .in("lead_id", leadIds);

        const obMap = new Map(onboarding?.map((ob) => [ob.lead_id, ob]) || []);

        // 5. Merge and Aggregate by Lead ID
        const aggregated = new Map<string, ClientRecord>();
        
        sales.forEach((sale) => {
          const lead = leadsMap.get(sale.lead_id);
          const onboarded = new Date(sale.onboarded_date);
          const renewal = new Date(onboarded);
          renewal.setDate(onboarded.getDate() + (sale.subscription_cycle || 0));

          if (aggregated.has(sale.lead_id)) {
            const existing = aggregated.get(sale.lead_id)!;
            existing.sale_value += (sale.sale_value || 0);
            // keep the most recent onboarded date and renewal date
            if (new Date(sale.onboarded_date) > new Date(existing.onboarded_date)) {
              existing.onboarded_date = sale.onboarded_date;
              existing.renewalDate = renewal.toISOString().split("T")[0];
            }
          } else {
            aggregated.set(sale.lead_id, {
              id: sale.lead_id,
              name: lead?.name || "Unnamed",
              phone: lead?.phone || null,
              email: sale.email,
              onboarded_date: sale.onboarded_date,
              sale_value: sale.sale_value || 0,
              subscription_cycle: sale.subscription_cycle || 0,
              feedback: latestFbMap.get(sale.lead_id),
              onboarding: obMap.get(sale.lead_id),
              renewalDate: renewal.toISOString().split("T")[0],
              assignedTo: sale.account_assigned_name || "Unassigned",
              assignedTL: sale.associates_tl_email || "Not Assigned",
            });
          }
        });

        setData(Array.from(aggregated.values()));
      } catch (err) {
        console.error("Fetch Data Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredByMonth = useMemo(() => {
    return data.filter((client) => {
      const date = new Date(client.onboarded_date);
      return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) === monthFilter;
    });
  }, [data, monthFilter]);

  const stats = useMemo(() => {
    const counts = {
      all: filteredByMonth.length,
      veryPoor: filteredByMonth.filter(c => c.feedback?.rating === 1).length,
      poor: filteredByMonth.filter(c => c.feedback?.rating === 2).length,
      average: filteredByMonth.filter(c => c.feedback?.rating === 3).length,
      good: filteredByMonth.filter(c => c.feedback?.rating === 4).length,
      excellent: filteredByMonth.filter(c => c.feedback?.rating === 5).length,
    };
    return counts;
  }, [filteredByMonth]);

  const grouped = useMemo(() => {
    const groups: Record<string, ClientRecord[]> = {};
    
    let filtered = filteredByMonth;
    if (ratingFilter !== null) {
      filtered = filtered.filter(c => c.feedback?.rating === ratingFilter);
    }

    filtered.forEach((client) => {
      const date = new Date(client.onboarded_date);
      const fullDate = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      if (!groups[fullDate]) groups[fullDate] = [];
      groups[fullDate].push(client);
    });

    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].onboarded_date);
      const dateB = new Date(b[1][0].onboarded_date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredByMonth, ratingFilter]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    data.forEach((client) => {
      const date = new Date(client.onboarded_date);
      months.add(date.toLocaleDateString("en-GB", { month: "long", year: "numeric" }));
    });
    // Ensure current month is always in the list even if no data
    months.add(new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }));
    return Array.from(months).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [data]);

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return "Very Poor";
      case 2: return "Poor";
      case 3: return "Average";
      case 4: return "Good";
      case 5: return "Excellent";
      default: return "N/A";
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-current text-yellow-400" : "text-gray-300"}`} />
        ))}
      </div>
    );
  };

  if (loading) return <FullScreenLoader />;

  return (
    <ProtectedRoute allowedRoles={["Super Admin", "Admin", "Account Management", "Accounts", "Sales", "Sales Associate", "Sales Head"]}>
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Date-wise Client Records</h1>
              <p className="text-xs text-muted-foreground mt-1">View client ongoings grouped by specific dates</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Filter Month:</span>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-40 h-9 bg-white border-slate-200 shadow-sm text-sm">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-700">Displaying:</span>
                <Badge variant="secondary" className="bg-blue-600 text-white font-bold h-5 px-1.5 text-[10px]">
                  {ratingFilter === null ? stats.all : stats[
                    ratingFilter === 1 ? 'veryPoor' : 
                    ratingFilter === 2 ? 'poor' : 
                    ratingFilter === 3 ? 'average' : 
                    ratingFilter === 4 ? 'good' : 'excellent'
                  ]}
                </Badge>
              </div>
            </div>
          </div>

          {/* Rating Filter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <Card 
              className={`cursor-pointer transition-all duration-200 border ${ratingFilter === null ? "border-slate-800 bg-slate-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => setRatingFilter(null)}
            >
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] uppercase text-slate-500 tracking-wider">All Clients</span>
                <span className="text-xl font-semibold text-slate-800 leading-none">{stats.all}</span>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all duration-200 border ${ratingFilter === 1 ? "border-slate-800 bg-slate-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => setRatingFilter(1)}
            >
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] uppercase text-slate-500 tracking-wider">Very Poor</span>
                <span className="text-xl font-semibold text-slate-800 leading-none">{stats.veryPoor}</span>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all duration-200 border ${ratingFilter === 2 ? "border-slate-800 bg-slate-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => setRatingFilter(2)}
            >
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] uppercase text-slate-500 tracking-wider">Poor</span>
                <span className="text-xl font-semibold text-slate-800 leading-none">{stats.poor}</span>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all duration-200 border ${ratingFilter === 3 ? "border-slate-800 bg-slate-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => setRatingFilter(3)}
            >
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] uppercase text-slate-500 tracking-wider">Average</span>
                <span className="text-xl font-semibold text-slate-800 leading-none">{stats.average}</span>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all duration-200 border ${ratingFilter === 4 ? "border-slate-800 bg-slate-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => setRatingFilter(4)}
            >
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] uppercase text-slate-500 tracking-wider">Good</span>
                <span className="text-xl font-semibold text-slate-800 leading-none">{stats.good}</span>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all duration-200 border ${ratingFilter === 5 ? "border-slate-800 bg-slate-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => setRatingFilter(5)}
            >
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] uppercase text-slate-500 tracking-wider">Excellent</span>
                <span className="text-xl font-semibold text-slate-800 leading-none">{stats.excellent}</span>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {grouped.map(([fullDate, clients], idx) => (
              <Card key={fullDate} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow duration-200">
                <Accordion type="single" collapsible>
                  <AccordionItem value={fullDate} className="border-none">
                    <CardHeader className="p-0">
                      <AccordionTrigger className="px-5 py-3.5 hover:no-underline hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between w-full pr-4 text-left">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            <span className="text-lg font-bold text-slate-700">{fullDate}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full text-xs text-slate-600 font-medium">
                               <Clock className="w-3.5 h-3.5" />
                               {clients.length} Clients
                             </div>
                             <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200" />
                          </div>
                        </div>
                      </AccordionTrigger>
                    </CardHeader>
                    <AccordionContent className="p-0 border-t border-slate-100">
                      <div className="divide-y divide-slate-100">
                        {clients.map((client, clientIdx) => {
                          const today = new Date();
                          const onboarded = new Date(client.onboarded_date);
                          const diffInDays = Math.floor((today.getTime() - onboarded.getTime()) / 86400000);
                          
                          return (
                            <div key={client.id} className="p-5 bg-white hover:bg-slate-50/50 transition-colors flex gap-6">
                              {/* S.No Column */}
                              <div className="flex-shrink-0 pt-0.5">
                                <div className="bg-slate-50 text-slate-800 font-black text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm min-w-[42px] text-center">
                                  #{clientIdx + 1}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-grow">
                                {/* Basic Info */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                      <a 
                                        href={`/leads/${client.id}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-base font-bold text-slate-800 leading-tight hover:text-blue-600 hover:underline"
                                      >
                                        {client.name}
                                      </a>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="truncate">{client.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{client.phone || "N/A"}</span>
                                    </div>
                                    <div className="pt-1 mt-1 border-t border-slate-50 space-y-1">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Assignments</p>
                                      <div className="text-[11px] text-slate-600 flex flex-col gap-0.5">
                                        <span className="font-medium underline decoration-slate-100">AM: {client.assignedTo}</span>
                                        <span className="font-medium text-blue-700/70">TL: {client.assignedTL}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Financial & Cycle */}
                                <div className="space-y-3">
                                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Service Details</p>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                      <span className="text-sm font-medium text-slate-600">Sale Value:</span>
                                      <span className="text-sm font-bold text-green-600">${client.sale_value}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-slate-500 font-medium">Cycle:</span>
                                      <span className="text-slate-800 font-semibold">{client.subscription_cycle} Days</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-slate-500 font-medium">Life Cycle:</span>
                                      {(() => {
                                        const now = new Date();
                                        now.setHours(0, 0, 0, 0);
                                        const ren = new Date(client.renewalDate);
                                        ren.setHours(0, 0, 0, 0);
                                        const diff = Math.round((ren.getTime() - now.getTime()) / 86400000);
                                        
                                        if (diff > 0) {
                                          return <Badge className="bg-green-100 text-green-700 border-green-200">{diff} days for renewal</Badge>;
                                        } else if (diff < 0) {
                                          return <Badge className="bg-red-100 text-red-700 border-red-200">{Math.abs(diff)} days expired</Badge>;
                                        } else {
                                          return <Badge className="bg-orange-100 text-orange-700 border-orange-200 uppercase">Today is renewal</Badge>;
                                        }
                                      })()}
                                    </div>
                                  </div>
                                </div>

                                {/* Requirement & Renewal */}
                                <div className="space-y-3">
                                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Requirement & Renewal</p>
                                  <div className="space-y-2.5">
                                    <div className="space-y-1">
                                      <span className="text-xs font-semibold text-slate-500">Target Role:</span>
                                      <p className="text-sm text-slate-700 line-clamp-2 italic">
                                        {client.onboarding?.job_role_preferences || "Not specified"}
                                      </p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100">
                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-semibold text-slate-500">Renewal On:</span>
                                          <span className="text-sm font-bold text-blue-600">{new Date(client.renewalDate).toLocaleDateString("en-GB")}</span>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 text-xs transition-all shadow-sm"
                                          onClick={() => window.open(`/finance/renewal/${client.id}`, "_blank")}
                                        >
                                          <RefreshCw className="mr-1.5 h-3 w-3" /> Renew Client
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Feedback */}
                                <div className="space-y-3">
                                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Latest Feedback</p>
                                  {client.feedback ? (
                                    <div className="space-y-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                                        <div className="flex flex-col gap-0.5">
                                          {renderStars(client.feedback.rating)}
                                          <span className="text-[10px] font-bold text-slate-400 uppercase">{getRatingLabel(client.feedback.rating)}</span>
                                        </div>
                                        <Badge className={`font-bold ${client.feedback.isHappy ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`} variant="outline">
                                          {client.feedback.isHappy ? "Happy" : "Unhappy"}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-3">
                                        &quot;{client.feedback.notes}&quot;
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center p-6 border-2 border-dashed border-slate-100 rounded-lg">
                                      <span className="text-xs text-slate-400 italic">No feedback recorded</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
