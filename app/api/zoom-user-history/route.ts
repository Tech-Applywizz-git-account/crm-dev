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
        const errText = await res.text();
        throw new Error("Zoom OAuth failed (" + res.status + "): " + errText);
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
            const errText = await res.text();
            console.error("[Zoom API] " + key + " fetch failed:", res.status, errText);
            break;
        }

        const data = await res.json();
        const items = data[key] || [];
        all = all.concat(items);
        nextPageToken = data.next_page_token || "";
        page++;
    } while (nextPageToken && page < 10); // Safety limit

    return all;
}

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

        const accessToken = await getZoomAccessToken();
        
        // Define range
        let start = startDate ? new Date(startDate) : new Date();
        if (!startDate) start.setMonth(start.getMonth() - 3); // Default to 3 months
        
        let end = endDate ? new Date(endDate) : new Date();
        
        let allLogs: any[] = [];
        let currentEnd = new Date(end);
        
        // Fetch in 1-month chunks
        while (currentEnd >= start) {
            let chunkStart = new Date(currentEnd);
            chunkStart.setMonth(chunkStart.getMonth() - 1);
            chunkStart.setDate(chunkStart.getDate() + 1);
            if (chunkStart < start) chunkStart = new Date(start);

            const fromStr = chunkStart.toISOString().split('T')[0];
            const toStr = currentEnd.toISOString().split('T')[0];

            console.log(`[Zoom User History] Fetching chunk: ${fromStr} to ${toStr}`);
            const url = `https://api.zoom.us/v2/phone/call_history?from=${fromStr}T00:00:00Z&to=${toStr}T23:59:59Z&page_size=300&type=all`;
            const logs = await fetchZoomPages(url, "call_logs", accessToken);
            allLogs = allLogs.concat(logs);

            // Move currentEnd back
            currentEnd.setMonth(currentEnd.getMonth() - 1);
        }

        // Filter logs for the specific user
        const userLogs = allLogs.filter(log => {
            const isMatch = (
                (extension && (log.caller_ext_number === extension || log.callee_ext_number === extension)) ||
                (email && (log.caller_email === email || log.callee_email === email))
            );
            return isMatch;
        });

        // Sort by time descending
        userLogs.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        // Format for display
        const formattedLogs = userLogs.map(log => {
            const isOutbound = log.direction === "outbound";
            const otherParty = isOutbound
                ? (log.callee_name || log.callee_number || log.callee_did_number || "Unknown")
                : (log.caller_name || log.caller_number || log.caller_did_number || "Unknown");

            return {
                id: log.id,
                start_time: log.start_time,
                duration: Number(log.duration) || 0,
                durationFormatted: formatDuration(Number(log.duration) || 0),
                direction: log.direction,
                other_party: otherParty,
                result: log.call_result,
                recording: log.recording_status === "recorded" ? true : false,
                call_id: log.call_id
            };
        });

        return NextResponse.json({
            success: true,
            logs: formattedLogs,
            count: formattedLogs.length,
            requestedRange: { startDate, endDate }
        });

    } catch (err: any) {
        console.error("[Zoom User History History] Error:", err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
