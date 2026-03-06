// // app/SaleUpdate/[leadId]/EditSaleCloseForm.tsx
// "use client";


// import { useEffect, useMemo, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { supabase } from "@/utils/supabase/client";
// import { DashboardLayout } from "@/components/layout/dashboard-layout";


// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
// } from "@/components/ui/select";


// /* --- Types --- */
// type FinanceStatus = "Paid" | "Unpaid" | "Paused" | "Closed" | "Got Placed";
// type PaymentMode =
//   | "UPI"
//   | "Bank Transfer"
//   | "PayPal"
//   | "Stripe"
//   | "Credit/Debit Card"
//   | "Other"
//   | "Razorpay";


// type SalesClosureRow = {
//   id: string;
//   lead_id: string;
//   sale_value: number | null;
//   application_sale_value: number | null;


//   subscription_cycle: number | null;
//   payment_mode: PaymentMode | null;
//   closed_at: string | null;


//   email: string | null;
//   company_application_email: string | null;
//   lead_name: string | null;


//   resume_sale_value: number | null;
//   portfolio_sale_value: number | null;
//   linkedin_sale_value: number | null;
//   github_sale_value: number | null;
//   courses_sale_value: number | null;
//   custom_label: string | null;
//   custom_sale_value: number | null;


//   badge_value: number | null;
//   job_board_value: number | null;


//   commitments: string | null;
//   no_of_job_applications: number | null;


//   finance_status: FinanceStatus | null;
//   account_assigned_name: string | null;
// };


// type LeadRow = {
//   id: string;
//   name: string;
//   phone: string | null;
//   email: string | null;
//   business_id: string | null;
// };


// /* --- Helpers --- */
// const safeParseFloatOrNull = (
//   v: string | number | null | undefined
// ): number | null => {
//   if (v === null || v === undefined || v === "") return null;
//   const n = parseFloat(String(v));
//   return Number.isFinite(n) ? n : null;
// };


// const safeParseFloatOrZero = (
//   v: string | number | null | undefined
// ): number => {
//   const n = parseFloat(String(v ?? "0"));
//   return Number.isFinite(n) ? n : 0;
// };


// const sumAddons = (...vals: (string | number | null | undefined)[]) =>
//   vals.reduce((acc: number, v) => acc + safeParseFloatOrZero(v), 0);


// const round2 = (x: number) =>
//   Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;


// const cycleFactor = (cycle: string | ""): number => {
//   switch (cycle) {
//     case "15":
//       return 0.5;
//     case "30":
//       return 1;
//     case "60":
//       return 2;
//     case "90":
//       return 3;
//     default:
//       return 0;
//   }
// };


// const cycleDays = (cycle: string | ""): number => {
//   switch (cycle) {
//     case "15":
//       return 15;
//     case "30":
//       return 30;
//     case "60":
//       return 60;
//     case "90":
//       return 90;
//     default:
//       return 0;
//   }
// };


// // Date helpers
// const isoToDateOnly = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
// const dateOnlyToIsoUTC = (yyyyMMdd?: string | null) =>
//   yyyyMMdd ? new Date(`${yyyyMMdd}T00:00:00Z`).toISOString() : null;


// const addDaysFromYYYYMMDD = (yyyyMMdd: string, days: number) => {
//   const parts = yyyyMMdd.split("-");
//   if (parts.length !== 3) return "";
//   const y = Number(parts[0]),
//     m = Number(parts[1]),
//     d = Number(parts[2]);
//   const dt = new Date(Date.UTC(y, m - 1, d));
//   dt.setUTCDate(dt.getUTCDate() + days);
//   return dt.toISOString().slice(0, 10);
// };


// /* ---------- Page ---------- */
// interface EditSaleCloseFormProps {
//   leadId: string;
// }


// export default function EditSaleCloseForm({ leadId }: EditSaleCloseFormProps) {
// //   const { leadId } = useParams<{ leadId: string }>();
//   const router = useRouter();


//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);


//   const [recordId, setRecordId] = useState<string | null>(null);
//   const [originalTotal, setOriginalTotal] = useState<number>(0);


//   // client/meta
//   const [clientName, setClientName] = useState("");
//   const [clientEmail, setClientEmail] = useState("");
//   const [companyApplicationEmail, setCompanyApplicationEmail] = useState("");


//   const [paymentMode, setPaymentMode] = useState<PaymentMode | "">("");
//   const [financeStatus, setFinanceStatus] = useState<FinanceStatus | "">("");


//   // addons
//   const [resumeValue, setResumeValue] = useState<string>("");
//   const [portfolioValue, setPortfolioValue] = useState<string>("");
//   const [linkedinValue, setLinkedinValue] = useState<string>("");
//   const [githubValue, setGithubValue] = useState<string>("");
//   const [coursesValue, setCoursesValue] = useState<string>("");


//   const [badgeValue, setBadgeValue] = useState<string>("");
//   const [jobBoardValue, setJobBoardValue] = useState<string>("");


//   const [customLabel, setCustomLabel] = useState<string>("");
//   const [customValue, setCustomValue] = useState<string>("");


//   const [no_of_job_applications, set_no_of_job_applications] =
//     useState<string>("");


//   const [commitments, setCommitments] = useState<string>("");


