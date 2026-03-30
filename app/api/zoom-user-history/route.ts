import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/client";

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const extension = searchParams.get("extension") || "";
        const email = searchParams.get("email") || "";
        const startDate = searchParams.get("startDate") || "";
        const endDate = searchParams.get("endDate") || "";

        if (!extension && !email) {
            return NextResponse.json({ success: false, error: "Extension or email required" }, { status: 400 });
        }

        console.log(`[Zoom User History DB] Fetching logs for ${extension || email} from ${startDate || 'START'} to ${endDate || 'END'}`);

        // Build the query
        let query = supabase
            .from("zoom_call_logs")
            .select("*")
            .order("start_time", { ascending: false });

        // Filter by user identifier
        if (extension && email) {
            query = query.or(`user_id.eq.${extension},user_id.eq.${email},caller_ext_number.eq.${extension},callee_ext_number.eq.${extension}`);
        } else if (extension) {
            query = query.or(`user_id.eq.${extension},caller_ext_number.eq.${extension},callee_ext_number.eq.${extension}`);
        } else if (email) {
            query = query.eq("user_id", email);
        }

        // Filter by date if provided
        if (startDate) {
            query = query.gte("start_time", `${startDate}T00:00:00Z`);
        }
        if (endDate) {
            query = query.lte("start_time", `${endDate}T23:59:59Z`);
        }

        const { data, error } = await query.limit(1000); // UI limit for safety

        if (error) throw error;

        const logs = data || [];

        // Format for display
        const formattedLogs = logs.map(log => {
            const isOutbound = log.direction === "outbound";
            const otherParty = isOutbound
                ? (log.callee_name || log.callee_number || log.callee_ext_number || "Unknown")
                : (log.caller_name || log.caller_number || log.caller_ext_number || "Unknown");

            return {
                id: log.call_id,
                start_time: log.start_time,
                duration: Number(log.duration) || 0,
                durationFormatted: formatDuration(Number(log.duration) || 0),
                direction: log.direction,
                other_party: otherParty,
                result: log.call_result,
                recording: log.raw_payload?.recording_status === "recorded", // or check zoom_recordings table if joined
                call_id: log.call_id
            };
        });

        return NextResponse.json({
            success: true,
            logs: formattedLogs,
            count: formattedLogs.length,
            requestedRange: { startDate, endDate },
            source: "local_database"
        });

    } catch (err: any) {
        console.error("[Zoom User History DB] Error:", err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

