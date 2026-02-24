// app/marketingAssociates/page.tsx
"use client";

import { useEffect, useMemo, useState, useContext, useRef } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { LoadingContext } from "@/components/providers/LoadingContext";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Search } from "lucide-react";

/* ========= Types ========= */

type LeadStatus = "New" | "Assigned";
type LeadSource =
  | "Instagram"
  | "WhatsApp"
  | "Google"
  | "Google Forms"
  | "Facebook"
  | "Unknown";

interface Lead {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource | string;
  city: string;
  status: LeadStatus;
  created_at: string;
  assigned_to?: string | null;
  assigned_at?: string | null;
  current_stage?: string | null;
  incentives?: number | null; // adjust to your schema
  referral_id?: string | null; // adjust to your schema
}

interface SalesClosure {
  id: string;
  lead_id: string;
  sale_value: number;
  subscription_cycle: number;
  payment_mode: string;
  closed_at: string | null;
  email: string;
  finance_status: string | null;
  lead_name: string | null;
  // other fields omitted for brevity
}

interface SalesRow {
  // from sales_closure
  lead_id: string;
  lead_name: string | null;
  email: string;
  closed_at: string | null;

  // from leads
  source: string | null;
  assigned_to: string | null;
  phone: string | null;
  city: string | null;
  incentives: number | null;
  referral_id: string | null;
}

/* ========= Helpers ========= */

const cmpStr = (a?: string | null, b?: string | null) =>
  (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });

const getSourceBadgeColor = (source: string) => {
  const s = (source ?? "").trim().toLowerCase();
  if (s === "instagram") return "bg-pink-100 text-pink-800 rounded-md";
  if (s === "whatsapp") return "bg-green-100 text-green-800 rounded-md";
  if (s === "google" || s === "google forms")
    return "bg-gray-900 text-gray-100 rounded-md";
  if (s === "facebook") return "bg-blue-200 text-blue-900 rounded-md";
  return "bg-gray-100 text-gray-800 rounded-md";
};

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Optionally, make date range boundaries truly IST-based.
// If you prefer local machine time, you can revert to your previous helper.
const getUTCRange = (dateStr: string, isStart: boolean) => {
  // dateStr === 'YYYY-MM-DD'
  const [y, m, d] = dateStr.split("-").map(Number);
  const offsetMin = 330; // IST UTC+5:30
  const base = Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0); // midnight UTC
  const istStartUTC = base - offsetMin * 60 * 1000; // IST midnight in UTC
  const istEndUTC = istStartUTC + (isStart ? 0 : 24 * 60 * 60 * 1000 - 1);
  return new Date(isStart ? istStartUTC : istEndUTC).toISOString();
};

/* ========= Page ========= */