//   // subscription + totals
//   const [applicationSaleValue, setApplicationSaleValue] = useState<number>(0);
//   const [subscriptionCycle, setSubscriptionCycle] = useState<number>(30);


//   // dates
//   const [closedAtDate, setClosedAtDate] = useState<string>("");
//   const [nextDueDate, setNextDueDate] = useState<string>("");


//   // lead phone
//   const [leadPhone, setLeadPhone] = useState<string>("");


//   // display-only
//   const [closerName, setCloserName] = useState<string>("");
//   const [autoCalculatedValue, setAutoCalculatedValue] = useState<number>(0);


//   const [monthlyInitialized, setMonthlyInitialized] = useState(false);


//   /* --- Auto calc field --- */
//   useEffect(() => {
//     if (applicationSaleValue && subscriptionCycle) {
//       setAutoCalculatedValue((subscriptionCycle / 30) * applicationSaleValue);
//     } else {
//       setAutoCalculatedValue(0);
//     }
//   }, [applicationSaleValue, subscriptionCycle]);


//   /* ---------- Fetch latest sales_closure + leads ---------- */
//   useEffect(() => {
//     let mounted = true;


//     (async () => {
//       try {
//         setLoading(true);
//         setError(null);


//         const { data: scData, error: scError } = await supabase
//           .from("sales_closure")
//           .select("*")
//           .eq("lead_id", leadId)
//           .order("closed_at", { ascending: false, nullsFirst: false })
//           .limit(1)
//           .maybeSingle<SalesClosureRow>();


//         if (scError) throw scError;


//         if (!scData) {
//           setError(`No sales_closure found for lead_id=${leadId}`);
//         } else if (mounted) {
//           setRecordId(scData.id);
//           setOriginalTotal(Number(scData.sale_value || 0));


//           setClientName(scData.lead_name ?? "");
//           setClientEmail(scData.email ?? "");
//           setCompanyApplicationEmail(scData.company_application_email ?? "");


//           setPaymentMode((scData.payment_mode as PaymentMode) ?? "");
//           setFinanceStatus((scData.finance_status as FinanceStatus) ?? "");


//           setResumeValue(scData.resume_sale_value?.toString() ?? "");
//           setPortfolioValue(scData.portfolio_sale_value?.toString() ?? "");
//           setLinkedinValue(scData.linkedin_sale_value?.toString() ?? "");
//           setGithubValue(scData.github_sale_value?.toString() ?? "");
//           setCoursesValue(scData.courses_sale_value?.toString() ?? "");


//           setBadgeValue(scData.badge_value?.toString() ?? "");
//           setJobBoardValue(scData.job_board_value?.toString() ?? "");


//           setCustomLabel(scData.custom_label ?? "");
//           setCustomValue(scData.custom_sale_value?.toString() ?? "");


//           setCommitments(scData.commitments ?? "");
//           set_no_of_job_applications(
//             scData.no_of_job_applications?.toString() || ""
//           );


//           setSubscriptionCycle(scData.subscription_cycle ?? 30);
//         //   setApplicationSaleValue(Number(scData.application_sale_value || 0));


//         // Convert stored multiplied value → base per-30-days value
// const stored = Number(scData.application_sale_value || 0);
// const cycle = scData.subscription_cycle ?? 30;
// const factor = cycle / 30;


// const baseValue = factor ? stored / factor : stored;


// setApplicationSaleValue(baseValue);


//           setClosedAtDate(isoToDateOnly(scData.closed_at));
//           setCloserName(scData.account_assigned_name || "");


//           setMonthlyInitialized(false);
//         }


//         const { data: leadData, error: leadError } = await supabase
//           .from("leads")
//           .select("id, phone, name, email, business_id")
//           .eq("business_id", leadId)
//           .maybeSingle<LeadRow>();


//         if (!leadError && leadData && mounted) {
//           setLeadPhone(leadData.phone ?? "");
//         }
//       } catch (e: any) {
//         console.error(e);
//         if (mounted) setError(e?.message ?? "Failed to load records");
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     })();


//     return () => {
//       mounted = false;
//     };
//   }, [leadId]);


//   /* ---------- Monthly derive (same logic) ---------- */
//   useEffect(() => {
//     if (monthlyInitialized) return;
//     const factor = cycleFactor(String(subscriptionCycle));
//     if (!factor) return;


//     const addonsTotal = sumAddons(
//       resumeValue,
//       portfolioValue,
//       linkedinValue,
//       githubValue,
//       coursesValue,
//       customValue,
//       badgeValue,
//       jobBoardValue
//     );


//     const baseTotal = Number(originalTotal || 0);
//     const monthly = Math.max((baseTotal - addonsTotal) / factor, 0);


//     // we don't show this field separately, but keeping logic same
//     // if you want to show, add an Input and bind to this state
//     // setSubscriptionSaleValue(round2(monthly).toFixed(2));


//     setMonthlyInitialized(true);
//   }, [
//     monthlyInitialized,
//     subscriptionCycle,
//     originalTotal,
//     resumeValue,
//     portfolioValue,
//     linkedinValue,
//     githubValue,
//     coursesValue,
//     customValue,
//     badgeValue,
//     jobBoardValue,
//   ]);


