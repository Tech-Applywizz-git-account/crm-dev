
//app/sales/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from '@/utils/supabase/client';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditIcon, Eye, Search, ExternalLink } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import isBetween from "dayjs/plugin/isBetween";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { ZoomPhoneEmbedHandle } from "@/components/ZoomPhoneEmbed";


dayjs.extend(isBetween);


type SalesStage = "Prospect" | "DNP" | "Out of TG" | "Not Interested" | "Conversation Done" | "sale done" | "Target";

interface CallHistory {
  id: string;          // ← add id to update precisely
  date: string;        // followup_date (YYYY-MM-DD)
  stage: SalesStage;
  notes: string;
  duration?: number;
  recording_url?: string;
}

type PRPaidFlag = "Paid" | "Not paid";
type PRRow = {
  lead_id: string;
  name: string;
  email: string;
  closed_at: string | null; // oldest closure date (YYYY-MM-DD or null)

  resumePaid: PRPaidFlag;
  resumeStatus: string | null;
  resumePdf: string | null;

  portfolioPaid: PRPaidFlag;
  portfolioStatus: string | null;
  portfolioLink: string | null;

  githubPaid: PRPaidFlag; // no status/link available for github in resume_progress
};
interface Lead {
  id: string;
  business_id: string;
  client_name: string;
  email: string;
  phone: string;
  status?: string;     // Optional, if you want to track status
  assigned_to: string;
  current_stage: SalesStage;
  call_history: CallHistory[];
  created_at: string | null;
  assigned_at: string | null;
}

interface Profile {
  full_name: string;
  roles: string;
}
interface SaleClosing {
  base_value: number;                 // price for 1-month
  subscription_cycle: 0 | 15 | 30 | 60 | 90;
  payment_mode: "UPI" | "PayPal" | "Bank Transfer" | "Stripe" | "Credit/Debit Card" | "Other";
  closed_at: string;                  // YYYY-MM-DD picked from calendar
  resume_value: number;
  portfolio_value: number;
  linkedin_value: number;
  github_value: number;
  badge_value: number | null;   // ✅ NEW
  job_board_value: number;


  // NEW
  courses_value: number;   // Courses/Certifications ($)
  custom_label: string;    // Custom label
  custom_value: number;    // Custom ($)
  commitments: string;     // Free-text commitments
  company_application_email: string;

  no_of_job_applications: number | null;

}


interface FollowUp {
  follow_up_date: string;
  notes: string;
}

const salesStages: SalesStage[] = [
  "Prospect", "DNP", "Out of TG", "Not Interested", "Conversation Done", "Target", "sale done"
];

const getStageColor = (stage: SalesStage) => {
  switch (stage) {
    case "Prospect": return "bg-blue-100 text-blue-800";
    case "DNP": return "bg-yellow-100 text-yellow-800";
    case "Out of TG":
    case "Not Interested": return "bg-red-100 text-red-800";
    case "Conversation Done": return "bg-purple-100 text-purple-800";
    case "sale done": return "bg-green-100 text-green-800";
    case "Target": return "bg-orange-100 text-orange-800";
    default: return "bg-gray-100 text-gray-800";
  }
};



import SalesClosureDialog from "@/app/sales/_components/SalesClosureDialog";
import ActivityView from "@/app/sales/_components/ActivityView";
import { ZoomPhoneEmbed } from "@/components/ZoomPhoneEmbed";

