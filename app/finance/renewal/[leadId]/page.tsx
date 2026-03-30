// //app/finance/renewal/%5BleadId%5D/page.tsx
// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { supabase } from "@/utils/supabase/client";
// import { toast } from "sonner";
// import { DashboardLayout } from "@/components/layout/dashboard-layout";

// import { Trash2Icon, Edit2Icon, Edit } from "lucide-react";

// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Console } from "console";

// export default function RenewalPage() {
//   const { leadId } = useParams();
//   const router = useRouter();

//   /* ---------------- STATE ---------------- */
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   // Lead + existing record
//   const [client, setClient] = useState<any>(null);

//   // Client Details
//   const [clientName, setClientName] = useState("");
//   const [clientEmail, setClientEmail] = useState("");
//   const [companyApplicationEmail, setCompanyApplicationEmail] = useState("");
//   const [leadPhone, setLeadPhone] = useState("");
//   const [city, setCity] = useState("");

//   const [originalClosedAtDate, setOriginalClosedAtDate] = useState<Date | null>(null);


//   // Subscription / Payment
//   const [paymentMode, setPaymentMode] = useState("");
//   const [subscriptionCycle, setSubscriptionCycle] = useState<number | string>("");
//   const [applicationSaleValue, setApplicationSaleValue] = useState(0);
//   const [closedAtDate, setClosedAtDate] = useState("");
//   const [closerName, setCloserName] = useState("");

//   // Add-ons
//   const [resumeValue, setResumeValue] = useState("");
//   const [portfolioValue, setPortfolioValue] = useState("");
//   const [linkedinValue, setLinkedinValue] = useState("");
//   const [githubValue, setGithubValue] = useState("");
//   const [coursesValue, setCoursesValue] = useState("");
//   const [badgeValue, setBadgeValue] = useState("");
//   const [jobBoardValue, setJobBoardValue] = useState("");
//   const [customLabel, setCustomLabel] = useState("");
//   const [customValue, setCustomValue] = useState("");
//   const [no_of_job_applications, set_no_of_job_applications] = useState("");

//   // Commitments
//   const [commitments, setCommitments] = useState("");

// const [history, setHistory] = useState<any[]>([]);
// const [historyLoading, setHistoryLoading] = useState(true);
// const [showHistoryPane, setShowHistoryPane] = useState(true); // always true


//   // Auto-calculations
//   const autoCalculatedValue = Number(subscriptionCycle) > 0
//     ? (Number(subscriptionCycle) / 30) * Number(applicationSaleValue)
//     : 0;

//   const totalSale =
//     autoCalculatedValue +
//     Number(resumeValue || 0) +
//     Number(portfolioValue || 0) +
//     Number(linkedinValue || 0) +
//     Number(githubValue || 0) +
//     Number(coursesValue || 0) +
//     Number(badgeValue || 0) +
//     Number(jobBoardValue || 0) +
//     Number(customValue || 0);

//     // const intsubscriptionCycle = Number(subscriptionCycle);
//   const nextDueDate = closedAtDate
//     ? new Date(new Date(closedAtDate).getTime() + Number(subscriptionCycle) * 24 * 60 * 60 * 1000)
//         .toISOString()
//         .split("T")[0]
//     : null;

//   /* ---------------- FETCH DATA ---------------- */

//     let subscriptionCloseDate = 0;

//   async function fetchData() {

//           console.log("Fetched id:", leadId);


//     // fetch lead
//     const { data: lead, error: leadError } = await supabase
//   .from("leads")
//   .select("*")
//   .eq("business_id", leadId)
//   .limit(1) // ensures at most one row
//   .single(); // use single instead of maybeSingle to safely return one object

// if (!lead || lead.length === 0) {
//   toast.error("Lead not found");
//   setLoading(false);
//   return;
// }

//        // fetch sale
//   const { data: sale } = await supabase
//   .from("sales_closure")
//   .select("*")
//   .eq("lead_id", lead.business_id)
//   .order("closed_at", { ascending: false })
//   .limit(1)
//   .single(); // This works because result will be exactly 1 row

//       console.log("Fetched id:", sale);

//     if (!lead) {
//       toast.error("Lead not found.");
//       setClient(null);
//       setLoading(false);
//       return;
//     }

//     console.log(lead);

//     setClient(lead);

//     // Prefill client data
//     setClientName(lead.name);
//     setClientEmail(lead.email);
//     setLeadPhone(lead.phone ?? "");
//     setCity(lead.city ?? "");

//     // Prefill sale data
//     if (sale) {
//       setPaymentMode(sale.payment_mode);
//       setSubscriptionCycle(sale.subscription_cycle);
//       setApplicationSaleValue(sale.sale_value);
//     //   setClosedAtDate(new Date().toISOString().split("T")[0]);
//     // const closed_at_date = new Date(sale.closed_at).toISOString().split("T")[0]
//      const fetchedClosedAt = sale.closed_at
//     ? new Date(new Date(sale.closed_at).getTime() + 24 * 60 * 60 * 1000)
//     : new Date();

//   // Store original fetched date separately
//   setOriginalClosedAtDate(fetchedClosedAt);
//    setClosedAtDate(fetchedClosedAt.toISOString().split("T")[0]);


