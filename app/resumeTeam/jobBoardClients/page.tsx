

// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/utils/supabase/client";

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
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";


// import { ArrowUpDown, ArrowUp, ArrowDown, Download, Calendar, Clock, FileText, Trash2 } from "lucide-react";


// import ProtectedRoute from "@/components/auth/ProtectedRoute";
// import { DashboardLayout } from "@/components/layout/dashboard-layout";
// import { useAuth } from "@/components/providers/auth-provider";


// /* =========================
//    Types & Labels
//    ========================= */


// type FinanceStatus = "Paid" | "Unpaid" | "Paused" | "Closed" | "Got Placed";


// type ResumeStatus =
//   | "not_started"
//   | "pending"
//   | "waiting_client_approval"
//   | "completed";


// const STATUS_LABEL: Record<ResumeStatus, string> = {
//   not_started: "Not started",
//   pending: "Pending",
//   waiting_client_approval: "Waiting for Client approval",
//   completed: "Completed",
// };


// type PortfolioStatus =
//   | "not_started"
//   | "pending"
//   | "waiting_client_approval"
//   | "success";


// type TeamMember = {
//   id: string;
//   name: string | null;
//   email: string | null;
//   role: string | null;
// };


// interface SalesClosure {
//   id: string;
//   lead_id: string;
//   email: string;
//   company_application_email: string | null;
//   finance_status: FinanceStatus;
//   closed_at: string | null;
//   onboarded_date_raw: string | null;
//   onboarded_date_label: string;
//   application_sale_value: number | null;
//   resume_sale_value: number | null;
//   portfolio_sale_value: number | number | null;
//   job_board_value: number | null;
//   commitments?: string | null;
//   badge_value?: number | null;
//   data_sent_to_customer_dashboard?: string | null;


//   // joined lead data
//   leads?: { name: string; phone: string };


//   // resume_progress (from view)
//   rp_status: ResumeStatus;
//   rp_pdf_path: string[] | string | null;
//   assigned_to_email: string | null;
//   assigned_to_name: string | null;



//   // portfolio_progress
//   pp_status: PortfolioStatus | null;
//   pp_assigned_email: string | null;
//   pp_assigned_name: string | null;
//   pp_link: string | null;


//   portfolio_paid: boolean;
//   google_drive_resume_link: string[] | null;
// }


// /* =========================
//    Small helpers
//    ========================= */


// const formatDateLabel = (d: string | null) =>
//   d ? new Date(d).toLocaleDateString("en-GB") : "-";


// const formatOnboardLabel = (d: string | null) =>
//   d ? new Date(d).toLocaleDateString("en-GB") : "Not Started";


// const csvFromArray = (arr?: string[] | null) =>
//   arr && arr.length ? arr.join(", ") : "";


// const csvToArray = (s: string) =>
//   s.split(",").map((v) => v.trim()).filter(Boolean);


// const BUCKET = "resumes";


// const ensurePdf = (file: File) => {
//   if (file.type !== "application/pdf")
//     throw new Error("Please select a PDF file.");
//   if (file.size > 20 * 1024 * 1024) throw new Error("Max file size is 20MB.");
// };


// // Resume Selector Dialog Component
// interface ResumeSelectorDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   leadId: string;
//   currentResumes: string[];
//   onResumeSelect: (path: string) => void;
//   onDeleteResume: (path: string, leadId: string) => Promise<{ success: boolean; message: string }>;
// }

// const ResumeSelectorDialog = ({
//   open,
//   onOpenChange,
//   leadId,
//   currentResumes,
//   onResumeSelect,
//   onDeleteResume,
// }: ResumeSelectorDialogProps) => {
//   const [deleting, setDeleting] = useState<Record<string, boolean>>({});

//   // Function to extract filename from path
//   const getFileName = (path: string) => {
//     const segments = path.split("/");
//     return segments[segments.length - 1] || "resume.pdf";
//   };

//   // Function to format date from filename
//   const getFormattedDate = (path: string) => {
//     const filename = getFileName(path);
//     const parts = filename.split("-");

//     if (parts.length >= 3) {
//       const dateStr = parts[1];
//       const timeStr = parts[2];

//       if (dateStr && dateStr.length === 8 && timeStr && timeStr.length === 4) {
//         const day = dateStr.substring(0, 2);
//         const month = dateStr.substring(2, 4);
//         const year = dateStr.substring(4, 8);
//         const hour = timeStr.substring(0, 2);
//         const minute = timeStr.substring(2, 4);

//         return `${day}/${month}/${year} ${hour}:${minute}`;
//       }
//     }

//     // Try to parse timestamp from old format
//     const timestampMatch = filename.match(/^(\d+)-/);
//     if (timestampMatch) {
//       const timestamp = parseInt(timestampMatch[1]);
//       if (!isNaN(timestamp)) {
//         const date = new Date(timestamp);
//         return date.toLocaleDateString("en-GB") + " " +
//           date.toLocaleTimeString("en-GB", {
//             hour: '2-digit',
//             minute: '2-digit',
//             hour12: false
//           });
//       }
//     }

//     // Check if it's a regular timestamp
//     const pureTimestamp = parseInt(filename);
//     if (!isNaN(pureTimestamp) && pureTimestamp > 1000000000000) {
//       const date = new Date(pureTimestamp);
//       return date.toLocaleDateString("en-GB") + " " +
//         date.toLocaleTimeString("en-GB", {
//           hour: '2-digit',
//           minute: '2-digit',
//           hour12: false
//         });
//     }

//     return "Unknown date";
//   };

//   // Handle delete click
//   const handleDelete = async (path: string, e: React.MouseEvent) => {
//     e.stopPropagation();

//     if (!confirm(`Are you sure you want to delete "${getFileName(path)}"? This action cannot be undone.`)) {
//       return;
//     }

//     setDeleting(prev => ({ ...prev, [path]: true }));

//     try {
//       const result = await onDeleteResume(path, leadId);

//       if (!result.success) {
//         alert(result.message || "Failed to delete resume");
//       }
//     } catch (error: any) {
//       console.error("Delete error:", error);
//       alert(error.message || "An error occurred while deleting");
//     } finally {
//       setDeleting(prev => ({ ...prev, [path]: false }));
//     }
//   };

//   // Handle download click
//   const handleDownload = (path: string) => {
//     onResumeSelect(path);
//     onOpenChange(false);
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-2xl w-full" onPointerDownOutside={(e) => e.preventDefault()}>
//         <DialogHeader>
//           <DialogTitle>Manage Resumes</DialogTitle>
//           <DialogDescription>
//             {currentResumes.length} resume{currentResumes.length !== 1 ? 's' : ''} available for {leadId}
//           </DialogDescription>
//         </DialogHeader>

//         <div className="max-h-96 overflow-y-auto space-y-2 py-2">
//           {currentResumes.map((path, index) => {
//             const formattedDate = getFormattedDate(path);
//             const [datePart, timePart] = formattedDate.split(' ');

//             return (
//               <div
//                 key={index}
//                 className="group flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
//               >
//                 <div
//                   className="flex-1 flex items-start space-x-3 cursor-pointer"
//                   onClick={() => handleDownload(path)}
//                 >
//                   <div className="bg-blue-100 p-2 rounded-md flex-shrink-0">
//                     <FileText className="h-5 w-5 text-blue-600" />
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <div className="font-medium text-sm truncate" title={getFileName(path)}>
//                       {getFileName(path)}
//                     </div>
//                     <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
//                       {datePart && (
//                         <span className="flex items-center">
//                           <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
//                           <span>{datePart}</span>
//                         </span>
//                       )}
//                       {timePart && (
//                         <span className="flex items-center">
//                           <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
//                           <span>{timePart}</span>
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="flex items-center space-x-1 ml-2">
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => handleDownload(path)}
//                     title="Download"
//                     className="h-8 w-8 p-0"
//                   >
//                     <Download className="h-4 w-4" />
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
//                     onClick={(e) => handleDelete(path, e)}
//                     title="Delete"
//                     disabled={deleting[path]}
//                   >
//                     {deleting[path] ? (
//                       <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
//                     ) : (
//                       <Trash2 className="h-4 w-4" />
//                     )}
//                   </Button>
//                 </div>
//               </div>
//             );
//           })}

//           {currentResumes.length === 0 && (
//             <div className="text-center py-8 text-gray-500">
//               No resumes found for this lead.
//             </div>
//           )}
//         </div>

//         <DialogFooter className="gap-2">
//           <Button
//             variant="outline"
//             onClick={() => onOpenChange(false)}
//           >
//             Close
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// // Google Drive Link Selector Dialog
// interface DriveLinkSelectorDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   leadId: string;
//   links: string[];
//   onAddLink: () => void;
//   onDeleteLink: (link: string) => Promise<void>;
//   onDownloadLink: (link: string) => void;
// }

// const DriveLinkSelectorDialog = ({
//   open,
//   onOpenChange,
//   leadId,
//   links,
//   onAddLink,
//   onDeleteLink,
//   onDownloadLink,
// }: DriveLinkSelectorDialogProps) => {
//   const [deleting, setDeleting] = useState<Record<string, boolean>>({});

//   const handleDelete = async (link: string) => {
//     if (!confirm("Are you sure you want to delete this link?")) return;
//     setDeleting(prev => ({ ...prev, [link]: true }));
//     try {
//       await onDeleteLink(link);
//     } finally {
//       setDeleting(prev => ({ ...prev, [link]: false }));
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-2xl w-full" onPointerDownOutside={(e) => e.preventDefault()}>
//         <DialogHeader>
//           <DialogTitle>Manage Google Drive Links</DialogTitle>
//           <DialogDescription>
//             {links.length} link{links.length !== 1 ? 's' : ''} available for {leadId}
//           </DialogDescription>
//         </DialogHeader>

//         <div className="max-h-96 overflow-y-auto space-y-2 py-2">
//           {links.map((link, index) => (
//             <div
//               key={index}
//               className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
//             >
//               <div className="flex-1 min-w-0 mr-4">
//                 <div className="text-sm font-medium truncate" title={link}>
//                   {link}
//                 </div>
//               </div>
//               <div className="flex items-center space-x-1">
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   onClick={() => onDownloadLink(link)}
//                   title="Open Link"
//                 >
//                   <Download className="h-4 w-4" />
//                 </Button>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   className="text-red-500 hover:text-red-700"
//                   onClick={() => handleDelete(link)}
//                   disabled={deleting[link]}
//                 >
//                   {deleting[link] ? (
//                     <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
//                   ) : (
//                     <Trash2 className="h-4 w-4" />
//                   )}
//                 </Button>
//               </div>
//             </div>
//           ))}
//         </div>

//         <DialogFooter className="gap-2">
//           <Button variant="secondary" onClick={onAddLink}>
//             Add New
//           </Button>
//           <Button variant="outline" onClick={() => onOpenChange(false)}>
//             Close
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// // Add Google Drive Link Dialog
// interface AddDriveLinkDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onSubmit: (link: string) => Promise<void>;
// }

