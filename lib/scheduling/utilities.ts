// lib/scheduling/utilities.ts

import { DateTime } from "luxon";
import { createClient } from "@supabase/supabase-js";
import { Holiday, TimeSlot, CallPriority } from "@/lib/types/scheduling";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// CONSTANTS
// =====================================================

export const SHIFT_HOURS = {
  MORNING_START: 20, // 8:00 PM (but first call at 8:45 PM)
  FIRST_CALL: { hour: 20, minute: 45 }, // 8:45 PM
  BREAK_START: { hour: 23, minute: 30 }, // 11:30 PM
  BREAK_END: { hour: 0, minute: 30 }, // 12:30 AM (next day)
  EVENING_END: { hour: 5, minute: 30 }, // 5:30 AM
};

export const CALL_DURATION_MINUTES = 30;
export const MAX_RENEWAL_SEARCH_WINDOW_DAYS = 7; // Extend search by 7 days if SLA window fails
export const MAX_PROGRESS_DELAY_DAYS = 7; // Max days to forward a call

// =====================================================
// HOLIDAY UTILITIES
// =====================================================

/**
 * Check if a date is a holiday or weekend
 */
export async function isHoliday(date: DateTime): Promise<boolean> {
  // Check if weekend (Saturday=6, Sunday=7)
  if (date.weekday === 6 || date.weekday === 7) {
    return true;
  }

  // Check fixed holidays
  const dateStr = date.toFormat("yyyy-MM-dd");
  const { data } = await supabase
    .from("holidays_2026")
    .select("*")
    .eq("holiday_date", dateStr)
    .single();

  return !!data;
}

/**
 * Check if a date is a working day (not holiday, not weekend)
 */
export async function isWorkingDay(date: DateTime): Promise<boolean> {
  return !(await isHoliday(date));
}

/**
 * Get next working day if current date is holiday
 */
export async function getNextWorkingDay(date: DateTime): Promise<DateTime> {
  let currentDate = date;
  const maxAttempts = 30; // Prevent infinite loop
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (await isWorkingDay(currentDate)) {
      return currentDate;
    }
    currentDate = currentDate.plus({ days: 1 });
    attempts++;
  }

  // Fallback: return original date
  console.warn(`Could not find working day within ${maxAttempts} days`);
  return date;
}

/**
 * Get previous working day if current date is holiday
 */
export async function getPreviousWorkingDay(date: DateTime): Promise<DateTime> {
  let currentDate = date;
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (await isWorkingDay(currentDate)) {
      return currentDate;
    }
    currentDate = currentDate.minus({ days: 1 });
    attempts++;
  }

  console.warn(`Could not find working day within ${maxAttempts} days`);
  return date;
}

// =====================================================
// TIME SLOT UTILITIES
// =====================================================

/**
 * Generate all 30-minute slots for a given date
 * Respects shift hours: 8:45 PM - 11:30 PM, 12:30 AM - 5:30 AM
 */
export function generateDailySlots(date: DateTime): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Morning window: 8:45 PM - 11:30 PM
  let current = date.set(SHIFT_HOURS.FIRST_CALL);
  const morningEnd = date.set(SHIFT_HOURS.BREAK_START);

  while (current < morningEnd) {
    const end = current.plus({ minutes: CALL_DURATION_MINUTES });
    slots.push({
      startTime: current.toISO()!,
      endTime: end.toISO()!,
      available: true,
    });
    current = end;
  }

  // Evening window: 12:30 AM - 5:30 AM (next day)
  const nextDay = date.plus({ days: 1 });
  current = nextDay.set(SHIFT_HOURS.BREAK_END);
  const eveningEnd = nextDay.set(SHIFT_HOURS.EVENING_END);

  while (current < eveningEnd) {
    const end = current.plus({ minutes: CALL_DURATION_MINUTES });
    slots.push({
      startTime: current.toISO()!,
      endTime: end.toISO()!,
      available: true,
    });
    current = end;
  }

  return slots;
}

/**
 * Check if two time slots overlap
 */
export function slotsOverlap(
  slot1: { startTime: string; endTime: string },
  slot2: { startTime: string; endTime: string }
): boolean {
  const start1 = DateTime.fromISO(slot1.startTime);
  const end1 = DateTime.fromISO(slot1.endTime);
  const start2 = DateTime.fromISO(slot2.startTime);
  const end2 = DateTime.fromISO(slot2.endTime);

  return start1 < end2 && end1 > start2;
}

