import { NextRequest, NextResponse } from "next/server";
import { sendTeamsNotification } from "@/lib/microsoft/teamsService";

// ZOOM API Helpers (Inspired by existing zoom-call-stats)
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

function formatDuration(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}m ${s}s`;
}

function formatDurationHHMMSS(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * HOURLY ZOOM REPORT CRON
 * Frequency: Every hour
 * Operating Window: 8:00 PM - 8:00 AM IST
 * Logic: Fetch calls from the previous 60 minutes and email them to stakeholders.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const force = searchParams.get("force") === "true";

        // 1. Determine current IST time
        const nowUtc = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const nowIst = new Date(nowUtc.getTime() + istOffset);

        const currentHour = nowIst.getUTCHours();

        console.log(`[Zoom Hourly Cron] Current IST Hour: ${currentHour}, Force: ${force}`);

        // Check if we are in the reporting window: 9:00 PM (21:00) to 5:30 PM (17:30) IST
        // This covers the full operation period except for the 5:30 PM - 9:00 PM gap.
        const isReportHour = (
            currentHour >= 21 ||
            currentHour < 17 ||
            (currentHour === 17 && nowIst.getUTCMinutes() <= 30)
        );

        if (!isReportHour && !force) {
            return NextResponse.json({
                success: true,
                message: "Outside of reporting window (9 PM - 5:30 PM IST). Skip sending notification.",
                currentIstHour: currentHour,
                currentIstMin: nowIst.getUTCMinutes()
            });
        }

        // 2. Define reporting window (Last 60 minutes)
        const endRange = new Date(nowUtc);
        endRange.setSeconds(0, 0);
        const startRange = new Date(endRange.getTime() - 60 * 60 * 1000);

        const fromIso = startRange.toISOString().replace(/\.\d{3}Z$/, "Z");
        const toIso = endRange.toISOString().replace(/\.\d{3}Z$/, "Z");

        console.log(`[Zoom Hourly Cron] Fetching calls from ${fromIso} to ${toIso}`);

        // 3. Fetch Calls from Zoom
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

        // 5. Teams Notification Integration

        // 6. Final Teams Notification

        // 8. SEND TO TEAMS IF CONFIGURED via Webhook
        try {
            const currentConnRate = totals.total > 0 ? ((totals.connected / totals.total) * 100).toFixed(1) : "0";

            // Build a Markdown-style table for Teams
            let rowsText = "";
            Object.values(memberStats).sort((a, b) => b.total - a.total).forEach(m => {
                rowsText += `| ${m.name.padEnd(20)} | ${m.total.toString().padStart(5)} | ${m.connected.toString().padStart(5)} | ${m.notConnected.toString().padStart(5)} | ${formatDurationHHMMSS(m.duration)} |\n`;
            });

            const finalDetailedReport = `📡 **Zoom Hourly Activity**\n` +
                `📅 **Date:** ${new Date().toLocaleDateString('en-GB')} | 🕒 **Time:** ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST\n\n` +
                `| Team Member          | Total | Conn  | Miss  | Duration |\n` +
                `|:---------------------|:-----:|:-----:|:-----:|:---------|\n` +
                `${rowsText}` +
                `| **GRAND TOTAL**     | **${totals.total}** | **${totals.connected}** | **${totals.notConnected}** | **${formatDurationHHMMSS(totals.duration)}** |\n\n` +
                `✅ **Connection Rate:** ${currentConnRate}%\n` +
                `🔗 [Open Dashboard](https://applywizz-crm-tool.vercel.app/sales)`;

            await sendTeamsNotification(finalDetailedReport);
        } catch (teamsErr: any) {
            console.error("[Zoom Hourly Cron] Teams Notification Failed:", teamsErr.message);
        }

        return NextResponse.json({
            success: true,
            hourSent: currentHour,
            callsProcessed: calls.length,
            teamsNotified: true,
            emailSent: false
        });

    } catch (err: any) {
        console.error("[Zoom Hourly Cron] Global Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
