import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/client";

function formatDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        
        // Filters
        const startDate = searchParams.get("startDate") || searchParams.get("date") || new Date().toISOString().split("T")[0];
        const endDate = searchParams.get("endDate") || searchParams.get("date") || startDate;
        const startTime = searchParams.get("startTime") || "00:00";
        const endTime = searchParams.get("endTime") || "23:59";

        console.log(`[Zoom Stats DB] Fetching stats from ${startDate} ${startTime} to ${endDate} ${endTime}`);

        let members: any[] = [];
        let totalCount = 0;

        // If a specific time window is requested (not 00:00 to 23:59), use the specialized RPC
        const isFullDay = startTime === "00:00" && (endTime === "23:59" || endTime === "00:00");

        if (!isFullDay) {
            const { data, error } = await supabase.rpc("get_zoom_stats_with_time_range", {
                p_start_date: startDate,
                p_end_date: endDate,
                p_start_time: startTime,
                p_end_time: endTime
            });

            if (error) throw error;
            
            members = (data || []).map((m: any) => ({
                name: m.user_name,
                extension: m.extension || m.user_id,
                email: "",
                userId: m.user_id,
                totalCalls: Number(m.total_calls),
                outbound: Number(m.outbound_calls),
                inbound: Number(m.inbound_calls),
                connected: Number(m.connected_calls),
                notConnected: Number(m.missed_calls),
                totalDuration: Number(m.total_duration),
                totalDurationFormatted: formatDuration(Number(m.total_duration)),
                hasRecording: Number(m.has_recording)
            }));
            totalCount = members.length;
        } else {
            // Full day: Use Optimized Daily Aggregation Table
            const { data, error } = await supabase
                .from("zoom_daily_stats")
                .select("*")
                .gte("day", startDate)
                .lte("day", endDate);

            if (error) throw error;
            
            const stats = data || [];
            totalCount = stats.length;
            const memberMap = new Map<string, any>();

            for (const row of stats) {
                let member = memberMap.get(row.user_id);
                if (!member) {
                    member = {
                        name: row.user_name || "Unknown",
                        extension: row.extension || row.user_id,
                        userId: row.user_id,
                        email: "",
                        totalCalls: 0,
                        outbound: 0,
                        inbound: 0,
                        connected: 0,
                        notConnected: 0,
                        totalDuration: 0,
                        hasRecording: 0,
                    };
                    memberMap.set(row.user_id, member);
                }
                member.totalCalls += row.total_calls;
                member.outbound += row.outbound_calls;
                member.inbound += row.inbound_calls;
                member.connected += row.connected_calls;
                member.notConnected += row.missed_calls;
                member.totalDuration += row.total_duration;
                member.hasRecording += (row.total_recordings || 0);
            }

            members = Array.from(memberMap.values())
                .sort((a, b) => b.totalCalls - a.totalCalls)
                .map(m => ({
                    ...m,
                    totalDurationFormatted: formatDuration(m.totalDuration),
                }));
        }

        // Calculate global totals
        const totals = {
            totalCalls: members.reduce((s, m) => s + m.totalCalls, 0),
            outbound: members.reduce((s, m) => s + m.outbound, 0),
            inbound: members.reduce((s, m) => s + m.inbound, 0),
            connected: members.reduce((s, m) => s + m.connected, 0),
            notConnected: members.reduce((s, m) => s + m.notConnected, 0),
            totalDuration: members.reduce((s, m) => s + m.totalDuration, 0),
            totalDurationFormatted: formatDuration(members.reduce((s, m) => s + m.totalDuration, 0)),
            hasRecording: members.reduce((s, m) => s + m.hasRecording, 0),
        };

        return NextResponse.json({
            success: true,
            startDate,
            endDate,
            startTime,
            endTime,
            members,
            totals,
            totalLogs: totalCount,
        });

    } catch (err: any) {
        console.error("[Zoom Stats DB] Error:", err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}