// const AddDriveLinkDialog = ({ open, onOpenChange, onSubmit }: AddDriveLinkDialogProps) => {
//   const [link, setLink] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async () => {
//     if (!link.trim()) return;
//     setLoading(true);
//     try {
//       await onSubmit(link);
//       setLink("");
//       onOpenChange(false);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
//         <DialogHeader>
//           <DialogTitle>Add Google Drive Link</DialogTitle>
//           <DialogDescription>Enter the Google Drive link for this client.</DialogDescription>
//         </DialogHeader>
//         <div className="py-4">
//           <Input
//             placeholder="https://drive.google.com/..."
//             value={link}
//             onChange={(e) => setLink(e.target.value)}
//           />
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
//             Cancel
//           </Button>
//           <Button onClick={handleSubmit} disabled={loading}>
//             {loading ? "Adding..." : "Add Link"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// /* =========================
//    Main Page Component
//    ========================= */



// export default function JobBoardClientsPage() {
//   const router = useRouter();
//   const { user } = useAuth();


//   const [loading, setLoading] = useState(true);
//   const [rows, setRows] = useState<SalesClosure[]>([]);
//   const [resumeTeamMembers, setResumeTeamMembers] = useState<TeamMember[]>([]);
//   const [assigneeFilter, setAssigneeFilter] = useState<string>("__all__");


//   // file upload
//   const fileRef = useRef<HTMLInputElement | null>(null);
//   const [uploadForLead, setUploadForLead] = useState<string | null>(null);
//   const [replacingOldPath, setReplacingOldPath] = useState<string | null>(null);


//   // Requirements dialog
//   const [reqDialogOpen, setReqDialogOpen] = useState(false);
//   const [reqRow, setReqRow] = useState<SalesClosure | null>(null);


//   const [showMyTasks, setShowMyTasks] = useState(false);

//   // Resume selector dialog
//   const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
//   const [selectedLeadForResume, setSelectedLeadForResume] = useState<string>("");
//   const [selectedLeadResumes, setSelectedLeadResumes] = useState<string[]>([]);



//   // Pagination
//   const [page, setPage] = useState(1);
//   const [limit, setLimit] = useState(30);
//   const [totalRows, setTotalRows] = useState(0);


//   // Search
//   const [searchText, setSearchText] = useState("");
//   const [searchQuery, setSearchQuery] = useState(""); // actual query on Enter

//   // Google Drive Link state
//   const [driveLinkSelectorOpen, setDriveLinkSelectorOpen] = useState(false);
//   const [addDriveLinkOpen, setAddDriveLinkOpen] = useState(false);
//   const [currentLeadForDrive, setCurrentLeadForDrive] = useState<string | null>(null);
//   const [currentDriveLinks, setCurrentDriveLinks] = useState<string[]>([]);


//   /* =========================
//      Role gate + initial load
//      ========================= */


//   useEffect(() => {
//     if (user === null) return;
//     const allowed = ["Super Admin", "Resume Head", "Resume Associate"] as const;
//     if (!user || !allowed.includes(user.role as any)) {
//       router.push("/unauthorized");
//       return;
//     }
//     Promise.all([fetchTeamMembers(), fetchData(1, limit, "", false, "__all__")]).finally(() =>
//       setLoading(false)
//     );


//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [user]);


//   /* =========================
//      Fetch helpers
//      ========================= */


//   const fetchTeamMembers = async () => {
//     let members: TeamMember[] = [];


//     try {
//       const { data, error } = await supabase
//         .from("users")
//         .select("id,name,email,role")
//         .in("role", ["Resume Head", "Resume Associate"]);


//       if (!error && data) members = data as TeamMember[];
//     } catch {
//       // ignore
//     }


//     if (!members.length) {
//       try {
//         const { data, error } = await supabase
//           .from("profiles")
//           .select("user_id,full_name,user_email,roles")
//           .in("roles", ["Resume Head", "Resume Associate"]);


//         if (!error && data) {
//           members = (data as any[]).map((d) => ({
//             id: d.user_id,
//             name: d.full_name ?? null,
//             email: d.user_email ?? null,
//             role: d.roles ?? null,
//           }));
//         }
//       } catch {
//         // ignore
//       }
//     }


//     setResumeTeamMembers(members);
//   };


//   const fetchData = async (
//     newPage = page,
//     newLimit = limit,
//     activeSearch = searchQuery,
//     overrideShowMyTasks?: boolean,
//     overrideAssigneeFilter?: string
//   ) => {
//     try {
//       setLoading(true);


//       const from = (newPage - 1) * newLimit;
//       const to = from + newLimit - 1;


//       let query = supabase
//         // .from("full_client_status_excluding_oldest")
//         .from('full_client_status_pending_jobboard')
//         .select("*", { count: "exact" });


//       // 🔍 Apply server-side search
//       if (activeSearch.trim() !== "") {
//         query = query.or(
//           `lead_id.ilike.%${activeSearch}%,lead_name.ilike.%${activeSearch}%,email.ilike.%${activeSearch}%,company_application_email.ilike.%${activeSearch}%`
//         );
//       }


//       const myTasks = overrideShowMyTasks ?? showMyTasks;



//       // 🔥 My Tasks filter
//       if (myTasks && user?.email) {
//         query = query.eq("resume_assigned_email", user.email);
//       }

//       // Apply assignee filter
//       const assigneeFilterToUse = overrideAssigneeFilter ?? assigneeFilter;
//       if (assigneeFilterToUse !== "__all__") {
//         if (assigneeFilterToUse === "__none__") {
//           // Show unassigned
//           query = query.is("resume_assigned_email", null);
//         } else {
//           // Show specific assignee
//           query = query.eq("resume_assigned_email", assigneeFilterToUse);
//         }
//       }


//       query = query
//         .order("closed_at", { ascending: false })
//         .range(from, to);


//       const { data, error, count } = await query;


//       if (error) throw error;


//       // Fetch Google Drive links from resume_progress
//       const { data: driveLinksData, error: driveError } = await supabase
//         .from("resume_progress")
//         .select("lead_id, google_drive_resume_link")
//         .in("lead_id", data ? data.map(r => r.lead_id) : []);

//       if (driveError) {
//         console.error("Error fetching drive links:", driveError);
//       }

//       const driveLinksMap = new Map();
//       driveLinksData?.forEach(item => {
//         driveLinksMap.set(item.lead_id, item.google_drive_resume_link);
//       });


//       setTotalRows(count ?? 0);


//       const formatted: SalesClosure[] = (data as any[]).map((r) => {
//         const onboardRaw = r.onboarded_date ?? null;
//         const portfolioPaid =
//           r.portfolio_sale_value && Number(r.portfolio_sale_value) > 0;


//         return {
//           id: String(r.sale_id),
//           lead_id: r.lead_id,
//           email: r.email,
//           company_application_email: r.company_application_email ?? null,
//           finance_status: r.finance_status ?? "Unpaid",
//           closed_at: r.closed_at ?? null,
//           onboarded_date_raw: onboardRaw,
//           onboarded_date_label: formatOnboardLabel(onboardRaw),
//           application_sale_value: r.application_sale_value ?? null,
//           resume_sale_value: r.resume_sale_value ?? null,
//           portfolio_sale_value: r.portfolio_sale_value ?? null,
//           job_board_value: r.job_board_value ?? null,
//           commitments: r.commitments ?? null,
//           data_sent_to_customer_dashboard: r.data_sent_to_customer_dashboard ?? null,
//           leads: {
//             name: r.lead_name ?? "-",
//             phone: r.phone_number ?? "-",
//           },
//           rp_status: r.resume_status ?? "not_started",
//           rp_pdf_path: (() => {
//             let pdfPaths: string[] = [];
//             if (r.resume_pdf) {
//               try {
//                 if (typeof r.resume_pdf === 'string' && r.resume_pdf.startsWith('{')) {
//                   pdfPaths = r.resume_pdf.replace(/[{}]/g, '').split(',');
//                 } else if (Array.isArray(r.resume_pdf)) {
//                   pdfPaths = r.resume_pdf;
//                 } else {
//                   pdfPaths = [r.resume_pdf];
//                 }
//               } catch {
//                 pdfPaths = [r.resume_pdf];
//               }
//             }
//             return pdfPaths;
//           })(),
//           assigned_to_email: r.resume_assigned_email ?? null,
//           assigned_to_name: r.resume_assigned_name ?? null,
//           pp_status: r.portfolio_status ?? null,
//           pp_assigned_email: r.portfolio_assigned_email ?? null,
//           pp_assigned_name: r.portfolio_assigned_name ?? null,
//           pp_link: r.portfolio_link ?? null,
//           portfolio_paid: portfolioPaid,
//           google_drive_resume_link: driveLinksMap.get(r.lead_id) ?? [],
//         };
//       });


//       setRows(formatted);
//     } catch (e) {
//       console.error(e);
//       setRows([]);
//     } finally {
//       setLoading(false);
//     }
//   };


//   const updateDriveLinks = async (leadId: string, links: string[]) => {
//     try {
//       // 1. Update Supabase
//       const { error: dbError } = await supabase
//         .from("resume_progress")
//         .upsert(
//           {
//             lead_id: leadId,
//             google_drive_resume_link: links,
//             updated_at: new Date().toISOString(),
//           },
//           { onConflict: "lead_id" }
//         );

//       if (dbError) throw dbError;

//       // 2. Refresh data
//       await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);

//       // Update local state for dialog if open
//       if (currentLeadForDrive === leadId) {
//         setCurrentDriveLinks(links);
//       }


//       // 3. Call external API for the last link added (if any)
//       if (links.length > 0) {
//         try {
//           // Get the current row data for this lead
//           const currentRow = rows.find(r => r.lead_id === leadId);

//           // Prepare payload for the new ticketingtoolapplywizz API
//           const payload: any = {
//             applywizz_id: leadId,
//             google_drive_resume_link: [...links].reverse(),
//           };

//           // Add full_name if available
//           if (currentRow?.leads?.name) {
//             payload.full_name = currentRow.leads.name;
//           }

//           // Add company_email if available
//           if (currentRow?.company_application_email) {
//             payload.company_email = currentRow.company_application_email;
//           } else if (currentRow?.email) {
//             payload.company_email = currentRow.email;
//           }

//           // Call the new ticketingtoolapplywizz API
//           await fetch('https://ticketingtoolapplywizz.vercel.app/api/sync-client', {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               "Authorization": `Bearer ${process.env.NEXT_PUBLIC_TICKET_API_KEY}`
//             },
//             body: JSON.stringify(payload),
//           });
//         } catch (apiErr) {
//           console.error("External API update failed:", apiErr);
//         }
//       }
//     } catch (err: any) {
//       alert(err.message || "Failed to update drive links");
//     }
//   };



//   /* =========================
//      Resume status & assignee
//      ========================= */


//   const updateStatus = async (leadId: string, status: ResumeStatus) => {
//     const { error } = await supabase
//       .from("resume_progress")
//       .upsert({ lead_id: leadId, status }, { onConflict: "lead_id" });
//     if (error) throw error;
//   };


//   const updateAssignedTo = async (
//     leadId: string,
//     email: string | null,
//     name?: string | null,
//   ) => {
//     const { data: existingRows, error: findErr } = await supabase
//       .from("resume_progress")
//       .select("id")
//       .eq("lead_id", leadId);


//     if (findErr) throw findErr;


