// lib/microsoft/tokenService.ts

interface TokenCache {
    accessToken: string;
    expiresAt: number;
}

let cachedToken: TokenCache | null = null;

export async function getMicrosoftGraphToken(): Promise<string> {
    const tenantId = process.env.MICROSOFT_TENANT_ID;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        throw new Error("Missing Microsoft Graph credentials in environment variables.");
    }

    // Use cached token if valid (buffer of 60 seconds)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
        return cachedToken.accessToken;
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
    });

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Microsoft Token Error:", errorBody);
        throw new Error(`Failed to fetch Microsoft Graph token: ${response.statusText}`);
    }

    const data = await response.json();

    cachedToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
}
