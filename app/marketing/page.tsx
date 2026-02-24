// //app/marketing/page.tsx
// "use client";
// import { useEffect, useRef, useState, useContext } from "react";
// import { DashboardLayout } from "@/components/layout/dashboard-layout";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Trash2 } from 'lucide-react'; // Import trash icon from lucide-react



// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { MoreVertical, PlusCircle } from "lucide-react";

// import { Upload, Search, UserPlus, Download, List, RefreshCw } from "lucide-react";
// import { Label } from "@/components/ui/label";
// import { Checkbox } from "@/components/ui/checkbox";
// import Papa from "papaparse";
// import ProtectedRoute from "@/components/auth/ProtectedRoute";
// import { supabase } from "@/utils/supabase/client";
// import { LoadingContext } from "@/components/providers/LoadingContext";
// import FullScreenLoader from "@/components/ui/FullScreenLoader";

// interface Lead {
//   id: string;
//   business_id: string;
//   name: string;
//   phone: string;
//   email: string;
//   source: "Instagram" | "WhatsApp" | "Google Forms";
//   city: string;
//   status: "New" | "Assigned";
//   created_at: string;
//   assigned_to?: string;
//   assigned_at?: string;
// }


// // interface SalesDoneLead {
// //   id: string;
// //   business_id: string;
// //   name: string;
// //   phone: string;
// //   email: string;
// //   city: string;
// //   current_stage: string;
// //   created_at: string;
// //   updated_at?: string;
// //   closed_at?: string;
// // }
// export default function MarketingPage() {
//   const { loading, setLoading } = useContext(LoadingContext);
//   const [leads, setLeads] = useState<Lead[]>([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState<string>("all");
//   const [sourceFilter, setSourceFilter] = useState<string>("all");
//   const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
//   const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
//   const [salesTeamMembers, setSalesTeamMembers] = useState<
//     { id: string; full_name: string }[]
//   >([]);
//   const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
//   const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
//   const [selectedSalesMember, setSelectedSalesMember] = useState<string | null>(null);
//   const [uniqueSources, setUniqueSources] = useState<string[]>([]);
//   const [rowCount, setRowCount] = useState<number | null>(null);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [showConfirmDialog, setShowConfirmDialog] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
//   const [successDialogOpen, setSuccessDialogOpen] = useState(false);
//   const [assignSuccessMessage, setAssignSuccessMessage] = useState("");
//   // const [leadTab, setLeadTab] = useState<"New" | "Assigned">("New");

//   // Add state for deletion
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pageSize, setPageSize] = useState(15);
//   const [cycleFilter, setCycleFilter] = useState("all");
//   const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);


//   const [allLeadsStats, setAllLeadsStats] = useState({ total: 0, assigned: 0, new: 0 });
//   // const [showReassignDialog, setShowReassignDialog] = useState(false);
//   // const [pendingAssignee, setPendingAssignee] = useState<string | null>(null);
//   const [distinctSalesDialogOpen, setDistinctSalesDialogOpen] = useState(false);
//   const [distinctSalesLeads, setDistinctSalesLeads] = useState<Lead[]>([]);
//   const [distinctSalesStartDate, setDistinctSalesStartDate] = useState("");
//   const [distinctSalesEndDate, setDistinctSalesEndDate] = useState("");
//   const [distinctSalesSource, setDistinctSalesSource] = useState("all");
//   const [distinctSources, setDistinctSources] = useState<string[]>([]);
//   const [distinctSalesPerson, setDistinctSalesPerson] = useState("all");
//   const [distinctSalesPersons, setDistinctSalesPersons] = useState<string[]>([]);



//   const [startDate, setStartDate] = useState<string>("");
//   const [endDate, setEndDate] = useState<string>("");

//   const [salesHistoryDialogOpen, setSalesHistoryDialogOpen] = useState(false);
//   interface SalesHistoryItem {
//     id: string;
//     lead_id: string;
//     email: string;
//     sale_value: number;
//     subscription_cycle: number;
//     payment_mode: string;
//     finance_status: string;
//     closed_at: string;
//     leads?: {
//       name?: string;
//       phone?: string;
//     };
//     lead_name?: string;
//     lead_phone?: string;
//   }

//   const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
//   const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

//   const [allLeads, setAllLeads] = useState([]);

//   const [googleSheets, setGoogleSheets] = useState<{ id: number, name: string, url: string }[]>([]);
//   const [showSheetsDialog, setShowSheetsDialog] = useState(false);
//   const [copySuccess, setCopySuccess] = useState(false);
//   const [googleSheetDialogOpen, setGoogleSheetDialogOpen] = useState(false);
//   const [newSheetName, setNewSheetName] = useState("");
//   const [newSheetUrl, setNewSheetUrl] = useState("");
//   const [leadTab, setLeadTab] = useState<"New" | "Assigned" | "All">("New");
//   const [isAllView, setIsAllView] = useState(false);
//   const [salesDoneLeads, setSalesDoneLeads] = useState([]);
//   const [showSalesDoneDialog, setShowSalesDoneDialog] = useState(false);


//   const [resultDialogOpen, setResultDialogOpen] = useState(false);
//   const [resultMessage, setResultMessage] = useState({
//     title: '',
//     description: '',
//     isError: false
//   });



//   // Add this effect to auto-close the dialog
//   useEffect(() => {
//     let timer: NodeJS.Timeout;
//     if (resultDialogOpen) {
//       timer = setTimeout(() => {
//         setResultDialogOpen(false);
//       }, 2500); // 2.5 seconds
//     }
//     return () => clearTimeout(timer);
//   }, [resultDialogOpen]);

//   useEffect(() => {
//     fetchGoogleSheets();
//     // fetchAllUniqueSources();
//     // ... your other useEffect code
//   }, []);

//   useEffect(() => {
//     let timer: NodeJS.Timeout;
//     if (copySuccess) {
//       timer = setTimeout(() => {
//         setCopySuccess(false);
//       }, 3000); // 3 seconds
//     }
//     return () => clearTimeout(timer);
//   }, [copySuccess]);

//   // const filteredLeads = leads.filter((lead) => {
//   //   const matchesSearch =
//   //     lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//   //     lead.phone.includes(searchTerm) ||
//   //     lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
//   //     lead.city.toLowerCase().includes(searchTerm.toLowerCase());
//   //   const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
//   //   const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
//   //   return matchesSearch && matchesStatus && matchesSource;
//   // });

//   const filteredLeads = leads.filter((lead) => {
//     const matchesSearch =
//       lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       lead.phone.includes(searchTerm) ||
//       lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       lead.city.toLowerCase().includes(searchTerm.toLowerCase());

//     const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
//     // const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;

//     const matchesSource =
//       sourceFilter === "all" ||
//       (lead.source?.toLowerCase().trim() === sourceFilter.toLowerCase().trim());


//     const matchesTab =
//       leadTab === "All" ||
//       (leadTab === "New" && lead.status === "New") ||
//       (leadTab === "Assigned" && lead.status === "Assigned");

//     return matchesSearch && matchesStatus && matchesSource && matchesTab;
//   });

//   // const paginationPages = Math.ceil(filteredLeads.length / pageSize);
//   const paginationPages = totalPages;


//   // Slice for current page view
//   // const paginatedLeads = filteredLeads.slice(
//   //   (currentPage - 1) * pageSize,
//   //   currentPage * pageSize
//   // );

//   // const paginatedLeads = isAllView
//   //   ? filteredLeads // don’t slice, show all
//   //   : filteredLeads.slice(
//   //       (currentPage - 1) * pageSize,
//   //       currentPage * pageSize
//   //     );


//   const sortLeads = (leads: Lead[]) => {
//     if (!sortConfig) return leads;

//     const sorted = [...leads].sort((a, b) => {
//       const aVal = a[sortConfig.key as keyof Lead];
//       const bVal = b[sortConfig.key as keyof Lead];

//       if (sortConfig.key === "created_at" || sortConfig.key === "assigned_at") {
//         return sortConfig.direction === "asc"
//           ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
//           : new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
//       }

//       if (sortConfig.key === "lead_age") {
//         const aAge = new Date().getTime() - new Date(a.created_at).getTime();
//         const bAge = new Date().getTime() - new Date(b.created_at).getTime();
//         return sortConfig.direction === "asc" ? aAge - bAge : bAge - aAge;
//       }

//       if (sortConfig.key === "business_id") {
//         const getNumericPart = (val: string) => {
//           const match = val?.match(/\d+$/); // extract number after "AWL-"
//           return match ? parseInt(match[0]) : 0;
//         };

//         const aNum = getNumericPart(a.business_id);
//         const bNum = getNumericPart(b.business_id);

//         return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
//       }


//       // if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
//       // if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
//       return 0;
//     });

//     return sorted;
//   };

//   const sortedLeads = sortLeads(filteredLeads);
//   // const paginatedLeads = isAllView
//   //   ? sortedLeads
//   //   : sortedLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);
//   const paginatedLeads = isAllView ? sortedLeads : sortedLeads;


//   // const paginatedLeads = isAllView
//   //   ? filteredLeads // full dataset shown, slice locally
//   //   : leads; // already paginated server-side, use directly


//   //     const filteredSales = salesHistory.filter((item) => {
//   //   const closedDate = new Date(item.closed_at).toISOString().split("T")[0]; // Convert to YYYY-MM-DD

//   //   const startMatch = !startDate || closedDate >= startDate;
//   //   const endMatch = !endDate || closedDate <= endDate;

//   //   return startMatch && endMatch;
//   // });

//   const filteredSales = salesHistory.filter((item) => {
//     const closedDate = new Date(item.closed_at).toISOString().split("T")[0];

//     const startMatch = !startDate || closedDate >= startDate;
//     const endMatch = !endDate || closedDate <= endDate;
//     const cycleMatch = cycleFilter === "all" || item.subscription_cycle === Number(cycleFilter);

//     return startMatch && endMatch && cycleMatch;
//   });



//   const handleSelectAll = (checked: boolean) => {
//     if (checked) {
//       const selectableLeadIds = filteredLeads
//         .filter((lead) => lead.status !== "Assigned")
//         .map((lead) => lead.id);
//       setSelectedLeads(selectableLeadIds);
//     } else {
//       setSelectedLeads([]);
//     }
//   };

//   const handleSelectLead = (leadId: string, checked: boolean) => {
//     if (checked) {
//       setSelectedLeads((prev) => [...prev, leadId]);
//     } else {
//       setSelectedLeads((prev) => prev.filter((id) => id !== leadId));
//     }
//   };

//   const handleBulkAssign = async (assignedTo: string) => {
//     setLoading(true);
//     try {
//       const res = await fetch("/api/assign-leads", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           selectedLeads,
//           assignedTo,
//           assignedAt: new Date().toISOString(),
//           allLeads: leads,
//         }),
//       });
//       const result = await res.json();
//       if (!res.ok) throw new Error(result.error || "Assignment failed");

//       setAssignSuccessMessage(`Assigned ${selectedLeads.length} lead(s) to ${assignedTo}.`);
//       setSuccessDialogOpen(true); //  Open dialog
//       setTimeout(() => setSuccessDialogOpen(false), 3000);

//       setSelectedLeads([]);
//       setBulkAssignDialogOpen(false);

//       const { data, error } = await supabase.from("leads").select("*");
//       if (error) throw error;
//       setLeads(data ?? []);
//       fetchLeadCounts();

//     } catch (error) {
//       console.error("Bulk assign error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };
//   // Convert local date to UTC range
//   const getUTCRange = (dateStr: string, isStart: boolean) => {
//     const date = new Date(dateStr);
//     if (isStart) {
//       date.setHours(0, 0, 0, 0);
//     } else {
//       date.setHours(23, 59, 59, 999);
//     }
//     return date.toISOString(); // Converts to UTC properly
//   };

//   const fetchDistinctSalesLeads = async () => {
//     let query = supabase
//       .from("leads")
//       .select("*")
//       .eq("current_stage", "sale done"); // Be careful: check if it's "sale done" (not "sales done")

//     if (distinctSalesStartDate && distinctSalesEndDate) {
//       query = query
//         .gte("created_at", getUTCRange(distinctSalesStartDate, true))
//         .lte("created_at", getUTCRange(distinctSalesEndDate, false));
//     }

//     if (distinctSalesSource !== "all") {
//       query = query.eq("source", distinctSalesSource);
//     }

//     const { data, error } = await query.order("created_at", { ascending: false });

//     if (!error) {
//       setDistinctSalesLeads(data || []);
//     } else {
//       console.error("Error fetching distinct sales leads:", error);
//     }
//   };

//   const handleFilterChange = async ({
//     startDate = distinctSalesStartDate,
//     endDate = distinctSalesEndDate,
//     source = distinctSalesSource,
//   }: {
//     startDate?: string;
//     endDate?: string;
//     source?: string;
//   }) => {
//     setDistinctSalesStartDate(startDate);
//     setDistinctSalesEndDate(endDate);
//     setDistinctSalesSource(source);

//     // then fetch after setting all 3
//     let query = supabase
//       .from("leads")
//       .select("*")
//       .eq("current_stage", "sale done");

//     if (startDate && endDate) {
//       const getUTCRange = (dateStr: string, isStart: boolean) => {
//         const date = new Date(dateStr);
//         if (isStart) date.setHours(0, 0, 0, 0);
//         else date.setHours(23, 59, 59, 999);
//         return date.toISOString();
//       };

//       query = query
//         .gte("created_at", getUTCRange(startDate, true))
//         .lte("created_at", getUTCRange(endDate, false));
//     }

//     if (source !== "all") {
//       query = query.eq("source", source);
//     }

//     const { data, error } = await query;
//     if (!error) setDistinctSalesLeads(data || []);
//   };

//   // Handle Delete Click - Open the confirmation dialog
//   const handleDeleteClick = (leadId: string) => {
//     setSelectedLeadId(leadId);
//     setDeleteDialogOpen(true);
//   };

//   // // Handle Confirm Delete - Execute the delete operation
//   // const handleDeleteConfirmation = async () => {
//   //   if (selectedLeadId) {
//   //     try {
//   //       const { error } = await supabase
//   //         .from('leads')
//   //         .delete()
//   //         .eq('id', selectedLeadId); // Delete record by ID

//   //       if (error) {
//   //         console.error('Error deleting lead:', error);
//   //         alert('Failed to delete lead.');
//   //         return;
//   //       }

//   //       // Close the dialog and refresh leads
//   //       setDeleteDialogOpen(false);
//   //       setSelectedLeadId(null);
//   //       alert('Lead deleted successfully!');

//   //       // Refetch leads after deletion (you can use your existing fetch method)
//   //       const { data, error: fetchError } = await supabase.from('leads').select('*');
//   //       if (fetchError) throw fetchError;
//   //       setLeads(data ?? []); // Update leads state with the new data

//   //     } catch (err) {
//   //       console.error('Delete operation failed:', err);
//   //       alert('Error deleting lead.');
//   //     }
//   //   }
//   // };


//   const handleDeleteConfirmation = async () => {
//     if (selectedLeadId) {
//       try {
//         // Check if the lead_id exists in the sales_closure table


//         // Now, delete the lead from the leads table
//         const { error: deleteLeadError } = await supabase
//           .from('leads')
//           .delete()
//           .eq('id', selectedLeadId); // Delete the lead record

//         if (deleteLeadError) {
//           console.error('Error deleting lead:', deleteLeadError);
//           alert('Failed to delete lead.');
//           return;
//         }

//         // Successfully deleted the lead and sales closure records (if any)
//         setDeleteDialogOpen(false);
//         setSelectedLeadId(null);
//         alert('Lead deleted successfully!');

//         // Refetch leads after deletion
//         const { data, error: fetchError } = await supabase.from('leads').select('*');
//         if (fetchError) throw fetchError;
//         setLeads(data ?? []); // Update leads state with the new data

//       } catch (err) {
//         console.error('Delete operation failed:', err);
//         alert('Error deleting lead and sales closures.');
//       }
//     }
//   };


//   const fetchAllUniqueSources = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("leads")
//         .select("source")
//         .neq("source", "") // optional: ignore empty sources

//       if (error) throw error;

//       const sources = [...new Set(data.map(item => item.source))];
//       setUniqueSources(sources);
//     } catch (err) {
//       console.error("Error fetching unique sources:", err);
//     }
//   };

//   const handleIndividualAssign = async (leadId: string, assignedTo: string) => {
//     setLoading(true, "Assigning... please wait");
//     try {
//       const res = await fetch("/api/assign-leads", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           selectedLeads: [leadId],
//           assignedAt: new Date().toISOString(),
//           assignedTo,
//         }),
//       });

//       if (!res.ok) throw new Error("Assignment failed");

//       setLeads((prev) =>
//         prev.map((lead) =>
//           lead.id === leadId
//             ? {
//               ...lead,
//               status: "Assigned",
//               assigned_to: assignedTo,
//               assigned_at: new Date().toISOString(),
//             }
//             : lead
//         )
//       );
//       fetchLeadCounts();

//     } catch (error) {
//       console.error("Individual assign error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchLeadCounts = async () => {
//     try {
//       const { data: totalLeads, error: totalErr } = await supabase
//         .from("leads")
//         .select("id, status");
//       if (totalErr) throw totalErr;

//       const total = totalLeads.length;
//       const assigned = totalLeads.filter((l) => l.status === "Assigned").length;
//       const newLeads = totalLeads.filter((l) => l.status === "New").length;

//       setAllLeadsStats({ total, assigned, new: newLeads });
//     } catch (err) {
//       console.error("Failed to fetch lead counts:", err);
//     }
//   };

//   useEffect(() => {
//     fetchLeadCounts();
//   }, []);


//   //   const fetchLeadsAndSales = async (
//   //     page = 1,
//   //     tab = leadTab,
//   //     search = searchTerm,
//   //     status = statusFilter,
//   //     source = sourceFilter
//   //   ) => {
//   //     setLoading(true);
//   //     try {
//   //       const from = (page - 1) * pageSize;
//   //       const to = from + pageSize - 1;

//   //       let query = supabase
//   //         .from("leads")
//   //         .select("*", { count: "exact" })
//   //         .range(from, to)
//   //         .order("created_at", { ascending: false });

//   // //         if (startDate && endDate) {
//   // //   query = query.gte("created_at", `${startDate}T00:00:00`).lte("created_at", `${endDate}T23:59:59`);
//   // // }
//   // if (startDate && endDate) {
//   //   query = query
//   //     .gte("created_at", `${startDate}T00:00:00+05:30`)
//   //     .lte("created_at", `${endDate}T23:59:59+05:30`);
//   // }


//   //       // if (tab) query = query.eq("status", tab);

//   // if (tab && tab !== "All") {
//   //   query = query.eq("status", tab);
//   // }

//   // if (search) {
//   //         query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`);
//   //       }
//   //       if (source !== "all") query = query.eq("source", source);
//   //       if (status !== "all") query = query.eq("status", status);

//   //       const { data: leadsData, error, count } = await query;
//   //       // leadsData?.sort((a, b) => {
//   //       //   const numA = parseInt(a.business_id.replace("AWL-", ""), 10);
//   //       //   const numB = parseInt(b.business_id.replace("AWL-", ""), 10);
//   //       //   return numA - numB;
//   //       // });

//   //       // setLeads(leadsData ?? []);

//   //       if (error) throw error;

//   //       setLeads(leadsData ?? []);
//   //       setTotalPages(Math.ceil((count || 0) / pageSize));
//   //       setUniqueSources([...new Set((leadsData ?? []).map((l) => l.source))]);

//   //       // Fetch Sales Team
//   //       const res = await fetch("/api/sales-users", { method: "GET" });
//   //       if (!res.ok) throw new Error(`Sales API failed: ${await res.text()}`);
//   //       const users = await res.json();
//   //       setSalesTeamMembers(users);
//   //     } catch (err) {
//   //       console.error("Error fetching leads:", err);
//   //     } finally {
//   //       setLoading(false);
//   //     }
//   //   };

//   const handleMainFilterChange = ({
//     start,
//     end,
//     source,
//     status = statusFilter,
//     tab = leadTab,
//     search = searchTerm,
//   }: {
//     start?: string;
//     end?: string;
//     source?: string;
//     status?: string;
//     tab?: "New" | "Assigned" | "All";
//     search?: string;
//   }) => {
//     const finalStart = start ?? startDate;
//     const finalEnd = end ?? endDate;
//     const finalSource = source ?? sourceFilter;

//     // Update state
//     setStartDate(finalStart);
//     setEndDate(finalEnd);
//     setSourceFilter(finalSource);

//     // Fetch filtered data
//     fetchLeadsAndSales(
//       1,
//       tab,
//       search,
//       status,
//       finalSource,
//       finalStart,
//       finalEnd
//     );
//     setCurrentPage(1);
//   };


//   const fetchLeadsAndSales = async (
//     page = 1,
//     tab = leadTab,
//     search = searchTerm,
//     status = statusFilter,
//     source = sourceFilter,
//     start = startDate,
//     end = endDate
//   ) => {
//     setLoading(true);
//     try {
//       const from = (page - 1) * pageSize;
//       const to = from + pageSize - 1;

//       let query = supabase
//         .from("leads")
//         .select("*", { count: "exact" })
//         .range(from, to)
//         .order("created_at", { ascending: false });

//       if (start && end) {
//         const getUTCRange = (dateStr: string, isStart: boolean) => {
//           const date = new Date(dateStr);
//           if (isStart) date.setHours(0, 0, 0, 0);
//           else date.setHours(23, 59, 59, 999);
//           return date.toISOString();
//         };

//         query = query
//           .gte("created_at", getUTCRange(start, true))
//           .lte("created_at", getUTCRange(end, false));
//       }

//       if (tab && tab !== "All") query = query.eq("status", tab);
//       if (search) {
//         query = query.or(
//           `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
//         );
//       }
//       if (source !== "all") query = query.eq("source", source);
//       if (status !== "all") query = query.eq("status", status);

//       const { data: leadsData, error, count } = await query;
//       if (error) throw error;

//       setLeads(leadsData ?? []);
//       setTotalPages(Math.ceil((count || 0) / pageSize));
//       setUniqueSources([...new Set((leadsData ?? []).map((l) => l.source))]);

//       // Fetch Sales Team
//       const res = await fetch("/api/sales-users", { method: "GET" });
//       if (!res.ok) throw new Error(`Sales API failed: ${await res.text()}`);
//       const users = await res.json();
//       setSalesTeamMembers(users);

//       //     }
//     } catch (err) {
//       console.error("Error fetching leads:", err);
//     } finally {
//       setLoading(false);
//     }
//   };


//   // useEffect(() => {
//   //   fetchLeadsAndSales(currentPage, leadTab, searchTerm, statusFilter, sourceFilter);
//   // }, [currentPage, leadTab, pageSize, searchTerm, statusFilter, sourceFilter]);

//   //   useEffect(() => {
//   //   fetchLeadsAndSales(currentPage, leadTab, searchTerm, statusFilter, sourceFilter);
//   // }, [currentPage, leadTab, pageSize, searchTerm, statusFilter, sourceFilter, startDate, endDate]);

//   useEffect(() => {
//     fetchLeadsAndSales(currentPage, leadTab, searchTerm, statusFilter, sourceFilter);
//   }, [currentPage, leadTab, pageSize, searchTerm, statusFilter, sourceFilter, startDate, endDate]);




//   const formatDateTime = (dateString: string) => {
//     const date = new Date(dateString);
//     const pad = (n: number) => n.toString().padStart(2, "0");
//     const day = pad(date.getDate());
//     const month = pad(date.getMonth() + 1);
//     const year = date.getFullYear();
//     let hours = date.getHours();
//     const minutes = pad(date.getMinutes());
//     const seconds = pad(date.getSeconds());
//     const ampm = hours >= 12 ? "PM" : "AM";
//     hours = hours % 12 || 12;
//     return `${day}-${month}-${year} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
//   };

//   const downloadCSV = (data: Lead[]) => {
//     const csvContent = [
//       [
//         "Name",
//         "Phone",
//         "Email",
//         "City",
//         "Source",
//         "Assigned To",
//         "Created At",
//         "Assigned At",
//       ],
//       ...data.map((lead) => [
//         lead.name,
//         lead.phone,
//         lead.email,
//         lead.city,
//         lead.source,
//         lead.assigned_to || "",
//         formatDateTime(lead.created_at),
//         lead.assigned_at ? formatDateTime(lead.assigned_at) : "",
//       ]),
//     ]
//       .map((row) => row.map((cell) => `"${cell}"`).join(","))
//       .join("\n");

//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", "assigned_leads.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };



//   const downloadSalesCSV = (data: any[]) => {
//     const cleanedData = data.map(item => ({
//       LeadID: item.lead_id,
//       Name: item.lead_name,
//       Phone: item.lead_phone?.normalize("NFKD") || "N/A",
//       Email: item.email,
//       SaleValue: item.sale_value,
//       Cycle: item.subscription_cycle,
//       PaymentMode: item.payment_mode,
//       Status: item.finance_status,
//       ClosedAt: new Date(item.closed_at).toLocaleDateString(),
//     }));

//     const csv = Papa.unparse(cleanedData);

//     // Add UTF-8 BOM prefix
//     const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });

//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.setAttribute("download", "sales_history.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };


//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const openFileDialog = () => fileInputRef.current?.click();

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) return;
//     setSelectedFile(file);
//     setShowConfirmDialog(true);
//     setUploadProgress(0);

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: true,
//       complete: (results) => {
//         setRowCount(results.data.length);
//       },
//     });
//   };

//   const formatFileSize = (size: number) =>
//     size >= 1024 * 1024
//       ? `${(size / (1024 * 1024)).toFixed(1)} MB`
//       : `${(size / 1024).toFixed(1)} KB`;

//   const handleConfirmUpload = () => {
//     if (!selectedFile) return;
//     setIsUploading(true);
//     setLoading(true);

//     Papa.parse(selectedFile, {
//       header: true,
//       skipEmptyLines: true,
//       complete: async (results) => {
//         setRowCount(results.data.length);
//         const parsedData = results.data.map((row: any) => {
//           let formattedDate = "";
//           try {
//             const [day, month, yearAndTime] = row.Timestamp?.split("-") || [];
//             const [year, time] = yearAndTime?.split(" ") || [];
//             formattedDate = new Date(
//               `${year}-${month}-${day}T${time || "00:00"}:00`
//             ).toISOString();
//           } catch {
//             formattedDate = new Date().toISOString();
//           }

//           return {
//             name: row["Full name"] || "",
//             phone: row["Phone Number (Country Code)"] || "",
//             email: row["Email"] || "",
//             city: row["city"] || "",
//             source: row["source"] || "Unknown",
//             status: "New",
//             created_at: formattedDate,
//             assigned_to: "",
//           };
//         });

//         // const { error } = await supabase.from("leads").insert(parsedData);
//         // if (!error) {
//         //   const { data: updated, error: fetchError } = await supabase
//         //     .from("leads")
//         //     .select("*");
//         //   if (!fetchError) setLeads(updated || []);
//         // }

//         const { error } = await supabase.from("leads").insert(parsedData);

//         if (error) {
//           console.error("❌ Supabase Insert Error:", error); // 👈 ADD THIS
//           alert("Failed to insert CSV data into Supabase. Check console.");
//         } else {
//           const { data: updated, error: fetchError } = await supabase
//             .from("leads")
//             .select("*");
//           if (!fetchError) setLeads(updated || []);
//         }


//         setTimeout(async () => {
//           setUploadProgress(100);
//           setSelectedFile(null);
//           setShowConfirmDialog(false);
//           setUploadDialogOpen(false);
//           setUploadProgress(0);
//           setIsUploading(false);
//           setLoading(false);

//           await fetchLeadCounts();

//           // Fetch only 15 new leads after upload
//           await fetchLeadsAndSales(1, "New", "", "all", "all");
//           setCurrentPage(1); // Reset pagination

//         }, 1000);
//         fetchLeadCounts();
//       },
//     });
//   };


//   const getSourceBadgeColor = (source: string) => {
//     switch (source) {
//       case "Instagram":
//         return "bg-pink-100 text-pink-800 rounded-md";
//       case "WhatsApp":
//         return "bg-green-100 text-green-800 rounded-md";
//       case "Google":
//         return "bg-gray-900 text-gray-100 rounded-md";
//       case "Facebook":
//         return "bg-blue-200 text-blue-900 rounded-md";
//       default:
//         return "bg-gray-100 text-gray-800 rounded-md";
//     }
//   };

//   const getStatusBadgeColor = (status: string) => {
//     switch (status) {
//       case "New":
//         return "bg-red-100 text-red-800";
//       case "Assigned":
//         return "bg-green-100 text-green-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   };

//   //   const handleDistinctFilterChange = async ({
//   //   startDate,
//   //   endDate,
//   //   source,
//   // }: {
//   //   startDate: string;
//   //   endDate: string;
//   //   source: string;
//   // }) => {
//   //   setDistinctSalesStartDate(startDate);
//   //   setDistinctSalesEndDate(endDate);
//   //   setDistinctSalesSource(source);

//   //   const getUTCRange = (dateStr: string, isStart: boolean) => {
//   //     const date = new Date(dateStr);
//   //     if (isStart) date.setHours(0, 0, 0, 0);
//   //     else date.setHours(23, 59, 59, 999);
//   //     return date.toISOString();
//   //   };

//   //   let query = supabase
//   //     .from("leads")
//   //     .select("*")
//   //     .eq("current_stage", "sale done");

//   //   if (startDate && endDate) {
//   //     query = query
//   //       .gte("created_at", getUTCRange(startDate, true))
//   //       .lte("created_at", getUTCRange(endDate, false));
//   //   }

//   //   if (source !== "all") {
//   //     query = query.eq("source", source);
//   //   }

//   //   const { data, error } = await query;
//   //   if (!error) {
//   //     setDistinctSalesLeads(data || []);
//   //     const sourceList = [...new Set((data || []).map((d) => d.source?.trim()).filter(Boolean))];
//   //     setDistinctSources(sourceList);
//   //   } else {
//   //     console.error("Error fetching filtered leads:", error);
//   //   }
//   // };


//   const handleDistinctFilterChange = async ({
//     startDate,
//     endDate,
//     source,
//     assignedTo = distinctSalesPerson,
//   }: {
//     startDate: string;
//     endDate: string;
//     source: string;
//     assignedTo?: string;
//   }) => {
//     setDistinctSalesStartDate(startDate);
//     setDistinctSalesEndDate(endDate);
//     setDistinctSalesSource(source);
//     setDistinctSalesPerson(assignedTo || "all");

//     const getUTCRange = (dateStr: string, isStart: boolean) => {
//       const date = new Date(dateStr);
//       if (isStart) date.setHours(0, 0, 0, 0);
//       else date.setHours(23, 59, 59, 999);
//       return date.toISOString();
//     };

//     let query = supabase
//       .from("leads")
//       .select("*")
//       .eq("current_stage", "sale done");

//     if (startDate && endDate) {
//       query = query
//         .gte("created_at", getUTCRange(startDate, true))
//         .lte("created_at", getUTCRange(endDate, false));
//     }

//     if (source !== "all") {
//       query = query.eq("source", source);
//     }

//     if (assignedTo && assignedTo !== "all") {
//       query = query.eq("assigned_to", assignedTo);
//     }

//     const { data, error } = await query;
//     if (!error) {
//       setDistinctSalesLeads(data || []);

//       const sourceList = [...new Set((data || []).map((d) => d.source?.trim()).filter(Boolean))];
//       setDistinctSources(sourceList);
//     } else {
//       console.error("Error fetching filtered leads:", error);
//     }
//   };

//   const fetchDistinctSalesPersons = async () => {
//     const { data, error } = await supabase
//       .from("leads")
//       .select("assigned_to") // 👈 just fetch the column
//       .neq("assigned_to", null); // 👈 filter out nulls

//     if (!error && data) {
//       const names = [...new Set(data.map((item) => item.assigned_to?.trim()).filter(Boolean))];
//       setDistinctSalesPersons(names);
//     } else {
//       console.error("Error fetching distinct salespersons:", error);
//     }
//   };


//   const handleAddNewSheet = async () => {
//     try {
//       setLoading(true);

//       if (!newSheetUrl.match(/https:\/\/docs\.google\.com\/spreadsheets\/.+/)) {
//         throw new Error('Must be a valid Google Sheets URL (https://docs.google.com/spreadsheets/...)');
//       }

//       const { data, error } = await supabase
//         .from('google_sheets_config')
//         .insert([{
//           name: newSheetName.trim(),
//           url: newSheetUrl.trim()
//         }])
//         .select()
//         .single(); // Ensures we get a single record

//       if (error) {
//         console.error('Supabase insert error:', error);
//         throw new Error(error.message || 'Failed to save sheet configuration');
//       }

//       // Show success (will auto-close in 3s via useEffect)
//       setResultMessage({
//         title: 'Success ✅',
//         description: `"${newSheetName}" added successfully!`,
//         isError: false
//       });
//       setResultDialogOpen(true);

//       setGoogleSheetDialogOpen(false);
//       setNewSheetName('');
//       setNewSheetUrl('');
//       fetch('/api/fetch-google-sheet', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${process.env.CRON_SECRET || "local_dev_secret"}`
//         },
//       }).catch(console.error); // Silently handle fetch errors

//     } catch (error) {
//       // Show error (will auto-close in 3s via useEffect)
//       setResultMessage({
//         title: 'Error ❌',
//         description: error instanceof Error ?
//           error.message.replace('Invalid Google Sheets URL - ', '') :
//           'Operation failed',
//         isError: true
//       });
//       setResultDialogOpen(true);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchGoogleSheets = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('google_sheets_config')
//         .select('id, name, url')
//         .order('created_at', { ascending: false });

//       if (error) throw error;
//       setGoogleSheets(data || []);
//     } catch (err) {
//       console.error('Error fetching Google Sheets:', err);
//     }
//   };

//   const handleSort = (key: string, direction: "asc" | "desc") => {
//     setSortConfig({ key, direction });
//   };


//   return (
//     <>
//       {loading && <FullScreenLoader />}
//       <ProtectedRoute allowedRoles={["Marketing", "Super Admin"]}>
//         {/* <div className="w-full overflow-x-hidden"> */}
//         {/* <div className="w-full px-4 md:px-6 lg:px-8 overflow-x-hidden"> */}

//         <DashboardLayout>
//           {/* <div className="space-y-6"> */}
//           {/* <main className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6"> */}
//           <div className="space-y-6">


//             <div className="flex justify-between items-center">
//               <div>
//                 <h1 className="text-3xl font-bold text-gray-900">Marketing CRM</h1>
//                 <p className="text-gray-600 mt-2">Manage leads and marketing campaigns</p>
//               </div>
//               <div className="flex gap-3">
//                 <Button
//                   variant="outline"
//                   onClick={() => window.open('/marketingAnalytics', '_blank')}
//                   className="flex items-center gap-2"
//                 >
//                   <RefreshCw className="w-4 h-4" /> Analytics
//                 </Button>

//                 <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>

//                   <DialogTrigger asChild>
//                     {/* <Button variant="outline" onClick={() => {
//                         const filtered = leads.filter(lead => lead.status === "Assigned");
//                         setAssignedLeads(filtered);
//                         setHistoryDialogOpen(true);
//                       }}>
//                         📜 History &#11206;
//                       </Button> */}

//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button variant="outline">📜 History &#11206;</Button>
//                       </DropdownMenuTrigger>

//                       <DropdownMenuContent>
//                         <DropdownMenuItem
//                           onClick={() => {
//                             const filtered = leads.filter((lead) => lead.status === "Assigned");
//                             setAssignedLeads(filtered);
//                             setHistoryDialogOpen(true);
//                           }}
//                         >
//                           Assigned Leads History
//                         </DropdownMenuItem>

//                         <DropdownMenuItem
//                           onClick={async () => {
//                             const { data: sales, error: salesErr } = await supabase
//                               .from("sales_closure")
//                               .select("*")
//                               .order("closed_at", { ascending: false });

//                             const { data: leads, error: leadsErr } = await supabase
//                               .from("leads")
//                               .select("business_id, name, phone");

//                             const salesWithLeads = (sales ?? []).map((s) => {
//                               const match = (leads ?? []).find((l) => l.business_id === s.lead_id);
//                               return {
//                                 ...s,
//                                 lead_name: match?.name ?? "N/A",
//                                 lead_phone: match?.phone ?? "N/A",
//                               };
//                             });

//                             setSalesHistory(salesWithLeads);
//                             setSalesHistoryDialogOpen(true);

//                           }}
//                         >
//                           Sales Done History
//                         </DropdownMenuItem>
//                       </DropdownMenuContent>
//                     </DropdownMenu>

//                   </DialogTrigger>

//                   {historyDialogOpen && (

//                     <DialogContent className="max-w-7xl">
//                       <DialogHeader>
//                         <DialogTitle>Assigned Leads History</DialogTitle>
//                         <DialogDescription>View all leads that are currently assigned.</DialogDescription>
//                       </DialogHeader>

//                       {/* Table to display assigned leads */}
//                       {assignedLeads && assignedLeads.length > 0 ? (
//                         <>
//                           <div className="overflow-auto max-h-[400px] border rounded-lg">
//                             <Table>
//                               <TableHeader>
//                                 <TableRow>
//                                   <TableHead>Name</TableHead>
//                                   <TableHead>Phone</TableHead>
//                                   <TableHead>Email</TableHead>
//                                   <TableHead>City</TableHead>
//                                   <TableHead>Source</TableHead>
//                                   <TableHead>Assigned To</TableHead>
//                                   <TableHead>Created At</TableHead>
//                                   <TableHead>Assigned At</TableHead>
//                                 </TableRow>
//                               </TableHeader>
//                               <TableBody>
//                                 {assignedLeads.map((lead) => (
//                                   <TableRow key={lead.id}>
//                                     <TableCell>{lead.name}</TableCell>
//                                     <TableCell>{lead.phone}</TableCell>
//                                     <TableCell>{lead.email}</TableCell>
//                                     <TableCell>{lead.city}</TableCell>
//                                     <TableCell className="text-right">{lead.source}</TableCell>
//                                     <TableCell>{lead.assigned_to}</TableCell>
//                                     <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
//                                     {/*<TableCell>{lead.assigned_at ? new Date(lead.assigned_at).toLocaleDateString() : ""}</TableCell> */}
//                                     <TableCell>{lead.assigned_at ? formatDateTime(lead.assigned_at) : ""}</TableCell>
//                                   </TableRow>
//                                 ))}
//                               </TableBody>
//                             </Table>
//                           </div >

//                           <div className="flex justify-end mt-4">

//                             <Button onClick={() => downloadCSV(assignedLeads)}>
//                               <Download className="h-4 w-4 mr-2" /> Download CSV
//                             </Button>
//                           </div>
//                         </>) : (<div className="py-8 text-center text-gray-500">
//                           <p>There are no assigned leads yet.</p>
//                         </div>)}
//                     </DialogContent>
//                   )}
//                 </Dialog>

//                 <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//                   <DialogContent>
//                     <DialogHeader>
//                       <DialogTitle>Confirm Deletion</DialogTitle>
//                     </DialogHeader>
//                     <DialogDescription>
//                       Are you sure you want to delete this lead?
//                     </DialogDescription>

//                     <DialogFooter>
//                       <Button onClick={handleDeleteConfirmation} variant="destructive">
//                         Yes, Delete
//                       </Button>
//                       <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
//                         Cancel
//                       </Button>
//                     </DialogFooter>
//                   </DialogContent>
//                 </Dialog>


//                 <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
//                   <DialogTrigger asChild>
//                     <Button className="gap-2">
//                       <Upload className="h-4 w-4" />
//                       Upload CSV
//                     </Button>
//                   </DialogTrigger>

//                   {/* <DialogContent className="max-w-md"> */}
//                   <DialogContent className="w-[95%] sm:max-w-md">

//                     <DialogHeader>
//                       <DialogTitle>Upload Files</DialogTitle>
//                       <p className="text-sm text-muted-foreground">Upload your user-downloadable files.</p>
//                     </DialogHeader>

//                     {/* File Drop Area */}
//                     <div className="border border-dashed border-gray-300 p-6 rounded-lg text-center space-y-2">
//                       <div className="text-gray-500">Drop your files here or browse</div>
//                       <Button variant="outline" onClick={openFileDialog}><Upload className="h-4 w-4" /> Browse from your device</Button>
//                       <p className="text-xs text-gray-400">Max file size up to 400 MB</p>
//                       <input
//                         ref={fileInputRef}
//                         type="file"
//                         accept=".csv,.xlsx"
//                         className="hidden"
//                         onChange={handleFileUpload}
//                       />
//                     </div>

//                     {/* File Preview Section */}
//                     {selectedFile && showConfirmDialog && (
//                       <div className="mt-4 space-y-2">
//                         <div className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
//                           <span>
//                             {selectedFile.name} – {formatFileSize(selectedFile.size)}
//                             {rowCount !== null && ` - ${rowCount} rows`}
//                           </span>
//                           <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); setRowCount(null); }}>🗑️</Button>
//                         </div>

//                         {/* ✅ Show progress only after confirm is clicked */}
//                         {isUploading && (
//                           <div className="relative w-full bg-gray-200 rounded h-2">
//                             <div className="bg-green-600 h-2 rounded absolute left-0" style={{ width: `${uploadProgress}%` }}></div>
//                           </div>
//                         )}
//                       </div>
//                     )}
//                     {/* Confirm/Cancel Buttons */}
//                     {selectedFile && showConfirmDialog && (
//                       <div className="flex justify-between mt-6">
//                         <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
//                         <Button className="bg-green-600 text-white" onClick={handleConfirmUpload}>Confirm</Button>
//                       </div>
//                     )}
//                   </DialogContent>
//                 </Dialog>

//                 {/* <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                       <Button variant="outline" size="icon">
//                         <MoreVertical className="h-4 w-4" />
//                       </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent align="end">
//                       <DropdownMenuItem
//                         className="cursor-pointer"
//                         onClick={() => {

//                           setGoogleSheetDialogOpen(true);
//                         }}
//                       >
//                         <PlusCircle className="mr-2 h-4 w-4" />
//                         <span>Add new Google Sheet to autofetch</span>
//                       </DropdownMenuItem>
//                     </DropdownMenuContent>
//                   </DropdownMenu> */}

//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <Button variant="outline" size="icon">
//                       <MoreVertical className="h-4 w-4" />
//                     </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent align="end">
//                     <DropdownMenuItem
//                       className="cursor-pointer"
//                       onClick={() => setGoogleSheetDialogOpen(true)}
//                     >
//                       <PlusCircle className="mr-2 h-4 w-4" />
//                       <span>Add new Google Sheet</span>
//                     </DropdownMenuItem>
//                     <DropdownMenuItem
//                       className="cursor-pointer"
//                       onClick={() => {
//                         fetchGoogleSheets();
//                         setShowSheetsDialog(true);
//                       }}
//                     >
//                       <List className="mr-2 h-4 w-4" />
//                       <span>View all Google Sheets</span>
//                     </DropdownMenuItem>

//                     <DropdownMenuItem
//                       onClick={async () => {
//                         // Reset filters
//                         setDistinctSalesStartDate("");
//                         setDistinctSalesEndDate("");
//                         setDistinctSalesSource("all");
//                         setDistinctSalesPerson("all");

//                         // ✅ Fetch salespersons before opening dialog
//                         await fetchDistinctSalesPersons();

//                         // ✅ Fetch sources
//                         const { data, error } = await supabase
//                           .from("leads")
//                           .select("source")
//                           .eq("current_stage", "sale done");

//                         if (!error) {
//                           const sources = [...new Set(data.map((d) => d.source).filter(Boolean))];
//                           setDistinctSources(sources);
//                         }

//                         // ✅ Fetch sales done leads
//                         await fetchDistinctSalesLeads();

//                         // ✅ Now open the dialog
//                         setDistinctSalesDialogOpen(true);
//                       }}
//                     >
//                       <List className="mr-2 h-4 w-4" />
//                       <span>See Distinct Sales History</span>
//                     </DropdownMenuItem>



//                   </DropdownMenuContent>
//                 </DropdownMenu>

//                 <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
//                   {/* <DialogContent className="max-w-md"> */}
//                   <DialogContent className="w-[95%] sm:max-w-md">

//                     <DialogHeader>
//                       <DialogTitle>Assignment Success</DialogTitle>
//                     </DialogHeader>

//                     <div>
//                       <DialogDescription>{assignSuccessMessage}</DialogDescription>
//                     </div>
//                   </DialogContent>
//                 </Dialog>

//                 <Dialog open={googleSheetDialogOpen} onOpenChange={setGoogleSheetDialogOpen}>
//                   {/* <DialogContent className="max-w-md"> */}
//                   <DialogContent className="max-w-4xl">

//                     <DialogHeader>
//                       <DialogTitle>Add New Google Sheet</DialogTitle>
//                       <DialogDescription>
//                         Connect a new Google Sheet to automatically import leads
//                       </DialogDescription>
//                     </DialogHeader>

//                     <div className="space-y-4">
//                       <div>
//                         <div className="text-gray-700 mb-5">
//                           <h5>Googlesheet must contain column headers like below 👇</h5>
//                           <h6>Column headers : Full name, Phone Number (Country Code), Email, city </h6>
//                         </div>
//                         <Label>Sheet Name</Label>
//                         <Input
//                           placeholder="e.g., Nikhil_reel_3_leads"
//                           value={newSheetName}
//                           onChange={(e) => setNewSheetName(e.target.value)}
//                         />
//                       </div>

//                       <div>
//                         <Label>Google Sheet URL</Label>
//                         <Input
//                           placeholder="https://docs.google.com/spreadsheets/d/..."
//                           value={newSheetUrl}
//                           onChange={(e) => setNewSheetUrl(e.target.value)}
//                         />
//                       </div>

//                       <div className="flex justify-end gap-2">
//                         <Button
//                           variant="outline"
//                           onClick={() => {
//                             setGoogleSheetDialogOpen(false);
//                             setNewSheetName('');
//                             setNewSheetUrl('');
//                           }}
//                           disabled={loading}
//                         >
//                           Cancel
//                         </Button>

//                         <Button
//                           onClick={handleAddNewSheet}
//                           disabled={!newSheetName || !newSheetUrl || loading}
//                         >
//                           {loading ? (
//                             <span className="flex items-center gap-2">
//                               <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
//                                 <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
//                               </svg>
//                               Adding...
//                             </span>
//                           ) : (
//                             "Add Sheet"
//                           )}
//                         </Button>
//                       </div>

//                     </div>
//                   </DialogContent>
//                 </Dialog>

//                 <Dialog open={showSheetsDialog} onOpenChange={setShowSheetsDialog}>
//                   <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
//                     <DialogHeader>
//                       <DialogTitle>Google Sheets Configuration</DialogTitle>
//                       <DialogDescription>
//                         All connected Google Sheets for lead imports
//                       </DialogDescription>
//                     </DialogHeader>

//                     {copySuccess && (
//                       <div className="p-3 mb-4 bg-green-100 text-green-800 rounded-md text-center">
//                         URL copied to clipboard!
//                       </div>
//                     )}

//                     <div className="max-h-[500px] overflow-y-auto">
//                       <Table>
//                         <TableHeader>
//                           <TableRow>
//                             <TableHead className="w-[100px]">ID</TableHead>
//                             <TableHead>Sheet Name</TableHead>
//                             <TableHead>URL</TableHead>
//                             <TableHead className="text-right">Actions</TableHead>
//                           </TableRow>
//                         </TableHeader>
//                         <TableBody>
//                           {googleSheets.map((sheet) => (
//                             <TableRow key={sheet.id}>
//                               <TableCell className="font-medium">{sheet.id}</TableCell>
//                               <TableCell>{sheet.name}</TableCell>
//                               <TableCell>
//                                 <a
//                                   href={sheet.url}
//                                   target="_blank"
//                                   rel="noopener noreferrer"
//                                   className="text-blue-600 hover:underline"
//                                 >
//                                   {sheet.url.length > 40
//                                     ? `${sheet.url.substring(0, 40)}...`
//                                     : sheet.url}
//                                 </a>
//                               </TableCell>
//                               <TableCell className="text-right">
//                                 <Button
//                                   variant="ghost"
//                                   size="sm"
//                                   onClick={() => {
//                                     navigator.clipboard.writeText(sheet.url);
//                                     setCopySuccess(true);
//                                   }}
//                                 >
//                                   Copy URL
//                                 </Button>
//                               </TableCell>
//                             </TableRow>
//                           ))}
//                           {googleSheets.length === 0 && (
//                             <TableRow>
//                               <TableCell colSpan={4} className="text-center py-8 text-gray-500">
//                                 No Google Sheets configured yet
//                               </TableCell>
//                             </TableRow>
//                           )}
//                         </TableBody>
//                       </Table>
//                     </div>

//                     <DialogFooter>
//                       <Button onClick={() => {
//                         setShowSheetsDialog(false);
//                         setCopySuccess(false);
//                       }}>
//                         Close
//                       </Button>
//                     </DialogFooter>
//                   </DialogContent>
//                 </Dialog>

//                 <Dialog open={distinctSalesDialogOpen} onOpenChange={setDistinctSalesDialogOpen}>
//                   <DialogContent className="max-w-6xl">
//                     <DialogHeader>
//                       <DialogTitle>Total Sales History</DialogTitle>
//                       <DialogDescription>
//                         Leads with current stage marked as <strong>"sales done"</strong>
//                       </DialogDescription>
//                     </DialogHeader>

