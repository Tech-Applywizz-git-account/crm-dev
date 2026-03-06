// /app/SaleUpdate/[leadId]/NewSaleCloseForm.tsx
"use client";


import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";


import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/auth-provider";
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


type LeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  business_id: string | null;
};





/* --- Helpers (same as EditSaleCloseForm) --- */
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


// Date helpers (store UI date as YYYY-MM-DD to avoid TZ shift)
const isoToDateOnly = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");


const dateOnlyToIsoUTC = (yyyyMMdd?: string | null) =>
  yyyyMMdd ? new Date(`${yyyyMMdd}T00:00:00Z`).toISOString() : null;


const addDaysFromYYYYMMDD = (yyyyMMdd: string, days: number) => {
  const parts = yyyyMMdd.split("-");
  if (parts.length !== 3) return "";
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};


/* ---------- Component ---------- */
// export default function NewSaleCloseForm({ leadId }: { leadId: string }) {


interface NewSaleCloseFormProps {
  leadId: string;
}


export default function NewSaleCloseForm({ leadId }: NewSaleCloseFormProps) {


  const router = useRouter();


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Lead record id (needed to update leads on save)
  const [leadRowId, setLeadRowId] = useState<string | null>(null);


  // Client details (prefilled from leads)
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  //   const [companyApplicationEmail, setCompanyApplicationEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");


  // Subscription/payment
  const [paymentMode, setPaymentMode] =
    useState<PaymentMode | "">("");


  const [financeStatus, setFinanceStatus] =
    useState<FinanceStatus | "">("Paid");


  const [subscriptionCycle, setSubscriptionCycle] =
    useState<number>(30);


  const [applicationSaleValue, setApplicationSaleValue] =
    useState<number>(0);


  const [currentUser, setCurrentUser] = useState<any>(null);
  const { user } = useAuth();




  // Add-ons
  const [resumeValue, setResumeValue] = useState<string>("");
  const [portfolioValue, setPortfolioValue] = useState<string>("");
  const [linkedinValue, setLinkedinValue] = useState<string>("");
  const [githubValue, setGithubValue] = useState<string>("");
  const [badgeValue, setBadgeValue] = useState<string>("");
  const [jobBoardValue, setJobBoardValue] = useState<string>("");
  const [coursesValue, setCoursesValue] = useState<string>("");


  const [customLabel, setCustomLabel] = useState<string>("");
  const [customValue, setCustomValue] = useState<string>("");


  const [no_of_job_applications, set_no_of_job_applications] =
    useState<string>("");


  const [commitments, setCommitments] = useState<string>("");


  // Dates
  const [closedAtDate, setClosedAtDate] = useState<string>(""); // YYYY-MM-DD
  const [nextDueDate, setNextDueDate] = useState<string>("");


  // Auto-calculated value
  const [autoCalculatedValue, setAutoCalculatedValue] =
    useState<number>(0);



  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);




  /* ---------- Fetch ONLY leads (prefill client area) ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);


        const { data: leadData, error: leadError } = await supabase
          .from("leads")
          .select("id, name, phone, email, business_id")
          .eq("business_id", leadId)
          .maybeSingle<LeadRow>();


        if (leadError) throw leadError;


        if (mounted && leadData) {
          setLeadRowId(leadData.id);
          setClientName(leadData.name ?? "");
          setClientEmail(leadData.email ?? "");
          setLeadPhone(leadData.phone ?? "");

        }
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e?.message ?? "Failed to load lead details");
      } finally {
        if (mounted) setLoading(false);
      }
    })();


    return () => {
      mounted = false;
    };
  }, [leadId]);


  /* ---------- Live auto calculation (same as edit) ---------- */
  useEffect(() => {
    if (applicationSaleValue && subscriptionCycle) {
      setAutoCalculatedValue(
        (subscriptionCycle / 30) * applicationSaleValue
      );
    } else {
      setAutoCalculatedValue(0);
    }
  }, [applicationSaleValue, subscriptionCycle]);


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
      badgeValue,
      jobBoardValue,
      coursesValue,
      customValue
    );
    return round2(autoTotal + addons);
  }, [
    autoTotal,
    resumeValue,
    portfolioValue,
    linkedinValue,
    githubValue,
    badgeValue,
    jobBoardValue,
    coursesValue,
    customValue,
  ]);


  /* ---------- Next due date (same as edit) ---------- */
  useEffect(() => {
    const days = cycleDays(String(subscriptionCycle));
    if (!days) {
      setNextDueDate("");
      return;
    }
    const base = closedAtDate || isoToDateOnly(new Date().toISOString());
    if (!base) {
      setNextDueDate("");
      return;
    }
    setNextDueDate(addDaysFromYYYYMMDD(base, days) || "");
  }, [closedAtDate, subscriptionCycle]);


  /* ---------- Save handler: INSERT into sales_closure + UPDATE leads ---------- */
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);


      if (!paymentMode) {
        alert("Please select Payment Mode");
        return;
      }
      if (!no_of_job_applications) {
        alert("Please select No. of Job Applications");
        return;
      }
      // 1) Insert NEW sales_closure
      const insertPayload: any = {
        lead_id: leadId,
        lead_name: clientName || null,
        email: clientEmail || null,

        // company_application_email: companyApplicationEmail || null,


        payment_mode: paymentMode || null,
        finance_status: financeStatus || "Paid",


        subscription_cycle: subscriptionCycle || null,
        application_sale_value: safeParseFloatOrNull(applicationSaleValue),


        // TOTAL = autoTotal + addons
        sale_value: Number(totalSale.toFixed(2)),


        // Add-ons
        resume_sale_value: safeParseFloatOrNull(resumeValue),
        portfolio_sale_value: safeParseFloatOrNull(portfolioValue),
        linkedin_sale_value: safeParseFloatOrNull(linkedinValue),
        github_sale_value: safeParseFloatOrNull(githubValue),
        badge_value: safeParseFloatOrNull(badgeValue),
        job_board_value: safeParseFloatOrNull(jobBoardValue),
        courses_sale_value: safeParseFloatOrNull(coursesValue),


        custom_label: customLabel || null,
        custom_sale_value: safeParseFloatOrNull(customValue),


        commitments: commitments || null,
        no_of_job_applications: safeParseFloatOrNull(no_of_job_applications),


        // date stored in UTC midnight
        closed_at: dateOnlyToIsoUTC(closedAtDate),

        // ⭐ NEW — Store closer name and email in sales_closure for attribution
        account_assigned_name: user?.name || user?.email || "Unknown",
        account_assigned_email: user?.email || null
      };


      const { error: insertError } = await supabase
        .from("sales_closure")
        .insert(insertPayload);


      if (insertError) throw insertError;


      // 2) Update leads if client details edited
      if (leadRowId) {
        const leadUpdatePayload: any = {
          name: clientName || null,
          email: clientEmail || null,
          phone: leadPhone || null,
          current_stage: "sale done",
          subscribed: "yes",

          // ⭐ NEW — Assign automatically
          assigned_to: user?.name || user?.email || null,
          assigned_to_email: user?.email || null,
        };


        // only update company_application_email if column exists
        // if (companyApplicationEmail !== undefined) {
        //   leadUpdatePayload.company_application_email =
        //     companyApplicationEmail || null;
        // }


        const { error: leadUpdateError } = await supabase
          .from("leads")
          .update(leadUpdatePayload)
          .eq("id", leadRowId);


        if (leadUpdateError) {
          console.warn("Sale saved but lead update failed:", leadUpdateError);
          setError("Sale saved, but failed to update lead details.");
        }
      }


      alert("✅ Sale closed successfully!");
      router.push("/sales");
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to close sale");
    } finally {
      setSaving(false);
    }
  };


  /* ---------- UI (same as EditSaleCloseForm) ---------- */
  return (
    // <DashboardLayout>
    <div className="p-6 pt-0">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Close Sale — {leadId}</h1>
      </div>


      {loading ? (
        <Card>
          <CardContent className="p-6">Loading client details…</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-red-600">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>🧾 Close Sale — New Client</CardTitle>
            </CardHeader>


            <CardContent className="space-y-6">
              {/* Client Details + Phone */}
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
                    />
                  </div>


                  {/* <div className="space-y-1">
                      <Label>Client company email</Label>
                      <Input
                        placeholder="Company Application Email PWD: Created@123"
                        value={companyApplicationEmail}
                        onChange={(e) =>
                          setCompanyApplicationEmail(e.target.value)
                        }
                      />
                    </div> */}


                  {/* Sale Closed At */}
                  <div className="space-y-1">
                    <Label>Sale Closed At</Label>
                    <Input
                      type="date"
                      value={closedAtDate}
                      onChange={(e) => setClosedAtDate(e.target.value)}
                    />
                  </div>


                  {/* Lead Phone */}
                  <div className="space-y-1">
                    <Label>Lead Phone</Label>
                    <Input
                      placeholder="Phone"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      This will update leads table on save.
                    </p>
                  </div>
                </div>


                {/* Subscription & Payment Info */}
                <div className="border rounded-md p-4 space-y-3">
                  <Label className="font-semibold">
                    Subscription & Payment Info{" "}
                    <span className="text-red-500">*</span>
                  </Label>


                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Payment Mode */}
                    <div className="md:col-span-3">
                      <Select
                        value={paymentMode}
                        onValueChange={(v) =>
                          setPaymentMode(v as PaymentMode)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Payment Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="PayPal">PayPal</SelectItem>
                          <SelectItem value="Bank Transfer">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="Credit/Debit Card">
                            Credit/Debit Card
                          </SelectItem>
                          <SelectItem value="Stripe">Stripe</SelectItem>
                          <SelectItem value="Razorpay">Razorpay</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>


                    {/* Subscription Cycle */}
                    <div className="md:col-span-3">
                      <Select
                        value={String(subscriptionCycle)}
                        onValueChange={(v) =>
                          setSubscriptionCycle(Number(v))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Subscription Duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 Days</SelectItem>
                          <SelectItem value="30">1 Month</SelectItem>
                          <SelectItem value="60">2 Months</SelectItem>
                          <SelectItem value="90">3 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>


                    {/* Application Sale Value */}
                    <div className="md:col-span-3 grid grid-cols-1 gap-2 mt-2">
                      <Label className="text-sm">
                        Application Sale Value
                      </Label>
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


                    {/* Auto-calculated */}
                    <div className="md:col-span-3 grid grid-cols-1 gap-2 mt-2">
                      <Label className="text-sm">
                        Auto-Calculated Value
                      </Label>
                      <Input
                        type="number"
                        value={autoCalculatedValue}
                        disabled
                      />
                      <p className="text-xs text-gray-500">
                        Always ={" "}
                        <code>
                          (subscription_cycle / 30) × application_sale_value
                        </code>
                      </p>
                    </div>


                    {/* No. of Job Applications */}
                    <div className="md:col-span-3">
                      <div className="space-y-1">
                        <Label>
                          No. of Job Applications
                          <span className="text-red-700">*</span>
                        </Label>
                        <Select
                          value={no_of_job_applications}
                          onValueChange={(v) =>
                            set_no_of_job_applications(v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select count" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">
                              No applications
                            </SelectItem>
                            <SelectItem value="20">20+</SelectItem>
                            <SelectItem value="40">40+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* Add-ons */}
              <div className="border rounded-md p-4 space-y-3">
                <Label className="font-semibold">
                  Optional Add-On Services
                </Label>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-2">
                    <Label className="w-1/3 m-2">Resume value</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Resume Sale Value ($)"
                      value={resumeValue}
                      onChange={(e) => setResumeValue(e.target.value)}
                    />
                  </div>


                  <div className="flex gap-2">
                    <Label className="w-1/3 m-2">Portfolio value</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Portfolio Creation Value ($)"
                      value={portfolioValue}
                      onChange={(e) => setPortfolioValue(e.target.value)}
                    />
                  </div>


                  <div className="flex gap-2">
                    <Label className="w-1/3 m-2">Linkedin value</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="LinkedIn Optimization Value ($)"
                      value={linkedinValue}
                      onChange={(e) => setLinkedinValue(e.target.value)}
                    />
                  </div>


                  <div className="flex gap-2">
                    <Label className="w-1/3 m-2">Github value</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="GitHub Optimization Value ($)"
                      value={githubValue}
                      onChange={(e) => setGithubValue(e.target.value)}
                    />
                  </div>


                  <div className="flex gap-2">
                    <Label className="w-1/3 m-2">Courses value</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Courses / Certifications Value ($)"
                      value={coursesValue}
                      onChange={(e) => setCoursesValue(e.target.value)}
                    />
                  </div>


                  <div className="flex gap-2">
                    <Label className="w-1/3 m-2">Badge value</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Badge Value ($)"
                      value={badgeValue}
                      onChange={(e) => setBadgeValue(e.target.value)}
                    />
                  </div>


                  <div className="flex gap-2">
                    <Label className="w-1/3 m-2">Job board value</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Job Board Value ($)"
                      value={jobBoardValue}
                      onChange={(e) => setJobBoardValue(e.target.value)}
                    />
                  </div>


                  <div className="flex gap-2">
                    <Input
                      placeholder="Custom Add-on (e.g., Courses)"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      className="w-1/2"
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Custom Add-on Value ($)"
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


              {/* Auto calculated summary */}
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
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Sale"}
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



