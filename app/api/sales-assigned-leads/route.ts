import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoles } from "@/utils/roles";

type SalesProfile = {
  full_name: string;
  roles: string;
};

type RequestBody = {
  profile?: SalesProfile | null;
  page?: number;
  pageSize?: number;
  sourceFilter?: string;
  ownerFilter?: string;
  stageFilter?: string;
  searchTerm?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const profile = body.profile;

    if (!profile?.full_name || typeof profile.roles !== "string") {
      return NextResponse.json(
        { error: "Valid sales profile is required" },
        { status: 400 }
      );
    }

    const page = Math.max(1, Number(body.page) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(body.pageSize) || 30));
    const sourceFilter = body.sourceFilter || "all";
    const ownerFilter = body.ownerFilter || "all";
    const stageFilter = body.stageFilter || "all";
    const searchTerm = String(body.searchTerm || "").trim();
    const profileRoles = getRoles(profile.roles);

    // ── Helper: apply user-specific filters to a leads query ─────────
    const applyLeadFilters = (q: any) => {
      let qry = q.eq("status", "Assigned");
      const normalizedRoles = profileRoles.map((r: string) => r.toLowerCase().trim());

      // Define who only sees their own leads
      const isSalesAssociate = normalizedRoles.some(r => r.includes("sales associate") || r.includes("resume associate"));
      
      // Define who sees everything
      const hasElevatedPrivilege = normalizedRoles.some(r => 
        ["admin", "super admin", "sales head", "marketing", "resume head", "accounts"].includes(r)
      );

      if (isSalesAssociate && !hasElevatedPrivilege) {
        qry = qry.eq("assigned_to", profile.full_name);
      }

      if (sourceFilter !== "all") {
        qry = qry.eq("source", sourceFilter);
      }

      if (ownerFilter !== "all" && hasElevatedPrivilege) {
        qry = qry.eq("assigned_to", ownerFilter);
      }

      if (stageFilter !== "all") {
        qry = qry.eq("current_stage", stageFilter);
      }

      if (searchTerm) {
        const bidPart = searchTerm.toUpperCase().startsWith("AWL-")
          ? `business_id.eq.${searchTerm}`
          : `business_id.ilike.%${searchTerm}%`;
        qry = qry.or(
          `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,${bidPart},email.ilike.%${searchTerm}%,assigned_to.ilike.%${searchTerm}%`
        );
      }

      return qry;
    };

    // ── 1. Read ALL lead_uuid values from the hot_leads table ────────
    //    We keep the original UUID strings (no case manipulation)
    //    because PostgreSQL uuid columns are inherently case-insensitive.
    let hotLeadUuids: string[] = [];
    try {
      const { data: bucketRows, error: bucketError } = await supabaseAdmin
        .from("hot_leads")
        .select("lead_uuid");

      if (bucketError) {
        console.error("[sales-assigned-leads] hot_leads read error:", bucketError.message);
      } else {
        hotLeadUuids = (bucketRows || [])
          .map((row: any) => row.lead_uuid)
          .filter((id: any): id is string => typeof id === "string" && id.length > 0);
        // Deduplicate
        hotLeadUuids = [...new Set(hotLeadUuids)];
      }
    } catch (err: any) {
      console.error("[sales-assigned-leads] hot_leads exception:", err?.message);
    }

    console.log(`[sales-assigned-leads] Hot lead UUIDs in DB: ${hotLeadUuids.length}`);

    // ── 2. Count total matching leads for pagination ─────────────────
    const { count: totalRecords, error: totalError } = await applyLeadFilters(
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true })
    );

    if (totalError) throw totalError;

    const leadCols =
      "id, business_id, name, email, phone, assigned_to, current_stage, status, created_at, assigned_at, source";

    // ── 3. Fetch hot leads that match the user's filters ────────────
    let hotLeadRows: any[] = [];
    if (hotLeadUuids.length > 0) {
      const { data, error } = await applyLeadFilters(
        supabaseAdmin.from("leads").select(leadCols)
      )
        .in("id", hotLeadUuids)
        .order("assigned_at", { ascending: false });

      if (error) {
        console.error("[sales-assigned-leads] hot leads fetch error:", error.message);
      } else {
        hotLeadRows = data || [];
      }
    }

    const hotLeadIds = hotLeadRows.map((l: any) => String(l.id));
    const totalHot = hotLeadRows.length;

    console.log(`[sales-assigned-leads] Hot leads matching user filters: ${totalHot}`);

    // ── 4. Pagination — hot leads first, then regular leads ─────────
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let combinedRows: any[] = [];

    // Fill from hot leads first
    if (from < totalHot) {
      combinedRows = hotLeadRows.slice(from, Math.min(to + 1, totalHot));
    }

    // Fill remaining slots with non-hot leads
    if (
      combinedRows.length < pageSize &&
      from + combinedRows.length < (totalRecords || 0)
    ) {
      const needed = pageSize - combinedRows.length;
      const regFrom = Math.max(0, from - totalHot);
      const regTo = regFrom + needed - 1;

      let regularQuery = applyLeadFilters(
        supabaseAdmin.from("leads").select(leadCols)
      );

      // Exclude hot leads so they don't appear twice
      if (hotLeadIds.length > 0) {
        regularQuery = regularQuery.not(
          "id",
          "in",
          `(${hotLeadIds.join(",")})`
        );
      }

      const { data: regularRows, error: regularError } = await regularQuery
        .order("assigned_at", { ascending: false })
        .range(regFrom, regTo);

      if (regularError) throw regularError;

      combinedRows = [...combinedRows, ...(regularRows || [])];
    }

    // ── 5. Map to the shape the frontend expects ────────────────────
    //    We also add an `is_hot` boolean so the frontend can use it directly
    const hotIdSet = new Set(hotLeadIds);

    const leads = combinedRows.map((lead: any) => ({
      id: String(lead.id),
      business_id: lead.business_id,
      client_name: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      assigned_to: lead.assigned_to,
      current_stage: lead.current_stage || "Prospect",
      call_history: [],
      created_at: lead.created_at,
      assigned_at: lead.assigned_at,
      source: lead.source,
      is_hot: hotIdSet.has(String(lead.id)),
    }));

    return NextResponse.json({
      leads,
      totalRecords: totalRecords || 0,
      hotLeadIds,
      hotBucketLeadCount: totalHot,
    });
  } catch (error: any) {
    console.error("sales-assigned-leads API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch assigned sales leads" },
      { status: 500 }
    );
  }
}
