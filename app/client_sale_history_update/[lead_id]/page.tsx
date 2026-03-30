

// //app/client_sale_history_update/[Blead_id]/page.tsx
// "use client";


// import { supabase } from "@/utils/supabase/client";
// import { useEffect, useState } from "react";
// import { useParams } from "next/navigation";
// import {
//   DropdownMenu,
//   DropdownMenuTrigger,
//   DropdownMenuContent,
//   DropdownMenuItem,
// } from "@/components/ui/dropdown-menu";

// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
//   SelectLabel,
//   SelectSeparator
// } from "@/components/ui/select";


// import {
//   Table,
//   TableHeader,
//   TableRow,
//   TableHead,
//   TableBody,
//   TableCell,
// } from "@/components/ui/table";
// import {
//   Card,
//   CardHeader,
//   CardTitle,
//   CardContent,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Pencil, Trash2  } from "lucide-react";
// import {MoreVertical } from "lucide-react";
// import { DashboardLayout } from "@/components/layout/dashboard-layout";




// interface SaleRecord {
//   id: string;
//   lead_id: string;
//   sale_value: number | null;
//   subscription_cycle: number | null;
//   payment_mode: string | null;
//   closed_at: string | null;
//   email: string | null;
//   finance_status: string | null;
//   reason_for_close: string | null;
//   resume_sale_value: number | null;
//   portfolio_sale_value: number | null;
//   linkedin_sale_value: number | null;
//   github_sale_value: number | null;
//   lead_name: string | null;
//   onboarded_date: string | null;
//   invoice_url: string | null;
//   associates_tl_email: string | null;
//   associates_email: string | null;
//   associates_name: string | null;
//   associates_tl_name: string | null;
//   checkout_date: string | null;
//   courses_sale_value: number | null;
//   custom_label: string | null;
//   custom_sale_value: number | null;
//   commitments: string | null;
//   company_application_email: string | null;
//   account_assigned_email: string | null;
//   account_assigned_name: string | null;
//   no_of_job_applications: number | null;
//   application_sale_value: number | null;
//   badge_value: number | null;
//   data_sent_to_customer_dashboard: string | null;
//   job_board_value: number | null;
// }


// interface LeadInfo {
//   phone: string | null;
//   assigned_to: string | null;
// }


// interface GlobalFormState {
//   name: string;
//   email: string;
//   phone: string;
//   assigned_to: string;
//   company_email: string;
// }


// interface RecordFormState {
//   subscription_cycle: string;
//   payment_mode: string;
//   finance_status: string;
//   closed_at: string;
//   onboarded_date: string;
//   sale_value: string;
//   application_sale_value: string;
//   resume_sale_value: string;
//   portfolio_sale_value: string;
//   github_sale_value: string;
//   linkedin_sale_value: string;
//   courses_sale_value: string;
//   job_board_value: string;
//   custom_sale_value: string;
//   custom_label: string;
//   badge_value: string;
//   no_of_job_applications: string;
//   associates_tl_name: string;
//   associates_tl_email: string;
// }


// const MoneyBadge = ({ value }: { value: number | null }) => {
//   if (!value || value <= 0) return <span>—</span>;


//   return (
//     <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium border border-green-300">
//       ${value}
//     </span>
//   );
// };


// export default function ClientSaleHistoryPage() {
//   const params = useParams();
//   const leadId = params.lead_id as string;
//   const [tlList, setTlList] = useState<{ full_name: string; user_email: string }[]>([]);
// const [teamList, setTeamList] = useState<{ full_name: string; user_email: string; roles: string }[]>([]);



//   const [lead, setLead] = useState<LeadInfo | null>(null);
//   const [records, setRecords] = useState<SaleRecord[]>([]);
//   const [loading, setLoading] = useState(true);


//   const [selectedRecord, setSelectedRecord] = useState<SaleRecord | null>(null);
//   const [showUpdateCard, setShowUpdateCard] = useState(false);


// const [teamLoaded, setTeamLoaded] = useState(false);
// const [loadingTeam, setLoadingTeam] = useState(false);

//   const [globalForm, setGlobalForm] = useState<GlobalFormState | null>(null);
//   const [recordForm, setRecordForm] = useState<RecordFormState | null>(null);


//   const [savingGlobal, setSavingGlobal] = useState(false);
//   const [savingRecord, setSavingRecord] = useState(false);

//   const loadTeamMembers = async () => {
//   // If already loaded once → don't fetch again
//   if (teamLoaded) return;

//   setLoadingTeam(true);

//   const allowedRoles = [
//     "Admin",
//     "Sales",
//     "Finance",
//     "Accounts",
//     "Sales Associate",
//     "Finance Associate",
//     "Accounts Associate",
//     "Resume Head",
//     "Technical Head",
//   ];

//   const { data, error } = await supabase
//     .from("profiles")
//     .select("full_name, user_email, roles");

//   if (!error && data) {
//     const filtered = data
//       .filter((u) => allowedRoles.includes(u.roles))
//       .sort((a, b) => a.full_name.localeCompare(b.full_name)); // alphabetical

//     setTeamList(filtered);
//     setTeamLoaded(true);
//   }

//   setLoadingTeam(false);
// };


//   useEffect(() => {
//     async function fetchHistory() {
//       setLoading(true);


//       // 1️⃣ Fetch sales history (latest first)
//       const { data, error } = await supabase
//         .from("sales_closure")
//         .select("*")
//         .eq("lead_id", leadId)
//         .order("closed_at", { ascending: false });


//       if (error) {
//         console.error(error);
//       } else {
//         setRecords((data ?? []) as SaleRecord[]);
//       }


//       // 2️⃣ Fetch lead details (phone + assigned_to)
//       const { data: leadData, error: leadErr } = await supabase
//         .from("leads")
//         .select("phone, assigned_to")
//         .eq("business_id", leadId)
//         .single();


//       if (leadErr) {
//         console.error(leadErr);
//       } else {
//         setLead(leadData as LeadInfo);
//       }


//       setLoading(false);
//     }


//     fetchHistory();
//   }, [leadId]);


//   useEffect(() => {
//   async function fetchTLs() {
//     const { data, error } = await supabase
//       .from("profiles")
//       .select("full_name, user_email")
//       .eq("roles", "Finance Associate");


//     if (!error && data) setTlList(data);
//   }


//   fetchTLs();
// }, []);




//   // When user clicks edit on a row
//   const handleEditClick = (rec: SaleRecord) => {
//     setSelectedRecord(rec);


