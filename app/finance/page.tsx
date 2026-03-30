//app/finance/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from '@/utils/supabase/client';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { User, DollarSign, TrendingUp, TrendingDown, Pause, Star, Eye, EyeOff } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"; // or wherever your toast system comes from
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, RefreshCw } from "lucide-react"; // or use any icon you like

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { MessageSquare } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import RenewalsList from "@/app/finance/_components/RenewalsList";
import { EmailLogView } from "@/app/_components/EmailLogView";
import { Mail } from "lucide-react";

type FinanceStatus = "Paid" | "Unpaid" | "Paused" | "Closed" | "Got Placed"; // 🆕 added "Got Placed"


interface SalesClosure {
  id: string;
  lead_id: string;
  sale_value: number;
  subscription_cycle: number;
  payment_mode: string;
  closed_at: string;
  email: string;
  finance_status: FinanceStatus;
  onboarded_date?: string;
  reason_for_close?: string;
  leads?: { name: string, phone: string };
  oldest_sale_done_at?: string; // 🆕
  application_sale_value: number;
  associates_tl_email?: string;
  feedback?: {
    isHappy: boolean;
    rating: number;
    notes: string;
  };
}



function generateMonthlyRevenue(sales: SalesClosure[], year: number) {
  const monthlyMap = new Map<
    string,
    {
      month: string;
      inMonthRevenue: number;
      proratedRevenue: number;
    }
  >();

  sales.forEach((sale) => {
    const closedAt = new Date(sale.closed_at);
    const saleMonthKey = closedAt.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const perDayRate = sale.sale_value / sale.subscription_cycle;
    const endDate = new Date(closedAt);
    endDate.setDate(endDate.getDate() + sale.subscription_cycle);

    const temp = new Date(closedAt);
    while (temp < endDate) {
      const tempYear = temp.getFullYear();
      const tempMonth = temp.getMonth();
      if (tempYear === year) {
        const tempKey =
          temp.toLocaleString("default", { month: "long" }) + " " + year;

        if (!monthlyMap.has(tempKey)) {
          monthlyMap.set(tempKey, {
            month: tempKey,
            inMonthRevenue: 0,
            proratedRevenue: 0,
          });
        }

        monthlyMap.get(tempKey)!.proratedRevenue += perDayRate;
      }

      temp.setDate(temp.getDate() + 1);
    }

    const closedAtYear = closedAt.getFullYear();
    const closedAtMonth = closedAt.getMonth();
    if (closedAtYear === year) {
      const monthKey =
        closedAt.toLocaleString("default", { month: "long" }) + " " + year;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          inMonthRevenue: 0,
          proratedRevenue: 0,
        });
      }

      monthlyMap.get(monthKey)!.inMonthRevenue += sale.sale_value;
    }
  });

  const result: {
    month: string;
    inMonthRevenue: number;
    proratedRevenue: number;
  }[] = [];

  for (let m = 0; m < 12; m++) {
    const monthName = new Date(year, m).toLocaleString("default", {
      month: "long",
    });
    const key = `${monthName} ${year}`;
    const entry = monthlyMap.get(key) ?? {
      month: key,
      inMonthRevenue: 0,
      proratedRevenue: 0,
    };

    result.push({
      month: key,
      inMonthRevenue: Math.round(entry.inMonthRevenue),
      proratedRevenue: Math.round(entry.proratedRevenue),
    });
  }

  return result;
}

type SalesClosureData = {
  lead_id: string;
  email: string;
  lead_name: string,
  payment_mode: string;
  subscription_cycle: number;
  sale_value: number;
  closed_at: string;
  finance_status: string;
  next_payment_due: string;
  resume_service?: number;
  linkedin_service?: number;
  github_service?: number;
  portfolio_service?: number;
  created_at?: string;
  application_sale_value?: number;
};




