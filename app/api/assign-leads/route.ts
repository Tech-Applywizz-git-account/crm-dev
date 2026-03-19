import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      selectedLeads,
      assignedTo,
      assignedAt,
      hotLeads,
      hotLeadIds,
      hotSources,
      selectedLeadRows,
    } = body;

    if (
      !Array.isArray(selectedLeads) ||
      selectedLeads.length === 0 ||
      !assignedTo ||
      typeof assignedTo !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid input: leads or assignee missing" }),
        { status: 400 }
      );
    }

    const assignedAtIso = assignedAt || new Date().toISOString();

    // ── 1. Update main leads table ──────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        status: "Assigned",
        assigned_to: assignedTo,
        assigned_at: assignedAtIso,
      })
      .in("id", selectedLeads);

    if (updateError) {
      console.error("Supabase leads update error:", updateError.message);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500 }
      );
    }

    // ── 2. Re-fetch the leads we just assigned so we have complete data ─
    const { data: refreshedLeads, error: refreshError } = await supabaseAdmin
      .from("leads")
      .select("id, business_id, name, email, phone, source, city, status, created_at, assigned_to, assigned_at, current_stage")
      .in("id", selectedLeads);

    if (refreshError) {
      console.error("Failed to re-fetch assigned leads:", refreshError.message);
    }

    // ── 3. Figure out which of these leads are "hot" ────────────────
    //  Hot sources come from the client (localStorage values).
    //  We also accept explicit hotLeadIds / hotLeads from the client.
    let hotSyncCount = 0;
    try {
      const normalizedHotSources: string[] = (
        Array.isArray(hotSources) ? hotSources : []
      )
        .map((s: any) => String(s || "").trim().toLowerCase())
        .filter(Boolean);

      // Collect every lead ID the client explicitly flagged as hot
      const explicitHotIds = new Set<string>();
      if (Array.isArray(hotLeadIds)) {
        hotLeadIds.forEach((id: any) => {
          if (id) explicitHotIds.add(String(id));
        });
      }
      if (Array.isArray(hotLeads)) {
        hotLeads.forEach((l: any) => {
          if (l?.id) explicitHotIds.add(String(l.id));
        });
      }

      // Build a lookup of the refreshed leads keyed by their real id
      const refreshedMap = new Map(
        (refreshedLeads || []).map((l: any) => [String(l.id), l])
      );

      // Decide which leads are hot:
      //   a) explicitly flagged by the client, OR
      //   b) their source matches one of the hot sources
      const hotRows: Record<string, any>[] = [];

      for (const leadId of selectedLeads) {
        const lid = String(leadId);
        const lead = refreshedMap.get(lid);
        if (!lead) continue;

        const leadSource = String(lead.source || "").trim().toLowerCase();
        const isExplicitHot = explicitHotIds.has(lid);
        const isSourceHot =
          leadSource !== "" && normalizedHotSources.includes(leadSource);

        if (isExplicitHot || isSourceHot) {
          hotRows.push({
            lead_uuid: lead.id,               // real uuid from DB
            business_id: lead.business_id,
            name: lead.name || null,
            email: lead.email || null,
            phone: lead.phone || null,
            source: lead.source || null,
            city: lead.city || null,
            status: lead.status || "Assigned",
            created_at: lead.created_at || null,
            assigned_to: lead.assigned_to || assignedTo,
            assigned_at: lead.assigned_at || assignedAtIso,
            current_stage: lead.current_stage || "Prospect",
          });
        }
      }

      // ── 4. Upsert the hot rows into hot_leads ─────────────────────
      if (hotRows.length > 0) {
        // Try full shape first, then progressively smaller shapes in case
        // the table schema doesn't have all columns
        const shapes = [
          ["lead_uuid", "business_id", "name", "email", "phone", "source", "city", "status", "created_at", "assigned_to", "assigned_at", "current_stage"],
          ["lead_uuid", "business_id", "name", "source", "assigned_to", "assigned_at"],
          ["lead_uuid", "business_id"],
        ];

        for (const shape of shapes) {
          const payload = hotRows.map((row) => {
            const out: Record<string, any> = {};
            for (const key of shape) {
              if (key in row) out[key] = row[key];
            }
            return out;
          });

          const { error: upsertError } = await supabaseAdmin
            .from("hot_leads")
            .upsert(payload, { onConflict: "lead_uuid" });

          if (!upsertError) {
            hotSyncCount = payload.length;
            console.log(
              `[assign-leads] Upserted ${hotSyncCount} hot lead(s) into hot_leads table.`
            );
            break; // success — stop trying smaller shapes
          }

          console.warn(
            `[assign-leads] Upsert with shape [${shape.join(", ")}] failed:`,
            upsertError.message
          );
        }
      }

      console.log(
        `[assign-leads] Summary — assigned: ${selectedLeads.length}, hot detected: ${hotRows.length}, hot synced: ${hotSyncCount}`
      );
    } catch (hotErr: any) {
      // Never let hot-lead sync errors block the main assignment
      console.error("[assign-leads] Hot lead sync error (non-fatal):", hotErr.message);
    }

    return new Response(
      JSON.stringify({
        message: `Leads assigned successfully`,
        assignedCount: selectedLeads.length,
        hotSyncCount,
      }),
      { status: 200 }
    );
  } catch (outerErr: any) {
    console.error("Unexpected failure in assign-leads route:", outerErr.message);
    return new Response(
      JSON.stringify({ error: outerErr.message }),
      { status: 500 }
    );
  }
}