//     if (existingRows && existingRows.length > 0) {
//       const { error: updErr } = await supabase
//         .from("resume_progress")
//         .update({ assigned_to_email: email, assigned_to_name: name ?? null })
//         .eq("lead_id", leadId);
//       if (updErr) throw updErr;
//     } else {
//       const { error: insErr } = await supabase
//         .from("resume_progress")
//         .insert({
//           lead_id: leadId,
//           assigned_to_email: email,
//           assigned_to_name: name ?? null,
//         });
//       if (insErr) throw insErr;
//     }
//   };


//   const onChangeStatus = async (row: SalesClosure, newStatus: ResumeStatus) => {
//     try {
//       await updateStatus(row.lead_id, newStatus);


//       if (newStatus === "completed" && (!row.rp_pdf_path || (Array.isArray(row.rp_pdf_path) && row.rp_pdf_path.length === 0))) {
//         setUploadForLead(row.lead_id);
//         setReplacingOldPath(null);
//         fileRef.current?.click();
//       } else {
//         setRows((rs) =>
//           rs.map((r) =>
//             r.lead_id === row.lead_id ? { ...r, rp_status: newStatus } : r,
//           ),
//         );
//       }
//     } catch (e: any) {
//       alert(e.message || "Failed to update status");
//     }
//   };


//   /* =========================
//      Resume upload & download
//      ========================= */


//   const uploadOrReplaceResume = async (leadId: string, file: File) => {
//     if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
//       throw new Error("Only PDF files are allowed");
//     }

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("lead_id", leadId);

//     const res = await fetch("/api/resumes/upload", {
//       method: "POST",
//       body: formData,
//     });

//     const data = await res.json();
//     if (!res.ok) {
//       console.error("Upload failed:", data);
//       throw new Error(data.error || "Upload failed");
//     }

//     const { data: existingRecord, error: fetchError } = await supabase
//       .from("resume_progress")
//       .select("pdf_path, status")
//       .eq("lead_id", leadId)
//       .maybeSingle();

//     if (fetchError && fetchError.code !== 'PGRST116') {
//       console.error("Error fetching existing record:", fetchError);
//       throw new Error(fetchError.message || "Failed to fetch existing resumes");
//     }

//     const existingPaths = existingRecord?.pdf_path || [];
//     const newPaths = [...existingPaths, data.key];

//     const { error: dbError } = await supabase
//       .from("resume_progress")
//       .upsert(
//         {
//           lead_id: leadId,
//           status: "completed",
//           pdf_path: newPaths,
//           pdf_uploaded_at: new Date().toISOString(),
//           updated_at: new Date().toISOString(),
//         },
//         { onConflict: "lead_id" }
//       );

//     if (dbError) {
//       console.error("DB UPSERT ERROR resume_progress:", dbError);
//       throw new Error(dbError.message || "Failed to update database");
//     }

//     return {
//       key: data.key,
//       publicUrl: data.publicUrl,
//       totalResumes: newPaths.length,
//       allResumes: newPaths
//     };
//   };


//   // Delete resume function
//   const deleteResume = async (path: string, leadId: string) => {
//     try {
//       // 1. Delete from S3 if it's a CRM file
//       if (path.startsWith("CRM")) {
//         const deleteRes = await fetch("/api/resumes/delete", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ key: path }),
//         });

//         if (!deleteRes.ok) {
//           const errData = await deleteRes.json().catch(() => ({}));
//           throw new Error(
//             errData?.error ||
//             `Failed to delete resume from S3: ${deleteRes.status}`
//           );
//         }
//       } else {
//         // Delete from Supabase Storage
//         const { error } = await supabase.storage
//           .from(BUCKET)
//           .remove([path]);

//         if (error) {
//           throw new Error(`Failed to delete from storage: ${error.message}`);
//         }
//       }

//       // 2. Remove from database array
//       const { data: existingRecord, error: fetchError } = await supabase
//         .from("resume_progress")
//         .select("pdf_path")
//         .eq("lead_id", leadId)
//         .single();

//       if (fetchError) throw fetchError;

//       const existingPaths = existingRecord?.pdf_path || [];
//       const updatedPaths = existingPaths.filter((p: string) => p !== path);

//       // 3. Update database
//       const { error: updateError } = await supabase
//         .from("resume_progress")
//         .update({
//           pdf_path: updatedPaths,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("lead_id", leadId);

//       if (updateError) throw updateError;

//       // 4. Refresh the data
//       await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);

//       return { success: true, message: "Resume deleted successfully" };
//     } catch (error: any) {
//       console.error("Delete resume error:", error);
//       return {
//         success: false,
//         message: error.message || "Failed to delete resume"
//       };
//     }
//   };

//   const downloadResume = async (path: string) => {
//     try {
//       if (path.startsWith("CRM")) {
//         const base = "https://applywizz-prod.s3.us-east-2.amazonaws.com";
//         const fileUrl = `${base}/${path}`;
//         window.open(`${fileUrl}`, "_blank");
//       } else {
//         const segments = (path || "").split("/");
//         const fileName = segments[segments.length - 1] || "resume.pdf";
//         const { data, error } = await supabase.storage
//           .from(BUCKET)
//           .createSignedUrl(path, 60 * 60);
//         if (error) throw error;
//         if (!data?.signedUrl) throw new Error("No signed URL");
//         const res = await fetch(data.signedUrl);
//         if (!res.ok) throw new Error("Download failed");
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

//   const handleOnboardClick = (leadId: string) => {
//     window.open(`/resumeTeam/onboarding/${leadId}`, '_blank');
//   };

//   // Function to handle opening resume selector dialog
//   const handleOpenResumeSelector = (leadId: string, pdfPaths: string[] | string | null) => {
//     let paths: string[] = [];

//     if (Array.isArray(pdfPaths)) {
//       paths = pdfPaths;
//     } else if (typeof pdfPaths === 'string') {
//       paths = [pdfPaths];
//     }

//     setSelectedLeadForResume(leadId);
//     setSelectedLeadResumes(paths);
//     setResumeDialogOpen(true);
//   };

//   // Function to get resume count text
//   const getResumeCountText = (pdfPaths: string[] | string | null) => {
//     let count = 0;

//     if (Array.isArray(pdfPaths)) {
//       count = pdfPaths.length;
//     } else if (typeof pdfPaths === 'string' && pdfPaths) {
//       count = 1;
//     }

//     return count > 0 ? `Download (${count})` : "Upload PDF";
//   };

//   const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0] || null;
//     const leadId = uploadForLead;
//     const oldPath = replacingOldPath;

//     e.target.value = "";
//     setUploadForLead(null);
//     setReplacingOldPath(null);

//     if (!file || !leadId) return;

//     try {
//       await uploadOrReplaceResume(leadId, file);

//       await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);
//       alert("PDF uploaded.");
//     } catch (err: any) {
//       alert(err.message || "Upload failed");
//       await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);
//     }
//   };




//   /* =========================
//      Sorting (optional)
//      ========================= */


//   type SortKey = "clientId" | "name" | "email" | "closedAt" | "onboarded";
//   type SortDir = "asc" | "desc";


//   const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({
//     key: "closedAt",
//     dir: "desc",
//   });


//   const toggleSort = (key: SortKey) => {
//     setSort((s) =>
//       s.key === key
//         ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
//         : { key, dir: "asc" },
//     );
//   };


//   const parseClientIdNum = (id?: string | null) => {
//     if (!id) return -Infinity;
//     const m = id.match(/(\d+)$/);
//     return m ? Number(m[1]) : -Infinity;
//   };


//   const dateToMs = (d?: string | null) =>
//     d ? new Date(d).getTime() : -Infinity;


//   const safeStr = (s?: string | null) => (s ?? "").toLowerCase();


//   const cmp = (a: number | string, b: number | string) =>
//     a < b ? -1 : a > b ? 1 : 0;


//   const sortRowsBy = (arr: SalesClosure[]) => {
//     if (!sort.key) return arr;
//     const copy = [...arr];
//     copy.sort((A, B) => {
//       let vA: number | string;
//       let vB: number | string;


//       switch (sort.key) {
//         case "clientId":
//           vA = parseClientIdNum(A.lead_id);
//           vB = parseClientIdNum(B.lead_id);
//           break;
//         case "name":
//           vA = safeStr(A.leads?.name);
//           vB = safeStr(B.leads?.name);
//           break;
//         case "email":
//           vA = safeStr(A.email);
//           vB = safeStr(B.email);
//           break;
//         case "closedAt":
//           vA = dateToMs(A.closed_at);
//           vB = dateToMs(B.closed_at);
//           break;
//         case "onboarded":
//           vA = dateToMs(A.onboarded_date_raw);
//           vB = dateToMs(B.onboarded_date_raw);
//           break;
//         default:
//           vA = 0;
//           vB = 0;
//       }
//       const base = cmp(vA, vB);
//       return sort.dir === "asc" ? base : -base;
//     });
//     return copy;
//   };


//   const sortedRows = sortRowsBy(rows);


//   const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) =>
//     active ? (
//       dir === "asc" ? (
//         <ArrowUp className="ml-1 h-4 w-4" />
//       ) : (
//         <ArrowDown className="ml-1 h-4 w-4" />
//       )
//     ) : (
//       <ArrowUpDown className="ml-1 h-4 w-4 opacity-60" />
//     );


//   /* =========================
//      Render table (EXACT UI)
//      ========================= */


//   const renderTable = (data: SalesClosure[]) => (
//     <div className="rounded-md border mt-4">
//       <Table>
//         <TableHeader>
//           <TableRow>
//             <TableHead>S.No</TableHead>


//             <TableHead>
//               <button
//                 type="button"
//                 onClick={() => toggleSort("clientId")}
//                 className="inline-flex items-center"
//               >
//                 Client ID
//                 <SortIcon
//                   active={sort.key === "clientId"}
//                   dir={sort.dir}
//                 />
//               </button>
//             </TableHead>


//             <TableHead>
//               <button
//                 type="button"
//                 onClick={() => toggleSort("name")}
//                 className="inline-flex items-center"
//               >
//                 Name
//                 <SortIcon active={sort.key === "name"} dir={sort.dir} />
//               </button>
//             </TableHead>


//             <TableHead>
//               <button
//                 type="button"
//                 onClick={() => toggleSort("email")}
//                 className="inline-flex items-center"
//               >
//                 Email
//                 <SortIcon active={sort.key === "email"} dir={sort.dir} />
//               </button>
//             </TableHead>


//             <TableHead>Application email</TableHead>
//             <TableHead>Phone</TableHead>
//             <TableHead>Status</TableHead>
//             <TableHead>Resume Status</TableHead>
//             <TableHead>Assigned to</TableHead>
//             <TableHead className="text-center">Resume PDF</TableHead>
//             <TableHead className="text-center">Google Drive Link</TableHead>


//             <TableHead>
//               <button
//                 type="button"
//                 onClick={() => toggleSort("closedAt")}
//                 className="inline-flex items-center"
//               >
//                 Closed At
//                 <SortIcon
//                   active={sort.key === "closedAt"}
//                   dir={sort.dir}
//                 />
//               </button>
//             </TableHead>