//   /* ---------- Totals ---------- */
//   const autoTotal = useMemo(() => {
//     if (applicationSaleValue && subscriptionCycle) {
//       return (subscriptionCycle / 30) * applicationSaleValue;
//     }
//     return 0;
//   }, [applicationSaleValue, subscriptionCycle]);


//   const totalSale = useMemo(() => {
//     const addons = sumAddons(
//       resumeValue,
//       portfolioValue,
//       linkedinValue,
//       githubValue,
//       coursesValue,
//       customValue,
//       badgeValue,
//       jobBoardValue
//     );
//     return round2(autoTotal + addons);
//   }, [
//     autoTotal,
//     resumeValue,
//     portfolioValue,
//     linkedinValue,
//     githubValue,
//     coursesValue,
//     customValue,
//     badgeValue,
//     jobBoardValue,
//   ]);


//   /* ---------- Next due date ---------- */
//   useEffect(() => {
//     const days = cycleDays(String(subscriptionCycle));
//     if (!days) {
//       setNextDueDate("");
//       return;
//     }
//     const base = closedAtDate || isoToDateOnly(new Date().toISOString());
//     setNextDueDate(base ? addDaysFromYYYYMMDD(base, days) : "");
//   }, [closedAtDate, subscriptionCycle]);


//   /* ---------- Update handler ---------- */
//   const handleUpdate = async () => {
//     if (!recordId) {
//       setError("Missing record id to update.");
//       return;
//     }
//     if(!clientEmail) {
//       alert("Client personal email is required.");
//       return;
//     }


//     try {
//       setSaving(true);
//       setError(null);


//       const factor = subscriptionCycle / 30;



//       const payload: any = {
//         lead_id: leadId as string,
//         lead_name: clientName || null,
//         email: clientEmail || null,
//         company_application_email: companyApplicationEmail || null,


//         payment_mode: paymentMode || null,
//         subscription_cycle: subscriptionCycle ? Number(subscriptionCycle) : null,


//         sale_value: Number(totalSale.toFixed(2)),
//         // application_sale_value: safeParseFloatOrNull(autoCalculatedValue),


//         // compute actual multiplied value for DB


// application_sale_value: round2(applicationSaleValue * factor),


//         finance_status: financeStatus || null,


//         resume_sale_value: safeParseFloatOrNull(resumeValue),
//         portfolio_sale_value: safeParseFloatOrNull(portfolioValue),
//         linkedin_sale_value: safeParseFloatOrNull(linkedinValue),
//         github_sale_value: safeParseFloatOrNull(githubValue),
//         courses_sale_value: safeParseFloatOrNull(coursesValue),


//         badge_value: safeParseFloatOrNull(badgeValue),
//         job_board_value: safeParseFloatOrNull(jobBoardValue),


//         custom_label: customLabel || null,
//         custom_sale_value: safeParseFloatOrNull(customValue),


//         commitments: commitments || null,
//         no_of_job_applications: safeParseFloatOrNull(no_of_job_applications),


//         closed_at: dateOnlyToIsoUTC(closedAtDate),
//       };


//       const { error: updateError } = await supabase
//         .from("sales_closure")
//         .update(payload)
//         .eq("id", recordId);


//       if (updateError) throw updateError;


//       const { error: leadUpdateError } = await supabase
//         .from("leads")
//         .update({ phone: leadPhone || null })
//         .eq("business_id", leadId);


//       if (leadUpdateError) {
//         console.warn("sales_closure updated but lead phone failed:", leadUpdateError);
//         setError("Saved sale record, but failed to update lead phone.");
//         return;
//       }


//       alert("Updated successfully.");
//       router.back();
//     } catch (e: any) {
//       console.error(e);
//       setError(e?.message ?? "Failed to update record(s)");
//     } finally {
//       setSaving(false);
//     }
//   };


//   /* ---------- UI ---------- */
//   return (
//     // <DashboardLayout>
//       <div className="p-6 pt-0">
//         <div className="mb-2 flex items-center justify-between">
//           <h1 className="text-2xl font-bold">Edit Sale Close — {leadId}</h1>
//         </div>


//         {loading ? (
//           <Card>
//             <CardContent className="p-6">Loading latest sale record…</CardContent>
//           </Card>
//         ) : error ? (
//           <Card>
//             <CardContent className="p-6 text-red-600">{error}</CardContent>
//           </Card>
//         ) : (
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             <Card className="lg:col-span-2">
//               <CardHeader>
//                 <CardTitle>🧾 Update Client Sale</CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-6">


//                 {/* Client Details */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="border rounded-md p-4 space-y-3">
//                     <Label className="font-semibold">
//                       Client Details <span className="text-red-500">*</span>
//                     </Label>


//                     <div className="space-y-1">
//                       <Label>Client name</Label>
//                       <Input
//                         placeholder="Client Full Name"
//                         value={clientName}
//                         onChange={(e) => setClientName(e.target.value)}
//                       />
//                     </div>


//                     <div className="space-y-1">
//                       <Label>Client personal email</Label>
//                       <Input
//                         placeholder="Client Email"
//                         value={clientEmail}
//                         onChange={(e) => setClientEmail(e.target.value)}
//                         required
//                       />
//                     </div>