/**
 * Find first available slot for an AM on a given date
 */
export async function findFirstAvailableSlot(
  amId: string,
  targetDate: DateTime
): Promise<TimeSlot | null> {
  const allSlots = generateDailySlots(targetDate);

  // Get all scheduled calls for this AM on this date
  const { data: scheduledCalls } = await supabase
    .from("call_events")
    .select("scheduled_at, scheduled_until")
    .eq("am_id", amId)
    .eq("status", "SCHEDULED")
    .gte("scheduled_at", targetDate.startOf("day").toISO())
    .lte("scheduled_at", targetDate.endOf("day").toISO());

  // Find first slot that doesn't overlap
  for (const slot of allSlots) {
    const hasConflict = scheduledCalls?.some((call) =>
      slotsOverlap(slot, call as any)
    );

    if (!hasConflict) {
      return slot;
    }
  }

  return null;
}

/**
 * Get all free slots for an AM on a date
 */
export async function getFreeSlots(
  amId: string,
  targetDate: DateTime
): Promise<TimeSlot[]> {
  const allSlots = generateDailySlots(targetDate);

  const { data: scheduledCalls } = await supabase
    .from("call_events")
    .select("scheduled_at, scheduled_until")
    .eq("am_id", amId)
    .eq("status", "SCHEDULED");

  return allSlots.filter((slot) =>
    !scheduledCalls?.some((call) => slotsOverlap(slot, call as any))
  );
}

// =====================================================
// AM AVAILABILITY UTILITIES
// =====================================================

/**
 * Check if an AM is on leave on a given date
 */
export async function isAMOnLeave(
  amId: string,
  date: DateTime
): Promise<boolean> {
  const dateStr = date.toFormat("yyyy-MM-dd");
  const { data } = await supabase
    .from("am_unavailability")
    .select("*")
    .eq("am_id", amId)
    .eq("unavailable_date", dateStr)
    .single();

  return !!data;
}

/**
 * Get all AMs who are available on a date
 */
export async function getAvailableAMs(date: DateTime): Promise<string[]> {
  // Get all active AMs
  const { data: allAMs } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("is_active", "true")
    .eq("roles", "Accounts");

  if (!allAMs) return [];

  // Filter out those on leave
  const availableAMs: string[] = [];
  for (const am of allAMs) {
    const onLeave = await isAMOnLeave(am.user_id, date);
    if (!onLeave) {
      availableAMs.push(am.user_id);
    }
  }

  return availableAMs;
}

/**
 * Check if date is valid for scheduling (working day + any AM available + has slots)
 */
export async function isValidSchedulingDate(date: DateTime): Promise<boolean> {
  // Check 1: Is it a working day?
  const working = await isWorkingDay(date);
  if (!working) {
    console.log(`❌ ${date.toISO()} is not a working day`);
    return false;
  }

  // Check 2: Any AMs available?
  const availableAMs = await getAvailableAMs(date);
  if (availableAMs.length === 0) {
    console.log(`❌ ${date.toISO()} - No AMs available`);
    return false;
  }

  // Check 3: Any AM has free slots?
  let hasSlots = false;
  for (const amId of availableAMs) {
    const slots = await getFreeSlots(amId, date);
    if (slots.length > 0) {
      hasSlots = true;
      break;
    }
  }

  if (!hasSlots) {
    console.log(`❌ ${date.toISO()} - No free slots for any AM`);
    return false;
  }

  console.log(`✅ ${date.toISO()} is valid for scheduling`);
  return true;
}

// =====================================================
// RENEWAL DATE CALCULATION
// =====================================================

/**
 * Calculate renewal date based on service start + subscription cycle
 */
export function calculateRenewalDate(
  serviceStartDate: DateTime,
  subscriptionDays: number
): DateTime {
  return serviceStartDate.plus({ days: subscriptionDays });
}

/**
 * Convert subscription cycle to days
 */
export function subscriptionCycleToDays(cycle: string): number {
  const cycleMap: Record<string, number> = {
    "30_days": 30,
    "60_days": 60,
    "90_days": 90,
    "120_days": 120,
    "1_month": 30,
    "3_months": 90,
    "6_months": 180,
    "1_year": 365,
  };
  return cycleMap[cycle] || 30;
}

