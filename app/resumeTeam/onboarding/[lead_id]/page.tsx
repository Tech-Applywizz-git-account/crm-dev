// app/resumeTeam/onboarding/[lead_id]/OnboardingForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { supabase } from "@/utils/supabase/client";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Helper functions
const csvFromArray = (arr: string[] | null | undefined): string => {
  if (!arr || !Array.isArray(arr)) return "";
  return arr.filter(Boolean).join(", ");
};

const csvToArray = (csv: string): string[] => {
  if (!csv) return [];
  return csv
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

interface OnboardingData {
  id?: string;
  full_name?: string;
  personal_email?: string;
  company_email?: string;
  callable_phone?: string;
  job_role_preferences?: string[];
  location_preferences?: string[];
  salary_range?: string;
  work_auth_details?: string;
  needs_sponsorship?: boolean | null;
  full_address?: string;
  linkedin_url?: string;
  date_of_birth?: string;
  whatsapp_number?: string;
  github_url?: string;
  visa_type?: string;
  created_at?: string;
  lead_id?: string;
  submitted_by?: string;
  experience?: string;
  gender?: string;
  state_of_residence?: string;
  zip_or_country?: string;
}

interface SalesClosureData {
  id?: string;
  lead_id?: string;
  onboarded_date?: string;
  company_application_email?: string;
  email?: string;
}

export default function OnboardingForm() {
  const params = useParams();
  const router = useRouter();
  const lead_id = params.lead_id as string;

  // Form state
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [salesData, setSalesData] = useState<SalesClosureData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form fields
  const [obFullName, setObFullName] = useState("");
  const [obCompanyEmail, setObCompanyEmail] = useState("");
  const [obPersonalEmail, setObPersonalEmail] = useState("");
  const [obCallablePhone, setObCallablePhone] = useState("");
  const [obJobRolesText, setObJobRolesText] = useState("");
  const [obLocationsText, setObLocationsText] = useState("");
  const [obSalaryRange, setObSalaryRange] = useState("");
  const [obWorkAuth, setObWorkAuth] = useState("");
  const [obNeedsSponsorship, setObNeedsSponsorship] = useState<boolean | null>(null);
  const [obFullAddress, setObFullAddress] = useState("");
  const [obLinkedInUrl, setObLinkedInUrl] = useState("");
  const [obDob, setObDob] = useState("");
  const [obDate, setObDate] = useState("");

  // Additional fields from your list
  const [obWhatsappNumber, setObWhatsappNumber] = useState("");
  const [obGithubUrl, setObGithubUrl] = useState("");
  const [obVisaType, setObVisaType] = useState("");
  const [obExperience, setObExperience] = useState("0");
  const [obExcludeCompanies, setObExcludeCompanies] = useState("NA");
  const [obNoOfApplications, setObNoOfApplications] = useState("20");
  const [obGender, setObGender] = useState("");
  const [obStateOfResidence, setObStateOfResidence] = useState("");
  const [obZipOrCountry, setObZipOrCountry] = useState("");
  const [obWorkPreference, setObWorkPreference] = useState("Remote");

  // Fetch data on component mount
  useEffect(() => {
    if (lead_id) {
      loadData();
    }
  }, [lead_id]);

  // Update the loadData function to pre-fill ALL form state
  const loadData = async () => {
    setFormLoading(true);
    try {
      // Get current logged in user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch from client_onborading_details with ALL fields
      const { data: onboarding, error: onboardingError } = await supabase
        .from("client_onborading_details")
        .select("*")
        .eq("lead_id", lead_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (onboardingError) {
        console.error("Error fetching onboarding data:", onboardingError);
      }

      // Fetch from sales_closure
      const { data: sales, error: salesError } = await supabase
        .from("sales_closure")
        .select(`
        id,
        lead_id,
        onboarded_date,
        company_application_email,
        email,
        badge_value,
        subscription_cycle,
        no_of_job_applications
      `)
        .eq("lead_id", lead_id)
        .order("closed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (salesError) {
        console.error("Error fetching sales data:", salesError);
      }

      setOnboardingData(onboarding || null);
      setSalesData(sales || null);

      // Pre-fill form with ALL fields from client_onborading_details
      if (onboarding) {
        // Basic fields
        setObFullName(onboarding.full_name || "");
        setObCompanyEmail(onboarding.company_email || "");
        setObPersonalEmail(onboarding.personal_email || "");
        setObCallablePhone(onboarding.callable_phone || "");
        setObJobRolesText(csvFromArray(onboarding.job_role_preferences));
        setObLocationsText(csvFromArray(onboarding.location_preferences));
        setObSalaryRange(onboarding.salary_range || "");
        setObWorkAuth(onboarding.work_auth_details || "");
        setObNeedsSponsorship(onboarding.needs_sponsorship || null);
        setObFullAddress(onboarding.full_address || "");
        setObLinkedInUrl(onboarding.linkedin_url || "");
        setObDob(onboarding.date_of_birth || "");
        setObWhatsappNumber(onboarding.whatsapp_number || "");
        setObGithubUrl(onboarding.github_url || "");
        const allowedVisaTypes = ["F1", "H1B", "Green Card", "Citizen", "H4EAD", "Other"];
        const rawVisa = onboarding.visatypes || "";
        setObVisaType(allowedVisaTypes.includes(rawVisa) ? rawVisa : rawVisa ? "Other" : "");

        // Additional fields - you need to add these state variables
        setObExperience(onboarding.experience || "0");
        setObExcludeCompanies(onboarding.exclude_companies || "NA");
        setObGender(onboarding.gender || "");
        setObStateOfResidence(onboarding.state_of_residence || "");
        setObZipOrCountry(onboarding.zip_or_country || "");
        setObWorkPreference(onboarding.work_preferences || "Remote");

        // You should add state for all these fields and set them here:
        // setIsOver18(onboarding.is_over_18 || null);
        // setEligibleToWorkInUS(onboarding.eligible_to_work_in_us || null);
        // setAuthorizedWithoutVisa(onboarding.authorized_without_visa || null);
        // ... etc for all other fields
      }

      // Pre-fill sales data
      if (sales) {
        setObDate(sales.onboarded_date || "");
        // If company email is not in onboarding but is in sales, use it
        if (!onboarding?.company_email && sales.company_application_email) {
          setObCompanyEmail(sales.company_application_email);
        }
        if (!onboarding?.personal_email && sales.email) {
          setObPersonalEmail(sales.email);
        }
      }

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  // --- Clean Architecture: Helper Functions ---

  const fetchAndValidateResume = async (lead_id: string) => {
    const { data: rpData, error: rpError } = await supabase
      .from("resume_progress")
      .select("pdf_path")
      .eq("lead_id", lead_id)
      .maybeSingle();

    if (rpError) throw new Error(`Resume fetch error: ${rpError.message}`);

    let latestResumePath = null;
    if (rpData?.pdf_path && Array.isArray(rpData.pdf_path)) {
      latestResumePath = rpData.pdf_path[rpData.pdf_path.length - 1];
    }

    if (!latestResumePath || latestResumePath.trim() === "") {
      throw new Error("Resume is required before onboarding.");
    }

    return latestResumePath;
  };

  const validateAndBuildPayload = async (
    fullOnboardingData: any,
    scData: any,
    resumePath: string,
    addOnsInfo: string[],
    startDate: string,
    endDate: string | null
  ) => {
    // 1️⃣ Role Validation (Exact Match Check)
    let isNewDomain = false;
    const jobRoles = csvToArray(obJobRolesText);
    const roleValue = (jobRoles[0] || fullOnboardingData?.role || "").trim();

    try {
      // Fetch from us-jobs-roles as per requirement
      const rolesRes = await fetch("https://applywizz-crm-tool.vercel.app/api/all-job-roles");
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        // Be more flexible with the structure: Array, .data, .roles, or .job_roles
        const rolesList = Array.isArray(rolesData)
          ? rolesData
          : (rolesData.data || rolesData.roles || rolesData.job_roles || []);

        if (roleValue) {
          const matchedRole = rolesList.find((r: any) => {
            const nameToMatch = (typeof r === 'string' ? r : r?.name || "")?.trim();
            // Exact case-sensitive match as required
            return nameToMatch === roleValue;
          });
          isNewDomain = !matchedRole;
        }
      } else {
        // If the roles API fails, we treat it as a new domain (safety fallback)
        if (roleValue) isNewDomain = true;
      }
    } catch (err) {
      console.error("Role validation error:", err);
      // If the roles API fails, we treat it as a new domain (safety fallback)
      if (roleValue) isNewDomain = true;
    }

    // 2️⃣ Build Final API Payload
    const payload: any = {
      // 1. Spread ALL data from DB first to catch every single field 
      // (including education, background checks, education history, etc.)
      ...fullOnboardingData,

      // 2. Required/Key Mappings (Override with form state and fresh calculations)
      full_name: obFullName || fullOnboardingData?.full_name || "",
      email: obCompanyEmail?.trim() || fullOnboardingData?.company_email || "",
      personal_email: obPersonalEmail || fullOnboardingData?.personal_email || "",
      experience: obExperience || fullOnboardingData?.experience || "0",
      years_experience: obExperience || fullOnboardingData?.experience || "0",
      applywizz_id: lead_id,
      gender: obGender || fullOnboardingData?.gender || "Prefer Not to Say",
      state_of_residence: obStateOfResidence || fullOnboardingData?.state_of_residence || "",
      zip_or_country: obZipOrCountry || fullOnboardingData?.zip_or_country || "",
      resume_s3_path: resumePath,
      start_date: startDate || null,
      job_role_preferences: jobRoles,
      location_preferences: csvToArray(obLocationsText),
      visa_type: obVisaType || fullOnboardingData?.visatypes || fullOnboardingData?.visa_type || "Other",

      // 3. Mapping for fields that might have different names in DB vs API or need logic
      sponsorship: obNeedsSponsorship ?? fullOnboardingData?.sponsorship ?? fullOnboardingData?.needs_sponsorship ?? false,
      whatsapp_number: obWhatsappNumber || fullOnboardingData?.whatsapp_number || null,
      callable_phone: obCallablePhone || fullOnboardingData?.callable_phone || null,
      primary_phone: obCallablePhone || fullOnboardingData?.callable_phone || fullOnboardingData?.primary_phone || null,
      phone: obCallablePhone || fullOnboardingData?.callable_phone || fullOnboardingData?.phone || "",
      linked_in_url: obLinkedInUrl || fullOnboardingData?.linkedin_url || null,
      github_url: obGithubUrl || fullOnboardingData?.github_url || null,
      date_of_birth: obDob || fullOnboardingData?.date_of_birth || null,
      full_address: obFullAddress || fullOnboardingData?.full_address || null,
      add_ons_info: addOnsInfo,
      no_of_applications: scData?.no_of_job_applications?.toString() || (fullOnboardingData?.no_of_applications ?? "20"),
      badge_value: scData?.badge_value ?? fullOnboardingData?.badge_value ?? 0,

      // 4. Consolidation & Internal flags
      submission_type: "pending",
      is_new_domain: isNewDomain,
      submitted_by: currentUserId || fullOnboardingData?.submitted_by || onboardingData?.submitted_by || "",
      target_role: roleValue || "Unknown",
      end_date: endDate || null,
      salary_range: obSalaryRange || fullOnboardingData?.salary_range || null,
      work_auth_details: obWorkAuth || fullOnboardingData?.work_auth_details || null,
      work_preferences: obWorkPreference || fullOnboardingData?.work_preferences || "Remote",
      exclude_companies: obExcludeCompanies || fullOnboardingData?.exclude_companies || "NA",
      created_at: fullOnboardingData?.created_at || new Date().toISOString(),
      client_form_fill_date: new Date().toISOString(),
    };

    // 3️⃣ Strict Validation Checks (Toast for each)
    const requiredChecks = [
      { val: payload.full_name, msg: "Full Name is required before onboarding." },
      { val: payload.email, msg: "Company Email is required before onboarding." },
      { val: payload.experience, msg: "Years of Experience is required before onboarding." },
      { val: payload.applywizz_id, msg: "ApplyWizz ID (Lead ID) is required before onboarding." },
      { val: payload.submitted_by, msg: "Career Associate is required. Please log in again." },
      { val: payload.gender, msg: "Gender is required before onboarding." },
      { val: payload.state_of_residence, msg: "State of Residence is required before onboarding." },
      { val: payload.zip_or_country, msg: "Zip or Country is required before onboarding." },
      { val: payload.resume_s3_path, msg: "Resume is required before onboarding. Please upload a resume first." },
      { val: payload.start_date, msg: "Onboarded Date (Start Date) is required before onboarding." },
      { val: payload.target_role, msg: "Target Role / Job Role Preference is required before onboarding." },
      { val: payload.no_of_applications, msg: "Number of Applications is required before onboarding." },
      { val: payload.add_ons_info && payload.add_ons_info.length > 0 ? true : null, msg: "Services Opted (Add-Ons) is required. Please check the Sales Closure record." },
      { val: payload.work_auth_details, msg: "Work Authorization Details is required before onboarding." },
      { val: payload.work_preferences, msg: "Work Preference (Remote/Hybrid/On-site) is required before onboarding." },
      { val: payload.exclude_companies, msg: "Exclude Companies is required before onboarding." },
    ];

    for (const check of requiredChecks) {
      if (!check.val || (typeof check.val === "string" && check.val.trim() === "")) {
        throw new Error(check.msg);
      }
    }

    return payload;
  };

  const sendDirectOnboard = async (payload: any) => {
    // 5️⃣ API TARGET
    const response = await fetch("https://www.apply-wizz.me/api/direct-onboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("❌ Direct Onboard API Error:", responseData);

      // Extract detailed validation messages if they exist
      let errorMsg = responseData.message || responseData.error || "Validation failed";

      if (responseData.details && Array.isArray(responseData.details)) {
        const details = responseData.details.map((d: any) => `${d.field}: ${d.message}`).join(", ");
        errorMsg = `Validation Errors: ${details}`;
      } else if (responseData.validationErrors && Array.isArray(responseData.validationErrors)) {
        const errors = responseData.validationErrors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        errorMsg = `Validation Errors: ${errors}`;
      }

      throw new Error(errorMsg);
    }

    return responseData;
  };

  // --- Main Save Handler ---

  const handleSave = async () => {
    if (!lead_id) {
      toast.error("No lead ID found");
      return;
    }

    if (!obDate) {
      toast.error("Please choose an Onboarded Date");
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch current data (Supabase)
      const { data: fullOnboardingData, error: onboardingFetchErr } = await supabase
        .from("client_onborading_details")
        .select("*")
        .eq("lead_id", lead_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (onboardingFetchErr) throw onboardingFetchErr;

      // 2. Fetch sales_closure info
      const { data: scData, error: scError } = await supabase
        .from("sales_closure")
        .select("*")
        .eq("lead_id", lead_id)
        .order("closed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scError) throw scError;

      // 3. Fetch/Validate Resume
      const resumePath = await fetchAndValidateResume(lead_id);

      // 4. Calculations
      const startDate = obDate;
      let endDate = null;
      if (startDate && scData?.subscription_cycle) {
        endDate = new Date(new Date(startDate).getTime() + scData.subscription_cycle * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      }

      const allowedServices = [
        { field: "application_sale_value", label: "applications" },
        { field: "resume_sale_value", label: "resume" },
        { field: "portfolio_sale_value", label: "portfolio" },
        { field: "linkedin_sale_value", label: "linkedin" },
        { field: "github_sale_value", label: "github" },
        { field: "courses_sale_value", label: "courses" },
        { field: "badge_value", label: "badge" },
        { field: "job_board_value", label: "job-links" },
      ];
      const scAny: any = scData;
      const addOnsInfo = allowedServices
        .filter((item) => Number(scAny?.[item.field]) > 0)
        .map((item) => item.label);

      // 5. Validation & Payload Preparation
      const apiPayload = await validateAndBuildPayload(
        fullOnboardingData,
        scData,
        resumePath,
        addOnsInfo,
        startDate,
        endDate
      );

      // 7. Synchronize with External API
      console.log("📤 Submitting Onboarding Payload:", apiPayload);
      await sendDirectOnboard(apiPayload);
      console.log("✅ API Sync Successful");

      // 8. Update client_onborading_details (Local cache)
      const supabaseOnboardingPayload = {
        // Spread fresh DB data first
        ...(fullOnboardingData || {}),

        // Overwrite with form state
        full_name: obFullName || null,
        company_email: obCompanyEmail?.trim() || null,
        personal_email: obPersonalEmail || null,
        callable_phone: obCallablePhone || null,
        job_role_preferences: csvToArray(obJobRolesText),
        location_preferences: csvToArray(obLocationsText),
        salary_range: obSalaryRange || null,
        work_auth_details: obWorkAuth || null,
        needs_sponsorship: obNeedsSponsorship,
        full_address: obFullAddress || null,
        linkedin_url: obLinkedInUrl || null,
        date_of_birth: obDob || null,
        whatsapp_number: obWhatsappNumber || null,
        github_url: obGithubUrl || null,
        visatypes: obVisaType || null,
        gender: obGender || null,
        state_of_residence: obStateOfResidence || null,
        zip_or_country: obZipOrCountry || null,
        lead_id: lead_id,
        experience: obExperience || "0",
        exclude_companies: obExcludeCompanies || "NA",
        work_preferences: obWorkPreference,
      };

      if (onboardingData?.id) {
        const { error } = await supabase.from("client_onborading_details").update(supabaseOnboardingPayload).eq("id", onboardingData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_onborading_details").insert(supabaseOnboardingPayload);
        if (error) throw error;
      }

      // 9. Update sales_closure
      if (salesData?.id) {
        const { error: salesError } = await supabase
          .from("sales_closure")
          .update({
            onboarded_date: obDate,
            company_application_email: obCompanyEmail?.trim() || null,
          })
          .eq("id", salesData.id);

        if (salesError) throw salesError;
      }

      toast.success("Client onboarded successfully!");
      router.back();

    } catch (err: any) {
      console.error("🔥 Onboarding Error:", err);
      toast.error(err.message || "An unexpected error occurred during onboarding.");
    } finally {
      setLoading(false);
    }
  };


  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Onboard & Edit — {lead_id}
              </h1>
              <p className="text-muted-foreground">
                Update the latest onboarding details and set the Onboarded Date.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={loading || formLoading || !obDate}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save & Onboard"}
          </Button>
        </div>

        {/* Form Content */}
        {formLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading onboarding data...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Main Form Card */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={obFullName}
                      onChange={(e) => setObFullName(e.target.value)}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Company Email *</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={obCompanyEmail}
                      onChange={(e) => setObCompanyEmail(e.target.value)}
                      placeholder="company@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="callablePhone">Callable Phone</Label>
                    <Input
                      id="callablePhone"
                      value={obCallablePhone}
                      onChange={(e) => setObCallablePhone(e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onboardedDate">Onboarded Date *</Label>
                    <Input
                      id="onboardedDate"
                      type="date"
                      value={formatDateForInput(obDate)}
                      onChange={(e) => setObDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="jobRoles">Job Role Preferences (comma separated)</Label>
                    <Textarea
                      id="jobRoles"
                      rows={3}
                      value={obJobRolesText}
                      onChange={(e) => setObJobRolesText(e.target.value)}
                      placeholder="Java Full Stack, Frontend Developer, Backend Engineer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locations">Location Preferences (comma separated)</Label>
                    <Textarea
                      id="locations"
                      rows={3}
                      value={obLocationsText}
                      onChange={(e) => setObLocationsText(e.target.value)}
                      placeholder="Remote, New York, San Francisco"
                    />
                  </div>
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="salaryRange">Salary Range</Label>
                    <Input
                      id="salaryRange"
                      value={obSalaryRange}
                      onChange={(e) => setObSalaryRange(e.target.value)}
                      placeholder="e.g., $80,000 - $100,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workPreference">Work Preference *</Label>
                    <Select
                      value={obWorkPreference}
                      onValueChange={setObWorkPreference}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="On-site">On-site</SelectItem>
                        <SelectItem value="All">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workAuth">Work Auth Details</Label>
                    <Textarea
                      id="workAuth"
                      rows={2}
                      value={obWorkAuth}
                      onChange={(e) => setObWorkAuth(e.target.value)}
                      placeholder="Over 18: yes, Eligible in US: yes, Authorized w/o visa"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Row 5 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sponsorship">Needs Sponsorship</Label>
                    <Select
                      value={
                        obNeedsSponsorship === null
                          ? "__unset__"
                          : obNeedsSponsorship
                            ? "yes"
                            : "no"
                      }
                      onValueChange={(v) => {
                        if (v === "__unset__") setObNeedsSponsorship(null);
                        else setObNeedsSponsorship(v === "yes");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unset__">—</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formatDateForInput(obDob)}
                      onChange={(e) => setObDob(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 6 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullAddress">Full Address</Label>
                    <Textarea
                      id="fullAddress"
                      rows={3}
                      value={obFullAddress}
                      onChange={(e) => setObFullAddress(e.target.value)}
                      placeholder="Street, City, State, ZIP Code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn URL (eg:https://www.linkedin.com/in/mark-zuckerberg-618bba58)</Label>
                    <Input
                      id="linkedinUrl"
                      type="url"
                      value={obLinkedInUrl}
                      onChange={(e) => setObLinkedInUrl(e.target.value)}
                      placeholder="https://www.linkedin.com/in/username"
                    />
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                    <Input
                      id="whatsappNumber"
                      value={obWhatsappNumber}
                      onChange={(e) => setObWhatsappNumber(e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="githubUrl">GitHub URL (eg:https://github.com/dheerajtiwari/demogithubprofile)</Label>
                    <Input
                      id="githubUrl"
                      type="url"
                      value={obGithubUrl}
                      onChange={(e) => setObGithubUrl(e.target.value)}
                      placeholder="https://github.com/username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visaType">Visa Type *</Label>
                    <Select
                      value={obVisaType || "__unset__"}
                      onValueChange={(v) => setObVisaType(v === "__unset__" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Visa Type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unset__">Select...</SelectItem>
                        <SelectItem value="F1">F1</SelectItem>
                        <SelectItem value="H1B">H1B</SelectItem>
                        <SelectItem value="Green Card">Green Card</SelectItem>
                        <SelectItem value="Citizen">Citizen</SelectItem>
                        <SelectItem value="H4EAD">H4EAD</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* New Gender and Location Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      value={obGender || "__unset__"}
                      onValueChange={(v) => setObGender(v === "__unset__" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Gender..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unset__">Select...</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer Not to Say">Prefer Not to Say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stateOfResidence">State of Residence *</Label>
                    <Input
                      id="stateOfResidence"
                      value={obStateOfResidence}
                      onChange={(e) => setObStateOfResidence(e.target.value)}
                      placeholder="e.g., California"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipOrCountry">Zip or Country *</Label>
                    <Input
                      id="zipOrCountry"
                      value={obZipOrCountry}
                      onChange={(e) => setObZipOrCountry(e.target.value)}
                      placeholder="e.g., 90001 or USA"
                      required
                    />
                  </div>
                </div>

                {/* Personal Email */}
                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={obPersonalEmail}
                    onChange={(e) => setObPersonalEmail(e.target.value)}
                    placeholder="personal@example.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Hidden fields with defaults */}
            <div className="hidden">
              <Input
                type="hidden"
                value={obExperience}
                onChange={(e) => setObExperience(e.target.value)}
              />
              <Input
                type="hidden"
                value={obExcludeCompanies}
                onChange={(e) => setObExcludeCompanies(e.target.value)}
              />
              <Input
                type="hidden"
                value={obNoOfApplications}
                onChange={(e) => setObNoOfApplications(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={loading || formLoading}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={loadData}
              disabled={loading || formLoading}
            >
              Reload Data
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || formLoading || !obDate}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save & Onboard"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
