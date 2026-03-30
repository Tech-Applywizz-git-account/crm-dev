import { NextRequest, NextResponse } from "next/server";
import { runRenewalCheck } from "@/lib/scheduling/renewal";

/**
 * GET /api/scheduling/renewal-check-cron
 *
 * Renewal Check CRON Job - Runs daily at 00:00 (midnight) IST
 *
 * Purpose: Check for clients due for renewal and create renewal calls
 * Logic:
 * 1. Find all ACTIVE services with renewal_date within next 4 days
 * 2. For each without existing PENDING renewal call:
 *    - Create RENEWAL call with priority=1 (highest)
 *    - Set SLA deadline 3 days before renewal_date
 *    - Renewal call stays PENDING until assigned by scheduler
 * 3. Log statistics
 *
 * Trigger: Vercel Cron (daily at midnight)
 * or manual trigger for testing: GET /api/scheduling/renewal-check-cron
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("🚨 Unauthorized renewal check CRON attempt");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log(`\n${"=".repeat(80)}`);
    console.log(
      `⏰ RENEWAL CHECK CRON TRIGGERED - ${new Date().toISOString()}`
    );
    console.log(`${"=".repeat(80)}\n`);

    // Run the renewal check
    await runRenewalCheck();

    console.log(`\n${"=".repeat(80)}`);
    console.log(`✅ CRON COMPLETED`);
    console.log(`${"=".repeat(80)}\n`);

    return NextResponse.json(
      {
        success: true,
        message: "Renewal check completed successfully",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`❌ CRON Error: ${error.message}`);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
