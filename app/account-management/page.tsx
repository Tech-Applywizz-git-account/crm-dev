// app/account-management/page.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, MessageSquare, Star, Calendar } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Papa from "papaparse";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

/** =========================
 *  Config — using your new columns
 *  ========================= */
const ACCOUNT_EMAIL_COL = "account_assigned_email";
const ACCOUNT_NAME_COL = "account_assigned_name";
const ALL_OWNERS = "__ALL_OWNERS__";

type AccountStage = "DNP" | "Call Again" | "Conversation Done";

interface FollowUp {
  date: string;
  notes: string;
}

interface Feedback {
  isHappy: boolean;
  rating: number;
  notes: string;
  willRenew: boolean;
  date: string; // yyyy-mm-dd
}

interface Client {
  id: string;
  client_name: string;
  email: string;
  phone?: string | null;
  assigned_to: string; // from leads
  account_assigned_name?: string | null; // from sales_closure
  account_assigned_email?: string | null; // from sales_closure
  stage: AccountStage;
  created_at: string;
  follow_ups?: FollowUp[];
  feedback?: Feedback;
}

const accountStages: AccountStage[] = ["DNP", "Call Again", "Conversation Done"];

const getStageColor = (stage: AccountStage) => {
  switch (stage) {
    case "DNP":
      return "bg-yellow-100 text-yellow-800";
    case "Call Again":
      return "bg-blue-100 text-blue-800";
    case "Conversation Done":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
};

function renderStars(rating: number) {
  return (
    <span className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-current text-yellow-400" : "text-gray-300"}`} />
      ))}
    </span>
  );
}

const isAssigned = (name?: string | null) => !!(name && String(name).trim().length > 0);