// if(sale.subscription_cycle==15)
// {
//     setApplicationSaleValue(sale.application_sale_value * 2);
// }
// else if(sale.subscription_cycle==30)
// {
//     setApplicationSaleValue(sale.application_sale_value);
// }   
// else if(sale.subscription_cycle==60)
// {
//     setApplicationSaleValue(sale.application_sale_value / 2);
// }   
// else if(sale.subscription_cycle==90)
// {
//     setApplicationSaleValue(sale.application_sale_value / 3);
// }

//     subscriptionCloseDate= sale.onboarded_date+sale.subscription_cycle*24*60*60*1000;
//       setCompanyApplicationEmail(sale.company_application_email ?? "");
//       setCloserName(sale.closed_by ?? "");
//       set_no_of_job_applications(sale.no_of_job_applications || "");
//     }

//     setLoading(false);
//   }

//   useEffect(() => {
//     fetchData();
//   }, []);

//  // Move function OUTSIDE useEffect so it can be reused
// async function fetchHistory() {
//   if (!leadId) return;

//   setHistoryLoading(true);

//   const { data, error } = await supabase
//     .from("sales_closure")
//     .select("*")
//     .eq("lead_id", leadId)
//     .order("closed_at", { ascending: false });

//   if (error) console.error(error);
//   else setHistory(data || []);

//   setHistoryLoading(false);
// }

// // Now useEffect just calls it
// useEffect(() => {
//   fetchHistory();
// }, [leadId]);

// async function handleSubmit() {
//   if (!clientName || !clientEmail || !paymentMode) {
//     alert("Please fill required fields before submitting.");
//     return;
//   }

//   if (!closedAtDate) {
//     alert("Please select closed date to proceed.");
//     return;
//   }

//  if (no_of_job_applications === "none") {
//   alert("Please select no of job applications to proceed.");
//   return;
// }


//   setSaving(true);

//   // Update Lead
//   await supabase.from("leads").update({
//     name: clientName,
//     email: clientEmail,
//     phone: leadPhone,
//     // application_email: companyApplicationEmail,
//     city,
//   }).eq("business_id", leadId);

//   // Insert Renewal

//   // ------------------ Compute onboarded_date ------------------
//   if (!originalClosedAtDate) return; // safety check

// const closedPlus45 = new Date(
//   originalClosedAtDate.getTime() +Number(subscriptionCycle)* 24 * 60 * 60 * 1000 + 45 * 24 * 60 * 60 * 1000
// );

// // console.log("Subscription cycle days:", Number(subscriptionCycle));
// // console.log("original closed at date:", originalClosedAtDate.getTime());
// // console.log("45 * 24 * 60 * 60 * 1000",45 * 24 * 60 * 60 * 1000)
// // console.log("==========================================")
// // Apply onboarded date logic based on original closed date
// const onboardedDate =
//   closedPlus45 > new Date() ? closedAtDate: null;

// // console.log("Original closed:", originalClosedAtDate);
// // console.log("Closed + 45 days:", closedPlus45);
// // console.log("Onboarded date:", onboardedDate);

// // console.log("==========================================")
// //   console.log("Subscription cycle days:", Number(subscriptionCycle));
// // console.log("original closed at date:", originalClosedAtDate.getTime());
// // console.log("45 * 24 * 60 * 60 * 1000",45 * 24 * 60 * 60 * 1000)

// const { error } = await supabase.from("sales_closure").insert({
//     lead_id: leadId,
//     lead_name: clientName,
//     email: clientEmail,
//     company_application_email: companyApplicationEmail,
//     payment_mode: paymentMode,
//     sale_value: totalSale,
//     subscription_cycle: Number(subscriptionCycle),
//     closed_at: closedAtDate,
//     finance_status: "Paid",
//     commitments,
//     application_sale_value: Number(autoCalculatedValue),
//     resume_sale_value: Number(resumeValue || 0),
//     portfolio_sale_value: Number(portfolioValue || 0),
//     linkedin_sale_value: Number(linkedinValue || 0),
//     github_sale_value: Number(githubValue || 0),
//     courses_sale_value: Number(coursesValue || 0),
//     job_board_value: Number(jobBoardValue || 0),
//     badge_value: Number(badgeValue || 0),
//     custom_sale_value: Number(customValue || 0),
//     custom_label: customLabel || "",
//     no_of_job_applications,
//     onboarded_date: onboardedDate
//   });


//   if (error) {
//     toast.error(error.message);
//     console.log(error);
//     setSaving(false);
//     return;
//   }

//   fetchHistory(); // refresh sidebar
//   toast.success("Renewal submitted successfully 🎉");
//   setSaving(false);

//   setTimeout(() => confirmCloseAction(), 600);
// }

//   function confirmCloseAction() {
//     const choice = window.confirm(
//       "🎉 Renewal submitted successfully!\n\nDo you want to close this page?"
//     );

//     if (choice) {
//       window.close();
//     } else {
//       toast("Page will remain open.");
//     }
//   }

//   /* ---------------- UI ---------------- */

//   if (loading) return <p className="p-6">Loading...</p>;
//   if (!client)
//     return (
//       <div className="text-center text-red-600 p-10 text-xl">
//         ⚠️ Lead not found
//       </div>
//     );

