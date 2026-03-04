import { NextRequest, NextResponse } from "next/server";

function cleanDigits(num: string = ""): string {
    return num.replace(/[^\d]/g, "");
}

function last10Match(a: string, b: string): boolean {
    const cleanA = cleanDigits(a).slice(-10);
    const cleanB = cleanDigits(b).slice(-10);
    if (cleanA.length < 7 || cleanB.length < 7) return false;
    return cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA);
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
        console.log("[Zoom API] " + key + " page " + page + ": " + items.length + " items (total: " + all.length + ")");
    } while (nextPageToken);

    return all;
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const phone = url.searchParams.get("phone") || "";

        if (!phone) {
            return NextResponse.json({ success: false, error: "Phone required" }, { status: 400 });
        }

        const digits = cleanDigits(phone);
        const last10 = digits.slice(-10);
        console.log("[Zoom Call Logs] Phone: " + phone + ", last10: " + last10);

        // Step 1: Get access token
        let accessToken: string;
        try {
            accessToken = await getZoomAccessToken();
            console.log("[Zoom Call Logs] OAuth token obtained");
        } catch (oauthErr: any) {
            console.error("[Zoom Call Logs] OAuth FAILED:", oauthErr.message);
            return NextResponse.json({ success: false, error: "Zoom OAuth failed: " + oauthErr.message }, { status: 500 });
        }

        // Date range (30 days)
        const now = new Date();
        const past = new Date();
        past.setDate(past.getDate() - 30);
        const fromDate = past.toISOString().split("T")[0];
        const toDate = now.toISOString().split("T")[0];

        // Step 2: Fetch ALL account-wide call logs
        let callLogs: any[] = [];
        try {
            const callLogsUrl = "https://api.zoom.us/v2/phone/call_history?from=" + fromDate + "T00:00:00Z&to=" + toDate + "T23:59:59Z&page_size=300&type=all";
            callLogs = await fetchZoomPages(callLogsUrl, "call_logs", accessToken);
            console.log("[Zoom Call Logs] Total call logs: " + callLogs.length);
        } catch (err: any) {
            console.error("[Zoom Call Logs] Call logs fetch error:", err.message);
            return NextResponse.json({ success: false, error: "Failed to fetch call logs: " + err.message }, { status: 500 });
        }

        // Step 3: Build DID-to-Extension mapping from the call log data itself
        // External calls have both DID numbers and extension IDs
        // We use this to find which extension owns our target phone number
        const didToExtId = new Map<string, string>();
        const extIdToName = new Map<string, string>();

        for (const log of callLogs) {
            // Map caller DID to caller extension ID
            if (log.caller_did_number && log.caller_ext_id) {
                const callerLast10 = cleanDigits(log.caller_did_number).slice(-10);
                if (callerLast10.length >= 7) {
                    didToExtId.set(callerLast10, log.caller_ext_id);
                    if (log.caller_name) extIdToName.set(log.caller_ext_id, log.caller_name);
                }
            }
            // Map callee DID to callee extension ID
            if (log.callee_did_number && log.callee_ext_id) {
                const calleeLast10 = cleanDigits(log.callee_did_number).slice(-10);
                if (calleeLast10.length >= 7) {
                    didToExtId.set(calleeLast10, log.callee_ext_id);
                    if (log.callee_name) extIdToName.set(log.callee_ext_id, log.callee_name);
                }
            }
        }

        // Find if our target phone is a Zoom DID — get the extension ID
        const targetExtId = didToExtId.get(last10) || null;
        if (targetExtId) {
            console.log("[Zoom Call Logs] Phone " + last10 + " maps to extension ID: " + targetExtId + " (" + (extIdToName.get(targetExtId) || "unknown") + ")");
        }

        // Step 4: Match calls
        // A call matches if:
        //   (a) The phone number appears in any DID field (external calls), OR
        //   (b) The extension ID matches caller_ext_id or callee_ext_id (internal calls)
        const matchedCalls = callLogs
            .filter((log: any) => {
                // Check DID numbers (for external calls)
                const didNumbers = [
                    log.callee_did_number,
                    log.caller_did_number,
                    log.callee_number,
                    log.caller_number,
                    log.callee_number_display,
                    log.caller_number_display,
                ].filter(Boolean);

                const matchesDID = didNumbers.some((num: string) => last10Match(num, phone));

                // Check extension ID (for internal calls where the DID owner is known)
                const matchesExt = targetExtId != null && (
                    log.caller_ext_id === targetExtId ||
                    log.callee_ext_id === targetExtId
                );

                return matchesDID || matchesExt;
            })
            .map((log: any) => {
                const dur = Number(log.duration) || 0;

                // Determine the other party
                let otherParty = "";
                if (targetExtId) {
                    // If we know this is an extension user, the other party is whoever is NOT this extension
                    if (log.caller_ext_id === targetExtId) {
                        otherParty = log.callee_name || log.callee_did_number || log.callee_ext_number || "Unknown";
                    } else {
                        otherParty = log.caller_name || log.caller_did_number || log.caller_ext_number || "Unknown";
                    }
                } else {
                    otherParty = log.direction === "outbound"
                        ? (log.callee_name || log.callee_did_number || "Unknown")
                        : (log.caller_name || log.caller_did_number || "Unknown");
                }

                return {
                    call_id: log.call_id || log.id,
                    start_time: log.start_time || log.date_time,
                    end_time: log.end_time || null,
                    duration: dur,
                    direction: log.direction || "unknown",
                    connect_type: log.connect_type || "unknown",
                    call_result: log.call_result || "",
                    recording_url: null as string | null,
                    other_party: otherParty,
                    caller_name: log.caller_name || "",
                    callee_name: log.callee_name || "",
                    has_recording: log.recording_status === "recorded",
                };
            });

        // Step 5: Fetch recordings and enrich matched calls
        let recordings: any[] = [];
        try {
            const recUrl = "https://api.zoom.us/v2/phone/recordings?from=" + fromDate + "T00:00:00Z&to=" + toDate + "T23:59:59Z&page_size=300";
            recordings = await fetchZoomPages(recUrl, "recordings", accessToken);
            console.log("[Zoom Call Logs] Recordings: " + recordings.length);
        } catch (recErr: any) {
            console.error("[Zoom Call Logs] Recordings error:", recErr.message);
        }

        // Enrich with recording URLs
        // Uses our proxy which authenticates and streams, or redirects to Zoom portal
        if (recordings.length > 0) {
            for (const call of matchedCalls) {
                // Match recording by call_log_id or call_id
                // Also try matching by call_history_id (some calls use different IDs)
                const rec = recordings.find((r: any) =>
                    r.call_log_id === call.call_id ||
                    r.call_id === call.call_id ||
                    (r.call_log_id && call.call_id && r.call_log_id.replace(/-/g, "") === call.call_id.replace(/-/g, ""))
                );
                if (rec) {
                    const rawUrl = rec.download_url || rec.share_url || rec.play_url || null;
                    if (rawUrl) {
                        call.recording_url = "/api/zoom-recording?url=" + encodeURIComponent(rawUrl);
                    }
                }
            }
        }

        console.log("[Zoom Call Logs] Final matched: " + matchedCalls.length + " (ext_id_match: " + (targetExtId ? "yes" : "no") + ")");
        if (matchedCalls.length > 0) {
            const sample = matchedCalls[0];
            console.log("[Zoom Call Logs] Sample: dur=" + sample.duration + "s, dir=" + sample.direction + ", type=" + sample.connect_type + ", result=" + sample.call_result + ", other=" + sample.other_party);
        }

        return NextResponse.json({
            success: true,
            total: matchedCalls.length,
            calls: matchedCalls,
            debug: {
                phone_searched: phone,
                last10_digits: last10,
                target_ext_id: targetExtId,
                target_ext_name: targetExtId ? extIdToName.get(targetExtId) : null,
                total_call_logs_scanned: callLogs.length,
                total_recordings: recordings.length,
                matched_count: matchedCalls.length,
            }
        });

    } catch (err: any) {
        console.error("[Zoom Call Logs] UNEXPECTED Error:", err);
        return NextResponse.json(
            { success: false, error: err.message || "Unknown error" },
            { status: 500 }
        );
    }
}
