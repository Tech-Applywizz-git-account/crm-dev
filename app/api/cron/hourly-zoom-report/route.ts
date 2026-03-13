import { NextRequest, NextResponse } from "next/server";
import { sendTeamsNotification } from "@/lib/microsoft/teamsService";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ---------------------------------------------------------
   ZOOM API HELPERS
---------------------------------------------------------- */

async function getZoomAccessToken(): Promise<string> {
    const accountId = (process.env.ZOOM_ACCOUNT_ID || "").trim();
    const clientId = (process.env.ZOOM_CLIENT_ID || "").trim();
    const clientSecret = (process.env.ZOOM_CLIENT_SECRET || "").trim();

    if (!accountId || !clientId || !clientSecret) {
        throw new Error("Missing Zoom credentials in .env");
    }

    const credentials = Buffer.from(clientId + ":" + clientSecret).toString("base64");

    const tokenUrl =
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;

    const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { Authorization: "Basic " + credentials },
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(`Zoom OAuth failed (${res.status})`);
    }

    const data = await res.json();
    return data.access_token;
}

async function fetchZoomCalls(from: string, to: string, token: string): Promise<any[]> {

    let all: any[] = [];
    let nextPageToken = "";

    do {

        let url =
            `https://api.zoom.us/v2/phone/call_history?from=${from}&to=${to}&page_size=300&type=all`;

        if (nextPageToken) {
            url += `&next_page_token=${nextPageToken}`;
        }

        const res = await fetch(url, {
            headers: { Authorization: "Bearer " + token },
            cache: "no-store"
        });

        if (!res.ok) {
            console.error("[Zoom Hourly Cron] Fetch failed:", res.status);
            break;
        }

        const data = await res.json();

        const items = data.call_logs || [];

        all = all.concat(items);

        nextPageToken = data.next_page_token || "";

    } while (nextPageToken);

    return all;
}

/* ---------------------------------------------------------
   HELPERS
---------------------------------------------------------- */