//                     <div className="space-y-1">
//                       <Label>Client company email</Label>
//                       <Input
//                         placeholder="Company Application Email PWD: Created@123"
//                         value={companyApplicationEmail}
//                         onChange={(e) =>
//                           setCompanyApplicationEmail(e.target.value)
//                         }
//                       />
//                     </div>


//                     <div className="space-y-1">
//                       <Label>Sale Closed At</Label>
//                       <Input
//                         type="date"
//                         value={closedAtDate}
//                         onChange={(e) => setClosedAtDate(e.target.value)}
//                       />
//                     </div>


//                     <div className="space-y-1">
//                       <Label>Lead Phone</Label>
//                       <Input
//                         placeholder="Phone"
//                         value={leadPhone}
//                         onChange={(e) => setLeadPhone(e.target.value)}
//                       />
//                     </div>
//                   </div>


//                   {/* Subscription + Payment */}
//                   <div className="border rounded-md p-4 space-y-3">
//                     <Label className="font-semibold">
//                       Subscription & Payment Info{" "}
//                       <span className="text-red-500">*</span>
//                     </Label>


//                     <div className="space-y-3">


//                       <Select
//                         value={paymentMode}
//                         onValueChange={(v) => setPaymentMode(v as PaymentMode)}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select Payment Mode" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="UPI">UPI</SelectItem>
//                           <SelectItem value="PayPal">PayPal</SelectItem>
//                           <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
//                           <SelectItem value="Credit/Debit Card">
//                             Credit/Debit Card
//                           </SelectItem>
//                           <SelectItem value="Stripe">Stripe</SelectItem>
//                           <SelectItem value="Razorpay">Razorpay</SelectItem>
//                           <SelectItem value="Other">Other</SelectItem>
//                         </SelectContent>
//                       </Select>


//                       <Select
//                         value={String(subscriptionCycle)}
//                         onValueChange={(v) => setSubscriptionCycle(Number(v))}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select Subscription Duration" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="15">15 Days</SelectItem>
//                           <SelectItem value="30">1 Month</SelectItem>
//                           <SelectItem value="60">2 Months</SelectItem>
//                           <SelectItem value="90">3 Months</SelectItem>
//                         </SelectContent>
//                       </Select>


//                       <div className="space-y-1">
//                         <Label className="text-sm">Application Sale Value (editable)</Label>
//                         <Input
//                           type="number"
//                           inputMode="decimal"
//                           min="0"
//                           value={applicationSaleValue}
//                           onChange={(e) =>
//                             setApplicationSaleValue(
//                               parseFloat(e.target.value) || 0
//                             )
//                           }
//                         />
//                       </div>


//                       <div className="space-y-1">
//                         <Label className="text-sm">Auto-Calculated Value</Label>
//                         <Input type="number" value={autoCalculatedValue} disabled />
//                         <p className="text-xs text-gray-500">
//                           Always = <code>(subscription_cycle / 30) × application_sale_value</code>
//                         </p>
//                       </div>


//                       {/* No. of Job Applications */}
//                       <div className="space-y-1">
//                         <Label>
//                           No. of Job Applications{" "}
//                           <span className="text-red-700">*</span>
//                         </Label>
//                         <Select
//                           value={no_of_job_applications}
//                           onValueChange={(v) => set_no_of_job_applications(v)}
//                         >
//                           <SelectTrigger>
//                             <SelectValue placeholder="Select count" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="0">No applications</SelectItem>
//                             <SelectItem value="20">20+</SelectItem>
//                             <SelectItem value="40">40+</SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </div>


//                       <div className="grid grid-cols-2 gap-3">
//                         <Input
//                           value="Sale Closing By"
//                           disabled
//                           readOnly
//                           className="text-gray-900 bg-gray-50 disabled:opacity-100"
//                         />
//                         <Input
//                           value={closerName || "—"}
//                           disabled
//                           readOnly
//                           className="text-gray-900 bg-gray-50 disabled:opacity-100"
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 </div>


//                 {/* Add-ons */}
//                 <div className="border rounded-md p-4 space-y-3">
//                   <Label className="font-semibold">Optional Add-On Services</Label>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


//                     <Input
//                       type="number"
//                       inputMode="decimal"
//                       min="0"
//                       placeholder="Resume Value ($)"
//                       value={resumeValue}
//                       onChange={(e) => setResumeValue(e.target.value)}
//                     />


//                     <Input
//                       type="number"
//                       inputMode="decimal"
//                       min="0"
//                       placeholder="Portfolio Value ($)"
//                       value={portfolioValue}
//                       onChange={(e) => setPortfolioValue(e.target.value)}
//                     />


//                     <Input
//                       type="number"
//                       inputMode="decimal"
//                       min="0"
//                       placeholder="LinkedIn Value ($)"
//                       value={linkedinValue}
//                       onChange={(e) => setLinkedinValue(e.target.value)}
//                     />


//                     <Input
//                       type="number"
//                       inputMode="decimal"
//                       min="0"
//                       placeholder="GitHub Value ($)"
//                       value={githubValue}
//                       onChange={(e) => setGithubValue(e.target.value)}
//                     />


