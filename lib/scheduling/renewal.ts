// lib/scheduling/renewal.ts

import { DateTime } from "luxon";
import { createClient } from "@supabase/supabase-js";
import { RenewalScheduleResult } from "@/lib/types/scheduling";
import {
  isWorkingDay,
  getNextWorkingDay,
  isAMOnLeave,
  getAvailableAMs,
} from "./utilities";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// RENEWAL SCHEDULING LOGIC
// =====================================================

/**
 * Find optimal renewal call date within SLA window + extended window if needed
 *
 * Renewal logic:
 * 1. Target: 3 days before renewal_date
 * 2. Preferred window: Thursday, Friday, Monday of that week
 * 3. If in 3-day window: Find Thu/Fri/Mon
 * 4. If not possible: Extend window up to +7 days
 * 5. Account for holidays and AM leave
 */
export async function findRenewalCallDate(
  renewalDate: DateTime,
  amId: string
): Promise<RenewalScheduleResult> {
  const PREFERRED_DAYS = [5, 4, 1]; // Friday, Thursday, Monday (Luxon: 1=Mon, 7=Sun)
  const MAX_SEARCH_DAYS = 7;

  // Calculate SLA deadline: 3 days before renewal
  let slaDate = renewalDate.minus({ days: 3 });

  // Start searching from 3 days before renewal
  const searchStart = slaDate;
  const searchEnd = searchStart.plus({ days: MAX_SEARCH_DAYS });

  console.log(`🔍 Finding renewal call date for renewal on ${renewalDate.toISO()}`);
  console.log(`   SLA deadline: ${slaDate.toISO()}`);
  console.log(`   Search window: ${searchStart.toISO()} to ${searchEnd.toISO()}`);

  // Phase 1: Try preferred days (Thu/Fri/Mon) within 3-day window
  console.log(`\n📅 Phase 1: Searching preferred days (Thu/Fri/Mon)...`);
  let currentDate = searchStart;
  while (currentDate <= searchEnd && currentDate.diff(searchStart, "days").days <= 3) {
    for (const preferredDay of PREFERRED_DAYS) {
      if (currentDate.weekday === preferredDay) {
        const isValid = await isValidRenewalDate(currentDate, amId);
        if (isValid) {
          console.log(`   ✅ Found: ${currentDate.toISO()} (${getDayName(currentDate.weekday)})`);
          return {
            scheduledDate: currentDate.toISO()!,
            reason: "Scheduled within 3-day SLA window",
            success: true,
          };
        }
        break;
      }
    }
    currentDate = currentDate.plus({ days: 1 });
  }

  // Phase 2: Extended search - any working day up to +7 days
  console.log(`\n⏳ Phase 2: Searching extended window (up to +7 days)...`);
  currentDate = searchStart;
  while (currentDate <= searchEnd) {
    const isValid = await isValidRenewalDate(currentDate, amId);
    if (isValid) {
      const daysOffset = currentDate.diff(searchStart, "days").days;
      console.log(`   ✅ Found: ${currentDate.toISO()} (+${daysOffset} days from SLA)`);
      return {
        scheduledDate: currentDate.toISO()!,
        reason:
          daysOffset <= 3
            ? "Scheduled within 3-day SLA window"
            : `Extended scheduling (${daysOffset} days from SLA)`,
        success: true,
      };
    }
    currentDate = currentDate.plus({ days: 1 });
  }

  // Phase 3: Failure - return closest possible date
  console.log(`\n❌ Could not find valid date within extended window`);
  const fallbackDate = await getNextWorkingDay(searchEnd);
  return {
    scheduledDate: fallbackDate.toISO()!,
    reason: "No valid date found - manual rescheduling required",
    success: false,
  };
}

/**
 * Check if a date is valid for renewal call
 * - Must be a working day
 * - AM must be available
 */
async function isValidRenewalDate(
  date: DateTime,
  amId: string
): Promise<boolean> {
  // Check 1: Is working day?
  const working = await isWorkingDay(date);
  if (!working) {
    return false;
  }

  // Check 2: Is AM available?
  const onLeave = await isAMOnLeave(amId, date);
  if (onLeave) {
    return false;
  }

  return true;
}

/**
 * Get day name (Monday, Tuesday, etc.)
 */