//                     {/* Filters */}
//                     <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
//                       <div className="flex flex-wrap gap-2 items-center">
//                         <div>
//                           <Label className="text-sm text-gray-600">Start Date</Label>
//                           <Input
//                             type="date"
//                             value={distinctSalesStartDate}
//                             onChange={(e) => {
//                               handleDistinctFilterChange({
//                                 startDate: e.target.value,
//                                 endDate: distinctSalesEndDate,
//                                 source: distinctSalesSource,
//                               });
//                             }}
//                           />
//                         </div>
//                         <div>
//                           <Label className="text-sm text-gray-600">End Date</Label>
//                           <Input
//                             type="date"
//                             value={distinctSalesEndDate}
//                             onChange={(e) => {
//                               handleDistinctFilterChange({
//                                 startDate: distinctSalesStartDate,
//                                 endDate: e.target.value,
//                                 source: distinctSalesSource,
//                               });
//                             }}
//                           />
//                         </div>
//                         <div>
//                           <Label className="text-sm text-gray-600">Salesperson</Label>
//                           <Select
//                             value={distinctSalesPerson}
//                             onValueChange={(value) => {
//                               handleDistinctFilterChange({
//                                 startDate: distinctSalesStartDate,
//                                 endDate: distinctSalesEndDate,
//                                 source: distinctSalesSource,
//                                 assignedTo: value,
//                               });
//                             }}
//                           >
//                             <SelectTrigger className="w-[180px]">
//                               <SelectValue placeholder="Select Salesperson" />
//                             </SelectTrigger>
//                             <SelectContent>
//                               <SelectItem value="all">All</SelectItem>
//                               {distinctSalesPersons.map((person) => (
//                                 <SelectItem key={person} value={person}>
//                                   {person}
//                                 </SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                         </div>

//                         <div>
//                           <Label className="text-sm text-gray-600">Source</Label>
//                           <Select
//                             value={distinctSalesSource}
//                             onValueChange={(value) => {
//                               handleDistinctFilterChange({
//                                 startDate: distinctSalesStartDate,
//                                 endDate: distinctSalesEndDate,
//                                 source: value,
//                               });
//                             }}
//                           >
//                             <SelectTrigger className="w-[180px]">
//                               <SelectValue placeholder="Select Source" />
//                             </SelectTrigger>
//                             <SelectContent>
//                               <SelectItem value="all">All Sources</SelectItem>
//                               {distinctSources.map((source) => (
//                                 <SelectItem key={source} value={source}>
//                                   {source}
//                                 </SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                         </div>
//                       </div>
//                       <div className="text-green-600 text-sm flex items-center gap-4">
//                         <span>
//                           Showing {distinctSalesLeads.length}{" "}
//                           {distinctSalesLeads.length === 1 ? "record" : "records"}
//                         </span>
//                         <Button
//                           variant="ghost"
//                           className="text-red-500 text-xs"
//                           onClick={() =>
//                             handleDistinctFilterChange({
//                               startDate: "",
//                               endDate: "",
//                               source: "all",
//                               assignedTo: "all", // 👈 include this

//                             })
//                           }
//                         >
//                           🔄 Reset Filters
//                         </Button>
//                       </div>

//                     </div>


//                     {/* Table */}
//                     {distinctSalesLeads.length > 0 ? (
//                       <div className="overflow-auto max-h-[400px] border rounded-lg">
//                         <Table>
//                           <TableHeader>
//                             <TableRow>
//                               <TableHead>S.No</TableHead>
//                               <TableHead>Business ID</TableHead>
//                               <TableHead>Name</TableHead>
//                               <TableHead>Phone</TableHead>
//                               <TableHead>Email</TableHead>
//                               <TableHead>City</TableHead>
//                               <TableHead>Assigned To</TableHead>

//                               <TableHead>Source</TableHead>
//                               <TableHead>Created At</TableHead>
//                             </TableRow>
//                           </TableHeader>
//                           <TableBody>
//                             {distinctSalesLeads.map((lead, index) => (
//                               <TableRow key={lead.id}>
//                                 <TableCell>{index + 1}</TableCell>
//                                 <TableCell>{lead.business_id}</TableCell>
//                                 <TableCell>{lead.name}</TableCell>
//                                 <TableCell>{lead.phone}</TableCell>
//                                 <TableCell>{lead.email}</TableCell>
//                                 <TableCell>{lead.city}</TableCell>
//                                 <TableCell>{lead.assigned_to || "Unassigned"}</TableCell>

//                                 <TableCell>{lead.source}</TableCell>
//                                 <TableCell>
//                                   {new Date(lead.created_at).toLocaleDateString("en-IN", {
//                                     day: "2-digit",
//                                     month: "2-digit",
//                                     year: "numeric",
//                                   })}
//                                 </TableCell>
//                               </TableRow>
//                             ))}
//                           </TableBody>
//                         </Table>
//                       </div>
//                     ) : (
//                       <div className="py-6 text-center text-gray-500">
//                         <p>No sales done records found.</p>
//                       </div>
//                     )}
//                   </DialogContent>
//                 </Dialog>

//                 <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
//                   <DialogContent className="max-w-sm">
//                     <DialogHeader>
//                       <DialogTitle className={resultMessage.isError ? "text-red-600" : "text-green-600"}>
//                         {resultMessage.title}
//                       </DialogTitle>
//                     </DialogHeader>
//                     <div className="py-2">
//                       <p>{resultMessage.description}</p>
//                     </div>
//                     {/* Progress bar for visual countdown */}
//                     <div className="h-1 w-full bg-gray-200">
//                       <div
//                         className={`h-full ${resultMessage.isError ? 'bg-red-500' : 'bg-green-500'} animate-[shrink_3s_linear_forwards]`}
//                       />
//                     </div>
//                   </DialogContent>
//                 </Dialog>

//               </div>
//             </div>


//             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//               {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> */}

//               <Card>
//                 <CardHeader className="pb-2">
//                   <CardTitle className="text-sm font-medium">Overall Stats (All Leads)</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-sm text-gray-600">
//                     Total Leads: <span className="font-bold">{allLeadsStats.total}</span><br />
//                     New Leads: <span className="font-bold">{allLeadsStats.new}</span><br />
//                     Assigned Leads: <span className="font-bold">{allLeadsStats.assigned}</span><br />
//                     Conversion Rate: <span className="font-bold">
//                       {allLeadsStats.total === 0 ? "0.0" : ((allLeadsStats.assigned / allLeadsStats.total) * 100).toFixed(1)}%
//                     </span>
//                   </div>
//                 </CardContent>
//               </Card>
//               <Card>
//                 <CardHeader className="pb-2">
//                   <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">{leads.length}</div>
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader className="pb-2">
//                   <CardTitle className="text-sm font-medium">Assigned Leads</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">{leads.filter((l) => l.status === "Assigned").length}</div>
//                 </CardContent>
//               </Card>
//               <Card>
//                 <CardHeader className="pb-2">
//                   <CardTitle className="text-sm font-medium">Not Assigned (New Leads)</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">{leads.filter((l) => l.status === "New").length}</div>
//                 </CardContent>
//               </Card>


//             </div>

//             <Card>
//               <CardHeader>
//                 <div className="flex justify-between items-center">
//                   <div>
//                     <CardTitle>Leads Management</CardTitle>
//                     {/* <CardDescription>View and manage all marketing leads</CardDescription> */}
//                   </div>
//                   {selectedLeads.length > 0 && (
//                     <Button onClick={() => setBulkAssignDialogOpen(true)} className="gap-2">
//                       <UserPlus className="h-4 w-4" />
//                       Bulk Assign ({selectedLeads.length})
//                     </Button>
//                   )}
//                 </div>
//               </CardHeader>
//               <CardContent>

//                 {/* <div className="flex flex-col sm:flex-row gap-4 mb-6"> */}

//                 {/* <div  className="w-full sm:w-auto">

//                     <div className="relative flex-1">
//                       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
//                       <Input
//                         placeholder="Search by name, phone, email, or city..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="pl-10"
//                       />
//                     </div>
//                     <Select value={statusFilter} onValueChange={setStatusFilter}>
//                       <SelectTrigger className="w-full sm:w-40">
//                         <SelectValue placeholder="Status" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Status</SelectItem>
//                         <SelectItem value="New">New</SelectItem>
//                         <SelectItem value="Assigned">Assigned</SelectItem>
//                       </SelectContent>
//                     </Select>
//                     <Select value={sourceFilter} onValueChange={setSourceFilter}>
//                       <SelectTrigger className="w-full sm:w-40">
//                         <SelectValue placeholder="Source" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Sources</SelectItem>
//                         {uniqueSources.map((source) => (
//                           <SelectItem key={source} value={source}>
//                             {source}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>

//                     </Select>
//                   </div> */}

//                 <div className="flex flex-col sm:flex-row gap-4 mb-6">
//                   <div className="relative flex-1">
//                     <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
//                     <Input
//                       placeholder="Search by name, phone, email, or city..."
//                       value={searchTerm}
//                       onChange={(e) => setSearchTerm(e.target.value)}
//                       className="pl-10 w-full"
//                     />
//                   </div>

//                   <Select value={statusFilter} onValueChange={setStatusFilter}>
//                     <SelectTrigger className="min-w-[150px] w-full sm:w-auto">
//                       <SelectValue placeholder="Status" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Status</SelectItem>
//                       <SelectItem value="New">New</SelectItem>
//                       <SelectItem value="Assigned">Assigned</SelectItem>
//                     </SelectContent>
//                   </Select>

//                   {/* <Select value={sourceFilter} onValueChange={setSourceFilter}>
//                       <SelectTrigger className="min-w-[150px] w-full sm:w-auto">
//                         <SelectValue placeholder="Source" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Sources</SelectItem>
//                         {uniqueSources.map((source) => (
//                           <SelectItem key={source} value={source}>
//                             {source}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select> */}

//                   <Select
//                     value={sourceFilter}
//                     onValueChange={(value) =>
//                       handleMainFilterChange({ source: value })
//                     }
//                   >
//                     <SelectTrigger className="min-w-[150px] w-full sm:w-auto">
//                       <SelectValue placeholder="Source" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Sources</SelectItem>
//                       {uniqueSources.map((source) => (
//                         <SelectItem key={source} value={source}>
//                           {source}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>


//                   <div className="flex flex-col sm:flex-row gap-2">

//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button variant="outline" className="min-w-[200px]">
//                           {startDate && endDate
//                             ? `📅 ${startDate} → ${endDate}`
//                             : "📅 Date Range"}
//                         </Button>
//                       </DropdownMenuTrigger>

//                       <DropdownMenuContent className="p-4 space-y-4 w-[250px] sm:w-[300px]">
//                         <div className="space-y-2">
//                           <Label className="text-sm text-gray-600">Start Date</Label>
//                           {/* <Input
//         type="date"
//         value={startDate}
//         onChange={(e) => {
//           setStartDate(e.target.value);
//           setCurrentPage(1);
//         }}
//       /> */}
//                           <Input
//                             type="date"
//                             value={startDate}
//                             onChange={(e) =>
//                               handleMainFilterChange({ start: e.target.value })
//                             }
//                           />
//                         </div>

//                         <div className="space-y-2">
//                           <Label className="text-sm text-gray-600">End Date</Label>
//                           {/* <Input
//         type="date"
//         value={endDate}
//         onChange={(e) => {
//           setEndDate(e.target.value);
//           setCurrentPage(1);
//         }}
//       /> */}
//                           <Input
//                             type="date"
//                             value={endDate}
//                             onChange={(e) =>
//                               handleMainFilterChange({ end: e.target.value })
//                             }
//                           />
//                         </div>

//                         <Button
//                           variant="ghost"
//                           className="text-red-500 text-sm p-0"
//                           onClick={() => {
//                             setStartDate("");
//                             setEndDate("");
//                             setCurrentPage(1);
//                           }}
//                         >
//                           ❌ Clear Filter
//                         </Button>
//                       </DropdownMenuContent>
//                     </DropdownMenu>

//                   </div>


//                 </div>


//                 <div className="flex flex-wrap gap-2">
//                   <Button
//                     variant={leadTab === "New" ? "default" : "outline"}
//                     onClick={() => {
//                       setLeadTab("New");
//                       setCurrentPage(1);
//                     }}
//                   >
//                     New Leads
//                   </Button>
//                   <Button
//                     variant={leadTab === "Assigned" ? "default" : "outline"}
//                     onClick={() => {
//                       setLeadTab("Assigned");
//                       setCurrentPage(1);
//                     }}
//                   >
//                     Assigned Leads
//                   </Button>
//                   <Button
//                     variant={leadTab === "All" ? "default" : "outline"}
//                     onClick={async () => {
//                       setLeadTab("All");
//                       setCurrentPage(1);
//                       // setIsAllView(true);
//                       setIsAllView(false); // 👈 make sure this is false to enable pagination


//                       // Fetch all leads fresh from DB
//                       const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
//                       if (error) {
//                         console.error("❌ Failed to fetch all leads:", error);
//                       } else {
//                         setLeads(data); // ✅ overwrite full lead list
//                         fetchAllUniqueSources(); // ✅ Re-fetch sources now that you're pulling full dataset

//                       }
//                     }}
//                   >
//                     All Leads
//                   </Button>


//                   <div className="w-full sm:w-auto flex justify-end">
//                     {/* <Select onValueChange={(value) => setPageSize(Number(value))}> */}
//                     <Select
//                       onValueChange={async (value) => {
//                         if (value === "all") {
//                           setIsAllView(true);
//                           setCurrentPage(1);

//                           // Fetch all data if "All" is selected
//                           const { data, error } = await supabase
//                             .from("leads")
//                             .select("*")
//                             .order("created_at", { ascending: false });

//                           if (!error) {
//                             setLeads(data);
//                           }
//                         } else {
//                           const pageSizeValue = Number(value);
//                           setPageSize(pageSizeValue);
//                           setIsAllView(false);
//                           setCurrentPage(1);

//                           // ✅ REFETCH data with new pageSize
//                           fetchLeadsAndSales(1, leadTab, searchTerm, statusFilter, sourceFilter);
//                         }
//                       }}
//                     >


//                       <SelectTrigger className="w-[150px]">
//                         <SelectValue placeholder={`${pageSize} per page`} />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {[15, 25, 50, 100].map((num) => (
//                           <SelectItem key={num} value={num.toString()}>
//                             {num} per page
//                           </SelectItem>
//                         ))}
//                         <SelectItem value="all">All</SelectItem>

//                       </SelectContent>
//                     </Select>
//                   </div>


//                 </div>
//                 {/* <div className="rounded-md border max-h-[600px] overflow-y-auto">

//                     <Table className="table-fixed w-full break-words text-center"> */}

//                 <div className="w-full overflow-x-auto">

//                   <Table className="min-w-[1000px] w-full break-words text-center">

//                     <TableHeader >
//                       <TableRow className="center">
//                         <TableHead className="sticky top-0 bg-white z-10 w-16 max-w-[80px] whitespace-normal">Delete</TableHead>

//                         <TableHead className="sticky top-0 bg-white z-10 w-12 text-center">
//                           <Checkbox
//                             checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
//                             onCheckedChange={handleSelectAll}
//                           />
//                         </TableHead>

//                         <TableHead className="sticky top-0 bg-white z-10 w-16 max-w-[70px] whitespace-normal">s.no</TableHead>

//                         {/* <TableHead className="sticky top-0 bg-white z-10 text-center">ID</TableHead>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Name</TableHead>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Phone</TableHead>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Email</TableHead>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">City</TableHead>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Source</TableHead>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Status</TableHead>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Created At</TableHead>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Lead age</TableHead>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Actions</TableHead> */}

//                         <>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               {/* <div className="flex flex-col text-xs"> */}
//                               <div className="flex items-center gap-1">
//                                 ID
//                                 <span
//                                   onClick={() => handleSort("business_id", "asc")}
//                                   className={`leading-none hover:text-blue-600 cursor-pointer ${sortConfig?.key === "business_id" && sortConfig.direction === "asc"
//                                     ? "text-blue-700 font-bold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↑
//                                 </span>
//                                 <span
//                                   onClick={() => handleSort("business_id", "desc")}
//                                   className={`leading-none hover:text-blue-600 cursor-pointer ${sortConfig?.key === "business_id" && sortConfig.direction === "desc"
//                                     ? "text-blue-700 font-bold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↓
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               <div className="flex items-center gap-1">

//                                 Name
//                                 <span
//                                   onClick={() => handleSort("name", "asc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "name" && sortConfig.direction === "asc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↑
//                                 </span>
//                                 <span
//                                   onClick={() => handleSort("name", "desc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "name" && sortConfig.direction === "desc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↓
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Phone</TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Email</TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               <div className="flex items-center gap-1">

//                                 City
//                                 <span
//                                   onClick={() => handleSort("city", "asc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "city" && sortConfig.direction === "asc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↑
//                                 </span>
//                                 <span
//                                   onClick={() => handleSort("city", "desc")}
//                                   className={`hover:text-blue-600 cursor-pointer${sortConfig?.key === "city" && sortConfig.direction === "desc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↓
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Source</TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Status</TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               <div className="flex items-center gap-1">
//                                 Created At
//                                 <span>
//                                   <span
//                                     onClick={() => handleSort("created_at", "asc")}
//                                     className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "created_at" && sortConfig.direction === "asc"
//                                       ? "text-blue-700 font-semibold"
//                                       : "text-gray-500"
//                                       }`}
//                                   >
//                                     ↑
//                                   </span>
//                                   <span
//                                     onClick={() => handleSort("created_at", "desc")}
//                                     className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "created_at" && sortConfig.direction === "desc"
//                                       ? "text-blue-700 font-semibold"
//                                       : "text-gray-500"
//                                       }`}
//                                   >
//                                     ↓
//                                   </span>
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               <div className="flex items-center gap-1">
//                                 <span>Lead Age</span>
//                                 {/* <div className="flex flex-col text-xs leading-none"> */}
//                                 <span
//                                   onClick={() => handleSort("lead_age", "asc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "lead_age" && sortConfig.direction === "asc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↑
//                                 </span>
//                                 <span
//                                   onClick={() => handleSort("lead_age", "desc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "lead_age" && sortConfig.direction === "desc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↓
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Actions</TableHead>
//                         </>

//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {paginatedLeads.map((lead, index) => (
//                         // <TableRow key={lead.id}>
//                         <TableRow
//                           key={lead.id}
//                           className="hover:bg-gray-100" >

//                           {/* <TableCell className="text-center">
//         <Button
//           size="icon"
//           variant="outline"
//           onClick={() => handleDeleteClick(lead.id)} // Open the delete confirmation dialog
//         >
//           <Trash2 className="h-5 w-5 text-red-600" /> 
//         </Button>
//       </TableCell> */}

//                           <TableCell className="text-center">
//                             {(lead.status !== "Assigned") && (
//                               <Button
//                                 variant="outline"
//                                 color="danger"
//                                 onClick={() => {
//                                   setSelectedLeadId(lead.id); // Set the selected lead id
//                                   setDeleteDialogOpen(true); // Open the delete confirmation dialog
//                                 }}
//                               >
//                                 <Trash2 className="h-5 w-5 text-red-600" /> {/* Red color for delete */}
//                               </Button>
//                             )}
//                           </TableCell>
//                           <TableCell>
//                             <Checkbox
//                               checked={selectedLeads.includes(lead.id)}
//                               onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
//                               disabled={lead.status === "Assigned"}
//                             />
//                           </TableCell>
//                           <TableCell className="font-medium">{(currentPage - 1) * pageSize + index + 1}</TableCell>
//                           <TableCell className="font-medium">{lead.business_id}</TableCell>

//                           <TableCell
//                             className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
//                             onClick={() => window.open(`/leads/${lead.business_id}`, "_blank")}
//                           >
//                             {lead.name}
//                           </TableCell>
//                           {/* <TableCell className="font-medium max-w-[150px] break-words whitespace-normal">{lead.name}</TableCell> */}
//                           <TableCell className="max-w-[100px] break-words whitespace-normal">{lead.phone}</TableCell>
//                           <TableCell className="max-w-[120px] break-words whitespace-normal">{lead.email}</TableCell>
//                           <TableCell className="max-w-[100px] break-words whitespace-normal">{lead.city}</TableCell>
//                           <TableCell className="max-w-[70px] break-words whitespace-normal">
//                             <Badge className={getSourceBadgeColor(lead.source)}>{lead.source}</Badge>
//                           </TableCell>
//                           <TableCell className="max-w-[80px] break-words whitespace-normal">
//                             <Badge className={getStatusBadgeColor(lead.status)}>{lead.status}</Badge>
//                           </TableCell>
//                           {/* <TableCell className="max-w-[100px] break-words whitespace-normal">{new Date(lead.created_at).toLocaleString('en-IN', {
//                               timeZone: 'Asia/Kolkata',
//                               year: 'numeric',
//                               month: '2-digit',
//                               day: '2-digit',
//                               hour: '2-digit',
//                               minute: '2-digit',
//                               hour12: true
//                             })
//                             }</TableCell> */}
//                           <TableCell className="max-w-[100px] break-words whitespace-normal">
//                             {new Date(new Date(lead.created_at).getTime() + (5 * 60 + 30) * 60 * 1000).toLocaleString('en-IN', {
//                               timeZone: 'Asia/Kolkata',
//                               year: 'numeric',
//                               month: '2-digit',
//                               day: '2-digit',
//                               hour: '2-digit',
//                               minute: '2-digit',
//                               hour12: true,
//                             })}
//                           </TableCell>
//                           <TableCell className="max-w-[100px] break-words whitespace-normal">
//                             {(() => {
//                               const createdAt = new Date(lead.created_at);
//                               const today = new Date();
//                               const diffTime = today.getTime() - createdAt.getTime();
//                               const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
//                               return `${diffDays} days`;
//                             })()}
//                           </TableCell>



//                           <TableCell className="max-w-[100px] break-words whitespace-normal">
//                             {lead.status === "New" ? (
//                               <Select onValueChange={(value) => handleIndividualAssign(lead.id, value)}>
//                                 <SelectTrigger className="w-32">
//                                   <SelectValue placeholder="Assign" />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                   {salesTeamMembers
//                                     .filter((member) => member.full_name && member.full_name.trim() !== "")
//                                     .map((member) => (
//                                       <SelectItem key={member.id} value={member.full_name}>
//                                         {member.full_name}
//                                       </SelectItem>
//                                     ))}
//                                 </SelectContent>
//                               </Select>
//                             ) : (
//                               <span className="text-sm text-gray-500">{lead.assigned_to}</span>
//                             )}
//                           </TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                   {/* // ✅ STEP 4: Add Pagination UI after your Table */}
//                   <div className="flex justify-between items-center mt-4">
//                     <Button
//                       variant="outline"
//                       onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
//                       disabled={currentPage === 1}
//                     >
//                       ⬅ Previous
//                     </Button>
//                     <span className="text-gray-600">
//                       {/* Page {currentPage} of {paginationPages} */}
//                       {isAllView ? (
//                         <span className="text-gray-600">Showing all {filteredLeads.length} leads</span>
//                       ) : (
//                         <span className="text-gray-600">
//                           Page {currentPage} of {totalPages}
//                         </span>
//                       )}

//                     </span>
//                     <Button
//                       variant="outline"
//                       onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
//                       disabled={currentPage === totalPages}
//                     >
//                       Next ➡
//                     </Button>
//                   </div>

//                 </div>
//               </CardContent>
//             </Card>

//             <Dialog open={salesHistoryDialogOpen} onOpenChange={setSalesHistoryDialogOpen}>
//               <DialogContent className="max-w-7xl">

//                 <DialogHeader>
//                   <DialogTitle>Sales Done History</DialogTitle>
//                   <DialogDescription>List of all successfully closed deals</DialogDescription>
//                   <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
//                     {/* Left side - Record count */}
//                     <div className="text-sm text-green-600">
//                       Showing {filteredSales.length} {filteredSales.length === 1 ? "record" : "records"}
//                     </div>

//                     <div className="flex flex-wrap justify-end gap-2">
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="outline" className="min-w-[200px]">
//                             ⏳ {cycleFilter !== "all" ? `${cycleFilter} days` : "Cycle Filter"}
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent className="p-2 space-y-1 w-[200px]">
//                           {["all", 15, 30, 60, 90].map((cycle) => (
//                             <DropdownMenuItem
//                               key={cycle}
//                               onClick={() => {
//                                 setCycleFilter(cycle.toString());
//                                 setCurrentPage(1);
//                               }}
//                               className={cycleFilter === cycle.toString() ? "bg-gray-100 font-medium" : ""}
//                             >
//                               {cycle === "all" ? "All Cycles" : `${cycle} Days`}
//                             </DropdownMenuItem>
//                           ))}
//                         </DropdownMenuContent>
//                       </DropdownMenu>

