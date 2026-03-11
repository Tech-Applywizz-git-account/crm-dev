//app/finance-associates/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit, Phone, History, Eye, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { ZoomPhoneEmbed, ZoomPhoneEmbedHandle } from "@/components/ZoomPhoneEmbed";
import { useRef } from "react";
import dayjs from "dayjs";
import { format } from "date-fns";
import Papa from "papaparse";



import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

type FinanceStatus = "Paid" | "Unpaid" | "Paused" | "Closed" | "Got Placed";

type TLClientCount = {
  associates_tl_email: string | null;
  paid_leads_count: number;
};


interface SalesClosure {
  id: string;
  lead_id: string;
  email: string;
  sale_value: number;
  subscription_cycle: number;
  closed_at: string;
  onboarded_date?: string;
  finance_status: FinanceStatus;
  reason_for_close?: string;
  associates_tl_name?: string;
  associates_tl_email?: string;
  leads?: {
    name: string;
    phone: string;
  };
  oldest_closed_at?: string;
  account_assigned_name?: string;
}

interface CallHistoryEntry {
  id: string;
  date: string;
  stage: string;
  notes: string;
  assigned_to: string;
  duration?: number;
  recording_url?: string;
}
export default function FinanceAssociatesPage() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SalesClosure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FinanceStatus | "All">("All");
  const [actionSelections, setActionSelections] = useState<Record<string, string>>({});
  const [followUpFilter, setFollowUpFilter] = useState<"All" | "Today" | "Upcoming7Days">("Today");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [closingNote, setClosingNote] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRowCount, setCsvRowCount] = useState<number>(0);
  const [parsedCSVData, setParsedCSVData] = useState<any[]>([]);
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ saleId: string; newStatus: FinanceStatus | null } | null>(null);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [selectedReasonType, setSelectedReasonType] = useState<FinanceStatus | null>(null);
  const [reasonNote, setReasonNote] = useState("");
  const [activeClientsCount, setActiveClientsCount] = useState<number>(0);

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [tlClientCounts, setTlClientCounts] = useState<
    { associates_tl_email: string | null; paid_leads_count: number }[]
  >([]);


  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  // const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedOnboardDate, setSelectedOnboardDate] = useState<Date | null>(null);
  const [updatedSaleId, setUpdatedSaleId] = useState<string | null>(null); // Track updated sale ID


  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [unassignedRecords, setUnassignedRecords] = useState<any[]>([]);
  const [financeAssociates, setFinanceAssociates] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const [matchIndex, setMatchIndex] = useState(0);
  const [matches, setMatches] = useState<Element[]>([]);


  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [onboardDate, setOnboardDate] = useState<Date | null>(null);
  const [subscriptionMonths, setSubscriptionMonths] = useState("1");

  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [leadIdToRemove, setLeadIdToRemove] = useState<string | null>(null);


  const { user, hasAccess } = useAuth();
  const router = useRouter();
  const zoomEmbedRef = useRef<ZoomPhoneEmbedHandle>(null);

  // States for Call History
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<{ id: string, name: string, business_id: string, phone: string, email: string } | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // States for Adding Call Note
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [callNote, setCallNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);





  const fetchSales = async () => {
    if (!user) return;

    let salesQuery = supabase
      .from("sales_closure")
      .select("*")
      .not("onboarded_date", "is", null)
      .gt("application_sale_value", 0)    // Ensures application_sale_value is greater than 0
      .not("application_sale_value", "is", null); // Ensures application_sale_value is not null


    // Only apply TL filters if not Super Admin
    if (user.role !== "Super Admin" && user.role !== "Finance") {
      const { name, email } = user;
      salesQuery = salesQuery
        .eq("associates_tl_email", email)
        .eq("associates_tl_name", name);
    }

    const { data: salesData, error: salesError } = await salesQuery;

    if (salesError) {
      console.error("Failed to fetch sales data:", salesError);
      return;
    }


    // 2. Get the latest record per lead_id
    const latestSalesMap = new Map<string, SalesClosure>();
    for (const record of salesData ?? []) {
      const existing = latestSalesMap.get(record.lead_id);

      const existingDate = existing?.onboarded_date || existing?.closed_at || "";
      const currentDate = record?.onboarded_date || record?.closed_at || "";

      if (!existing || new Date(currentDate) > new Date(existingDate)) {
        latestSalesMap.set(record.lead_id, record);
      }
    }

    const latestSales = Array.from(latestSalesMap.values());


    // 2. Get the count of "Paid" records from the most recent ones
    const paidClients = latestSales.filter((sale) => sale.finance_status === "Paid");
    setActiveClientsCount(paidClients.length); // Update the count of active clients


    // 🧠 Step: Build a map of oldest closed_at per lead_id
    const oldestDatesMap = new Map<string, string>();
    for (const record of salesData ?? []) {
      const prev = oldestDatesMap.get(record.lead_id);
      if (!prev || new Date(record.closed_at) < new Date(prev)) {
        oldestDatesMap.set(record.lead_id, record.closed_at);
      }
    }


    // 3. Enrich with name & phone
    const leadIds = latestSales.map((s) => s.lead_id);

    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select("business_id, name, phone")
      .in("business_id", leadIds);

    if (leadsError) {
      console.error("Failed to fetch leads data:", leadsError);
      return;
    }

    const leadMap = new Map(
      leadsData?.map((l) => [l.business_id, { name: l.name, phone: l.phone }])
    );

    const enrichedSales = latestSales.map((sale) => ({
      ...sale,
      leads: leadMap.get(sale.lead_id) || { name: "-", phone: "-" },
      associates_tl_name: sale.associates_tl_name || "-", // Ensure associates_tl_name is included
      oldest_closed_at: oldestDatesMap.get(sale.lead_id) || sale.closed_at,
    }));

    // ----------------------------------------------
    const tlCountsMap = new Map<string | null, number>();

    // Loop only through latest records
    latestSales.forEach((sale) => {
      if (sale.finance_status === "Paid") {
        const tlEmail = sale.associates_tl_email || null;
        tlCountsMap.set(tlEmail, (tlCountsMap.get(tlEmail) || 0) + 1);
      }
    });

    // Convert map → array for UI
    const tlCountsArray = Array.from(tlCountsMap.entries()).map(([email, count]) => ({
      associates_tl_email: email,
      paid_leads_count: count,
    }));

    // Update state
    setTlClientCounts(tlCountsArray);

    setSales(enrichedSales);
  };



  const fetchUnassignedSales = async () => {
    const { data, error } = await supabase
      .from("sales_closure")
      .select("id, lead_id, email, lead_name, company_application_email, closed_at, onboarded_date, associates_tl_email, associates_tl_name")
      .or("associates_tl_email.is.null,associates_tl_email.eq.,associates_tl_name.is.null,associates_tl_name.eq.") // null or empty
      .order("closed_at", { ascending: false }); // 🟢 oldest first

    console.log(data);

    if (error) {
      console.error("Error fetching unassigned sales:", error);
      return;
    }

    // ✅ Keep the *oldest* record per lead_id
    const oldestMap = new Map<string, any>();
    for (const record of data ?? []) {
      if (!oldestMap.has(record.lead_id)) oldestMap.set(record.lead_id, record);
    }

    setUnassignedRecords(Array.from(oldestMap.values()));
  };


  const fetchFinanceAssociates = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, user_email")
      .eq("roles", "Finance Associate");

    if (error) {
      console.error("Error fetching finance associates:", error);
      return;
    }

    setFinanceAssociates(data ?? []);
  };

  const assignAssociate = async (leadId: string, fullName: string, email: string) => {
    const { error } = await supabase
      .from("sales_closure")
      .update({
        associates_tl_name: fullName,
        associates_tl_email: email,
      })
      .eq("lead_id", leadId);

    if (error) {
      console.error("Error assigning associate:", error);
      alert("❌ Failed to assign associate.");
      return;
    }

    alert(`✅ Assigned ${fullName} to lead ${leadId}`);
    fetchUnassignedSales(); // refresh
  };

  const renderSortableHeader = (label: string, field: string) => (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span
          className={`text-[10px] ${sortField === field && sortOrder === "asc"
            ? "text-blue-600"
            : "text-gray-400"
            }`}
        >
          ▲
        </span>
        <span
          className={`text-[10px] ${sortField === field && sortOrder === "desc"
            ? "text-blue-600"
            : "text-gray-400"
            }`}
        >
          ▼
        </span>
      </div>
    </TableHead>
  );

  useEffect(() => {
    if (user === null) return;
    setLoading(false);
    if (!hasAccess("finance-associates")) {
      router.push("/unauthorized");
    }
  }, [user]);

  useEffect(() => {
    // Clear previous highlights
    const prev = document.querySelectorAll(".highlight-search");
    prev.forEach((el) => {
      el.classList.remove("highlight-search");
      // Remove custom background style if applied
      (el as HTMLElement).style.backgroundColor = "";
    });

    if (!searchTerm.trim()) {
      setMatches([]);
      setMatchIndex(0);
      return;
    }

    const term = searchTerm.toLowerCase();
    const body = document.body;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);

    const found: Element[] = [];

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;
      if (!parent) continue;

      const text = node.textContent?.toLowerCase() || "";
      if (text.includes(term)) {
        found.push(parent);
        parent.classList.add("highlight-search");
        (parent as HTMLElement).style.backgroundColor = "yellow";
      }
    }

    setMatches(found);
    setMatchIndex(0);

    // Scroll to the first result if found
    if (found.length > 0) {
      found[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchTerm]);

  useEffect(() => {
    if (user) {
      fetchSales();
    }
  }, [user]);

  useEffect(() => {
    if (user && hasAccess("finance-associates")) {
      fetchSales();
    }
  }, [user]);

  // ✅ After all hooks declared, do the early return
  if (loading) return <p className="p-6 text-gray-600">Loading...</p>;

  // ⬇️ Continue with the rest of your logic and JSX...



  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }


  const getStageColor = (status: FinanceStatus) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Unpaid":
        return "bg-red-100 text-red-800";
      case "Paused":
        return "bg-yellow-100 text-yellow-800";
      case "Got Placed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const updateFinanceStatus = async (saleId: string, newStatus: FinanceStatus) => {
    const { error } = await supabase
      .from("sales_closure")
      .update({
        finance_status: newStatus,
      })
      .eq("id", saleId);

    if (error) {
      console.error("Error updating status:", error);
    } else {
      setSales((prev) =>
        prev.map((s) => (s.id === saleId ? { ...s, finance_status: newStatus } : s))
      );
    }
  };


  const getRenewWithinBadge = (createdAt: string, subscriptionCycle: number): React.ReactNode => {
    if (!createdAt || !subscriptionCycle) return null;

    const startDate = new Date(createdAt);
    const today = new Date();

    // Strip time from both dates for clean date comparison
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffInDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays < subscriptionCycle) {
      const daysLeft = subscriptionCycle - diffInDays;
      return (
        <Badge className="bg-green-100 text-green-800">
          Within {daysLeft} day{daysLeft !== 1 ? "s" : ""}
        </Badge>
      );
    } else if (diffInDays === subscriptionCycle) {
      return <Badge className="bg-yellow-100 text-gray-800">Today last date</Badge>;
    } else {
      const overdue = diffInDays - subscriptionCycle;
      return (
        <Badge className="bg-red-100 text-red-800">
          Overdue by {overdue} day{overdue !== 1 ? "s" : ""}
        </Badge>
      );
    }
  };
  const removeAssociateFromLead = async (leadId: string) => {
    const { error } = await supabase
      .from("sales_closure")
      .update({
        associates_tl_email: null,
        associates_tl_name: null,
      })
      .eq("lead_id", leadId);

    if (error) {
      console.error("❌ Error removing associate:", error);
      alert("Failed to remove associate TL.");
      return false;
    }

    return true; // ✅ success indicator
  };


  // const filteredSales = sales
  //   .filter((sale) => {
  //     const matchesSearch =
  //       sale.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       sale.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //         sale.leads?.phone?.toLowerCase().includes(searchTerm.toLowerCase());


  //     const matchesStatus =
  //       statusFilter === "All" || sale.finance_status === statusFilter;

  //     const onboardedDate = sale.onboarded_date ? new Date(sale.onboarded_date) : null;
  //     const today = new Date();
  //     const subscriptionCycle = sale.subscription_cycle || 0; // Default to 0 if not set
  //     const diffInDays = onboardedDate
  //       ? Math.floor((today.getTime() - onboardedDate.getTime()) / (1000 * 60 * 60 * 24))
  //       : null;

  //     const matchesFollowUp =
  //       followUpFilter === "All" || (diffInDays !== null && diffInDays >= subscriptionCycle);

  //     return matchesSearch && matchesStatus && matchesFollowUp;
  //   })
  //   .sort((a, b) => {
  //     const dateA = new Date(a.onboarded_date || a.closed_at || "");
  //     const dateB = new Date(b.onboarded_date || b.closed_at || "");
  //     return  dateB.getTime()-dateA.getTime(); // 🟢 descending
  //   });

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.leads?.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || sale.finance_status === statusFilter;

    const onboardedDate = sale.onboarded_date ? new Date(sale.onboarded_date) : null;
    const today = new Date();
    const subscriptionCycle = sale.subscription_cycle || 0;
    const diffInDays = onboardedDate
      ? Math.floor(
        (today.getTime() - onboardedDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      : null;

    const matchesFollowUp =
      followUpFilter === "All" ||
      (followUpFilter === "Today" && diffInDays !== null && diffInDays >= subscriptionCycle) ||
      (followUpFilter === "Upcoming7Days" && (() => {
        if (!onboardedDate || !subscriptionCycle) return false;
        const renewalDate = new Date(onboardedDate);
        renewalDate.setDate(renewalDate.getDate() + subscriptionCycle);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const sevenDaysLater = new Date(todayStart);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        return renewalDate >= todayStart && renewalDate <= sevenDaysLater;
      })());

    return matchesSearch && matchesStatus && matchesFollowUp;
  });

  const sortedSales = [...filteredSales].sort((a, b) => {
    // default sort: newest onboarded/closed first
    if (!sortField) {
      const dateA = new Date(a.onboarded_date || a.closed_at || "").getTime();
      const dateB = new Date(b.onboarded_date || b.closed_at || "").getTime();
      return dateB - dateA;
    }

    const direction = sortOrder === "asc" ? 1 : -1;

    if (sortField === "lead_id") {
      // if your IDs like AWL-123, sort by number
      const aNum = parseInt(a.lead_id.split("-").pop() || "0", 10);
      const bNum = parseInt(b.lead_id.split("-").pop() || "0", 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return (aNum - bNum) * direction;
      }
      return a.lead_id.localeCompare(b.lead_id) * direction;
    }

    if (sortField === "name") {
      const nameA = (a.leads?.name ?? "").toLowerCase();
      const nameB = (b.leads?.name ?? "").toLowerCase();
      return nameA.localeCompare(nameB) * direction;
    }

    if (sortField === "sale_value") {
      return (a.sale_value - b.sale_value) * direction;
    }

    if (sortField === "subscription_cycle") {
      return ((a.subscription_cycle || 0) - (b.subscription_cycle || 0)) * direction;
    }

    if (sortField === "finance_status") {
      const sA = a.finance_status || "";
      const sB = b.finance_status || "";
      return sA.localeCompare(sB) * direction;
    }

    if (sortField === "sale_date") {
      const dateA = new Date(a.oldest_closed_at || a.closed_at || "").getTime();
      const dateB = new Date(b.oldest_closed_at || b.closed_at || "").getTime();
      return (dateA - dateB) * direction;
    }

    if (sortField === "onboarded_date") {
      const dateA = new Date(a.onboarded_date || "").getTime();
      const dateB = new Date(b.onboarded_date || "").getTime();
      return (dateA - dateB) * direction;
    }

    if (sortField === "renewal_date") {
      const getRenewal = (s: SalesClosure) => {
        if (!s.onboarded_date || !s.subscription_cycle) return Infinity;
        const d = new Date(s.onboarded_date);
        d.setDate(d.getDate() + s.subscription_cycle);
        return d.getTime();
      };
      const dateA = getRenewal(a);
      const dateB = getRenewal(b);
      return (dateA - dateB) * direction;
    }

    if (sortField === "tl") {
      const tlA = (a.associates_tl_name || a.associates_tl_email || "").toLowerCase();
      const tlB = (b.associates_tl_name || b.associates_tl_email || "").toLowerCase();
      return tlA.localeCompare(tlB) * direction;
    }

    return 0;
  });


  const handleCSVUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const rows = results.data as {
          lead_id: string;
          associates_email: string;
          associates_name: string;
          associates_tl_email: string;
          associates_tl_name: string;
        }[];

        for (const row of rows) {
          const { error } = await supabase
            .from("sales_closure")
            .update({
              associates_email: row.associates_email?.trim(),
              associates_name: row.associates_name?.trim(),
              associates_tl_email: row.associates_tl_email?.trim(),
              associates_tl_name: row.associates_tl_name?.trim(),
            })
            .eq("lead_id", row.lead_id?.trim());

          if (error) {
            console.error(`Failed to update lead_id: ${row.lead_id}`, error);
          }
        }

        alert("✅ CSV processed and updates sent to Supabase.");
        fetchSales(); // Refresh table
      },
      error: function (err) {
        console.error("Error parsing CSV:", err);
        alert("❌ Failed to parse CSV file.");
      },
    });
  };

  const handleRefresh = async () => {
    setLoading(true);

    try {
      // 🧠 Re-fetch all core data for this page
      await fetchSales();
      await fetchUnassignedSales();
      await fetchFinanceAssociates();
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setLoading(false);
    }
  };


  const handleParseCSV = (file: File) => {
    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const rows = results.data as {
          lead_id: string;
          associates_email: string;
          associates_name: string;
          associates_tl_email: string;
          associates_tl_name: string;
        }[];

        setParsedCSVData(rows);
        setCsvRowCount(rows.length);
      },
      error: function (err) {
        console.error("Error parsing CSV:", err);
        alert("❌ Failed to parse CSV file.");
      },
    });
  };

  const handleCSVSubmit = async () => {
    for (const row of parsedCSVData) {
      const { error } = await supabase
        .from("sales_closure")
        .update({
          associates_email: row.associates_email?.trim(),
          associates_name: row.associates_name?.trim(),
          associates_tl_email: row.associates_tl_email?.trim(),
          associates_tl_name: row.associates_tl_name?.trim(),
        })
        .eq("lead_id", row.lead_id?.trim());

      if (error) {
        console.error(`❌ Failed to update lead_id: ${row.lead_id}`, error);
      }
    }

    alert("✅ Data updated successfully.");
    fetchSales(); // Refresh UI
    setParsedCSVData([]);
    setCsvRowCount(0);
  };


  const handleOnboardClient = async (clientId: string) => {
    const confirmed = window.confirm("Are you sure you want to onboard this client?");
    if (!confirmed) return;

    const today = new Date().toISOString();

    const { error } = await supabase
      .from("sales_closure")
      .update({
        onboarded_date: today,
      })
      .eq("id", clientId);

    if (error) {
      console.error("Failed to onboard client:", error);
      alert("❌ Failed to onboard client. Try again.");
    } else {
      alert("✅ Client onboarded successfully.");
      // Refresh data or re-fetch the sales data
    }
  };

  // To open the dialog when the edit button is clicked
  const openOnboardDialog = (saleId: string, currentOnboardDate: string | null) => {
    setSelectedSaleId(saleId);
    setSelectedOnboardDate(currentOnboardDate ? new Date(currentOnboardDate) : null);
    setShowOnboardDialog(true);
  };

  const handleUpdateOnboardDate = async () => {
    if (!selectedOnboardDate || !selectedSaleId) return;

    const { error } = await supabase
      .from("sales_closure")
      .update({
        onboarded_date: selectedOnboardDate.toISOString(),
      })
      .eq("id", selectedSaleId);

    if (error) {
      console.error("Error updating onboard date:", error);
      alert("❌ Failed to update onboard date.");
    } else {
      alert("✅ Onboard date updated successfully.");

      // Update the sales state to reflect the change
      setSales((prevSales) =>
        prevSales.map((sale) =>
          sale.id === selectedSaleId
            ? { ...sale, onboarded_date: selectedOnboardDate.toISOString() }
            : sale
        )
      );

      setUpdatedSaleId(selectedSaleId);

      // Close the dialog and reset selected date
      setShowOnboardDialog(false);
      setSelectedSaleId(null);
      setSelectedOnboardDate(null);
    }
  };
  const handlePhoneClick = (phone: string) => {
    if (!phone) {
      alert("Phone number not found.");
      return;
    }
    if (zoomEmbedRef.current) {
      zoomEmbedRef.current.dial(phone);
    } else {
      alert("Zoom Phone dialer not initialized.");
    }
  };

  const handleOpenHistory = async (sale: SalesClosure) => {
    if (!sale.leads) return;
    setSelectedLeadForHistory({
      id: sale.lead_id,
      business_id: sale.lead_id,
      name: sale.leads.name,
      phone: sale.leads.phone,
      email: sale.email
    });
    setHistoryDialogOpen(true);
    setFetchingHistory(true);

    const { data, error } = await supabase
      .from("call_history")
      .select("*")
      .eq("lead_id", sale.lead_id)
      .order("id", { ascending: false });

    if (!error) {
      setCallHistory(data.map((r: any) => ({
        id: r.id,
        date: r.followup_date,
        stage: r.current_stage || "Finance Interaction",
        notes: r.notes,
        assigned_to: r.assigned_to,
        duration: r.call_duration_seconds,
        recording_url: r.recording_url
      })));
    }
    setFetchingHistory(false);
  };

  const handleAddNote = (sale: SalesClosure) => {
    if (!sale.leads) return;
    setSelectedLeadForHistory({
      id: sale.lead_id,
      business_id: sale.lead_id,
      name: sale.leads.name,
      phone: sale.leads.phone,
      email: sale.email
    });
    setNoteDialogOpen(true);
  };

  const submitCallNote = async () => {
    if (!selectedLeadForHistory || !callNote.trim()) return;
    setSubmittingNote(true);

    const { error } = await supabase.from("call_history").insert([{
      lead_id: selectedLeadForHistory.business_id,
      email: selectedLeadForHistory.email,
      phone: selectedLeadForHistory.phone,
      assigned_to: user?.name || user?.email || "Finance",
      notes: `[Finance Note] ${callNote.trim()}`,
      followup_date: dayjs().format("YYYY-MM-DD"),
      current_stage: "Finance Interaction"
    }]);

    if (!error) {
      setCallNote("");
      setNoteDialogOpen(false);
      alert("Note saved successfully.");
    } else {
      console.error("Error saving call note:", error);
      alert("Failed to save note.");
    }
    setSubmittingNote(false);
  };
  return (
    <ProtectedRoute allowedRoles={["Finance Associate", "Super Admin"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Finance Associates Page</h1>

            <Button className=" bg-orange-500 text-gray-100 hover:bg-orange-600" onClick={() => {
              setShowAssignDialog(true);
              fetchUnassignedSales();
              fetchFinanceAssociates();
            }}>
              Assign Associates
            </Button>

          </div>

          {/* Display Active Clients Count */}
          {/*  
<div className="grid grid-cols-1 sm:grid-cols-6 md:grid-cols-6 gap-4 mt-4">
  {tlClientCounts.map((tl) => (
    <div
      key={tl.associates_tl_email || "unassigned"}
      className="p-4 border rounded-lg bg-white shadow hover:shadow-md transition"
    >
      <p className="font-semibold text-gray-800">
        {tl.associates_tl_email || "Unassigned"}
      </p>
      <p className="text-2xl font-bold text-blue-600">
        {tl.paid_leads_count}
      </p>
      <p className="text-xs text-gray-500 mt-1">Active Paid Clients</p>
    </div>
  ))}
</div> */}
          {/* 
<div className="grid grid-cols-1 sm:grid-cols-8 md:grid-cols-8 gap-4 mt-4">
  {tlClientCounts
    .slice()                                   // copy so original state is not mutated
    .sort((a, b) => b.paid_leads_count - a.paid_leads_count)  // 🔥 sort DESC
    .map((tl) => (
      <div
        key={tl.associates_tl_email || "unassigned"}
        className="p-4 border rounded-lg bg-white shadow hover:shadow-md transition"
      >
        <p className="font-semibold text-gray-800">
          {tl.associates_tl_email || "Unassigned"}
        </p>
        <p className="text-2xl font-bold text-blue-600">
          {tl.paid_leads_count}
        </p>
        <p className="text-xs text-gray-500 mt-1">Active Paid Clients</p>
      </div>
    ))}
</div> */}

          <div className="grid grid-cols-1 sm:grid-cols-8 md:grid-cols-8 gap-4 mt-4">

            {/* 🔹 TL CARDS */}
            {tlClientCounts
              .slice()
              .sort((a, b) => b.paid_leads_count - a.paid_leads_count)
              .map((tl) => (
                <div
                  key={tl.associates_tl_email || "unassigned"}
                  className="p-4 border rounded-lg bg-white shadow hover:shadow-md transition"
                >
                  <p className="font-semibold text-gray-800">
                    {tl.associates_tl_email || "Unassigned"}
                  </p>

                  <p className="text-2xl font-bold text-blue-600">
                    {tl.paid_leads_count}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">Active Paid Clients</p>
                </div>
              ))}

            {/* ⭐ TOTAL CLIENTS CARD */}
            <div className="p-4 border rounded-lg bg-green-50 shadow hover:shadow-md transition">
              <p className="font-semibold text-gray-900">
                Total Clients
              </p>
              <p className="text-3xl font-bold text-green-600">
                {
                  tlClientCounts.reduce((sum, tl) => sum + (tl.paid_leads_count || 0), 0)
                }
              </p>
              <p className="text-xs text-gray-600 mt-1">Sum of All TL active clients count</p>
            </div>

          </div>


          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2 items-center justify-center">
              <Input
                placeholder="Search by email or lead_id"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-lg"
              />
              <Button
                size="sm"
                disabled={matches.length === 0}
                onClick={() => {
                  if (matches.length === 0) return;
                  const next = (matchIndex + 1) % matches.length;
                  setMatchIndex(next);
                  matches[next].scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                Next Match ({matches.length})
              </Button>
              {/* 🔁 Refresh button */}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 text-gray-700 border border-gray-300 hover:bg-gray-100"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-blue-700" />
                )}
                <span className="text-blue-700 font-medium">
                  {loading ? "Refreshing..." : "Refresh"}
                </span>
              </Button>



            </div>
            <div className="flex items-center text-sm font-semibold space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-gray-700">Active Clients:</span>
                <span className="text-green-600">{activeClientsCount}</span>
              </div>
              <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1">
                <span className="text-orange-700">Renewals (7 days):</span>
                <span className="text-orange-600 font-bold">{(() => {
                  const todayStart = new Date();
                  todayStart.setHours(0, 0, 0, 0);
                  const sevenDaysLater = new Date(todayStart);
                  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
                  return sales.filter(sale => {
                    if (!sale.onboarded_date || !sale.subscription_cycle) return false;
                    const renewalDate = new Date(sale.onboarded_date);
                    renewalDate.setDate(renewalDate.getDate() + sale.subscription_cycle);
                    return renewalDate >= todayStart && renewalDate <= sevenDaysLater;
                  }).length;
                })()}</span>
              </div>
            </div>


            <div className="flex space-x-4 justify-end">
              <Select value={followUpFilter} onValueChange={(value) => setFollowUpFilter(value as "Today" | "All" | "Upcoming7Days")}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Follow Up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Today">Today (Due Now)</SelectItem>
                  <SelectItem value="Upcoming7Days">Upcoming 7 Days</SelectItem>
                </SelectContent>
              </Select>

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
              <Button onClick={() => setShowCSVDialog(true)}>Upload CSV</Button>
            </div>


            <Dialog open={showCSVDialog} onOpenChange={setShowCSVDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload CSV File</DialogTitle>
                </DialogHeader>

                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleParseCSV(file);
                  }}
                />

                {csvRowCount > 0 && (
                  <p className="text-sm mt-2">✅ {csvRowCount} rows found in the file.</p>
                )}

                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline" onClick={() => setShowCSVDialog(false)}>Cancel</Button>
                  <Button
                    onClick={async () => {
                      await handleCSVSubmit(); // ⬅ actual upload
                      setShowCSVDialog(false);
                    }}
                    disabled={parsedCSVData.length === 0}
                  >
                    Submit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          </div>
          <div className="rounded-md border mt-4">

            <Table>
              {/* <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Sale Value</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sale Date</TableHead>
                  <TableHead>Onboarded / last payment at</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Renewal date</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>TL</TableHead>
                  <TableHead>Remove</TableHead>
                </TableRow>
              </TableHeader> */}

              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>

                  {renderSortableHeader("Client ID", "lead_id")}
                  {renderSortableHeader("Name", "name")}

                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>

                  {renderSortableHeader("Sale Value", "sale_value")}
                  {renderSortableHeader("Subscription", "subscription_cycle")}
                  {renderSortableHeader("Status", "finance_status")}
                  {renderSortableHeader("Sale Date", "sale_date")}
                  {renderSortableHeader("Onboarded / last payment at", "onboarded_date")}
                  {renderSortableHeader("Deadline", "renewal_date")}
                  {renderSortableHeader("Renewal date", "renewal_date")}

                  <TableHead>Actions</TableHead>
                  <TableHead>Reason</TableHead>
                  {renderSortableHeader("TL (Finance)", "tl")}
                  <TableHead>Sales Closer</TableHead>
                  <TableHead>Remove</TableHead>
                </TableRow>
              </TableHeader>


              <TableBody>

                {


                  sortedSales.map((sale, idx) => (




                    <TableRow
                      key={sale.id}
                      className={sale.id === updatedSaleId ? "bg-green-100" : ""} // Apply green background to the updated row
                    >
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{sale.lead_id}</TableCell>
                      <TableCell className="font-medium  break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                        onClick={() => window.open(`/leads/${sale.lead_id}`, "_blank")}
                      >{sale.leads?.name || "-"}</TableCell>
                      <TableCell>{sale.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-gray-500">{sale.leads?.phone || "-"}</span>
                          <div className="flex gap-2 mt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                              onClick={() => handlePhoneClick(sale.leads?.phone || "")}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-600 hover:bg-gray-50"
                              onClick={() => handleOpenHistory(sale)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:bg-green-50"
                              onClick={() => handleAddNote(sale)}
                              title="Add Note"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>${sale.sale_value}</TableCell>
                      <TableCell>{sale.subscription_cycle} days</TableCell>
                      <TableCell>
                        <Badge className={getStageColor(sale.finance_status)}>{sale.finance_status}</Badge>
                      </TableCell>
                      {/* <TableCell>{new Date(sale.closed_at).toLocaleDateString("en-GB")}</TableCell> */}
                      <TableCell>
                        {sale.oldest_closed_at
                          ? new Date(sale.oldest_closed_at).toLocaleDateString("en-GB")
                          : "-"}
                      </TableCell>

                      {/* <TableCell>{sale.onboarded_date ? new Date(sale.onboarded_date).toLocaleDateString("en-GB") : "-"}</TableCell> */}

                      <TableCell>
                        {sale.onboarded_date ? new Date(sale.onboarded_date).toLocaleDateString("en-GB") : "-"}
                        <Button
                          onClick={() => openOnboardDialog(sale.id, sale.onboarded_date || null)}
                          className="ml-2 text-gray-500 bg-inherit hover:text-blue-600 hover:bg-inherit"
                          title="Edit onboarded date"  >
                          <Edit className="w-4 h-4" />

                        </Button>
                      </TableCell>


                      {/* <TableCell>
  {getRenewWithinBadge(sale.onboarded_date || "", sale.subscription_cycle)}
</TableCell> */}


                      <TableCell>
                        {(() => {
                          // Check if the status is one of the "closed", "unpaid", or "got placed"
                          const stage = String(sale.finance_status || "").trim().toLowerCase();
                          const forClosed = ["closed", "unpaid", "got placed"].includes(stage);

                          // Show renewal badge only if the status is not one of the closed statuses
                          return forClosed ? null : getRenewWithinBadge(sale.onboarded_date || "", sale.subscription_cycle);
                        })()}
                      </TableCell>

                      <TableCell>
                        {(() => {

                          const stage = String(sale.finance_status || "").trim().toLowerCase();
                          const isFinalized = ["closed", "unpaid", "got placed"].includes(stage);

                          // Show next renewal calculation only if the status is not finalized
                          return isFinalized ? null :

                            (() => {
                              const onboarded = sale.onboarded_date ? new Date(sale.onboarded_date) : null;
                              const cycle = sale.subscription_cycle || 0;

                              if (!onboarded || isNaN(cycle)) return "-";

                              const renewalDate = new Date(onboarded);
                              renewalDate.setDate(renewalDate.getDate() + cycle);
                              return renewalDate.toLocaleDateString("en-GB");
                            })();
                        })()}
                      </TableCell>


                      <TableCell>
                        {(() => {
                          const onboarded = sale.onboarded_date ? new Date(sale.onboarded_date) : null;
                          const today = new Date();
                          let isOlderThan25 = false;

                          if (onboarded) {
                            const diffDays = Math.floor((today.getTime() - onboarded.getTime()) / (1000 * 60 * 60 * 24));
                            isOlderThan25 = diffDays < sale.subscription_cycle;
                          }

                          const disableDropdown = isOlderThan25;


                          return (
                            <Select
                              value={actionSelections[sale.id] || ""}


                              onValueChange={(value) => {
                                setActionSelections((prev) => ({
                                  ...prev,
                                  [sale.id]: value,
                                }));

                                if (value === "Paid") {
                                  const confirmed = window.confirm("Are you sure you want to update status as PAID ?");
                                  if (!confirmed) return;

                                  // setSelectedSaleId(sale.id);
                                  // setShowPaymentDialog(true);
                                  // return;
                                  window.open(`/finance/renewal/${sale.lead_id}`, "_blank");

                                }
                                else if (value === "Closed") {
                                  const confirmed = window.confirm("Are you sure you want to update status as CLOSED ?");
                                  if (!confirmed) return;

                                  setSelectedSaleId(sale.id);
                                  setSelectedReasonType("Closed");
                                  setShowReasonDialog(true);
                                } else if (value === "Paused") {
                                  const confirmed = window.confirm("Are you sure you want to update status as PAUSED ?");
                                  if (!confirmed) return;


                                  setSelectedSaleId(sale.id);
                                  setSelectedReasonType("Paused");
                                  setShowReasonDialog(true);

                                } else if (value === "Unpaid") {
                                  const confirmed = window.confirm("Are you sure you want to update status as UNPAID ?");
                                  if (!confirmed) return;

                                  setSelectedSaleId(sale.id);
                                  setSelectedReasonType("Unpaid");
                                  setShowReasonDialog(true);
                                } else if (value === "Got Placed") {
                                  const confirmed = window.confirm("Are you sure you want to update status as GOT PLACED ?");
                                  if (!confirmed) return;

                                  setSelectedSaleId(sale.id);
                                  setSelectedReasonType("Got Placed");
                                  setShowReasonDialog(true);
                                } else {
                                  updateFinanceStatus(sale.id, value as FinanceStatus);
                                }
                              }}


                              disabled={disableDropdown}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder={disableDropdown ? "Not allowed" : "Select Status"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Paid">Paid</SelectItem>
                                <SelectItem value="Unpaid">Unpaid</SelectItem>
                                <SelectItem value="Paused">Paused</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                                <SelectItem value="Got Placed">Got Placed</SelectItem>

                              </SelectContent>
                            </Select>

                          );
                        })()}
                      </TableCell>




                      <TableCell>
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
                      <TableCell>{sale.associates_tl_name || "-"}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-700">{sale.account_assigned_name || "-"}</TableCell>
                      <TableCell className="p-2 text-center">
                        <Button
                          size="sm"
                          onClick={() => {
                            setLeadIdToRemove(sale.lead_id);
                            setShowRemoveDialog(true);
                          }}
                          className={`${leadIdToRemove === sale.lead_id
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-blue-600 hover:bg-red-500 text-white"
                            }`}
                        >
                          {leadIdToRemove === sale.lead_id ? "Removing..." : "!"}
                        </Button>
                      </TableCell>



                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>


          <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmation</DialogTitle>
              </DialogHeader>

              <p className="text-gray-700 mt-2 text-sm">
                Really this client is not yours?
              </p>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRemoveDialog(false);
                    setLeadIdToRemove(null);
                  }}
                >
                  No
                </Button>

                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={async () => {
                    if (!leadIdToRemove) return;

                    const success = await removeAssociateFromLead(leadIdToRemove);
                    if (success) {
                      // ✅ Refresh the entire table after successful removal
                      await fetchSales();
                    }

                    // Close dialog & reset states
                    setShowRemoveDialog(false);
                    setLeadIdToRemove(null);
                  }}
                >
                  Yes
                </Button>
              </div>
            </DialogContent>
          </Dialog>


          {/*  Dialog for selecting a new onboard date */}
          <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Onboarded Date</DialogTitle>
              </DialogHeader>

              <Input
                type="date"
                value={selectedOnboardDate ? format(selectedOnboardDate, "yyyy-MM-dd") : ""}
                onChange={(e) => setSelectedOnboardDate(new Date(e.target.value))}
                required
              />

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowOnboardDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateOnboardDate}
                  disabled={!selectedOnboardDate}
                >
                  Update
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent className="max-w-7xl">
              <DialogHeader>
                <DialogTitle>Assign Finance Associates</DialogTitle>
              </DialogHeader>

              {unassignedRecords.length === 0 ? (
                <p className="text-sm text-gray-600">✅ All leads are already assigned.</p>
              ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">S.No</th>
                        <th className="p-2 text-left">Lead ID</th>
                        <th className="p-2 text-left">Lead Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Company Email</th>
                        <th className="p-2 text-left">Closed At</th>
                        <th className="p-2 text-left">Onboarded Date</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedRecords.map((rec, idx) => (
                        <tr key={rec.id} className="border-t hover:bg-gray-50">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2 font-medium">{rec.lead_id}</td>
                          <td className="p-2 font-medium  break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                            onClick={() => window.open(`/leads/${rec.lead_id}`, "_blank")}>{rec.lead_name || "-"}</td>
                          <td className="p-2 text-gray-600">{rec.email}</td>
                          <td className="p-2 text-gray-600">{rec.company_application_email}</td>
                          <td className="p-2">{rec.closed_at ? new Date(rec.closed_at).toLocaleDateString("en-GB") : "-"}</td>
                          <td className="p-2">{rec.onboarded_date ? new Date(rec.onboarded_date).toLocaleDateString("en-GB") : "-"}</td>
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              onClick={() => setSelectedLeadId(rec.lead_id)}
                              className={`${selectedLeadId === rec.lead_id
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-blue-600 hover:bg-blue-700"
                                } text-white`}
                            >
                              {selectedLeadId === rec.lead_id ? "Choose TL" : "Assign"}
                            </Button>

                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedLeadId && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Select Finance Associate</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {financeAssociates.map((a) => (
                      <Button
                        key={a.user_email}
                        variant="outline"
                        className="justify-start text-left"
                        onClick={() => assignAssociate(selectedLeadId, a.full_name, a.user_email)}
                      >
                        <div>
                          <p className="font-medium">{a.full_name}</p>
                          <p className="text-xs text-gray-500">{a.user_email}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>


          <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
            <DialogContent hideCloseIcon className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reason for {selectedReasonType}</DialogTitle>
              </DialogHeader>

              <Textarea
                placeholder={`Enter reason for marking as ${selectedReasonType}...`}
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                className="min-h-[100px]"
              />

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReasonDialog(false);
                    setSelectedSaleId(null);
                    setSelectedReasonType(null);
                    setReasonNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedSaleId || reasonNote.trim() === "" || !selectedReasonType) {
                      alert("Please enter a reason.");
                      return;
                    }

                    const { error } = await supabase
                      .from("sales_closure")
                      .update({
                        finance_status: selectedReasonType,
                        reason_for_close: `${selectedReasonType}: ${reasonNote.trim()}`, // ✅ use only this column
                      })
                      .eq("id", selectedSaleId);

                    if (error) {
                      console.error("Error saving reason:", error);
                      alert("❌ Failed to update record.");
                      return;
                    }

                    setSales((prev) =>
                      prev.map((sale) =>
                        sale.id === selectedSaleId
                          ? {
                            ...sale,
                            finance_status: selectedReasonType,
                            reason_for_close: `${selectedReasonType}: ${reasonNote.trim()}`,
                          }
                          : sale
                      )
                    );

                    setShowReasonDialog(false);
                    setSelectedSaleId(null);
                    setSelectedReasonType(null);
                    setReasonNote("");
                  }}
                >
                  Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>


          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Status Change</DialogTitle>
              </DialogHeader>

              <p className="text-sm text-gray-700 mt-2">
                Are you sure you want to mark this record as{" "}
                <strong>{pendingAction?.newStatus}</strong>?
              </p>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setPendingAction(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!pendingAction) return;

                    await updateFinanceStatus(pendingAction.saleId, pendingAction.newStatus as FinanceStatus);

                    setShowConfirmDialog(false);
                    setPendingAction(null);
                  }}
                >
                  Yes, Proceed
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className="w-[420px]">
              <DialogHeader>
                <DialogTitle>💰 Payment Details</DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground mb-2">
                Fill the payment info, onboard date, and subscription details to record this payment.
              </p>

              <div className="space-y-4">
                {/* Payment Amount */}
                <Input
                  type="number"
                  placeholder="Payment amount ($)"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />

                {/* Onboarded Date */}
                <Input
                  type="date"
                  placeholder="Onboarded date"
                  value={onboardDate ? onboardDate.toISOString().slice(0, 10) : ""}
                  onChange={(e) => setOnboardDate(new Date(e.target.value))}
                  required
                />

                {/* Subscription Duration */}
                <Select value={subscriptionMonths} onValueChange={setSubscriptionMonths}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Subscription duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="2">2 months</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex justify-between gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="w-full bg-black text-white hover:bg-gray-800"
                    onClick={() => {
                      setShowPaymentDialog(false);
                      setPaymentAmount("");
                      setOnboardDate(null);
                      setSubscriptionMonths("1");

                      // 🧠 Revert dropdown to default
                      if (selectedSaleId) {
                        setActionSelections((prev) => ({
                          ...prev,
                          [selectedSaleId]: "",
                        }));
                      }

                      setSelectedSaleId(null);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="w-full"
                    onClick={async () => {
                      if (!selectedSaleId || !paymentAmount || !onboardDate || !subscriptionMonths) {
                        alert("Please fill all fields");
                        return;
                      }

                      const { error } = await supabase
                        .from("sales_closure")
                        .update({
                          finance_status: "Paid",
                          sale_value: parseFloat(paymentAmount),
                          onboarded_date: onboardDate.toISOString(),
                          subscription_cycle: Number(subscriptionMonths) * 30,
                        })
                        .eq("id", selectedSaleId);

                      if (error) {
                        console.error("Error updating payment:", error);
                        alert("❌ Failed to record payment");
                        return;
                      }

                      // Refresh state
                      setSales((prev) =>
                        prev.map((s) =>
                          s.id === selectedSaleId
                            ? {
                              ...s,
                              finance_status: "Paid",
                              sale_value: parseFloat(paymentAmount),
                              onboarded_date: onboardDate.toISOString(),
                              subscription_cycle: Number(subscriptionMonths) * 30,
                            }
                            : s
                        )
                      );

                      // Reset dialog
                      setShowPaymentDialog(false);
                      setPaymentAmount("");
                      setOnboardDate(null);
                      setSubscriptionMonths("1");
                      setSelectedSaleId(null);
                    }}
                  >
                    Payment Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>



          {/* Call History Dialog */}
          <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Call History & Interaction — {selectedLeadForHistory?.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                {fetchingHistory ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
                ) : callHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 italic">No call history found for this lead.</p>
                ) : (
                  callHistory.map((call) => (
                    <div key={call.id} className="border rounded-lg p-4 bg-gray-50/50 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{call.assigned_to}</span>
                          <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {call.notes.includes("[Finance Note]") ? "Finance" : "Sales"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{dayjs(call.date).format("MMM DD, YYYY")}</span>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-100/80">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{call.notes}</p>
                      </div>
                      {call.duration && (
                        <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Duration: {Math.floor(call.duration / 60)}m {call.duration % 60}s
                        </p>
                      )}
                      {call.recording_url && (
                        <a href={call.recording_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                          View Recording
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Note Dialog */}
          <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Call Note — {selectedLeadForHistory?.name}</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Enter details of your interaction..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                className="min-h-[120px] mt-2"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => { setNoteDialogOpen(false); setCallNote(""); }}>Cancel</Button>
                <Button onClick={submitCallNote} disabled={submittingNote || !callNote.trim()}>
                  {submittingNote ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  Save Note
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <ZoomPhoneEmbed ref={zoomEmbedRef} callerEmail={user?.email || ""} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
function toast(arg0: { title: string; description: string; }) {
  throw new Error("Function not implemented.");
}
