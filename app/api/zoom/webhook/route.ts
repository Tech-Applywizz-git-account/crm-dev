import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/zoom/webhook
 * Handles Zoom Phone events (answered, ended, recording).
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const data = JSON.parse(rawBody);
    
    // 1. Zoom URL Validation (Required by Zoom)
    if (data.event === 'endpoint.url_validation') {
      const plainToken = data.payload.plainToken;
      const secretToken = process.env.ZOOM_WEBHOOK_SECRET;
      
      if (!secretToken) {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
      }

      const hash = crypto
        .createHmac('sha256', secretToken)
        .update(plainToken)
        .digest('hex');

      return NextResponse.json({
        plainToken: plainToken,
        verificationToken: hash
      }, { status: 200 });
    }

    // 2. Signature Verification
    const signature = req.headers.get('x-zm-signature');
    const timestamp = req.headers.get('x-zm-request-timestamp');
    const secretToken = process.env.ZOOM_WEBHOOK_SECRET;

    if (!signature || !timestamp || !secretToken) {
      return NextResponse.json({ error: 'Missing security headers' }, { status: 401 });
    }

    // Verify signature to ensure the event actually came from Zoom
    const message = `v0:${timestamp}:${rawBody}`;
    const hash = crypto.createHmac('sha256', secretToken).update(message).digest('hex');
    const expectedSignature = `v0=${hash}`;

    if (signature !== expectedSignature) {
      console.error('Invalid Webhook Signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = data.event;
    const payload = data.payload.object;
    const callId = payload.call_id || payload.id;

    console.log(`Received Zoom Event: ${event} for CallID: ${callId}`);

    // Log the event for audit trail
    await supabaseAdmin.from('zoom_call_events').insert({
      call_id: callId,
      event_type: event,
      payload: data
    });

    // 3. Status Updates
    switch (event) {
      case 'phone.callee_answered':
        await supabaseAdmin
          .from('zoom_calls')
          .update({ status: 'answered', updated_at: new Date().toISOString() })
          .eq('call_id', callId);
        break;

      case 'phone.call_ended':
        await supabaseAdmin
          .from('zoom_calls')
          .update({ 
            status: 'ended', 
            duration: payload.duration || 0,
            updated_at: new Date().toISOString() 
          })
          .eq('call_id', callId);
        break;

      case 'phone.recording_completed':
        // Zoom provides recording links in a separate event
        await supabaseAdmin
          .from('zoom_calls')
          .update({ 
            recording_url: payload.recording_files?.[0]?.download_url,
            recording_id: payload.id, // This is sometimes different from callId
            updated_at: new Date().toISOString() 
          })
          .eq('call_id', callId);
        break;

      default:
        console.log('Unhandled Event:', event);
    }

    return NextResponse.json({ message: 'Success' }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
