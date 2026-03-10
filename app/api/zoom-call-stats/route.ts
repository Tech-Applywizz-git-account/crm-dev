import { NextRequest, NextResponse } from "next/server";

function cleanDigits(num: string = ""): string {
    return num.replace(/[^\d]/g, "");
}

async function getZoomAccessToken(): Promise<string> {
    const accountId = (process.env.ZOOM_ACCOUNT_ID || "").trim();
    const clientId = (process.env.ZOOM_CLIENT_ID || "").trim();
    const clientSecret = (process.env.ZOOM_CLIENT_SECRET || "").trim();

    if (!accountId || !clientId || !clientSecret) {
        throw new Error("Missing Zoom credentials in .env");
    }

    const credentials = Buffer.from(clientId + ":" + clientSecret).toString("base64");
    const tokenUrl = "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=" + accountId;

    const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { Authorization: "Basic " + credentials },
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error("Zoom OAuth failed (" + res.status + ")");
    }

    const data = await res.json();
    return data.access_token;
}

async function fetchZoomPages(baseUrl: string, key: string, token: string): Promise<any[]> {
    let all: any[] = [];
    let nextPageToken = "";
    let page = 0;

    do {
        let url = baseUrl;
        if (nextPageToken) {
            const sep = url.includes("?") ? "&" : "?";
            url = url + sep + "next_page_token=" + nextPageToken;
        }

        const res = await fetch(url, {
            headers: { Authorization: "Bearer " + token },
            cache: "no-store",
        });

        if (!res.ok) {
            console.error("[Zoom Stats API] fetch failed:", res.status);
            break;
        }

        const data = await res.json();
        const items = data[key] || [];
        all = all.concat(items);
        nextPageToken = data.next_page_token || "";
        page++;
    } while (nextPageToken);

    return all;
}

function formatDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

        console.log("[Zoom Stats] Fetching stats for date:", dateStr);

        const accessToken = await getZoomAccessToken();

        // Convert the requested date (starting 8:00 PM IST) to the next day 8:00 AM IST
        // This targets the specific "Night Shift" window for that date.
        const fromDate = new Date(dateStr + "T20:00:00+05:30").toISOString().replace(/\.\d{3}Z$/, "Z");

        // Calculate the next day for the 8:00 AM cutoff
        const nextDay = new Date(dateStr);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        const toDate = new Date(nextDayStr + "T08:00:00+05:30").toISOString().replace(/\.\d{3}Z$/, "Z");

        // Fetch call logs for the specific date using the exact IST bounds
        const callLogsUrl = "https://api.zoom.us/v2/phone/call_history?from=" + fromDate + "&to=" + toDate + "&page_size=300&type=all";
        const callLogs = await fetchZoomPages(callLogsUrl, "call_logs", accessToken);

        console.log("[Zoom Stats] Total call logs for " + dateStr + ": " + callLogs.length);

        // Build stats per team member (by extension/caller)
        const memberStats = new Map<string, {
            name: string;
            email: string;
            extension: string;
            totalCalls: number;
            outbound: number;
            inbound: number;
            connected: number;
            notConnected: number;
            totalDuration: number;
            hasRecording: number;
        }>();

        for (const log of callLogs) {
            // Use caller for outbound, callee for inbound to get "our team member"
            let memberExtId: string;
            let memberName: string;
            let memberEmail: string;
            let memberExt: string;

            if (log.direction === "outbound") {
                memberExtId = log.caller_ext_id || log.caller_email || "unknown";
                memberName = log.caller_name || "Unknown";
                memberEmail = log.caller_email || "";
                memberExt = log.caller_ext_number || "";
            } else {
                memberExtId = log.callee_ext_id || log.callee_email || "unknown";
                memberName = log.callee_name || "Unknown";
                memberEmail = log.callee_email || "";
                memberExt = log.callee_ext_number || "";
            }

            let stats = memberStats.get(memberExtId);
            if (!stats) {
                stats = {
                    name: memberName,
                    email: memberEmail,
                    extension: memberExt,
                    totalCalls: 0,
                    outbound: 0,
                    inbound: 0,
                    connected: 0,
                    notConnected: 0,
                    totalDuration: 0,
                    hasRecording: 0,
                };
                memberStats.set(memberExtId, stats);
            }

            stats.totalCalls++;
            if (log.direction === "outbound") stats.outbound++;
            else stats.inbound++;

            const dur = Number(log.duration) || 0;
            stats.totalDuration += dur;

            const isAnswered = (log.call_result || "").toLowerCase() === "answered" || (log.call_result || "").toLowerCase() === "connected";
            if (isAnswered) {
                stats.connected++;
            } else {
                stats.notConnected++;
            }

            if (log.recording_status === "recorded") {
                stats.hasRecording++;
            }
        }

        // Convert to array and sort by total calls
        const members = Array.from(memberStats.values())
            .sort((a, b) => b.totalCalls - a.totalCalls)
            .map(m => ({
                ...m,
                totalDurationFormatted: formatDuration(m.totalDuration),
            }));

        // Calculate totals
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
            date: dateStr,
            members,
            totals,
            totalLogs: callLogs.length,
        });

    } catch (err: any) {
        console.error("[Zoom Stats] Error:", err.message);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