//     setGlobalForm({
//       name: rec.lead_name || "",
//       email: rec.email || "",
//       phone: lead?.phone || "",
//       assigned_to: lead?.assigned_to || "",
//       company_email: rec.company_application_email || "",
//     });


//     setRecordForm({
//       subscription_cycle: rec.subscription_cycle?.toString() || "",
//       payment_mode: rec.payment_mode || "",
//       finance_status: rec.finance_status || "",
//       closed_at: rec.closed_at ? rec.closed_at.slice(0, 10) : "",
//       onboarded_date: rec.onboarded_date || "",
//       sale_value: rec.sale_value?.toString() || "",
//       application_sale_value: rec.application_sale_value?.toString() || "",
//       resume_sale_value: rec.resume_sale_value?.toString() || "",
//       portfolio_sale_value: rec.portfolio_sale_value?.toString() || "",
//       github_sale_value: rec.github_sale_value?.toString() || "",
//       linkedin_sale_value: rec.linkedin_sale_value?.toString() || "",
//       courses_sale_value: rec.courses_sale_value?.toString() || "",
//       job_board_value: rec.job_board_value?.toString() || "",
//       custom_sale_value: rec.custom_sale_value?.toString() || "",
//       custom_label: rec.custom_label || "",
//       badge_value: rec.badge_value?.toString() || "",
//       no_of_job_applications: rec.no_of_job_applications?.toString() || "",
//       associates_tl_name: rec.associates_tl_name || "",
//       associates_tl_email: rec.associates_tl_email || "",
//     });


//     setShowUpdateCard(true);
//   };


//   const handleSaveGlobal = async () => {
//     if (!globalForm || !leadId) return;
//     setSavingGlobal(true);


//     // Update leads table
//     const { error: leadErr } = await supabase
//       .from("leads")
//       .update({
//         name: globalForm.name,
//         email: globalForm.email,
//         phone: globalForm.phone,
//         assigned_to: globalForm.assigned_to,
//       })
//       .eq("business_id", leadId);


//     // Update ALL sales_closure rows for this lead
//     const { error: scErr } = await supabase
//       .from("sales_closure")
//       .update({
//         lead_name: globalForm.name,
//         email: globalForm.email,
//         company_application_email: globalForm.company_email,
//       })
//       .eq("lead_id", leadId);


//     if (leadErr || scErr) {
//       console.error("Error updating global details", leadErr || scErr);
//     } else {
//       // update local state
//       setLead((prev) =>
//         prev
//           ? {
//               ...prev,
//               phone: globalForm.phone,
//               assigned_to: globalForm.assigned_to,
//             }
//           : prev
//       );


//       setRecords((rows) =>
//         rows.map((r) => ({
//           ...r,
//           lead_name: globalForm.name,
//           email: globalForm.email,
//           company_application_email: globalForm.company_email,
//         }))
//       );
//     }


//     setSavingGlobal(false);
//   };


//   const handleSaveRecord = async () => {
//     if (!recordForm || !selectedRecord) return;
//  // VALIDATION FIRST — do NOT set savingRecord yet
//   if (
//     !recordForm.no_of_job_applications ||
//     recordForm.no_of_job_applications.trim() === ""
//   ) {
//     alert("Please select 'No. of Job Applications' (required)");
//     return; // ❗ Stop here
//   }
//     setSavingRecord(true);

//     const payload = {
//       subscription_cycle: recordForm.subscription_cycle
//         ? Number(recordForm.subscription_cycle)
//         : null,
//       payment_mode: recordForm.payment_mode || null,
//       finance_status: recordForm.finance_status || null,
//       closed_at: recordForm.closed_at || null,
//       onboarded_date: recordForm.onboarded_date || null,
//       sale_value: recordForm.sale_value
//         ? Number(recordForm.sale_value)
//         : null,
//       application_sale_value: recordForm.application_sale_value
//         ? Number(recordForm.application_sale_value)
//         : null,
//       resume_sale_value: recordForm.resume_sale_value
//         ? Number(recordForm.resume_sale_value)
//         : null,
//       portfolio_sale_value: recordForm.portfolio_sale_value
//         ? Number(recordForm.portfolio_sale_value)
//         : null,
//       github_sale_value: recordForm.github_sale_value
//         ? Number(recordForm.github_sale_value)
//         : null,
//       linkedin_sale_value: recordForm.linkedin_sale_value
//         ? Number(recordForm.linkedin_sale_value)
//         : null,
//       courses_sale_value: recordForm.courses_sale_value
//         ? Number(recordForm.courses_sale_value)
//         : null,
//       job_board_value: recordForm.job_board_value
//         ? Number(recordForm.job_board_value)
//         : null,
//       custom_sale_value: recordForm.custom_sale_value
//         ? Number(recordForm.custom_sale_value)
//         : null,
//       custom_label: recordForm.custom_label || null,
//       badge_value: recordForm.badge_value
//         ? Number(recordForm.badge_value)
//         : null,
//       // no_of_job_applications: recordForm.no_of_job_applications  !== ""
//       //   ? Number(recordForm.no_of_job_applications)
//       //   : null,
//           no_of_job_applications: Number(recordForm.no_of_job_applications),

//       associates_tl_name: recordForm.associates_tl_name || null,
//     };


//     const { error } = await supabase
//       .from("sales_closure")
//       .update(payload)
//       .eq("id", selectedRecord.id);


//     if (error) {
//       console.error("Error updating sale record", error);
//     } else {
//       setRecords((rows) =>
//         rows.map((r) =>
//           r.id === selectedRecord.id ? { ...r, ...payload } : r
//         )
//       );
//     }


//     setSavingRecord(false);
//   };


//   const handleDeleteRecord = async (id: string) => {
//   if (!confirm("Are you sure you want to delete this record?")) return;

//   const { error } = await supabase
//     .from("sales_closure")
//     .delete()
//     .eq("id", id);

//   if (error) {
//     console.error("Delete error", error);
//     return;
//   }

//   // Update UI instantly
//   setRecords((prev) => prev.filter((rec) => rec.id !== id));
// };

//   return (


//         <DashboardLayout>

// <div className="w-[85vw] px-6 space-y-6 overflow-x-auto">
//       {/* CARD 1: SALES HISTORY TABLE */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="text-xl">
//             Sales History for{" "}
//             <span className="text-blue-600">{leadId}</span>
//           </CardTitle>
//         </CardHeader>