export default function AccountManagementPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [pageLoading, setPageLoading] = useState(false);

  // Logged-in user meta
  const [me, setMe] = useState<{ email: string; name: string; role: string }>({
    email: "",
    name: "",
    role: "",
  });

  // ---- ROLE NORMALIZATION (robust to "Admin" vs "Super Admin", "Accounts" vs "Account Management")
  const roleNorm = (me.role || "").trim().toLowerCase();
  const isAssociate = roleNorm === "accounts associate";
  const canAssign = ["super admin", "admin", "account management", "accounts", "sales head"].includes(roleNorm);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState<"All dates" | "Today">("All dates");
  const [sortKey, setSortKey] = useState<"client_name" | "created_at" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [feedbackForm, setFeedbackForm] = useState<Feedback>({
    isHappy: false,
    rating: 5,
    notes: "",
    willRenew: false,
    date: new Date().toISOString().split("T")[0],
  });
  const [followUpForm, setFollowUpForm] = useState<FollowUp>({ date: "", notes: "" });

  const [pendingStage, setPendingStage] = useState<AccountStage | null>(null);
  const prevStageRef = useRef<AccountStage | null>(null);
  const changeCommittedRef = useRef<boolean>(false);

  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [clientFeedback, setClientFeedback] = useState<Feedback | null>(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [_csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);

  /** BULK selection + assignment */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [associates, setAssociates] = useState<{ name: string; email: string }[]>([]);
  const [selectedAssociateEmail, setSelectedAssociateEmail] = useState<string>("");

  /** Tabs + owner filter (assigned tab) */
  const [activeTab, setActiveTab] = useState<"unassigned" | "assigned">("unassigned");
  const [ownerFilter, setOwnerFilter] = useState<string>(ALL_OWNERS);

  /** ===== Current user (role/email/name) ===== */
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, user_email, roles")
          .eq("auth_id", user.id)
          .single();

        if (!canceled) {
          setMe({
            email: (data?.user_email || user.email || "").trim(),
            name: (data?.full_name || "").trim(),
            role: (data?.roles || "").trim(),
          });
        }
        if (error) console.error("profiles fetch error:", error);
      } catch (e) {
        console.error("Failed to load current profile:", e);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  /** ===== Initial load (depends on role to apply associate filter) ===== */
  useEffect(() => {
    let cancelled = false;

    const fetchClients = async () => {
      setPageLoading(true);
      try {
        // include new columns from sales_closure
        const { data: rawSalesData, error: salesError } = await supabase
          .from("sales_closure")
          .select("lead_id, email, onboarded_date, account_assigned_email, account_assigned_name")
          .not("onboarded_date", "is", null)
          .order("onboarded_date", { ascending: false });

        if (salesError || !rawSalesData) {
          console.error("❌ sales_closure fetch failed", salesError);
          return;
        }

        const salesDataMap = new Map<
          string,
          {
            lead_id: string;
            email: string;
            onboarded_date: string;
            account_assigned_email: string | null;
            account_assigned_name: string | null;
          }
        >();
        for (const row of rawSalesData) {
          if (!salesDataMap.has(row.lead_id)) {
            salesDataMap.set(row.lead_id, {
              lead_id: row.lead_id,
              email: row.email,
              onboarded_date: row.onboarded_date as any,
              account_assigned_email: (row as any).account_assigned_email ?? null,
              account_assigned_name: (row as any).account_assigned_name ?? null,
            });
          }
        }
        let salesData = Array.from(salesDataMap.values());

        // If Accounts Associate, restrict to their own assigned rows
        if (isAssociate) {
          const meEmail = (me.email || "").toLowerCase();
          const meName = (me.name || "").toLowerCase();

          salesData = salesData.filter((r) => {
            const hasEmail = !!(r.account_assigned_email && r.account_assigned_email.trim());
            const hasName = !!(r.account_assigned_name && r.account_assigned_name.trim());
            const emailMatch = (r.account_assigned_email || "").trim().toLowerCase() === meEmail;
            const nameMatch = (r.account_assigned_name || "").trim().toLowerCase() === meName;

            if (hasEmail && hasName) return emailMatch && nameMatch;
            if (hasEmail) return emailMatch;
            if (hasName) return nameMatch;
            return false;
          });
        }

        const leadIds = salesData.map((s) => s.lead_id);
        if (leadIds.length === 0) {
          if (!cancelled) setClients([]);
          return;
        }

        const { data: leadsData, error: leadsError } = await supabase
          .from("leads")
          .select("business_id, name, phone, assigned_to, email")
          .in("business_id", leadIds);

        if (leadsError || !leadsData) {
          console.error("❌ leads fetch failed", leadsError);
          return;
        }
        const leadsMap = Object.fromEntries(leadsData.map((l) => [l.business_id, l]));

        const { data: callRaw, error: callError } = await supabase
          .from("call_history")
          .select("lead_id, current_stage, followup_date")
          .order("followup_date", { ascending: false });
        if (callError) console.error("❌ call_history fetch failed", callError);

        const latestCallMap: Record<string, any> = {};
        for (const call of callRaw || []) {
          if (!latestCallMap[call.lead_id]) latestCallMap[call.lead_id] = call;
        }

        const { data: feedbackRows, error: fbErr } = await supabase
          .from("client_feedback")
          .select("lead_id, client_emotion, rating, notes, renew_status, id")
          .in("lead_id", leadIds)
          .order("id", { ascending: false });
        if (fbErr) console.error("⚠️ client_feedback fetch failed", fbErr);

        const latestFbMap = new Map<string, Feedback>();
        for (const r of feedbackRows || []) {
          if (!latestFbMap.has(r.lead_id)) {
            latestFbMap.set(r.lead_id, {
              isHappy: r.client_emotion === "happy",
              rating: parseInt(String(r.rating || "0"), 10),
              notes: r.notes || "",
              willRenew: r.renew_status === "yes",
              date: new Date().toISOString().split("T")[0],
            });
          }
        }

        const merged: Client[] = salesData.map((sale) => {
          const lead = leadsMap[sale.lead_id] || {};
          const call = latestCallMap[sale.lead_id];
          return {
            id: sale.lead_id,
            client_name: lead.name || "Unnamed",
            email: sale.email || lead.email || "unknown@example.com",
            phone: lead.phone ?? null,
            assigned_to: lead.assigned_to || "Unassigned",
            created_at: sale.onboarded_date,
            stage: (call?.current_stage as AccountStage) || "DNP",
            follow_ups: [],
            feedback: latestFbMap.get(sale.lead_id),
            account_assigned_name: sale.account_assigned_name,
            account_assigned_email: sale.account_assigned_email,
          };
        });

        if (!cancelled) setClients(merged);
      } catch (err) {
        console.error("❌ Unexpected error:", err);
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };

    fetchClients();
  }, [me.role, me.email, me.name, isAssociate]);

  // If associate, force Assigned tab
  useEffect(() => {
    if (isAssociate) setActiveTab("assigned");
  }, [isAssociate]);

  /** ===== History & feedback fetch for selected client ===== */
  useEffect(() => {
    if (!historyDialogOpen || !selectedClient) {
      setCallHistory([]);
      setClientFeedback(null);
      return;
    }

    const fetchCallHistoryAndFeedback = async () => {
      const { data: callHistoryData, error: callHistoryError } = await supabase
        .from("call_history")
        .select("current_stage, followup_date, notes")
        .eq("lead_id", selectedClient.id)
        .order("followup_date", { ascending: false });

      if (callHistoryError) {
        console.error(`Error fetching call history for lead ${selectedClient.id}:`, JSON.stringify(callHistoryError, null, 2));
      } else {
        setCallHistory(callHistoryData || []);
      }

      const { data: feedbackData, error: feedbackError } = await supabase
        .from("client_feedback")
        .select("client_emotion, rating, notes, renew_status, id")
        .eq("lead_id", selectedClient.id)
        .order("id", { ascending: false })
        .limit(1);

      if (feedbackError) {
        console.error(`Error fetching client feedback for lead ${selectedClient.id}:`, JSON.stringify(feedbackError, null, 2));
      } else if (feedbackData?.[0]) {
        const row = feedbackData[0];
        setClientFeedback({
          isHappy: row.client_emotion === "happy",
          rating: parseInt(String(row.rating || "0"), 10),
          notes: row.notes || "",
          willRenew: row.renew_status === "yes",
          date: new Date().toISOString().split("T")[0],
        });
      }
    };

    fetchCallHistoryAndFeedback();
  }, [historyDialogOpen, selectedClient]);

  /** ===== Base filter by search and the 15-day "Today" chip ===== */
  const baseFiltered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const bySearch = (c: Client) =>
      c.email.toLowerCase().includes(term) ||
      c.client_name.toLowerCase().includes(term) ||
      (c.phone ?? "").toString().toLowerCase().includes(term);

    if (followUpFilter === "Today") {
      const today = new Date();
      return clients.filter((client) => {
        const createdAt = new Date(client.created_at);
        const diffInDays = Math.floor((today.getTime() - createdAt.getTime()) / 86400000);
        return diffInDays === 15 && bySearch(client);
      });
    }
    return clients.filter(bySearch);
  }, [clients, searchTerm, followUpFilter]);

  /** ===== Tab filtering ===== */
  const tabFiltered = useMemo(() => {
    if (activeTab === "unassigned") {
      return baseFiltered.filter((c) => !isAssigned(c.account_assigned_name));
    } else {
      let arr = baseFiltered.filter((c) => isAssigned(c.account_assigned_name));
      if (ownerFilter !== ALL_OWNERS && canAssign) {
        arr = arr.filter((c) => (c.account_assigned_name || "").trim() === ownerFilter);
      }
      return arr;
    }
  }, [baseFiltered, activeTab, ownerFilter, canAssign]);

  /** ===== Sorting ===== */
  const sortedClients = useMemo(() => {
    if (!sortKey) return tabFiltered;
    const arr = [...tabFiltered];
    if (sortKey === "created_at") {
      arr.sort((a, b) => {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sortOrder === "asc" ? da - db : db - da;
      });
    } else if (sortKey === "client_name") {
      arr.sort((a, b) => {
        const va = (a.client_name || "").toLowerCase();
        const vb = (b.client_name || "").toLowerCase();
        if (va === vb) return 0;
        return sortOrder === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
    }
    return arr;
  }, [tabFiltered, sortKey, sortOrder]);

  const handleSort = (key: "client_name" | "created_at") => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  /** ===== Counts & owners ===== */
  const assignedCountAll = useMemo(() => clients.filter((c) => isAssigned(c.account_assigned_name)).length, [clients]);
  const unassignedCountAll = useMemo(() => clients.length - assignedCountAll, [clients, assignedCountAll]);

  const ownerNames = useMemo(() => {
    const s = new Set<string>();
    clients.forEach((c) => {
      const nm = (c.account_assigned_name || "").trim();
      if (nm) s.add(nm);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [clients]);

  const ownerCount = useMemo(() => {
    if (!canAssign || ownerFilter === ALL_OWNERS) return 0;
    return clients.filter((c) => (c.account_assigned_name || "").trim() === ownerFilter).length;
  }, [clients, ownerFilter, canAssign]);

  /** ===== Deadline badge ===== */
  const getRenewWithinBadge = (createdAt: string): React.ReactNode => {
    if (!createdAt) return "-";
    const closedDate = new Date(createdAt);
    const today = new Date();
    const diffInDays = Math.floor((today.getTime() - closedDate.getTime()) / 86400000);
    if (diffInDays < 15) {
      const daysLeft = 15 - diffInDays;
      return <Badge className="bg-green-100 text-green-800">Within {daysLeft} day{daysLeft === 1 ? "" : "s"}</Badge>;
    } else if (diffInDays === 15) {
      return <Badge className="bg-yellow-100 text-gray-800">Today lastdate</Badge>;
    } else {
      const overdueDays = diffInDays - 15;
      return <Badge className="bg-red-100 text-red-800">Overdue by {overdueDays} day{overdueDays === 1 ? "" : "s"}</Badge>;
    }
  };

  /** ===== Stage transitions (existing) ===== */
  const handleStageUpdate = (clientId: string, newStage: AccountStage) => {
    const current = clients.find((c) => c.id === clientId);
    if (!current) return;
    prevStageRef.current = current.stage;
    changeCommittedRef.current = false;

    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, stage: newStage } : c)));
    const clientWithUpdatedStage = { ...current, stage: newStage };
    setSelectedClient(clientWithUpdatedStage);

    if (newStage === "Conversation Done") {
      setFeedbackForm({
        isHappy: false,
        rating: 5,
        notes: "",
        willRenew: false,
        date: new Date().toISOString().split("T")[0],
      });
      setFeedbackDialogOpen(true);
    } else {
      setPendingStage(newStage);
      setFollowUpForm({
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setFollowUpDialogOpen(true);
    }
  };
  const onFollowUpDialogOpenChange = (open: boolean) => {
    setFollowUpDialogOpen(open);
    if (!open && !changeCommittedRef.current && selectedClient && prevStageRef.current) {
      setClients((prev) => prev.map((c) => (c.id === selectedClient.id ? { ...c, stage: prevStageRef.current! } : c)));
      setPendingStage(null);
      prevStageRef.current = null;
    }
    if (!open) changeCommittedRef.current = false;
  };
  const onFeedbackDialogOpenChange = (open: boolean) => {
    setFeedbackDialogOpen(open);
    if (!open && !changeCommittedRef.current && selectedClient && prevStageRef.current) {
      setClients((prev) => prev.map((c) => (c.id === selectedClient.id ? { ...c, stage: prevStageRef.current! } : c)));
      prevStageRef.current = null;
    }
    if (!open) changeCommittedRef.current = false;
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedClient) {
      alert("No client selected.");
      return;
    }
    if (!feedbackForm.rating || feedbackForm.rating < 1 || feedbackForm.rating > 5) {
      alert("Please select a valid rating between 1 and 5.");
      return;
    }
    if (!feedbackForm.notes || feedbackForm.notes.trim() === "") {
      alert("Please provide feedback notes.");
      return;
    }

    const emailToUse = !selectedClient.email || selectedClient.email.trim() === "" ? "unknown@example.com" : selectedClient.email;
    const phoneToUse = !selectedClient.phone || String(selectedClient.phone).trim() === "" ? null : String(selectedClient.phone);

    const { data: leadCheck, error: leadCheckError } = await supabase
      .from("leads")
      .select("business_id")
      .eq("business_id", selectedClient.id)
      .limit(1);
    if (leadCheckError || !leadCheck || leadCheck.length === 0) {
      alert("Lead does not exist. Please create the lead first.");
      return;
    }

    const feedbackRow = {
      lead_id: selectedClient.id,
      client_emotion: feedbackForm.isHappy ? "happy" : "unhappy",
      rating: feedbackForm.rating.toString(),
      notes: feedbackForm.notes.trim(),
      renew_status: feedbackForm.willRenew ? "yes" : "no",
      email: emailToUse,
    };
    const { error: fbErr } = await supabase.from("client_feedback").insert([feedbackRow]);
    if (fbErr) {
      console.error("Error saving feedback:", fbErr);
      alert(`Failed to save feedback: ${fbErr.message}`);
      return;
    }

    const { error: chErr } = await supabase.from("call_history").insert([
      {
        lead_id: selectedClient.id,
        current_stage: "Conversation Done",
        followup_date: feedbackForm.date,
        notes: `Feedback recorded: rating ${feedbackForm.rating}/5. ${feedbackForm.notes}`.slice(0, 1000),
        assigned_to: me.name || "Accounts",
        email: emailToUse,
        phone: phoneToUse,
      },
    ]);
    if (chErr) console.error("Error writing call_history for Conversation Done:", chErr);

    setClients((prev) =>
      prev.map((c) => (c.id === selectedClient.id ? { ...c, feedback: feedbackForm, stage: "Conversation Done" } : c))
    );

    changeCommittedRef.current = true;
    prevStageRef.current = null;
    setFeedbackDialogOpen(false);
    setFeedbackForm({ isHappy: false, rating: 5, notes: "", willRenew: false, date: new Date().toISOString().split("T")[0] });
  };

  const handleFollowUpSave = async () => {
    if (!selectedClient || !pendingStage) {
      alert("No client or stage selected.");
      return;
    }
    if (!followUpForm.date || !followUpForm.notes.trim()) {
      alert("Please provide a follow-up date and notes.");
      return;
    }

    const emailToUse = !selectedClient.email || selectedClient.email.trim() === "" ? "unknown@example.com" : selectedClient.email;
    const phoneToUse = !selectedClient.phone || String(selectedClient.phone).trim() === "" ? null : String(selectedClient.phone);

    const followUpData = {
      lead_id: selectedClient.id,
      current_stage: pendingStage,
      followup_date: followUpForm.date,
      notes: followUpForm.notes.trim(),
      assigned_to: me.name || "Accounts",
      email: emailToUse,
      phone: phoneToUse,
    };

    const { error } = await supabase.from("call_history").insert([followUpData]);
    if (error) {
      console.error("Error saving follow-up:", error);
      alert("Failed to save follow-up. Please try again.");
      return;
    }

    setClients((prev) =>
      prev.map((client) =>
        client.id === selectedClient.id
          ? {
            ...client,
            stage: pendingStage,
            follow_ups: [...(client.follow_ups || []), { date: followUpForm.date, notes: followUpForm.notes }],
          }
          : client
      )
    );

    changeCommittedRef.current = true;
    prevStageRef.current = null;
    setFollowUpDialogOpen(false);
    setFollowUpForm({ date: "", notes: "" });
    setPendingStage(null);
  };

  /** ===== CSV upload ===== */
  const handleCSVUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const requiredFields = ["lead_id", "Name", "Rate", "Payment Frequency", "sale_done", "Onboarded date", "Phone number", "email"];
        const fields: string[] = Array.isArray(results.meta.fields) ? (results.meta.fields as string[]) : [];
        const missingFields = requiredFields.filter((f) => !fields.includes(f));
        if (missingFields.length > 0) {
          alert(`Missing required columns: ${missingFields.join(", ")}`);
          return;
        }
        setCsvData(results.data as any[]);
      },
      error: function (error) {
        console.error("CSV parsing error:", error);
        alert("Failed to parse CSV.");
      },
    });
  };

  const handleCSVSubmit = async () => {
    if (csvData.length === 0) {
      alert("No CSV data to submit");
      return;
    }

    try {
      const salesToInsert: any[] = [];

      for (const row of csvData) {
        const lead_id = row["lead_id"]?.trim?.();
        const name = row["Name"]?.trim?.();
        const email = row["email"]?.trim?.();
        const sale_value = parseFloat(row["Rate"]);
        const subscription_cycle = parseInt(row["Payment Frequency"], 10);
        const date = new Date(row["Onboarded date"]);
        const sale_done = new Date(row["sale_done"]);

        if (!lead_id || !name || !email || !sale_value || !subscription_cycle || isNaN(date.getTime()) || isNaN(sale_done.getTime())) {
          console.warn("❌ Skipping invalid row:", row);
          continue;
        }

        salesToInsert.push({
          lead_id,
          lead_name: name,
          email,
          sale_value,
          subscription_cycle,
          payment_mode: "UPI",
          finance_status: "Paid",
          closed_at: sale_done.toISOString(),
          onboarded_date: date.toISOString().split("T")[0],
          account_assigned_name: me.name || me.email || "Accounts",
          account_assigned_email: me.email || null,
        });
      }

      if (salesToInsert.length === 0) {
        alert("No valid rows to upload.");
        return;
      }

      const { error } = await supabase.from("sales_closure").insert(salesToInsert);
      if (error) throw error;

      alert(`🎉 Successfully inserted ${salesToInsert.length} renewal records into sales_closure`);
      setUploadDialogOpen(false);
      setCsvData([]);
      setCsvFile(null);
    } catch (err: any) {
      console.error("❌ Upload failed:", err);
      alert(`Upload failed: ${err?.message || String(err)}`);
    }
  };

  /** ===== Dashboard aggregates ===== */
  const happyCount = useMemo(() => clients.reduce((acc, c) => (c.feedback?.isHappy ? acc + 1 : acc), 0), [clients]);
  const willRenewCount = useMemo(() => clients.reduce((acc, c) => (c.feedback?.willRenew ? acc + 1 : acc), 0), [clients]);
  const avgRating = useMemo(() => {
    const fb = clients.map((c) => c.feedback).filter(Boolean) as Feedback[];
    if (fb.length === 0) return "N/A";
    const mean = fb.reduce((s, f) => s + (f.rating || 0), 0) / fb.length;
    return mean.toFixed(1);
  }, [clients]);

  /** ===== Bulk helpers ===== */
  const toggleOne = (id: string) => {
    const row = sortedClients.find((c) => c.id === id);
    if (row && isAssigned(row.account_assigned_name)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const quickSelect = (n: number) => {
    const eligible = sortedClients.filter((c) => !isAssigned(c.account_assigned_name));
    const firstN = eligible.slice(0, n).map((c) => c.id);
    setSelectedIds(new Set(firstN));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Clear selection when switching to Assigned tab
  useEffect(() => {
    if (activeTab === "assigned") clearSelection();
  }, [activeTab]);

  const openBulkDialog = async () => {
    if (selectedIds.size === 0) return;
    setBulkDialogOpen(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, user_email, roles")
      .in("roles", ["Sales Associate", "Accounts Associate", "Admin", "Resume Head", "Finance", "Sales", "Accounts", "Sales Head"]);


    // .in("roles",["Sales Associate","Admin"]);



    if (error) {
      console.error("Failed to load Accounts Associates:", error);
      return;
    }
    setAssociates(
      (data || [])
        .map((r) => ({
          name: (r.full_name || "").trim() || (r.user_email || "").trim(),
          email: (r.user_email || "").trim(),
        }))
        .filter((a) => a.email.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const doBulkAssign = async () => {
    if (!selectedAssociateEmail) {
      alert("Choose an Accounts Associate.");
      return;
    }
    const picked = associates.find((a) => a.email === selectedAssociateEmail);
    if (!picked) {
      alert("Invalid associate.");
      return;
    }
    const leadIds = Array.from(selectedIds);
    if (leadIds.length === 0) return;

    const payload: Record<string, any> = {};
    payload[ACCOUNT_EMAIL_COL] = picked.email;
    payload[ACCOUNT_NAME_COL] = picked.name;

    const { error } = await supabase.from("sales_closure").update(payload).in("lead_id", leadIds);
    if (error) {
      console.error("Bulk assign failed:", error);
      alert("Bulk assign failed. Check permissions/RLS.");
      return;
    }

    setClients((prev) =>
      prev.map((c) => (selectedIds.has(c.id) ? { ...c, account_assigned_name: picked.name, account_assigned_email: picked.email } : c))
    );

    setBulkDialogOpen(false);
    setSelectedAssociateEmail("");
    clearSelection();
    setActiveTab("assigned");
  };

  return (
    <>
      {pageLoading && <FullScreenLoader />}
      {/* Allow all three roles into the page (include Admin for robustness) */}
      <ProtectedRoute allowedRoles={["Super Admin", "Admin", "Account Management", "Accounts", "Sales", "Sales Associate", "Sales Head"]}>
        <DashboardLayout>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Account Management CRM</h1>
                <p className="text-gray-600 mt-2">Manage client relationships and feedback</p>
              </div>

              <div className="flex items-center gap-2">
                {/* CSV only for Admin/Account Management */}
                {canAssign && <Button onClick={() => setUploadDialogOpen(true)}>Upload Sale Done CSV</Button>}
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clients.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Happy Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{happyCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Renewal Intent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{willRenewCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgRating}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Account Management Dashboard</CardTitle>
                    <CardDescription>Manage client accounts and track feedback</CardDescription>
                  </div>

                  {/* Right side header controls */}
                  <div className="flex items-center gap-3">
                    {canAssign ? (
                      <>
                        {/* Owner filter only in Assigned tab */}
                        {activeTab === "assigned" && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Owner:</span>
                            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                              <SelectTrigger className="w-56">
                                <SelectValue placeholder="All owners" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ALL_OWNERS}>All owners</SelectItem>
                                {ownerNames.map((nm) => (
                                  <SelectItem key={nm} value={nm}>
                                    {nm}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {ownerFilter !== ALL_OWNERS && (
                              <span className="text-sm text-gray-600">
                                Count: <b>{ownerCount}</b>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Tabs for admins */}
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                          <TabsList>
                            <TabsTrigger value="unassigned">Unassigned ({unassignedCountAll})</TabsTrigger>
                            <TabsTrigger value="assigned">Assigned ({assignedCountAll})</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </>
                    ) : (
                      // Associates see only their assigned leads
                      <Badge variant="secondary">Assigned to you ({assignedCountAll})</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Search by email, name, or phone"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-3xl"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick select & Bulk assign only for admins on Unassigned tab */}
                    {canAssign && activeTab === "unassigned" && (
                      <div className="hidden md:flex items-center gap-2 mr-2">
                        <span className="text-sm text-gray-600">Select first:</span>
                        {[10, 20, 40, 50].map((n) => (
                          <Button key={n} size="sm" variant="outline" onClick={() => quickSelect(n)}>
                            {n}
                          </Button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={clearSelection}>
                          Clear
                        </Button>
                      </div>
                    )}

                    {canAssign && (
                      <Button
                        variant="default"
                        disabled={selectedIds.size === 0}
                        onClick={openBulkDialog}
                        title={selectedIds.size ? `Bulk assign ${selectedIds.size} selected` : "Select rows first"}
                      >
                        Bulk Assign
                      </Button>
                    )}

                    <Select value={followUpFilter} onValueChange={(v) => setFollowUpFilter(v as "All dates" | "Today")}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Follow Up" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All dates">All dates</SelectItem>
                        <SelectItem value="Today">Due today (15th day)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-sm text-gray-500 mt-2">
                  Showing <b>{sortedClients.length}</b> {activeTab} result{sortedClients.length === 1 ? "" : "s"}
                  {activeTab === "assigned" && ownerFilter !== ALL_OWNERS ? (
                    <>
                      {" "}
                      for <b>{ownerFilter}</b>
                    </>
                  ) : null}
                </div>

                <div className="rounded-md border mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">S.No</TableHead>
                        {/* Checkbox header only when admins & unassigned tab */}
                        {canAssign && activeTab === "unassigned" && <TableHead className="w-8">Select</TableHead>}

                        <TableHead className="select-none">
                          <div className="flex items-center gap-2">
                            <span>Client Name</span>
                            <span
                              className={`cursor-pointer text-lg leading-none ${sortKey === "client_name" && sortOrder === "desc" ? "text-blue-500" : "text-gray-400"}`}
                              onClick={() => {
                                setSortKey("client_name");
                                setSortOrder("desc");
                              }}
                            >
                              ↑
                            </span>
                            <span
                              className={`cursor-pointer text-lg leading-none ${sortKey === "client_name" && sortOrder === "asc" ? "text-blue-500" : "text-gray-400"}`}
                              onClick={() => {
                                setSortKey("client_name");
                                setSortOrder("asc");
                              }}
                            >
                              ↓
                            </span>
                          </div>
                        </TableHead>

                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Stage</TableHead>

                        <TableHead className="select-none">
                          <div className="flex items-center gap-2">
                            <span>Closed At</span>
                            <span
                              className={`cursor-pointer text-lg leading-none ${sortKey === "created_at" && sortOrder === "desc" ? "text-blue-500" : "text-gray-400"}`}
                              onClick={() => handleSort("created_at")}
                            >
                              ↑
                            </span>
                            <span
                              className={`cursor-pointer text-lg leading-none ${sortKey === "created_at" && sortOrder === "asc" ? "text-blue-500" : "text-gray-400"}`}
                              onClick={() => {
                                setSortKey("created_at");
                                setSortOrder("asc");
                              }}
                            >
                              ↓
                            </span>
                          </div>
                        </TableHead>

                        <TableHead>Deadline</TableHead>
                        <TableHead className="text-center">Account Owner</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedClients.map((client, idx) => {
                        const assigned = isAssigned(client.account_assigned_name);
                        const checked = selectedIds.has(client.id);
                        return (
                          <TableRow key={`${client.id}-${idx}`}>
                            <TableCell>{idx + 1}</TableCell>

                            {/* Checkbox only if admins & UNASSIGNED tab & row is unassigned */}
                            {canAssign && activeTab === "unassigned" ? (
                              <TableCell>
                                {!assigned ? (
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={checked}
                                    onChange={() => toggleOne(client.id)}
                                    aria-label={`Select ${client.client_name}`}
                                  />
                                ) : null}
                              </TableCell>
                            ) : null}

                            <TableCell
                              className="font-medium max-w-[180px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                              onClick={() => window.open(`/leads/${client.id}`, "_blank")}
                            >
                              {client.client_name}
                            </TableCell>

                            <TableCell className="max-w-[220px] break-words whitespace-normal">{client.email}</TableCell>
                            <TableCell>{client.phone || "-"}</TableCell>
                            <TableCell>{client.assigned_to}</TableCell>

                            <TableCell >
                              <Select value={accountStages.includes(client.stage) ? client.stage : undefined} onValueChange={(value: AccountStage) => handleStageUpdate(client.id, value)}>
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select Stage" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accountStages.map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                      <span className={`inline-flex px-2 py-1 overflow-hidden rounded-full  ${getStageColor(stage)}`}>{stage}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            <TableCell>{formatDate(client.created_at)}</TableCell>
                            <TableCell>{getRenewWithinBadge(client.created_at)}</TableCell>

                            {/* Account Owner cell with red 'Not Assigned' */}
                            <TableCell className="text-center">
                              {client.account_assigned_name && client.account_assigned_name.trim() ? (
                                <span className="bg-gray-200 text-gray-800 text-md font-bold p-2 rounded-lg">
                                  {client.account_assigned_name}
                                </span>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">
                                  Not Assigned
                                </Badge>
                              )}
                            </TableCell>

                            {/* <TableCell className="text-center">
                              {client.account_assigned_name && client.account_assigned_name.trim() ? (
                                <Badge className="bg-green-100 text-green-800">{client.account_assigned_name}</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">Not Assigned</Badge>
                              )}
                            </TableCell> */}

                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedClient(client);
                                    setHistoryDialogOpen(true);
                                  }}
                                  aria-label="View history"
                                  title="View history"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedClient(client);
                                    if (client.feedback) setFeedbackForm(client.feedback);
                                    setFeedbackDialogOpen(true);
                                    prevStageRef.current = client.stage;
                                  }}
                                  aria-label="Add feedback"
                                  title="Add feedback"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* HISTORY DIALOG */}
            <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{selectedClient?.client_name} - Full History</DialogTitle>
                  <DialogDescription>Complete follow-up history and client interactions</DialogDescription>
                </DialogHeader>

                {selectedClient && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <p className="text-sm text-gray-600 break-words">{selectedClient.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Assigned To</Label>
                        <p className="text-sm text-gray-600">{selectedClient.assigned_to}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Current Stage</Label>
                        <Badge className={getStageColor(selectedClient.stage)}>{selectedClient.stage}</Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Closed</Label>
                        <p className="text-sm text-gray-600">{formatDate(selectedClient.created_at)}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-3 block">Follow-up History</Label>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {callHistory.length > 0 ? (
                          callHistory.map((entry, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium">{entry.followup_date}</span>
                              </div>
                              <div className="mb-2">
                                <span className="text-sm font-medium">Stage: </span>
                                <Badge className={getStageColor(entry.current_stage)}>{entry.current_stage}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{entry.notes}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600">No follow-up history available.</p>
                        )}
                      </div>
                    </div>

                    {clientFeedback && (
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Latest Feedback</Label>
                        <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Rating:</span>
                              <div className="flex">{renderStars(clientFeedback.rating)}</div>
                            </div>
                            <Badge variant={clientFeedback.isHappy ? "default" : "secondary"}>
                              {clientFeedback.isHappy ? "Happy" : "Needs Attention"}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Will Renew: </span>
                            <span className={`text-sm ${clientFeedback.willRenew ? "text-green-600" : "text-red-600"}`}>
                              {clientFeedback.willRenew ? "Yes" : "No"}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Notes: </span>
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{clientFeedback.notes}</p>
                          </div>
                          <div className="text-xs text-gray-500">Feedback Date: {clientFeedback.date}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* FEEDBACK DIALOG */}
            <Dialog open={feedbackDialogOpen} onOpenChange={onFeedbackDialogOpenChange}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Client Feedback</DialogTitle>
                  <DialogDescription>Collect feedback from {selectedClient?.client_name}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Is Client Happy?</Label>
                    <Select value={feedbackForm.isHappy ? "happy" : "unhappy"} onValueChange={(value) => setFeedbackForm((prev) => ({ ...prev, isHappy: value === "happy" }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="happy">Happy</SelectItem>
                        <SelectItem value="unhappy">Unhappy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Rating (1-5)</Label>
                    <Select value={String(feedbackForm.rating)} onValueChange={(value) => setFeedbackForm((prev) => ({ ...prev, rating: Number(value) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <SelectItem key={rating} value={String(rating)}>
                            <div className="flex items-center gap-2">
                              <span>{rating}</span>
                              <div className="flex">{renderStars(rating)}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea placeholder="Enter detailed feedback..." value={feedbackForm.notes} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, notes: e.target.value }))} />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Will Client Renew?</Label>
                    <Select value={feedbackForm.willRenew ? "yes" : "no"} onValueChange={(value) => setFeedbackForm((prev) => ({ ...prev, willRenew: value === "yes" }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => onFeedbackDialogOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleFeedbackSubmit}>Save Feedback</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* FOLLOW-UP DIALOG */}
            <Dialog open={followUpDialogOpen} onOpenChange={onFollowUpDialogOpenChange}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Follow-up</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="block mb-1">Follow-up Date</Label>
                    <Input type="date" value={followUpForm.date} onChange={(e) => setFollowUpForm((f) => ({ ...f, date: e.target.value }))} className="w-full" />
                  </div>
                  <div>
                    <Label className="block mb-1">Notes</Label>
                    <Textarea placeholder="Add notes..." value={followUpForm.notes} onChange={(e) => setFollowUpForm((f) => ({ ...f, notes: e.target.value }))} className="w-full" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => onFollowUpDialogOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleFollowUpSave}>Save Follow-up</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* CSV UPLOAD */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Upload Sale Done CSV</DialogTitle>
                  <DialogDescription>
                    Upload your sales CSV. We'll parse and show the number of entries.
                    <br />
                    Required columns:
                    <br />
                    <code>lead_id, Name, Rate, Payment Frequency, sale_done, Onboarded date, Phone number, email</code>
                    <br />
                    Dates must be <code>yyyy-mm-dd</code>.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCsvFile(file);
                        handleCSVUpload(file);
                      }
                    }}
                  />
                  <p className="text-sm text-gray-600">{csvData.length > 0 ? `✅ Detected ${csvData.length} records in file.` : "No file parsed yet."}</p>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCSVSubmit} disabled={csvData.length === 0}>
                    Submit to Supabase
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* BULK ASSIGN DIALOG */}
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Assign to Accounts Associate</DialogTitle>
                  <DialogDescription>{selectedIds.size} selected {selectedIds.size === 1 ? "client" : "clients"}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Label className="text-sm font-medium">Select Accounts Associate</Label>
                  <Select value={selectedAssociateEmail} onValueChange={(v) => setSelectedAssociateEmail(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose associate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {associates.map((a) => (
                        <SelectItem key={a.email} value={a.email}>
                          {a.name} — {a.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button disabled={!selectedAssociateEmail} onClick={doBulkAssign}>
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    </>
  );
}
