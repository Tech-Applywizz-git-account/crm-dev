// lib/scheduling/call-creation.ts

import { DateTime } from "luxon";
import { createClient } from "@supabase/supabase-js";
import {
  DiscoveryCallRequest,
  ServiceStartedRequest,
  CallEvent,
} from "@/lib/types/scheduling";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// DISCOVERY CALL CREATION
// =====================================================

/**
 * Create a Discovery call triggered when a sale is closed
 *
 * Discovery Call SLA:
 * - If sale closed BEFORE 4:30 AM: Schedule for TODAY evening (8:45 PM same day)
 * - If sale closed AFTER 4:30 AM: Schedule for TOMORROW evening (8:45 PM next day)
 * - Keep as PENDING until assigned to AM
 *
 * @param req Discovery call request from sales API
 */
export async function createDiscoveryCall(
  req: DiscoveryCallRequest
): Promise<{ success: boolean; callId?: string; error?: string }> {
  console.log(`\n📝 Creating Discovery Call for lead ${req.lead_id}`);

  try {
    // Get current time in IST
    const now = DateTime.now().setZone("Asia/Kolkata");
    const cutoffTime = now.set({ hour: 4, minute: 30, second: 0 });

    // Determine SLA deadline based on sale close time
    let slaDate: DateTime;
    const closedAt = DateTime.fromISO(req.closed_at).setZone("Asia/Kolkata");

    if (closedAt < cutoffTime) {
      // Before 4:30 AM: Schedule for TODAY evening
      slaDate = closedAt.set({
        hour: 20,
        minute: 45,
        second: 0,
        millisecond: 0,
      });
      console.log(`   ✓ Sale before 4:30 AM → SLA: TODAY at ${slaDate.toISO()}`);
    } else {
      // After 4:30 AM: Schedule for TOMORROW evening
      slaDate = closedAt
        .plus({ days: 1 })
        .set({
          hour: 20,
          minute: 45,
          second: 0,
          millisecond: 0,
        });
      console.log(`   ✓ Sale after 4:30 AM → SLA: TOMORROW at ${slaDate.toISO()}`);
    }

    // Create Discovery call as PENDING (no AM assigned yet)
    const { data: callEvent, error } = await supabase
      .from("call_events")
      .insert([
        {
          lead_id: req.lead_id,
          call_type: "DISCOVERY",
          priority: 2, // High priority (after Renewal)
          status: "PENDING",
          sla_deadline: slaDate.toISO(),
          created_at: new Date().toISOString(),
          metadata: {
            sale_value: req.sale_value,
            subscription_cycle: req.subscription_cycle,
          },
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed to create call: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `   ✅ Discovery call created (ID: ${callEvent.id}) - Status: PENDING`
    );
    console.log(`   📅 SLA Deadline: ${slaDate.toISO()}`);

    return { success: true, callId: callEvent.id };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// =====================================================
// SERVICE STARTED FLOW
// =====================================================

/**
 * Create service registry and associated calls
 * Triggered when service is actually started (account setup complete)
 *
 * Flow:
 * 1. Create service_registry entry (calculates renewal_date)
 * 2. Create Orientation call (same/next working day)
 * 3. Create Progress Review calls (every 15 days, skip last 15 days)
 * 4. Create Renewal call will be created by daily CRON
 *
 * @param req Service started request
 */
export async function processServiceStarted(
  req: ServiceStartedRequest
): Promise<{
  success: boolean;
  renewalDate?: string;
  progressCallIds?: string[];
  orientationCallId?: string;
  error?: string;
}> {
  console.log(
    `\n🚀 Processing Service Started for lead ${req.lead_id}`
  );

  try {
    // Step 1: Get sale information from sales_closure
    const { data: sale, error: saleError } = await supabase
      .from("sales_closure")
      .select("id, subscription_cycle, closed_at")
      .eq("lead_id", req.lead_id)
      .single();

    if (saleError || !sale) {
      return {
        success: false,
        error: `Sale not found for lead ${req.lead_id}`,
      };
    }

    const subscriptionDays = parseInt(sale.subscription_cycle || "30");
    const serviceStart = DateTime.fromISO(req.service_start_date).setZone(
      "Asia/Kolkata"
    );
    const renewalDate = serviceStart.plus({ days: subscriptionDays });

    console.log(`   📊 Subscription: ${subscriptionDays} days`);
    console.log(`   🚀 Service Start: ${serviceStart.toISO()}`);
    console.log(`   🔄 Renewal Date: ${renewalDate.toISO()}`);

    // Step 2: Create service_registry entry
    const { data: serviceReg, error: regError } = await supabase
      .from("service_registry")
      .insert([
        {
          lead_id: req.lead_id,
          sales_closure_id: sale.id,
          service_start_date: serviceStart.toISO(),
          subscription_cycle: subscriptionDays,
          renewal_date: renewalDate.toISO(),
          status: "ACTIVE",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (regError) {
      console.error(`   ❌ Failed to create service registry: ${regError.message}`);
      return {
        success: false,
        error: `Failed to create service registry: ${regError.message}`,
      };
    }

    console.log(`   ✅ Service registry created`);

    // Step 3: Create Orientation call (same/next working day)
    const orientationDate = await getOrientationCallDate(serviceStart);
    const slaDate = orientationDate.set({
      hour: 20,
      minute: 45,
      second: 0,
      millisecond: 0,
    });

    const { data: orientationCall, error: orientError } = await supabase
      .from("call_events")
      .insert([
        {
          lead_id: req.lead_id,
          call_type: "ORIENTATION",
          priority: 4, // Lowest priority
          status: "PENDING",
          sla_deadline: slaDate.toISO(),
          created_at: new Date().toISOString(),
          metadata: { service_start_date: serviceStart.toISO() },
        },
      ])
      .select()
      .single();

    if (orientError) {
      console.error(`   ❌ Failed to create orientation call: ${orientError.message}`);
    } else {
      console.log(
        `   ✅ Orientation call created (ID: ${orientationCall.id})`
      );
    }

    // Step 4: Create Progress Review calls
    const progressCallIds = await createProgressReviewCalls(
      req.lead_id,
      serviceStart,
      subscriptionDays
    );

    console.log(
      `\n✅ Service started successfully:`
    );
    console.log(`   Renewal Date: ${renewalDate.toISO()}`);
    console.log(`   Progress Review Calls: ${progressCallIds.length}`);

    return {
      success: true,
      renewalDate: renewalDate.toISO() ?? undefined,
      orientationCallId: orientationCall?.id,
      progressCallIds,
    };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Determine Orientation call date (same or next working day)
 */
async function getOrientationCallDate(serviceStart: DateTime): Promise<DateTime> {
  // For now, schedule for next day at start of evening shift
  return serviceStart.plus({ days: 1 }).set({
    hour: 20,
    minute: 45,
    second: 0,
    millisecond: 0,
  });
}

/**
 * Create Progress Review calls
 *
 * Logic:
 * - Every 15 days from service start
 * - SKIP last 15 days before renewal
 * - Example: 90-day = calls on days 15, 30, 45, 60, 75 (skip 90)
 */
async function createProgressReviewCalls(
  leadId: string,
  serviceStart: DateTime,
  subscriptionDays: number
): Promise<string[]> {
  const callIds: string[] = [];
  const progressDays: number[] = [];

  console.log(`\n   📅 Creating Progress Review calls:`);
  console.log(`      Cycle: ${subscriptionDays} days`);

  // Calculate progress review days (every 15 days, skip last 15)
  let day = 15;
  while (day <= subscriptionDays - 15) {
    progressDays.push(day);
    day += 15;
  }

  console.log(`      Schedule: days ${progressDays.join(", ")}`);

  for (const progressDay of progressDays) {
    const callDate = serviceStart.plus({ days: progressDay });
    const slaDate = callDate.set({
      hour: 20,
      minute: 45,
      second: 0,
      millisecond: 0,
    });

    const { data: progressCall, error } = await supabase
      .from("call_events")
      .insert([
        {
          lead_id: leadId,
          call_type: "PROGRESS_REVIEW",
          priority: 3, // Medium priority
          status: "PENDING",
          sla_deadline: slaDate.toISO(),
          progress_day: progressDay,
          created_at: new Date().toISOString(),
          metadata: { service_start_date: serviceStart.toISO() },
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(
        `      ❌ Failed to create day ${progressDay} call: ${error.message}`
      );
    } else {
      callIds.push(progressCall.id);
      console.log(
        `      ✅ Day ${progressDay}: ${callDate.toISO()} (Call ID: ${progressCall.id})`
      );
    }
  }

  return callIds;
}

/**
 * Get all pending calls for a lead
 */
export async function getCallsForLead(leadId: string): Promise<CallEvent[]> {
  const { data, error } = await supabase
    .from("call_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("sla_deadline", { ascending: true });

  if (error) {
    console.error(`Error fetching calls for ${leadId}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Get client's full scheduling status
 */
export async function getClientSchedulingStatus(leadId: string) {
  const calls = await getCallsForLead(leadId);

  const status = {
    leadId,
    discoveryCall: calls.find((c) => c.call_type === "DISCOVERY"),
    orientationCall: calls.find((c) => c.call_type === "ORIENTATION"),
    progressReviewCalls: calls.filter((c) => c.call_type === "PROGRESS_REVIEW"),
    renewalCall: calls.find((c) => c.call_type === "RENEWAL"),
    totalCalls: calls.length,
    completedCalls: calls.filter((c) => c.status === "COMPLETED").length,
  };

  return status;
}
