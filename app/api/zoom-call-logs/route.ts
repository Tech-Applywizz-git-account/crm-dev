import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const res = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
        {
            method: "POST",
            headers: { Authorization: `Basic ${credentials}` },
            cache: "no-store",
        }
    );

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Zoom OAuth failed: ${errText}`);
    }

    const data = await res.json();
    return data.access_token;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get("phone") || "";

        if (!phone) {
            return NextResponse.json({
                success: false,
                error: "Phone required",
            }, { status: 400 });
        }

        const digits = cleanDigits(phone);
        const last10 = digits.slice(-10);

        const accessToken = await getZoomAccessToken();

        // 30-day range
        const now = new Date();
        const past = new Date();
        past.setDate(past.getDate() - 30);

        const from = `${past.toISOString().split("T")[0]}T00:00:00Z`;
        const to = `${now.toISOString().split("T")[0]}T23:59:59Z`;

        const fetchWithPagination = async (url: string, key: string) => {
            let all: any[] = [];
            let nextToken = "";

            do {
                const fetchUrl = new URL(url);
                if (nextToken) {
                    fetchUrl.searchParams.set("next_page_token", nextToken);
                }

                const res = await fetch(fetchUrl.toString(), {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    cache: "no-store",
                });

                if (!res.ok) {
                    const errText = await res.text();
                    console.error(`Zoom fetch failed for ${key}:`, errText);
                    break;
                }

                const data = await res.json();
                all = [...all, ...(data[key] || [])];
                nextToken = data.next_page_token;
            } while (nextToken);

            return all;
        };

        // Fetch all call logs
        const callLogs = await fetchWithPagination(
            `https://api.zoom.us/v2/phone/call_history?from=${from}&to=${to}&page_size=300&type=all`,
            "call_logs"
        );

        // Fetch all recordings
        const recordings = await fetchWithPagination(
            `https://api.zoom.us/v2/phone/recordings?from=${from}&to=${to}&page_size=300`,
            "recordings"
        );

        const matchedCalls = callLogs
            .filter((log: any) => {
                const raw =
                    log.direction === "outbound"
                        ? log.callee_number ||
                        log.to?.number ||
                        log.callee_number_display ||
                        ""
                        : log.caller_number ||
                        log.from?.number ||
                        log.caller_number_display ||
                        "";

                const clean = cleanDigits(raw);
                if (!clean) return false;

                const cleanLast10 = clean.slice(-10);

                // Robust multi-length match
                return (
                    clean.endsWith(last10) ||
                    last10.endsWith(cleanLast10) ||
                    (cleanLast10.length >= 7 && last10.endsWith(cleanLast10)) ||
                    (last10.length >= 7 && cleanLast10.endsWith(last10))
                );
            })
            .map((log: any) => {
                const recording = recordings.find(
                    (r: any) =>
                        r.call_log_id === log.id || r.call_id === log.call_id
                );

                return {
                    call_id: log.call_id,
                    start_time: log.start_time,
                    duration: log.duration || 0,
                    direction: log.direction,
                    recording_url:
                        recording?.share_url ||
                        recording?.play_url ||
                        (recording
                            ? `https://zoom.us/recording/detail/${recording.id}`
                            : null),
                };
            });

        return NextResponse.json({
            success: true,
            total: matchedCalls.length,
            calls: matchedCalls,
            debug: {
                total_zoom_logs: callLogs.length,
                total_recordings: recordings.length
            }
        });

    } catch (err: any) {
        console.error("Zoom Route Error:", err);
        return NextResponse.json(
            {
                success: false,
                error: err.message,
            },
            { status: 500 }
        );
    }
}
