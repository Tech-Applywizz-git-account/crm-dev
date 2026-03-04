// app/leads/[business_id]/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ExternalLink, ArrowLeft, Star, Share2, Mail, Phone, MapPin, Plus, ChevronDown, MoreHorizontal, Send, FileText, CheckCircle2, Bell, Clock } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Lead {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  current_stage: string;
  created_at: string;
  assigned_to?: string;
  paid_amount?: number;
  city?: string;
  source?: string;
  assigned_at?: string;
}

interface ResumeProgress {
  lead_id: string;
  status: string; // enum on DB, string in TS
  pdf_path: string | null;
  pdf_uploaded_at: string | null;
  updated_at: string | null;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
}

interface PortfolioProgress {
  lead_id: string;
  status: string; // 'not_started' | 'pending' | ...
  link: string | null;
  assigned_email: string | null;
  assigned_name: string | null;
  updated_at: string | null;
}

// 🔁 1) ADD these types near your other interfaces
interface ClientOnboardingDetails {
  id: string;
  full_name: string;
  personal_email: string;
  callable_phone: string | null;
  company_email: string | null;
  job_role_preferences: string[] | null;
  salary_range: string | null;
  location_preferences: string[] | null;
  work_auth_details: string | null;
  resume_path: string | null;
  cover_letter_path: string | null;
  created_at: string | null;
  lead_id: string | null;

  //Added columns
  primary_phone: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  addons: string | null; // array of strings

  // NEW FIELDS
  needs_sponsorship: boolean | null;
  full_address: string | null;
  linkedin_url: string | null;
  date_of_birth: string | null; // date as ISO string

  visatypes: string | null; // new field

}

// helper to find first non-null positive value by closed_at (desc)
function findLatestValue(rows: any[], field: string) {
  if (!rows?.length) return null;
  const record = rows.find(r => r[field] != null && Number(r[field]) > 0);
  return record ? Number(record[field]) : null;
}