//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="outline" className="min-w-[200px]">
//                             {startDate && endDate
//                               ? `📅 ${startDate} → ${endDate}`
//                               : "📅 Date Range"}
//                           </Button>
//                         </DropdownMenuTrigger>

//                         <DropdownMenuContent className="p-4 space-y-4 w-[250px] sm:w-[300px]">
//                           <div className="space-y-2">
//                             <Label className="text-sm text-gray-600">Start Date</Label>
//                             <Input
//                               type="date"
//                               value={startDate}
//                               onChange={(e) => {
//                                 setStartDate(e.target.value);
//                                 setCurrentPage(1);
//                               }}
//                             />
//                           </div>

//                           <div className="space-y-2">
//                             <Label className="text-sm text-gray-600">End Date</Label>
//                             <Input
//                               type="date"
//                               value={endDate}
//                               onChange={(e) => {
//                                 setEndDate(e.target.value);
//                                 setCurrentPage(1);
//                               }}
//                             />
//                           </div>

//                           <Button
//                             variant="ghost"
//                             className="text-red-500 text-sm p-0"
//                             onClick={() => {
//                               setStartDate("");
//                               setEndDate("");
//                               setCurrentPage(1);
//                             }}
//                           >
//                             ❌ Clear Filter
//                           </Button>
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </div>
//                   </div>
//                 </DialogHeader>

//                 {salesHistory.length > 0 ? (
//                   <>


//                     <div className="overflow-auto max-h-[400px] border rounded-lg">
//                       <Table>
//                         <TableHeader>
//                           <TableRow>
//                             <TableHead>S.No</TableHead>
//                             <TableHead>Lead ID</TableHead>
//                             <TableHead>Name</TableHead>
//                             <TableHead>Phone</TableHead>
//                             <TableHead>Email</TableHead>
//                             <TableHead>Sale $</TableHead>
//                             <TableHead>Cycle (days)</TableHead>
//                             <TableHead>Payment</TableHead>
//                             <TableHead>Status</TableHead>
//                             <TableHead>Closed At</TableHead>
//                           </TableRow>
//                         </TableHeader>
//                         <TableBody>
//                           {filteredSales.map((item, index) => (
//                             <TableRow key={item.id}>
//                               <TableCell>{index + 1}</TableCell>
//                               <TableCell>{item.lead_id}</TableCell>
//                               <TableCell>{item.lead_name}</TableCell>
//                               <TableCell>{item.lead_phone}</TableCell>
//                               <TableCell>{item.email}</TableCell>
//                               <TableCell>${item.sale_value}</TableCell>
//                               <TableCell>{item.subscription_cycle}</TableCell>
//                               <TableCell>{item.payment_mode}</TableCell>
//                               <TableCell>{item.finance_status}</TableCell>
//                               <TableCell>{new Date(item.closed_at).toLocaleDateString()}</TableCell>
//                             </TableRow>
//                           ))}
//                         </TableBody>
//                       </Table>
//                     </div>
//                   </>
//                 ) : (
//                   <div className="py-6 text-center text-gray-500">
//                     <p>No sales records yet.</p>
//                   </div>
//                 )}

//                 <div className="flex justify-end mt-4">
//                   <Button onClick={() => downloadSalesCSV(filteredSales)}>
//                     <Download className="h-4 w-4 mr-2" /> Download CSV
//                   </Button>
//                 </div>

//               </DialogContent>
//             </Dialog>



//             <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
//               {/* <DialogContent> */}
//               {/* <DialogContent className="max-w-md"> */}
//               <DialogContent className="w-[95%] sm:max-w-md">


//                 <DialogHeader>
//                   <DialogTitle>Bulk Assign Leads</DialogTitle>
//                   <DialogDescription>Assign {selectedLeads.length} selected leads to a sales team member</DialogDescription>
//                 </DialogHeader>

//                 <div className="space-y-4">
//                   <div>
//                     <Label>Select Sales Team Member</Label>
//                     <Select
//                       onValueChange={(value) => setSelectedSalesMember(value)}
//                     >
//                       <SelectTrigger>
//                         <SelectValue placeholder="Choose team member" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {salesTeamMembers
//                           .filter((member) => member.full_name && member.full_name.trim() !== "")
//                           .map((member) => (
//                             <SelectItem key={member.id} value={member.full_name}>
//                               {member.full_name}
//                             </SelectItem>
//                           ))}
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <div className="flex justify-end">
//                     <Button
//                       className="mt-4 bg-green-600 text-white"
//                       disabled={!selectedSalesMember || selectedLeads.length === 0}
//                       onClick={() => {
//                         if (selectedSalesMember) {
//                           handleBulkAssign(selectedSalesMember);
//                         }
//                       }}
//                     >
//                       Assign Leads
//                     </Button>
//                   </div>
//                 </div>

//               </DialogContent>
//             </Dialog>
//           </div>
//           {/* </main> */}
//         </DashboardLayout>
//         {/* </div> */}
//       </ProtectedRoute>
//     </>
//   );
// }





// //app/marketing/page.tsx
// "use client";
// import { useEffect, useRef, useState, useContext } from "react";
// import { DashboardLayout } from "@/components/layout/dashboard-layout";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Trash2 } from 'lucide-react'; // Import trash icon from lucide-react



// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { MoreVertical, PlusCircle } from "lucide-react";

// import { Upload, Search, UserPlus, Download, List } from "lucide-react";
// import { Label } from "@/components/ui/label";
// import { Checkbox } from "@/components/ui/checkbox";
// import Papa from "papaparse";
// import ProtectedRoute from "@/components/auth/ProtectedRoute";
// import { supabase } from "@/utils/supabase/client";
// import { LoadingContext } from "@/components/providers/LoadingContext";
// import FullScreenLoader from "@/components/ui/FullScreenLoader";

// interface Lead {
//   id: string;
//   business_id: string;
//   name: string;
//   phone: string;
//   email: string;
//   source: "Instagram" | "WhatsApp" | "Google Forms";
//   city: string;
//   status: "New" | "Assigned";
//   created_at: string;
//   assigned_to?: string;
//   assigned_at?: string;
// }


// export default function MarketingPage() {
//   const { loading, setLoading } = useContext(LoadingContext);
//   const [leads, setLeads] = useState<Lead[]>([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState<string>("all");
//   const [sourceFilter, setSourceFilter] = useState<string>("all");
//   const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
//   const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
//   const [salesTeamMembers, setSalesTeamMembers] = useState<
//     { id: string; full_name: string }[]
//   >([]);
//   const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
//   const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
//   const [selectedSalesMember, setSelectedSalesMember] = useState<string | null>(null);
//   const [uniqueSources, setUniqueSources] = useState<string[]>([]);
//   const [rowCount, setRowCount] = useState<number | null>(null);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [showConfirmDialog, setShowConfirmDialog] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
//   const [successDialogOpen, setSuccessDialogOpen] = useState(false);
//   const [assignSuccessMessage, setAssignSuccessMessage] = useState("");
//   // const [leadTab, setLeadTab] = useState<"New" | "Assigned">("New");

//   // Add state for deletion
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pageSize, setPageSize] = useState(15);
//   const [cycleFilter, setCycleFilter] = useState("all");
//   const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);


//   const [allLeadsStats, setAllLeadsStats] = useState({ total: 0, assigned: 0, new: 0 });
//   // const [showReassignDialog, setShowReassignDialog] = useState(false);
//   // const [pendingAssignee, setPendingAssignee] = useState<string | null>(null);
//   const [distinctSalesDialogOpen, setDistinctSalesDialogOpen] = useState(false);
//   const [distinctSalesLeads, setDistinctSalesLeads] = useState<Lead[]>([]);
//   const [distinctSalesStartDate, setDistinctSalesStartDate] = useState("");
//   const [distinctSalesEndDate, setDistinctSalesEndDate] = useState("");
//   const [distinctSalesSource, setDistinctSalesSource] = useState("all");
//   const [distinctSources, setDistinctSources] = useState<string[]>([]);
//   const [distinctSalesPerson, setDistinctSalesPerson] = useState("all");
//   const [distinctSalesPersons, setDistinctSalesPersons] = useState<string[]>([]);



//   const [startDate, setStartDate] = useState<string>("");
//   const [endDate, setEndDate] = useState<string>("");

//   const [salesHistoryDialogOpen, setSalesHistoryDialogOpen] = useState(false);
//   interface SalesHistoryItem {
//     id: string;
//     lead_id: string;
//     email: string;
//     sale_value: number;
//     subscription_cycle: number;
//     payment_mode: string;
//     finance_status: string;
//     closed_at: string;
//     leads?: {
//       name?: string;
//       phone?: string;
//     };
//     lead_name?: string;
//     lead_phone?: string;
//   }

//   const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
//   const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

//   const [allLeads, setAllLeads] = useState([]);

//   const [googleSheets, setGoogleSheets] = useState<{ id: number, name: string, url: string }[]>([]);
//   const [showSheetsDialog, setShowSheetsDialog] = useState(false);
//   const [copySuccess, setCopySuccess] = useState(false);
//   const [googleSheetDialogOpen, setGoogleSheetDialogOpen] = useState(false);
//   const [newSheetName, setNewSheetName] = useState("");
//   const [newSheetUrl, setNewSheetUrl] = useState("");
//   const [leadTab, setLeadTab] = useState<"New" | "Assigned" | "All">("New");
//   const [isAllView, setIsAllView] = useState(false);
//   const [salesDoneLeads, setSalesDoneLeads] = useState([]);
//   const [showSalesDoneDialog, setShowSalesDoneDialog] = useState(false);


//   const [resultDialogOpen, setResultDialogOpen] = useState(false);
//   const [resultMessage, setResultMessage] = useState({
//     title: '',
//     description: '',
//     isError: false
//   });



//   // Add this effect to auto-close the dialog
//   useEffect(() => {
//     let timer: NodeJS.Timeout;
//     if (resultDialogOpen) {
//       timer = setTimeout(() => {
//         setResultDialogOpen(false);
//       }, 2500); // 2.5 seconds
//     }
//     return () => clearTimeout(timer);
//   }, [resultDialogOpen]);

//   useEffect(() => {
//     fetchGoogleSheets();
//     // fetchAllUniqueSources();
//     // ... your other useEffect code
//   }, []);

//   useEffect(() => {
//     let timer: NodeJS.Timeout;
//     if (copySuccess) {
//       timer = setTimeout(() => {
//         setCopySuccess(false);
//       }, 3000); // 3 seconds
//     }
//     return () => clearTimeout(timer);
//   }, [copySuccess]);


//   const filteredLeads = leads.filter((lead) => {
//     const matchesSearch =
//       lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       lead.phone.includes(searchTerm) ||
//       lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       lead.city.toLowerCase().includes(searchTerm.toLowerCase());

//     const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
//     // const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;

//     const matchesSource =
//       sourceFilter === "all" ||
//       (lead.source?.toLowerCase().trim() === sourceFilter.toLowerCase().trim());


//     const matchesTab =
//       leadTab === "All" ||
//       (leadTab === "New" && lead.status === "New") ||
//       (leadTab === "Assigned" && lead.status === "Assigned");

//     return matchesSearch && matchesStatus && matchesSource && matchesTab;
//   });

//   // const paginationPages = Math.ceil(filteredLeads.length / pageSize);
//   const paginationPages = totalPages;



//   const sortLeads = (leads: Lead[]) => {
//     if (!sortConfig) return leads;

//     const sorted = [...leads].sort((a, b) => {
//       const aVal = a[sortConfig.key as keyof Lead];
//       const bVal = b[sortConfig.key as keyof Lead];

//       if (sortConfig.key === "created_at" || sortConfig.key === "assigned_at") {
//         return sortConfig.direction === "asc"
//           ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
//           : new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
//       }

//       if (sortConfig.key === "lead_age") {
//         const aAge = new Date().getTime() - new Date(a.created_at).getTime();
//         const bAge = new Date().getTime() - new Date(b.created_at).getTime();
//         return sortConfig.direction === "asc" ? aAge - bAge : bAge - aAge;
//       }

//       if (sortConfig.key === "business_id") {
//         const getNumericPart = (val: string) => {
//           const match = val?.match(/\d+$/); // extract number after "AWL-"
//           return match ? parseInt(match[0]) : 0;
//         };

//         const aNum = getNumericPart(a.business_id);
//         const bNum = getNumericPart(b.business_id);

//         return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
//       }


//       // if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
//       // if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
//       return 0;
//     });

//     return sorted;
//   };

//   const sortedLeads = sortLeads(filteredLeads);
//   const paginatedLeads = isAllView ? sortedLeads : sortedLeads;


//   const filteredSales = salesHistory.filter((item) => {
//     const closedDate = new Date(item.closed_at).toISOString().split("T")[0];

//     const startMatch = !startDate || closedDate >= startDate;
//     const endMatch = !endDate || closedDate <= endDate;
//     const cycleMatch = cycleFilter === "all" || item.subscription_cycle === Number(cycleFilter);

//     return startMatch && endMatch && cycleMatch;
//   });



//   const handleSelectAll = (checked: boolean) => {
//     if (checked) {
//       const selectableLeadIds = filteredLeads
//         .filter((lead) => lead.status !== "Assigned")
//         .map((lead) => lead.id);
//       setSelectedLeads(selectableLeadIds);
//     } else {
//       setSelectedLeads([]);
//     }
//   };

//   const handleSelectLead = (leadId: string, checked: boolean) => {
//     if (checked) {
//       setSelectedLeads((prev) => [...prev, leadId]);
//     } else {
//       setSelectedLeads((prev) => prev.filter((id) => id !== leadId));
//     }
//   };

//   const handleBulkAssign = async (assignedTo: string) => {
//     setLoading(true);
//     try {
//       const res = await fetch("/api/assign-leads", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           selectedLeads,
//           assignedTo,
//           assignedAt: new Date().toISOString(),
//           allLeads: leads,
//         }),
//       });
//       const result = await res.json();
//       if (!res.ok) throw new Error(result.error || "Assignment failed");

//       setAssignSuccessMessage(`Assigned ${selectedLeads.length} lead(s) to ${assignedTo}.`);
//       setSuccessDialogOpen(true); //  Open dialog
//       setTimeout(() => setSuccessDialogOpen(false), 3000);

//       setSelectedLeads([]);
//       setBulkAssignDialogOpen(false);

//       const { data, error } = await supabase.from("leads").select("*");
//       if (error) throw error;
//       setLeads(data ?? []);
//       fetchLeadCounts();

//     } catch (error) {
//       console.error("Bulk assign error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };
//   // Convert local date to UTC range
//   const getUTCRange = (dateStr: string, isStart: boolean) => {
//     const date = new Date(dateStr);
//     if (isStart) {
//       date.setHours(0, 0, 0, 0);
//     } else {
//       date.setHours(23, 59, 59, 999);
//     }
//     return date.toISOString(); // Converts to UTC properly
//   };

//   const fetchDistinctSalesLeads = async () => {
//     let query = supabase
//       .from("leads")
//       .select("*")
//       .eq("current_stage", "sale done"); // Be careful: check if it's "sale done" (not "sales done")

//     if (distinctSalesStartDate && distinctSalesEndDate) {
//       query = query
//         .gte("created_at", getUTCRange(distinctSalesStartDate, true))
//         .lte("created_at", getUTCRange(distinctSalesEndDate, false));
//     }

//     if (distinctSalesSource !== "all") {
//       query = query.eq("source", distinctSalesSource);
//     }

//     const { data, error } = await query.order("created_at", { ascending: false });

//     if (!error) {
//       setDistinctSalesLeads(data || []);
//     } else {
//       console.error("Error fetching distinct sales leads:", error);
//     }
//   };

//   const handleFilterChange = async ({
//     startDate = distinctSalesStartDate,
//     endDate = distinctSalesEndDate,
//     source = distinctSalesSource,
//   }: {
//     startDate?: string;
//     endDate?: string;
//     source?: string;
//   }) => {
//     setDistinctSalesStartDate(startDate);
//     setDistinctSalesEndDate(endDate);
//     setDistinctSalesSource(source);

//     // then fetch after setting all 3
//     let query = supabase
//       .from("leads")
//       .select("*")
//       .eq("current_stage", "sale done");

//     if (startDate && endDate) {
//       const getUTCRange = (dateStr: string, isStart: boolean) => {
//         const date = new Date(dateStr);
//         if (isStart) date.setHours(0, 0, 0, 0);
//         else date.setHours(23, 59, 59, 999);
//         return date.toISOString();
//       };

//       query = query
//         .gte("created_at", getUTCRange(startDate, true))
//         .lte("created_at", getUTCRange(endDate, false));
//     }

//     if (source !== "all") {
//       query = query.eq("source", source);
//     }

//     const { data, error } = await query;
//     if (!error) setDistinctSalesLeads(data || []);
//   };

//   // Handle Delete Click - Open the confirmation dialog
//   const handleDeleteClick = (leadId: string) => {
//     setSelectedLeadId(leadId);
//     setDeleteDialogOpen(true);
//   };


//   const handleDeleteConfirmation = async () => {
//     if (selectedLeadId) {
//       try {
//         // Check if the lead_id exists in the sales_closure table


//         // Now, delete the lead from the leads table
//         const { error: deleteLeadError } = await supabase
//           .from('leads')
//           .delete()
//           .eq('id', selectedLeadId); // Delete the lead record

//         if (deleteLeadError) {
//           console.error('Error deleting lead:', deleteLeadError);
//           alert('Failed to delete lead.');
//           return;
//         }

//         // Successfully deleted the lead and sales closure records (if any)
//         setDeleteDialogOpen(false);
//         setSelectedLeadId(null);
//         alert('Lead deleted successfully!');

//         // Refetch leads after deletion
//         const { data, error: fetchError } = await supabase.from('leads').select('*');
//         if (fetchError) throw fetchError;
//         setLeads(data ?? []); // Update leads state with the new data

//       } catch (err) {
//         console.error('Delete operation failed:', err);
//         alert('Error deleting lead and sales closures.');
//       }
//     }
//   };


//   const fetchAllUniqueSources = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("leads")
//         .select("source")
//         .neq("source", "") // optional: ignore empty sources

//       if (error) throw error;

//       const sources = [...new Set(data.map(item => item.source))];
//       setUniqueSources(sources);
//     } catch (err) {
//       console.error("Error fetching unique sources:", err);
//     }
//   };

//   const handleIndividualAssign = async (leadId: string, assignedTo: string) => {
//     setLoading(true, "Assigning... please wait");
//     try {
//       const res = await fetch("/api/assign-leads", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           selectedLeads: [leadId],
//           assignedAt: new Date().toISOString(),
//           assignedTo,
//         }),
//       });

//       if (!res.ok) throw new Error("Assignment failed");

//       setLeads((prev) =>
//         prev.map((lead) =>
//           lead.id === leadId
//             ? {
//               ...lead,
//               status: "Assigned",
//               assigned_to: assignedTo,
//               assigned_at: new Date().toISOString(),
//             }
//             : lead
//         )
//       );
//       fetchLeadCounts();

//     } catch (error) {
//       console.error("Individual assign error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchLeadCounts = async () => {
//     try {
//       const { data: totalLeads, error: totalErr } = await supabase
//         .from("leads")
//         .select("id, status");
//       if (totalErr) throw totalErr;

//       const total = totalLeads.length;
//       const assigned = totalLeads.filter((l) => l.status === "Assigned").length;
//       const newLeads = totalLeads.filter((l) => l.status === "New").length;

//       setAllLeadsStats({ total, assigned, new: newLeads });
//     } catch (err) {
//       console.error("Failed to fetch lead counts:", err);
//     }
//   };

//   useEffect(() => {
//     fetchLeadCounts();
//   }, []);


//   const handleMainFilterChange = ({
//     start,
//     end,
//     source,
//     status = statusFilter,
//     tab = leadTab,
//     search = searchTerm,
//   }: {
//     start?: string;
//     end?: string;
//     source?: string;
//     status?: string;
//     tab?: "New" | "Assigned" | "All";
//     search?: string;
//   }) => {
//     const finalStart = start ?? startDate;
//     const finalEnd = end ?? endDate;
//     const finalSource = source ?? sourceFilter;

//     // Update state
//     setStartDate(finalStart);
//     setEndDate(finalEnd);
//     setSourceFilter(finalSource);

//     // Fetch filtered data
//     fetchLeadsAndSales(
//       1,
//       tab,
//       search,
//       status,
//       finalSource,
//       finalStart,
//       finalEnd
//     );
//     setCurrentPage(1);
//   };


//   const fetchLeadsAndSales = async (
//     page = 1,
//     tab = leadTab,
//     search = searchTerm,
//     status = statusFilter,
//     source = sourceFilter,
//     start = startDate,
//     end = endDate
//   ) => {
//     setLoading(true);
//     try {
//       const from = (page - 1) * pageSize;
//       const to = from + pageSize - 1;

//       let query = supabase
//         .from("leads")
//         .select("*", { count: "exact" })
//         .range(from, to)
//         .order("created_at", { ascending: false });

//       if (start && end) {
//         const getUTCRange = (dateStr: string, isStart: boolean) => {
//           const date = new Date(dateStr);
//           if (isStart) date.setHours(0, 0, 0, 0);
//           else date.setHours(23, 59, 59, 999);
//           return date.toISOString();
//         };

//         query = query
//           .gte("created_at", getUTCRange(start, true))
//           .lte("created_at", getUTCRange(end, false));
//       }

//       if (tab && tab !== "All") query = query.eq("status", tab);
//       if (search) {
//         query = query.or(
//           `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
//         );
//       }
//       if (source !== "all") query = query.eq("source", source);
//       if (status !== "all") query = query.eq("status", status);

//       const { data: leadsData, error, count } = await query;
//       if (error) throw error;

//       setLeads(leadsData ?? []);
//       setTotalPages(Math.ceil((count || 0) / pageSize));


//       // Fetch Sales Team
//       const res = await fetch("/api/sales-users", { method: "GET" });
//       if (!res.ok) throw new Error(`Sales API failed: ${await res.text()}`);
//       const users = await res.json();
//       setSalesTeamMembers(users);

//       //     }
//     } catch (err) {
//       console.error("Error fetching leads:", err);
//     } finally {
//       setLoading(false);
//     }
//   };



//   useEffect(() => {
//     fetchLeadsAndSales(currentPage, leadTab, searchTerm, statusFilter, sourceFilter);
//   }, [currentPage, leadTab, pageSize, searchTerm, statusFilter, sourceFilter, startDate, endDate]);

//   // Update uniqueSources whenever leads change to reflect only sources in the current page
//   useEffect(() => {
//     const sources = [
//       ...new Set(
//         leads
//           .map((l) => l.source?.trim())
//           .filter((s) => s && s.length > 0)
//       ),
//     ];
//     setUniqueSources(sources);
//   }, [leads]);




//   const formatDateTime = (dateString: string) => {
//     const date = new Date(dateString);
//     const pad = (n: number) => n.toString().padStart(2, "0");
//     const day = pad(date.getDate());
//     const month = pad(date.getMonth() + 1);
//     const year = date.getFullYear();
//     let hours = date.getHours();
//     const minutes = pad(date.getMinutes());
//     const seconds = pad(date.getSeconds());
//     const ampm = hours >= 12 ? "PM" : "AM";
//     hours = hours % 12 || 12;
//     return `${day}-${month}-${year} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
//   };

//   const downloadCSV = (data: Lead[]) => {
//     const csvContent = [
//       [
//         "Name",
//         "Phone",
//         "Email",
//         "City",
//         "Source",
//         "Assigned To",
//         "Created At",
//         "Assigned At",
//       ],
//       ...data.map((lead) => [
//         lead.name,
//         lead.phone,
//         lead.email,
//         lead.city,
//         lead.source,
//         lead.assigned_to || "",
//         formatDateTime(lead.created_at),
//         lead.assigned_at ? formatDateTime(lead.assigned_at) : "",
//       ]),
//     ]
//       .map((row) => row.map((cell) => `"${cell}"`).join(","))
//       .join("\n");

//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", "assigned_leads.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };



//   const downloadSalesCSV = (data: any[]) => {
//     const cleanedData = data.map(item => ({
//       LeadID: item.lead_id,
//       Name: item.lead_name,
//       Phone: item.lead_phone?.normalize("NFKD") || "N/A",
//       Email: item.email,
//       SaleValue: item.sale_value,
//       Cycle: item.subscription_cycle,
//       PaymentMode: item.payment_mode,
//       Status: item.finance_status,
//       ClosedAt: new Date(item.closed_at).toLocaleDateString(),
//     }));