//     const highlight = (value: number) =>
//   value > 0 ? "text-green-600 font-semibold" : "text-gray-800";



//   return (
//     <DashboardLayout>
//     <div className="flex gap-4 w-full p-6 pt-0">
//       {/* <div className="mb-2 flex items-center justify-between">
//         <h1 className="text-2xl font-bold">

//         </h1>
//       </div> */}

//       <div className="flex-1">

//         <Card className="lg:col-span-2">
//           <CardHeader>
//             <CardTitle>  Payment Renewal — {clientName} - {leadId}</CardTitle>
//           </CardHeader>

//           <CardContent className="space-y-6">
//             {/* ---------------- Client Details ---------------- */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="border rounded-md p-4 space-y-3">
//                 <Label className="font-semibold">
//                   Client Details <span className="text-red-500">*</span>
//                 </Label>

//                 <Input
//                   placeholder="Client Name"
//                   value={clientName}
//                   onChange={(e) => setClientName(e.target.value)}
//                 />

//                 <Input
//                   placeholder="Client Email"
//                   value={clientEmail}
//                   onChange={(e) => setClientEmail(e.target.value)}
//                 />

//                 <Input
//                   placeholder="Company Email"
//                   value={companyApplicationEmail}
//                   onChange={(e) =>
//                     setCompanyApplicationEmail(e.target.value)
//                   }
//                 />

//                 <Input
//                   placeholder="Lead Phone"
//                   value={leadPhone}
//                   onChange={(e) => setLeadPhone(e.target.value)}
//                 />

//                 <Input
//                   placeholder="City"
//                   value={city}
//                   onChange={(e) => setCity(e.target.value)}
//                 />
//               </div>

//               {/* ---------------- Subscription & Payment ---------------- */}
//               <div className="border rounded-md p-4 space-y-3">
//                 <Label className="font-semibold">
//                   Subscription & Payment Info <span className="text-red-500">*</span>
//                 </Label>

//                 <Select
//                   value={paymentMode}
//                   onValueChange={(v) => setPaymentMode(v)}
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select Payment Mode" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="UPI">UPI</SelectItem>
//                     <SelectItem value="PayPal">PayPal</SelectItem>
//                     <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
//                     <SelectItem value="Stripe">Stripe</SelectItem>
//                     <SelectItem value="Razorpay">Razorpay</SelectItem>
//                     <SelectItem value="Credit/Debit Card">Credit/Debit Card</SelectItem>
//                     <SelectItem value="Other">Other</SelectItem>
//                   </SelectContent>
//                 </Select>

//                 <Select
//                   value={String(subscriptionCycle)}
//                   onValueChange={(v) => setSubscriptionCycle(Number(v))}
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Subscription Duration" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="0">No subscription cycle</SelectItem>
//                     <SelectItem value="15">15 Days</SelectItem>
//                     <SelectItem value="30">1 Month</SelectItem>
//                     <SelectItem value="60">2 Months</SelectItem>
//                     <SelectItem value="90">3 Months</SelectItem>
//                   </SelectContent>
//                 </Select>

//                 <Input
//                   type="number"
//                   placeholder="Application Sale Value"
//                   value={applicationSaleValue}
//                   onChange={(e) =>
//                     setApplicationSaleValue(parseFloat(e.target.value) || 0)
//                   }
//                 />

//                 <Input type="number" disabled value={autoCalculatedValue} />

//                 <Input
//                   type="date"
//                   value={closedAtDate}
//                   onChange={(e) => setClosedAtDate(e.target.value)}
//                   required
//                 />
//               </div>
//             </div>

//             {/* ---------------- Add-ons ---------------- */}
//             <div className="border rounded-md p-4 space-y-3">
//               <Label className="font-semibold">
//                 Optional Add-on Services
//               </Label>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <Input
//                   placeholder="Resume Value ($)"
//                   value={resumeValue}
//                   onChange={(e) => setResumeValue(e.target.value)}
//                 />
//                 <Input
//                   placeholder="Portfolio ($)"
//                   value={portfolioValue}
//                   onChange={(e) => setPortfolioValue(e.target.value)}
//                 />
//                 <Input
//                   placeholder="LinkedIn Optimization ($)"
//                   value={linkedinValue}
//                   onChange={(e) => setLinkedinValue(e.target.value)}
//                 />
//                 <Input
//                   placeholder="GitHub Setup ($)"
//                   value={githubValue}
//                   onChange={(e) => setGithubValue(e.target.value)}
//                 />
//                 <Input
//                   placeholder="Courses ($)"
//                   value={coursesValue}
//                   onChange={(e) => setCoursesValue(e.target.value)}
//                 />
//                 <Input
//                   placeholder="Badge Value ($)"
//                   value={badgeValue}
//                   onChange={(e) => setBadgeValue(e.target.value)}
//                 />
//                 <Input
//                   placeholder="Job Board Access Value ($)"
//                   value={jobBoardValue}
//                   onChange={(e) => setJobBoardValue(e.target.value)}
//                 />

//                 <div className="flex gap-2">
//                   <Input
//                     placeholder="Custom label"
//                     value={customLabel}
//                     onChange={(e) => setCustomLabel(e.target.value)}
//                     className="w-1/2"
//                   />
//                   <Input
//                     type="number"
//                     placeholder="Custom value ($)"
//                     value={customValue}
//                     onChange={(e) => setCustomValue(e.target.value)}
//                     className="w-1/2"
//                   />
//                 </div>