// =====================================================
// PRIORITY UTILITIES
// =====================================================

/**
 * Get priority label from number
 */
export function getPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: "CRITICAL (Renewal)",
    2: "High (Discovery)",
    3: "Medium (Progress Review)",
    4: "Low (Orientation)",
  };
  return labels[priority] || "Unknown";
}

/**
 * Sort calls by priority and SLA deadline
 */
export function sortCallsByPriority<T extends { priority: number; sla_deadline: string }>(
  calls: T[]
): T[] {
  return [...calls].sort((a, b) => {
    // Primary: Priority ascending (1 before 4)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Secondary: SLA deadline ascending (soonest first)
    return (
      new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime()
    );
  });
}

// =====================================================
// AM ASSIGNMENT UTILITIES
// =====================================================

/**
 * Get AM with least active clients and nearest renewal date
 */
export async function selectBestAM(leadId?: string): Promise<{ user_id: string; full_name: string; user_email: string } | null> {
  // Get all active AMs with their active client counts
  const { data: ams } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, user_email, is_active, roles")
    .eq("is_active", "true")
    .eq("roles", "Accounts");

  if (!ams || ams.length === 0) {
    console.warn("No active AMs found");
    return null;
  }

  // Get active client count for each AM
  let bestAM = ams[0];
  let lowestCount = Infinity;
  let nearestRenewal = new Date(8640000000000000); // Max date

  for (const am of ams) {
    const { count } = await supabase
      .from("call_events")
      .select("*", { count: "exact" })
      .eq("am_id", am.user_id)
      .in("status", ["SCHEDULED", "PENDING"]);

    if ((count || 0) < lowestCount) {
      lowestCount = count || 0;
      bestAM = am;
      nearestRenewal = new Date(8640000000000000);
    } else if ((count || 0) === lowestCount) {
      // Tiebreaker: nearest renewal date
      const { data: calls } = await supabase
        .from("call_events")
        .select("sla_deadline")
        .eq("am_id", am.user_id)
        .eq("call_type", "RENEWAL")
        .order("sla_deadline", { ascending: true })
        .limit(1);

      if (calls && calls.length > 0) {
        const renewalDate = new Date(calls[0].sla_deadline);
        if (renewalDate < nearestRenewal) {
          nearestRenewal = renewalDate;
          bestAM = am;
        }
      }
    }
  }

  return {
    user_id: bestAM.user_id,
    full_name: bestAM.full_name,
    user_email: bestAM.user_email,
  };
}

// =====================================================
// NOTIFICATION UTILITIES
// =====================================================

/**
 * Send notification to AM about scheduled call
 */
export async function notifyAM(
  amEmail: string,
  callDetails: {
    callId: string;
    clientId: string;
    callType: string;
    scheduledTime: string;
  }
): Promise<void> {
  // TODO: Implement email notification
  console.log(`📧 Notifying AM: ${amEmail}`);
  console.log(`   Call: ${callDetails.callType}`);
  console.log(`   Time: ${callDetails.scheduledTime}`);
}

/**
 * Send notification to client about scheduled call
 */
export async function notifyClient(
  leadId: string,
  callDetails: {
    callId: string;
    callType: string;
    scheduledTime: string;
    amName: string;
  }
): Promise<void> {
  // TODO: Implement email/SMS notification
  console.log(`📧 Notifying Client: ${leadId}`);
  console.log(`   Call: ${callDetails.callType}`);
  console.log(`   Time: ${callDetails.scheduledTime}`);
  console.log(`   AM: ${callDetails.amName}`);
}

/**
 * Send SLA breach alert to admin
 */
export async function sendSLABreachAlert(
  callId: string,
  clientId: string,
  callType: string,
  deadline: string
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  console.log(`🚨 SLA Breach Alert to ${adminEmail}`);
  console.log(`   Call ID: ${callId}`);
  console.log(`   Client: ${clientId}`);
  console.log(`   Type: ${callType}`);
  console.log(`   Deadline: ${deadline}`);
}

/**
 * Send admin alert if call cannot be scheduled
 */
export async function sendSchedulingFailureAlert(
  callId: string,
  leadId: string,
  reason: string
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  console.log(`🚨 Scheduling Failure Alert to ${adminEmail}`);
  console.log(`   Call ID: ${callId}`);
  console.log(`   Client: ${leadId}`);
  console.log(`   Reason: ${reason}`);
}
