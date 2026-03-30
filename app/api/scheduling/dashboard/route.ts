import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUnscheduledCallsSummary } from "@/lib/scheduling/scheduler";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/scheduling/dashboard
 *
 * Get system-wide scheduling dashboard data
 *
 * Returns:
 * {
 *   totalClients: number,
 *   totalCalls: {
 *     pending: number,
 *     scheduled: number,
 *     completed: number,
 *     missed: number,
 *     rescheduled: number
 *   },
 *   callsByType: {
 *     discovery: number,
 *     orientation: number,
 *     progressReview: number,
 *     renewal: number
 *   },
 *   amMetrics: [
 *     {
 *       amId: string,
 *       amName: string,
 *       activeClients: number,
 *       scheduledCalls: number,
 *       completedCalls: number,
 *       utilization: number
 *     }
 *   ],
 *   upcomingCalls: CallEvent[],
 *   unscheduledCalls: CallEvent[],
 *   slaBreach: CallEvent[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`📊 Generating scheduling dashboard`);

    // 1. Total clients (with active service registry)
    const { count: totalClients } = await supabase
      .from("service_registry")
      .select("*", { count: "exact" })
      .eq("status", "ACTIVE");

    // 2. Call counts by status
    const { data: callCounts } = await supabase
      .from("call_events")
      .select("status, count(*)")
      .group("status");

    const callsByStatus: Record<string, number> = {
      pending: 0,
      scheduled: 0,
      completed: 0,
      missed: 0,
      rescheduled: 0,
    };

    // 3. Call counts by type
    const { data: callTypes } = await supabase
      .from("call_events")
      .select("call_type, count(*)")
      .group("call_type");

    const callsByType: Record<string, number> = {
      discovery: 0,
      orientation: 0,
      progressReview: 0,
      renewal: 0,
    };

    // 4. AM metrics
    const { data: ams } = await supabase
      .from("profiles")
      .select("user_id, full_name, activeClientsCount")
      .eq("roles", "Accounts")
      .eq("is_active", "true");

    const amMetrics = [];
    if (ams) {
      for (const am of ams) {
        // Get scheduled and completed calls for this AM
        const { count: scheduled } = await supabase
          .from("call_events")
          .select("*", { count: "exact" })
          .eq("am_id", am.user_id)
          .eq("status", "SCHEDULED");

        const { count: completed } = await supabase
          .from("call_events")
          .select("*", { count: "exact" })
          .eq("am_id", am.user_id)
          .eq("status", "COMPLETED");

        const utilization = am.activeClientsCount
          ? (am.activeClientsCount / 50) * 100
          : 0; // Assuming 50 clients max per AM

        amMetrics.push({
          amId: am.user_id,
          amName: am.full_name,
          activeClients: am.activeClientsCount || 0,
          scheduledCalls: scheduled || 0,
          completedCalls: completed || 0,
          utilization: Math.min(utilization, 100),
        });
      }
    }

    // 5. Upcoming calls (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: upcomingCalls } = await supabase
      .from("call_events")
      .select("*")
      .eq("status", "SCHEDULED")
      .lte("scheduled_at", nextWeek.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(10);

    // 6. Unscheduled calls
    const unscheduledSummary = await getUnscheduledCallsSummary();

    // 7. SLA breaches (scheduled calls past deadline)
    const now = new Date().toISOString();
    const { data: slaBreaches } = await supabase
      .from("call_events")
      .select("*")
      .eq("status", "SCHEDULED")
      .lt("sla_deadline", now)
      .order("sla_deadline", { ascending: true });

    console.log(`✅ Dashboard generated`);
    console.log(`   Total Clients: ${totalClients}`);
    console.log(`   Total AMs: ${ams?.length || 0}`);
    console.log(`   Unscheduled Calls: ${unscheduledSummary.total}`);
    console.log(`   SLA Breaches: ${slaBreaches?.length || 0}`);

    return NextResponse.json({
      totalClients: totalClients || 0,
      totalCalls: callsByStatus,
      callsByType: callsByType,
      amMetrics: amMetrics,
      upcomingCalls: upcomingCalls || [],
      unscheduledCalls: unscheduledSummary.calls,
      slaBreach: slaBreaches || [],
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`❌ Dashboard Error: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
