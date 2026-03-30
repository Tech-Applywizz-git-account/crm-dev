import { NextRequest, NextResponse } from "next/server";

// ─── Zoom Server-to-Server OAuth Token ─────────────────────────
// Gets a fresh access token using Client Credentials flow
async function getZoomAccessToken(): Promise<string> {
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!accountId || !clientId || !clientSecret) {
        throw new Error("Missing Zoom OAuth credentials in environment variables");
    }

    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Zoom OAuth Error:", errorText);
        throw new Error(`Failed to get Zoom access token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
}

// ─── POST /api/zoom-call ───────────────────────────────────────
// Initiates an outbound call via Zoom Phone API
// The caller's registered device (mobile app, desk phone) will ring first.
// When they pick up, Zoom connects them to the target number.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { callerEmail, targetNumber } = body;

        if (!callerEmail || !targetNumber) {
            return NextResponse.json(
                { error: "callerEmail and targetNumber are required" },
                { status: 400 }
            );
        }

        // 1. Get Zoom API access token
        const accessToken = await getZoomAccessToken();

        // 2. Look up the Zoom user by email to get their userId
        const userResponse = await fetch(
            `https://api.zoom.us/v2/phone/users/${encodeURIComponent(callerEmail)}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error("Zoom User Lookup Error:", errorText);
            return NextResponse.json(
                { error: `User not found or not licensed for Zoom Phone: ${callerEmail}` },
                { status: 404 }
            );
        }

        const userData = await userResponse.json();
        const userId = userData.id || callerEmail;

        // 3. Initiate the call via Zoom Phone API
        // This will ring ALL of the user's registered devices
        // (mobile app, desktop app, desk phone)
        const callResponse = await fetch(
            `https://api.zoom.us/v2/phone/users/${userId}/phone_calls`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    callee: {
                        phone_number: targetNumber
                    }
                }),
            }
        );

        if (!callResponse.ok) {
            const errorText = await callResponse.text();
            console.error("Zoom Call API Error:", errorText);

            // Try alternative endpoint format
            const altCallResponse = await fetch(
                `https://api.zoom.us/v2/phone/users/${encodeURIComponent(callerEmail)}/phone_calls`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        callee: {
                            phone_number: targetNumber
                        }
                    }),
                }
            );

            if (!altCallResponse.ok) {
                const altErrorText = await altCallResponse.text();
                console.error("Zoom Call API Alt Error:", altErrorText);
                return NextResponse.json(
                    { error: "Failed to initiate call. Check Zoom Phone license and permissions.", details: altErrorText },
                    { status: 500 }
                );
            }

            const altCallData = await altCallResponse.json();
            return NextResponse.json({
                success: true,
                message: `Call initiated to ${targetNumber}. Your Zoom phone will ring shortly.`,
                callId: altCallData.id || altCallData.call_id,
            });
        }

        const callData = await callResponse.json();

        return NextResponse.json({
            success: true,
            message: `Call initiated to ${targetNumber}. Your Zoom phone will ring shortly.`,
            callId: callData.id || callData.call_id,
        });

    } catch (error: any) {
        console.error("Zoom Call Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
