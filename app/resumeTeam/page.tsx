
// app/resumeTeam/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"; // top of file with other imports
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";


import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/components/providers/auth-provider";
import { PrefetchCacheEntryStatus } from "next/dist/client/components/router-reducer/router-reducer-types";
import path from "path";

/* =========================
   Types & Labels
   ========================= */

type FinanceStatus = "Paid" | "Unpaid" | "Paused" | "Closed" | "Got Placed";

type ResumeStatus = "not_started" | "pending" | "waiting_client_approval" | "completed";
const STATUS_LABEL: Record<ResumeStatus, string> = {
  not_started: "Not started",
  pending: "Pending",
  waiting_client_approval: "Waiting for Client approval",
  completed: "Completed",
};

/** Portfolio status from the technical team (read-only here) */
type PortfolioStatus = "not_started" | "pending" | "waiting_client_approval" | "success";
const PORTFOLIO_STATUS_LABEL: Record<PortfolioStatus, string> = {
  not_started: "Not started",
  pending: "Pending",
  waiting_client_approval: "Waiting for Client approval",
  success: "Success",
};



interface SalesClosure {
  id: string;
  lead_id: string; // TEXT in DB (business_id from leads)
  email: string;
  company_application_email: string | null;
  finance_status: FinanceStatus;
  closed_at: string | null;
  onboarded_date_raw: string | null;     // <- keep raw
  onboarded_date_label: string;          // <- formatted for UI
  resume_sale_value?: number | null;
 portfolio_sale_value?: number | string | null; // keep raw if you still want it
  portfolio_paid: boolean;    
  commitments?: string | null;
  badge_value?: number | null;


  // joined
  leads?: { name: string; phone: string };

  // resume_progress
  rp_status: ResumeStatus;
  rp_pdf_path: string | null;
  assigned_to_email: string | null;
  assigned_to_name: string | null;

  // portfolio_progress (read-only here)
  pp_status: PortfolioStatus | null;
  pp_assigned_email: string | null;
  pp_assigned_name: string | null;
  pp_link: string | null;
}

type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

const RESUME_COLUMNS = [
  "S.No",
  "Client ID",
  "Name",
  "Email",
  "Application email",
  "Phone",
  "Status",
  "Resume Status",
  "Assigned to",
  "Resume PDF",
  "Closed At",
  "Onboarded Date",
  "Portfolio Status",
  "Portfolio Link",
  "Portfolio Assignee",
  "Client Requirements",
  "Onboard", // <- added to match the extra cell
] as const;

/* =========================
   Component
   ========================= */

export default function ResumeTeamPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SalesClosure[]>([]);
  const [uploadForLead, setUploadForLead] = useState<string | null>(null);
  const [replacingOldPath, setReplacingOldPath] = useState<string | null>(null);
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqRow, setReqRow] = useState<SalesClosure | null>(null);
  // Was the upload triggered from main table or My Tasks?
const [uploadContext, setUploadContext] = useState<"main" | "myTasks">("main");
const [selectedTab, setSelectedTab] = useState("main"); // Default to 'main'


const [startDate, setStartDate] = useState<string | null>(null); // Start date
const [endDate, setEndDate] = useState<string | null>(null); // End date

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);


const [filterDialogOpen, setFilterDialogOpen] = useState(false);
const [filterTab, setFilterTab] = useState<"notOnboarded" | "resumeOnly">("notOnboarded");
const [filterRows, setFilterRows] = useState<SalesClosure[]>([]);
const [filterLoading, setFilterLoading] = useState(false);



  // --- "My Tasks" dialog state ---
const [myTasksOpen, setMyTasksOpen] = useState(false);
const [myTasksRows, setMyTasksRows] = useState<SalesClosure[]>([]);
const [myTasksLoading, setMyTasksLoading] = useState(false);
const [myTasksError, setMyTasksError] = useState<string | null>(null);


  // NEW: team members (Resume Head + Resume Associate)
  const [resumeTeamMembers, setResumeTeamMembers] = useState<TeamMember[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("__all__"); 

  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
// const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
const [dialogLoading, setDialogLoading] = useState(false);
// latest onboarding row id (so we can update the most recent record)
const [latestOnboardRowId, setLatestOnboardRowId] = useState<string | null>(null);

const [notOnboardedDialogOpen, setNotOnboardedDialogOpen] = useState(false);
const [resumeOnlyDialogOpen, setResumeOnlyDialogOpen] = useState(false);

// form values in the dialog
const [obFullName, setObFullName] = useState("");
const [obPersonalEmail, setObPersonalEmail] = useState("");
const [obCompanyEmail, setObCompanyEmail] = useState("");
const [obCallablePhone, setObCallablePhone] = useState("");
const [obJobRolesText, setObJobRolesText] = useState("");      // comma-separated
const [obLocationsText, setObLocationsText] = useState("");    // comma-separated
const [obSalaryRange, setObSalaryRange] = useState("");
const [obWorkAuth, setObWorkAuth] = useState("");
const [obDate, setObDate] = useState<string>("");              // yyyy-mm-dd
// NEW fields for client_onborading_details
const [obNeedsSponsorship, setObNeedsSponsorship] = useState<boolean | null>(null);
const [obFullAddress, setObFullAddress] = useState("");
const [obLinkedInUrl, setObLinkedInUrl] = useState("");
const [obDob, setObDob] = useState<string>(""); // yyyy-mm-dd



const csvFromArray = (arr?: string[] | null) => (arr && arr.length ? arr.join(", ") : "");
const csvToArray = (s: string) => s.split(",").map(v => v.trim()).filter(Boolean);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  /* =========================
     Fetch helpers
     ========================= */

  const formatDateLabel = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const formatOnboardLabel = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB") : "Not Started";

  const fetchTeamMembers = async () => {
  // Try users first
  let members: TeamMember[] = [];
  let errMsg: string | null = null;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,role")
      .in("role", ["Resume Head", "Resume Associate"]);

    if (error) {
      errMsg = error?.message ?? String(error);
    } else if (data) {
      members = data;
    }
  } catch (e: any) {
    errMsg = e?.message ?? String(e);
  }

  // Fallback to profiles if users failed or returned empty
  if (members.length === 0) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,full_name,user_email,roles")
        .in("roles", ["Resume Head", "Resume Associate"]);

      if (!error && data) {
        // Map to TeamMember shape
        members = data.map((d: any) => ({
          id: d.user_id,
          name: d.full_name ?? d.name ?? null,
          email: d.user_email ?? null,
          role: d.roles ?? null,
        }));
      }
    } catch {
      // ignore
    }
  }

  // If still empty, don’t spam console — just set empty list.
  setResumeTeamMembers(members);

};

// ---- Sorting ----
type SortKey = "clientId" | "name" | "email" | "closedAt" | "onboarded" | "portfolio";
type SortDir = "asc" | "desc";
const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({
  key: "closedAt",
  dir: "desc",
});

// const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({ key: null, dir: "asc" });

const toggleSort = (key: SortKey) => {
  setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
};

// Extract numeric part from "AWL-1604" → 1604
const parseClientIdNum = (id?: string | null) => {
  if (!id) return -Infinity;
  const m = id.match(/(\d+)$/);
  return m ? Number(m[1]) : -Infinity;
};

const dateToMs = (d?: string | null) => (d ? new Date(d).getTime() : -Infinity);

const safeStr = (s?: string | null) => (s ?? "").toLowerCase();

// Paid first when sorting desc (true > false). When asc, false > true.
const boolToNum = (b: boolean) => (b ? 1 : 0);

// Generic comparator with nulls pushed to the end (for asc).
const cmp = (a: number | string, b: number | string) => (a < b ? -1 : a > b ? 1 : 0);

const sortRowsBy = (arr: SalesClosure[]) => {
  if (!sort.key) return arr;
  const copy = [...arr];
  copy.sort((A, B) => {
    let vA: number | string;
    let vB: number | string;

    switch (sort.key) {
      case "clientId":
        vA = parseClientIdNum(A.lead_id);
        vB = parseClientIdNum(B.lead_id);
        break;
      case "name":
        vA = safeStr(A.leads?.name);
        vB = safeStr(B.leads?.name);
        break;
      case "email":
        vA = safeStr(A.email);
        vB = safeStr(B.email);
        break;
      case "closedAt":
        vA = dateToMs(A.closed_at);
        vB = dateToMs(B.closed_at);
        break;
      case "onboarded":
        vA = dateToMs(A.onboarded_date_raw);
        vB = dateToMs(B.onboarded_date_raw);
        break;
      case "portfolio":
        vA = boolToNum(A.portfolio_paid);
        vB = boolToNum(B.portfolio_paid);
        break;
      default:
        vA = 0; vB = 0;
    }
    const base = cmp(vA, vB);
    return sort.dir === "asc" ? base : -base;
  });
  return copy;
};

// Use it for main table
const sortedRows = React.useMemo(() => sortRowsBy(rows), [rows, sort]);
const mySortedRows = React.useMemo(() => sortRowsBy(myTasksRows), [myTasksRows, sort]);


// Small icon component for header arrows
const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) =>
  active ? (dir === "asc" ? <ArrowUp className="ml-1 h-6 w-6" /> : <ArrowDown className="ml-1 h-6 w-6" />) : (
    <ArrowUpDown className="ml-1 h-4 w-4 opacity-60" />
  );