//         <CardContent>
//           {loading ? (
//             <p>Loading...</p>
//           ) : records.length === 0 ? (
//             <p>No history found for this client.</p>
//           ) : (
//             <div className="rounded-md border overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>S.No</TableHead>
//                     <TableHead>Edit</TableHead>
//                     <TableHead>Name</TableHead>
//                     <TableHead>Personal email</TableHead>
//                     <TableHead>Company email</TableHead>
//                     <TableHead>Phone number</TableHead>
//                     <TableHead>Subscription Cycle</TableHead>
//                     <TableHead>Payment Mode</TableHead>
//                     <TableHead>Finance Status</TableHead>
//                     <TableHead>Closed At</TableHead>
//                     <TableHead>Onboarded Date</TableHead>
//                     <TableHead>Sale Value</TableHead>
//                     <TableHead>Application Sale</TableHead>
//                     <TableHead>Resume</TableHead>
//                     <TableHead>Portfolio</TableHead>
//                     <TableHead>Git</TableHead>
//                     <TableHead>Linkedin</TableHead>
//                     <TableHead>Courses</TableHead>
//                     <TableHead>Job board</TableHead>
//                     <TableHead>Custom</TableHead>
//                     <TableHead>Badge</TableHead>
//                     <TableHead>No of Applications</TableHead>
//                     <TableHead>sale done by</TableHead>
//                     <TableHead>Assoicate TL</TableHead>
//                   </TableRow>
//                 </TableHeader>


//                 <TableBody>
//                   {records.map((rec, idx) => (
//                     <TableRow key={rec.id}>
//                       <TableCell>{idx + 1}</TableCell>


//                       {/* Edit button */}
//                       {/* <TableCell>
//                         <button
//                           type="button"
//                           onClick={() => handleEditClick(rec)}
//                           className="inline-flex items-center justify-center rounded-full border border-gray-300 p-1 hover:bg-gray-100"
//                         >
//                           <Pencil className="h-4 w-4" />
//                         </button>
//                       </TableCell> */}

//                       <TableCell>
//   <DropdownMenu>
//     <DropdownMenuTrigger asChild>
//       <button
//         type="button"
//         className="inline-flex items-center justify-center rounded-full border border-gray-300 p-1 hover:bg-gray-100"
//       >
//         <MoreVertical className="h-4 w-4" />
//       </button>
//     </DropdownMenuTrigger>

//     <DropdownMenuContent align="start">
//       <DropdownMenuItem onClick={() => handleEditClick(rec)}>
//                 <Pencil className="h-4 w-4" />
//  Edit
//       </DropdownMenuItem>

//       <DropdownMenuItem
//         className="text-red-600"
//         onClick={() => handleDeleteRecord(rec.id)}
//       >
//         <Trash2  className="h-4 w-4" /> Delete
//       </DropdownMenuItem>
//     </DropdownMenuContent>
//   </DropdownMenu>
// </TableCell>



//                       {/* Name */}
//                       <TableCell>{rec.lead_name || "-"}</TableCell>


//                       {/* Personal Email */}
//                       <TableCell>{rec.email || "-"}</TableCell>


//                       {/* Company Email */}
//                       <TableCell>
//                         {rec.company_application_email || "-"}
//                       </TableCell>


//                       {/* Phone Number (from leads) */}
//                       <TableCell>{lead?.phone || "-"}</TableCell>


//                       {/* Subscription Cycle */}
//                       <TableCell>
//                         {rec.subscription_cycle
//                           ? `${rec.subscription_cycle} days`
//                           : "-"}
//                       </TableCell>


//                       {/* Payment Mode */}
//                       <TableCell>{rec.payment_mode || "-"}</TableCell>


//                       {/* Finance Status */}
//                       <TableCell>{rec.finance_status || "-"}</TableCell>


//                       {/* Closed At */}
//                       <TableCell>
//                         {rec.closed_at
//                           ? new Date(
//                               rec.closed_at
//                             ).toLocaleDateString("en-GB")
//                           : "-"}
//                       </TableCell>


//                       {/* Onboarded Date */}
//                       <TableCell>
//                         {rec.onboarded_date
//                           ? new Date(
//                               rec.onboarded_date
//                             ).toLocaleDateString("en-GB")
//                           : "-"}
//                       </TableCell>


//                       {/* Sale Value */}
//                       <TableCell>
//                         <MoneyBadge value={rec.sale_value} />
//                       </TableCell>


//                       {/* Application Sale */}
//                       <TableCell>
//                         <MoneyBadge value={rec.application_sale_value} />
//                       </TableCell>


//                       {/* Resume */}
//                       <TableCell>
//                         <MoneyBadge value={rec.resume_sale_value} />
//                       </TableCell>


//                       {/* Portfolio */}
//                       <TableCell>
//                         <MoneyBadge value={rec.portfolio_sale_value} />
//                       </TableCell>


//                       {/* GitHub */}
//                       <TableCell>
//                         <MoneyBadge value={rec.github_sale_value} />
//                       </TableCell>


//                       {/* LinkedIn */}
//                       <TableCell>
//                         <MoneyBadge value={rec.linkedin_sale_value} />
//                       </TableCell>


//                       {/* Courses */}
//                       <TableCell>
//                         <MoneyBadge value={rec.courses_sale_value} />
//                       </TableCell>


//                       {/* Job Board */}
//                       <TableCell>
//                         <MoneyBadge value={rec.job_board_value} />
//                       </TableCell>


//                       {/* Custom */}
//                       <TableCell>
//                         <MoneyBadge value={rec.custom_sale_value} />
//                       </TableCell>


//                       {/* Badge */}
//                       <TableCell>
//                         <MoneyBadge value={rec.badge_value} />
//                       </TableCell>


//                       {/* No of Job Applications */}
//                       <TableCell>
//                         {rec.no_of_job_applications || 0}
//                       </TableCell>


//                       {/* sale done by */}
//                       <TableCell>{lead?.assigned_to || "-"}</TableCell>


//                       {/* Associate TL */}
//                       <TableCell>
//                         {rec.associates_tl_name || "-"}
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//           )}
//         </CardContent>
//       </Card>


//       {/* CARD 2: UPDATE SECTION (only when edit is clicked) */}
//       {showUpdateCard && selectedRecord && globalForm && recordForm && (
//         <Card>
//          <CardHeader>
//     <div className="flex items-center justify-between">
//       <CardTitle className="text-xl">
//         Update Client & Sale Record
//       </CardTitle>


//       <Button
//       className="bg-gray-900 text-gray-50"
//         variant="outline"
//         size="sm"
//         onClick={() => setShowUpdateCard(false)}
//       >
//         Close
//       </Button>
//     </div>
//   </CardHeader>


//           <CardContent>
// <div className="grid gap-6 md:grid-cols-12">
//               {/* Global updates card */}
// <div className="border rounded-lg p-4 space-y-4 md:col-span-4">
//                 <h3 className="font-semibold text-lg">
//                   Global Client Details
//                 </h3>


