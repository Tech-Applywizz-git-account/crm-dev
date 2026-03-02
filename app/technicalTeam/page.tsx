// //app/technicalTeam/page.tsx

// "use client";
// import Link from "next/link";
// import { useEffect, useState, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/utils/supabase/client";
// import Papa from "papaparse";
// import { ArrowUpDown } from "lucide-react";
// import * as XLSX from "xlsx";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Input } from "@/components/ui/input";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Pagination,
//   PaginationContent,
//   PaginationItem,
//   PaginationLink,
//   PaginationNext,
//   PaginationPrevious,
// } from "@/components/ui/pagination";

// import ProtectedRoute from "@/components/auth/ProtectedRoute";
// import { DashboardLayout } from "@/components/layout/dashboard-layout";
// import { useAuth } from "@/components/providers/auth-provider";

// /* =========================
//    Types & Constants
//    ========================= */

// type FinanceStatus = "Paid" | "Unpaid" | "Paused" | "Closed" | "Got Placed";

// type RawCsv = {
//   lead_id?: string;
//   lead_name?: string;
//   company_application_mail?: string;
//   persoanl_mail_id?: string;
//   phone_number?: string;
//   whatsapp_number?: string;
//   sale_done_by?: string;
//   closed_at?: any;
//   source?: string;
//   total_amount?: any;
//   application_sale_value?: any;
//   resume_value?: any;
//   portfolio_value?: any;
//   linkedin_value?: any;
//   github_value?: any;
//   courses_value?: any;
//   addons_value?: any;
//   onboarded_date?: any;
//   subscription_cycle?: any;
//   custom_add_on_name?: string;
//   associate_tl_email?: string;
//   associate_tl_name?: string;
//   associate_email?: string;
//   associate_name?: string;
//   commitments?: string;
// };

// type ResumeStatus =
//   | "not_started"
//   | "pending"
//   | "waiting_client_approval"
//   | "completed";

// const STATUS_LABEL: Record<ResumeStatus, string> = {
//   not_started: "Not started",
//   pending: "Pending",
//   waiting_client_approval: "Waiting for client approval",
//   completed: "Completed",
// };

// type PortfolioStatus =
//   | "not_started"
//   | "pending"
//   | "waiting_client_approval"
//   | "success";

// const PORTFOLIO_STATUS_LABEL: Record<PortfolioStatus, string> = {
//   not_started: "Not started",
//   pending: "Pending",
//   waiting_client_approval: "Waiting for Client approval",
//   success: "Success",
// };

// const PORTFOLIO_STATUS_OPTIONS: PortfolioStatus[] = [
//   "not_started",
//   "pending",
//   "waiting_client_approval",
//   "success",
// ];

// type GithubStatus =
//   | "not_started"
//   | "pending"
//   | "waiting_client_approval"
//   | "success";

// const GITHUB_STATUS_LABEL: Record<GithubStatus, string> = {
//   not_started: "Not started",
//   pending: "Pending",
//   waiting_client_approval: "Waiting for Client approval",
//   success: "Success",
// };

// const GITHUB_STATUS_OPTIONS: GithubStatus[] = [
//   "not_started",
//   "pending",
//   "waiting_client_approval",
//   "success",
// ];

// interface SalesClosure {
//   id: string;
//   lead_id: string;
//   email: string;
//   finance_status: FinanceStatus;
//   closed_at: string | null;
//   portfolio_sale_value?: number | null;
//   github_sale_value?: number | null;
//   associates_email?: string | null;
//   associates_name?: string | null;
//   associates_tl_email?: string | null;
//   associates_tl_name?: string | null;
//   leads?: { name: string; phone: string };
//   rp_status?: ResumeStatus;
//   rp_pdf_path?: string | null;
//   pp_status?: PortfolioStatus | null;
//   pp_link?: string | null;
//   pp_assigned_email?: string | null;
//   pp_assigned_name?: string | null;
//   pp_updated_at?: string | null;
//   gp_status?: GithubStatus | null;
//   gp_assigned_email?: string | null;
//   gp_assigned_name?: string | null;
//   gp_updated_at?: string | null;
// }

// interface TeamUser {
//   full_name: string;
//   user_email: string;
//   roles: "Technical Head" | "Technical Associate";
// }

// const PORTFOLIO_COLUMNS = [
//   "S.No",
//   "Client ID",
//   "Name",
//   "Email",
//   "Phone",
//   "Status",
//   "Resume Status",
//   "Resume PDF",
//   "Portfolio Status",
//   "Portfolio Link",
//   "Assignee",
//   "Closed At",
//   "Status Updated/Closed At",
// ] as const;

// const GITHUB_COLUMNS = [
//   "S.No",
//   "Client ID",
//   "Name",
//   "Email",
//   "Phone",
//   "Status",
//   "GitHub Sale Value",
//   "GitHub Status",
//   "Assignee",
//   "Closed At",
//   "Status Updated/Closed At",
// ] as const;

// /* =========================
//    Component
//    ========================= */

// export default function TechnicalTeamPage() {
//   const [loading, setLoading] = useState(true);
//   const [portfolioRows, setPortfolioRows] = useState<SalesClosure[]>([]);
//   const [githubRows, setGithubRows] = useState<SalesClosure[]>([]);
//   const [filteredPortfolioRows, setFilteredPortfolioRows] = useState<SalesClosure[]>([]);
//   const [filteredGithubRows, setFilteredGithubRows] = useState<SalesClosure[]>([]);
//   const [teamMembers, setTeamMembers] = useState<TeamUser[]>([]);
//   const [selectedAssignee, setSelectedAssignee] = useState<string>("all");

//   // Pagination states
//   const [currentPortfolioPage, setCurrentPortfolioPage] = useState(1);
//   const [currentGithubPage, setCurrentGithubPage] = useState(1);
//   const [portfolioPageSize, setPortfolioPageSize] = useState<number | "all">(10);
//   const [githubPageSize, setGithubPageSize] = useState<number | "all">(10);

//   const [linkDraft, setLinkDraft] = useState<Record<string, string>>({});
//   const [linkDialogOpen, setLinkDialogOpen] = useState(false);
//   const [linkTargetLeadId, setLinkTargetLeadId] = useState<string | null>(null);
//   const [linkTargetRowId, setLinkTargetRowId] = useState<string | null>(null);

//   const [importInsertOpen, setImportInsertOpen] = useState(false);
//   const [insertFile, setInsertFile] = useState<File | null>(null);
//   const [parsingInsert, setParsingInsert] = useState(false);
//   const [importingInsert, setImportingInsert] = useState(false);
//   const [rawRowsInsert, setRawRowsInsert] = useState<any[]>([]);
//   const [validRowsToInsert, setValidRowsToInsert] = useState<any[]>([]);
//   const [invalidRowsInsert, setInvalidRowsInsert] = useState<
//     { index: number; errors: string[] }[]
//   >([]);

//   const [importUpdateOpen, setImportUpdateOpen] = useState(false);
//   const [updateFile, setUpdateFile] = useState<File | null>(null);
//   const [parsingUpdate, setParsingUpdate] = useState(false);
//   const [importingUpdate, setImportingUpdate] = useState(false);
//   const [rawRowsUpdate, setRawRowsUpdate] = useState<any[]>([]);
//   const [invalidRowsUpdate, setInvalidRowsUpdate] = useState<
//     { index: number; errors: string[] }[]
//   >([]);

//   const [myTasksOpen, setMyTasksOpen] = useState(false);
//   const [myTasksRows, setMyTasksRows] = useState<SalesClosure[]>([]);
//   const [myTasksLoading, setMyTasksLoading] = useState(false);
//   const [myTasksError, setMyTasksError] = useState<string | null>(null);

//   const [updatesToApply, setUpdatesToApply] = useState<
//     { lead_id: string; patch: Record<string, any> }[]
//   >([]);
//   const [latestIdByLead, setLatestIdByLead] = useState<Record<string, string>>({});
//   const [missingLeadIds, setMissingLeadIds] = useState<string[]>([]);

//   const [assigneeByRow, setAssigneeByRow] = useState<
//     Record<string, string | undefined>
//   >({});

//   const [githubAssigneeByRow, setGithubAssigneeByRow] = useState<
//     Record<string, string | undefined>
//   >({});

//   const [searchInput, setSearchInput] = useState("");
//   const [searchQuery, setSearchQuery] = useState("");

//   // Sorting states
//   const [portfolioSortColumn, setPortfolioSortColumn] = useState<string | null>(null);
//   const [portfolioSortDirection, setPortfolioSortDirection] = useState<"asc" | "desc">("asc");
//   const [githubSortColumn, setGithubSortColumn] = useState<string | null>(null);
//   const [githubSortDirection, setGithubSortDirection] = useState<"asc" | "desc">("asc");

//   const { user } = useAuth();
//   const router = useRouter();
//   const quickFileInputRef = useRef<HTMLInputElement | null>(null);

//   // Page size options
//   const pageSizeOptions = [
//     { value: 10, label: "10 per page" },
//     { value: 30, label: "30 per page" },
//     { value: 50, label: "50 per page" },
//     { value: 100, label: "100 per page" },
//     { value: 200, label: "200 per page" },
//     { value: 500, label: "500 per page" },
//     { value: 1000, label: "1000 per page" },
//     { value: 2000, label: "2000 per page" },
//     { value: "all", label: "All records" },
//   ];

//   /* =========================
//      Pagination Logic
//      ========================= */

//   const getPaginatedRows = (rows: SalesClosure[], currentPage: number, pageSize: number | "all") => {
//     if (pageSize === "all") {
//       return rows;
//     }
//     const startIndex = (currentPage - 1) * pageSize;
//     const endIndex = startIndex + pageSize;
//     return rows.slice(startIndex, endIndex);
//   };

//   const getTotalPages = (rows: SalesClosure[], pageSize: number | "all") => {
//     if (pageSize === "all") {
//       return 1;
//     }
//     return Math.ceil(rows.length / pageSize);
//   };