// const fetchData = async (opts?: { assigneeEmail?: string | null; unassigned?: boolean }) => {

// const fetchData = async (opts?: {
//   assigneeEmail?: string | null;
//   unassigned?: boolean;
//   mode?: "main" | "notOnboarded" | "resumeOnly";
// }) => {


//   // 0) Resolve filter → get allowed lead_ids from resume_progress if needed
//   let allowLeadIds: string[] | null = null;

//   try {
//    if (opts?.unassigned) {
//   // Get all leads from sales_closure
//   const { data: allSales, error: scErr } = await supabase
//     .from("sales_closure")
//     .select("lead_id");

//   if (scErr) throw scErr;

//   const allLeadIds = (allSales ?? []).map((x) => x.lead_id);

//   // Get all leads that already have an assignee
//   const { data: assigned, error: rpErr } = await supabase
//     .from("resume_progress")
//     .select("lead_id")
//     .not("assigned_to_email", "is", null); // assigned rows

//   if (rpErr) throw rpErr;

//   const assignedIds = new Set((assigned ?? []).map((x) => x.lead_id));

//   // Filter: keep only those NOT in assignedIds
//   const unassignedIds = allLeadIds.filter((id) => !assignedIds.has(id));

//   allowLeadIds = unassignedIds;
// }

//     else if (opts?.assigneeEmail) {
//       const { data: rp, error: rpErr } = await supabase
//         .from("resume_progress")
//         .select("lead_id")
//         .eq("assigned_to_email", opts.assigneeEmail);

//       if (rpErr) throw rpErr;
//       const ids = (rp ?? []).map((x) => x.lead_id).filter(Boolean);
//       allowLeadIds = ids.length ? ids : [];
//     }
//   } catch (e) {
//     console.error("resume_progress filter fetch error:", e);
//     allowLeadIds = []; // safest fallback
//   }

//   // If the filter produced 0 allowed lead ids, short-circuit
//   if (allowLeadIds && allowLeadIds.length === 0) {
//     setRows([]);
//     return;
//   }

//   // 1) sales_closure base (optionally constrained)
//   let salesQuery = supabase
//     .from("sales_closure")
//     .select(
//       "id, lead_id, email, finance_status, closed_at, resume_sale_value, portfolio_sale_value, commitments, company_application_email, onboarded_date,badge_value"
//     )
//     .not("resume_sale_value", "is", null)
//     .neq("resume_sale_value", 0)
//       .order("closed_at", { ascending: false }); // 👈 add this

//       // Apply filters based on mode
// if (opts?.mode === "main") {
//   // Main table → only clients with both resume and application payments
//   salesQuery = salesQuery.gt("resume_sale_value", 0).gt("application_sale_value", 0);
// } else if (opts?.mode === "notOnboarded") {
//   // Not onboarded clients → onboarded_date is null
//   salesQuery = salesQuery.is("onboarded_date", null);
// } else if (opts?.mode === "resumeOnly") {
//   // Resume-only → resume_sale_value > 0 and application_sale_value <= 0 or null
//   salesQuery = salesQuery
//     .gt("resume_sale_value", 0)
//     .or("application_sale_value.is.null,application_sale_value.lte.0");
// }



//   if (allowLeadIds && allowLeadIds.length > 0) {
//     salesQuery = salesQuery.in("lead_id", allowLeadIds);
//   }

//   const { data: sales, error: salesErr } = await salesQuery;
//   if (salesErr) {
//     console.error("sales_closure fetch error:", salesErr?.message ?? salesErr);
//     setRows([]);
//     return;
//   }

//   // 2) Build per-lead latest row + portfolio_paid
//   type LeadAgg = { latest: any | null; portfolio_paid: boolean };
//   const byLead = new Map<string, LeadAgg>();

//   for (const r of sales ?? []) {
//     const leadId: string = r.lead_id;
//     const current = byLead.get(leadId) ?? { latest: null, portfolio_paid: false };

//     const prev = current.latest;
//     const prevClosed = prev?.closed_at ? new Date(prev.closed_at).getTime() : -Infinity;
//     const thisClosed = r?.closed_at ? new Date(r.closed_at).getTime() : -Infinity;
//     if (!prev || thisClosed > prevClosed) current.latest = r;

//     const val = r.portfolio_sale_value;
//     const num = val === null || val === undefined || val === "" ? 0 : Number(val);
//     if (!Number.isNaN(num) && num > 0) current.portfolio_paid = true;

//     byLead.set(leadId, current);
//   }

//   const latest = Array.from(byLead.values())
//     .map((v) => v.latest)
//     .filter(Boolean) as any[];

//   const portfolioPaidMap = new Map(
//     Array.from(byLead.entries()).map(([leadId, agg]) => [leadId, agg.portfolio_paid])
//   );

//   const leadIds = latest.map((r) => r.lead_id);
//   if (!leadIds || leadIds.length === 0) {
//     setRows([]);
//     return;
//   }

//   // 3) Join leads
//   const { data: leadsData, error: leadsErr } = await supabase
//     .from("leads")
//     .select("business_id, name, phone")
//     .in("business_id", leadIds);
//   if (leadsErr) console.error("leads fetch error:", leadsErr?.message ?? leadsErr);
//   const leadMap = new Map((leadsData ?? []).map((l) => [l.business_id, { name: l.name, phone: l.phone }]));

//   // 4) Join resume_progress (we still need status/pdf/assignee)
//   const { data: progress, error: progErr } = await supabase
//     .from("resume_progress")
//     .select("lead_id, status, pdf_path, assigned_to_email, assigned_to_name")
//     .in("lead_id", leadIds);
//   if (progErr) console.error("resume_progress fetch error:", progErr?.message ?? progErr);
//   const progMap = new Map(
//     (progress ?? []).map((p) => [
//       p.lead_id,
//       {
//         status: (p.status as ResumeStatus) ?? "not_started",
//         pdf_path: p.pdf_path ?? null,
//         assigned_to_email: p.assigned_to_email ?? null,
//         assigned_to_name: p.assigned_to_name ?? null,
//       },
//     ])
//   );

//   // 5) Join portfolio_progress (optional)
//   let portMap = new Map<
//     string,
//     { status: PortfolioStatus | null; assigned_to_email: string | null; assigned_to_name: string | null; link: string | null }
//   >();
//   try {
//     const { data: portProg, error: portErr } = await supabase
//       .from("portfolio_progress")
//       .select("lead_id, status, assigned_to_email, assigned_to_name, link, portfolio_link")
//       .in("lead_id", leadIds);

//     if (!portErr && portProg) {
//       portMap = new Map(
//         portProg.map((p: any) => [
//           p.lead_id,
//           {
//             status: (p.status as PortfolioStatus) ?? null,
//             assigned_to_email: p.assigned_to_email ?? null,
//             assigned_to_name: p.assigned_to_name ?? null,
//             link: (p.link || p.portfolio_link || null) as string | null,
//           },
//         ])
//       );
//     }
//   } catch {
//     // ignore
//   }

//   // 6) Merge
//   const merged: SalesClosure[] = latest.map((r) => {
//     const lead = leadMap.get(r.lead_id) || { name: "-", phone: "-" };
//     const rp = progMap.get(r.lead_id) || {
//       status: "not_started" as ResumeStatus,
//       pdf_path: null,
//       assigned_to_email: null,
//       assigned_to_name: null,
//     };
//     const pp = portMap.get(r.lead_id) || {
//       status: null as PortfolioStatus | null,
//       assigned_to_email: null,
//       assigned_to_name: null,
//       link: null as string | null,
//     };

//     const onboardRaw: string | null = r.onboarded_date ?? null;
//     return {
//       id: r.id,
//       lead_id: r.lead_id,
//       email: r.email,
//       company_application_email: r.company_application_email ?? null,
//       finance_status: r.finance_status,
//       closed_at: r.closed_at,
//       onboarded_date_raw: onboardRaw,
//       onboarded_date_label: formatOnboardLabel(onboardRaw),
//       resume_sale_value: r.resume_sale_value ?? null,
//       commitments: r.commitments ?? null,
//       badge_value: r.badge_value ?? null,


//       leads: lead,

//       rp_status: rp.status,
//       rp_pdf_path: rp.pdf_path,
//       assigned_to_email: rp.assigned_to_email,
//       assigned_to_name: rp.assigned_to_name,

//       pp_status: pp.status,
//       pp_assigned_email: pp.assigned_to_email,
//       pp_assigned_name: pp.assigned_to_name,
//       pp_link: pp.link,

//       portfolio_sale_value: r.portfolio_sale_value ?? null,
//       portfolio_paid: portfolioPaidMap.get(r.lead_id) === true,
//     };
//   });

//   setRows(merged);
// };