//             <TableHead>
//               <button
//                 type="button"
//                 onClick={() => toggleSort("onboarded")}
//                 className="inline-flex items-center"
//               >
//                 Onboarded Date
//                 <SortIcon
//                   active={sort.key === "onboarded"}
//                   dir={sort.dir}
//                 />
//               </button>
//             </TableHead>


//             <TableHead>Portfolio Status</TableHead>
//             <TableHead>Portfolio Link</TableHead>
//             <TableHead>Portfolio Assignee</TableHead>
//             <TableHead>Client Requirements</TableHead>
//             <TableHead>Application Status</TableHead>
//             <TableHead>Onboard</TableHead>
//             {/* <TableHead>Forward to TT</TableHead> */}
//           </TableRow>
//         </TableHeader>


//         <TableBody>
//           {data.map((row, index) => (
//             <TableRow key={row.id}>
//               <TableCell className="text-center">{index + 1}</TableCell>
//               <TableCell>{row.lead_id}</TableCell>


//               <TableCell
//                 className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
//                 onClick={() =>
//                   window.open(`/leads/${row.lead_id}`, "_blank")
//                 }
//               >
//                 {row.leads?.name || "-"}
//               </TableCell>


//               <TableCell>{row.email}</TableCell>
//               <TableCell>
//                 {row.company_application_email || "not given"}
//               </TableCell>
//               <TableCell>{row.leads?.phone || "-"}</TableCell>
//               <TableCell>{row.finance_status}</TableCell>


//               {/* Resume Status */}
//               <TableCell className="min-w-[220px]">
//                 <Select
//                   value={row.rp_status || "not_started"}
//                   onValueChange={(v) =>
//                     onChangeStatus(row, v as ResumeStatus)
//                   }
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select status" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {(
//                       [
//                         "not_started",
//                         "pending",
//                         "waiting_client_approval",
//                         "completed",
//                       ] as ResumeStatus[]
//                     ).map((s) => (
//                       <SelectItem key={s} value={s}>
//                         {STATUS_LABEL[s]}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </TableCell>


//               {/* Assigned to */}
//               <TableCell className="min-w-[260px]">
//                 <Select
//                   value={row.assigned_to_email ?? "__none__"}
//                   onValueChange={async (value) => {
//                     try {
//                       const chosen =
//                         value === "__none__" ? null : value;
//                       const member =
//                         resumeTeamMembers.find(
//                           (u) => u.email === chosen,
//                         ) || null;


//                       await updateAssignedTo(
//                         row.lead_id,
//                         chosen,
//                         member?.name ?? null,
//                       );


//                       setRows((rs) =>
//                         rs.map((r) =>
//                           r.lead_id === row.lead_id
//                             ? {
//                               ...r,
//                               assigned_to_email: chosen,
//                               assigned_to_name:
//                                 member?.name ?? null,
//                             }
//                             : r,
//                         ),
//                       );
//                       // Refresh data after assignment
//                       await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);
//                     } catch (e: any) {
//                       console.error("Assign failed:", e);
//                       alert(e.message || "Failed to assign");
//                     }
//                   }}
//                   disabled={user?.role === "Resume Associate"}
//                 >
//                   <SelectTrigger className="!opacity-100 bg-muted/20 text-foreground">
//                     <SelectValue placeholder="Assign to…" />
//                   </SelectTrigger>
//                   <SelectContent className="max-h-72">
//                     <SelectItem value="__none__">Unassigned</SelectItem>
//                     {resumeTeamMembers.length === 0 ? (
//                       <SelectItem value="__disabled__" disabled>
//                         No team members found
//                       </SelectItem>
//                     ) : (
//                       resumeTeamMembers.map((u) => (
//                         <SelectItem
//                           key={u.id}
//                           value={u.email ?? ""}
//                           disabled={!u.email}
//                         >
//                           {u.name} — {u.role}
//                         </SelectItem>
//                       ))
//                     )}
//                   </SelectContent>
//                 </Select>
//               </TableCell>


//               {/* Resume PDF */}
//               <TableCell className="space-x-2 min-w-[250px] text-center">
//                 {row.rp_pdf_path && (
//                   Array.isArray(row.rp_pdf_path) ?
//                     row.rp_pdf_path.length > 0 :
//                     !!row.rp_pdf_path
//                 ) ? (
//                   <>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => handleOpenResumeSelector(row.lead_id, row.rp_pdf_path)}
//                     >
//                       {getResumeCountText(row.rp_pdf_path)}
//                     </Button>
//                     <Button
//                       variant="secondary"
//                       size="sm"
//                       onClick={() => {
//                         setUploadForLead(row.lead_id);
//                         setReplacingOldPath(null);
//                         fileRef.current?.click();
//                       }}
//                     >
//                       Add New
//                     </Button>
//                   </>
//                 ) : row.rp_status === "completed" ? (
//                   <Button
//                     size="sm"
//                     onClick={() => {
//                       setUploadForLead(row.lead_id);
//                       setReplacingOldPath(null);
//                       fileRef.current?.click();
//                     }}
//                   >
//                     Upload PDF
//                   </Button>
//                 ) : (
//                   <span className="text-gray-400 text-sm">—</span>
//                 )}
//               </TableCell>

//               {/* Google Drive Link */}
//               <TableCell className="space-x-2 min-w-[200px] text-center">
//                 {row.google_drive_resume_link && row.google_drive_resume_link.length > 0 ? (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => {
//                       setCurrentLeadForDrive(row.lead_id);
//                       setCurrentDriveLinks(row.google_drive_resume_link || []);
//                       setDriveLinkSelectorOpen(true);
//                     }}
//                   >
//                     Open ({row.google_drive_resume_link.length})
//                   </Button>
//                 ) : (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => {
//                       setCurrentLeadForDrive(row.lead_id);
//                       setAddDriveLinkOpen(true);
//                     }}
//                   >
//                     Add Link
//                   </Button>
//                 )}
//               </TableCell>


//               {/* Closed At */}
//               <TableCell>{formatDateLabel(row.closed_at)}</TableCell>


//               {/* Onboarded Date */}
//               <TableCell className="min-w-[160px]">
//                 {row.onboarded_date_raw ? (
//                   <span className="bg-green-500 text-white text-sm py-1 px-3 rounded-full">
//                     {row.onboarded_date_label}
//                   </span>
//                 ) : (
//                   <span className="bg-red-500 text-white text-sm py-1 px-3 rounded-full">
//                     not onboarded
//                   </span>
//                 )}
//               </TableCell>


//               {/* Portfolio Status */}
//               <TableCell className="min-w-[140px]">
//                 {row.portfolio_paid ? (
//                   <span className="bg-green-500 text-white text-sm py-1 px-3 rounded-full">
//                     Paid
//                   </span>
//                 ) : (
//                   <span className="bg-red-500 text-white text-sm py-1 px-3 rounded-full">
//                     Not Paid
//                   </span>
//                 )}
//               </TableCell>


//               {/* Portfolio Link */}
//               <TableCell className="max-w-[220px] truncate">
//                 {row.portfolio_paid ? (
//                   row.pp_link ? (
//                     <a
//                       href={row.pp_link}
//                       target="_blank"
//                       rel="noreferrer"
//                       className="text-blue-600 underline block truncate"
//                       title={row.pp_link}
//                     >
//                       {row.pp_link}
//                     </a>
//                   ) : row.leads?.name ? (
//                     <a
//                       href={`https://applywizz-${(row.leads?.name || "")
//                         .toLowerCase()
//                         .replace(/[^a-z0-9]/g, "")}-${(row.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
//                       target="_blank"
//                       rel="noreferrer"
//                       className="text-blue-600 underline block truncate"
//                       title={`https://applywizz-${(row.leads?.name || "")
//                         .toLowerCase()
//                         .replace(/[^a-z0-9]/g, "")}-${(row.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
//                     >
//                       {`https://applywizz-${(row.leads?.name || "")
//                         .toLowerCase()
//                         .replace(/[^a-z0-9]/g, "")}-${(row.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
//                     </a>
//                   ) : (
//                     <span className="text-gray-400 text-sm">—</span>
//                   )
//                 ) : (
//                   <span className="text-gray-400 text-sm">—</span>
//                 )}
//               </TableCell>


//               {/* Portfolio Assignee */}
//               <TableCell>
//                 {row.pp_assigned_name
//                   ? `${row.pp_assigned_name}${row.pp_assigned_email
//                     ? ` • ${row.pp_assigned_email}`
//                     : ""
//                   }`
//                   : row.pp_assigned_email || (
//                     <span className="text-gray-400 text-sm">
//                       —
//                     </span>
//                   )}
//               </TableCell>


//               {/* Commitments */}
//               <TableCell className="min-w-[140px] text-center">
//                 {row.commitments?.trim() ? (
//                   <Button
//                     className="bg-gray-900 hover:bg-gray-400 text-white"
//                     size="sm"
//                     variant="outline"
//                     onClick={() => {
//                       setReqRow(row);
//                       setReqDialogOpen(true);
//                     }}
//                   >
//                     Requirements
//                   </Button>
//                 ) : (
//                   <span className="text-gray-400 text-sm">—</span>
//                 )}
//               </TableCell>


//               {/* Application Status */}
//               <TableCell className="min-w-[140px] text-center">
//                 {Number(row.application_sale_value) > 0 ? (
//                   <span className="bg-green-500 text-white text-sm py-1 px-3 rounded-full">
//                     Paid
//                   </span>
//                 ) : (
//                   <span className="bg-red-500 text-white text-sm py-1 px-3 rounded-full">
//                     Not Paid
//                   </span>
//                 )}
//               </TableCell>


//               {/* Onboard button */}
//               <TableCell>
//                 {row.onboarded_date_raw ? (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="bg-green-600 text-white hover:bg-green-600 hover:text-white cursor-not-allowed"
//                   >
//                     Onboarded
//                   </Button>
//                 ) : (
//                   <Button
//                     onClick={() => handleOnboardClick(row.lead_id)}
//                     variant="outline"
//                     size="sm"
//                     className="bg-blue-400 text-white hover:bg-blue-600 hover:text-white"
//                   >
//                     Onboard Client
//                   </Button>
//                 )}
//               </TableCell>



//             </TableRow>
//           ))}


//           {data.length === 0 && (
//             <TableRow>
//               <TableCell
//                 colSpan={19}
//                 className="text-center text-sm text-muted-foreground py-10"
//               >
//                 No records found.
//               </TableCell>
//             </TableRow>
//           )}
//         </TableBody>
//       </Table>

//       <div className="flex items-center justify-center px-4 py-2 border-t bg-gray-50">
//         <div className="flex items-center gap-2">
//           <span className="text-sm">Page:</span>
//           <Select
//             value={String(page)}
//             onValueChange={async (val) => {
//               const newPage = Number(val);
//               setPage(newPage);
//               await fetchData(newPage, limit, searchQuery, showMyTasks, assigneeFilter);
//             }}
//           >
//             <SelectTrigger className="w-[100px]">
//               <SelectValue />
//             </SelectTrigger>


//             <SelectContent>
//               {Array.from(
//                 { length: Math.ceil(totalRows / limit) },
//                 (_, i) => i + 1
//               ).map((p) => (
//                 <SelectItem key={p} value={String(p)}>
//                   {p}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//         &nbsp;&nbsp;


