import { NextRequest, NextResponse } from "next/server";
import { runScheduler } from "@/lib/scheduling/scheduler";

/**
 * GET /api/scheduling/scheduler-cron
 *
 * Scheduler CRON Job - Runs every 5 minutes
 *
 * Purpose: Pick up PENDING calls and assign them to AMs
 * Logic:
 * 1. Get all PENDING calls (sorted by priority + deadline)
 * 2. For each call:
 *    - Select best AM (least clients, nearest renewal tie-breaker)
 *    - Find earliest available slot before SLA deadline
 *    - Assign call or try preemption
 * 3. Return scheduling statistics
 *
 * Trigger: Vercel Cron (runs every 5 minutes)
 * or manual trigger for testing: GET /api/scheduling/scheduler-cron
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("🚨 Unauthorized scheduler CRON attempt");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log(`\n${"=".repeat(80)}`);
    console.log(
      `⏱️  SCHEDULER CRON TRIGGERED - ${new Date().toISOString()}`
    );
    console.log(`${"=".repeat(80)}\n`);

    // Run the main scheduler
    const result = await runScheduler();

    console.log(`\n${"=".repeat(80)}`);
    console.log(`✅ CRON COMPLETED - Response:`);
    console.log(JSON.stringify(result, null, 2));
    console.log(`${"=".repeat(80)}\n`);

    return NextResponse.json(
      {
        success: result.success,
        processed: result.processed,
        scheduled: result.scheduled,
        preempted: result.preempted,
        failed: result.failed,
        error: result.error,
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