const fetchData = async (opts?: {
  assigneeEmail?: string | null;
  unassigned?: boolean;
  mode?: "main" | "notOnboarded" | "resumeOnly" | "allResumes"; // Added "allResumes" mode
   startDate?: string | null;  // New parameter for start date
  endDate?: string | null;    // New parameter for end date
}) => {
  // 0) Resolve filter → get allowed lead_ids from resume_progress if needed
  let allowLeadIds: string[] | null = null;

  try {
    if (opts?.unassigned) {
      // Get all leads from sales_closure
      const { data: allSales, error: scErr } = await supabase
        .from("sales_closure")
        .select("lead_id");

      if (scErr) throw scErr;

      const allLeadIds = (allSales ?? []).map((x) => x.lead_id);

      // Get all leads that already have an assignee
      const { data: assigned, error: rpErr } = await supabase
        .from("resume_progress")
        .select("lead_id")
        .not("assigned_to_email", "is", null); // assigned rows

      if (rpErr) throw rpErr;

      const assignedIds = new Set((assigned ?? []).map((x) => x.lead_id));

      // Filter: keep only those NOT in assignedIds
      const unassignedIds = allLeadIds.filter((id) => !assignedIds.has(id));

      allowLeadIds = unassignedIds;
    } else if (opts?.assigneeEmail) {
      const { data: rp, error: rpErr } = await supabase
        .from("resume_progress")
        .select("lead_id")
        .eq("assigned_to_email", opts.assigneeEmail);

      if (rpErr) throw rpErr;
      const ids = (rp ?? []).map((x) => x.lead_id).filter(Boolean);
      allowLeadIds = ids.length ? ids : [];
    }
  } catch (e) {
    console.error("resume_progress filter fetch error:", e);
    allowLeadIds = []; // safest fallback
  }

  // If the filter produced 0 allowed lead ids, short-circuit
  if (allowLeadIds && allowLeadIds.length === 0) {
    setRows([]);
    return;
  }

  // 1) sales_closure base (optionally constrained)
  let salesQuery = supabase
    .from("sales_closure")
    .select(
      "id, lead_id, email, finance_status, closed_at, resume_sale_value, portfolio_sale_value, commitments, company_application_email, onboarded_date, badge_value"
    )
    .not("resume_sale_value", "is", null)
    .neq("resume_sale_value", 0) // Ensure we only select rows where resume_sale_value > 0
    .order("closed_at", { ascending: false }); // 👈 add this

    // Add date range filter if both startDate and endDate are selected
  if (opts?.startDate && opts?.endDate) {
    salesQuery = salesQuery
      .gte("closed_at", opts.startDate)  // closed_at >= startDate
      .lte("closed_at", opts.endDate);   // closed_at <= endDate
  }

  // Apply filters based on mode
  if (opts?.mode === "main") {
    // Main table → only clients with both resume and application payments
    salesQuery = salesQuery.gt("resume_sale_value", 0).gt("application_sale_value", 0);
  } else if (opts?.mode === "notOnboarded") {
    // Not onboarded clients → onboarded_date is null
    salesQuery = salesQuery.is("onboarded_date", null);
  } else if (opts?.mode === "resumeOnly") {
    // Resume-only → resume_sale_value > 0 and application_sale_value <= 0 or null
    salesQuery = salesQuery
      .gt("resume_sale_value", 0)
      .or("application_sale_value.is.null,application_sale_value.lte.0");
  } else if (opts?.mode === "allResumes") {
    // All Resumes → resume_sale_value > 0 (no restrictions on application_sale_value)
    salesQuery = salesQuery.gt("resume_sale_value", 0); // Fetch all records where resume_sale_value > 0
  }

  if (allowLeadIds && allowLeadIds.length > 0) {
    salesQuery = salesQuery.in("lead_id", allowLeadIds);
  }

  const { data: sales, error: salesErr } = await salesQuery;
  if (salesErr) {
    console.error("sales_closure fetch error:", salesErr?.message ?? salesErr);
    setRows([]);
    return;
  }

  // 2) Build per-lead latest row + portfolio_paid
  type LeadAgg = { latest: any | null; portfolio_paid: boolean };
  const byLead = new Map<string, LeadAgg>();

  for (const r of sales ?? []) {
    const leadId: string = r.lead_id;
    const current = byLead.get(leadId) ?? { latest: null, portfolio_paid: false };

    const prev = current.latest;
    const prevClosed = prev?.closed_at ? new Date(prev.closed_at).getTime() : -Infinity;
    const thisClosed = r?.closed_at ? new Date(r.closed_at).getTime() : -Infinity;
    if (!prev || thisClosed > prevClosed) current.latest = r;

    const val = r.portfolio_sale_value;
    const num = val === null || val === undefined || val === "" ? 0 : Number(val);
    if (!Number.isNaN(num) && num > 0) current.portfolio_paid = true;

    byLead.set(leadId, current);
  }

  const latest = Array.from(byLead.values())
    .map((v) => v.latest)
    .filter(Boolean) as any[];

  const portfolioPaidMap = new Map(
    Array.from(byLead.entries()).map(([leadId, agg]) => [leadId, agg.portfolio_paid])
  );

  const leadIds = latest.map((r) => r.lead_id);
  if (!leadIds || leadIds.length === 0) {
    setRows([]);
    return;
  }

  // 3) Join leads
  const { data: leadsData, error: leadsErr } = await supabase
    .from("leads")
    .select("business_id, name, phone")
    .in("business_id", leadIds);
  if (leadsErr) console.error("leads fetch error:", leadsErr?.message ?? leadsErr);
  const leadMap = new Map((leadsData ?? []).map((l) => [l.business_id, { name: l.name, phone: l.phone }]));

  // 4) Join resume_progress (we still need status/pdf/assignee)
  const { data: progress, error: progErr } = await supabase
    .from("resume_progress")
    .select("lead_id, status, pdf_path, assigned_to_email, assigned_to_name")
    .in("lead_id", leadIds);
  if (progErr) console.error("resume_progress fetch error:", progErr?.message ?? progErr);
  const progMap = new Map(
    (progress ?? []).map((p) => [
      p.lead_id,
      {
        status: (p.status as ResumeStatus) ?? "not_started",
        pdf_path: p.pdf_path ?? null,
        assigned_to_email: p.assigned_to_email ?? null,
        assigned_to_name: p.assigned_to_name ?? null,
      },
    ])
  );

  // 5) Join portfolio_progress (optional)
  let portMap = new Map<
    string,
    { status: PortfolioStatus | null; assigned_to_email: string | null; assigned_to_name: string | null; link: string | null }
  >();
  try {
    const { data: portProg, error: portErr } = await supabase
      .from("portfolio_progress")
      .select("lead_id, status, assigned_to_email, assigned_to_name, link, portfolio_link")
      .in("lead_id", leadIds);

    if (!portErr && portProg) {
      portMap = new Map(
        portProg.map((p: any) => [
          p.lead_id,
          {
            status: (p.status as PortfolioStatus) ?? null,
            assigned_to_email: p.assigned_to_email ?? null,
            assigned_to_name: p.assigned_to_name ?? null,
            link: (p.link || p.portfolio_link || null) as string | null,
          },
        ])
      );
    }
  } catch {
    // ignore
  }

  // 6) Merge
  const merged: SalesClosure[] = latest.map((r) => {
    const lead = leadMap.get(r.lead_id) || { name: "-", phone: "-" };
    const rp = progMap.get(r.lead_id) || {
      status: "not_started" as ResumeStatus,
      pdf_path: null,
      assigned_to_email: null,
      assigned_to_name: null,
    };
    const pp = portMap.get(r.lead_id) || {
      status: null as PortfolioStatus | null,
      assigned_to_email: null,
      assigned_to_name: null,
      link: null as string | null,
    };

    const onboardRaw: string | null = r.onboarded_date ?? null;
    return {
      id: r.id,
      lead_id: r.lead_id,
      email: r.email,
      company_application_email: r.company_application_email ?? null,
      finance_status: r.finance_status,
      closed_at: r.closed_at,
      onboarded_date_raw: onboardRaw,
      onboarded_date_label: formatOnboardLabel(onboardRaw),
      resume_sale_value: r.resume_sale_value ?? null,
      commitments: r.commitments ?? null,
      badge_value: r.badge_value ?? null,
      leads: lead,
      rp_status: rp.status,
      rp_pdf_path: rp.pdf_path,
      assigned_to_email: rp.assigned_to_email,
      assigned_to_name: rp.assigned_to_name,
      pp_status: pp.status,
      pp_assigned_email: pp.assigned_to_email,
      pp_assigned_name: pp.assigned_to_name,
      pp_link: pp.link,
      portfolio_sale_value: r.portfolio_sale_value ?? null,
      portfolio_paid: portfolioPaidMap.get(r.lead_id) === true,
    };
  });

  setRows(merged);
};