//         <span className="text-sm text-gray-600">
//           Showing {(page - 1) * limit + 1}–
//           {Math.min(page * limit, totalRows)} of {totalRows}
//         </span>
//       </div>
//     </div>
//   );


//   /* =========================
//      JSX
//      ========================= */


//   return (
//     // <ProtectedRoute
//     //   allowedRoles={["Super Admin", "Resume Head", "Resume Associate"]}
//     // >
//     <DashboardLayout>
//       <input
//         ref={fileRef}
//         type="file"
//         accept="application/pdf"
//         className="hidden"
//         onChange={onFilePicked}
//       />


//       <div className="space-y-6">
//         <div className="flex items-center justify-start gap-4">
//           <h1 className="text-3xl font-bold text-gray-900">
//             Job board clients — Resume Team
//           </h1>


//           {/* Assignee filter */}
//           <div className="flex items-center gap-3">
//             <div className="text-sm font-medium">Assigned To:</div>
//             <Select
//               value={assigneeFilter}
//               onValueChange={async (val) => {
//                 setAssigneeFilter(val);
//                 setPage(1); // Reset to first page when filter changes
//                 await fetchData(1, limit, searchQuery, showMyTasks, val);
//               }}
//             >
//               <SelectTrigger className="w-[260px]">
//                 <SelectValue placeholder="All team members" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="__all__">All</SelectItem>
//                 <SelectItem value="__none__">Unassigned</SelectItem>
//                 {resumeTeamMembers.length === 0 ? (
//                   <SelectItem value="__disabled__" disabled>
//                     No team members found
//                   </SelectItem>
//                 ) : (
//                   resumeTeamMembers.map((u) => (
//                     <SelectItem
//                       key={u.id}
//                       value={(u.email ?? "").trim() || "__none__"}
//                       disabled={!u.email}
//                     >
//                       {u.name} — {u.role}
//                     </SelectItem>
//                   ))
//                 )}
//               </SelectContent>
//             </Select>
//           </div>
//           {/* Pagination Controls */}
//           <div className="flex items-center gap-4">

//             <div className="flex items-center gap-2">
//               <span className="text-sm">Rows per page:</span>
//               <Select
//                 value={String(limit)}
//                 onValueChange={async (val) => {
//                   const newLimit = Number(val);
//                   setLimit(newLimit);
//                   setPage(1); // reset page
//                   await fetchData(1, newLimit, searchQuery, showMyTasks, assigneeFilter);
//                 }}
//               >
//                 <SelectTrigger className="w-[80px]">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="30">30 per page</SelectItem>
//                   <SelectItem value="50">50 per page</SelectItem>
//                   <SelectItem value="100">100 per page</SelectItem>
//                   <SelectItem value="200">200 per page</SelectItem>
//                   <SelectItem value="500">500 per page</SelectItem>
//                   <SelectItem value="1000">1000 per page</SelectItem>
//                   <SelectItem value="2000">2000 per page</SelectItem>




//                 </SelectContent>
//               </Select>
//             </div>


//           </div>


//         </div>
//         <div className="flex flex-auto">
//           <div className="flex items-center gap-3 w-full max-w-lg">
//             <Input
//               placeholder="Search by Lead ID, Name or Email"
//               value={searchText}
//               onChange={(e) => setSearchText(e.target.value)}
//               onKeyDown={async (e) => {
//                 if (e.key === "Enter") {
//                   setSearchQuery(searchText);
//                   setPage(1);
//                   await fetchData(1, limit, searchText, showMyTasks, assigneeFilter);
//                 }
//               }}
//             />
//             <Button
//               onClick={async () => {
//                 setSearchQuery(searchText);
//                 setPage(1);
//                 await fetchData(1, limit, searchText, showMyTasks, assigneeFilter);
//               }}
//             >
//               Search
//             </Button>


//             <Button
//               variant={showMyTasks ? "default" : "outline"}
//               className={showMyTasks ? "bg-blue-600 text-white" : ""}
//               onClick={async () => {
//                 const newValue = !showMyTasks;
//                 setShowMyTasks(newValue);
//                 setPage(1);
//                 await fetchData(1, limit, searchQuery, newValue, assigneeFilter);
//               }}
//             >
//               {showMyTasks ? "Show All" : "My Tasks"}
//             </Button>






//           </div>
//           <span className="text-green-500 gap-3 mt-2 ml-4 font-semibold">Total Rows : {totalRows}</span>


//         </div>


//         {loading ? (
//           <p className="p-6 text-gray-600">Loading...</p>
//         ) : (
//           renderTable(sortedRows)
//         )}
//       </div>


//       {/* Requirements Dialog */}
//       <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
//         <DialogContent
//           className="max-w-3xl"
//           onPointerDownOutside={(e) => e.preventDefault()}
//         >
//           <DialogHeader>
//             <DialogTitle>
//               Requirements — {reqRow?.lead_id ?? ""}
//             </DialogTitle>
//             <DialogDescription>
//               Commitment details captured at sale closure.
//             </DialogDescription>
//           </DialogHeader>


//           <div className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//               <div>
//                 <div className="text-xs text-muted-foreground">
//                   Lead ID
//                 </div>
//                 <div className="font-medium">
//                   {reqRow?.lead_id ?? "—"}
//                 </div>
//               </div>
//               <div>
//                 <div className="text-xs text-muted-foreground">
//                   Name
//                 </div>
//                 <div className="font-medium">
//                   {reqRow?.leads?.name ?? "—"}
//                 </div>
//               </div>
//               <div>
//                 <div className="text-xs text-muted-foreground">
//                   Email
//                 </div>
//                 <div className="font-medium break-all">
//                   {reqRow?.email ?? "—"}
//                 </div>
//               </div>
//               <div>
//                 <div className="text-xs text-muted-foreground">
//                   Closed At
//                 </div>
//                 <div className="font-medium">
//                   {reqRow?.closed_at
//                     ? new Date(
//                       reqRow.closed_at,
//                     ).toLocaleDateString("en-GB")
//                     : "—"}
//                 </div>
//               </div>
//             </div>


//             <div>
//               <div className="text-xs text-muted-foreground mb-1">
//                 Commitments
//               </div>
//               <div className="rounded-md border bg-muted/30 p-3 max-h-[50vh] overflow-y-auto whitespace-pre-wrap">
//                 {reqRow?.commitments?.trim()
//                   ? reqRow.commitments
//                   : "—"}
//               </div>
//             </div>
//           </div>


//           <DialogFooter className="gap-2">
//             <Button
//               variant="outline"
//               onClick={async () => {
//                 try {
//                   await navigator.clipboard.writeText(
//                     reqRow?.commitments ?? "",
//                   );
//                 } catch {
//                   // ignore
//                 }
//               }}
//             >
//               Copy Text
//             </Button>
//             <Button onClick={() => setReqDialogOpen(false)}>Close</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Resume Selector Dialog */}
//       <ResumeSelectorDialog
//         open={resumeDialogOpen}
//         onOpenChange={setResumeDialogOpen}
//         leadId={selectedLeadForResume}
//         currentResumes={selectedLeadResumes}
//         onResumeSelect={downloadResume}
//         onDeleteResume={deleteResume}
//       />

//       <DriveLinkSelectorDialog
//         open={driveLinkSelectorOpen}
//         onOpenChange={setDriveLinkSelectorOpen}
//         leadId={currentLeadForDrive || ""}
//         links={currentDriveLinks}
//         onAddLink={() => {
//           setDriveLinkSelectorOpen(false);
//           setAddDriveLinkOpen(true);
//         }}
//         onDeleteLink={async (link) => {
//           if (currentLeadForDrive) {
//             const newLinks = currentDriveLinks.filter(l => l !== link);
//             await updateDriveLinks(currentLeadForDrive, newLinks);
//           }
//         }}
//         onDownloadLink={(link) => window.open(link, "_blank")}
//       />

//       <AddDriveLinkDialog
//         open={addDriveLinkOpen}
//         onOpenChange={setAddDriveLinkOpen}
//         onSubmit={async (newLink) => {
//           if (currentLeadForDrive) {
//             const newLinks = [...currentDriveLinks, newLink];
//             await updateDriveLinks(currentLeadForDrive, newLinks);
//           }
//         }}
//       />


//     </DashboardLayout>
//   );
// }










"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


import { ArrowUpDown, ArrowUp, ArrowDown, Download, Calendar, Clock, FileText, Trash2 } from "lucide-react";


import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/components/providers/auth-provider";


/* =========================
   Types & Labels
   ========================= */


type FinanceStatus = "Paid" | "Unpaid" | "Paused" | "Closed" | "Got Placed";


type ResumeStatus =
  | "not_started"
  | "pending"
  | "waiting_client_approval"
  | "completed";


const STATUS_LABEL: Record<ResumeStatus, string> = {
  not_started: "Not started",
  pending: "Pending",
  waiting_client_approval: "Waiting for Client approval",
  completed: "Completed",
};


type PortfolioStatus =
  | "not_started"
  | "pending"
  | "waiting_client_approval"
  | "success";


type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};


interface SalesClosure {
  id: string;
  lead_id: string;
  email: string;
  company_application_email: string | null;
  finance_status: FinanceStatus;
  closed_at: string | null;
  onboarded_date_raw: string | null;
  onboarded_date_label: string;
  application_sale_value: number | null;
  resume_sale_value: number | null;
  portfolio_sale_value: number | number | null;
  job_board_value: number | null;
  commitments?: string | null;
  badge_value?: number | null;
  data_sent_to_customer_dashboard?: string | null;


  // joined lead data
  leads?: { name: string; phone: string };


  // resume_progress (from view)
  rp_status: ResumeStatus;
  rp_pdf_path: string[] | string | null;
  assigned_to_email: string | null;
  assigned_to_name: string | null;



  // portfolio_progress
  pp_status: PortfolioStatus | null;
  pp_assigned_email: string | null;
  pp_assigned_name: string | null;
  pp_link: string | null;


  portfolio_paid: boolean;
  google_drive_resume_link: string[] | null;
}


/* =========================
   Small helpers
   ========================= */


const formatDateLabel = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB") : "-";


const formatOnboardLabel = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB") : "Not Started";


const csvFromArray = (arr?: string[] | null) =>
  arr && arr.length ? arr.join(", ") : "";


const csvToArray = (s: string) =>
  s.split(",").map((v) => v.trim()).filter(Boolean);


const BUCKET = "resumes";


const ensurePdf = (file: File) => {
  if (file.type !== "application/pdf")
    throw new Error("Please select a PDF file.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Max file size is 20MB.");
};


// Resume Selector Dialog Component
interface ResumeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentResumes: string[];
  onResumeSelect: (path: string) => void;
  onDeleteResume: (path: string, leadId: string) => Promise<{ success: boolean; message: string }>;
}