//                  <Select
//                   value={String(no_of_job_applications)}
//                   onValueChange={(v) => set_no_of_job_applications(v)}
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="No of applications" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {/* <SelectItem value="">Select no of applications</SelectItem> */}
//                     <SelectItem value="none">Select no of applications</SelectItem>

//                     <SelectItem value="0">No applications</SelectItem>
//                     <SelectItem value="20">20+</SelectItem>
//                     <SelectItem value="40">40+</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               <Label>Commitments</Label>
//               <Textarea
//                 placeholder="Write commitments..."
//                 value={commitments}
//                 onChange={(e) => setCommitments(e.target.value)}
//               />
//             </div>

//             {/* ---------------- Total + Action ---------------- */}
//             <div className="border rounded-md p-4 space-y-2">
//               <Label className="font-semibold">Auto Calculated</Label>

//               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
//                 <p>
//                   Total Sale Value:{" "}
//                   <strong>${totalSale.toFixed(2)}</strong>
//                 </p>
//                 <p>
//                   Next Payment Due:{" "}
//                   <strong>{nextDueDate || "—"}</strong>
//                 </p>
//                 <Button
//                   className="bg-green-600 text-white"
//                   onClick={handleSubmit}
//                   disabled={saving}
//                 >
//                   {saving ? "Saving..." : "Submit Renewal"}
//                 </Button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//       {/* RIGHT SIDE — Payment History */}
//  <div className="w-[350px] border rounded-lg bg-white p-4 max-h-[85vh] overflow-y-auto shadow">

//   {/* Header Row */}
//   <div className="flex justify-between items-center mb-2">
//     <h2 className="text-lg font-semibold">Payment History</h2>

//     {/* EDIT BUTTON */}
//     <Button
//       variant="outline"
//       size="sm"
//       onClick={() => {
//         window.open(`/client_sale_history_update/${leadId}`, "_blank");
//       }}
//     >
//       < Edit className="mr-2 h-4 w-4 text-blue-500" /><Trash2Icon className="text-red-500"/>
//     </Button>
//   </div>

//    {historyLoading ? (
//   <p className="text-gray-500">Loading...</p>
// ) : history.length === 0 ? (
//   <p className="text-gray-500">No previous payments found.</p>
// ) : (
//   <div className="space-y-3">
//     {history.map((item) => (
//       <div
//         key={item.id}
//         className="border rounded-md p-3 bg-gray-50 hover:bg-gray-100 transition"
//       >
//         {/* Header - Client Name + Latest Payment Date */}
//         <div className="mb-2">
//           <p className="text-sm font-medium text-gray-900">
//             {item.lead_name || clientName}
//           </p>

//         </div>

//         {/* 🔥 Two-column layout */}
//         <div className="grid grid-cols-2 gap-4 text-xs">

//           {/* LEFT COLUMN */}
//           <div className="space-y-1">
//             <p><span className="text-gray-500">Status:</span> <span className="text-blue-500 font-semibold">{item.finance_status}</span></p>

//             <p>
//               <span className="text-gray-500">Last Paid:</span>{" "}
//               <span className="text-gray-900">
//                 {new Date(item.closed_at).toLocaleDateString()}
//               </span>
//             </p>

//             <p>
//               <span className="text-gray-500">Onboarded:</span>{" "}
//               <span className="text-gray-900">
//                 {item.onboarded_date
//                   ? new Date(item.onboarded_date).toLocaleDateString()
//                   : "—"}
//               </span>
//             </p>
// <p>
//               <span className="text-gray-500">Subscription cycle:</span>{" "}<br></br>
//              <span className="text-gray-900 font-semibold">
//                 {item.subscription_cycle} days
//               </span>
//             </p>
//             <p>
//               <span className="text-gray-500">Associate/TL:</span>{" "}
//               <span className="text-gray-900">
//                 {item.associates_tl_name || "Not assigned"}
//               </span>
//             </p>
//             <p className="gap-2 pt-4">
//           <span
//   className={`px-2 py-1 text-xs rounded-md  ${
//     item.application_sale_value > 0
//       ? "bg-green-100 text-green-700 border border-green-300"
//       : "bg-red-100 text-red-700 border border-red-300"
//   }`}
// >
//   {item.application_sale_value > 0 ? "Applications Paid" : "No Applications"}
// </span>
// </p>
//           </div>

//           {/* RIGHT COLUMN — ITEM BREAKDOWN */}
//           {/* RIGHT COLUMN — ITEM BREAKDOWN */}
// {/* RIGHT COLUMN — ITEM BREAKDOWN */}
// <div className="space-y-1 text-xs">
//   <p
//     className={
//       Number(item.application_sale_value || 0) > 0
//         ? "text-green-600 font-semibold"
//         : "text-gray-900"
//     }
//   >
//     Applications: ${item.application_sale_value || 0}
//   </p>

//   <p
//     className={
//       Number(item.resume_sale_value || 0) > 0
//         ? "text-green-600 font-semibold"
//         : "text-gray-900"
//     }
//   >
//     Resume: ${item.resume_sale_value || 0}
//   </p>