//     const csv = Papa.unparse(cleanedData);

//     // Add UTF-8 BOM prefix
//     const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });

//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.setAttribute("download", "sales_history.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };


//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const openFileDialog = () => fileInputRef.current?.click();

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) return;
//     setSelectedFile(file);
//     setShowConfirmDialog(true);
//     setUploadProgress(0);

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: true,
//       complete: (results) => {
//         setRowCount(results.data.length);
//       },
//     });
//   };

//   const formatFileSize = (size: number) =>
//     size >= 1024 * 1024
//       ? `${(size / (1024 * 1024)).toFixed(1)} MB`
//       : `${(size / 1024).toFixed(1)} KB`;

//   const handleConfirmUpload = () => {
//     if (!selectedFile) return;
//     setIsUploading(true);
//     setLoading(true);

//     Papa.parse(selectedFile, {
//       header: true,
//       skipEmptyLines: true,
//       complete: async (results) => {
//         setRowCount(results.data.length);
//         const parsedData = results.data.map((row: any) => {
//           let formattedDate = "";
//           try {
//             const [day, month, yearAndTime] = row.Timestamp?.split("-") || [];
//             const [year, time] = yearAndTime?.split(" ") || [];
//             formattedDate = new Date(
//               `${year}-${month}-${day}T${time || "00:00"}:00`
//             ).toISOString();
//           } catch {
//             formattedDate = new Date().toISOString();
//           }

//           return {
//             name: row["Full name"] || "",
//             phone: row["Phone Number (Country Code)"] || "",
//             email: row["Email"] || "",
//             city: row["city"] || "",
//             source: row["source"] || "Unknown",
//             status: "New",
//             created_at: formattedDate,
//             assigned_to: "",
//           };
//         });

//         const { error } = await supabase.from("leads").insert(parsedData);

//         if (error) {
//           console.error("❌ Supabase Insert Error:", error); // 👈 ADD THIS
//           alert("Failed to insert CSV data into Supabase. Check console.");
//         } else {
//           const { data: updated, error: fetchError } = await supabase
//             .from("leads")
//             .select("*");
//           if (!fetchError) setLeads(updated || []);
//         }


//         setTimeout(async () => {
//           setUploadProgress(100);
//           setSelectedFile(null);
//           setShowConfirmDialog(false);
//           setUploadDialogOpen(false);
//           setUploadProgress(0);
//           setIsUploading(false);
//           setLoading(false);

//           await fetchLeadCounts();

//           // Fetch only 15 new leads after upload
//           await fetchLeadsAndSales(1, "New", "", "all", "all");
//           setCurrentPage(1); // Reset pagination

//         }, 1000);
//         fetchLeadCounts();
//       },
//     });
//   };


//   const getSourceBadgeColor = (source: string) => {
//     switch (source) {
//       case "Instagram":
//         return "bg-pink-100 text-pink-800 rounded-md";
//       case "WhatsApp":
//         return "bg-green-100 text-green-800 rounded-md";
//       case "Google":
//         return "bg-gray-900 text-gray-100 rounded-md";
//       case "Facebook":
//         return "bg-blue-200 text-blue-900 rounded-md";
//       default:
//         return "bg-gray-100 text-gray-800 rounded-md";
//     }
//   };

//   const getStatusBadgeColor = (status: string) => {
//     switch (status) {
//       case "New":
//         return "bg-red-100 text-red-800";
//       case "Assigned":
//         return "bg-green-100 text-green-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   };



//   const handleDistinctFilterChange = async ({
//     startDate,
//     endDate,
//     source,
//     assignedTo = distinctSalesPerson,
//   }: {
//     startDate: string;
//     endDate: string;
//     source: string;
//     assignedTo?: string;
//   }) => {
//     setDistinctSalesStartDate(startDate);
//     setDistinctSalesEndDate(endDate);
//     setDistinctSalesSource(source);
//     setDistinctSalesPerson(assignedTo || "all");

//     const getUTCRange = (dateStr: string, isStart: boolean) => {
//       const date = new Date(dateStr);
//       if (isStart) date.setHours(0, 0, 0, 0);
//       else date.setHours(23, 59, 59, 999);
//       return date.toISOString();
//     };

//     let query = supabase
//       .from("leads")
//       .select("*")
//       .eq("current_stage", "sale done");

//     if (startDate && endDate) {
//       query = query
//         .gte("created_at", getUTCRange(startDate, true))
//         .lte("created_at", getUTCRange(endDate, false));
//     }

//     if (source !== "all") {
//       query = query.eq("source", source);
//     }

//     if (assignedTo && assignedTo !== "all") {
//       query = query.eq("assigned_to", assignedTo);
//     }

//     const { data, error } = await query;
//     if (!error) {
//       setDistinctSalesLeads(data || []);

//       const sourceList = [...new Set((data || []).map((d) => d.source?.trim()).filter(Boolean))];
//       setDistinctSources(sourceList);
//     } else {
//       console.error("Error fetching filtered leads:", error);
//     }
//   };

//   const fetchDistinctSalesPersons = async () => {
//     const { data, error } = await supabase
//       .from("leads")
//       .select("assigned_to") // 👈 just fetch the column
//       .neq("assigned_to", null); // 👈 filter out nulls

//     if (!error && data) {
//       const names = [...new Set(data.map((item) => item.assigned_to?.trim()).filter(Boolean))];
//       setDistinctSalesPersons(names);
//     } else {
//       console.error("Error fetching distinct salespersons:", error);
//     }
//   };


//   const handleAddNewSheet = async () => {
//     try {
//       setLoading(true);

//       if (!newSheetUrl.match(/https:\/\/docs\.google\.com\/spreadsheets\/.+/)) {
//         throw new Error('Must be a valid Google Sheets URL (https://docs.google.com/spreadsheets/...)');
//       }

//       const { data, error } = await supabase
//         .from('google_sheets_config')
//         .insert([{
//           name: newSheetName.trim(),
//           url: newSheetUrl.trim()
//         }])
//         .select()
//         .single(); // Ensures we get a single record

//       if (error) {
//         console.error('Supabase insert error:', error);
//         throw new Error(error.message || 'Failed to save sheet configuration');
//       }

//       // Show success (will auto-close in 3s via useEffect)
//       setResultMessage({
//         title: 'Success ✅',
//         description: `"${newSheetName}" added successfully!`,
//         isError: false
//       });
//       setResultDialogOpen(true);

//       setGoogleSheetDialogOpen(false);
//       setNewSheetName('');
//       setNewSheetUrl('');
//       fetch('/api/fetch-google-sheet', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${process.env.CRON_SECRET || "local_dev_secret"}`
//         },
//       }).catch(console.error); // Silently handle fetch errors

//     } catch (error) {
//       // Show error (will auto-close in 3s via useEffect)
//       setResultMessage({
//         title: 'Error ❌',
//         description: error instanceof Error ?
//           error.message.replace('Invalid Google Sheets URL - ', '') :
//           'Operation failed',
//         isError: true
//       });
//       setResultDialogOpen(true);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchGoogleSheets = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('google_sheets_config')
//         .select('id, name, url')
//         .order('created_at', { ascending: false });

//       if (error) throw error;
//       setGoogleSheets(data || []);
//     } catch (err) {
//       console.error('Error fetching Google Sheets:', err);
//     }
//   };

//   const handleSort = (key: string, direction: "asc" | "desc") => {
//     setSortConfig({ key, direction });
//   };


//   return (
//     <>
//       {loading && <FullScreenLoader />}
//       <ProtectedRoute allowedRoles={["Marketing", "Super Admin"]}>
//         {/* <div className="w-full overflow-x-hidden"> */}
//         {/* <div className="w-full px-4 md:px-6 lg:px-8 overflow-x-hidden"> */}

//         <DashboardLayout>
//           {/* <div className="space-y-6"> */}
//           {/* <main className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6"> */}
//           <div className="space-y-6">


//             <div className="flex justify-between items-center">
//               <div>
//                 <h1 className="text-3xl font-bold text-gray-900">Marketing CRM</h1>
//                 <p className="text-gray-600 mt-2">Manage leads and marketing campaigns</p>
//               </div>
//               <div className="flex gap-3">

//                 <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>

//                   <DialogTrigger asChild>

//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button variant="outline">📜 History &#11206;</Button>
//                       </DropdownMenuTrigger>

//                       <DropdownMenuContent>
//                         <DropdownMenuItem
//                           onClick={() => {
//                             const filtered = leads.filter((lead) => lead.status === "Assigned");
//                             setAssignedLeads(filtered);
//                             setHistoryDialogOpen(true);
//                           }}
//                         >
//                           Assigned Leads History
//                         </DropdownMenuItem>

//                         <DropdownMenuItem
//                           onClick={async () => {
//                             const { data: sales, error: salesErr } = await supabase
//                               .from("sales_closure")
//                               .select("*")
//                               .order("closed_at", { ascending: false });

//                             const { data: leads, error: leadsErr } = await supabase
//                               .from("leads")
//                               .select("business_id, name, phone");

//                             const salesWithLeads = (sales ?? []).map((s) => {
//                               const match = (leads ?? []).find((l) => l.business_id === s.lead_id);
//                               return {
//                                 ...s,
//                                 lead_name: match?.name ?? "N/A",
//                                 lead_phone: match?.phone ?? "N/A",
//                               };
//                             });

//                             setSalesHistory(salesWithLeads);
//                             setSalesHistoryDialogOpen(true);

//                           }}
//                         >
//                           Sales Done History
//                         </DropdownMenuItem>
//                       </DropdownMenuContent>
//                     </DropdownMenu>

//                   </DialogTrigger>

//                   {historyDialogOpen && (

//                     <DialogContent className="max-w-7xl">
//                       <DialogHeader>
//                         <DialogTitle>Assigned Leads History</DialogTitle>
//                         <DialogDescription>View all leads that are currently assigned.</DialogDescription>
//                       </DialogHeader>

//                       {/* Table to display assigned leads */}
//                       {assignedLeads && assignedLeads.length > 0 ? (
//                         <>
//                           <div className="overflow-auto max-h-[400px] border rounded-lg">
//                             <Table>
//                               <TableHeader>
//                                 <TableRow>
//                                   <TableHead>Name</TableHead>
//                                   <TableHead>Phone</TableHead>
//                                   <TableHead>Email</TableHead>
//                                   <TableHead>City</TableHead>
//                                   <TableHead>Source</TableHead>
//                                   <TableHead>Assigned To</TableHead>
//                                   <TableHead>Created At</TableHead>
//                                   <TableHead>Assigned At</TableHead>
//                                 </TableRow>
//                               </TableHeader>
//                               <TableBody>
//                                 {assignedLeads.map((lead) => (
//                                   <TableRow key={lead.id}>
//                                     <TableCell>{lead.name}</TableCell>
//                                     <TableCell>{lead.phone}</TableCell>
//                                     <TableCell>{lead.email}</TableCell>
//                                     <TableCell>{lead.city}</TableCell>
//                                     <TableCell className="text-right">{lead.source}</TableCell>
//                                     <TableCell>{lead.assigned_to}</TableCell>
//                                     <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
//                                     {/*<TableCell>{lead.assigned_at ? new Date(lead.assigned_at).toLocaleDateString() : ""}</TableCell> */}
//                                     <TableCell>{lead.assigned_at ? formatDateTime(lead.assigned_at) : ""}</TableCell>
//                                   </TableRow>
//                                 ))}
//                               </TableBody>
//                             </Table>
//                           </div >

//                           <div className="flex justify-end mt-4">

//                             <Button onClick={() => downloadCSV(assignedLeads)}>
//                               <Download className="h-4 w-4 mr-2" /> Download CSV
//                             </Button>
//                           </div>
//                         </>) : (<div className="py-8 text-center text-gray-500">
//                           <p>There are no assigned leads yet.</p>
//                         </div>)}
//                     </DialogContent>
//                   )}
//                 </Dialog>

//                 <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//                   <DialogContent>
//                     <DialogHeader>
//                       <DialogTitle>Confirm Deletion</DialogTitle>
//                     </DialogHeader>
//                     <DialogDescription>
//                       Are you sure you want to delete this lead?
//                     </DialogDescription>

//                     <DialogFooter>
//                       <Button onClick={handleDeleteConfirmation} variant="destructive">
//                         Yes, Delete
//                       </Button>
//                       <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
//                         Cancel
//                       </Button>
//                     </DialogFooter>
//                   </DialogContent>
//                 </Dialog>


//                 <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
//                   <DialogTrigger asChild>
//                     <Button className="gap-2">
//                       <Upload className="h-4 w-4" />
//                       Upload CSV
//                     </Button>
//                   </DialogTrigger>

//                   {/* <DialogContent className="max-w-md"> */}
//                   <DialogContent className="w-[95%] sm:max-w-md">

//                     <DialogHeader>
//                       <DialogTitle>Upload Files</DialogTitle>
//                       <p className="text-sm text-muted-foreground">Upload your user-downloadable files.</p>
//                     </DialogHeader>

//                     {/* File Drop Area */}
//                     <div className="border border-dashed border-gray-300 p-6 rounded-lg text-center space-y-2">
//                       <div className="text-gray-500">Drop your files here or browse</div>
//                       <Button variant="outline" onClick={openFileDialog}><Upload className="h-4 w-4" /> Browse from your device</Button>
//                       <p className="text-xs text-gray-400">Max file size up to 400 MB</p>
//                       <input
//                         ref={fileInputRef}
//                         type="file"
//                         accept=".csv,.xlsx"
//                         className="hidden"
//                         onChange={handleFileUpload}
//                       />
//                     </div>

//                     {/* File Preview Section */}
//                     {selectedFile && showConfirmDialog && (
//                       <div className="mt-4 space-y-2">
//                         <div className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
//                           <span>
//                             {selectedFile.name} – {formatFileSize(selectedFile.size)}
//                             {rowCount !== null && ` - ${rowCount} rows`}
//                           </span>
//                           <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); setRowCount(null); }}>🗑️</Button>
//                         </div>

//                         {/* ✅ Show progress only after confirm is clicked */}
//                         {isUploading && (
//                           <div className="relative w-full bg-gray-200 rounded h-2">
//                             <div className="bg-green-600 h-2 rounded absolute left-0" style={{ width: `${uploadProgress}%` }}></div>
//                           </div>
//                         )}
//                       </div>
//                     )}
//                     {/* Confirm/Cancel Buttons */}
//                     {selectedFile && showConfirmDialog && (
//                       <div className="flex justify-between mt-6">
//                         <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
//                         <Button className="bg-green-600 text-white" onClick={handleConfirmUpload}>Confirm</Button>
//                       </div>
//                     )}
//                   </DialogContent>
//                 </Dialog>


//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <Button variant="outline" size="icon">
//                       <MoreVertical className="h-4 w-4" />
//                     </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent align="end">
//                     <DropdownMenuItem
//                       className="cursor-pointer"
//                       onClick={() => setGoogleSheetDialogOpen(true)}
//                     >
//                       <PlusCircle className="mr-2 h-4 w-4" />
//                       <span>Add new Google Sheet</span>
//                     </DropdownMenuItem>
//                     <DropdownMenuItem
//                       className="cursor-pointer"
//                       onClick={() => {
//                         fetchGoogleSheets();
//                         setShowSheetsDialog(true);
//                       }}
//                     >
//                       <List className="mr-2 h-4 w-4" />
//                       <span>View all Google Sheets</span>
//                     </DropdownMenuItem>

//                     <DropdownMenuItem
//                       onClick={async () => {
//                         // Reset filters
//                         setDistinctSalesStartDate("");
//                         setDistinctSalesEndDate("");
//                         setDistinctSalesSource("all");
//                         setDistinctSalesPerson("all");

//                         // ✅ Fetch salespersons before opening dialog
//                         await fetchDistinctSalesPersons();

//                         // ✅ Fetch sources
//                         const { data, error } = await supabase
//                           .from("leads")
//                           .select("source")
//                           .eq("current_stage", "sale done");

//                         if (!error) {
//                           const sources = [...new Set(data.map((d) => d.source).filter(Boolean))];
//                           setDistinctSources(sources);
//                         }

//                         // ✅ Fetch sales done leads
//                         await fetchDistinctSalesLeads();

//                         // ✅ Now open the dialog
//                         setDistinctSalesDialogOpen(true);
//                       }}
//                     >
//                       <List className="mr-2 h-4 w-4" />
//                       <span>See Distinct Sales History</span>
//                     </DropdownMenuItem>



//                   </DropdownMenuContent>
//                 </DropdownMenu>

//                 <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
//                   {/* <DialogContent className="max-w-md"> */}
//                   <DialogContent className="w-[95%] sm:max-w-md">

//                     <DialogHeader>
//                       <DialogTitle>Assignment Success</DialogTitle>
//                     </DialogHeader>

//                     <div>
//                       <DialogDescription>{assignSuccessMessage}</DialogDescription>
//                     </div>
//                   </DialogContent>
//                 </Dialog>

//                 <Dialog open={googleSheetDialogOpen} onOpenChange={setGoogleSheetDialogOpen}>
//                   {/* <DialogContent className="max-w-md"> */}
//                   <DialogContent className="max-w-4xl">

//                     <DialogHeader>
//                       <DialogTitle>Add New Google Sheet</DialogTitle>
//                       <DialogDescription>
//                         Connect a new Google Sheet to automatically import leads
//                       </DialogDescription>
//                     </DialogHeader>

//                     <div className="space-y-4">
//                       <div>
//                         <div className="text-gray-700 mb-5">
//                           <h5>Googlesheet must contain column headers like below 👇</h5>
//                           <h6>Column headers : Full name, Phone Number (Country Code), Email, city </h6>
//                         </div>
//                         <Label>Sheet Name</Label>
//                         <Input
//                           placeholder="e.g., Nikhil_reel_3_leads"
//                           value={newSheetName}
//                           onChange={(e) => setNewSheetName(e.target.value)}
//                         />
//                       </div>

//                       <div>
//                         <Label>Google Sheet URL</Label>
//                         <Input
//                           placeholder="https://docs.google.com/spreadsheets/d/..."
//                           value={newSheetUrl}
//                           onChange={(e) => setNewSheetUrl(e.target.value)}
//                         />
//                       </div>

//                       <div className="flex justify-end gap-2">
//                         <Button
//                           variant="outline"
//                           onClick={() => {
//                             setGoogleSheetDialogOpen(false);
//                             setNewSheetName('');
//                             setNewSheetUrl('');
//                           }}
//                           disabled={loading}
//                         >
//                           Cancel
//                         </Button>

//                         <Button
//                           onClick={handleAddNewSheet}
//                           disabled={!newSheetName || !newSheetUrl || loading}
//                         >
//                           {loading ? (
//                             <span className="flex items-center gap-2">
//                               <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
//                                 <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
//                               </svg>
//                               Adding...
//                             </span>
//                           ) : (
//                             "Add Sheet"
//                           )}
//                         </Button>
//                       </div>

//                     </div>
//                   </DialogContent>
//                 </Dialog>

//                 <Dialog open={showSheetsDialog} onOpenChange={setShowSheetsDialog}>
//                   <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
//                     <DialogHeader>
//                       <DialogTitle>Google Sheets Configuration</DialogTitle>
//                       <DialogDescription>
//                         All connected Google Sheets for lead imports
//                       </DialogDescription>
//                     </DialogHeader>

//                     {copySuccess && (
//                       <div className="p-3 mb-4 bg-green-100 text-green-800 rounded-md text-center">
//                         URL copied to clipboard!
//                       </div>
//                     )}

//                     <div className="max-h-[500px] overflow-y-auto">
//                       <Table>
//                         <TableHeader>
//                           <TableRow>
//                             <TableHead className="w-[100px]">ID</TableHead>
//                             <TableHead>Sheet Name</TableHead>
//                             <TableHead>URL</TableHead>
//                             <TableHead className="text-right">Actions</TableHead>
//                           </TableRow>
//                         </TableHeader>
//                         <TableBody>
//                           {googleSheets.map((sheet) => (
//                             <TableRow key={sheet.id}>
//                               <TableCell className="font-medium">{sheet.id}</TableCell>
//                               <TableCell>{sheet.name}</TableCell>
//                               <TableCell>
//                                 <a
//                                   href={sheet.url}
//                                   target="_blank"
//                                   rel="noopener noreferrer"
//                                   className="text-blue-600 hover:underline"
//                                 >
//                                   {sheet.url.length > 40
//                                     ? `${sheet.url.substring(0, 40)}...`
//                                     : sheet.url}
//                                 </a>
//                               </TableCell>
//                               <TableCell className="text-right">
//                                 <Button
//                                   variant="ghost"
//                                   size="sm"
//                                   onClick={() => {
//                                     navigator.clipboard.writeText(sheet.url);
//                                     setCopySuccess(true);
//                                   }}
//                                 >
//                                   Copy URL
//                                 </Button>
//                               </TableCell>
//                             </TableRow>
//                           ))}
//                           {googleSheets.length === 0 && (
//                             <TableRow>
//                               <TableCell colSpan={4} className="text-center py-8 text-gray-500">
//                                 No Google Sheets configured yet
//                               </TableCell>
//                             </TableRow>
//                           )}
//                         </TableBody>
//                       </Table>
//                     </div>

//                     <DialogFooter>
//                       <Button onClick={() => {
//                         setShowSheetsDialog(false);
//                         setCopySuccess(false);
//                       }}>
//                         Close
//                       </Button>
//                     </DialogFooter>
//                   </DialogContent>
//                 </Dialog>

//                 <Dialog open={distinctSalesDialogOpen} onOpenChange={setDistinctSalesDialogOpen}>
//                   <DialogContent className="max-w-6xl">
//                     <DialogHeader>
//                       <DialogTitle>Total Sales History</DialogTitle>
//                       <DialogDescription>
//                         Leads with current stage marked as <strong>"sales done"</strong>
//                       </DialogDescription>
//                     </DialogHeader>

//                     {/* Filters */}
//                     <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
//                       <div className="flex flex-wrap gap-2 items-center">
//                         <div>
//                           <Label className="text-sm text-gray-600">Start Date</Label>
//                           <Input
//                             type="date"
//                             value={distinctSalesStartDate}
//                             onChange={(e) => {
//                               handleDistinctFilterChange({
//                                 startDate: e.target.value,
//                                 endDate: distinctSalesEndDate,
//                                 source: distinctSalesSource,
//                               });
//                             }}
//                           />
//                         </div>
//                         <div>
//                           <Label className="text-sm text-gray-600">End Date</Label>
//                           <Input
//                             type="date"
//                             value={distinctSalesEndDate}
//                             onChange={(e) => {
//                               handleDistinctFilterChange({
//                                 startDate: distinctSalesStartDate,
//                                 endDate: e.target.value,
//                                 source: distinctSalesSource,
//                               });
//                             }}
//                           />
//                         </div>
//                         <div>
//                           <Label className="text-sm text-gray-600">Salesperson</Label>
//                           <Select
//                             value={distinctSalesPerson}
//                             onValueChange={(value) => {
//                               handleDistinctFilterChange({
//                                 startDate: distinctSalesStartDate,
//                                 endDate: distinctSalesEndDate,
//                                 source: distinctSalesSource,
//                                 assignedTo: value,
//                               });
//                             }}
//                           >
//                             <SelectTrigger className="w-[180px]">
//                               <SelectValue placeholder="Select Salesperson" />
//                             </SelectTrigger>
//                             <SelectContent>
//                               <SelectItem value="all">All</SelectItem>
//                               {distinctSalesPersons.map((person) => (
//                                 <SelectItem key={person} value={person}>
//                                   {person}
//                                 </SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                         </div>

//                         <div>
//                           <Label className="text-sm text-gray-600">Source</Label>
//                           <Select
//                             value={distinctSalesSource}
//                             onValueChange={(value) => {
//                               handleDistinctFilterChange({
//                                 startDate: distinctSalesStartDate,
//                                 endDate: distinctSalesEndDate,
//                                 source: value,
//                               });
//                             }}
//                           >
//                             <SelectTrigger className="w-[180px]">
//                               <SelectValue placeholder="Select Source" />
//                             </SelectTrigger>
//                             <SelectContent>
//                               <SelectItem value="all">All Sources</SelectItem>
//                               {distinctSources.map((source) => (
//                                 <SelectItem key={source} value={source}>
//                                   {source}
//                                 </SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                         </div>
//                       </div>
//                       <div className="text-green-600 text-sm flex items-center gap-4">
//                         <span>
//                           Showing {distinctSalesLeads.length}{" "}
//                           {distinctSalesLeads.length === 1 ? "record" : "records"}
//                         </span>
//                         <Button
//                           variant="ghost"
//                           className="text-red-500 text-xs"
//                           onClick={() =>
//                             handleDistinctFilterChange({
//                               startDate: "",
//                               endDate: "",
//                               source: "all",
//                               assignedTo: "all", // 👈 include this