//                 <div className="space-y-3">
//                   <div>
//                     <Label>Name</Label>
//                     <Input
//                       value={globalForm.name}
//                       onChange={(e) =>
//                         setGlobalForm({
//                           ...globalForm,
//                           name: e.target.value,
//                         })
//                       }
//                     />
//                   </div>


//                   <div>
//                     <Label>Personal Email</Label>
//                     <Input
//                       type="email"
//                       value={globalForm.email}
//                       onChange={(e) =>
//                         setGlobalForm({
//                           ...globalForm,
//                           email: e.target.value,
//                         })
//                       }
//                     />
//                   </div>


//                   <div>
//                     <Label>Company Email</Label>
//                     <Input
//                       type="email"
//                       value={globalForm.company_email}
//                       onChange={(e) =>
//                         setGlobalForm({
//                           ...globalForm,
//                           company_email: e.target.value,
//                         })
//                       }
//                     />
//                   </div>


//                   <div>
//                     <Label>Phone Number</Label>
//                     <Input
//                       value={globalForm.phone}
//                       onChange={(e) =>
//                         setGlobalForm({
//                           ...globalForm,
//                           phone: e.target.value,
//                         })
//                       }
//                     />
//                   </div>


//                   {/* <div>
//   <Label>Sale done by (assigned_to)</Label>

//   <select
//     className="border rounded p-2 w-full"
//     value={globalForm.assigned_to}
//     onClick={loadTeamMembers} // 🔥 load only when clicked
//     onChange={(e) => {
//       const selected = teamList.find((t) => t.full_name === e.target.value);

//       setGlobalForm({
//         ...globalForm,
//         assigned_to: selected?.full_name || "",
//       });
//     }}
//   >
//     <option value="">
//       {loadingTeam ? "Loading..." : "Select Person"}
//     </option>

//     {teamList.map((user) => (
//       <option key={user.user_email} value={user.full_name}>
//         {user.full_name} — {user.roles} 
//       </option>
//     ))}
//   </select>
// </div> */}

// <div>
//   <Label>Sale done by (assigned_to)</Label>

//   <Select
//     onOpenChange={(open) => {
//       if (open) loadTeamMembers(); // fetch only when dropdown is opened
//     }}
//     value={globalForm.assigned_to || ""}
//     onValueChange={(name) =>
//       setGlobalForm({
//         ...globalForm,
//         assigned_to: name, // only name
//       })
//     }
//   >
//     <SelectTrigger className="w-full mt-1 bg-white border rounded-md p-2 text-left">
//       <SelectValue placeholder="Select Person" />
//     </SelectTrigger>

//     <SelectContent className="max-h-[260px] overflow-y-auto">

//       {/* LOADING STATE */}
//       {loadingTeam && (
//         <div className="px-3 py-2 text-sm text-muted-foreground">
//           Loading...
//         </div>
//       )}

//       {/* TEAM LIST */}
//       {!loadingTeam &&
//         teamList.map((user) => (
//           <SelectItem
//             key={user.user_email}
//             value={user.full_name}
//             className="cursor-pointer"
//           >
//             <div className="flex flex-col">
//               <span className="font-medium">{user.full_name}</span>
//               <span className="text-xs text-gray-500">{user.roles}</span>
//             </div>
//           </SelectItem>
//         ))}

//     </SelectContent>
//   </Select>
// </div>



//                 </div>


//                 <div className="pt-4">
//                   <Button
//                     onClick={handleSaveGlobal}
//                     disabled={savingGlobal}
//                   >
//                     {savingGlobal ? "Saving..." : "Save Global Changes"}
//                   </Button>
//                 </div>
//               </div>


//               {/* Record-level updates card */}
// <div className="border rounded-lg p-4 space-y-4 md:col-span-8">
//                 <h3 className="font-semibold text-lg">
//                   Selected Sale Record
//                 </h3>


//                 <div className="space-y-3">
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                      <Label>Subscription Cycle (days)</Label>
// <select
//   className="border rounded p-2 w-full"
//   value={recordForm.subscription_cycle}
//   onChange={(e) =>
//     setRecordForm({ ...recordForm, subscription_cycle: e.target.value })
//   }
// >
//   {[0, 15, 30, 60, 90].map((v) => (
//     <option key={v} value={v}>
//       {v} days
//     </option>
//   ))}
// </select>


//                     </div>
//                     <div>
//                      <Label>Payment Mode</Label>
// <select
//   className="border rounded p-2 w-full"
//   value={recordForm.payment_mode}
//   onChange={(e) =>
//     setRecordForm({
//       ...recordForm,
//       payment_mode: e.target.value,
//     })
//   }
// >
//   {[
//     "UPI",
//     "Bank Transfer",
//     "PayPal",
//     "Stripe",
//     "Credit/Debit Card",
//     "Other",
//     "Razorpay",
//   ].map((v) => (
//     <option key={v} value={v}>
//       {v}
//     </option>
//   ))}
// </select>


//                     </div>
//                   </div>


//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                      <Label>Finance Status</Label>
// <select
//   className="border rounded p-2 w-full"
//   value={recordForm.finance_status}
//   onChange={(e) =>
//     setRecordForm({
//       ...recordForm,
//       finance_status: e.target.value,
//     })
//   }
// >
//   {["Paid", "Unpaid", "Paused", "Closed", "Got Placed"].map((v) => (
//     <option key={v} value={v}>
//       {v}
//     </option>
//   ))}
// </select>


//                     </div>
//                     <div>
//                       <Label>Closed At</Label>
//                       <Input
//                         type="date"
//                         value={recordForm.closed_at}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             closed_at: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                   </div>


//                   <div>
//                     <Label>Onboarded Date</Label>
//                     <Input
//                       type="date"
//                       value={recordForm.onboarded_date}
//                       onChange={(e) =>
//                         setRecordForm({
//                           ...recordForm,
//                           onboarded_date: e.target.value,
//                         })
//                       }
//                     />
//                   </div>


//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Sale Value</Label>
//                       <Input
//                         value={recordForm.sale_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             sale_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                     <div>
//                       <Label>Application Sale</Label>
//                       <Input
//                         value={recordForm.application_sale_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             application_sale_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                   </div>


//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Resume</Label>
//                       <Input
//                         value={recordForm.resume_sale_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             resume_sale_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                     <div>
//                       <Label>Portfolio</Label>
//                       <Input
//                         value={recordForm.portfolio_sale_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             portfolio_sale_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                   </div>