// main function to merge all add-on fields
function getLatestAddons(rows: any[]) {
  if (!rows?.length) return null;
  const sorted = [...rows].sort(
    (a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime()
  );
  return {
    resume_sale_value: findLatestValue(sorted, "resume_sale_value"),
    portfolio_sale_value: findLatestValue(sorted, "portfolio_sale_value"),
    linkedin_sale_value: findLatestValue(sorted, "linkedin_sale_value"),
    github_sale_value: findLatestValue(sorted, "github_sale_value"),
    custom_label: findLatestValue(sorted, "custom_label"),
    custom_sale_value: findLatestValue(sorted, "custom_sale_value"),
    badge_value: findLatestValue(sorted, "badge_value"),
    commitments: findLatestValue(sorted, "commitments"),
    application_sale_value: findLatestValue(sorted, "application_sale_value"),
    // You can include more fields if needed
  };
}

export default function LeadProfilePage() {
  const { business_id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const STAGES = useMemo(() => ["Prospect", "Target", "Conversation Done", "DNP", "Out of TG", "Not Interested", "sale done"], []);

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saleHistory, setSaleHistory] = useState<any[]>([]);
  const [zoomCalls, setZoomCalls] = useState<any[]>([]);
  const [crmCalls, setCrmCalls] = useState<any[]>([]);
  const [zoomLoading, setZoomLoading] = useState(false);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [renewal, setRenewal] = useState<Lead | null>(null);
  const [onboarding, setOnboarding] = useState<ClientOnboardingDetails | null>(null);
  const [latestAddons, setLatestAddons] = useState<any | null>(null);


  const [resumeProg, setResumeProg] = useState<ResumeProgress | null>(null);
  const [portfolioProg, setPortfolioProg] = useState<PortfolioProgress | null>(null);

  // ⬇️ NEW local edit state
  const [isEditOnboarding, setIsEditOnboarding] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState<ClientOnboardingDetails | null>(null);
  const [jobRoleCSV, setJobRoleCSV] = useState("");
  const [locCSV, setLocCSV] = useState("");
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  const [isEditAddons, setIsEditAddons] = useState(false);
  const [saleForm, setSaleForm] = useState<any | null>(null);
  const [savingSale, setSavingSale] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);

  // Follow-up Dialog State
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpData, setFollowUpData] = useState({ date: "", notes: "" });
  const [pendingStageUpdate, setPendingStageUpdate] = useState<{ stage: string; callId?: number } | null>(null);
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const formatAssociateName = (email?: string, metaName?: string) => {
    if (metaName) return metaName;
    if (!email) return "Associate Name";
    return email
      .split("@")[0]
      .split(/[\._]/) // Split by dot or underscore
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  };

  const EMAIL_TEMPLATES = useMemo(() => [
    {
      id: "first_call",
      name: "First Call Template",
      subject: "Welcome to ApplyWizz - Great speaking with you!",
      body: `Hi ${lead?.name || 'there'},\n\nIt was a pleasure speaking with you today about your career goals. I'm ${formatAssociateName(user?.email, user?.name)}, your dedicated sales associate at ApplyWizz.\n\nWe are excited to help you scale your job applications and land your dream role. I've attached some details discussed during our call for your reference.\n\nLooking forward to our next steps.\n\nBest regards,\n${formatAssociateName(user?.email, user?.name)}\nApplyWizz Team`
    },
    {
      id: "followup",
      name: "Reminder / Follow-up",
      subject: "Checking in - ApplyWizz Next Steps",
      body: `Hi ${lead?.name || 'there'},\n\nI'm following up on our previous conversation regarding your enrollment. I wanted to see if you had any further questions or if you're ready to proceed with scaling your career journey.\n\nPlease let me know a convenient time to reconnect.\n\nBest regards,\n${formatAssociateName(user?.email, user?.name)}\nApplyWizz Team`
    },
    {
      id: "payment_success",
      name: "Payment Success",
      subject: "Welcome Aboard! Payment Received - ApplyWizz",
      body: `Hi ${lead?.name || 'there'},\n\nGreat news! We have successfully received your payment. Welcome to the ApplyWizz family!\n\nOur technical team has been notified and will reach out to you within the next 24 business hours to begin your profile optimization and official onboarding.\n\nWe're thrilled to have you with us.\n\nBest regards,\n${formatAssociateName(user?.email, user?.name)}\nApplyWizz Team`
    },
    {
      id: "custom",
      name: "Custom Template",
      subject: "",
      body: `Hi ${lead?.name || 'there'},\n\n`
    }
  ], [lead, user]);

  const handleTemplateSelect = (id: string) => {
    const t = EMAIL_TEMPLATES.find(x => x.id === id);
    if (t) {
      setSelectedTemplate(id);
      setEmailSubject(t.subject);
      setEmailBody(t.body);
    }
  };

  const handleSendMail = async () => {
    if (!lead || !user) return;
    setSendingEmail(true);

    try {
      // 1. Physically send the email via Graph API proxy
      const mailRes = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: lead.email,
          subject: emailSubject,
          body: emailBody,
          senderEmail: user.email,
        })
      });

      const mailData = await mailRes.json();
      if (!mailData.success) {
        throw new Error(mailData.error || "Graph API error.");
      }

      // 2. Log it to activity/call_history for unified view
      await supabase.from("call_history").insert([{
        lead_id: lead.business_id,
        email: lead.email,
        phone: lead.phone,
        assigned_to: user?.user_metadata?.full_name || user?.email,
        current_stage: lead.current_stage || "Prospect",
        followup_date: new Date().toISOString().split("T")[0],
        call_started_at: new Date().toISOString(),
        notes: `Email Sent (Graph): ${emailSubject}`
      }]);

      // Refresh local state (Fetch latest from the new table)
      const res = await fetch(`/api/email/sent?email=${user.email}`);
      const data = await res.json();
      if (data.emails) setEmails(data.emails);

      setSendingEmail(false);
      setIsEmailModalOpen(false);
      alert(`Email sent successfully via Microsoft Graph API.`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to send/record email: " + err.message);
      setSendingEmail(false);
    }
  };



  const updateLeadStage = async (newStage: string) => {
    if (!lead || !user) return;

    if (newStage === "sale done") {
      window.open(`/SaleUpdate/${lead.business_id}?mode=new`, "_blank");
      return;
    }

    if (newStage === "DNP" || newStage === "Conversation Done" || newStage === "Target") {
      setPendingStageUpdate({ stage: newStage });
      setFollowUpDialogOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from("leads")
        .update({ current_stage: newStage })
        .eq("business_id", lead.business_id);

      if (error) throw error;

      await supabase.from("call_history").insert([{
        lead_id: lead.business_id,
        email: lead.email,
        phone: lead.phone,
        assigned_to: user?.name || user?.email,
        current_stage: newStage,
        followup_date: new Date().toISOString().split("T")[0],
        call_started_at: new Date().toISOString(),
        notes: `Stage changed via Profile to: ${newStage}`
      }]);

      setLead(prev => prev ? ({ ...prev, current_stage: newStage }) : null);
      fetchAll(); // Refresh everything
    } catch (err: any) {
      console.error(err);
      alert("Error updating stage: " + err.message);
    }
  };

  const handleFollowUpSave = async () => {
    if (!lead || !user || !pendingStageUpdate) return;
    if (!followUpData.date) {
      alert("Please select a follow-up date.");
      return;
    }

    setSavingFollowUp(true);
    try {
      // 1. Update lead stage
      const { error: leadErr } = await supabase
        .from("leads")
        .update({ current_stage: pendingStageUpdate.stage })
        .eq("business_id", lead.business_id);
      if (leadErr) throw leadErr;

      // 2. If it was a call stage update, update that specific log too
      if (pendingStageUpdate.callId) {
        await supabase
          .from("call_history")
          .update({ current_stage: pendingStageUpdate.stage, followup_date: followUpData.date, notes: followUpData.notes })
          .eq("id", pendingStageUpdate.callId);
      } else {
        // Create a new log
        await supabase.from("call_history").insert([{
          lead_id: lead.business_id,
          email: lead.email,
          phone: lead.phone,
          assigned_to: user?.name || user?.email,
          current_stage: pendingStageUpdate.stage,
          followup_date: followUpData.date,
          call_started_at: new Date().toISOString(),
          notes: followUpData.notes || `Follow-up scheduled for ${pendingStageUpdate.stage}`
        }]);
      }

      setLead(prev => prev ? ({ ...prev, current_stage: pendingStageUpdate.stage }) : null);
      setFollowUpDialogOpen(false);
      setFollowUpData({ date: "", notes: "" });
      setPendingStageUpdate(null);
      fetchAll();
    } catch (err: any) {
      console.error(err);
      alert("Error saving follow-up: " + err.message);
    } finally {
      setSavingFollowUp(false);
    }
  };

  const updateCallStage = async (callId: number, newStage: string) => {
    if (!lead || !user) return;

    if (newStage === "sale done") {
      window.open(`/SaleUpdate/${lead.business_id}?mode=new`, "_blank");
      return;
    }

    if (newStage === "DNP" || newStage === "Conversation Done" || newStage === "Target") {
      setPendingStageUpdate({ stage: newStage, callId });
      setFollowUpDialogOpen(true);
      return;
    }

    try {
      // 1. Update specific call history entry
      const { error: callErr } = await supabase
        .from("call_history")
        .update({ current_stage: newStage })
        .eq("id", callId);

      if (callErr) throw callErr;

      // 2. Update global lead stage
      const { error: leadErr } = await supabase
        .from("leads")
        .update({ current_stage: newStage })
        .eq("business_id", lead.business_id);

      if (leadErr) throw leadErr;

      // 3. Update local state
      setLead(prev => prev ? ({ ...prev, current_stage: newStage }) : null);
      fetchAll();
    } catch (err: any) {
      console.error(err);
      alert("Error updating call stage: " + err.message);
    }
  };

  // small helpers
  const toYesNo = (b?: boolean | null) => (b === true ? "Yes" : b === false ? "No" : "");
  const fromYesNo = (s: string) => s.trim().toLowerCase().startsWith("y");
  const toDateInput = (iso?: string | null) =>
    iso ? new Date(iso).toISOString().slice(0, 10) : ""; // yyyy-mm-dd

  // Dynamic Scores Calculation
  const { leadScore, engagementScore, qualityScore } = useMemo(() => {
    let ls = 0;
    let es = 0;
    let qs = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Zoom Calls Scoring
    zoomCalls.forEach(call => {
      let points = 2; // base
      if ((call.duration || 0) > 300) points += 3; // > 5 mins
      if (call.recording_url) points += 1;

      ls += points;
      if (call.start_time && new Date(call.start_time) > sevenDaysAgo) {
        es += points;
      }
    });

    // 2. Sales History Scoring
    saleHistory.forEach(sale => {
      let points = 10;
      ls += points;
      if (sale.closed_at && new Date(sale.closed_at) > sevenDaysAgo) {
        es += points;
      }
    });

    // 3. Feedback Scoring
    feedbackList.forEach(fb => {
      let points = (fb.rating || 0);
      if (fb.client_emotion === "happy") points += 5;
      if (fb.client_emotion === "unhappy") points -= 5;

      ls += points;
      if (fb.created_at && new Date(fb.created_at) > sevenDaysAgo) {
        es += points;
      }
    });

    // 4. Quality Score (Profile Completeness)
    if (onboarding) {
      ls += 5;
      const fields = [
        onboarding.full_name, onboarding.company_email, onboarding.callable_phone,
        onboarding.date_of_birth, onboarding.visatypes, onboarding.full_address,
        onboarding.resume_path, onboarding.linkedin_url
      ];
      const filledCount = fields.filter(f => !!f).length;
      qs = Math.round((filledCount / fields.length) * 10);
    }

    return {
      leadScore: ls,
      engagementScore: es,
      qualityScore: qs
    };
  }, [zoomCalls, saleHistory, feedbackList, onboarding]);

  useEffect(() => {
    if (isEditOnboarding && onboarding) {
      setOnboardingForm({ ...onboarding });
      setJobRoleCSV((onboarding.job_role_preferences ?? []).join(", "));
      setLocCSV((onboarding.location_preferences ?? []).join(", "));
    }
  }, [isEditOnboarding, onboarding]);

  const latestSale = saleHistory.length ? saleHistory[saleHistory.length - 1] : null;
  const syncZoomCalls = async (phone: string, isManual = false) => {
    if (!phone) {
      if (isManual) alert("Lead phone not available");
      return;
    }
    const cleanPh = phone.replace(/[^\d]/g, "");
    if (cleanPh.length < 7) {
      if (isManual) alert("Valid phone number required for Zoom sync (min 7 digits)");
      return;
    }
    setZoomLoading(true);
    try {
      const url = `/api/zoom-call-logs?phone=${encodeURIComponent(phone)}`;
      console.log("[Zoom Sync] Fetching:", url);

      const res = await fetch(url);

      // Handle non-JSON responses gracefully
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (_e) {
        console.error("[Zoom Sync] Non-JSON response:", res.status, text.substring(0, 200));
        if (isManual) alert("Zoom API returned error (" + res.status + "): " + text.substring(0, 200));
        return;
      }

      if (data.success) {
        const calls = data.calls || [];
        console.log(`[Zoom Sync] ✅ Got ${calls.length} matched calls`);

        if (data.debug) {
          console.log(`[Zoom Sync] Debug info:`, data.debug);
          console.log(`  → Total Zoom logs scanned: ${data.debug.total_zoom_logs}`);
          console.log(`  → Total recordings found: ${data.debug.total_recordings}`);
          console.log(`  → Phone searched: ${data.debug.phone_searched}`);
          console.log(`  → Last 10 digits: ${data.debug.last10_digits}`);
        }

        // Log each call's duration and recording for debugging
        calls.forEach((c: any, i: number) => {
          console.log(`[Zoom Sync] Call ${i}: duration=${c.duration}s, recording=${c.recording_url || 'NONE'}, time=${c.start_time}`);
        });

        setZoomCalls(calls);

        if (isManual) {
          if (calls.length > 0) {
            alert(`✅ Synced ${calls.length} Zoom call(s).\n\nTotal Zoom logs: ${data.debug?.total_zoom_logs || '?'}\nRecordings: ${data.debug?.total_recordings || '?'}`);
          } else {
            alert(`⚠️ No matching Zoom calls found for this number.\n\nTotal Zoom logs scanned: ${data.debug?.total_zoom_logs || '?'}\nLast 10 digits searched: ${data.debug?.last10_digits || '?'}\n\nCheck the browser console (F12) for details.`);
          }
        }
      } else {
        console.error("[Zoom Sync] ❌ API error:", data.error);
        if (isManual) alert(`Zoom sync failed: ${data.error}`);
      }
    } catch (err) {
      console.error("[Zoom Sync] ❌ Fetch failed:", err);
      if (isManual) alert("Zoom fetch failed — check console for details");
    } finally {
      setZoomLoading(false);
    }
  };

  useEffect(() => {
    if (isEditAddons && latestSale) setSaleForm({ ...latestSale });
  }, [isEditAddons, latestSale]);

  const handleOB = <K extends keyof ClientOnboardingDetails>(key: K, val: ClientOnboardingDetails[K]) =>
    setOnboardingForm((p) => (p ? { ...p, [key]: val } : p));

  const allowedRoles = [
    "Marketing",
    "Sales",
    "Super Admin",
    "Finance",
    "Accounts",
    "Resume Head",
    "Technical Head",
    "Sales Associate",
    "Admin"
  ];

  const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
  const ALLOWED_EDIT = new Set(allowedRoles.map(norm));
  const canEdit = ALLOWED_EDIT.has(norm(user?.role));



  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'prospect': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'dnp': return 'bg-yellow-100 text-yellow-700 border-yellow-100';
      case 'out of tg': return 'bg-red-50 text-red-700 border-red-100';
      case 'not interested': return 'bg-red-100 text-red-700 border-red-200';
      case 'conversation done': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'target': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'sale done': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const rawRole = (user?.role || "").toString().toLowerCase().trim();
  const roleKey = (() => {
    const r = rawRole.replace(/\s+/g, " ");
    if (r.includes("super")) return "admin"; // "Super Admin" -> admin
    if (r === "accounts" || r.includes("account")) return "account-management";
    if (r.includes("technical") && r.includes("associate")) return "technical-associate";
    if (r.includes("technical")) return "technical";
    if (r.includes("resume")) return "resume";
    if (r.includes("marketing")) return "marketing";
    if (r.includes("sales")) return "sales";
    if (r.includes("finance")) return "finance";
    if (r.includes("admin")) return "admin";
    return r;
  })();

  const ADDON_VIEW_ROLES = new Set([
    "admin",
    "marketing",
    "sales",
    "account-management",
    "finance",
    "technical",
    "technical-associate",
    "resume",
  ]);

  const canViewAddonDetails = ADDON_VIEW_ROLES.has(roleKey);
  // const canEditAddons = canViewAddonDetails;

  const canEditAddons = canEdit;

  const latestSaleHasPayment =
    !!latestSale &&
    (["resume_sale_value", "linkedin_sale_value", "portfolio_sale_value", "github_sale_value", "custom_sale_value", "badge_value"] as const)
      .some((k) => Number(latestSale?.[k]) > 0);

  const paidLabel = latestSaleHasPayment ? "Paid" : "Unpaid";

  const fetchAll = useCallback(async () => {
    if (!business_id) return;
    setLoading(true);
    // 1. Fetch Lead record first to get consistent business_id
    const decodedId = decodeURIComponent(business_id as string).trim();
    const { data: leadRow, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("business_id", decodedId)
      .single();

    if (leadErr) {
      console.error("Error fetching lead:", leadErr.message);
      setLead(null);
      setLoading(false);
      return;
    }

    setLead(leadRow as Lead);
    const targetBusinessId = leadRow.business_id;

    // 📞 Auto-sync Zoom calls based on lead phone
    if (leadRow.phone) {
      syncZoomCalls(leadRow.phone);
    }

    // 🧾 Sales history
    const { data: allSales, error: salesErr } = await supabase
      .from("sales_closure")
      .select("*")
      .eq("lead_id", targetBusinessId)
      .order("closed_at", { ascending: false });

    if (salesErr) {
      console.error("Error fetching sales_closure:", salesErr.message);
      setSaleHistory([]);
    } else {
      setSaleHistory(allSales ?? []);
    }

    // 🧮 Compute merged Add-ons summary
    const mergedAddons = getLatestAddons(allSales ?? []);
    setLatestAddons(mergedAddons);

    // Client feedback
    const { data: fbRows, error: fbErr } = await supabase
      .from("client_feedback")
      .select("*")
      .eq("lead_id", targetBusinessId)
      .order("id", { ascending: false });
    if (fbErr) console.error("Error fetching client feedback:", fbErr.message);
    setFeedbackList(fbRows ?? []);

    // Resume Progress
    const { data: rpRow, error: rpErr } = await supabase
      .from("resume_progress")
      .select("lead_id,status,pdf_path,pdf_uploaded_at,updated_at,assigned_to_email,assigned_to_name")
      .eq("lead_id", targetBusinessId)
      .maybeSingle();
    if (rpErr) console.error("Error fetching resume_progress:", rpErr.message);
    setResumeProg(rpRow ?? null);

    // Portfolio Progress
    const { data: ppRow, error: ppErr } = await supabase
      .from("portfolio_progress")
      .select("lead_id,status,link,assigned_email,assigned_name,updated_at")
      .eq("lead_id", targetBusinessId)
      .maybeSingle();
    if (ppErr) console.error("Error fetching portfolio_progress:", ppErr.message);
    setPortfolioProg(ppRow ?? null);

    // 📝 Fetch CRM Call History (manual notes and matched zoom calls)
    const { data: crmHistory, error: crmErr } = await supabase
      .from("call_history")
      .select("*")
      .eq("lead_id", targetBusinessId)
      .order("followup_date", { ascending: false });
    if (crmErr) console.error("Error fetching crm history:", crmErr.message);
    setCrmCalls(crmHistory ?? []);

    // 🔁 Fetch the latest onboarding row
    const { data: coRow, error: coErr } = await supabase
      .from("client_onborading_details")
      .select(`
        id,  
        full_name,
        personal_email,
        callable_phone,
        company_email,
        job_role_preferences,
        salary_range,
        location_preferences,
        work_auth_details,
        resume_path,
        cover_letter_path,
        created_at,
        needs_sponsorship,
        full_address,
        linkedin_url,
        github_url,
        portfolio_url,
        primary_phone,
        addons,
        date_of_birth,
        lead_id,
        visatypes
      `)
      .eq("lead_id", targetBusinessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (coErr) {
      console.error("Error fetching client_onborading_details:", coErr.message);
      setOnboarding(null);
    } else {
      setOnboarding(coRow as ClientOnboardingDetails);
    }

    // 📧 Fetch Email History from Graph Sent Table
    const sentRes = await fetch(`/api/email/sent?email=${user?.email}`);
    const sentData = await sentRes.json();
    setEmails(sentData.emails || []);

    setLoading(false);
  }, [business_id, user?.email]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-gray-600" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        No lead found with ID: {business_id}
      </div>
    );
  }

  const formatMoney = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString()}` : "—";
  };

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");
  const listFmt = (arr?: string[] | null) => (arr && arr.length ? arr.join(", ") : "—");

  // NEW helpers for the new fields
  const yn = (b?: boolean | null) => (b === true ? "Yes" : b === false ? "No" : "—");
  const fmtDateOnly = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

  // ✅ Save onboarding edits
  const saveOnboarding = async () => {
    if (!canEdit) { alert("You don’t have permission to edit."); return; }
    if (!onboardingForm?.id) return;

    setSavingOnboarding(true);
    const payload: any = {
      ...onboardingForm,
      job_role_preferences: jobRoleCSV
        ? jobRoleCSV.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      location_preferences: locCSV
        ? locCSV.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
    };

    // (optional) keep Yes/No input supported
    if (typeof (onboardingForm as any).needs_sponsorship === "string") {
      payload.needs_sponsorship = fromYesNo((onboardingForm as any).needs_sponsorship);
    }

    const { error } = await supabase.from("client_onborading_details").update(payload).eq("id", onboardingForm.id);

    setSavingOnboarding(false);
    if (error) {
      alert(`Failed to update onboarding: ${error.message}`);
      return;
    }

    setOnboarding(payload as ClientOnboardingDetails);
    setIsEditOnboarding(false);
  };

  // ✅ Save add-ons (latest sale row)
  const saveAddons = async () => {
    if (!canEdit) { alert("You don’t have permission to edit."); return; }
    if (!saleForm?.id) return;

    setSavingSale(true);
    const payload = {
      resume_sale_value: Number(saleForm.resume_sale_value) || 0,
      linkedin_sale_value: Number(saleForm.linkedin_sale_value) || 0,
      portfolio_sale_value: Number(saleForm.portfolio_sale_value) || 0,
      github_sale_value: Number(saleForm.github_sale_value) || 0,
      custom_label: saleForm.custom_label ?? null,
      custom_sale_value: saleForm.custom_sale_value != null ? Number(saleForm.custom_sale_value) : null,
      no_of_job_applications: saleForm.no_of_job_applications ?? null,
      commitments: saleForm.commitments ?? null,
      badge_value:
        saleForm.badge_value === "" || saleForm.badge_value == null ? null : Number(saleForm.badge_value),
    };

    const { error } = await supabase.from("sales_closure").update(payload).eq("id", saleForm.id);

    setSavingSale(false);
    if (error) {
      alert(`Failed to update add-ons: ${error.message}`);
      return;
    }

    // update local state so UI refreshes without refetch
    setSaleHistory((rows) => rows.map((r) => (r.id === saleForm.id ? { ...r, ...payload } : r)));
    setIsEditAddons(false);
  };

  const downloadFromStorage = async (path: string, downloadName: string) => {
    try {
      const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 60 * 10); // 10 minutes
      if (error || !data?.signedUrl) throw error || new Error("No signed URL");

      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Could not download file");
    }
  };

  // 🆕 Convenience wrappers
  const downloadLatestResume = async () => {
    if (!onboarding?.resume_path || !lead?.business_id) {
      alert("No resume PDF found.");
      return;
    }
    await downloadFromStorage(onboarding.resume_path, `resume-${lead.business_id}-${lead.name}.pdf`);
  };
  const downloadLatestCover = async () => {
    if (!onboarding?.cover_letter_path || !lead?.business_id) {
      alert("No cover letter PDF found.");
      return;
    }
    await downloadFromStorage(onboarding.cover_letter_path, `cover-${lead.business_id}-${lead.name}.pdf`);
  };

  const leadAgeDays = lead.created_at
    ? Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen -m-6 bg-[#f4f7f9]">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-medium text-gray-700">Lead Details</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="bg-[#444] text-white hover:bg-black border-none h-7 px-4 rounded-sm text-xs flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          </div>
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 h-8 w-8" onClick={() => syncZoomCalls(lead.phone || "", true)}>
              <RefreshCw className={`h-4 w-4 ${zoomLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 h-8 w-8">
              <Star className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 h-8 w-8">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden p-4 gap-4">
          {/* Left Panel - Profile & Properties */}
          <div className="w-[340px] flex flex-col gap-4 overflow-y-auto pr-1 flex-shrink-0">
            {/* Identity Card */}
            <div className="bg-[#0b283d] rounded-sm overflow-hidden flex flex-col shadow-lg border border-[#0b283d]">
              <div className="p-6 flex flex-col">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 items-center min-w-0">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    <h2 className="text-xl font-semibold text-white truncate" title={lead.name}>{lead.name}</h2>
                  </div>
                  <Share2 className="w-4 h-4 text-white/70 cursor-pointer hover:text-white flex-shrink-0" />
                </div>

                <div className="mt-6 space-y-3.5 text-white/80">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <span className="text-sm truncate" title={lead.email}>{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <span className="text-sm">{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <span className="text-sm truncate">{lead.city || "Not Specified"}</span>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="bg-[#071926] grid grid-cols-4 border-t border-white/5 uppercase">
                <div className="py-3 flex flex-col items-center justify-center border-r border-white/5">
                  <span className="text-lg font-bold text-white tracking-tight">{leadScore}</span>
                  <span className="text-[9px] text-white/40 font-bold leading-tight text-center">Lead<br />Score</span>
                </div>
                <div className="py-3 flex flex-col items-center justify-center border-r border-white/5">
                  <span className="text-lg font-bold text-[#e16d2e] tracking-tight">{engagementScore}</span>
                  <span className="text-[9px] text-white/40 font-bold leading-tight text-center">Engaged</span>
                </div>
                <div className="py-3 flex flex-col items-center justify-center border-r border-white/5">
                  <span className="text-lg font-bold text-white tracking-tight">{qualityScore}/10</span>
                  <span className="text-[9px] text-white/40 font-bold leading-tight text-center">Quality</span>
                </div>
                <div className="py-3 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-white tracking-tight">{leadAgeDays}d</span>
                  <span className="text-[9px] text-white/40 font-bold leading-tight text-center">Age</span>
                </div>
              </div>
            </div>

            {/* Properties Card */}
            <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden flex flex-col">
              <div className="bg-white border-b border-gray-100 p-3 px-4 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Lead Properties</h3>
                <Select
                  value={lead.current_stage || "Prospect"}
                  onValueChange={(val) => updateLeadStage(val)}
                >
                  <SelectTrigger className={`w-36 h-7 text-[10px] font-bold uppercase border shadow-sm rounded-full ${getStatusColor(lead.current_stage)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {STAGES.filter(s => {
                      if (lead.current_stage !== "Prospect" && s === "Prospect") return false;
                      return true;
                    }).map(s => (
                      <SelectItem key={s} value={s} className="p-1">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(s)}`}>
                          {s}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 py-2 space-y-0 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400">Owner</span>
                  <span className="text-gray-700 font-medium">{lead.assigned_to || "Rahul"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400">Lead Source</span>
                  <span className="text-gray-700 font-medium">{lead.source || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400">Lead Age</span>
                  <span className="text-gray-700 font-medium">{leadAgeDays} Days</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400">Created At</span>
                  <span className="text-gray-700 font-medium">{new Date(lead.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 last:border-0">
                  <span className="text-gray-400">Business ID</span>
                  <span className="text-gray-700 font-medium">{lead.business_id}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Right Panel - Content Tabs */}
          <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
            <Tabs defaultValue="details" className="flex flex-col h-full">
              <div className="bg-white border-b border-gray-200 px-6 flex items-center justify-between flex-shrink-0">
                <TabsList className="bg-transparent h-12 gap-8 p-0">
                  <TabsTrigger value="activity" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#e16d2e] data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-[#e16d2e] font-medium px-0 text-sm">Activity History</TabsTrigger>
                  <TabsTrigger value="emails" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#e16d2e] data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-[#e16d2e] font-medium px-0 text-sm">Emails</TabsTrigger>
                  <TabsTrigger value="details" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#e16d2e] data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-[#e16d2e] font-medium px-0 text-sm">Lead Details</TabsTrigger>
                  <TabsTrigger value="sales" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#e16d2e] data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-[#e16d2e] font-medium px-0 text-sm">Sales History</TabsTrigger>
                  <TabsTrigger value="feedback" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#e16d2e] data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-[#e16d2e] font-medium px-0 text-sm">Feedback</TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 border-gray-300 text-gray-700 font-medium px-4 rounded-sm">
                        Lead Actions <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="cursor-pointer" onClick={downloadLatestResume} disabled={!onboarding?.resume_path}>Download Resume</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={downloadLatestCover} disabled={!onboarding?.cover_letter_path}>Download Cover Letter</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {["sales", "sales associate", "admin"].includes(norm(user?.role)) && (
                    <Button
                      size="sm"
                      className="h-9 bg-[#4a7df4] hover:bg-blue-600 text-white font-medium px-6 rounded-sm"
                      onClick={() => setIsEmailModalOpen(true)}
                    >
                      Send Email
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="activity" className="m-0 h-full p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                      <h4 className="text-sm font-semibold text-gray-700">Call Logs & Activity History</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => lead?.phone && syncZoomCalls(lead.phone, true)}
                        disabled={zoomLoading}
                      >
                        {zoomLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        SYNC ZOOM LOGS
                      </Button>
                    </div>
                    {(() => {
                      const merged: any[] = [];
                      const addedKeys = new Set<string>();
                      const seenZoomIds = new Set<string>();

                      // Pass 1: Add CRM calls and track matched Zoom IDs
                      crmCalls.forEach(c => {
                        const zoomIdMatch = c.notes?.match(/\[Zoom ID: ([A-Za-z0-9_-]+)\]/);
                        const zoomId = zoomIdMatch ? zoomIdMatch[1] : null;

                        let zMatch = zoomCalls.find(z => z.call_id === zoomId);
                        if (!zMatch && !zoomId) {
                          const callTimeStr = c.call_started_at || c.followup_date;
                          if (callTimeStr) {
                            const cTime = new Date(callTimeStr).getTime();
                            zMatch = zoomCalls.find(z => {
                              const zTime = new Date(z.start_time).getTime();
                              return Math.abs(cTime - zTime) < 10 * 60 * 1000;
                            });
                          }
                        }

                        if (zMatch) seenZoomIds.add(zMatch.call_id);

                        const key = `crm-${c.id}`;
                        if (!addedKeys.has(key)) {
                          addedKeys.add(key);
                          merged.push({
                            id: key,
                            dbId: c.id,
                            timestamp: c.call_started_at || c.followup_date,
                            direction: c.notes?.toLowerCase().includes("inbound") ? "inbound" : "outbound",
                            duration: c.call_duration_seconds || zMatch?.duration || 0,
                            recording: c.recording_url || zMatch?.recording_url,
                            stageOrNote: c.notes || "Call logged",
                            currentStage: c.current_stage,
                            isCrm: true
                          });
                        }
                      });

                      // Pass 2: Add unmatched Zoom calls
                      zoomCalls.forEach(z => {
                        if (seenZoomIds.has(z.call_id)) return;

                        const key = `zoom-${z.call_id}`;
                        if (!addedKeys.has(key)) {
                          addedKeys.add(key);

                          const resultLabel = z.call_result === "answered" || z.call_result === "connected"
                            ? "Connected" : z.call_result === "no_answer" ? "No Answer"
                              : z.call_result === "hang_up" ? "Hung Up" : z.call_result || "";
                          const typeLabel = z.connect_type === "internal" ? "Internal" : "External";
                          const noteText = [
                            z.direction === "inbound" ? "📞 Inbound" : "📤 Outbound",
                            typeLabel,
                            z.other_party ? "with " + z.other_party : "",
                            resultLabel ? "• " + resultLabel : "",
                          ].filter(Boolean).join(" ");

                          merged.push({
                            id: key,
                            timestamp: z.start_time,
                            direction: z.direction,
                            duration: z.duration,
                            recording: z.recording_url,
                            stageOrNote: noteText,
                            connectType: z.connect_type,
                            callResult: z.call_result,
                            otherParty: z.other_party,
                            isCrm: false
                          });
                        }
                      });

                      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                      if (merged.length === 0) return <div className="p-12 text-center text-gray-400 italic text-sm">No activity recorded for this lead.</div>;

                      return (
                        <div className="divide-y divide-gray-100">
                          {merged.map((item) => {
                            const dur = item.duration || 0;
                            return (
                              <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-colors flex gap-4">
                                <div className="w-40 flex-shrink-0">
                                  <div className="text-xs font-medium text-gray-700">{item.timestamp ? new Date(item.timestamp).toLocaleString("en-IN", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}</div>
                                  <div className="text-[10px] text-gray-400 uppercase mt-0.5 tracking-wider">{item.direction} {dur > 0 ? `• ${Math.floor(dur / 60)}m ${dur % 60}s` : ""}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-1.5">
                                        <div className="text-sm font-bold text-gray-900">
                                          {item.isCrm ? (
                                            <span className="text-blue-600">Sales Record</span>
                                          ) : (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-orange-600">Zoom Call</span>
                                              {item.connectType && (
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${item.connectType === "internal" ? "bg-violet-50 text-violet-600 border border-violet-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
                                                  {item.connectType}
                                                </span>
                                              )}
                                              {item.callResult && (
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${item.callResult === "answered" || item.callResult === "connected"
                                                  ? "bg-green-50 text-green-600 border border-green-200"
                                                  : item.callResult === "no_answer"
                                                    ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
                                                    : "bg-red-50 text-red-500 border border-red-200"
                                                  }`}>
                                                  {item.callResult === "answered" || item.callResult === "connected" ? "Connected" : item.callResult === "no_answer" ? "No Answer" : item.callResult === "hang_up" ? "Hung Up" : item.callResult}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        {dur > 0 && (
                                          <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-600 border border-gray-200 uppercase">
                                            <Clock className="w-3 h-3" />
                                            {Math.floor(dur / 60)}m {dur % 60}s
                                          </div>
                                        )}
                                      </div>
                                      {item.recording && (
                                        <div className="mt-2 flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-3 py-2 border border-blue-100">
                                          <Phone className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                          <span className="text-[10px] font-bold text-blue-600 uppercase flex-shrink-0">Recording</span>
                                          <audio
                                            controls
                                            preload="none"
                                            className="h-8 flex-1 min-w-0"
                                            style={{ maxWidth: "100%" }}
                                          >
                                            <source src={item.recording} type="audio/mpeg" />
                                            Your browser does not support audio playback.
                                          </audio>
                                        </div>
                                      )}
                                      <div className="text-sm text-gray-700 leading-relaxed italic pr-4 mt-1">
                                        &quot;{item.stageOrNote}&quot;
                                      </div>
                                    </div>

                                    {item.isCrm && (
                                      <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="text-[9px] uppercase font-black text-gray-400 tracking-tighter">Update status</div>
                                        <Select
                                          value={item.currentStage || "Prospect"}
                                          onValueChange={(val) => updateCallStage(item.dbId, val)}
                                        >
                                          <SelectTrigger className={`w-36 h-8 text-[10px] font-bold uppercase border shadow-sm rounded-full ${getStatusColor(item.currentStage)}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="z-50">
                                            {STAGES.filter(s => {
                                              if (item.currentStage !== "Prospect" && s === "Prospect") return false;
                                              return true;
                                            }).map(s => (
                                              <SelectItem key={s} value={s} className="p-1">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(s)}`}>
                                                  {s}
                                                </span>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>

                <TabsContent value="emails" className="m-0 h-full p-0">
                  <div className="flex flex-col h-full bg-gray-50/20">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                      <h4 className="text-sm font-bold text-gray-800">Email History</h4>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">{emails.length} Emails</Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {emails.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-2">
                          <Mail className="w-8 h-8 opacity-20" />
                          <p className="text-xs">No emails sent to this client yet.</p>
                        </div>
                      ) : (
                        <Accordion type="multiple" className="space-y-4">
                          {emails.map((mail: any, idx) => (
                            <AccordionItem key={mail.id || idx} value={mail.id || `item-${idx}`} className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden border-b-0">
                              <AccordionTrigger className="hover:no-underline px-5 py-4 text-left">
                                <div className="flex justify-between items-start w-full pr-4">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 p-2 rounded-full">
                                      <Mail className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-bold text-gray-900 line-clamp-1">{mail.subject}</h5>
                                      <p className="text-[11px] text-gray-500">Sent on {new Date(mail.created_at).toLocaleString()}</p>
                                    </div>
                                  </div>
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none rounded-full text-[10px] px-2 h-5 lowercase shrink-0">{mail.status || 'sent'}</Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-5 pb-5">
                                <div className="flex justify-between items-start mb-4 bg-gray-50/50 p-3 rounded border border-gray-100/50">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">From</span>
                                    <span className="text-gray-800 font-semibold text-xs">{formatAssociateName(mail.salesperson_email)}</span>
                                    <span className="text-[10px] text-gray-400">{mail.salesperson_email}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 text-right">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">To Client</span>
                                    <span className="text-gray-800 font-semibold text-xs">{mail.client_email}</span>
                                    <Badge variant="outline" className={`mt-1 self-end text-[9px] h-4 ${mail.status === 'sent' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>{mail.status}</Badge>
                                  </div>
                                </div>
                                <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed bg-white p-4 rounded-md border border-gray-100">
                                  {mail.body}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="m-0 h-full p-8">
                  <div className="max-w-4xl">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-gray-900 tracking-tight">Onboarding Details</h3>
                      {canEdit && (
                        <Button variant="outline" size="sm" className="h-8 border-gray-300 text-gray-700 font-medium px-5 rounded-sm" onClick={() => setIsEditOnboarding(true)}>
                          Edit
                        </Button>
                      )}
                    </div>

                    {!onboarding ? (
                      <div className="p-12 text-center bg-gray-50 border border-dashed rounded-md text-gray-400 text-sm">
                        No onboarding information found for this lead.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-20 gap-y-6">
                        {/* Column 1 */}
                        <div className="space-y-6">
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Full Name</span>
                            <span className="text-gray-800 text-sm font-medium">{onboarding.full_name || "—"}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Personal Email</span>
                            <span className="text-gray-800 text-sm font-medium">{onboarding.personal_email || "—"}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Company Email</span>
                            <span className="text-gray-800 text-sm font-medium">{onboarding.company_email || "—"}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Callable Phone</span>
                            <span className="text-gray-800 text-sm font-medium">{onboarding.callable_phone || "—"}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">primary Phone</span>
                            <span className="text-gray-800 text-sm font-medium">{onboarding.primary_phone || "—"}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Last Submitted</span>
                            <span className="text-gray-800 text-sm font-medium">{fmt(onboarding.created_at)}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline border-t border-gray-50 pt-4">
                            <span className="text-gray-400 text-sm">LinkedIn URL</span>
                            {onboarding.linkedin_url ? (
                              <a href={onboarding.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium truncate" title={onboarding.linkedin_url}>
                                {onboarding.linkedin_url}
                              </a>
                            ) : <span className="text-gray-400 text-sm italic">Not Provided</span>}
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Github link</span>
                            {onboarding.github_url ? (
                              <a href={onboarding.github_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium truncate" title={onboarding.github_url}>
                                {onboarding.github_url}
                              </a>
                            ) : <span className="text-gray-400 text-sm italic">Not Provided</span>}
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Portfolio link</span>
                            {onboarding.portfolio_url ? (
                              <a href={onboarding.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium truncate" title={onboarding.portfolio_url}>
                                {onboarding.portfolio_url}
                              </a>
                            ) : <span className="text-gray-400 text-sm italic">Not Provided</span>}
                          </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-6">
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Visa Type</span>
                            <span className="text-gray-800 text-sm font-medium uppercase font-bold">{onboarding.visatypes || "—"}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Sponsorship?</span>
                            <span className="text-gray-800 text-sm font-medium">{yn(onboarding.needs_sponsorship)}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Date of Birth</span>
                            <span className="text-gray-800 text-sm font-medium">{onboarding.date_of_birth ? new Date(onboarding.date_of_birth).toLocaleDateString('en-GB') : "—"}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Address</span>
                            <span className="text-gray-800 text-sm font-medium leading-relaxed">{onboarding.full_address || "—"}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline border-t border-gray-50 pt-4">
                            <span className="text-gray-400 text-sm">Job Role Preferences</span>
                            <span className="text-gray-800 text-sm font-medium">{listFmt(onboarding.job_role_preferences)}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Location Preferences</span>
                            <span className="text-gray-800 text-sm font-medium">{listFmt(onboarding.location_preferences)}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Salary Range</span>
                            <span className="text-gray-800 text-sm font-medium">{onboarding.salary_range || "—"}</span>
                          </div>
                          <div className="grid grid-cols-[160px_1fr] gap-4 items-baseline">
                            <span className="text-gray-400 text-sm">Work Auth Details</span>
                            <span className="text-gray-800 text-sm font-medium leading-relaxed">{onboarding.work_auth_details || "—"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-16 pt-8 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Add-ons & Requirements Summary</h3>
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-gray-300 text-gray-700 font-medium px-5 rounded-sm"
                            onClick={() => window.open(`/client_sale_history_update/${business_id}`, "_blank")}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                      {saleHistory.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic text-sm">No sales or add-ons recorded.</div>
                      ) : (
                        <div className="grid grid-cols-3 gap-6">
                          <div className="bg-white border border-gray-100 rounded-md p-6 py-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-2">Applications</span>
                            <span className="text-xl font-bold text-gray-800">{formatMoney(latestAddons?.application_sale_value)}</span>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-md p-6 py-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-2">Resume</span>
                            <span className="text-xl font-bold text-gray-800">{formatMoney(latestAddons?.resume_sale_value)}</span>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-md p-6 py-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-2">LinkedIn</span>
                            <span className="text-xl font-bold text-gray-800">{formatMoney(latestAddons?.linkedin_sale_value)}</span>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-md p-6 py-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-2">Github</span>
                            <span className="text-xl font-bold text-gray-800">{formatMoney(latestAddons?.github_sale_value)}</span>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-md p-6 py-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-2">Commitments</span>
                            <span className="text-xl font-bold text-gray-800">{latestAddons?.commitments || "—"}</span>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-md p-6 py-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-2">Badge</span>
                            <span className="text-xl font-bold text-gray-800">{latestAddons?.badge_value || "—"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sales" className="m-0 h-full">
                  <div className="p-0">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/30 font-semibold text-gray-700 text-sm">
                      Payment & Subscription History
                    </div>
                    {saleHistory.length === 0 ? (
                      <div className="p-12 text-center text-gray-400 italic text-sm">No sales records found for this client.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#f8f9fa] border-b border-gray-100">
                            <tr>
                              <th className="p-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-wider">Plan Value</th>
                              <th className="p-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-wider">Payment Mode</th>
                              <th className="p-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-wider">Cycle</th>
                              <th className="p-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-wider">Account Manager</th>
                              <th className="p-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-wider">Status</th>
                              <th className="p-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-wider">Renewal Due</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {saleHistory.map((sale, idx) => {
                              const onboardedDate = sale.onboarded_date ? new Date(sale.onboarded_date) : null;
                              const subscriptionDays = Number(sale.subscription_cycle) || 0;
                              let nextRenewalDate = "—";
                              if (onboardedDate && !isNaN(subscriptionDays)) {
                                const renewalDate = new Date(onboardedDate);
                                renewalDate.setDate(renewalDate.getDate() + subscriptionDays);
                                nextRenewalDate = renewalDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                              }
                              return (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="p-4 font-bold text-gray-800 tracking-tight">${sale.sale_value}</td>
                                  <td className="p-4 text-gray-600 font-medium">{sale.payment_mode}</td>
                                  <td className="p-4 text-gray-600">{sale.subscription_cycle} days</td>
                                  <td className="p-4 text-[#4a7df4] font-semibold">{sale.assigned_to || "Rahul"}</td>
                                  <td className="p-4"><Badge variant="outline" className="font-bold text-[10px] uppercase rounded-full px-2 border-gray-200 text-gray-500 bg-gray-50/50">{sale.finance_status}</Badge></td>
                                  <td className="p-4 text-gray-700 font-medium">{nextRenewalDate}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="feedback" className="m-0 h-full">
                  <div className="p-0 text-gray-800">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/30 font-semibold text-gray-700 text-sm">
                      Client Feedback Repository
                    </div>
                    {feedbackList.length === 0 ? (
                      <div className="p-12 text-center text-gray-400 italic text-sm">No feedback received yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#f8f9fa] border-b border-gray-100">
                            <tr>
                              <th className="p-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-wider">Date</th>
                              <th className="p-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-wider">Emotion</th>
                              <th className="p-4 text-center font-bold text-gray-500 uppercase text-[10px] tracking-wider">Rating</th>
                              <th className="p-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-wider">Notes / Success Story</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {feedbackList.map((fb, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 text-gray-500 text-xs">{new Date(fb.created_at || fb.id).toLocaleDateString()}</td>
                                <td className="p-4">
                                  {fb.client_emotion === "happy" ? <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-green-100 italic">😊 Happy</span> : <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-red-100 italic">😠 Unhappy</span>}
                                </td>
                                <td className="p-4 text-center font-black text-[#e16d2e] text-xl">{fb.rating || "—"}</td>
                                <td className="p-4 text-gray-600 leading-relaxed text-sm italic max-w-sm truncate" title={fb.notes}>"{fb.notes || "No additional comments provided."}"</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Global Save/Edit Onboarding Dialog */}
        {isEditOnboarding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Edit Onboarding Details</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsEditOnboarding(false)}><ExternalLink className="w-5 h-5 rotate-45" /></Button>
              </div>

              {onboardingForm && (
                <div className="p-8 grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input value={onboardingForm.full_name || ""} onChange={(e) => handleOB("full_name", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Personal Email</Label>
                      <Input value={onboardingForm.personal_email || ""} onChange={(e) => handleOB("personal_email", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Callable Phone</Label>
                      <Input value={onboardingForm.callable_phone || ""} onChange={(e) => handleOB("callable_phone", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>primary Phone</Label>
                      <Input value={onboardingForm.primary_phone || ""} onChange={(e) => handleOB("primary_phone", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Company Email</Label>
                      <Input value={onboardingForm.company_email || ""} onChange={(e) => handleOB("company_email", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>LinkedIn URL</Label>
                      <Input value={onboardingForm.linkedin_url || ""} onChange={(e) => handleOB("linkedin_url", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Github link</Label>
                      <Input value={onboardingForm.github_url || ""} onChange={(e) => handleOB("github_url", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Portfolio link</Label>
                      <Input value={onboardingForm.portfolio_url || ""} onChange={(e) => handleOB("portfolio_url", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Visa Type</Label>
                      <Input value={onboardingForm.visatypes || ""} onChange={(e) => handleOB("visatypes", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sponsorship?</Label>
                      <Select value={toYesNo(onboardingForm.needs_sponsorship)} onValueChange={(val) => handleOB("needs_sponsorship", fromYesNo(val))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date of Birth</Label>
                      <Input type="date" value={toDateInput(onboardingForm.date_of_birth)} onChange={(e) => handleOB("date_of_birth", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Salary Range</Label>
                      <Input value={onboardingForm.salary_range || ""} onChange={(e) => handleOB("salary_range", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Job Role Preferences (Comma separated)</Label>
                      <Input value={jobRoleCSV} onChange={(e) => setJobRoleCSV(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Location Preferences (Comma separated)</Label>
                      <Input value={locCSV} onChange={(e) => setLocCSV(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Work Auth Details</Label>
                      <Textarea value={onboardingForm.work_auth_details || ""} onChange={(e) => handleOB("work_auth_details", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Full Address</Label>
                      <Textarea value={onboardingForm.full_address || ""} onChange={(e) => handleOB("full_address", e.target.value)} rows={2} />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                <Button variant="outline" onClick={() => setIsEditOnboarding(false)}>Cancel</Button>
                <Button onClick={saveOnboarding} disabled={savingOnboarding} className="bg-blue-600 hover:bg-blue-700 min-w-[140px]">
                  {savingOnboarding ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Add-ons Dialog */}
        {isEditAddons && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Edit Add-ons & Requirements</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsEditAddons(false)}><ExternalLink className="w-5 h-5 rotate-45" /></Button>
              </div>

              {saleForm && (
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label>Application Sale Value ($)</Label>
                      <Input type="number" value={saleForm.application_sale_value || 0} onChange={(e) => setSaleForm({ ...saleForm, application_sale_value: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Resume Sale Value ($)</Label>
                      <Input type="number" value={saleForm.resume_sale_value || 0} onChange={(e) => setSaleForm({ ...saleForm, resume_sale_value: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>LinkedIn Sale Value ($)</Label>
                      <Input type="number" value={saleForm.linkedin_sale_value || 0} onChange={(e) => setSaleForm({ ...saleForm, linkedin_sale_value: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Github Sale Value ($)</Label>
                      <Input type="number" value={saleForm.github_sale_value || 0} onChange={(e) => setSaleForm({ ...saleForm, github_sale_value: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Commitments</Label>
                      <Input value={saleForm.commitments || ""} onChange={(e) => setSaleForm({ ...saleForm, commitments: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Badge Value</Label>
                      <Input type="number" value={saleForm.badge_value || ""} onChange={(e) => setSaleForm({ ...saleForm, badge_value: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Custom Add-on Label</Label>
                    <Input value={saleForm.custom_label || ""} onChange={(e) => setSaleForm({ ...saleForm, custom_label: e.target.value })} placeholder="e.g. Portfolio" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Custom Add-on Value ($)</Label>
                    <Input type="number" value={saleForm.custom_sale_value || 0} onChange={(e) => setSaleForm({ ...saleForm, custom_sale_value: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                <Button variant="outline" onClick={() => setIsEditAddons(false)}>Cancel</Button>
                <Button onClick={saveAddons} disabled={savingSale} className="bg-blue-600 hover:bg-blue-700 min-w-[140px]">
                  {savingSale ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} Save Add-ons
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Send Email Modal */}
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-100 scale-in-center">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Compose Email to Client</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsEmailModalOpen(false)} className="hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                  <ExternalLink className="w-5 h-5 rotate-45" />
                </Button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-6 p-4 bg-blue-50/30 rounded-lg border border-blue-50">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">From (Sales Associate)</Label>
                    <div className="text-sm font-semibold text-gray-800">{user?.name || "Sales Associate"}</div>
                    <div className="text-[11px] text-gray-500">{user?.email}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">To (Client)</Label>
                    <div className="text-sm font-semibold text-gray-800">{lead?.name}</div>
                    <div className="text-[11px] text-gray-500">{lead?.email}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-700">Select Template</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMAIL_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleTemplateSelect(t.id)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${selectedTemplate === t.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                          }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Subject Line</Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Add an engaging subject..."
                      className="bg-gray-50/50 border-gray-200 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Message Content</Label>
                    <Textarea
                      rows={10}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Type your personal message here..."
                      className="bg-gray-50/50 border-gray-200 focus:bg-white resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                <Button variant="outline" onClick={() => setIsEmailModalOpen(false)} className="rounded-sm px-6 font-semibold">Discard</Button>
                <Button
                  onClick={handleSendMail}
                  disabled={sendingEmail || !emailSubject || !emailBody}
                  className="bg-blue-600 hover:bg-blue-700 min-w-[160px] rounded-sm font-bold shadow-lg shadow-blue-200"
                >
                  {sendingEmail ? (
                    <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send Email Now</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Follow-up Dialog */}
        {followUpDialogOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h2 className="text-lg font-bold text-gray-900">Schedule Follow-up</h2>
                <Button variant="ghost" size="icon" onClick={() => setFollowUpDialogOpen(false)} className="rounded-full">
                  <ExternalLink className="w-5 h-5 rotate-45" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Follow-up Date</Label>
                  <Input
                    type="date"
                    value={followUpData.date}
                    onChange={(e) => setFollowUpData({ ...followUpData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Notes</Label>
                  <Textarea
                    rows={4}
                    placeholder="Add notes..."
                    value={followUpData.notes}
                    onChange={(e) => setFollowUpData({ ...followUpData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                <Button variant="outline" onClick={() => setFollowUpDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleFollowUpSave}
                  disabled={savingFollowUp || !followUpData.date}
                  className="bg-gray-900 text-white hover:bg-black min-w-[120px]"
                >
                  {savingFollowUp ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} Save Follow-up
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}