//   <p
//     className={
//       Number(item.linkedin_sale_value || 0) > 0
//         ? "text-green-600 font-semibold"
//         : "text-gray-900"
//     }
//   >
//     LinkedIn: ${item.linkedin_sale_value || 0}
//   </p>

//   <p
//     className={
//       Number(item.portfolio_sale_value || 0) > 0
//         ? "text-green-600 font-semibold"
//         : "text-gray-900"
//     }
//   >
//     Portfolio: ${item.portfolio_sale_value || 0}
//   </p>

//   <p
//     className={
//       Number(item.github_sale_value || 0) > 0
//         ? "text-green-600 font-semibold"
//         : "text-gray-900"
//     }
//   >
//     GitHub: ${item.github_sale_value || 0}
//   </p>

//   <p
//     className={
//       Number(item.badge_value || 0) > 0
//         ? "text-green-600 font-semibold"
//         : "text-gray-900"
//     }
//   >
//     Badge: ${item.badge_value || 0}
//   </p>

//   <p
//     className={
//       Number(item.job_board_value || 0) > 0
//         ? "text-green-600 font-semibold"
//         : "text-gray-900"
//     }
//   >
//     Job Board: ${item.job_board_value || 0}
//   </p>

//   <p
//     className={
//       Number(item.course_sale_value || 0) > 0
//         ? "text-green-600 font-semibold"
//         : "text-gray-900"
//     }
//   >
//     Course: ${item.course_sale_value || 0}
//   </p>

//   <p className="text-gray-900">
//     Applications Count: {item.no_of_job_applications || 0}
//   </p>

//   <p className="text-green-600 font-bold border-t pt-1">
//     Total Sale: ${item.sale_value || 0}
//   </p>
// </div>


//         </div>
//       </div>
//     ))}
//   </div>
// )}

//   </div>


//     </div>
//     </DashboardLayout>
//   );
// }





//app/finance/renewal/%5BleadId%5D/page.tsx
"use client";

import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

import { Trash2Icon, Edit2Icon, Edit } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Console } from "console";