//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Git</Label>
//                       <Input
//                         value={recordForm.github_sale_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             github_sale_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                     <div>
//                       <Label>LinkedIn</Label>
//                       <Input
//                         value={recordForm.linkedin_sale_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             linkedin_sale_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                   </div>


//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Courses</Label>
//                       <Input
//                         value={recordForm.courses_sale_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             courses_sale_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                     <div>
//                       <Label>Job Board</Label>
//                       <Input
//                         value={recordForm.job_board_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             job_board_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                   </div>


//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Custom Label</Label>
//                       <Input
//                         value={recordForm.custom_label}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             custom_label: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                     <div>
//                       <Label>Custom Value</Label>
//                       <Input
//                         value={recordForm.custom_sale_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             custom_sale_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                   </div>


//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Badge</Label>
//                       <Input
//                         value={recordForm.badge_value}
//                         onChange={(e) =>
//                           setRecordForm({
//                             ...recordForm,
//                             badge_value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                     <div>
//                      <Label>No of Job Applications</Label>
// <select
// className={`border rounded p-2 w-full ${
//   !recordForm.no_of_job_applications ||
//   recordForm.no_of_job_applications.trim() === ""
//     ? "border-red-500"
//     : ""
// }`}

//   required
//   value={recordForm.no_of_job_applications || ""}
//   onChange={(e) =>
//     setRecordForm({
//       ...recordForm,
//       no_of_job_applications: e.target.value,
//     })
//   }
// >
//   <option value="">Select...</option>
//     <option value="0">No applications</option>
//   <option value="20">20+</option>
//   <option value="40">40+</option>
// </select>


//                     </div>
//                   </div>


//                   <div>
//                   <Label>Associate TL Name</Label>
// <select
//   className="border rounded p-2 w-full"
//   value={recordForm.associates_tl_name || ""}
//   onChange={(e) => {
//     const selected = tlList.find((t) => t.full_name === e.target.value);


//     setRecordForm({
//       ...recordForm,
//       associates_tl_name: selected?.full_name || "",
//       associates_tl_email: selected?.user_email || "",
//     });
//   }}
// >
//   <option value="">Select TL</option>
//   {tlList.map((tl) => (
//     <option key={tl.user_email} value={tl.full_name}>
//       {tl.full_name}
//     </option>
//   ))}
// </select>


//                   </div>
//                 </div>


//                 <div className="pt-4">
//                   <Button
//                     onClick={handleSaveRecord}
//                     disabled={savingRecord}
//                   >
//                     {savingRecord ? "Saving..." : "Save Record Changes"}
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//     </DashboardLayout>
//   );
// }















//app/client_sale_history_update/[Blead_id]/page.tsx
"use client";


import { supabase } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator
} from "@/components/ui/select";


import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { MoreVertical } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";




interface SaleRecord {
  id: string;
  lead_id: string;
  sale_value: number | null;
  subscription_cycle: number | null;
  payment_mode: string | null;
  closed_at: string | null;
  email: string | null;
  finance_status: string | null;
  reason_for_close: string | null;
  resume_sale_value: number | null;
  portfolio_sale_value: number | null;
  linkedin_sale_value: number | null;
  github_sale_value: number | null;
  lead_name: string | null;
  onboarded_date: string | null;
  invoice_url: string | null;
  associates_tl_email: string | null;
  associates_email: string | null;
  associates_name: string | null;
  associates_tl_name: string | null;
  checkout_date: string | null;
  courses_sale_value: number | null;
  custom_label: string | null;
  custom_sale_value: number | null;
  commitments: string | null;
  company_application_email: string | null;
  account_assigned_email: string | null;
  account_assigned_name: string | null;
  no_of_job_applications: number | null;
  application_sale_value: number | null;
  badge_value: number | null;
  data_sent_to_customer_dashboard: string | null;
  job_board_value: number | null;
  digital_resume_sale_value: number | null;
}


interface LeadInfo {
  phone: string | null;
  assigned_to: string | null;
}


interface GlobalFormState {
  name: string;
  email: string;
  phone: string;
  assigned_to: string;
  company_email: string;
}


interface RecordFormState {
  subscription_cycle: string;
  payment_mode: string;
  finance_status: string;
  closed_at: string;
  onboarded_date: string;
  sale_value: string;
  application_sale_value: string;
  resume_sale_value: string;
  portfolio_sale_value: string;
  github_sale_value: string;
  linkedin_sale_value: string;
  courses_sale_value: string;
  job_board_value: string;
  custom_sale_value: string;
  custom_label: string;
  badge_value: string;
  no_of_job_applications: string;
  associates_tl_name: string;
  associates_tl_email: string;
  digital_resume_sale_value: string;
  account_assigned_name: string;
  account_assigned_email: string;
}


const MoneyBadge = ({ value }: { value: number | null }) => {
  if (!value || value <= 0) return <span>—</span>;


  return (
    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium border border-green-300">
      ${value}
    </span>
  );
};


