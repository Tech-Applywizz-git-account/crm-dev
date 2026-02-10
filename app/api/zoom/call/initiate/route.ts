import { NextResponse } from 'next/server';
import { getZoomAccessToken, ZOOM_CONFIG } from '@/lib/zoom';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/zoom/call/initiate
 * Initiates a PSTN call via Zoom Phone.
 * 
 * Input:
 * - customerPhone: string (E.164 format preferred)
 * - agentZoomId: string (Zoom User ID or email of the agent)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fromNumber, toNumber, agentZoomId } = body;
    const from = fromNumber || agentZoomId || ZOOM_CONFIG.phoneNumber;

    console.log('Call Initiation Request:', { 
      hasToNumber: !!toNumber, 
      hasFromNumber: !!fromNumber, 
      hasAgentId: !!agentZoomId,
      configPhone: ZOOM_CONFIG.phoneNumber ? 'Set' : 'Missing'
    });

    if (!toNumber) {
      return NextResponse.json({ error: 'Missing destination (toNumber)' }, { status: 400 });
    }

    if (!from) {
      return NextResponse.json({ 
        error: 'Missing source phone number. Please ensure ZOOM_PHONE_NUMBER is set in environment variables.',
        details: 'No fromNumber, agentZoomId, or default ZOOM_PHONE_NUMBER found.'
      }, { status: 400 });
    }

    const token = await getZoomAccessToken();

    // Trigger the outbound call via Zoom API
    // Documentation: https://developers.zoom.us/docs/zoom-phone/api/#tag/phone/post/phone/outbound_calls
    const zoomResponse = await fetch('https://api.zoom.us/v2/phone/outbound_calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from,
        to: toNumber,
      }),
    });

    const zoomData = await zoomResponse.json();

    if (!zoomResponse.ok) {
      console.error('Zoom Phone API Error:', zoomData);
      return NextResponse.json(
        { error: 'Zoom failed to initiate call', details: zoomData.message },
        { status: 500 }
      );
    }

    // 2. Log the call initiation in our database
    const { data: callLog, error: dbError } = await supabaseAdmin
      .from('zoom_calls')
      .insert({
        call_id: zoomData.call_id, // This is returned by Zoom
        agent_id: from,
        customer_phone: toNumber,
        status: 'initiated',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database Error:', dbError);
      // We don't fail the request here because the call is already triggered in Zoom
    }

    return NextResponse.json({
      success: true,
      callId: zoomData.call_id,
      internalId: callLog?.id,
      status: 'initiated'
    });

  } catch (error: any) {
    console.error('Call Initiation Crash:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
