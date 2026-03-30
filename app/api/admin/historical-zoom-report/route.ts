import { NextRequest, NextResponse } from "next/server";
import { sendTeamsNotification } from "@/lib/microsoft/teamsService";

// ZOOM API Helpers
async function getZoomAccessToken(): Promise<string> {
    const accountId = (process.env.ZOOM_ACCOUNT_ID || "").trim();
    const clientId = (process.env.ZOOM_CLIENT_ID || "").trim();
    const clientSecret = (process.env.ZOOM_CLIENT_SECRET || "").trim();

    if (!accountId || !clientId || !clientSecret) {
        throw new Error("Missing Zoom credentials in .env");
    }

    const credentials = Buffer.from(clientId + ":" + clientSecret).toString("base64");
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;

    const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { Authorization: "Basic " + credentials },
        cache: "no-store",
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
        let url = `https://api.zoom.us/v2/phone/call_history?from=${from}&to=${to}&page_size=300&type=all`;
        if (nextPageToken) {
            url += `&next_page_token=${nextPageToken}`;
        }

        const res = await fetch(url, {
            headers: { Authorization: "Bearer " + token },
            cache: "no-store",
        });

        if (!res.ok) {
            console.error("[Zoom Historical] Fetch failed:", res.status);
            break;
        }

        const data = await res.json();
        const items = data.call_logs || [];
        all = all.concat(items);
        nextPageToken = data.next_page_token || "";
    } while (nextPageToken);

    return all;
}

function formatDurationHHMMSS(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}m ${s}s`;
}

/**
 * HISTORICAL ZOOM REPORT (Manual Testing)
 * Start: 2026-03-09 08:00 PM IST
 * End: 2026-03-10 08:00 AM IST
 */
export async function POST(req: NextRequest) {
    try {
        // Range requested: 09-03-2026 8:00PM to 10-03-2026 8:00AM IST
        const fromIso = "2026-03-09T14:30:00Z";
        const toIso = "2026-03-10T02:30:00Z";

        console.log(`[Zoom Historical] Fetching calls from ${fromIso} to ${toIso}`);

        const token = await getZoomAccessToken();
        const calls = await fetchZoomCalls(fromIso, toIso, token);

        // 4. Calculate Stats & Grouping
        const memberStats: Record<string, {
            name: string;
            extension: string;
            total: number;
            outbound: number;
            inbound: number;
            connected: number;
            notConnected: number;
            duration: number;
            calls: any[];
        }> = {};

        calls.forEach(log => {
            const isOutbound = log.direction === "outbound";
            const memberName = isOutbound ? (log.caller_name || "Unknown") : (log.callee_name || "Unknown");
            const ext = isOutbound ? (log.caller_ext_number || "-") : (log.callee_ext_number || "-");
            const memberKey = isOutbound ? (log.caller_ext_id || log.caller_email || memberName) : (log.callee_ext_id || log.callee_email || memberName);

            if (!memberStats[memberKey]) {
                memberStats[memberKey] = {
                    name: memberName,
                    extension: ext,
                    total: 0,
                    outbound: 0,
                    inbound: 0,
                    connected: 0,
                    notConnected: 0,
                    duration: 0,
                    calls: []
                };
            }

            const stats = memberStats[memberKey];
            stats.total++;
            if (isOutbound) stats.outbound++; else stats.inbound++;

            const isAnswered = (log.call_result || "").toLowerCase() === "answered" || (log.call_result || "").toLowerCase() === "connected";
            if (isAnswered) stats.connected++; else stats.notConnected++;

            stats.duration += (Number(log.duration) || 0);
            stats.calls.push(log);
        });

        const totals = {
            total: calls.length,
            outbound: calls.filter(c => c.direction === "outbound").length,
            inbound: calls.filter(c => c.direction === "inbound").length,
            connected: Object.values(memberStats).reduce((sum, m) => sum + m.connected, 0),
            notConnected: Object.values(memberStats).reduce((sum, m) => sum + m.notConnected, 0),
            duration: calls.reduce((sum, c) => sum + (Number(c.duration) || 0), 0)
        };

        // 5. Teams Notification Summary
        const timeRangeLabel = `March 9th, 08:00 PM - March 10th, 08:00 AM IST`;

        // 8. SEND TO TEAMS IF CONFIGURED via Webhook
        try {
            const connectionRate = totals.total > 0 ? ((totals.connected / totals.total) * 100).toFixed(1) : "0";

            // Build a Markdown table for Teams
            let tableRows = "";
            Object.values(memberStats).sort((a: any, b: any) => b.total - a.total).forEach((m: any) => {
                tableRows += `| ${m.name.padEnd(20)} | ${m.total.toString().padStart(5)} | ${m.connected.toString().padStart(5)} | ${m.notConnected.toString().padStart(5)} | ${formatDurationHHMMSS(m.duration)} |\n`;
            });

            const detailedMessage = `📡 **Zoom Hourly Activity**\n` +
                `📅 **Period:** ${timeRangeLabel}\n\n` +
                `| Team Member          | Total | Conn  | Miss  | Duration |\n` +
                `|:---------------------|:-----:|:-----:|:-----:|:---------|\n` +
                `${tableRows}` +
                `| **GRAND TOTAL**     | **${totals.total}** | **${totals.connected}** | **${totals.notConnected}** | **${formatDurationHHMMSS(totals.duration)}** |\n\n` +
                `✅ **Connection Rate:** ${connectionRate}%\n` +
                `🔗 [View Full Records](https://applywizz-crm-tool.vercel.app/sales)`;

            await sendTeamsNotification(detailedMessage);
        } catch (teamsErr) {
            console.error("[Zoom Historical] Teams Notification Failed:", teamsErr);
        }

        return NextResponse.json({
            success: true,
            totalCalls: calls.length,
            message: "Historical full-night report sent successfully."
        });

    } catch (err: any) {
        console.error("[Zoom Historical] Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