export default function RenewalPage() {
  const { leadId } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  /* ---------------- STATE ---------------- */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lead + existing record
  const [client, setClient] = useState<any>(null);

  // Client Details
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [companyApplicationEmail, setCompanyApplicationEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [city, setCity] = useState("");

  const [originalClosedAtDate, setOriginalClosedAtDate] = useState<Date | null>(null);


  // Subscription / Payment
  const [paymentMode, setPaymentMode] = useState("");
  const [subscriptionCycle, setSubscriptionCycle] = useState<number | string>("");
  const [applicationSaleValue, setApplicationSaleValue] = useState(0);
  const [closedAtDate, setClosedAtDate] = useState("");
  const [closerName, setCloserName] = useState("");

  // Add-ons
  const [resumeValue, setResumeValue] = useState("");
  const [portfolioValue, setPortfolioValue] = useState("");
  const [linkedinValue, setLinkedinValue] = useState("");
  const [githubValue, setGithubValue] = useState("");
  const [coursesValue, setCoursesValue] = useState("");
  const [badgeValue, setBadgeValue] = useState("");
  const [jobBoardValue, setJobBoardValue] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [no_of_job_applications, set_no_of_job_applications] = useState("");

  // Commitments
  const [commitments, setCommitments] = useState("");

  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistoryPane, setShowHistoryPane] = useState(true); // always true


  // Auto-calculations
  const autoCalculatedValue = Number(subscriptionCycle) > 0
    ? (Number(subscriptionCycle) / 30) * Number(applicationSaleValue)
    : 0;

  const totalSale =
    autoCalculatedValue +
    Number(resumeValue || 0) +
    Number(portfolioValue || 0) +
    Number(linkedinValue || 0) +
    Number(githubValue || 0) +
    Number(coursesValue || 0) +
    Number(badgeValue || 0) +
    Number(jobBoardValue || 0) +
    Number(customValue || 0);

  // const intsubscriptionCycle = Number(subscriptionCycle);
  const nextDueDate = closedAtDate
    ? new Date(new Date(closedAtDate).getTime() + Number(subscriptionCycle) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
    : null;

  /* ---------------- FETCH DATA ---------------- */

  let subscriptionCloseDate = 0;

  async function fetchData() {

    console.log("Fetched id:", leadId);


    // fetch lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("business_id", leadId)
      .limit(1) // ensures at most one row
      .single(); // use single instead of maybeSingle to safely return one object

    if (!lead || lead.length === 0) {
      toast.error("Lead not found");
      setLoading(false);
      return;
    }

    // fetch sale
    const { data: sale } = await supabase
      .from("sales_closure")
      .select("*")
      .eq("lead_id", lead.business_id)
      .order("closed_at", { ascending: false })
      .limit(1)
      .single(); // This works because result will be exactly 1 row

    console.log("Fetched id:", sale);

    if (!lead) {
      toast.error("Lead not found.");
      setClient(null);
      setLoading(false);
      return;
    }

    console.log(lead);

    setClient(lead);

    // Prefill client data
    setClientName(lead.name);
    setClientEmail(lead.email);
    setLeadPhone(lead.phone ?? "");
    setCity(lead.city ?? "");

    // Prefill sale data
    if (sale) {
      setPaymentMode(sale.payment_mode);
      setSubscriptionCycle(sale.subscription_cycle);
      setApplicationSaleValue(sale.sale_value);
      //   setClosedAtDate(new Date().toISOString().split("T")[0]);
      // const closed_at_date = new Date(sale.closed_at).toISOString().split("T")[0]
      const fetchedClosedAt = sale.closed_at
        ? new Date(new Date(sale.closed_at).getTime() + 24 * 60 * 60 * 1000)
        : new Date();

      // Store original fetched date separately
      setOriginalClosedAtDate(fetchedClosedAt);
      setClosedAtDate(new Date().toISOString().split("T")[0]);


      if (sale.subscription_cycle == 15) {
        setApplicationSaleValue(sale.application_sale_value * 2);
      }
      else if (sale.subscription_cycle == 30) {
        setApplicationSaleValue(sale.application_sale_value);
      }
      else if (sale.subscription_cycle == 60) {
        setApplicationSaleValue(sale.application_sale_value / 2);
      }
      else if (sale.subscription_cycle == 90) {
        setApplicationSaleValue(sale.application_sale_value / 3);
      }

      subscriptionCloseDate = sale.onboarded_date + sale.subscription_cycle * 24 * 60 * 60 * 1000;
      setCompanyApplicationEmail(sale.company_application_email ?? "");
      setCloserName(sale.closed_by ?? "");
      set_no_of_job_applications(sale.no_of_job_applications || "");
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const dateWithTime = (dateStr: string) => {
    const now = new Date();
    const d = new Date(dateStr);
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return d.toISOString();
  };

  // Move function OUTSIDE useEffect so it can be reused
  async function fetchHistory() {
    if (!leadId) return;

    setHistoryLoading(true);

    const { data, error } = await supabase
      .from("sales_closure")
      .select("*")
      .eq("lead_id", leadId)
      .order("closed_at", { ascending: false });

    if (error) console.error(error);
    else setHistory(data || []);

    setHistoryLoading(false);
  }

  // Now useEffect just calls it
  useEffect(() => {
    fetchHistory();
  }, [leadId]);

  async function handleSubmit() {

    // Get the REAL authenticated user from Supabase
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      alert("User session not found. Please login again.");
      return;
    }

    if (!clientName || !clientEmail || !paymentMode) {
      alert("Please fill required fields before submitting.");
      return;
    }

    if (!closedAtDate) {
      alert("Please select closed date to proceed.");
      return;
    }

    if (no_of_job_applications === "none") {
      alert("Please select no of job applications to proceed.");
      return;
    }

    setSaving(true);

    // Update Lead
    await supabase
      .from("leads")
      .update({
        name: clientName,
        email: clientEmail,
        phone: leadPhone,
        city,
      })
      .eq("business_id", leadId);


    // ------------------ Compute onboarded_date ------------------
    if (!originalClosedAtDate) return;

    const closedPlus45 = new Date(
      originalClosedAtDate.getTime() +
      Number(subscriptionCycle) * 24 * 60 * 60 * 1000 +
      45 * 24 * 60 * 60 * 1000
    );

    const onboardedDate =
      closedPlus45 > new Date() ? closedAtDate : null;


    // Insert Renewal
    const { error } = await supabase.from("sales_closure").insert({

      lead_id: leadId,
      lead_name: clientName,
      email: clientEmail,
      company_application_email: companyApplicationEmail,
      payment_mode: paymentMode,
      sale_value: totalSale,
      subscription_cycle: Number(subscriptionCycle),
      closed_at: dateWithTime(closedAtDate),
      finance_status: "Paid",

      commitments,

      application_sale_value: Number(autoCalculatedValue),
      resume_sale_value: Number(resumeValue || 0),
      portfolio_sale_value: Number(portfolioValue || 0),
      linkedin_sale_value: Number(linkedinValue || 0),
      github_sale_value: Number(githubValue || 0),
      courses_sale_value: Number(coursesValue || 0),
      job_board_value: Number(jobBoardValue || 0),
      badge_value: Number(badgeValue || 0),
      custom_sale_value: Number(customValue || 0),
      custom_label: customLabel || "",

      no_of_job_applications,
      onboarded_date: onboardedDate,

      // 🔥 Correct Finance Associate
      account_assigned_name:
        authUser?.user_metadata?.name ??
        authUser?.email ??
        "Unknown",

      account_assigned_email:
        authUser?.email ?? null
    });


    // Log Renewal in Call History
    if (!error) {
      await supabase.from("call_history").insert([{
        lead_id: leadId,
        email: clientEmail,
        assigned_to:
          authUser?.user_metadata?.name ??
          authUser?.email ??
          "Finance",

        current_stage: "Renewal Confirmed",
        followup_date: dayjs().format("YYYY-MM-DD"),
        call_started_at: dayjs().toISOString(),

        notes: `RENEWAL COMPLETED by ${authUser?.user_metadata?.name ??
          authUser?.email ??
          "Finance Associate"
          }: Client renewed for ${subscriptionCycle} days. Next due: ${nextDueDate || "N/A"
          }. Total Sale: $${totalSale}.`
      }]);
    }


    if (error) {
      toast.error(error.message);
      console.log(error);
      setSaving(false);
      return;
    }

    fetchHistory();

    toast.success("Renewal submitted successfully 🎉");

    setSaving(false);

    setTimeout(() => confirmCloseAction(), 600);
  }

  function confirmCloseAction() {
    const choice = window.confirm(
      "🎉 Renewal submitted successfully!\n\nDo you want to close this page?"
    );

    if (choice) {
      window.close();
    } else {
      toast("Page will remain open.");
    }
  }

  /* ---------------- UI ---------------- */

  if (loading) return <p className="p-6">Loading...</p>;
  if (!client)
    return (
      <div className="text-center text-red-600 p-10 text-xl">
        ⚠️ Lead not found
      </div>
    );

  const highlight = (value: number) =>
    value > 0 ? "text-green-600 font-semibold" : "text-gray-800";



  return (
    <DashboardLayout>
      <div className="flex gap-4 w-full p-6 pt-0">
        {/* <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
        
        </h1>
      </div> */}

        <div className="flex-1">

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>  Payment Renewal — {clientName} - {leadId}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* ---------------- Client Details ---------------- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4 space-y-3">
                  <Label className="font-semibold">
                    Client Details <span className="text-red-500">*</span>
                  </Label>

                  <Input
                    placeholder="Client Name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />

                  <Input
                    placeholder="Client Email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />

                  <Input
                    placeholder="Company Email"
                    value={companyApplicationEmail}
                    onChange={(e) =>
                      setCompanyApplicationEmail(e.target.value)
                    }
                  />

                  <Input
                    placeholder="Lead Phone"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                  />

                  <Input
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                {/* ---------------- Subscription & Payment ---------------- */}
                <div className="border rounded-md p-4 space-y-3">
                  <Label className="font-semibold">
                    Subscription & Payment Info <span className="text-red-500">*</span>
                  </Label>

                  <Select
                    value={paymentMode}
                    onValueChange={(v) => setPaymentMode(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Payment Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="PayPal">PayPal</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                      <SelectItem value="Razorpay">Razorpay</SelectItem>
                      <SelectItem value="Credit/Debit Card">Credit/Debit Card</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(subscriptionCycle)}
                    onValueChange={(v) => setSubscriptionCycle(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Subscription Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No subscription cycle</SelectItem>
                      <SelectItem value="15">15 Days</SelectItem>
                      <SelectItem value="30">1 Month</SelectItem>
                      <SelectItem value="60">2 Months</SelectItem>
                      <SelectItem value="90">3 Months</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder="Application Sale Value"
                    value={applicationSaleValue}
                    onChange={(e) =>
                      setApplicationSaleValue(parseFloat(e.target.value) || 0)
                    }
                  />

                  <Input type="number" disabled value={autoCalculatedValue} />

                  <Input
                    type="date"
                    value={closedAtDate}
                    onChange={(e) => setClosedAtDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* ---------------- Add-ons ---------------- */}
              <div className="border rounded-md p-4 space-y-3">
                <Label className="font-semibold">
                  Optional Add-on Services
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Resume Value ($)"
                    value={resumeValue}
                    onChange={(e) => setResumeValue(e.target.value)}
                  />
                  <Input
                    placeholder="Portfolio ($)"
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(e.target.value)}
                  />
                  <Input
                    placeholder="LinkedIn Optimization ($)"
                    value={linkedinValue}
                    onChange={(e) => setLinkedinValue(e.target.value)}
                  />
                  <Input
                    placeholder="GitHub Setup ($)"
                    value={githubValue}
                    onChange={(e) => setGithubValue(e.target.value)}
                  />
                  <Input
                    placeholder="Courses ($)"
                    value={coursesValue}
                    onChange={(e) => setCoursesValue(e.target.value)}
                  />
                  <Input
                    placeholder="Badge Value ($)"
                    value={badgeValue}
                    onChange={(e) => setBadgeValue(e.target.value)}
                  />
                  <Input
                    placeholder="Job Board Access Value ($)"
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
                      placeholder="Custom value ($)"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      className="w-1/2"
                    />
                  </div>

                  <Select
                    value={String(no_of_job_applications)}
                    onValueChange={(v) => set_no_of_job_applications(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No of applications" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* <SelectItem value="">Select no of applications</SelectItem> */}
                      <SelectItem value="none">Select no of applications</SelectItem>

                      <SelectItem value="0">No applications</SelectItem>
                      <SelectItem value="20">20+</SelectItem>
                      <SelectItem value="40">40+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Label>Commitments</Label>
                <Textarea
                  placeholder="Write commitments..."
                  value={commitments}
                  onChange={(e) => setCommitments(e.target.value)}
                />
              </div>

              {/* ---------------- Total + Action ---------------- */}
              <div className="border rounded-md p-4 space-y-2">
                <Label className="font-semibold">Auto Calculated</Label>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p>
                    Total Sale Value:{" "}
                    <strong>${totalSale.toFixed(2)}</strong>
                  </p>
                  <p>
                    Next Payment Due:{" "}
                    <strong>{nextDueDate || "—"}</strong>
                  </p>
                  <Button
                    className="bg-green-600 text-white"
                    onClick={handleSubmit}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Submit Renewal"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* RIGHT SIDE — Payment History */}
        <div className="w-[350px] border rounded-lg bg-white p-4 max-h-[85vh] overflow-y-auto shadow">

          {/* Header Row */}
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Payment History</h2>

            {/* EDIT BUTTON */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/client_sale_history_update/${leadId}`, "_blank");
              }}
            >
              < Edit className="mr-2 h-4 w-4 text-blue-500" /><Trash2Icon className="text-red-500" />
            </Button>
          </div>

          {historyLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500">No previous payments found.</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-md p-3 bg-gray-50 hover:bg-gray-100 transition"
                >
                  {/* Header - Client Name + Latest Payment Date */}
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      {item.lead_name || clientName}
                    </p>

                  </div>

                  {/* 🔥 Two-column layout */}
                  <div className="grid grid-cols-2 gap-4 text-xs">

                    {/* LEFT COLUMN */}
                    <div className="space-y-1">
                      <p><span className="text-gray-500">Status:</span> <span className="text-blue-500 font-semibold">{item.finance_status}</span></p>

                      <p>
                        <span className="text-gray-500">Last Paid:</span>{" "}
                        <span className="text-gray-900">
                          {new Date(item.closed_at).toLocaleDateString()}
                        </span>
                      </p>

                      <p>
                        <span className="text-gray-500">Onboarded:</span>{" "}
                        <span className="text-gray-900">
                          {item.onboarded_date
                            ? new Date(item.onboarded_date).toLocaleDateString()
                            : "—"}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-500">Subscription cycle:</span>{" "}<br></br>
                        <span className="text-gray-900 font-semibold">
                          {item.subscription_cycle} days
                        </span>
                      </p>
                      {/* <p>
                        <span className="text-gray-500">Associate/TL:</span>{" "}
                        <span className="text-gray-900">
                          {item.associates_tl_name || "Not assigned"}
                        </span>
                      </p>
                       */}
                      <p>
                        <span className="text-gray-500">Associate/TL:</span>{" "}
                        <span className="text-gray-900">
                          {item.associates_tl_name || "Not assigned"}
                        </span>
                      </p>

                      <p>
                        <span className="text-gray-500">Renewed By:</span>{" "}
                        <span className="text-blue-600 font-semibold">
                          {item.account_assigned_name || "Unknown"}
                        </span>
                      </p>
                      <p className="gap-2 pt-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-md  ${item.application_sale_value > 0
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-red-100 text-red-700 border border-red-300"
                            }`}
                        >
                          {item.application_sale_value > 0 ? "Applications Paid" : "No Applications"}
                        </span>
                      </p>
                    </div>

                    {/* RIGHT COLUMN — ITEM BREAKDOWN */}
                    {/* RIGHT COLUMN — ITEM BREAKDOWN */}
                    {/* RIGHT COLUMN — ITEM BREAKDOWN */}
                    <div className="space-y-1 text-xs">
                      <p
                        className={
                          Number(item.application_sale_value || 0) > 0
                            ? "text-green-600 font-semibold"
                            : "text-gray-900"
                        }
                      >
                        Applications: ${item.application_sale_value || 0}
                      </p>

                      <p
                        className={
                          Number(item.resume_sale_value || 0) > 0
                            ? "text-green-600 font-semibold"
                            : "text-gray-900"
                        }
                      >
                        Resume: ${item.resume_sale_value || 0}
                      </p>

                      <p
                        className={
                          Number(item.linkedin_sale_value || 0) > 0
                            ? "text-green-600 font-semibold"
                            : "text-gray-900"
                        }
                      >
                        LinkedIn: ${item.linkedin_sale_value || 0}
                      </p>

                      <p
                        className={
                          Number(item.portfolio_sale_value || 0) > 0
                            ? "text-green-600 font-semibold"
                            : "text-gray-900"
                        }
                      >
                        Portfolio: ${item.portfolio_sale_value || 0}
                      </p>

                      <p
                        className={
                          Number(item.github_sale_value || 0) > 0
                            ? "text-green-600 font-semibold"
                            : "text-gray-900"
                        }
                      >
                        GitHub: ${item.github_sale_value || 0}
                      </p>

                      <p
                        className={
                          Number(item.badge_value || 0) > 0
                            ? "text-green-600 font-semibold"
                            : "text-gray-900"
                        }
                      >
                        Badge: ${item.badge_value || 0}
                      </p>

                      <p
                        className={
                          Number(item.job_board_value || 0) > 0
                            ? "text-green-600 font-semibold"
                            : "text-gray-900"
                        }
                      >
                        Job Board: ${item.job_board_value || 0}
                      </p>

                      <p
                        className={
                          Number(item.course_sale_value || 0) > 0
                            ? "text-green-600 font-semibold"
                            : "text-gray-900"
                        }
                      >
                        Course: ${item.course_sale_value || 0}
                      </p>

                      <p className="text-gray-900">
                        Applications Count: {item.no_of_job_applications || 0}
                      </p>

                      <p className="text-green-600 font-bold border-t pt-1">
                        Total Sale: ${item.sale_value || 0}
                      </p>
                    </div>


                  </div>
                </div>
              ))}
            </div>
          )}

        </div>


      </div>
    </DashboardLayout>
  );
}