function getDayName(weekday: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[weekday] || "Unknown";
}

/**
 * Get all clients due for renewal within next N days
 */
export async function getClientsForRenewal(daysWindow: number = 3) {
  const today = DateTime.now().setZone("Asia/Kolkata");
  const endDate = today.plus({ days: daysWindow });

  const { data: clients } = await supabase
    .from("service_registry")
    .select(
      `
      id,
      lead_id,
      service_start_date,
      subscription_cycle,
      renewal_date,
      status
    `
    )
    .eq("status", "ACTIVE")
    .gte("renewal_date", today.toISO())
    .lte("renewal_date", endDate.toISO());

  return clients || [];
}

/**
 * Create renewal call if not already exists
 */
export async function createRenewalCallIfNeeded(leadId: string) {
  // Check if renewal call already exists
  const { data: existingCall } = await supabase
    .from("call_events")
    .select("id")
    .eq("lead_id", leadId)
    .eq("call_type", "RENEWAL")
    .eq("status", "PENDING")
    .single();

  if (existingCall) {
    console.log(`⏭️  Renewal call already exists for ${leadId}`);
    return null;
  }

  // Get service registry
  const { data: service } = await supabase
    .from("service_registry")
    .select("*")
    .eq("lead_id", leadId)
    .single();

  if (!service) {
    console.warn(`⚠️  Service registry not found for lead ${leadId}`);
    return null;
  }

  const renewalDate = DateTime.fromISO(service.renewal_date);
  const slaDate = renewalDate.minus({ days: 3 });

  // Create renewal call
  const { data: newCall, error } = await supabase
    .from("call_events")
    .insert([
      {
        lead_id: leadId,
        call_type: "RENEWAL",
        priority: 1, // Highest priority
        status: "PENDING",
        sla_deadline: slaDate.toISO(),
        renewal_date: renewalDate.toISO(),
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(`❌ Failed to create renewal call: ${error.message}`);
    return null;
  }

  console.log(`✅ Created renewal call for ${leadId}: Call ID ${newCall.id}`);
  return newCall;
}

/**
 * Check renewals and create calls (called daily at midnight)
 */
export async function runRenewalCheck() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔄 RENEWAL CHECK CRON - ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}`);

  // Get clients due for renewal in next 4 days
  const clientsForRenewal = await getClientsForRenewal(4);

  console.log(`\n📊 Found ${clientsForRenewal.length} clients due for renewal`);

  if (clientsForRenewal.length === 0) {
    console.log("✅ No renewals needed");
    return;
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const client of clientsForRenewal) {
    try {
      const result = await createRenewalCallIfNeeded(client.lead_id);
      if (result) {
        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`❌ Error processing renewal for ${client.lead_id}:`, error);
      failed++;
    }
  }

  console.log(`\n✅ Renewal check completed:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
}

/**
 * Reschedule renewal calls for holidays/leaves
 */
export async function rescheduleRenewalCallsForUnavailability() {
  console.log(`\n🔄 Checking for renewal calls to reschedule...`);

  // Get all pending renewal calls
  const { data: renewalCalls } = await supabase
    .from("call_events")
    .select("*")
    .eq("call_type", "RENEWAL")
    .eq("status", "PENDING");

  if (!renewalCalls || renewalCalls.length === 0) {
    console.log("ℹ️  No renewal calls to reschedule");
    return;
  }

  let rescheduled = 0;

  for (const call of renewalCalls) {
    const renewalDate = DateTime.fromISO(call.renewal_date);
    
    // Assign best AM and find date
    // TODO: Get best AM assignment
    const amId = call.am_id || "unassigned";

    if (amId === "unassigned") {
      console.log(
        `⏭️  Skipping ${call.id} - not yet assigned to AM`
      );
      continue;
    }

    // Find optimal date
    const result = await findRenewalCallDate(renewalDate, amId);

    if (result.success) {
      const { error } = await supabase
        .from("call_events")
        .update({
          sla_deadline: result.scheduledDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", call.id);

      if (!error) {
        console.log(`✅ Rescheduled call ${call.id} to ${result.scheduledDate}`);
        rescheduled++;
      }
    }
  }

  console.log(`\n✅ Rescheduling complete: ${rescheduled} calls updated`);
}