function formatDurationHHMMSS(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDelta(deltaSeconds: number): string {
    const minutes = Math.floor(Math.abs(deltaSeconds) / 60);
    const prefix = deltaSeconds > 0 ? "+ " : deltaSeconds < 0 ? "- " : "";
    return `${prefix}${minutes}m`;
}

/* ---------------------------------------------------------
   HOURLY CRON ROUTE
---------------------------------------------------------- */

export async function GET(req: NextRequest) {

    try {

        const { searchParams } = new URL(req.url);
        const force = searchParams.get("force") === "true";

        /* -----------------------------------------------
           CURRENT TIME
        ----------------------------------------------- */

        const nowUtc = new Date();

        const nowIst = new Date(
            nowUtc.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );

        const currentHour = nowIst.getHours();
        const currentMinute = nowIst.getMinutes();

        console.log(`[Zoom Hourly Cron] IST Hour: ${currentHour}:${currentMinute} Force:${force}`);

        /* -----------------------------------------------
           REPORT WINDOW
           8 PM → 6 AM
        ----------------------------------------------- */

        const isReportHour = currentHour >= 20 || currentHour < 6;

        if (!isReportHour && !force) {

            return NextResponse.json({
                success: true,
                message: "Outside reporting window (8 PM - 6 AM IST). Skip sending notification.",
                currentIstHour: currentHour,
                currentIstMinute: currentMinute
            });

        }

        /* -----------------------------------------------
           HOUR WINDOWS
        ----------------------------------------------- */
        const endRange = new Date(nowUtc);
        endRange.setSeconds(0, 0);

        const startRange = new Date(endRange.getTime() - 60 * 60 * 1000);
        const prevEndRange = startRange;
        const prevStartRange = new Date(prevEndRange.getTime() - 60 * 60 * 1000);

        const fromIso = startRange.toISOString().replace(/\.\d{3}Z$/, "Z");
        const toIso = endRange.toISOString().replace(/\.\d{3}Z$/, "Z");

        const prevFromIso = prevStartRange.toISOString().replace(/\.\d{3}Z$/, "Z");
        const prevToIso = prevEndRange.toISOString().replace(/\.\d{3}Z$/, "Z");

        console.log(`[Zoom Hourly Cron] IST: ${nowIst.toLocaleTimeString()} | Current: ${fromIso} to ${toIso} | Prev: ${prevFromIso} to ${prevToIso}`);

        /* -----------------------------------------------
           FETCH CALLS, PREV CALLS, SHIFT CALLS & AGENTS
        ----------------------------------------------- */
        const token = await getZoomAccessToken();

        // Calculate Shift Start (8:00 PM IST of the current "day's" shift)
        const shiftStartIst = new Date(nowIst);
        if (currentHour < 20) {
            shiftStartIst.setDate(shiftStartIst.getDate() - 1);
        }
        shiftStartIst.setHours(20, 0, 0, 0);
        
        // Convert shiftStartIst (Local) back to a UTC ISO string for API
        // We'll use a trick by formatting it and parsing as 'Asia/Kolkata' or just subtract offset manually
        const shiftStartUtc = new Date(shiftStartIst.getTime() - (5.5 * 60 * 60 * 1000));
        const shiftFromIso = shiftStartUtc.toISOString().replace(/\.\d{3}Z$/, "Z");

        const [calls, prevCalls, shiftCallsData, { data: agents }] = await Promise.all([
            fetchZoomCalls(fromIso, toIso, token),
            fetchZoomCalls(prevFromIso, prevToIso, token),
            fetchZoomCalls(shiftFromIso, toIso, token),
            supabaseAdmin.rpc('get_sales_team_names')
        ]);

        /* -----------------------------------------------
           MEMBER STATS
        ----------------------------------------------- */
        const memberStats: Record<string, any> = {};

        // 0. Initialize all agents from database
        if (Array.isArray(agents)) {
            agents.forEach((agent: any) => {
                const name = agent.full_name || "Unknown";
                memberStats[name] = {
                    name: name,
                    extension: "-",
                    total: 0,
                    outbound: 0,
                    inbound: 0,
                    connected: 0,
                    notConnected: 0,
                    duration: 0,
                    prevDuration: 0,
                    shiftDuration: 0
                };
            });
        }

        // 1. Process shift calls for cumulative total
        shiftCallsData.forEach(log => {
            const isOutbound = log.direction === "outbound";
            const memberName = isOutbound ? (log.caller_name || "Unknown") : (log.callee_name || "Unknown");
            const memberKey = memberName;
            if (memberStats[memberKey]) {
                memberStats[memberKey].shiftDuration += (Number(log.duration) || 0);
            }
        });

        // 2. Process previous hour for delta comparison
        prevCalls.forEach(log => {
            const isOutbound = log.direction === "outbound";
            const memberName = isOutbound ? (log.caller_name || "Unknown") : (log.callee_name || "Unknown");
            
            // Use name as primary key to match initialized agents
            const memberKey = memberName;

            if (!memberStats[memberKey]) {
                memberStats[memberKey] = {
                    name: memberName,
                    extension: isOutbound ? (log.caller_ext_number || "-") : (log.callee_ext_number || "-"),
                    total: 0,
                    outbound: 0,
                    inbound: 0,
                    connected: 0,
                    notConnected: 0,
                    duration: 0,
                    prevDuration: 0,
                    shiftDuration: 0
                };
            }
            memberStats[memberKey].prevDuration += (Number(log.duration) || 0);
        });

        // 3. Process current hour
        calls.forEach(log => {
            const isOutbound = log.direction === "outbound";
            const memberName = isOutbound ? (log.caller_name || "Unknown") : (log.callee_name || "Unknown");
            
            // Use name as primary key to match initialized agents
            const memberKey = memberName;

            if (!memberStats[memberKey]) {
                memberStats[memberKey] = {
                    name: memberName,
                    extension: isOutbound ? (log.caller_ext_number || "-") : (log.callee_ext_number || "-"),
                    total: 0,
                    outbound: 0,
                    inbound: 0,
                    connected: 0,
                    notConnected: 0,
                    duration: 0,
                    prevDuration: 0,
                    shiftDuration: 0
                };
            }

            const stats = memberStats[memberKey];
            stats.total++;
            if (isOutbound) stats.outbound++; else stats.inbound++;

            const result = (log.call_result || "").toLowerCase();
            const isAnswered = result === "answered" || result === "connected";
            if (isAnswered) stats.connected++;
            else stats.notConnected++;

            stats.duration += Number(log.duration) || 0;
            if (stats.extension === "-") {
                stats.extension = isOutbound ? (log.caller_ext_number || "-") : (log.callee_ext_number || "-");
            }
        });

        /* -----------------------------------------------
           TOTALS
        ----------------------------------------------- */

        const totals = {

            total: calls.length,

            outbound: calls.filter(c => c.direction === "outbound").length,

            inbound: calls.filter(c => c.direction === "inbound").length,

            connected: Object.values(memberStats)
                .reduce((sum: number, m: any) => sum + m.connected, 0),

            notConnected: Object.values(memberStats)
                .reduce((sum: number, m: any) => sum + m.notConnected, 0),

            duration: calls.reduce((sum, c) =>
                sum + (Number(c.duration) || 0), 0),
            
            shiftDuration: Object.values(memberStats)
                .reduce((sum: number, m: any) => sum + m.shiftDuration, 0)
        };

        /* -----------------------------------------------
           TEAMS MESSAGE
        ----------------------------------------------- */

        const currentConnRate =
            totals.total > 0
                ? ((totals.connected / totals.total) * 100).toFixed(1)
                : "0";

        let rowsText = "";
        Object.values(memberStats)
            .sort((a: any, b: any) => b.total - a.total)
            .forEach((m: any) => {
                const deltaSeconds = m.duration - m.prevDuration;
                rowsText +=
                    `| ${m.name.padEnd(20)} | ${m.total.toString().padStart(5)} | ${m.connected.toString().padStart(5)} | ${m.notConnected.toString().padStart(5)} | ${formatDurationHHMMSS(m.duration)} | ${formatDelta(deltaSeconds).padEnd(12)} | ${formatDurationHHMMSS(m.shiftDuration)} |\n`;
            });

        const finalDetailedReport =
            `📡 **Zoom Hourly Activity**\n` +
            `📅 **Date:** ${nowIst.toLocaleDateString("en-GB")} | 🕒 **Time:** ${nowIst.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} IST\n\n` +
            `| Team Member | Total | Conn | Miss | Hourly Dur | Δ vs Last Hr | Total Dur |\n` +
            `|:----------------|:----:|:----:|:----:|:-----------|:------------|:----------|\n` +
            `${rowsText}` +
            `| **GRAND TOTAL** | **${totals.total}** | **${totals.connected}** | **${totals.notConnected}** | **${formatDurationHHMMSS(totals.duration)}** | | **${formatDurationHHMMSS(totals.shiftDuration)}** |\n\n` +
            `✅ **Connection Rate:** ${currentConnRate}%\n` +
            `🔗 https://applywizz-crm-tool.vercel.app/sales`;

        await sendTeamsNotification(finalDetailedReport);

        /* -----------------------------------------------
           RESPONSE
        ----------------------------------------------- */

        return NextResponse.json({
            success: true,
            hourSent: currentHour,
            callsProcessed: calls.length,
            teamsNotified: true
        });

    }

    catch (err: any) {

        console.error("[Zoom Hourly Cron] Global Error:", err);

        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );

    }

}