const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

  /* =========================
     Gate + initial load
     ========================= */

  useEffect(() => {
    if (user === null) return;
    const allowed = ["Super Admin", "Resume Head", "Resume Associate"] as const;
    if (!user || !allowed.includes(user.role as any)) {
      router.push("/unauthorized");
      return;
    }
    // after role gate, load data
    // Promise.all([fetchTeamMembers(), fetchData()]).finally(() => setLoading(false));
    Promise.all([fetchTeamMembers(), fetchData({ mode: "main" })]).finally(() => setLoading(false));

  }, [user, router]);

  

  const loadLatestOnboardingForLead = async (leadId: string, fallbackEmail?: string) => {
  setDialogLoading(true);
  setLatestOnboardRowId(null);

  // 4a) Get the most recent onboarding row for this lead
 const { data: row, error } = await supabase
  .from("client_onborading_details")
  .select(`
    id,
    full_name,
    personal_email,
    company_email,
    callable_phone,
    job_role_preferences,
    location_preferences,
    salary_range,
    work_auth_details,
    needs_sponsorship,
    full_address,
    linkedin_url,
    date_of_birth,
    created_at
  `)
  .eq("lead_id", leadId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

  


  // 4b) Prefill form from DB (or sane defaults)
if (!error && row) {
  setLatestOnboardRowId(row.id);
  setObFullName(row.full_name ?? "");
  setObPersonalEmail(row.personal_email ?? "");
  setObCompanyEmail(row.company_email ?? "");
  setObCallablePhone(row.callable_phone ?? "");
  setObJobRolesText(csvFromArray(row.job_role_preferences));
  setObLocationsText(csvFromArray(row.location_preferences));
  setObSalaryRange(row.salary_range ?? "");
  setObWorkAuth(row.work_auth_details ?? "");

  // NEW fields
  setObNeedsSponsorship(
    typeof row.needs_sponsorship === "boolean" ? row.needs_sponsorship : null
  );
  setObFullAddress(row.full_address ?? "");
  setObLinkedInUrl(row.linkedin_url ?? "");
  setObDob(row.date_of_birth ?? ""); // expect 'YYYY-MM-DD'
} else {
  setLatestOnboardRowId(null);
  setObFullName("");
  setObPersonalEmail("");
  setObCompanyEmail("");
  setObCallablePhone("");
  setObJobRolesText("");
  setObLocationsText("");
  setObSalaryRange("");
  setObWorkAuth("");

  // NEW fields reset
  setObNeedsSponsorship(null);
  setObFullAddress("");
  setObLinkedInUrl("");
  setObDob("");
}


  // Date in this modal only sets sales_closure.onboarded_date
  setObDate("");

  setDialogLoading(false);
};


const handleOnboardClick = async (row: SalesClosure) => {
  setCurrentLeadId(row.lead_id);
  setCurrentSaleId(row.id);
  setShowOnboardDialog(true);
  // prefill from latest onboarding record
  await loadLatestOnboardingForLead(row.lead_id, row.email);
};



// Writes/updates Project-B.pending_clients via server API
const writePendingClientFromLead = async (leadId: string) => {
  // a) Read latest onboarding details from Project-A
  const { data: ob, error: obErr } = await supabase
    .from("client_onborading_details")
    .select(`
      full_name,
      whatsapp_number,
    personal_email,
      callable_phone,
      company_email,
      job_role_preferences,
      salary_range,
      location_preferences,
      work_auth_details,
      created_at,
      lead_id,
      needs_sponsorship,
      visatypes
    `)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (obErr) throw obErr;
  if (!ob) throw new Error("No onboarding details found for this client.");

  



// const personalEmail = lead?.email || "not given"; // Default to "not given" if email is missing


  // c) ✅ Get latest badge_value from sales_closure for this lead
  const { data: scRow, error: scErr } = await supabase
    .from("sales_closure")
    .select("badge_value, closed_at, email")
    .eq("lead_id", leadId)
    .order("closed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (scErr) throw scErr;
  const latestBadgeValue: number | null =
    scRow?.badge_value !== null && scRow?.badge_value !== undefined
      ? Number(scRow.badge_value)
      : null;

  // d) Compose payload for pending_clients
  const pcPayload = {
    full_name: ob.full_name,
    personal_email: ob.personal_email,
    whatsapp_number: ob.whatsapp_number ?? null,
    callable_phone: ob.callable_phone ?? null,
    company_email: ob.company_email ?? null,
    job_role_preferences: ob.job_role_preferences ?? null,
    salary_range: ob.salary_range ?? null,
    location_preferences: ob.location_preferences ?? null,
    work_auth_details: ob.work_auth_details ?? null,

    // extra fields
    visa_type: ob.visatypes ?? null,
    sponsorship: typeof ob.needs_sponsorship === "boolean" ? ob.needs_sponsorship : null,
    applywizz_id: ob.lead_id ?? leadId,

    // ✅ send badge_value along
    badge_value: latestBadgeValue,

    // keep created_at for first insert (server will handle upsert)
    created_at: ob.created_at ?? new Date().toISOString(),
  };

  const res = await fetch("/api/pending-clients/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pcPayload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "Failed to upsert pending_client in Project-B");
  }
};


const saveOnboardAndDetails = async () => {

  
   

  if (!currentLeadId || !currentSaleId) {
    alert("Missing context to save."); 
    return;
  }
  if (!obDate) {
    alert("Please choose an Onboarded Date.");
    return;
  }

  // // Validate the email format
  

  setDialogLoading(true);
  try {

 const { data: lead, error: leadErr } = await supabase
  .from("client_onborading_details")
  .select("personal_email")
  .eq("lead_id", currentLeadId)
  .maybeSingle();

  if (!leadErr && lead) {

  setObPersonalEmail(lead.personal_email);
  }
 
if (leadErr) throw leadErr;
if (!validateEmail(obPersonalEmail)) {
    alert("Invalid email format.");
    return;
  }


    // Prepare the payload for client_onboarding_details
    const payload = {
      full_name: obFullName || null,
      company_email: obCompanyEmail || null,
      personal_email: obPersonalEmail, // Ensure the email is valid
      callable_phone: obCallablePhone || null,
      job_role_preferences: csvToArray(obJobRolesText),
      location_preferences: csvToArray(obLocationsText),
      salary_range: obSalaryRange || null,
      work_auth_details: obWorkAuth || null,
      needs_sponsorship: obNeedsSponsorship,
      full_address: obFullAddress || null,
      linkedin_url: obLinkedInUrl || null,
      date_of_birth: obDob || null,
      lead_id: currentLeadId,
    };

    // Update or insert into client_onboarding_details
    if (latestOnboardRowId) {
      const { error: updErr } = await supabase
        .from("client_onborading_details")
        .update(payload)
        .eq("id", latestOnboardRowId);
      if (updErr) throw updErr;
    } else {
      const saleRow = rows.find(r => r.id === currentSaleId);
      const personalEmail = saleRow?.email ?? "";

      const { error: insErr } = await supabase
        .from("client_onborading_details")
        .insert({
          ...payload,
          personal_email: personalEmail,
        });
      if (insErr) throw insErr;
    }

    // UPDATE sales_closure with onboarded_date
    const { error: saleErr } = await supabase
      .from("sales_closure")
      .update({
        onboarded_date: obDate,
        company_application_email: obCompanyEmail || null,
      })
      .eq("id", currentSaleId);
    if (saleErr) throw saleErr;

    // Mirror data into pending_clients
    await writePendingClientFromLead(currentLeadId);

    // Refresh table with current filter preserved
    await fetchData(
      assigneeFilter === "__all__"
        ? undefined
        : assigneeFilter === "__unassigned__"
        ? { unassigned: true }
        : { assigneeEmail: assigneeFilter }
    );

    setShowOnboardDialog(false);
    setCurrentLeadId(null);
    setCurrentSaleId(null);
    setLatestOnboardRowId(null);
    setObDate("");
  } catch (e: any) {
    console.error(e);
    alert(e?.message || "Failed to save onboarding details");
  } finally {
    setDialogLoading(false);
  }
};

 

  const BUCKET = "resumes"; 
  const ENABLE_DB_COPY = false; 

  const ensurePdf = (file: File) => {
    if (file.type !== "application/pdf") throw new Error("Please select a PDF file.");
    if (file.size > 20 * 1024 * 1024) throw new Error("Max file size is 20MB.");
  };


  const cleanName = (name: string) => name.replace(/[^\w.\-]+/g, "_");

  const fileToHexBytea = async (file: File) => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    return "\\x" + hex;
  };

const uploadOrReplaceResume = async (leadId: string, file: File, previousPath?: string | null) => {
  ensurePdf(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("lead_id", leadId);

  const path = await supabase
  .from("resume_progress")
  .select("pdf_path")
  .eq("lead_id", leadId)
  .maybeSingle();

  if(path.data?.pdf_path){
    if(path.data.pdf_path.startsWith("CRM")){
      const del = await fetch("/api/resumes/delete", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ key: path.data.pdf_path}),
      });
      if (!del.ok) {
        const errData = await del.json().catch(() => ({}));
        throw new Error(
          errData?.error || `Failed to delete past CRM resume: ${del.status}`
        );
      }
    }
    else{
      const del = await supabase.storage.from(BUCKET).remove([path.data.pdf_path]);
      if (del.error) console.warn("STORAGE REMOVE WARNING:", del.error);
    }
  }

  const res = await fetch("/api/resumes/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Upload failed:", data);
    throw new Error(data.error || "Upload failed");
  }

  console.log("✅ Uploaded to backend → S3:", data);

  const db = await supabase
    .from("resume_progress")
    .upsert(
      {
        lead_id: leadId,
        status: "completed",
        pdf_path: data.key,
        pdf_uploaded_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" }
    );
  if (db.error) {
    console.error("DB UPSERT ERROR resume_progress:", db.error);
    throw new Error(db.error.message || "DB upsert failed");
  }

  return { key: data.key, publicUrl: data.publicUrl };
};



const downloadResume = async (path: string) => {
  try {
    if(path.startsWith("CRM")){
    const base = "https://applywizz-dev.s3.us-east-2.amazonaws.com";
     // Combine base + path to form full URL
    const fileUrl = `${base}/${path}`;

    // Create a hidden link and trigger click (forces download)
     // fetch the file data and create a Blob URL so browser downloads it
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = path.split("/").pop() || "resume.pdf"; // force download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // cleanup
    window.URL.revokeObjectURL(url);
    }
    else{
      const segments = (path || "").split("/");
      const fileName = segments[segments.length - 1] || "resume.pdf";

      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("No signed URL");

      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName; 
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    }
  } catch (e: any) {
    alert(e?.message || "Could not download PDF");
  }
  
};


