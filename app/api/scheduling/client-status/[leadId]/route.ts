import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientSchedulingStatus } from "@/lib/scheduling/call-creation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/scheduling/client-status/:leadId
 *
 * Get complete scheduling status for a single client
 * 
 * Returns:
 * {
 *   leadId: string,
 *   discoveryCall: CallEvent,
 *   orientationCall: CallEvent,
 *   progressReviewCalls: CallEvent[],
 *   renewalCall: CallEvent,
 *   totalCalls: number,
 *   completedCalls: number
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const { leadId } = params;

    console.log(`📊 Fetching status for client: ${leadId}`);

    // Validate lead exists
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: `Lead ${leadId} not found` },
        { status: 404 }
      );
    }

    // Get scheduling status
    const status = await getClientSchedulingStatus(leadId);

    console.log(`✅ Status retrieved: ${status.totalCalls} calls`);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
