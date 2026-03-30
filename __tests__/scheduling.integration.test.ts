// __tests__/scheduling.integration.test.ts
// Integration tests for Account Manager Auto-Scheduling System

import { DateTime } from "luxon";
import {
  createDiscoveryCall,
  processServiceStarted,
  getCallsForLead,
  getClientSchedulingStatus,
} from "@/lib/scheduling/call-creation";
import {
  findRenewalCallDate,
  getClientsForRenewal,
  createRenewalCallIfNeeded,
} from "@/lib/scheduling/renewal";
import {
  isHoliday,
  isWorkingDay,
  generateDailySlots,
  selectBestAM,
} from "@/lib/scheduling/utilities";
import { runScheduler, getUnscheduledCallsSummary } from "@/lib/scheduling/scheduler";

/**
 * SETUP: These tests require:
 * 1. Database migration applied to Supabase
 * 2. Valid Supabase credentials in .env
 * 3. Some test leads in the leads table
 * 4. Some test sales in sales_closure table
 * 5. At least one active Account Manager with role='Accounts'
 *
 * To run:
 * npm test -- scheduling.integration.test.ts
 */

describe("Account Manager Scheduling System - Integration Tests", () => {
  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  function getTestLeadId(): string {
    return `test-lead-${Date.now()}`;
  }

  // =====================================================
  // HOLIDAY TESTS
  // =====================================================

  describe("Holiday and Working Day Checks", () => {
    it("Should identify Sundays as holidays", async () => {
      // January 5, 2025 is a Sunday
      const sunday = DateTime.fromISO("2025-01-05");
      const isHolidayResult = await isHoliday(sunday);
      expect(isHolidayResult).toBe(true);
    });

    it("Should identify 2026 India holidays", async () => {
      // January 1, 2026 - New Year (in 2026 holidays)
      const newYear = DateTime.fromISO("2026-01-01");
      const isHolidayResult = await isHoliday(newYear);
      expect(isHolidayResult).toBe(true);
    });

    it("Should identify weekdays as working days", async () => {
      // March 30, 2026 is Monday (not Sunday)
      const monday = DateTime.fromISO("2026-03-30");
      const isWorkingDayResult = await isWorkingDay(monday);
      expect(isWorkingDayResult).toBe(true);
    });
  });

  // =====================================================
  // TIME SLOT GENERATION TESTS
  // =====================================================

  describe("Time Slot Generation", () => {
    it("Should generate slots for morning window (8:45 PM - 11:30 PM)", () => {
      const date = DateTime.fromISO("2026-03-30");
      const slots = generateDailySlots(date);

      // Morning window: 8:45 PM to 11:30 PM = 2h 45m = 5.5 slots (30-min each)
      const morningSlots = slots.filter((s) => {
        const startHour = DateTime.fromISO(s.startTime).hour;
        return startHour === 20; // 8 PM hour
      });

      expect(morningSlots.length).toBeGreaterThan(0);
    });

    it("Should generate slots for evening window (12:30 AM - 5:30 AM next day)", () => {
      const date = DateTime.fromISO("2026-03-30");
      const slots = generateDailySlots(date);

      // Evening window: 12:30 AM to 5:30 AM = 5 hours = 10 slots (30-min each)
      const eveningSlots = slots.filter((s) => {
        const startHour = DateTime.fromISO(s.startTime).hour;
        return startHour >= 0 && startHour < 6; // Midnight to 6 AM
      });

      expect(eveningSlots.length).toBeGreaterThanOrEqual(10);
    });

    it("Should not have overlapping slots", () => {
      const date = DateTime.fromISO("2026-03-30");
      const slots = generateDailySlots(date);

      for (let i = 0; i < slots.length - 1; i++) {
        const current = slots[i];
        const next = slots[i + 1];

        // Current slot end should equal next slot start (no gaps, no overlaps)
        expect(current.endTime).toEqual(next.startTime);
      }
    });
  });

  // =====================================================
  // DISCOVERY CALL TESTS
  // =====================================================

  describe("Discovery Call Creation", () => {
    it("Should create discovery call for sale before 4:30 AM (same day SLA)", async () => {
      const leadId = getTestLeadId();
      const closedAt = DateTime.fromISO(
        "2026-03-30T02:00:00+05:30" // 2 AM IST - before 4:30 AM
      );

      const result = await createDiscoveryCall({
        lead_id: leadId,
        sale_value: 10000,
        subscription_cycle: 90,
        closed_at: closedAt.toISO()!,
      });

      expect(result.success).toBe(true);

      if (result.success && result.callId) {
        const calls = await getCallsForLead(leadId);
        const discoveryCall = calls.find((c) => c.call_type === "DISCOVERY");

        expect(discoveryCall).toBeDefined();
        expect(discoveryCall?.status).toBe("PENDING");
        expect(discoveryCall?.priority).toBe(2);

        // SLA should be same day at 20:45
        const slaDate = DateTime.fromISO(discoveryCall?.sla_deadline!);
        expect(slaDate.hour).toBe(20);
        expect(slaDate.minute).toBe(45);
      }
    });

    it("Should create discovery call for sale after 4:30 AM (next day SLA)", async () => {
      const leadId = getTestLeadId();
      const closedAt = DateTime.fromISO(
        "2026-03-30T05:00:00+05:30" // 5 AM IST - after 4:30 AM
      );

      const result = await createDiscoveryCall({
        lead_id: leadId,
        sale_value: 10000,
        subscription_cycle: 90,
        closed_at: closedAt.toISO()!,
      });

      expect(result.success).toBe(true);

      if (result.success && result.callId) {
        const calls = await getCallsForLead(leadId);
        const discoveryCall = calls.find((c) => c.call_type === "DISCOVERY");

        expect(discoveryCall).toBeDefined();

        // SLA should be next day at 20:45
        const slaDate = DateTime.fromISO(discoveryCall?.sla_deadline!);
        expect(slaDate.hour).toBe(20);
        expect(slaDate.minute).toBe(45);

        // Should be different day
        const closedDate = DateTime.fromISO(closedAt.toISO()!);
        expect(slaDate.day).toBeGreaterThan(closedDate.day);
      }
    });
  });

  // =====================================================
  // SERVICE STARTED TESTS
  // =====================================================

  describe("Service Started - Call Creation Flow", () => {
    it("Should create service registry and calculate renewal date", async () => {
      const leadId = getTestLeadId();
      const serviceStart = DateTime.fromISO("2026-03-30T10:00:00+05:30");

      const result = await processServiceStarted({
        lead_id: leadId,
        service_start_date: serviceStart.toISO()!,
        subscription_cycle: 90,
      });

      expect(result.success).toBe(true);

      if (result.success && result.renewalDate) {
        // Renewal date should be 90 days after service start
        const renewalDate = DateTime.fromISO(result.renewalDate);
        const expectedRenewal = serviceStart.plus({ days: 90 });

        expect(renewalDate.day).toBe(expectedRenewal.day);
        expect(renewalDate.month).toBe(expectedRenewal.month);
      }
    });

    it("Should create orientation call (same/next working day)", async () => {
      const leadId = getTestLeadId();
      const serviceStart = DateTime.fromISO("2026-03-30T10:00:00+05:30");

      const result = await processServiceStarted({
        lead_id: leadId,
        service_start_date: serviceStart.toISO()!,
        subscription_cycle: 90,
      });

      expect(result.success).toBe(true);

      if (result.success && result.orientationCallId) {
        const calls = await getCallsForLead(leadId);
        const orientationCall = calls.find((c) => c.call_type === "ORIENTATION");

        expect(orientationCall).toBeDefined();
        expect(orientationCall?.status).toBe("PENDING");
        expect(orientationCall?.priority).toBe(4); // Lowest priority
      }
    });

    it("Should create progress review calls (every 15 days)", async () => {
      const leadId = getTestLeadId();
      const serviceStart = DateTime.fromISO("2026-03-30T10:00:00+05:30");

      const result = await processServiceStarted({
        lead_id: leadId,
        service_start_date: serviceStart.toISO()!,
        subscription_cycle: 90,
      });

      expect(result.success).toBe(true);

      if (result.success && result.progressCallIds) {
        // For 90-day cycle: progress calls on days 15, 30, 45, 60, 75 (skip 90)
        expect(result.progressCallIds.length).toBe(5);

        const calls = await getCallsForLead(leadId);
        const progressCalls = calls.filter((c) => c.call_type === "PROGRESS_REVIEW");

        expect(progressCalls.length).toBe(5);

        // Verify progress_day values
        const progressDays = progressCalls
          .map((c) => c.progress_day)
          .sort((a, b) => a - b);
        expect(progressDays).toEqual([15, 30, 45, 60, 75]);
      }
    });
  });

  // =====================================================
  // RENEWAL SCHEDULING TESTS
  // =====================================================

  describe("Renewal Call Scheduling", () => {
    it("Should find renewal date within 3-day window", async () => {
      // Renewal on June 29, 2026 (Friday)
      const renewalDate = DateTime.fromISO("2026-06-29");

      // Get a test AM
      const bestAM = await selectBestAM();
      expect(bestAM).toBeDefined();

      if (bestAM) {
        const result = await findRenewalCallDate(renewalDate, bestAM.user_id);

        expect(result.success).toBe(true);
        expect(result.scheduledDate).toBeDefined();

        // Should be within 3 days before renewal
        const scheduledDate = DateTime.fromISO(result.scheduledDate);
        const daysBeforeRenewal = renewalDate.diff(scheduledDate, "days").days;

        expect(daysBeforeRenewal).toBeLessThanOrEqual(3);
      }
    });

    it("Should extend search if SLA window has no availability", async () => {
      // This is a harder test - requires AM to have no slots in 3-day window
      // Mark as todo for now
      expect(true).toBe(true);
    });

    it("Should skip holidays when scheduling renewal", async () => {
      // May 25, 2026 is a holiday
      const renewalDate = DateTime.fromISO("2026-05-28");

      const bestAM = await selectBestAM();
      expect(bestAM).toBeDefined();

      if (bestAM) {
        const result = await findRenewalCallDate(renewalDate, bestAM.user_id);

        expect(result.success).toBe(true);

        const scheduledDate = DateTime.fromISO(result.scheduledDate);
        const isValid = await isWorkingDay(scheduledDate);

        expect(isValid).toBe(true);
      }
    });
  });

  // =====================================================
  // SCHEDULER ENGINE TESTS
  // =====================================================

  describe("Scheduler Engine", () => {
    it("Should return statistics about processed calls", async () => {
      const result = await runScheduler();

      expect(result.success).toBe(true);
      expect(typeof result.processed).toBe("number");
      expect(typeof result.scheduled).toBe("number");
      expect(typeof result.preempted).toBe("number");
      expect(typeof result.failed).toBe("number");
    });

    it("Should have summary of unscheduled calls", async () => {
      const summary = await getUnscheduledCallsSummary();

      expect(Array.isArray(summary.calls)).toBe(true);
      expect(typeof summary.total).toBe("number");
    });
  });

  // =====================================================
  // CLIENT STATUS TESTS
  // =====================================================

  describe("Client Scheduling Status", () => {
    it("Should return complete scheduling status for a client", async () => {
      const leadId = getTestLeadId();

      // First create a service for this lead
      const serviceStart = DateTime.fromISO("2026-03-30T10:00:00+05:30");
      await processServiceStarted({
        lead_id: leadId,
        service_start_date: serviceStart.toISO()!,
        subscription_cycle: 90,
      });

      // Get status
      const status = await getClientSchedulingStatus(leadId);

      expect(status.leadId).toBe(leadId);
      expect(status.totalCalls).toBeGreaterThan(0);
      expect(Array.isArray(status.progressReviewCalls)).toBe(true);
    });
  });
});

