/**
 * Standalone Zoom Sync Script
 * 
 * RUN COMMAND: npx tsx scripts/sync-zoom-data.ts
 * 
 * This script will fetch all historical call logs and recordings 
 * from Zoom and dump them into your Supabase database.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const accountId = process.env.ZOOM_ACCOUNT_ID;
const clientId = process.env.ZOOM_CLIENT_ID;
const clientSecret = process.env.ZOOM_CLIENT_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!accountId || !clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
    console.error("❌ Missing required environment variables in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAccessToken() {
    console.log("🔑 Authenticating with Zoom...");
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}` }
    });
    const data = await res.json();
    return (data as any).access_token;
}

async function sync() {
    try {
        const token = await getAccessToken();
        
        // Fetch last 12 months of data in 1-month chunks
        let currentEnd = new Date();
        const stopDate = new Date();
        stopDate.setMonth(stopDate.getMonth() - 12);

        console.log(`🚀 Starting Full Historical Sync (Last 12 Months)...`);

        while (currentEnd > stopDate) {
            let chunkStart = new Date(currentEnd);
            chunkStart.setMonth(chunkStart.getMonth() - 1);
            chunkStart.setDate(chunkStart.getDate() + 1);
            
            const fromStr = chunkStart.toISOString().split('T')[0];
            const toStr = currentEnd.toISOString().split('T')[0];

            console.log(`📅 Syncing chunk: ${fromStr} to ${toStr}...`);
            
            let nextPageToken = "";
            let chunkCalls = 0;
            let chunkRecordings = 0;

            do {
                const url = `https://api.zoom.us/v2/phone/call_history?from=${fromStr}T00:00:00Z&to=${toStr}T23:59:59Z&page_size=300${nextPageToken ? `&next_page_token=${nextPageToken}` : ""}`;
                const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json() as any;
                const logs = data.call_logs || [];

                for (const log of logs) {
                    const userId = log.direction === "outbound" 
                        ? (log.caller_extension_id || log.caller_email || log.caller_number) 
                        : (log.callee_extension_id || log.callee_email || log.callee_number);

                    // Insert Call Log
                    const { error: logErr } = await supabase.from("zoom_call_logs").upsert({
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
                        raw_payload: log,
                    });

                    if (!logErr) chunkCalls++;

                    // Sync Recording if it exists
                    if (log.recording_status === "recorded") {
                        const recUrl = `https://api.zoom.us/v2/phone/call_history/${log.id}/recordings`;
                        const recRes = await fetch(recUrl, { headers: { Authorization: `Bearer ${token}` } });
                        if (recRes.ok) {
                            const recData = await recRes.json() as any;
                            const recordings = recData.recordings || [];
                            for (const rec of recordings) {
                                await supabase.from("zoom_recordings").upsert({
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
                                    raw_payload: rec,
                                });
                                chunkRecordings++;
                            }
                        }
                    }
                }
                nextPageToken = data.next_page_token || "";
            } while (nextPageToken);

            console.log(`✅ Chunk Complete: ${chunkCalls} calls, ${chunkRecordings} recording links.`);
            
            // Trigger high-performance aggregation for this chunk
            await supabase.rpc('refresh_zoom_analytics_for_dates', { 
                start_date: fromStr, 
                end_date: toStr 
            });

            // Move currentEnd back
            currentEnd.setMonth(currentEnd.getMonth() - 1);
        }

        console.log("🏁 FULL SYNC FINISHED.");

    } catch (err: any) {
        console.error("❌ Sync Error:", err.message);
    }
}

sync();
