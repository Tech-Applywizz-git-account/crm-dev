import { NextRequest, NextResponse } from "next/server";
import { processServiceStarted } from "@/lib/scheduling/call-creation";
import { ServiceStartedRequest } from "@/lib/types/scheduling";

/**
 * POST /api/scheduling/service-started
 *
 * Trigger: Service/account setup completion
 * Purpose: Create service registry and all associated calls
 *          (Orientation, Progress Reviews, Renewal handled by CRON)
 *
 * Request body:
 * {
 *   lead_id: string,
 *   service_start_date: ISO string,
 *   subscription_cycle: number (days)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   renewalDate?: string,
 *   orientationCallId?: string,
 *   progressCallIds?: string[],
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`\n📥 Service Started API Request`);

    // Parse request body
    let body: ServiceStartedRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.lead_id || !body.service_start_date || !body.subscription_cycle) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: lead_id, service_start_date, subscription_cycle",
        },
        { status: 400 }
      );
    }

    console.log(`   Lead ID: ${body.lead_id}`);
    console.log(`   Service Start: ${body.service_start_date}`);
    console.log(`   Cycle: ${body.subscription_cycle} days`);

    // Process service started
    const result = await processServiceStarted(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log(`✅ API Response: Success`);
    console.log(`   Renewal Date: ${result.renewalDate}`);
    console.log(`   Progress Calls: ${result.progressCallIds?.length || 0}`);

    return NextResponse.json({
      success: true,
      renewalDate: result.renewalDate,
      orientationCallId: result.orientationCallId,
      progressCallIds: result.progressCallIds,
      message: "Service started and calls scheduled successfully",
    });
  } catch (error: any) {
    console.error(`❌ API Error: ${error.message}`);
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