//                     <Input
//                       type="number"
//                       inputMode="decimal"
//                       min="0"
//                       placeholder="Courses Value ($)"
//                       value={coursesValue}
//                       onChange={(e) => setCoursesValue(e.target.value)}
//                     />


//                     <Input
//                       type="number"
//                       inputMode="decimal"
//                       min="0"
//                       placeholder="Badge Value ($)"
//                       value={badgeValue}
//                       onChange={(e) => setBadgeValue(e.target.value)}
//                     />


//                     <Input
//                       type="number"
//                       inputMode="decimal"
//                       min="0"
//                       placeholder="Job Board Value ($)"
//                       value={jobBoardValue}
//                       onChange={(e) => setJobBoardValue(e.target.value)}
//                     />


//                     <div className="flex gap-2">
//                       <Input
//                         placeholder="Custom label"
//                         value={customLabel}
//                         onChange={(e) => setCustomLabel(e.target.value)}
//                         className="w-1/2"
//                       />
//                       <Input
//                         type="number"
//                         inputMode="decimal"
//                         min="0"
//                         placeholder="Custom value ($)"
//                         value={customValue}
//                         onChange={(e) => setCustomValue(e.target.value)}
//                         className="w-1/2"
//                       />
//                     </div>
//                   </div>


//                   <div className="border rounded-md p-4 space-y-2">
//                     <Label className="font-semibold">Commitments</Label>
//                     <Textarea
//                       placeholder="Enter commitments…"
//                       value={commitments}
//                       onChange={(e) => setCommitments(e.target.value)}
//                     />
//                   </div>
//                 </div>


//                 {/* Totals */}
//                 <div className="border rounded-md p-4">
//                   <Label className="font-semibold">Auto Calculated</Label>
//                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
//                     <p>
//                       Total Sale Value:{" "}
//                       <strong>${totalSale.toFixed(2)}</strong>
//                     </p>
//                     <p>
//                       Next Payment Due Date:{" "}
//                       <strong>{nextDueDate || "-"}</strong>
//                     </p>
//                     <Button
//                       className="bg-green-600 text-white hover:bg-green-700"
//                       onClick={handleUpdate}
//                       disabled={saving}
//                     >
//                       {saving ? "Updating..." : "Update"}
//                     </Button>
//                   </div>
//                 </div>


//               </CardContent>
//             </Card>
//           </div>
//         )}
//       </div>
//     // </DashboardLayout>
//   );
// }






// app/SaleUpdate/[leadId]/EditSaleCloseForm.tsx
"use client";


import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/components/providers/auth-provider";


import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";


/* --- Types --- */
type FinanceStatus = "Paid" | "Unpaid" | "Paused" | "Closed" | "Got Placed";
type PaymentMode =
  | "UPI"
  | "Bank Transfer"
  | "PayPal"
  | "Stripe"
  | "Credit/Debit Card"
  | "Other"
  | "Razorpay";


type SalesClosureRow = {
  id: string;
  lead_id: string;
  sale_value: number | null;
  application_sale_value: number | null;


  subscription_cycle: number | null;
  payment_mode: PaymentMode | null;
  closed_at: string | null;


  email: string | null;
  company_application_email: string | null;
  lead_name: string | null;


  resume_sale_value: number | null;
  portfolio_sale_value: number | null;
  linkedin_sale_value: number | null;
  github_sale_value: number | null;
  courses_sale_value: number | null;
  custom_label: string | null;
  custom_sale_value: number | null;


  badge_value: number | null;
  job_board_value: number | null;


  commitments: string | null;
  no_of_job_applications: number | null;


  finance_status: FinanceStatus | null;
  account_assigned_name: string | null;
};


type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  business_id: string | null;
};


/* --- Helpers --- */
const safeParseFloatOrNull = (
  v: string | number | null | undefined
): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};


const safeParseFloatOrZero = (
  v: string | number | null | undefined
): number => {
  const n = parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};


const sumAddons = (...vals: (string | number | null | undefined)[]) =>
  vals.reduce((acc: number, v) => acc + safeParseFloatOrZero(v), 0);


const round2 = (x: number) =>
  Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;


const cycleFactor = (cycle: string | ""): number => {
  switch (cycle) {
    case "15":
      return 0.5;
    case "30":
      return 1;
    case "60":
      return 2;
    case "90":
      return 3;
    default:
      return 0;
  }
};


const cycleDays = (cycle: string | ""): number => {
  switch (cycle) {
    case "15":
      return 15;
    case "30":
      return 30;
    case "60":
      return 60;
    case "90":
      return 90;
    default:
      return 0;
  }
};


// Date helpers
const isoToDateOnly = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
const dateOnlyToIsoUTC = (yyyyMMdd?: string | null) =>
  yyyyMMdd ? new Date(`${yyyyMMdd}T00:00:00Z`).toISOString() : null;