const ResumeSelectorDialog = ({
  open,
  onOpenChange,
  leadId,
  currentResumes,
  onResumeSelect,
  onDeleteResume,
}: ResumeSelectorDialogProps) => {
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // Function to extract filename from path
  const getFileName = (path: string) => {
    const segments = path.split("/");
    return segments[segments.length - 1] || "resume.pdf";
  };

  // Function to format date from filename
  const getFormattedDate = (path: string) => {
    const filename = getFileName(path);
    const parts = filename.split("-");

    if (parts.length >= 3) {
      const dateStr = parts[1];
      const timeStr = parts[2];

      if (dateStr && dateStr.length === 8 && timeStr && timeStr.length === 4) {
        const day = dateStr.substring(0, 2);
        const month = dateStr.substring(2, 4);
        const year = dateStr.substring(4, 8);
        const hour = timeStr.substring(0, 2);
        const minute = timeStr.substring(2, 4);

        return `${day}/${month}/${year} ${hour}:${minute}`;
      }
    }

    // Try to parse timestamp from old format
    const timestampMatch = filename.match(/^(\d+)-/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]);
      if (!isNaN(timestamp)) {
        const date = new Date(timestamp);
        return date.toLocaleDateString("en-GB") + " " +
          date.toLocaleTimeString("en-GB", {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
      }
    }

    // Check if it's a regular timestamp
    const pureTimestamp = parseInt(filename);
    if (!isNaN(pureTimestamp) && pureTimestamp > 1000000000000) {
      const date = new Date(pureTimestamp);
      return date.toLocaleDateString("en-GB") + " " +
        date.toLocaleTimeString("en-GB", {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
    }

    return "Unknown date";
  };

  // Handle delete click
  const handleDelete = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${getFileName(path)}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(prev => ({ ...prev, [path]: true }));

    try {
      const result = await onDeleteResume(path, leadId);

      if (!result.success) {
        alert(result.message || "Failed to delete resume");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(error.message || "An error occurred while deleting");
    } finally {
      setDeleting(prev => ({ ...prev, [path]: false }));
    }
  };

  // Handle download click
  const handleDownload = (path: string) => {
    onResumeSelect(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Manage Resumes</DialogTitle>
          <DialogDescription>
            {currentResumes.length} resume{currentResumes.length !== 1 ? 's' : ''} available for {leadId}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-2 py-2">
          {currentResumes.map((path, index) => {
            const formattedDate = getFormattedDate(path);
            const [datePart, timePart] = formattedDate.split(' ');

            return (
              <div
                key={index}
                className="group flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div
                  className="flex-1 flex items-start space-x-3 cursor-pointer"
                  onClick={() => handleDownload(path)}
                >
                  <div className="bg-blue-100 p-2 rounded-md flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" title={getFileName(path)}>
                      {getFileName(path)}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                      {datePart && (
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>{datePart}</span>
                        </span>
                      )}
                      {timePart && (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>{timePart}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(path)}
                    title="Download"
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => handleDelete(path, e)}
                    title="Delete"
                    disabled={deleting[path]}
                  >
                    {deleting[path] ? (
                      <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}

          {currentResumes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No resumes found for this lead.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Google Drive Link Selector Dialog
interface DriveLinkSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  links: string[];
  onAddLink: () => void;
  onDeleteLink: (link: string) => Promise<void>;
  onDownloadLink: (link: string) => void;
}

const DriveLinkSelectorDialog = ({
  open,
  onOpenChange,
  leadId,
  links,
  onAddLink,
  onDeleteLink,
  onDownloadLink,
}: DriveLinkSelectorDialogProps) => {
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const handleDelete = async (link: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;
    setDeleting(prev => ({ ...prev, [link]: true }));
    try {
      await onDeleteLink(link);
    } finally {
      setDeleting(prev => ({ ...prev, [link]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Manage Google Drive Links</DialogTitle>
          <DialogDescription>
            {links.length} link{links.length !== 1 ? 's' : ''} available for {leadId}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-2 py-2">
          {links.map((link, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="text-sm font-medium truncate" title={link}>
                  {link}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownloadLink(link)}
                  title="Open Link"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(link)}
                  disabled={deleting[link]}
                >
                  {deleting[link] ? (
                    <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onAddLink}>
            Add New
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Add Google Drive Link Dialog
interface AddDriveLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (link: string) => Promise<void>;
}

const AddDriveLinkDialog = ({ open, onOpenChange, onSubmit }: AddDriveLinkDialogProps) => {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!link.trim()) return;
    setLoading(true);
    try {
      await onSubmit(link);
      setLink("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add Google Drive Link</DialogTitle>
          <DialogDescription>Enter the Google Drive link for this client.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="https://drive.google.com/..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* =========================
   Main Page Component
   ========================= */



export default function JobBoardClientsPage() {
  const router = useRouter();
  const { user } = useAuth();


  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SalesClosure[]>([]);
  const [resumeTeamMembers, setResumeTeamMembers] = useState<TeamMember[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("__all__");


  // file upload
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadForLead, setUploadForLead] = useState<string | null>(null);
  const [replacingOldPath, setReplacingOldPath] = useState<string | null>(null);


  // Requirements dialog
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqRow, setReqRow] = useState<SalesClosure | null>(null);


  const [showMyTasks, setShowMyTasks] = useState(false);

  // Resume selector dialog
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [selectedLeadForResume, setSelectedLeadForResume] = useState<string>("");
  const [selectedLeadResumes, setSelectedLeadResumes] = useState<string[]>([]);



  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [totalRows, setTotalRows] = useState(0);


  // Search
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // actual query on Enter

  // Google Drive Link state
  const [driveLinkSelectorOpen, setDriveLinkSelectorOpen] = useState(false);
  const [addDriveLinkOpen, setAddDriveLinkOpen] = useState(false);
  const [currentLeadForDrive, setCurrentLeadForDrive] = useState<string | null>(null);
  const [currentDriveLinks, setCurrentDriveLinks] = useState<string[]>([]);


  /* =========================
     Role gate + initial load
     ========================= */


  useEffect(() => {
    if (user === null) return;
    const allowed = ["Super Admin", "Resume Head", "Resume Associate"] as const;
    if (!user || !allowed.some(role => user.roles.includes(role as any))) {
      router.push("/unauthorized");
      return;
    }
    Promise.all([fetchTeamMembers(), fetchData(1, limit, "", false, "__all__")]).finally(() =>
      setLoading(false)
    );


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  /* =========================
     Fetch helpers
     ========================= */


  const fetchTeamMembers = async () => {
    let members: TeamMember[] = [];


    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,full_name,user_email,roles")
        .in("roles", ["Resume Head", "Resume Associate"]);


      if (!error && data) {
        members = (data as any[]).map((d) => ({
          id: d.user_id,
          name: d.full_name ?? null,
          email: d.user_email ?? null,
          role: d.roles ?? null,
        }));
      }
    } catch {
      // ignore
    }


    setResumeTeamMembers(members);
  };


  const fetchData = async (
    newPage = page,
    newLimit = limit,
    activeSearch = searchQuery,
    overrideShowMyTasks?: boolean,
    overrideAssigneeFilter?: string
  ) => {
    try {
      setLoading(true);


      const from = (newPage - 1) * newLimit;
      const to = from + newLimit - 1;


      let query = supabase
        // .from("full_client_status_excluding_oldest")
        .from('full_client_status_pending_jobboard')
        .select("*", { count: "exact" });


      // 🔍 Apply server-side search
      if (activeSearch.trim() !== "") {
        query = query.or(
          `lead_id.ilike.%${activeSearch}%,lead_name.ilike.%${activeSearch}%,email.ilike.%${activeSearch}%,company_application_email.ilike.%${activeSearch}%`
        );
      }


      const myTasks = overrideShowMyTasks ?? showMyTasks;



      // 🔥 My Tasks filter
      if (myTasks && user?.email) {
        query = query.eq("resume_assigned_email", user.email);
      }

      // Apply assignee filter
      const assigneeFilterToUse = overrideAssigneeFilter ?? assigneeFilter;
      if (assigneeFilterToUse !== "__all__") {
        if (assigneeFilterToUse === "__none__") {
          // Show unassigned
          query = query.is("resume_assigned_email", null);
        } else {
          // Show specific assignee
          query = query.eq("resume_assigned_email", assigneeFilterToUse);
        }
      }


      query = query
        .order("closed_at", { ascending: false })
        .range(from, to);


      const { data, error, count } = await query;


      if (error) throw error;


      // Fetch Google Drive links from resume_progress
      const { data: driveLinksData, error: driveError } = await supabase
        .from("resume_progress")
        .select("lead_id, google_drive_resume_link")
        .in("lead_id", data ? data.map(r => r.lead_id) : []);

      if (driveError) {
        console.error("Error fetching drive links:", driveError);
      }

      const driveLinksMap = new Map();
      driveLinksData?.forEach(item => {
        driveLinksMap.set(item.lead_id, item.google_drive_resume_link);
      });


      setTotalRows(count ?? 0);


      const formatted: SalesClosure[] = (data as any[]).map((r) => {
        const onboardRaw = r.onboarded_date ?? null;
        const portfolioPaid =
          r.portfolio_sale_value && Number(r.portfolio_sale_value) > 0;


        return {
          id: String(r.sale_id),
          lead_id: r.lead_id,
          email: r.email,
          company_application_email: r.company_application_email ?? null,
          finance_status: r.finance_status ?? "Unpaid",
          closed_at: r.closed_at ?? null,
          onboarded_date_raw: onboardRaw,
          onboarded_date_label: formatOnboardLabel(onboardRaw),
          application_sale_value: r.application_sale_value ?? null,
          resume_sale_value: r.resume_sale_value ?? null,
          portfolio_sale_value: r.portfolio_sale_value ?? null,
          job_board_value: r.job_board_value ?? null,
          commitments: r.commitments ?? null,
          data_sent_to_customer_dashboard: r.data_sent_to_customer_dashboard ?? null,
          leads: {
            name: r.lead_name ?? "-",
            phone: r.phone_number ?? "-",
          },
          rp_status: r.resume_status ?? "not_started",
          rp_pdf_path: (() => {
            let pdfPaths: string[] = [];
            if (r.resume_pdf) {
              try {
                if (typeof r.resume_pdf === 'string' && r.resume_pdf.startsWith('{')) {
                  pdfPaths = r.resume_pdf.replace(/[{}]/g, '').split(',');
                } else if (Array.isArray(r.resume_pdf)) {
                  pdfPaths = r.resume_pdf;
                } else {
                  pdfPaths = [r.resume_pdf];
                }
              } catch {
                pdfPaths = [r.resume_pdf];
              }
            }
            return pdfPaths;
          })(),
          assigned_to_email: r.resume_assigned_email ?? null,
          assigned_to_name: r.resume_assigned_name ?? null,
          pp_status: r.portfolio_status ?? null,
          pp_assigned_email: r.portfolio_assigned_email ?? null,
          pp_assigned_name: r.portfolio_assigned_name ?? null,
          pp_link: r.portfolio_link ?? null,
          portfolio_paid: portfolioPaid,
          google_drive_resume_link: driveLinksMap.get(r.lead_id) ?? [],
        };
      });


      setRows(formatted);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };


  const updateDriveLinks = async (leadId: string, links: string[]) => {
    try {
      // 1. Update Supabase
      const { error: dbError } = await supabase
        .from("resume_progress")
        .upsert(
          {
            lead_id: leadId,
            google_drive_resume_link: links,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "lead_id" }
        );

      if (dbError) throw dbError;

      // 2. Refresh data
      await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);

      // Update local state for dialog if open
      if (currentLeadForDrive === leadId) {
        setCurrentDriveLinks(links);
      }


      // 3. Call external API for the last link added (if any)
      if (links.length > 0) {
        try {
          // Get the current row data for this lead
          const currentRow = rows.find(r => r.lead_id === leadId);

          // Prepare payload for the new ticketingtoolapplywizz API
          const payload: any = {
            applywizz_id: leadId,
            google_drive_resume_link: [...links].reverse(),
          };

          // Add full_name if available
          if (currentRow?.leads?.name) {
            payload.full_name = currentRow.leads.name;
          }

          // Add company_email if available
          if (currentRow?.company_application_email) {
            payload.company_email = currentRow.company_application_email;
          } else if (currentRow?.email) {
            payload.company_email = currentRow.email;
          }

          // Call the new ticketingtoolapplywizz API
          await fetch('https://ticketingtoolapplywizz.vercel.app/api/sync-client', {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.NEXT_PUBLIC_TICKET_API_KEY}`
            },
            body: JSON.stringify(payload),
          });
        } catch (apiErr) {
          console.error("External API update failed:", apiErr);
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to update drive links");
    }
  };



  /* =========================
     Resume status & assignee
     ========================= */


  const updateStatus = async (leadId: string, status: ResumeStatus) => {
    const { error } = await supabase
      .from("resume_progress")
      .upsert({ lead_id: leadId, status }, { onConflict: "lead_id" });
    if (error) throw error;
  };


  const updateAssignedTo = async (
    leadId: string,
    email: string | null,
    name?: string | null,
  ) => {
    const { data: existingRows, error: findErr } = await supabase
      .from("resume_progress")
      .select("id")
      .eq("lead_id", leadId);


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
        .insert({
          lead_id: leadId,
          assigned_to_email: email,
          assigned_to_name: name ?? null,
        });
      if (insErr) throw insErr;
    }
  };


  const onChangeStatus = async (row: SalesClosure, newStatus: ResumeStatus) => {
    try {
      await updateStatus(row.lead_id, newStatus);


      if (newStatus === "completed" && (!row.rp_pdf_path || (Array.isArray(row.rp_pdf_path) && row.rp_pdf_path.length === 0))) {
        setUploadForLead(row.lead_id);
        setReplacingOldPath(null);
        fileRef.current?.click();
      } else {
        setRows((rs) =>
          rs.map((r) =>
            r.lead_id === row.lead_id ? { ...r, rp_status: newStatus } : r,
          ),
        );
      }
    } catch (e: any) {
      alert(e.message || "Failed to update status");
    }
  };

  const handleDriveLinkClick = async (row: SalesClosure, isAdd: boolean) => {
    // 1. Check Onboarded Date
    if (!row.onboarded_date_raw) {
      alert("Cannot access Drive Links: Client is not onboarded.");
      return;
    }

    setLoading(true);
    try {
      // 2. Check Pending Clients - should NOT be in pending_clients table
      const res = await fetch("/api/pending-clients/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: row.email,
          lead_id: row.lead_id
        }),
      });

      if (!res.ok) throw new Error("Failed to check client status");

      const { existsInPending, error } = await res.json();

      if (error) throw new Error(error);

      // Only allow access if client is NOT in pending_clients table
      if (existsInPending) {
        alert("Cannot access Drive Links: Client is currently in pending_clients table.");
        return;
      }

      // If checks pass (onboarded AND not in pending_clients)
      setCurrentLeadForDrive(row.lead_id);
      setCurrentDriveLinks(row.google_drive_resume_link || []);

      if (isAdd) {
        setAddDriveLinkOpen(true);
      } else {
        setDriveLinkSelectorOpen(true);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error checking client status");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Resume upload & download
     ========================= */


  const uploadOrReplaceResume = async (leadId: string, file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error("Only PDF files are allowed");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("lead_id", leadId);

    const res = await fetch("/api/resumes/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Upload failed:", data);
      throw new Error(data.error || "Upload failed");
    }

    const { data: existingRecord, error: fetchError } = await supabase
      .from("resume_progress")
      .select("pdf_path, status")
      .eq("lead_id", leadId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Error fetching existing record:", fetchError);
      throw new Error(fetchError.message || "Failed to fetch existing resumes");
    }

    const existingPaths = existingRecord?.pdf_path || [];
    const newPaths = [...existingPaths, data.key];

    const { error: dbError } = await supabase
      .from("resume_progress")
      .upsert(
        {
          lead_id: leadId,
          status: "completed",
          pdf_path: newPaths,
          pdf_uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lead_id" }
      );

    if (dbError) {
      console.error("DB UPSERT ERROR resume_progress:", dbError);
      throw new Error(dbError.message || "Failed to update database");
    }

    return {
      key: data.key,
      publicUrl: data.publicUrl,
      totalResumes: newPaths.length,
      allResumes: newPaths
    };
  };


  // Delete resume function
  const deleteResume = async (path: string, leadId: string) => {
    try {
      // 1. Delete from S3 if it's a CRM file
      if (path.startsWith("CRM")) {
        const deleteRes = await fetch("/api/resumes/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: path }),
        });

        if (!deleteRes.ok) {
          const errData = await deleteRes.json().catch(() => ({}));
          throw new Error(
            errData?.error ||
            `Failed to delete resume from S3: ${deleteRes.status}`
          );
        }
      } else {
        // Delete from Supabase Storage
        const { error } = await supabase.storage
          .from(BUCKET)
          .remove([path]);

        if (error) {
          throw new Error(`Failed to delete from storage: ${error.message}`);
        }
      }

      // 2. Remove from database array
      const { data: existingRecord, error: fetchError } = await supabase
        .from("resume_progress")
        .select("pdf_path")
        .eq("lead_id", leadId)
        .single();

      if (fetchError) throw fetchError;

      const existingPaths = existingRecord?.pdf_path || [];
      const updatedPaths = existingPaths.filter((p: string) => p !== path);

      // 3. Update database
      const { error: updateError } = await supabase
        .from("resume_progress")
        .update({
          pdf_path: updatedPaths,
          updated_at: new Date().toISOString(),
        })
        .eq("lead_id", leadId);

      if (updateError) throw updateError;

      // 4. Refresh the data
      await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);

      return { success: true, message: "Resume deleted successfully" };
    } catch (error: any) {
      console.error("Delete resume error:", error);
      return {
        success: false,
        message: error.message || "Failed to delete resume"
      };
    }
  };

  const downloadResume = async (path: string) => {
    try {
      if (path.startsWith("CRM")) {
        const base = "https://applywizz-prod.s3.us-east-2.amazonaws.com";
        const fileUrl = `${base}/${path}`;
        window.open(`${fileUrl}`, "_blank");
      } else {
        const segments = (path || "").split("/");
        const fileName = segments[segments.length - 1] || "resume.pdf";
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 60);
        if (error) throw error;
        if (!data?.signedUrl) throw new Error("No signed URL");
        const res = await fetch(data.signedUrl);
        if (!res.ok) throw new Error("Download failed");
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

  const handleOnboardClick = (leadId: string) => {
    window.open(`/resumeTeam/onboarding/${leadId}`, '_blank');
  };

  // Function to handle opening resume selector dialog
  const handleOpenResumeSelector = (leadId: string, pdfPaths: string[] | string | null) => {
    let paths: string[] = [];

    if (Array.isArray(pdfPaths)) {
      paths = pdfPaths;
    } else if (typeof pdfPaths === 'string') {
      paths = [pdfPaths];
    }

    setSelectedLeadForResume(leadId);
    setSelectedLeadResumes(paths);
    setResumeDialogOpen(true);
  };

  // Function to get resume count text
  const getResumeCountText = (pdfPaths: string[] | string | null) => {
    let count = 0;

    if (Array.isArray(pdfPaths)) {
      count = pdfPaths.length;
    } else if (typeof pdfPaths === 'string' && pdfPaths) {
      count = 1;
    }

    return count > 0 ? `Download (${count})` : "Upload PDF";
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
      await uploadOrReplaceResume(leadId, file);

      await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);
      alert("PDF uploaded.");
    } catch (err: any) {
      alert(err.message || "Upload failed");
      await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);
    }
  };




  /* =========================
     Sorting (optional)
     ========================= */


  type SortKey = "clientId" | "name" | "email" | "closedAt" | "onboarded";
  type SortDir = "asc" | "desc";


  const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({
    key: "closedAt",
    dir: "desc",
  });


  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };


  const parseClientIdNum = (id?: string | null) => {
    if (!id) return -Infinity;
    const m = id.match(/(\d+)$/);
    return m ? Number(m[1]) : -Infinity;
  };


  const dateToMs = (d?: string | null) =>
    d ? new Date(d).getTime() : -Infinity;


  const safeStr = (s?: string | null) => (s ?? "").toLowerCase();


  const cmp = (a: number | string, b: number | string) =>
    a < b ? -1 : a > b ? 1 : 0;


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
        default:
          vA = 0;
          vB = 0;
      }
      const base = cmp(vA, vB);
      return sort.dir === "asc" ? base : -base;
    });
    return copy;
  };


  const sortedRows = sortRowsBy(rows);


  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) =>
    active ? (
      dir === "asc" ? (
        <ArrowUp className="ml-1 h-4 w-4" />
      ) : (
        <ArrowDown className="ml-1 h-4 w-4" />
      )
    ) : (
      <ArrowUpDown className="ml-1 h-4 w-4 opacity-60" />
    );


  /* =========================
     Render table (EXACT UI)
     ========================= */


  const renderTable = (data: SalesClosure[]) => (
    <div className="rounded-md border mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No</TableHead>


            <TableHead>
              <button
                type="button"
                onClick={() => toggleSort("clientId")}
                className="inline-flex items-center"
              >
                Client ID
                <SortIcon
                  active={sort.key === "clientId"}
                  dir={sort.dir}
                />
              </button>
            </TableHead>


            <TableHead>
              <button
                type="button"
                onClick={() => toggleSort("name")}
                className="inline-flex items-center"
              >
                Name
                <SortIcon active={sort.key === "name"} dir={sort.dir} />
              </button>
            </TableHead>


            <TableHead>
              <button
                type="button"
                onClick={() => toggleSort("email")}
                className="inline-flex items-center"
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
            <TableHead className="text-center">Resume PDF</TableHead>
            <TableHead className="text-center">Google Drive Link</TableHead>


            <TableHead>
              <button
                type="button"
                onClick={() => toggleSort("closedAt")}
                className="inline-flex items-center"
              >
                Closed At
                <SortIcon
                  active={sort.key === "closedAt"}
                  dir={sort.dir}
                />
              </button>
            </TableHead>


            <TableHead>
              <button
                type="button"
                onClick={() => toggleSort("onboarded")}
                className="inline-flex items-center"
              >
                Onboarded Date
                <SortIcon
                  active={sort.key === "onboarded"}
                  dir={sort.dir}
                />
              </button>
            </TableHead>


            <TableHead>Portfolio Status</TableHead>
            <TableHead>Portfolio Link</TableHead>
            <TableHead>Portfolio Assignee</TableHead>
            <TableHead>Client Requirements</TableHead>
            <TableHead>Application Status</TableHead>
            <TableHead>Onboard</TableHead>
            {/* <TableHead>Forward to TT</TableHead> */}
          </TableRow>
        </TableHeader>


        <TableBody>
          {data.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="text-center">{index + 1}</TableCell>
              <TableCell>{row.lead_id}</TableCell>


              <TableCell
                className="font-medium max-w-[150px] break-words whitespace-normal cursor-pointer text-blue-600 hover:underline"
                onClick={() =>
                  window.open(`/leads/${row.lead_id}`, "_blank")
                }
              >
                {row.leads?.name || "-"}
              </TableCell>


              <TableCell>{row.email}</TableCell>
              <TableCell>
                {row.company_application_email || "not given"}
              </TableCell>
              <TableCell>{row.leads?.phone || "-"}</TableCell>
              <TableCell>{row.finance_status}</TableCell>


              {/* Resume Status */}
              <TableCell className="min-w-[220px]">
                <Select
                  value={row.rp_status || "not_started"}
                  onValueChange={(v) =>
                    onChangeStatus(row, v as ResumeStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "not_started",
                        "pending",
                        "waiting_client_approval",
                        "completed",
                      ] as ResumeStatus[]
                    ).map((s) => (
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
                      const chosen =
                        value === "__none__" ? null : value;
                      const member =
                        resumeTeamMembers.find(
                          (u) => u.email === chosen,
                        ) || null;


                      await updateAssignedTo(
                        row.lead_id,
                        chosen,
                        member?.name ?? null,
                      );


                      setRows((rs) =>
                        rs.map((r) =>
                          r.lead_id === row.lead_id
                            ? {
                              ...r,
                              assigned_to_email: chosen,
                              assigned_to_name:
                                member?.name ?? null,
                            }
                            : r,
                        ),
                      );
                      // Refresh data after assignment
                      await fetchData(page, limit, searchQuery, showMyTasks, assigneeFilter);
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
                        <SelectItem
                          key={u.id}
                          value={u.email ?? ""}
                          disabled={!u.email}
                        >
                          {u.name} — {u.role}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </TableCell>


              {/* Resume PDF */}
              <TableCell className="space-x-2 min-w-[250px] text-center">
                {row.rp_pdf_path && (
                  Array.isArray(row.rp_pdf_path) ?
                    row.rp_pdf_path.length > 0 :
                    !!row.rp_pdf_path
                ) ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenResumeSelector(row.lead_id, row.rp_pdf_path)}
                    >
                      {getResumeCountText(row.rp_pdf_path)}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setUploadForLead(row.lead_id);
                        setReplacingOldPath(null);
                        fileRef.current?.click();
                      }}
                    >
                      Add New
                    </Button>
                  </>
                ) : row.rp_status === "completed" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setUploadForLead(row.lead_id);
                      setReplacingOldPath(null);
                      fileRef.current?.click();
                    }}
                  >
                    Upload PDF
                  </Button>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </TableCell>

              {/* Google Drive Link */}
              <TableCell className="space-x-2 min-w-[200px] text-center">
                {row.google_drive_resume_link && row.google_drive_resume_link.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDriveLinkClick(row, false)}
                  >
                    Open ({row.google_drive_resume_link.length})
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDriveLinkClick(row, true)}
                  >
                    Add Link
                  </Button>
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
                  <span className="bg-red-500 text-white text-sm py-1 px-3 rounded-full">
                    not onboarded
                  </span>
                )}
              </TableCell>


              {/* Portfolio Status */}
              <TableCell className="min-w-[140px]">
                {row.portfolio_paid ? (
                  <span className="bg-green-500 text-white text-sm py-1 px-3 rounded-full">
                    Paid
                  </span>
                ) : (
                  <span className="bg-red-500 text-white text-sm py-1 px-3 rounded-full">
                    Not Paid
                  </span>
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
                        .replace(/[^a-z0-9]/g, "")}-${(row.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline block truncate"
                      title={`https://applywizz-${(row.leads?.name || "")
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "")}-${(row.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
                    >
                      {`https://applywizz-${(row.leads?.name || "")
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "")}-${(row.lead_id || "").replace(/\D/g, "")}.vercel.app/`}
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
                  ? `${row.pp_assigned_name}${row.pp_assigned_email
                    ? ` • ${row.pp_assigned_email}`
                    : ""
                  }`
                  : row.pp_assigned_email || (
                    <span className="text-gray-400 text-sm">
                      —
                    </span>
                  )}
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


              {/* Application Status */}
              <TableCell className="min-w-[140px] text-center">
                {Number(row.application_sale_value) > 0 ? (
                  <span className="bg-green-500 text-white text-sm py-1 px-3 rounded-full">
                    Paid
                  </span>
                ) : (
                  <span className="bg-red-500 text-white text-sm py-1 px-3 rounded-full">
                    Not Paid
                  </span>
                )}
              </TableCell>


              {/* Onboard button */}
              <TableCell>
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
                    onClick={() => handleOnboardClick(row.lead_id)}
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


          {data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={19}
                className="text-center text-sm text-muted-foreground py-10"
              >
                No records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-center px-4 py-2 border-t bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm">Page:</span>
          <Select
            value={String(page)}
            onValueChange={async (val) => {
              const newPage = Number(val);
              setPage(newPage);
              await fetchData(newPage, limit, searchQuery, showMyTasks, assigneeFilter);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>


            <SelectContent>
              {Array.from(
                { length: Math.ceil(totalRows / limit) },
                (_, i) => i + 1
              ).map((p) => (
                <SelectItem key={p} value={String(p)}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        &nbsp;&nbsp;


        <span className="text-sm text-gray-600">
          Showing {(page - 1) * limit + 1}–
          {Math.min(page * limit, totalRows)} of {totalRows}
        </span>
      </div>
    </div>
  );


  /* =========================
     JSX
     ========================= */


  return (
    // <ProtectedRoute
    //   allowedRoles={["Super Admin", "Resume Head", "Resume Associate"]}
    // >
    <DashboardLayout>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onFilePicked}
      />


      <div className="space-y-6">
        <div className="flex items-center justify-start gap-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Job board clients — Resume Team
          </h1>


          {/* Assignee filter */}
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">Assigned To:</div>
            <Select
              value={assigneeFilter}
              onValueChange={async (val) => {
                setAssigneeFilter(val);
                setPage(1); // Reset to first page when filter changes
                await fetchData(1, limit, searchQuery, showMyTasks, val);
              }}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="All team members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {resumeTeamMembers.length === 0 ? (
                  <SelectItem value="__disabled__" disabled>
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
          {/* Pagination Controls */}
          <div className="flex items-center gap-4">

            <div className="flex items-center gap-2">
              <span className="text-sm">Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={async (val) => {
                  const newLimit = Number(val);
                  setLimit(newLimit);
                  setPage(1); // reset page
                  await fetchData(1, newLimit, searchQuery, showMyTasks, assigneeFilter);
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                  <SelectItem value="200">200 per page</SelectItem>
                  <SelectItem value="500">500 per page</SelectItem>
                  <SelectItem value="1000">1000 per page</SelectItem>
                  <SelectItem value="2000">2000 per page</SelectItem>




                </SelectContent>
              </Select>
            </div>


          </div>


        </div>
        <div className="flex flex-auto">
          <div className="flex items-center gap-3 w-full max-w-lg">
            <Input
              placeholder="Search by Lead ID, Name or Email"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  setSearchQuery(searchText);
                  setPage(1);
                  await fetchData(1, limit, searchText, showMyTasks, assigneeFilter);
                }
              }}
            />
            <Button
              onClick={async () => {
                setSearchQuery(searchText);
                setPage(1);
                await fetchData(1, limit, searchText, showMyTasks, assigneeFilter);
              }}
            >
              Search
            </Button>


            <Button
              variant={showMyTasks ? "default" : "outline"}
              className={showMyTasks ? "bg-blue-600 text-white" : ""}
              onClick={async () => {
                const newValue = !showMyTasks;
                setShowMyTasks(newValue);
                setPage(1);
                await fetchData(1, limit, searchQuery, newValue, assigneeFilter);
              }}
            >
              {showMyTasks ? "Show All" : "My Tasks"}
            </Button>






          </div>
          <span className="text-green-500 gap-3 mt-2 ml-4 font-semibold">Total Rows : {totalRows}</span>


        </div>


        {loading ? (
          <p className="p-6 text-gray-600">Loading...</p>
        ) : (
          renderTable(sortedRows)
        )}
      </div>


      {/* Requirements Dialog */}
      <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
        <DialogContent
          className="max-w-3xl"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              Requirements — {reqRow?.lead_id ?? ""}
            </DialogTitle>
            <DialogDescription>
              Commitment details captured at sale closure.
            </DialogDescription>
          </DialogHeader>


          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">
                  Lead ID
                </div>
                <div className="font-medium">
                  {reqRow?.lead_id ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Name
                </div>
                <div className="font-medium">
                  {reqRow?.leads?.name ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Email
                </div>
                <div className="font-medium break-all">
                  {reqRow?.email ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Closed At
                </div>
                <div className="font-medium">
                  {reqRow?.closed_at
                    ? new Date(
                      reqRow.closed_at,
                    ).toLocaleDateString("en-GB")
                    : "—"}
                </div>
              </div>
            </div>


            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Commitments
              </div>
              <div className="rounded-md border bg-muted/30 p-3 max-h-[50vh] overflow-y-auto whitespace-pre-wrap">
                {reqRow?.commitments?.trim()
                  ? reqRow.commitments
                  : "—"}
              </div>
            </div>
          </div>


          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    reqRow?.commitments ?? "",
                  );
                } catch {
                  // ignore
                }
              }}
            >
              Copy Text
            </Button>
            <Button onClick={() => setReqDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Selector Dialog */}
      <ResumeSelectorDialog
        open={resumeDialogOpen}
        onOpenChange={setResumeDialogOpen}
        leadId={selectedLeadForResume}
        currentResumes={selectedLeadResumes}
        onResumeSelect={downloadResume}
        onDeleteResume={deleteResume}
      />

      <DriveLinkSelectorDialog
        open={driveLinkSelectorOpen}
        onOpenChange={setDriveLinkSelectorOpen}
        leadId={currentLeadForDrive || ""}
        links={currentDriveLinks}
        onAddLink={() => {
          setDriveLinkSelectorOpen(false);
          setAddDriveLinkOpen(true);
        }}
        onDeleteLink={async (link) => {
          if (currentLeadForDrive) {
            const newLinks = currentDriveLinks.filter(l => l !== link);
            await updateDriveLinks(currentLeadForDrive, newLinks);
          }
        }}
        onDownloadLink={(link) => window.open(link, "_blank")}
      />

      <AddDriveLinkDialog
        open={addDriveLinkOpen}
        onOpenChange={setAddDriveLinkOpen}
        onSubmit={async (newLink) => {
          if (currentLeadForDrive) {
            const newLinks = [...currentDriveLinks, newLink];
            await updateDriveLinks(currentLeadForDrive, newLinks);
          }
        }}
      />


    </DashboardLayout>
  );
}