export default function ClientSaleHistoryPage() {
  const params = useParams();
  const leadId = params.lead_id as string;
  const [tlList, setTlList] = useState<{ full_name: string; user_email: string }[]>([]);
  const [teamList, setTeamList] = useState<{ full_name: string; user_email: string; roles: string }[]>([]);



  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);


  const [selectedRecord, setSelectedRecord] = useState<SaleRecord | null>(null);
  const [showUpdateCard, setShowUpdateCard] = useState(false);


  const [teamLoaded, setTeamLoaded] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [globalForm, setGlobalForm] = useState<GlobalFormState | null>(null);
  const [recordForm, setRecordForm] = useState<RecordFormState | null>(null);


  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  const loadTeamMembers = async () => {
    // If already loaded once → don't fetch again
    if (teamLoaded) return;

    setLoadingTeam(true);

    const allowedRoles = [
      "Admin",
      "Sales",
      "Finance",
      "Accounts",
      "Sales Associate",
      "Finance Associate",
      "Accounts Associate",
      "Resume Head",
      "Technical Head",
    ];

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, user_email, roles");

    if (!error && data) {
      const filtered = data
        .filter((u) => allowedRoles.includes(u.roles))
        .sort((a, b) => a.full_name.localeCompare(b.full_name)); // alphabetical

      setTeamList(filtered);
      setTeamLoaded(true);
    }

    setLoadingTeam(false);
  };


  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);


      // 1️⃣ Fetch sales history (latest first)
      const { data, error } = await supabase
        .from("sales_closure")
        .select("*")
        .eq("lead_id", leadId)
        .order("closed_at", { ascending: false });


      if (error) {
        console.error(error);
      } else {
        setRecords((data ?? []) as SaleRecord[]);
      }


      // 2️⃣ Fetch lead details (phone + assigned_to)
      const { data: leadData, error: leadErr } = await supabase
        .from("leads")
        .select("phone, assigned_to")
        .eq("business_id", leadId)
        .single();


      if (leadErr) {
        console.error(leadErr);
      } else {
        setLead(leadData as LeadInfo);
      }


      setLoading(false);
    }


    fetchHistory();
  }, [leadId]);


  useEffect(() => {
    async function fetchTLs() {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, user_email")
        .eq("roles", "Finance Associate");


      if (!error && data) setTlList(data);
    }


    fetchTLs();
  }, []);




  // When user clicks edit on a row
  const handleEditClick = (rec: SaleRecord) => {
    setSelectedRecord(rec);


    setGlobalForm({
      name: rec.lead_name || "",
      email: rec.email || "",
      phone: lead?.phone || "",
      assigned_to: lead?.assigned_to || "",
      company_email: rec.company_application_email || "",
    });


    setRecordForm({
      subscription_cycle: rec.subscription_cycle?.toString() || "",
      payment_mode: rec.payment_mode || "",
      finance_status: rec.finance_status || "",
      closed_at: rec.closed_at ? rec.closed_at.slice(0, 10) : "",
      onboarded_date: rec.onboarded_date || "",
      sale_value: rec.sale_value?.toString() || "",
      application_sale_value: rec.application_sale_value?.toString() || "",
      resume_sale_value: rec.resume_sale_value?.toString() || "",
      portfolio_sale_value: rec.portfolio_sale_value?.toString() || "",
      github_sale_value: rec.github_sale_value?.toString() || "",
      linkedin_sale_value: rec.linkedin_sale_value?.toString() || "",
      courses_sale_value: rec.courses_sale_value?.toString() || "",
      job_board_value: rec.job_board_value?.toString() || "",
      custom_sale_value: rec.custom_sale_value?.toString() || "",
      custom_label: rec.custom_label || "",
      badge_value: rec.badge_value?.toString() || "",
      no_of_job_applications: rec.no_of_job_applications?.toString() || "",
      associates_tl_name: rec.associates_tl_name || "",
      associates_tl_email: rec.associates_tl_email || "",
      digital_resume_sale_value: rec.digital_resume_sale_value?.toString() || "",
      account_assigned_name: rec.account_assigned_name || "",
      account_assigned_email: rec.account_assigned_email || "",
    });


    setShowUpdateCard(true);
  };


  const handleSaveGlobal = async () => {
    if (!globalForm || !leadId) return;
    setSavingGlobal(true);


    // Update leads table
    const { error: leadErr } = await supabase
      .from("leads")
      .update({
        name: globalForm.name,
        email: globalForm.email,
        phone: globalForm.phone,
        assigned_to: globalForm.assigned_to,
      })
      .eq("business_id", leadId);


    // Update ALL sales_closure rows for this lead
    const { error: scErr } = await supabase
      .from("sales_closure")
      .update({
        lead_name: globalForm.name,
        email: globalForm.email,
        company_application_email: globalForm.company_email,
      })
      .eq("lead_id", leadId);


    if (leadErr || scErr) {
      console.error("Error updating global details", leadErr || scErr);
    } else {
      // update local state
      setLead((prev) =>
        prev
          ? {
            ...prev,
            phone: globalForm.phone,
            assigned_to: globalForm.assigned_to,
          }
          : prev
      );


      setRecords((rows) =>
        rows.map((r) => ({
          ...r,
          lead_name: globalForm.name,
          email: globalForm.email,
          company_application_email: globalForm.company_email,
        }))
      );
    }


    setSavingGlobal(false);
  };


  const handleSaveRecord = async () => {
    if (!recordForm || !selectedRecord) return;
    // VALIDATION FIRST — do NOT set savingRecord yet
    if (
      !recordForm.no_of_job_applications ||
      recordForm.no_of_job_applications.trim() === ""
    ) {
      alert("Please select 'No. of Job Applications' (required)");
      return; // ❗ Stop here
    }
    setSavingRecord(true);

    const payload = {
      subscription_cycle: recordForm.subscription_cycle
        ? Number(recordForm.subscription_cycle)
        : null,
      payment_mode: recordForm.payment_mode || null,
      finance_status: recordForm.finance_status || null,
      closed_at: recordForm.closed_at || null,
      onboarded_date: recordForm.onboarded_date || null,
      sale_value: recordForm.sale_value
        ? Number(recordForm.sale_value)
        : null,
      application_sale_value: recordForm.application_sale_value
        ? Number(recordForm.application_sale_value)
        : null,
      resume_sale_value: recordForm.resume_sale_value
        ? Number(recordForm.resume_sale_value)
        : null,
      portfolio_sale_value: recordForm.portfolio_sale_value
        ? Number(recordForm.portfolio_sale_value)
        : null,
      github_sale_value: recordForm.github_sale_value
        ? Number(recordForm.github_sale_value)
        : null,
      linkedin_sale_value: recordForm.linkedin_sale_value
        ? Number(recordForm.linkedin_sale_value)
        : null,
      courses_sale_value: recordForm.courses_sale_value
        ? Number(recordForm.courses_sale_value)
        : null,
      job_board_value: recordForm.job_board_value
        ? Number(recordForm.job_board_value)
        : null,
      custom_sale_value: recordForm.custom_sale_value
        ? Number(recordForm.custom_sale_value)
        : null,
      custom_label: recordForm.custom_label || null,
      badge_value: recordForm.badge_value
        ? Number(recordForm.badge_value)
        : null,
      // no_of_job_applications: recordForm.no_of_job_applications  !== ""
      //   ? Number(recordForm.no_of_job_applications)
      //   : null,
      no_of_job_applications: Number(recordForm.no_of_job_applications),

      digital_resume_sale_value: recordForm.digital_resume_sale_value
        ? Number(recordForm.digital_resume_sale_value)
        : null,
      associates_tl_name: recordForm.associates_tl_name || null,
      account_assigned_name: recordForm.account_assigned_name || null,
      account_assigned_email: recordForm.account_assigned_email || null,
    };


    const { error } = await supabase
      .from("sales_closure")
      .update(payload)
      .eq("id", selectedRecord.id);


    if (error) {
      console.error("Error updating sale record", error);
    } else {
      setRecords((rows) =>
        rows.map((r) =>
          r.id === selectedRecord.id ? { ...r, ...payload } : r
        )
      );
    }


    setSavingRecord(false);
  };


  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    const { error } = await supabase
      .from("sales_closure")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error", error);
      return;
    }

    // Update UI instantly
    setRecords((prev) => prev.filter((rec) => rec.id !== id));
  };

  return (


    <DashboardLayout>

      <div className="w-[85vw] px-6 space-y-6 overflow-x-auto">
        {/* CARD 1: SALES HISTORY TABLE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Sales History for{" "}
              <span className="text-blue-600">{leadId}</span>
            </CardTitle>
          </CardHeader>


          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : records.length === 0 ? (
              <p>No history found for this client.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Edit</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Personal email</TableHead>
                      <TableHead>Company email</TableHead>
                      <TableHead>Phone number</TableHead>
                      <TableHead>Subscription Cycle</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Finance Status</TableHead>
                      <TableHead>Closed At</TableHead>
                      <TableHead>Onboarded Date</TableHead>
                      <TableHead>Sale Value</TableHead>
                      <TableHead>Application Sale</TableHead>
                      <TableHead>Resume</TableHead>
                      <TableHead>Portfolio</TableHead>
                      <TableHead>Git</TableHead>
                      <TableHead>Linkedin</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Job board</TableHead>
                      <TableHead>Digital Resume</TableHead>
                      <TableHead>Custom</TableHead>
                      {/* <TableHead>Custom</TableHead> */}
                      <TableHead>Badge</TableHead>
                      <TableHead>No of Applications</TableHead>
                      <TableHead>sale done by</TableHead>
                      <TableHead>Assoicate TL</TableHead>
                    </TableRow>
                  </TableHeader>


                  <TableBody>
                    {records.map((rec, idx) => (
                      <TableRow key={rec.id}>
                        <TableCell>{idx + 1}</TableCell>


                        {/* Edit button */}
                        {/* <TableCell>
                        <button
                          type="button"
                          onClick={() => handleEditClick(rec)}
                          className="inline-flex items-center justify-center rounded-full border border-gray-300 p-1 hover:bg-gray-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </TableCell> */}

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-full border border-gray-300 p-1 hover:bg-gray-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => handleEditClick(rec)}>
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteRecord(rec.id)}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>



                        {/* Name */}
                        <TableCell>{rec.lead_name || "-"}</TableCell>


                        {/* Personal Email */}
                        <TableCell>{rec.email || "-"}</TableCell>


                        {/* Company Email */}
                        <TableCell>
                          {rec.company_application_email || "-"}
                        </TableCell>


                        {/* Phone Number (from leads) */}
                        <TableCell>{lead?.phone || "-"}</TableCell>


                        {/* Subscription Cycle */}
                        <TableCell>
                          {rec.subscription_cycle
                            ? `${rec.subscription_cycle} days`
                            : "-"}
                        </TableCell>


                        {/* Payment Mode */}
                        <TableCell>{rec.payment_mode || "-"}</TableCell>


                        {/* Finance Status */}
                        <TableCell>{rec.finance_status || "-"}</TableCell>


                        {/* Closed At */}
                        <TableCell>
                          {rec.closed_at
                            ? new Date(
                              rec.closed_at
                            ).toLocaleDateString("en-GB")
                            : "-"}
                        </TableCell>


                        {/* Onboarded Date */}
                        <TableCell>
                          {rec.onboarded_date
                            ? new Date(
                              rec.onboarded_date
                            ).toLocaleDateString("en-GB")
                            : "-"}
                        </TableCell>


                        {/* Sale Value */}
                        <TableCell>
                          <MoneyBadge value={rec.sale_value} />
                        </TableCell>


                        {/* Application Sale */}
                        <TableCell>
                          <MoneyBadge value={rec.application_sale_value} />
                        </TableCell>


                        {/* Resume */}
                        <TableCell>
                          <MoneyBadge value={rec.resume_sale_value} />
                        </TableCell>


                        {/* Portfolio */}
                        <TableCell>
                          <MoneyBadge value={rec.portfolio_sale_value} />
                        </TableCell>


                        {/* GitHub */}
                        <TableCell>
                          <MoneyBadge value={rec.github_sale_value} />
                        </TableCell>


                        {/* LinkedIn */}
                        <TableCell>
                          <MoneyBadge value={rec.linkedin_sale_value} />
                        </TableCell>


                        {/* Courses */}
                        <TableCell>
                          <MoneyBadge value={rec.courses_sale_value} />
                        </TableCell>


                        {/* Job Board */}
                        <TableCell>
                          <MoneyBadge value={rec.job_board_value} />
                        </TableCell>


                        {/* Digital Resume */}
                        <TableCell>
                          <MoneyBadge value={rec.digital_resume_sale_value} />
                        </TableCell>


                        {/* Custom */}
                        <TableCell>
                          <MoneyBadge value={rec.custom_sale_value} />
                        </TableCell>


                        {/* Badge */}
                        <TableCell>
                          <MoneyBadge value={rec.badge_value} />
                        </TableCell>


                        {/* No of Job Applications */}
                        <TableCell>
                          {rec.no_of_job_applications || 0}
                        </TableCell>


                        {/* sale done by */}
                        <TableCell>{lead?.assigned_to || "-"}</TableCell>


                        {/* Associate TL */}
                        <TableCell>
                          {rec.associates_tl_name || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>


        {/* CARD 2: UPDATE SECTION (only when edit is clicked) */}
        {showUpdateCard && selectedRecord && globalForm && recordForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Update Client & Sale Record
                </CardTitle>


                <Button
                  className="bg-gray-900 text-gray-50"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUpdateCard(false)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>


            <CardContent>
              <div className="grid gap-6 md:grid-cols-12">
                {/* Global updates card */}
                <div className="border rounded-lg p-4 space-y-4 md:col-span-4">
                  <h3 className="font-semibold text-lg">
                    Global Client Details
                  </h3>


                  <div className="space-y-3">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={globalForm.name}
                        onChange={(e) =>
                          setGlobalForm({
                            ...globalForm,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>


                    <div>
                      <Label>Personal Email</Label>
                      <Input
                        type="email"
                        value={globalForm.email}
                        onChange={(e) =>
                          setGlobalForm({
                            ...globalForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>


                    <div>
                      <Label>Company Email</Label>
                      <Input
                        type="email"
                        value={globalForm.company_email}
                        onChange={(e) =>
                          setGlobalForm({
                            ...globalForm,
                            company_email: e.target.value,
                          })
                        }
                      />
                    </div>


                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        value={globalForm.phone}
                        onChange={(e) =>
                          setGlobalForm({
                            ...globalForm,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>


                    {/* <div>
  <Label>Sale done by (assigned_to)</Label>

  <select
    className="border rounded p-2 w-full"
    value={globalForm.assigned_to}
    onClick={loadTeamMembers} // 🔥 load only when clicked
    onChange={(e) => {
      const selected = teamList.find((t) => t.full_name === e.target.value);

      setGlobalForm({
        ...globalForm,
        assigned_to: selected?.full_name || "",
      });
    }}
  >
    <option value="">
      {loadingTeam ? "Loading..." : "Select Person"}
    </option>

    {teamList.map((user) => (
      <option key={user.user_email} value={user.full_name}>
        {user.full_name} — {user.roles} 
      </option>
    ))}
  </select>
</div> */}

                    <div>
                      <Label>Sale done by (assigned_to)</Label>

                      <Select
                        onOpenChange={(open) => {
                          if (open) loadTeamMembers(); // fetch only when dropdown is opened
                        }}
                        value={globalForm.assigned_to || ""}
                        onValueChange={(name) =>
                          setGlobalForm({
                            ...globalForm,
                            assigned_to: name, // only name
                          })
                        }
                      >
                        <SelectTrigger className="w-full mt-1 bg-white border rounded-md p-2 text-left">
                          <SelectValue placeholder="Select Person" />
                        </SelectTrigger>

                        <SelectContent className="max-h-[260px] overflow-y-auto">

                          {/* LOADING STATE */}
                          {loadingTeam && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Loading...
                            </div>
                          )}

                          {/* TEAM LIST */}
                          {!loadingTeam &&
                            teamList.map((user) => (
                              <SelectItem
                                key={user.user_email}
                                value={user.full_name}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{user.full_name}</span>
                                  <span className="text-xs text-gray-500">{user.roles}</span>
                                </div>
                              </SelectItem>
                            ))}

                        </SelectContent>
                      </Select>
                    </div>



                  </div>


                  <div className="pt-4">
                    <Button
                      onClick={handleSaveGlobal}
                      disabled={savingGlobal}
                    >
                      {savingGlobal ? "Saving..." : "Save Global Changes"}
                    </Button>
                  </div>
                </div>


                {/* Record-level updates card */}
                <div className="border rounded-lg p-4 space-y-4 md:col-span-8">
                  <h3 className="font-semibold text-lg">
                    Selected Sale Record
                  </h3>


                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Subscription Cycle (days)</Label>
                        <select
                          className="border rounded p-2 w-full"
                          value={recordForm.subscription_cycle}
                          onChange={(e) =>
                            setRecordForm({ ...recordForm, subscription_cycle: e.target.value })
                          }
                        >
                          {[0, 15, 30, 60, 90].map((v) => (
                            <option key={v} value={v}>
                              {v} days
                            </option>
                          ))}
                        </select>


                      </div>
                      <div>
                        <Label>Payment Mode</Label>
                        <select
                          className="border rounded p-2 w-full"
                          value={recordForm.payment_mode}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              payment_mode: e.target.value,
                            })
                          }
                        >
                          {[
                            "UPI",
                            "Bank Transfer",
                            "PayPal",
                            "Stripe",
                            "Credit/Debit Card",
                            "Other",
                            "Razorpay",
                          ].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>


                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Finance Status</Label>
                        <select
                          className="border rounded p-2 w-full"
                          value={recordForm.finance_status}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              finance_status: e.target.value,
                            })
                          }
                        >
                          {["Paid", "Unpaid", "Paused", "Closed", "Got Placed"].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>


                      </div>
                      <div>
                        <Label>Closed At</Label>
                        <Input
                          type="date"
                          value={recordForm.closed_at}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              closed_at: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>


                    <div>
                      <Label>Onboarded Date</Label>
                      <Input
                        type="date"
                        value={recordForm.onboarded_date}
                        onChange={(e) =>
                          setRecordForm({
                            ...recordForm,
                            onboarded_date: e.target.value,
                          })
                        }
                      />
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Sale Value</Label>
                        <Input
                          value={recordForm.sale_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              sale_value: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Application Sale</Label>
                        <Input
                          value={recordForm.application_sale_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              application_sale_value: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Resume</Label>
                        <Input
                          value={recordForm.resume_sale_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              resume_sale_value: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Portfolio</Label>
                        <Input
                          value={recordForm.portfolio_sale_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              portfolio_sale_value: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Git</Label>
                        <Input
                          value={recordForm.github_sale_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              github_sale_value: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>LinkedIn</Label>
                        <Input
                          value={recordForm.linkedin_sale_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              linkedin_sale_value: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Courses</Label>
                        <Input
                          value={recordForm.courses_sale_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              courses_sale_value: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Job Board</Label>
                        <Input
                          value={recordForm.job_board_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              job_board_value: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Digital Resume</Label>
                        <Input
                          value={recordForm.digital_resume_sale_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              digital_resume_sale_value: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Custom Label</Label>
                        <Input
                          value={recordForm.custom_label}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              custom_label: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Custom Value</Label>
                        <Input
                          value={recordForm.custom_sale_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              custom_sale_value: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Badge</Label>
                        <Input
                          value={recordForm.badge_value}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              badge_value: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>No of Job Applications</Label>
                        <select
                          className={`border rounded p-2 w-full ${!recordForm.no_of_job_applications ||
                            recordForm.no_of_job_applications.trim() === ""
                            ? "border-red-500"
                            : ""
                            }`}

                          required
                          value={recordForm.no_of_job_applications || ""}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              no_of_job_applications: e.target.value,
                            })
                          }
                        >
                          <option value="">Select...</option>
                          <option value="0">No applications</option>
                          <option value="20">20+</option>
                          <option value="40">40+</option>
                        </select>


                      </div>
                    </div>


                    <div>
                      <Label>Associate TL Name</Label>
                      <select
                        className="border rounded p-2 w-full"
                        value={recordForm.associates_tl_name || ""}
                        onChange={(e) => {
                          const selected = tlList.find((t) => t.full_name === e.target.value);


                          setRecordForm({
                            ...recordForm,
                            associates_tl_name: selected?.full_name || "",
                            associates_tl_email: selected?.user_email || "",
                          });
                        }}
                      >
                        <option value="">Select TL</option>
                        {tlList.map((tl) => (
                          <option key={tl.user_email} value={tl.full_name}>
                            {tl.full_name}
                          </option>
                        ))}
                      </select>


                    </div>
                  </div>


                  <div className="pt-4">
                    <Button
                      onClick={handleSaveRecord}
                      disabled={savingRecord}
                    >
                      {savingRecord ? "Saving..." : "Save Record Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