//                             })
//                           }
//                         >
//                           🔄 Reset Filters
//                         </Button>
//                       </div>

//                     </div>


//                     {/* Table */}
//                     {distinctSalesLeads.length > 0 ? (
//                       <div className="overflow-auto max-h-[400px] border rounded-lg">
//                         <Table>
//                           <TableHeader>
//                             <TableRow>
//                               <TableHead>S.No</TableHead>
//                               <TableHead>Business ID</TableHead>
//                               <TableHead>Name</TableHead>
//                               <TableHead>Phone</TableHead>
//                               <TableHead>Email</TableHead>
//                               <TableHead>City</TableHead>
//                               <TableHead>Assigned To</TableHead>

//                               <TableHead>Source</TableHead>
//                               <TableHead>Created At</TableHead>
//                             </TableRow>
//                           </TableHeader>
//                           <TableBody>
//                             {distinctSalesLeads.map((lead, index) => (
//                               <TableRow key={lead.id}>
//                                 <TableCell>{index + 1}</TableCell>
//                                 <TableCell>{lead.business_id}</TableCell>
//                                 <TableCell>{lead.name}</TableCell>
//                                 <TableCell>{lead.phone}</TableCell>
//                                 <TableCell>{lead.email}</TableCell>
//                                 <TableCell>{lead.city}</TableCell>
//                                 <TableCell>{lead.assigned_to || "Unassigned"}</TableCell>

//                                 <TableCell>{lead.source}</TableCell>
//                                 <TableCell>
//                                   {new Date(lead.created_at).toLocaleDateString("en-IN", {
//                                     day: "2-digit",
//                                     month: "2-digit",
//                                     year: "numeric",
//                                   })}
//                                 </TableCell>
//                               </TableRow>
//                             ))}
//                           </TableBody>
//                         </Table>
//                       </div>
//                     ) : (
//                       <div className="py-6 text-center text-gray-500">
//                         <p>No sales done records found.</p>
//                       </div>
//                     )}
//                   </DialogContent>
//                 </Dialog>

//                 <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
//                   <DialogContent className="max-w-sm">
//                     <DialogHeader>
//                       <DialogTitle className={resultMessage.isError ? "text-red-600" : "text-green-600"}>
//                         {resultMessage.title}
//                       </DialogTitle>
//                     </DialogHeader>
//                     <div className="py-2">
//                       <p>{resultMessage.description}</p>
//                     </div>
//                     {/* Progress bar for visual countdown */}
//                     <div className="h-1 w-full bg-gray-200">
//                       <div
//                         className={`h-full ${resultMessage.isError ? 'bg-red-500' : 'bg-green-500'} animate-[shrink_3s_linear_forwards]`}
//                       />
//                     </div>
//                   </DialogContent>
//                 </Dialog>

//               </div>
//             </div>


//             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//               {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> */}

//               <Card>
//                 <CardHeader className="pb-2">
//                   <CardTitle className="text-sm font-medium">Overall Stats (All Leads)</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-sm text-gray-600">
//                     Total Leads: <span className="font-bold">{allLeadsStats.total}</span><br />
//                     New Leads: <span className="font-bold">{allLeadsStats.new}</span><br />
//                     Assigned Leads: <span className="font-bold">{allLeadsStats.assigned}</span><br />
//                     Conversion Rate: <span className="font-bold">
//                       {allLeadsStats.total === 0 ? "0.0" : ((allLeadsStats.assigned / allLeadsStats.total) * 100).toFixed(1)}%
//                     </span>
//                   </div>
//                 </CardContent>
//               </Card>
//               <Card>
//                 <CardHeader className="pb-2">
//                   <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">{leads.length}</div>
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader className="pb-2">
//                   <CardTitle className="text-sm font-medium">Assigned Leads</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">{leads.filter((l) => l.status === "Assigned").length}</div>
//                 </CardContent>
//               </Card>
//               <Card>
//                 <CardHeader className="pb-2">
//                   <CardTitle className="text-sm font-medium">Not Assigned (New Leads)</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">{leads.filter((l) => l.status === "New").length}</div>
//                 </CardContent>
//               </Card>


//             </div>

//             <Card>
//               <CardHeader>
//                 <div className="flex justify-between items-center">
//                   <div>
//                     <CardTitle>Leads Management</CardTitle>
//                     {/* <CardDescription>View and manage all marketing leads</CardDescription> */}
//                   </div>
//                   {selectedLeads.length > 0 && (
//                     <Button onClick={() => setBulkAssignDialogOpen(true)} className="gap-2">
//                       <UserPlus className="h-4 w-4" />
//                       Bulk Assign ({selectedLeads.length})
//                     </Button>
//                   )}
//                 </div>
//               </CardHeader>
//               <CardContent>



//                 <div className="flex flex-col sm:flex-row gap-4 mb-6">
//                   <div className="relative flex-1">
//                     <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
//                     <Input
//                       placeholder="Search by name, phone, email, or city..."
//                       value={searchTerm}
//                       onChange={(e) => setSearchTerm(e.target.value)}
//                       className="pl-10 w-full"
//                     />
//                   </div>

//                   <Select value={statusFilter} onValueChange={setStatusFilter}>
//                     <SelectTrigger className="min-w-[150px] w-full sm:w-auto">
//                       <SelectValue placeholder="Status" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Status</SelectItem>
//                       <SelectItem value="New">New</SelectItem>
//                       <SelectItem value="Assigned">Assigned</SelectItem>
//                     </SelectContent>
//                   </Select>



//                   <Select
//                     value={sourceFilter}
//                     onValueChange={(value) =>
//                       handleMainFilterChange({ source: value })
//                     }
//                   >
//                     <SelectTrigger className="min-w-[150px] w-full sm:w-auto">
//                       <SelectValue placeholder="Source" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Sources</SelectItem>
//                       {uniqueSources.map((source) => (
//                         <SelectItem key={source} value={source}>
//                           {source}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>


//                   <div className="flex flex-col sm:flex-row gap-2">

//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button variant="outline" className="min-w-[200px]">
//                           {startDate && endDate
//                             ? `📅 ${startDate} → ${endDate}`
//                             : "📅 Date Range"}
//                         </Button>
//                       </DropdownMenuTrigger>

//                       <DropdownMenuContent className="p-4 space-y-4 w-[250px] sm:w-[300px]">
//                         <div className="space-y-2">
//                           <Label className="text-sm text-gray-600">Start Date</Label>
//                           {/* <Input
//         type="date"
//         value={startDate}
//         onChange={(e) => {
//           setStartDate(e.target.value);
//           setCurrentPage(1);
//         }}
//       /> */}
//                           <Input
//                             type="date"
//                             value={startDate}
//                             onChange={(e) =>
//                               handleMainFilterChange({ start: e.target.value })
//                             }
//                           />
//                         </div>

//                         <div className="space-y-2">
//                           <Label className="text-sm text-gray-600">End Date</Label>

//                           <Input
//                             type="date"
//                             value={endDate}
//                             onChange={(e) =>
//                               handleMainFilterChange({ end: e.target.value })
//                             }
//                           />
//                         </div>

//                         <Button
//                           variant="ghost"
//                           className="text-red-500 text-sm p-0"
//                           onClick={() => {
//                             setStartDate("");
//                             setEndDate("");
//                             setCurrentPage(1);
//                           }}
//                         >
//                           ❌ Clear Filter
//                         </Button>
//                       </DropdownMenuContent>
//                     </DropdownMenu>

//                   </div>


//                 </div>


//                 <div className="flex flex-wrap gap-2">
//                   <Button
//                     variant={leadTab === "New" ? "default" : "outline"}
//                     onClick={() => {
//                       setLeadTab("New");
//                       setCurrentPage(1);
//                     }}
//                   >
//                     New Leads
//                   </Button>
//                   <Button
//                     variant={leadTab === "Assigned" ? "default" : "outline"}
//                     onClick={() => {
//                       setLeadTab("Assigned");
//                       setCurrentPage(1);
//                     }}
//                   >
//                     Assigned Leads
//                   </Button>
//                   <Button
//                     variant={leadTab === "All" ? "default" : "outline"}
//                     onClick={async () => {
//                       setLeadTab("All");
//                       setCurrentPage(1);
//                       // setIsAllView(true);
//                       setIsAllView(false); // 👈 make sure this is false to enable pagination
//                     }}
//                   >
//                     All Leads
//                   </Button>


//                   <div className="w-full sm:w-auto flex justify-end">
//                     {/* <Select onValueChange={(value) => setPageSize(Number(value))}> */}
//                     <Select
//                       onValueChange={async (value) => {
//                         if (value === "all") {
//                           setIsAllView(true);
//                           setCurrentPage(1);

//                           // Fetch all data if "All" is selected
//                           const { data, error } = await supabase
//                             .from("leads")
//                             .select("*")
//                             .order("created_at", { ascending: false });

//                           if (!error) {
//                             setLeads(data);
//                           }
//                         } else {
//                           const pageSizeValue = Number(value);
//                           setPageSize(pageSizeValue);
//                           setIsAllView(false);
//                           setCurrentPage(1);

//                           // ✅ REFETCH data with new pageSize
//                           fetchLeadsAndSales(1, leadTab, searchTerm, statusFilter, sourceFilter);
//                         }
//                       }}
//                     >


//                       <SelectTrigger className="w-[150px]">
//                         <SelectValue placeholder={`${pageSize} per page`} />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {[15, 25, 50, 100].map((num) => (
//                           <SelectItem key={num} value={num.toString()}>
//                             {num} per page
//                           </SelectItem>
//                         ))}
//                         <SelectItem value="all">All</SelectItem>

//                       </SelectContent>
//                     </Select>
//                   </div>


//                 </div>
//                 {/* <div className="rounded-md border max-h-[600px] overflow-y-auto">

//                     <Table className="table-fixed w-full break-words text-center"> */}

//                 <div className="w-full overflow-x-auto">

//                   <Table className="min-w-[1000px] w-full break-words text-center">

//                     <TableHeader >
//                       <TableRow className="center">
//                         <TableHead className="sticky top-0 bg-white z-10 w-16 max-w-[80px] whitespace-normal">Delete</TableHead>

//                         <TableHead className="sticky top-0 bg-white z-10 w-12 text-center">
//                           <Checkbox
//                             checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
//                             onCheckedChange={handleSelectAll}
//                           />
//                         </TableHead>

//                         <TableHead className="sticky top-0 bg-white z-10 w-16 max-w-[70px] whitespace-normal">s.no</TableHead>


//                         <>
//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               {/* <div className="flex flex-col text-xs"> */}
//                               <div className="flex items-center gap-1">
//                                 ID
//                                 <span
//                                   onClick={() => handleSort("business_id", "asc")}
//                                   className={`leading-none hover:text-blue-600 cursor-pointer ${sortConfig?.key === "business_id" && sortConfig.direction === "asc"
//                                     ? "text-blue-700 font-bold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↑
//                                 </span>
//                                 <span
//                                   onClick={() => handleSort("business_id", "desc")}
//                                   className={`leading-none hover:text-blue-600 cursor-pointer ${sortConfig?.key === "business_id" && sortConfig.direction === "desc"
//                                     ? "text-blue-700 font-bold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↓
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               <div className="flex items-center gap-1">

//                                 Name
//                                 <span
//                                   onClick={() => handleSort("name", "asc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "name" && sortConfig.direction === "asc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↑
//                                 </span>
//                                 <span
//                                   onClick={() => handleSort("name", "desc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "name" && sortConfig.direction === "desc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↓
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Phone</TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Email</TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               <div className="flex items-center gap-1">

//                                 City
//                                 <span
//                                   onClick={() => handleSort("city", "asc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "city" && sortConfig.direction === "asc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↑
//                                 </span>
//                                 <span
//                                   onClick={() => handleSort("city", "desc")}
//                                   className={`hover:text-blue-600 cursor-pointer${sortConfig?.key === "city" && sortConfig.direction === "desc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↓
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Source</TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Status</TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               <div className="flex items-center gap-1">
//                                 Created At
//                                 <span>
//                                   <span
//                                     onClick={() => handleSort("created_at", "asc")}
//                                     className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "created_at" && sortConfig.direction === "asc"
//                                       ? "text-blue-700 font-semibold"
//                                       : "text-gray-500"
//                                       }`}
//                                   >
//                                     ↑
//                                   </span>
//                                   <span
//                                     onClick={() => handleSort("created_at", "desc")}
//                                     className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "created_at" && sortConfig.direction === "desc"
//                                       ? "text-blue-700 font-semibold"
//                                       : "text-gray-500"
//                                       }`}
//                                   >
//                                     ↓
//                                   </span>
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">
//                             <div className="flex flex-col items-center">
//                               <div className="flex items-center gap-1">
//                                 <span>Lead Age</span>
//                                 {/* <div className="flex flex-col text-xs leading-none"> */}
//                                 <span
//                                   onClick={() => handleSort("lead_age", "asc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "lead_age" && sortConfig.direction === "asc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↑
//                                 </span>
//                                 <span
//                                   onClick={() => handleSort("lead_age", "desc")}
//                                   className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "lead_age" && sortConfig.direction === "desc"
//                                     ? "text-blue-700 font-semibold"
//                                     : "text-gray-500"
//                                     }`}
//                                 >
//                                   ↓
//                                 </span>
//                               </div>
//                             </div>
//                           </TableHead>

//                           <TableHead className="sticky top-0 bg-white z-10 text-center">Actions</TableHead>
//                         </>

//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {paginatedLeads.map((lead, index) => (
//                         // <TableRow key={lead.id}>
//                         <TableRow
//                           key={lead.id}
//                           className="hover:bg-gray-100" >



//                           <TableCell className="text-center">
//                             {(lead.status !== "Assigned") && (
//                               <Button
//                                 variant="outline"
//                                 color="danger"
//                                 onClick={() => {
//                                   setSelectedLeadId(lead.id); // Set the selected lead id
//                                   setDeleteDialogOpen(true); // Open the delete confirmation dialog
//                                 }}
//                               >
//                                 <Trash2 className="h-5 w-5 text-red-600" /> {/* Red color for delete */}
//                               </Button>
//                             )}
//                           </TableCell>
//                           <TableCell>
//                             <Checkbox
//                               checked={selectedLeads.includes(lead.id)}
//                               onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
//                               disabled={lead.status === "Assigned"}
//                             />
//                           </TableCell>
//                           <TableCell className="font-medium">{(currentPage - 1) * pageSize + index + 1}</TableCell>
//                           <TableCell className="font-medium">{lead.business_id}</TableCell>

//                           <TableCell
//                             className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
//                             onClick={() => window.open(`/leads/${lead.business_id}`, "_blank")}
//                           >
//                             {lead.name}
//                           </TableCell>
//                           {/* <TableCell className="font-medium max-w-[150px] break-words whitespace-normal">{lead.name}</TableCell> */}
//                           <TableCell className="max-w-[100px] break-words whitespace-normal">{lead.phone}</TableCell>
//                           <TableCell className="max-w-[120px] break-words whitespace-normal">{lead.email}</TableCell>
//                           <TableCell className="max-w-[100px] break-words whitespace-normal">{lead.city}</TableCell>
//                           <TableCell className="max-w-[70px] break-words whitespace-normal">
//                             <Badge className={getSourceBadgeColor(lead.source)}>{lead.source}</Badge>
//                           </TableCell>
//                           <TableCell className="max-w-[80px] break-words whitespace-normal">
//                             <Badge className={getStatusBadgeColor(lead.status)}>{lead.status}</Badge>
//                           </TableCell>

//                           <TableCell className="max-w-[100px] break-words whitespace-normal">
//                             {new Date(new Date(lead.created_at).getTime() + (5 * 60 + 30) * 60 * 1000).toLocaleString('en-IN', {
//                               timeZone: 'Asia/Kolkata',
//                               year: 'numeric',
//                               month: '2-digit',
//                               day: '2-digit',
//                               hour: '2-digit',
//                               minute: '2-digit',
//                               hour12: true,
//                             })}
//                           </TableCell>
//                           <TableCell className="max-w-[100px] break-words whitespace-normal">
//                             {(() => {
//                               const createdAt = new Date(lead.created_at);
//                               const today = new Date();
//                               const diffTime = today.getTime() - createdAt.getTime();
//                               const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
//                               return `${diffDays} days`;
//                             })()}
//                           </TableCell>



//                           <TableCell className="max-w-[100px] break-words whitespace-normal">
//                             {lead.status === "New" ? (
//                               <Select onValueChange={(value) => handleIndividualAssign(lead.id, value)}>
//                                 <SelectTrigger className="w-32">
//                                   <SelectValue placeholder="Assign" />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                   {salesTeamMembers
//                                     .filter((member) => member.full_name && member.full_name.trim() !== "")
//                                     .map((member) => (
//                                       <SelectItem key={member.id} value={member.full_name}>
//                                         {member.full_name}
//                                       </SelectItem>
//                                     ))}
//                                 </SelectContent>
//                               </Select>
//                             ) : (
//                               <span className="text-sm text-gray-500">{lead.assigned_to}</span>
//                             )}
//                           </TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                   {/* // ✅ STEP 4: Add Pagination UI after your Table */}
//                   <div className="flex justify-between items-center mt-4">
//                     <Button
//                       variant="outline"
//                       onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
//                       disabled={currentPage === 1}
//                     >
//                       ⬅ Previous
//                     </Button>
//                     <span className="text-gray-600">
//                       {/* Page {currentPage} of {paginationPages} */}
//                       {isAllView ? (
//                         <span className="text-gray-600">Showing all {filteredLeads.length} leads</span>
//                       ) : (
//                         <span className="text-gray-600">
//                           Page {currentPage} of {totalPages}
//                         </span>
//                       )}

//                     </span>
//                     <Button
//                       variant="outline"
//                       onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
//                       disabled={currentPage === totalPages}
//                     >
//                       Next ➡
//                     </Button>
//                   </div>

//                 </div>
//               </CardContent>
//             </Card>

//             <Dialog open={salesHistoryDialogOpen} onOpenChange={setSalesHistoryDialogOpen}>
//               <DialogContent className="max-w-7xl">

//                 <DialogHeader>
//                   <DialogTitle>Sales Done History</DialogTitle>
//                   <DialogDescription>List of all successfully closed deals</DialogDescription>
//                   <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
//                     {/* Left side - Record count */}
//                     <div className="text-sm text-green-600">
//                       Showing {filteredSales.length} {filteredSales.length === 1 ? "record" : "records"}
//                     </div>

//                     <div className="flex flex-wrap justify-end gap-2">
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="outline" className="min-w-[200px]">
//                             ⏳ {cycleFilter !== "all" ? `${cycleFilter} days` : "Cycle Filter"}
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent className="p-2 space-y-1 w-[200px]">
//                           {["all", 15, 30, 60, 90].map((cycle) => (
//                             <DropdownMenuItem
//                               key={cycle}
//                               onClick={() => {
//                                 setCycleFilter(cycle.toString());
//                                 setCurrentPage(1);
//                               }}
//                               className={cycleFilter === cycle.toString() ? "bg-gray-100 font-medium" : ""}
//                             >
//                               {cycle === "all" ? "All Cycles" : `${cycle} Days`}
//                             </DropdownMenuItem>
//                           ))}
//                         </DropdownMenuContent>
//                       </DropdownMenu>

//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="outline" className="min-w-[200px]">
//                             {startDate && endDate
//                               ? `📅 ${startDate} → ${endDate}`
//                               : "📅 Date Range"}
//                           </Button>
//                         </DropdownMenuTrigger>

//                         <DropdownMenuContent className="p-4 space-y-4 w-[250px] sm:w-[300px]">
//                           <div className="space-y-2">
//                             <Label className="text-sm text-gray-600">Start Date</Label>
//                             <Input
//                               type="date"
//                               value={startDate}
//                               onChange={(e) => {
//                                 setStartDate(e.target.value);
//                                 setCurrentPage(1);
//                               }}
//                             />
//                           </div>

//                           <div className="space-y-2">
//                             <Label className="text-sm text-gray-600">End Date</Label>
//                             <Input
//                               type="date"
//                               value={endDate}
//                               onChange={(e) => {
//                                 setEndDate(e.target.value);
//                                 setCurrentPage(1);
//                               }}
//                             />
//                           </div>

//                           <Button
//                             variant="ghost"
//                             className="text-red-500 text-sm p-0"
//                             onClick={() => {
//                               setStartDate("");
//                               setEndDate("");
//                               setCurrentPage(1);
//                             }}
//                           >
//                             ❌ Clear Filter
//                           </Button>
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </div>
//                   </div>
//                 </DialogHeader>

//                 {salesHistory.length > 0 ? (
//                   <>


//                     <div className="overflow-auto max-h-[400px] border rounded-lg">
//                       <Table>
//                         <TableHeader>
//                           <TableRow>
//                             <TableHead>S.No</TableHead>
//                             <TableHead>Lead ID</TableHead>
//                             <TableHead>Name</TableHead>
//                             <TableHead>Phone</TableHead>
//                             <TableHead>Email</TableHead>
//                             <TableHead>Sale $</TableHead>
//                             <TableHead>Cycle (days)</TableHead>
//                             <TableHead>Payment</TableHead>
//                             <TableHead>Status</TableHead>
//                             <TableHead>Closed At</TableHead>
//                           </TableRow>
//                         </TableHeader>
//                         <TableBody>
//                           {filteredSales.map((item, index) => (
//                             <TableRow key={item.id}>
//                               <TableCell>{index + 1}</TableCell>
//                               <TableCell>{item.lead_id}</TableCell>
//                               <TableCell>{item.lead_name}</TableCell>
//                               <TableCell>{item.lead_phone}</TableCell>
//                               <TableCell>{item.email}</TableCell>
//                               <TableCell>${item.sale_value}</TableCell>
//                               <TableCell>{item.subscription_cycle}</TableCell>
//                               <TableCell>{item.payment_mode}</TableCell>
//                               <TableCell>{item.finance_status}</TableCell>
//                               <TableCell>{new Date(item.closed_at).toLocaleDateString()}</TableCell>
//                             </TableRow>
//                           ))}
//                         </TableBody>
//                       </Table>
//                     </div>
//                   </>
//                 ) : (
//                   <div className="py-6 text-center text-gray-500">
//                     <p>No sales records yet.</p>
//                   </div>
//                 )}

//                 <div className="flex justify-end mt-4">
//                   <Button onClick={() => downloadSalesCSV(filteredSales)}>
//                     <Download className="h-4 w-4 mr-2" /> Download CSV
//                   </Button>
//                 </div>

//               </DialogContent>
//             </Dialog>



//             <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
//               {/* <DialogContent> */}
//               {/* <DialogContent className="max-w-md"> */}
//               <DialogContent className="w-[95%] sm:max-w-md">


//                 <DialogHeader>
//                   <DialogTitle>Bulk Assign Leads</DialogTitle>
//                   <DialogDescription>Assign {selectedLeads.length} selected leads to a sales team member</DialogDescription>
//                 </DialogHeader>

//                 <div className="space-y-4">
//                   <div>
//                     <Label>Select Sales Team Member</Label>
//                     <Select
//                       onValueChange={(value) => setSelectedSalesMember(value)}
//                     >
//                       <SelectTrigger>
//                         <SelectValue placeholder="Choose team member" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {salesTeamMembers
//                           .filter((member) => member.full_name && member.full_name.trim() !== "")
//                           .map((member) => (
//                             <SelectItem key={member.id} value={member.full_name}>
//                               {member.full_name}
//                             </SelectItem>
//                           ))}
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <div className="flex justify-end">
//                     <Button
//                       className="mt-4 bg-green-600 text-white"
//                       disabled={!selectedSalesMember || selectedLeads.length === 0}
//                       onClick={() => {
//                         if (selectedSalesMember) {
//                           handleBulkAssign(selectedSalesMember);
//                         }
//                       }}
//                     >
//                       Assign Leads
//                     </Button>
//                   </div>
//                 </div>

//               </DialogContent>
//             </Dialog>
//           </div>
//           {/* </main> */}
//         </DashboardLayout>
//         {/* </div> */}
//       </ProtectedRoute>
//     </>
//   );
// }



//app/marketing/page.tsx
"use client";
import { useEffect, useRef, useState, useContext } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from 'lucide-react'; // Import trash icon from lucide-react



import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, PlusCircle } from "lucide-react";

import { Upload, Search, UserPlus, Download, List } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Papa from "papaparse";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { supabase } from "@/utils/supabase/client";
import { LoadingContext } from "@/components/providers/LoadingContext";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

interface Lead {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string;
  source: "Instagram" | "WhatsApp" | "Google Forms";
  city: string;
  status: "New" | "Assigned";
  created_at: string;
  assigned_to?: string;
  assigned_at?: string;
}


