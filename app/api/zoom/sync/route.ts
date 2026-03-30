import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/client"; // Use server-side admin client in production

async function getZoomAccessToken(): Promise<string> {
    const accountId = (process.env.ZOOM_ACCOUNT_ID || "").trim();
    const clientId = (process.env.ZOOM_CLIENT_ID || "").trim();
    const clientSecret = (process.env.ZOOM_CLIENT_SECRET || "").trim();

    const credentials = Buffer.from(clientId + ":" + clientSecret).toString("base64");
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;

    const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}` },
        cache: "no-store",
    });

    if (!res.ok) throw new Error(`Zoom OAuth failed: ${res.status}`);
    const data = await res.json();
    return data.access_token;
}

/**
 * Fetches and stores Zoom Call metadata + recordings
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    // Ensure only authorized cron jobs or admins can trigger sync
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    try {
        const token = await getZoomAccessToken();
        const { searchParams } = new URL(request.url);
        
        // Default to fetching last 24 hours if no date provided
        const from = searchParams.get("from") || new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const to = searchParams.get("to") || new Date().toISOString().split('T')[0];

        // 1. Fetch Call Logs
        const callLogsUrl = `https://api.zoom.us/v2/phone/call_history?from=${from}T00:00:00Z&to=${to}T23:59:59Z&page_size=300`;
        const logsRes = await fetch(callLogsUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const logsData = await logsRes.json();
        const callLogs = logsData.call_logs || [];

        const syncedCalls = [];
        const syncedRecordings = [];

        for (const log of callLogs) {
            // Determine our user identifier (Extension or Email)
            const userId = log.direction === "outbound" 
                ? (log.caller_extension_id || log.caller_email || log.caller_number) 
                : (log.callee_extension_id || log.callee_email || log.callee_number);

            const logRecord = {
                call_id: log.id,
                user_id: userId,
                caller_name: log.caller_name,
                caller_number: log.caller_number,
                caller_ext_id: log.caller_extension_id,
                caller_ext_number: log.caller_extension_number,
                callee_name: log.callee_name,
                callee_number: log.callee_number,
                callee_ext_id: log.callee_extension_id,
                callee_ext_number: log.callee_extension_number,
                direction: log.direction,
                call_type: log.call_type,
                call_result: log.call_result,
                duration: Number(log.duration) || 0,
                hold_duration: Number(log.hold_duration) || 0,
                queue_name: log.call_queue_name,
                start_time: log.start_time,
                end_time: log.end_time,
                raw_payload: log, // STORE FULL DATA
            };

            const { error: logErr } = await supabase.from("zoom_call_logs").upsert(logRecord);
            if (!logErr) syncedCalls.push(log.id);

            // 2. Fetch Recording if available
            if (log.recording_status === "recorded") {
                const recUrl = `https://api.zoom.us/v2/phone/call_history/${log.id}/recordings`;
                const recRes = await fetch(recUrl, { headers: { Authorization: `Bearer ${token}` } });
                
                if (recRes.ok) {
                    const recData = await recRes.json();
                    const recordingItems = recData.recordings || [];
                    
                    for (const rec of recordingItems) {
                        const recRecord = {
                            recording_id: rec.id,
                            call_id: log.id,
                            recording_type: rec.recording_type,
                            recording_duration: rec.duration,
                            download_url: rec.download_url,
                            play_url: rec.play_url,
                            file_size: rec.file_size,
                            file_format: rec.file_format,
                            recording_start_time: rec.start_time,
                            recording_end_time: rec.end_time,
                            raw_payload: rec, // STORE FULL DATA
                        };
                        const { error: recErr } = await supabase.from("zoom_recordings").upsert(recRecord);
                        if (!recErr) syncedRecordings.push(rec.id);
                    }
                }
            }
        }

        // 3. Update Aggregation (Trigger SQL refresh)
        // We'll call a custom Supabase function for high performance aggregation
        // This is much faster than doing it in Node
        await supabase.rpc('refresh_zoom_analytics_for_dates', { 
            start_date: from, 
            end_date: to 
        });

        return NextResponse.json({
            success: true,
            syncedCalls: syncedCalls.length,
            syncedRecordings: syncedRecordings.length,
            dateRange: { from, to }
        });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