export default function SalesPage() {
  const [view, setView] = useState<"leads" | "activity">("leads");
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [salesDialogMode, setSalesDialogMode] = useState<"all" | "first">("first"); // Default to 'first' for stage filter

  const [leads, setLeads] = useState<Lead[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [salesClosedTotal, setSalesClosedTotal] = useState(0);

  const [salesUsers, setSalesUsers] = useState<{ full_name: string; user_email: string }[]>([]);



  const [isChecking, setIsChecking] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [followUpData, setFollowUpData] = useState<FollowUp>({ follow_up_date: "", notes: "" });
  const [followUpSubmitted, setFollowUpSubmitted] = useState(false); // Track if follow-up was submitted
  const [followUpsDialogOpen, setFollowUpsDialogOpen] = useState(false);
  const [followUpsData, setFollowUpsData] = useState<any[]>([]);
  const [followUpsFilter, setFollowUpsFilter] = useState<"today" | "all">("today");
  const [pendingStageUpdate, setPendingStageUpdate] = useState<{ leadId: string, stage: SalesStage } | null>(null);
  const [previousStage, setPreviousStage] = useState<SalesStage | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [subscriptionEndsOn, setSubscriptionEndsOn] = useState<string>("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState("");

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [kpiFilteredLeads, setKpiFilteredLeads] = useState<Lead[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");


  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30); // default
  const [totalRecords, setTotalRecords] = useState(0);

  const zoomEmbedRef = useRef<ZoomPhoneEmbedHandle>(null);

  const handlePhoneClick = async (phone: string) => {
    if (!phone) return;

    // 1. Dial IMMEDIATELY so the user doesn't wait
    if (zoomEmbedRef.current) {
      zoomEmbedRef.current.dial(phone);
    } else {
      window.location.href = `tel:${phone}`;
    }

    // 2. Log to database in the background
    try {
      const matchedLead = leads.find((l) => l.phone === phone);
      const leadId = matchedLead?.business_id || "unknown";
      const now = new Date();

      // ALWAYS insert a new record for every call attempt
      const { error: insertError } = await supabase
        .from("call_history")
        .insert([{
          lead_id: leadId,
          email: matchedLead?.email || "",
          phone: phone,
          assigned_to: userProfile?.full_name || "Unknown",
          current_stage: matchedLead?.current_stage || "Prospect",
          followup_date: now.toISOString().split("T")[0],
          notes: `Outbound call by ${userProfile?.full_name || "Unknown"} to ${phone}`,
          call_started_at: now.toISOString(),
        }]);

      if (insertError) throw insertError;

    } catch (err) {
      console.error("Background call logging error:", err);
      // We don't alert the user here because the call is already dialing
    }
  };


  const [endDate, setEndDate] = useState<string | null>(null);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [onboardDialogOpen, setOnboardDialogOpen] = useState(false);

  // Client Info
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [city, setCity] = useState("");
  const [onboardingDate, setOnboardingDate] = useState("");

  // Subscription
  const [paymentMode, setPaymentMode] = useState("");
  const [subscriptionCycle, setSubscriptionCycle] = useState(""); // Values: "15", "30", "60", "90"
  const [subscriptionSaleValue, setSubscriptionSaleValue] = useState("");
  const [subscriptionSource, setSubscriptionSource] = useState("");

  // Add-ons
  const [resumeValue, setResumeValue] = useState("");
  const [portfolioValue, setPortfolioValue] = useState("");
  const [linkedinValue, setLinkedinValue] = useState("");
  const [githubValue, setGithubValue] = useState("");

  const [inputSearch, setInputSearch] = useState("");
  const [isHoveringClear, setIsHoveringClear] = useState(false);

  // Calculated Fields
  const [autoTotal, setAutoTotal] = useState(0);
  const [totalSale, setTotalSale] = useState(0);
  const [nextDueDate, setNextDueDate] = useState("-");

  const router = useRouter();










  // Auto calculate subscription total
  useEffect(() => {
    const base = parseFloat(subscriptionSaleValue || "0");
    const cycle = parseInt(subscriptionCycle || "0");

    const multiplier =
      cycle === 0 ? 0 :
        cycle === 15 ? 0.5 :
          cycle === 30 ? 1 :
            cycle === 60 ? 2 :
              cycle === 90 ? 3 : 0;

    setAutoTotal(base * multiplier);
  }, [subscriptionSaleValue, subscriptionCycle]);

  // Auto calculate total sale
  useEffect(() => {
    const resume = parseFloat(resumeValue || "0");
    const linkedin = parseFloat(linkedinValue || "0");
    const github = parseFloat(githubValue || "0");
    const portfolio = parseFloat(portfolioValue || "0");

    setTotalSale(autoTotal + resume + linkedin + github + portfolio);
  }, [autoTotal, resumeValue, linkedinValue, githubValue, portfolioValue]);




  useEffect(() => {
    fetchSalesUsers();
  }, []);


  useEffect(() => {
    fetchSalesClosureCount();
  }, []);

  useEffect(() => {
    const run = async () => {
      let q = supabase
        .from("sales_closure")
        .select("lead_id", { count: "exact", head: true });

      if (startDate && endDate) {
        q = q
          .gte("closed_at", dayjs(startDate).format("YYYY-MM-DD"))
          .lte("closed_at", dayjs(endDate).format("YYYY-MM-DD"));
      }

      const { count, error } = await q;
      if (!error) setSalesClosedTotal(count ?? 0);
    };
    run();
  }, [startDate, endDate]);

  // Calculate next payment due date
  useEffect(() => {
    const days = parseInt(subscriptionCycle || "0");
    if (days && onboardingDate) {
      setNextDueDate(dayjs(onboardingDate).add(days, "day").format("YYYY-MM-DD"));
    } else {
      setNextDueDate("-");
    }
  }, [subscriptionCycle, onboardingDate]);

  const [saleData, setSaleData] = useState<SaleClosing>({
    base_value: 0,
    subscription_cycle: "" as unknown as 0 | 15 | 30 | 60 | 90,
    payment_mode: "" as unknown as SaleClosing["payment_mode"],
    closed_at: "",
    resume_value: 0,
    portfolio_value: 0,
    linkedin_value: 0,
    github_value: 0,
    // NEW
    courses_value: 0,
    custom_label: "",
    custom_value: 0,
    commitments: "",
    company_application_email: "",  // Add this field
    no_of_job_applications: null,
    badge_value: null,                           // ✅ NEW
    job_board_value: 0,



  });



  useEffect(() => {
    fetchUserProfile();

  }, []);

  const fetchUserProfile = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Error fetching auth user:", authError);
      return;
    }
    // Store user email for Zoom API calling
    if (user.email) setUserEmail(user.email);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, roles")
      .eq("auth_id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return;
    }

    console.log("Fetched profile:", profile);

    setUserProfile(profile);
    fetchLeads(profile);   // pass profile here
    fetchAllLeads(profile);    // FULL leads (KPI)

  };


  const fetchAllLeads = async (profile: Profile) => {
    let q = supabase
      .from("leads")
      .select(`
      id, business_id, name, email, phone,
      assigned_to, current_stage, status,
      created_at, assigned_at
    `)
      .eq("status", "Assigned");

    if (profile.roles === "Sales Associate") {
      q = q.eq("assigned_to", profile.full_name);
    }

    const { data, error } = await q;

    if (error) {
      console.error("Error fetching all leads:", error);
      return;
    }

    // ✅ FIX: Convert supabase rows → Lead type
    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      business_id: row.business_id,
      client_name: row.name,         // ✔ map name → client_name
      email: row.email,
      phone: row.phone,
      assigned_to: row.assigned_to,
      current_stage: row.current_stage,
      call_history: [],              // ✔ required by interface
      created_at: row.created_at,
      assigned_at: row.assigned_at
    })) as Lead[];

    setAllLeads(mapped);
  };



  useEffect(() => {
    if (!allLeads) return;

    const filtered = allLeads.filter((lead) => {
      const matchesStage =
        stageFilter === "all" || lead.current_stage === stageFilter;

      const matchesDate =
        !startDate || !endDate ||
        (lead.assigned_at &&
          dayjs(lead.assigned_at).isBetween(
            dayjs(startDate).startOf("day"),
            dayjs(endDate).endOf("day"),
            null,
            "[]"
          ));

      const matchesSearch =
        !searchTerm.trim() ||
        lead.business_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStage && matchesDate && matchesSearch;
    });

    setKpiFilteredLeads(filtered);
  }, [allLeads, stageFilter, startDate, endDate, searchTerm]);


  useEffect(() => {
    if (userProfile) fetchLeads(userProfile);
  }, [page, pageSize]);


  const fetchLeads = async (profile: Profile) => {
    try {
      // Count total leads FIRST (for pagination display)
      let countQuery = supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "Assigned");

      if (profile.roles === "Sales Associate") {
        countQuery = countQuery.eq("assigned_to", profile.full_name);
      }

      const { count } = await countQuery;
      setTotalRecords(count ?? 0);

      // Now fetch paginated leads
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("leads")
        .select(`
    id, business_id, name, email, phone,
    assigned_to, current_stage, status,
    created_at, assigned_at
  `)
        .eq("status", "Assigned")
        .order("assigned_at", { ascending: false })   // 👈 NEW SORT
        .range(from, to);


      if (profile.roles === "Sales Associate") {
        query = query.eq("assigned_to", profile.full_name);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching leads:", error);
        return;
      }

      const leadsData = (data ?? []).map((lead: any) => ({
        id: lead.id,
        business_id: lead.business_id,
        client_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        assigned_to: lead.assigned_to,
        current_stage: lead.current_stage,
        call_history: [],
        created_at: lead.created_at,
        assigned_at: lead.assigned_at,
      }));

      setLeads(leadsData);

    } catch (err) {
      console.error("Pagination fetch error:", err);
    }
  };

  const searchLeadsGlobally = async (term: string) => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select(`
        id, business_id, name, email, phone,
        assigned_to, assigned_to_email, current_stage,
        status, created_at, assigned_at
      `)
        .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,business_id.ilike.%${term}%`)
        .eq("status", "Assigned")
        .order("assigned_at", { ascending: false });

      if (error) {
        console.error("Global search error:", error);
        return;
      }

      const leadsData = (data ?? []).map((lead: any) => ({
        id: lead.id,
        business_id: lead.business_id,
        client_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        assigned_to: lead.assigned_to,
        assigned_to_email: lead.assigned_to_email,
        current_stage: lead.current_stage,
        call_history: [],
        created_at: lead.created_at,
        assigned_at: lead.assigned_at,
      }));

      setLeads(leadsData);
      setTotalRecords(leadsData.length);
    } catch (err) {
      console.error("Global search failed:", err);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      if (userProfile) fetchLeads(userProfile);
    }
  }, [searchTerm]);



  useEffect(() => {
    const multiplier =
      saleData.subscription_cycle === 0 ? 0 :
        saleData.subscription_cycle === 15 ? 0.5 :
          saleData.subscription_cycle === 30 ? 1 :
            saleData.subscription_cycle === 60 ? 2 :
              saleData.subscription_cycle === 90 ? 3 : 0;

    const applicationSale = saleData.base_value * multiplier;

    const addOns =
      (saleData.resume_value || 0) +
      (saleData.portfolio_value || 0) +
      (saleData.linkedin_value || 0) +
      (saleData.github_value || 0) +
      (saleData.courses_value || 0) +
      (saleData.custom_value || 0) +
      (saleData.badge_value || 0) +
      (saleData.job_board_value || 0);

    setTotalAmount(applicationSale + addOns);
  }, [
    saleData.base_value,
    saleData.subscription_cycle,
    saleData.resume_value,
    saleData.portfolio_value,
    saleData.linkedin_value,
    saleData.github_value,
    saleData.courses_value,
    saleData.custom_value,
    saleData.badge_value,
    saleData.job_board_value
  ]);




  /* 📅  Compute subscription-end date preview */
  useEffect(() => {
    if (!saleData.closed_at || !saleData.subscription_cycle) {
      setSubscriptionEndsOn(""); return;
    }
    const start = new Date(saleData.closed_at);
    start.setDate(start.getDate() + saleData.subscription_cycle);
    setSubscriptionEndsOn(start.toISOString().slice(0, 10));
  }, [saleData.closed_at, saleData.subscription_cycle]);


  const fetchFollowUps = async () => {
    if (!userProfile) return [];

    let leadsQuery = supabase
      .from("leads")
      .select("id, business_id, name, email, phone, assigned_to, current_stage")
      .in("current_stage", ["DNP", "Conversation Done", "Target"]);

    // 🔒 Filter by name if not Admin
    if (userProfile.roles === "Sales Associate") {
      leadsQuery = leadsQuery.eq("assigned_to", userProfile.full_name);
    }

    const { data: leadsData, error: leadsError } = await leadsQuery;
    if (leadsError) {
      console.error("❌ Error fetching leads:", leadsError);
      return [];
    }

    const businessIds = leadsData.map((l) => l.business_id);

    const { data: historyData, error: historyError } = await supabase
      .from("call_history")
      .select("id, lead_id, followup_date, notes")
      .in("lead_id", businessIds)
      .order("followup_date", { ascending: false });

    if (historyError) {
      console.error("❌ Error fetching call history:", historyError);
      return [];
    }

    const mostRecentMap = new Map<string, { followup_date: string; notes: string }>();
    for (const entry of historyData) {
      if (!mostRecentMap.has(entry.lead_id)) {
        mostRecentMap.set(entry.lead_id, {
          followup_date: entry.followup_date ?? "N/A",
          notes: entry.notes ?? "N/A",
        });
      }
    }

    return leadsData.map((lead) => ({
      ...lead,
      followup_date: mostRecentMap.get(lead.business_id)?.followup_date ?? "N/A",
      notes: mostRecentMap.get(lead.business_id)?.notes ?? "N/A",
    }));
  };

  // 🧭 Sorting Config
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Lead | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  const handleSort = (key: keyof Lead) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleUpdateAssignedTo = async (leadId: string, selectedName: string, selectedEmail: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);

      const { error } = await supabase
        .from("leads")
        .update({
          assigned_to: selectedName,
          assigned_to_email: selectedEmail,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;

      // Log assignment change to call history
      if (lead) {
        await supabase.from("call_history").insert([{
          lead_id: lead.business_id,
          email: lead.email,
          phone: lead.phone,
          assigned_to: selectedName,
          current_stage: lead.current_stage,
          followup_date: todayLocalYMD(),
          notes: `Lead re-assigned to ${selectedName} by ${userProfile?.full_name || "Unknown"}`
        }]);
      }

      alert(`Lead assigned to ${selectedName}`);
      if (userProfile) await fetchLeads(userProfile);
    } catch (err: any) {
      console.error("Error updating assigned_to:", err.message);
      alert("Failed to update assignment.");
    }
  };


  const filteredLeads = leads.filter((lead) => {
    const matchesStage = stageFilter === "all" || lead.current_stage === stageFilter;

    const matchesDate =
      !startDate || !endDate ||
      (lead.assigned_at &&
        dayjs(lead.assigned_at).isBetween(
          dayjs(startDate).startOf("day"),
          dayjs(endDate).endOf("day"),
          null,
          "[]"
        ));

    return matchesStage && matchesDate;
  });

  const handleStageUpdate = async (leadId: string, newStage: SalesStage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    setSelectedLead(lead);
    setPreviousStage(lead.current_stage); // Save current stage for revert

    if (newStage === "DNP" || newStage === "Conversation Done" || newStage === "Target") {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, current_stage: newStage } : l))
      );
      setPendingStageUpdate({ leadId, stage: newStage });
      setFollowUpDialogOpen(true);
      return;
    }

    if (newStage === "sale done") {

      window.open(`/SaleUpdate/${lead.business_id}?mode=new`, "_blank");

      return;
    }

    // Immediate update for other stages
    const updatedLead = { ...lead, current_stage: newStage };
    const { error } = await supabase.from("leads").update({ current_stage: newStage }).eq("id", leadId);
    if (error) {
      console.error("Error updating stage:", error);
      return;
    }

    await supabase.from("call_history").insert([{
      lead_id: lead.business_id,
      email: lead.email,
      phone: lead.phone,
      assigned_to: lead.assigned_to,
      current_stage: newStage,
      // followup_date: new Date().toISOString().split("T")[0],
      followup_date: todayLocalYMD(),

      notes: `Stage changed to ${newStage}`
    }]);

    setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)));
  };

  const handleFollowUpSubmit = async () => {
    if (!selectedLead || !pendingStageUpdate) return;

    const { error: historyError } = await supabase.from("call_history").insert([{
      lead_id: selectedLead.business_id,
      email: selectedLead.email,
      phone: selectedLead.phone,
      assigned_to: selectedLead.assigned_to,
      current_stage: pendingStageUpdate.stage,
      followup_date: followUpData.follow_up_date,
      notes: followUpData.notes
    }]);

    if (historyError) {
      console.error("Error inserting follow-up:", historyError);
      return;
    }

    const { error: stageError } = await supabase
      .from("leads")
      .update({ current_stage: pendingStageUpdate.stage })
      .eq("id", pendingStageUpdate.leadId);

    if (stageError) {
      console.error("Error updating stage:", stageError);
      return;
    }

    setLeads((prev) =>
      prev.map((l) =>
        l.id === pendingStageUpdate.leadId ? { ...l, current_stage: pendingStageUpdate.stage } : l
      )
    );
    setFollowUpsData((prev) =>
      prev.map((l) =>
        l.id === pendingStageUpdate.leadId ? { ...l, current_stage: pendingStageUpdate.stage } : l
      )
    );

    setFollowUpSubmitted(true);       // ← add this

    setFollowUpDialogOpen(false);
    setFollowUpData({ follow_up_date: "", notes: "" });
    setPendingStageUpdate(null);
    setPreviousStage(null);

    // 👇 After updating stage and call_history
    const updatedFollowUps = await fetchFollowUps();
    setFollowUpsData(updatedFollowUps);
    setFollowUpSubmitted(false);      // reset for next time

  };

  const handleFollowUpDialogClose = (open: boolean) => {
    if (!open) {
      if (!followUpSubmitted && pendingStageUpdate && previousStage) {
        setLeads(prev =>
          prev.map(l =>
            l.id === pendingStageUpdate.leadId ? { ...l, current_stage: previousStage } : l
          )
        );
      }
      // full reset
      setFollowUpSubmitted(false);
      setPendingStageUpdate(null);
      setPreviousStage(null);
      setFollowUpDialogOpen(false);
      return;
    }
    setFollowUpDialogOpen(true);
  };

  const totalLeadsCount = filteredLeads.length;

  const stageCounts = filteredLeads.reduce((acc, l) => {
    acc[l.current_stage] = (acc[l.current_stage] || 0) as number + 1;
    return acc;
  }, {} as Record<SalesStage, number>);


  const prospectCount = stageCounts["Prospect"] ?? 0;
  const dnpCount = stageCounts["DNP"] ?? 0;
  const convoDoneCount = stageCounts["Conversation Done"] ?? 0;
  const targetCount = stageCounts["Target"] ?? 0;
  const saleDoneCount = stageCounts["sale done"] ?? 0;

  const kpiFilteredTotal = kpiFilteredLeads.length;
  const kpiFilteredProspect = kpiFilteredLeads.filter(l => l.current_stage === "Prospect").length;
  const kpiFilteredDnp = kpiFilteredLeads.filter(l => l.current_stage === "DNP").length;
  const kpiFilteredConvo = kpiFilteredLeads.filter(l => l.current_stage === "Conversation Done").length;
  const kpiFilteredTarget = kpiFilteredLeads.filter(l => l.current_stage === "Target").length;
  const kpiFilteredSale = kpiFilteredLeads.filter(l => l.current_stage === "sale done").length;


  const actualTotal = allLeads.length;
  const actualProspect = allLeads.filter(l => l.current_stage === "Prospect").length;
  const actualDnp = allLeads.filter(l => l.current_stage === "DNP").length;
  const actualConvo = allLeads.filter(l => l.current_stage === "Conversation Done").length;
  const actualTarget = allLeads.filter(l => l.current_stage === "Target").length;
  const actualSale = allLeads.filter(l => l.current_stage === "sale done").length;


  // If you still want an “Others” bucket using the same list:
  const kpiOthersCount = kpiFilteredTotal - (kpiFilteredProspect + kpiFilteredDnp + kpiFilteredConvo + kpiFilteredTarget + + kpiFilteredSale);

  const othersCount = totalLeadsCount - (prospectCount + dnpCount + convoDoneCount + targetCount + saleDoneCount);
  const fetchCallHistory = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return [];

    const { data, error } = await supabase
      .from("call_history")
      .select("id, current_stage, followup_date, notes, call_duration_seconds, recording_url")
      .eq("lead_id", lead.business_id)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching call history:", error);
      return [];
    }

    const callHistoryData: CallHistory[] = data.map((r: any) => ({
      id: r.id,
      date: r.followup_date,
      stage: r.current_stage,
      notes: r.notes,
      duration: r.call_duration_seconds,
      recording_url: r.recording_url,
    }));
    return callHistoryData;
  };


  const fetchSalesUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, user_email")
      .in("roles", ["Sales", "Sales Associate", "Sale Associate", "Admin", "Super Admin"]);

    if (error) {
      console.error("Error fetching sales users:", error);
      return [];
    }

    setSalesUsers(data || []);
  };

  async function handleOnboardClientSubmit() {
    try {
      const confirmed = window.confirm("Are you sure you want to onboard this client?");
      if (!confirmed) return;

      const { data: idResult, error: idError } = await supabase.rpc('generate_custom_lead_id');
      if (idError || !idResult) {
        console.error("Failed to generate lead ID:", idError);
        return alert("Could not generate Lead ID. Try again.");
      }
      const newLeadId = idResult;

      const base = Number(subscriptionSaleValue || 0);
      const resume = Number(resumeValue || 0);
      const linkedin = Number(linkedinValue || 0);
      const github = Number(githubValue || 0);
      const portfolio = Number(portfolioValue || 0);
      const cycle = Number(subscriptionCycle || 0);

      const multiplier =
        cycle === 0 ? 0 :
          cycle === 15 ? 0.5 :
            cycle === 30 ? 1 :
              cycle === 60 ? 2 :
                cycle === 90 ? 3 : 0;

      const applicationSale = Number((base * multiplier).toFixed(2));

      const totalSaleCalc = base * multiplier + resume + linkedin + github + portfolio;

      // use local date strings for date columns stored as DATE in PG
      const createdAt = dayjs().toISOString();
      const onboardDate = toYMD(onboardingDate);   // "YYYY-MM-DD"

      const { error: leadsInsertError } = await supabase.from("leads").insert({
        business_id: newLeadId,
        name: clientName,
        email: clientEmail,
        phone: contactNumber,
        city: city,
        created_at: createdAt,
        source: subscriptionSource || "Onboarded Client",
        status: "Assigned",
        current_stage: "sale done", // optional: if you onboard only after closing
      });
      if (leadsInsertError) throw leadsInsertError;

      const { error: salesInsertError } = await supabase.from("sales_closure").insert({
        lead_id: newLeadId,
        email: clientEmail,
        lead_name: clientName,
        payment_mode: paymentMode,
        subscription_cycle: cycle,
        sale_value: totalSaleCalc,
        closed_at: onboardDate,                // if column is date
        onboarded_date: onboardDate,          // if you store this too
        finance_status: "Paid",
        application_sale_value: applicationSale,
        resume_sale_value: resume || null,
        linkedin_sale_value: linkedin || null,
        github_sale_value: github || null,
        portfolio_sale_value: portfolio || null,
        associates_email: "",
        associates_name: "",
        associates_tl_email: "",
        associates_tl_name: "",
        checkout_date: null,
        invoice_url: "",
        no_of_job_applications: null,
        badge_value: saleData.badge_value ?? null,      // ✅ optional here

      });
      if (salesInsertError) throw salesInsertError;

      // refresh list
      if (userProfile) await fetchLeads(userProfile);

      // reset
      setClientName(""); setClientEmail(""); setContactNumber(""); setCity("");
      setOnboardingDate(""); setSubscriptionCycle(""); setSubscriptionSaleValue("");
      setPaymentMode(""); setResumeValue(""); setPortfolioValue(""); setLinkedinValue(""); setGithubValue("");
      setOnboardDialogOpen(false);
      alert("✅ Client onboarded successfully!");
    } catch (err: any) {
      console.error("❌ Error onboarding client:", err?.message || err);
      alert(`Failed to onboard client: ${err?.message || "Unknown error"}`);
    }
  }

  const handleUpdateNote = async (call: CallHistory) => {
    try {
      const { error } = await supabase
        .from("call_history")
        .update({ notes: editedNote })
        .eq("id", call.id);                 // ← precise update

      if (error) throw error;

      const updated = await fetchCallHistory(selectedLead!.id);
      setSelectedLead((prev) => (prev ? { ...prev, call_history: updated } : null));
      setEditingNote(false);
      alert("Note updated!");
    } catch (err) {
      console.error("Failed to update note:", err);
      alert("Failed to update note.");
    }
  };

  // Function to fetch data from all tables and export them as Excel
  const downloadAllTablesData = async () => {
    try {
      // Table names we want to fetch
      const tables = ['call_history', 'client_feedback', 'client_onborading_details', 'github_progress', 'google_sheets_config', 'leads', 'portfolio_progress', 'profiles',
        'resume_progress', 'sales_closure', 'full_client_status_pending_onboarding', 'full_client_status_pending_jobboard',
        'full_client_status_view_app_exists', 'full_client_status_excluding_oldest', 'full_client_status_final'];
      const data: { [key: string]: any } = {};

      // Fetch data from all tables and store them in an object
      for (const table of tables) {
        const { data: tableData, error } = await supabase.from(table).select("*");
        if (error) {
          console.error(`Error fetching data from ${table}:`, error);
          continue;
        }
        data[table] = tableData;
      }

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Loop through the data object and add each table's data as a new sheet in the workbook
      for (const table in data) {
        if (data[table]) {
          const ws = XLSX.utils.json_to_sheet(data[table]);
          // Excel sheet names cannot exceed 31 characters. 
          // We trim from the left to keep the more descriptive right side.
          const sheetName = table.length > 31 ? table.slice(-31) : table;
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      }

      // Export the workbook to an Excel file
      XLSX.writeFile(wb, "SalesData.xlsx");
    } catch (error) {
      console.error("Error downloading tables data:", error);
    }
  };

  // —— helpers (local-date safe) ——
  const toYMD = (d?: string | Date) => (d ? dayjs(d).format("YYYY-MM-DD") : "");
  const todayLocalYMD = () => dayjs().format("YYYY-MM-DD");

  const cycleMultiplier = (d?: number) =>
    d === 0 ? 0 : d === 15 ? 0.5 : d === 30 ? 1 : d === 60 ? 2 : d === 90 ? 3 : 0;

  // 👉 ADD THIS derived constant (place near your other derived consts)
  const applicationSaleValue = Number(
    (saleData.base_value * cycleMultiplier(saleData.subscription_cycle)).toFixed(2)
  );

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;

    let aValue: any = a[key];
    let bValue: any = b[key];

    // 📅 Date fields
    if (key === 'created_at' || key === 'assigned_at') {
      const aTime = aValue ? new Date(aValue).getTime() : 0;
      const bTime = bValue ? new Date(bValue).getTime() : 0;
      return direction === 'asc' ? aTime - bTime : bTime - aTime;
    }

    // 🔤 String fields
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // 🔢 Number fields fallback
    return direction === 'asc'
      ? (aValue || 0) - (bValue || 0)
      : (bValue || 0) - (aValue || 0);
  });

  const fetchSalesClosureCount = async () => {
    const { count, error } = await supabase
      .from("sales_closure")
      .select("lead_id", { count: "exact", head: true });

    if (!error) setSalesClosedTotal(count ?? 0);
  };


  return (
    <ProtectedRoute allowedRoles={["Sales", "Sales Associate", "Super Admin", "Admin"]}>

      <DashboardLayout>
        <div className="space-y-6 relative pointer-events-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Sales CRM</h1>

            <div className="flex justify-end items-center gap-2 relative z-50 pointer-events-auto">


              {userProfile?.roles === "Admin" && (
                <Button
                  onClick={downloadAllTablesData}
                  className="ml-2"
                >
                  Download All Database data
                </Button>
              )}

              {(userProfile?.roles === "Super Admin" || userProfile?.roles === "Admin" || userProfile?.roles === "Sales Associate" || userProfile?.roles === "Sales") && (
                <Button
                  onClick={() => setView(view === "leads" ? "activity" : "leads")}
                  className="bg-orange-500 hover:bg-orange-600 text-white border-none min-w-[120px] h-10 px-6 cursor-pointer shadow-sm transition-all"
                >
                  {view === "leads" ? "Activity" : "Back to Leads"}
                </Button>
              )}

              <Button
                onClick={() => window.open("/sales/followups", "_blank")}
              >
                Follow Ups
              </Button>
              <Button
                onClick={() => window.open("/SalesAddonsInfo", "_blank")}
              >
                Portfolio/Resumes
              </Button>


            </div>

          </div>
          {view === "activity" ? (
            <ActivityView userProfile={userProfile} onBack={() => setView("leads")} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Dialog open={followUpsDialogOpen} onOpenChange={setFollowUpsDialogOpen}>
                  <DialogContent className="max-w-7xl" onPointerDownOutside={(e) => e.preventDefault()}>

                    <DialogHeader>
                      <DialogTitle>Follow Ups – DNP / Conversation Done</DialogTitle>
                      <DialogDescription>Leads with scheduled follow-ups</DialogDescription>
                      <div className="flex justify-end mb-4">
                        <Select value={followUpsFilter} onValueChange={(val) => setFollowUpsFilter(val as "today" | "all")}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by Date" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="all">All Dates</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S.No</TableHead>
                            <TableHead>Business ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Follow-up Date</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {followUpsData.filter((item) => {
                            if (followUpsFilter === "all") return true;
                            if (!item.followup_date) return false;
                            const today = todayLocalYMD();
                            return item.followup_date === today;
                          }).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                                {followUpsFilter === "all"
                                  ? "No follow-up data available."
                                  : "There are no follow ups today."}
                              </TableCell>
                            </TableRow>
                          ) : (
                            followUpsData
                              .filter((item) => {
                                if (followUpsFilter === "all") return true;
                                if (!item.followup_date) return false;
                                const today = todayLocalYMD();
                                return item.followup_date === today;
                              })
                              .map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{idx + 1}</TableCell>
                                  <TableCell>{item.business_id}</TableCell>
                                  {/* <TableCell>{item.name}</TableCell> */}

                                  <TableCell
                                    className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                                    onClick={() => window.open(`/leads/${item.business_id}`, "_blank")}
                                  >
                                    {item.name}
                                  </TableCell>

                                  <TableCell>{item.email}</TableCell>
                                  <TableCell>{item.phone}</TableCell>
                                  <TableCell>{item.assigned_to}</TableCell>
                                  <TableCell>
                                    <Select value={item.current_stage}
                                      onValueChange={(value: SalesStage) => {
                                        const selectedItem = followUpsData.find((f) => f.id === item.id);
                                        if (!selectedItem) return;
                                        handleStageUpdate(item.id, value);
                                      }}

                                    >
                                      {/* <SelectTrigger className="w-40"><SelectValue /></SelectTrigger> */}
                                      <SelectTrigger
                                        className={`w-40 ${item.current_stage === "sale done"
                                          ? "pointer-events-none opacity-100 text-black bg-gray-100 border border-gray-300 cursor-not-allowed"
                                          : ""
                                          }`}
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {salesStages
                                          .filter((stage) => item.current_stage === "Prospect" || stage !== "Prospect")
                                          .map((stage) => (
                                            <SelectItem key={stage} value={stage}>
                                              <Badge className={getStageColor(stage)}>{stage}</Badge>
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>

                                  <TableCell>{item.followup_date}</TableCell>
                                  <TableCell>{item.notes}</TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                </Dialog>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium ">All leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiFilteredTotal}</div>
                    <p className="text-xs text-green-600 font-bold">
                      Total (Based on filter and pagination): {totalLeadsCount}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Prospects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiFilteredProspect}</div>
                    <p className="text-xs text-green-600 font-bold">
                      Total: {prospectCount}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">DNP & Conversation Done</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiFilteredDnp + kpiFilteredConvo}</div>
                    <p className="text-xs text-green-600 font-bold">
                      Total: {dnpCount + convoDoneCount}
                    </p>
                  </CardContent>
                </Card>


                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Sales Done (from leads)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiFilteredSale}</div>
                    <p className="text-xs text-green-600 font-bold">
                      Total: {saleDoneCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Target</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiFilteredTarget}</div>
                    <p className="text-xs text-green-600 font-bold">
                      Total: {targetCount}
                    </p>
                  </CardContent>
                </Card>


                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Others</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiOthersCount}</div>
                    <p className="text-xs text-green-600 font-bold">
                      Total: {othersCount}
                    </p>
                  </CardContent>
                </Card>


              </div>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">


                <div className="flex gap-3 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      value={inputSearch}
                      onChange={(e) => setInputSearch(e.target.value)}
                      className="pl-10"
                    />

                  </div>

                  <Button
                    disabled={isChecking || !inputSearch.trim()}
                    onClick={async () => {
                      setIsChecking(true);

                      setSearchTerm(inputSearch.trim()); // <- assign here
                      await searchLeadsGlobally(inputSearch.trim());

                      setIsChecking(false);
                    }}
                    className="w-28"
                  >
                    {isChecking ? "Searching..." : "Search"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isChecking}
                    onMouseEnter={() => setIsHoveringClear(true)}
                    onMouseLeave={() => setIsHoveringClear(false)}
                    onClick={() => {
                      setInputSearch("");
                      setSearchTerm("");
                      if (userProfile) fetchLeads(userProfile);
                    }}
                    className="px-4 bg-red-50 text-gray-900 hover:bg-red-300 focus:ring-red-500 transition-all duration-200"
                  >
                    {isHoveringClear ? "Clear Search" : "❌"}
                  </Button>


                </div>

                <Select value={String(pageSize)} onValueChange={(v) => {
                  if (v === "all") {
                    setPageSize(totalRecords);
                    setPage(1);
                  } else {
                    setPageSize(Number(v));
                    setPage(1);
                  }
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                    <SelectItem value="200">200 per page</SelectItem>
                    <SelectItem value="500">500 per page</SelectItem>
                    <SelectItem value="1000">1000 per page</SelectItem>

                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stageFilter} onValueChange={(val) => {
                  if (val === "sale done") {
                    setSalesDialogMode("all");
                    setShowSalesDialog(true);
                    // Keep the filter as is, or set to 'all', or 'sale done' based on preference.
                    setStageFilter("sale done");
                  } else {
                    setStageFilter(val);
                    setPage(1);
                  }
                }}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {salesStages.map(stage => (<SelectItem key={stage} value={stage}>{stage}</SelectItem>))}
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-[300px]">
                  {/* 📅 Button Trigger */}
                  <div
                    onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                    className="bg-white border rounded-md shadow-sm px-4 py-2 cursor-pointer flex justify-between items-center"
                  >
                    <span>
                      {startDate && endDate
                        ? `📅 ${dayjs(startDate).format('DD MMM')} → ${dayjs(endDate).format('DD MMM')}`
                        : "📅 Date Range"}
                    </span>
                    <span className="text-gray-400">▼</span>
                  </div>

                  {/* 📅 Dropdown Content */}
                  {isDateDropdownOpen && (
                    <div className="absolute z-50 mt-2 bg-white rounded-md shadow-lg p-4 w-[300px] border space-y-4">
                      <div>
                        <Label className="text-sm text-gray-600">Start Date</Label>
                        <Input
                          type="date"
                          value={startDate ?? ""}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label className="text-sm text-gray-600">End Date</Label>
                        <Input
                          type="date"
                          value={endDate ?? ""}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        className="text-red-500 text-sm p-0"
                        onClick={() => {
                          setStartDate(null);
                          setEndDate(null);
                          setIsDateDropdownOpen(false); // close on clear
                        }}
                      >
                        ❌ Clear Filter
                      </Button>
                    </div>
                  )}
                </div>

                {/* Advanced Report Button */}
                {/* <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => {
                setSalesDialogMode("all");
                setShowSalesDialog(true);
              }}
            >
              Advanced Report
            </Button> */}

              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Sales Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>S.No</TableHead>


                          <TableHead onClick={() => handleSort("business_id")} className="cursor-pointer select-none">
                            <div className="flex items-center gap-1">
                              Business ID
                              <span className="text-sm">
                                <span className={sortConfig.key === "business_id" && sortConfig.direction === "asc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↓
                                </span>
                                <span className={sortConfig.key === "business_id" && sortConfig.direction === "desc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↑
                                </span>
                              </span>
                            </div>
                          </TableHead>

                          <TableHead onClick={() => handleSort("client_name")} className="cursor-pointer select-none">
                            <div className="flex items-center gap-1">
                              Client Name
                              <span className="text-sm">
                                <span className={sortConfig.key === "client_name" && sortConfig.direction === "asc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↑
                                </span>
                                <span className={sortConfig.key === "client_name" && sortConfig.direction === "desc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↓
                                </span>
                              </span>
                            </div>
                          </TableHead>

                          <TableHead className="w-32">Email</TableHead>
                          <TableHead>Phone</TableHead>

                          <TableHead onClick={() => handleSort("created_at")} className="cursor-pointer select-none w-40">
                            <div className="flex items-center gap-1">
                              Created At
                              <span className="text-sm">
                                <span className={sortConfig.key === "created_at" && sortConfig.direction === "asc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↑
                                </span>
                                <span className={sortConfig.key === "created_at" && sortConfig.direction === "desc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↓
                                </span>
                              </span>
                            </div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("created_at")} className="cursor-pointer select-none w-20">
                            <div className="flex items-center gap-1">
                              Lead Age
                              <span className="text-sm">
                                <span className={sortConfig.key === "created_at" && sortConfig.direction === "asc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↑
                                </span>
                                <span className={sortConfig.key === "created_at" && sortConfig.direction === "desc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↓
                                </span>
                              </span>
                            </div>
                          </TableHead>

                          <TableHead onClick={() => handleSort("assigned_at")} className="cursor-pointer select-none w-40">
                            <div className="flex items-center gap-1">
                              Assigned At
                              <span className="text-sm">
                                <span className={sortConfig.key === "assigned_at" && sortConfig.direction === "asc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↑
                                </span>
                                <span className={sortConfig.key === "assigned_at" && sortConfig.direction === "desc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↓
                                </span>
                              </span>
                            </div>
                          </TableHead>

                          <TableHead onClick={() => handleSort("assigned_to")} className="cursor-pointer select-none">
                            <div className="flex items-center gap-1">
                              Assigned To
                              <span className="text-sm">
                                <span className={sortConfig.key === "assigned_to" && sortConfig.direction === "asc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↑
                                </span>
                                <span className={sortConfig.key === "assigned_to" && sortConfig.direction === "desc" ? "font-bold text-blue-600" : "text-gray-400"}>
                                  ↓
                                </span>
                              </span>
                            </div>
                          </TableHead>
                          <TableHead>Re-assign</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {sortedLeads.map((lead, idx) => (
                          <TableRow key={lead.id}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{lead.business_id}</TableCell>
                            {/* <TableCell>{lead.client_name}</TableCell> */}
                            <TableCell
                              className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                              onClick={() => window.open(`/leads/${lead.business_id}`, "_blank")}
                            >
                              {lead.client_name}
                            </TableCell>
                            <TableCell className="w-32 truncate">{lead.email}</TableCell>
                            <TableCell
                              className="cursor-pointer text-blue-600 hover:underline hover:bg-blue-50 transition-colors"
                              onClick={() => handlePhoneClick(lead.phone)}
                              title="Click to call"
                            >
                              {lead.phone}
                            </TableCell>

                            <TableCell className="w-40">
                              {lead.created_at ? dayjs(lead.created_at).format("DD MMM YYYY") : "N/A"}
                            </TableCell>

                            <TableCell>
                              {lead.created_at ? `${dayjs().diff(dayjs(lead.created_at), "day")} days` : "N/A"}
                            </TableCell>

                            <TableCell className="w-40">
                              {lead.assigned_at ? dayjs(lead.assigned_at).format("DD MMM YYYY") : "N/A"}
                            </TableCell>

                            <TableCell >{lead.assigned_to}</TableCell>

                            <TableCell>
                              <Select
                                value={lead.assigned_to || ""}
                                onValueChange={(selectedName) => {
                                  const selectedUser = salesUsers.find(user => user.full_name === selectedName);
                                  const selectedEmail = selectedUser ? selectedUser.user_email : ""; // Get the email from the selected user
                                  handleUpdateAssignedTo(lead.id, selectedName, selectedEmail); // Pass both name and email
                                }}
                              >
                                <SelectTrigger className="w-52 cursor-pointer">
                                  <SelectValue placeholder="Assign to..." />
                                </SelectTrigger>

                                <SelectContent>
                                  {salesUsers.map((user) => (
                                    <SelectItem key={user.full_name} value={user.full_name}>
                                      {user.full_name}{" "}
                                      <span className="text-gray-500 text-xs">({user.user_email})</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                            </TableCell>



                            <TableCell>
                              <div className="flex items-center gap-4 relative z-50 pointer-events-auto">
                                <Select
                                  value={lead.current_stage}
                                  onValueChange={(value: SalesStage) => handleStageUpdate(lead.id, value)}
                                >
                                  <SelectTrigger className="w-40 cursor-pointer">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {salesStages
                                      .filter((stage) => lead.current_stage === "Prospect" || stage !== "Prospect")
                                      .map((stage) => (
                                        <SelectItem key={stage} value={stage}>
                                          <Badge className={getStageColor(stage)}>{stage}</Badge>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {lead.current_stage === "sale done" && (
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                      window.open(`/SaleUpdate/${lead.business_id}?mode=edit`, "_blank")
                                    }
                                    title="Edit sale close"
                                  >
                                    <EditIcon className="h-5 w-5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>



                            <TableCell className="relative z-50 pointer-events-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                className=""
                                onClick={async () => {
                                  const callHistory = await fetchCallHistory(lead.id);
                                  setSelectedLead({ ...lead, call_history: callHistory });
                                  setHistoryDialogOpen(true);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex items-center justify-between py-4">

                      <div className="text-sm text-gray-600">
                        Page {page} of {Math.ceil(totalRecords / pageSize)}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          disabled={page === 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Previous
                        </Button>

                        <Button
                          variant="outline"
                          disabled={page === Math.ceil(totalRecords / pageSize)}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>


              {/* History Dialog */}
              <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} >
                {/* <DialogContent className="max-w-2xl"> */}
                <DialogContent className="max-w-5xl" onPointerDownOutside={(e) => e.preventDefault()}>

                  <DialogHeader>
                    <DialogTitle>{selectedLead?.client_name} - Call History</DialogTitle>
                    <DialogDescription>Complete call history</DialogDescription>
                  </DialogHeader>

                  {selectedLead && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Email</Label><p>{selectedLead.email}</p></div>
                        <div><Label>Phone</Label><p>{selectedLead.phone}</p></div>
                        <div><Label>Assigned To</Label><p>{selectedLead.assigned_to}</p></div>
                        <div><Label>Current Stage</Label><Badge className={getStageColor(selectedLead.current_stage)}>{selectedLead.current_stage}</Badge></div>
                      </div>

                      <div>
                        <Label>Call History</Label>
                        <div className="space-y-3 max-h-64 overflow-y-auto">

                          {selectedLead.call_history.map((call, index) => {
                            const isLatest = index === 0;
                            const recordNumber = selectedLead.call_history.length - index;
                            return (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-1">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-400">#{recordNumber}</span>
                                    <Badge className={getStageColor(call.stage)}>{call.stage}</Badge>
                                  </div>
                                  <span className="text-xs text-gray-500">{call.date}</span>
                                </div>

                                {/* ✏️ Editable note for latest only */}
                                {isLatest && editingNote ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editedNote}
                                      onChange={(e) => setEditedNote(e.target.value)}
                                    />
                                    <Button size="sm" onClick={() => handleUpdateNote(call)}>
                                      Save
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col w-full">
                                    <div className="flex justify-between items-start">
                                      <p className="text-sm text-gray-600 flex-1">{call.notes}</p>
                                      {isLatest && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5 text-lg text-gray-500 ml-2"
                                          onClick={() => {
                                            setEditingNote(true);
                                            setEditedNote(call.notes);
                                          }}
                                        >
                                          <EditIcon className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap justify-between items-center mt-3 pt-2 border-t border-gray-100 gap-4">
                                      {call.duration !== undefined && call.duration > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                                          <span>⏱️ Duration:</span>
                                          <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                                        </div>
                                      )}
                                      {call.recording_url && (
                                        <div className="flex items-center gap-3">
                                          <a
                                            href={call.recording_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-xs underline flex items-center gap-1 font-medium"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                            Open Recording
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog open={followUpDialogOpen} onOpenChange={handleFollowUpDialogClose}>
                <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>

                  <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Follow-up Date</Label>
                      <Input type="date" value={followUpData.follow_up_date} onChange={(e) =>
                        setFollowUpData((prev) => ({ ...prev, follow_up_date: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea placeholder="Add notes..." value={followUpData.notes} onChange={(e) =>
                        setFollowUpData((prev) => ({ ...prev, notes: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleFollowUpSubmit}>Save Follow-up</Button></DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={onboardDialogOpen} onOpenChange={setOnboardDialogOpen}>
                <DialogContent className="max-w-5xl" onPointerDownOutside={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      🧾 Onboard New Client
                    </DialogTitle>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client Details */}
                    <div className="border rounded-md p-4 space-y-3">
                      <Label className="font-semibold">Client Details <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Client Full Name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />

                      <Input
                        placeholder="Client Email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                      />

                      <Input
                        placeholder="Contact Number with country code"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                      />

                      <Input
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />

                      <Input
                        type="date"
                        value={onboardingDate}
                        onChange={(e) => setOnboardingDate(e.target.value)}
                        placeholder="dd-mm-yyyy"
                      />


                    </div>

                    {/* Subscription & Payment Info */}
                    <div className="border rounded-md p-4 space-y-3">
                      <Label className="font-semibold">Subscription & Payment Info <span className="text-red-500">*</span></Label>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Payment Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="PayPal">PayPal</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Credit/Debit Card">Credit/Debit Card</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={subscriptionCycle} onValueChange={setSubscriptionCycle}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Subscription Duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No applications subscription</SelectItem>
                          <SelectItem value="15">15 Days</SelectItem>
                          <SelectItem value="30">1 Month</SelectItem>
                          <SelectItem value="60">2 Months</SelectItem>
                          <SelectItem value="90">3 Months</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Subscription Sale Value ($)"
                        value={subscriptionSaleValue}
                        onChange={(e) => setSubscriptionSaleValue(e.target.value)}
                      />

                      <Input
                        placeholder="Auto Total (Subscription Only)"
                        value={autoTotal}
                        disabled
                      />

                      <Select value={subscriptionSource} onValueChange={setSubscriptionSource}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Client Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="NEW">NEW</SelectItem>
                        </SelectContent>
                      </Select>

                    </div>
                  </div>

                  {/* Add-on Services */}
                  <div className="border rounded-md p-4 mt-4 space-y-3">
                    <Label className="font-semibold">Optional Add-On Services</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Resume Sale Value ($)"
                        value={resumeValue}
                        onChange={(e) => setResumeValue(e.target.value)}
                      />

                      <Input
                        placeholder="Portfolio Creation Value ($)"
                        value={portfolioValue}
                        onChange={(e) => setPortfolioValue(e.target.value)}
                      />

                      <Input
                        placeholder="LinkedIn Optimization Value ($)"
                        value={linkedinValue}
                        onChange={(e) => setLinkedinValue(e.target.value)}
                      />

                      <Input
                        placeholder="GitHub Optimization Value ($)"
                        value={githubValue}
                        onChange={(e) => setGithubValue(e.target.value)}
                      />

                    </div>
                  </div>

                  <div className="border rounded-md p-4 mt-4">
                    <Label className="font-semibold">Auto Calculated</Label>
                    <div className="flex justify-between mt-2">

                      <p>Total Sale Value: <strong>${totalSale}</strong></p>
                      <p>Next Payment Due Date: <strong>{nextDueDate}</strong></p>

                    </div>
                  </div>

                  {/* Submit */}
                  <DialogFooter className="pt-4">
                    <Button
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={handleOnboardClientSubmit}
                    >
                      Submit
                    </Button>

                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <SalesClosureDialog
                isOpen={showSalesDialog}
                onClose={() => {
                  setShowSalesDialog(false);
                  // Optional: reset filter to 'all' if user closes dialog so they see data again
                  if (stageFilter === "sale done") setStageFilter("all");
                }}
                currentUser={userProfile}
                defaultMode={salesDialogMode}
              />
              <ZoomPhoneEmbed ref={zoomEmbedRef} callerEmail={userEmail} />
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}