import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

/**
 * ZOOM WEBHOOK ENDPOINT
 * Handles automated call logging and duration syncing from Zoom.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Zoom Webhook URL Validation
        // Zoom sends this when you first add the URL to verify our ownership.
        if (body.event === "endpoint.url_validation") {
            const plainToken = body.payload.plainToken;
            const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "";

            if (!secretToken) {
                console.error("ZOOM_WEBHOOK_SECRET_TOKEN is missing in .env");
            }

            const hashForValidate = crypto
                .createHmac("sha256", secretToken)
                .update(plainToken)
                .digest("hex");

            return NextResponse.json({
                plainToken: plainToken,
                encryptedToken: hashForValidate,
            }, { status: 200 });
        }

        // 2. Handle Call Log Completed Event
        // Triggered when a call finishes.
        if (body.event === "phone.call_log_completed") {
            const callData = body.payload.object;
            const calleeNumber = callData.callee_did_number || callData.callee_number || "";
            const callerNumber = callData.caller_did_number || callData.caller_number || "";
            const duration = callData.duration || 0; // Duration in seconds
            const callTime = callData.date_time || callData.start_time; // When the call happened

            // We look for the number that isn't ours (the client)
            // Usually the callee for outbound, or caller for inbound.
            const rawPhoneNumber = callData.direction === "outbound" ? calleeNumber : callerNumber;

            if (rawPhoneNumber && duration > 0) {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);

                // 24-hour window around the call date to handle timezone mismatches
                const dateObj = new Date(callTime);
                const prevDate = new Date(dateObj.getTime() - 24 * 60 * 60000).toISOString().split("T")[0];
                const nextDate = new Date(dateObj.getTime() + 24 * 60 * 60000).toISOString().split("T")[0];

                const callDateYMD = new Date(callTime).toISOString().split("T")[0];

                // Match by last 10 digits to handle prefix differences (+1, +91 etc)
                const cleanDigits = rawPhoneNumber.replace(/[^\d]/g, "");
                // More permissive pattern: search for the digits anywhere
                const suffix = cleanDigits.slice(-10);
                const matchPattern = `%${suffix}%`;

                console.log(`[Zoom Webhook] Matching call: ${rawPhoneNumber}, Duration: ${duration}s, Date: ${callDateYMD}`);

                // Update the most recent matching record for today that hasn't been synced yet
                const { data: matchingRecords, error: fetchError } = await supabase
                    .from("call_history")
                    .select("id, notes, recording_url")
                    .filter("phone", "ilike", matchPattern)
                    .gte("followup_date", prevDate)
                    .lte("followup_date", nextDate)
                    .order("created_at", { ascending: false });

                if (fetchError) throw fetchError;

                if (matchingRecords && matchingRecords.length > 0) {
                    const matched = matchingRecords[0];
                    const targetId = matched.id;

                    // APPEND to notes instead of overwriting
                    const durationText = `Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`;
                    const zoomMarker = `[Zoom ID: ${callData.call_id}]`;

                    let newNotes = matched.notes || "";
                    if (!newNotes.includes(zoomMarker)) {
                        newNotes = `${newNotes}\n[Auto-Sync] ${durationText} ${zoomMarker}`.trim();
                    }

                    const { error: updateError } = await supabase
                        .from("call_history")
                        .update({
                            call_duration_seconds: duration,
                            notes: newNotes
                        })
                        .eq("id", targetId);

                    if (updateError) throw updateError;
                    console.log(`[Zoom Webhook] Successfully updated record ${targetId}`);
                } else {
                    console.log(`[Zoom Webhook] No matching record found for ${rawPhoneNumber} around ${callDateYMD}`);
                }
            }
        }

        // 3. Handle Recording Completed (Optional but helpful)
        if (body.event === "phone.recording_completed") {

            // You could logic here to save the recording URL to Supabase if needed
            console.log("[Zoom Webhook] Recording completed for call");

            const recordingData = body.payload.object;
            const calleeNumber = recordingData.callee_did_number || recordingData.callee_number || "";
            const callerNumber = recordingData.caller_did_number || recordingData.caller_number || "";
            const downloadUrl = recordingData.download_url || recordingData.share_url;
            const callTime = recordingData.date_time || recordingData.start_time;

            const rawPhoneNumber = recordingData.direction === "outbound" ? calleeNumber : callerNumber;

            if (rawPhoneNumber && downloadUrl) {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);

                const cleanDigits = rawPhoneNumber.replace(/[^\d]/g, "");
                const suffix = cleanDigits.slice(-10);
                const matchPattern = `%${suffix}%`;

                console.log(`[Zoom Webhook] Matching recording: ${rawPhoneNumber}, Url: ${downloadUrl}`);

                // Find the most recent record for this phone on this date
                // Relaxed filters for recordings
                const { data: matchingRecords, error: fetchError } = await supabase
                    .from("call_history")
                    .select("id, notes")
                    .filter("phone", "ilike", matchPattern)
                    .order("id", { ascending: false })
                    .limit(10);

                if (fetchError) throw fetchError;

                if (matchingRecords && matchingRecords.length > 0) {
                    // Try to find one with the matching Zoom ID in notes first
                    const zoomId = recordingData.call_id;
                    const specificMatch = matchingRecords.find(r => r.notes?.includes(zoomId));
                    const targetId = specificMatch ? specificMatch.id : matchingRecords[0].id;

                    const { error: updateError } = await supabase
                        .from("call_history")
                        .update({
                            recording_url: downloadUrl
                        })
                        .eq("id", targetId);

                    if (updateError) throw updateError;
                    console.log(`[Zoom Webhook] Successfully updated record ${targetId} with recording_url`);
                }
            }

        }

        return NextResponse.json({ message: "Received" }, { status: 200 });

    } catch (error: any) {
        console.error("Zoom Webhook Processing Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