const fetchMyTasks = async () => {
  try {
    setMyTasksLoading(true);
    setMyTasksError(null);

    const assigneeEmail = (user?.email || "").trim().toLowerCase();
    const assigneeName  = (user?.name  || "").trim();

    // 0) get lead_ids assigned to me (by email and/or name)
    const leadIdsSet = new Set<string>();

    if (assigneeEmail) {
      const { data: byEmail, error: e1 } = await supabase
        .from("resume_progress")
        .select("lead_id")
        .eq("assigned_to_email", assigneeEmail);
      if (e1) throw e1;
      (byEmail ?? []).forEach(r => r.lead_id && leadIdsSet.add(r.lead_id));
    }

    if (assigneeName) {
      const { data: byName, error: e2 } = await supabase
        .from("resume_progress")
        .select("lead_id")
        .ilike("assigned_to_name", assigneeName);
      if (e2) throw e2;
      (byName ?? []).forEach(r => r.lead_id && leadIdsSet.add(r.lead_id));
    }

    const allowLeadIds = Array.from(leadIdsSet);
    if (allowLeadIds.length === 0) {
      setMyTasksRows([]);
      setMyTasksOpen(true);
      return;
    }

    // 1) sales_closure base (limit to my lead ids)
    const { data: sales, error: salesErr } = await supabase
      .from("sales_closure")
      .select("id, lead_id, email, finance_status, closed_at, resume_sale_value, portfolio_sale_value, commitments, company_application_email, onboarded_date")
      .in("lead_id", allowLeadIds)
      .not("resume_sale_value", "is", null)
      .neq("resume_sale_value", 0);
    if (salesErr) throw salesErr;

    // 2) latest per lead + portfolio_paid (same as your fetchData)
    type LeadAgg = { latest: any | null; portfolio_paid: boolean };
    const byLead = new Map<string, LeadAgg>();

    for (const r of sales ?? []) {
      const leadId: string = r.lead_id;
      const current = byLead.get(leadId) ?? { latest: null, portfolio_paid: false };

      const prev = current.latest;
      const prevClosed = prev?.closed_at ? new Date(prev.closed_at).getTime() : -Infinity;
      const thisClosed = r?.closed_at ? new Date(r.closed_at).getTime() : -Infinity;
      if (!prev || thisClosed > prevClosed) current.latest = r;

      const val = r.portfolio_sale_value;
      const num = val === null || val === undefined || val === "" ? 0 : Number(val);
      if (!Number.isNaN(num) && num > 0) current.portfolio_paid = true;

      byLead.set(leadId, current);
    }

    const latest = Array.from(byLead.values()).map(v => v.latest).filter(Boolean) as any[];
    const portfolioPaidMap = new Map(
      Array.from(byLead.entries()).map(([leadId, agg]) => [leadId, agg.portfolio_paid])
    );

    const leadIds = latest.map(r => r.lead_id);
    if (!leadIds.length) {
      setMyTasksRows([]);
      setMyTasksOpen(true);
      return;
    }

    // 3) join leads
    const { data: leadsData } = await supabase
      .from("leads")
      .select("business_id, name, phone")
      .in("business_id", leadIds);
    const leadMap = new Map((leadsData ?? []).map(l => [l.business_id, { name: l.name, phone: l.phone }]));

    // 4) join resume_progress
    const { data: progress } = await supabase
      .from("resume_progress")
      .select("lead_id, status, pdf_path, assigned_to_email, assigned_to_name")
      .in("lead_id", leadIds);
    const progMap = new Map(
      (progress ?? []).map(p => [
        p.lead_id,
        {
          status: (p.status as ResumeStatus) ?? "not_started",
          pdf_path: p.pdf_path ?? null,
          assigned_to_email: p.assigned_to_email ?? null,
          assigned_to_name: p.assigned_to_name ?? null,
        },
      ])
    );

    // 5) join portfolio_progress (optional)
    let portMap = new Map<
      string,
      { status: PortfolioStatus | null; assigned_to_email: string | null; assigned_to_name: string | null; link: string | null }
    >();
    try {
      const { data: portProg } = await supabase
        .from("portfolio_progress")
        .select("lead_id, status, assigned_to_email, assigned_to_name, link, portfolio_link")
        .in("lead_id", leadIds);

      if (portProg) {
        portMap = new Map(
          portProg.map((p: any) => [
            p.lead_id,
            {
              status: (p.status as PortfolioStatus) ?? null,
              assigned_to_email: p.assigned_to_email ?? null,
              assigned_to_name: p.assigned_to_name ?? null,
              link: (p.link || p.portfolio_link || null) as string | null,
            },
          ])
        );
      }
    } catch {}

    // 6) merge
    const merged: SalesClosure[] = latest.map((r) => {
      const lead = leadMap.get(r.lead_id) || { name: "-", phone: "-" };
      const rp = progMap.get(r.lead_id) || {
        status: "not_started" as ResumeStatus,
        pdf_path: null,
        assigned_to_email: null,
        assigned_to_name: null,
      };
      const pp = portMap.get(r.lead_id) || {
        status: null as PortfolioStatus | null,
        assigned_to_email: null,
        assigned_to_name: null,
        link: null as string | null,
      };
      const onboardRaw: string | null = r.onboarded_date ?? null;

      return {
        id: r.id,
        lead_id: r.lead_id,
        email: r.email,
        company_application_email: r.company_application_email ?? null,
        finance_status: r.finance_status,
        closed_at: r.closed_at,
        onboarded_date_raw: onboardRaw,
        onboarded_date_label: formatOnboardLabel(onboardRaw),
        resume_sale_value: r.resume_sale_value ?? null,
        commitments: r.commitments ?? null,
badge_value: r.badge_value ?? null,

        leads: lead,

        rp_status: rp.status,
        rp_pdf_path: rp.pdf_path,
        assigned_to_email: rp.assigned_to_email,
        assigned_to_name: rp.assigned_to_name,

        pp_status: pp.status,
        pp_assigned_email: pp.assigned_to_email,
        pp_assigned_name: pp.assigned_to_name,
        pp_link: pp.link,

        portfolio_sale_value: r.portfolio_sale_value ?? null,
        portfolio_paid: portfolioPaidMap.get(r.lead_id) === true,
      };
    });

    setMyTasksRows(merged);
    setMyTasksOpen(true);
  } catch (e: any) {
    console.error(e);
    setMyTasksError(e?.message || "Failed to load your tasks");
    setMyTasksRows([]);
    setMyTasksOpen(true);
  } finally {
    setMyTasksLoading(false);
  }
};


  const updateStatus = async (leadId: string, status: ResumeStatus) => {
    const { error } = await supabase.from("resume_progress").upsert({ lead_id: leadId, status }, { onConflict: "lead_id" });
    if (error) throw error;
  };

  const updateAssignedTo = async (leadId: string, email: string | null, name?: string | null) => {
    const { data: existingRows, error: findErr } = await supabase.from("resume_progress").select("id").eq("lead_id", leadId);
    if (findErr) throw findErr;

    if (existingRows && existingRows.length > 0) {
      const { error: updErr } = await supabase
        .from("resume_progress")
        .update({ assigned_to_email: email, assigned_to_name: name ?? null })
        .eq("lead_id", leadId);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from("resume_progress")
        .insert({ lead_id: leadId, assigned_to_email: email, assigned_to_name: name ?? null });
      if (insErr) throw insErr;
    }
  };

  

  const onChangeStatus = async (row: SalesClosure, newStatus: ResumeStatus) => {
  try {
    await updateStatus(row.lead_id, newStatus);

    if (newStatus === "completed" && !row.rp_pdf_path) {
      setUploadForLead(row.lead_id);
      setReplacingOldPath(null);
      setUploadContext(myTasksOpen ? "myTasks" : "main"); // 👈
      fileRef.current?.click();
      if (myTasksOpen) await fetchMyTasks();
    } else {
      setRows((rs) => rs.map((r) => (r.lead_id === row.lead_id ? { ...r, rp_status: newStatus } : r)));
    }
  } catch (e: any) {
    alert(e.message || "Failed to update status");
  }
};


  const onReplacePdf = (row: SalesClosure) => {
    setUploadForLead(row.lead_id);
    setReplacingOldPath(row.rp_pdf_path ?? null);
    fileRef.current?.click();
  };


  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0] || null;
  const leadId = uploadForLead;
  const oldPath = replacingOldPath;

  e.target.value = "";
  setUploadForLead(null);
  setReplacingOldPath(null);

  if (!file || !leadId) return;

  try {
    await uploadOrReplaceResume(leadId, file, oldPath || undefined);

    // 🔁 Refresh the correct dataset & persist where we are
    if (uploadContext === "myTasks") {
      await fetchMyTasks();
      setMyTasksOpen(true); // ensure dialog stays open
    } else {
      await fetchData();
    }

    alert("PDF uploaded.");
  } catch (err: any) {
    alert(err.message || "Upload failed");

    // Keep user in the same place even on failure
    if (uploadContext === "myTasks") {
      await fetchMyTasks();
      setMyTasksOpen(true);
    } else {
      await fetchData();
    }
  }
};