//   const handlePortfolioPageChange = (page: number) => {
//     setCurrentPortfolioPage(page);
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const handleGithubPageChange = (page: number) => {
//     setCurrentGithubPage(page);
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const handlePortfolioPageSizeChange = (value: string) => {
//     const newSize = value === "all" ? "all" : parseInt(value, 10);
//     setPortfolioPageSize(newSize);
//     setCurrentPortfolioPage(1); // Reset to first page when page size changes
//   };

//   const handleGithubPageSizeChange = (value: string) => {
//     const newSize = value === "all" ? "all" : parseInt(value, 10);
//     setGithubPageSize(newSize);
//     setCurrentGithubPage(1); // Reset to first page when page size changes
//   };

//   /* =========================
//      Assignee Filter Logic
//      ========================= */

//   const handleAssigneeFilter = (email: string) => {
//     setSelectedAssignee(email);
//   };

//   /* =========================
//      Sorting Logic
//      ========================= */

//   const handlePortfolioSort = (column: string) => {
//     if (portfolioSortColumn === column) {
//       setPortfolioSortDirection(portfolioSortDirection === "asc" ? "desc" : "asc");
//     } else {
//       setPortfolioSortColumn(column);
//       setPortfolioSortDirection("asc");
//     }
//   };

//   const handleGithubSort = (column: string) => {
//     if (githubSortColumn === column) {
//       setGithubSortDirection(githubSortDirection === "asc" ? "desc" : "asc");
//     } else {
//       setGithubSortColumn(column);
//       setGithubSortDirection("asc");
//     }
//   };

//   const sortRows = (rows: SalesClosure[], sortColumn: string | null, sortDirection: "asc" | "desc") => {
//     if (!sortColumn) return rows;

//     return [...rows].sort((a, b) => {
//       let aValue: any;
//       let bValue: any;

//       switch (sortColumn) {
//         case "Client ID":
//           aValue = a.lead_id || "";
//           bValue = b.lead_id || "";
//           break;
//         case "Name":
//           aValue = a.leads?.name || "";
//           bValue = b.leads?.name || "";
//           break;
//         case "Email":
//           aValue = a.email || "";
//           bValue = b.email || "";
//           break;
//         case "Closed At":
//           aValue = a.closed_at ? new Date(a.closed_at).getTime() : 0;
//           bValue = b.closed_at ? new Date(b.closed_at).getTime() : 0;
//           break;
//         case "Status Updated/Closed At":
//           // For Portfolio table, use pp_updated_at
//           // For GitHub table, use gp_updated_at
//           aValue = (a.pp_updated_at || a.gp_updated_at) ? new Date(a.pp_updated_at || a.gp_updated_at || 0).getTime() : 0;
//           bValue = (b.pp_updated_at || b.gp_updated_at) ? new Date(b.pp_updated_at || b.gp_updated_at || 0).getTime() : 0;
//           break;
//         default:
//           return 0;
//       }

//       // Handle string comparison
//       if (typeof aValue === "string" && typeof bValue === "string") {
//         const comparison = aValue.localeCompare(bValue);
//         return sortDirection === "asc" ? comparison : -comparison;
//       }

//       // Handle numeric comparison (including dates as timestamps)
//       if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
//       if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
//       return 0;
//     });
//   };

//   /* =========================
//      Helpers
//      ========================= */

//   const addIfPresent = (obj: any, key: string, value: any) => {
//     const v = value;
//     if (v === undefined || v === null) return;
//     if (typeof v === "string" && v.trim() === "") return;
//     obj[key] = v;
//   };

//   const cleanMoney = (v: any): number | null => {
//     if (v === null || v === undefined || v === "") return null;
//     const s = String(v).replace(/[,\s₹]/g, "");
//     const n = parseFloat(s);
//     return Number.isFinite(n) ? n : null;
//   };

//   const money = (v: any): number | null => {
//     if (v === null || v === undefined) return null;
//     const s = String(v).replace(/[,\s₹$]/g, "").trim();
//     if (s === "" || s === "-") return null;
//     const n = parseFloat(s);
//     return Number.isFinite(n) ? n : null;
//   };

//   const cleanIntCycle = (v: any): number | null => {
//     if (v === null || v === undefined) return null;
//     const n = parseInt(String(v).replace(/\D/g, ""), 10);
//     return [15, 30, 60, 90].includes(n) ? n : null;
//   };

//   const toSaleRecord = (r: RawCsv) => ({
//     lead_id: (r.lead_id ?? "").trim(),
//     sale_value: money(r.total_amount) ?? 0,
//     subscription_cycle: cleanIntCycle(r.subscription_cycle) ?? 30,
//     payment_mode: mapPaymentMode(r.source),
//     closed_at: parseDateTime(r.closed_at),
//     email: normEmpty(r.persoanl_mail_id) || normEmpty(r.company_application_mail) || "",
//     finance_status: "Paid",
//     lead_name: (r.lead_name ?? "").trim() || null,
//     onboarded_date: parseDateOnly(r.onboarded_date),
//     application_sale_value: money(r.application_sale_value),
//     resume_sale_value: money(r.resume_value),
//     portfolio_sale_value: money(r.portfolio_value),
//     linkedin_sale_value: money(r.linkedin_value),
//     github_sale_value: money(r.github_value),
//     courses_sale_value: money(r.courses_value),
//     custom_sale_value: money(r.addons_value),
//     custom_label: normEmpty(r.custom_add_on_name) || null,
//     company_application_email: normEmpty(r.company_application_mail) || null,
//     associates_tl_email: normEmpty(r.associate_tl_email) || "",
//     associates_tl_name: normEmpty(r.associate_tl_name) || "",
//     associates_email: normEmpty(r.associate_email) || "",
//     associates_name: normEmpty(r.associate_name) || "",
//     account_assigned_email: normEmpty(r.sale_done_by) || "",
//     commitments: normEmpty(r.commitments) || null,
//   });

//   const validateSalesOnly = (rows: RawCsv[]) => {
//     const valids: RawCsv[] = [];
//     const invalids: { index: number; errors: string[] }[] = [];

//     rows.forEach((r, i) => {
//       const errors: string[] = [];
//       if (!r.lead_id || !r.lead_id.toString().trim())
//         errors.push("lead_id missing");
//       if (money(r.total_amount) === null)
//         errors.push("total_amount missing/invalid");
//       if (cleanIntCycle(r.subscription_cycle) === null)
//         errors.push("subscription_cycle invalid (must be 15/30/60/90)");
//       if (!normEmpty(r.persoanl_mail_id) && !normEmpty(r.company_application_mail))
//         errors.push("email missing (persoanl_mail_id / company_application_mail)");

//       if (errors.length) invalids.push({ index: i + 1, errors });
//       else valids.push(r);
//     });

//     return { valids, invalids };
//   };

//   const parseDateTime = (v: any): string | null => {
//     if (v === null || v === undefined || v === "") return null;
//     if (typeof v === "number") {
//       const d = XLSX.SSF.parse_date_code(v);
//       if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString();
//     }
//     const s = String(v).trim();
//     const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
//     if (m) {
//       const d = +m[1], mo = +m[2], yy = +m[3];
//       const yyyy = yy < 100 ? 2000 + yy : yy;
//       const dt = new Date(yyyy, mo - 1, d);
//       return isNaN(dt.getTime()) ? null : dt.toISOString();
//     }
//     const dt = new Date(s);
//     return isNaN(dt.getTime()) ? null : dt.toISOString();
//   };

//   const parseDateOnly = (v: any) => {
//     const iso = parseDateTime(v);
//     return iso ? iso.slice(0, 10) : null;
//   };

//   const normHeader = (h: string) =>
//     String(h || "")
//       .replace(/\uFEFF/g, "")
//       .trim()
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "_")
//       .replace(/^_|_$/g, "");

//   const parseCsvString = (csv: string) =>
//     new Promise<any[]>((resolve, reject) => {
//       Papa.parse(csv, {
//         header: true,
//         skipEmptyLines: true,
//         transformHeader: normHeader,
//         complete: (res) => resolve(res.data as any[]),
//         error: (err: any) => reject(err),
//       });
//     });

//   const pick = (row: any, ...keys: string[]) => {
//     for (const k of keys) {
//       if (row[k] !== undefined && row[k] !== null) {
//         const v = typeof row[k] === "string" ? row[k].trim() : row[k];
//         if (v !== "") return v;
//       }
//     }
//     return undefined;
//   };

//   const mapPaymentMode = (src: any): "UPI" | "Bank Transfer" | "PayPal" | "Stripe" | "Credit/Debit Card" | "Other" | "Razorpay" => {
//     const s = String(src ?? "").trim().toLowerCase();
//     if (["razor pay", "razorpay", "razor pay "].includes(s)) return "Razorpay";
//     if (["phonepe", "phone pe", "phone pay"].includes(s)) return "UPI";
//     if (s === "paypal") return "PayPal";
//     if (s === "stripe") return "Stripe";
//     if (s === "credit/debit card" || s === "card") return "Credit/Debit Card";
//     if (s === "bank transfer" || s === "wire") return "Bank Transfer";
//     return "Other";
//   };

//   const normEmpty = (x: any) => {
//     const s = (x ?? "").toString().trim();
//     return (s === "" || s === "-") ? "" : s;
//   };

//   const rowToPatch = (r: any) => {
//     const patch: any = {};
//     addIfPresent(patch, "lead_name", pick(r, "lead_name"));
//     addIfPresent(
//       patch,
//       "company_application_email",
//       pick(
//         r,
//         "company_application_mail",
//         "company_applicati_mail",
//         "company_mail"
//       )
//     );
//     addIfPresent(
//       patch,
//       "email",
//       pick(r, "persoanl_mail_id", "personal_mail_id", "personal_mailid")
//     );
//     addIfPresent(patch, "commitments", pick(r, "commitments"));
//     addIfPresent(
//       patch,
//       "custom_label",
//       pick(r, "custom_add_on_name", "custom_add_on_name_")
//     );

//     const closedAt = parseDateTime(pick(r, "closed_at") ?? null);
//     if (closedAt) patch.closed_at = closedAt;

//     const onboard = parseDateOnly(pick(r, "onboarded_date") ?? null);
//     if (onboard) patch.onboarded_date = onboard;

//     const cycle = cleanIntCycle(pick(r, "subscription_cycle") ?? null);
//     if (cycle !== null) patch.subscription_cycle = cycle;

//     const saleValue = cleanMoney(pick(r, "total_amount"));
//     if (saleValue !== null) patch.sale_value = saleValue;

//     const appVal = cleanMoney(pick(r, "application_sale_value"));
//     if (appVal !== null) patch.application_sale_value = appVal;

//     const resumeVal = cleanMoney(pick(r, "resume_value"));
//     if (resumeVal !== null) patch.resume_sale_value = resumeVal;

//     const portfolioVal = cleanMoney(pick(r, "portfolio_value"));
//     if (portfolioVal !== null) patch.portfolio_sale_value = portfolioVal;

//     const linkedinVal = cleanMoney(pick(r, "linkedin_value"));
//     if (linkedinVal !== null) patch.linkedin_sale_value = linkedinVal;

//     const githubVal = cleanMoney(pick(r, "github_value"));
//     if (githubVal !== null) patch.github_sale_value = githubVal;

//     const coursesVal = cleanMoney(pick(r, "courses_value"));
//     if (coursesVal !== null) patch.courses_sale_value = coursesVal;

//     const addonsVal = cleanMoney(pick(r, "addons_value"));
//     if (addonsVal !== null) patch.custom_sale_value = addonsVal;

//     addIfPresent(patch, "associates_tl_email", pick(r, "associate_tl_email"));
//     addIfPresent(patch, "associates_tl_name", pick(r, "associate_tl_name"));
//     addIfPresent(patch, "associates_email", pick(r, "associate_email"));
//     addIfPresent(patch, "associates_name", pick(r, "associate_name"));

//     return patch;
//   };

//   const buildUpdatesFromRows = (rows: any[]) => {
//     const items: { lead_id: string; patch: Record<string, any> }[] = [];
//     const invalids: { index: number; errors: string[] }[] = [];

//     rows.forEach((r, i) => {
//       const rawLead = r.lead_id ?? r.leadid ?? r.lead_i_d;
//       const lead_id = rawLead ? String(rawLead).trim() : "";

//       if (!lead_id) {
//         invalids.push({ index: i + 1, errors: ["lead_id missing"] });
//         return;
//       }

//       const patch = rowToPatch(r);
//       if (!patch || Object.keys(patch).length === 0) {
//         invalids.push({
//           index: i + 1,
//           errors: ["no recognized columns to update"],
//         });
//         return;
//       }

//       items.push({ lead_id, patch });
//     });

//     return { items, invalids };
//   };

//   const prefetchLatestIds = async (leadIds: string[]) => {
//     const unique = Array.from(new Set(leadIds.filter(Boolean)));
//     if (!unique.length) {
//       setLatestIdByLead({});
//       setMissingLeadIds([]);
//       return;
//     }

//     const latest: Record<string, { id: string; closed_at: string | null }> = {};
//     const CHUNK = 1000;

//     for (let i = 0; i < unique.length; i += CHUNK) {
//       const slice = unique.slice(i, i + CHUNK);
//       const { data, error } = await supabase
//         .from("sales_closure")
//         .select("id, lead_id, closed_at")
//         .in("lead_id", slice);

//       if (error) {
//         console.error("prefetchLatestIds error:", error);
//         continue;
//       }
//       for (const row of data ?? []) {
//         const cur = latest[row.lead_id];
//         const curTs = cur?.closed_at
//           ? new Date(cur.closed_at).getTime()
//           : -Infinity;
//         const rowTs = row.closed_at
//           ? new Date(row.closed_at).getTime()
//           : -Infinity;
//         if (!cur || rowTs > curTs)
//           latest[row.lead_id] = { id: row.id, closed_at: row.closed_at };
//       }
//     }

//     const idMap: Record<string, string> = {};
//     unique.forEach((lid) => {
//       if (latest[lid]) idMap[lid] = latest[lid].id;
//     });

//     setLatestIdByLead(idMap);
//     setMissingLeadIds(unique.filter((lid) => !idMap[lid]));
//   };

//   const rowToInsert = (r: any) => {
//     const lead_id =
//       (r.lead_id ?? r["Lead_id"] ?? r["lead id"] ?? r["Lead ID"])
//         ?.toString()
//         .trim();

//     const sale_value = cleanMoney(
//       r.total_amount ?? r.Total_amount ?? r["Total Amount"]
//     );

//     const subscription_cycle = cleanIntCycle(
//       r.subscription_cycle ?? r.Subscription_cycle
//     );

//     const email = (
//       r.persoanl_mail_id ??
//       r.personal_mail_id ??
//       r.Persoanl_mail_id ??
//       r["Personal_mail_id"] ??
//       r.company_application_mail ??
//       r.Company_application_mail
//     )
//       ?.toString()
//       .trim();

//     const record: any = {
//       lead_id,
//       sale_value,
//       subscription_cycle,
//       payment_mode: "UPI",
//       email,
//       closed_at: parseDateTime(r.closed_at ?? r.Closed_at),
//       finance_status: "Paid",
//       lead_name: r.lead_name ?? r.Lead_name ?? null,
//       company_application_email:
//         r.company_application_mail ?? r.Company_application_mail ?? null,
//       application_sale_value: cleanMoney(
//         r.application_sale_value ?? r.Application_sale_value
//       ),
//       resume_sale_value: cleanMoney(r.resume_value ?? r.Resume_value),
//       portfolio_sale_value: cleanMoney(r.portfolio_value ?? r.Portfolio_value),
//       linkedin_sale_value: cleanMoney(r.linkedin_value ?? r.LinkedIn_value),
//       github_sale_value: cleanMoney(r.github_value ?? r.GitHub_value),
//       courses_sale_value: cleanMoney(r.courses_value ?? r.Courses_value),
//       custom_label:
//         r.custom_add_on_name ??
//         r["Custom Add-on_name"] ??
//         r["Custom Add-on Name"] ??
//         null,
//       custom_sale_value: cleanMoney(r.addons_value ?? r.Addons_value),
//       onboarded_date: parseDateOnly(r.onboarded_date ?? r.Onboarded_date),
//       associates_tl_email: r.associate_tl_email ?? "",
//       associates_tl_name: r.associate_tl_name ?? "",
//       associates_email: r.associate_email ?? "",
//       associates_name: r.associate_name ?? "",
//       commitments: r.commitments ?? null,
//     };

//     return { lead_id, sale_value, subscription_cycle, email, record };
//   };

//   const validateAndBuild = (rows: any[]) => {
//     const valids: any[] = [];
//     const invalids: { index: number; errors: string[] }[] = [];

//     rows.forEach((r, i) => {
//       const { lead_id, sale_value, subscription_cycle, email, record } =
//         rowToInsert(r);
//       const errors: string[] = [];
//       if (!lead_id) errors.push("lead_id missing");
//       if (sale_value === null)
//         errors.push("Total_amount (sale_value) missing/invalid");
//       if (subscription_cycle === null)
//         errors.push("subscription_cycle invalid (must be 15/30/60/90)");
//       if (!email) errors.push("email missing");

//       if (errors.length) invalids.push({ index: i + 1, errors });
//       else valids.push(record);
//     });

//     return { valids, invalids };
//   };

//   /* =========================
//      File Handlers
//      ========================= */

//   const quickParseAndInsert = async (file: File) => {
//     try {
//       const ext = file.name.split(".").pop()?.toLowerCase();
//       let rows: any[] = [];
//       if (ext === "xlsx" || ext === "xls") {
//         const buf = await file.arrayBuffer();
//         const wb = XLSX.read(buf, { type: "array" });
//         const ws = wb.Sheets[wb.SheetNames[0]];
//         const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
//         rows = await parseCsvString(csv);
//       } else {
//         const text = await file.text();
//         rows = await parseCsvString(text);
//       }

//       const { valids, invalids } = validateAndBuild(rows);
//       alert(
//         `Parsed ${rows.length} rows.\n` +
//         `Valid: ${valids.length}\n` +
//         `Skipped (errors): ${invalids.length}`
//       );

//       if (!valids.length) {
//         alert("No valid rows to insert. Aborting.");
//         return;
//       }

//       let inserted = 0;
//       const CHUNK = 500;
//       for (let i = 0; i < valids.length; i += CHUNK) {
//         const chunk = valids.slice(i, i + CHUNK);
//         const { error } = await supabase.from("sales_closure").insert(chunk);
//         if (error) throw error;
//         inserted += chunk.length;
//       }

//       await fetchData();
//       alert(`Imported ${inserted} records successfully.`);
//     } catch (e: any) {
//       alert(e?.message || "Quick import failed");
//     } finally {
//       if (quickFileInputRef.current) quickFileInputRef.current.value = "";
//     }
//   };

//   // const fetchMyTasks = async () => {
//   //   try {
//   //     setMyTasksLoading(true);
//   //     setMyTasksError(null);

//   //     const assigneeEmail = (user?.email || "").trim().toLowerCase();
//   //     const assigneeName = (user?.name || "").trim();
//   //     const leadIds = new Set<string>();

//   //     if (assigneeEmail) {
//   //       const { data: byEmail, error: e1 } = await supabase
//   //         .from("portfolio_progress")
//   //         .select("lead_id")
//   //         .eq("assigned_email", assigneeEmail);
//   //       if (e1) throw e1;
//   //       (byEmail ?? []).forEach(r => r.lead_id && leadIds.add(r.lead_id));
//   //     }

//   //     if (assigneeName) {
//   //       const { data: byName, error: e2 } = await supabase
//   //         .from("portfolio_progress")
//   //         .select("lead_id")
//   //         .ilike("assigned_name", `%${assigneeName}%`);
//   //       if (e2) throw e2;
//   //       (byName ?? []).forEach(r => r.lead_id && leadIds.add(r.lead_id));
//   //     }

//   //     const allowLeadIds = Array.from(leadIds);
//   //     if (!allowLeadIds.length) {
//   //       setMyTasksRows([]);
//   //       setMyTasksOpen(true);
//   //       return;
//   //     }

//   //     const { data: sales, error: salesErr } = await supabase
//   //       .from("sales_closure")
//   //       .select("id, lead_id, email, finance_status, closed_at, portfolio_sale_value, github_sale_value, associates_email, associates_name, associates_tl_email, associates_tl_name")
//   //       .in("lead_id", allowLeadIds)
//   //       .not("portfolio_sale_value", "is", null)
//   //       .neq("portfolio_sale_value", 0);
//   //     if (salesErr) throw salesErr;

//   //     const latest = (() => {
//   //       const map = new Map<string, any>();
//   //       for (const r of sales ?? []) {
//   //         const ex = map.get(r.lead_id);
//   //         const ed = ex?.closed_at ?? "";
//   //         const cd = r?.closed_at ?? "";
//   //         if (!ex || new Date(cd) > new Date(ed)) map.set(r.lead_id, r);
//   //       }
//   //       return Array.from(map.values());
//   //     })();

//   //     const leadIdList = latest.map(r => r.lead_id);

//   //     const [{ data: leadsData }, { data: resumeProg }, { data: portfolioProg }] = await Promise.all([
//   //       supabase.from("leads").select("business_id, name, phone").in("business_id", leadIdList),
//   //       supabase.from("resume_progress").select("lead_id, status, pdf_path").in("lead_id", leadIdList),
//   //       supabase.from("portfolio_progress").select("lead_id, status, link, assigned_email, assigned_name").in("lead_id", leadIdList),
//   //     ]);

//   //     const leadMap = new Map((leadsData ?? []).map(l => [l.business_id, { name: l.name, phone: l.phone }]));
//   //     const resumeMap = new Map((resumeProg ?? []).map(p => [p.lead_id, { status: p.status as ResumeStatus, pdf_path: p.pdf_path ?? null }]));
//   //     const portfolioMap = new Map((portfolioProg ?? []).map(p => [
//   //       p.lead_id,
//   //       {
//   //         status: (p.status ?? "not_started") as PortfolioStatus,
//   //         link: p.link ?? null,
//   //         assigned_email: p.assigned_email ?? null,
//   //         assigned_name: p.assigned_name ?? null,
//   //       },
//   //     ]));

//   //     const merged: SalesClosure[] = latest.map((r) => ({
//   //       ...r,
//   //       leads: leadMap.get(r.lead_id) || { name: "-", phone: "-" },
//   //       rp_status: resumeMap.get(r.lead_id)?.status ?? "not_started",
//   //       rp_pdf_path: resumeMap.get(r.lead_id)?.pdf_path ?? null,
//   //       pp_status: portfolioMap.get(r.lead_id)?.status ?? "not_started",
//   //       pp_link: portfolioMap.get(r.lead_id)?.link ?? null,
//   //       pp_assigned_email: portfolioMap.get(r.lead_id)?.assigned_email ?? null,
//   //       pp_assigned_name: portfolioMap.get(r.lead_id)?.assigned_name ?? null,
//   //     }));

//   //     setMyTasksRows(merged);
//   //     setMyTasksOpen(true);
//   //   } catch (e: any) {
//   //     console.error(e);
//   //     setMyTasksError(e?.message || "Failed to load your tasks");
//   //     setMyTasksRows([]);
//   //     setMyTasksOpen(true);
//   //   } finally {
//   //     setMyTasksLoading(false);
//   //   }
//   // };


//   const fetchMyTasks = async () => {
//     try {
//       setMyTasksLoading(true);
//       setMyTasksError(null);

//       const assigneeEmail = (user?.email || "").trim().toLowerCase();
//       const assigneeName = (user?.name || "").trim();
//       const leadIds = new Set<string>();

//       if (assigneeEmail) {
//         const { data: byEmail, error: e1 } = await supabase
//           .from("portfolio_progress")
//           .select("lead_id")
//           .eq("assigned_email", assigneeEmail);
//         if (e1) throw e1;
//         (byEmail ?? []).forEach(r => r.lead_id && leadIds.add(r.lead_id));
//       }

//       if (assigneeName) {
//         const { data: byName, error: e2 } = await supabase
//           .from("portfolio_progress")
//           .select("lead_id")
//           .ilike("assigned_name", `%${assigneeName}%`);
//         if (e2) throw e2;
//         (byName ?? []).forEach(r => r.lead_id && leadIds.add(r.lead_id));
//       }

//       const allowLeadIds = Array.from(leadIds);
//       if (!allowLeadIds.length) {
//         setMyTasksRows([]);
//         setMyTasksOpen(true);
//         return;
//       }

//       const { data: sales, error: salesErr } = await supabase
//         .from("sales_closure")
//         .select("id, lead_id, email, finance_status, closed_at, portfolio_sale_value, github_sale_value, associates_email, associates_name, associates_tl_email, associates_tl_name")
//         .in("lead_id", allowLeadIds)
//         .not("portfolio_sale_value", "is", null)
//         .neq("portfolio_sale_value", 0);
//       if (salesErr) throw salesErr;

//       const latest = (() => {
//         const map = new Map<string, any>();
//         for (const r of sales ?? []) {
//           const ex = map.get(r.lead_id);
//           const ed = ex?.closed_at ?? "";
//           const cd = r?.closed_at ?? "";
//           if (!ex || new Date(cd) > new Date(ed)) map.set(r.lead_id, r);
//         }
//         return Array.from(map.values());
//       })();

//       const leadIdList = latest.map(r => r.lead_id);

//       const [{ data: leadsData }, { data: resumeProg }, { data: portfolioProg }] = await Promise.all([
//         supabase.from("leads").select("business_id, name, phone").in("business_id", leadIdList),
//         supabase.from("resume_progress").select("lead_id, status, pdf_path, pdf_uploaded_at").in("lead_id", leadIdList),
//         supabase.from("portfolio_progress").select("lead_id, status, link, assigned_email, assigned_name, updated_at").in("lead_id", leadIdList),
//       ]);

//       const leadMap = new Map((leadsData ?? []).map(l => [l.business_id, { name: l.name, phone: l.phone }]));

//       // Helper function for latest PDF
//       const getLatestPdfPath = (pdfPaths: string[] | null, uploadedAt: string | null) => {
//         if (!pdfPaths || pdfPaths.length === 0) return null;
//         if (uploadedAt) {
//           return pdfPaths[pdfPaths.length - 1];
//         }
//         return pdfPaths[pdfPaths.length - 1];
//       };

//       const resumeMap = new Map((resumeProg ?? []).map(p => [
//         p.lead_id,
//         {
//           status: p.status as ResumeStatus,
//           pdf_path: getLatestPdfPath(p.pdf_path, p.pdf_uploaded_at)
//         }
//       ]));

//       const portfolioMap = new Map((portfolioProg ?? []).map(p => [
//         p.lead_id,
//         {
//           status: (p.status ?? "not_started") as PortfolioStatus,
//           link: p.link ?? null,
//           assigned_email: p.assigned_email ?? null,
//           assigned_name: p.assigned_name ?? null,
//           updated_at: p.updated_at ?? null,
//         },
//       ]));

//       const merged: SalesClosure[] = latest.map((r) => ({
//         ...r,
//         leads: leadMap.get(r.lead_id) || { name: "-", phone: "-" },
//         rp_status: resumeMap.get(r.lead_id)?.status ?? "not_started",
//         rp_pdf_path: resumeMap.get(r.lead_id)?.pdf_path ?? null,
//         pp_status: portfolioMap.get(r.lead_id)?.status ?? "not_started",
//         pp_link: portfolioMap.get(r.lead_id)?.link ?? null,
//         pp_assigned_email: portfolioMap.get(r.lead_id)?.assigned_email ?? null,
//         pp_assigned_name: portfolioMap.get(r.lead_id)?.assigned_name ?? null,
//         pp_updated_at: portfolioMap.get(r.lead_id)?.updated_at ?? null,
//       }));

//       setMyTasksRows(merged);
//       setMyTasksOpen(true);
//     } catch (e: any) {
//       console.error(e);
//       setMyTasksError(e?.message || "Failed to load your tasks");
//       setMyTasksRows([]);
//       setMyTasksOpen(true);
//     } finally {
//       setMyTasksLoading(false);
//     }
//   };

//   const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const f = e.target.files?.[0];
//     if (f) await quickParseAndInsert(f);
//   };

//   const triggerQuickImport = () => {
//     quickFileInputRef.current?.click();
//   };

//   const handleParseSelectedFileInsert = async (file: File) => {
//     setParsingInsert(true);
//     setRawRowsInsert([]);
//     setValidRowsToInsert([]);
//     setInvalidRowsInsert([]);

//     try {
//       const ext = file.name.split(".").pop()?.toLowerCase();
//       let rows: any[] = [];

//       if (ext === "xlsx" || ext === "xls") {
//         const buf = await file.arrayBuffer();
//         const wb = XLSX.read(buf, { type: "array" });
//         const ws = wb.Sheets[wb.SheetNames[0]];
//         const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
//         rows = await parseCsvString(csv);
//       } else {
//         const text = await file.text();
//         rows = await parseCsvString(text);
//       }

//       setRawRowsInsert(rows);
//       const { valids, invalids } = validateSalesOnly(rows as RawCsv[]);
//       setValidRowsToInsert(valids);
//       setInvalidRowsInsert(invalids);
//     } catch (e: any) {
//       alert(e?.message || "Failed to parse the selected file");
//     } finally {
//       setParsingInsert(false);
//     }
//   };

//   const handleParseSelectedFileUpdate = async (file: File) => {
//     setParsingUpdate(true);
//     setRawRowsUpdate([]);
//     setInvalidRowsUpdate([]);
//     setUpdatesToApply([]);
//     setLatestIdByLead({});
//     setMissingLeadIds([]);

//     try {
//       const ext = file.name.split(".").pop()?.toLowerCase();
//       let rows: any[] = [];

//       if (ext === "xlsx" || ext === "xls") {
//         const buf = await file.arrayBuffer();
//         const wb = XLSX.read(buf, { type: "array" });
//         const ws = wb.Sheets[wb.SheetNames[0]];
//         const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
//         rows = await parseCsvString(csv);
//       } else {
//         const text = await file.text();
//         rows = await parseCsvString(text);
//       }

//       setRawRowsUpdate(rows);
//       const { items, invalids } = buildUpdatesFromRows(rows);
//       setUpdatesToApply(items);
//       setInvalidRowsUpdate(invalids);
//       await prefetchLatestIds(items.map((i) => i.lead_id));
//     } catch (e: any) {
//       alert(e?.message || "Failed to parse the selected file");
//     } finally {
//       setParsingUpdate(false);
//     }
//   };

//   /* =========================
//      Submit Handlers
//      ========================= */

//   const handleImportSubmit = async () => {
//     if (!validRowsToInsert.length) {
//       alert("No valid rows to insert.");
//       return;
//     }
//     setImportingInsert(true);

//     let closuresInserted = 0;
//     let failed = 0;

//     try {
//       const saleRecords = (validRowsToInsert as RawCsv[]).map(r => toSaleRecord(r));
//       const CHUNK = 500;
//       for (let i = 0; i < saleRecords.length; i += CHUNK) {
//         const chunk = saleRecords.slice(i, i + CHUNK);
//         const { error } = await supabase.from("sales_closure").insert(chunk);
//         if (error) {
//           for (const row of chunk) {
//             const { error: e } = await supabase.from("sales_closure").insert(row);
//             if (e) failed++; else closuresInserted++;
//           }
//         } else {
//           closuresInserted += chunk.length;
//         }
//       }

//       await fetchData();
//       alert(
//         `Import finished.\n` +
//         `Sales closures inserted: ${closuresInserted}\n` +
//         `Skipped/failed rows: ${failed}`
//       );

//       setImportInsertOpen(false);
//       setInsertFile(null);
//       setRawRowsInsert([]);
//       setValidRowsToInsert([]);
//       setInvalidRowsInsert([]);
//     } catch (e: any) {
//       alert(e?.message || "Import failed");
//     } finally {
//       setImportingInsert(false);
//     }
//   };

//   const handleUpdateSubmitByLeadId = async () => {
//     if (!updatesToApply.length) {
//       alert("No valid rows to update.");
//       return;
//     }

//     setImportingUpdate(true);
//     let updated = 0;
//     let failed = 0;

//     try {
//       for (const item of updatesToApply) {
//         const rowId = latestIdByLead[item.lead_id];
//         if (!rowId) continue;

//         const { error } = await supabase
//           .from("sales_closure")
//           .update(item.patch)
//           .eq("id", rowId);

//         if (error) {
//           failed++;
//           console.error("Update failed for", item.lead_id, error);
//         } else {
//           updated++;
//         }
//       }

//       await fetchData();
//       alert(
//         `Update complete.\nUpdated: ${updated}\nUnmatched lead_ids (no row in DB): ${missingLeadIds.length}\nFailed: ${failed}`
//       );

//       setImportUpdateOpen(false);
//       setUpdateFile(null);
//       setRawRowsUpdate([]);
//       setUpdatesToApply([]);
//       setInvalidRowsUpdate([]);
//       setLatestIdByLead({});
//       setMissingLeadIds([]);
//     } catch (e: any) {
//       alert(e?.message || "Bulk update failed");
//     } finally {
//       setImportingUpdate(false);
//     }
//   };

//   /* =========================
//      Data Fetch
//      ========================= */

//   const latestByLead = (rows: any[]) => {
//     const map = new Map<string, any>();
//     for (const r of rows ?? []) {
//       const ex = map.get(r.lead_id);
//       const ed = ex?.closed_at ?? "";
//       const cd = r?.closed_at ?? "";
//       if (!ex || new Date(cd) > new Date(ed)) map.set(r.lead_id, r);
//     }
//     return Array.from(map.values()).sort(
//       (a, b) =>
//         new Date(b.closed_at || "").getTime() -
//         new Date(a.closed_at || "").getTime()
//     );
//   };

//   const toNiceMoney = (v?: number | null) =>
//     typeof v === "number"
//       ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 })
//       : "-";

//   // const fetchData = async () => {
//   //   if (!user) return;

//   //   const qPortfolio = supabase
//   //     .from("sales_closure")
//   //     .select(
//   //       "id, lead_id, email, finance_status, closed_at, portfolio_sale_value, github_sale_value, associates_email, associates_name, associates_tl_email, associates_tl_name"
//   //     )
//   //     .not("portfolio_sale_value", "is", null)
//   //     .neq("portfolio_sale_value", 0);

//   //   const qGithub = supabase
//   //     .from("sales_closure")
//   //     .select(
//   //       "id, lead_id, email, finance_status, closed_at, portfolio_sale_value, github_sale_value"
//   //     )
//   //     .not("github_sale_value", "is", null)
//   //     .neq("github_sale_value", 0);

//   //   const [{ data: pData, error: pErr }, { data: gData, error: gErr }] =
//   //     await Promise.all([qPortfolio, qGithub]);
//   //   if (pErr || gErr) {
//   //     console.error("Failed to fetch sales data:", pErr || gErr);
//   //     return;
//   //   }

//   //   const pLatest = latestByLead(pData || []);
//   //   const gLatest = latestByLead(gData || []);
//   //   const allLeadIds = Array.from(
//   //     new Set([...pLatest, ...gLatest].map((r) => r.lead_id))
//   //   );

//   //   const { data: leadsData, error: leadsErr } = await supabase
//   //     .from("leads")
//   //     .select("business_id, name, phone")
//   //     .in("business_id", allLeadIds);
//   //   if (leadsErr) {
//   //     console.error("Failed to fetch leads:", leadsErr);
//   //     return;
//   //   }
//   //   const leadMap = new Map(
//   //     (leadsData ?? []).map((l) => [
//   //       l.business_id,
//   //       { name: l.name, phone: l.phone },
//   //     ])
//   //   );

//   //   const { data: resumeProg, error: resumeErr } = await supabase
//   //     .from("resume_progress")
//   //     .select("lead_id, status, pdf_path")
//   //     .in("lead_id", allLeadIds);
//   //   if (resumeErr) {
//   //     console.error("Failed to fetch resume_progress:", resumeErr);
//   //     return;
//   //   }
//   //   const resumeMap = new Map(
//   //     (resumeProg ?? []).map((p) => [
//   //       p.lead_id,
//   //       { status: p.status as ResumeStatus, pdf_path: p.pdf_path ?? null },
//   //     ])
//   //   );

//   //   const { data: portfolioProg, error: portErr } = await supabase
//   //     .from("portfolio_progress")
//   //     .select("lead_id, status, link, assigned_email, assigned_name")
//   //     .in("lead_id", allLeadIds);
//   //   if (portErr) {
//   //     console.error("Failed to fetch portfolio_progress:", portErr);
//   //     return;
//   //   }
//   //   const portfolioMap = new Map(
//   //     (portfolioProg ?? []).map((p) => [
//   //       p.lead_id,
//   //       {
//   //         status: (p.status ?? "not_started") as PortfolioStatus,
//   //         link: p.link ?? null,
//   //         assigned_email: p.assigned_email ?? null,
//   //         assigned_name: p.assigned_name ?? null,
//   //       },
//   //     ])
//   //   );

//   //   const mergedPortfolio: SalesClosure[] = pLatest.map((r) => ({
//   //     ...r,
//   //     leads: leadMap.get(r.lead_id) || { name: "-", phone: "-" },
//   //     rp_status: resumeMap.get(r.lead_id)?.status ?? "not_started",
//   //     rp_pdf_path: resumeMap.get(r.lead_id)?.pdf_path ?? null,
//   //     pp_status: portfolioMap.get(r.lead_id)?.status ?? "not_started",
//   //     pp_link: portfolioMap.get(r.lead_id)?.link ?? null,
//   //     pp_assigned_email: portfolioMap.get(r.lead_id)?.assigned_email ?? null,
//   //     pp_assigned_name: portfolioMap.get(r.lead_id)?.assigned_name ?? null,
//   //   }));

//   //   const mergedGithub: SalesClosure[] = gLatest.map((r) => ({
//   //     ...r,
//   //     leads: leadMap.get(r.lead_id) || { name: "-", phone: "-" },
//   //   }));

//   //   setPortfolioRows(mergedPortfolio);
//   //   setGithubRows(mergedGithub);
//   //   setFilteredPortfolioRows(mergedPortfolio);
//   //   setFilteredGithubRows(mergedGithub);
//   // };


//   const fetchData = async () => {
//     if (!user) return;

//     const qPortfolio = supabase
//       .from("sales_closure")
//       .select(
//         "id, lead_id, email, finance_status, closed_at, portfolio_sale_value, github_sale_value, associates_email, associates_name, associates_tl_email, associates_tl_name"
//       )
//       .not("portfolio_sale_value", "is", null)
//       .neq("portfolio_sale_value", 0);

//     const qGithub = supabase
//       .from("sales_closure")
//       .select(
//         "id, lead_id, email, finance_status, closed_at, portfolio_sale_value, github_sale_value"
//       )
//       .not("github_sale_value", "is", null)
//       .neq("github_sale_value", 0);

//     const [{ data: pData, error: pErr }, { data: gData, error: gErr }] =
//       await Promise.all([qPortfolio, qGithub]);
//     if (pErr || gErr) {
//       const err = pErr || gErr;
//       console.error("Failed to fetch sales data:", {
//         message: err?.message,
//         code: err?.code,
//         hint: err?.hint,
//         details: err?.details,
//         fullError: err
//       });
//       return;
//     }

//     const pLatest = latestByLead(pData || []);
//     const gLatest = latestByLead(gData || []);
//     const allLeadIds = Array.from(
//       new Set([...pLatest, ...gLatest].map((r) => r.lead_id))
//     );

//     const { data: leadsData, error: leadsErr } = await supabase
//       .from("leads")
//       .select("business_id, name, phone")
//       .in("business_id", allLeadIds);
//     if (leadsErr) {
//       console.error("Failed to fetch leads:", leadsErr);
//       return;
//     }
//     const leadMap = new Map(
//       (leadsData ?? []).map((l) => [
//         l.business_id,
//         { name: l.name, phone: l.phone },
//       ])
//     );

//     // Fetch resume_progress with array of pdf_paths
//     const { data: resumeProg, error: resumeErr } = await supabase
//       .from("resume_progress")
//       .select("lead_id, status, pdf_path, pdf_uploaded_at")
//       .in("lead_id", allLeadIds);
//     if (resumeErr) {
//       console.error("Failed to fetch resume_progress:", resumeErr);
//       return;
//     }

//     // Helper function to get the most recent PDF path
//     const getLatestPdfPath = (pdfPaths: string[] | null, uploadedAt: string | null) => {
//       if (!pdfPaths || pdfPaths.length === 0) return null;

//       // If we have upload timestamps, use them to find the latest
//       if (uploadedAt) {
//         return pdfPaths[pdfPaths.length - 1]; // Assuming last is latest
//       }

//       // Otherwise return the last one in the array
//       return pdfPaths[pdfPaths.length - 1];
//     };

//     const resumeMap = new Map(
//       (resumeProg ?? []).map((p) => [
//         p.lead_id,
//         {
//           status: p.status as ResumeStatus,
//           pdf_path: getLatestPdfPath(p.pdf_path, p.pdf_uploaded_at)
//         },
//       ])
//     );

//     const { data: portfolioProg, error: portErr } = await supabase
//       .from("portfolio_progress")
//       .select("lead_id, status, link, assigned_email, assigned_name, updated_at")
//       .in("lead_id", allLeadIds);
//     if (portErr) {
//       console.error("Failed to fetch portfolio_progress:", portErr);
//       return;
//     }
//     const portfolioMap = new Map(
//       (portfolioProg ?? []).map((p) => [
//         p.lead_id,
//         {
//           status: (p.status ?? "not_started") as PortfolioStatus,
//           link: p.link ?? null,
//           assigned_email: p.assigned_email ?? null,
//           assigned_name: p.assigned_name ?? null,
//           updated_at: p.updated_at ?? null,
//         },
//       ])
//     );

//     const { data: githubProg, error: githubErr } = await supabase
//       .from("github_progress")
//       .select("lead_id, status, assigned_email, assigned_name, updated_at")
//       .in("lead_id", allLeadIds);
//     if (githubErr) {
//       console.error("Failed to fetch github_progress:", githubErr);
//       return;
//     }
//     const githubMap = new Map(
//       (githubProg ?? []).map((p) => [
//         p.lead_id,
//         {
//           status: (p.status ?? "not_started") as GithubStatus,
//           assigned_email: p.assigned_email ?? null,
//           assigned_name: p.assigned_name ?? null,
//           updated_at: p.updated_at ?? null,
//         },
//       ])
//     );

//     const mergedPortfolio: SalesClosure[] = pLatest.map((r) => ({
//       ...r,
//       leads: leadMap.get(r.lead_id) || { name: "-", phone: "-" },
//       rp_status: resumeMap.get(r.lead_id)?.status ?? "not_started",
//       rp_pdf_path: resumeMap.get(r.lead_id)?.pdf_path ?? null,
//       pp_status: portfolioMap.get(r.lead_id)?.status ?? "not_started",
//       pp_link: portfolioMap.get(r.lead_id)?.link ?? null,
//       pp_assigned_email: portfolioMap.get(r.lead_id)?.assigned_email ?? null,
//       pp_assigned_name: portfolioMap.get(r.lead_id)?.assigned_name ?? null,
//       pp_updated_at: portfolioMap.get(r.lead_id)?.updated_at ?? null,
//     }));

//     const mergedGithub: SalesClosure[] = gLatest.map((r) => ({
//       ...r,
//       leads: leadMap.get(r.lead_id) || { name: "-", phone: "-" },
//       gp_status: githubMap.get(r.lead_id)?.status ?? "not_started",
//       gp_assigned_email: githubMap.get(r.lead_id)?.assigned_email ?? null,
//       gp_assigned_name: githubMap.get(r.lead_id)?.assigned_name ?? null,
//       gp_updated_at: githubMap.get(r.lead_id)?.updated_at ?? null,
//     }));

//     setPortfolioRows(mergedPortfolio);
//     setGithubRows(mergedGithub);
//   };

//   const fetchTeam = async () => {
//     const { data, error } = await supabase
//       .from("profiles")
//       .select("full_name, user_email, roles")
//       .in("roles", ["Technical Head", "Technical Associate"]);
//     if (error) {
//       console.error("Failed to fetch team users:", {
//         message: error?.message,
//         code: error?.code,
//         hint: error?.hint,
//         details: error?.details,
//         fullError: error
//       });
//       return;
//     }
//     const sorted = (data as TeamUser[]).sort((a, b) =>
//       a.roles === b.roles
//         ? a.full_name.localeCompare(b.full_name)
//         : a.roles.localeCompare(b.roles)
//     );
//     setTeamMembers(sorted);
//   };

//   /* =========================
//      Actions
//      ========================= */

//   const BUCKET = "resumes";


//   const downloadResume = async (path: string) => {
//     try {
//       if (path.startsWith("CRM")) {
//         const base = "https://applywizz-prod.s3.us-east-2.amazonaws.com";
//         // Combine base + path to form full URL
//         const fileUrl = `${base}/${path}`;

//         window.open(fileUrl, '_blank');
//       }
//       else {
//         const segments = (path || "").split("/");
//         const fileName = segments[segments.length - 1] || "resume.pdf";

//         const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
//         if (error) throw error;
//         if (!data?.signedUrl) throw new Error("No signed URL");

//         const res = await fetch(data.signedUrl);
//         if (!res.ok) throw new Error(`Download failed (${res.status})`);
//         const blob = await res.blob();
//         const objectUrl = URL.createObjectURL(blob);

//         const a = document.createElement("a");
//         a.href = objectUrl;
//         a.download = fileName;
//         document.body.appendChild(a);
//         a.click();
//         a.remove();
//         URL.revokeObjectURL(objectUrl);
//       }
//     } catch (e: any) {
//       alert(e?.message || "Could not download PDF");
//     }

//   };

//   const handlePortfolioStatusChange = async (sale: SalesClosure, next: PortfolioStatus) => {
//     if (next === "success") {
//       setLinkTargetLeadId(sale.lead_id);
//       setLinkTargetRowId(sale.id);
//       setLinkDraft((d) => ({ ...d, [sale.lead_id]: sale.pp_link ?? "" }));
//       setLinkDialogOpen(true);
//       return;
//     }

//     const { error } = await supabase
//       .from("portfolio_progress")
//       .upsert(
//         { lead_id: sale.lead_id, status: next, updated_by: user?.email ?? null },
//         { onConflict: "lead_id" }
//       );
//     if (error) return alert(error.message);

//     setPortfolioRows(prev => prev.map(r => r.id === sale.id ? { ...r, pp_status: next, pp_link: null } : r));
//     setFilteredPortfolioRows(prev => prev.map(r => r.id === sale.id ? { ...r, pp_status: next, pp_link: null } : r));
//     setMyTasksRows(prev => prev.map(r => r.id === sale.id ? { ...r, pp_status: next, pp_link: null } : r));
//   };

//   const handleSavePortfolioSuccess = async () => {
//     const link = linkTargetLeadId ? (linkDraft[linkTargetLeadId] ?? "").trim() : "";
//     if (!link || !linkTargetLeadId || !linkTargetRowId) return alert("Please paste a link.");
//     if (!/^https?:\/\//i.test(link)) return alert("Enter a valid http(s) URL.");

//     const { error } = await supabase
//       .from("portfolio_progress")
//       .upsert(
//         { lead_id: linkTargetLeadId, status: "success", link, updated_by: user?.email ?? null },
//         { onConflict: "lead_id" }
//       );
//     if (error) return alert(error.message);

//     setPortfolioRows(prev => prev.map(r => r.id === linkTargetRowId ? { ...r, pp_status: "success", pp_link: link } : r));
//     setFilteredPortfolioRows(prev => prev.map(r => r.id === linkTargetRowId ? { ...r, pp_status: "success", pp_link: link } : r));
//     setMyTasksRows(prev => prev.map(r => r.id === linkTargetRowId ? { ...r, pp_status: "success", pp_link: link } : r));

//     setLinkDialogOpen(false);
//     setLinkDraft({});
//     setLinkTargetLeadId(null);
//     setLinkTargetRowId(null);
//   };

//   const handleAssignPortfolio = async (sale: SalesClosure, memberEmail: string) => {
//     setAssigneeByRow((p) => ({ ...p, [sale.id]: memberEmail }));
//     const member = teamMembers.find((m) => m.user_email === memberEmail);
//     if (!member) return;

//     const { error } = await supabase
//       .from("portfolio_progress")
//       .upsert(
//         { lead_id: sale.lead_id, assigned_email: member.user_email, assigned_name: member.full_name, updated_by: user?.email ?? null },
//         { onConflict: "lead_id" }
//       );

//     if (error) {
//       alert(error.message || "Failed to assign portfolio owner");
//       setAssigneeByRow((p) => ({ ...p, [sale.id]: sale.pp_assigned_email ?? undefined }));
//       return;
//     }

//     setPortfolioRows(prev =>
//       prev.map(r =>
//         r.id === sale.id ? { ...r, pp_assigned_email: member.user_email, pp_assigned_name: member.full_name } : r
//       )
//     );
//     setFilteredPortfolioRows(prev =>
//       prev.map(r =>
//         r.id === sale.id ? { ...r, pp_assigned_email: member.user_email, pp_assigned_name: member.full_name } : r
//       )
//     );
//     setMyTasksRows(prev =>
//       prev.map(r =>
//         r.id === sale.id ? { ...r, pp_assigned_email: member.user_email, pp_assigned_name: member.full_name } : r
//       )
//     );
//   };

//   const handleGithubStatusChange = async (sale: SalesClosure, next: GithubStatus) => {
//     const { error } = await supabase
//       .from("github_progress")
//       .upsert(
//         { lead_id: sale.lead_id, status: next, updated_by: user?.email ?? null },
//         { onConflict: "lead_id" }
//       );
//     if (error) return alert(error.message);

//     setGithubRows(prev => prev.map(r => r.id === sale.id ? { ...r, gp_status: next } : r));
//     setFilteredGithubRows(prev => prev.map(r => r.id === sale.id ? { ...r, gp_status: next } : r));
//   };

//   const handleAssignGithub = async (sale: SalesClosure, memberEmail: string) => {
//     setGithubAssigneeByRow((p) => ({ ...p, [sale.id]: memberEmail }));
//     const member = teamMembers.find((m) => m.user_email === memberEmail);
//     if (!member) return;

//     const { error } = await supabase
//       .from("github_progress")
//       .upsert(
//         { lead_id: sale.lead_id, assigned_email: member.user_email, assigned_name: member.full_name, updated_by: user?.email ?? null },
//         { onConflict: "lead_id" }
//       );

//     if (error) {
//       alert(error.message || "Failed to assign GitHub owner");
//       setGithubAssigneeByRow((p) => ({ ...p, [sale.id]: sale.gp_assigned_email ?? undefined }));
//       return;
//     }

//     setGithubRows(prev =>
//       prev.map(r =>
//         r.id === sale.id ? { ...r, gp_assigned_email: member.user_email, gp_assigned_name: member.full_name } : r
//       )
//     );
//     setFilteredGithubRows(prev =>
//       prev.map(r =>
//         r.id === sale.id ? { ...r, gp_assigned_email: member.user_email, gp_assigned_name: member.full_name } : r
//       )
//     );
//   };

//   /* =========================
//      Effects
//      ========================= */

//   useEffect(() => {
//     if (user === null) return;
//     const allowed = [
//       "Super Admin",
//       "Technical Head",
//       "Technical Associate",
//     ] as const;
//     if (!user || !allowed.includes(user.role as any)) {
//       router.push("/unauthorized");
//       return;
//     }
//     setLoading(false);
//   }, [user, router]);

//   useEffect(() => {
//     if (user) {
//       fetchData();
//       fetchTeam();
//     }
//   }, [user]);

//   useEffect(() => {
//     setAssigneeByRow((prev) => {
//       const next = { ...prev };
//       for (const r of portfolioRows) {
//         const current = r.pp_assigned_email ?? undefined;
//         if (next[r.id] === undefined) next[r.id] = current;
//       }
//       return next;
//     });
//   }, [portfolioRows, teamMembers]);

//   useEffect(() => {
//     setGithubAssigneeByRow((prev) => {
//       const next = { ...prev };
//       for (const r of githubRows) {
//         const current = r.gp_assigned_email ?? undefined;
//         if (next[r.id] === undefined) next[r.id] = current;
//       }
//       return next;
//     });
//   }, [githubRows, teamMembers]);

//   useEffect(() => {
//     let pRows = portfolioRows;
//     let gRows = githubRows;

//     if (selectedAssignee !== "all") {
//       pRows = pRows.filter(row =>
//         row.pp_assigned_email === selectedAssignee ||
//         (row.associates_email && row.associates_email.toLowerCase() === selectedAssignee.toLowerCase())
//       );
//       gRows = gRows.filter(row =>
//         row.associates_email && row.associates_email.toLowerCase() === selectedAssignee.toLowerCase()
//       );
//     }

//     if (searchQuery.trim()) {
//       const q = searchQuery.toLowerCase();
//       pRows = pRows.filter(row =>
//         row.lead_id?.toLowerCase().includes(q) ||
//         row.leads?.name?.toLowerCase().includes(q) ||
//         row.email?.toLowerCase().includes(q) ||
//         row.leads?.phone?.toLowerCase().includes(q)
//       );
//       gRows = gRows.filter(row =>
//         row.lead_id?.toLowerCase().includes(q) ||
//         row.leads?.name?.toLowerCase().includes(q) ||
//         row.email?.toLowerCase().includes(q) ||
//         row.leads?.phone?.toLowerCase().includes(q)
//       );
//     }

//     setFilteredPortfolioRows(pRows);
//     setFilteredGithubRows(gRows);
//     setCurrentPortfolioPage(1);
//     setCurrentGithubPage(1);
//   }, [portfolioRows, githubRows, selectedAssignee, searchQuery]);

//   const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Enter") {
//       setSearchQuery(searchInput);
//     }
//   };

//   /* =========================
//      Renderers
//      ========================= */

//   const renderPortfolioTable = (rows: SalesClosure[]) => {
//     const sortedRows = sortRows(rows, portfolioSortColumn, portfolioSortDirection);
//     const paginatedRows = getPaginatedRows(sortedRows, currentPortfolioPage, portfolioPageSize);
//     const totalPages = getTotalPages(sortedRows, portfolioPageSize);

//     const sortableColumns = ["Client ID", "Name", "Email", "Closed At", "Status Updated/Closed At"];

//     return (
//       <div className="space-y-4">
//         <div className="flex items-center gap-6">
//           <div className="flex items-center gap-4">
//             <span className="text-sm text-muted-foreground">
//               Total: {rows.length} records
//             </span>
//             <span className="text-sm text-muted-foreground">
//               Showing {paginatedRows.length} of {rows.length} records
//             </span>
//             {portfolioPageSize !== "all" && (
//               <span className="text-sm text-muted-foreground">
//                 Page {currentPortfolioPage} of {totalPages}
//               </span>
//             )}
//           </div>

//           <div className="flex items-center gap-2">
//             <span className="text-sm text-muted-foreground">Show:</span>
//             <Select
//               value={portfolioPageSize.toString()}
//               onValueChange={handlePortfolioPageSizeChange}
//             >
//               <SelectTrigger className="w-[140px]">
//                 <SelectValue placeholder="Page size" />
//               </SelectTrigger>
//               <SelectContent>
//                 {pageSizeOptions.map((option) => (
//                   <SelectItem key={option.value.toString()} value={option.value.toString()}>
//                     {option.label}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>


//         </div>

//         <div className="rounded-md border">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 {PORTFOLIO_COLUMNS.map((c) => (
//                   <TableHead key={c}>
//                     {sortableColumns.includes(c) ? (
//                       <div
//                         className="flex items-center gap-1 cursor-pointer hover:text-primary"
//                         onClick={() => handlePortfolioSort(c)}
//                       >
//                         {c}
//                         <ArrowUpDown className="h-4 w-4" />
//                       </div>
//                     ) : (
//                       c
//                     )}
//                   </TableHead>
//                 ))}
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {paginatedRows.map((sale, index) => {
//                 const actualIndex = portfolioPageSize === "all"
//                   ? index + 1
//                   : (currentPortfolioPage - 1) * (portfolioPageSize as number) + index + 1;
//                 return (
//                   <TableRow key={sale.id}>
//                     <TableCell>{actualIndex}</TableCell>
//                     <TableCell>{sale.lead_id}</TableCell>
//                     <TableCell
//                       className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
//                       onClick={() => window.open(`/leads/${sale.lead_id}`, "_blank")}
//                     >
//                       {sale.leads?.name || "-"}
//                     </TableCell>
//                     <TableCell>{sale.email}</TableCell>
//                     <TableCell>{sale.leads?.phone || "-"}</TableCell>
//                     <TableCell>{sale.finance_status}</TableCell>
//                     <TableCell>
//                       {STATUS_LABEL[(sale.rp_status ?? "not_started") as ResumeStatus]}
//                     </TableCell>
//                     <TableCell>
//                       {sale.rp_pdf_path ? (
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => downloadResume(sale.rp_pdf_path!)}
//                         >
//                           Download Resume
//                         </Button>
//                       ) : (
//                         <span className="text-gray-400 text-sm">—</span>
//                       )}
//                     </TableCell>
//                     <TableCell className="space-y-2">
//                       {sale.pp_status === "success" && sale.pp_link ? (
//                         <a
//                           href={sale.pp_link}
//                           target="_blank"
//                           rel="noreferrer"
//                           className="text-blue-600 underline break-all"
//                           title="Open portfolio link"
//                         >
//                           {sale.pp_link}
//                         </a>
//                       ) : (
//                         <Select
//                           onValueChange={(v) =>
//                             handlePortfolioStatusChange(sale, v as PortfolioStatus)
//                           }
//                           value={(sale.pp_status ?? "not_started") as PortfolioStatus}
//                         >
//                           <SelectTrigger className="w-[260px]">
//                             <SelectValue placeholder="Set portfolio status" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             {PORTFOLIO_STATUS_OPTIONS.map((s) => (
//                               <SelectItem key={s} value={s}>
//                                 {PORTFOLIO_STATUS_LABEL[s]}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                       )}
//                     </TableCell>
//                     <TableCell className="max-w-[220px] truncate">
//                       {sale.leads?.name && (
//                         <a
//                           href={`https://applywizz-${sale.leads?.name
//                             .toLowerCase()
//                             .replace(/[^a-z0-9]/g, "")}-${(sale.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
//                           target="_blank"
//                           rel="noreferrer"
//                           className="text-blue-600 underline block truncate"
//                           title={`https://applywizz-${sale.leads?.name
//                             .toLowerCase()
//                             .replace(/[^a-z0-9]/g, "")}-${(sale.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
//                         >
//                           https://applywizz-
//                           {sale.leads?.name
//                             .toLowerCase()
//                             .replace(/[^a-z0-9]/g, "")}-{(sale.lead_id || "").replace(/\D/g, "")}
//                           .vercel.app/
//                         </a>
//                       )}
//                     </TableCell>
//                     <TableCell>
//                       {(() => {
//                         const current =
//                           assigneeByRow[sale.id] ?? sale.pp_assigned_email ?? "";
//                         const inList = !!teamMembers.find(
//                           (m) => m.user_email === current
//                         );

//                         return (
//                           <Select
//                             value={current || undefined}
//                             onValueChange={(email) =>
//                               handleAssignPortfolio(sale, email)
//                             }
//                             disabled={user?.role == "Technical Associate"}
//                           >
//                             <SelectTrigger className="w-[240px] !opacity-100 bg-muted/20 text-foreground">
//                               <SelectValue placeholder="Assign to..." />
//                             </SelectTrigger>
//                             <SelectContent>
//                               {!inList && current && (
//                                 <SelectItem value={current} className="hidden">
//                                   {sale.pp_assigned_name || current}
//                                 </SelectItem>
//                               )}

//                               <div className="px-2 py-1 text-xs text-muted-foreground">
//                                 Technical Heads
//                               </div>
//                               {teamMembers
//                                 .filter((m) => m.roles === "Technical Head")
//                                 .map((m) => (
//                                   <SelectItem key={m.user_email} value={m.user_email}>
//                                     {m.full_name} • Head
//                                   </SelectItem>
//                                 ))}

//                               <div className="px-2 py-1 text-xs text-muted-foreground">
//                                 Technical Associates
//                               </div>
//                               {teamMembers
//                                 .filter((m) => m.roles === "Technical Associate")
//                                 .map((m) => (
//                                   <SelectItem key={m.user_email} value={m.user_email}>
//                                     {m.full_name} • Associate
//                                   </SelectItem>
//                                 ))}
//                             </SelectContent>
//                           </Select>
//                         );
//                       })()}
//                     </TableCell>
//                     <TableCell>
//                       {sale.closed_at
//                         ? new Date(sale.closed_at).toLocaleDateString("en-GB")
//                         : "-"}
//                     </TableCell>
//                     <TableCell>
//                       {sale.pp_updated_at
//                         ? new Date(sale.pp_updated_at).toLocaleDateString("en-GB")
//                         : "-"}
//                     </TableCell>
//                   </TableRow>
//                 );
//               })}
//               {paginatedRows.length === 0 && (
//                 <TableRow>
//                   <TableCell
//                     colSpan={PORTFOLIO_COLUMNS.length}
//                     className="text-center text-sm text-muted-foreground py-10"
//                   >
//                     No records found.
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </div>

//         {portfolioPageSize !== "all" && totalPages > 1 && (
//           <div className="flex justify-center mt-4">
//             <Pagination>
//               <PaginationContent>
//                 <PaginationItem>
//                   <PaginationPrevious
//                     onClick={() => handlePortfolioPageChange(Math.max(1, currentPortfolioPage - 1))}
//                     className={currentPortfolioPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
//                   />
//                 </PaginationItem>

//                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                   let pageNum;
//                   if (totalPages <= 5) {
//                     pageNum = i + 1;
//                   } else if (currentPortfolioPage <= 3) {
//                     pageNum = i + 1;
//                   } else if (currentPortfolioPage >= totalPages - 2) {
//                     pageNum = totalPages - 4 + i;
//                   } else {
//                     pageNum = currentPortfolioPage - 2 + i;
//                   }

//                   return (
//                     <PaginationItem key={pageNum}>
//                       <PaginationLink
//                         onClick={() => handlePortfolioPageChange(pageNum)}
//                         isActive={currentPortfolioPage === pageNum}
//                         className="cursor-pointer"
//                       >
//                         {pageNum}
//                       </PaginationLink>
//                     </PaginationItem>
//                   );
//                 })}

//                 <PaginationItem>
//                   <PaginationNext
//                     onClick={() => handlePortfolioPageChange(Math.min(totalPages, currentPortfolioPage + 1))}
//                     className={currentPortfolioPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
//                   />
//                 </PaginationItem>
//               </PaginationContent>
//             </Pagination>
//           </div>
//         )}
//       </div>
//     );
//   };

//   const renderGithubTable = (rows: SalesClosure[]) => {
//     const sortedRows = sortRows(rows, githubSortColumn, githubSortDirection);
//     const paginatedRows = getPaginatedRows(sortedRows, currentGithubPage, githubPageSize);
//     const totalPages = getTotalPages(sortedRows, githubPageSize);

//     const sortableColumns = ["Client ID", "Name", "Email", "Closed At", "Status Updated/Closed At"];

//     return (
//       <div className="space-y-4">
//         <div className="flex items-center gap-6">

//           <div className="flex items-center gap-4">
//             <span className="text-sm text-muted-foreground">
//               Total: {rows.length} records
//             </span>
//             <span className="text-sm text-muted-foreground">
//               Showing {paginatedRows.length} of {rows.length} records
//             </span>
//             {githubPageSize !== "all" && (
//               <span className="text-sm text-muted-foreground">
//                 Page {currentGithubPage} of {totalPages}
//               </span>
//             )}
//           </div>

//           <div className="flex items-center gap-2">
//             <span className="text-sm text-muted-foreground">Show:</span>
//             <Select
//               value={githubPageSize.toString()}
//               onValueChange={handleGithubPageSizeChange}
//             >
//               <SelectTrigger className="w-[140px]">
//                 <SelectValue placeholder="Page size" />
//               </SelectTrigger>
//               <SelectContent>
//                 {pageSizeOptions.map((option) => (
//                   <SelectItem key={option.value.toString()} value={option.value.toString()}>
//                     {option.label}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>


//         </div>

//         <div className="rounded-md border">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 {GITHUB_COLUMNS.map((c) => (
//                   <TableHead key={c}>
//                     {sortableColumns.includes(c) ? (
//                       <div
//                         className="flex items-center gap-1 cursor-pointer hover:text-primary"
//                         onClick={() => handleGithubSort(c)}
//                       >
//                         {c}
//                         <ArrowUpDown className="h-4 w-4" />
//                       </div>
//                     ) : (
//                       c
//                     )}
//                   </TableHead>
//                 ))}
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {paginatedRows.map((sale, index) => {
//                 const actualIndex = githubPageSize === "all"
//                   ? index + 1
//                   : (currentGithubPage - 1) * (githubPageSize as number) + index + 1;
//                 return (
//                   <TableRow key={sale.id}>
//                     <TableCell>{actualIndex}</TableCell>
//                     <TableCell>{sale.lead_id}</TableCell>
//                     <TableCell
//                       className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
//                       onClick={() => window.open(`/leads/${sale.lead_id}`, "_blank")}
//                     >
//                       {sale.leads?.name || "-"}
//                     </TableCell>
//                     <TableCell>{sale.email}</TableCell>
//                     <TableCell>{sale.leads?.phone || "-"}</TableCell>
//                     <TableCell>{sale.finance_status}</TableCell>
//                     <TableCell>{toNiceMoney(sale.github_sale_value)}</TableCell>
//                     <TableCell className="space-y-2">
//                       <Select
//                         onValueChange={(v) =>
//                           handleGithubStatusChange(sale, v as GithubStatus)
//                         }
//                         value={(sale.gp_status ?? "not_started") as GithubStatus}
//                       >
//                         <SelectTrigger className="w-[260px]">
//                           <SelectValue placeholder="Set GitHub status" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {GITHUB_STATUS_OPTIONS.map((s) => (
//                             <SelectItem key={s} value={s}>
//                               {GITHUB_STATUS_LABEL[s]}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </TableCell>
//                     <TableCell>
//                       {(() => {
//                         const current =
//                           githubAssigneeByRow[sale.id] ?? sale.gp_assigned_email ?? "";
//                         const inList = !!teamMembers.find(
//                           (m) => m.user_email === current
//                         );

//                         return (
//                           <Select
//                             value={current || undefined}
//                             onValueChange={(email) =>
//                               handleAssignGithub(sale, email)
//                             }
//                             disabled={user?.role == "Technical Associate"}
//                           >
//                             <SelectTrigger className="w-[240px] !opacity-100 bg-muted/20 text-foreground">
//                               <SelectValue placeholder="Assign to..." />
//                             </SelectTrigger>
//                             <SelectContent>
//                               {!inList && current && (
//                                 <SelectItem value={current} className="hidden">
//                                   {sale.gp_assigned_name || current}
//                                 </SelectItem>
//                               )}

//                               <div className="px-2 py-1 text-xs text-muted-foreground">
//                                 Technical Heads
//                               </div>
//                               {teamMembers
//                                 .filter((m) => m.roles === "Technical Head")
//                                 .map((m) => (
//                                   <SelectItem key={m.user_email} value={m.user_email}>
//                                     {m.full_name} • Head
//                                   </SelectItem>
//                                 ))}

//                               <div className="px-2 py-1 text-xs text-muted-foreground">
//                                 Technical Associates
//                               </div>
//                               {teamMembers
//                                 .filter((m) => m.roles === "Technical Associate")
//                                 .map((m) => (
//                                   <SelectItem key={m.user_email} value={m.user_email}>
//                                     {m.full_name} • Associate
//                                   </SelectItem>
//                                 ))}
//                             </SelectContent>
//                           </Select>
//                         );
//                       })()}
//                     </TableCell>
//                     <TableCell>
//                       {sale.closed_at
//                         ? new Date(sale.closed_at).toLocaleDateString("en-GB")
//                         : "-"}
//                     </TableCell>
//                     <TableCell>
//                       {sale.gp_updated_at
//                         ? new Date(sale.gp_updated_at).toLocaleDateString("en-GB")
//                         : "-"}
//                     </TableCell>
//                   </TableRow>
//                 );
//               })}
//               {paginatedRows.length === 0 && (
//                 <TableRow>
//                   <TableCell
//                     colSpan={GITHUB_COLUMNS.length}
//                     className="text-center text-sm text-muted-foreground py-10"
//                   >
//                     No GitHub sales found.
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </div>

//         {githubPageSize !== "all" && totalPages > 1 && (
//           <div className="flex justify-center mt-4">
//             <Pagination>
//               <PaginationContent>
//                 <PaginationItem>
//                   <PaginationPrevious
//                     onClick={() => handleGithubPageChange(Math.max(1, currentGithubPage - 1))}
//                     className={currentGithubPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
//                   />
//                 </PaginationItem>

//                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                   let pageNum;
//                   if (totalPages <= 5) {
//                     pageNum = i + 1;
//                   } else if (currentGithubPage <= 3) {
//                     pageNum = i + 1;
//                   } else if (currentGithubPage >= totalPages - 2) {
//                     pageNum = totalPages - 4 + i;
//                   } else {
//                     pageNum = currentGithubPage - 2 + i;
//                   }

//                   return (
//                     <PaginationItem key={pageNum}>
//                       <PaginationLink
//                         onClick={() => handleGithubPageChange(pageNum)}
//                         isActive={currentGithubPage === pageNum}
//                         className="cursor-pointer"
//                       >
//                         {pageNum}
//                       </PaginationLink>
//                     </PaginationItem>
//                   );
//                 })}

//                 <PaginationItem>
//                   <PaginationNext
//                     onClick={() => handleGithubPageChange(Math.min(totalPages, currentGithubPage + 1))}
//                     className={currentGithubPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
//                   />
//                 </PaginationItem>
//               </PaginationContent>
//             </Pagination>
//           </div>
//         )}
//       </div>
//     );
//   };

//   /* =========================
//      Render
//      ========================= */

//   return (
//     <ProtectedRoute
//       allowedRoles={["Super Admin", "Technical Head", "Technical Associate"]}
//     >
//       <DashboardLayout>
//         <div className="space-y-6">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-8"  >
//               <h1 className="text-3xl font-bold text-gray-900">Technical Page</h1>
//               <div className="relative w-64">
//                 <Input
//                   placeholder="Search name, email, phone..."
//                   value={searchInput}
//                   onChange={(e) => {
//                     const val = e.target.value;
//                     setSearchInput(val);
//                     if (val === "") {
//                       setSearchQuery("");
//                     }
//                   }}
//                   onKeyDown={handleSearchKeyDown}
//                   className="pr-10"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setSearchQuery(searchInput)}
//                   className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer hover:text-gray-700 transition-colors"
//                 >
//                   <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//                   </svg>
//                 </button>
//               </div>
//             </div>
//             <div className="flex items-center gap-2">

//               <Button variant="outline" onClick={fetchMyTasks}>My Tasks</Button>

//               {/* Assignee Filter Dropdown */}
//               <Select
//                 value={selectedAssignee}
//                 onValueChange={handleAssigneeFilter}
//               >
//                 <SelectTrigger className="w-[220px]">
//                   <SelectValue placeholder="Filter by assignee" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="all">All Assignees</SelectItem>
//                   <div className="px-2 py-1 text-xs text-muted-foreground">
//                     Technical Heads
//                   </div>
//                   {teamMembers
//                     .filter((m) => m.roles === "Technical Head")
//                     .map((m) => (
//                       <SelectItem key={m.user_email} value={m.user_email}>
//                         {m.full_name} • Head
//                       </SelectItem>
//                     ))}

//                   <div className="px-2 py-1 text-xs text-muted-foreground">
//                     Technical Associates
//                   </div>
//                   {teamMembers
//                     .filter((m) => m.roles === "Technical Associate")
//                     .map((m) => (
//                       <SelectItem key={m.user_email} value={m.user_email}>
//                         {m.full_name} • Associate
//                       </SelectItem>
//                     ))}
//                 </SelectContent>
//               </Select>

//               <Dialog open={importInsertOpen} onOpenChange={setImportInsertOpen}>
//                 <DialogTrigger asChild>
//                   <Button>Add sale done CSV</Button>
//                 </DialogTrigger>
//                 <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto z-[1000]">
//                   <DialogHeader>
//                     <DialogTitle>Import Sales (CSV / XLSX)</DialogTitle>
//                   </DialogHeader>
//                   <div className="space-y-4">
//                     <div className="space-y-2">
//                       <label className="text-sm text-muted-foreground">Select file</label>
//                       <Input
//                         type="file"
//                         accept=".csv,.xlsx,.xls"
//                         onChange={(e) => {
//                           const f = e.target.files?.[0] || null;
//                           setInsertFile(f);
//                           if (f) handleParseSelectedFileInsert(f);
//                         }}
//                       />
//                       <p className="text-xs text-muted-foreground">
//                         Excel files are converted to CSV in-browser, then parsed.
//                       </p>
//                     </div>
//                     {parsingInsert && <p className="text-sm">Parsing…</p>}
//                     {rawRowsInsert.length > 0 && !parsingInsert && (
//                       <div className="space-y-1 text-sm">
//                         <div>Total rows in file: <b>{rawRowsInsert.length}</b></div>
//                         <div className="text-green-700">Valid rows to insert: <b>{validRowsToInsert.length}</b></div>
//                         <div className="text-amber-700">Skipped (errors): <b>{invalidRowsInsert.length}</b></div>
//                         {invalidRowsInsert.length > 0 && (
//                           <details className="mt-2">
//                             <summary className="cursor-pointer">See invalid row details</summary>
//                             <ul className="list-disc pl-6 mt-2">
//                               {invalidRowsInsert.slice(0, 20).map((row, idx) => (
//                                 <li key={idx}>Row {row.index}: {row.errors.join(", ")}</li>
//                               ))}
//                               {invalidRowsInsert.length > 20 && (
//                                 <li>…and {invalidRowsInsert.length - 20} more</li>
//                               )}
//                             </ul>
//                           </details>
//                         )}
//                         <p className="text-xs text-muted-foreground mt-2">
//                           This will insert into <b>public.sales_closure</b> only.
//                           Required columns: <code>lead_id</code>, <code>total_amount</code>,
//                           <code>subscription_cycle</code> (15/30/60/90), and either
//                           <code> persoanl_mail_id</code> or <code> company_application_mail</code>.
//                         </p>
//                       </div>
//                     )}
//                   </div>
//                   <DialogFooter className="mt-4">
//                     <Button variant="outline" onClick={() => setImportInsertOpen(false)}>
//                       Cancel
//                     </Button>
//                     <Button
//                       onClick={handleImportSubmit}
//                       disabled={importingInsert || parsingInsert || validRowsToInsert.length === 0}
//                     >
//                       {importingInsert ? "Importing…" : `Submit (${validRowsToInsert.length})`}
//                     </Button>
//                   </DialogFooter>
//                 </DialogContent>
//               </Dialog>

//               <Button onClick={() => setImportUpdateOpen(true)}>
//                 Update by CSV
//               </Button>
//             </div>
//           </div>

//           {loading ? (
//             <p className="p-6 text-gray-600">Loading...</p>
//           ) : (
//             <Tabs defaultValue="portfolio" className="w-full">
//               <TabsList className="grid grid-cols-2 w-full sm:w-auto">
//                 <TabsTrigger value="portfolio">Portfolios</TabsTrigger>
//                 <TabsTrigger value="github">GitHub</TabsTrigger>
//               </TabsList>

//               <TabsContent value="portfolio">
//                 {renderPortfolioTable(filteredPortfolioRows)}
//               </TabsContent>
//               <TabsContent value="github">
//                 {renderGithubTable(filteredGithubRows)}
//               </TabsContent>
//             </Tabs>
//           )}
//         </div>

//         <Dialog open={myTasksOpen} onOpenChange={setMyTasksOpen}>
//           <DialogContent className="w-[90vw] h-[80vh] max-w-none flex flex-col p-0 overflow-hidden">
//             <DialogHeader className="p-6 pb-2">
//               <DialogTitle>My Tasks</DialogTitle>
//             </DialogHeader>
//             <div className="flex-1 overflow-auto p-6 pt-0">
//               {myTasksLoading ? (
//                 <div className="flex items-center justify-center h-full">
//                   <div className="text-sm text-muted-foreground">Loading…</div>
//                 </div>
//               ) : myTasksError ? (
//                 <div className="flex items-center justify-center h-full">
//                   <div className="text-sm text-red-600">{myTasksError}</div>
//                 </div>
//               ) : (
//                 renderPortfolioTable(myTasksRows)
//               )}
//             </div>
//             <DialogFooter className="p-6 pt-2 border-t flex flex-row justify-end gap-2">
//               <Button variant="outline" onClick={fetchMyTasks}>Refresh</Button>
//               <Button onClick={() => setMyTasksOpen(false)}>Close</Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
//           <DialogContent>
//             <DialogHeader>
//               <DialogTitle>Mark as Success</DialogTitle>
//             </DialogHeader>
//             <div className="space-y-2">
//               <label className="text-sm text-muted-foreground">Success link</label>
//               <Input
//                 placeholder="https://…"
//                 value={linkTargetLeadId ? linkDraft[linkTargetLeadId] ?? "" : ""}
//                 onChange={(e) =>
//                   setLinkDraft((prev) => ({
//                     ...prev,
//                     ...(linkTargetLeadId
//                       ? { [linkTargetLeadId]: e.target.value }
//                       : {}),
//                   }))
//                 }
//               />
//               <p className="text-xs text-muted-foreground">
//                 Paste the final portfolio link. It will be saved in{" "}
//                 <code>portfolio_progress</code>.
//               </p>
//             </div>
//             <DialogFooter className="mt-4">
//               <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
//                 Cancel
//               </Button>
//               <Button onClick={handleSavePortfolioSuccess}>Save</Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         <Dialog open={importUpdateOpen} onOpenChange={setImportUpdateOpen}>
//           <DialogContent className="sm:max-w-[600px]">
//             <DialogHeader>
//               <DialogTitle>Update Sales (by lead_id) — CSV / XLSX</DialogTitle>
//             </DialogHeader>
//             <div className="space-y-4">
//               <div className="space-y-2">
//                 <label className="text-sm text-muted-foreground">Select file</label>
//                 <Input
//                   type="file"
//                   accept=".csv,.xlsx,.xls"
//                   onChange={(e) => {
//                     const f = e.target.files?.[0] || null;
//                     setUpdateFile(f);
//                     if (f) handleParseSelectedFileUpdate(f);
//                   }}
//                 />
//                 <p className="text-xs text-muted-foreground">
//                   Excel files are converted to CSV in-browser, then parsed with
//                   PapaParse. Only the columns present in your file will be updated.
//                 </p>
//               </div>
//               {parsingUpdate && <p className="text-sm">Parsing…</p>}
//               {rawRowsUpdate.length > 0 && !parsingUpdate && (
//                 <div className="space-y-2 text-sm">
//                   <div>Total rows in file: <b>{rawRowsUpdate.length}</b></div>
//                   <div className="text-green-700">Valid update rows: <b>{updatesToApply.length}</b></div>
//                   <div className="text-amber-700">Skipped (errors): <b>{invalidRowsUpdate.length}</b></div>
//                   <div className="pt-2">
//                     <div>lead_ids matched in DB: <b>{Object.keys(latestIdByLead).length}</b></div>
//                     <div className="text-amber-700">lead_ids not found in DB: <b>{missingLeadIds.length}</b></div>
//                     {missingLeadIds.length > 0 && (
//                       <details className="mt-1">
//                         <summary className="cursor-pointer">See missing lead_ids</summary>
//                         <div className="mt-1 break-words">
//                           {missingLeadIds.slice(0, 50).join(", ")}
//                           {missingLeadIds.length > 50 && " …"}
//                         </div>
//                       </details>
//                     )}
//                   </div>
//                   {invalidRowsUpdate.length > 0 && (
//                     <details className="mt-2">
//                       <summary className="cursor-pointer">See invalid row details</summary>
//                       <ul className="list-disc pl-6 mt-2">
//                         {invalidRowsUpdate.slice(0, 20).map((row, idx) => (
//                           <li key={idx}>Row {row.index}: {row.errors.join(", ")}</li>
//                         ))}
//                         {invalidRowsUpdate.length > 20 && (
//                           <li>…and {invalidRowsUpdate.length - 20} more</li>
//                         )}
//                       </ul>
//                     </details>
//                   )}
//                   <p className="text-xs text-muted-foreground mt-2">
//                     We update the <b>latest</b> <code>sales_closure</code> row
//                     for each <code>lead_id</code> (by <code>closed_at</code>).
//                   </p>
//                 </div>
//               )}
//             </div>
//             <DialogFooter className="mt-4">
//               <Button variant="outline" onClick={() => setImportUpdateOpen(false)}>
//                 Cancel
//               </Button>
//               <Button
//                 onClick={handleUpdateSubmitByLeadId}
//                 disabled={importingUpdate || parsingUpdate || updatesToApply.length === 0}
//               >
//                 {importingUpdate ? "Updating…" : `Update (${updatesToApply.length})`}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </DashboardLayout>
//     </ProtectedRoute>
//   );
// }







//app/technicalTeam/page.tsx

"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import Papa from "papaparse";
import { ArrowUpDown } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/components/providers/auth-provider";

/* =========================
   Types & Constants
   ========================= */

type FinanceStatus = "Paid" | "Unpaid" | "Paused" | "Closed" | "Got Placed";

type RawCsv = {
  lead_id?: string;
  lead_name?: string;
  company_application_mail?: string;
  persoanl_mail_id?: string;
  phone_number?: string;
  whatsapp_number?: string;
  sale_done_by?: string;
  closed_at?: any;
  source?: string;
  total_amount?: any;
  application_sale_value?: any;
  resume_value?: any;
  portfolio_value?: any;
  linkedin_value?: any;
  github_value?: any;
  courses_value?: any;
  addons_value?: any;
  onboarded_date?: any;
  subscription_cycle?: any;
  custom_add_on_name?: string;
  associate_tl_email?: string;
  associate_tl_name?: string;
  associate_email?: string;
  associate_name?: string;
  commitments?: string;
};

type ResumeStatus =
  | "not_started"
  | "pending"
  | "waiting_client_approval"
  | "completed";

const STATUS_LABEL: Record<ResumeStatus, string> = {
  not_started: "Not started",
  pending: "Pending",
  waiting_client_approval: "Waiting for client approval",
  completed: "Completed",
};

type PortfolioStatus =
  | "not_started"
  | "pending"
  | "waiting_client_approval"
  | "success";

const PORTFOLIO_STATUS_LABEL: Record<PortfolioStatus, string> = {
  not_started: "Not started",
  pending: "Pending",
  waiting_client_approval: "Waiting for Client approval",
  success: "Success",
};

const PORTFOLIO_STATUS_OPTIONS: PortfolioStatus[] = [
  "not_started",
  "pending",
  "waiting_client_approval",
  "success",
];

type GithubStatus =
  | "not_started"
  | "pending"
  | "waiting_client_approval"
  | "success";

const GITHUB_STATUS_LABEL: Record<GithubStatus, string> = {
  not_started: "Not started",
  pending: "Pending",
  waiting_client_approval: "Waiting for Client approval",
  success: "Success",
};

const GITHUB_STATUS_OPTIONS: GithubStatus[] = [
  "not_started",
  "pending",
  "waiting_client_approval",
  "success",
];

interface SalesClosure {
  id: string;
  lead_id: string;
  email: string;
  finance_status: FinanceStatus;
  closed_at: string | null;
  portfolio_sale_value?: number | null;
  github_sale_value?: number | null;
  associates_email?: string | null;
  associates_name?: string | null;
  associates_tl_email?: string | null;
  associates_tl_name?: string | null;
  leads?: { name: string; phone: string };
  rp_status?: ResumeStatus;
  rp_pdf_path?: string | null;
  pp_status?: PortfolioStatus | null;
  pp_link?: string | null;
  pp_assigned_email?: string | null;
  pp_assigned_name?: string | null;
  pp_updated_at?: string | null;
  gp_status?: GithubStatus | null;
  gp_assigned_email?: string | null;
  gp_assigned_name?: string | null;
  gp_updated_at?: string | null;
}

interface TeamUser {
  full_name: string;
  user_email: string;
  roles: "Technical Head" | "Technical Associate";
}

const PORTFOLIO_COLUMNS = [
  "S.No",
  "Client ID",
  "Name",
  "Email",
  "Phone",
  "Status",
  "Resume Status",
  "Resume PDF",
  "Portfolio Status",
  "Portfolio Link",
  "Assignee",
  "Closed At",
  "Status Updated/Closed At",
] as const;

const GITHUB_COLUMNS = [
  "S.No",
  "Client ID",
  "Name",
  "Email",
  "Phone",
  "Status",
  "GitHub Sale Value",
  "GitHub Status",
  "Assignee",
  "Closed At",
  "Status Updated/Closed At",
] as const;

/* =========================
   Component
   ========================= */

export default function TechnicalTeamPage() {
  const [loading, setLoading] = useState(true);
  const [portfolioRows, setPortfolioRows] = useState<SalesClosure[]>([]);
  const [githubRows, setGithubRows] = useState<SalesClosure[]>([]);
  const [filteredPortfolioRows, setFilteredPortfolioRows] = useState<SalesClosure[]>([]);
  const [filteredGithubRows, setFilteredGithubRows] = useState<SalesClosure[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamUser[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");

  // Pagination states
  const [currentPortfolioPage, setCurrentPortfolioPage] = useState(1);
  const [currentGithubPage, setCurrentGithubPage] = useState(1);
  const [portfolioPageSize, setPortfolioPageSize] = useState<number | "all">(10);
  const [githubPageSize, setGithubPageSize] = useState<number | "all">(10);

  const [linkDraft, setLinkDraft] = useState<Record<string, string>>({});
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkTargetLeadId, setLinkTargetLeadId] = useState<string | null>(null);
  const [linkTargetRowId, setLinkTargetRowId] = useState<string | null>(null);

  const [importInsertOpen, setImportInsertOpen] = useState(false);
  const [insertFile, setInsertFile] = useState<File | null>(null);
  const [parsingInsert, setParsingInsert] = useState(false);
  const [importingInsert, setImportingInsert] = useState(false);
  const [rawRowsInsert, setRawRowsInsert] = useState<any[]>([]);
  const [validRowsToInsert, setValidRowsToInsert] = useState<any[]>([]);
  const [invalidRowsInsert, setInvalidRowsInsert] = useState<
    { index: number; errors: string[] }[]
  >([]);

  const [importUpdateOpen, setImportUpdateOpen] = useState(false);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [parsingUpdate, setParsingUpdate] = useState(false);
  const [importingUpdate, setImportingUpdate] = useState(false);
  const [rawRowsUpdate, setRawRowsUpdate] = useState<any[]>([]);
  const [invalidRowsUpdate, setInvalidRowsUpdate] = useState<
    { index: number; errors: string[] }[]
  >([]);

  const [myTasksOpen, setMyTasksOpen] = useState(false);
  const [myTasksRows, setMyTasksRows] = useState<SalesClosure[]>([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [myTasksError, setMyTasksError] = useState<string | null>(null);

  const [updatesToApply, setUpdatesToApply] = useState<
    { lead_id: string; patch: Record<string, any> }[]
  >([]);
  const [latestIdByLead, setLatestIdByLead] = useState<Record<string, string>>({});
  const [missingLeadIds, setMissingLeadIds] = useState<string[]>([]);

  const [assigneeByRow, setAssigneeByRow] = useState<
    Record<string, string | undefined>
  >({});

  const [githubAssigneeByRow, setGithubAssigneeByRow] = useState<
    Record<string, string | undefined>
  >({});

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting states
  const [portfolioSortColumn, setPortfolioSortColumn] = useState<string | null>(null);
  const [portfolioSortDirection, setPortfolioSortDirection] = useState<"asc" | "desc">("asc");
  const [githubSortColumn, setGithubSortColumn] = useState<string | null>(null);
  const [githubSortDirection, setGithubSortDirection] = useState<"asc" | "desc">("asc");

  const { user } = useAuth();
  const router = useRouter();
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);

  // Page size options
  const pageSizeOptions = [
    { value: 10, label: "10 per page" },
    { value: 30, label: "30 per page" },
    { value: 50, label: "50 per page" },
    { value: 100, label: "100 per page" },
    { value: 200, label: "200 per page" },
    { value: 500, label: "500 per page" },
    { value: 1000, label: "1000 per page" },
    { value: 2000, label: "2000 per page" },
    { value: "all", label: "All records" },
  ];

  /* =========================
     Pagination Logic
     ========================= */

  const getPaginatedRows = (rows: SalesClosure[], currentPage: number, pageSize: number | "all") => {
    if (pageSize === "all") {
      return rows;
    }
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return rows.slice(startIndex, endIndex);
  };

  const getTotalPages = (rows: SalesClosure[], pageSize: number | "all") => {
    if (pageSize === "all") {
      return 1;
    }
    return Math.ceil(rows.length / pageSize);
  };

  const handlePortfolioPageChange = (page: number) => {
    setCurrentPortfolioPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGithubPageChange = (page: number) => {
    setCurrentGithubPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePortfolioPageSizeChange = (value: string) => {
    const newSize = value === "all" ? "all" : parseInt(value, 10);
    setPortfolioPageSize(newSize);
    setCurrentPortfolioPage(1); // Reset to first page when page size changes
  };

  const handleGithubPageSizeChange = (value: string) => {
    const newSize = value === "all" ? "all" : parseInt(value, 10);
    setGithubPageSize(newSize);
    setCurrentGithubPage(1); // Reset to first page when page size changes
  };

  /* =========================
     Assignee Filter Logic
     ========================= */

  const handleAssigneeFilter = (email: string) => {
    setSelectedAssignee(email);
  };

  /* =========================
     Sorting Logic
     ========================= */

  const handlePortfolioSort = (column: string) => {
    if (portfolioSortColumn === column) {
      setPortfolioSortDirection(portfolioSortDirection === "asc" ? "desc" : "asc");
    } else {
      setPortfolioSortColumn(column);
      setPortfolioSortDirection("asc");
    }
  };

  const handleGithubSort = (column: string) => {
    if (githubSortColumn === column) {
      setGithubSortDirection(githubSortDirection === "asc" ? "desc" : "asc");
    } else {
      setGithubSortColumn(column);
      setGithubSortDirection("asc");
    }
  };

  const sortRows = (rows: SalesClosure[], sortColumn: string | null, sortDirection: "asc" | "desc") => {
    if (!sortColumn) return rows;

    return [...rows].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "Client ID":
          aValue = a.lead_id || "";
          bValue = b.lead_id || "";
          break;
        case "Name":
          aValue = a.leads?.name || "";
          bValue = b.leads?.name || "";
          break;
        case "Email":
          aValue = a.email || "";
          bValue = b.email || "";
          break;
        case "Closed At":
          aValue = a.closed_at ? new Date(a.closed_at).getTime() : 0;
          bValue = b.closed_at ? new Date(b.closed_at).getTime() : 0;
          break;
        case "Status Updated/Closed At":
          // For Portfolio table, use pp_updated_at
          // For GitHub table, use gp_updated_at
          aValue = (a.pp_updated_at || a.gp_updated_at) ? new Date(a.pp_updated_at || a.gp_updated_at || 0).getTime() : 0;
          bValue = (b.pp_updated_at || b.gp_updated_at) ? new Date(b.pp_updated_at || b.gp_updated_at || 0).getTime() : 0;
          break;
        default:
          return 0;
      }

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Handle numeric comparison (including dates as timestamps)
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  /* =========================
     Helpers
     ========================= */

  const addIfPresent = (obj: any, key: string, value: any) => {
    const v = value;
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    obj[key] = v;
  };

  const cleanMoney = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const s = String(v).replace(/[,\s₹]/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  const money = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).replace(/[,\s₹$]/g, "").trim();
    if (s === "" || s === "-") return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  const cleanIntCycle = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const n = parseInt(String(v).replace(/\D/g, ""), 10);
    return [15, 30, 60, 90].includes(n) ? n : null;
  };

  const toSaleRecord = (r: RawCsv) => ({
    lead_id: (r.lead_id ?? "").trim(),
    sale_value: money(r.total_amount) ?? 0,
    subscription_cycle: cleanIntCycle(r.subscription_cycle) ?? 30,
    payment_mode: mapPaymentMode(r.source),
    closed_at: parseDateTime(r.closed_at),
    email: normEmpty(r.persoanl_mail_id) || normEmpty(r.company_application_mail) || "",
    finance_status: "Paid",
    lead_name: (r.lead_name ?? "").trim() || null,
    onboarded_date: parseDateOnly(r.onboarded_date),
    application_sale_value: money(r.application_sale_value),
    resume_sale_value: money(r.resume_value),
    portfolio_sale_value: money(r.portfolio_value),
    linkedin_sale_value: money(r.linkedin_value),
    github_sale_value: money(r.github_value),
    courses_sale_value: money(r.courses_value),
    custom_sale_value: money(r.addons_value),
    custom_label: normEmpty(r.custom_add_on_name) || null,
    company_application_email: normEmpty(r.company_application_mail) || null,
    associates_tl_email: normEmpty(r.associate_tl_email) || "",
    associates_tl_name: normEmpty(r.associate_tl_name) || "",
    associates_email: normEmpty(r.associate_email) || "",
    associates_name: normEmpty(r.associate_name) || "",
    account_assigned_email: normEmpty(r.sale_done_by) || "",
    commitments: normEmpty(r.commitments) || null,
  });

  const validateSalesOnly = (rows: RawCsv[]) => {
    const valids: RawCsv[] = [];
    const invalids: { index: number; errors: string[] }[] = [];

    rows.forEach((r, i) => {
      const errors: string[] = [];
      if (!r.lead_id || !r.lead_id.toString().trim())
        errors.push("lead_id missing");
      if (money(r.total_amount) === null)
        errors.push("total_amount missing/invalid");
      if (cleanIntCycle(r.subscription_cycle) === null)
        errors.push("subscription_cycle invalid (must be 15/30/60/90)");
      if (!normEmpty(r.persoanl_mail_id) && !normEmpty(r.company_application_mail))
        errors.push("email missing (persoanl_mail_id / company_application_mail)");

      if (errors.length) invalids.push({ index: i + 1, errors });
      else valids.push(r);
    });

    return { valids, invalids };
  };

  const parseDateTime = (v: any): string | null => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString();
    }
    const s = String(v).trim();
    const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
    if (m) {
      const d = +m[1], mo = +m[2], yy = +m[3];
      const yyyy = yy < 100 ? 2000 + yy : yy;
      const dt = new Date(yyyy, mo - 1, d);
      return isNaN(dt.getTime()) ? null : dt.toISOString();
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  };

  const parseDateOnly = (v: any) => {
    const iso = parseDateTime(v);
    return iso ? iso.slice(0, 10) : null;
  };

  const normHeader = (h: string) =>
    String(h || "")
      .replace(/\uFEFF/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  const parseCsvString = (csv: string) =>
    new Promise<any[]>((resolve, reject) => {
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normHeader,
        complete: (res) => resolve(res.data as any[]),
        error: (err: any) => reject(err),
      });
    });

  const pick = (row: any, ...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) {
        const v = typeof row[k] === "string" ? row[k].trim() : row[k];
        if (v !== "") return v;
      }
    }
    return undefined;
  };

  const mapPaymentMode = (src: any): "UPI" | "Bank Transfer" | "PayPal" | "Stripe" | "Credit/Debit Card" | "Other" | "Razorpay" => {
    const s = String(src ?? "").trim().toLowerCase();
    if (["razor pay", "razorpay", "razor pay "].includes(s)) return "Razorpay";
    if (["phonepe", "phone pe", "phone pay"].includes(s)) return "UPI";
    if (s === "paypal") return "PayPal";
    if (s === "stripe") return "Stripe";
    if (s === "credit/debit card" || s === "card") return "Credit/Debit Card";
    if (s === "bank transfer" || s === "wire") return "Bank Transfer";
    return "Other";
  };

  const normEmpty = (x: any) => {
    const s = (x ?? "").toString().trim();
    return (s === "" || s === "-") ? "" : s;
  };

  const rowToPatch = (r: any) => {
    const patch: any = {};
    addIfPresent(patch, "lead_name", pick(r, "lead_name"));
    addIfPresent(
      patch,
      "company_application_email",
      pick(
        r,
        "company_application_mail",
        "company_applicati_mail",
        "company_mail"
      )
    );
    addIfPresent(
      patch,
      "email",
      pick(r, "persoanl_mail_id", "personal_mail_id", "personal_mailid")
    );
    addIfPresent(patch, "commitments", pick(r, "commitments"));
    addIfPresent(
      patch,
      "custom_label",
      pick(r, "custom_add_on_name", "custom_add_on_name_")
    );

    const closedAt = parseDateTime(pick(r, "closed_at") ?? null);
    if (closedAt) patch.closed_at = closedAt;

    const onboard = parseDateOnly(pick(r, "onboarded_date") ?? null);
    if (onboard) patch.onboarded_date = onboard;

    const cycle = cleanIntCycle(pick(r, "subscription_cycle") ?? null);
    if (cycle !== null) patch.subscription_cycle = cycle;

    const saleValue = cleanMoney(pick(r, "total_amount"));
    if (saleValue !== null) patch.sale_value = saleValue;

    const appVal = cleanMoney(pick(r, "application_sale_value"));
    if (appVal !== null) patch.application_sale_value = appVal;

    const resumeVal = cleanMoney(pick(r, "resume_value"));
    if (resumeVal !== null) patch.resume_sale_value = resumeVal;

    const portfolioVal = cleanMoney(pick(r, "portfolio_value"));
    if (portfolioVal !== null) patch.portfolio_sale_value = portfolioVal;

    const linkedinVal = cleanMoney(pick(r, "linkedin_value"));
    if (linkedinVal !== null) patch.linkedin_sale_value = linkedinVal;

    const githubVal = cleanMoney(pick(r, "github_value"));
    if (githubVal !== null) patch.github_sale_value = githubVal;

    const coursesVal = cleanMoney(pick(r, "courses_value"));
    if (coursesVal !== null) patch.courses_sale_value = coursesVal;

    const addonsVal = cleanMoney(pick(r, "addons_value"));
    if (addonsVal !== null) patch.custom_sale_value = addonsVal;

    addIfPresent(patch, "associates_tl_email", pick(r, "associate_tl_email"));
    addIfPresent(patch, "associates_tl_name", pick(r, "associate_tl_name"));
    addIfPresent(patch, "associates_email", pick(r, "associate_email"));
    addIfPresent(patch, "associates_name", pick(r, "associate_name"));

    return patch;
  };

  const buildUpdatesFromRows = (rows: any[]) => {
    const items: { lead_id: string; patch: Record<string, any> }[] = [];
    const invalids: { index: number; errors: string[] }[] = [];

    rows.forEach((r, i) => {
      const rawLead = r.lead_id ?? r.leadid ?? r.lead_i_d;
      const lead_id = rawLead ? String(rawLead).trim() : "";

      if (!lead_id) {
        invalids.push({ index: i + 1, errors: ["lead_id missing"] });
        return;
      }

      const patch = rowToPatch(r);
      if (!patch || Object.keys(patch).length === 0) {
        invalids.push({
          index: i + 1,
          errors: ["no recognized columns to update"],
        });
        return;
      }

      items.push({ lead_id, patch });
    });

    return { items, invalids };
  };

  const prefetchLatestIds = async (leadIds: string[]) => {
    const unique = Array.from(new Set(leadIds.filter(Boolean)));
    if (!unique.length) {
      setLatestIdByLead({});
      setMissingLeadIds([]);
      return;
    }

    const latest: Record<string, { id: string; closed_at: string | null }> = {};
    const CHUNK = 1000;

    for (let i = 0; i < unique.length; i += CHUNK) {
      const slice = unique.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("sales_closure")
        .select("id, lead_id, closed_at")
        .in("lead_id", slice);

      if (error) {
        console.error("prefetchLatestIds error:", error);
        continue;
      }
      for (const row of data ?? []) {
        const cur = latest[row.lead_id];
        const curTs = cur?.closed_at
          ? new Date(cur.closed_at).getTime()
          : -Infinity;
        const rowTs = row.closed_at
          ? new Date(row.closed_at).getTime()
          : -Infinity;
        if (!cur || rowTs > curTs)
          latest[row.lead_id] = { id: row.id, closed_at: row.closed_at };
      }
    }

    const idMap: Record<string, string> = {};
    unique.forEach((lid) => {
      if (latest[lid]) idMap[lid] = latest[lid].id;
    });

    setLatestIdByLead(idMap);
    setMissingLeadIds(unique.filter((lid) => !idMap[lid]));
  };

  const rowToInsert = (r: any) => {
    const lead_id =
      (r.lead_id ?? r["Lead_id"] ?? r["lead id"] ?? r["Lead ID"])
        ?.toString()
        .trim();

    const sale_value = cleanMoney(
      r.total_amount ?? r.Total_amount ?? r["Total Amount"]
    );

    const subscription_cycle = cleanIntCycle(
      r.subscription_cycle ?? r.Subscription_cycle
    );

    const email = (
      r.persoanl_mail_id ??
      r.personal_mail_id ??
      r.Persoanl_mail_id ??
      r["Personal_mail_id"] ??
      r.company_application_mail ??
      r.Company_application_mail
    )
      ?.toString()
      .trim();

    const record: any = {
      lead_id,
      sale_value,
      subscription_cycle,
      payment_mode: "UPI",
      email,
      closed_at: parseDateTime(r.closed_at ?? r.Closed_at),
      finance_status: "Paid",
      lead_name: r.lead_name ?? r.Lead_name ?? null,
      company_application_email:
        r.company_application_mail ?? r.Company_application_mail ?? null,
      application_sale_value: cleanMoney(
        r.application_sale_value ?? r.Application_sale_value
      ),
      resume_sale_value: cleanMoney(r.resume_value ?? r.Resume_value),
      portfolio_sale_value: cleanMoney(r.portfolio_value ?? r.Portfolio_value),
      linkedin_sale_value: cleanMoney(r.linkedin_value ?? r.LinkedIn_value),
      github_sale_value: cleanMoney(r.github_value ?? r.GitHub_value),
      courses_sale_value: cleanMoney(r.courses_value ?? r.Courses_value),
      custom_label:
        r.custom_add_on_name ??
        r["Custom Add-on_name"] ??
        r["Custom Add-on Name"] ??
        null,
      custom_sale_value: cleanMoney(r.addons_value ?? r.Addons_value),
      onboarded_date: parseDateOnly(r.onboarded_date ?? r.Onboarded_date),
      associates_tl_email: r.associate_tl_email ?? "",
      associates_tl_name: r.associate_tl_name ?? "",
      associates_email: r.associate_email ?? "",
      associates_name: r.associate_name ?? "",
      commitments: r.commitments ?? null,
    };

    return { lead_id, sale_value, subscription_cycle, email, record };
  };

  const validateAndBuild = (rows: any[]) => {
    const valids: any[] = [];
    const invalids: { index: number; errors: string[] }[] = [];

    rows.forEach((r, i) => {
      const { lead_id, sale_value, subscription_cycle, email, record } =
        rowToInsert(r);
      const errors: string[] = [];
      if (!lead_id) errors.push("lead_id missing");
      if (sale_value === null)
        errors.push("Total_amount (sale_value) missing/invalid");
      if (subscription_cycle === null)
        errors.push("subscription_cycle invalid (must be 15/30/60/90)");
      if (!email) errors.push("email missing");

      if (errors.length) invalids.push({ index: i + 1, errors });
      else valids.push(record);
    });

    return { valids, invalids };
  };

  /* =========================
     File Handlers
     ========================= */

  const quickParseAndInsert = async (file: File) => {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: any[] = [];
      if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
        rows = await parseCsvString(csv);
      } else {
        const text = await file.text();
        rows = await parseCsvString(text);
      }

      const { valids, invalids } = validateAndBuild(rows);
      alert(
        `Parsed ${rows.length} rows.\n` +
        `Valid: ${valids.length}\n` +
        `Skipped (errors): ${invalids.length}`
      );

      if (!valids.length) {
        alert("No valid rows to insert. Aborting.");
        return;
      }

      let inserted = 0;
      const CHUNK = 500;
      for (let i = 0; i < valids.length; i += CHUNK) {
        const chunk = valids.slice(i, i + CHUNK);
        const { error } = await supabase.from("sales_closure").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }

      await fetchData();
      alert(`Imported ${inserted} records successfully.`);
    } catch (e: any) {
      alert(e?.message || "Quick import failed");
    } finally {
      if (quickFileInputRef.current) quickFileInputRef.current.value = "";
    }
  };

  

  const fetchMyTasks = async () => {
    try {
      setMyTasksLoading(true);
      setMyTasksError(null);

      const assigneeEmail = (user?.email || "").trim().toLowerCase();
      const assigneeName = (user?.name || "").trim();
      const leadIds = new Set<string>();

      if (assigneeEmail) {
        const { data: byEmail, error: e1 } = await supabase
          .from("portfolio_progress")
          .select("lead_id")
          .eq("assigned_email", assigneeEmail);
        if (e1) throw e1;
        (byEmail ?? []).forEach(r => r.lead_id && leadIds.add(r.lead_id));
      }

      if (assigneeName) {
        const { data: byName, error: e2 } = await supabase
          .from("portfolio_progress")
          .select("lead_id")
          .ilike("assigned_name", `%${assigneeName}%`);
        if (e2) throw e2;
        (byName ?? []).forEach(r => r.lead_id && leadIds.add(r.lead_id));
      }

      const allowLeadIds = Array.from(leadIds);
      if (!allowLeadIds.length) {
        setMyTasksRows([]);
        setMyTasksOpen(true);
        return;
      }

      const { data: sales, error: salesErr } = await supabase
        .from("sales_closure")
        .select("id, lead_id, email, finance_status, closed_at, portfolio_sale_value, github_sale_value, associates_email, associates_name, associates_tl_email, associates_tl_name")
        .in("lead_id", allowLeadIds)
        .not("portfolio_sale_value", "is", null)
        .neq("portfolio_sale_value", 0);
      if (salesErr) throw salesErr;

      const latest = (() => {
        const map = new Map<string, any>();
        for (const r of sales ?? []) {
          const ex = map.get(r.lead_id);
          const ed = ex?.closed_at ?? "";
          const cd = r?.closed_at ?? "";
          if (!ex || new Date(cd) > new Date(ed)) map.set(r.lead_id, r);
        }
        return Array.from(map.values());
      })();

      const leadIdList = latest.map(r => r.lead_id);

      const [{ data: leadsData }, { data: resumeProg }, { data: portfolioProg }] = await Promise.all([
        supabase.from("leads").select("business_id, name, phone").in("business_id", leadIdList),
        supabase.from("resume_progress").select("lead_id, status, pdf_path, pdf_uploaded_at").in("lead_id", leadIdList),
        supabase.from("portfolio_progress").select("lead_id, status, link, assigned_email, assigned_name, updated_at").in("lead_id", leadIdList),
      ]);

      const leadMap = new Map((leadsData ?? []).map(l => [l.business_id, { name: l.name, phone: l.phone }]));

      // Helper function for latest PDF
      const getLatestPdfPath = (pdfPaths: string[] | null, uploadedAt: string | null) => {
        if (!pdfPaths || pdfPaths.length === 0) return null;
        if (uploadedAt) {
          return pdfPaths[pdfPaths.length - 1];
        }
        return pdfPaths[pdfPaths.length - 1];
      };

      const resumeMap = new Map((resumeProg ?? []).map(p => [
        p.lead_id,
        {
          status: p.status as ResumeStatus,
          pdf_path: getLatestPdfPath(p.pdf_path, p.pdf_uploaded_at)
        }
      ]));

      const portfolioMap = new Map((portfolioProg ?? []).map(p => [
        p.lead_id,
        {
          status: (p.status ?? "not_started") as PortfolioStatus,
          link: p.link ?? null,
          assigned_email: p.assigned_email ?? null,
          assigned_name: p.assigned_name ?? null,
          updated_at: p.updated_at ?? null,
        },
      ]));

      const merged: SalesClosure[] = latest.map((r) => ({
        ...r,
        leads: leadMap.get(r.lead_id) || { name: "-", phone: "-" },
        rp_status: resumeMap.get(r.lead_id)?.status ?? "not_started",
        rp_pdf_path: resumeMap.get(r.lead_id)?.pdf_path ?? null,
        pp_status: portfolioMap.get(r.lead_id)?.status ?? "not_started",
        pp_link: portfolioMap.get(r.lead_id)?.link ?? null,
        pp_assigned_email: portfolioMap.get(r.lead_id)?.assigned_email ?? null,
        pp_assigned_name: portfolioMap.get(r.lead_id)?.assigned_name ?? null,
        pp_updated_at: portfolioMap.get(r.lead_id)?.updated_at ?? null,
      }));

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

  const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await quickParseAndInsert(f);
  };

  const triggerQuickImport = () => {
    quickFileInputRef.current?.click();
  };

  const handleParseSelectedFileInsert = async (file: File) => {
    setParsingInsert(true);
    setRawRowsInsert([]);
    setValidRowsToInsert([]);
    setInvalidRowsInsert([]);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: any[] = [];

      if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
        rows = await parseCsvString(csv);
      } else {
        const text = await file.text();
        rows = await parseCsvString(text);
      }

      setRawRowsInsert(rows);
      const { valids, invalids } = validateSalesOnly(rows as RawCsv[]);
      setValidRowsToInsert(valids);
      setInvalidRowsInsert(invalids);
    } catch (e: any) {
      alert(e?.message || "Failed to parse the selected file");
    } finally {
      setParsingInsert(false);
    }
  };

  const handleParseSelectedFileUpdate = async (file: File) => {
    setParsingUpdate(true);
    setRawRowsUpdate([]);
    setInvalidRowsUpdate([]);
    setUpdatesToApply([]);
    setLatestIdByLead({});
    setMissingLeadIds([]);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: any[] = [];

      if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
        rows = await parseCsvString(csv);
      } else {
        const text = await file.text();
        rows = await parseCsvString(text);
      }

      setRawRowsUpdate(rows);
      const { items, invalids } = buildUpdatesFromRows(rows);
      setUpdatesToApply(items);
      setInvalidRowsUpdate(invalids);
      await prefetchLatestIds(items.map((i) => i.lead_id));
    } catch (e: any) {
      alert(e?.message || "Failed to parse the selected file");
    } finally {
      setParsingUpdate(false);
    }
  };

  /* =========================
     Submit Handlers
     ========================= */

  const handleImportSubmit = async () => {
    if (!validRowsToInsert.length) {
      alert("No valid rows to insert.");
      return;
    }
    setImportingInsert(true);

    let closuresInserted = 0;
    let failed = 0;

    try {
      const saleRecords = (validRowsToInsert as RawCsv[]).map(r => toSaleRecord(r));
      const CHUNK = 500;
      for (let i = 0; i < saleRecords.length; i += CHUNK) {
        const chunk = saleRecords.slice(i, i + CHUNK);
        const { error } = await supabase.from("sales_closure").insert(chunk);
        if (error) {
          for (const row of chunk) {
            const { error: e } = await supabase.from("sales_closure").insert(row);
            if (e) failed++; else closuresInserted++;
          }
        } else {
          closuresInserted += chunk.length;
        }
      }

      await fetchData();
      alert(
        `Import finished.\n` +
        `Sales closures inserted: ${closuresInserted}\n` +
        `Skipped/failed rows: ${failed}`
      );

      setImportInsertOpen(false);
      setInsertFile(null);
      setRawRowsInsert([]);
      setValidRowsToInsert([]);
      setInvalidRowsInsert([]);
    } catch (e: any) {
      alert(e?.message || "Import failed");
    } finally {
      setImportingInsert(false);
    }
  };

  const handleUpdateSubmitByLeadId = async () => {
    if (!updatesToApply.length) {
      alert("No valid rows to update.");
      return;
    }

    setImportingUpdate(true);
    let updated = 0;
    let failed = 0;

    try {
      for (const item of updatesToApply) {
        const rowId = latestIdByLead[item.lead_id];
        if (!rowId) continue;

        const { error } = await supabase
          .from("sales_closure")
          .update(item.patch)
          .eq("id", rowId);

        if (error) {
          failed++;
          console.error("Update failed for", item.lead_id, error);
        } else {
          updated++;
        }
      }

      await fetchData();
      alert(
        `Update complete.\nUpdated: ${updated}\nUnmatched lead_ids (no row in DB): ${missingLeadIds.length}\nFailed: ${failed}`
      );

      setImportUpdateOpen(false);
      setUpdateFile(null);
      setRawRowsUpdate([]);
      setUpdatesToApply([]);
      setInvalidRowsUpdate([]);
      setLatestIdByLead({});
      setMissingLeadIds([]);
    } catch (e: any) {
      alert(e?.message || "Bulk update failed");
    } finally {
      setImportingUpdate(false);
    }
  };

  /* =========================
     Data Fetch
     ========================= */

  const latestByLead = (rows: any[]) => {
    const map = new Map<string, any>();
    for (const r of rows ?? []) {
      const ex = map.get(r.lead_id);
      const ed = ex?.closed_at ?? "";
      const cd = r?.closed_at ?? "";
      if (!ex || new Date(cd) > new Date(ed)) map.set(r.lead_id, r);
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.closed_at || "").getTime() -
        new Date(a.closed_at || "").getTime()
    );
  };

  const toNiceMoney = (v?: number | null) =>
    typeof v === "number"
      ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 })
      : "-";

  


  const fetchData = async () => {
    if (!user) return;

    const qPortfolio = supabase
      .from("sales_closure")
      .select(
        "id, lead_id, email, finance_status, closed_at, portfolio_sale_value, github_sale_value, associates_email, associates_name, associates_tl_email, associates_tl_name"
      )
      .not("portfolio_sale_value", "is", null)
      .neq("portfolio_sale_value", 0);

    const qGithub = supabase
      .from("sales_closure")
      .select(
        "id, lead_id, email, finance_status, closed_at, portfolio_sale_value, github_sale_value"
      )
      .not("github_sale_value", "is", null)
      .neq("github_sale_value", 0);

    const [{ data: pData, error: pErr }, { data: gData, error: gErr }] =
      await Promise.all([qPortfolio, qGithub]);
    if (pErr || gErr) {
      const err = pErr || gErr;
      console.error("Failed to fetch sales data:", {
        message: err?.message,
        code: err?.code,
        hint: err?.hint,
        details: err?.details,
        fullError: err
      });
      return;
    }

    const pLatest = latestByLead(pData || []);
    const gLatest = latestByLead(gData || []);
    const allLeadIds = Array.from(
      new Set([...pLatest, ...gLatest].map((r) => r.lead_id))
    );

    const { data: leadsData, error: leadsErr } = await supabase
      .from("leads")
      .select("business_id, name, phone")
      .in("business_id", allLeadIds);
    if (leadsErr) {
      console.error("Failed to fetch leads:", leadsErr);
      return;
    }
    const leadMap = new Map(
      (leadsData ?? []).map((l) => [
        l.business_id,
        { name: l.name, phone: l.phone },
      ])
    );

    // Fetch resume_progress with array of pdf_paths
    const { data: resumeProg, error: resumeErr } = await supabase
      .from("resume_progress")
      .select("lead_id, status, pdf_path, pdf_uploaded_at")
      .in("lead_id", allLeadIds);
    if (resumeErr) {
      console.error("Failed to fetch resume_progress:", resumeErr);
      return;
    }

    // Helper function to get the most recent PDF path
    const getLatestPdfPath = (pdfPaths: string[] | null, uploadedAt: string | null) => {
      if (!pdfPaths || pdfPaths.length === 0) return null;

      // If we have upload timestamps, use them to find the latest
      if (uploadedAt) {
        return pdfPaths[pdfPaths.length - 1]; // Assuming last is latest
      }

      // Otherwise return the last one in the array
      return pdfPaths[pdfPaths.length - 1];
    };

    const resumeMap = new Map(
      (resumeProg ?? []).map((p) => [
        p.lead_id,
        {
          status: p.status as ResumeStatus,
          pdf_path: getLatestPdfPath(p.pdf_path, p.pdf_uploaded_at)
        },
      ])
    );

    const { data: portfolioProg, error: portErr } = await supabase
      .from("portfolio_progress")
      .select("lead_id, status, link, assigned_email, assigned_name, updated_at")
      .in("lead_id", allLeadIds);
    if (portErr) {
      console.error("Failed to fetch portfolio_progress:", portErr);
      return;
    }
    const portfolioMap = new Map(
      (portfolioProg ?? []).map((p) => [
        p.lead_id,
        {
          status: (p.status ?? "not_started") as PortfolioStatus,
          link: p.link ?? null,
          assigned_email: p.assigned_email ?? null,
          assigned_name: p.assigned_name ?? null,
          updated_at: p.updated_at ?? null,
        },
      ])
    );

    const { data: githubProg, error: githubErr } = await supabase
      .from("github_progress")
      .select("lead_id, status, assigned_email, assigned_name, updated_at")
      .in("lead_id", allLeadIds);
    if (githubErr) {
      console.error("Failed to fetch github_progress:", githubErr);
      return;
    }
    const githubMap = new Map(
      (githubProg ?? []).map((p) => [
        p.lead_id,
        {
          status: (p.status ?? "not_started") as GithubStatus,
          assigned_email: p.assigned_email ?? null,
          assigned_name: p.assigned_name ?? null,
          updated_at: p.updated_at ?? null,
        },
      ])
    );

    const mergedPortfolio: SalesClosure[] = pLatest.map((r) => ({
      ...r,
      leads: leadMap.get(r.lead_id) || { name: "-", phone: "-" },
      rp_status: resumeMap.get(r.lead_id)?.status ?? "not_started",
      rp_pdf_path: resumeMap.get(r.lead_id)?.pdf_path ?? null,
      pp_status: portfolioMap.get(r.lead_id)?.status ?? "not_started",
      pp_link: portfolioMap.get(r.lead_id)?.link ?? null,
      pp_assigned_email: portfolioMap.get(r.lead_id)?.assigned_email ?? null,
      pp_assigned_name: portfolioMap.get(r.lead_id)?.assigned_name ?? null,
      pp_updated_at: portfolioMap.get(r.lead_id)?.updated_at ?? null,
    }));

    const mergedGithub: SalesClosure[] = gLatest.map((r) => ({
      ...r,
      leads: leadMap.get(r.lead_id) || { name: "-", phone: "-" },
      gp_status: githubMap.get(r.lead_id)?.status ?? "not_started",
      gp_assigned_email: githubMap.get(r.lead_id)?.assigned_email ?? null,
      gp_assigned_name: githubMap.get(r.lead_id)?.assigned_name ?? null,
      gp_updated_at: githubMap.get(r.lead_id)?.updated_at ?? null,
    }));

    setPortfolioRows(mergedPortfolio);
    setGithubRows(mergedGithub);
  };

  const fetchTeam = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, user_email, roles")
      .in("roles", ["Technical Head", "Technical Associate"]);
    if (error) {
      console.error("Failed to fetch team users:", {
        message: error?.message,
        code: error?.code,
        hint: error?.hint,
        details: error?.details,
        fullError: error
      });
      return;
    }
    const sorted = (data as TeamUser[]).sort((a, b) =>
      a.roles === b.roles
        ? a.full_name.localeCompare(b.full_name)
        : a.roles.localeCompare(b.roles)
    );
    setTeamMembers(sorted);
  };

  /* =========================
     Actions
     ========================= */

  const BUCKET = "resumes";


  const downloadResume = async (path: string) => {
    try {
      if (path.startsWith("CRM")) {
        const base = "https://applywizz-prod.s3.us-east-2.amazonaws.com";
        // Combine base + path to form full URL
        const fileUrl = `${base}/${path}`;

        window.open(fileUrl, '_blank');
      }
      else {
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

  const handlePortfolioStatusChange = async (sale: SalesClosure, next: PortfolioStatus) => {
    if (next === "success") {
      setLinkTargetLeadId(sale.lead_id);
      setLinkTargetRowId(sale.id);
      setLinkDraft((d) => ({ ...d, [sale.lead_id]: sale.pp_link ?? "" }));
      setLinkDialogOpen(true);
      return;
    }

    const { error } = await supabase
      .from("portfolio_progress")
      .upsert(
        { lead_id: sale.lead_id, status: next, updated_by: user?.email ?? null },
        { onConflict: "lead_id" }
      );
    if (error) return alert(error.message);

    setPortfolioRows(prev => prev.map(r => r.id === sale.id ? { ...r, pp_status: next, pp_link: null } : r));
    setFilteredPortfolioRows(prev => prev.map(r => r.id === sale.id ? { ...r, pp_status: next, pp_link: null } : r));
    setMyTasksRows(prev => prev.map(r => r.id === sale.id ? { ...r, pp_status: next, pp_link: null } : r));
  };

  const handleSavePortfolioSuccess = async () => {
    const link = linkTargetLeadId ? (linkDraft[linkTargetLeadId] ?? "").trim() : "";
    if (!link || !linkTargetLeadId || !linkTargetRowId) return alert("Please paste a link.");
    if (!/^https?:\/\//i.test(link)) return alert("Enter a valid http(s) URL.");

    const { error } = await supabase
      .from("portfolio_progress")
      .upsert(
        { lead_id: linkTargetLeadId, status: "success", link, updated_by: user?.email ?? null },
        { onConflict: "lead_id" }
      );
    if (error) return alert(error.message);

    setPortfolioRows(prev => prev.map(r => r.id === linkTargetRowId ? { ...r, pp_status: "success", pp_link: link } : r));
    setFilteredPortfolioRows(prev => prev.map(r => r.id === linkTargetRowId ? { ...r, pp_status: "success", pp_link: link } : r));
    setMyTasksRows(prev => prev.map(r => r.id === linkTargetRowId ? { ...r, pp_status: "success", pp_link: link } : r));

    setLinkDialogOpen(false);
    setLinkDraft({});
    setLinkTargetLeadId(null);
    setLinkTargetRowId(null);
  };

  const handleAssignPortfolio = async (sale: SalesClosure, memberEmail: string) => {
    setAssigneeByRow((p) => ({ ...p, [sale.id]: memberEmail }));
    const member = teamMembers.find((m) => m.user_email === memberEmail);
    if (!member) return;

    const { error } = await supabase
      .from("portfolio_progress")
      .upsert(
        { lead_id: sale.lead_id, assigned_email: member.user_email, assigned_name: member.full_name, updated_by: user?.email ?? null },
        { onConflict: "lead_id" }
      );

    if (error) {
      alert(error.message || "Failed to assign portfolio owner");
      setAssigneeByRow((p) => ({ ...p, [sale.id]: sale.pp_assigned_email ?? undefined }));
      return;
    }

    setPortfolioRows(prev =>
      prev.map(r =>
        r.id === sale.id ? { ...r, pp_assigned_email: member.user_email, pp_assigned_name: member.full_name } : r
      )
    );
    setFilteredPortfolioRows(prev =>
      prev.map(r =>
        r.id === sale.id ? { ...r, pp_assigned_email: member.user_email, pp_assigned_name: member.full_name } : r
      )
    );
    setMyTasksRows(prev =>
      prev.map(r =>
        r.id === sale.id ? { ...r, pp_assigned_email: member.user_email, pp_assigned_name: member.full_name } : r
      )
    );
  };

  const handleGithubStatusChange = async (sale: SalesClosure, next: GithubStatus) => {
    const { error } = await supabase
      .from("github_progress")
      .upsert(
        { lead_id: sale.lead_id, status: next, updated_by: user?.email ?? null },
        { onConflict: "lead_id" }
      );
    if (error) return alert(error.message);

    setGithubRows(prev => prev.map(r => r.id === sale.id ? { ...r, gp_status: next } : r));
    setFilteredGithubRows(prev => prev.map(r => r.id === sale.id ? { ...r, gp_status: next } : r));
  };

  const handleAssignGithub = async (sale: SalesClosure, memberEmail: string) => {
    setGithubAssigneeByRow((p) => ({ ...p, [sale.id]: memberEmail }));
    const member = teamMembers.find((m) => m.user_email === memberEmail);
    if (!member) return;

    const { error } = await supabase
      .from("github_progress")
      .upsert(
        { lead_id: sale.lead_id, assigned_email: member.user_email, assigned_name: member.full_name, updated_by: user?.email ?? null },
        { onConflict: "lead_id" }
      );

    if (error) {
      alert(error.message || "Failed to assign GitHub owner");
      setGithubAssigneeByRow((p) => ({ ...p, [sale.id]: sale.gp_assigned_email ?? undefined }));
      return;
    }

    setGithubRows(prev =>
      prev.map(r =>
        r.id === sale.id ? { ...r, gp_assigned_email: member.user_email, gp_assigned_name: member.full_name } : r
      )
    );
    setFilteredGithubRows(prev =>
      prev.map(r =>
        r.id === sale.id ? { ...r, gp_assigned_email: member.user_email, gp_assigned_name: member.full_name } : r
      )
    );
  };

  /* =========================
     Effects
     ========================= */

  useEffect(() => {
    if (user === null) return;
    const allowed = [
      "Super Admin",
      "Technical Head",
      "Technical Associate",
    ] as const;
    if (!user || !allowed.includes(user.role as any)) {
      router.push("/unauthorized");
      return;
    }
    setLoading(false);
  }, [user, router]);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchTeam();
    }
  }, [user]);

  useEffect(() => {
    setAssigneeByRow((prev) => {
      const next = { ...prev };
      for (const r of portfolioRows) {
        const current = r.pp_assigned_email ?? undefined;
        if (next[r.id] === undefined) next[r.id] = current;
      }
      return next;
    });
  }, [portfolioRows, teamMembers]);

  useEffect(() => {
    setGithubAssigneeByRow((prev) => {
      const next = { ...prev };
      for (const r of githubRows) {
        const current = r.gp_assigned_email ?? undefined;
        if (next[r.id] === undefined) next[r.id] = current;
      }
      return next;
    });
  }, [githubRows, teamMembers]);

  useEffect(() => {
    let pRows = portfolioRows;
    let gRows = githubRows;

    if (selectedAssignee !== "all") {
      pRows = pRows.filter(row =>
        row.pp_assigned_email === selectedAssignee ||
        (row.associates_email && row.associates_email.toLowerCase() === selectedAssignee.toLowerCase())
      );
      gRows = gRows.filter(row =>
        row.associates_email && row.associates_email.toLowerCase() === selectedAssignee.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pRows = pRows.filter(row =>
        row.lead_id?.toLowerCase().includes(q) ||
        row.leads?.name?.toLowerCase().includes(q) ||
        row.email?.toLowerCase().includes(q) ||
        row.leads?.phone?.toLowerCase().includes(q)
      );
      gRows = gRows.filter(row =>
        row.lead_id?.toLowerCase().includes(q) ||
        row.leads?.name?.toLowerCase().includes(q) ||
        row.email?.toLowerCase().includes(q) ||
        row.leads?.phone?.toLowerCase().includes(q)
      );
    }

    setFilteredPortfolioRows(pRows);
    setFilteredGithubRows(gRows);
    setCurrentPortfolioPage(1);
    setCurrentGithubPage(1);
  }, [portfolioRows, githubRows, selectedAssignee, searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearchQuery(searchInput);
    }
  };

  /* =========================
     Renderers
     ========================= */

  const renderPortfolioTable = (rows: SalesClosure[]) => {
    const sortedRows = sortRows(rows, portfolioSortColumn, portfolioSortDirection);
    const paginatedRows = getPaginatedRows(sortedRows, currentPortfolioPage, portfolioPageSize);
    const totalPages = getTotalPages(sortedRows, portfolioPageSize);

    const sortableColumns = ["Client ID", "Name", "Email", "Closed At", "Status Updated/Closed At"];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Total: {rows.length} records
            </span>
            <span className="text-sm text-muted-foreground">
              Showing {paginatedRows.length} of {rows.length} records
            </span>
            {portfolioPageSize !== "all" && (
              <span className="text-sm text-muted-foreground">
                Page {currentPortfolioPage} of {totalPages}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={portfolioPageSize.toString()}
              onValueChange={handlePortfolioPageSizeChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option.value.toString()} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {PORTFOLIO_COLUMNS.map((c) => (
                  <TableHead key={c}>
                    {sortableColumns.includes(c) ? (
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-primary"
                        onClick={() => handlePortfolioSort(c)}
                      >
                        {c}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    ) : (
                      c
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((sale, index) => {
                const actualIndex = portfolioPageSize === "all"
                  ? index + 1
                  : (currentPortfolioPage - 1) * (portfolioPageSize as number) + index + 1;
                return (
                  <TableRow key={sale.id}>
                    <TableCell>{actualIndex}</TableCell>
                    <TableCell>{sale.lead_id}</TableCell>
                    <TableCell
                      className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                      onClick={() => window.open(`/leads/${sale.lead_id}`, "_blank")}
                    >
                      {sale.leads?.name || "-"}
                    </TableCell>
                    <TableCell>{sale.email}</TableCell>
                    <TableCell>{sale.leads?.phone || "-"}</TableCell>
                    <TableCell>{sale.finance_status}</TableCell>
                    <TableCell>
                      {STATUS_LABEL[(sale.rp_status ?? "not_started") as ResumeStatus]}
                    </TableCell>
                    <TableCell>
                      {sale.rp_pdf_path ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadResume(sale.rp_pdf_path!)}
                        >
                          Download Resume
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="space-y-2">
                      {sale.pp_status === "success" && sale.pp_link ? (
                        <a
                          href={sale.pp_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline break-all"
                          title="Open portfolio link"
                        >
                          {sale.pp_link}
                        </a>
                      ) : (
                        <Select
                          onValueChange={(v) =>
                            handlePortfolioStatusChange(sale, v as PortfolioStatus)
                          }
                          value={(sale.pp_status ?? "not_started") as PortfolioStatus}
                        >
                          <SelectTrigger className="w-[260px]">
                            <SelectValue placeholder="Set portfolio status" />
                          </SelectTrigger>
                          <SelectContent>
                            {PORTFOLIO_STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {PORTFOLIO_STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {sale.leads?.name && (
                        <a
                          href={`https://applywizz-${sale.leads?.name
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "")}-${(sale.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline block truncate"
                          title={`https://applywizz-${sale.leads?.name
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "")}-${(sale.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
                        >
                          https://applywizz-
                          {sale.leads?.name
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "")}-{(sale.lead_id || "").replace(/\D/g, "")}
                          .vercel.app/
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const current =
                          assigneeByRow[sale.id] ?? sale.pp_assigned_email ?? "";
                        const inList = !!teamMembers.find(
                          (m) => m.user_email === current
                        );

                        return (
                          <Select
                            value={current || undefined}
                            onValueChange={(email) =>
                              handleAssignPortfolio(sale, email)
                            }
                            disabled={user?.role == "Technical Associate"}
                          >
                            <SelectTrigger className="w-[240px] !opacity-100 bg-muted/20 text-foreground">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {!inList && current && (
                                <SelectItem value={current} className="hidden">
                                  {sale.pp_assigned_name || current}
                                </SelectItem>
                              )}

                              <div className="px-2 py-1 text-xs text-muted-foreground">
                                Technical Heads
                              </div>
                              {teamMembers
                                .filter((m) => m.roles === "Technical Head")
                                .map((m) => (
                                  <SelectItem key={m.user_email} value={m.user_email}>
                                    {m.full_name} • Head
                                  </SelectItem>
                                ))}

                              <div className="px-2 py-1 text-xs text-muted-foreground">
                                Technical Associates
                              </div>
                              {teamMembers
                                .filter((m) => m.roles === "Technical Associate")
                                .map((m) => (
                                  <SelectItem key={m.user_email} value={m.user_email}>
                                    {m.full_name} • Associate
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {sale.closed_at
                        ? new Date(sale.closed_at).toLocaleDateString("en-GB")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {sale.pp_updated_at
                        ? new Date(sale.pp_updated_at).toLocaleDateString("en-GB")
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={PORTFOLIO_COLUMNS.length}
                    className="text-center text-sm text-muted-foreground py-10"
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {portfolioPageSize !== "all" && totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePortfolioPageChange(Math.max(1, currentPortfolioPage - 1))}
                    className={currentPortfolioPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPortfolioPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPortfolioPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPortfolioPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => handlePortfolioPageChange(pageNum)}
                        isActive={currentPortfolioPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePortfolioPageChange(Math.min(totalPages, currentPortfolioPage + 1))}
                    className={currentPortfolioPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    );
  };

  const renderGithubTable = (rows: SalesClosure[]) => {
    const sortedRows = sortRows(rows, githubSortColumn, githubSortDirection);
    const paginatedRows = getPaginatedRows(sortedRows, currentGithubPage, githubPageSize);
    const totalPages = getTotalPages(sortedRows, githubPageSize);

    const sortableColumns = ["Client ID", "Name", "Email", "Closed At", "Status Updated/Closed At"];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-6">

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Total: {rows.length} records
            </span>
            <span className="text-sm text-muted-foreground">
              Showing {paginatedRows.length} of {rows.length} records
            </span>
            {githubPageSize !== "all" && (
              <span className="text-sm text-muted-foreground">
                Page {currentGithubPage} of {totalPages}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={githubPageSize.toString()}
              onValueChange={handleGithubPageSizeChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option.value.toString()} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {GITHUB_COLUMNS.map((c) => (
                  <TableHead key={c}>
                    {sortableColumns.includes(c) ? (
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-primary"
                        onClick={() => handleGithubSort(c)}
                      >
                        {c}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    ) : (
                      c
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((sale, index) => {
                const actualIndex = githubPageSize === "all"
                  ? index + 1
                  : (currentGithubPage - 1) * (githubPageSize as number) + index + 1;
                return (
                  <TableRow key={sale.id}>
                    <TableCell>{actualIndex}</TableCell>
                    <TableCell>{sale.lead_id}</TableCell>
                    <TableCell
                      className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                      onClick={() => window.open(`/leads/${sale.lead_id}`, "_blank")}
                    >
                      {sale.leads?.name || "-"}
                    </TableCell>
                    <TableCell>{sale.email}</TableCell>
                    <TableCell>{sale.leads?.phone || "-"}</TableCell>
                    <TableCell>{sale.finance_status}</TableCell>
                    <TableCell>{toNiceMoney(sale.github_sale_value)}</TableCell>
                    <TableCell className="space-y-2">
                      <Select
                        onValueChange={(v) =>
                          handleGithubStatusChange(sale, v as GithubStatus)
                        }
                        value={(sale.gp_status ?? "not_started") as GithubStatus}
                      >
                        <SelectTrigger className="w-[260px]">
                          <SelectValue placeholder="Set GitHub status" />
                        </SelectTrigger>
                        <SelectContent>
                          {GITHUB_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {GITHUB_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const current =
                          githubAssigneeByRow[sale.id] ?? sale.gp_assigned_email ?? "";
                        const inList = !!teamMembers.find(
                          (m) => m.user_email === current
                        );

                        return (
                          <Select
                            value={current || undefined}
                            onValueChange={(email) =>
                              handleAssignGithub(sale, email)
                            }
                            disabled={user?.role == "Technical Associate"}
                          >
                            <SelectTrigger className="w-[240px] !opacity-100 bg-muted/20 text-foreground">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {!inList && current && (
                                <SelectItem value={current} className="hidden">
                                  {sale.gp_assigned_name || current}
                                </SelectItem>
                              )}

                              <div className="px-2 py-1 text-xs text-muted-foreground">
                                Technical Heads
                              </div>
                              {teamMembers
                                .filter((m) => m.roles === "Technical Head")
                                .map((m) => (
                                  <SelectItem key={m.user_email} value={m.user_email}>
                                    {m.full_name} • Head
                                  </SelectItem>
                                ))}

                              <div className="px-2 py-1 text-xs text-muted-foreground">
                                Technical Associates
                              </div>
                              {teamMembers
                                .filter((m) => m.roles === "Technical Associate")
                                .map((m) => (
                                  <SelectItem key={m.user_email} value={m.user_email}>
                                    {m.full_name} • Associate
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {sale.closed_at
                        ? new Date(sale.closed_at).toLocaleDateString("en-GB")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {sale.gp_updated_at
                        ? new Date(sale.gp_updated_at).toLocaleDateString("en-GB")
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={GITHUB_COLUMNS.length}
                    className="text-center text-sm text-muted-foreground py-10"
                  >
                    No GitHub sales found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {githubPageSize !== "all" && totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handleGithubPageChange(Math.max(1, currentGithubPage - 1))}
                    className={currentGithubPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentGithubPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentGithubPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentGithubPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => handleGithubPageChange(pageNum)}
                        isActive={currentGithubPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handleGithubPageChange(Math.min(totalPages, currentGithubPage + 1))}
                    className={currentGithubPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    );
  };

  /* =========================
     Render
     ========================= */

  return (
    <ProtectedRoute
      allowedRoles={["Super Admin", "Technical Head", "Technical Associate"]}
    >
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8"  >
              <h1 className="text-3xl font-bold text-gray-900">Technical Page</h1>
              <div className="relative w-64">
                <Input
                  placeholder="Search name, email, phone..."
                  value={searchInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchInput(val);
                    if (val === "") {
                      setSearchQuery("");
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setSearchQuery(searchInput)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer hover:text-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">

              <Button variant="outline" onClick={fetchMyTasks}>My Tasks</Button>

              {/* Assignee Filter Dropdown */}
              {(user?.role === "Super Admin" || user?.role === "Technical Head") && (
                <Select
                  value={selectedAssignee}
                  onValueChange={handleAssigneeFilter}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Technical Heads
                    </div>
                    {teamMembers
                      .filter((m) => m.roles === "Technical Head")
                      .map((m) => (
                        <SelectItem key={m.user_email} value={m.user_email}>
                          {m.full_name} • Head
                        </SelectItem>
                      ))}

                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Technical Associates
                    </div>
                    {teamMembers
                      .filter((m) => m.roles === "Technical Associate")
                      .map((m) => (
                        <SelectItem key={m.user_email} value={m.user_email}>
                          {m.full_name} • Associate
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}

              <Dialog open={importInsertOpen} onOpenChange={setImportInsertOpen}>
                <DialogTrigger asChild>
                  <Button>Add sale done CSV</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto z-[1000]">
                  <DialogHeader>
                    <DialogTitle>Import Sales (CSV / XLSX)</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Select file</label>
                      <Input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setInsertFile(f);
                          if (f) handleParseSelectedFileInsert(f);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Excel files are converted to CSV in-browser, then parsed.
                      </p>
                    </div>
                    {parsingInsert && <p className="text-sm">Parsing…</p>}
                    {rawRowsInsert.length > 0 && !parsingInsert && (
                      <div className="space-y-1 text-sm">
                        <div>Total rows in file: <b>{rawRowsInsert.length}</b></div>
                        <div className="text-green-700">Valid rows to insert: <b>{validRowsToInsert.length}</b></div>
                        <div className="text-amber-700">Skipped (errors): <b>{invalidRowsInsert.length}</b></div>
                        {invalidRowsInsert.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer">See invalid row details</summary>
                            <ul className="list-disc pl-6 mt-2">
                              {invalidRowsInsert.slice(0, 20).map((row, idx) => (
                                <li key={idx}>Row {row.index}: {row.errors.join(", ")}</li>
                              ))}
                              {invalidRowsInsert.length > 20 && (
                                <li>…and {invalidRowsInsert.length - 20} more</li>
                              )}
                            </ul>
                          </details>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          This will insert into <b>public.sales_closure</b> only.
                          Required columns: <code>lead_id</code>, <code>total_amount</code>,
                          <code>subscription_cycle</code> (15/30/60/90), and either
                          <code> persoanl_mail_id</code> or <code> company_application_mail</code>.
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setImportInsertOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImportSubmit}
                      disabled={importingInsert || parsingInsert || validRowsToInsert.length === 0}
                    >
                      {importingInsert ? "Importing…" : `Submit (${validRowsToInsert.length})`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button onClick={() => setImportUpdateOpen(true)}>
                Update by CSV
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="p-6 text-gray-600">Loading...</p>
          ) : (
            <Tabs defaultValue="portfolio" className="w-full">
              <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                <TabsTrigger value="portfolio">Portfolios</TabsTrigger>
                <TabsTrigger value="github">GitHub</TabsTrigger>
              </TabsList>

              <TabsContent value="portfolio">
                {renderPortfolioTable(filteredPortfolioRows)}
              </TabsContent>
              <TabsContent value="github">
                {renderGithubTable(filteredGithubRows)}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <Dialog open={myTasksOpen} onOpenChange={setMyTasksOpen}>
          <DialogContent className="w-[90vw] h-[80vh] max-w-none flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>My Tasks</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-6 pt-0">
              {myTasksLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-muted-foreground">Loading…</div>
                </div>
              ) : myTasksError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-red-600">{myTasksError}</div>
                </div>
              ) : (
                renderPortfolioTable(myTasksRows)
              )}
            </div>
            <DialogFooter className="p-6 pt-2 border-t flex flex-row justify-end gap-2">
              <Button variant="outline" onClick={fetchMyTasks}>Refresh</Button>
              <Button onClick={() => setMyTasksOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as Success</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Success link</label>
              <Input
                placeholder="https://…"
                value={linkTargetLeadId ? linkDraft[linkTargetLeadId] ?? "" : ""}
                onChange={(e) =>
                  setLinkDraft((prev) => ({
                    ...prev,
                    ...(linkTargetLeadId
                      ? { [linkTargetLeadId]: e.target.value }
                      : {}),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Paste the final portfolio link. It will be saved in{" "}
                <code>portfolio_progress</code>.
              </p>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePortfolioSuccess}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={importUpdateOpen} onOpenChange={setImportUpdateOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Update Sales (by lead_id) — CSV / XLSX</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Select file</label>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setUpdateFile(f);
                    if (f) handleParseSelectedFileUpdate(f);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Excel files are converted to CSV in-browser, then parsed with
                  PapaParse. Only the columns present in your file will be updated.
                </p>
              </div>
              {parsingUpdate && <p className="text-sm">Parsing…</p>}
              {rawRowsUpdate.length > 0 && !parsingUpdate && (
                <div className="space-y-2 text-sm">
                  <div>Total rows in file: <b>{rawRowsUpdate.length}</b></div>
                  <div className="text-green-700">Valid update rows: <b>{updatesToApply.length}</b></div>
                  <div className="text-amber-700">Skipped (errors): <b>{invalidRowsUpdate.length}</b></div>
                  <div className="pt-2">
                    <div>lead_ids matched in DB: <b>{Object.keys(latestIdByLead).length}</b></div>
                    <div className="text-amber-700">lead_ids not found in DB: <b>{missingLeadIds.length}</b></div>
                    {missingLeadIds.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer">See missing lead_ids</summary>
                        <div className="mt-1 break-words">
                          {missingLeadIds.slice(0, 50).join(", ")}
                          {missingLeadIds.length > 50 && " …"}
                        </div>
                      </details>
                    )}
                  </div>
                  {invalidRowsUpdate.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">See invalid row details</summary>
                      <ul className="list-disc pl-6 mt-2">
                        {invalidRowsUpdate.slice(0, 20).map((row, idx) => (
                          <li key={idx}>Row {row.index}: {row.errors.join(", ")}</li>
                        ))}
                        {invalidRowsUpdate.length > 20 && (
                          <li>…and {invalidRowsUpdate.length - 20} more</li>
                        )}
                      </ul>
                    </details>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    We update the <b>latest</b> <code>sales_closure</code> row
                    for each <code>lead_id</code> (by <code>closed_at</code>).
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setImportUpdateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSubmitByLeadId}
                disabled={importingUpdate || parsingUpdate || updatesToApply.length === 0}
              >
                {importingUpdate ? "Updating…" : `Update (${updatesToApply.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
