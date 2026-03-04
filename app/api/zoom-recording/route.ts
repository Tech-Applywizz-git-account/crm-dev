import { NextRequest, NextResponse } from "next/server";

async function getZoomAccessToken(): Promise<string> {
    const accountId = (process.env.ZOOM_ACCOUNT_ID || "").trim();
    const clientId = (process.env.ZOOM_CLIENT_ID || "").trim();
    const clientSecret = (process.env.ZOOM_CLIENT_SECRET || "").trim();

    if (!accountId || !clientId || !clientSecret) {
        throw new Error("Missing Zoom credentials");
    }

    const credentials = Buffer.from(clientId + ":" + clientSecret).toString("base64");
    const tokenUrl = "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=" + accountId;

    const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { Authorization: "Basic " + credentials },
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error("Zoom OAuth failed: " + res.status);
    }

    const data = await res.json();
    return data.access_token;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const recordingUrl = searchParams.get("url");

        if (!recordingUrl) {
            return NextResponse.json({ error: "Recording URL required" }, { status: 400 });
        }

        if (!recordingUrl.includes("zoom.us")) {
            return NextResponse.json({ error: "Invalid recording URL" }, { status: 400 });
        }

        const accessToken = await getZoomAccessToken();

        // Step 1: Call the Zoom download endpoint with auth (don't follow redirects)
        // Zoom returns a 302 redirect to a signed MP3 URL at file.zoom.us
        const response = await fetch(recordingUrl, {
            headers: { Authorization: "Bearer " + accessToken },
            redirect: "manual", // Don't follow redirect — we need the signed URL
            cache: "no-store",
        });

        // If we get a redirect (302), the Location header contains a signed MP3 URL
        if (response.status === 302 || response.status === 301) {
            const signedUrl = response.headers.get("location");
            if (signedUrl) {
                console.log("[Zoom Recording] Got signed URL, streaming audio...");

                // Fetch the actual audio file from the signed URL
                const audioResponse = await fetch(signedUrl, { cache: "no-store" });

                if (!audioResponse.ok) {
                    console.error("[Zoom Recording] Signed URL fetch failed:", audioResponse.status);
                    return NextResponse.json({ error: "Failed to fetch audio" }, { status: 500 });
                }

                const audioData = await audioResponse.arrayBuffer();
                const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";

                return new NextResponse(audioData, {
                    status: 200,
                    headers: {
                        "Content-Type": contentType,
                        "Content-Disposition": "inline",
                        "Accept-Ranges": "bytes",
                        "Cache-Control": "private, max-age=1800",
                        "Access-Control-Allow-Origin": "*",
                    },
                });
            }
        }

        // If no redirect, try direct download (200 response with audio data)
        if (response.ok) {
            const audioData = await response.arrayBuffer();
            const contentType = response.headers.get("content-type") || "audio/mpeg";

            return new NextResponse(audioData, {
                status: 200,
                headers: {
                    "Content-Type": contentType,
                    "Content-Disposition": "inline",
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "private, max-age=1800",
                },
            });
        }

        // If it's an error, return it
        const errText = await response.text();
        console.error("[Zoom Recording] Failed:", response.status, errText.substring(0, 200));
        return NextResponse.json(
            { error: "Recording download failed (" + response.status + ")" },
            { status: response.status || 500 }
        );

    } catch (err: any) {
        console.error("[Zoom Recording] Error:", err.message);
        return NextResponse.json(
            { error: err.message || "Failed to fetch recording" },
            { status: 500 }
        );
    }
}