const fetchFilteredClients = async (mode: "notOnboarded" | "resumeOnly") => {
  try {
    setFilterLoading(true);

    // Fetch sales_closure data first
    let query = supabase
      .from("sales_closure")
      .select(
        "id, lead_id, email, finance_status, closed_at, resume_sale_value, application_sale_value, portfolio_sale_value, commitments, company_application_email, onboarded_date, badge_value"
      )
      .not("resume_sale_value", "is", null)
      .neq("resume_sale_value", 0)
      .order("closed_at", { ascending: false });

    // Apply filters based on mode
    if (mode === "notOnboarded") {
      query = query.is("onboarded_date", null).gt("application_sale_value", 0);
    } else if (mode === "resumeOnly") {
      query = query
        .gt("resume_sale_value", 0)
        .or("application_sale_value.is.null,application_sale_value.lte.0");
    }

    const { data: sales, error } = await query;
    if (error) throw error;

    if (!sales?.length) return [];

    // Fetch leads data using lead_ids from the sales_closure data
    const leadIds = sales.map((r) => r.lead_id);
    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select("business_id, name, phone")
      .in("business_id", leadIds);

    if (leadsError) throw leadsError;

    const leadMap = new Map(
      (leadsData ?? []).map((l) => [l.business_id, { name: l.name, phone: l.phone }])
    );

    // Merge logic (produce full SalesClosure shape with leads data)
    const merged: SalesClosure[] = sales.map((r: any) => {
      const onboardRaw: string | null = r.onboarded_date ?? null;
      const portfolioPaid = Boolean(Number(r.portfolio_sale_value ?? 0) > 0);

      // Fetch the lead details from the map
      const lead = leadMap.get(r.lead_id) || { name: "-", phone: "-" };

      return {
        id: r.id,
        lead_id: r.lead_id,
        email: r.email,
        company_application_email: r.company_application_email ?? null,
        finance_status: (r.finance_status as FinanceStatus) ?? "Unpaid",
        closed_at: r.closed_at ?? null,
        onboarded_date_raw: onboardRaw,
        onboarded_date_label: formatOnboardLabel(onboardRaw),
        resume_sale_value: r.resume_sale_value ?? null,
        commitments: r.commitments ?? null,
        badge_value: r.badge_value ?? null,
        portfolio_sale_value: r.portfolio_sale_value ?? null,
        portfolio_paid: portfolioPaid,
        leads: lead,  // Use the actual name and phone from the leads table

        // resume_progress defaults (required by SalesClosure)
        rp_status: "not_started",
        rp_pdf_path: null,
        assigned_to_email: null,
        assigned_to_name: null,

        // portfolio_progress defaults
        pp_status: null,
        pp_assigned_email: null,
        pp_assigned_name: null,
        pp_link: null,
      };
    });

    setFilterRows(merged);
    return merged;
  } catch (e) {
    console.error("Error fetching filtered clients:", e);
    return [];
  } finally {
    setFilterLoading(false);
  }
};


 
  const renderTable = (data: SalesClosure[], ctx: "main" | "myTasks" | "notOnboarded" | "resumeOnly" | "allResumes" = "main") => (
  
      <div className="rounded-md border mt-4">

      <Table>
       
        <TableHeader>
  <TableRow>
    <TableHead>S.No</TableHead>

    {/* Client ID */}
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort("clientId")}
        className="inline-flex items-center"
        title="Sort by Client ID"
      >
        Client ID
        <SortIcon active={sort.key === "clientId"} dir={sort.dir} />
      </button>
    </TableHead>

    {/* Name */}
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort("name")}
        className="inline-flex items-center"
        title="Sort by Name"
      >
        Name
        <SortIcon  active={sort.key === "name"} dir={sort.dir} />
      </button>
    </TableHead>

    {/* Email */}
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort("email")}
        className="inline-flex items-center"
        title="Sort by Email"
      >
        Email
        <SortIcon active={sort.key === "email"} dir={sort.dir} />
      </button>
    </TableHead>

    <TableHead>Application email</TableHead>
    <TableHead>Phone</TableHead>
    <TableHead>Status</TableHead>
    <TableHead>Resume Status</TableHead>
    <TableHead>Assigned to</TableHead>
    <TableHead>Resume PDF</TableHead>

    {/* Closed At */}
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort("closedAt")}
        className="inline-flex items-center"
        title="Sort by Closed At"
      >
        Closed At
        <SortIcon active={sort.key === "closedAt"} dir={sort.dir} />
      </button>
    </TableHead>

    {/* Onboarded Date */}
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort("onboarded")}
        className="inline-flex items-center"
        title="Sort by Onboarded Date"
      >
        Onboarded Date
        <SortIcon active={sort.key === "onboarded"} dir={sort.dir} />
      </button>
    </TableHead>

    {/* Portfolio Status */}
    <TableHead >
      <button
        type="button"
        onClick={() => toggleSort("portfolio")}
        className="inline-flex items-center"
        title="Sort by Portfolio Status"
      >
        Portfolio Status
        <SortIcon active={sort.key === "portfolio"} dir={sort.dir} />
      </button>
    </TableHead>

    <TableHead>Portfolio Link</TableHead>
    <TableHead>Portfolio Assignee</TableHead>
    <TableHead>Client Requirements</TableHead>
    <TableHead>Onboard</TableHead>
  </TableRow>