export default function MarketingAssociatesPage() {
  const { loading, setLoading } = useContext(LoadingContext);

  // Toggle
  const [view, setView] = useState<"marketing" | "sales">("marketing");

  // Shared filters
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [pageSize, setPageSize] = useState<number | "all">(15);
  const [currentPage, setCurrentPage] = useState(1);

  // MARKETING state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [mkTotalCount, setMkTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>("");

  // SALES state
  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [salesTotalCount, setSalesTotalCount] = useState(0);
  const [salesSourceFilter, setSalesSourceFilter] = useState<string>("all");
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>("all");
  const [salesStartDate, setSalesStartDate] = useState<string>("");
  const [salesEndDate, setSalesEndDate] = useState<string>("");
  const [distinctSalesSources, setDistinctSalesSources] = useState<string[]>(
    []
  );
  const [distinctSalesPersons, setDistinctSalesPersons] = useState<string[]>(
    []
  );

  // Sorting (per view)
  const [sortConfig, setSortConfig] = useState<{
    key:
    | "business_id"
    | "name"
    | "city"
    | "source"
    | "created_at"
    | "lead_age";
    direction: "asc" | "desc";
  } | null>(null);

  const [salesSort, setSalesSort] = useState<{
    key:
    | "lead_id"
    | "lead_name"
    | "email"
    | "source"
    | "assigned_to"
    | "phone"
    | "city"
    | "closed_at";
    direction: "asc" | "desc";
  } | null>(null);

  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(
        1,
        Math.ceil(
          (view === "marketing" ? mkTotalCount : salesTotalCount) / pageSize
        )
      );

  const handleSort = (
    key:
      | "business_id"
      | "name"
      | "city"
      | "source"
      | "created_at"
      | "lead_age",
    direction: "asc" | "desc"
  ) => setSortConfig({ key, direction });

  const handleSalesSort = (
    key:
      | "lead_id"
      | "lead_name"
      | "email"
      | "source"
      | "assigned_to"
      | "phone"
      | "city"
      | "closed_at",
    direction: "asc" | "desc"
  ) => setSalesSort({ key, direction });

  /* ======= Distinct filters ======= */

  // Marketing sources (global)
  const fetchDistinctSources = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("source")
      .not("source", "is", null)
      .neq("source", "");
    if (!error) {
      const sources = [
        ...new Set(
          (data ?? [])
            .map((r: any) => (r.source ?? "").trim())
            .filter(Boolean)
        ),
      ];
      setUniqueSources(sources);
    }
  };

  // Sales distinct sources & persons limited to sale done
  const fetchSalesDistincts = async () => {
    // sources
    const { data: srcs, error: srcErr } = await supabase
      .from("leads")
      .select("source")
      .in("current_stage", ["sale done", "sales done"])
      .not("source", "is", null)
      .neq("source", "");
    if (!srcErr) {
      setDistinctSalesSources([
        ...new Set(
          (srcs ?? [])
            .map((r: any) => (r.source ?? "").trim())
            .filter(Boolean)
        ),
      ]);
    }

    // salespersons = assigned_to
    const { data: ppl, error: pplErr } = await supabase
      .from("leads")
      .select("assigned_to")
      .in("current_stage", ["sale done", "sales done"])
      .not("assigned_to", "is", null);
    if (!pplErr) {
      setDistinctSalesPersons([
        ...new Set(
          (ppl ?? [])
            .map((r: any) => (r.assigned_to ?? "").trim())
            .filter(Boolean)
        ),
      ]);
    }
  };

  /* ======= Marketing fetch ======= */

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase.from("leads").select("*", { count: "exact" });

      // server-sort where possible (string/date cols)
      const canServerSort =
        sortConfig &&
        ["name", "city", "source", "created_at"].includes(sortConfig.key);
      if (canServerSort) {
        query = query.order(
          sortConfig!.key as "name" | "city" | "source" | "created_at",
          { ascending: sortConfig!.direction === "asc" }
        );
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // pagination
      if (pageSize !== "all") {
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      // date range (created_at)
      if (startDate && endDate) {
        const fromISO = getUTCRange(startDate, true);
        const toISO = getUTCRange(endDate, false);
        if (fromISO && toISO) {
          query = query.gte("created_at", fromISO).lte("created_at", toISO);
        }
      }

      // filters
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (sourceFilter !== "all") query = query.eq("source", sourceFilter);
      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setLeads((data as Lead[]) ?? []);
      setMkTotalCount(count || 0);
    } catch (e) {
      console.error("Error fetching leads:", e);
    } finally {
      setLoading(false);
    }
  };

  /* ======= Sales fetch ======= */

  const fetchSales = async () => {
    setLoading(true);
    try {
      // 1) salesQuery = pull from sales_closure with date/search/pagination
      let salesQuery = supabase
        .from("sales_closure")
        .select(
          "id, lead_id, sale_value, subscription_cycle, payment_mode, closed_at, email, finance_status, lead_name"
        )
        .order("closed_at", { ascending: false });

      // date range on closed_at (use your IST helper)
      if (salesStartDate && salesEndDate) {
        salesQuery = salesQuery
          .gte("closed_at", getUTCRange(salesStartDate, true))
          .lte("closed_at", getUTCRange(salesEndDate, false));
      }

      // text search
      if (searchTerm) {
        salesQuery = salesQuery.or(
          `lead_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,lead_id.ilike.%${searchTerm}%`
        );
      }

      // pagination (omit if "All")
      if (pageSize !== "all") {
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        salesQuery = salesQuery.range(from, to);
      }

      const { data: closures, error: scErr } = await salesQuery;
      if (scErr) throw scErr;

      const leadIds = [...new Set((closures ?? []).map((c) => c.lead_id))];

      // 2) Pull matching leads with your sales filters
      let leadsQuery = supabase
        .from("leads")
        .select(
          "business_id, source, assigned_to, phone, city, incentives, referral_id, current_stage"
        )
        .in("business_id", leadIds)
        .in("current_stage", ["sale done", "sales done"]); // ensure we only show true sales

      if (salesSourceFilter !== "all") {
        leadsQuery = leadsQuery.eq("source", salesSourceFilter);
      }
      if (salesPersonFilter !== "all") {
        leadsQuery = leadsQuery.eq("assigned_to", salesPersonFilter);
      }

      const { data: leadRows, error: lErr } = await leadsQuery;
      if (lErr) throw lErr;

      const byBizId = new Map((leadRows ?? []).map((l) => [l.business_id, l]));

      // 3) Merge, keep ONLY rows that have a matching lead
      const merged = (closures ?? []).flatMap((s) => {
        const L = byBizId.get(s.lead_id);
        if (!L) return [];
        return [{
          // sales_closure fields:
          lead_id: s.lead_id,
          lead_name: s.lead_name ?? null,
          email: s.email,
          closed_at: s.closed_at,
          // leads fields:
          source: L?.source ?? null,
          assigned_to: L?.assigned_to ?? null,
          phone: L?.phone ?? null,
          city: L?.city ?? null,
          incentives: (L as any)?.incentives ?? null,
          referral_id: (L as any)?.referral_id ?? null,
        }];
      }) as SalesRow[];

      // 4) Optional de-dupe by lead_id (in case multiple closures exist per lead)
      const mergedUnique = Array.from(
        new Map(merged.map((r) => [r.lead_id, r])).values()
      );

      setSalesRows(mergedUnique);
      // ✅ Card shows EXACTLY what table shows
      setSalesTotalCount(mergedUnique.length);
    } catch (e) {
      console.error("Error fetching sales:", e);
    } finally {
      setLoading(false);
    }
  };

  /* ======= Effects ======= */

  useEffect(() => {
    fetchDistinctSources();
    fetchSalesDistincts();
  }, []);

  useEffect(() => {
    if (view === "marketing") {
      fetchLeads();
    } else {
      fetchSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    view,
    currentPage,
    pageSize,
    searchTerm,

    // marketing deps
    statusFilter,
    sourceFilter,
    startDate,
    endDate,
    sortConfig,

    // sales deps
    salesSourceFilter,
    salesPersonFilter,
    salesStartDate,
    salesEndDate,
    salesSort,
  ]);

  /* ======= Client sort ======= */

  const sortedLeads = useMemo(() => {
    let rows = [...leads];
    if (!sortConfig) return rows;
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    return rows.sort((a, b) => {
      if (key === "created_at") {
        const ad = new Date(a.created_at).getTime();
        const bd = new Date(b.created_at).getTime();
        return (ad - bd) * dir;
      }
      if (key === "lead_age") {
        const aAge = Date.now() - new Date(a.created_at).getTime();
        const bAge = Date.now() - new Date(b.created_at).getTime();
        return (aAge - bAge) * dir;
      }
      if (key === "business_id") {
        const num = (v?: string) => {
          const m = v?.match(/\d+$/);
          return m ? parseInt(m[0], 10) : 0;
        };
        return (num(a.business_id) - num(b.business_id)) * dir;
      }
      return cmpStr((a as any)[key], (b as any)[key]) * dir;
    });
  }, [leads, sortConfig]);

  const sortedSales = useMemo(() => {
    let rows = [...salesRows];
    if (!salesSort) return rows;
    const { key, direction } = salesSort;
    const dir = direction === "asc" ? 1 : -1;

    return rows.sort((a, b) => {
      if (key === "closed_at") {
        const ad = a.closed_at ? new Date(a.closed_at).getTime() : 0;
        const bd = b.closed_at ? new Date(b.closed_at).getTime() : 0;
        return (ad - bd) * dir;
      }
      return cmpStr((a as any)[key], (b as any)[key]) * dir;
    });
  }, [salesRows, salesSort]);

  /* ======= UI ======= */

  return (
    <>
      {loading && <FullScreenLoader />}
      <ProtectedRoute
        allowedRoles={["Marketing Associate", "Marketing", "Super Admin"]}
      >
        <DashboardLayout>
          <div className="space-y-6">
            {/* Header + Toggle */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Marketing Associates
                </h1>
                <p className="text-gray-600 mt-2">
                  View and manage {view === "marketing" ? "leads" : "sales"} across the funnel
                </p>
              </div>

              <div className="flex gap-2">
                <Link href="/marketingAnalytics" target="_blank">
                  <Button variant="outline" className="gap-2">
                    📊Analytics
                  </Button>
                </Link>
                <Button
                  variant={view === "marketing" ? "default" : "outline"}
                  onClick={() => {
                    setView("marketing");
                    setCurrentPage(1);
                  }}
                >
                  Marketing
                </Button>
                <Button
                  variant={view === "sales" ? "default" : "outline"}
                  onClick={() => {
                    setView("sales");
                    setCurrentPage(1);
                  }}
                >
                  Sales
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total {view === "marketing" ? "Leads" : "Sales"} (this view)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {view === "marketing" ? mkTotalCount : salesTotalCount}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Page Size
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      if (v === "all") {
                        setPageSize("all");
                        setCurrentPage(1);
                      } else {
                        setPageSize(Number(v));
                        setCurrentPage(1);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue
                        placeholder={
                          pageSize === "all" ? "All" : `${pageSize} per page`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {[15, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} per page
                        </SelectItem>
                      ))}
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {view === "marketing" ? (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Assigned (page)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {leads.filter((l) => l.status === "Assigned").length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        New (page)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {leads.filter((l) => l.status === "New").length}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Salespersons (distinct)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {distinctSalesPersons.length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Sources (distinct)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {distinctSalesSources.length}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Controls */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{view === "marketing" ? "Leads" : "Sales"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        ref={searchInputRef}
                        placeholder={
                          view === "marketing"
                            ? "Search by name, phone, email, or city..."
                            : "Search by lead name, email, or lead ID..."
                        }
                        defaultValue={searchTerm}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSearchTerm(searchInputRef.current?.value || "");
                            setCurrentPage(1);
                          }
                        }}
                        className="pl-10 w-full"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        setSearchTerm(searchInputRef.current?.value || "");
                        setCurrentPage(1);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Search
                    </Button>
                  </div>

                  {view === "marketing" ? (
                    <>
                      <Select
                        value={statusFilter}
                        onValueChange={(v) => {
                          setStatusFilter(v as any);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="min-w-[150px] w-full sm:w-auto">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Assigned">Assigned</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={sourceFilter}
                        onValueChange={(v) => {
                          setSourceFilter(v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="min-w-[180px] w-full sm:w-auto">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          {uniqueSources.map((src) => (
                            <SelectItem key={src} value={src}>
                              {src}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="min-w-[200px]">
                            {startDate && endDate
                              ? `📅 ${startDate
                                .split("-")
                                .reverse()
                                .join("-")} → ${endDate
                                  .split("-")
                                  .reverse()
                                  .join("-")}`
                              : "📅 Date Range"}
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="p-4 space-y-4 w-[260px]">
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">
                              Start Date
                            </Label>
                            <Input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">
                              End Date
                            </Label>
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => {
                                setEndDate(e.target.value);
                                if (!startDate) setStartDate(e.target.value);
                                setCurrentPage(1);
                              }}
                            />
                          </div>

                          <Button
                            variant="ghost"
                            className="text-red-500 text-sm p-0"
                            onClick={() => {
                              setStartDate("");
                              setEndDate("");
                              setCurrentPage(1);
                            }}
                          >
                            ❌ Clear Filter
                          </Button>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : (
                    <>
                      {/* SALES: Source */}
                      <Select
                        value={salesSourceFilter}
                        onValueChange={(v) => {
                          setSalesSourceFilter(v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="min-w-[180px] w-full sm:w-auto">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          {distinctSalesSources.map((src) => (
                            <SelectItem key={src} value={src}>
                              {src}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* SALES: Salesperson */}
                      <Select
                        value={salesPersonFilter}
                        onValueChange={(v) => {
                          setSalesPersonFilter(v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="min-w-[200px] w-full sm:w-auto">
                          <SelectValue placeholder="Salesperson" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Salespersons</SelectItem>
                          {distinctSalesPersons.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* SALES: Date Range (closed_at) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="min-w-[200px]">
                            {salesStartDate && salesEndDate
                              ? `📅 ${salesStartDate
                                .split("-")
                                .reverse()
                                .join("-")} → ${salesEndDate
                                  .split("-")
                                  .reverse()
                                  .join("-")}`
                              : "📅 Date Range"}
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="p-4 space-y-4 w-[260px]">
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">
                              Start Date
                            </Label>
                            <Input
                              type="date"
                              value={salesStartDate}
                              onChange={(e) => setSalesStartDate(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">
                              End Date
                            </Label>
                            <Input
                              type="date"
                              value={salesEndDate}
                              onChange={(e) => {
                                setSalesEndDate(e.target.value);
                                if (!salesStartDate)
                                  setSalesStartDate(e.target.value);
                                setCurrentPage(1);
                              }}
                            />
                          </div>

                          <Button
                            variant="ghost"
                            className="text-red-500 text-sm p-0"
                            onClick={() => {
                              setSalesStartDate("");
                              setSalesEndDate("");
                              setCurrentPage(1);
                            }}
                          >
                            ❌ Clear Filter
                          </Button>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>

                {/* Table */}
                <div className="w-full overflow-x-auto">
                  {view === "marketing" ? (
                    <>
                      <Table className="min-w-[1000px] w-full break-words text-center">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16 max-w-[70px] whitespace-normal">
                              s.no
                            </TableHead>

                            <TableHead className="text-center">
                              <div className="flex items-center gap-1 justify-center">
                                ID
                                <span
                                  onClick={() =>
                                    handleSort("business_id", "asc")
                                  }
                                  className={`cursor-pointer ${sortConfig?.key === "business_id" &&
                                    sortConfig.direction === "asc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() =>
                                    handleSort("business_id", "desc")
                                  }
                                  className={`cursor-pointer ${sortConfig?.key === "business_id" &&
                                    sortConfig.direction === "desc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>

                            <TableHead className="text-center">
                              <div className="flex items-center gap-1 justify-center">
                                Name
                                <span
                                  onClick={() => handleSort("name", "asc")}
                                  className={`cursor-pointer ${sortConfig?.key === "name" &&
                                    sortConfig.direction === "asc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() => handleSort("name", "desc")}
                                  className={`cursor-pointer ${sortConfig?.key === "name" &&
                                    sortConfig.direction === "desc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>

                            <TableHead className="text-center">Phone</TableHead>
                            <TableHead className="text-center">Email</TableHead>

                            <TableHead className="text-center">
                              <div className="flex items-center gap-1 justify-center">
                                City
                                <span
                                  onClick={() => handleSort("city", "asc")}
                                  className={`cursor-pointer ${sortConfig?.key === "city" &&
                                    sortConfig.direction === "asc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() => handleSort("city", "desc")}
                                  className={`cursor-pointer ${sortConfig?.key === "city" &&
                                    sortConfig.direction === "desc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>

                            <TableHead className="text-center">Source</TableHead>

                            <TableHead className="text-center">Status</TableHead>

                            <TableHead className="text-center">
                              <div className="flex items-center gap-1 justify-center">
                                Created At
                                <span
                                  onClick={() =>
                                    handleSort("created_at", "asc")
                                  }
                                  className={`cursor-pointer ${sortConfig?.key === "created_at" &&
                                    sortConfig.direction === "asc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() =>
                                    handleSort("created_at", "desc")
                                  }
                                  className={`cursor-pointer ${sortConfig?.key === "created_at" &&
                                    sortConfig.direction === "desc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>

                            <TableHead className="text-center">
                              <div className="flex items-center gap-1 justify-center">
                                Lead Age
                                <span
                                  onClick={() => handleSort("lead_age", "asc")}
                                  className={`cursor-pointer ${sortConfig?.key === "lead_age" &&
                                    sortConfig.direction === "asc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() => handleSort("lead_age", "desc")}
                                  className={`cursor-pointer ${sortConfig?.key === "lead_age" &&
                                    sortConfig.direction === "desc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {sortedLeads.map((lead, idx) => (
                            <TableRow key={lead.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">
                                {typeof pageSize === "number"
                                  ? (currentPage - 1) * pageSize + idx + 1
                                  : idx + 1}
                              </TableCell>

                              <TableCell className="font-medium">
                                {lead.business_id}
                              </TableCell>


                              <TableCell
                                className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                                onClick={() => window.open(`/leads/${lead.business_id}`, "_blank")}
                              >
                                {lead.name ?? "-"}
                              </TableCell>

                              {/* <TableCell className="font-medium max-w-[160px] whitespace-normal">
                                {lead.name}
                              </TableCell> */}

                              <TableCell className="max-w-[120px] whitespace-normal">
                                {lead.phone}
                              </TableCell>

                              <TableCell className="max-w-[160px] whitespace-normal">
                                {lead.email}
                              </TableCell>

                              <TableCell className="max-w-[120px] whitespace-normal">
                                {lead.city}
                              </TableCell>

                              <TableCell className="max-w-[90px] whitespace-normal">
                                <Badge
                                  className={getSourceBadgeColor(
                                    (lead.source ?? "").toString()
                                  )}
                                >
                                  {(lead.source ?? "").toString().trim()}
                                </Badge>
                              </TableCell>

                              <TableCell className="max-w-[100px] whitespace-normal">
                                <Badge
                                  className={
                                    lead.status === "Assigned"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }
                                >
                                  {lead.status}
                                </Badge>
                              </TableCell>

                              <TableCell className="max-w-[140px] whitespace-normal">
                                {lead.created_at
                                  ? new Date(lead.created_at).toLocaleString(
                                    "en-IN",
                                    {
                                      timeZone: "Asia/Kolkata",
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    }
                                  )
                                  : ""}
                              </TableCell>

                              <TableCell className="max-w-[100px] whitespace-normal">
                                {(() => {
                                  if (!lead.created_at) return "-";
                                  const createdAt = new Date(lead.created_at);
                                  const diffDays = Math.floor(
                                    (Date.now() - createdAt.getTime()) /
                                    (1000 * 60 * 60 * 24)
                                  );
                                  return `${diffDays} days`;
                                })()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  ) : (
                    <>
                      <Table className="min-w-[1100px] w-full break-words text-center">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16 max-w-[70px] whitespace-normal">
                              s.no
                            </TableHead>

                            <TableHead>
                              <div className="flex items-center gap-1 justify-center">
                                Lead ID
                                <span
                                  onClick={() =>
                                    handleSalesSort("lead_id", "asc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "lead_id" &&
                                    salesSort.direction === "asc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() =>
                                    handleSalesSort("lead_id", "desc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "lead_id" &&
                                    salesSort.direction === "desc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>

                            <TableHead>
                              <div className="flex items-center gap-1 justify-center">
                                Name
                                <span
                                  onClick={() =>
                                    handleSalesSort("lead_name", "asc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "lead_name" &&
                                    salesSort.direction === "asc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() =>
                                    handleSalesSort("lead_name", "desc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "lead_name" &&
                                    salesSort.direction === "desc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>

                            <TableHead>Email</TableHead>
                            <TableHead>
                              <div className="flex items-center gap-1 justify-center">
                                Source
                                <span
                                  onClick={() =>
                                    handleSalesSort("source", "asc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "source" &&
                                    salesSort.direction === "asc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() =>
                                    handleSalesSort("source", "desc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "source" &&
                                    salesSort.direction === "desc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-1 justify-center">
                                Salesperson
                                <span
                                  onClick={() =>
                                    handleSalesSort("assigned_to", "asc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "assigned_to" &&
                                    salesSort.direction === "asc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() =>
                                    handleSalesSort("assigned_to", "desc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "assigned_to" &&
                                    salesSort.direction === "desc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Incentives</TableHead>
                            <TableHead>Referral ID</TableHead>

                            <TableHead>
                              <div className="flex items-center gap-1 justify-center">
                                Closed At
                                <span
                                  onClick={() =>
                                    handleSalesSort("closed_at", "asc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "closed_at" &&
                                    salesSort.direction === "asc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() =>
                                    handleSalesSort("closed_at", "desc")
                                  }
                                  className={`cursor-pointer ${salesSort?.key === "closed_at" &&
                                    salesSort.direction === "desc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {sortedSales.map((row, idx) => (
                            <TableRow key={`${row.lead_id}-${idx}`} className="hover:bg-gray-50">
                              <TableCell className="font-medium">
                                {typeof pageSize === "number"
                                  ? (currentPage - 1) * pageSize + idx + 1
                                  : idx + 1}
                              </TableCell>

                              <TableCell className="font-medium">
                                {row.lead_id}
                              </TableCell>

                              <TableCell
                                className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                                onClick={() => window.open(`/leads/${row.lead_id}`, "_blank")}
                              >
                                {row.lead_name ?? "-"}
                              </TableCell>

                              {/* <TableCell className="font-medium max-w-[160px] whitespace-normal">
                                {row.lead_name ?? "-"}
                              </TableCell> */}
                              <TableCell className="max-w-[160px] whitespace-normal">
                                {row.email}
                              </TableCell>

                              <TableCell className="max-w-[90px] whitespace-normal">
                                <Badge
                                  className={getSourceBadgeColor(
                                    (row.source ?? "").toString()
                                  )}
                                >
                                  {(row.source ?? "").toString().trim() || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[140px] whitespace-normal">
                                {row.assigned_to ?? "-"}
                              </TableCell>
                              <TableCell className="max-w-[120px] whitespace-normal">
                                {row.phone ?? "-"}
                              </TableCell>
                              <TableCell className="max-w-[120px] whitespace-normal">
                                {row.city ?? "-"}
                              </TableCell>
                              <TableCell className="max-w-[100px] whitespace-normal">
                                {row.incentives ?? "-"}
                              </TableCell>
                              <TableCell className="max-w-[120px] whitespace-normal">
                                {row.referral_id ?? "-"}
                              </TableCell>

                              <TableCell className="max-w-[140px] whitespace-normal">
                                {row.closed_at
                                  ? new Date(row.closed_at).toLocaleString(
                                    "en-IN",
                                    {
                                      timeZone: "Asia/Kolkata",
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    }
                                  )
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}

                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={pageSize === "all" || currentPage === 1}
                    >
                      ⬅ Previous
                    </Button>
                    <span className="text-gray-600">
                      {pageSize === "all" ? (
                        <>
                          Showing all{" "}
                          {view === "marketing" ? mkTotalCount : salesTotalCount}{" "}
                          {view === "marketing" ? "leads" : "sales"}
                        </>
                      ) : (
                        <>
                          Page {currentPage} of {totalPages}
                        </>
                      )}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={pageSize === "all" || currentPage === totalPages}
                    >
                      Next ➡
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* </div> */}
        </DashboardLayout>
      </ProtectedRoute>
    </>
  );
}