export default function FinancePage() {
  const [sales, setSales] = useState<SalesClosure[]>([]);
  const [allSales, setAllSales] = useState<SalesClosure[]>([]); // 🆕 every row – drives totals & charts
  const [actionSelections, setActionSelections] = useState<Record<string, string>>({});
  const [activeTabView, setActiveTabView] = useState<"main" | "notOnboarded" | "renewals" | "email_logs">("main");
  const [notOnboardedClients, setNotOnboardedClients] = useState<any[]>([]);
  const [loadingNotOnboarded, setLoadingNotOnboarded] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tempReasonInput, setTempReasonInput] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  const [selectedTLFilter, setSelectedTLFilter] = useState<string | null>(null);

  const [revenueLoading, setRevenueLoading] = useState(false);


  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [unpaidApplications, setUnpaidApplications] = useState<SalesClosure[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState<"All dates" | "Today" | "Upcoming (7 Days)">("Today");
  const [emotionFilter, setEmotionFilter] = useState<"All" | "Happy" | "Unhappy">("All");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closingNote, setClosingNote] = useState("");

  const [showReasonDialog, setShowReasonDialog] = useState(false);
  // const [selectedFinanceStatus, setSelectedFinanceStatus] = useState<FinanceStatus | null>(null);
  const [reasonText, setReasonText] = useState("");


  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [newOnboardDate, setNewOnboardDate] = useState<string>("");
  const [updatingDate, setUpdatingDate] = useState(false);

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedFinanceStatus, setSelectedFinanceStatus] = useState<FinanceStatus | null>(null);
  const [statusFilter, setStatusFilter] = useState<FinanceStatus | "All">("All");
  const [showRevenueDialog, setShowRevenueDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [tableYearFilter, setTableYearFilter] = useState<number | "all">("all");
  const [pendingPaidUpdates, setPendingPaidUpdates] = useState<Set<string>>(new Set());
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const [onboardingDate, setOnboardingDate] = useState<Date | null>(null);

  const [coursesValue, setCoursesValue] = useState('');
  const [badgeValue, setBadgeValue] = useState('');
  const [customValue, setCustomValue] = useState('');


  const [revealed, setRevealed] = useState<Record<string, boolean>>({
    total: false,
    paid: false,
    unpaid: false,
    paused: false,
    gotPlaced: false,
  });

  const [tlActiveCounts, setTlActiveCounts] = useState<
    { associates_tl_email: string | null; count: number }[]
  >([]);


  const [pageSize, setPageSize] = useState<number | "all">(30);
  const [currentPage, setCurrentPage] = useState(1);

  const monthlyRevenues: { month: string; amount: number }[] = [];

  const [monthlyBreakdown, setMonthlyBreakdown] = useState<
    { month: string; inMonthRevenue: number; proratedRevenue: number }[]
  >([]);

  const handleSendTestEmail = async () => {
    if (!testEmailInput) {
      toast.error("Please enter an email address");
      return;
    }

    setSendingTest(true);
    try {
      const resp = await fetch("/api/admin/test-renewal-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmailInput }),
      });

      const data = await resp.json();
      if (data.success) {
        toast.success("Test automated email sent successfully!");
        setShowTestEmailDialog(false);
        setTestEmailInput("");
      } else {
        toast.error(data.error || "Failed to send test email");
      }
    } catch (err) {
      toast.error("An error occurred while sending test email");
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);


  // useEffect(() => {
  //   if (allSales.length > 0) {
  //     const breakdown = generateMonthlyRevenue(allSales, selectedYear);
  //     setMonthlyBreakdown(breakdown);
  //   }
  // }, [allSales, selectedYear]);

  // useEffect(() => {
  //   if (activeTabView === "notOnboarded") {
  //     fetchNotOnboardedClients();
  //   }
  // }, [activeTabView]);

  const fetchNotOnboardedClients = async () => {
    setLoadingNotOnboarded(true);
    const { data, error } = await supabase
      .from("sales_closure")
      .select(`id, lead_id, lead_name, email, sale_value, subscription_cycle,  closed_at`)
      .is("onboarded_date", null);

    if (error) {
      console.error("Error fetching not onboarded clients:", error);
    } else {
      setNotOnboardedClients(data || []);
    }

    setLoadingNotOnboarded(false);
  };

  //   const handleOpenNotOnboarded = async () => {
  //   setActiveTabView("notOnboarded");
  //   await fetchNotOnboardedClients();    // 🔥 Fetch only here
  // };

  async function loadRevenue() {
    setRevenueLoading(true);

    const breakdown = generateMonthlyRevenue(allSales, selectedYear);
    setMonthlyBreakdown(breakdown);

    setRevenueLoading(false);
    setShowRevenueDialog(true);
  }

  const handleOpenNotOnboarded = async () => {
    setLoadingNotOnboarded(true);
    setActiveTabView("notOnboarded");
    await fetchNotOnboardedClients();
    setLoadingNotOnboarded(false);
  };

  async function fetchSalesData() {
    // 1. Fetch sales closure records
    const { data: rows, error } = await supabase
      .from("sales_closure")
      .select("*")
      .order("closed_at", { ascending: false });

    if (error) {
      console.error("Error fetching sales data:", error);
      return;
    }

    // 2. Fetch feedback for all lead IDs
    const leadIdsAll = rows.map(r => r.lead_id);
    const { data: feedbackRows, error: fbFetchErr } = await supabase
      .from("client_feedback")
      .select("lead_id, client_emotion, rating, notes")
      .in("lead_id", leadIdsAll)
      .order("id", { ascending: false });

    const latestFbMap = new Map();
    if (!fbFetchErr && feedbackRows) {
      for (const fb of feedbackRows) {
        if (!latestFbMap.has(fb.lead_id)) {
          latestFbMap.set(fb.lead_id, {
            isHappy: fb.client_emotion === "happy",
            rating: parseInt(String(fb.rating || "0"), 10),
            notes: fb.notes || "",
          });
        }
      }
    }

    setAllSales(rows.map(r => ({ ...r, feedback: latestFbMap.get(r.lead_id) })));
    const onboardedRows = rows.filter((r) => r.onboarded_date);

    const latestMap = new Map<string, SalesClosure>();
    for (const rec of onboardedRows) {
      const existing = latestMap.get(rec.lead_id);
      if (!existing || new Date(rec.closed_at) > new Date(existing.closed_at)) {
        latestMap.set(rec.lead_id, rec);
      }
    }

    const latestRows = Array.from(latestMap.values()).sort(
      (a, b) =>
        new Date(b.onboarded_date ?? "").getTime() -
        new Date(a.onboarded_date ?? "").getTime()
    );
    // -----------------------------
    // 🧠 Calculate TL-wise Active Paid Clients
    // -----------------------------
    const tlMap = new Map<string | null, number>();

    latestRows.forEach((row) => {
      if (row.finance_status === "Paid") {
        const tl = row.associates_tl_email || null;
        tlMap.set(tl, (tlMap.get(tl) || 0) + 1);
      }
    });

    // Convert map → array for UI
    const tlArray = Array.from(tlMap.entries()).map(([email, count]) => ({
      associates_tl_email: email,
      count,
    }));

    // Store in state
    setTlActiveCounts(tlArray);

    // Step 1: Build oldest sale_done map
    const oldestSaleDateMap = new Map<string, string>();

    for (const record of rows) {
      const existing = oldestSaleDateMap.get(record.lead_id);
      const currentClosedAt = new Date(record.closed_at);
      if (!existing || currentClosedAt < new Date(existing)) {
        oldestSaleDateMap.set(record.lead_id, record.closed_at);
      }
    }

    const leadIds = latestRows.map((r) => r.lead_id);

    // 🆕 Fetch both name and phone from leads
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("business_id, name, phone")
      .in("business_id", leadIds);

    if (leadsErr) {
      console.error("Error fetching leads:", leadsErr);
      return;
    }

    const { data: fallback, error: fbErr } = await supabase
      .from("sales_closure")
      .select("lead_id, lead_name");

    if (fbErr) {
      console.error("Error fetching fallback names:", fbErr);
      return;
    }

    const leadNameMap = new Map(leads.map((l) => [l.business_id, l.name]));
    const leadPhoneMap = new Map(leads.map((l) => [l.business_id, l.phone]));
    const fallbackNameMap = new Map(
      fallback.map((f) => [f.lead_id, f.lead_name])
    );

    const tableReady = latestRows.map((r) => ({
      ...r,
      leads: {
        name: leadNameMap.get(r.lead_id) || fallbackNameMap.get(r.lead_id) || "-",
        phone: leadPhoneMap.get(r.lead_id) || "-",
      },
      oldest_sale_done_at: oldestSaleDateMap.get(r.lead_id) || r.closed_at,
    }));

    // 🧾 Split into paid & unpaid application groups
    const paidApplications = tableReady.filter(
      (r) => r.application_sale_value && r.application_sale_value > 0
    );
    const unpaidApplications = tableReady.filter(
      (r) => !r.application_sale_value || r.application_sale_value === 0
    );

    // Main table → only show paid
    setSales(paidApplications.map(r => ({ ...r, feedback: latestFbMap.get(r.lead_id) })));

    // Store unpaid for the dialog box
    setUnpaidApplications(unpaidApplications.map(r => ({ ...r, feedback: latestFbMap.get(r.lead_id) })));
  }

  const [searchStore, setSearchStore] = useState("");
  const [startDate, setStartDate] = useState("");

  // 💳 Subscription Fields
  const [subscriptionCycle, setSubscriptionCycle] = useState("30");
  const [subscriptionSaleValue, setSubscriptionSaleValue] = useState("");


  const [totalSale, setTotalSale] = useState(0);
  const [dueDate, setDueDate] = useState("");

  // 🧩 Optional Add-ons
  const [resumeValue, setResumeValue] = useState("");
  const [portfolioValue, setPortfolioValue] = useState("");
  const [linkedinValue, setLinkedinValue] = useState("");
  const [githubValue, setGithubValue] = useState("");

  const handleFinanceStatusUpdate = async (saleId: string, newStatus: FinanceStatus) => {
    const { error } = await supabase
      .from("sales_closure")
      .update({ finance_status: newStatus })
      .eq("lead_id", saleId);

    if (error) {
      console.error("Error updating finance status:", error);
    } else {
      setSales(prev =>
        prev.map(sale => (sale.id === saleId ? { ...sale, finance_status: newStatus } : sale))
      );
    }
  };


  useEffect(() => {
    const validSubscriptionSaleValue = parseFloat(subscriptionSaleValue || "0");
    const validResumeValue = parseFloat(resumeValue || "0");
    const validPortfolioValue = parseFloat(portfolioValue || "0");
    const validLinkedinValue = parseFloat(linkedinValue || "0");
    const validGithubValue = parseFloat(githubValue || "0");

    const total = validSubscriptionSaleValue + validResumeValue + validPortfolioValue + validLinkedinValue + validGithubValue;
    setTotalSale(total); // Update total correctly
  }, [
    subscriptionSaleValue,
    resumeValue,
    portfolioValue,
    linkedinValue,
    githubValue
  ]);



  useEffect(() => {
    if (!startDate || !subscriptionCycle) {
      setDueDate("");
      return;
    }

    const start = new Date(startDate);
    const nextDue = new Date(start);
    nextDue.setDate(start.getDate() + parseInt(subscriptionCycle));

    setDueDate(nextDue.toLocaleDateString("en-GB")); // or "en-US" as needed
  }, [startDate, subscriptionCycle]);


  // const filteredSales = sales
  // .filter((sale) => {
  //    if (selectedTLFilter && sale.associates_tl_email !== selectedTLFilter) {
  //     return false;
  //   }

  //   // --------------------------------------------
  //   // 🔍 2. SEARCH FILTERS
  //   // --------------------------------------------
  //   const matchesSearch =
  //     sale.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     sale.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     (sale.leads?.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     (sale.leads?.phone ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     sale.sale_value.toString().includes(searchTerm) ||
  //     sale.subscription_cycle.toString().includes(searchTerm);

  //   // --------------------------------------------
  //   // 🔍 3. STATUS FILTER
  //   // --------------------------------------------
  //   const matchesStatus =
  //     statusFilter === "All" || sale.finance_status === statusFilter;

  //   // --------------------------------------------
  //   // 🔍 4. TODAY FILTER (due today + overdue)
  //   // --------------------------------------------
  //   if (followUpFilter === "Today") {
  //     if (!sale.onboarded_date || !sale.subscription_cycle) return false;

  //     const start = new Date(sale.onboarded_date);
  //     start.setHours(0, 0, 0, 0);

  //     const due = new Date(start);
  //     due.setDate(start.getDate() + sale.subscription_cycle);
  //     due.setHours(0, 0, 0, 0);

  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0);

  //     const isDueTodayOrOverdue = due.getTime() <= today.getTime();

  //     return (
  //       isDueTodayOrOverdue &&
  //       matchesSearch &&
  //       matchesStatus
  //     );
  //   }

  //   // --------------------------------------------
  //   // 🔍 5. DEFAULT (NO TODAY FILTER)
  //   // --------------------------------------------
  //   return matchesSearch && matchesStatus;
  // })
  // .sort((a, b) => {
  //   const dateA = new Date(a.onboarded_date || a.closed_at || "");
  //   const dateB = new Date(b.onboarded_date || b.closed_at || "");
  //   return dateB.getTime() - dateA.getTime();
  // });

  const filteredSales = useMemo(() => {
    return sales
      .filter((sale) => {
        if (selectedTLFilter && sale.associates_tl_email !== selectedTLFilter) {
          return false;
        }

        const matchesSearch =
          sale.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sale.leads?.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sale.leads?.phone ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.sale_value.toString().includes(searchTerm) ||
          sale.subscription_cycle.toString().includes(searchTerm);

        const matchesStatus =
          statusFilter === "All" || sale.finance_status === statusFilter;

        const emotionMatch = emotionFilter === "All" || (sale.feedback && (emotionFilter === "Happy" ? sale.feedback.isHappy : !sale.feedback.isHappy));

        if (followUpFilter === "Today") {
          if (!sale.onboarded_date || !sale.subscription_cycle) return false;

          const start = new Date(sale.onboarded_date);
          start.setHours(0, 0, 0, 0);

          const due = new Date(start);
          due.setDate(start.getDate() + sale.subscription_cycle);
          due.setHours(0, 0, 0, 0);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const isDueTodayOrOverdue = due.getTime() <= today.getTime();

          return isDueTodayOrOverdue && matchesSearch && matchesStatus && emotionMatch;
        }

        if (followUpFilter === "Upcoming (7 Days)") {
          if (!sale.onboarded_date || !sale.subscription_cycle) return false;

          const start = new Date(sale.onboarded_date);
          const due = new Date(start);
          due.setDate(start.getDate() + sale.subscription_cycle);
          due.setHours(0, 0, 0, 0);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(today.getDate() + 7);
          sevenDaysFromNow.setHours(23, 59, 59, 999);

          // Within next 7 days and NOT overdue
          const isUpcoming = due.getTime() > today.getTime() && due.getTime() <= sevenDaysFromNow.getTime();

          return isUpcoming && matchesSearch && matchesStatus && emotionMatch;
        }

        return matchesSearch && matchesStatus && emotionMatch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.onboarded_date || a.closed_at || "");
        const dateB = new Date(b.onboarded_date || b.closed_at || "");
        return dateB.getTime() - dateA.getTime();
      });
  }, [
    sales,
    selectedTLFilter,
    searchTerm,
    statusFilter,
    followUpFilter
  ]);


  const handleSearch = () => {
    const filtered = allSales.filter((sale) =>
      sale.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.leads?.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.leads?.phone ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    setSales(filtered);
    setCurrentPage(1); // reset pagination if needed
  };


  function handleSort(field: string) {
    if (sortField === field) {
      // Toggle sort direction
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc"); // default order
    }
  }

  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      if (!sortField) return 0;

      if (sortField === "lead_id") {
        const aNum = parseInt(a.lead_id.split("-")[1]);
        const bNum = parseInt(b.lead_id.split("-")[1]);
        return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
      }

      if (sortField === "name") {
        const nameA = (a.leads?.name ?? "").toLowerCase();
        const nameB = (b.leads?.name ?? "").toLowerCase();
        return sortOrder === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }

      if (sortField === "sale_value") {
        return sortOrder === "asc"
          ? a.sale_value - b.sale_value
          : b.sale_value - a.sale_value;
      }

      if (sortField === "closed_at") {
        const dateA = new Date(a.closed_at).getTime();
        const dateB = new Date(b.closed_at).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }

      if (sortField === "onboarded_date") {
        const dateA = new Date(a.onboarded_date ?? "").getTime();
        const dateB = new Date(b.onboarded_date ?? "").getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }

      if (sortField === "next_renewal_date") {
        const aPaid = a.finance_status === "Paid";
        const bPaid = b.finance_status === "Paid";

        if (aPaid && !bPaid) return -1;
        if (!aPaid && bPaid) return 1;

        const dateA = new Date(calculateNextRenewal(a.onboarded_date, a.subscription_cycle)).getTime();
        const dateB = new Date(calculateNextRenewal(b.onboarded_date, b.subscription_cycle)).getTime();

        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }

      if (sortField === "subscription_cycle") {
        const aPaid = a.finance_status === "Paid";
        const bPaid = b.finance_status === "Paid";

        if (aPaid && !bPaid) return -1;
        if (!aPaid && bPaid) return 1;

        const sub1 = a.subscription_cycle || 0;
        const sub2 = b.subscription_cycle || 0;
        return sortOrder === "asc" ? sub1 - sub2 : sub2 - sub1;
      }

      if (sortField === "assigned_to") {
        const aTL = (a.associates_tl_email ?? "").toLowerCase();
        const bTL = (b.associates_tl_email ?? "").toLowerCase();

        return sortOrder === "asc"
          ? aTL.localeCompare(bTL)
          : bTL.localeCompare(aTL);
      }

      return 0;
    });
  }, [filteredSales, sortField, sortOrder]);


  const paginatedSales = sortedSales.slice(
    (currentPage - 1) * (pageSize === "all" ? sortedSales.length : pageSize),
    pageSize === "all" ? sortedSales.length : currentPage * (pageSize as number)
  );

  const totalPages = pageSize === "all" ? 1 : Math.ceil(sortedSales.length / (pageSize as number));



  function getRenewWithinBadge(createdAt: string, subscriptionCycle: number): React.ReactNode {
    if (!createdAt || !subscriptionCycle) return null;

    const startDate = new Date(createdAt);
    const today = new Date();

    // Normalize time to 00:00:00 to compare only dates
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffInDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays < subscriptionCycle) {
      const daysLeft = subscriptionCycle - diffInDays;
      return (
        <Badge className="bg-green-100 text-green-800">
          Within {daysLeft} day{daysLeft === 1 ? "" : "s"}
        </Badge>
      );
    } else if (diffInDays === subscriptionCycle) {
      return (
        <Badge className="bg-yellow-100 text-gray-800">
          Today last date
        </Badge>
      );
    } else {
      const overdue = diffInDays - subscriptionCycle;
      return (
        <Badge className="bg-red-100 text-red-800">
          Overdue by {overdue} day{overdue === 1 ? "" : "s"}
        </Badge>
      );
    }
  }

  const nextRenewalDate =
    onboardingDate !== null
      ? new Date(onboardingDate)
      : null;
  if (nextRenewalDate !== null) {
    nextRenewalDate.setDate(nextRenewalDate.getDate() + parseInt(subscriptionCycle, 10));
  }


  const totalRevenue = allSales.reduce((sum, s) => sum + s.sale_value, 0);

  const paidRevenue = allSales.filter(s => s.finance_status === "Paid")
    .reduce((sum, s) => sum + s.sale_value, 0);
  const unpaidRevenue = allSales.filter(s => s.finance_status === "Unpaid")
    .reduce((sum, s) => sum + s.sale_value, 0);
  const pausedRevenue = allSales.filter(s => s.finance_status === "Paused")
    .reduce((sum, s) => sum + s.sale_value, 0);

  const paidCount = allSales.filter(s => s.finance_status === "Paid").length;
  const unpaidCount = allSales.filter(s => s.finance_status === "Unpaid").length;
  const pausedCount = allSales.filter(s => s.finance_status === "Paused").length;
  const gotPlacedCount = allSales.filter(s => s.finance_status === "Got Placed").length;

  const formatCurrency = (amount: number, cardId?: string) => {
    if (cardId && !revealed[cardId]) return "••••••";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStageColor = (stage: FinanceStatus) => {
    switch (stage) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Unpaid":
        return "bg-red-100 text-red-800";
      case "Paused":
        return "bg-yellow-100 text-yellow-800";
      case "Got Placed":
        return "bg-blue-100 text-blue-800";
    }
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return <span className="text-red-600 font-medium">Very Poor</span>;
      case 2: return <span className="text-orange-600 font-medium">Poor</span>;
      case 3: return <span className="text-yellow-600 font-medium">Average</span>;
      case 4: return <span className="text-green-600 font-medium">Good</span>;
      case 5: return <span className="text-emerald-600 font-medium">Excellent</span>;
      default: return null;
    }
  };

  function renderStars(rating: number, showLabel: boolean = false) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-current text-yellow-400" : "text-gray-300"}`} />
          ))}
        </span>
        {showLabel && getRatingLabel(rating)}
      </div>
    );
  }


  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      // 🔁 Re-fetch main data
      await fetchSalesData();

      // 🔁 Re-fetch not onboarded clients if that tab is active
      if (activeTabView === "notOnboarded") {
        await fetchNotOnboardedClients();
      }

      // 🔁 Recompute monthly revenue breakdown (if sales exist)
      if (allSales.length > 0) {
        const breakdown = generateMonthlyRevenue(allSales, selectedYear);
        setMonthlyBreakdown(breakdown);
      }

      // ✅ Reset search filters and states (optional)
      setSearchTerm("");
      setStatusFilter("All");
      setFollowUpFilter("Today");

      // ✅ Optional: Scroll to top of page after refresh
      window.scrollTo({ top: 0, behavior: "smooth" });

      toast.success("✅ Page refreshed successfully!");
    } catch (err) {
      console.error("Error refreshing data:", err);
      toast.error("Failed to refresh data.");
    } finally {
      setRefreshing(false);
    }
  };


  const handleDownloadCSV = () => {
    const filteredData = monthlyBreakdown.filter((m) => m.proratedRevenue > 0);

    const headers = ["Month", "In-Month Revenue", "Subscription Revenue"];

    const rows = filteredData.map((m) => [
      m.month,
      `$${m.inMonthRevenue}`,
      `$${m.proratedRevenue}`,
    ]);

    const totalInMonth = filteredData.reduce((sum, m) => sum + m.inMonthRevenue, 0);
    const totalProrated = filteredData.reduce((sum, m) => sum + m.proratedRevenue, 0);

    rows.push([
      "Total",
      `$${totalInMonth}`,
      `$${totalProrated}`,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((col) => `"${col}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "monthly_revenue_breakdown.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function handleDownloadFullSalesCSV() {
    try {
      // 1. Fetch all sales_closure records
      const { data: salesData, error: salesError } = await supabase
        .from("sales_closure")
        .select("*");

      if (salesError) throw salesError;
      if (!salesData || salesData.length === 0) {
        alert("No sales data found.");
        return;
      }

      // 2. Get unique lead_ids to fetch from leads
      const leadIds = [...new Set(salesData.map((s) => s.lead_id))];

      // 3. Fetch leads: phone, source, created_at, assigned_to
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("business_id, phone, source, created_at, assigned_to")
        .in("business_id", leadIds);

      if (leadsError) throw leadsError;

      // 4. Build a map for fast lookup
      const leadsMap = new Map(
        leadsData.map((lead) => [lead.business_id, lead])
      );

      // 5. Enrich sales data with lead fields
      const enrichedRows = salesData.map((row) => {
        const lead = leadsMap.get(row.lead_id);
        return {
          ...row,
          phone: lead?.phone || "",
          source: lead?.source || "",
          lead_created_at: lead?.created_at || "",
          assigned_to: lead?.assigned_to || "",
        };
      });

      // 6. Format for CSV
      const headers = Object.keys(enrichedRows[0]);
      const rows = enrichedRows.map((row) =>
        headers
          .map((header) => {
            const val = row[header];
            return typeof val === "string"
              ? `"${val.replace(/"/g, '""')}"`
              : `"${val ?? ""}"`;
          })
          .join(",")
      );

      const csvContent = [headers.join(","), ...rows].join("\n");

      // 7. Trigger download

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      // const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sales_closure_full_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("❌ Error exporting CSV:", err?.message || err);
      alert("Failed to download CSV. Try again.");
    }
  }

  async function handleChangeOnboardDate(leadId: string) {
    if (!newOnboardDate) {
      toast.error("Please select a valid date.");
      return;
    }

    try {
      setUpdatingDate(true);

      // Step 1: find latest record for this lead
      const { data: latestRecord, error: fetchError } = await supabase
        .from("sales_closure")
        .select("id, lead_id, onboarded_date, closed_at")
        .eq("lead_id", leadId)
        .order("closed_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !latestRecord) {
        console.error("Error fetching latest record:", fetchError);
        toast.error("Could not find the latest record for this client.");
        setUpdatingDate(false);
        return;
      }

      // Step 2: update onboarded_date
      const { error: updateError } = await supabase
        .from("sales_closure")
        .update({ onboarded_date: newOnboardDate })
        .eq("id", latestRecord.id);

      if (updateError) {
        console.error("Error updating onboarded_date:", updateError);
        toast.error("Failed to update onboarded date.");
      } else {
        toast.success("Onboarded date updated successfully!");

        // Step 3: Update UI
        setSales((prev) =>
          prev.map((sale) =>
            sale.lead_id === leadId
              ? { ...sale, onboarded_date: newOnboardDate }
              : sale
          )
        );
        setEditingLeadId(null);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setUpdatingDate(false);
    }
  }


  function calculateNextRenewal(onboarded: string | undefined, cycle: number): string {
    if (!onboarded || !cycle) return "-";

    const start = new Date(onboarded);
    start.setDate(start.getDate() + cycle);

    return start.toLocaleDateString("en-GB"); // Format: dd/mm/yyyy
  }


  const expiredCount = sales.filter((sale) => sale.finance_status === "Paid").length;

  const totalAmount = (
    parseFloat(subscriptionSaleValue || "0")
  );

  // Adjust the total based on the subscription cycle
  let adjustedTotalAmount = 0;
  switch (subscriptionCycle) {
    case "15": // 15 Days
      adjustedTotalAmount = totalAmount * 0.5; // 15 days = half of the subscription sale value
      break;
    case "30": // 1 Month
      adjustedTotalAmount = totalAmount; // 1 month = full value
      break;
    case "60": // 2 Months
      adjustedTotalAmount = totalAmount * 2; // 2 months = double the subscription sale value
      break;
    case "90": // 3 Months
      adjustedTotalAmount = totalAmount * 3; // 3 months = triple the subscription sale value
      break;
    default:
      adjustedTotalAmount = totalAmount;
      break;
  }

  const validResumeValue = parseFloat(resumeValue || "0");
  const validPortfolioValue = parseFloat(portfolioValue || "0");
  const validLinkedinValue = parseFloat(linkedinValue || "0");
  const validGithubValue = parseFloat(githubValue || "0");
  const validCoursesValue = parseFloat(coursesValue || "0");
  const validCustomValue = parseFloat(customValue || "0");
  const validBadgeValue = parseFloat(badgeValue || "0");

  // Now you can safely add them together
  const subscription_puls_addons = adjustedTotalAmount + validResumeValue +
    validPortfolioValue + validLinkedinValue + validGithubValue +
    validCoursesValue + validCustomValue + validBadgeValue;



  const totalTLCount = tlActiveCounts.reduce((sum, tl) => sum + tl.count, 0);

  return (
    <ProtectedRoute allowedRoles={["Finance", "Super Admin"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">Finance CRM</h1>
                {/* 🔁 Refresh Button */}
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="border border-gray-300 hover:bg-gray-100"
                >
                  {refreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-blue-700" />
                  )}
                  <span className="text-blue-700 font-medium">
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </span>
                </Button>
              </div>

              <p className="text-gray-600 mt-2">Track revenue and manage payments</p>
            </div>
            {/* <Button onClick={() => setShowRevenueDialog(true)}>Revenue</Button> */}
            <div className="flex gap-2">

              <Button
                variant="outline"
                className="bg-green-100 text-green-700 hover:bg-green-200"
                onClick={() => window.open("/finance/addons", "_blank")}
              >
                Addons Details
              </Button>

              <Button
                variant="outline"
                className="bg-red-100 text-red-700 hover:bg-red-200"
                onClick={() => window.open("/finance/UnpaidApplications", "_blank")}
              >
                Unpaid Applications
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex gap-1">
                    Revenue <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={loadRevenue}>
                    Quick Revenue Analysis
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => window.open("/finance/full-analysis", "_blank")}>
                    Complete Revenue Analysis
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadFullSalesCSV}>
                    Download Revenue Information
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRevealed(prev => ({ ...prev, total: !prev.total }))}>
                    {revealed.total ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue, "total")}</div>
                <p className="text-xs text-muted-foreground">{sales.length} total clients</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRevealed(prev => ({ ...prev, paid: !prev.paid }))}>
                    {revealed.paid ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(paidRevenue, "paid")}</div>
                <p className="text-xs text-muted-foreground">{paidCount} transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRevealed(prev => ({ ...prev, unpaid: !prev.unpaid }))}>
                    {revealed.unpaid ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(unpaidRevenue, "unpaid")}</div>
                <p className="text-xs text-muted-foreground">{unpaidCount} clients</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paused</CardTitle>
                <div className="flex items-center gap-2">
                  <Pause className="h-4 w-4 text-yellow-600" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRevealed(prev => ({ ...prev, paused: !prev.paused }))}>
                    {revealed.paused ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pausedRevenue, "paused")}</div>
                <p className="text-xs text-muted-foreground">{pausedCount} clients</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Got Placed</CardTitle>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRevealed(prev => ({ ...prev, gotPlaced: !prev.gotPlaced }))}>
                    {revealed.gotPlaced ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-blue-600 font-bold">
                  {revealed.gotPlaced ? `${gotPlacedCount} Clients placed` : "••••••"}
                </div>
                {/* <p className="text-xs text-muted-foreground">{sales.length} total clients</p> */}
              </CardContent>
            </Card>
          </div>



          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search by email, phone or lead_id"
                value={searchStore}
                onChange={(e) => setSearchStore(e.target.value)} // keep this to update the input value
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchTerm(searchStore); // call your search function
                  }
                }}
                className="max-w-md"
              />




              <div className="text-sm text-gray-500 flex items-center w-96">
                Today total active clients:&nbsp;
                <span className="text-md text-green-600 font-bold">{expiredCount}</span>
              </div>
            </div>
            {/* </div> */}

            <div className="flex space-x-4 justify-end">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(v === "all" ? "all" : Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[30, 50, 100, 150, 200, 500, 1000, 2000].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>


              <div className="w-72">
                <Select
                  value={selectedTLFilter ?? undefined}
                  onValueChange={(value) => {
                    if (value === "reset") {
                      setSelectedTLFilter(null);
                    } else {
                      setSelectedTLFilter(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Today Active Count List" />
                  </SelectTrigger>

                  <SelectContent>
                    <div className="px-2 py-1 text-xs font-bold text-gray-500">
                      Today Active Count List
                    </div>

                    {tlActiveCounts
                      .slice()
                      .sort((a, b) => b.count - a.count)
                      .map((tl) => (
                        <SelectItem
                          key={tl.associates_tl_email || "unassigned"}
                          value={tl.associates_tl_email || "unassigned"}
                          className="flex justify-between"
                        >
                          <span>{tl.associates_tl_email || "Unassigned"}</span> &nbsp;:&nbsp;
                          <span className="font-semibold text-blue-600">
                            {tl.count}
                          </span>
                        </SelectItem>
                      ))}

                    <div className="px-3 py-2 border-t flex justify-between font-semibold">
                      <span>Total Clients</span>
                      <span className="text-green-600">{totalTLCount}</span>
                    </div>

                    <SelectItem value="reset" className="text-red-600 font-medium">
                      Reset Filter
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FinanceStatus | "All")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Got Placed">Got Placed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={followUpFilter} onValueChange={(value) => setFollowUpFilter(value as "All dates" | "Today" | "Upcoming (7 Days)")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Follow Up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All dates">All dates</SelectItem>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="Upcoming (7 Days)">Upcoming (7 Days)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={emotionFilter} onValueChange={(v) => setEmotionFilter(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Feedback" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Feedback</SelectItem>
                  <SelectItem value="Happy">Happy</SelectItem>
                  <SelectItem value="Unhappy">Unhappy</SelectItem>
                </SelectContent>
              </Select>

              {activeTabView !== "main" ? (
                <Button
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                  onClick={() => setActiveTabView("main")}
                >
                  ← Back to All Clients
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    className="bg-orange-500 hover:bg-orange-400 text-white"
                    onClick={handleOpenNotOnboarded}
                  >
                    Not Onboarded Clients
                  </Button>
                  {/* <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    onClick={() => setActiveTabView("renewals")}
                  >
                    <RefreshCw className="w-4 h-4" /> Renewal Clients
                  </Button> */}
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={() => setActiveTabView("email_logs")}
                  >
                    <Mail className="w-4 h-4" /> Email History
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    onClick={() => window.open('/finance/cumulative-data', '_blank')}
                  >
                    <Star className="w-4 h-4" /> Cumulative Data
                  </Button>

                  <Button
                    variant="outline"
                    className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 gap-2"
                    onClick={() => setShowTestEmailDialog(true)}
                  >
                    <RefreshCw className="w-4 h-4" /> Test Automated Email
                  </Button>
                </div>
              )}

            </div>
          </div>

          {activeTabView === "notOnboarded" ? (
            // 🔁 NEW TAB: Not Onboarded Clients Table
            <div className="rounded-md border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>Client Id</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sale Value</TableHead>
                    <TableHead>Subscription Cycle</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Created At</TableHead>
                    {/* <TableHead>Action</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingNotOnboarded ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : notOnboardedClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        All clients are onboarded 🎉
                      </TableCell>
                    </TableRow>
                  ) : (
                    notOnboardedClients.map((client, index) => (
                      <TableRow key={client.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{client.lead_id}</TableCell>
                        {/* <TableCell>{client.lead_name || "-"}</TableCell> */}
                        <TableCell
                          className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                          onClick={() => window.open(`/leads/${client.lead_id}`, "_blank")}
                        >
                          {client.lead_name || "-"}
                        </TableCell>
                        <TableCell>{client.email || "-"}</TableCell>
                        <TableCell>${client.sale_value}</TableCell>
                        <TableCell>{client.subscription_cycle} days</TableCell>
                        <TableCell>Finance Team A</TableCell>
                        <TableCell>Not Onboarded</TableCell>
                        <TableCell>{new Date(client.closed_at).toLocaleDateString()}</TableCell>

                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {feedbackMsg && (
                <div
                  className={`p-3 rounded-md text-white mb-4 ${feedbackMsg.type === "success" ? "bg-green-600" : "bg-red-600"
                    }`}
                >
                  {feedbackMsg.text}
                </div>
              )}
            </div>
          ) : activeTabView === "renewals" ? (
            <RenewalsList />
          ) : activeTabView === "email_logs" ? (
            <EmailLogView />
          ) : (
            // 🔁 EXISTING MAIN TABLE STAYS HERE



            <div className="rounded-md border mt-4">


              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>

                    <TableHead
                      className="cursor-pointer items-center gap-1"
                      onClick={() => handleSort("lead_id")}
                    >
                      <div className="flex flex-center gap-1">
                        ClientID
                        <span
                          className={`text-xs leading-none ${sortField === "lead_id" && sortOrder === "desc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-xs leading-none ${sortField === "lead_id" && sortOrder === "asc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▼
                        </span>
                      </div>
                    </TableHead>

                    <TableHead
                      className="cursor-pointer items-center gap-1"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex flex-center gap-1">
                        Name
                        <span
                          className={`text-xs leading-none ${sortField === "name" && sortOrder === "desc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-xs leading-none ${sortField === "name" && sortOrder === "asc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▼
                        </span>
                      </div>
                    </TableHead>

                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>

                    <TableHead
                      className="cursor-pointer items-center gap-1"
                      onClick={() => handleSort("sale_value")}
                    >
                      <div className="flex flex-center gap-1">
                        Sale value
                        <span
                          className={`text-xs leading-none ${sortField === "sale_value" && sortOrder === "desc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-xs leading-none ${sortField === "sale_value" && sortOrder === "asc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▼
                        </span>
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer items-center gap-1"
                      onClick={() => handleSort("subscription_cycle")}
                    >
                      <div className="flex flex-center gap-1">
                        Subscription Cycle
                        <span
                          className={`text-xs leading-none ${sortField === "subscription_cycle" && sortOrder === "desc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-xs leading-none ${sortField === "subscription_cycle" && sortOrder === "asc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▼
                        </span>
                      </div>
                    </TableHead>
                    {/* <TableHead>Subscription Cycle</TableHead> */}
                    <TableHead
                      className="cursor-pointer items-center gap-1"
                      onClick={() => handleSort("assigned_to")}
                    >
                      <div className="flex flex-center gap-1">
                        Assigned To
                        <span
                          className={`text-xs leading-none ${sortField === "assigned_to" && sortOrder === "desc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-xs leading-none ${sortField === "assigned_to" && sortOrder === "asc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▼
                        </span>
                      </div>
                    </TableHead>
                    {/* <TableHead>Stage</TableHead> */}

                    <TableHead>Feedback</TableHead>
                    <TableHead
                      className="cursor-pointer items-center gap-1"
                      onClick={() => handleSort("oldest_sale_done_at")}
                    >
                      <div className="flex flex-center gap-1">
                        SaledoneAt
                        <span
                          className={`text-xs leading-none ${sortField === "oldest_sale_done_at" && sortOrder === "desc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-xs leading-none ${sortField === "oldest_sale_done_at" && sortOrder === "asc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▼
                        </span>
                      </div>
                    </TableHead>

                    <TableHead
                      className="cursor-pointer items-center gap-1"
                      onClick={() => handleSort("onboarded_date")}
                    >
                      <div className="flex flex-center gap-1">
                        Onboarded/lastPaymentAt
                        <span
                          className={`text-xs leading-none ${sortField === "onboarded_date" && sortOrder === "desc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-xs leading-none ${sortField === "onboarded_date" && sortOrder === "asc"
                            ? "text-blue-600"
                            : "text-gray-400"
                            }`}
                        >
                          ▼
                        </span>
                      </div>
                    </TableHead>

                    <TableHead
                      className="cursor-pointer items-center gap-1"
                      onClick={() => handleSort("next_renewal_date")}
                    >
                      <div className="flex flex-center gap-1">
                        Next_Renewal_Date
                        <span
                          className={`text-xs leading-none ${sortField === "next_renewal_date" && sortOrder === "desc"
                            ? "text-blue-600" : "text-gray-400"}`}> ▲</span>
                        <span className={`text-xs leading-none ${sortField === "next_renewal_date" && sortOrder === "asc"
                          ? "text-blue-600" : "text-gray-400"}`}> ▼</span>
                      </div>
                    </TableHead>

                    {/* <TableHead>Next Renewal Date</TableHead> */}
                    <TableHead>Stage</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sortedSales.length > 0 ? (
                    paginatedSales.map((sale, idx) => {
                      // Treat these statuses as "finalized"
                      const stage = String(sale.finance_status || "").trim().toLowerCase();
                      const isFinalized = ["unpaid", "got placed"].includes(stage);
                      const forClosed = ["closed", "unpaid", "got placed"].includes(stage);

                      return (
                        <TableRow key={sale.id}>
                          {/* <TableCell>{idx + 1}</TableCell> */}
                          <TableCell>{idx + 1 + (currentPage - 1) * (pageSize === "all" ? sortedSales.length : pageSize)}</TableCell>


                          <TableCell className="font-medium">{sale.lead_id}</TableCell>

                          <TableCell
                            className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                            onClick={() => window.open(`/leads/${sale.lead_id}`, "_blank")}
                          >
                            {sale.leads?.name ?? "-"}
                          </TableCell>

                          <TableCell className="max-w-[160px] break-words whitespace-normal">
                            {sale.email}
                          </TableCell>

                          <TableCell className="max-w-[160px] break-words whitespace-normal">
                            {sale.leads?.phone ?? "-"}
                          </TableCell>

                          <TableCell>{formatCurrency(sale.sale_value)}</TableCell>
                          <TableCell>{sale.subscription_cycle} days</TableCell>

                          <TableCell>{sale.associates_tl_email}</TableCell>

                          <TableCell>
                            {sale.oldest_sale_done_at
                              ? new Date(sale.oldest_sale_done_at).toLocaleDateString("en-GB")
                              : "-"}
                          </TableCell>

                          <TableCell>
                            {sale.feedback ? (
                              <div className="flex flex-col gap-1">
                                {renderStars(sale.feedback.rating)}
                                <span className={`text-xs font-semibold ${sale.feedback.isHappy ? "text-green-600" : "text-red-600"}`}>
                                  {sale.feedback.isHappy ? "Happy" : "Unhappy"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">No feedback yet</span>
                            )}
                          </TableCell>

                          <TableCell className="flex items-center gap-2">
                            {editingLeadId === sale.lead_id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="date"
                                  value={newOnboardDate}
                                  onChange={(e) => setNewOnboardDate(e.target.value)}
                                  className="w-40"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleChangeOnboardDate(sale.lead_id)}
                                  disabled={updatingDate || !newOnboardDate}
                                  className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  {updatingDate ? "Updating..." : "Change"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingLeadId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                {sale.onboarded_date
                                  ? new Date(sale.onboarded_date).toLocaleDateString("en-GB")
                                  : "-"}
                                <button
                                  onClick={() => {
                                    setEditingLeadId(sale.lead_id);
                                    setNewOnboardDate(
                                      sale.onboarded_date
                                        ? new Date(sale.onboarded_date).toISOString().slice(0, 10)
                                        : ""
                                    );
                                  }}
                                  className="text-gray-500 hover:text-blue-600"
                                  title="Edit onboarded date"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </TableCell>




                          {/* Next Renewal Date — render nothing if Closed */}
                          <TableCell>
                            {isFinalized
                              ? null
                              : calculateNextRenewal(sale.onboarded_date, sale.subscription_cycle)}
                          </TableCell>


                          <TableCell>
                            <Badge className={getStageColor(sale.finance_status)}>
                              {sale.finance_status}
                            </Badge>
                          </TableCell>


                          {/* Deadline — hide if finalized */}
                          <TableCell>
                            {forClosed
                              ? null
                              : getRenewWithinBadge(sale.onboarded_date || "", sale.subscription_cycle)}
                          </TableCell>

                          {/* Actions — disable if finalized */}
                          <TableCell>

                            <Select
                              value={actionSelections[sale.id] || ""}
                              onValueChange={(value) => {
                                // setActionSelections((prev) => ({ ...prev, [sale.id]: value }));
                                const status = value as FinanceStatus;

                                if (value === "Paid") {
                                  // handlePaymentDialogOpen(sale.lead_id);  // Pass the selected sale's lead_id
                                  window.open(`/finance/renewal/${sale.lead_id}`, "_blank");

                                } else if (["Closed", "Paused", "Unpaid", "Got Placed"].includes(value)) {
                                  if (!window.confirm(`Are you sure you want to update status as ${value} ?`)) return;
                                  setSelectedSaleId(sale.id);
                                  setSelectedFinanceStatus(value as FinanceStatus);
                                  setShowReasonDialog(true);
                                } else {
                                  handleFinanceStatusUpdate(sale.id, status);
                                }
                              }}
                            // disabled={!!actionSelections[sale.id]}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Paid">Paid</SelectItem>
                                <SelectItem value="Unpaid">Unpaid</SelectItem>
                                <SelectItem value="Paused">Paused</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                                <SelectItem value="Got Placed">Got Placed</SelectItem>
                              </SelectContent>
                            </Select>

                          </TableCell>


                          {/* Reason */}
                          <TableCell className="text-center">
                            {sale.reason_for_close ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="hover:text-blue-600">
                                    <MessageSquare className="w-5 h-5" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] bg-white shadow-lg border p-4 text-sm text-gray-700">
                                  Reason: '{sale.reason_for_close}'
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span className="text-gray-400 text-xs italic">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {followUpFilter === "Today"
                          ? "No follow ups today"
                          : "No information here"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-2">
                <Button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                  Prev
                </Button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <Button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                  Next
                </Button>
              </div>


            </div>

          )}

          {/* 
          <Dialog
            open={showReasonDialog}
            onOpenChange={(open) => {
              // Prevent closing by outside click or ESC
              if (!open) return;
            }}
          >
            <DialogContent
              hideCloseIcon
              aria-describedby="reason-details-dialog-box"
              className="sm:max-w-md"
              onInteractOutside={(e) => e.preventDefault()} // Disable outside click to close
            >
              <DialogHeader>
                <DialogTitle>Reason for {selectedFinanceStatus}</DialogTitle>
              </DialogHeader>

              <Textarea
                placeholder={`Enter reason for ${selectedFinanceStatus}`}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                className="min-h-[100px]"
              />

              <div className="flex justify-between gap-3 mt-4">
                <Button
                  variant="ghost"
                  className="w-full bg-black text-white hover:bg-gray-800"
                  onClick={() => {
                    // 🔁 Reset dropdown to "Select Status"
                    if (selectedSaleId) {
                      setActionSelections((prev) => ({
                        ...prev,
                        [selectedSaleId]: "", // reset to "Select Status"
                      }));
                    }

                    setShowReasonDialog(false);
                    setSelectedSaleId(null);
                    setSelectedFinanceStatus(null);
                    setReasonText("");
                  }}
                >
                  Cancel
                </Button>

                <Button
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                  onClick={async () => {
                    if (!selectedSaleId || !selectedFinanceStatus || !reasonText.trim()) {
                      alert("Please provide a reason.");
                      return;
                    }

                    const { error } = await supabase
                      .from("sales_closure")
                      .update({
                        finance_status: selectedFinanceStatus,
                        reason_for_close: reasonText.trim(),
                      })
                      .eq("id", selectedSaleId);

                    if (error) {
                      console.error("Failed to update:", error);
                      alert("❌ Failed to save status.");
                      return;
                    }

                    setSales((prev) =>
                      prev.map((s) =>
                        s.id === selectedSaleId
                          ? {
                            ...s,
                            finance_status: selectedFinanceStatus,
                            reason_for_close: reasonText.trim(),
                          }
                          : s
                      )
                    );

                    setActionSelections((prev) => ({
                      ...prev,
                      [selectedSaleId]: selectedFinanceStatus,
                    }));

                    setShowReasonDialog(false);
                    setSelectedSaleId(null);
                    setSelectedFinanceStatus(null);
                    setReasonText("");
                  }}
                >
                  Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog> */}

          <Dialog
            open={showReasonDialog}
            onOpenChange={(open) => {
              if (!open) return; // prevent accidental close
            }}
          >
            <DialogContent
              hideCloseIcon
              aria-describedby="reason-details-dialog-box"
              className="sm:max-w-md"
              onInteractOutside={(e) => e.preventDefault()} // disable outside click
            >
              <DialogHeader>
                <DialogTitle>Reason for {selectedFinanceStatus}</DialogTitle>
              </DialogHeader>

              {/* INPUT */}
              <Textarea
                placeholder={`Enter reason for ${selectedFinanceStatus}`}
                value={tempReasonInput}
                onChange={(e) => setTempReasonInput(e.target.value)}
                className="min-h-[100px]"
              />

              <div className="flex justify-between gap-3 mt-4">

                {/* CANCEL */}
                <Button
                  variant="ghost"
                  className="w-full bg-black text-white hover:bg-gray-800"
                  onClick={() => {
                    if (selectedSaleId) {
                      setActionSelections((prev) => ({
                        ...prev,
                        [selectedSaleId]: "",
                      }));
                    }

                    setShowReasonDialog(false);
                    setSelectedSaleId(null);
                    setSelectedFinanceStatus(null);
                    setTempReasonInput("");
                  }}
                >
                  Cancel
                </Button>

                {/* SUBMIT */}
                <Button
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                  onClick={async () => {
                    const finalReason = tempReasonInput.trim();

                    if (!selectedSaleId || !selectedFinanceStatus || !finalReason) {
                      alert("Please provide a reason.");
                      return;
                    }

                    const { error } = await supabase
                      .from("sales_closure")
                      .update({
                        finance_status: selectedFinanceStatus,
                        reason_for_close: finalReason,
                      })
                      .eq("id", selectedSaleId);

                    if (error) {
                      console.error("Failed to update:", error);
                      alert("❌ Failed to save status.");
                      return;
                    }

                    // Update UI
                    setSales((prev) =>
                      prev.map((s) =>
                        s.id === selectedSaleId
                          ? {
                            ...s,
                            finance_status: selectedFinanceStatus,
                            reason_for_close: finalReason,
                          }
                          : s
                      )
                    );

                    // Update dropdown to show correct status
                    setActionSelections((prev) => ({
                      ...prev,
                      [selectedSaleId]: selectedFinanceStatus,
                    }));

                    // Reset
                    setShowReasonDialog(false);
                    setSelectedSaleId(null);
                    setSelectedFinanceStatus(null);
                    setTempReasonInput("");
                  }}
                >
                  Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>


          <Dialog open={showCloseDialog} onOpenChange={(open) => {
            if (!open) return;
          }}>

            <DialogContent
              hideCloseIcon
              aria-describedby="ReasonForClose"
              className="sm:max-w-md"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Reason for Closing</DialogTitle>
              </DialogHeader>

              <Textarea
                placeholder="Enter reason for closing this ticket..."
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="min-h-[100px]"
              />

              <div className="flex justify-between gap-3 mt-4">
                <Button
                  variant="ghost"
                  className="w-full bg-black text-white hover:bg-gray-800"
                  onClick={() => {
                    setShowCloseDialog(false);
                    if (selectedSaleId) {
                      setActionSelections((prev) => ({
                        ...prev,
                        [selectedSaleId]: "",
                      }));
                    }
                    setSelectedSaleId(null);
                    setClosingNote("");
                  }}
                >
                  Cancel
                </Button>

                <Button
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                  onClick={async () => {
                    if (!selectedSaleId) return;

                    const { error } = await supabase
                      .from("sales_closure")
                      .update({
                        finance_status: "Closed",
                        reason_for_close: closingNote.trim(),
                      })
                      .eq("id", selectedSaleId);

                    if (error) {
                      console.error("Error saving close reason:", error);
                      return;
                    }

                    setSales((prev) =>
                      prev.map((sale) =>
                        sale.id === selectedSaleId
                          ? { ...sale, finance_status: "Closed", reason_for_close: closingNote.trim() }
                          : sale
                      )
                    );

                    setShowCloseDialog(false);
                    setActionSelections((prev) => ({
                      ...prev,
                      [selectedSaleId]: "",
                    }));
                    setClosingNote("");
                    setSelectedSaleId(null);
                  }}
                >
                  Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showRevenueDialog} onOpenChange={setShowRevenueDialog}>
            <DialogContent aria-describedby="Monthly-revenue-breakdown" className="max-w-2xl sm:max-w-5xl">
              <DialogHeader>
                <DialogTitle>Monthly Revenue Breakdown</DialogTitle>
              </DialogHeader>

              <div className="flex space-x-4 mb-4">
                <Button
                  variant={activeTab === "table" ? "default" : "outline"}
                  onClick={() => setActiveTab("table")}
                >
                  Table View
                </Button>
                <Button
                  variant={activeTab === "chart" ? "default" : "outline"}
                  onClick={() => setActiveTab("chart")}
                >
                  Visual (Chart) View
                </Button>
              </div>

              {activeTab === "table" ? (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <label className="text-sm font-medium">Select Year:</label>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={tableYearFilter}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTableYearFilter(value === "all" ? "all" : parseInt(value));
                      }}
                    >
                      <option value="all">All</option>
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left border">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-4 py-2 border">Month</th>
                          <th className="px-4 py-2 border">In-Month Revenue</th>
                          <th className="px-4 py-2 border">Subscription Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyBreakdown
                          .filter((monthRow) =>
                            tableYearFilter === "all"
                              ? true
                              : monthRow.month.includes(tableYearFilter.toString())
                          )
                          .filter((monthRow) => monthRow.proratedRevenue > 0)
                          .map((monthRow) => (
                            <tr key={monthRow.month}>
                              <td className="px-4 py-2 border">{monthRow.month}</td>
                              <td className="px-4 py-2 border">${monthRow.proratedRevenue.toLocaleString("en-US")}</td>
                              <td className="px-4 py-2 border">${monthRow.inMonthRevenue.toLocaleString("en-US")}</td>
                            </tr>
                          ))}

                        <tr className="font-semibold bg-gray-50">
                          <td className="px-4 py-2 border">Total</td>
                          <td className="px-4 py-2 border">
                            ${monthlyBreakdown.reduce((sum, m) => sum + m.proratedRevenue, 0).toLocaleString("en-US")}
                          </td>
                          <td className="px-4 py-2 border">
                            ${monthlyBreakdown.reduce((sum, m) => sum + m.inMonthRevenue, 0).toLocaleString("en-US")}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="flex justify-end mt-4">
                      <Button onClick={handleDownloadCSV} variant="outline" className="bg-blue-600 hover:bg-blue-500 text-white text-sm">
                        Download CSV
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <label className="text-sm font-medium mr-2">Select Year:</label>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                  </div>

                  <div className="w-full h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="proratedRevenue" fill="#FB1616" name="In-Month Revenue" />
                        <Bar dataKey="inMonthRevenue" fill="#3b82f6" name="Subscription Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* 🧪 Test Automated Email Dialog */}
          <Dialog open={showTestEmailDialog} onOpenChange={setShowTestEmailDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Test Automated Renewal Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground font-medium">
                  Send a sample renewal reminder email to verify the Microsoft Graph API integration.
                </p>
                <div className="space-y-2">
                  <label htmlFor="test-email" className="text-sm font-medium">Recipient Email</label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="Enter email address..."
                    value={testEmailInput}
                    onChange={(e) => setTestEmailInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => setShowTestEmailDialog(false)}>Cancel</Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest}
                >
                  {sendingTest ? "Sending..." : "Send Test Email"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}