</TableHeader>

        <TableBody>
          {/* {sortedRows.map((row, index) => ( */}
          {data.map((row, index) => (

            <TableRow key={row.id}>
              <TableCell className="text-center">{index + 1}</TableCell>
              <TableCell>{row.lead_id}</TableCell>

              <TableCell
                className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                onClick={() => window.open(`/leads/${row.lead_id}`, "_blank")}
              >
                {row.leads?.name || "-"}
              </TableCell>

              <TableCell>{row.email}</TableCell>
              <TableCell>{row.company_application_email || "not given"}</TableCell>
              <TableCell>{row.leads?.phone || "-"}</TableCell>
              <TableCell>{row.finance_status}</TableCell>

              {/* Resume Status */}
              <TableCell className="min-w-[220px]">
                <Select value={row.rp_status || "not_started"} onValueChange={(v) => onChangeStatus(row, v as ResumeStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["not_started", "pending", "waiting_client_approval", "completed"] as ResumeStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>

              {/* Assigned to */}
              <TableCell className="min-w-[260px]">
                <Select
                  value={row.assigned_to_email ?? "__none__"}
                  onValueChange={async (value) => {
  try {
    const chosen = value === "__none__" ? null : value;
    const member = resumeTeamMembers.find((u) => u.email === chosen) || null;

    await updateAssignedTo(row.lead_id, chosen, member?.name ?? null);

    // (optional) optimistic UI
    setRows((rs) =>
      rs.map((r) =>
        r.lead_id === row.lead_id
          ? { ...r, assigned_to_email: chosen, assigned_to_name: member?.name ?? null }
          : r
      )
    );

    // 🔁 KEEP FILTER AFTER CHANGE (Point #5)
    if (assigneeFilter === "__all__") {
      await fetchData();
      if (myTasksOpen) await fetchMyTasks();

    } else if (assigneeFilter === "__unassigned__") {
      await fetchData({ unassigned: true });
      if (myTasksOpen) await fetchMyTasks();

    } else {
      await fetchData({ assigneeEmail: assigneeFilter });
      if (myTasksOpen) await fetchMyTasks();

    }
  } catch (e: any) {
    console.error("Assign failed:", e);
    alert(e.message || "Failed to assign");
  }
}}

                  disabled={user?.role === "Resume Associate"}
                >
                  <SelectTrigger className="!opacity-100 bg-muted/20 text-foreground">
                    <SelectValue placeholder="Assign to…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {resumeTeamMembers.length === 0 ? (
                      <SelectItem value="__disabled__" disabled>
                        No team members found
                      </SelectItem>
                    ) : (
                      resumeTeamMembers.map((u) => (
                        <SelectItem key={u.id} value={u.email ?? ""} disabled={!u.email}>
                          {u.name} — {u.role}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </TableCell>

             
{/* Resume PDF */}
<TableCell className="space-x-2 min-w-[220px]">
  {row.rp_pdf_path ? (
    <>
      <Button variant="outline" size="sm" onClick={() => downloadResume(row.rp_pdf_path!)}>Download</Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setUploadForLead(row.lead_id);
          setReplacingOldPath(row.rp_pdf_path ?? null);
          setUploadContext(ctx === "myTasks" ? "myTasks" : "main");
          fileRef.current?.click();
        }}
      >
        Replace
      </Button>
    </>
  ) : row.rp_status === "completed" ? (
    <Button
      size="sm"
      onClick={() => {
        setUploadForLead(row.lead_id);
        setReplacingOldPath(null);
        setUploadContext(ctx === "myTasks" ? "myTasks" : "main");
        fileRef.current?.click();
      }}
    >
      Upload PDF
    </Button>
  ) : (
    <span className="text-gray-400 text-sm">—</span>
  )}
</TableCell>


              {/* Closed At */}
              <TableCell>{formatDateLabel(row.closed_at)}</TableCell>

              {/* Onboarded Date */}
              <TableCell className="min-w-[160px]">
                {row.onboarded_date_raw ? (
                  <span className="bg-green-500 text-white text-sm py-1 px-3 rounded-full">
                    {row.onboarded_date_label}
                  </span>
                ) : (
                  <span className="bg-red-500 text-white text-sm py-1 px-3 rounded-full">not onboarded</span>
                )}
              </TableCell>

              {/* Portfolio Status */}
             
<TableCell className="min-w-[140px]">
  {row.portfolio_paid ? (
    <span className="bg-green-500 text-white text-sm py-1 px-3 rounded-full">Paid</span>
  ) : (
    <span className="bg-red-500 text-white text-sm py-1 px-3 rounded-full">Not Paid</span>
  )}
</TableCell>
              {/* Portfolio Link */}
<TableCell className="max-w-[220px] truncate">
  {row.portfolio_paid ? (
    row.pp_link ? (
      <a
        href={row.pp_link}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline block truncate"
        title={row.pp_link}
      >
        {row.pp_link}
      </a>
    ) : row.leads?.name ? (
      

      <a
        href={`https://applywizz-${(row.leads?.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")}.vercel.app/`}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline block truncate"
        title={`https://applywizz-${(row.leads?.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")}.vercel.app/`}
      >
        https://applywizz-{(row.leads?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")}.vercel.app/
      </a>
    ) : (
      <span className="text-gray-400 text-sm">—</span>
    )
  ) : (
    <span className="text-gray-400 text-sm">—</span>
  )}
</TableCell>


              {/* Portfolio Assignee */}
              <TableCell>
                {row.pp_assigned_name
                  ? `${row.pp_assigned_name}${row.pp_assigned_email ? ` • ${row.pp_assigned_email}` : ""}`
                  : row.pp_assigned_email || <span className="text-gray-400 text-sm">—</span>}
              </TableCell>

              {/* Commitments */}
              <TableCell className="min-w-[140px] text-center">
                {row.commitments?.trim() ? (
                  <Button
                    className="bg-gray-900 hover:bg-gray-400 text-white"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReqRow(row);
                      setReqDialogOpen(true);
                    }}
                  >
                    Requirements
                  </Button>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </TableCell>

              {/* Onboard Client Button */}
              {/* <TableCell>
  {row.onboarded_date_raw ? (
    <Button
      variant="outline"
      size="sm"
      className="bg-green-600 text-white hover:bg-green-600 hover:text-white cursor-not-allowed"
      
    >
      Onboarded
    </Button>
  ) : (
    <Button
  onClick={() => handleOnboardClick(row)}
  variant="outline"
  size="sm"
  className="bg-blue-400 text-white hover:bg-blue-600 hover:text-white"
>
  Onboard Client
</Button>
  )}
</TableCell> */}

<TableCell>
  {ctx === "resumeOnly" ? (
    <span className="text-gray-400 text-sm">—</span>
  ) : row.onboarded_date_raw ? (
    <Button
      variant="outline"
      size="sm"
      className="bg-green-600 text-white hover:bg-green-600 hover:text-white cursor-not-allowed"
    >
      Onboarded
    </Button>
  ) : (
    <Button
      onClick={() => handleOnboardClick(row)}
      variant="outline"
      size="sm"
      className="bg-blue-400 text-white hover:bg-blue-600 hover:text-white"
    >
      Onboard Client
    </Button>
  )}
</TableCell>


            </TableRow>
          ))}
          {/* {sortedRows.length === 0 && ( */}
          {data.length === 0 && (
    <TableRow>
      <TableCell colSpan={RESUME_COLUMNS.length} className="text-center text-sm text-muted-foreground py-10">
        No records found.
      </TableCell>
    </TableRow>
  )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={["Super Admin", "Resume Head", "Resume Associate"]}>
      <DashboardLayout>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFilePicked} />
        <div className="space-y-6">
          {/* <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Resume Page</h1>
          </div> */}

      <div className="flex items-center justify-start gap-4">
  <h1 className="text-3xl font-bold text-gray-900">Resume Page</h1>
  <Button variant="outline" onClick={fetchMyTasks}>
    My Tasks
  </Button>

  {/* <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon">
        <MoreVertical className="h-5 w-5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={async () => {
          setFilterLoading(true);
          setFilterTab("notOnboarded");
          const data = await fetchFilteredClients("notOnboarded");
          setFilterRows(data);
          setFilterDialogOpen(true);
          setFilterLoading(false);
        }}
      >
        Not Onboarded Clients
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={async () => {
          setFilterLoading(true);
          setFilterTab("resumeOnly");
          const data = await fetchFilteredClients("resumeOnly");
          setFilterRows(data);
          setFilterDialogOpen(true);
          setFilterLoading(false);
        }}
      >
        Only for Resumes
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu> */}

 <div className="flex flex-col sm:flex-row gap-2 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[200px]">
              {startDate && endDate ? `📅 ${startDate} → ${endDate}` : '📅 Date Range'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="p-4 space-y-4 w-[300px]">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate || ""} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate || ""} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex justify-between mt-2">
              <Button
                onClick={() => {
                  fetchData({
                    startDate,
                    endDate,
                    mode: selectedTab === "allResumes" ? "allResumes" : "main", // map tab to fetchData mode
                  });
                }}
              >
                Apply
              </Button>
              <Button
                variant="ghost"
                className="text-red-500"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  // Fetch data again based on the selected tab after clearing
                  fetchData({ mode: selectedTab === "allResumes" ? "allResumes" : "main" });
                }}
              >
                ❌ Clear
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>



  <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="icon">
      <MoreVertical className="h-5 w-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    {/* Not Onboarded Clients Dialog */}
    <DropdownMenuItem
      onClick={async () => {
        setFilterLoading(true);
        const data = await fetchFilteredClients("notOnboarded");

        // normalize to full SalesClosure shape with safe defaults so TS is happy
        // const normalized = (data ?? []).map((d: any) => ({
        //   id: d.id,
        //   lead_id: d.lead_id,
        //   email: d.email,
        //   company_application_email: d.company_application_email ?? null,
        //   finance_status: d.finance_status ?? ("Unpaid" as FinanceStatus),
        //   closed_at: d.closed_at ?? null,
        //   onboarded_date_raw: d.onboarded_date_raw ?? null,
        //   onboarded_date_label: d.onboarded_date_label ?? formatOnboardLabel(d.onboarded_date_raw ?? null),
        //   resume_sale_value: d.resume_sale_value ?? null,
        //   commitments: d.commitments ?? null,
        //   badge_value: d.badge_value ?? null,
        //   portfolio_sale_value: d.portfolio_sale_value ?? null,
        //   portfolio_paid: Boolean(Number(d.portfolio_sale_value ?? 0) > 0),
        //   leads: d.leads ?? { name: "-", phone: "-" },

        //   // resume_progress fields (defaults)
        //   rp_status: "not_started" as ResumeStatus,
        //   rp_pdf_path: null,
        //   assigned_to_email: null,
        //   assigned_to_name: null,

        //   // portfolio progress (defaults)
        //   pp_status: null,
        //   pp_assigned_email: null,
        //   pp_assigned_name: null,
        //   pp_link: null,
        // }));

        setFilterRows(data);
        setNotOnboardedDialogOpen(true);  // Open dialog for Not Onboarded Clients
        setFilterLoading(false);
      }}
    >
      Not Onboarded Clients
    </DropdownMenuItem>

    {/* Only for Resumes Dialog */}
    <DropdownMenuItem
      onClick={async () => {
        setFilterLoading(true);
        const data = await fetchFilteredClients("resumeOnly");
        setFilterRows(data);
        setResumeOnlyDialogOpen(true);  // Open dialog for Only for Resumes
        setFilterLoading(false);
      }}
    >
      Only for Resumes
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

</div>

          {/* Filter row */}
<div className="flex items-center gap-3">
  <div className="text-sm font-medium">Assigned To:</div>
  <Select
    value={assigneeFilter}
    onValueChange={async (val) => {
      setAssigneeFilter(val);
      setLoading(true);
      try {
        if (val === "__all__") {
          await fetchData();
        } else if (val === "__unassigned__") {
          await fetchData({ unassigned: true });
        } else {
          await fetchData({ assigneeEmail: val });
        }
      } finally {
        setLoading(false);
      }
    }}
  >
    <SelectTrigger className="w-[260px]">
      <SelectValue placeholder="All team members" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__all__">All</SelectItem>
      <SelectItem value="__unassigned__">Unassigned</SelectItem>
      {resumeTeamMembers.length === 0 ? (
        <SelectItem value="__none__" disabled>
          No team members found
        </SelectItem>
      ) : (
        resumeTeamMembers.map((u) => (
          <SelectItem
            key={u.id}
            value={(u.email ?? "").trim() || "__none__"}
            disabled={!u.email}
          >
            {u.name} — {u.role}
          </SelectItem>
        ))
      )}
    </SelectContent>
  </Select>
