// lib/scheduling/scheduler.ts

import { DateTime } from "luxon";
import { createClient } from "@supabase/supabase-js";
import { CallEvent, SchedulingResult } from "@/lib/types/scheduling";
import {
  sortCallsByPriority,
  selectBestAM,
  findFirstAvailableSlot,
  isValidSchedulingDate,
  notifyAM,
  notifyClient,
  sendSchedulingFailureAlert,
} from "./utilities";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// MAIN SCHEDULER ENGINE
// =====================================================

/**
 * Run the main scheduling algorithm
 * Called every 5 minutes by CRON to pick up PENDING calls and schedule them
 *
 * Algorithm:
 * 1. Get all PENDING calls sorted by priority + deadline
 * 2. For each call:
 *    a. Select best AM (least active clients, nearestRenewal tie-breaker)
 *    b. Find earliest available slot before SLA deadline
 *    c. If found: Assign call to AM
 *    d. If not found:
 *       - Try preempting lower-priority call
 *       - If successful: Reschedule preempted call, assign high-priority call
 *       - If failed: Mark as scheduling failure, alert admin
 * 3. Return overall scheduling statistics
 */
export async function runScheduler(): Promise<SchedulingResult> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`⚙️  SCHEDULER RUN - ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}`);

  try {
    // Step 1: Get all PENDING calls
    const { data: pendingCalls, error: fetchError } = await supabase
      .from("call_events")
      .select("*")
      .eq("status", "PENDING")
      .order("sla_deadline", { ascending: true });

    if (fetchError) {
      console.error(`❌ Failed to fetch pending calls: ${fetchError.message}`);
      return {
        success: false,
        processed: 0,
        scheduled: 0,
        preempted: 0,
        failed: 0,
        error: fetchError.message,
      };
    }

    const calls = pendingCalls || [];
    console.log(`📋 Found ${calls.length} pending calls`);

    if (calls.length === 0) {
      return {
        success: true,
        processed: 0,
        scheduled: 0,
        preempted: 0,
        failed: 0,
      };
    }

    // Step 2: Sort by priority + deadline
    const sortedCalls = sortCallsByPriority(calls);

    console.log(`\n🔄 Processing calls (priority + deadline order):`);
    sortedCalls.forEach((call, idx) => {
      const priority = getPriorityLabel(call.priority);
      const deadline = new Date(call.sla_deadline);
      console.log(
        `   ${idx + 1}. [${priority}] ${call.call_type} (ID: ${call.id.slice(0, 8)}..., SLA: ${deadline.toLocaleString()})`
      );
    });

    // Step 3: Process each call
    let scheduledCount = 0;
    let preemptedCount = 0;
    let failedCount = 0;

    for (const call of sortedCalls) {
      console.log(`\n📞 Processing: ${call.call_type} (ID: ${call.id.slice(0, 8)}...)`);

      const result = await scheduleCall(call);

      if (result.scheduled) {
        scheduledCount++;
        console.log(`   ✅ SCHEDULED - AM: ${result.am_id}, Time: ${result.scheduled_at}`);
      } else if (result.preempted) {
        preemptedCount++;
        console.log(
          `   ✅ SCHEDULED (via preemption) - Preempted: ${result.preempted_call_id}`
        );
      } else {
        failedCount++;
        console.log(`   ❌ FAILED - ${result.failure_reason}`);
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ SCHEDULER COMPLETED`);
    console.log(`   Total Processed: ${calls.length}`);
    console.log(`   Scheduled: ${scheduledCount}`);
    console.log(`   Via Preemption: ${preemptedCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log(`${"=".repeat(60)}\n`);

    return {
      success: true,
      processed: calls.length,
      scheduled: scheduledCount,
      preempted: preemptedCount,
      failed: failedCount,
    };
  } catch (error: any) {
    console.error(`❌ Scheduler error: ${error.message}`);
    return {
      success: false,
      processed: 0,
      scheduled: 0,
      preempted: 0,
      failed: 0,
      error: error.message,
    };
  }
}

// =====================================================
// CALL ASSIGNMENT LOGIC
// =====================================================

/**
 * Schedule a single call
 *
 * Returns:
 * - { scheduled: true, am_id, scheduled_at } if successfully scheduled
 * - { scheduled: true, preempted: true, preempted_call_id } if scheduled via preemption
 * - { scheduled: false, failure_reason } if scheduling failed
 */
async function scheduleCall(
  call: CallEvent
): Promise<{
  scheduled: boolean;
  preempted?: boolean;
  am_id?: string;
  scheduled_at?: string;
  preempted_call_id?: string;
  failure_reason?: string;
}> {
  try {
    // Step 1: Select best AM
    const bestAM = await selectBestAM();
    if (!bestAM) {
      const msg = "No available AMs";
      console.log(`   ⚠️  ${msg}`);
      await sendSchedulingFailureAlert(call.id, call.lead_id, msg);
      return { scheduled: false, failure_reason: msg };
    }

    console.log(`   👤 Selected AM: ${bestAM.full_name}`);

    // Step 2: Find earliest available slot before SLA deadline
    const slaDeadline = DateTime.fromISO(call.sla_deadline);
    const slot = await findEarliestAvailableSlot(bestAM.user_id, slaDeadline);

    if (slot) {
      // Success: Assign call to AM
      const assignResult = await assignCallToAM(call, bestAM.user_id, slot);
      if (assignResult.success) {
        console.log(`   ✅ Found available slot: ${slot.startTime}`);
        return {
          scheduled: true,
          am_id: bestAM.user_id,
          scheduled_at: slot.startTime,
        };
      } else {
        return {
          scheduled: false,
          failure_reason: `Failed to assign call: ${assignResult.error}`,
        };
      }
    }

    console.log(`   ⚠️  No free slots found - Trying preemption...`);

    // Step 3: Try preemption
    const preemptResult = await tryPreemptAndReschedule(
      call,
      bestAM.user_id,
      slaDeadline
    );

    if (preemptResult.success) {
      return {
        scheduled: true,
        preempted: true,
        preempted_call_id: preemptResult.preempted_call_id,
      };
    } else {
      const msg = preemptResult.error || "Unable to preempt lower-priority call";
      console.log(`   ❌ ${msg}`);
      await sendSchedulingFailureAlert(call.id, call.lead_id, msg);
      return { scheduled: false, failure_reason: msg };
    }
  } catch (error: any) {
    const msg = `Unexpected error: ${error.message}`;
    await sendSchedulingFailureAlert(call.id, call.lead_id, msg);
    return { scheduled: false, failure_reason: msg };
  }
}

/**
 * Assign a call to an AM and book the slot
 */
async function assignCallToAM(
  call: CallEvent,
  amId: string,
  slot: { startTime: string; endTime: string }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("call_events")
    .update({
      am_id: amId,
      scheduled_at: slot.startTime,
      scheduled_until: slot.endTime,
      status: "SCHEDULED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", call.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Notify AM
  const { data: amProfile } = await supabase
    .from("profiles")
    .select("user_email, full_name")
    .eq("user_id", amId)
    .single();

  if (amProfile) {
    await notifyAM(amProfile.user_email, {
      callId: call.id,
      clientId: call.lead_id,
      callType: call.call_type,
      scheduledTime: slot.startTime,
    });
  }

  return { success: true };
}

/**
 * Try to preempt a lower-priority call and reschedule it
 */
async function tryPreemptAndReschedule(
  highPriorityCall: CallEvent,
  amId: string,
  deadline: DateTime
): Promise<{ success: boolean; preempted_call_id?: string; error?: string }> {
  // Find lowest priority scheduled call for this AM
  const { data: scheduledCalls } = await supabase
    .from("call_events")
    .select("*")
    .eq("am_id", amId)
    .eq("status", "SCHEDULED")
    .order("priority", { ascending: false }); // Highest priority first (to get lowest)

  if (!scheduledCalls || scheduledCalls.length === 0) {
    return { success: false, error: "No scheduled calls to preempt" };
  }

  const lowestPriorityCall = scheduledCalls[0]; // Last in priority order

  // Can only preempt if it's lower priority
  if (lowestPriorityCall.priority <= highPriorityCall.priority) {
    return {
      success: false,
      error: "Cannot preempt call with same or higher priority",
    };
  }

  // Preempt the call
  const preemptResult = await preemptCall(lowestPriorityCall);
  if (!preemptResult.success) {
    return { success: false, error: preemptResult.error };
  }

  // Try to reschedule the preempted call (return to PENDING)
  const rescheduleResult = await rescheduleCall(lowestPriorityCall);
  if (!rescheduleResult.success) {
    console.warn(`⚠️  Failed to reschedule preempted call ${lowestPriorityCall.id}`);
  }

  // Now assign the high-priority call to the freed slot
  const slot = {
    startTime: lowestPriorityCall.scheduled_at!,
    endTime: lowestPriorityCall.scheduled_until!,
  };

  const assignResult = await assignCallToAM(highPriorityCall, amId, slot);
  if (!assignResult.success) {
    return { success: false, error: assignResult.error };
  }

  return {
    success: true,
    preempted_call_id: lowestPriorityCall.id,
  };
}

/**
 * Preempt a scheduled call (remove AM assignment, set to RESCHEDULED)
 */
async function preemptCall(call: CallEvent): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("call_events")
    .update({
      am_id: null,
      scheduled_at: null,
      scheduled_until: null,
      status: "RESCHEDULED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", call.id);

  if (error) {
    return { success: false, error: error.message };
  }

  console.log(`   🔄 Preempted: ${call.id}`);
  return { success: true };
}

/**
 * Reschedule a preempted call back to PENDING
 */
async function rescheduleCall(call: CallEvent): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("call_events")
    .update({
      status: "PENDING",
      updated_at: new Date().toISOString(),
    })
    .eq("id", call.id);

  if (error) {
    return { success: false, error: error.message };
  }

  console.log(`   📌 Re-queued: ${call.id}`);
  return { success: true };
}

/**
 * Find earliest available slot for an AM before deadline
 */
async function findEarliestAvailableSlot(
  amId: string,
  deadline: DateTime
): Promise<{ startTime: string; endTime: string } | null> {
  // Start from today and search until deadline
  let searchDate = DateTime.now().setZone("Asia/Kolkata");

  while (searchDate <= deadline) {
    const isValid = await isValidSchedulingDate(searchDate);
    if (!isValid) {
      searchDate = searchDate.plus({ days: 1 });
      continue;
    }

    const slot = await findFirstAvailableSlot(amId, searchDate);
    if (slot) {
      return slot;
    }

    searchDate = searchDate.plus({ days: 1 });
  }

  return null;
}

/**
 * Get priority label for logging
 */
function getPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: "🔴 CRITICAL",
    2: "🟠 HIGH   ",
    3: "🟡 MEDIUM",
    4: "🟢 LOW   ",
  };
  return labels[priority] || "UNKNOWN";
}

// =====================================================
// HELPER: Get unscheduled calls summary
// =====================================================

export async function getUnscheduledCallsSummary() {
  const { data: calls } = await supabase
    .from("call_events")
    .select("id, call_type, priority, sla_deadline, lead_id")
    .eq("status", "PENDING")
    .order("sla_deadline", { ascending: true });

  return {
    total: calls?.length || 0,
    calls: calls || [],
  };
}
