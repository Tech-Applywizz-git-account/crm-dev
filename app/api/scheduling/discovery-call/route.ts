import { NextRequest, NextResponse } from "next/server";
import { createDiscoveryCall } from "@/lib/scheduling/call-creation";
import { DiscoveryCallRequest } from "@/lib/types/scheduling";

/**
 * POST /api/scheduling/discovery-call
 *
 * Trigger: Sales closure event
 * Purpose: Create a Discovery call with appropriate SLA deadline
 *
 * Request body:
 * {
 *   lead_id: string,
 *   sale_value: number,
 *   subscription_cycle: number (days),
 *   closed_at: ISO string (when sale was closed)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   callId?: string,
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`\n📥 Discovery Call API Request`);

    // Parse request body
    let body: DiscoveryCallRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.lead_id || !body.closed_at || !body.subscription_cycle) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: lead_id, closed_at, subscription_cycle",
        },
        { status: 400 }
      );
    }

    console.log(`   Lead ID: ${body.lead_id}`);
    console.log(`   Sale Value: ${body.sale_value || "N/A"}`);
    console.log(`   Cycle: ${body.subscription_cycle} days`);
    console.log(`   Closed At: ${body.closed_at}`);

    // Create Discovery call
    const result = await createDiscoveryCall(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log(`✅ API Response: Success, Call ID ${result.callId}`);

    return NextResponse.json({
      success: true,
      callId: result.callId,
      message: "Discovery call created successfully",
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