</div>


          {loading ? (
            <p className="p-6 text-gray-600">Loading...</p>
          ) : (
            // <Tabs defaultValue="resume" className="w-full">
            //   <TabsList className="grid grid-cols-1 w-full sm:w-auto">
            //     <TabsTrigger value="resume">Resumes</TabsTrigger>
            //   </TabsList>
            //   {/* <TabsContent value="resume">{renderTable(rows)}</TabsContent> */}
            //   <TabsContent value="resume">{renderTable(sortedRows, "main")}</TabsContent>

            // </Tabs>

//             <Tabs defaultValue="resume" className="w-full">
//   <TabsList className="grid grid-cols-1 w-full sm:w-auto">
//     <TabsTrigger value="resume">Resumes</TabsTrigger>
//     <TabsTrigger value="allResumes">All Resumes</TabsTrigger>  {/* New tab */}
//   </TabsList>

//   <TabsContent value="resume">
//     {renderTable(sortedRows, "main")}
//   </TabsContent>

//   <TabsContent value="allResumes">
//     {renderTable(sortedRows, "allResumes")}  {/* Render the data for "All Resumes" */}
//   </TabsContent>
// </Tabs>
 <Tabs
        onValueChange={(value) => {
          setSelectedTab(value); // Set selectedTab to the clicked tab
          // When "allResumes" tab is clicked, fetch data for all resumes
          if (value === "allResumes") {
            fetchData({ mode: "allResumes" });
          } else {
            fetchData({ mode: "main" });  // Default to main mode for the "Resume" tab
          }
        }}
        defaultValue="resume"
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 w-full sm:w-auto">
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="allResumes">All Resumes</TabsTrigger> {/* Added the All Resumes tab */}
        </TabsList>

        <TabsContent value="resume">
          {/* Render data for the "resume" tab */}
          {renderTable(sortedRows, "main")} {/* Or use any other logic for this tab */}
        </TabsContent>

        <TabsContent value="allResumes">
          {/* Render data for the "allResumes" tab */}
          {renderTable(sortedRows, "allResumes")} {/* Render for all resumes */}
        </TabsContent>
      </Tabs>


          )}
        </div>

      

        {/* Requirements Dialog */}
        <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
          <DialogContent className="max-w-3xl" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Requirements — {reqRow?.lead_id ?? ""}</DialogTitle>
              <DialogDescription>Commitment details captured at sale closure.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Lead ID</div>
                  <div className="font-medium">{reqRow?.lead_id ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="font-medium">{reqRow?.leads?.name ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium break-all">{reqRow?.email ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Closed At</div>
                  <div className="font-medium">{reqRow?.closed_at ? new Date(reqRow.closed_at).toLocaleDateString("en-GB") : "—"}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Commitments</div>
                <div className="rounded-md border bg-muted/30 p-3 max-h-[50vh] overflow-y-auto whitespace-pre-wrap">
                  {reqRow?.commitments?.trim() ? reqRow.commitments : "—"}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(reqRow?.commitments ?? "");
                  } catch {}
                }}
              >
                Copy Text
              </Button>
              <Button onClick={() => setReqDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


<Dialog open={myTasksOpen} onOpenChange={setMyTasksOpen}>
  <DialogContent
    className="max-w-[90vw] max-h-[80vh] overflow-auto"  // 👈 Add max height & both scrolls
    onPointerDownOutside={(e) => e.preventDefault()}
    onEscapeKeyDown={(e) => e.preventDefault()}
  >
    <DialogHeader>
      <DialogTitle>My Tasks</DialogTitle>
      <DialogDescription>
        Resumes assigned to you ({myTasksRows.length})
      </DialogDescription>
    </DialogHeader>

    <div className="overflow-x-auto overflow-y-auto">
      {myTasksLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : myTasksError ? (
        <div className="p-6 text-sm text-red-600">{myTasksError}</div>
      ) : (
        renderTable(mySortedRows, "myTasks")
      )}
    </div>

    <DialogFooter className="gap-2">
      <Button variant="outline" onClick={fetchMyTasks}>Refresh</Button>
      <Button onClick={() => setMyTasksOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


{/* 
<Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
  <DialogContent
    className="max-w-[90vw] max-h-[80vh] overflow-auto"
    onPointerDownOutside={(e) => e.preventDefault()}
  >
    <DialogHeader>
      <DialogTitle>Advanced Filters</DialogTitle>
      <DialogDescription>View clients by category</DialogDescription>
    </DialogHeader>

    <Tabs
      value={filterTab}
      onValueChange={(val) => setFilterTab(val as "notOnboarded" | "resumeOnly")}
      className="w-full"
    >
      <TabsList className="grid grid-cols-2 w-full sm:w-auto mb-4">
        <TabsTrigger value="notOnboarded">Not Onboarded Clients</TabsTrigger>
        <TabsTrigger value="resumeOnly">Only for Resumes</TabsTrigger>
      </TabsList>

      <TabsContent value="notOnboarded">
        {filterLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          renderTable(filterRows, "notOnboarded")
        )}
      </TabsContent>

      <TabsContent value="resumeOnly">
        {filterLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          renderTable(filterRows, "resumeOnly")
        )}
      </TabsContent>
    </Tabs>

    <DialogFooter>
      <Button onClick={() => setFilterDialogOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog> */}


<Dialog open={notOnboardedDialogOpen} onOpenChange={setNotOnboardedDialogOpen}>
  <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-auto">
    <DialogHeader>
      <DialogTitle>Not Onboarded Clients</DialogTitle>
      <DialogDescription>
        Clients with no onboarding date and application sale value greater than 0
      </DialogDescription>
    </DialogHeader>
    <div className="overflow-x-auto">
      {filterLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : (
        renderTable(filterRows, "notOnboarded")
      )}
    </div>
    <DialogFooter>
      <Button onClick={() => setNotOnboardedDialogOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog open={resumeOnlyDialogOpen} onOpenChange={setResumeOnlyDialogOpen}>
  <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-auto">
    <DialogHeader>
      <DialogTitle>Only for Resumes</DialogTitle>
      <DialogDescription>
        Clients who paid for resumes but not for applications
      </DialogDescription>
    </DialogHeader>
    <div className="overflow-x-auto">
      {filterLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : (
        renderTable(filterRows, "resumeOnly")
      )}
    </div>
    <DialogFooter>
      <Button onClick={() => setResumeOnlyDialogOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


        <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>Onboard & Edit — {currentLeadId ?? ""}</DialogTitle>
      <DialogDescription>
        Update the latest onboarding details and set the Onboarded Date for this client.
      </DialogDescription>
    </DialogHeader>

    {dialogLoading ? (
      <div className="p-8 text-sm text-muted-foreground">Loading…</div>
    ) : (
      <div className="space-y-4">
        {/* Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={obFullName} onChange={(e) => setObFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Company Email</Label>
            <Input value={obCompanyEmail} onChange={(e) => setObCompanyEmail(e.target.value)} />
          </div>
        </div>



        {/* Phones & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Callable Phone</Label>
            <Input value={obCallablePhone} onChange={(e) => setObCallablePhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Onboarded Date</Label>
            <Input
              type="date"
              value={obDate}
              onChange={(e) => setObDate(e.target.value)}
            />
          </div>
        </div>

        {/* Textareas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Job Role Preferences (comma separated)</Label>
            <Textarea
              rows={3}
              value={obJobRolesText}
              onChange={(e) => setObJobRolesText(e.target.value)}
              placeholder="software-engineer, data-scientist"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location Preferences (comma separated)</Label>
            <Textarea
              rows={3}
              value={obLocationsText}
              onChange={(e) => setObLocationsText(e.target.value)}
              placeholder="san-francisco, new-york, remote"
            />
          </div>
        </div>

        {/* Misc */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Salary Range</Label>
            <Input value={obSalaryRange} onChange={(e) => setObSalaryRange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Work Auth Details</Label>
            <Input value={obWorkAuth} onChange={(e) => setObWorkAuth(e.target.value)} />
          </div>
        </div>

        {/* Sponsorship & DOB */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-1.5">
    <Label>Needs Sponsorship</Label>
    <Select
      value={
        obNeedsSponsorship === null ? "__unset__" :
        obNeedsSponsorship ? "yes" : "no"
      }
      onValueChange={(v) => {
        if (v === "__unset__") setObNeedsSponsorship(null);
        else setObNeedsSponsorship(v === "yes");
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__unset__">—</SelectItem>
        <SelectItem value="yes">Yes</SelectItem>
        <SelectItem value="no">No</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div className="space-y-1.5">
    <Label>Date of Birth</Label>
    <Input
      type="date"
      value={obDob}
      onChange={(e) => setObDob(e.target.value)}
    />
  </div>
</div>

{/* Address & LinkedIn */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-1.5">
    <Label>Full Address</Label>
    <Textarea
      rows={3}
      value={obFullAddress}
      onChange={(e) => setObFullAddress(e.target.value)}
      placeholder="Flat / Street, City, State, Country, ZIP"
    />
  </div>
  <div className="space-y-1.5">
    <Label>LinkedIn URL</Label>
    <Input
      type="url"
      value={obLinkedInUrl}
      onChange={(e) => setObLinkedInUrl(e.target.value)}
      placeholder="https://www.linkedin.com/in/username"
    />
  </div>
</div>

      </div>
    )}

    <DialogFooter>
      <Button variant="outline" onClick={() => setShowOnboardDialog(false)} disabled={dialogLoading}>
        Cancel
      </Button>
      <Button onClick={saveOnboardAndDetails} disabled={dialogLoading}>
        {dialogLoading ? "Saving…" : "Save & Onboard"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      </DashboardLayout>
    </ProtectedRoute>
  );
}