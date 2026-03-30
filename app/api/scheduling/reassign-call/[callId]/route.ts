import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { newAMId, reason } = await request.json()
    const callId = params.callId

    if (!newAMId) {
      return NextResponse.json(
        { error: 'Missing newAMId parameter' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin

    // Verify the call exists
    const { data: call, error: callError } = await supabase
      .from('call_events')
      .select('*')
      .eq('id', callId)
      .single()

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    // Verify the new AM exists
    const { data: am, error: amError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', newAMId)
      .eq('roles', 'Accounts')
      .single()

    if (amError || !am) {
      return NextResponse.json(
        { error: 'Account Manager not found or invalid' },
        { status: 404 }
      )
    }

    // Update the call assignment
    const { data: updated, error: updateError } = await supabase
      .from('call_events')
      .update({
        am_id: newAMId,
        status: 'SCHEDULED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to reassign call: ' + updateError.message },
        { status: 500 }
      )
    }

    // Log the reassignment
    if (reason) {
      console.log(`Call ${callId} reassigned to ${newAMId}. Reason: ${reason}`)
    }

    return NextResponse.json({
      success: true,
      message: `Call reassigned to ${am.full_name}`,
      call: updated,
    })
  } catch (error) {
    console.error('Error reassigning call:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