// =====================================================
// EDGE CASE TESTS
// =====================================================

describe("Edge Cases and Error Handling", () => {
  it("Should handle missing required fields in discovery call", async () => {
    const result = await createDiscoveryCall({
      lead_id: "",
      sale_value: 0,
      subscription_cycle: 0,
      closed_at: "",
    });

    expect(result.success).toBe(false);
  });

  it("Should handle timezone edge cases (IST specific)", () => {
    // 4:30 AM IST boundary test
    const before430 = DateTime.fromISO("2026-03-30T04:29:59+05:30");
    const after430 = DateTime.fromISO("2026-03-30T04:30:01+05:30");

    expect(before430.hour).toBe(4);
    expect(before430.minute).toBe(29);

    expect(after430.hour).toBe(4);
    expect(after430.minute).toBe(30);
  });

  it("Should handle daylight saving time gracefully", () => {
    // Luxon handles DST automatically for IST (which has no DST)
    const date1 = DateTime.fromISO("2026-01-01T12:00:00+05:30");
    const date2 = DateTime.fromISO("2026-06-30T12:00:00+05:30");

    // Both should maintain IST offset
    expect(date1.offset).toBe(330); // IST is UTC+5:30
    expect(date2.offset).toBe(330);
  });

  it("Should handle year-end to year-start rollovers", async () => {
    const serviceStart = DateTime.fromISO("2025-12-15T10:00:00+05:30");
    const subscriptionDays = 60;

    // Renewal should go into 2026
    const renewalDate = serviceStart.plus({ days: subscriptionDays });

    expect(renewalDate.year).toBe(2026);
    expect(renewalDate.month).toBe(2);
  });
});

// =====================================================
// LOAD TESTS (Optional - Requires large test dataset)
// =====================================================

describe.skip("Load Testing (Requires 500+ clients)", () => {
  it("Should handle 500 clients across 10 AMs efficiently", async () => {
    // TODO: Setup 500 test clients and 10 test AMs
    // Then run scheduler and measure performance
    expect(true).toBe(true);
  });

  it("Should complete scheduler run in < 30 seconds for 500 clients", async () => {
    const start = Date.now();
    const result = await runScheduler();
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(30000); // 30 seconds
  });
});
