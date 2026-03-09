"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
import { EditIcon, Eye, Search, ExternalLink, Bell, User, ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Star, Settings, Phone, History as HistoryIcon, Trash2, Plus, Download, Tag, Loader2, Calendar, BarChart, ListOrdered, RefreshCw, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import isBetween from "dayjs/plugin/isBetween";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { ZoomPhoneEmbedHandle } from "@/components/ZoomPhoneEmbed";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";


dayjs.extend(isBetween);


type SalesStage = "Prospect" | "DNP" | "Out of TG" | "Not Interested" | "Conversation Done" | "sale done" | "Target";

interface CallHistory {
  id: string;          // ← add id to update precisely
  date: string;        // followup_date (YYYY-MM-DD)
  stage: SalesStage;
  notes: string;
  duration?: number;
  recording_url?: string;
  assigned_to?: string;
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
  updated_at?: string | null;
  source?: string;
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
    case "Prospect": return "bg-blue-50 text-blue-700 border-blue-200";
    case "DNP": return "bg-amber-50 text-amber-700 border-amber-200";
    case "Out of TG": return "bg-rose-50 text-rose-700 border-rose-200";
    case "Not Interested": return "bg-red-50 text-red-700 border-red-200";
    case "Conversation Done": return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "sale done": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Target": return "bg-orange-50 text-orange-700 border-orange-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

// 🚀 Memoized Row Component to prevent full-table re-renders
const LeadRow = React.memo(({
  item,
  idx,
  userProfile,
  handleStageUpdate,
  handlePhoneClick,
  isRightPanelCollapsed,
  onOpenHistory
}: {
  item: Lead,
  idx: number,
  userProfile: Profile | null,
  handleStageUpdate: (id: string, stage: SalesStage) => void,
  handlePhoneClick: (phone: string) => void,
  isRightPanelCollapsed: boolean,
  onOpenHistory: (lead: Lead) => void
}) => {
  const leadScore = item.current_stage === "sale done" ? 100 : Math.max(2, 26 - (idx * 3));

  return (
    <TableRow className="group hover:bg-[#f5faff] transition-colors border-b last:border-0 min-h-[56px]">
      <TableCell className="px-4 py-3 align-top">
        <input type="checkbox" className="rounded mt-1" />
      </TableCell>
      <TableCell className="py-3 align-top min-w-[220px]">
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity mt-1">
            <Star className="w-4 h-4 text-gray-400 cursor-pointer hover:text-yellow-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="flex flex-col">
            <span
              className="lead-name-link text-smooth hover:underline cursor-pointer text-[14px] font-semibold"
              onClick={() => window.open(`/leads/${item.business_id}`, "_blank")}
            >
              {item.client_name}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {item.business_id}
              </span>
              <span className="text-[10px] text-gray-500 font-medium tracking-tight">
                {item.phone}
              </span>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3 align-top">
        {item.source ? (
          <Badge variant="outline" className="text-[10px] uppercase font-semibold text-blue-600 bg-blue-50 border-blue-200 py-0 px-2 h-5">
            {item.source}
          </Badge>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="py-3 align-top font-bold text-slate-900 text-[13px] pl-6">
        {leadScore}
      </TableCell>
      <TableCell className="py-3 align-top whitespace-nowrap">
        <Select
          value={item.current_stage}
          onValueChange={(val: SalesStage) => handleStageUpdate(item.id, val)}
        >
          <SelectTrigger className="w-fit h-6 border-none bg-transparent hover:bg-gray-100/50 p-1 shadow-none transition-all focus:ring-0">
            <div className="flex items-center gap-1.5">
              <Badge className={cn("rounded-md px-2 py-0 h-5 text-[11px] font-medium border shadow-sm transition-all whitespace-nowrap", getStageColor(item.current_stage || "Prospect"))}>
                {item.current_stage}
              </Badge>
            </div>
          </SelectTrigger>
          <SelectContent className="min-w-[160px]">
            {salesStages
              .filter((stage) => {
                if (item.current_stage !== "Prospect" && stage === "Prospect") return false;
                return true;
              })
              .map((stage) => (
                <SelectItem key={stage} value={stage} className="cursor-pointer">
                  <Badge className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium border shadow-none whitespace-nowrap", getStageColor(stage))}>
                    {stage}
                  </Badge>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-3 align-top text-slate-700 font-medium whitespace-nowrap text-[13px]">
        {item.assigned_to || "—"}
      </TableCell>
      <TableCell className="py-3 align-top text-gray-500 whitespace-nowrap text-[11px] pt-4">
        {item.created_at ? dayjs(item.created_at).fromNow(true) : "—"}
      </TableCell>
      <TableCell className="py-3 align-top text-center w-28 pt-3">
        <div className="flex items-center justify-center gap-2">
          <div
            title="Call Lead"
            className="p-1.5 bg-blue-50 text-blue-600 rounded-md cursor-pointer hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            onClick={() => handlePhoneClick(item.phone)}
          >
            <Phone className="w-3.5 h-3.5" />
          </div>
          <div
            title="Call History"
            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md cursor-pointer hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenHistory(item);
            }}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
          </div>
          <div
            title="View Details"
            className="p-1.5 bg-gray-50 text-gray-600 rounded-md cursor-pointer hover:bg-gray-800 hover:text-white transition-all shadow-sm"
            onClick={() => {
              const win = window.open(`/leads/${item.business_id}`, "_blank");
              win?.focus();
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </div>
          {userProfile?.roles === "Admin" && (
            <div
              title="Delete"
              className="p-1.5 bg-red-50 text-red-600 rounded-md cursor-pointer hover:bg-red-600 hover:text-white transition-all shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

// 🚀 Memoized Table Component
const LeadsTable = React.memo(({
  leads,
  sortConfig,
  handleSort,
  handleStageUpdate,
  handlePhoneClick,
  userProfile,
  page,
  pageSize,
  totalRecords,
  setPage,
  setPageSize,
  isRightPanelCollapsed,
  onOpenHistory
}: {
  leads: Lead[],
  sortConfig: { key: keyof Lead | null, direction: "asc" | "desc" },
  handleSort: (key: keyof Lead) => void,
  handleStageUpdate: (id: string, stage: SalesStage) => void,
  handlePhoneClick: (phone: string) => void,
  userProfile: Profile | null,
  page: number,
  pageSize: number,
  totalRecords: number,
  setPage: React.Dispatch<React.SetStateAction<number>>,
  setPageSize: React.Dispatch<React.SetStateAction<number>>,
  isRightPanelCollapsed: boolean,
  onOpenHistory: (lead: Lead) => void
}) => {
  return (
    <div className="bg-white border rounded shadow-sm overflow-hidden flex flex-col min-h-[400px]">
      <div className="overflow-x-auto">
        <Table className="text-sm">
          <TableHeader className="sales-table-header">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-10 px-4 align-middle h-12">
                <input type="checkbox" className="rounded" />
              </TableHead>
              <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider min-w-[220px] align-middle h-12">Lead Details & ID</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider align-middle h-12">Source</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider cursor-pointer whitespace-nowrap align-middle h-12" onClick={() => handleSort("business_id")}>
                <div className="flex items-center gap-1">
                  Lead Score {sortConfig.key === "business_id" && (sortConfig.direction === "asc" ? "↓" : "↑")}
                </div>
              </TableHead>
              <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider w-[160px] align-middle h-12">Lead Stage</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider align-middle h-12">Owner</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider align-middle h-12 cursor-pointer group" onClick={() => handleSort("created_at")}>
                <div className="flex items-center gap-1">
                  Lead Age
                  <div className="flex flex-col gap-0.5 ml-1">
                    <ChevronUp className={cn("w-2.5 h-2.5", sortConfig.key === "created_at" && sortConfig.direction === "asc" ? "text-blue-600" : "text-gray-300")} />
                    <ChevronDown className={cn("w-2.5 h-2.5", sortConfig.key === "created_at" && sortConfig.direction === "desc" ? "text-blue-600" : "text-gray-300")} />
                  </div>
                </div>
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-center uppercase text-[11px] tracking-wider w-20 align-middle h-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-gray-400 italic">No leads matches your criteria.</TableCell>
              </TableRow>
            ) : (
              leads.map((item, idx) => (
                <LeadRow
                  key={item.id}
                  item={item}
                  idx={idx}
                  userProfile={userProfile}
                  handleStageUpdate={handleStageUpdate}
                  handlePhoneClick={handlePhoneClick}
                  isRightPanelCollapsed={isRightPanelCollapsed}
                  onOpenHistory={onOpenHistory}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span>Page {page} of {Math.ceil(totalRecords / pageSize)}</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-7 w-20 text-xs border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[30, 50, 100, 200, 500].map(v => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)} suppressHydrationWarning><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-white bg-[#00a1e1] border-[#00a1e1] hover:bg-[#0081b5]" suppressHydrationWarning>{page}</Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page === Math.ceil(totalRecords / pageSize)} onClick={() => setPage(p => p + 1)} suppressHydrationWarning><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
});

// 🚀 Memoized Sidebar Component
const RightActionPanel = React.memo(({
  isCollapsed,
  onAddLead,
  userProfile
}: {
  isCollapsed: boolean,
  onAddLead: () => void,
  userProfile: Profile | null
}) => {
  if (isCollapsed) return null;
  return (
    <div className="w-80 bg-[#f1f4f9] border-l border-gray-200 overflow-y-auto px-5 py-6 space-y-6">
      <div className="space-y-3">
        <Button onClick={onAddLead} size="lg" className="w-full bg-[#ae1919] hover:bg-[#8e1414] text-white rounded-sm font-semibold text-base py-6 shadow-sm flex items-center gap-3">
          <Plus className="w-5 h-5" /> Add New Lead
        </Button>
        <Button size="lg" className="w-full bg-[#ae1919] hover:bg-[#8e1414] text-white rounded-sm font-semibold text-base py-6 shadow-sm flex items-center gap-3">
          <Download className="w-5 h-5" /> Import Leads
        </Button>
        <Button size="lg" className="w-full bg-[#ae1919] hover:bg-[#8e1414] text-white rounded-sm font-semibold text-base py-6 shadow-sm flex items-center gap-3">
          <Tag className="w-5 h-5" /> Import Lead Tags
        </Button>
      </div>

      <div className="bg-white border rounded shadow-sm overflow-hidden mt-8">
        <div className="p-3 border-b flex justify-between items-center bg-gray-50/50">
          <span className="font-semibold text-gray-700 text-sm">Quick Filters</span>
          <Plus className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
        </div>
        <div className="divide-y text-sm">
          {[
            { icon: Star, label: "Starred Leads" },
            { label: "Engaged Leads", secondary: true },
            { label: "Leads who visited website in the last 7 days", secondary: true },
            { label: "Leads with activity in last 7 days", secondary: true },
            { label: "New Leads in last 7 days", secondary: true },
          ].map((item, i) => (
            <div key={i} className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-[#00a1e1] flex items-center gap-2">
              {item.icon && <item.icon className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
              <span className={cn(item.secondary && "text-[13px] leading-tight")}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mt-4">
        <Button onClick={() => window.open("/sales/followups", "_blank")} variant="outline" className="w-full bg-white border-gray-300 text-gray-700 h-10 shadow-sm">
          Open Follow Ups Grid
        </Button>
        <Button onClick={() => window.open("/SalesAddonsInfo", "_blank")} variant="outline" className="w-full bg-white border-gray-300 text-gray-700 h-10 shadow-sm">
          View Portfolio/Resumes
        </Button>
      </div>
    </div>
  );
});


import SalesClosureDialog from "@/app/sales/_components/SalesClosureDialog";
import ActivityView from "@/app/sales/_components/ActivityView";
import CallStatsView from "@/app/sales/_components/CallStatsView";
import RenewalsView from "@/app/sales/_components/RenewalsView";
import { EmailLogView } from "@/app/_components/EmailLogView";
import { ZoomPhoneEmbed } from "@/components/ZoomPhoneEmbed";

export default function SalesPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<"leads" | "activity" | "call_stats" | "renewals" | "email_logs">("leads");
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
  const [searchTerm, setSearchTerm] = useState(""); // Committed search (after debounce)
  const [tempSearch, setTempSearch] = useState(""); // Immediate input state
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
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

  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");


  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30); // default
  const [totalRecords, setTotalRecords] = useState(0);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!userEmail) return;

      // Fetch from Supabase
      const { data, error } = await supabase
        .from("custom_email_templates")
        .select("*")
        .or(`created_by_email.eq.${userEmail},is_global.eq.true`);

      // Fallback logic
      const saved = localStorage.getItem(`custom_email_templates_${userEmail}`);
      const localTemplates = saved ? JSON.parse(saved) : [];

      if (!error && data && data.length > 0) {
        setCustomTemplates(data);
        localStorage.setItem(`custom_email_templates_${userEmail}`, JSON.stringify(data));
      } else {
        setCustomTemplates(localTemplates);
      }
    };
    fetchTemplates();
  }, [userEmail]);

  const saveCustomTemplate = async () => {
    if (!userEmail) return;

    const payload = {
      ...editingTemplate,
      created_by_email: userEmail,
      created_by_name: userProfile?.full_name || userEmail,
    };

    const { error } = await supabase.from("custom_email_templates").upsert(payload);

    // Always update localStorage as a backup
    const newTemplatesList = editingTemplate.id
      ? customTemplates.map(t => t.id === editingTemplate.id ? payload : t)
      : [...customTemplates, { ...payload, id: editingTemplate.id || Math.random().toString(36).substr(2, 9) }];

    setCustomTemplates(newTemplatesList);
    localStorage.setItem(`custom_email_templates_${userEmail}`, JSON.stringify(newTemplatesList));

    if (error) {
      console.error("DB Save failed, but saved to local storage:", error.message);
    } else {
      const { data: refreshed } = await supabase
        .from("custom_email_templates")
        .select("*")
        .or(`created_by_email.eq.${userEmail},is_global.eq.true`);
      if (refreshed && refreshed.length > 0) {
        setCustomTemplates(refreshed);
        localStorage.setItem(`custom_email_templates_${userEmail}`, JSON.stringify(refreshed));
      }
    }

    alert("Template saved successfully!");
    setShowTemplateDialog(false);
    setEditingTemplate(null);
  };

  const deleteCustomTemplate = async (templateId: string) => {
    if (!userEmail || !confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase
      .from("custom_email_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      console.error("DB delete failed, updating local state:", error.message);
      const newTemplates = customTemplates.filter(t => t.id !== templateId);
      setCustomTemplates(newTemplates);
      localStorage.setItem(`custom_email_templates_${userEmail}`, JSON.stringify(newTemplates));
    } else {
      setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
    }

    if (editingTemplate?.id === templateId) setEditingTemplate(null);
  };

  const zoomEmbedRef = useRef<ZoomPhoneEmbedHandle>(null);

  const handlePhoneClick = useCallback(async (phone: string) => {
    if (!phone) return;

    // 1. Dial IMMEDIATELY so the user doesn't wait
    if (zoomEmbedRef.current) {
      zoomEmbedRef.current.dial(phone);
    } else {
      window.location.href = `tel:${phone} `;
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
          notes: `[Sales Call] Outbound call by ${userProfile?.full_name || "Unknown"} to ${phone}`,
          call_started_at: now.toISOString(),
        }]);

      if (insertError) throw insertError;

    } catch (err) {
      console.error("Background call logging error:", err);
      // We don't alert the user here because the call is already dialing
    }
  }, [leads, userProfile]);

  const handleOpenHistory = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsChecking(true);
    setHistoryDialogOpen(true);

    try {
      const { data, error } = await supabase
        .from("call_history")
        .select("*")
        .eq("lead_id", lead.business_id)
        .order("call_started_at", { ascending: false });

      if (error) throw error;

      // Update the selected lead with history
      const updatedLead = {
        ...lead, call_history: (data || []).map(item => ({
          id: item.id,
          date: item.call_started_at || item.followup_date,
          stage: item.current_stage as SalesStage,
          notes: item.notes,
          duration: item.duration,
          recording_url: item.recording_url,
          assigned_to: item.assigned_to
        }))
      };
      setSelectedLead(updatedLead);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setIsChecking(false);
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
    fetchStageCounts();
  }, [userProfile]);

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
    fetchSources();
  }, []);

  const fetchSources = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("source")
      .not("source", "is", null);

    if (error) {
      console.error("Error fetching sources:", error);
      return;
    }

    const uniqueSources = Array.from(new Set(data.map(d => d.source)));
    setSources(uniqueSources);
  };

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
    fetchLeads(profile);   // Fetch initial paginated leads
  };


  // Removed fetchAllLeads and KPI useEffect as they were unused and resource-heavy


  useEffect(() => {
    if (userProfile) fetchLeads(userProfile);
  }, [page, pageSize, sourceFilter, ownerFilter, stageFilter, debouncedSearchTerm]);


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

      if (sourceFilter !== "all") {
        countQuery = countQuery.eq("source", sourceFilter);
      }

      if (ownerFilter !== "all" && profile.roles === "Admin") {
        countQuery = countQuery.eq("assigned_to", ownerFilter);
      }

      if (stageFilter !== "all") {
        countQuery = countQuery.eq("current_stage", stageFilter);
      }

      if (debouncedSearchTerm.trim()) {
        const term = debouncedSearchTerm.trim();
        const bidPart = term.toUpperCase().startsWith("AWL-") ? `business_id.eq.${term}` : `business_id.ilike.%${term}%`;
        countQuery = countQuery.or(`name.ilike.%${term}%,phone.ilike.%${term}%,${bidPart},email.ilike.%${term}%,assigned_to.ilike.%${term}%`);
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
  created_at, assigned_at, source
    `)
        .eq("status", "Assigned")
        .order("assigned_at", { ascending: false })   // 👈 NEW SORT
        .range(from, to);


      if (profile.roles === "Sales Associate") {
        query = query.eq("assigned_to", profile.full_name);
      }

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      if (ownerFilter !== "all" && profile.roles === "Admin") {
        query = query.eq("assigned_to", ownerFilter);
      }

      if (stageFilter !== "all") {
        query = query.eq("current_stage", stageFilter);
      }

      if (debouncedSearchTerm.trim()) {
        const term = debouncedSearchTerm.trim();
        const bidPart = term.toUpperCase().startsWith("AWL-") ? `business_id.eq.${term}` : `business_id.ilike.%${term}%`;
        query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,${bidPart},email.ilike.%${term}%,assigned_to.ilike.%${term}%`);
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
        source: lead.source,
      }));

      setLeads(leadsData);

    } catch (err) {
      console.error("Pagination fetch error:", err);
    }
  };

  const searchLeadsGlobally = async (term: string) => {
    if (!term.trim()) {
      if (userProfile) fetchLeads(userProfile); // Reset to normal view if empty
      return;
    }
    try {
      const bidPart = term.toUpperCase().startsWith("AWL-") ? `business_id.eq.${term}` : `business_id.ilike.%${term}%`;
      const { data, error } = await supabase
        .from("leads")
        .select(`
id, business_id, name, email, phone,
  assigned_to, assigned_to_email, current_stage,
  status, created_at, assigned_at, source
    `)
        .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,${bidPart},assigned_to.ilike.%${term}%,source.ilike.%${term}%`)
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
        updated_at: lead.updated_at,
        source: lead.source,
      }));

      setLeads(leadsData);
      setTotalRecords(leadsData.length);
      setPage(1);
    } catch (err) {
      console.error("Global search failed:", err);
    }
  };

  // Debounce search to prevent lag
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (val: string) => {
    setTempSearch(val); // Update input field immediately without re-rendering the whole page content
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(val);
      setDebouncedSearchTerm(val);
      // searchLeadsGlobally(val); // Removed as fetchLeads now handles searchTerm via useEffect
    }, 400);
  };




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
    setSortConfig((prev) => {
      if (prev.key !== key) {
        // Default to desc for date fields to show latest first
        const defaultDir = (key === "created_at" || key === "assigned_at") ? "desc" : "asc";
        return { key, direction: defaultDir };
      }
      return {
        key,
        direction: prev.direction === "asc" ? "desc" : "asc",
      };
    });
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


  const filteredLeads = useMemo(() => {
    // Only proceed filtering if we have leads.
    // Optimizing ISO string comparisons to avoid dayjs object creation in loop.
    const startIso = startDate ? dayjs(startDate).startOf("day").toISOString() : null;
    const endIso = endDate ? dayjs(endDate).endOf("day").toISOString() : null;

    return leads.filter((lead) => {
      const matchesStage = stageFilter === "all" || lead.current_stage === stageFilter;
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;

      let matchesDate = true;
      if (startIso && endIso && lead.assigned_at) {
        matchesDate = lead.assigned_at >= startIso && lead.assigned_at <= endIso;
      }

      return matchesStage && matchesSource && matchesDate;
    });
  }, [leads, stageFilter, sourceFilter, startDate, endDate]);

  const handleStageUpdate = useCallback(async (leadId: string, newStage: SalesStage) => {
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
      const updatedLead = { ...lead, current_stage: newStage };
      await supabase.from("leads").update({ current_stage: newStage }).eq("id", leadId);

      await supabase.from("call_history").insert([{
        lead_id: lead.business_id,
        email: lead.email,
        phone: lead.phone,
        assigned_to: userProfile?.full_name || "Unknown",
        current_stage: newStage,
        followup_date: todayLocalYMD(),
        notes: `Stage changed to ${newStage}`
      }]);

      setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)));

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
      assigned_to: userProfile?.full_name || "Unknown",
      current_stage: newStage,
      // followup_date: new Date().toISOString().split("T")[0],
      followup_date: todayLocalYMD(),

      notes: `Stage changed to ${newStage}`
    }]);

    setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)));
  }, [leads, userProfile]); // Added userProfile to dependencies for handleStageUpdate

  const handleFollowUpSubmit = async () => {
    if (!selectedLead || !pendingStageUpdate) return;

    const { error: historyError } = await supabase.from("call_history").insert([{
      lead_id: selectedLead.business_id,
      email: selectedLead.email,
      phone: selectedLead.phone,
      assigned_to: userProfile?.full_name || "Unknown",
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
  // KPI Stats removed - redundant on this page and causing high CPU usage.
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
        account_assigned_name: userProfile?.full_name || "Sales",
        account_assigned_email: userEmail || null,

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
      alert(`Failed to onboard client: ${err?.message || "Unknown error"} `);
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
          console.error(`Error fetching data from ${table}: `, error);
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

  const sortedLeads = useMemo(() => {
    const leadsToSort = [...filteredLeads];
    const { key, direction } = sortConfig;
    if (!key) return leadsToSort;

    return leadsToSort.sort((a, b) => {
      let aValue: any = a[key as keyof Lead];
      let bValue: any = b[key as keyof Lead];

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
  }, [filteredLeads, sortConfig]);

  const fetchSalesClosureCount = async () => {
    const { count, error } = await supabase
      .from("sales_closure")
      .select("lead_id", { count: "exact", head: true });

    if (!error) setSalesClosedTotal(count ?? 0);
  };

  const fetchStageCounts = async () => {
    if (!userProfile) return;

    let query = supabase
      .from("leads")
      .select("current_stage", { count: "exact" })
      .eq("status", "Assigned");

    if (userProfile.roles === "Sales Associate") {
      query = query.eq("assigned_to", userProfile.full_name);
    }

    const { data, error } = await supabase
      .from("leads")
      .select("current_stage")
      .eq("status", "Assigned")
      .filter("assigned_to", "eq", userProfile.roles === "Sales Associate" ? userProfile.full_name : "all");

    // Better way: manual counts from fetching stages or individual counts
    const counts: Record<string, number> = {};
    let total = 0;
    for (const stage of salesStages) {
      let q = supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "Assigned")
        .eq("current_stage", stage);

      if (userProfile.roles === "Sales Associate") {
        q = q.eq("assigned_to", userProfile.full_name);
      }

      const { count } = await q;
      counts[stage] = count || 0;
      total += (count || 0);
    }
    counts['total'] = total;
    setStageCounts(counts);
  };



  return (
    <ProtectedRoute allowedRoles={["Sales", "Sales Associate", "Super Admin", "Admin"]}>
      <style jsx global>{`
  .premium - font {
  -webkit - font - smoothing: antialiased;
  -moz - osx - font - smoothing: grayscale;
}

        .text - brighter {
  color: #0f172a!important; /* Slate 900 */
}

        .text - smooth {
  letter - spacing: -0.01em;
  line - height: 1.5;
}

        .sales - table - header {
  background - color: #f8fafc!important; /* Slate 50 */
  border - bottom: 2px solid #e2e8f0!important;
}

        .lead - name - link {
  color: #0284c7!important; /* Sky 600 */
  font - weight: 500!important;
  transition: all 0.2s ease;
}

        .lead - name - link:hover {
  color: #0369a1!important; /* Sky 700 */
  text - decoration: underline;
}

        /* Global Table Text Enhancements */
        .premium - font table td {
  color: #334155!important; /* Slate 700 - Brighter than gray */
  font - weight: 400;
  -webkit - font - smoothing: antialiased;
}

        .premium - font table td: nth - child(3) {
  color: #0f172a!important; /* Slate 900 - Brighter for score */
  font - weight: 600!important;
}

        .premium - font table thead th {
  color: #475569!important; /* Slate 600 */
  font - weight: 700!important;
  letter - spacing: 0.05em;
}
`}</style>
      <SidebarProvider className="premium-font">
        <div className="flex min-h-screen w-full bg-[#f1f4f9]">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-h-screen overflow-hidden text-gray-800">
            <Header
              searchTerm={tempSearch}
              onSearchChange={handleSearchChange}
            >
              <div className="flex items-center gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={downloadAllTablesData} className="h-8 gap-2 border-gray-300 font-normal bg-white">
                  <Download className="w-4 h-4 text-gray-400" /> <span className="hidden lg:inline">Export All Data</span>
                </Button>

                <Button variant="outline" size="sm" onClick={() => setView("activity")} className="h-8 gap-2 border-gray-300 font-normal bg-white">
                  <ListOrdered className="w-4 h-4 text-gray-400" /> <span className="hidden lg:inline">Activity View</span>
                </Button>

                {["Admin", "Super Admin"].includes(userProfile?.roles || "") && (
                  <Button variant="outline" size="sm" onClick={() => setView("call_stats")} className="h-8 gap-2 border-gray-300 font-normal bg-white">
                    <BarChart className="w-4 h-4 text-gray-400" /> <span className="hidden lg:inline">View Call Stats</span>
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={() => setView("renewals")} className="h-8 gap-2 border-orange-200 text-orange-600 font-medium bg-orange-50/50 hover:bg-orange-50">
                  <RefreshCw className="w-4 h-4 text-orange-500" /> <span className="hidden lg:inline">Renewals</span>
                </Button>

                <Button variant="outline" size="sm" onClick={() => setView("email_logs")} className="h-8 gap-2 border-blue-200 text-blue-600 font-medium bg-blue-50/50 hover:bg-blue-50">
                  <Mail className="w-4 h-4 text-blue-500" /> <span className="hidden lg:inline">Email History</span>
                </Button>

                <Button variant="outline" size="sm" onClick={() => {
                  setEditingTemplate({ subject: "", body: "", is_global: false });
                  setShowTemplateDialog(true);
                }} className="h-8 gap-2 border-purple-200 text-purple-600 font-medium bg-purple-50/50 hover:bg-purple-50">
                  <Plus className="w-4 h-4 text-purple-500" /> <span className="hidden lg:inline">Custom Template</span>
                </Button>
              </div>
            </Header>
            <div className="flex flex-1 overflow-hidden">
              {/* Main Content Area */}
              <div className="flex-1 flex flex-col overflow-y-auto px-6 py-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                      {view === "leads" ? "Manage Leads" :
                        view === "call_stats" ? "Zoom Call Statistics" :
                          view === "renewals" ? "Subscription Renewals" :
                            view === "email_logs" ? "Communication History" :
                              "Activity History"}
                    </h1>
                    <div className="text-gray-400 cursor-pointer hover:text-gray-600">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>

                  {view !== "leads" && (
                    <Button
                      onClick={() => setView("leads")}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back to Leads
                    </Button>
                  )}
                </div>

                {view === "leads" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                    <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStageFilter("all")}>
                      <CardHeader className="p-3 pb-0">
                        <CardTitle className="text-[10px] uppercase font-bold text-gray-500 tracking-wider h-8 flex items-center">
                          Total Leads
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1">
                        <div className="text-xl font-bold text-slate-800">
                          {stageCounts['total'] || 0}
                        </div>
                        <div className="w-full h-1 mt-2 rounded-full opacity-50 bg-slate-400" />
                      </CardContent>
                    </Card>

                    {salesStages.map((stage) => (
                      <Card key={stage} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStageFilter(stage)}>
                        <CardHeader className="p-3 pb-0">
                          <CardTitle className="text-[10px] uppercase font-bold text-gray-500 tracking-wider h-8 flex items-center">
                            {stage}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                          <div className="text-xl font-bold text-slate-800">
                            {stageCounts[stage] || 0}
                          </div>
                          <div className={cn("w-full h-1 mt-2 rounded-full opacity-50", getStageColor(stage).split(" ")[0])} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {view === "activity" ? (
                  <ActivityView userProfile={userProfile} onBack={() => setView("leads")} />
                ) : view === "call_stats" ? (
                  <CallStatsView />
                ) : view === "renewals" ? (
                  <RenewalsView />
                ) : view === "email_logs" ? (
                  <EmailLogView filterEmail={userEmail} />
                ) : (
                  <>

                    {/* Filter Section - LeadSquared Style */}
                    <div className="bg-white border rounded shadow-sm mb-4">
                      {/* Integrated Header and Tag Row */}
                      <div className="px-4 py-2 border-b flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="sm" className="h-8 gap-2 border-gray-300 font-normal bg-white">
                            <Tag className="w-3.5 h-3.5 text-gray-500" /> Tags
                          </Button>
                          <div className="h-4 w-px bg-gray-200 mx-1" />
                          <Button
                            variant="ghost"
                            className="h-8 text-xs text-red-500 hover:text-red-600 p-0 px-2"
                            onClick={() => { setStartDate(null); setEndDate(null); setStageFilter("all"); setSourceFilter("all"); setOwnerFilter("all"); }}
                          >
                            Reset Filters
                          </Button>
                        </div>

                        <div
                          className="text-xs text-[#00a1e1] hover:underline cursor-pointer flex items-center gap-1 font-medium"
                          onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
                        >
                          {isRightPanelCollapsed ? "Expand Panel" : "Collapse Panel"} <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isRightPanelCollapsed && "rotate-180")} />
                        </div>
                      </div>

                      {/* Balanced Filter Row */}
                      <div className="p-3 flex flex-wrap items-center gap-x-8 gap-y-4 bg-[#f8f9fb]/50">
                        <div className="flex flex-col gap-1.5 min-w-[160px]">
                          <Label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Lead Stage</Label>
                          <Select value={stageFilter} onValueChange={setStageFilter}>
                            <SelectTrigger className="h-8 text-xs border-gray-300 bg-white shadow-none">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              <SelectItem value="all">All</SelectItem>
                              {salesStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1.5 min-w-[160px]">
                          <Label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Lead Source</Label>
                          <Select value={sourceFilter} onValueChange={setSourceFilter}>
                            <SelectTrigger className="h-8 text-xs border-gray-300 bg-white shadow-none">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              <SelectItem value="all">All</SelectItem>
                              {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {userProfile?.roles === "Admin" && (
                          <div className="flex flex-col gap-1.5 min-w-[160px]">
                            <Label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Owner</Label>
                            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                              <SelectTrigger className="h-8 text-xs border-gray-300 bg-white shadow-none">
                                <SelectValue placeholder="Any" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any</SelectItem>
                                {salesUsers.map(u => <SelectItem key={u.user_email} value={u.full_name}>{u.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5 flex-1 min-w-[320px]">
                          <Label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Date Filters</Label>
                          <div className="flex gap-2">
                            <Select defaultValue="last_activity">
                              <SelectTrigger className="h-8 text-xs border-gray-300 bg-white shadow-none w-[110px] shrink-0">
                                <SelectValue placeholder="Activity" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="last_activity">Activity</SelectItem>
                                <SelectItem value="assigned_at">Assigned</SelectItem>
                                <SelectItem value="created_at">Created</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1.5 flex-1">
                              <Input
                                type="date"
                                value={startDate || ""}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-8 text-[11px] border-gray-300 bg-white px-2 shadow-none flex-1"
                              />
                              <span className="text-gray-400 text-xs text-center min-w-[8px]">→</span>
                              <Input
                                type="date"
                                value={endDate || ""}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-8 text-[11px] border-gray-300 bg-white px-2 shadow-none flex-1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <LeadsTable
                      leads={sortedLeads}
                      sortConfig={sortConfig}
                      handleSort={handleSort}
                      handleStageUpdate={handleStageUpdate}
                      handlePhoneClick={handlePhoneClick}
                      userProfile={userProfile}
                      page={page}
                      pageSize={pageSize}
                      totalRecords={totalRecords}
                      setPage={setPage}
                      setPageSize={setPageSize}
                      isRightPanelCollapsed={isRightPanelCollapsed}
                      onOpenHistory={handleOpenHistory}
                    />
                  </>
                )}
              </div>

              <RightActionPanel
                isCollapsed={isRightPanelCollapsed || view !== "leads"}
                onAddLead={() => setOnboardDialogOpen(true)}
                userProfile={userProfile}
              />
            </div>
          </div>
        </div>
      </SidebarProvider>

      {/* Keep existing Dialogs & Components */}
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
              <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
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

              <Select value={subscriptionCycle} onValueChange={(val: any) => setSubscriptionCycle(val)}>
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

              <Select value={subscriptionSource} onValueChange={(val: any) => setSubscriptionSource(val)}>
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
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit"}
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Call History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-indigo-500" />
              Shared Interaction History — {selectedLead?.client_name}
            </DialogTitle>
            <DialogDescription>
              Complete history of interactions from both Sales and Finance teams.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            {isChecking ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
            ) : selectedLead?.call_history && selectedLead.call_history.length > 0 ? (
              selectedLead.call_history.map((call) => (
                <div key={call.id} className="border rounded-lg p-4 bg-gray-50/50 shadow-sm transition-all hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{call.assigned_to || "System"}</span>
                      <span className={cn(
                        "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded w-fit mt-0.5",
                        call.notes.includes("[Finance") ? "text-orange-600 bg-orange-50" : "text-blue-600 bg-blue-50"
                      )}>
                        {call.notes.includes("[Finance") ? "Finance Team" : "Sales Team"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{dayjs(call.date).format("MMM DD, YYYY")}</span>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-100 shadow-inner">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{call.notes}</p>
                    {call.stage && (
                      <Badge variant="outline" className="mt-2 text-[9px] h-4 font-normal bg-slate-50">
                        Stage: {call.stage}
                      </Badge>
                    )}
                  </div>
                  {call.duration && (
                    <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Duration: {Math.floor(call.duration / 60)}m {call.duration % 60}s
                    </p>
                  )}
                  {call.recording_url && (
                    <a href={call.recording_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-2 inline-block font-medium">
                      Listen to Recording
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                <HistoryIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium italic">No previous interactions found for this lead.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={followUpDialogOpen} onOpenChange={handleFollowUpDialogClose}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={followUpData.follow_up_date}
                onChange={(e) => setFollowUpData({ ...followUpData, follow_up_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={4}
                placeholder="Add notes about this stage change..."
                value={followUpData.notes}
                onChange={(e) => setFollowUpData({ ...followUpData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => handleFollowUpDialogClose(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gray-900 text-white hover:bg-black"
              onClick={handleFollowUpSubmit}
              disabled={!followUpData.follow_up_date}
            >
              Save Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SalesClosureDialog
        isOpen={showSalesDialog}
        onClose={() => { setShowSalesDialog(false); if (stageFilter === "sale done") setStageFilter("all"); }}
        currentUser={userProfile}
        defaultMode={salesDialogMode}
      />
      <ZoomPhoneEmbed ref={zoomEmbedRef} callerEmail={userEmail} />

      {/* Custom Email Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <Mail className="w-5 h-5" />
              {editingTemplate?.id ? "Edit Custom Template" : "Add New Custom Template"}
            </DialogTitle>
            <DialogDescription>
              {userProfile?.roles?.includes("Admin") || userProfile?.roles?.includes("Super Admin")
                ? "Draft a template for yourself or everyone."
                : "Draft your personalized email template here."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Template Name (e.g. Second Call)</Label>
              <Input
                placeholder="Enter template name..."
                value={editingTemplate?.name || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input
                placeholder="Enter subject..."
                value={editingTemplate?.subject || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Body</Label>
              <Textarea
                rows={10}
                placeholder="Hi [Name], ..."
                value={editingTemplate?.body || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
              />
            </div>

            {(userProfile?.roles?.includes("Admin") || userProfile?.roles?.includes("Super Admin")) && (
              <div className="flex items-center space-x-2 border p-3 rounded bg-blue-50 border-blue-100">
                <input
                  type="checkbox"
                  id="is_global_main"
                  className="w-4 h-4"
                  checked={editingTemplate?.is_global || false}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, is_global: e.target.checked })}
                />
                <Label htmlFor="is_global_main" className="text-blue-700 font-semibold cursor-pointer">
                  Make this template visible to ALL salespersons (Global)
                </Label>
              </div>
            )}

            {customTemplates.length > 0 && (
              <div className="pt-4 border-t">
                <Label className="text-xs text-gray-400 uppercase">Existing Templates</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {customTemplates.map(t => (
                    <div key={t.id} className="group relative">
                      <button
                        onClick={() => setEditingTemplate(t)}
                        className={`px-3 py-1 text-xs border rounded-full transition-all pr-8 ${editingTemplate?.id === t.id ? 'bg-purple-100 border-purple-400 text-purple-700' : 'bg-white hover:bg-gray-50'}`}
                      >
                        {t.is_global ? "[G] " : ""}{t.name || t.subject.substring(0, 15)}
                      </button>
                      {(userProfile?.roles?.includes("Admin") || userProfile?.roles?.includes("Super Admin") || t.created_by_email === userEmail) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteCustomTemplate(t.id); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-red-500 hover:bg-red-50 rounded-full transition-all"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => { setShowTemplateDialog(false); setEditingTemplate(null); }}>
              Cancel
            </Button>
            <Button
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={saveCustomTemplate}
              disabled={!editingTemplate?.name || !editingTemplate?.subject || !editingTemplate?.body}
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