export default function MarketingPage() {
  const { loading, setLoading } = useContext(LoadingContext);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [salesTeamMembers, setSalesTeamMembers] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
  const [selectedSalesMember, setSelectedSalesMember] = useState<string | null>(null);
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState("");
  // const [leadTab, setLeadTab] = useState<"New" | "Assigned">("New");

  // Add state for deletion
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [cycleFilter, setCycleFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);


  const [allLeadsStats, setAllLeadsStats] = useState({ total: 0, assigned: 0, new: 0 });
  // const [showReassignDialog, setShowReassignDialog] = useState(false);
  // const [pendingAssignee, setPendingAssignee] = useState<string | null>(null);
  const [distinctSalesDialogOpen, setDistinctSalesDialogOpen] = useState(false);
  const [distinctSalesLeads, setDistinctSalesLeads] = useState<Lead[]>([]);
  const [distinctSalesStartDate, setDistinctSalesStartDate] = useState("");
  const [distinctSalesEndDate, setDistinctSalesEndDate] = useState("");
  const [distinctSalesSource, setDistinctSalesSource] = useState("all");
  const [distinctSources, setDistinctSources] = useState<string[]>([]);
  const [distinctSalesPerson, setDistinctSalesPerson] = useState("all");
  const [distinctSalesPersons, setDistinctSalesPersons] = useState<string[]>([]);



  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [salesHistoryDialogOpen, setSalesHistoryDialogOpen] = useState(false);
  interface SalesHistoryItem {
    id: string;
    lead_id: string;
    email: string;
    sale_value: number;
    subscription_cycle: number;
    payment_mode: string;
    finance_status: string;
    closed_at: string;
    leads?: {
      name?: string;
      phone?: string;
    };
    lead_name?: string;
    lead_phone?: string;
  }

  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  const [allLeads, setAllLeads] = useState([]);

  const [googleSheets, setGoogleSheets] = useState<{ id: number, name: string, url: string }[]>([]);
  const [showSheetsDialog, setShowSheetsDialog] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [googleSheetDialogOpen, setGoogleSheetDialogOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [newSheetUrl, setNewSheetUrl] = useState("");
  const [leadTab, setLeadTab] = useState<"New" | "Assigned" | "All">("New");
  const [isAllView, setIsAllView] = useState(false);
  const [salesDoneLeads, setSalesDoneLeads] = useState([]);
  const [showSalesDoneDialog, setShowSalesDoneDialog] = useState(false);


  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState({
    title: '',
    description: '',
    isError: false
  });



  // Add this effect to auto-close the dialog
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resultDialogOpen) {
      timer = setTimeout(() => {
        setResultDialogOpen(false);
      }, 2500); // 2.5 seconds
    }
    return () => clearTimeout(timer);
  }, [resultDialogOpen]);

  useEffect(() => {
    fetchGoogleSheets();
    // fetchAllUniqueSources();
    // ... your other useEffect code
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (copySuccess) {
      timer = setTimeout(() => {
        setCopySuccess(false);
      }, 3000); // 3 seconds
    }
    return () => clearTimeout(timer);
  }, [copySuccess]);


  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    // const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;

    const matchesSource =
      sourceFilter === "all" ||
      (lead.source?.toLowerCase().trim() === sourceFilter.toLowerCase().trim());


    const matchesTab =
      leadTab === "All" ||
      (leadTab === "New" && lead.status === "New") ||
      (leadTab === "Assigned" && lead.status === "Assigned");

    return matchesSearch && matchesStatus && matchesSource && matchesTab;
  });

  // const paginationPages = Math.ceil(filteredLeads.length / pageSize);
  const paginationPages = totalPages;



  const sortLeads = (leads: Lead[]) => {
    if (!sortConfig) return leads;

    const sorted = [...leads].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Lead];
      const bVal = b[sortConfig.key as keyof Lead];

      if (sortConfig.key === "created_at" || sortConfig.key === "assigned_at") {
        return sortConfig.direction === "asc"
          ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
          : new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
      }

      if (sortConfig.key === "lead_age") {
        const aAge = new Date().getTime() - new Date(a.created_at).getTime();
        const bAge = new Date().getTime() - new Date(b.created_at).getTime();
        return sortConfig.direction === "asc" ? aAge - bAge : bAge - aAge;
      }

      if (sortConfig.key === "business_id") {
        const getNumericPart = (val: string) => {
          const match = val?.match(/\d+$/); // extract number after "AWL-"
          return match ? parseInt(match[0]) : 0;
        };

        const aNum = getNumericPart(a.business_id);
        const bNum = getNumericPart(b.business_id);

        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }


      // if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      // if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const sortedLeads = sortLeads(filteredLeads);
  const paginatedLeads = isAllView ? sortedLeads : sortedLeads;


  const filteredSales = salesHistory.filter((item) => {
    const closedDate = new Date(item.closed_at).toISOString().split("T")[0];

    const startMatch = !startDate || closedDate >= startDate;
    const endMatch = !endDate || closedDate <= endDate;
    const cycleMatch = cycleFilter === "all" || item.subscription_cycle === Number(cycleFilter);

    return startMatch && endMatch && cycleMatch;
  });



  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableLeadIds = filteredLeads
        .filter((lead) => lead.status !== "Assigned")
        .map((lead) => lead.id);
      setSelectedLeads(selectableLeadIds);
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads((prev) => [...prev, leadId]);
    } else {
      setSelectedLeads((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleBulkAssign = async (assignedTo: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/assign-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedLeads,
          assignedTo,
          assignedAt: new Date().toISOString(),
          allLeads: leads,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Assignment failed");

      setAssignSuccessMessage(`Assigned ${selectedLeads.length} lead(s) to ${assignedTo}.`);
      setSuccessDialogOpen(true); //  Open dialog
      setTimeout(() => setSuccessDialogOpen(false), 3000);

      setSelectedLeads([]);
      setBulkAssignDialogOpen(false);

      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      setLeads(data ?? []);
      fetchLeadCounts();

    } catch (error) {
      console.error("Bulk assign error:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      // Delete all selected leads from the database
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedLeads);

      if (deleteError) {
        console.error('Error deleting leads:', deleteError);
        setResultMessage({
          title: 'Delete Failed',
          description: 'Failed to delete leads. Please try again.',
          isError: true
        });
        setResultDialogOpen(true);
        return;
      }

      // Show success message
      setResultMessage({
        title: 'Success',
        description: `Successfully deleted ${selectedLeads.length} lead(s).`,
        isError: false
      });
      setResultDialogOpen(true);

      // Close dialog and reset selection
      setBulkDeleteDialogOpen(false);
      setSelectedLeads([]);

      // Refetch leads to update the UI immediately
      fetchLeadsAndSales(currentPage, leadTab, searchTerm, statusFilter, sourceFilter);
      fetchLeadCounts();

    } catch (error) {
      console.error('Bulk delete error:', error);
      setResultMessage({
        title: 'Error',
        description: 'An error occurred while deleting leads.',
        isError: true
      });
      setResultDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Convert local date to UTC range
  const getUTCRange = (dateStr: string, isStart: boolean) => {
    const date = new Date(dateStr);
    if (isStart) {
      date.setHours(0, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date.toISOString(); // Converts to UTC properly
  };

  const fetchDistinctSalesLeads = async () => {
    let query = supabase
      .from("leads")
      .select("*")
      .eq("current_stage", "sale done"); // Be careful: check if it's "sale done" (not "sales done")

    if (distinctSalesStartDate && distinctSalesEndDate) {
      query = query
        .gte("created_at", getUTCRange(distinctSalesStartDate, true))
        .lte("created_at", getUTCRange(distinctSalesEndDate, false));
    }

    if (distinctSalesSource !== "all") {
      query = query.eq("source", distinctSalesSource);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error) {
      setDistinctSalesLeads(data || []);
    } else {
      console.error("Error fetching distinct sales leads:", error);
    }
  };

  const handleFilterChange = async ({
    startDate = distinctSalesStartDate,
    endDate = distinctSalesEndDate,
    source = distinctSalesSource,
  }: {
    startDate?: string;
    endDate?: string;
    source?: string;
  }) => {
    setDistinctSalesStartDate(startDate);
    setDistinctSalesEndDate(endDate);
    setDistinctSalesSource(source);

    // then fetch after setting all 3
    let query = supabase
      .from("leads")
      .select("*")
      .eq("current_stage", "sale done");

    if (startDate && endDate) {
      const getUTCRange = (dateStr: string, isStart: boolean) => {
        const date = new Date(dateStr);
        if (isStart) date.setHours(0, 0, 0, 0);
        else date.setHours(23, 59, 59, 999);
        return date.toISOString();
      };

      query = query
        .gte("created_at", getUTCRange(startDate, true))
        .lte("created_at", getUTCRange(endDate, false));
    }

    if (source !== "all") {
      query = query.eq("source", source);
    }

    const { data, error } = await query;
    if (!error) setDistinctSalesLeads(data || []);
  };

  // Handle Delete Click - Open the confirmation dialog
  const handleDeleteClick = (leadId: string) => {
    setSelectedLeadId(leadId);
    setDeleteDialogOpen(true);
  };


  // const handleDeleteConfirmation = async () => {
  //   if (selectedLeadId) {
  //     try {
  //       // Check if the lead_id exists in the sales_closure table


  //       // Now, delete the lead from the leads table
  //       const { error: deleteLeadError } = await supabase
  //         .from('leads')
  //         .delete()
  //         .eq('id', selectedLeadId); // Delete the lead record

  //       if (deleteLeadError) {
  //         console.error('Error deleting lead:', deleteLeadError);
  //         alert('Failed to delete lead.');
  //         return;
  //       }

  //       // Successfully deleted the lead and sales closure records (if any)
  //       setDeleteDialogOpen(false);
  //       setSelectedLeadId(null);
  //       alert('Lead deleted successfully!');

  //       // Refetch leads after deletion
  //       const { data, error: fetchError } = await supabase.from('leads').select('*');
  //       if (fetchError) throw fetchError;
  //       setLeads(data ?? []); // Update leads state with the new data

  //     } catch (err) {
  //       console.error('Delete operation failed:', err);
  //       alert('Error deleting lead and sales closures.');
  //     }
  //   }
  // };


  const fetchAllUniqueSources = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("source")
        .neq("source", "") // optional: ignore empty sources

      if (error) throw error;

      const sources = [...new Set(data.map(item => item.source))];
      setUniqueSources(sources);
    } catch (err) {
      console.error("Error fetching unique sources:", err);
    }
  };

  const handleIndividualAssign = async (leadId: string, assignedTo: string) => {
    setLoading(true, "Assigning... please wait");
    try {
      const res = await fetch("/api/assign-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedLeads: [leadId],
          assignedAt: new Date().toISOString(),
          assignedTo,
        }),
      });

      if (!res.ok) throw new Error("Assignment failed");

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? {
              ...lead,
              status: "Assigned",
              assigned_to: assignedTo,
              assigned_at: new Date().toISOString(),
            }
            : lead
        )
      );
      fetchLeadCounts();

    } catch (error) {
      console.error("Individual assign error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadCounts = async () => {
    try {
      const { data: totalLeads, error: totalErr } = await supabase
        .from("leads")
        .select("id, status");
      if (totalErr) throw totalErr;

      const total = totalLeads.length;
      const assigned = totalLeads.filter((l) => l.status === "Assigned").length;
      const newLeads = totalLeads.filter((l) => l.status === "New").length;

      setAllLeadsStats({ total, assigned, new: newLeads });
    } catch (err) {
      console.error("Failed to fetch lead counts:", err);
    }
  };

  useEffect(() => {
    fetchLeadCounts();
  }, []);


  const handleMainFilterChange = ({
    start,
    end,
    source,
    status = statusFilter,
    tab = leadTab,
    search = searchTerm,
  }: {
    start?: string;
    end?: string;
    source?: string;
    status?: string;
    tab?: "New" | "Assigned" | "All";
    search?: string;
  }) => {
    const finalStart = start ?? startDate;
    const finalEnd = end ?? endDate;
    const finalSource = source ?? sourceFilter;

    // Update state
    setStartDate(finalStart);
    setEndDate(finalEnd);
    setSourceFilter(finalSource);

    // Fetch filtered data
    fetchLeadsAndSales(
      1,
      tab,
      search,
      status,
      finalSource,
      finalStart,
      finalEnd
    );
    setCurrentPage(1);
  };


  const fetchLeadsAndSales = async (
    page = 1,
    tab = leadTab,
    search = searchTerm,
    status = statusFilter,
    source = sourceFilter,
    start = startDate,
    end = endDate
  ) => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .range(from, to)
        .order("created_at", { ascending: false });

      if (start && end) {
        const getUTCRange = (dateStr: string, isStart: boolean) => {
          const date = new Date(dateStr);
          if (isStart) date.setHours(0, 0, 0, 0);
          else date.setHours(23, 59, 59, 999);
          return date.toISOString();
        };

        query = query
          .gte("created_at", getUTCRange(start, true))
          .lte("created_at", getUTCRange(end, false));
      }

      if (tab && tab !== "All") query = query.eq("status", tab);
      if (search) {
        query = query.or(
          `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
        );
      }
      if (source !== "all") query = query.eq("source", source);
      if (status !== "all") query = query.eq("status", status);

      const { data: leadsData, error, count } = await query;
      if (error) throw error;

      setLeads(leadsData ?? []);
      setTotalPages(Math.ceil((count || 0) / pageSize));


      // Fetch Sales Team
      const res = await fetch("/api/sales-users", { method: "GET" });
      if (!res.ok) throw new Error(`Sales API failed: ${await res.text()}`);
      const users = await res.json();
      setSalesTeamMembers(users);

      //     }
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchLeadsAndSales(currentPage, leadTab, searchTerm, statusFilter, sourceFilter);
  }, [currentPage, leadTab, pageSize, searchTerm, statusFilter, sourceFilter, startDate, endDate]);

  // Update uniqueSources whenever leads change to reflect only sources in the current page
  useEffect(() => {
    const sources = [
      ...new Set(
        leads
          .map((l) => l.source?.trim())
          .filter((s) => s && s.length > 0)
      ),
    ];
    setUniqueSources(sources);
  }, [leads]);




  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day}-${month}-${year} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
  };

  const downloadCSV = (data: Lead[]) => {
    const csvContent = [
      [
        "Name",
        "Phone",
        "Email",
        "City",
        "Source",
        "Assigned To",
        "Created At",
        "Assigned At",
      ],
      ...data.map((lead) => [
        lead.name,
        lead.phone,
        lead.email,
        lead.city,
        lead.source,
        lead.assigned_to || "",
        formatDateTime(lead.created_at),
        lead.assigned_at ? formatDateTime(lead.assigned_at) : "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "assigned_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const downloadSalesCSV = (data: any[]) => {
    const cleanedData = data.map(item => ({
      LeadID: item.lead_id,
      Name: item.lead_name,
      Phone: item.lead_phone?.normalize("NFKD") || "N/A",
      Email: item.email,
      SaleValue: item.sale_value,
      Cycle: item.subscription_cycle,
      PaymentMode: item.payment_mode,
      Status: item.finance_status,
      ClosedAt: new Date(item.closed_at).toLocaleDateString(),
    }));

    const csv = Papa.unparse(cleanedData);

    // Add UTF-8 BOM prefix
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "sales_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const fileInputRef = useRef<HTMLInputElement>(null);
  const openFileDialog = () => fileInputRef.current?.click();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setShowConfirmDialog(true);
    setUploadProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setRowCount(results.data.length);
      },
    });
  };

  const formatFileSize = (size: number) =>
    size >= 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(1)} MB`
      : `${(size / 1024).toFixed(1)} KB`;

  const handleConfirmUpload = () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setLoading(true);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setRowCount(results.data.length);
        const parsedData = results.data.map((row: any) => {
          let formattedDate = "";
          try {
            const [day, month, yearAndTime] = row.Timestamp?.split("-") || [];
            const [year, time] = yearAndTime?.split(" ") || [];
            formattedDate = new Date(
              `${year}-${month}-${day}T${time || "00:00"}:00`
            ).toISOString();
          } catch {
            formattedDate = new Date().toISOString();
          }

          return {
            name: row["Full name"] || "",
            phone: row["Phone Number (Country Code)"] || "",
            email: row["Email"] || "",
            city: row["city"] || "",
            source: row["source"] || "Unknown",
            status: "New",
            created_at: formattedDate,
            assigned_to: "",
          };
        });

        const { error } = await supabase.from("leads").insert(parsedData);

        if (error) {
          console.error("❌ Supabase Insert Error:", error); // 👈 ADD THIS
          alert("Failed to insert CSV data into Supabase. Check console.");
        } else {
          const { data: updated, error: fetchError } = await supabase
            .from("leads")
            .select("*");
          if (!fetchError) setLeads(updated || []);
        }


        setTimeout(async () => {
          setUploadProgress(100);
          setSelectedFile(null);
          setShowConfirmDialog(false);
          setUploadDialogOpen(false);
          setUploadProgress(0);
          setIsUploading(false);
          setLoading(false);

          await fetchLeadCounts();

          // Fetch only 15 new leads after upload
          await fetchLeadsAndSales(1, "New", "", "all", "all");
          setCurrentPage(1); // Reset pagination

        }, 1000);
        fetchLeadCounts();
      },
    });
  };


  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "Instagram":
        return "bg-pink-100 text-pink-800 rounded-md";
      case "WhatsApp":
        return "bg-green-100 text-green-800 rounded-md";
      case "Google":
        return "bg-gray-900 text-gray-100 rounded-md";
      case "Facebook":
        return "bg-blue-200 text-blue-900 rounded-md";
      default:
        return "bg-gray-100 text-gray-800 rounded-md";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-red-100 text-red-800";
      case "Assigned":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };



  const handleDistinctFilterChange = async ({
    startDate,
    endDate,
    source,
    assignedTo = distinctSalesPerson,
  }: {
    startDate: string;
    endDate: string;
    source: string;
    assignedTo?: string;
  }) => {
    setDistinctSalesStartDate(startDate);
    setDistinctSalesEndDate(endDate);
    setDistinctSalesSource(source);
    setDistinctSalesPerson(assignedTo || "all");

    const getUTCRange = (dateStr: string, isStart: boolean) => {
      const date = new Date(dateStr);
      if (isStart) date.setHours(0, 0, 0, 0);
      else date.setHours(23, 59, 59, 999);
      return date.toISOString();
    };

    let query = supabase
      .from("leads")
      .select("*")
      .eq("current_stage", "sale done");

    if (startDate && endDate) {
      query = query
        .gte("created_at", getUTCRange(startDate, true))
        .lte("created_at", getUTCRange(endDate, false));
    }

    if (source !== "all") {
      query = query.eq("source", source);
    }

    if (assignedTo && assignedTo !== "all") {
      query = query.eq("assigned_to", assignedTo);
    }

    const { data, error } = await query;
    if (!error) {
      setDistinctSalesLeads(data || []);

      const sourceList = [...new Set((data || []).map((d) => d.source?.trim()).filter(Boolean))];
      setDistinctSources(sourceList);
    } else {
      console.error("Error fetching filtered leads:", error);
    }
  };

  const fetchDistinctSalesPersons = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("assigned_to") // 👈 just fetch the column
      .neq("assigned_to", null); // 👈 filter out nulls

    if (!error && data) {
      const names = [...new Set(data.map((item) => item.assigned_to?.trim()).filter(Boolean))];
      setDistinctSalesPersons(names);
    } else {
      console.error("Error fetching distinct salespersons:", error);
    }
  };


  const handleAddNewSheet = async () => {
    try {
      setLoading(true);

      if (!newSheetUrl.match(/https:\/\/docs\.google\.com\/spreadsheets\/.+/)) {
        throw new Error('Must be a valid Google Sheets URL (https://docs.google.com/spreadsheets/...)');
      }

      const { data, error } = await supabase
        .from('google_sheets_config')
        .insert([{
          name: newSheetName.trim(),
          url: newSheetUrl.trim()
        }])
        .select()
        .single(); // Ensures we get a single record

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(error.message || 'Failed to save sheet configuration');
      }

      // Show success (will auto-close in 3s via useEffect)
      setResultMessage({
        title: 'Success ✅',
        description: `"${newSheetName}" added successfully!`,
        isError: false
      });
      setResultDialogOpen(true);

      setGoogleSheetDialogOpen(false);
      setNewSheetName('');
      setNewSheetUrl('');
      fetch('/api/fetch-google-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET || "local_dev_secret"}`
        },
      }).catch(console.error); // Silently handle fetch errors

    } catch (error) {
      // Show error (will auto-close in 3s via useEffect)
      setResultMessage({
        title: 'Error ❌',
        description: error instanceof Error ?
          error.message.replace('Invalid Google Sheets URL - ', '') :
          'Operation failed',
        isError: true
      });
      setResultDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleSheets = async () => {
    try {
      const { data, error } = await supabase
        .from('google_sheets_config')
        .select('id, name, url')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoogleSheets(data || []);
    } catch (err) {
      console.error('Error fetching Google Sheets:', err);
    }
  };

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortConfig({ key, direction });
  };


  return (
    <>
      {loading && <FullScreenLoader />}
      <ProtectedRoute allowedRoles={["Marketing", "Super Admin"]}>
        {/* <div className="w-full overflow-x-hidden"> */}
        {/* <div className="w-full px-4 md:px-6 lg:px-8 overflow-x-hidden"> */}

        <DashboardLayout>
          {/* <div className="space-y-6"> */}
          {/* <main className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6"> */}
          <div className="space-y-6">


            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Marketing CRM</h1>
                <p className="text-gray-600 mt-2">Manage leads and marketing campaigns</p>
              </div>
              <div className="flex gap-3">
 <Button
                   variant="outline"
                   onClick={() => window.open('/marketingAnalytics', '_blank')}
                   className="flex items-center gap-2"
                 >
                   <RefreshCw className="w-4 h-4" /> Analytics
                 </Button>
                <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>

                  <DialogTrigger asChild>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">📜 History &#11206;</Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            const filtered = leads.filter((lead) => lead.status === "Assigned");
                            setAssignedLeads(filtered);
                            setHistoryDialogOpen(true);
                          }}
                        >
                          Assigned Leads History
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={async () => {
                            const { data: sales, error: salesErr } = await supabase
                              .from("sales_closure")
                              .select("*")
                              .order("closed_at", { ascending: false });

                            const { data: leads, error: leadsErr } = await supabase
                              .from("leads")
                              .select("business_id, name, phone");

                            const salesWithLeads = (sales ?? []).map((s) => {
                              const match = (leads ?? []).find((l) => l.business_id === s.lead_id);
                              return {
                                ...s,
                                lead_name: match?.name ?? "N/A",
                                lead_phone: match?.phone ?? "N/A",
                              };
                            });

                            setSalesHistory(salesWithLeads);
                            setSalesHistoryDialogOpen(true);

                          }}
                        >
                          Sales Done History
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                  </DialogTrigger>

                  {historyDialogOpen && (

                    <DialogContent className="max-w-7xl">
                      <DialogHeader>
                        <DialogTitle>Assigned Leads History</DialogTitle>
                        <DialogDescription>View all leads that are currently assigned.</DialogDescription>
                      </DialogHeader>

                      {/* Table to display assigned leads */}
                      {assignedLeads && assignedLeads.length > 0 ? (
                        <>
                          <div className="overflow-auto max-h-[400px] border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Phone</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>City</TableHead>
                                  <TableHead>Source</TableHead>
                                  <TableHead>Assigned To</TableHead>
                                  <TableHead>Created At</TableHead>
                                  <TableHead>Assigned At</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {assignedLeads.map((lead) => (
                                  <TableRow key={lead.id}>
                                    <TableCell>{lead.name}</TableCell>
                                    <TableCell>{lead.phone}</TableCell>
                                    <TableCell>{lead.email}</TableCell>
                                    <TableCell>{lead.city}</TableCell>
                                    <TableCell className="text-right">{lead.source}</TableCell>
                                    <TableCell>{lead.assigned_to}</TableCell>
                                    <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                                    {/*<TableCell>{lead.assigned_at ? new Date(lead.assigned_at).toLocaleDateString() : ""}</TableCell> */}
                                    <TableCell>{lead.assigned_at ? formatDateTime(lead.assigned_at) : ""}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div >

                          <div className="flex justify-end mt-4">

                            <Button onClick={() => downloadCSV(assignedLeads)}>
                              <Download className="h-4 w-4 mr-2" /> Download CSV
                            </Button>
                          </div>
                        </>) : (<div className="py-8 text-center text-gray-500">
                          <p>There are no assigned leads yet.</p>
                        </div>)}
                    </DialogContent>
                  )}
                </Dialog>

                {/* <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                      Are you sure you want to delete this lead?
                    </DialogDescription>

                    <DialogFooter>
                      <Button onClick={handleDeleteConfirmation} variant="destructive">
                        Yes, Delete
                      </Button>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog> */}


                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload CSV
                    </Button>
                  </DialogTrigger>

                  {/* <DialogContent className="max-w-md"> */}
                  <DialogContent className="w-[95%] sm:max-w-md">

                    <DialogHeader>
                      <DialogTitle>Upload Files</DialogTitle>
                      <p className="text-sm text-muted-foreground">Upload your user-downloadable files.</p>
                    </DialogHeader>

                    {/* File Drop Area */}
                    <div className="border border-dashed border-gray-300 p-6 rounded-lg text-center space-y-2">
                      <div className="text-gray-500">Drop your files here or browse</div>
                      <Button variant="outline" onClick={openFileDialog}><Upload className="h-4 w-4" /> Browse from your device</Button>
                      <p className="text-xs text-gray-400">Max file size up to 400 MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>

                    {/* File Preview Section */}
                    {selectedFile && showConfirmDialog && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
                          <span>
                            {selectedFile.name} – {formatFileSize(selectedFile.size)}
                            {rowCount !== null && ` - ${rowCount} rows`}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); setRowCount(null); }}>🗑️</Button>
                        </div>

                        {/* ✅ Show progress only after confirm is clicked */}
                        {isUploading && (
                          <div className="relative w-full bg-gray-200 rounded h-2">
                            <div className="bg-green-600 h-2 rounded absolute left-0" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Confirm/Cancel Buttons */}
                    {selectedFile && showConfirmDialog && (
                      <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-green-600 text-white" onClick={handleConfirmUpload}>Confirm</Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>


                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setGoogleSheetDialogOpen(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span>Add new Google Sheet</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => {
                        fetchGoogleSheets();
                        setShowSheetsDialog(true);
                      }}
                    >
                      <List className="mr-2 h-4 w-4" />
                      <span>View all Google Sheets</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={async () => {
                        // Reset filters
                        setDistinctSalesStartDate("");
                        setDistinctSalesEndDate("");
                        setDistinctSalesSource("all");
                        setDistinctSalesPerson("all");

                        // ✅ Fetch salespersons before opening dialog
                        await fetchDistinctSalesPersons();

                        // ✅ Fetch sources
                        const { data, error } = await supabase
                          .from("leads")
                          .select("source")
                          .eq("current_stage", "sale done");

                        if (!error) {
                          const sources = [...new Set(data.map((d) => d.source).filter(Boolean))];
                          setDistinctSources(sources);
                        }

                        // ✅ Fetch sales done leads
                        await fetchDistinctSalesLeads();

                        // ✅ Now open the dialog
                        setDistinctSalesDialogOpen(true);
                      }}
                    >
                      <List className="mr-2 h-4 w-4" />
                      <span>See Distinct Sales History</span>
                    </DropdownMenuItem>



                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
                  {/* <DialogContent className="max-w-md"> */}
                  <DialogContent className="w-[95%] sm:max-w-md">

                    <DialogHeader>
                      <DialogTitle>Assignment Success</DialogTitle>
                    </DialogHeader>

                    <div>
                      <DialogDescription>{assignSuccessMessage}</DialogDescription>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={googleSheetDialogOpen} onOpenChange={setGoogleSheetDialogOpen}>
                  {/* <DialogContent className="max-w-md"> */}
                  <DialogContent className="max-w-4xl">

                    <DialogHeader>
                      <DialogTitle>Add New Google Sheet</DialogTitle>
                      <DialogDescription>
                        Connect a new Google Sheet to automatically import leads
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <div className="text-gray-700 mb-5">
                          <h5>Googlesheet must contain column headers like below 👇</h5>
                          <h6>Column headers : Full name, Phone Number (Country Code), Email, city </h6>
                        </div>
                        <Label>Sheet Name</Label>
                        <Input
                          placeholder="e.g., Nikhil_reel_3_leads"
                          value={newSheetName}
                          onChange={(e) => setNewSheetName(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Google Sheet URL</Label>
                        <Input
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          value={newSheetUrl}
                          onChange={(e) => setNewSheetUrl(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setGoogleSheetDialogOpen(false);
                            setNewSheetName('');
                            setNewSheetUrl('');
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>

                        <Button
                          onClick={handleAddNewSheet}
                          disabled={!newSheetName || !newSheetUrl || loading}
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              </svg>
                              Adding...
                            </span>
                          ) : (
                            "Add Sheet"
                          )}
                        </Button>
                      </div>

                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showSheetsDialog} onOpenChange={setShowSheetsDialog}>
                  <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                      <DialogTitle>Google Sheets Configuration</DialogTitle>
                      <DialogDescription>
                        All connected Google Sheets for lead imports
                      </DialogDescription>
                    </DialogHeader>

                    {copySuccess && (
                      <div className="p-3 mb-4 bg-green-100 text-green-800 rounded-md text-center">
                        URL copied to clipboard!
                      </div>
                    )}

                    <div className="max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Sheet Name</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {googleSheets.map((sheet) => (
                            <TableRow key={sheet.id}>
                              <TableCell className="font-medium">{sheet.id}</TableCell>
                              <TableCell>{sheet.name}</TableCell>
                              <TableCell>
                                <a
                                  href={sheet.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {sheet.url.length > 40
                                    ? `${sheet.url.substring(0, 40)}...`
                                    : sheet.url}
                                </a>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(sheet.url);
                                    setCopySuccess(true);
                                  }}
                                >
                                  Copy URL
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {googleSheets.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                No Google Sheets configured yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <DialogFooter>
                      <Button onClick={() => {
                        setShowSheetsDialog(false);
                        setCopySuccess(false);
                      }}>
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={distinctSalesDialogOpen} onOpenChange={setDistinctSalesDialogOpen}>
                  <DialogContent className="max-w-6xl">
                    <DialogHeader>
                      <DialogTitle>Total Sales History</DialogTitle>
                      <DialogDescription>
                        Leads with current stage marked as <strong>"sales done"</strong>
                      </DialogDescription>
                    </DialogHeader>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div className="flex flex-wrap gap-2 items-center">
                        <div>
                          <Label className="text-sm text-gray-600">Start Date</Label>
                          <Input
                            type="date"
                            value={distinctSalesStartDate}
                            onChange={(e) => {
                              handleDistinctFilterChange({
                                startDate: e.target.value,
                                endDate: distinctSalesEndDate,
                                source: distinctSalesSource,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">End Date</Label>
                          <Input
                            type="date"
                            value={distinctSalesEndDate}
                            onChange={(e) => {
                              handleDistinctFilterChange({
                                startDate: distinctSalesStartDate,
                                endDate: e.target.value,
                                source: distinctSalesSource,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Salesperson</Label>
                          <Select
                            value={distinctSalesPerson}
                            onValueChange={(value) => {
                              handleDistinctFilterChange({
                                startDate: distinctSalesStartDate,
                                endDate: distinctSalesEndDate,
                                source: distinctSalesSource,
                                assignedTo: value,
                              });
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Salesperson" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              {distinctSalesPersons.map((person) => (
                                <SelectItem key={person} value={person}>
                                  {person}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm text-gray-600">Source</Label>
                          <Select
                            value={distinctSalesSource}
                            onValueChange={(value) => {
                              handleDistinctFilterChange({
                                startDate: distinctSalesStartDate,
                                endDate: distinctSalesEndDate,
                                source: value,
                              });
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Sources</SelectItem>
                              {distinctSources.map((source) => (
                                <SelectItem key={source} value={source}>
                                  {source}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="text-green-600 text-sm flex items-center gap-4">
                        <span>
                          Showing {distinctSalesLeads.length}{" "}
                          {distinctSalesLeads.length === 1 ? "record" : "records"}
                        </span>
                        <Button
                          variant="ghost"
                          className="text-red-500 text-xs"
                          onClick={() =>
                            handleDistinctFilterChange({
                              startDate: "",
                              endDate: "",
                              source: "all",
                              assignedTo: "all", // 👈 include this

                            })
                          }
                        >
                          🔄 Reset Filters
                        </Button>
                      </div>

                    </div>


                    {/* Table */}
                    {distinctSalesLeads.length > 0 ? (
                      <div className="overflow-auto max-h-[400px] border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>S.No</TableHead>
                              <TableHead>Business ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>City</TableHead>
                              <TableHead>Assigned To</TableHead>

                              <TableHead>Source</TableHead>
                              <TableHead>Created At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {distinctSalesLeads.map((lead, index) => (
                              <TableRow key={lead.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{lead.business_id}</TableCell>
                                <TableCell>{lead.name}</TableCell>
                                <TableCell>{lead.phone}</TableCell>
                                <TableCell>{lead.email}</TableCell>
                                <TableCell>{lead.city}</TableCell>
                                <TableCell>{lead.assigned_to || "Unassigned"}</TableCell>

                                <TableCell>{lead.source}</TableCell>
                                <TableCell>
                                  {new Date(lead.created_at).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-gray-500">
                        <p>No sales done records found.</p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className={resultMessage.isError ? "text-red-600" : "text-green-600"}>
                        {resultMessage.title}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                      <p>{resultMessage.description}</p>
                    </div>
                    {/* Progress bar for visual countdown */}
                    <div className="h-1 w-full bg-gray-200">
                      <div
                        className={`h-full ${resultMessage.isError ? 'bg-red-500' : 'bg-green-500'} animate-[shrink_3s_linear_forwards]`}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> */}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Overall Stats (All Leads)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    Total Leads: <span className="font-bold">{allLeadsStats.total}</span><br />
                    New Leads: <span className="font-bold">{allLeadsStats.new}</span><br />
                    Assigned Leads: <span className="font-bold">{allLeadsStats.assigned}</span><br />
                    Conversion Rate: <span className="font-bold">
                      {allLeadsStats.total === 0 ? "0.0" : ((allLeadsStats.assigned / allLeadsStats.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Assigned Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.filter((l) => l.status === "Assigned").length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Not Assigned (New Leads)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.filter((l) => l.status === "New").length}</div>
                </CardContent>
              </Card>


            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Leads Management</CardTitle>
                    {/* <CardDescription>View and manage all marketing leads</CardDescription> */}
                  </div>
                  {selectedLeads.length > 0 && (
                    <div className="flex gap-2">
                      <Button onClick={() => setBulkAssignDialogOpen(true)} className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Bulk Assign ({selectedLeads.length})
                      </Button>
                      <Button
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        variant="destructive"
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Bulk Delete ({selectedLeads.length})
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>



                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search by name, phone, email, or city..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                    onValueChange={(value) =>
                      handleMainFilterChange({ source: value })
                    }
                  >
                    <SelectTrigger className="min-w-[150px] w-full sm:w-auto">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {uniqueSources.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>


                  <div className="flex flex-col sm:flex-row gap-2">

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="min-w-[200px]">
                          {startDate && endDate
                            ? `📅 ${startDate} → ${endDate}`
                            : "📅 Date Range"}
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="p-4 space-y-4 w-[250px] sm:w-[300px]">
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">Start Date</Label>
                          {/* <Input
        type="date"
        value={startDate}
        onChange={(e) => {
          setStartDate(e.target.value);
          setCurrentPage(1);
        }}
      /> */}
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) =>
                              handleMainFilterChange({ start: e.target.value })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">End Date</Label>

                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) =>
                              handleMainFilterChange({ end: e.target.value })
                            }
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

                  </div>


                </div>


                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={leadTab === "New" ? "default" : "outline"}
                    onClick={() => {
                      setLeadTab("New");
                      setCurrentPage(1);
                    }}
                  >
                    New Leads
                  </Button>
                  <Button
                    variant={leadTab === "Assigned" ? "default" : "outline"}
                    onClick={() => {
                      setLeadTab("Assigned");
                      setCurrentPage(1);
                    }}
                  >
                    Assigned Leads
                  </Button>
                  <Button
                    variant={leadTab === "All" ? "default" : "outline"}
                    onClick={async () => {
                      setLeadTab("All");
                      setCurrentPage(1);
                      // setIsAllView(true);
                      setIsAllView(false); // 👈 make sure this is false to enable pagination
                    }}
                  >
                    All Leads
                  </Button>


                  <div className="w-full sm:w-auto flex justify-end">
                    {/* <Select onValueChange={(value) => setPageSize(Number(value))}> */}
                    <Select
                      onValueChange={async (value) => {
                        if (value === "all") {
                          setIsAllView(true);
                          setCurrentPage(1);

                          // Fetch all data if "All" is selected
                          const { data, error } = await supabase
                            .from("leads")
                            .select("*")
                            .order("created_at", { ascending: false });

                          if (!error) {
                            setLeads(data);
                          }
                        } else {
                          const pageSizeValue = Number(value);
                          setPageSize(pageSizeValue);
                          setIsAllView(false);
                          setCurrentPage(1);

                          // ✅ REFETCH data with new pageSize
                          fetchLeadsAndSales(1, leadTab, searchTerm, statusFilter, sourceFilter);
                        }
                      }}
                    >


                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder={`${pageSize} per page`} />
                      </SelectTrigger>
                      <SelectContent>
                        {[15, 25, 50, 100].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} per page
                          </SelectItem>
                        ))}
                        <SelectItem value="all">All</SelectItem>

                      </SelectContent>
                    </Select>
                  </div>


                </div>
                {/* <div className="rounded-md border max-h-[600px] overflow-y-auto">

                    <Table className="table-fixed w-full break-words text-center"> */}

                <div className="w-full overflow-x-auto">

                  <Table className="min-w-[1000px] w-full break-words text-center">

                    <TableHeader >
                      <TableRow className="center">
                        {/* <TableHead className="sticky top-0 bg-white z-10 w-16 max-w-[80px] whitespace-normal">Delete</TableHead> */}

                        <TableHead className="sticky top-0 bg-white z-10 w-12 text-center">
                          <Checkbox
                            checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>

                        <TableHead className="sticky top-0 bg-white z-10 w-16 max-w-[70px] whitespace-normal">s.no</TableHead>


                        <>
                          <TableHead className="sticky top-0 bg-white z-10 text-center">
                            <div className="flex flex-col items-center">
                              {/* <div className="flex flex-col text-xs"> */}
                              <div className="flex items-center gap-1">
                                ID
                                <span
                                  onClick={() => handleSort("business_id", "asc")}
                                  className={`leading-none hover:text-blue-600 cursor-pointer ${sortConfig?.key === "business_id" && sortConfig.direction === "asc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() => handleSort("business_id", "desc")}
                                  className={`leading-none hover:text-blue-600 cursor-pointer ${sortConfig?.key === "business_id" && sortConfig.direction === "desc"
                                    ? "text-blue-700 font-bold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </div>
                          </TableHead>

                          <TableHead className="sticky top-0 bg-white z-10 text-center">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1">

                                Name
                                <span
                                  onClick={() => handleSort("name", "asc")}
                                  className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "name" && sortConfig.direction === "asc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() => handleSort("name", "desc")}
                                  className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "name" && sortConfig.direction === "desc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </div>
                          </TableHead>

                          <TableHead className="sticky top-0 bg-white z-10 text-center">Phone</TableHead>

                          <TableHead className="sticky top-0 bg-white z-10 text-center">Email</TableHead>

                          <TableHead className="sticky top-0 bg-white z-10 text-center">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1">

                                City
                                <span
                                  onClick={() => handleSort("city", "asc")}
                                  className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "city" && sortConfig.direction === "asc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() => handleSort("city", "desc")}
                                  className={`hover:text-blue-600 cursor-pointer${sortConfig?.key === "city" && sortConfig.direction === "desc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </div>
                          </TableHead>

                          <TableHead className="sticky top-0 bg-white z-10 text-center">Source</TableHead>

                          <TableHead className="sticky top-0 bg-white z-10 text-center">Status</TableHead>

                          <TableHead className="sticky top-0 bg-white z-10 text-center">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1">
                                Created At
                                <span>
                                  <span
                                    onClick={() => handleSort("created_at", "asc")}
                                    className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "created_at" && sortConfig.direction === "asc"
                                      ? "text-blue-700 font-semibold"
                                      : "text-gray-500"
                                      }`}
                                  >
                                    ↑
                                  </span>
                                  <span
                                    onClick={() => handleSort("created_at", "desc")}
                                    className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "created_at" && sortConfig.direction === "desc"
                                      ? "text-blue-700 font-semibold"
                                      : "text-gray-500"
                                      }`}
                                  >
                                    ↓
                                  </span>
                                </span>
                              </div>
                            </div>
                          </TableHead>

                          <TableHead className="sticky top-0 bg-white z-10 text-center">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1">
                                <span>Lead Age</span>
                                {/* <div className="flex flex-col text-xs leading-none"> */}
                                <span
                                  onClick={() => handleSort("lead_age", "asc")}
                                  className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "lead_age" && sortConfig.direction === "asc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↑
                                </span>
                                <span
                                  onClick={() => handleSort("lead_age", "desc")}
                                  className={`hover:text-blue-600 cursor-pointer ${sortConfig?.key === "lead_age" && sortConfig.direction === "desc"
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-500"
                                    }`}
                                >
                                  ↓
                                </span>
                              </div>
                            </div>
                          </TableHead>

                          <TableHead className="sticky top-0 bg-white z-10 text-center">Actions</TableHead>
                        </>

                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLeads.map((lead, index) => (
                        // <TableRow key={lead.id}>
                        <TableRow
                          key={lead.id}
                          className="hover:bg-gray-100" >



                          {/* <TableCell className="text-center">
                            {(lead.status !== "Assigned") && (
                              <Button
                                variant="outline"
                                color="danger"
                                onClick={() => {
                                  setSelectedLeadId(lead.id); // Set the selected lead id
                                  setDeleteDialogOpen(true); // Open the delete confirmation dialog
                                }}
                              >
                                <Trash2 className="h-5 w-5 text-red-600" /> 
                              </Button>
                            )}
                          </TableCell> */}
                          <TableCell>
                            <Checkbox
                              checked={selectedLeads.includes(lead.id)}
                              onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                              disabled={lead.status === "Assigned"}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                          <TableCell className="font-medium">{lead.business_id}</TableCell>

                          <TableCell
                            className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                            onClick={() => window.open(`/leads/${lead.business_id}`, "_blank")}
                          >
                            {lead.name}
                          </TableCell>
                          {/* <TableCell className="font-medium max-w-[150px] break-words whitespace-normal">{lead.name}</TableCell> */}
                          <TableCell className="max-w-[100px] break-words whitespace-normal">{lead.phone}</TableCell>
                          <TableCell className="max-w-[120px] break-words whitespace-normal">{lead.email}</TableCell>
                          <TableCell className="max-w-[100px] break-words whitespace-normal">{lead.city}</TableCell>
                          <TableCell className="max-w-[70px] break-words whitespace-normal">
                            <Badge className={getSourceBadgeColor(lead.source)}>{lead.source}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[80px] break-words whitespace-normal">
                            <Badge className={getStatusBadgeColor(lead.status)}>{lead.status}</Badge>
                          </TableCell>

                          <TableCell className="max-w-[100px] break-words whitespace-normal">
                            {new Date(new Date(lead.created_at).getTime() + (5 * 60 + 30) * 60 * 1000).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </TableCell>
                          <TableCell className="max-w-[100px] break-words whitespace-normal">
                            {(() => {
                              const createdAt = new Date(lead.created_at);
                              const today = new Date();
                              const diffTime = today.getTime() - createdAt.getTime();
                              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                              return `${diffDays} days`;
                            })()}
                          </TableCell>



                          <TableCell className="max-w-[100px] break-words whitespace-normal">
                            {lead.status === "New" ? (
                              <Select onValueChange={(value) => handleIndividualAssign(lead.id, value)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent>
                                  {salesTeamMembers
                                    .filter((member) => member.full_name && member.full_name.trim() !== "")
                                    .map((member) => (
                                      <SelectItem key={member.id} value={member.full_name}>
                                        {member.full_name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-gray-500">{lead.assigned_to}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* // ✅ STEP 4: Add Pagination UI after your Table */}
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      ⬅ Previous
                    </Button>
                    <span className="text-gray-600">
                      {/* Page {currentPage} of {paginationPages} */}
                      {isAllView ? (
                        <span className="text-gray-600">Showing all {filteredLeads.length} leads</span>
                      ) : (
                        <span className="text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                      )}

                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next ➡
                    </Button>
                  </div>

                </div>
              </CardContent>
            </Card>

            <Dialog open={salesHistoryDialogOpen} onOpenChange={setSalesHistoryDialogOpen}>
              <DialogContent className="max-w-7xl">

                <DialogHeader>
                  <DialogTitle>Sales Done History</DialogTitle>
                  <DialogDescription>List of all successfully closed deals</DialogDescription>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    {/* Left side - Record count */}
                    <div className="text-sm text-green-600">
                      Showing {filteredSales.length} {filteredSales.length === 1 ? "record" : "records"}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="min-w-[200px]">
                            ⏳ {cycleFilter !== "all" ? `${cycleFilter} days` : "Cycle Filter"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="p-2 space-y-1 w-[200px]">
                          {["all", 15, 30, 60, 90].map((cycle) => (
                            <DropdownMenuItem
                              key={cycle}
                              onClick={() => {
                                setCycleFilter(cycle.toString());
                                setCurrentPage(1);
                              }}
                              className={cycleFilter === cycle.toString() ? "bg-gray-100 font-medium" : ""}
                            >
                              {cycle === "all" ? "All Cycles" : `${cycle} Days`}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="min-w-[200px]">
                            {startDate && endDate
                              ? `📅 ${startDate} → ${endDate}`
                              : "📅 Date Range"}
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="p-4 space-y-4 w-[250px] sm:w-[300px]">
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">Start Date</Label>
                            <Input
                              type="date"
                              value={startDate}
                              onChange={(e) => {
                                setStartDate(e.target.value);
                                setCurrentPage(1);
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">End Date</Label>
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => {
                                setEndDate(e.target.value);
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
                    </div>
                  </div>
                </DialogHeader>

                {salesHistory.length > 0 ? (
                  <>


                    <div className="overflow-auto max-h-[400px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S.No</TableHead>
                            <TableHead>Lead ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Sale $</TableHead>
                            <TableHead>Cycle (days)</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Closed At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{item.lead_id}</TableCell>
                              <TableCell>{item.lead_name}</TableCell>
                              <TableCell>{item.lead_phone}</TableCell>
                              <TableCell>{item.email}</TableCell>
                              <TableCell>${item.sale_value}</TableCell>
                              <TableCell>{item.subscription_cycle}</TableCell>
                              <TableCell>{item.payment_mode}</TableCell>
                              <TableCell>{item.finance_status}</TableCell>
                              <TableCell>{new Date(item.closed_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-gray-500">
                    <p>No sales records yet.</p>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <Button onClick={() => downloadSalesCSV(filteredSales)}>
                    <Download className="h-4 w-4 mr-2" /> Download CSV
                  </Button>
                </div>

              </DialogContent>
            </Dialog>



            <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
              {/* <DialogContent> */}
              {/* <DialogContent className="max-w-md"> */}
              <DialogContent className="w-[95%] sm:max-w-md">


                <DialogHeader>
                  <DialogTitle>Bulk Assign Leads</DialogTitle>
                  <DialogDescription>Assign {selectedLeads.length} selected leads to a sales team member</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Select Sales Team Member</Label>
                    <Select
                      onValueChange={(value) => setSelectedSalesMember(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesTeamMembers
                          .filter((member) => member.full_name && member.full_name.trim() !== "")
                          .map((member) => (
                            <SelectItem key={member.id} value={member.full_name}>
                              {member.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      className="mt-4 bg-green-600 text-white"
                      disabled={!selectedSalesMember || selectedLeads.length === 0}
                      onClick={() => {
                        if (selectedSalesMember) {
                          handleBulkAssign(selectedSalesMember);
                        }
                      }}
                    >
                      Assign Leads
                    </Button>
                  </div>
                </div>

              </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
              <DialogContent className="w-[95%] sm:max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Confirm Bulk Delete</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete {selectedLeads.length} lead(s)? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>S.No</TableHead>
                          <TableHead>Lead ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads
                          .filter((lead) => selectedLeads.includes(lead.id))
                          .map((lead, key) => (
                            <TableRow key={lead.id}>
                              <TableHead>{key + 1}</TableHead>
                              <TableHead>{lead.business_id}</TableHead>
                              <TableCell className="font-medium">{lead.name}</TableCell>
                              <TableCell>{lead.phone}</TableCell>
                              <TableCell>
                                <Badge className={getStatusBadgeColor(lead.status)}>
                                  {lead.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setBulkDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={selectedLeads.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedLeads.length} Lead(s)
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
          {/* </main> */}
        </DashboardLayout>
        {/* </div> */}
      </ProtectedRoute>
    </>
  );
}