const addDaysFromYYYYMMDD = (yyyyMMdd: string, days: number) => {
  const parts = yyyyMMdd.split("-");
  if (parts.length !== 3) return "";
  const y = Number(parts[0]),
    m = Number(parts[1]),
    d = Number(parts[2]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};


/* ---------- Page ---------- */
interface EditSaleCloseFormProps {
  leadId: string;
}


export default function EditSaleCloseForm({ leadId }: EditSaleCloseFormProps) {
  //   const { leadId } = useParams<{ leadId: string }>();
  const router = useRouter();
  const { user } = useAuth();


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const [recordId, setRecordId] = useState<string | null>(null);
  const [originalTotal, setOriginalTotal] = useState<number>(0);


  // client/meta
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [companyApplicationEmail, setCompanyApplicationEmail] = useState("");


  const [paymentMode, setPaymentMode] = useState<PaymentMode | "">("");
  const [financeStatus, setFinanceStatus] = useState<FinanceStatus | "">("");


  // addons
  const [resumeValue, setResumeValue] = useState<string>("");
  const [portfolioValue, setPortfolioValue] = useState<string>("");
  const [linkedinValue, setLinkedinValue] = useState<string>("");
  const [githubValue, setGithubValue] = useState<string>("");
  const [coursesValue, setCoursesValue] = useState<string>("");


  const [badgeValue, setBadgeValue] = useState<string>("");
  const [jobBoardValue, setJobBoardValue] = useState<string>("");


  const [customLabel, setCustomLabel] = useState<string>("");
  const [customValue, setCustomValue] = useState<string>("");


  const [no_of_job_applications, set_no_of_job_applications] =
    useState<string>("");


  const [commitments, setCommitments] = useState<string>("");


  // subscription + totals
  const [applicationSaleValue, setApplicationSaleValue] = useState<number>(0);
  const [subscriptionCycle, setSubscriptionCycle] = useState<number>(30);


  // dates
  const [closedAtDate, setClosedAtDate] = useState<string>("");
  const [nextDueDate, setNextDueDate] = useState<string>("");


  // lead phone
  const [leadPhone, setLeadPhone] = useState<string>("");


  // display-only
  const [closerName, setCloserName] = useState<string>("");
  const [autoCalculatedValue, setAutoCalculatedValue] = useState<number>(0);


  const [monthlyInitialized, setMonthlyInitialized] = useState(false);


  /* --- Auto calc field --- */
  useEffect(() => {
    if (applicationSaleValue && subscriptionCycle) {
      setAutoCalculatedValue((subscriptionCycle / 30) * applicationSaleValue);
    } else {
      setAutoCalculatedValue(0);
    }
  }, [applicationSaleValue, subscriptionCycle]);


  /* ---------- Fetch latest sales_closure + leads ---------- */
  useEffect(() => {
    let mounted = true;


    (async () => {
      try {
        setLoading(true);
        setError(null);


        const { data: scData, error: scError } = await supabase
          .from("sales_closure")
          .select("*")
          .eq("lead_id", leadId)
          .order("closed_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle<SalesClosureRow>();


        if (scError) throw scError;


        if (!scData) {
          setError(`No sales_closure found for lead_id=${leadId}`);
        } else if (mounted) {
          setRecordId(scData.id);
          setOriginalTotal(Number(scData.sale_value || 0));


          setClientName(scData.lead_name ?? "");
          setClientEmail(scData.email ?? "");
          setCompanyApplicationEmail(scData.company_application_email ?? "");


          setPaymentMode((scData.payment_mode as PaymentMode) ?? "");
          setFinanceStatus((scData.finance_status as FinanceStatus) ?? "");


          setResumeValue(scData.resume_sale_value?.toString() ?? "");
          setPortfolioValue(scData.portfolio_sale_value?.toString() ?? "");
          setLinkedinValue(scData.linkedin_sale_value?.toString() ?? "");
          setGithubValue(scData.github_sale_value?.toString() ?? "");
          setCoursesValue(scData.courses_sale_value?.toString() ?? "");


          setBadgeValue(scData.badge_value?.toString() ?? "");
          setJobBoardValue(scData.job_board_value?.toString() ?? "");


          setCustomLabel(scData.custom_label ?? "");
          setCustomValue(scData.custom_sale_value?.toString() ?? "");


          setCommitments(scData.commitments ?? "");
          set_no_of_job_applications(
            scData.no_of_job_applications?.toString() || ""
          );


          setSubscriptionCycle(scData.subscription_cycle ?? 30);
          //   setApplicationSaleValue(Number(scData.application_sale_value || 0));


          // Convert stored multiplied value → base per-30-days value
          const stored = Number(scData.application_sale_value || 0);
          const cycle = scData.subscription_cycle ?? 30;
          const factor = cycle / 30;


          const baseValue = factor ? stored / factor : stored;


          setApplicationSaleValue(baseValue);


          setClosedAtDate(isoToDateOnly(scData.closed_at));
          setCloserName(scData.account_assigned_name || "");


          setMonthlyInitialized(false);
        }


        const { data: leadData, error: leadError } = await supabase
          .from("leads")
          .select("id, phone, name, email, business_id")
          .eq("business_id", leadId)
          .maybeSingle<LeadRow>();


        if (!leadError && leadData && mounted) {
          setLeadPhone(leadData.phone ?? "");
        }
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e?.message ?? "Failed to load records");
      } finally {
        if (mounted) setLoading(false);
      }
    })();


    return () => {
      mounted = false;
    };
  }, [leadId]);


  /* ---------- Monthly derive (same logic) ---------- */
  useEffect(() => {
    if (monthlyInitialized) return;
    const factor = cycleFactor(String(subscriptionCycle));
    if (!factor) return;


    const addonsTotal = sumAddons(
      resumeValue,
      portfolioValue,
      linkedinValue,
      githubValue,
      coursesValue,
      customValue,
      badgeValue,
      jobBoardValue
    );


    const baseTotal = Number(originalTotal || 0);
    const monthly = Math.max((baseTotal - addonsTotal) / factor, 0);


    // we don't show this field separately, but keeping logic same
    // if you want to show, add an Input and bind to this state
    // setSubscriptionSaleValue(round2(monthly).toFixed(2));


    setMonthlyInitialized(true);
  }, [
    monthlyInitialized,
    subscriptionCycle,
    originalTotal,
    resumeValue,
    portfolioValue,
    linkedinValue,
    githubValue,
    coursesValue,
    customValue,
    badgeValue,
    jobBoardValue,
  ]);


  /* ---------- Totals ---------- */
  const autoTotal = useMemo(() => {
    if (applicationSaleValue && subscriptionCycle) {
      return (subscriptionCycle / 30) * applicationSaleValue;
    }
    return 0;
  }, [applicationSaleValue, subscriptionCycle]);


  const totalSale = useMemo(() => {
    const addons = sumAddons(
      resumeValue,
      portfolioValue,
      linkedinValue,
      githubValue,
      coursesValue,
      customValue,
      badgeValue,
      jobBoardValue
    );
    return round2(autoTotal + addons);
  }, [
    autoTotal,
    resumeValue,
    portfolioValue,
    linkedinValue,
    githubValue,
    coursesValue,
    customValue,
    badgeValue,
    jobBoardValue,
  ]);


  /* ---------- Next due date ---------- */
  useEffect(() => {
    const days = cycleDays(String(subscriptionCycle));
    if (!days) {
      setNextDueDate("");
      return;
    }
    const base = closedAtDate || isoToDateOnly(new Date().toISOString());
    setNextDueDate(base ? addDaysFromYYYYMMDD(base, days) : "");
  }, [closedAtDate, subscriptionCycle]);


  /* ---------- Update handler ---------- */
  const handleUpdate = async () => {
    if (!recordId) {
      setError("Missing record id to update.");
      return;
    }
    if (!clientEmail) {
      alert("Client personal email is required.");
      return;
    }


    try {
      setSaving(true);
      setError(null);


      const factor = subscriptionCycle / 30;



      const payload: any = {
        lead_id: leadId as string,
        lead_name: clientName || null,
        email: clientEmail || null,
        company_application_email: companyApplicationEmail || null,


        payment_mode: paymentMode || null,
        subscription_cycle:
          subscriptionCycle || subscriptionCycle === 0
            ? Number(subscriptionCycle)
            : null,


        sale_value: Number(totalSale.toFixed(2)),
        // application_sale_value: safeParseFloatOrNull(autoCalculatedValue),


        // compute actual multiplied value for DB


        application_sale_value: round2(applicationSaleValue * factor),


        finance_status: financeStatus || null,


        resume_sale_value: safeParseFloatOrNull(resumeValue),
        portfolio_sale_value: safeParseFloatOrNull(portfolioValue),
        linkedin_sale_value: safeParseFloatOrNull(linkedinValue),
        github_sale_value: safeParseFloatOrNull(githubValue),
        courses_sale_value: safeParseFloatOrNull(coursesValue),


        badge_value: safeParseFloatOrNull(badgeValue),
        job_board_value: safeParseFloatOrNull(jobBoardValue),


        custom_label: customLabel || null,
        custom_sale_value: safeParseFloatOrNull(customValue),


        commitments: commitments || null,
        no_of_job_applications: safeParseFloatOrNull(no_of_job_applications),


        closed_at: dateOnlyToIsoUTC(closedAtDate),
        account_assigned_name: user?.name || user?.email || "Unknown",
        account_assigned_email: user?.email || null,
      };


      const { error: updateError } = await supabase
        .from("sales_closure")
        .update(payload)
        .eq("id", recordId);


      if (updateError) throw updateError;


      const { error: leadUpdateError } = await supabase
        .from("leads")
        .update({
          name: clientName,
          email: clientEmail,
          phone: leadPhone || null,
        })
        .eq("business_id", leadId);


      if (leadUpdateError) {
        console.warn("sales_closure updated but lead phone failed:", leadUpdateError);
        setError("Saved sale record, but failed to update lead phone.");
        return;
      }


      alert("Updated successfully.");
      router.back();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to update record(s)");
    } finally {
      setSaving(false);
    }
  };


  /* ---------- UI ---------- */
  return (
    // <DashboardLayout>
    <div className="p-6 pt-0">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Sale Close — {leadId}</h1>
      </div>


      {loading ? (
        <Card>
          <CardContent className="p-6">Loading latest sale record…</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-red-600">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>🧾 Update Client Sale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">


              {/* Client Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4 space-y-3">
                  <Label className="font-semibold">
                    Client Details <span className="text-red-500">*</span>
                  </Label>


                  <div className="space-y-1">
                    <Label>Client name</Label>
                    <Input
                      placeholder="Client Full Name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>


                  <div className="space-y-1">
                    <Label>Client personal email</Label>
                    <Input
                      placeholder="Client Email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required
                    />
                  </div>


                  <div className="space-y-1">
                    <Label>Client company email</Label>
                    <Input
                      placeholder="Company Application Email PWD: Created@123"
                      value={companyApplicationEmail}
                      onChange={(e) =>
                        setCompanyApplicationEmail(e.target.value)
                      }
                    />
                  </div>


                  <div className="space-y-1">
                    <Label>Sale Closed At</Label>
                    <Input
                      type="date"
                      value={closedAtDate}
                      onChange={(e) => setClosedAtDate(e.target.value)}
                    />
                  </div>


                  <div className="space-y-1">
                    <Label>Lead Phone</Label>
                    <Input
                      placeholder="Phone"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                    />
                  </div>
                </div>


                {/* Subscription + Payment */}
                <div className="border rounded-md p-4 space-y-3">
                  <Label className="font-semibold">
                    Subscription & Payment Info{" "}
                    <span className="text-red-500">*</span>
                  </Label>


                  <div className="space-y-3">


                    <Select
                      value={paymentMode}
                      onValueChange={(v) => setPaymentMode(v as PaymentMode)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Payment Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="PayPal">PayPal</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Credit/Debit Card">
                          Credit/Debit Card
                        </SelectItem>
                        <SelectItem value="Stripe">Stripe</SelectItem>
                        <SelectItem value="Razorpay">Razorpay</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>


                    <Select
                      value={String(subscriptionCycle)}
                      onValueChange={(v) => setSubscriptionCycle(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subscription Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No subscription</SelectItem>
                        <SelectItem value="15">15 Days</SelectItem>
                        <SelectItem value="30">1 Month</SelectItem>
                        <SelectItem value="60">2 Months</SelectItem>
                        <SelectItem value="90">3 Months</SelectItem>
                      </SelectContent>
                    </Select>


                    <div className="space-y-1">
                      <Label className="text-sm">Application Sale Value (editable)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={applicationSaleValue}
                        onChange={(e) =>
                          setApplicationSaleValue(
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>


                    <div className="space-y-1">
                      <Label className="text-sm">Auto-Calculated Value</Label>
                      <Input type="number" value={autoCalculatedValue} disabled />
                      <p className="text-xs text-gray-500">
                        Always = <code>(subscription_cycle / 30) × application_sale_value</code>
                      </p>
                    </div>


                    {/* No. of Job Applications */}
                    <div className="space-y-1">
                      <Label>
                        No. of Job Applications{" "}
                        <span className="text-red-700">*</span>
                      </Label>
                      <Select
                        value={no_of_job_applications}
                        onValueChange={(v) => set_no_of_job_applications(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select count" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No applications</SelectItem>
                          <SelectItem value="20">20+</SelectItem>
                          <SelectItem value="40">40+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value="Sale Closing By"
                        disabled
                        readOnly
                        className="text-gray-900 bg-gray-50 disabled:opacity-100"
                      />
                      <Input
                        value={closerName || "—"}
                        disabled
                        readOnly
                        className="text-gray-900 bg-gray-50 disabled:opacity-100"
                      />
                    </div>
                  </div>
                </div>
              </div>


              {/* Add-ons */}
              <div className="border rounded-md p-4 space-y-3">
                <Label className="font-semibold">Optional Add-On Services</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="Resume Value ($)"
                    value={resumeValue}
                    onChange={(e) => setResumeValue(e.target.value)}
                  />


                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="Portfolio Value ($)"
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(e.target.value)}
                  />


                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="LinkedIn Value ($)"
                    value={linkedinValue}
                    onChange={(e) => setLinkedinValue(e.target.value)}
                  />


                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="GitHub Value ($)"
                    value={githubValue}
                    onChange={(e) => setGithubValue(e.target.value)}
                  />


                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="Courses Value ($)"
                    value={coursesValue}
                    onChange={(e) => setCoursesValue(e.target.value)}
                  />


                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="Badge Value ($)"
                    value={badgeValue}
                    onChange={(e) => setBadgeValue(e.target.value)}
                  />


                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="Job Board Value ($)"
                    value={jobBoardValue}
                    onChange={(e) => setJobBoardValue(e.target.value)}
                  />


                  <div className="flex gap-2">
                    <Input
                      placeholder="Custom label"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      className="w-1/2"
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Custom value ($)"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      className="w-1/2"
                    />
                  </div>
                </div>


                <div className="border rounded-md p-4 space-y-2">
                  <Label className="font-semibold">Commitments</Label>
                  <Textarea
                    placeholder="Enter commitments…"
                    value={commitments}
                    onChange={(e) => setCommitments(e.target.value)}
                  />
                </div>
              </div>


              {/* Totals */}
              <div className="border rounded-md p-4">
                <Label className="font-semibold">Auto Calculated</Label>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                  <p>
                    Total Sale Value:{" "}
                    <strong>${totalSale.toFixed(2)}</strong>
                  </p>
                  <p>
                    Next Payment Due Date:{" "}
                    <strong>{nextDueDate || "-"}</strong>
                  </p>
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={handleUpdate}
                    disabled={saving}
                  >
                    {saving ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>


            </CardContent>
          </Card>
        </div>
      )}
    </div>
    // </DashboardLayout>
  );
}



