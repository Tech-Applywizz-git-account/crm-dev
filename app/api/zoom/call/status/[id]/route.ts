import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/zoom/call/status/[id]
 * Checks the status of a specific call.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id; // Internal UUID or Call ID

    const { data: call, error } = await supabaseAdmin
      .from('zoom_calls')
      .select('*')
      .or(`id.eq.${id},call_id.eq.${id}`)
      .single();

    if (error || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json(call);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
